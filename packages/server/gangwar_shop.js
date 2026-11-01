/**
 * Магазин на базе фракции (CEF → gangwarShopBuyItem → gangwarShopBuyItem:s).
 * Цены Crime / FIB как в barbershopnew/js/shops.js и menunew/index.js.
 */
'use strict';

const GANGWAR_SHOP_ITEMS = {
    1: { inv: 'Бронежилет', priceCrime: 400, priceFib: 140, stack: true },
    2: { inv: 'Бронежилет', priceCrime: 120, priceFib: 120, stack: true },
    3: { inv: 'weapon_heavyshotgun', priceCrime: 3000, priceFib: 3000 },
    4: { inv: 'weapon_minismg', priceCrime: 2500, priceFib: 2500 },
    5: { inv: 'weapon_carbinerifle', priceCrime: 350, priceFib: 350 },
    6: { inv: 'weapon_combatpdw', priceCrime: 300, priceFib: 300 },
    7: { inv: 'weapon_assaultrifle', priceCrime: 350, priceFib: 350 },
    8: { inv: 'weapon_revolver_mk2', priceCrime: 250000, priceFib: 250000 },
    10: { inv: 'weapon_assaultsmg', priceCrime: 2500, priceFib: 2500 },
    11: { inv: 'weapon_smg', priceCrime: 800, priceFib: 800 },
    12: { inv: 'weapon_smg_mk2', priceCrime: 325, priceFib: 325 },
    13: { inv: 'weapon_assaultshotgun', priceCrime: 10000, priceFib: 10000 },
    14: { inv: 'weapon_advancedrifle', priceCrime: 5600, priceFib: 5600 },
    15: { inv: 'weapon_specialcarbine', priceCrime: 5000, priceFib: 5000 },
    16: { inv: 'weapon_militaryrifle', priceCrime: 3400, priceFib: 3400 },
    18: { inv: 'weapon_compactrifle', priceCrime: 310, priceFib: 310 },
    25: { inv: 'item_adrenaline', priceCrime: 250, priceFib: 250, stack: true },
    26: { inv: 'item_alco', priceCrime: 800, priceFib: 800, stack: true },
    27: { inv: 'item_repairkit', priceCrime: 150, priceFib: 150, stack: true },
    29: { inv: 'weapon_combatpistol', priceCrime: 3000, priceFib: 3000 },
    30: { inv: 'weapon_pistol_mk2', priceCrime: 3000, priceFib: 3000 },
    34: { inv: 'item_spank', priceCrime: 1000, priceFib: 1000, stack: true }
};

function gangwarShopUnitPrice(player, cfg) {
    const fr = Number(player.getVariable('fraction')) || Number(player.fraction) || 0;
    return fr === 6 ? cfg.priceFib : cfg.priceCrime;
}

function gangwarShopCanMergeConsumable(player, invKey) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (let i = 0; i < player.inventory.length; i++) {
        const invItem = player.inventory[i] || '';
        if (invItem === invKey || invItem.startsWith(invKey + ' (')) {
            const m = invItem.match(/\((\d+)\)/);
            const c = m ? parseInt(m[1], 10) : 1;
            if (c < 500) return true;
        }
    }
    if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) return false;
    return true;
}

function gangwarShopPushConsumable(player, invKey, qty) {
    let left = qty;
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const invItem = player.inventory[i] || '';
        if (invItem === invKey || invItem.startsWith(invKey + ' (')) {
            const m = invItem.match(/\((\d+)\)/);
            const c = m ? parseInt(m[1], 10) : 1;
            const add = Math.min(left, 500 - c);
            if (add > 0) {
                player.inventory[i] = `${invKey} (${c + add})`;
                left -= add;
            }
        }
    }
    while (left > 0) {
        if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) return false;
        const chunk = Math.min(left, 500);
        player.inventory.push(chunk === 1 ? `${invKey} (1)` : `${invKey} (${chunk})`);
        left -= chunk;
    }
    return true;
}

function gangwarShopGrant(player, cfg, qty) {
    const invKey = cfg.inv;
    const isWeapon = typeof global.isPaidWeaponInventoryKey === 'function'
        ? global.isPaidWeaponInventoryKey(invKey)
        : String(invKey).startsWith('weapon_');

    if (isWeapon) {
        if (global.isPlayerInventoryFull && global.getInventoryMaxSlots && global.getInventoryUsedSlots) {
            const mx = global.getInventoryMaxSlots(player);
            const us = global.getInventoryUsedSlots(player);
            if (us + qty > mx) {
                isNotify(player, 2, 'top-mid', 'Недостаточно места в инвентаре.', 3500);
                return false;
            }
        } else if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
            isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
            return false;
        }
        if (!Array.isArray(player.inventory)) player.inventory = [];
        for (let i = 0; i < qty; i++) player.inventory.push(invKey);
        if (typeof global.onNewbieWeaponPurchased === 'function') {
            global.onNewbieWeaponPurchased(player, invKey);
        }
        return true;
    }

    if (cfg.stack) {
        if (!gangwarShopCanMergeConsumable(player, invKey)) {
            isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
            return false;
        }
        if (!Array.isArray(player.inventory)) player.inventory = [];
        if (!gangwarShopPushConsumable(player, invKey, qty)) return false;
        return true;
    }

    if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
        isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
        return false;
    }
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (let i = 0; i < qty; i++) player.inventory.push(invKey);
    return true;
}

mp.events.add('gangwarShopBuyItem:s', (player, gameItemIdRaw, countRaw) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('gangwar') !== true && player.getVariable('factionlessHub') !== true) {
            return isNotify(player, 2, 'top-mid', 'Магазин доступен только в режиме Gangwar.', 3000);
        }
        if (player.dimension !== 0) return;

        if (new Date().getTime() - (player.clicked || 0) < 500) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();

        const id = parseInt(String(gameItemIdRaw), 10);
        const cfg = GANGWAR_SHOP_ITEMS[id];
        if (!cfg) return isNotify(player, 2, 'top-mid', 'Товар недоступен.', 3000);

        let qty = parseInt(String(countRaw), 10);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;
        if (qty > 10) qty = 10;

        const unitPrice = gangwarShopUnitPrice(player, cfg);
        const totalPrice = unitPrice * qty;
        if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > Number.MAX_SAFE_INTEGER) {
            return isNotify(player, 2, 'top-mid', 'Некорректная сумма покупки.', 3000);
        }
        const money = Number(player.money) || 0;
        if (totalPrice > money) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
        }

        if (typeof global.economySpendMoney !== 'function') {
            return isNotify(player, 2, 'top-mid', 'Покупка временно недоступна.', 3000);
        }

        global.economySpendMoney(player, totalPrice, (errSpend, okSpend) => {
            if (!mp.players.exists(player)) return;
            if (errSpend || !okSpend) {
                return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
            }
            if (!gangwarShopGrant(player, cfg, qty)) {
                global.economyAddMoney(player, totalPrice, () => {});
                return;
            }
            isNotify(player, 3, 'top-mid', `-${global.formatnum1(totalPrice)}$`, 3000);

            if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
            global.saveInventory(player);
            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
            else {
                player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            }
            try { player.call('sound:client', [3]); } catch (_s) {}
        });
    } catch (e) {
        console.log('[gangwarShopBuyItem:s]', e);
    }
});
