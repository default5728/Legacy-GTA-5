'use strict';

/** Точки крафта (цилиндр + E) по фракциям 1–6 */
const FACTION_CRAFT_POSITIONS = {
    1: { x: 155.11581420898438, y: -1724.0513916015625, z: 29.291685104370117, radius: 1.2 },
    2: { x: 4.08227014541626, y: -1405.1331787109375, z: 29.262664794921875, radius: 1.2 },
    3: { x: 924.1286010742188, y: -1547.480712890625, z: 30.806177139282227, radius: 1.2 },
    4: { x: 838.3292236328125, y: -2333.073974609375, z: 30.334318161010742, radius: 1.2 },
    5: { x: 1395.1986083984375, y: -2070.8916015625, z: 51.99855041503906, radius: 1.2 },
    6: { x: 444.7294921875, y: -979.9067993164062, z: 30.68960189819336, radius: 1.2 }
};

/** Секции крафта для CEF (id совпадает с индексом массива) */
const FACTION_CRAFT_SECTIONS = [
    {
        id: 0,
        key: 'pistol',
        name: 'Пистолеты',
        items: [
            { id: 0, item: 'weapon_revolver_mk2', name: 'Revolver Mk2', mats: 125 },
            { id: 1, item: 'weapon_navyrevolver', name: 'Navy Revolver', mats: 200 }
        ]
    },
    {
        id: 1,
        key: 'shotgun',
        name: 'Дробовики',
        items: [
            { id: 0, item: 'weapon_assaultshotgun', name: 'Assault Shotgun', mats: 150 },
            { id: 1, item: 'weapon_heavyshotgun', name: 'Heavy Shotgun', mats: 175 }
        ]
    },
    {
        id: 2,
        key: 'rifle',
        name: 'Автоматы',
        items: [
            { id: 0, item: 'weapon_specialcarbine', name: 'Special Carabine', mats: 200 },
            { id: 1, item: 'weapon_carbinerifle', name: 'Carabine Rifle', mats: 100 },
            { id: 2, item: 'weapon_minismg', name: 'Mini Smg', mats: 225 },
            { id: 3, item: 'weapon_assaultrifle', name: 'Assault Rifle', mats: 50 }
        ]
    },
    {
        id: 4,
        key: 'gear',
        name: 'Снаряжение',
        items: [
            { id: 0, item: 'item_spank', name: 'Спанк x10', mats: 100, qty: 10 },
            { id: 1, item: 'item_alco', name: 'Медовуха x10', mats: 75, qty: 10 },
            { id: 2, item: 'Бронежилет', name: 'Бронежилет', mats: 5, qty: 1 }
        ]
    }
];

function findCraftRecipe(sectionId, itemId) {
    const sec = FACTION_CRAFT_SECTIONS.find((s) => s.id === sectionId);
    if (!sec) return null;
    const it = sec.items.find((x) => x.id === itemId);
    if (!it) return null;
    return { section: sec, recipe: it };
}

module.exports = {
    FACTION_CRAFT_POSITIONS,
    FACTION_CRAFT_SECTIONS,
    findCraftRecipe
};
