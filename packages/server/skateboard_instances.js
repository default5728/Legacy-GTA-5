'use strict';

const SKATEBOARD_LIVERY_SLOT = 48;
const SKATEBOARD_PRICE_DP = 400;
const SKATEBOARD_LIVERY_MAX = 10;

function parseSkateboardInstanceId(itemStr) {
    const base = String(itemStr || '').split('(')[0].trim();
    const m = base.match(/^item_skateboard#(\d+)$/i);
    return m ? parseInt(m[1], 10) : null;
}

function isSkateboardItem(itemStr) {
    return String(itemStr || '').split('(')[0].trim().toLowerCase().startsWith('item_skateboard');
}

function ensureSkateboardInstancesTable() {
    if (!global.DB) {
        setTimeout(ensureSkateboardInstancesTable, 1500);
        return;
    }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS skateboard_instances (
            id INT NOT NULL AUTO_INCREMENT,
            account_static INT NOT NULL,
            livery INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_skate_owner (account_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (err) console.log('[skateboard_instances] CREATE TABLE:', err.message || err);
        }
    );
}

global.skateboardItemBase = function (itemStr) {
    let s = String(itemStr || '').split('(')[0].trim();
    const hash = s.indexOf('#');
    if (hash !== -1) s = s.slice(0, hash);
    return s;
};

global.findSkateboardItemInInventory = function (player) {
    if (!player || !Array.isArray(player.inventory)) return null;
    for (const it of player.inventory) {
        if (typeof it === 'string' && isSkateboardItem(it)) return it;
    }
    return null;
};

global.getSkateboardModsForItem = function (itemStr, cb) {
    const finish = (mods, livery) => {
        if (typeof cb === 'function') cb(null, mods, livery);
    };
    const id = parseSkateboardInstanceId(itemStr);
    if (!id) {
        return finish({ [SKATEBOARD_LIVERY_SLOT]: 0 }, 0);
    }
    global.DB.query('SELECT livery FROM skateboard_instances WHERE id = ? LIMIT 1', [id], (err, rows) => {
        if (err) return finish({ [SKATEBOARD_LIVERY_SLOT]: 0 }, 0);
        const livery = rows.length ? Math.max(0, parseInt(rows[0].livery, 10) || 0) : 0;
        finish({ [SKATEBOARD_LIVERY_SLOT]: livery }, livery);
    });
};

global.transferSkateboardInstanceOwnership = function (itemStr, newAccountStatic, done) {
    const finish = () => {
        if (typeof done === 'function') done();
    };
    const id = parseSkateboardInstanceId(itemStr);
    if (!id || newAccountStatic == null) return finish();
    global.DB.query(
        'UPDATE skateboard_instances SET account_static = ? WHERE id = ?',
        [newAccountStatic, id],
        () => finish()
    );
};

global.deleteSkateboardInstanceForItem = function (itemStr, done) {
    const finish = () => {
        if (typeof done === 'function') done();
    };
    const id = parseSkateboardInstanceId(itemStr);
    if (!id) return finish();
    global.DB.query('DELETE FROM skateboard_instances WHERE id = ?', [id], () => finish());
};

global.grantSkateboardToPlayer = function (player, cb) {
    if (!mp.players.exists(player)) {
        if (typeof cb === 'function') cb(new Error('player'));
        return;
    }
    const livery = Math.floor(Math.random() * (SKATEBOARD_LIVERY_MAX + 1));
    global.DB.query(
        'INSERT INTO skateboard_instances (account_static, livery) VALUES (?, ?)',
        [player.static, livery],
        (err, res) => {
            if (err) {
                if (typeof cb === 'function') cb(err);
                return;
            }
            const insertId = res && res.insertId;
            if (!insertId) {
                if (typeof cb === 'function') cb(new Error('insertId'));
                return;
            }
            const token = `item_skateboard#${insertId}`;
            if (typeof cb === 'function') cb(null, token, livery);
        }
    );
};

global.SKATEBOARD_PRICE_DP = SKATEBOARD_PRICE_DP;

function applySkateModsToVehicle(player, veh, itemToken) {
    if (!veh || !mp.vehicles.exists(veh)) return;
    const sessionMods = (typeof global.skateSessionModsGet === 'function')
        ? global.skateSessionModsGet(player)
        : {};
    global.getSkateboardModsForItem(itemToken, (_err, liveryMods) => {
        const merged = Object.assign({}, sessionMods || {}, liveryMods || {});
        if (typeof global.skateApplyModsToVehicle === 'function') {
            global.skateApplyModsToVehicle(veh, merged, player);
        }
    });
}

global.applySkateboardLiveryFromInventory = applySkateModsToVehicle;

ensureSkateboardInstancesTable();
