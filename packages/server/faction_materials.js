'use strict';

const MATERIALS_ZONE_PER_HOUR = 20;
const MATERIALS_ITEM = 'item_materials';

function playerFractionId(player) {
    const f = player.getVariable('fraction');
    return f != null ? parseInt(f, 10) || 0 : 0;
}

function getFactionMaterials(fid) {
    const f = global.fractionsData && global.fractionsData[fid];
    return f ? parseInt(f.materials, 10) || 0 : 0;
}

function setFactionMaterials(fid, amount) {
    const f = global.fractionsData && global.fractionsData[fid];
    if (!f) return 0;
    const n = Math.max(0, parseInt(amount, 10) || 0);
    f.materials = n;
    return n;
}

function broadcastFractionMaterials(fid, materials) {
    const m = parseInt(materials, 10) || 0;
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
        if (playerFractionId(p) !== fid) return;
        try { p.call('fraction:cef:setmaterials', [m]); } catch (_) {}
    });
}

function addFactionMaterials(fid, amount, cb) {
    const add = parseInt(amount, 10) || 0;
    if (!fid || add <= 0) { if (cb) cb(null, getFactionMaterials(fid)); return; }
    const f = global.fractionsData && global.fractionsData[fid];
    if (!f) { if (cb) cb(new Error('no frac')); return; }
    const next = getFactionMaterials(fid) + add;
    setFactionMaterials(fid, next);
    global.DB.query(
        'UPDATE fractions SET materials=? WHERE id=?',
        [next, fid],
        (err) => {
            if (err) console.log('[MATERIALS] addFactionMaterials DB:', err.message || err);
            broadcastFractionMaterials(fid, next);
            if (cb) cb(err, next);
        }
    );
}

function removeFactionMaterials(fid, amount) {
    const need = parseInt(amount, 10) || 0;
    if (!fid || need <= 0) return true;
    const cur = getFactionMaterials(fid);
    if (cur < need) return false;
    const next = cur - need;
    setFactionMaterials(fid, next);
    global.DB.query('UPDATE fractions SET materials=? WHERE id=?', [next, fid], (err) => {
        if (err) console.log('[MATERIALS] removeFactionMaterials DB:', err.message || err);
    });
    broadcastFractionMaterials(fid, next);
    return true;
}

function countOwnedZonesByFaction() {
    const counts = {};
    Object.values(global.gangZones || {}).forEach((owner) => {
        const fid = parseInt(owner, 10) || 0;
        if (fid >= 1 && fid <= 6) counts[fid] = (counts[fid] || 0) + 1;
    });
    return counts;
}

function tickZoneMaterialsIncome() {
    const counts = countOwnedZonesByFaction();
    Object.keys(counts).forEach((fidStr) => {
        const fid = parseInt(fidStr, 10);
        const zones = counts[fid] || 0;
        if (zones < 1) return;
        const add = zones * MATERIALS_ZONE_PER_HOUR;
        addFactionMaterials(fid, add, (err, total) => {
            if (!err) {
                console.log(`[MATERIALS] Frac #${fid}: +${add} mats (${zones} zones × ${MATERIALS_ZONE_PER_HOUR}/h) → ${total}`);
            }
        });
    });
}

function countAuthPlayersOnline() {
    let n = 0;
    mp.players.forEach((p) => {
        if (p && mp.players.exists(p) && p.getVariable('auth') && p.dimension === 0) n++;
    });
    return n;
}

global.MATERIALS_ITEM = MATERIALS_ITEM;
global.MATERIALS_STACK_MAX = 10000;
global.getFactionMaterials = getFactionMaterials;
global.addFactionMaterials = addFactionMaterials;
global.removeFactionMaterials = removeFactionMaterials;
global.broadcastFractionMaterials = broadcastFractionMaterials;
global.countAuthPlayersOnline = countAuthPlayersOnline;

function adminFractionMaterialsCommand(player, mode, fractionIdRaw, amountRaw) {
    const adminLvl = parseInt(player.getVariable('adminlvl') || player.adminlvl, 10) || 0;
    if (adminLvl < 10) return player.outputChatBox('!{red}Недостаточно прав (требуется 10 уровень).');

    const fid = parseInt(fractionIdRaw, 10);
    const amount = parseInt(String(amountRaw || '').replace(/\D/g, ''), 10);
    if (isNaN(fid) || fid < 1 || fid > 6) {
        return player.outputChatBox(`!{red}Использование: /${mode === 'give' ? 'givefracmats' : 'takefracmats'} [фракция 1-6] [кол-во]`);
    }
    if (!amount || amount < 1) {
        return player.outputChatBox('!{red}Укажите количество материалов больше 0.');
    }

    const fracData = global.fractionsData && global.fractionsData[fid];
    if (!fracData) return player.outputChatBox('!{red}Фракция не найдена.');

    if (mode === 'give') {
        return addFactionMaterials(fid, amount, (err, total) => {
            if (err) return player.outputChatBox('!{red}Ошибка при начислении материалов.');
            player.outputChatBox(`!{green}[FRACTIONS] ${fracData.name}: +${amount} мат. (на складе: ${total})`);
            console.log(`[MATERIALS] ${player.name} givefracmats ${fid} +${amount} → ${total}`);
        });
    }

    const cur = getFactionMaterials(fid);
    if (cur < amount) {
        return player.outputChatBox(`!{red}На складе фракции ${fracData.name} только ${cur} мат.`);
    }
    if (!removeFactionMaterials(fid, amount)) {
        return player.outputChatBox('!{red}Не удалось списать материалы.');
    }
    const left = getFactionMaterials(fid);
    player.outputChatBox(`!{green}[FRACTIONS] ${fracData.name}: −${amount} мат. (осталось: ${left})`);
    console.log(`[MATERIALS] ${player.name} takefracmats ${fid} -${amount} → ${left}`);
}

mp.events.addCommand('givefracmats', (player, _, fractionIdRaw, amountRaw) => {
    try { adminFractionMaterialsCommand(player, 'give', fractionIdRaw, amountRaw); } catch (e) {
        console.log('[MATERIALS] givefracmats:', e.message || e);
    }
});

mp.events.addCommand('takefracmats', (player, _, fractionIdRaw, amountRaw) => {
    try { adminFractionMaterialsCommand(player, 'take', fractionIdRaw, amountRaw); } catch (e) {
        console.log('[MATERIALS] takefracmats:', e.message || e);
    }
});

setTimeout(tickZoneMaterialsIncome, 20000);
setInterval(tickZoneMaterialsIncome, 60 * 60 * 1000);

module.exports = {
    MATERIALS_ZONE_PER_HOUR,
    MATERIALS_ITEM,
    getFactionMaterials,
    addFactionMaterials,
    removeFactionMaterials,
    tickZoneMaterialsIncome,
    countAuthPlayersOnline
};
