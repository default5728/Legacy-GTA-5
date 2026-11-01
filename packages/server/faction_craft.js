'use strict';

const { FACTION_CRAFT_SECTIONS, findCraftRecipe } = require('./config/faction_craft.js');

function playerFractionId(player) {
    const f = player.getVariable('fraction');
    return f != null ? parseInt(f, 10) || 0 : 0;
}

function playerFractionRank(player) {
    return parseInt(player.fraction_rank, 10) || 0;
}

function getPlayerFraction(player) {
    const fid = playerFractionId(player);
    if (!fid || !global.fractionsData[fid]) return null;
    return global.fractionsData[fid];
}

function rankHasCraft(fracData, rank) {
    if (rank === 10) return true;
    const r = fracData.ranks.find((x) => x.rank === rank);
    if (!r) return false;
    return !!r.craftAccess;
}

function playerAtFactionCraft(player, fractionId) {
    const pos = require('./config/faction_craft.js').FACTION_CRAFT_POSITIONS[fractionId];
    if (!pos || !mp.players.exists(player)) return false;
    if (player.dimension !== 0) return false;
    return player.dist(new mp.Vector3(pos.x, pos.y, pos.z)) <= (pos.radius || 1.2) + 1.0;
}

function giveCraftItemToPlayer(player, item, qty) {
    if (!mp.players.exists(player)) return false;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const base = String(item || '').trim();
    const amount = parseInt(qty, 10) || 1;
    const stackBases = ['item_spank', 'item_alco', 'Бронежилет', 'Аптечка'];
    if (stackBases.includes(base)) {
        if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
            return global.mergeConsumableQtyIntoGrid(player, base, amount);
        }
        return false;
    }
    if (typeof global.invGridTryPush === 'function') {
        for (let i = 0; i < amount; i++) {
            if (!global.invGridTryPush(player, base)) return false;
        }
        return true;
    }
    for (let i = 0; i < amount; i++) player.inventory.push(base);
    return true;
}

mp.events.add('fraction:craft:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid) return isNotify(player, 2, 'top-mid', 'Вы не состоите во фракции.', 3000);
        if (!playerAtFactionCraft(player, fid))
            return isNotify(player, 2, 'top-mid', 'Подойдите к точке крафта.', 3000);
        const fracData = getPlayerFraction(player);
        if (!fracData) return;
        const rank = playerFractionRank(player);
        if (!rankHasCraft(fracData, rank))
            return isNotify(player, 2, 'top-mid', 'У вашего ранга нет доступа к крафту.', 3500);
        player.call('fraction:craft:open:c', [
            JSON.stringify(FACTION_CRAFT_SECTIONS),
            parseInt(fracData.materials, 10) || 0
        ]);
    } catch (e) { console.log('[CRAFT] open:', e.message || e); }
});

mp.events.add('fraction:craft:do:s', (player, sectionRaw, itemRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid) return;
        if (!playerAtFactionCraft(player, fid))
            return isNotify(player, 2, 'top-mid', 'Подойдите к точке крафта.', 3000);
        const fracData = getPlayerFraction(player);
        if (!fracData) return;
        const rank = playerFractionRank(player);
        if (!rankHasCraft(fracData, rank))
            return isNotify(player, 2, 'top-mid', 'Нет доступа к крафту.', 3000);

        const sectionId = parseInt(sectionRaw, 10);
        const itemId = parseInt(itemRaw, 10);
        const found = findCraftRecipe(sectionId, itemId);
        if (!found) return isNotify(player, 2, 'top-mid', 'Рецепт не найден.', 3000);

        const { recipe } = found;
        const cost = parseInt(recipe.mats, 10) || 0;
        const curMats = parseInt(fracData.materials, 10) || 0;
        if (curMats < cost)
            return isNotify(player, 2, 'top-mid', `Недостаточно материалов на складе (нужно ${cost}, есть ${curMats}).`, 4000);

        const giveQty = parseInt(recipe.qty, 10) || 1;
        if (!global.removeFactionMaterials(fid, cost)) {
            return isNotify(player, 2, 'top-mid', 'Не удалось списать материалы.', 3000);
        }

        if (!giveCraftItemToPlayer(player, recipe.item, giveQty)) {
            if (typeof global.addFactionMaterials === 'function') {
                global.addFactionMaterials(fid, cost, () => {});
            }
            return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3500);
        }

        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);

        const itemLabel = recipe.name || recipe.item;
        isNotify(player, 3, 'top-mid', `Скрафчено: ${itemLabel} (−${cost} мат.)`, 4500);
        player.call('fraction:craft:materials:c', [parseInt(fracData.materials, 10) || 0]);
    } catch (e) { console.log('[CRAFT] do:', e.message || e); }
});
