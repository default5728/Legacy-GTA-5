global.creatorPedsNew(mp.joaat('s_f_m_fembarber'), new mp.Vector3(134.99818420410156, -1707.85107421875, 29.2916202545166), {
    dynamic: true,
    invincible: true,
    frozen: true,
    heading: 142.05569458007812
});

global.creatorLabelsNew('Барбершоп (E)', new mp.Vector3(133.65396118164062, -1709.589111328125, 29.291627883911133), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 0,
    scale: [1.5, 1.5],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});
global.creatorMarkersNew(1, new mp.Vector3(133.65396118164062, -1709.589111328125, 29.291627883911133 - 1.12), 1, {
    color: [255, 255, 255, 255],
    visible: false,
    dimension: 0
});

// SYSTEM

let playerColshapeStatus = new Map();

const colshapeBarberShop = global.creatorShapeSphere(133.59059143066406, -1709.515869140625, 28.291629791259766, 1.5);

function ensureInBarberShopSession(player) {
    if (player && mp.players.exists(player) && player.dimension !== 0) return true;
    isNotify(player, 2, 'top-mid', 'Вы не в барбершопе.', 3000);
    return false;
}

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeBarberShop) {
            if (!player.getVariable('auth')) return;
            playerColshapeStatus.set(player.id, true); 
            player.call('updateColshapeStatus2', [true]); 
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeBarberShop) {
            if (!player.getVariable('auth')) return;
            playerColshapeStatus.set(player.id, false); 
            player.call('updateColshapeStatus2', [false]); 
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('teleportToLocation2', (player, destination) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) {
            return
        }

        let dimension;
        let playerRotate;

        if (destination === 'teleportCoords') {
            if(!(typeof global.legacyWorldNear==='function'&&global.legacyWorldNear(player,'barber'))&&Math.hypot(player.position.x-133.59,player.position.y+1709.51,player.position.z-29.29)>4)return;
            player._legacyBarberSession=true;
            dimension = Math.floor(Math.random() * 1000) + 1;
            // Кресло в барбершопе Davis (не магаз одежды)
            if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,137.82000732421875, -1709.43994140625, 29.291629791259766,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(137.82000732421875, -1709.43994140625, 29.291629791259766);
            playerRotate = 230.0;

            if (typeof global.capturePedShopRestoreSnapshot === 'function') {
                global.capturePedShopRestoreSnapshot(player);
            }
            player.call('armorplayern', [player]);
            player.setClothes(9, 0, 0, 0);
            player.setVariable('armor', null);
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') !== false) player.call('hideAmmo');
        } else if (destination === 'exitCoords') {
            if(!player._legacyBarberSession)return;player._legacyBarberSession=false;
            if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
                global.reapplyPlayerClothesAfterShopClose(player);
            }
            dimension = 0;
            if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,138.3806610107422, -1705.8885498046875, 29.2916316986084,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(138.3806610107422, -1705.8885498046875, 29.2916316986084);
            playerRotate = 134.5637664794922;
        }

        player.heading = playerRotate; 
        player.dimension = dimension;
        if(destination==='exitCoords'&&typeof global.legacyWorldExit==='function')global.legacyWorldExit(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("barber:setdemo:s", (player, name) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInBarberShopSession(player)) return;

        const items = global.barberlist;
        if (!items.hasOwnProperty(name)) return;

        const item = items[name];
        // Только setClothes — без canonicalHair / delayed DLC-sync (примерка не должна дёргаться).
        if (name === "Налысо") {
            player.setClothes(2, 0, 0, 0);
        } else {
            player.setClothes(item.slot || 2, item.drawable, item.texture || 0, 0);
        }
    } catch (error) {
        console.log(error);
    }
});

// ═══════════════════════════════════════════════
//  MAKEUP — table, buy, load
// ═══════════════════════════════════════════════

const MAKEUP_PRICE = 1000;
const MAKEUP_OVERLAY = 4;

function ensureMakeupTable() {
    if (typeof global.whenDbReady !== 'function') {
        setTimeout(ensureMakeupTable, 1500);
        return;
    }
    global.whenDbReady(() => {
        if (!global.DB) return;
        global.DB.query(
            `CREATE TABLE IF NOT EXISTS player_makeup (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            static    INT NOT NULL,
            style_id  TINYINT UNSIGNED NOT NULL,
            opacity   FLOAT NOT NULL DEFAULT 1.0,
            INDEX idx_static (static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            [],
            (err) => {
                if (err) console.log('[player_makeup] CREATE TABLE:', err.message || err);
                else console.log('[player_makeup] таблица готова.');
            }
        );
    });
}
ensureMakeupTable();

function syncMakeupToClient(player, styleId, opacity) {
    try {
        if (!mp.players.exists(player)) return;
        player.call('barber:makeup:demo:local', [styleId, opacity]);
    } catch (_e) {}
}

global.setMakeup = function(player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        global.DB.query(
            'SELECT style_id, opacity FROM player_makeup WHERE static = ? ORDER BY id LIMIT 1',
            [player.static],
            (err, rows) => {
                if (err) { console.log('[setMakeup]', err); return; }
                if (!mp.players.exists(player)) return;
                try { player.setHeadOverlay(MAKEUP_OVERLAY, [255, 0.0, 0, 0]); } catch (_e) {}
                syncMakeupToClient(player, 255, 0.0);
                if (!rows || !rows.length) return;
                try {
                    const styleId = rows[0].style_id;
                    const opacity = parseFloat(rows[0].opacity);
                    player.setHeadOverlay(MAKEUP_OVERLAY, [styleId, opacity, 0, 0]);
                    syncMakeupToClient(player, styleId, opacity);
                } catch (_e) {}
            }
        );
    } catch (e) { console.log('[setMakeup]', e); }
};

mp.events.add('barber:makeup:resync:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.setMakeup === 'function') global.setMakeup(player);
    } catch (_e) {}
});

mp.events.add('barber:makeup:buy:s', (player, styleIdRaw, opacityRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInBarberShopSession(player)) return;
        if (new Date().getTime() - player.clicked < 1000)
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        const styleId = parseInt(styleIdRaw, 10);
        const opacity = Math.max(0, Math.min(1, parseFloat(opacityRaw)));
        if (Number.isNaN(styleId) || styleId < 0 || styleId > 94) return;
        if (Number.isNaN(opacity)) return;

        if (MAKEUP_PRICE > Number(player.money))
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);

        global.DB.query(
            'DELETE FROM player_makeup WHERE static = ?',
            [player.static],
            (errDel) => {
                if (errDel) { console.log('[makeup:buy del]', errDel); return; }
                global.DB.query(
                    'INSERT INTO player_makeup (static, style_id, opacity) VALUES (?, ?, ?)',
                    [player.static, styleId, opacity],
                    (err) => {
                        if (err) { console.log('[makeup:buy]', err); return; }
                        const newMoney = parseInt(Number(player.money), 10) - MAKEUP_PRICE;
                        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (e2) => {
                            if (e2) console.log(e2);
                        });
                        player.money = newMoney;
                        player.call('updateMoney', [global.formatnum1(newMoney)]);
                        isNotify(player, 3, 'top-mid', `-${global.formatnum2(MAKEUP_PRICE)}$`, 3000);
                        player.call('sound:client', [3]);
                        try { player.setHeadOverlay(MAKEUP_OVERLAY, [styleId, opacity, 0, 0]); } catch (_e) {}
                        syncMakeupToClient(player, styleId, opacity);
                    }
                );
            }
        );
    } catch (e) { console.log('[makeup:buy]', e); }
});

/* ═══════════════════════════════════════════════
 *  Внешность из создания персонажа: брови, борода, цвет глаз, цвет волос.
 *  Хранение — общий appearance_json (global.updateCharAppearanceField).
 * ═══════════════════════════════════════════════ */

const APPEARANCE_PRICES = {
    eyebrows: 500,
    beard: 700,
    eyecolor: 800,
    haircolor: 400
};

mp.events.add('barber:appearance:buy:s', (player, category, aRaw, bRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInBarberShopSession(player)) return;
        if (new Date().getTime() - player.clicked < 1000)
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        const price = APPEARANCE_PRICES[category];
        if (!price) return;

        const a = parseInt(aRaw, 10);
        const b = parseInt(bRaw, 10);
        let patch = null;

        if (category === 'eyebrows') {
            if (!(a >= 0 && a <= 33)) return;
            const col = Number.isFinite(b) && b >= 0 && b <= 63 ? b : 0;
            patch = { eyebrows: { style: a, color: col, opacity: 1.0 } };
            try {
                player.setHeadOverlay(2, [a, 1.0, 1, 1]);
                player.setHeadOverlayColor(2, 1, col, 0);
            } catch (_e) {}
        } else if (category === 'beard') {
            const style = a === 255 ? 255 : a;
            if (!((style >= 0 && style <= 28) || style === 255)) return;
            const col = Number.isFinite(b) && b >= 0 && b <= 63 ? b : 0;
            patch = { beard: { style: style, color: col, opacity: style === 255 ? 0.0 : 1.0 } };
            try {
                player.setHeadOverlay(1, [style, style === 255 ? 0.0 : 1.0, 1, 1]);
                player.setHeadOverlayColor(1, 1, col, 0);
            } catch (_e) {}
        } else if (category === 'eyecolor') {
            if (!(a >= 0 && a <= 31)) return;
            patch = { eyeColor: a };
        } else if (category === 'haircolor') {
            if (!(a >= 0 && a <= 63)) return;
            patch = { hair: { color: a, highlight: a } };
        } else {
            return;
        }

        if (price > Number(player.money))
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);

        if (typeof global.updateCharAppearanceField !== 'function') return;

        const newMoney = parseInt(Number(player.money), 10) - price;
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (e) => {
            if (e) console.log(e);
        });
        player.money = newMoney;
        player.call('updateMoney', [global.formatnum1(newMoney)]);
        isNotify(player, 3, 'top-mid', `-${global.formatnum2(price)}$`, 3000);
        player.call('sound:client', [3]);

        global.updateCharAppearanceField(player, patch);
    } catch (e) {
        console.log('[barber:appearance:buy:s]', e.message || e);
    }
});

/** Откатить непокупленные демо-правки: применить сохранённую внешность (из памяти или БД). */
mp.events.add('barber:appearance:revert:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.appearanceData && typeof global.applyAppearancePartial === 'function') {
            global.applyAppearancePartial(player, player.appearanceData);
            return;
        }
        if (typeof global.hydrateCharAppearanceFromDb === 'function') {
            global.hydrateCharAppearanceFromDb(player);
        }
    } catch (_e) {}
});

mp.events.add("barber:buy:s", (player, name, hairColor, hairHighlight) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInBarberShopSession(player)) return;

        const items = global.barberlist;

        if (items.hasOwnProperty(name)) {
            const item = items[name];

            if (item.price > Number(player.money)) return isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);

            const col = parseInt(hairColor, 10);
            const hi = parseInt(hairHighlight, 10);
            const hairStyle = (name === "Налысо") ? 0 : parseInt(item.drawable, 10);

            let newMoney = parseInt(Number(player.money)) - parseInt(Number(item.price));
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err, resluts) {
                if (err) return console.log(err);
            });
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            player.money = newMoney;
            isNotify(player, 3, "top-mid", `-${global.formatnum2(item.price)}$`, 3000);
            player.call('sound:client', [3]);
            const column = 'hair';
            const staticId = player.static;
            const clothesFr =
                typeof global.getClothesFractionForPlayer === 'function'
                    ? global.getClothesFractionForPlayer(player)
                    : 0;

            if (name === "Налысо") {
                global.DB.query(
                    `UPDATE clothes SET ${column} = NULL WHERE static = ? AND fraction = ?`,
                    [staticId, clothesFr],
                    (err) => {
                        if (err) console.log("Ошибка при обновлении одежды в БД:", err);
                    }
                );
                player.setClothes(2, 0, 0, 0);
                if (typeof global.syncPlayerCanonicalHair === 'function') global.syncPlayerCanonicalHair(player, 0, 0);
            } else {
                const valueToSave = `${item.drawable}:${item.texture}`;
                global.updateOrInsertClothes(staticId, clothesFr, column, valueToSave, (err) => {
                    if (err) console.log(err);
                });
                if (typeof global.applyPlayerHairClothes === 'function') {
                    global.applyPlayerHairClothes(player, item.drawable, item.texture);
                } else {
                    player.setClothes(item.slot, item.drawable, item.texture, 0);
                }
            }

            const useCol = Number.isFinite(col) && col >= 0 && col <= 63;
            const useHi = Number.isFinite(hi) && hi >= 0 && hi <= 63;
            if (useCol || useHi) {
                const c1 = useCol ? col : 0;
                const c2 = useHi ? hi : c1;
                try { player.setHairColor(c1, c2); } catch (_e) {}
            }

            const hairPatch = {};
            if (Number.isFinite(hairStyle)) hairPatch.style = hairStyle;
            if (useCol) hairPatch.color = col;
            if (useHi) hairPatch.highlight = hi;
            else if (useCol) hairPatch.highlight = col;
            if (Object.keys(hairPatch).length && typeof global.updateCharAppearanceField === 'function') {
                global.updateCharAppearanceField(player, { hair: hairPatch });
            }
        }
    } catch (error) {
        console.log(error);
    }
});
/** Fallback: ?????? ??????? ??????????? ????????, ?????? ?????? ????????????? ?? ??. */
mp.events.add('hat:restoreHair:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const clothesFr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer(player)
                : 0;
        global.DB.query(
            'SELECT hair FROM clothes WHERE static = ? AND fraction = ? LIMIT 1',
            [player.static, clothesFr],
            (err, rows) => {
                if (err || !rows || !rows.length || !rows[0].hair) return;
                const parts = String(rows[0].hair).split(':');
                const hd = parseInt(parts[0], 10);
                const ht = parseInt(parts[1], 10);
                if (!Number.isFinite(hd)) return;
                const texture = Number.isFinite(ht) ? ht : 0;
                if (typeof global.applyPlayerHairClothes === 'function') {
                    global.applyPlayerHairClothes(player, hd, texture);
                } else {
                    player.setClothes(2, hd, texture, 0);
                }
                try {
                    player.call('client:resetHatHairAfterClothing');
                } catch (_eR) {}
            }
        );
    } catch (e) { console.log('[hat:restoreHair:s]', e); }
});
