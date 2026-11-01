/** Должен совпадать с client_packages/autosalon.js (AUTOSALON_VEHICLES model + price).
 *  Экономика: PayDay 2.5к$/ч, килл ~2.5к$ → активный час ~15–30к$.
 *  Starter ~2ч, mid ~8–15ч, exclusive ~25–40ч гринда. */
const AUTOSALON_CATALOG = {
    '98clk': 450000,
    'tesroad20': 650000,
    '2108320': 30000,
    '2109320': 32000,
    '2109920': 34000,
    '21134': 40000,
    '21144': 42000,
    '21154': 44000,
    '2347': 35000,
    '21093099ip': 38000,
    '211415p': 48000,

    lada2107: 35000,
    audisport: 85000,
    '2022c63': 150000,
    audiq8: 220000,
    '2020rs7': 300000,
    rmodsian: 425000,
    chiron17: 550000,
    alphard: 145000,
    i8: 275000,
    bmwix: 250000,
    '2019m5': 360000,
    astondb11: 575000,
    fera458: 650000,
    '2021ladaraven': 450000,
    tourbillon: 500,
    '812superfast': 700,
    battista: 800,
    amgone1: 850,
    gemera: 950,
    agerars: 1100,
    oppressor2: 300,
    valkyriespider: 2000,
    divo: 1000,
    exp100: 500
};
const AUTOSALON_DP_MODELS = new Set(['tourbillon', '812superfast', 'battista', 'amgone1', 'gemera', 'agerars', 'oppressor2', 'valkyriespider', 'divo', 'exp100']);

/** Компенсация по «гос.» цене автосалона */
global.AUTOSALON_CATALOG = AUTOSALON_CATALOG;
global.LEGACY_AUTOSALON_DP_MODELS = AUTOSALON_DP_MODELS;

const AUTOSALON_SHOWROOM_POS = new mp.Vector3(-43.70743179321289, -1098.13330078125, 26.42234230041504);
/** Точка педа в шоуруме — за камерой, не у витрины (иначе персонаж в кадре рядом с авто). */
const AUTOSALON_PLAYER_HIDE_POS = new mp.Vector3(-33.85, -1106.55, 25.95);
/** Точная точка выхода на уличный цилиндр «Автосалон (E)». */
const AUTOSALON_EXIT_POS = new mp.Vector3(-38.720848083496094, -1109.891845703125, 26.0);

function playerInAutosalonShowroom(player) {
    try {
        if (!player || !mp.players.exists(player) || player.dimension !== 124) return false;
        const p = player.position;
        const dx = p.x - AUTOSALON_SHOWROOM_POS.x;
        const dy = p.y - AUTOSALON_SHOWROOM_POS.y;
        const dz = p.z - AUTOSALON_SHOWROOM_POS.z;
        return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) <= 80;
    } catch (_e) {
        return false;
    }
}

mp.events.add('s:autoSalonBuy', (player, item) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.dimension !== 124) return;
        if (!player.getVariable('auth')) return;
        if (!playerInAutosalonShowroom(player)) return isNotify(player, 2, 'top-mid', 'Вернитесь в автосалон.', 3000);

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        const model = item != null && String(item).trim();
        if (!model) {
            return isNotify(player, 2, "top-mid", `Выберите автомобиль.`, 3000);
        }

        const catalogItem = AUTOSALON_CATALOG[model];
        if (catalogItem == null) {
            return isNotify(player, 2, "top-mid", `Этой модели нет в продаже.`, 3000);
        }
        const price = Number(catalogItem);
        const currency = AUTOSALON_DP_MODELS.has(model) ? 'DP' : '$';
        if (!Number.isFinite(price) || price < 1 || (currency !== '$' && currency !== 'DP')) {
            return isNotify(player, 2, 'top-mid', 'Цена автомобиля настроена неверно.', 3000);
        }

        const static = player.static;
        global.DB.query('SELECT cars, money, dp FROM accounts WHERE static = ?', [static], function (err, results) {
            if (err || !results || !results[0]) return;

            let carArray;
            try {
                carArray = global.normalizeCarsArray(JSON.parse(results[0].cars || '[]'));
            } catch (_e) {
                carArray = [];
            }

            if (global.carsListHasModel(carArray, model)) {
                return isNotify(player, 2, 'top-mid', 'У вас уже есть этот транспорт.', 3000);
            }

            const grantCar = function () {
                global.addcar(player, model, 'autosalon');
                isNotify(player, 3, 'top-mid', `Транспорт куплен. -${global.formatnum1(price)}${currency}`, 4000);
                try {
                    player.call('sound:client', [3]);
                } catch (_s) {}
            };

            if (currency === 'DP') {
                return global.economySpendDp(player, price, function (spendErr, spent) {
                    if (spendErr) return console.log('[AUTOSALON] DP purchase:', spendErr);
                    if (!spent) return isNotify(player, 2, 'top-mid', 'Недостаточно DP.', 3000);
                    grantCar();
                });
            }

            const curMoney = parseInt(String(player.money != null ? player.money : results[0].money || 0), 10);
            if (Number.isNaN(curMoney) || curMoney < price) {
                return isNotify(player, 2, 'top-mid', 'Недостаточно средств.', 3000);
            }
            const newMoney = curMoney - price;
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], function (e2) {
                if (e2) return console.log(e2);
                player.call('updateMoney', [global.formatnum1(newMoney)]);
                player.money = newMoney;
                grantCar();
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('autosalon:status', (player, status) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (status === true) {
            // Не пускать в салон из машины / не на ногах у маркера
            if (player.vehicle) {
                player.setVariable('autosalonc', false);
                return;
            }
            // 0 = с улицы, 124 = уже в салоне, 125 = возврат с тест-драйва
            const dim = player.dimension;
            if (dim !== 0 && dim !== 124 && dim !== 125) return;
            player.setVariable('autosalonc', false);
            player.dimension = 124;
        } else if (status === false) {
            if (player.getVariable('testdrivetwo')) return;
            // Выход телепортирует только из интерьера автосалона. Повторные
            // status=false после спавна/переподключения не должны двигать игрока.
            if (player.dimension !== 124) return;
            player.setVariable('autosalonc', false);
            player.dimension = 0;
            player.position = AUTOSALON_EXIT_POS;
            if(typeof global.legacyWorldExit==='function')global.legacyWorldExit(player);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('autosalon:testdrive:start:s', (player, model) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('testdrivetwo')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();
        
        if (player.dimension !== 124) return;
        if (!playerInAutosalonShowroom(player)) return isNotify(player, 2, 'top-mid', 'Вернитесь в автосалон.', 3000);

        const modelName = model != null && String(model).trim();
        if (!modelName || AUTOSALON_CATALOG[modelName] == null) {
            return isNotify(player, 2, 'top-mid', 'Выберите автомобиль.', 3000);
        }

        // Открытая улица у салона (не интерьер шоурума)
        const TESTDRIVE_POS = new mp.Vector3(-61.824, -1108.963, 26.262);
        const TESTDRIVE_HEADING = 70.0;

        const veh = mp.vehicles.new(mp.joaat(modelName), TESTDRIVE_POS, {
            heading: TESTDRIVE_HEADING,
            numberPlate: global.flowVehiclePlate(),
            alpha: 255,
            locked: false,
            engine: false,
            dimension: 125
        });

        if (!veh || !mp.vehicles.exists(veh)) {
            return isNotify(player, 2, 'top-mid', 'Не удалось создать авто для тест-драйва.', 3000);
        }

        veh.setColor(0, 0);
        veh.setVariable('owner', player.static);
        veh.setVariable('testdrivetwo', true);
        veh.setVariable('engineState', false);
        player.setVariable('testdrivetwo', true);
            player.carActive = veh;
            player.testdrivePosition = AUTOSALON_PLAYER_HIDE_POS;
            player.testdriveModel = modelName;
        player.dimension = 125;
        try {
            player.position = TESTDRIVE_POS;
        } catch (_tp) {}

        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            if (!veh || !mp.vehicles.exists(veh)) return;
            try {
                player.putIntoVehicle(veh, 0);
                veh.engine = false;
                veh.setVariable('engineState', false);
            } catch (_e) {}
        }, 250);

        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            if (!veh || !mp.vehicles.exists(veh)) return;
            if (player.vehicle !== veh) {
                try { player.putIntoVehicle(veh, 0); } catch (_e2) {}
            }
            try { veh.engine = false; veh.setVariable('engineState', false); } catch (_e3) {}
        }, 700);

    } catch (error) {
        console.log(error);
    }
});

mp.events.add('autosalon:testdrive:final:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.getVariable('testdrivetwo')) return;

        const activeCar = player.carActive;
        const savedModel = player.testdriveModel || null;

        player.setVariable('testdrivetwo', null);
        if (activeCar && mp.vehicles.exists(activeCar)) {
            try { activeCar.setVariable('testdrivetwo', null); } catch (_e) {}
            try { global.deleteVehTwo(activeCar); } catch (_e2) {}
        }
        player.carActive = null;

        const backPos = player.testdrivePosition || AUTOSALON_PLAYER_HIDE_POS;
        try {
            if (player.vehicle) player.removeFromVehicle();
        } catch (_rv) {}

        // Без player.spawn() — он ломает одежду/текстуры (чёрные руки/ноги).
        player.dimension = 124;
        player.position = backPos;
        try {
            player.heading = 30.0;
        } catch (_h) {}

        if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
            try { global.reapplyPlayerClothesAfterShopClose(player); } catch (_c) {}
        }

        player.call('autosalon:testdrive:final:c', [savedModel || '']);
        player.testdriveModel = null;
        player.testdrivePosition = null;
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;


        if (player.getVariable('testdrivetwo')) {
            mp.events.call('autosalon:testdrive:final:s', player);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('vehicleDeath', (vehicle) => {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle) || vehicle.getVariable('deleted')) return;

        if (vehicle.getVariable('testdriveone') || vehicle.getVariable('fractioncar') === true) return;

        const player = mp.players.toArray().find(p => p.static == vehicle.getVariable('owner'));
        if (vehicle.getVariable('testdrivetwo')) {
            if (!player || !mp.players.exists(player)) return;
            mp.events.call('autosalon:testdrive:final:s', player);
        }
    } catch (error) {
        console.log(error);
    }
});
