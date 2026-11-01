'use strict';

const moment = require('moment-timezone');
const {
    FIB_MATS_LOAD_POINT,
    FIB_MATS_DELIVERY_POINTS,
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
} = require('./config/fib_materials_supply.js');
const {
    getFactionEventMatsReward,
    getFactionEventMoneyReward
} = require('./config/faction_event_rewards.js');
const {
    isHeavySniperWeaponToken,
    isHeavySniperWeaponHash
} = require('./config/disabled_sniper_weapons.js');

const BARRACKS_HASH = mp.joaat(FIB_MATS_TRUCK_MODEL);
const CRIME_FRACTION_MIN = 1;
const CRIME_FRACTION_MAX = 5;
const FIB_MATS_RESPAWN_MS = 15 * 60 * 1000;
const deliveryColshapes = [];
const deliveringVehicles = new Set();
/** Таймеры респавна после сдачи материалов: vehicleId → timeout */
const fibMatsRespawnTimers = new Map();
/** Активные погрузки: vehicleId → { playerId, timer, startedAt } */
const fibMatsLoadingByVehicle = new Map();
const FIB_UNLOAD_POINT = typeof getFibUnloadPoint === 'function' ? getFibUnloadPoint() : null;
function notify(player, type, message, duration = 3500) {
    if (typeof global.isNotify === 'function') {
        global.isNotify(player, type, 'top-mid', message, duration);
    }
}

function playerFractionId(player) {
    const f = player.getVariable('fraction');
    return f != null ? parseInt(f, 10) || 0 : 0;
}

function isCrimeFraction(fractionId) {
    return fractionId >= CRIME_FRACTION_MIN && fractionId <= CRIME_FRACTION_MAX;
}

function distSq3d(ax, ay, az, bx, by, bz) {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

function isFibMatsTruck(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return false;
    if (vehicle.getVariable('fibMatsTruck') !== true) return false;
    if (Number(vehicle.getVariable('fraction')) !== FIB_FRACTION_ID) return false;
    try {
        return vehicle.model === BARRACKS_HASH;
    } catch (_e) {
        return false;
    }
}

function isVehicleLoaded(vehicle) {
    if (!vehicle) return false;
    return vehicle.getVariable('fibMatsLoaded') === true;
}

function canEnterFibMatsTruck(player, vehicle) {
    if (!player || !vehicle || !isFibMatsTruck(vehicle)) return false;
    const fr = playerFractionId(player);
    if (isVehicleLoaded(vehicle)) {
        return fr === FIB_FRACTION_ID || isCrimeFraction(fr);
    }
    return fr === FIB_FRACTION_ID;
}

function getVehicleDriver(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return null;
    try {
        const occ = vehicle.getOccupants();
        for (let i = 0; i < occ.length; i++) {
            const p = occ[i];
            if (!p || !mp.players.exists(p)) continue;
            try {
                if (p.vehicle === vehicle && p.seat === 0) return p;
            } catch (_e) {}
        }
    } catch (_e2) {}
    return null;
}

function vehicleAtPoint(vehicle, point) {
    if (!vehicle || !vehicle.position || !point) return false;
    const r = Number(point.radius) || 5;
    return distSq3d(
        vehicle.position.x,
        vehicle.position.y,
        vehicle.position.z,
        point.x,
        point.y,
        point.z
    ) <= r * r;
}

function playerAtLoadRadius(player, radius) {
    if (!player || !player.position || !FIB_MATS_LOAD_POINT) return false;
    const r = Number(radius) || FIB_MATS_PARTICIPANT_RADIUS;
    return distSq3d(
        player.position.x,
        player.position.y,
        player.position.z,
        FIB_MATS_LOAD_POINT.x,
        FIB_MATS_LOAD_POINT.y,
        FIB_MATS_LOAD_POINT.z
    ) <= r * r;
}

function playerAtFibUnloadRadius(player, radius) {
    if (!player || !player.position || !FIB_UNLOAD_POINT) return false;
    const r = Number(radius) || FIB_MATS_PARTICIPANT_RADIUS;
    return distSq3d(
        player.position.x,
        player.position.y,
        player.position.z,
        FIB_UNLOAD_POINT.x,
        FIB_UNLOAD_POINT.y,
        FIB_UNLOAD_POINT.z
    ) <= r * r;
}

function playerNearFibSupplyProtectPoints(player, radius) {
    return playerAtLoadRadius(player, radius) || playerAtFibUnloadRadius(player, radius);
}

function isFibMatsSupplyHoursNow() {
    try {
        const now = moment().tz('Europe/Moscow');
        const mins = now.hours() * 60 + now.minutes();
        const start =
            (Number(FIB_MATS_SUPPLY_HOURS_START.hour) || 12) * 60 +
            (Number(FIB_MATS_SUPPLY_HOURS_START.minute) || 0);
        const end =
            (Number(FIB_MATS_SUPPLY_HOURS_END.hour) || 22) * 60 +
            (Number(FIB_MATS_SUPPLY_HOURS_END.minute) || 0);
        return mins >= start && mins <= end;
    } catch (_e) {
        return true;
    }
}

function fibMatsSupplyHoursDenyMessage() {
    const sh = FIB_MATS_SUPPLY_HOURS_START || { hour: 12, minute: 59 };
    const eh = FIB_MATS_SUPPLY_HOURS_END || { hour: 22, minute: 59 };
    const fmt = (h) =>
        `${String(h.hour).padStart(2, '0')}:${String(h.minute).padStart(2, '0')}`;
    return `Поставки FIB доступны только с ${fmt(sh)} до ${fmt(eh)} (МСК).`;
}

function countFibNearLoadPoint(radius) {
    const r = Number(radius) || FIB_MATS_LOAD_FIB_RADIUS;
    const r2 = r * r;
    let count = 0;
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
        if (p.dimension !== 0) return;
        if (playerFractionId(p) !== FIB_FRACTION_ID) return;
        if (!p.position) return;
        if (
            distSq3d(
                p.position.x,
                p.position.y,
                p.position.z,
                FIB_MATS_LOAD_POINT.x,
                FIB_MATS_LOAD_POINT.y,
                FIB_MATS_LOAD_POINT.z
            ) > r2
        ) {
            return;
        }
        count += 1;
    });
    return count;
}

function notifyCrimeFractions(message) {
    const msg = String(message || '').trim();
    if (!msg) return;
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
        if (!isCrimeFraction(playerFractionId(p))) return;
        notify(p, 3, msg, 7000);
        try {
            if (typeof global.pushChatBox === 'function') {
                global.pushChatBox(p, msg);
            } else {
                p.outputChatBox(msg);
            }
        } catch (_e) {}
    });
}

function cancelFibMatsLoading(vehicleId, reasonNotifyPlayer) {
    const entry = fibMatsLoadingByVehicle.get(vehicleId);
    if (!entry) return;
    if (entry.timer) {
        try { clearTimeout(entry.timer); } catch (_e) {}
    }
    fibMatsLoadingByVehicle.delete(vehicleId);

    let vehicle = null;
    try {
        vehicle = mp.vehicles.at(vehicleId);
    } catch (_e2) {
        vehicle = null;
    }
    if (vehicle && mp.vehicles.exists(vehicle)) {
        try { vehicle.setVariable('fibMatsLoading', false); } catch (_e3) {}
    }

    let player = null;
    try {
        player = mp.players.at(entry.playerId);
    } catch (_e4) {
        player = null;
    }
    if (player && mp.players.exists(player)) {
        try { player.call('fibMats:load:cancel', []); } catch (_e5) {}
        if (reasonNotifyPlayer) {
            notify(player, 2, reasonNotifyPlayer, 3500);
        }
    }
    clearFibMatsParticipantFlagsIfIdle();
}

function finishFibMatsLoading(player, vehicle) {
    if (!player || !mp.players.exists(player) || !vehicle || !mp.vehicles.exists(vehicle)) return false;
    if (player.dimension !== 0) return false;
    if (!isFibMatsSupplyHoursNow()) {
        notify(player, 2, fibMatsSupplyHoursDenyMessage(), 4500);
        return false;
    }
    if (playerFractionId(player) !== FIB_FRACTION_ID) {
        notify(player, 2, 'Погрузка доступна только сотрудникам FIB.', 3000);
        return false;
    }
    if (!player.vehicle || player.vehicle !== vehicle || player.seat !== 0) {
        notify(player, 2, 'Погрузка прервана: вы должны оставаться за рулём.', 3500);
        return false;
    }
    if (!isFibMatsTruck(vehicle)) return false;
    if (vehicle.getVariable('fibMatsLoaded') === true) {
        notify(player, 2, 'Материалы уже погружены.', 3000);
        return false;
    }
    if (!vehicleAtPoint(vehicle, FIB_MATS_LOAD_POINT)) {
        notify(player, 2, 'Погрузка прервана: транспорт покинул точку.', 3500);
        return false;
    }

    const fibNearby = countFibNearLoadPoint(FIB_MATS_LOAD_FIB_RADIUS);
    if (fibNearby < FIB_MATS_LOAD_MIN_FIB) {
        notify(
            player,
            2,
            `Для погрузки нужно минимум ${FIB_MATS_LOAD_MIN_FIB} сотрудников FIB в радиусе ${FIB_MATS_LOAD_FIB_RADIUS} м (сейчас ${fibNearby}).`,
            4500
        );
        return false;
    }

    vehicle.setVariable('fibMatsLoaded', true);
    vehicle.setVariable('fibMatsLoading', false);
    notify(player, 3, 'Погрузка материалов произошла успешно', 4500);
    notify(player, 3, 'Доставьте материалы на базу FIB.', 4500);
    try { player.call('sound:client', [3]); } catch (_e) {}
    try { player.call('fibMats:load:done', []); } catch (_e2) {}
    player.call('fibMats:route:sync', [1]);
    notifyCrimeFractions(FIB_MATS_LOAD_COMPLETE_CRIME_MSG);
    return true;
}

function isFibMatsSupplyActive() {
    if (fibMatsLoadingByVehicle.size > 0) return true;
    let active = false;
    try {
        mp.vehicles.forEach((v) => {
            if (active) return;
            if (!isFibMatsTruck(v)) return;
            if (v.getVariable('deleted') === true) return;
            if (v.getVariable('fibMatsLoading') === true || isVehicleLoaded(v)) {
                active = true;
            }
        });
    } catch (_e) {}
    return active;
}

function isFibMatsLoadZoneActive() {
    if (fibMatsLoadingByVehicle.size > 0) return true;
    let active = false;
    try {
        mp.vehicles.forEach((v) => {
            if (active) return;
            if (!isFibMatsTruck(v)) return;
            if (v.getVariable('deleted') === true) return;
            const nearLoad = vehicleAtPoint(v, {
                x: FIB_MATS_LOAD_POINT.x,
                y: FIB_MATS_LOAD_POINT.y,
                z: FIB_MATS_LOAD_POINT.z,
                radius: FIB_MATS_PARTICIPANT_RADIUS
            });
            if (!nearLoad) return;
            active = true;
        });
    } catch (_e) {}
    return active;
}

function isFibMatsEventParticipant(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (player.dimension !== 0) return false;

    try {
        const veh = player.vehicle;
        if (veh && mp.vehicles.exists(veh) && isFibMatsTruck(veh) && veh.getVariable('deleted') !== true) {
            return true;
        }
    } catch (_e) {}

    if (player.getVariable('fibMatsParticipant') === true && isFibMatsSupplyActive()) {
        return true;
    }

    if (isFibMatsSupplyActive() || isFibMatsLoadZoneActive()) {
        return playerNearFibSupplyProtectPoints(player, FIB_MATS_PARTICIPANT_RADIUS);
    }
    return false;
}

function markFibMatsParticipant(player) {
    if (!player || !mp.players.exists(player)) return;
    try { player.setVariable('fibMatsParticipant', true); } catch (_e) {}
}

function clearFibMatsParticipantFlagsIfIdle() {
    if (isFibMatsSupplyActive() || isFibMatsLoadZoneActive()) return;
    try {
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p)) return;
            if (p.getVariable('fibMatsParticipant') === true) {
                try { p.setVariable('fibMatsParticipant', false); } catch (_e) {}
            }
        });
    } catch (_e2) {}
}

function isFibInVehicleNearSupplyProtectPoints(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (player.dimension !== 0) return false;
    if (playerFractionId(player) !== FIB_FRACTION_ID) return false;
    try {
        if (!player.vehicle || !mp.vehicles.exists(player.vehicle)) return false;
    } catch (_e) {
        return false;
    }
    return playerNearFibSupplyProtectPoints(player, FIB_MATS_PARTICIPANT_RADIUS);
}

function attackerHasHeavySniperInFastSlots(attacker) {
    if (!attacker || !mp.players.exists(attacker)) return false;
    if (!Array.isArray(attacker.fastSlots)) return false;
    for (let i = 0; i < attacker.fastSlots.length; i++) {
        if (isHeavySniperWeaponToken(attacker.fastSlots[i])) return true;
    }
    return false;
}

function shouldBlockFibMatsHeavySniperDamage(victim, attacker, weaponHash) {
    if (!isFibMatsEventParticipant(victim)) return false;
    if (!attacker || !mp.players.exists(attacker) || attacker === victim) return false;
    if (attackerHasHeavySniperInFastSlots(attacker)) return true;
    if (isHeavySniperWeaponHash(weaponHash)) return true;
    return false;
}

/** Криминал (1–5) не может убить FIB (6) в машине у точек погрузки/разгрузки FIB (300 м). */
function shouldBlockCrimeDamageOnFibInVehicle(victim, attacker) {
    if (!isFibInVehicleNearSupplyProtectPoints(victim)) return false;
    if (!attacker || !mp.players.exists(attacker) || attacker === victim) return false;
    return isCrimeFraction(playerFractionId(attacker));
}

function shouldBlockFibMatsSupplyDamage(victim, attacker, weaponHash) {
    if (shouldBlockCrimeDamageOnFibInVehicle(victim, attacker)) return true;
    if (shouldBlockFibMatsHeavySniperDamage(victim, attacker, weaponHash)) return true;
    return false;
}

global.isFibMatsEventParticipant = isFibMatsEventParticipant;
global.isFibMatsSupplyActive = isFibMatsSupplyActive;
global.isFibMatsSupplyHoursNow = isFibMatsSupplyHoursNow;
global.shouldBlockFibMatsHeavySniperDamage = shouldBlockFibMatsHeavySniperDamage;
global.shouldBlockCrimeDamageOnFibInVehicle = shouldBlockCrimeDamageOnFibInVehicle;
global.shouldBlockFibMatsSupplyDamage = shouldBlockFibMatsSupplyDamage;
/** Можно ли управлять двигателем / ехать на mats-truck (FIB всегда; крайм 1–5 — только после погрузки). */
global.canControlFibMatsTruck = canEnterFibMatsTruck;

function resolveDeliveryTargetFaction(driver, point) {
    if (!driver || !point) return null;
    const driverFr = playerFractionId(driver);
    if (driverFr === FIB_FRACTION_ID) {
        return point.factionId === FIB_FRACTION_ID ? FIB_FRACTION_ID : null;
    }
    if (isCrimeFraction(driverFr) && driverFr === point.factionId) {
        return driverFr;
    }
    return null;
}

function getDeliveryPointForFaction(fractionId) {
    const fr = parseInt(fractionId, 10) || 0;
    for (let i = 0; i < FIB_MATS_DELIVERY_POINTS.length; i++) {
        const point = FIB_MATS_DELIVERY_POINTS[i];
        if (fr === FIB_FRACTION_ID && point.factionId === FIB_FRACTION_ID) return point;
        if (isCrimeFraction(fr) && point.factionId === fr) return point;
    }
    return null;
}

function grantPlayerMoney(player, amount, cb) {
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb();
        return;
    }
    const add = parseInt(amount, 10) || 0;
    if (add <= 0) {
        if (cb) cb();
        return;
    }
    const newMoney = (parseInt(player.money, 10) || 0) + add;
    global.DB.query(
        'UPDATE accounts SET money = ? WHERE static = ?',
        [newMoney, player.static],
        (err) => {
            if (err) console.log('[fibMats] money DB:', err.message || err);
            player.money = newMoney;
            try { player.call('updateMoney', [global.formatnum1(newMoney)]); } catch (_e) {}
            if (cb) cb(err);
        }
    );
}

function formatRewardNum(n) {
    return typeof global.formatnum1 === 'function' ? global.formatnum1(n) : String(n);
}

function spawnFibMatsTruck(spawnData) {
    if (!spawnData || !spawnData.position) return null;
    try {
        const fraction = spawnData.fraction;
        const newVehicle = mp.vehicles.new(spawnData.model, spawnData.position, {
            heading: spawnData.heading,
            color: global.color && global.color[fraction] != null ? global.color[fraction] : [255, 255, 255],
            locked: false,
            engine: false,
            numberPlate:
                typeof global.flowVehiclePlate === 'function' ? global.flowVehiclePlate() : 'FIB-M'
        });
        newVehicle.setVariable('fractioncar', true);
        newVehicle.setVariable('lvl', spawnData.lvl);
        newVehicle.setVariable('fraction', fraction);
        newVehicle.setVariable('startposition', spawnData.position);
        newVehicle.setVariable('startheading', spawnData.heading);
        newVehicle.setVariable(
            'startnumber',
            typeof global.flowVehiclePlate === 'function' ? global.flowVehiclePlate() : 'FIB-M'
        );
        newVehicle.setVariable('fibMatsTruck', true);
        newVehicle.setVariable('fibMatsLoaded', false);
        newVehicle.locked = false;
        newVehicle.setVariable('doorState', false);
        return newVehicle;
    } catch (e) {
        console.log('[fibMats] spawn:', e.message || e);
        return null;
    }
}

function scheduleFibMatsTruckRespawn(spawnData) {
    if (!spawnData || !spawnData.position) return;
    const key = `${spawnData.position.x},${spawnData.position.y},${spawnData.position.z}`;
    const prev = fibMatsRespawnTimers.get(key);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
        fibMatsRespawnTimers.delete(key);
        try {
            // Не спавним дубль, если на точке уже стоит незагруженный mats-truck.
            let exists = false;
            mp.vehicles.forEach((v) => {
                if (!isFibMatsTruck(v)) return;
                if (v.getVariable('deleted') === true) return;
                const sp = v.getVariable('startposition');
                if (!sp) return;
                if (distSq3d(sp.x, sp.y, sp.z, spawnData.position.x, spawnData.position.y, spawnData.position.z) < 4) {
                    exists = true;
                }
            });
            if (exists) return;
            spawnFibMatsTruck(spawnData);
        } catch (e) {
            console.log('[fibMats] respawn:', e.message || e);
        }
    }, FIB_MATS_RESPAWN_MS);
    fibMatsRespawnTimers.set(key, timer);
}

function destroyFibMatsTruck(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return;
    if (vehicle.getVariable('deleted') === true) return;

    if (fibMatsLoadingByVehicle.has(vehicle.id)) {
        cancelFibMatsLoading(vehicle.id, null);
    }

    const spawnData = {
        model: vehicle.model,
        position: vehicle.getVariable('startposition'),
        heading: vehicle.getVariable('startheading'),
        fraction: vehicle.getVariable('fraction'),
        lvl: vehicle.getVariable('lvl')
    };

    vehicle.setVariable('fibMatsLoaded', false);
    vehicle.setVariable('deleted', true);

    try {
        const passengers = vehicle.getOccupants();
        passengers.forEach((player) => {
            if (player && mp.players.exists(player)) player.removeFromVehicle();
        });
    } catch (_e) {}

    try {
        vehicle.locked = false;
        vehicle.setVariable('doorState', false);
        vehicle.engine = false;
        vehicle.dimension = 0;
        vehicle.position = new mp.Vector3(1069.5347900390625, 3041.273681640625, 41.34978103637695);
    } catch (_e2) {}

    setTimeout(() => {
        try {
            if (vehicle && mp.vehicles.exists(vehicle)) vehicle.destroy();
        } catch (_e3) {}
    }, 500);

    // После сдачи материалов — респавн на базе через 15 минут.
    if (spawnData.position) {
        scheduleFibMatsTruckRespawn(spawnData);
    }
}

function deliverFibMats(vehicle, targetFactionId) {
    if (!isFibMatsTruck(vehicle)) return false;
    if (vehicle.getVariable('fibMatsLoaded') !== true) return false;
    if (deliveringVehicles.has(vehicle.id)) return false;
    if (!isFibMatsSupplyHoursNow()) {
        const driverEarly = getVehicleDriver(vehicle);
        if (driverEarly && mp.players.exists(driverEarly)) {
            notify(driverEarly, 2, fibMatsSupplyHoursDenyMessage(), 4500);
        }
        return false;
    }

    const driver = getVehicleDriver(vehicle);
    if (!driver || !mp.players.exists(driver)) return false;

    const driverFr = playerFractionId(driver);
    const isHijackDelivery = isCrimeFraction(driverFr);
    const matsReward = isHijackDelivery ? getFactionEventMatsReward() : FIB_MATS_DELIVERY_REWARD;
    const moneyReward = isHijackDelivery ? getFactionEventMoneyReward() : 0;

    deliveringVehicles.add(vehicle.id);

    const finishDelivery = () => {
        const msg = isHijackDelivery
            ? `Перехват! +${formatRewardNum(moneyReward)}$ и +${formatRewardNum(matsReward)} мат. на склад фракции`
            : `Сдано ${formatRewardNum(matsReward)} материалов на склад FIB`;
        notify(driver, 3, msg, 5000);
        clearFibMatsRouteForPlayer(driver);
        try {
            vehicle.getOccupants().forEach((p) => {
                if (!p || !mp.players.exists(p) || p === driver) return;
                notify(p, 3, msg, 5000);
                clearFibMatsRouteForPlayer(p);
            });
        } catch (_e) {}
        try { driver.call('sound:client', [3]); } catch (_e2) {}
        destroyFibMatsTruck(vehicle);
        deliveringVehicles.delete(vehicle.id);
        clearFibMatsParticipantFlagsIfIdle();
    };

    const failDelivery = () => {
        deliveringVehicles.delete(vehicle.id);
    };

    try {
        if (typeof global.addFactionMaterials !== 'function') {
            if (moneyReward > 0) {
                grantPlayerMoney(driver, moneyReward, () => finishDelivery());
            } else {
                finishDelivery();
            }
            return true;
        }

        global.addFactionMaterials(targetFactionId, matsReward, (err) => {
            if (err) {
                notify(driver, 2, 'Ошибка начисления материалов фракции.', 3500);
                failDelivery();
                return;
            }
            if (moneyReward > 0) {
                grantPlayerMoney(driver, moneyReward, (moneyErr) => {
                    if (moneyErr) notify(driver, 2, 'Материалы сданы, но ошибка начисления денег.', 3500);
                    finishDelivery();
                });
            } else {
                finishDelivery();
            }
        });
        return true;
    } catch (e) {
        console.log('[fibMats] deliver:', e.message || e);
        failDelivery();
        return false;
    }
}

function tryDeliverVehicleAtPoint(vehicle, point) {
    if (!point || !isFibMatsTruck(vehicle)) return;
    if (vehicle.getVariable('fibMatsLoaded') !== true) return;
    if (!vehicleAtPoint(vehicle, point)) return;

    const driver = getVehicleDriver(vehicle);
    if (!driver || !mp.players.exists(driver)) return;

    const targetFactionId = resolveDeliveryTargetFaction(driver, point);
    if (!targetFactionId) return;

    deliverFibMats(vehicle, targetFactionId);
}

function syncFibMatsRouteToPlayer(player, vehicle) {
    if (!player || !mp.players.exists(player) || !vehicle || !mp.vehicles.exists(vehicle)) return;
    if (!isFibMatsTruck(vehicle)) return;
    if (!canEnterFibMatsTruck(player, vehicle)) return;
    try {
        const loaded = vehicle.getVariable('fibMatsLoaded') === true;
        player.call('fibMats:route:sync', [loaded ? 1 : 0]);
    } catch (_e) {}
}

function clearFibMatsRouteForPlayer(player) {
    if (!player || !mp.players.exists(player)) return;
    try { player.call('fibMats:route:clear', []); } catch (_e) {}
}

function scheduleServerRouteSync(player, vehicle) {
    syncFibMatsRouteToPlayer(player, vehicle);
    setTimeout(() => syncFibMatsRouteToPlayer(player, vehicle), 200);
    setTimeout(() => syncFibMatsRouteToPlayer(player, vehicle), 600);
    setTimeout(() => syncFibMatsRouteToPlayer(player, vehicle), 1200);
}

function forceFibMatsTruckUnlocked(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return;
    if (vehicle.getVariable('fibMatsTruck') !== true) return;
    vehicle.locked = false;
    vehicle.setVariable('doorState', false);
}

function ejectInvalidFibMatsOccupant(player, vehicle) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (!isFibMatsTruck(vehicle)) return false;
    if (canEnterFibMatsTruck(player, vehicle)) return false;

    try { player.removeFromVehicle(); } catch (_e) {}

    if (isVehicleLoaded(vehicle)) {
        notify(player, 2, 'Перехват доступен только фракциям Ballas, Families, Bloods, Vagos и Marabunta.', 4000);
    } else {
        notify(player, 2, 'Этот транспорт доступен только сотрудникам FIB.', 3500);
    }
    return true;
}

mp.events.add('playerEnterVehicle', (player, vehicle, seat) => {
    try {
        if (!player || !mp.players.exists(player) || !vehicle || !mp.vehicles.exists(vehicle)) return;
        if (!isFibMatsTruck(vehicle)) return;

        if (ejectInvalidFibMatsOccupant(player, vehicle)) return;

        forceFibMatsTruckUnlocked(vehicle);
        markFibMatsParticipant(player);

        if (seat === 0) {
            const fr = playerFractionId(player);
            if (isVehicleLoaded(vehicle) && isCrimeFraction(fr)) {
                notify(
                    player,
                    3,
                    `Перехват! Доставьте материалы на точку своей фракции: +${formatRewardNum(getFactionEventMoneyReward())}$ и +${formatRewardNum(getFactionEventMatsReward())} мат.`,
                    5500
                );
            }
            scheduleServerRouteSync(player, vehicle);
        }
    } catch (_e) {}
});

mp.events.add('playerExitVehicle', (player, vehicle) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (vehicle && isFibMatsTruck(vehicle)) {
            clearFibMatsRouteForPlayer(player);
            if (fibMatsLoadingByVehicle.has(vehicle.id)) {
                cancelFibMatsLoading(vehicle.id, 'Погрузка прервана: вы покинули транспорт.');
            }
        }
    } catch (_e) {}
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        const vehicle = player.vehicle;
        if (vehicle && mp.vehicles.exists(vehicle) && isFibMatsTruck(vehicle) && fibMatsLoadingByVehicle.has(vehicle.id)) {
            cancelFibMatsLoading(vehicle.id, null);
        }
        if (!vehicle || !mp.vehicles.exists(vehicle) || !isFibMatsTruck(vehicle)) return;
        if (!isVehicleLoaded(vehicle)) return;

        clearFibMatsRouteForPlayer(player);
        try { player.removeFromVehicle(); } catch (_e) {}
        forceFibMatsTruckUnlocked(vehicle);
        vehicle.setVariable('fibMatsLoaded', true);
    } catch (_e) {}
});

mp.events.add('fibMats:load:s', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        if (!isFibMatsSupplyHoursNow()) {
            return notify(player, 2, fibMatsSupplyHoursDenyMessage(), 4500);
        }
        if (playerFractionId(player) !== FIB_FRACTION_ID) {
            return notify(player, 2, 'Погрузка доступна только сотрудникам FIB.', 3000);
        }

        const vehicle = player.vehicle;
        if (!vehicle || player.seat !== 0) {
            return notify(player, 2, 'Вы должны быть за рулём Barracks FIB.', 3500);
        }
        if (!isFibMatsTruck(vehicle)) {
            return notify(player, 2, 'Погрузка доступна только на Barracks FIB.', 3500);
        }
        if (vehicle.getVariable('fibMatsLoaded') === true) {
            return notify(player, 2, 'Материалы уже погружены.', 3000);
        }
        if (fibMatsLoadingByVehicle.has(vehicle.id) || vehicle.getVariable('fibMatsLoading') === true) {
            return notify(player, 2, 'Погрузка уже идёт.', 3000);
        }
        if (!vehicleAtPoint(vehicle, FIB_MATS_LOAD_POINT)) {
            return notify(player, 2, 'Подъезжайте к точке погрузки материалов.', 3500);
        }

        const fibNearby = countFibNearLoadPoint(FIB_MATS_LOAD_FIB_RADIUS);
        if (fibNearby < FIB_MATS_LOAD_MIN_FIB) {
            return notify(
                player,
                2,
                `Для погрузки нужно минимум ${FIB_MATS_LOAD_MIN_FIB} сотрудников FIB в радиусе ${FIB_MATS_LOAD_FIB_RADIUS} м (сейчас ${fibNearby}).`,
                4500
            );
        }

        const vehicleId = vehicle.id;
        const playerId = player.id;
        const durationMs = Math.max(1000, Number(FIB_MATS_LOAD_DURATION_MS) || 5000);

        vehicle.setVariable('fibMatsLoading', true);
        try {
            vehicle.engine = false;
            vehicle.setVariable('engineState', false);
        } catch (_eEng) {}
        try { player.call('fibMats:load:progress', [durationMs]); } catch (_eProg) {}
        notify(player, 3, `Погрузка материалов... ${Math.ceil(durationMs / 1000)} сек.`, 3500);

        const timer = setTimeout(() => {
            const entry = fibMatsLoadingByVehicle.get(vehicleId);
            fibMatsLoadingByVehicle.delete(vehicleId);

            let veh = null;
            let pl = null;
            try { veh = mp.vehicles.at(vehicleId); } catch (_eV) { veh = null; }
            try { pl = mp.players.at(playerId); } catch (_eP) { pl = null; }

            if (!veh || !mp.vehicles.exists(veh)) return;
            try { veh.setVariable('fibMatsLoading', false); } catch (_eClr) {}

            if (!pl || !mp.players.exists(pl) || !entry || entry.playerId !== playerId) {
                try { if (pl && mp.players.exists(pl)) pl.call('fibMats:load:cancel', []); } catch (_eC) {}
                return;
            }

            if (!finishFibMatsLoading(pl, veh)) {
                try { pl.call('fibMats:load:cancel', []); } catch (_eC2) {}
            }
        }, durationMs);

        fibMatsLoadingByVehicle.set(vehicleId, {
            playerId,
            timer,
            startedAt: Date.now()
        });
    } catch (e) {
        console.log('[fibMats:load:s]', e.message || e);
        notify(player, 2, 'Ошибка погрузки.', 3000);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        const vehicle = player.vehicle;
        if (vehicle && mp.vehicles.exists(vehicle) && isFibMatsTruck(vehicle) && fibMatsLoadingByVehicle.has(vehicle.id)) {
            const entry = fibMatsLoadingByVehicle.get(vehicle.id);
            if (entry && entry.playerId === player.id) {
                cancelFibMatsLoading(vehicle.id, null);
            }
        }
    } catch (_e) {}
});

function initFibMatsColshapes() {
    deliveryColshapes.length = 0;

    FIB_MATS_DELIVERY_POINTS.forEach((point) => {
        const shape = global.creatorShapeSphere(point.x, point.y, point.z, point.radius || 6);
        shape.fibMatsDeliveryFaction = point.factionId;
        shape.fibMatsDeliveryPoint = point;
        deliveryColshapes.push(shape);
    });
}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!player || !mp.players.exists(player) || !colshape) return;
        const vehicle = player.vehicle;
        if (!vehicle || player.seat !== 0) return;
        if (!colshape.fibMatsDeliveryFaction) return;
        tryDeliverVehicleAtPoint(vehicle, colshape.fibMatsDeliveryPoint);
    } catch (_e) {}
});

setInterval(() => {
    try {
        mp.vehicles.forEach((vehicle) => {
            if (!isFibMatsTruck(vehicle)) return;

            try {
                const occ = vehicle.getOccupants();
                for (let i = 0; i < occ.length; i++) {
                    const p = occ[i];
                    if (p && mp.players.exists(p)) ejectInvalidFibMatsOccupant(p, vehicle);
                }
            } catch (_eOcc) {}

            if (vehicle.getVariable('fibMatsLoaded') !== true) return;
            const driver = getVehicleDriver(vehicle);
            const driverFr = driver && mp.players.exists(driver) ? playerFractionId(driver) : 0;
            const targetPoint = getDeliveryPointForFaction(driverFr);
            if (targetPoint && vehicleAtPoint(vehicle, targetPoint)) {
                tryDeliverVehicleAtPoint(vehicle, targetPoint);
            }
        });
    } catch (_e) {}
}, 2000);

initFibMatsColshapes();

module.exports = {
    FIB_MATS_LOAD_POINT,
    FIB_MATS_DELIVERY_POINTS
};
