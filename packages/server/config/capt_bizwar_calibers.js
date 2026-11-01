/**
 * Калибры для каптов (семьи) и бизваров (фракции).
 * Минимум 1, максимум 3 калибра из списка.
 */
'use strict';

const CALIBER_KEYS = ['7.62mm', '5.56', '11.43mm', '.50mm', '12mm'];

/** Калибр → id предметов инвентаря (weapon_*) */
const CALIBER_TO_WEAPON_ITEMS = {
    '7.62mm': ['weapon_specialcarbine', 'weapon_carbinerifle'],
    '5.56': ['weapon_minismg'],
    '11.43mm': ['weapon_revolver', 'weapon_revolver_mk2'],
    '.50mm': ['weapon_heavysniper_mk2', 'weapon_heavysniper'],
    '12mm': ['weapon_heavyshotgun', 'weapon_assaultshotgun']
};

const WEAPON_ITEM_TO_CALIBER = {};
for (const [cal, items] of Object.entries(CALIBER_TO_WEAPON_ITEMS)) {
    for (const w of items) WEAPON_ITEM_TO_CALIBER[w] = cal;
}

/** Для CEF / Discord — подписи оружия */
const CALIBERS_INFO = [
    { key: '7.62mm', label: '7.62mm', weapons: 'Special Carbine, Carbine Rifle' },
    { key: '5.56', label: '5.56', weapons: 'Mini SMG' },
    { key: '11.43mm', label: '11.43mm', weapons: 'Revolver, Revolver Mk2' },
    { key: '.50mm', label: '.50mm', weapons: 'Heavy Sniper, Heavy Sniper Mk2' },
    { key: '12mm', label: '12mm', weapons: 'Heavy Shotgun, Assault Shotgun' }
];

module.exports = {
    CALIBER_KEYS,
    CALIBER_TO_WEAPON_ITEMS,
    WEAPON_ITEM_TO_CALIBER,
    CALIBERS_INFO
};
