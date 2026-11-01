/**
 * Каблук — продажа Спанк / Медовуха (только наличные).
 */
const KABLUK_BAR_SHOP_POS = new mp.Vector3(127.5905, -1285.5555, 29.2815);
const KABLUK_BAR_SHOP_RADIUS = 2.5;

const KABLUK_PRODUCTS = Object.freeze([
    { id: 0, name: 'Медовуха', item: 'item_alco', price: 600 },
    { id: 1, name: 'Спанк', item: 'item_spank', price: 1000 },
]);

const kablukPurchasing = new Set();

function notifyKabluk(player, type, message, duration = 3000) {
    if (typeof global.isNotify === 'function') {
        global.isNotify(player, type, 'top-mid', message, duration);
    }
}

function playerAtKablukBarShop(player) {
    if (!player || !mp.players.exists(player) || player.dimension !== 0 || !player.position) return false;
    const p = player.position;
    const dx = p.x - KABLUK_BAR_SHOP_POS.x;
    const dy = p.y - KABLUK_BAR_SHOP_POS.y;
    const dz = p.z - KABLUK_BAR_SHOP_POS.z;
    return (dx * dx + dy * dy + dz * dz) <= (KABLUK_BAR_SHOP_RADIUS * KABLUK_BAR_SHOP_RADIUS);
}

global.isPlayerAtKablukBarShop = playerAtKablukBarShop;

function getPlayerCash(player) {
    const raw = player.money;
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
    const parsed = parseInt(String(raw == null ? '' : raw).replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function persistKablukMoney(player, money) {
    if (typeof global.savePlayerMoneyToDb === 'function') {
        global.savePlayerMoneyToDb(player, money);
        return;
    }
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [money, player.static], (error) => {
        if (error) console.log(error);
    });
}

function spendKablukCash(player, totalPrice) {
    const cash = getPlayerCash(player);
    const newMoney = Math.trunc(cash - totalPrice);
    player.money = newMoney;
    persistKablukMoney(player, newMoney);
    player.call('updateMoney', [global.formatnum1(newMoney)]);
    return true;
}

function giveKablukItem(player, item, quantity) {
    if (typeof global.ensureInventoryGrid50 === 'function') {
        global.ensureInventoryGrid50(player);
    }
    if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
        return global.mergeConsumableQtyIntoGrid(player, item, quantity) !== false;
    }
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (let i = 0; i < quantity; i++) {
        const empty = player.inventory.findIndex((cell) => cell == null || cell === '');
        if (empty < 0) return false;
        player.inventory[empty] = item;
    }
    return true;
}

mp.blips.new(121, KABLUK_BAR_SHOP_POS, {
    name: 'Каблук',
    color: 0,
    shortRange: true,
    scale: 1.0
});

global.creatorLabelsNew('Каблук (E)', new mp.Vector3(
    KABLUK_BAR_SHOP_POS.x,
    KABLUK_BAR_SHOP_POS.y,
    KABLUK_BAR_SHOP_POS.z + 0.35
), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 10,
    scale: [1.15, 1.15],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});

global.creatorMarkersNew(1, new mp.Vector3(
    KABLUK_BAR_SHOP_POS.x,
    KABLUK_BAR_SHOP_POS.y,
    KABLUK_BAR_SHOP_POS.z - 1
), 1.15, {
    color: [255, 105, 180, 190],
    visible: true,
    dimension: 0
});

mp.events.add('kablukBar:buy:SERVER', (player, productIdRaw, quantityRaw) => {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (player.dimension !== 0) return;
    if (!playerAtKablukBarShop(player)) {
        return notifyKabluk(player, 2, 'Подойдите к барной стойке в Каблуке.', 3000);
    }
    if (kablukPurchasing.has(player.id)) return;

    const productId = Number(productIdRaw);
    const product = KABLUK_PRODUCTS.find((row) => row.id === productId);
    if (!product) {
        return notifyKabluk(player, 2, 'Товар недоступен.', 3000);
    }

    const quantity = Math.trunc(Number(quantityRaw));
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
        return notifyKabluk(player, 2, 'Укажите корректное количество товара.', 3000);
    }

    const unitPrice = Number(product.price) || 0;
    if (unitPrice < 1) {
        return notifyKabluk(player, 2, 'Товар недоступен.', 3000);
    }
    const totalPrice = unitPrice * quantity;
    const balance = getPlayerCash(player);
    if (balance < totalPrice) {
        return notifyKabluk(player, 2, 'Недостаточно наличных для покупки.', 3000);
    }

    if (typeof global.canAddConsumableQtyToGrid === 'function' &&
        !global.canAddConsumableQtyToGrid(player, product.item, quantity)) {
        return notifyKabluk(player, 2, 'Недостаточно места в инвентаре.', 4000);
    }

    kablukPurchasing.add(player.id);
    try {
        if (!Array.isArray(player.inventory)) player.inventory = [];
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

        if (!giveKablukItem(player, product.item, quantity)) {
            return notifyKabluk(player, 2, 'Не удалось добавить товар в инвентарь.', 3500);
        }

        spendKablukCash(player, totalPrice);

        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') {
            global.emitPlayerInventory(player);
        } else {
            player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }

        notifyKabluk(player, 3, `-${global.formatnum1(totalPrice)}$`);
        try { player.call('sound:client', [3]); } catch (_e) {}
    } catch (error) {
        console.log('[kablukBar:buy:SERVER]', error);
        notifyKabluk(player, 2, 'Ошибка покупки. Попробуйте ещё раз.', 3500);
    } finally {
        kablukPurchasing.delete(player.id);
    }
});
