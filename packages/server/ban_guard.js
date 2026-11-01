'use strict';

/**
 * Ban guard — Social + HWID + IP.
 * Any ban also stores IP; join/login/register blocked by matching IP.
 */

let schemaReady = false;

function ensureBanSchema(cb) {
    if (schemaReady) {
        if (cb) cb();
        return;
    }
    const steps = [
        'ALTER TABLE accounts ADD COLUMN last_hwid VARCHAR(128) NULL DEFAULT NULL',
        'ALTER TABLE accounts ADD COLUMN last_hwid2 VARCHAR(128) NULL DEFAULT NULL',
        'ALTER TABLE accounts ADD COLUMN last_ip VARCHAR(64) NULL DEFAULT NULL',
        'ALTER TABLE bansocial ADD COLUMN hwid2 VARCHAR(128) NULL DEFAULT NULL',
        'ALTER TABLE bansocial ADD COLUMN static INT NULL DEFAULT NULL',
        `CREATE TABLE IF NOT EXISTS banip (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ipadr VARCHAR(64) NOT NULL,
            static INT NULL,
            login VARCHAR(64) NULL,
            reason VARCHAR(255) NULL,
            admin VARCHAR(64) NULL,
            banset DATETIME NULL,
            unban DATETIME NULL,
            INDEX idx_banip_ip (ipadr),
            INDEX idx_banip_unban (unban)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS banhwid (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hwid VARCHAR(128) NOT NULL,
            hwid2 VARCHAR(128) NULL,
            static INT NULL,
            login VARCHAR(64) NULL,
            reason VARCHAR(255) NULL,
            admin VARCHAR(64) NULL,
            banset DATETIME NULL,
            unban DATETIME NULL,
            INDEX idx_banhwid_hwid (hwid),
            INDEX idx_banhwid_hwid2 (hwid2),
            INDEX idx_banhwid_static (static),
            INDEX idx_banhwid_unban (unban)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    let i = 0;
    function next() {
        if (i >= steps.length) {
            schemaReady = true;
            if (cb) cb();
            return;
        }
        const sql = steps[i++];
        global.DB.query(sql, [], () => next());
    }
    try {
        next();
    } catch (_e) {
        if (cb) cb();
    }
}

function playerHwid(player) {
    try { return String((player && player.serial) || '').trim(); } catch (_e) { return ''; }
}
function playerHwid2(player) {
    try { return String((player && player.serial2) || '').trim(); } catch (_e) { return ''; }
}
function playerSocial(player) {
    try { return String((player && player.rgscId) || '').trim(); } catch (_e) { return ''; }
}
function playerIp(player) {
    try { return String((player && player.ip) || '').trim(); } catch (_e) { return ''; }
}

function isUsableIp(ip) {
    const s = String(ip || '').trim();
    if (!s) return false;
    if (s === '127.0.0.1' || s === '::1' || s === 'localhost') return false;
    return true;
}

/**
 * Permanent hardban: social OR hwid OR ip.
 */
function findHardban(player, cb) {
    const social = playerSocial(player);
    const hwid = playerHwid(player);
    const hwid2 = playerHwid2(player);
    const ip = playerIp(player);

    const clauses = [];
    const params = [];
    if (social) {
        clauses.push('(socialid IS NOT NULL AND socialid <> \'\' AND socialid = ?)');
        params.push(social);
    }
    if (hwid) {
        clauses.push('(hwid IS NOT NULL AND hwid <> \'\' AND hwid = ?)');
        params.push(hwid);
        clauses.push('(hwid2 IS NOT NULL AND hwid2 <> \'\' AND hwid2 = ?)');
        params.push(hwid);
    }
    if (hwid2) {
        clauses.push('(hwid IS NOT NULL AND hwid <> \'\' AND hwid = ?)');
        params.push(hwid2);
        clauses.push('(hwid2 IS NOT NULL AND hwid2 <> \'\' AND hwid2 = ?)');
        params.push(hwid2);
    }
    if (isUsableIp(ip)) {
        clauses.push('(ipadr IS NOT NULL AND ipadr <> \'\' AND ipadr = ?)');
        params.push(ip);
    }
    if (!clauses.length) return cb(null);

    global.DB.query(
        `SELECT socialid, hwid, hwid2, ipadr, reason, admin FROM bansocial WHERE ${clauses.join(' OR ')} LIMIT 1`,
        params,
        (err, rows) => {
            if (err) {
                console.log('[ban_guard] findHardban:', err.message || err);
                return cb(null);
            }
            if (rows && rows.length) return cb(rows[0]);
            cb(null);
        }
    );
}

/** Timed IP bans (from /ban /sban …). */
function findTimedIpBan(player, cb) {
    const ip = playerIp(player);
    if (!isUsableIp(ip)) return cb(null);

    global.DB.query(
        `SELECT reason, admin, unban, login, static FROM banip
         WHERE ipadr = ? AND (unban IS NULL OR unban > NOW())
         ORDER BY id DESC LIMIT 1`,
        [ip],
        (err, rows) => {
            if (err) {
                // table may not exist yet
                return cb(null);
            }
            if (rows && rows.length) return cb(rows[0]);
            cb(null);
        }
    );
}

/** Timed HWID bans (from /ban /sban …). */
function findTimedHwidBan(player, cb) {
    const hwid = playerHwid(player);
    const hwid2 = playerHwid2(player);
    if (!hwid && !hwid2) return cb(null);

    const clauses = [];
    const params = [];
    if (hwid) {
        clauses.push('(hwid = ? OR hwid2 = ?)');
        params.push(hwid, hwid);
    }
    if (hwid2) {
        clauses.push('(hwid = ? OR hwid2 = ?)');
        params.push(hwid2, hwid2);
    }
    if (!clauses.length) return cb(null);

    global.DB.query(
        `SELECT reason, admin, unban, login, static FROM banhwid
         WHERE (${clauses.join(' OR ')}) AND (unban IS NULL OR unban > NOW())
         ORDER BY id DESC LIMIT 1`,
        params,
        (err, rows) => {
            if (err) return cb(null);
            if (rows && rows.length) return cb(rows[0]);
            cb(null);
        }
    );
}

/** Any ban blocking this client. */
function findAnyBan(player, cb) {
    findHardban(player, (hard) => {
        if (hard) {
            hard._kind = 'hardban';
            return cb(hard);
        }
        findTimedIpBan(player, (timedIp) => {
            if (timedIp) {
                timedIp._kind = 'banip';
                timedIp.reason = timedIp.reason || 'IP ban';
                return cb(timedIp);
            }
            findTimedHwidBan(player, (timedHwid) => {
                if (timedHwid) {
                    timedHwid._kind = 'banhwid';
                    timedHwid.reason = timedHwid.reason || 'HWID ban';
                    return cb(timedHwid);
                }
                cb(null);
            });
        });
    });
}

function checkTimedFingerprintsForPlayer(player, cb) {
    findTimedIpBan(player, (ipRow) => {
        if (ipRow) return cb(ipRow.reason || 'IP ban');
        findTimedHwidBan(player, (hwRow) => {
            if (hwRow) return cb(hwRow.reason || 'HWID ban');
            cb(null);
        });
    });
}

function kickBanned(player, reason) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const msg = `Доступ запрещён. Бан: ${reason || 'нарушение правил'}`;
        try {
            player.outputChatBox(`!{red}${msg}`);
            player.call('showAuthError', [msg]);
        } catch (_e) {
            try { player.outputChatBox(`!{red}${msg}`); } catch (_e2) {}
        }
        setTimeout(() => {
            try {
                if (mp.players.exists(player)) {
                    if (typeof global.kickPlayerSafe === 'function') global.kickPlayerSafe(player);
                    else player.kick(msg);
                }
            } catch (_e2) {}
        }, 400);
    } catch (_e3) {}
}

function enforceJoinHardban(player) {
    if (!player || !mp.players.exists(player)) return;
    findAnyBan(player, (row) => {
        if (!row || !mp.players.exists(player)) return;
        console.log(
            `[ban_guard] JOIN BLOCK kind=${row._kind || '?'} ip=${playerIp(player)} social=${playerSocial(player)} reason=${row.reason}`
        );
        kickBanned(player, row.reason);
    });
}

function saveAccountFingerprints(player, staticId) {
    const sid = staticId != null ? staticId : player && player.static;
    if (sid == null) return;
    const hwid = playerHwid(player);
    const hwid2 = playerHwid2(player);
    const ip = playerIp(player);
    if (!hwid && !hwid2 && !ip) return;

    ensureBanSchema(() => {
        global.DB.query(
            'UPDATE accounts SET last_hwid = COALESCE(NULLIF(?, \'\'), last_hwid), last_hwid2 = COALESCE(NULLIF(?, \'\'), last_hwid2), last_ip = COALESCE(NULLIF(?, \'\'), last_ip) WHERE static = ?',
            [hwid || '', hwid2 || '', ip || '', sid],
            (err) => {
                if (err) {
                    const msg = String(err.message || '');
                    if (!/unknown column/i.test(msg)) console.log('[ban_guard] save fp:', msg);
                }
            }
        );
    });
}

function loadAccountFingerprints(staticOrSocial, cb) {
    global.DB.query(
        'SELECT static, socialid, last_hwid, last_hwid2, last_ip, login FROM accounts WHERE static = ? OR socialid = ? LIMIT 1',
        [staticOrSocial, String(staticOrSocial || '').trim()],
        (err, rows) => {
            if (err || !rows || !rows.length) return cb(null);
            cb(rows[0]);
        }
    );
}

function recordBanHwid({ hwid, hwid2, staticId, login, reason, admin, banset, unban }, cb) {
    ensureBanSchema(() => {
        const h1 = String(hwid || '').trim();
        const h2 = String(hwid2 || '').trim();
        if (!h1 && !h2) {
            if (cb) cb(null, false);
            return;
        }
        global.DB.query(
            `INSERT INTO banhwid (hwid, hwid2, static, login, reason, admin, banset, unban) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                h1 || h2,
                h2 || null,
                staticId != null ? staticId : null,
                login || null,
                reason || null,
                admin || null,
                banset || null,
                unban || null
            ],
            (err) => {
                if (err) console.log('[ban_guard] recordBanHwid:', err.message || err);
                if (cb) cb(err || null, !err);
            }
        );
    });
}

/**
 * Record timed/permanent IP ban. Called for EVERY account ban.
 */
function recordBanIp({ ip, staticId, login, reason, admin, banset, unban }, cb) {
    ensureBanSchema(() => {
        if (!isUsableIp(ip)) {
            if (cb) cb(null, false);
            return;
        }
        global.DB.query(
            `INSERT INTO banip (ipadr, static, login, reason, admin, banset, unban) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                String(ip).trim(),
                staticId != null ? staticId : null,
                login || null,
                reason || null,
                admin || null,
                banset || null,
                unban || null
            ],
            (err) => {
                if (err) console.log('[ban_guard] recordBanIp:', err.message || err);
                if (cb) cb(err || null, !err);
            }
        );
    });
}

function attachHwidToBan({ staticId, login, reason, admin, banset, unban, onlinePlayer }, cb) {
    const finish = (hwid, hwid2) => {
        recordBanHwid(
            { hwid, hwid2, staticId, login, reason, admin, banset, unban },
            cb
        );
    };

    if (onlinePlayer && mp.players.exists(onlinePlayer)) {
        const h1 = playerHwid(onlinePlayer);
        const h2 = playerHwid2(onlinePlayer);
        if (h1 || h2) return finish(h1, h2);
    }

    loadAccountFingerprints(staticId, (acc) => {
        const h1 = (acc && acc.last_hwid ? String(acc.last_hwid).trim() : '') || '';
        const h2 = (acc && acc.last_hwid2 ? String(acc.last_hwid2).trim() : '') || '';
        finish(h1, h2);
    });
}

/**
 * IP + HWID for timed ban (/ban, /sban, Discord ban, …).
 */
function attachFingerprintsToBan(opts, cb) {
    let pending = 2;
    let ipOk = false;
    let hwOk = false;
    const done = () => {
        pending -= 1;
        if (pending <= 0 && cb) cb(null, ipOk || hwOk);
    };
    attachIpToBan(opts, (_e, ok) => {
        ipOk = !!ok;
        done();
    });
    attachHwidToBan(opts, (_e2, ok2) => {
        hwOk = !!ok2;
        done();
    });
}

/**
 * Resolve IP from online player or accounts.last_ip and write banip.
 * unban: null / far future = effectively permanent IP block for timed table too.
 */
function attachIpToBan({ staticId, login, reason, admin, banset, unban, onlinePlayer }, cb) {
    const finish = (ip) => {
        recordBanIp(
            { ip, staticId, login, reason, admin, banset, unban },
            cb
        );
    };

    if (onlinePlayer && mp.players.exists(onlinePlayer) && isUsableIp(playerIp(onlinePlayer))) {
        return finish(playerIp(onlinePlayer));
    }

    loadAccountFingerprints(staticId, (acc) => {
        const ip = (acc && acc.last_ip) || '';
        finish(ip);
    });
}

/** Clear timed IP + HWID bans for static (on /unban). */
function clearBanFingerprintsByStatic(staticId, cb) {
    if (staticId == null) {
        if (cb) cb(null);
        return;
    }
    ensureBanSchema(() => {
        let pending = 2;
        const done = (err) => {
            pending -= 1;
            if (pending <= 0 && cb) cb(err || null);
        };
        global.DB.query('DELETE FROM banip WHERE static = ?', [staticId], (err) => {
            if (err) console.log('[ban_guard] clearBanIp:', err.message || err);
            done(err);
        });
        global.DB.query('DELETE FROM banhwid WHERE static = ?', [staticId], (err2) => {
            if (err2) console.log('[ban_guard] clearBanHwid:', err2.message || err2);
            done(err2);
        });
    });
}

function clearBanIpByStatic(staticId, cb) {
    clearBanFingerprintsByStatic(staticId, cb);
}

/** Clear IP from bansocial row + banip for this account (hardunban). */
function clearHardbanArtifacts(socialid, staticId, cb) {
    ensureBanSchema(() => {
        let pending = 2;
        const done = () => {
            pending -= 1;
            if (pending <= 0 && cb) cb(null);
        };
        if (socialid) {
            global.DB.query(
                'UPDATE bansocial SET ipadr = NULL WHERE socialid = ?',
                [String(socialid).trim()],
                () => done()
            );
        } else done();
        if (staticId != null) {
            global.DB.query('DELETE FROM banip WHERE static = ?', [staticId], () => done());
            global.DB.query('DELETE FROM banhwid WHERE static = ?', [staticId], () => done());
        } else done();
    });
}

function writeHardban({ socialid, reason, admin, hwid, hwid2, ip, staticId }, cb) {
    ensureBanSchema(() => {
        const sc = String(socialid || '').trim();
        if (!sc) return cb && cb(new Error('no socialid'));

        global.DB.query('SELECT socialid FROM bansocial WHERE socialid = ? LIMIT 1', [sc], (err, rows) => {
            if (err) return cb && cb(err);
            if (rows && rows.length) {
                global.DB.query(
                    `UPDATE bansocial SET
                        reason = COALESCE(NULLIF(?, ''), reason),
                        admin = COALESCE(NULLIF(?, ''), admin),
                        hwid = COALESCE(NULLIF(?, ''), hwid),
                        hwid2 = COALESCE(NULLIF(?, ''), hwid2),
                        ipadr = COALESCE(NULLIF(?, ''), ipadr),
                        static = COALESCE(?, static)
                     WHERE socialid = ?`,
                    [reason || '', admin || '', hwid || '', hwid2 || '', ip || '', staticId != null ? staticId : null, sc],
                    (e2) => {
                        // also mirror IP into banip (permanent-ish)
                        if (isUsableIp(ip)) {
                            recordBanIp({
                                ip,
                                staticId,
                                reason,
                                admin,
                                banset: null,
                                unban: null
                            });
                        }
                        cb && cb(e2 || null, false);
                    }
                );
                return;
            }

            global.DB.query(
                'INSERT INTO bansocial (socialid, reason, admin, hwid, hwid2, ipadr, static) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sc, reason || '', admin || '', hwid || null, hwid2 || null, ip || null, staticId != null ? staticId : null],
                (e3) => {
                    if (e3 && /unknown column/i.test(String(e3.message || ''))) {
                        global.DB.query(
                            'INSERT INTO bansocial (socialid, reason, admin, hwid, ipadr) VALUES (?, ?, ?, ?, ?)',
                            [sc, reason || '', admin || '', hwid || null, ip || null],
                            (e4) => {
                                if (isUsableIp(ip)) {
                                    recordBanIp({ ip, staticId, reason, admin, unban: null });
                                }
                                cb && cb(e4 || null, true);
                            }
                        );
                        return;
                    }
                    if (isUsableIp(ip)) {
                        recordBanIp({ ip, staticId, reason, admin, unban: null });
                    }
                    cb && cb(e3 || null, true);
                }
            );
        });
    });
}

function applyHardbanForTarget(staticOrSocial, reason, adminLogin, onlinePlayer, done) {
    loadAccountFingerprints(staticOrSocial, (acc) => {
        const socialid =
            (onlinePlayer && playerSocial(onlinePlayer)) ||
            (acc && acc.socialid != null ? String(acc.socialid).trim() : '') ||
            String(staticOrSocial || '').trim();

        const hwid =
            (onlinePlayer && playerHwid(onlinePlayer)) ||
            (acc && acc.last_hwid ? String(acc.last_hwid).trim() : '') ||
            '';
        const hwid2 =
            (onlinePlayer && playerHwid2(onlinePlayer)) ||
            (acc && acc.last_hwid2 ? String(acc.last_hwid2).trim() : '') ||
            '';
        const ip =
            (onlinePlayer && playerIp(onlinePlayer)) ||
            (acc && acc.last_ip ? String(acc.last_ip).trim() : '') ||
            '';
        const staticId = acc && acc.static != null ? acc.static : null;

        writeHardban(
            { socialid, reason, admin: adminLogin, hwid, hwid2, ip, staticId },
            (err, inserted) => {
                done &&
                    done(err, {
                        socialid,
                        hwid,
                        hwid2,
                        ip,
                        staticId,
                        login: acc && acc.login,
                        inserted
                    });
            }
        );
    });
}

mp.events.add('playerJoin', (player) => {
    try {
        ensureBanSchema();
        setTimeout(() => enforceJoinHardban(player), 200);
        setTimeout(() => enforceJoinHardban(player), 1500);
    } catch (_e) {}
});

mp.events.add('playerReady', (player) => {
    try {
        setTimeout(() => enforceJoinHardban(player), 100);
    } catch (_e) {}
});

setTimeout(() => ensureBanSchema(), 2000);

global.banGuard = {
    findHardban,
    findTimedIpBan,
    findTimedHwidBan,
    findAnyBan,
    enforceJoinHardban,
    saveAccountFingerprints,
    loadAccountFingerprints,
    writeHardban,
    applyHardbanForTarget,
    recordBanIp,
    recordBanHwid,
    attachIpToBan,
    attachHwidToBan,
    attachFingerprintsToBan,
    clearBanFingerprintsByStatic,
    clearBanIpByStatic,
    clearHardbanArtifacts,
    checkTimedFingerprintsForPlayer,
    playerHwid,
    playerHwid2,
    playerSocial,
    playerIp,
    isUsableIp,
    kickBanned,
    ensureBanSchema
};

module.exports = global.banGuard;
