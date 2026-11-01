'use strict';

function ensureJailColumns(done) {
    if (global.DB) {
        const alters = [
            'ALTER TABLE jail ADD COLUMN return_x DOUBLE NULL DEFAULT NULL',
            'ALTER TABLE jail ADD COLUMN return_y DOUBLE NULL DEFAULT NULL',
            'ALTER TABLE jail ADD COLUMN return_z DOUBLE NULL DEFAULT NULL',
            'ALTER TABLE jail ADD COLUMN return_heading FLOAT NULL DEFAULT NULL',
        ];
        let i = 0;
        function next() {
            if (i >= alters.length) {
                if (typeof done === 'function') done();
                return;
            }
            global.DB.query(alters[i], [], () => {
                i++;
                next();
            });
        }
        next();
    } else {
        if (typeof done === 'function') done();
    }
}

global.captureDemorganReturnPos = function captureDemorganReturnPos(player) {
    try {
        if (!player || !mp.players.exists(player)) return null;
        const pos = player.position;
        return {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            h: typeof player.heading === 'number' ? player.heading : 0
        };
    } catch (_e) {
        return null;
    }
};

global.captureDemorganReturnFromAccountRow = function captureDemorganReturnFromAccountRow(row) {
    if (!row) return null;
    const x = Number(row.last_x);
    const y = Number(row.last_y);
    const z = Number(row.last_z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z, h: 0 };
};

global.parseDemorganReturnFromJailRow = function parseDemorganReturnFromJailRow(row) {
    if (!row) return null;
    const x = Number(row.return_x);
    const y = Number(row.return_y);
    const z = Number(row.return_z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    const h = Number(row.return_heading);
    return { x, y, z, h: Number.isFinite(h) ? h : 0 };
};

global.setDemorganReturnPos = function setDemorganReturnPos(player, pos) {
    if (player && pos) player._demorganReturnPos = pos;
};

global.releasePlayerFromDemorgan = function releasePlayerFromDemorgan(player, options) {
    options = options || {};
    if (!player || !mp.players.exists(player)) return;

    player.setVariable('jail', false);
    player.setVariable('afklobby', null);

    const returnPos = player._demorganReturnPos ||
        global.parseDemorganReturnFromJailRow(options.jailRow || null);

    if (returnPos) {
        player.dimension = 0;
        player.position = new mp.Vector3(returnPos.x, returnPos.y, returnPos.z);
        player.heading = Number.isFinite(returnPos.h) ? returnPos.h : 0;
    }

    player.call('chaton');
    player.call('jail', [player, false]);
    player.call('hideDemorgan');

    if (options.message) player.outputChatBox(options.message);
    if (options.notify && typeof isNotify === 'function') {
        isNotify(player, 3, 'top-mid', options.notify, 3000);
    }

    delete player._demorganReturnPos;
};

global.insertJailRow = function insertJailRow(staticId, remainingTime, adminId, login, reason, returnPos, cb) {
    const rx = returnPos && Number.isFinite(returnPos.x) ? returnPos.x : null;
    const ry = returnPos && Number.isFinite(returnPos.y) ? returnPos.y : null;
    const rz = returnPos && Number.isFinite(returnPos.z) ? returnPos.z : null;
    const rh = returnPos && Number.isFinite(returnPos.h) ? returnPos.h : null;
    global.DB.query(
        'INSERT INTO jail (static, seconds, admin, login, reason, return_x, return_y, return_z, return_heading) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [staticId, remainingTime, adminId, login, reason, rx, ry, rz, rh],
        cb
    );
};

if (typeof global.whenDbReady === 'function') {
    global.whenDbReady(() => ensureJailColumns());
} else {
    ensureJailColumns();
}
