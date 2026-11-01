/**
 * Гараж в accounts.cars: JSON-массив строк (старый формат) или объектов { m, s, t? }.
 * m — модель (как в carCall), s — источник: dp | case | cash | legacy | admin | bonus | …
 * t — сохранённый тюнинг LS Customs (mods/цвета/неон).
 * Телефон «Авто»: только dp, case, cash и legacy (старые данные без тега).
 */

const PHONE_HIDDEN_SOURCES = new Set(['cmd', 'event']);

global.normalizeCarsArray = function (raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
        const entry = raw[i];
        if (typeof entry === 'string' && entry) {
            out.push({ m: entry, s: 'legacy' });
            continue;
        }
        if (entry && typeof entry === 'object' && entry.m) {
            const s = entry.s && String(entry.s) ? String(entry.s) : 'legacy';
            const row = { m: String(entry.m), s };
            if (entry.t && typeof entry.t === 'object') row.t = entry.t;
            out.push(row);
        }
    }
    return out;
};

global.serializeCarsForDb = function (normalized) {
    return JSON.stringify(normalized);
};

global.carsListHasModel = function (normalized, model) {
    if (!model) return false;
    const needle = String(model).trim().toLowerCase();
    if (!needle) return false;
    return normalized.some((e) => String(e.m).trim().toLowerCase() === needle);
};

/** Семейный гараж: та же модель уже в слоте */
global.familyFleetListHasModel = function (rows, model) {
    if (!model || !Array.isArray(rows)) return false;
    const needle = String(model).trim().toLowerCase();
    if (!needle) return false;
    return rows.some((r) => String(r.model || '').trim().toLowerCase() === needle);
};

/** Список моделей для CEF-телефона */
global.getPhoneCarModels = function (normalized) {
    return normalized.filter((e) => !PHONE_HIDDEN_SOURCES.has(e.s)).map((e) => e.m);
};

global.carsPayloadForClient = function (carsDbString) {
    try {
        const raw = JSON.parse(carsDbString);
        const n = global.normalizeCarsArray(raw);
        return JSON.stringify(global.getPhoneCarModels(n));
    } catch (_e) {
        return '[]';
    }
};

/** Единый номерной знак для всего транспорта на сервере */
global.FLOW_VEHICLE_PLATE = 'flow';
global.flowVehiclePlate = function flowVehiclePlate() {
    return global.FLOW_VEHICLE_PLATE;
};

/** F3 / F10 донат-авто: цена покупки в DP. */
global.DONATE_VEHICLE_DP_PRICES = {
    temerario: 2500,
    tourbillon: 500,
    urus24: 1750,
    avtr: 1400,
    amgone1: 600,
    '812superfast': 550,
    cilindri12: 2750,
    kabluk: 500,
    neverar: 1250,
    nsx18: 925,
    gta5rp_veh_ferrari19: 1375,
    i8: 350,
    s1000rr: 825,
    '2019m5': 450,
    agerars: 800,
    alphard: 200,
    astondb11: 500,
    battista: 575,
    bmwix: 350,
    fera458: 520,
    gemera: 700,
    '2021ladaraven': 600,
    divo: 1000,
    valkyriespider: 2000,
    exp100: 500
};
