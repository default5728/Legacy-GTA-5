global.spawnFrozenPed('s_f_y_bartender_01', [77.3467025756836, -1387.694580078125, 29.376117706298828], -167.0623);

const REGULAR_SHOP_POS = {
    x: 77.31112670898438,
    y: -1389.828125,
    z: 29.376155853271484
};

global.creatorMarkersNew(1, new mp.Vector3(REGULAR_SHOP_POS.x, REGULAR_SHOP_POS.y, REGULAR_SHOP_POS.z - 1.12), 1, {
    color: global.INTERACT_CYLINDER_COLOR || [255, 255, 0, 180],
    visible: false,
    dimension: 0
});

// SYSTEM

const { isRegularShopBlockedRow } = require('./config/regular_shop_blocked');
const { regularCashPrice } = require('./config/clothing_economy');

const colshapeMonkeyStore = global.creatorShapeSphere(REGULAR_SHOP_POS.x, REGULAR_SHOP_POS.y, REGULAR_SHOP_POS.z, 1);
const colshapeMarkerMonkeyStore = global.creatorMarkersNew(43, new mp.Vector3(REGULAR_SHOP_POS.x, REGULAR_SHOP_POS.y, REGULAR_SHOP_POS.z), 1, {
    color: [255, 255, 255, 150],
    visible: false,
});
global.creatorLabelsNew('Магазин одежды (E)', new mp.Vector3(REGULAR_SHOP_POS.x, REGULAR_SHOP_POS.y, REGULAR_SHOP_POS.z + 0.15), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 0,
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
});

let playerColshapeStatus = new Map();

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeMonkeyStore) {
            if (!player.getVariable('auth')) return;
            playerColshapeStatus.set(player.id, true); 
            player.call('updateColshapeStatus', [true]);
            if (typeof global.showInteractHint === 'function') global.showInteractHint(player, true);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeMonkeyStore) {
            if (!player.getVariable('auth')) return;
            playerColshapeStatus.set(player.id, false); 
            player.call('updateColshapeStatus', [false]);
            if (typeof global.showInteractHint === 'function') global.showInteractHint(player, false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        playerColshapeStatus.delete(player.id);
        player._clothesShopSession = null;
    } catch (_e) {}
});

function finishClothesShopExit(player, expectedSession) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    const session = String(player._clothesShopSession || '');
    if (!['regular', 'donate', 'spectrum'].includes(session)) return false;
    if (expectedSession && session !== expectedSession) return false;

    let exitPos;
    let heading;
    if (session === 'spectrum') {
        const ex = global.SPECTRUM_SHOP_POS ? global.SPECTRUM_SHOP_POS.exit : null;
        exitPos = ex || {
            x: -199.42996215820312,
            y: -32.3250617980957,
            z: 50.686119079589844
        };
        heading = ex ? ex.h : -13.220948219299316;
    } else if (session === 'donate') {
        exitPos = {
            x: 423.36865234375,
            y: -809.3922729492188,
            z: 29.491119384765625
        };
        heading = -156.34263610839844;
    } else {
        exitPos = {
            x: 70.44630432128906,
            y: -1399.8643798828125,
            z: 29.383726119995117
        };
        heading = -50;
    }

    if(player._legacyWorldReturn&&player._legacyWorldReturn.type==='clothing'){exitPos=player._legacyWorldReturn;heading=exitPos.h;delete player._legacyWorldReturn;}
    if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,exitPos.x, exitPos.y, exitPos.z,{dimension:0,reason:'world-business'});else player.position = new mp.Vector3(exitPos.x, exitPos.y, exitPos.z);
    player.heading = heading;
    player.dimension = 0;
    player.setVariable('shopc', false);
    player.setVariable('invkey', false);
    player._clothesShopSession = null;
    player._flowClothesUiMeta = null;
    const exitToken = Date.now() + 5000;
    player._clothesShopExitUntil = exitToken;
    if (typeof global.acAllowMovement === 'function') {
        global.acAllowMovement(player, 10000, 'clothes-shop-tp');
    }
    if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
        global.reapplyPlayerClothesAfterShopClose(player);
    }
    setTimeout(() => {
        try {
            if (!mp.players.exists(player) || player._clothesShopSession) return;
            if (player._clothesShopExitUntil !== exitToken) return;
            player.call('clothes:shop:visualRestored');
        } catch (_e) {}
    }, 1400);
    return true;
}

mp.events.add('teleportToLocation', (player, destination, requestedSession) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) {
            return
        }

        let dimension;
        let playerRotate;

        if (destination === 'teleportCoords') {
            const fromRegularShop = playerColshapeStatus.get(player.id) === true || (typeof global.legacyWorldNear==='function'&&global.legacyWorldNear(player,'clothing'));
            const fromDonateShop = player._donateClothesShopNear === true;
            const fromSpectrumShop = player._spectrumShopNear === true;
            if (Number(player.dimension) !== 0 || (!fromRegularShop && !fromDonateShop && !fromSpectrumShop)) return;
            player._clothesShopSession = fromSpectrumShop ? 'spectrum' : fromDonateShop ? 'donate' : 'regular';
            const expected = String(requestedSession || '');
            if (expected && player._clothesShopSession !== expected) {
                player._clothesShopSession = null;
                return;
            }
            playerColshapeStatus.set(player.id, false);
            player._donateClothesShopNear = false;
            player._spectrumShopNear = false;
            dimension = Math.floor(Math.random() * 1000) + 1;
            // Снимок и freeze ключа сумки — ДО shopc, иначе peekUnequipToken('bag') пустой.
            if (typeof global.capturePedShopRestoreSnapshot === 'function') {
                global.capturePedShopRestoreSnapshot(player);
            }
            player.setVariable('shopc', true);
            player.setVariable('invkey', false);
            if (player._clothesShopSession === 'spectrum' && global.SPECTRUM_SHOP_POS) {
                const sp = global.SPECTRUM_SHOP_POS.preview || global.SPECTRUM_SHOP_POS.shop;
                if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,sp.x, sp.y, sp.z,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(sp.x, sp.y, sp.z);
                playerRotate = sp.h;
            } else {
                if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,74.81729888916016, -1400.3656005859375, 29.376155853271484,{dimension:dimension,reason:'world-business'});else player.position = new mp.Vector3(74.81729888916016, -1400.3656005859375, 29.376155853271484); // Координаты телепортации
                playerRotate = 0;
            }

            applyMaleFreemodeClothesShopBaselines(player);
            
            // В preview скрываем только компонент жилета. Сам процент/флаг боевой
            // брони не сбрасываем: снимок восстановит визуал после выхода.
            player.setClothes(9, 0, 0, 0);
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') !== false) player.call('hideAmmo');
        } else if (
            destination === 'exitCoordsSpectrum' ||
            destination === 'exitCoords' ||
            destination === 'exitCoordsDonate'
        ) {
            const expectedSession =
                destination === 'exitCoordsSpectrum'
                    ? 'spectrum'
                    : destination === 'exitCoordsDonate'
                      ? 'donate'
                      : 'regular';
            finishClothesShopExit(player, expectedSession);
            return;
        } else {
            return;
        }

        player.heading = playerRotate; 
        player.dimension = dimension; 
        if (typeof global.acAllowMovement === 'function') {
            global.acAllowMovement(player, 10000, 'clothes-shop-tp');
        }
        if (dimension === 0) player._clothesShopSession = null;
        if (
            dimension !== 0 &&
            (typeof global.openFlowClothesShopUi !== 'function' ||
                !global.openFlowClothesShopUi(player, player._clothesShopSession))
        ) {
            finishClothesShopExit(player, player._clothesShopSession);
            player.call('flowClothesShop:openFailed:c');
        }
    } catch (error) {
        console.log(error);
    }
});

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Мужской freemode в магазине: базовый торс и ноги (как /sc 3 15 0 и /sc 4 14 0). */
const SHOP_MALE_FREE_HASH = mp.joaat('mp_m_freemode_01');
const SHOP_FEMALE_FREE_HASH = mp.joaat('mp_f_freemode_01');

/** Слот 11 = 15:0 — стандартный «без верха» у муж. freemode; не затирать комп. 3, иначе вместо голого торса визуально появляется «майка/кофта». */
function isMaleFreemodeBareChestTop(player) {
    if (!mp.players.exists(player) || player.model !== SHOP_MALE_FREE_HASH) return false;
    const top = player.getClothes(11);
    if (!top || top.drawable === undefined) return false;
    return Number(top.drawable) === 15 && Number(top.texture) === 0;
}

function applyMaleFreemodeClothesShopBaselines(player) {
    if (!mp.players.exists(player)) return;
    if (player.model !== SHOP_MALE_FREE_HASH) return;
    if (!isMaleFreemodeBareChestTop(player)) {
        player.setClothes(3, 15, 0, 0);
    }
    player.setClothes(4, 14, 0, 0);
    player.setClothes(6, 34, 0, 0);
}

/** Превью предмета в магазине: те же слоты, что и equipClothItem (inventory_equipment.js), без инвентаря/БД. */
function applyClothesShopDemo(player, item) {
    if (!mp.players.exists(player) || !item) return;
    const cid = Number(item.ClothID);
    const d = Number(item.Drawable);
    const t = Number(item.TopTexture);
    const torsoRaw = item.Torso;
    const hasTorso = torsoRaw !== null && torsoRaw !== undefined && torsoRaw !== 'null';

    if (cid === 1) {
        player.setProp(0, d, t);
        try {
            player.call('sc:syncPropLocal', [0, d, t]);
        } catch (_e) {}
        return;
    }
    if (cid === 2) {
        player.setClothes(1, d, t, 0);
        return;
    }
    if (cid === 3) {
        if (hasTorso) {
            const tt = Number(torsoRaw);
            if (!Number.isNaN(tt)) player.setClothes(3, tt, 0, 0);
        } else if (player.model === SHOP_MALE_FREE_HASH || player.model === SHOP_FEMALE_FREE_HASH) {
            player.setClothes(3, 15, 0, 0);
        }
        player.setClothes(10, 0, 0, 0);
        if (player.model === SHOP_MALE_FREE_HASH || player.model === SHOP_FEMALE_FREE_HASH) {
            player.setClothes(8, 15, 0, 0);
        }
        player.setClothes(11, d, t, 0);
        if (typeof global.reapplyDonateGlovesIfEquipped === 'function') {
            global.reapplyDonateGlovesIfEquipped(player);
        }
        return;
    }
    if (cid === 4) {
        player.setClothes(4, d, t, 0);
        return;
    }
    if (cid === 5) {
        player.setClothes(6, d, t, 0);
        return;
    }
    if (cid === 6) {
        player.setClothes(7, d, t, 0);
        return;
    }
    if (cid === 7) {
        player.setProp(1, d, t);
        return;
    }
    if (cid === 8) {
        // Сумка: не трогаем серверный component 5 при примерке — иначе карман
        // переключается на пустой ключ и вещи из рюкзака «пропадают».
        return;
    }
    if (cid === 12) {
        player.setProp(2, d, t);
        return;
    }
    if (cid === 13) {
        player.setProp(6, d, t);
        return;
    }
    if (cid === 14) {
        player.setProp(7, d, t);
        return;
    }
    if (cid === 15) {
        if (typeof global.applyDonateSkeletonGlovesTorso === 'function') {
            global.applyDonateSkeletonGlovesTorso(player, t, false);
        } else {
            player.setClothes(3, d, t, 0);
        }
        return;
    }
}

global.applyClothesShopDemo = applyClothesShopDemo;

function getCurrentClothes(player) {
    return {
        11: player.getClothes(11),
        4: player.getClothes(4),
        6: player.getClothes(6),
        1: player.getClothes(1),
        2: player.getClothes(2), 
        7: player.getClothes(7) 
    };
}

function takeClothesBuyLock(player, ms) {
    if (!player || !mp.players.exists(player)) return false;
    const now = Date.now();
    if (player._clothesBuyLockUntil && now < player._clothesBuyLockUntil) return false;
    player._clothesBuyLockUntil = now + (Number(ms) || 1500);
    return true;
}

function resolveRegularClothesSellRow(clothid, itemid, itemname, itemfraction, drawable, texture, player) {
    const pool = typeof global.legacyRegularClothesCatalogue==='function'?global.legacyRegularClothesCatalogue(player):global.ClothesItemsSell;
    if (!pool || !pool.length) return null;
    const cid = Number(clothid);
    const iid = Number(itemid);
    const nf = Number(itemfraction);
    const name = itemname == null ? '' : String(itemname);
    const d = drawable != null && drawable !== '' ? Number(drawable) : NaN;
    const t = texture != null && texture !== '' ? Number(texture) : NaN;
    const hasDraw = Number.isFinite(d);
    const hasTex = Number.isFinite(t);
    if (hasDraw && hasTex) {
        const exactNamed = pool.find(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.Drawable) === d &&
                Number(it.TopTexture) === t &&
                Number(it.Frac) === nf &&
                String(it.ItemName || '') === name
        );
        if (exactNamed) return exactNamed;
        return pool.find(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.Drawable) === d &&
                Number(it.TopTexture) === t &&
                Number(it.Frac) === nf
        ) || null;
    }
    let hit = pool.find(
        (it) =>
            Number(it.ClothID) === cid &&
            Number(it.ItemID) === iid &&
            String(it.ItemName || '') === name &&
            Number(it.Frac) === nf &&
            (!hasDraw || Number(it.Drawable) === d) &&
            (!hasTex || Number(it.TopTexture) === t)
    );
    if (hit) return hit;
    hit = pool.find((it) => Number(it.ClothID) === cid && Number(it.ItemID) === iid && Number(it.Frac) === nf);
    if (hit) return hit;
    return pool.find((it) => Number(it.ClothID) === cid && Number(it.ItemID) === iid) || null;
}

function finishClothesGrant(player, item, label, price) {
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    isNotify(
        player,
        3,
        'top-mid',
        `Куплено за ${global.formatnum2(price)}$: ${label || item.ItemName}`,
        3500
    );
    player.call('sound:client', [3]);
}

mp.events.add("clothes:buy:s", (player, clothid, itemid, itemname, itemfraction, drawable, texture) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('shopc') !== true) return;
        if (player._clothesShopSession !== 'regular') {
            return isNotify(player, 2, 'top-mid', 'Откройте обычный магазин одежды.', 3000);
        }
        if (!takeClothesBuyLock(player, 1500)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, покупка обрабатывается.', 2000);
        }

        const item = resolveRegularClothesSellRow(
            clothid,
            itemid,
            itemname,
            itemfraction,
            drawable,
            texture,
            player
        );
        if (!item) {
            console.log(`[clothes buy] item not found ClothID=${clothid} ItemID=${itemid}`);
            return isNotify(player, 2, 'top-mid', 'Предмет не найден в каталоге.', 3000);
        }

        if (isRegularShopBlockedRow(item)) {
            return isNotify(player, 2, 'top-mid', 'Эта модель доступна в премиальном магазине одежды.', 4000);
        }
        const itemIdNumber = Number(item.ItemID);
        const femaleCatalogRow = itemIdNumber >= 10000;
        const playerUsesFemaleCatalog = player.model === SHOP_FEMALE_FREE_HASH;
        if (femaleCatalogRow !== playerUsesFemaleCatalog || Number(item.Price) > 999999) {
            return isNotify(player, 2, 'top-mid', 'Эта модель недоступна вашему персонажу.', 3000);
        }
        const itemNameLower = String(item.ItemName || '').trim().toLowerCase();
        if (
            itemNameLower === 'снять' ||
            itemNameLower === 'bagsdef' ||
            Number(item.ItemID) === 999 ||
            Number(item.ItemID) === 99999
        ) {
            return isNotify(player, 2, 'top-mid', 'Этот вариант нельзя купить.', 3000);
        }

        const price = regularCashPrice(item);
        const curMoney = parseInt(Number(player.money), 10) || 0;
        if (price > curMoney) return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
        if (typeof global.economySpendMoney !== 'function' || typeof global.economyAddMoney !== 'function') {
            return isNotify(player, 2, 'top-mid', 'Покупки временно недоступны.', 3000);
        }
        if (global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }
        const buyerStatic = player.static;

        if (Number(item.ClothID) === 8) {
            if (global.clothingSchemaReady !== true) {
                return isNotify(player, 2, 'top-mid', 'Хранилище сумок ещё не готово. Попробуйте позже.', 4000);
            }
            const img = item.ItemImg && typeof item.ItemImg === 'string' ? item.ItemImg.slice(0, 512) : null;
            player._clothesBuyLockUntil = Date.now() + 5000;
            global.DB.query(
                'INSERT INTO donate_bag_instances (account_static, item_id, frac, drawable, texture, item_name, item_img) VALUES (?,?,?,?,?,?,?)',
                [player.static, item.ItemID, item.Frac, item.Drawable, item.TopTexture, String(item.ItemName || '').slice(0, 384), img],
                function (insErr, insRes) {
                    try {
                        const insertId = insRes && insRes.insertId;
                        if (!mp.players.exists(player) || !player.getVariable('auth')) {
                            if (insertId) {
                                global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                            }
                            return;
                        }
                        if (insErr) {
                            console.log('[clothes buy bag instance]', insErr);
                            return isNotify(player, 2, 'top-mid', 'Ошибка записи сумки. Деньги не списаны.', 4000);
                        }
                        if (!insertId) {
                            return isNotify(player, 2, 'top-mid', 'Ошибка записи сумки. Деньги не списаны.', 4000);
                        }
                        if (global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                            return global.notifyInventoryNoSpace(player, { purchase: true });
                        }
                        const token =
                            typeof global.inventoryMakeClothToken === 'function'
                                ? global.inventoryMakeClothToken(item, insertId)
                                : null;
                        if (!token || !global.tryPushInventoryItem) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                            return isNotify(player, 2, 'top-mid', 'Ошибка предмета одежды.', 3000);
                        }
                        global.economySpendMoney(player, price, (spendErr, ok) => {
                            if (!mp.players.exists(player)) {
                                global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                                if (ok) global.economyAddMoney(buyerStatic, price, () => {});
                                return;
                            }
                            if (spendErr || !ok) {
                                global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                                return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
                            }
                            if (!global.tryPushInventoryItem(player, token)) {
                                global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                                global.economyAddMoney(player, price, () => {});
                                return global.notifyInventoryNoSpace(player, { purchase: true });
                            }
                            finishClothesGrant(player, item, item.ItemName, price);
                        });
                    } catch (eBag) {
                        console.log('[clothes buy bag]', eBag);
                    }
                }
            );
            return;
        }

        const token =
            typeof global.inventoryMakeClothToken === 'function' ? global.inventoryMakeClothToken(item) : null;
        if (!token) {
            return isNotify(player, 2, 'top-mid', 'Ошибка предмета одежды.', 3000);
        }
        if (!global.tryPushInventoryItem) {
            return isNotify(player, 2, 'top-mid', 'Инвентарь временно недоступен.', 3000);
        }
        player._clothesBuyLockUntil = Date.now() + 5000;
        global.economySpendMoney(player, price, (spendErr, ok) => {
            if (!mp.players.exists(player)) {
                if (ok) global.economyAddMoney(buyerStatic, price, () => {});
                return;
            }
            if (spendErr || !ok) {
                return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
            }
            if (!global.tryPushInventoryItem(player, token)) {
                global.economyAddMoney(player, price, () => {});
                return global.notifyInventoryNoSpace(player, { purchase: true });
            }
            finishClothesGrant(player, item, item.ItemName, price);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("clothes:set:demo:s", (player, clothid, itemid, itemname, itemfraction) => {
    /** Примерка только на клиенте (/sc local) — серверный ped и БД не меняем. */
});

mp.events.add('clothes:close:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!finishClothesShopExit(player)) {
            player.setVariable('shopc', false);
            player.setVariable('invkey', false);
        }
    } catch (error) {
        console.log(error);
    }
});