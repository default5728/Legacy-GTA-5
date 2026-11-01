/**
 * Discord: сброс пароля (без сайта).
 * Кнопка → email → код на почту → код + новый пароль.
 */
'use strict';

const bcrypt = require('bcryptjs');
const EmailRestore = require('./email.js');
const {
    getDiscordEnvValue,
    postChannelMessage,
    interactionCallback,
    discordRequest,
    findBotPanelMessage
} = require('./discord_api.js');

const DEFAULT_CHANNEL = '1534361430457978991';
const COOLDOWN_MS = 60 * 1000;
const emailCooldown = new Map();
const discordCooldown = new Map();

let panelPublished = false;

function getRecoveryChannelId() {
    return (
        getDiscordEnvValue('DISCORD_RECOVERY_CHANNEL_ID', '') ||
        getDiscordEnvValue('DISCORD_DONATE_CHANNEL_ID', DEFAULT_CHANNEL)
    );
}

function ephemeral(content) {
    return { type: 4, data: { content: String(content || ''), flags: 64 } };
}

function deferEphemeral() {
    return { type: 5, data: { flags: 64 } };
}

function followUp(interaction, content, components) {
    const body = { content: String(content || ''), flags: 64 };
    if (components) body.components = components;
    return discordRequest(
        'POST',
        '/webhooks/' + interaction.application_id + '/' + interaction.token,
        body
    );
}

function isAlreadyAcked(err) {
    if (!err) return false;
    const m = String(err && err.message ? err.message : err);
    return /already been acknowledged|unknown interaction/i.test(m);
}

function modalValue(interaction, customId) {
    const rows = (interaction.data && interaction.data.components) || [];
    for (let i = 0; i < rows.length; i++) {
        const comps = rows[i].components || [];
        for (let j = 0; j < comps.length; j++) {
            if (comps[j].custom_id === customId) return String(comps[j].value || '').trim();
        }
    }
    return '';
}

function discordUserId(interaction) {
    if (interaction.member && interaction.member.user) return String(interaction.member.user.id);
    if (interaction.user) return String(interaction.user.id);
    return '';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function checkCooldown(map, key) {
    const k = String(key || '');
    if (!k) return { ok: false, wait: 60 };
    const until = map.get(k) || 0;
    const now = Date.now();
    if (now < until) return { ok: false, wait: Math.ceil((until - now) / 1000) };
    map.set(k, now + COOLDOWN_MS);
    return { ok: true };
}

function dbQuery(sql, params) {
    return new Promise(function (resolve, reject) {
        if (!global.DB || typeof global.DB.query !== 'function') {
            return reject(new Error('db_unavailable'));
        }
        global.DB.query(sql, params || [], function (err, rows) {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

function buildPanelPayload() {
    return {
        embeds: [
            {
                title: 'Сброс пароля — FLOW DM',
                description:
                    '**Забыли пароль?**\n\n' +
                    '**1) Нажмите «Сбросить пароль»**\n' +
                    '**2) Укажите почту аккаунта — придёт код**\n' +
                    '**3) Введите код и новый пароль**\n\n' +
                    '**Код действует 15 минут.**',
                color: 0xf84c00
            }
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: 'Сбросить пароль',
                        custom_id: 'recovery:start'
                    }
                ]
            }
        ]
    };
}

function publishRecoveryPanel() {
    const channelId = getRecoveryChannelId();
    if (!channelId) return Promise.reject(new Error('recovery channel empty'));
    const payload = buildPanelPayload();
    const title = payload.embeds && payload.embeds[0] ? payload.embeds[0].title : 'Сброс пароля — FLOW DM';
    return findBotPanelMessage(channelId, 'recovery:start', title)
        .then(function (existing) {
            if (existing && existing.id) {
                panelPublished = true;
                console.log('[discord_recovery] панель уже есть в', channelId, '(msg ' + existing.id + ') — пропуск');
                return existing;
            }
            return postChannelMessage(channelId, payload).then(function (msg) {
                panelPublished = true;
                console.log(
                    '[discord_recovery] панель в',
                    channelId,
                    msg && msg.id ? '(msg ' + msg.id + ')' : ''
                );
                return msg;
            });
        });
}

function openEmailModal(interaction) {
    return interactionCallback(interaction.id, interaction.token, {
        type: 9,
        data: {
            custom_id: 'recovery:email_modal',
            title: 'Сброс пароля',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'email',
                            label: 'Почта аккаунта',
                            style: 1,
                            min_length: 5,
                            max_length: 128,
                            required: true,
                            placeholder: 'example@gmail.com'
                        }
                    ]
                }
            ]
        }
    });
}

function openResetModal(interaction) {
    const codeExample = String(Math.floor(100000 + Math.random() * 900000));
    return interactionCallback(interaction.id, interaction.token, {
        type: 9,
        data: {
            custom_id: 'recovery:reset_modal',
            title: 'Код и новый пароль',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'email',
                            label: 'Почта аккаунта (та же)',
                            style: 1,
                            min_length: 5,
                            max_length: 128,
                            required: true
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'code',
                            label: 'Код из письма',
                            style: 1,
                            min_length: 6,
                            max_length: 6,
                            required: true,
                            placeholder: codeExample
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'password',
                            label: 'Новый пароль',
                            style: 1,
                            min_length: 6,
                            max_length: 64,
                            required: true
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'password2',
                            label: 'Повтор пароля',
                            style: 1,
                            min_length: 6,
                            max_length: 64,
                            required: true
                        }
                    ]
                }
            ]
        }
    });
}

function handleEmailModal(interaction) {
    const uid = discordUserId(interaction);
    const email = EmailRestore.normalizeEmail(modalValue(interaction, 'email'));

    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            const cdUser = checkCooldown(discordCooldown, uid);
            if (!cdUser.ok) {
                return followUp(interaction, '**Подождите ' + cdUser.wait + ' сек. перед новым запросом.**');
            }
            if (!isValidEmail(email)) {
                return followUp(interaction, '**Введите корректный email.**');
            }
            const cdMail = checkCooldown(emailCooldown, email);
            if (!cdMail.ok) {
                return followUp(
                    interaction,
                    '**На эту почту код уже недавно отправляли. Подождите ' + cdMail.wait + ' сек.**'
                );
            }

            return dbQuery('SELECT login FROM accounts WHERE LOWER(email) = ? LIMIT 1', [email]).then(function (rows) {
                if (!rows.length) {
                    return followUp(interaction, '**Аккаунт с такой почтой не найден.**');
                }
                return EmailRestore.sendWebVerificationCode(email, rows[0].login).then(function (sendResult) {
                    if (!sendResult || !sendResult.success) {
                        return followUp(interaction, '**Не удалось отправить код. Попробуйте позже.**');
                    }
                    return followUp(
                        interaction,
                        '**Код отправлен на** `' +
                            email +
                            '`**.**\n**Проверьте почту и нажмите кнопку ниже.**',
                        [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 3,
                                        label: 'Ввести код и новый пароль',
                                        custom_id: 'recovery:enter_code'
                                    }
                                ]
                            }
                        ]
                    );
                });
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_recovery] email:', err.message || err);
            return followUp(interaction, '**Ошибка:** ' + (err.message || err)).catch(function () {});
        });
}

function hashPassword(password) {
    return new Promise(function (resolve, reject) {
        bcrypt.hash(password, 10, function (err, hash) {
            if (err) return reject(err);
            resolve(hash);
        });
    });
}

function handleResetModal(interaction) {
    const email = EmailRestore.normalizeEmail(modalValue(interaction, 'email'));
    const code = modalValue(interaction, 'code');
    const password = modalValue(interaction, 'password');
    const password2 = modalValue(interaction, 'password2');

    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            if (!isValidEmail(email)) {
                return followUp(interaction, '**Введите корректный email.**');
            }
            if (password.length < 6) {
                return followUp(interaction, '**Пароль минимум 6 символов.**');
            }
            if (password !== password2) {
                return followUp(interaction, '**Пароли не совпадают.**');
            }

            const verification = EmailRestore.verifyWebRecoveryCode(email, code);
            if (!verification.ok) {
                return followUp(interaction, '**' + (verification.reason || 'Неверный код.') + '**');
            }

            return dbQuery('SELECT login FROM accounts WHERE LOWER(email) = ? LIMIT 1', [email]).then(function (rows) {
                if (!rows.length) {
                    return followUp(interaction, '**Аккаунт с такой почтой не найден.**');
                }
                const accountLogin = verification.login || rows[0].login;
                return hashPassword(password).then(function (passwordHash) {
                    return dbQuery('UPDATE accounts SET password = ? WHERE login = ? LIMIT 1', [
                        passwordHash,
                        accountLogin
                    ]).then(function () {
                        EmailRestore.clearWebRecoveryCode(email);
                        return followUp(
                            interaction,
                            '**Пароль изменён для логина** `' +
                                accountLogin +
                                '`**.**\n**Можно входить в игру.**'
                        );
                    });
                });
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_recovery] reset:', err.message || err);
            return followUp(interaction, '**Ошибка:** ' + (err.message || err)).catch(function () {});
        });
}

function handleRecoveryInteraction(interaction) {
    if (!interaction || !interaction.data) return false;
    const type = interaction.type;
    const customId = String((interaction.data && interaction.data.custom_id) || '');

    if (type === 3) {
        if (customId === 'recovery:start') {
            openEmailModal(interaction).catch(function (e) {
                if (!isAlreadyAcked(e)) console.log('[discord_recovery] start modal:', e.message || e);
            });
            return true;
        }
        if (customId === 'recovery:enter_code') {
            openResetModal(interaction).catch(function (e) {
                if (!isAlreadyAcked(e)) console.log('[discord_recovery] reset modal:', e.message || e);
            });
            return true;
        }
    }

    if (type === 5) {
        if (customId === 'recovery:email_modal') {
            handleEmailModal(interaction);
            return true;
        }
        if (customId === 'recovery:reset_modal') {
            handleResetModal(interaction);
            return true;
        }
    }

    return false;
}

function initDiscordRecovery() {
    if (String(process.env.DISCORD_RECOVERY_SKIP_AUTO_PANEL || '') === '1') return;
    setTimeout(function () {
        if (panelPublished) return;
        publishRecoveryPanel().catch(function (e) {
            console.log('[discord_recovery] publish:', e.message || e);
        });
    }, 5500);
}

initDiscordRecovery();

module.exports = {
    handleRecoveryInteraction,
    publishRecoveryPanel
};
