'use strict';

const FIB_MATS_LOAD_POINT = {
    x: 183.9347,
    y: -3317.1069,
    z: 5.6327,
    radius: 5.0,
    label: 'Точка погрузки материалов'
};

const FIB_MATS_DELIVERY_LABEL = 'Сдача материалов с перехвата';
const FIB_MATS_FIB_UNLOAD_LABEL = 'Точка разгрузки материалов FIB';
const FIB_MATS_DELIVERY_REWARD = 5000;

const FIB_MATS_DELIVERY_POINTS = [
    { factionId: 6, x: 429.9854, y: -1020.6959, z: 28.8832, radius: 6.0, label: FIB_MATS_FIB_UNLOAD_LABEL, fibOnly: true },
    { factionId: 5, x: 1408.1099, y: -2055.3450, z: 51.9985, radius: 6.0, label: FIB_MATS_DELIVERY_LABEL },
    { factionId: 4, x: 833.9098, y: -2365.2024, z: 30.4660, radius: 6.0, label: FIB_MATS_DELIVERY_LABEL },
    { factionId: 3, x: 921.1250, y: -1537.4796, z: 30.8609, radius: 6.0, label: FIB_MATS_DELIVERY_LABEL },
    { factionId: 2, x: 7.1102, y: -1413.1913, z: 29.3290, radius: 6.0, label: FIB_MATS_DELIVERY_LABEL },
    { factionId: 1, x: 173.5946, y: -1736.8712, z: 29.2916, radius: 6.0, label: FIB_MATS_DELIVERY_LABEL }
];

const FIB_FRACTION_ID = 6;
const FIB_MATS_TRUCK_MODEL = 'barracks';

/** Длительность погрузки по E на точке материалов. */
const FIB_MATS_LOAD_DURATION_MS = 5000;
/** Сколько сотрудников FIB (ID 6) должно быть рядом с точкой погрузки. */
const FIB_MATS_LOAD_MIN_FIB = 5;
/** Радиус проверки FIB у точки погрузки (метры). */
const FIB_MATS_LOAD_FIB_RADIUS = 300;
/** Радиус «участников» / зон защиты у точек погрузки и разгрузки FIB. */
const FIB_MATS_PARTICIPANT_RADIUS = 300;

/** Окно проведения поставок (МСК): с 12:59 по 22:59 включительно. */
const FIB_MATS_SUPPLY_HOURS_START = { hour: 12, minute: 59 };
const FIB_MATS_SUPPLY_HOURS_END = { hour: 22, minute: 59 };

const FIB_MATS_LOAD_COMPLETE_CRIME_MSG =
    'Погрузка поставки FIB завершена и направляется в сторону района Мишин-Роу';

function getFibUnloadPoint() {
    for (let i = 0; i < FIB_MATS_DELIVERY_POINTS.length; i++) {
        const p = FIB_MATS_DELIVERY_POINTS[i];
        if (p && p.factionId === FIB_FRACTION_ID) return p;
    }
    return null;
}

module.exports = {
    FIB_MATS_LOAD_POINT,
    FIB_MATS_DELIVERY_POINTS,
    FIB_MATS_DELIVERY_LABEL,
    FIB_MATS_FIB_UNLOAD_LABEL,
    FIB_MATS_DELIVERY_REWARD,
    FIB_FRACTION_ID,
    FIB_MATS_TRUCK_MODEL,
    FIB_MATS_LOAD_DURATION_MS,
    FIB_MATS_LOAD_MIN_FIB,
    FIB_MATS_LOAD_FIB_RADIUS,
    FIB_MATS_PARTICIPANT_RADIUS,
    FIB_MATS_SUPPLY_HOURS_START,
    FIB_MATS_SUPPLY_HOURS_END,
    FIB_MATS_LOAD_COMPLETE_CRIME_MSG,
    getFibUnloadPoint
};
