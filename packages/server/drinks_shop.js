'use strict';

const KABLUK_POS = new mp.Vector3(127.46135711669922, -1285.2288818359375, 29.28139877319336);
const KABLUK_HEADING = -62.129676818847656;
/** Радиус цилиндра покупки (E) и ЗЗ — совпадает с маркером на полу. */
const KABLUK_ZONE_R = 1.6;

const DRINKS_ITEMS = {
    Asti: { item: 'item_alco', price: 700, label: 'Медовуха' },
    Spank: { item: 'item_spank', price: 2500, label: 'Спанк' }
};

const priorPriceEntries=global.legacyPriceEntries;global.legacyPriceEntries=()=>[...(priorPriceEntries?.()||[]),...Object.entries(DRINKS_ITEMS).map(([key,r])=>({business:'drinks',key,name:r.label,price:r.price,currency:'$'}))];

global.creatorLabelsNew('Каблук', new mp.Vector3(KABLUK_POS.x, KABLUK_POS.y, KABLUK_POS.z + 1.05), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 12,
    scale: [1.4, 1.4],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});

global.creatorMarkersNew(1, new mp.Vector3(KABLUK_POS.x, KABLUK_POS.y, KABLUK_POS.z - 1.0), 0.9, {
    color: [255, 138, 30, 190],
    visible: true,
    dimension: 0
});

mp.blips.new(121, KABLUK_POS, {
    name: 'Каблук',
    color: 5,
    shortRange: true,
    scale: 1.0
});

const kablukColshape = global.creatorShapeSphere(KABLUK_POS.x, KABLUK_POS.y, KABLUK_POS.z, KABLUK_ZONE_R);
const playerKablukZone = new Map();

function playerNearKabluk(player) {
    try {
        if (!player || !mp.players.exists(player) || player.dimension !== 0) return false;
        const p = player.position;
        const dx = p.x - KABLUK_POS.x;
        const dy = p.y - KABLUK_POS.y;
        return Math.sqrt((dx * dx) + (dy * dy)) <= KABLUK_ZONE_R + 0.15;
    } catch (_e) {
        return false;
    }
}

function ensureNearKabluk(player) {
    if (playerNearKabluk(player)) {
        playerKablukZone.set(player.id, true);
        return true;
    }
    playerKablukZone.delete(player.id);
    isNotify(player, 2, 'top-mid', 'Вы слишком далеко от «Каблук».', 3000);
    return false;
}

function buyDrinkForPlayer(player, itemKey, payMethod) {
    const cfg = DRINKS_ITEMS[itemKey];
    if (!cfg) return;

    const price = typeof global.legacyPrice==='function'?global.legacyPrice('drinks',String(itemKey),cfg.price):cfg.price;
    const name = cfg.item;
    const useCash = payMethod !== 'card';
    const balance = useCash ? Number(player.money) : Number(player.bank || player.money);

    if (price > balance) {
        isNotify(player, 2, 'top-mid', useCash ? 'Недостаточно наличных.' : 'Недостаточно средств на карте.', 3000);
        return;
    }

    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (typeof global.canAddConsumableQtyToGrid === 'function' && !global.canAddConsumableQtyToGrid(player, name, 1)) {
        return isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
    }

    const newBalance = parseInt(balance, 10) - price;

    if (useCash) {
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newBalance, player.static], () => {});
        player.money = newBalance;
        player.call('updateMoney', [global.formatnum1(newBalance)]);
    } else if (player.bank != null) {
        global.DB.query('UPDATE accounts SET bank = ? WHERE static = ?', [newBalance, player.static], () => {});
        player.bank = newBalance;
    } else {
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newBalance, player.static], () => {});
        player.money = newBalance;
        player.call('updateMoney', [global.formatnum1(newBalance)]);
    }

    if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
        global.mergeConsumableQtyIntoGrid(player, name, 1);
    } else if (global.invGridTryPush) {
        global.invGridTryPush(player, name);
    } else {
        player.inventory.push(name);
    }

    global.saveInventory(player);
    isNotify(player, 3, 'top-mid', `-${global.formatnum1(price)}$ · ${cfg.label}`, 3000);
}

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape !== kablukColshape) return;
        if (!player.getVariable('auth')) return;
        playerKablukZone.set(player.id, true);
        player.call('drinksShop:enterZone', []);
    } catch (e) {
        console.log('[drinksShop:enter]', e.message || e);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape !== kablukColshape) return;
        playerKablukZone.delete(player.id);
        player.call('drinksShop:exitZone', []);
    } catch (e) {
        console.log('[drinksShop:exit]', e.message || e);
    }
});

mp.events.add('drinksShop:buy', (player, itemKey, payMethod) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureNearKabluk(player)) return;
        const key = String(itemKey || '').trim();
        if (!DRINKS_ITEMS[key]) return;
        buyDrinkForPlayer(player, key, String(payMethod || 'cash'));
    } catch (e) {
        console.log('[drinksShop:buy]', e.message || e);
    }
});

mp.events.add('drinksShop:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureNearKabluk(player)) return;
        player.call('drinksShop:open:c', []);
    } catch (e) {
        console.log('[drinksShop:open:s]', e.message || e);
    }
});

mp.events.add('playerQuit', (player) => {
    playerKablukZone.delete(player.id);
});
