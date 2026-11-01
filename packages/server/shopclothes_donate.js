/** Премиальный магазин одежды ($): NPC, колшейп, покупка через clothes:buy:donate:s */

function donateClothNotifyLabel(item) {
    if (!item) return 'Одежда';
    const raw = String(item.ItemName || '').trim();
    let base = raw;
    const suffix = raw.match(/\s*[·•\-]\s*(?:текст|text)\.(\d+)\s*$/i);
    if (suffix) {
        base = raw.slice(0, suffix.index).trim();
    } else if (typeof global.clothDisplayShortName === 'function') {
        base = global.clothDisplayShortName(raw);
    } else {
        const i = raw.indexOf(' · текст.');
        base = i === -1 ? raw : raw.slice(0, i).trim();
    }
    base = base.replace(/\s*\(\d+\s*слотов\)/gi, '').trim();
    let variantNo = null;
    if (suffix) variantNo = parseInt(suffix[1], 10) + 1;
    else {
        const tt = Number(item.TopTexture);
        if (Number.isFinite(tt)) variantNo = tt + 1;
    }
    if (variantNo != null && Number.isFinite(variantNo)) {
        return `${base} — Вариант ${variantNo}`;
    }
    return base;
}

function resolveDonateSellRow(pool, clothid, itemid, itemname, itemfraction, drawable, texture) {
    if (!pool || !pool.length) return null;
    const cid = Number(clothid);
    const iid = Number(itemid);
    const nf = Number(itemfraction);
    const name = itemname == null ? '' : String(itemname);
    const d = drawable != null && drawable !== '' ? Number(drawable) : NaN;
    const t = texture != null && texture !== '' ? Number(texture) : NaN;
    const hasTex = Number.isFinite(t);
    const hasDraw = Number.isFinite(d);

    if (hasTex) {
        let hit = pool.find(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.TopTexture) === t &&
                (!hasDraw || Number(it.Drawable) === d) &&
                Number(it.Frac) === nf
        );
        if (hit) return hit;
        hit = pool.find(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.TopTexture) === t &&
                (!hasDraw || Number(it.Drawable) === d)
        );
        if (hit) return hit;
    }

    let same = pool.filter(
        (it) =>
            Number(it.ClothID) === cid &&
            Number(it.ItemID) === iid &&
            String(it.ItemName || '') === name &&
            (!hasTex || Number(it.TopTexture) === t)
    );
    if (!same.length) {
        same = pool.filter(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                (!hasTex || Number(it.TopTexture) === t)
        );
    }
    if (!same.length) return null;
    const pref = same.find((it) => Number(it.Frac) === nf);
    return pref || same[0];
}

function takeDonateClothesBuyLock(player, ms) {
    if (!player || !mp.players.exists(player)) return false;
    const now = Date.now();
    if (player._clothesBuyLockUntil && now < player._clothesBuyLockUntil) return false;
    player._clothesBuyLockUntil = now + (Number(ms) || 1500);
    return true;
}

function chargeDonateClothesCash(player, price) {
    const cur = parseInt(Number(player.money), 10) || 0;
    const cost = parseInt(Number(price), 10) || 0;
    if (cost < 1 || cur < cost) return false;
    const newMoney = cur - cost;
    player.money = newMoney;
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err) {
        if (err) console.log(err);
    });
    player.call('updateMoney', [global.formatnum1(newMoney)]);
    isNotify(player, 3, 'top-mid', `-${global.formatnum2(cost)}$`, 3000);
    player.call('sound:client', [3]);
    return true;
}

function finishDonateClothesGrant(player, item) {
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    isNotify(player, 3, 'top-mid', `В инвентарь: ${donateClothNotifyLabel(item)}`, 3500);
}

function rollbackPushedClothToken(player, token) {
    if (!player || !token) return;
    if (typeof global.removeOneInventoryExact === 'function') {
        global.removeOneInventoryExact(player, token);
        return;
    }
    if (Array.isArray(player.inventory)) {
        const idx = player.inventory.lastIndexOf(token);
        if (idx >= 0) player.inventory[idx] = null;
    }
}

const DONATE_NPC_POS = [423.3218994140625, -811.4572143554688, 29.491117477416992];
const DONATE_NPC_HEADING = -2.723081588745117;
const DONATE_COL_POS = { x: 423.36865234375, y: -809.3922729492188, z: 29.491119384765625 };

global.spawnFrozenPed('csb_agent', DONATE_NPC_POS, DONATE_NPC_HEADING);

global.creatorMarkersNew(1, new mp.Vector3(DONATE_COL_POS.x, DONATE_COL_POS.y, DONATE_COL_POS.z - 1.12), 1, {
    color: global.INTERACT_CYLINDER_COLOR || [255, 255, 0, 180],
    visible: true,
    dimension: 0
});

const colshapeDonateClothes = global.creatorShapeSphere(DONATE_COL_POS.x, DONATE_COL_POS.y, DONATE_COL_POS.z, 1);
const colshapeMarkerDonateClothes = global.creatorMarkersNew(43, new mp.Vector3(DONATE_COL_POS.x, DONATE_COL_POS.y, DONATE_COL_POS.z), 1, {
    color: [255, 255, 255, 150],
    visible: false,
});
global.creatorLabelsNew('Премиальный магазин одежды (E)', new mp.Vector3(DONATE_COL_POS.x, DONATE_COL_POS.y, DONATE_COL_POS.z + 0.15), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 12,
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
});

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeDonateClothes) {
            if (!player.getVariable('auth')) return;
            player._donateClothesShopNear = true;
            player.call('updateColshapeStatusDonate', [true]);
            if (typeof global.showInteractHint === 'function') global.showInteractHint(player, true);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === colshapeDonateClothes) {
            if (!player.getVariable('auth')) return;
            player._donateClothesShopNear = false;
            player.call('updateColshapeStatusDonate', [false]);
            if (typeof global.showInteractHint === 'function') global.showInteractHint(player, false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (player) player._donateClothesShopNear = false;
    } catch (_e) {}
});

mp.events.add('clothes:donate:syncdp', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.call('updateMoney', [global.formatnum1(parseInt(Number(player.money)) || 0)]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('clothes:set:demo:donate:s', (player, clothid, itemid, itemname, itemfraction) => {
    /** Примерка только на клиенте (/sc local) — серверный ped и БД не меняем. */
});

function handleDonateClothesBuy(player, clothid, itemid, itemname, itemfraction, drawable, texture) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('shopc') !== true) return;
        if (player._clothesShopSession && player._clothesShopSession !== 'donate') {
            return isNotify(player, 2, 'top-mid', 'Откройте премиальный магазин одежды.', 3000);
        }
        if (!takeDonateClothesBuyLock(player, 1500)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, покупка обрабатывается.', 2000);
        }

        const pool = global.DonateClothesItemsSell;
        if (!pool || !pool.length) {
            return isNotify(player, 2, 'top-mid', 'Каталог одежды не загружен.', 3000);
        }

        const item = resolveDonateSellRow(pool, clothid, itemid, itemname, itemfraction, drawable, texture);
        if (!item) {
            console.log(`[donate clothes] item not found ClothID=${clothid} ItemID=${itemid} tex=${texture}`);
            return isNotify(player, 2, 'top-mid', 'Предмет не найден в каталоге.', 3000);
        }

        if (Number(item.ClothID) === 8) {
            try {
                if (typeof global.sanitizeDonateInventory === 'function' && global.sanitizeDonateInventory(player)) {
                    if (typeof global.saveInventory === 'function') global.saveInventory(player);
                }
            } catch (_eSan) {}
        }

        let price = Number(item.Price) + 50000;
        if (Number.isNaN(price) || price < 1) price = 1;

        const curMoney = parseInt(Number(player.money), 10);
        if (Number.isNaN(curMoney)) return isNotify(player, 2, 'top-mid', 'Ошибка баланса.', 3000);
        if (price > curMoney) return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
        if (global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }

        if (Number(item.ClothID) === 8) {
            const img =
                item.ItemImg && typeof item.ItemImg === 'string' ? item.ItemImg.slice(0, 512) : null;
            player._clothesBuyLockUntil = Date.now() + 5000;
            global.DB.query(
                'INSERT INTO donate_bag_instances (account_static, item_id, frac, drawable, texture, item_name, item_img) VALUES (?,?,?,?,?,?,?)',
                [
                    player.static,
                    item.ItemID,
                    item.Frac,
                    item.Drawable,
                    item.TopTexture,
                    String(item.ItemName || '').slice(0, 384),
                    img
                ],
                function (insErr, insRes) {
                    try {
                        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                        if (insErr) {
                            console.log('[donate clothes bag instance]', insErr);
                            return isNotify(player, 2, 'top-mid', 'Ошибка записи сумки. Деньги не списаны.', 4000);
                        }
                        const insertId = insRes && insRes.insertId;
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
                        if (!token || !global.tryPushInventoryItem || !global.tryPushInventoryItem(player, token)) {
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                            return global.notifyInventoryNoSpace(player, { purchase: true });
                        }
                        if (!chargeDonateClothesCash(player, price)) {
                            rollbackPushedClothToken(player, token);
                            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                            global.saveInventory(player);
                            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
                        }
                        finishDonateClothesGrant(player, item);
                    } catch (eBag) {
                        console.log('[donate clothes bag]', eBag);
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
        if (!global.tryPushInventoryItem || !global.tryPushInventoryItem(player, token)) {
            return global.notifyInventoryNoSpace(player, { purchase: true });
        }
        if (!chargeDonateClothesCash(player, price)) {
            rollbackPushedClothToken(player, token);
            global.saveInventory(player);
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
        }
        finishDonateClothesGrant(player, item);
    } catch (error) {
        console.log(error);
    }
}

mp.events.add('clothes:buy:donate:s', handleDonateClothesBuy);
mp.events.add('clothes:buy:dp:s', handleDonateClothesBuy);

const DONATE_CASES_CFG = require('./config/donate_cases');

function grantDonateClothesPrizeFromCase(player, prizeToken, opts) {
    const onDone = opts && typeof opts.onDone === 'function' ? opts.onDone : null;
    const finish = (ok) => {
        if (onDone) onDone(!!ok);
        return !!ok;
    };
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return finish(false);
        const pool = global.DonateClothesItemsSell;
        if (!pool || !pool.length) {
            isNotify(player, 2, 'top-mid', 'Каталог одежды не загружен.', 4000);
            return finish(false);
        }
        const p = DONATE_CASES_CFG.parseCaseClothPrize(prizeToken);
        if (!p) {
            isNotify(player, 2, 'top-mid', 'Некорректный приз одежды.', 4000);
            return finish(false);
        }
        const item = DONATE_CASES_CFG.resolveDonateSellRow(
            pool,
            p.clothid,
            p.itemid,
            p.itemname,
            p.frac,
            p.drawable,
            p.texture
        );
        if (!item) {
            isNotify(player, 2, 'top-mid', 'Предмет не найден в каталоге.', 4000);
            return finish(false);
        }
        if (global.canAddInventorySlotCount && !global.canAddInventorySlotCount(player, 1)) {
            if (typeof global.notifyInventoryNoSpace === 'function') {
                global.notifyInventoryNoSpace(player, { qty: 1 });
            } else {
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
            }
            return finish(false);
        }
        if (Number(item.ClothID) === 8) {
            try {
                if (typeof global.sanitizeDonateInventory === 'function' && global.sanitizeDonateInventory(player)) {
                    if (typeof global.saveInventory === 'function') global.saveInventory(player);
                }
            } catch (_eSan) {}
            const img = item.ItemImg && typeof item.ItemImg === 'string' ? item.ItemImg.slice(0, 512) : null;
            global.DB.query(
                'INSERT INTO donate_bag_instances (account_static, item_id, frac, drawable, texture, item_name, item_img) VALUES (?,?,?,?,?,?,?)',
                [
                    player.static,
                    item.ItemID,
                    item.Frac,
                    item.Drawable,
                    item.TopTexture,
                    String(item.ItemName || '').slice(0, 384),
                    img
                ],
                function (insErr, insRes) {
                    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                    if (insErr) {
                        console.log('[case bag grant]', insErr);
                        isNotify(player, 2, 'top-mid', 'Ошибка выдачи сумки.', 4000);
                        finish(false);
                        return;
                    }
                    const insertId = insRes && insRes.insertId;
                    if (!insertId) {
                        isNotify(player, 2, 'top-mid', 'Ошибка выдачи сумки.', 4000);
                        finish(false);
                        return;
                    }
                    const token =
                        typeof global.inventoryMakeClothToken === 'function'
                            ? global.inventoryMakeClothToken(item, insertId)
                            : null;
                    if (!token || !global.tryPushInventoryItem || !global.tryPushInventoryItem(player, token)) {
                        global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], function () {});
                        isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                        finish(false);
                        return;
                    }
                    global.saveInventory(player);
                    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                    isNotify(player, 3, 'top-mid', `В инвентарь: ${donateClothNotifyLabel(item)}`, 3500);
                    player.call('sound:client', [3]);
                    finish(true);
                }
            );
            return true;
        }
        const token =
            typeof global.inventoryMakeClothToken === 'function' ? global.inventoryMakeClothToken(item) : null;
        if (!token) {
            isNotify(player, 2, 'top-mid', 'Ошибка предмета одежды.', 4000);
            return finish(false);
        }
        if (!global.tryPushInventoryItem || !global.tryPushInventoryItem(player, token)) {
            isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
            return finish(false);
        }
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        isNotify(player, 3, 'top-mid', `В инвентарь: ${donateClothNotifyLabel(item)}`, 3500);
        player.call('sound:client', [3]);
        return finish(true);
    } catch (e) {
        console.log(e);
        return finish(false);
    }
}

global.grantDonateClothesPrizeFromCase = grantDonateClothesPrizeFromCase;
