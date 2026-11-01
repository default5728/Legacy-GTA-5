/**
 * Los Santos Customs — сервер (перенос из GTA 5 DM, адаптирован под Flow).
 */
if (!global.rpc) global.rpc = require('./rage-rpc.min.js');
const rpc = global.rpc;

const LSC_SHOP = {
    id: 'LS_CUSTOM_STRAWBERRY',
    marker: new mp.Vector3(-21.0142, -1309.3163, 29.2575),
    vehPosition: new mp.Vector3(-14.5, -1304.8, 28.35),
    vehRot: 88,
    exitVeh: new mp.Vector3(-19.0, -1308.5, 29.0),
    exitRot: 268
};

const MOD_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 18, 23, 48, 55];
const MOD_PRICE_RATE = {
    0: 0.012, 1: 0.015, 2: 0.018, 3: 0.02, 4: 0.015, 5: 0.012, 6: 0.01,
    7: 0.025, 10: 0.02, 11: 0.025, 12: 0.018, 13: 0.02, 14: 0.008, 15: 0.015,
    18: 0.022, 23: 0.015, 48: 0.025, 55: 0.01
};

/** Стабильный dim на игрока — без коллизий random 1–1000. */
function allocLscDimension(player) {
    const pid = player && typeof player.id === 'number' ? player.id : Math.floor(Math.random() * 4000);
    return 12000 + (pid % 4000);
}

function rpcOk(data) {
    return { error: 0, data: data !== undefined ? data : true };
}

function rpcFail(text) {
    return { error: 1, errorText: String(text || 'Ошибка') };
}

function rpcPlayer(_args, info) {
    const p = info && info.player;
    return p && mp.players.exists(p) ? p : null;
}

function defaultTuning() {
    return { mods: {}, primary: null, secondary: null, colorType: [0, 0], pearlescent: 0, wheelColor: 0, neon: null, windowTint: 0 };
}

/** setWindowTint — только на клиенте; на сервере RageMP используется свойство windowTint. */
function setVehicleWindowTint(veh, tint) {
    if (!veh || !mp.vehicles.exists(veh)) return;
    const value = Math.max(0, Math.min(5, Number(tint) || 0));
    try {
        if (typeof veh.setWindowTint === 'function') {
            veh.setWindowTint(value);
            return;
        }
    } catch (_e) {}
    try {
        veh.windowTint = value;
    } catch (_e2) {}
}

function getVehicleBasePrice(model) {
    const cat = global.AUTOSALON_CATALOG || {};
    if (model && cat[model] != null) return Number(cat[model]) || 2000000;
    return 2000000;
}

function buildModPrices(basePrice) {
    const out = {};
    MOD_SLOTS.forEach((slot) => {
        out[slot] = Math.max(500, Math.round(basePrice * (MOD_PRICE_RATE[slot] || 0.015)));
    });
    return out;
}

function buildOpenPayload(player, veh, shopId, tuning, lscDimension) {
    const model = veh.getVariable('carModel') || '';
    const base = getVehicleBasePrice(model);
    const t = tuning || defaultTuning();
    const colorType = Array.isArray(t.colorType) ? t.colorType : [0, 0];
    return {
        id: shopId,
        vehId: typeof veh.remoteId === 'number' ? veh.remoteId : veh.id,
        lscDimension: typeof lscDimension === 'number' ? lscDimension : player.dimension,
        colorType: [Number(colorType[0]) || 0, Number(colorType[1]) || 0],
        colorPrice: Math.max(3000, Math.round(base * 0.004)),
        colorTypePrice: Math.max(2000, Math.round(base * 0.002)),
        modPrice: buildModPrices(base),
        universalMods: [],
        keyPrice: Math.max(5000, Math.round(base * 0.003)),
        resetKeyPrice: Math.max(2500, Math.round(base * 0.0015)),
        neonFullPrice: Math.max(15000, Math.round(base * 0.008)),
        neonPrice: Math.max(8000, Math.round(base * 0.005)),
        neonDeletePrice: Math.max(3000, Math.round(base * 0.002)),
        colorWheelPrice: Math.max(4000, Math.round(base * 0.003)),
        colorPPrice: Math.max(4000, Math.round(base * 0.003)),
        modsCount: {},
        isMoto: false,
        firstColor: [255, 255, 255],
        secondColor: [255, 255, 255]
    };
}

function takeMoney(player, amount) {
    const price = Math.max(0, Math.round(Number(amount) || 0));
    return new Promise((resolve) => {
        if (price <= 0) return resolve(true);
        if (typeof global.economySpendMoney === 'function') {
            global.economySpendMoney(player, price, (err, ok) => {
                if (err || !ok) {
                    isNotify(player, 2, 'top-mid', 'Недостаточно средств.', 3000);
                    return resolve(false);
                }
                resolve(true);
            });
            return;
        }
        const cur = Number(player.money) || 0;
        if (cur < price) {
            isNotify(player, 2, 'top-mid', 'Недостаточно средств.', 3000);
            return resolve(false);
        }
        const next = cur - price;
        player.money = next;
        try { player.call('updateMoney', [global.formatnum1(next)]); } catch (_e) {}
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [next, player.static], () => {});
        resolve(true);
    });
}

function getSession(player) {
    return player.lscSession || null;
}

function getSessionVeh(player) {
    const s = getSession(player);
    if (!s || !s.veh || !mp.vehicles.exists(s.veh)) return null;
    return s.veh;
}

function readPlayerCarsJson(player, cb) {
    if (typeof global.readPlayerCarsFromDb === 'function') {
        return global.readPlayerCarsFromDb(player, cb);
    }
    global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], (err, rows) => {
        cb(err, (rows && rows[0] && rows[0].cars) || '[]');
    });
}

function writePlayerCarsJson(player, carsJson, cb) {
    if (typeof global.writePlayerCarsToDb === 'function') {
        return global.writePlayerCarsToDb(player, carsJson, cb);
    }
    global.DB.query('UPDATE accounts SET cars = ? WHERE static = ?', [carsJson, player.static], (err) => {
        if (typeof cb === 'function') cb(err);
    });
}

function findCarEntryIndex(arr, model) {
    const needle = String(model || '').trim().toLowerCase();
    if (!needle) return -1;
    return arr.findIndex((e) => String(e.m).trim().toLowerCase() === needle);
}

function loadCarTuning(player, model, cb) {
    readPlayerCarsJson(player, (err, carsRaw) => {
        if (err || !mp.players.exists(player)) return cb(defaultTuning());
        try {
            const arr = global.normalizeCarsArray(JSON.parse(carsRaw || '[]'));
            const entry = arr[findCarEntryIndex(arr, model)];
            cb(entry && entry.t ? entry.t : defaultTuning());
        } catch (_e) {
            cb(defaultTuning());
        }
    });
}

function saveCarTuning(player, model, tuning) {
    readPlayerCarsJson(player, (err, carsRaw) => {
        if (err || !mp.players.exists(player)) return;
        try {
            const arr = global.normalizeCarsArray(JSON.parse(carsRaw || '[]'));
            const idx = findCarEntryIndex(arr, model);
            if (idx < 0) return;
            arr[idx].t = tuning;
            const json = global.serializeCarsForDb(arr);
            writePlayerCarsJson(player, json, (wErr) => {
                if (wErr) console.log('[lsc] saveCarTuning:', wErr.message || wErr);
                if (player.tradeDonateSnapshot) {
                    try {
                        player.tradeDonateSnapshot.cars = global.normalizeCarsArray(JSON.parse(json));
                    } catch (_eSnap) {}
                }
            });
        } catch (_e) {}
    });
}

global.applyVehicleTuning = function applyVehicleTuning(veh, tuning, syncClients) {
    if (!veh || !mp.vehicles.exists(veh) || !tuning) return;
    if (syncClients === undefined) syncClients = true;

    // На сервере RageMP доступны только setMod/toggleMod/windowTint — цвета и неон только на клиенте.
    try {
        if (typeof veh.setModKit === 'function') veh.setModKit(0);
    } catch (_e) {}
    const mods = tuning.mods || {};
    Object.keys(mods).forEach((k) => {
        const slot = parseInt(k, 10);
        const val = parseInt(mods[k], 10);
        if (Number.isNaN(slot) || Number.isNaN(val)) return;
        try {
            if (slot === 22) {
                if (typeof veh.toggleMod === 'function') {
                    if (val < 0) veh.toggleMod(22, false);
                    else { veh.toggleMod(22, true); if (typeof veh.setMod === 'function') veh.setMod(22, val); }
                }
            } else if (slot === 18) {
                if (typeof veh.toggleMod === 'function') {
                    veh.toggleMod(18, val >= 0);
                    if (val >= 0 && typeof veh.setMod === 'function') veh.setMod(18, Math.max(0, val));
                }
            } else if (slot !== 55 && typeof veh.setMod === 'function') {
                veh.setMod(slot, val);
            }
        } catch (_e2) {}
    });
    if (tuning.windowTint != null) setVehicleWindowTint(veh, tuning.windowTint);

    if (!syncClients) return;
    try {
        veh.setVariable('vehTuning', JSON.stringify(tuning));
    } catch (_e3) {}
    const clientId = typeof veh.remoteId === 'number' ? veh.remoteId : veh.id;
    const json = JSON.stringify(tuning);
    mp.players.forEach((p) => {
        try { p.call('lsc:applyTuning:c', [clientId, json]); } catch (_e4) {}
    });
};

function captureTuningFromVehicle(veh, prev) {
    const t = prev ? JSON.parse(JSON.stringify(prev)) : defaultTuning();
    if (!t.mods) t.mods = {};
    MOD_SLOTS.forEach((slot) => {
        try {
            const v = veh.getMod(slot);
            if (v != null && v !== -1) t.mods[String(slot)] = v;
            else delete t.mods[String(slot)];
        } catch (_e) {}
    });
    return t;
}

function pushOpen(player, payload) {
    // Один канал — без двойного открытия rpc+call
    try {
        player.call('client.lsc.open', [JSON.stringify(payload)]);
    } catch (_e) {}
}

// ——— Мир ———
mp.blips.new(72, LSC_SHOP.marker, {
    color: 0,
    scale: 0.9,
    name: 'Los Santos Customs',
    shortRange: true,
    dimension: 0
});

global.creatorMarkersNew(27, new mp.Vector3(LSC_SHOP.marker.x, LSC_SHOP.marker.y, LSC_SHOP.marker.z - 0.95), 2.5, {
    color: [220, 38, 38, 180],
    visible: true,
    dimension: 0
});

global.creatorLabelsNew('Los Santos Customs (E)', new mp.Vector3(LSC_SHOP.marker.x, LSC_SHOP.marker.y, LSC_SHOP.marker.z + 0.35), {
    font: 4,
    color: [232, 232, 232, 255],
    drawDistance: 12,
    los: false
});

const lscCol = global.creatorShapeSphere(LSC_SHOP.marker.x, LSC_SHOP.marker.y, LSC_SHOP.marker.z, 3.5);

function enterLscZone(player) {
    if (!mp.players.exists(player) || player.lscSession || player.lscZone) return;
    const prevDimension = player.dimension;
    const zoneDimension = allocLscDimension(player);
    player.lscZone = { prevDimension, zoneDimension };
    player.dimension = zoneDimension;
    const veh = player.vehicle;
    if (veh && mp.vehicles.exists(veh)) veh.dimension = zoneDimension;
}

function exitLscZone(player) {
    if (!mp.players.exists(player) || player.lscSession || !player.lscZone) return;
    const prev = player.lscZone.prevDimension != null ? player.lscZone.prevDimension : 0;
    player.dimension = prev;
    const veh = player.vehicle;
    if (veh && mp.vehicles.exists(veh)) veh.dimension = prev;
    player.lscZone = null;
}

mp.events.add('playerEnterColshape', (player, shape) => {
    if (shape !== lscCol || !mp.players.exists(player)) return;
    if (!player.getVariable('auth')) return;
    if (!player.vehicle) return;
    enterLscZone(player);
    player.call('lsc:zone', [true, LSC_SHOP.id]);
});

mp.events.add('playerExitColshape', (player, shape) => {
    if (shape !== lscCol || !mp.players.exists(player)) return;
    exitLscZone(player);
    player.call('lsc:zone', [false, LSC_SHOP.id]);
});

// ——— Сессия ———
mp.events.add('server_lsCustom_start', (player, shopId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.vehicle) return isNotify(player, 2, 'top-mid', 'Вы должны быть в транспорте.', 3000);
        if (player.lscSession) return;

        const veh = player.vehicle;
        const owner = veh.getVariable('owner');
        const isOwnActive = player.carActive === veh;
        const isOwner = owner != null && String(owner) === String(player.static);
        if (!isOwnActive && !isOwner) {
            return isNotify(player, 2, 'top-mid', 'Это не ваш транспорт.', 3000);
        }

        const model = String(veh.getVariable('carModel') || '').trim();
        if (!model) {
            return isNotify(player, 2, 'top-mid', 'Тюнинг доступен только для личного транспорта из гаража.', 4000);
        }

        readPlayerCarsJson(player, (err, carsRaw) => {
            if (err || !mp.players.exists(player)) return;
            let carsNorm = [];
            try {
                carsNorm = global.normalizeCarsArray(JSON.parse(carsRaw || '[]'));
            } catch (_eCars) {}
            if (!global.carsListHasModel(carsNorm, model)) {
                return isNotify(player, 2, 'top-mid', 'Этот транспорт не в вашем гараже.', 3000);
            }

            player.removeFromVehicle();
            veh.position = LSC_SHOP.vehPosition;
            veh.rotation = new mp.Vector3(0, 0, LSC_SHOP.vehRot);
            veh.engine = false;
            veh.locked = true;
            player.setVariable('lscmenu', true);

            loadCarTuning(player, model, (tuning) => {
                if (!mp.players.exists(player)) return;
                const saved = tuning || defaultTuning();
                const prevDimension = player.lscZone
                    ? player.lscZone.prevDimension
                    : player.dimension;
                const lscDimension = player.lscZone
                    ? player.lscZone.zoneDimension
                    : allocLscDimension(player);
                player.lscZone = null;
                player.lscSession = {
                    shopId: shopId || LSC_SHOP.id,
                    veh,
                    model,
                    tuning: saved,
                    prevDimension,
                    lscDimension
                };
                player.dimension = lscDimension;
                veh.dimension = lscDimension;
                global.applyVehicleTuning(veh, saved);
                pushOpen(player, buildOpenPayload(player, veh, shopId || LSC_SHOP.id, saved, lscDimension));
            });
        });
    } catch (e) {
        console.log('[lsc] start', e);
        if (mp.players.exists(player)) {
            player.setVariable('lscmenu', false);
            isNotify(player, 2, 'top-mid', 'Ошибка открытия LSC.', 3000);
        }
    }
});

mp.events.add('server_lsCustom_end', (player, shopId, x, y, z, rot) => {
    try {
        if (!mp.players.exists(player)) return;
        const session = getSession(player);
        if (!session) return;
        const veh = session.veh;
        const prevDimension = session.prevDimension != null ? session.prevDimension : 0;
        if (veh && mp.vehicles.exists(veh)) {
            global.applyVehicleTuning(veh, session.tuning || defaultTuning());
            veh.position = new mp.Vector3(Number(x), Number(y), Number(z));
            veh.rotation = new mp.Vector3(0, 0, Number(rot));
            veh.locked = false;
            veh.dimension = prevDimension;
            setTimeout(() => {
                if (mp.players.exists(player) && mp.vehicles.exists(veh)) {
                    try { player.putIntoVehicle(veh, 0); } catch (_e) {}
                }
            }, 1200);
        }
        player.dimension = prevDimension;
        player.lscSession = null;
        player.setVariable('lscmenu', false);
    } catch (e) {
        console.log('[lsc] end', e);
    }
});

function withSessionRpc(handler) {
    return async (args, info) => {
        const player = rpcPlayer(args, info);
        if (!player) return rpcFail('Игрок не найден');
        const veh = getSessionVeh(player);
        if (!veh) return rpcFail('Сессия LSC не активна');
        try {
            const result = await handler(player, veh, args);
            if (result === false) return rpcFail('Недостаточно средств или ошибка покупки');
            return rpcOk(result === undefined || result === true ? true : result);
        } catch (e) {
            console.log('[lsc] rpc', e);
            return rpcFail(e.message || 'Ошибка LSC');
        }
    };
}

if (rpc && rpc.register) {
    rpc.register('server_lsCustom_buyColor', withSessionRpc(async (player, veh, args) => {
        const p1 = args[2];
        const p2 = args[3];
        const payload = buildOpenPayload(player, veh, getSession(player).shopId);
        if (!(await takeMoney(player, payload.colorPrice))) return false;
        const session = getSession(player);
        session.tuning.primary = [p1[0], p1[1], p1[2]];
        session.tuning.secondary = [p2[0], p2[1], p2[2]];
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyMod', withSessionRpc(async (player, veh, args) => {
        const slot = parseInt(args[2], 10);
        const idx = parseInt(args[3], 10);
        const payload = buildOpenPayload(player, veh, getSession(player).shopId);
        const price = (payload.modPrice && payload.modPrice[slot]) || 10000;
        if (!(await takeMoney(player, price))) return false;
        const session = getSession(player);
        if (slot === 55) {
            session.tuning.windowTint = idx + 1;
        } else if (slot === 22) {
            session.tuning.mods['22'] = idx;
        } else if (slot === 18) {
            if (idx < 0) delete session.tuning.mods['18'];
            else session.tuning.mods['18'] = Math.max(0, idx);
        } else {
            if (idx === -1) delete session.tuning.mods[String(slot)];
            else session.tuning.mods[String(slot)] = idx;
        }
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyUniMod', withSessionRpc(async (player, veh, args) => {
        const slot = parseInt(args[2], 10);
        const idx = parseInt(args[3], 10);
        let price = parseInt(args[4], 10);
        const session = getSession(player);
        const payload = buildOpenPayload(player, veh, session.shopId);
        if (!Number.isFinite(price) || price <= 0) {
            price = (payload.modPrice && payload.modPrice[slot]) || Math.max(5000, Math.round(getVehicleBasePrice(session.model) * 0.01));
        }
        if (!(await takeMoney(player, price))) return false;
        if (!session.tuning.mods) session.tuning.mods = {};
        if (slot === 18) {
            if (idx < 0) delete session.tuning.mods['18'];
            else session.tuning.mods['18'] = Math.max(0, idx);
        } else if (slot === 22) {
            session.tuning.mods['22'] = idx;
        } else if (idx === -1) {
            delete session.tuning.mods[String(slot)];
        } else {
            session.tuning.mods[String(slot)] = idx;
        }
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyColorType', withSessionRpc(async (player, veh, args) => {
        const c1 = args[2];
        const c2 = args[3];
        const session = getSession(player);
        const payload = buildOpenPayload(player, veh, session.shopId);
        if (!(await takeMoney(player, payload.colorTypePrice))) return false;
        session.tuning.colorType = [Number(c1), Number(c2)];
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyColorWheel', withSessionRpc(async (player, veh, args) => {
        const color = Number(args[2]);
        const session = getSession(player);
        const payload = buildOpenPayload(player, veh, session.shopId);
        if (!(await takeMoney(player, payload.colorWheelPrice))) return false;
        session.tuning.wheelColor = color;
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyColorP', withSessionRpc(async (player, veh, args) => {
        const color = Number(args[2]);
        const session = getSession(player);
        const payload = buildOpenPayload(player, veh, session.shopId);
        if (!(await takeMoney(player, payload.colorPPrice))) return false;
        session.tuning.pearlescent = color;
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyNeon', withSessionRpc(async (player, veh, args) => {
        const r = Number(args[2]);
        const g = Number(args[3]);
        const b = Number(args[4]);
        const payload = buildOpenPayload(player, veh, getSession(player).shopId);
        if (!(await takeMoney(player, payload.neonPrice))) return false;
        const session = getSession(player);
        session.tuning.neon = { r, g, b };
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyDeleteNeon', withSessionRpc(async (player, veh, args) => {
        const payload = buildOpenPayload(player, veh, getSession(player).shopId);
        if (!(await takeMoney(player, payload.neonDeletePrice))) return false;
        const session = getSession(player);
        session.tuning.neon = null;
        saveCarTuning(player, session.model, session.tuning);
        global.applyVehicleTuning(veh, session.tuning);
        return true;
    }));

    rpc.register('server_lsCustom_buyKey', withSessionRpc(async (player) => {
        isNotify(player, 2, 'top-mid', 'Смена ключей недоступна.', 3000);
        return false;
    }));

    rpc.register('server_lsCustom_buyResetKey', withSessionRpc(async (player) => {
        isNotify(player, 2, 'top-mid', 'Сброс ключей недоступен.', 3000);
        return false;
    }));
}

mp.events.add('playerQuit', (player) => {
    const session = player.lscSession;
    if (session && session.veh && mp.vehicles.exists(session.veh)) {
        try {
            session.veh.dimension = session.prevDimension != null ? session.prevDimension : 0;
        } catch (_e) {}
    } else if (player.lscZone) {
        try {
            const prev = player.lscZone.prevDimension != null ? player.lscZone.prevDimension : 0;
            player.dimension = prev;
            const veh = player.vehicle;
            if (veh && mp.vehicles.exists(veh)) veh.dimension = prev;
        } catch (_e2) {}
    }
    player.lscSession = null;
    player.lscZone = null;
    try { player.setVariable('lscmenu', false); } catch (_e2) {}
});
