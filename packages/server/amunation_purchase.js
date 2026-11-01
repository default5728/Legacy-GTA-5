'use strict';

const SHOP_POSITIONS = [
    [172.58367919921875, -1726.4952392578125, 29.29168701171875],
    [-10.661846160888672, -1419.117919921875, 29.32600212097168],
    [924.4903564453125, -1565.514404296875, 30.686203002929688],
    [844.349609375, -2332.449951171875, 30.334299087524414],
    [1384.0255126953125, -2074.406494140625, 51.998512268066406],
    [435.4013977050781, -984.6724853515625, 30.689603805541992],
    [-113.97920227050781, -596.5939331054688, 35.16443908691406],
    [21.153650283813477, -1107.2838134765625, 28.677000885009766],
    [811.0198364257812, -2156.6611328125, 28.498988037109375],
];

const CATALOG = Object.freeze({
    'Revolver MKII': { price: 25000, item: 'weapon_revolver_mk2' },
    'Mini SMG': { price: 5000, item: 'weapon_minismg' },
    'Heavy Shotgun': { price: 10000, item: 'weapon_heavyshotgun' },
    'Assault Shotgun': { price: 25000, item: 'weapon_assaultshotgun' },
    'Carabine Rifle': { price: 1000, item: 'weapon_carbinerifle' },
    'Assault Rifle': { price: 1000, item: 'weapon_assaultrifle' },
    'Special Carbine': { price: 2500, item: 'weapon_specialcarbine' },
    'Бронежилет': { price: 500, item: 'Бронежилет' },
});

const STACKABLE = new Set(['Бронежилет']);
const purchasing = new Set();

function notify(player, type, message, duration = 3000) {
    if (typeof global.isNotify === 'function') {
        global.isNotify(player, type, 'top-mid', message, duration);
    }
}

function nearestShopIndex(player) {
    if (!player || player.dimension !== 0 || !player.position) return -1;
    let nearest = -1;
    let bestDistanceSq = 16;
    for (let i = 0; i < SHOP_POSITIONS.length; i += 1) {
        const shop = SHOP_POSITIONS[i];
        const dx = Number(player.position.x) - shop[0];
        const dy = Number(player.position.y) - shop[1];
        const dz = Number(player.position.z) - shop[2];
        const distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq <= bestDistanceSq) {
            nearest = i;
            bestDistanceSq = distanceSq;
        }
    }
    return nearest;
}

function canUseShop(player, shopIndex) {
    if (shopIndex < 0) return false;
    if (shopIndex >= 6) return true;
    const fraction = Number(player.getVariable('fraction'));
    return Number.isInteger(fraction) && fraction === shopIndex + 1;
}

// Kept global so the two legacy purchase events in other.js receive the same
// server-side proximity/faction validation as the migrated CEF event.
global.canUseAmunationShop = function (player) {
    return canUseShop(player, nearestShopIndex(player));
};

function hasInventorySpace(player, item, quantity) {
    if (STACKABLE.has(item)) {
        return typeof global.canAddConsumableQtyToGrid !== 'function' ||
            global.canAddConsumableQtyToGrid(player, item, quantity);
    }
    if (typeof global.getInventoryMaxSlots === 'function' && typeof global.getInventoryUsedSlots === 'function') {
        return global.getInventoryUsedSlots(player) + quantity <= global.getInventoryMaxSlots(player);
    }
    return quantity === 1 && !(global.isPlayerInventoryFull && global.isPlayerInventoryFull(player));
}

function persistMoney(player, money) {
    if (typeof global.savePlayerMoneyToDb === 'function') {
        global.savePlayerMoneyToDb(player, money);
        return;
    }
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [money, player.static], (error) => {
        if (error) console.log(error);
    });
}

function addItems(player, item, quantity) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

    if (STACKABLE.has(item) && typeof global.mergeConsumableQtyIntoGrid === 'function') {
        return global.mergeConsumableQtyIntoGrid(player, item, quantity) !== false;
    }
    if (STACKABLE.has(item) && typeof global.invGridTryPush === 'function') {
        return global.invGridTryPush(player, `${item} (${quantity})`) !== false;
    }
    for (let i = 0; i < quantity; i += 1) {
        if (typeof global.invGridTryPush === 'function') {
            if (!global.invGridTryPush(player, item)) return false;
        } else {
            player.inventory.push(item);
        }
    }
    return true;
}

mp.events.add('amunation:buy:SERVER', (player, rawName, rawQuantity) => {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (purchasing.has(player.id)) return;

    const name = rawName === 'Alcohol' || rawName === 'Алкоголь' ? 'Медовуха' : String(rawName || '');
    const quantity = Number(rawQuantity);
    const product = CATALOG[name];
    if (!product || !Number.isInteger(quantity) || quantity < 1 || (quantity > 10 && !STACKABLE.has(product.item))) {
        return notify(player, 2, 'Товар недоступен.');
    }

    const shopIndex = nearestShopIndex(player);
    if (!canUseShop(player, shopIndex)) {
        return notify(player, 2, 'Подойдите к доступному вам магазину оружия.');
    }
    if (typeof global.isSniperWeaponBase === 'function' && global.isSniperWeaponBase(product.item)) {
        return notify(player, 2, 'Это оружие недоступно.');
    }

    const totalPrice = product.price * quantity;
    const currentMoney = Number(player.money);
    if (!Number.isFinite(currentMoney) || currentMoney < totalPrice) {
        return notify(player, 2, 'Недостаточно наличных для покупки.');
    }
    if (!hasInventorySpace(player, product.item, quantity)) {
        return notify(player, 2, `Недостаточно места в инвентаре (нужно: ${quantity}).`, 4000);
    }

    purchasing.add(player.id);
    try {
        if (!addItems(player, product.item, quantity)) {
            return notify(player, 2, 'Не удалось добавить товар в инвентарь.', 3500);
        }

        const newMoney = Math.trunc(currentMoney - totalPrice);
        player.money = newMoney;
        persistMoney(player, newMoney);
        player.call('updateMoney', [global.formatnum1(newMoney)]);

        global.saveInventory(player);
        if (global.emitPlayerInventory) {
            global.emitPlayerInventory(player);
        } else {
            player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }

        if (product.item.startsWith('weapon_') && typeof global.onNewbieWeaponPurchased === 'function') {
            global.onNewbieWeaponPurchased(player, product.item);
        }
        notify(player, 3, `-${global.formatnum1(totalPrice)}$`);
    } catch (error) {
        console.log('[Amunation purchase]', error);
        notify(player, 2, 'Ошибка покупки. Попробуйте ещё раз.');
    } finally {
        purchasing.delete(player.id);
    }
});
