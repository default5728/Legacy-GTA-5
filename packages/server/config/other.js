/** Цвет арендованного транспорта: [primary, secondary] (GTA palette). */
global.color = {
    0: [111, 111],
    1: [148, 0],
    2: [55, 0],
    3: [39, 0],
    4: [42, 0],
    5: [70, 0],
    6: [0, 0]
};

/** Начальный спавн без фракции: игрок, аренда, доставка личного транспорта. */
global.FACTIONLESS_HUB_SPAWN = {
    x: -169.429931640625,
    y: -813.7645874023438,
    z: 31.305158615112305,
    h: 173.6284942626953
};
/** NPC Michael + колшейп аренды (начальный спавн). */
global.FACTIONLESS_RENT_SPAWN = {
    x: -193.80992126464844,
    y: -804.4339599609375,
    z: 30.45510482788086,
    h: 18.35268211364746
};
/** Куда появляется арендованная машина (игрок сразу внутри). */
global.FACTIONLESS_RENT_VEHICLE_SPAWN = {
    x: -167.70887756347656,
    y: -807.4822998046875,
    z: 31.454151153564453,
    h: 160.81776428222656
};
/** ЗЗ начального спавна (совпадает с greenzones.js) — личный транспорт внутри запрещён. */
/** Один гардероб на аккаунт (таблица clothes, fraction=0). */
global.UNIFIED_CLOTHES_FRACTION = 0;
global.getClothesFractionForPlayer = function getClothesFractionForPlayer(_player) {
    return global.UNIFIED_CLOTHES_FRACTION != null ? Number(global.UNIFIED_CLOTHES_FRACTION) : 0;
};

global.NEWBIE_HUB_GREEN_ZONE = {
    x: -169.429931640625,
    y: -813.7645874023438,
    z: 31.305158615112305,
    r: 35
};