/** Spectrumi — магазин эксклюзивной одежды за DP. */

const { spectrumDpPrice } = require('./config/clothing_economy');

const SPECTRUM_PREVIEW = {
    x: -195.3695831298828,
    y: -24.71133804321289,
    z: 50.698699951171875,
    h: 159.54833984375
};

/** NPC + блип на карте */
const SPECTRUM_NPC = {
    x: -199.210693359375,
    y: -30.50386619567871,
    z: 50.68611526489258,
    h: 163.13243103027344
};

/** Жёлтый цилиндр — вход в магазин */
const SPECTRUM_SHOP = {
    x: -199.42996215820312,
    y: -32.3250617980957,
    z: 50.686119079589844,
    h: -13.220948219299316
};

const SPECTRUM_POS = {
    preview: SPECTRUM_PREVIEW,
    npc: SPECTRUM_NPC,
    shop: SPECTRUM_SHOP,
    exit: SPECTRUM_SHOP
};

global.spawnFrozenPed('u_f_y_comjane', [SPECTRUM_POS.npc.x, SPECTRUM_POS.npc.y, SPECTRUM_POS.npc.z], SPECTRUM_POS.npc.h);

global.creatorMarkersNew(1, new mp.Vector3(SPECTRUM_POS.shop.x, SPECTRUM_POS.shop.y, SPECTRUM_POS.shop.z - 1.0), 1.2, {
    color: global.INTERACT_CYLINDER_COLOR || [255, 255, 0, 180],
    visible: true,
    dimension: 0
});

const colshapeSpectrum = global.creatorShapeSphere(SPECTRUM_POS.shop.x, SPECTRUM_POS.shop.y, SPECTRUM_POS.shop.z, 1.2);
global.creatorLabelsNew('Spectrumi (E)', new mp.Vector3(SPECTRUM_POS.shop.x, SPECTRUM_POS.shop.y, SPECTRUM_POS.shop.z + 0.15), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 12,
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
});
const spectrumNear = new Map();

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player) || shape !== colshapeSpectrum) return;
        if (!player.getVariable('auth')) return;
        spectrumNear.set(player.id, true);
        player._spectrumShopNear = true;
        player.call('spectrum:colshape', [true]);
        if (typeof global.showInteractHint === 'function') global.showInteractHint(player, true);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player) || shape !== colshapeSpectrum) return;
        spectrumNear.set(player.id, false);
        player._spectrumShopNear = false;
        player.call('spectrum:colshape', [false]);
        if (typeof global.showInteractHint === 'function') global.showInteractHint(player, false);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerQuit', (player) => {
    if (!player) return;
    spectrumNear.delete(player.id);
    player._spectrumShopNear = false;
    if (player._clothesShopSession === 'spectrum') player._clothesShopSession = null;
});

function resolveSpectrumSellRow(clothid, itemid, itemname, itemfraction, drawable, texture) {
    const pool = global.SpectrumClothesItemsSell;
    if (!pool || !pool.length) return null;
    const cid = Number(clothid);
    const iid = Number(itemid);
    const nf = Number(itemfraction);
    if (!Number.isFinite(cid) || !Number.isFinite(iid) || !Number.isFinite(nf)) return null;
    const name = itemname == null ? '' : String(itemname);
    const d = drawable != null && drawable !== '' ? Number(drawable) : NaN;
    const t = texture != null && texture !== '' ? Number(texture) : NaN;
    const hasTex = Number.isFinite(t);
    const hasDraw = Number.isFinite(d);

    if (hasTex !== hasDraw) return null;
    /** Покупка из текущего CEF всегда передаёт точные drawable + texture. */
    if (hasTex && hasDraw) {
        const exact = pool.filter(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.Drawable) === d &&
                Number(it.TopTexture) === t &&
                Number(it.Frac) === nf
        );
        if (!exact.length) return null;
        const named = exact.find((it) => String(it.ItemName || '') === name);
        return named || (exact.length === 1 ? exact[0] : null);
    }

    const same = pool.filter(
        (it) =>
            Number(it.ClothID) === cid &&
            Number(it.ItemID) === iid &&
            Number(it.Frac) === nf
    );
    if (!same.length) return null;
    const named = same.filter((it) => String(it.ItemName || '') === name);
    if (named.length === 1) return named[0];
    return same.length === 1 ? same[0] : null;
}

function takeSpectrumBuyLock(player, ms) {
    if (!player || !mp.players.exists(player)) return false;
    const now = Date.now();
    if (player._clothesBuyLockUntil && now < player._clothesBuyLockUntil) return false;
    player._clothesBuyLockUntil = now + (Number(ms) || 1500);
    return true;
}

function finishSpectrumGrant(player, item, label, price) {
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    player.call('spectrum:syncDp', [parseInt(Number(player.dp), 10) || 0]);
    isNotify(player, 3, 'top-mid', `Куплено за ${price} DP: ${label || item.ItemName}`, 3500);
    player.call('sound:client', [3]);
}

function canGrantSpectrumCharm(player) {
    if (typeof global.canAddConsumableQtyToGrid === 'function') {
        return global.canAddConsumableQtyToGrid(player, 'item_spectrum_charm', 1);
    }
    return !global.canAddInventorySlotCount || global.canAddInventorySlotCount(player, 1);
}

function pushSpectrumCharm(player) {
    if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
        return global.mergeConsumableQtyIntoGrid(player, 'item_spectrum_charm', 1);
    }
    return !!(global.tryPushInventoryItem && global.tryPushInventoryItem(player, 'item_spectrum_charm'));
}

function grantSpectrumCloth(player, item, price) {
    const buyerStatic = player.static;

    if (item.spectrumCharmOnly) {
        if (!canGrantSpectrumCharm(player)) return global.notifyInventoryNoSpace(player, { purchase: true });
        player._clothesBuyLockUntil = Date.now() + 5000;
        global.economySpendDp(player, price, (spendErr, ok) => {
            if (!mp.players.exists(player)) {
                if (ok) global.economyAddDp(buyerStatic, price, () => {});
                return;
            }
            if (spendErr || !ok) return isNotify(player, 2, 'top-mid', 'Недостаточно DP.', 3000);
            if (!pushSpectrumCharm(player)) {
                global.economyAddDp(player, price, () => {});
                return global.notifyInventoryNoSpace(player, { purchase: true });
            }
            finishSpectrumGrant(player, item, 'Брелок Ladydy', price);
        });
        return;
    }

    if (Number(item.ClothID) === 8 && !item.spectrumCharmOnly) {
        if (global.clothingSchemaReady !== true) {
            return isNotify(player, 2, 'top-mid', 'Хранилище сумок ещё не готово. Попробуйте позже.', 4000);
        }
        let img = item.ItemImg && typeof item.ItemImg === 'string' ? item.ItemImg.slice(0, 512) : null;
        let bagName = String(item.ItemName || '').slice(0, 384);
        const charms = item.spectrumLddBase ? 0 : 0;
        if (item.spectrumLddBase) {
            bagName =
                typeof global.spectrumLddDisplayName === 'function'
                    ? global.spectrumLddDisplayName(0)
                    : 'Сумка LW LDD без брелков';
            img =
                typeof global.spectrumLddPreviewImg === 'function'
                    ? global.spectrumLddPreviewImg(item.TopTexture)
                    : `spectrum/p/8/149/${Number(item.TopTexture) || 0}.png`;
        }
        player._clothesBuyLockUntil = Date.now() + 5000;
        global.DB.query(
            'INSERT INTO donate_bag_instances (account_static, item_id, frac, drawable, texture, item_name, item_img, charms) VALUES (?,?,?,?,?,?,?,?)',
            [
                player.static,
                item.ItemID,
                item.Frac,
                item.Drawable,
                item.TopTexture,
                bagName,
                img,
                charms
            ],
            (insErr, insRes) => {
                try {
                    const insertId = insRes && insRes.insertId;
                    if (!mp.players.exists(player) || !player.getVariable('auth')) {
                        if (insertId) global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                        return;
                    }
                    if (insErr) {
                        console.log('[spectrum bag]', insErr);
                        return isNotify(player, 2, 'top-mid', 'Ошибка записи сумки.', 4000);
                    }
                    if (!insertId) return isNotify(player, 2, 'top-mid', 'Ошибка записи сумки.', 4000);
                    if (global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
                        global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                        return global.notifyInventoryNoSpace(player, { purchase: true });
                    }
                    const sellRow = item.spectrumLddBase
                        ? Object.assign({}, item, { ItemName: bagName, ItemImg: img, Drawable: item.Drawable })
                        : item;
                    const token =
                        typeof global.inventoryMakeClothToken === 'function'
                            ? global.inventoryMakeClothToken(sellRow, insertId)
                            : null;
                    if (!token || !global.tryPushInventoryItem) {
                        global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                        return isNotify(player, 2, 'top-mid', 'Ошибка предмета одежды.', 3000);
                    }
                    global.economySpendDp(player, price, (spendErr, ok) => {
                        if (!mp.players.exists(player)) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                            if (ok) global.economyAddDp(buyerStatic, price, () => {});
                            return;
                        }
                        if (spendErr || !ok) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                            return isNotify(player, 2, 'top-mid', 'Недостаточно DP.', 3000);
                        }
                        if (!global.tryPushInventoryItem(player, token)) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
                            global.economyAddDp(player, price, () => {});
                            return global.notifyInventoryNoSpace(player, { purchase: true });
                        }
                        finishSpectrumGrant(player, item, null, price);
                    });
                } catch (e) {
                    console.log('[spectrum bag grant]', e);
                }
            }
        );
        return;
    }

    const token = typeof global.inventoryMakeClothToken === 'function' ? global.inventoryMakeClothToken(item) : null;
    if (!token || !global.tryPushInventoryItem) {
        return isNotify(player, 2, 'top-mid', 'Ошибка предмета одежды.', 3000);
    }
    player._clothesBuyLockUntil = Date.now() + 5000;
    global.economySpendDp(player, price, (spendErr, ok) => {
        if (!mp.players.exists(player)) {
            if (ok) global.economyAddDp(buyerStatic, price, () => {});
            return;
        }
        if (spendErr || !ok) return isNotify(player, 2, 'top-mid', 'Недостаточно DP.', 3000);
        if (!global.tryPushInventoryItem(player, token)) {
            global.economyAddDp(player, price, () => {});
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }
        finishSpectrumGrant(player, item, null, price);
    });
}

mp.events.add('clothes:buy:spectrum:s', (player, clothid, itemid, itemname, itemfraction, drawable, texture) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('shopc') !== true) return;
        if (player._clothesShopSession !== 'spectrum') {
            return isNotify(player, 2, 'top-mid', 'Откройте магазин Spectrumi.', 3000);
        }
        if (!takeSpectrumBuyLock(player, 1500)) {
            return isNotify(player, 2, 'top-mid', 'Подождите…', 2000);
        }
        const item = resolveSpectrumSellRow(clothid, itemid, itemname, itemfraction, drawable, texture);
        if (!item) return isNotify(player, 2, 'top-mid', 'Предмет не найден.', 3000);
        const price = spectrumDpPrice(item);
        if (price < 1) return isNotify(player, 2, 'top-mid', 'Неверная цена.', 3000);
        if (typeof global.economySpendDp !== 'function' || typeof global.economyAddDp !== 'function') {
            return isNotify(player, 2, 'top-mid', 'Покупки временно недоступны.', 3000);
        }
        if ((parseInt(Number(player.dp), 10) || 0) < price) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно DP.', 3000);
        }
        if (item.spectrumCharmOnly && !canGrantSpectrumCharm(player)) {
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }
        if (!item.spectrumCharmOnly && global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }
        grantSpectrumCloth(player, item, price);
    } catch (e) {
        console.log('[clothes:buy:spectrum:s]', e);
    }
});

mp.events.add('clothes:spectrum:open:sync', (player) => {
    if (!mp.players.exists(player)) return;
    player.call('spectrum:syncDp', [parseInt(Number(player.dp), 10) || 0]);
});

global.SPECTRUM_SHOP_POS = SPECTRUM_POS;
