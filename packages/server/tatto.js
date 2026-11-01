const TATTOO_CATALOG = require('./config/tattoo_catalog.json');

global.creatorPedsNew(mp.joaat('u_m_y_tattoo_01'), new mp.Vector3(1324.5, -1649.9832763671875, 52.27503204345703), {
    dynamic: true,
    invincible: true,
    frozen: true,
    heading: 131.8246307373047
});

global.creatorLabelsNew('Тату салон (E)', new mp.Vector3(1322.986572265625, -1651.230712890625, 52.27501678466797), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 0,
    scale: [1.5, 1.5],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});
global.creatorMarkersNew(1, new mp.Vector3(1322.986572265625, -1651.230712890625, 52.27501678466797 - 1.12), 1, {
    color: [255, 255, 255, 255],
    visible: false,
    dimension: 0
});

// SYSTEM

let playerColshapeStatus = new Map();

const colshapeBarberShop = global.creatorShapeSphere(1322.986572265625, -1651.230712890625, 52.27501678466797, 1.5);

function ensureInTattooShopSession(player) {
    if (player && mp.players.exists(player) && player.dimension !== 0) return true;
    isNotify(player, 2, 'top-mid', 'Вы не в тату-салоне.', 3000);
    return false;
}

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeBarberShop) {
            if (!player.getVariable('auth')) return;
            playerColshapeStatus.set(player.id, true); 
            player.call('updateColshapeStatus3', [true]); 
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
            player.call('updateColshapeStatus3', [false]); 
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('teleportToLocation3', (player, destination) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) {
            return
        }

        let dimension;
        let playerRotate;

        if (destination === 'teleportCoords') {
            if(!(typeof global.legacyWorldNear==='function'&&global.legacyWorldNear(player,'tattoo'))&&Math.hypot(player.position.x-1323,player.position.y+1651.2,player.position.z-52.27)>4)return;
            player._legacyTattooSession=true;
            dimension = Math.floor(Math.random() * 1000) + 1;
            if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,1321.7938232421875, -1654.1748046875, 52.27540969848633,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(1321.7938232421875, -1654.1748046875, 52.27540969848633);
            playerRotate = -13.632865905761719;

            if (typeof global.capturePedShopRestoreSnapshot === 'function') {
                global.capturePedShopRestoreSnapshot(player);
            }

            player.setClothes(3, 15, 0, 0);
            player.setClothes(11, 15, 0, 0);
            player.setClothes(4, 14, 0, 0);
            player.setClothes(6, 34, 0, 0);
            player.setClothes(7, 0, 0, 0);

            player.call('armorplayern', [player]);
            player.setClothes(9, 0, 0, 0);
            player.setVariable('armor', null);
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') !== false) player.call('hideAmmo');
            player._tattooPreview = null;
            if (Array.isArray(player._tattooListCache)) {
                if (typeof global.applyTattoosList === 'function') {
                    global.applyTattoosList(player, player._tattooListCache);
                }
            } else if (typeof global.setTatto === 'function') {
                global.setTatto(player);
            }
        } else if (destination === 'exitCoords') {
            if(!player._legacyTattooSession)return;player._legacyTattooSession=false;
            player._tattooPreview = null;
            player.setVariable('shopc', false);
            if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
                global.reapplyPlayerClothesAfterShopClose(player);
            } else if (typeof global.setTatto === 'function') {
                global.setTatto(player);
            }

            dimension = 0;
            if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,1326.3480224609375, -1652.421875, 52.27584457397461,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(1326.3480224609375, -1652.421875, 52.27584457397461);
            playerRotate = 39.11931610107422;
        }

        player.heading = playerRotate; 
        player.dimension = dimension;
        if(destination==='exitCoords'&&typeof global.legacyWorldExit==='function')global.legacyWorldExit(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("tatto:setdemo:s", (player, collection, overlay) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInTattooShopSession(player)) return;

        const col = String(collection || '').trim();
        const ov = String(overlay || '').trim();
        if (!col || !ov) return;

        player._tattooPreview = { collection: col, overlay: ov };

        const applyDemo = (tattoos) => {
            const normalized = typeof global.normalizeTattooList === 'function'
                ? global.normalizeTattooList(tattoos)
                : (Array.isArray(tattoos) ? tattoos : []);
            player._tattooListCache = normalized;
            if (typeof global.applyTattoosList === 'function') {
                global.applyTattoosList(player, normalized, col, ov);
            }
        };

        if (Array.isArray(player._tattooListCache)) {
            applyDemo(player._tattooListCache);
            return;
        }

        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log('[tatto:setdemo]', err.message || err);
                return;
            }
            if (!mp.players.exists(player)) return;
            let tattoos = [];
            try {
                if (results.length > 0 && results[0].tatto) {
                    tattoos = typeof global.normalizeTattooList === 'function'
                        ? global.normalizeTattooList(JSON.parse(results[0].tatto))
                        : JSON.parse(results[0].tatto);
                }
            } catch (_parseErr) {
                tattoos = [];
            }
            applyDemo(tattoos);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("tatto:buy:s", (player, collection, overlay, _clientPrice, payTypeRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureInTattooShopSession(player)) return;
        const payType = parseInt(payTypeRaw, 10);
        if (payType !== 0) {
            return isNotify(player, 2, "top-mid", "Татуировки можно оплатить только наличными.", 3000);
        }

        const col = String(collection || '').trim();
        const ov = String(overlay || '').trim();
        const catalogItem = Array.isArray(TATTOO_CATALOG)
            ? TATTOO_CATALOG.find((item) =>
                item && String(item.collection || '') === col &&
                (String(item.overlayMale || '') === ov || String(item.overlayFemale || '') === ov)
            )
            : null;
        const priceNum = catalogItem ? parseInt(Number(catalogItem.price), 10) : 0;
        if (!col || !ov || !catalogItem || !Number.isFinite(priceNum) || priceNum < 1) {
            return isNotify(player, 2, "top-mid", `Некорректные данные татуировки.`, 3000);
        }

        const newTattoo = typeof global.makeTattooKey === 'function'
            ? global.makeTattooKey(col, ov)
            : `${col}:${ov}`;
        if (!newTattoo) {
            return isNotify(player, 2, "top-mid", `Некорректные данные татуировки.`, 3000);
        }

        if (priceNum > Number(player.money)) {
            return isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);
        }

        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log("[tatto:buy] select:", err.message || err);
                return isNotify(player, 2, "top-mid", `Ошибка базы данных. Попробуйте позже.`, 3000);
            }
            if (!mp.players.exists(player)) return;

            let tattoos = [];
            if (results.length > 0 && results[0].tatto) {
                try {
                    tattoos = typeof global.normalizeTattooList === 'function'
                        ? global.normalizeTattooList(JSON.parse(results[0].tatto))
                        : JSON.parse(results[0].tatto);
                } catch (e) {
                    console.log("[tatto:buy] parse:", e.message || e);
                    tattoos = [];
                }
            }
            if (!Array.isArray(tattoos)) tattoos = [];

            if (tattoos.includes(newTattoo)) {
                return isNotify(player, 2, "top-mid", "У вас уже есть эта татуировка!", 3000);
            }

            tattoos.push(newTattoo);
            const json = JSON.stringify(tattoos);

            global.DB.query('UPDATE accounts SET tatto = ? WHERE static = ?', [json, player.static], (updErr) => {
                if (updErr) {
                    console.log("[tatto:buy] update tatto:", updErr.message || updErr);
                    return isNotify(player, 2, "top-mid", `Не удалось сохранить татуировку.`, 3000);
                }
                if (!mp.players.exists(player)) return;

                const newMoney = parseInt(Number(player.money), 10) - priceNum;
                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (moneyErr) => {
                    if (moneyErr) console.log("[tatto:buy] update money:", moneyErr.message || moneyErr);
                });

                player.money = newMoney;
                player.call('updateMoney', [global.formatnum1(newMoney)]);
                isNotify(player, 3, "top-mid", `-${global.formatnum2(priceNum)}$`, 3000);
                player.call('sound:client', [3]);

                player._tattooPreview = null;
                player._tattooListCache = tattoos;
                if (typeof global.applyTattoosList === 'function') {
                    global.applyTattoosList(player, tattoos);
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
});
