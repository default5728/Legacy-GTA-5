'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
    getDiscordEnvValue,
    postChannelMessageWithFiles,
    patchChannelMessage,
    interactionCallback,
    discordRequest,
    findGuildChannelByName
} = require('./discord_api.js');

const RECEIPTS_DIR = path.join(__dirname, 'data', 'donate_receipts');
const DEFAULT_RECEIPTS_CHANNEL_ID = '1532544371738542301';
const DEFAULT_RECEIPTS_ROLE_ID = '1532465024868679800';

function isAlreadyAcked(err) {
    if (!err) return false;
    const m = String(err && err.message ? err.message : err);
    return /already been acknowledged|unknown interaction/i.test(m);
}

let receiptsChannelId = '';
let receiptsRoleId = '';

function getReceiptsChannelId() {
    if (receiptsChannelId) return receiptsChannelId;
    receiptsChannelId = getDiscordEnvValue('DISCORD_RECEIPTS_CHANNEL_ID', DEFAULT_RECEIPTS_CHANNEL_ID);
    return receiptsChannelId;
}

function getReceiptsRoleId() {
    if (receiptsRoleId) return receiptsRoleId;
    receiptsRoleId = getDiscordEnvValue('DISCORD_RECEIPTS_ROLE_ID', DEFAULT_RECEIPTS_ROLE_ID);
    return receiptsRoleId;
}

function ensureReceiptsDir() {
    if (!fs.existsSync(RECEIPTS_DIR)) {
        fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
    }
}

function ensureReceiptsTable(cb) {
    if (!global.DB || typeof global.DB.query !== 'function') {
        if (typeof cb === 'function') cb(new Error('db_unavailable'));
        return;
    }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS donate_receipts (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            receipt_uid VARCHAR(32) NOT NULL,
            login VARCHAR(32) NOT NULL,
            rub INT NOT NULL DEFAULT 0,
            dp INT NOT NULL DEFAULT 0,
            email VARCHAR(128) NULL,
            method VARCHAR(16) NOT NULL DEFAULT 'sbp',
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
            discord_message_id VARCHAR(32) NULL,
            discord_channel_id VARCHAR(32) NULL,
            processed_by VARCHAR(64) NULL,
            reject_reason VARCHAR(255) NULL,
            order_id VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            UNIQUE KEY uq_receipt_uid (receipt_uid),
            INDEX idx_receipt_login (login),
            INDEX idx_receipt_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (typeof cb === 'function') cb(err || null);
        }
    );
}

function newReceiptUid() {
    return crypto.randomBytes(8).toString('hex');
}

function methodLabel(method) {
    if (method === 'card') return 'Банковская карта';
    return 'СБП';
}

function buildReceiptEmbed(receipt, statusNote) {
    const statusColors = { pending: 0xff7a2f, approved: 0x2ecc71, rejected: 0xe74c3c };
    const statusLabels = { pending: 'Ожидает проверки', approved: 'Принят', rejected: 'Отклонён' };
    const st = receipt.status || 'pending';
    const fields = [
        { name: 'Логин', value: '`' + receipt.login + '`', inline: true },
        { name: 'Сумма', value: receipt.rub + ' ₽', inline: true },
        { name: 'DP', value: String(receipt.dp), inline: true },
        { name: 'Способ', value: methodLabel(receipt.method), inline: true }
    ];
    if (receipt.email) {
        fields.push({ name: 'Email', value: receipt.email, inline: true });
    }
    fields.push({ name: 'ID чека', value: '`' + receipt.receipt_uid + '`', inline: false });
    if (receipt.processed_by) {
        fields.push({ name: 'Модератор', value: receipt.processed_by, inline: true });
    }
    if (receipt.reject_reason) {
        fields.push({ name: 'Причина', value: receipt.reject_reason, inline: false });
    }
    if (statusNote) {
        fields.push({ name: 'Комментарий', value: statusNote, inline: false });
    }
    return {
        title: 'Чек на пополнение — FLOW DM',
        color: statusColors[st] || statusColors.pending,
        fields: fields,
        footer: { text: statusLabels[st] || statusLabels.pending },
        timestamp: new Date().toISOString()
    };
}

function buildReceiptButtons(receiptUid, disabled) {
    if (disabled) return [];
    return [
        {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 3,
                    label: 'Принять',
                    custom_id: 'receipt:approve:' + receiptUid
                },
                {
                    type: 2,
                    style: 4,
                    label: 'Отклонить',
                    custom_id: 'receipt:reject:' + receiptUid
                }
            ]
        }
    ];
}

function guessContentType(fileName) {
    const ext = path.extname(String(fileName || '')).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.pdf') return 'application/pdf';
    return 'application/octet-stream';
}

function resolveReceiptsChannelId() {
    const configured = getReceiptsChannelId();
    if (configured) return Promise.resolve(configured);
    const guildId = getDiscordEnvValue('DISCORD_GUILD_ID', '');
    if (!guildId) return Promise.resolve('');
    return findGuildChannelByName(guildId, 'чеки').then(function (id) {
        if (id) receiptsChannelId = id;
        return id;
    });
}

function insertReceiptRow(row, cb) {
    ensureReceiptsTable(function (tableErr) {
        if (tableErr) return cb(tableErr);
        global.DB.query(
            `INSERT INTO donate_receipts
            (receipt_uid, login, rub, dp, email, method, file_name, file_path, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                row.receipt_uid,
                row.login,
                row.rub,
                row.dp,
                row.email || null,
                row.method || 'sbp',
                row.file_name,
                row.file_path
            ],
            function (err, result) {
                if (err) return cb(err);
                cb(null, result && result.insertId);
            }
        );
    });
}

function getReceiptByUid(uid, cb) {
    global.DB.query(
        'SELECT * FROM donate_receipts WHERE receipt_uid = ? LIMIT 1',
        [uid],
        function (err, rows) {
            if (err) return cb(err);
            cb(null, rows && rows[0] ? rows[0] : null);
        }
    );
}

function updateReceiptDiscordIds(uid, channelId, messageId, cb) {
    global.DB.query(
        'UPDATE donate_receipts SET discord_channel_id = ?, discord_message_id = ? WHERE receipt_uid = ?',
        [channelId, messageId, uid],
        cb
    );
}

function updateReceiptStatus(uid, status, meta, cb) {
    global.DB.query(
        `UPDATE donate_receipts SET
            status = ?,
            processed_by = ?,
            reject_reason = ?,
            order_id = ?,
            processed_at = NOW()
        WHERE receipt_uid = ? AND status = 'pending'`,
        [
            status,
            meta && meta.processed_by ? meta.processed_by : null,
            meta && meta.reject_reason ? meta.reject_reason : null,
            meta && meta.order_id ? meta.order_id : null,
            uid
        ],
        function (err, result) {
            if (err) return cb(err);
            cb(null, result && result.affectedRows > 0);
        }
    );
}

function memberHasReceiptRole(interaction) {
    const roleId = getReceiptsRoleId();
    if (!roleId) return true;
    const member = interaction.member;
    if (!member || !Array.isArray(member.roles)) return false;
    return member.roles.indexOf(roleId) !== -1;
}

function moderatorName(interaction) {
    const user = interaction.member && interaction.member.user ? interaction.member.user : interaction.user;
    if (!user) return 'unknown';
    return user.global_name || user.username || String(user.id || 'unknown');
}

function postReceiptToDiscord(receipt, cb) {
    ensureReceiptsDir();
    resolveReceiptsChannelId()
        .then(function (channelId) {
            if (!channelId) throw new Error('канал чеки не настроен');
            if (!fs.existsSync(receipt.file_path)) throw new Error('файл чека не найден');

            const roleId = getReceiptsRoleId();
            const content = roleId ? '<@&' + roleId + '> Новый чек на проверку' : 'Новый чек на проверку';
            const fileBuf = fs.readFileSync(receipt.file_path);
            const fileName = receipt.file_name || path.basename(receipt.file_path);
            const payload = {
                content: content,
                embeds: [buildReceiptEmbed(receipt)],
                components: buildReceiptButtons(receipt.receipt_uid, false)
            };

            return postChannelMessageWithFiles(channelId, payload, [
                {
                    name: fileName,
                    data: fileBuf,
                    contentType: guessContentType(fileName)
                }
            ]).then(function (msg) {
                return { channelId: channelId, messageId: msg.id };
            });
        })
        .then(function (meta) {
            updateReceiptDiscordIds(receipt.receipt_uid, meta.channelId, meta.messageId, function (err) {
                if (typeof cb === 'function') cb(err || null, meta);
            });
        })
        .catch(function (err) {
            if (typeof cb === 'function') cb(err);
        });
}

function editReceiptMessage(receipt, disabled) {
    const channelId = receipt.discord_channel_id;
    const messageId = receipt.discord_message_id;
    if (!channelId || !messageId) return Promise.resolve();

    return patchChannelMessage(channelId, messageId, {
        content: disabled ? '' : undefined,
        embeds: [buildReceiptEmbed(receipt)],
        components: buildReceiptButtons(receipt.receipt_uid, disabled)
    }).catch(function (err) {
        console.log('[discord_receipts] edit message:', err.message || err);
    });
}

function handleReceiptInteraction(interaction) {
    if (!interaction || interaction.type !== 3) return Promise.resolve();
    const customId = interaction.data && interaction.data.custom_id;
    if (!customId || customId.indexOf('receipt:') !== 0) return Promise.resolve();

    const parts = customId.split(':');
    const action = parts[1];
    const uid = parts[2];
    if (!uid || (action !== 'approve' && action !== 'reject')) return Promise.resolve();

    if (!memberHasReceiptRole(interaction)) {
        return interactionCallback(interaction.id, interaction.token, {
            type: 4,
            data: {
                content: 'Нет прав. Нужна роль создателя.',
                flags: 64
            }
        }).catch(function () {});
    }

    return new Promise(function (resolve, reject) {
        getReceiptByUid(uid, function (err, row) {
            if (err) return reject(err);
            if (!row) return reject(new Error('receipt_not_found'));
            if (row.status !== 'pending') return reject(new Error('already_processed'));
            resolve(row);
        });
    })
        .then(function (row) {
            return interactionCallback(interaction.id, interaction.token, { type: 6 }).then(function () {
                return row;
            });
        })
        .then(function (row) {
            const mod = moderatorName(interaction);

            if (action === 'reject') {
                return new Promise(function (resolve, reject) {
                    updateReceiptStatus(
                        uid,
                        'rejected',
                        { processed_by: mod, reject_reason: 'Отклонено модератором' },
                        function (err, updated) {
                            if (err) return reject(err);
                            if (!updated) return reject(new Error('already_processed'));
                            row.status = 'rejected';
                            row.processed_by = mod;
                            row.reject_reason = 'Отклонено модератором';
                            resolve(row);
                        }
                    );
                }).then(function (updatedRow) {
                    return editReceiptMessage(updatedRow, true);
                });
            }

            if (typeof global.creditDpByLogin !== 'function') {
                throw new Error('credit_unavailable');
            }

            return new Promise(function (resolve, reject) {
                global.creditDpByLogin(
                    row.login,
                    row.dp,
                    { rub: row.rub, source: 'receipt', orderId: 'receipt_' + uid },
                    function (result) {
                        if (!result.ok) return reject(new Error(result.error || 'credit_failed'));
                        resolve({ row: row, credit: result });
                    }
                );
            }).then(function (payload) {
                const updatedRow = payload.row;
                const modName = mod;
                return new Promise(function (resolve, reject) {
                    updateReceiptStatus(
                        uid,
                        'approved',
                        { processed_by: modName, order_id: 'receipt_' + uid },
                        function (err, updated) {
                            if (err) return reject(err);
                            if (!updated) return reject(new Error('already_processed'));
                            updatedRow.status = 'approved';
                            updatedRow.processed_by = modName;
                            resolve(updatedRow);
                        }
                    );
                });
            }).then(function (updatedRow) {
                return editReceiptMessage(updatedRow, true);
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            const msg = err && err.message ? err.message : String(err);
            if (msg === 'already_processed' || msg === 'receipt_not_found') {
                return interactionCallback(interaction.id, interaction.token, {
                    type: 4,
                    data: { content: 'Чек уже обработан или не найден.', flags: 64 }
                }).catch(function () {});
            }
            console.log('[discord_receipts] interaction:', msg);
        });
}

function initDiscordReceipts() {
    ensureReceiptsDir();
    if (typeof global.whenDbReady === 'function') {
        global.whenDbReady(function () {
            ensureReceiptsTable(function (err) {
                if (err) console.log('[discord_receipts] table:', err.message || err);
            });
        });
    }
    resolveReceiptsChannelId().then(function (id) {
        if (id) console.log('[discord_receipts] канал чеки:', id);
    });
}

initDiscordReceipts();

module.exports = {
    ensureReceiptsTable,
    ensureReceiptsDir,
    newReceiptUid,
    insertReceiptRow,
    getReceiptByUid,
    postReceiptToDiscord,
    handleReceiptInteraction,
    RECEIPTS_DIR
};
