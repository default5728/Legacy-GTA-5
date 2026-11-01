/**
 * Группы калибров для быстрых слотов (GTA5RP wiki / damage.js).
 * В быстрых слотах — не больше одного оружия на калибр.
 */
'use strict';

const CALIBER_GROUPS = {
    '9mm': [
        'weapon_pistol',
        'weapon_pistol_mk2',
        'weapon_combatpistol',
        'weapon_appistol',
        'weapon_heavypistol',
        'weapon_vintagepistol',
        'weapon_snspistol',
        'weapon_snspistol_mk2',
        'weapon_gadgetpistol'
    ],
    '11.43mm': [
        'weapon_revolver',
        'weapon_revolver_mk2',
        'weapon_doubleaction',
        'weapon_pistol50',
        'weapon_navyrevolver'
    ],
    '5.56mm': [
        'weapon_machinepistol',
        'weapon_minismg',
        'weapon_microsmg',
        'weapon_smg',
        'weapon_smg_mk2',
        'weapon_assaultsmg'
    ],
    '7.62mm': [
        'weapon_assaultrifle',
        'weapon_assaultrifle_mk2',
        'weapon_carbinerifle',
        'weapon_carbinerifle_mk2',
        'weapon_compactrifle',
        'weapon_gusenberg',
        'weapon_specialcarbine',
        'weapon_specialcarbine_mk2',
        'weapon_militaryrifle',
        'weapon_bullpuprifle',
        'weapon_bullpuprifle_mk2',
        'weapon_advancedrifle',
        'weapon_combatmg',
        'weapon_combatmg_mk2',
        'weapon_mg'
    ],
    '12mm': [
        'weapon_pumpshotgun',
        'weapon_pumpshotgun_mk2',
        'weapon_sawnoffshotgun',
        'weapon_dbshotgun',
        'weapon_heavyshotgun',
        'weapon_bullpupshotgun',
        'weapon_assaultshotgun',
        'weapon_combatshotgun',
        'weapon_autoshotgun'
    ],
    '.50mm': [
        'weapon_sniperrifle',
        'weapon_heavysniper',
        'weapon_heavysniper_mk2',
        'weapon_marksmanrifle',
        'weapon_marksmanrifle_mk2',
        'weapon_precisionrifle'
    ]
};

const WEAPON_TO_CALIBER = {};
for (const [cal, weapons] of Object.entries(CALIBER_GROUPS)) {
    for (const w of weapons) WEAPON_TO_CALIBER[w] = cal;
}

function fastSlotWeaponCaliberKey(baseName) {
    const base = String(baseName || '').trim();
    if (!base || base.indexOf('weapon_') !== 0) return '';
    return WEAPON_TO_CALIBER[base] || base;
}

function fastSlotFindConflict(fastSlots, baseName, ignoreIndices) {
    const base = String(baseName || '').trim();
    if (!base || base.indexOf('weapon_') !== 0) return null;
    const cal = fastSlotWeaponCaliberKey(base);
    const ignore = new Set(Array.isArray(ignoreIndices) ? ignoreIndices : []);
    const slots = Array.isArray(fastSlots) ? fastSlots : [];

    for (let i = 0; i < slots.length; i++) {
        if (ignore.has(i)) continue;
        const slot = slots[i];
        if (!slot) continue;
        const slotBase = String(slot).split('(')[0].trim().split('#')[0].trim();
        if (slotBase === base) return { type: 'same', caliber: cal };
        if (fastSlotWeaponCaliberKey(slotBase) === cal) return { type: 'caliber', caliber: cal };
    }
    return null;
}

function fastSlotConflictMessage(conflict) {
    if (!conflict) return '';
    if (conflict.type === 'same') return 'Это оружие уже выбрано в быстром слоте.';
    const cal = conflict.caliber;
    if (cal && cal.indexOf('weapon_') !== 0) return `Оружие калибра ${cal} уже в быстром слоте.`;
    return 'Такое оружие уже в быстром слоте.';
}

module.exports = {
    CALIBER_GROUPS,
    WEAPON_TO_CALIBER,
    fastSlotWeaponCaliberKey,
    fastSlotFindConflict,
    fastSlotConflictMessage
};
