/** Точки аренды: колшейп NPC → отдельный спавн машины (не привязан только к fraction id). */
const RENT_SPAWN_SITES = [
    {
        id: 'rent_frac_1',
        col: { x: -4.780910968780518, y: -1415.6131591796875, r: 2 },
        ped: { pos: [-4.780910968780518, -1415.6131591796875, 29.29814338684082], heading: -14.936514854431152 },
        vehicle: { coords: [162.6346893310547, -1737.1805419921875, 29.296659469604492], heading: 143.68858337402344 }
    },
    {
        id: 'rent_frac_2',
        col: { x: 159.190185546875, y: -1726.7152099609375, r: 2 },
        ped: { pos: [159.190185546875, -1726.7152099609375, 29.29168701171875], heading: -101.74408721923828 },
        vehicle: { coords: [-8.27456283569336, -1393.0020751953125, 29.325071334838867], heading: -0.49740394949913025 }
    },
    {
        id: 'rent_frac_3',
        col: { x: 924.3528442382812, y: -1567.64501953125, r: 2 },
        ped: { pos: [924.3528442382812, -1567.64501953125, 30.814775466918945], heading: 83.72959899902344 },
        vehicle: { coords: [947.6864013671875, -1575.105712890625, 30.406959533691406], heading: -90.59761810302734 }
    },
    {
        id: 'rent_frac_4',
        col: { x: 846.9677124023438, y: -2332.51416015625, r: 2 },
        ped: { pos: [846.9677124023438, -2332.51416015625, 30.336109161376953], heading: 179.30479431152344 },
        vehicle: { coords: [882.578369140625, -2349.63818359375, 30.3311767578125], heading: 85.19712829589844 }
    },
    {
        id: 'rent_frac_5',
        col: { x: 1386.5477294921875, y: -2072.5537109375, r: 2 },
        ped: { pos: [1386.5477294921875, -2072.5537109375, 51.99674606323242], heading: 35.44103240966797 },
        vehicle: { coords: [1365.00537109375, -2027.314453125, 52.04342269897461], heading: 27.64814567565918 }
    },
    {
        id: 'rent_fib',
        col: { x: 423.1767272949219, y: -976.6810302734375, r: 2 },
        ped: { pos: [423.18, -976.68, 30.71], heading: -135 },
        vehicle: { coords: [399.7075500488281, -976.3340454101562, 28.864429473876953], heading: 178.8184356689453 }
    },
    {
        id: 'rent_ems',
        col: { x: 331.0845642089844, y: -1399.398193359375, r: 2 },
        vehicle: { coords: [315.5148620605469, -1371.0447998046875, 32.5093994140625], heading: 140.22457885742188 },
        clientPed: true
    },
    {
        id: 'rent_arena',
        col: { x: -250.7865, y: -2037.3282, r: 2 },
        ped: {
            pos: [-250.7865, -2037.3282, 29.9460],
            heading: 228.7076,
            model: 's_m_y_valet_01',
            label: 'Аренда транспорта (E)'
        },
        vehicle: { coords: [-246.15, -2043.65, 29.9460], heading: 228.7076 }
    },
    {
        id: 'rent_casino',
        col: { x: 886.9106, y: -0.4352, r: 2 },
        ped: {
            pos: [886.9106, -0.4352, 78.7650],
            heading: 146.1388,
            model: 's_m_y_valet_01',
            label: 'Аренда транспорта (E)'
        },
        vehicle: { coords: [881.09, 3.46, 78.7650], heading: 56.1388 }
    },
    {
        id: 'rent_port',
        col: { x: -419.6007, y: -2740.6179, r: 2 },
        ped: {
            pos: [-419.6007, -2740.6179, 6.0002],
            heading: 1.4844,
            model: 'a_m_m_prolhost_01',
            label: 'Аренда транспорта (E)'
        },
        vehicle: { coords: [-419.40, -2732.80, 6.0002], heading: 1.4844 }
    },
    {
        id: 'rent_construction',
        col: { x: 155.8669, y: -347.4565, r: 2 },
        ped: {
            pos: [155.8669, -347.4565, 44.1976],
            heading: 1.8110,
            model: 'a_m_m_prolhost_01',
            label: 'Аренда транспорта (E)'
        },
        vehicle: { coords: [155.87, -339.64, 44.1976], heading: 1.8110 }
    }
];

const colspahesRentCar = [];
RENT_SPAWN_SITES.forEach((site) => {
    const cs = global.creatorShapeCircle(site.col.x, site.col.y, site.col.r, 0);
    cs._rentSiteId = site.id;
    colspahesRentCar.push(cs);
});

/** Аренда на начальном спавне: только у NPC (не весь хаб — иначе E открывает аренду на спавне). */
const _flRent = global.FACTIONLESS_RENT_SPAWN || global.FACTIONLESS_HUB_SPAWN;
const _flHub = global.FACTIONLESS_HUB_SPAWN || _flRent;
const _flVeh = global.FACTIONLESS_RENT_VEHICLE_SPAWN || _flHub;
/** Радиус взаимодействия с NPC аренды на спавне новичков. */
const FACTIONLESS_HUB_RENT_RADIUS = 2.5;
const factionlessRentCol = global.creatorShapeCircle(_flRent.x, _flRent.y, FACTIONLESS_HUB_RENT_RADIUS, 0);
factionlessRentCol._rentSiteId = 'rent_factionless';

function rentSiteById(siteId) {
    if (!siteId) return null;
    return RENT_SPAWN_SITES.find((s) => s.id === siteId) || null;
}

function rentSpawnFromSite(site) {
    if (!site || !site.vehicle) return null;
    const v = site.vehicle;
    return {
        coords: new mp.Vector3(v.coords[0], v.coords[1], v.coords[2]),
        heading: Number(v.heading) || 0
    };
}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        if (player.dimension !== 0) return;

        if (colspahesRentCar.includes(colshape)) {
            player.setVariable('inColshapeRentCar', true);
            player.setVariable('inColshapeFactionlessRent', false);
            if (colshape._rentSiteId) player.setVariable('rentSiteId', colshape._rentSiteId);
        } else if (colshape === factionlessRentCol) {
            player.setVariable('inColshapeFactionlessRent', true);
            player.setVariable('inColshapeRentCar', false);
            player.setVariable('rentSiteId', 'rent_factionless');
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        if (player.dimension !== 0) return;

        if (colspahesRentCar.includes(colshape)) {
            player.call('rent:close');
            player.setVariable('inColshapeRentCar', false);
            player.setVariable('rentSiteId', null);
        } else if (colshape === factionlessRentCol) {
            player.call('rent:close');
            player.setVariable('inColshapeFactionlessRent', false);
            player.setVariable('rentSiteId', null);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('s:checkDistanceRentCar', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        const nearFactionRent = player.getVariable('inColshapeRentCar') === true;
        const nearFactionlessRent =
            player.getVariable('inColshapeFactionlessRent') === true ||
            isNearFactionlessHubArea(player, FACTIONLESS_HUB_RENT_RADIUS);
        if (nearFactionRent || nearFactionlessRent) {
            if (nearFactionlessRent) player.setVariable('rentSiteId', 'rent_factionless');
            player.call('c:openCefRentCar');
        }
    } catch (error) {
        console.log(error);
    }
});

function getFactionlessRentVehicleSpawnRuntime() {
    const v = global.FACTIONLESS_RENT_VEHICLE_SPAWN || global.FACTIONLESS_HUB_SPAWN || _flRent;
    return {
        coords: new mp.Vector3(v.x, v.y, v.z),
        heading: v.h != null ? Number(v.h) : 0
    };
}

function isNearFactionlessHubArea(player, maxDist2d) {
    if (!player || !mp.players.exists(player)) return false;
    const limit = Number(maxDist2d) || FACTIONLESS_HUB_RENT_RADIUS;
    const pos = player.position;
    const p = _flRent;
    if (!p) return false;
    return calculateDistance2d(pos, new mp.Vector3(p.x, p.y, pos.z)) <= limit;
}

/** Начальный спавн: с фракцией и без — у NPC или в зоне хаба. */
function isFactionlessHubRentContext(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (player.getVariable('inColshapeFactionlessRent') === true) return true;
    if (player.getVariable('factionlessHub') === true && isNearFactionlessHubArea(player)) return true;
    if (player.getVariable('gangwar') === true && isNearFactionlessHubArea(player)) return true;
    return false;
}

function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateDistance2d(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function findNearestRentSiteByColPos(pos, maxDist) {
    const limit = Number(maxDist) || 12;
    let best = null;
    let minD = limit;
    for (let i = 0; i < RENT_SPAWN_SITES.length; i++) {
        const site = RENT_SPAWN_SITES[i];
        const c = site.col;
        const d = calculateDistance2d(pos, new mp.Vector3(c.x, c.y, pos.z));
        if (d < minD) {
            minD = d;
            best = site;
        }
    }
    return best;
}

function ensurePlayerRentSiteContext(player) {
    if (!player || !mp.players.exists(player)) return false;
    const pos = player.position;
    if (
        player.getVariable('inColshapeFactionlessRent') === true ||
        isFactionlessHubRentContext(player)
    ) {
        if (isNearFactionlessHubArea(player, FACTIONLESS_HUB_RENT_RADIUS + 2)) {
            player.setVariable('rentSiteId', 'rent_factionless');
            return true;
        }
        player.setVariable('inColshapeFactionlessRent', false);
        player.setVariable('rentSiteId', null);
        return false;
    }
    const siteId = player.getVariable('rentSiteId');
    const site = rentSiteById(siteId);
    if (!site) return false;
    if (calculateDistance2d(pos, new mp.Vector3(site.col.x, site.col.y, pos.z)) <= Math.max(4.0, Number(site.col.r) + 2.0)) return true;
    player.setVariable('inColshapeRentCar', false);
    player.setVariable('rentSiteId', null);
    return false;
}

/** Спавн машины: сначала точка NPC (rentSiteId), иначе ближайшая площадка аренды. */
function getRentSpawnCoordForPlayer(player) {
    if (isFactionlessHubRentContext(player)) {
        return getFactionlessRentVehicleSpawnRuntime();
    }

    const siteId = player.getVariable('rentSiteId');
    const boundSite = rentSiteById(siteId);
    if (boundSite) {
        const spawn = rentSpawnFromSite(boundSite);
        if (spawn) return spawn;
    }

    let closest = null;
    let minDistance = 85;
    const pos = player.position;
    for (let i = 0; i < RENT_SPAWN_SITES.length; i++) {
        const site = RENT_SPAWN_SITES[i];
        const spawn = rentSpawnFromSite(site);
        if (!spawn) continue;
        const d = calculateDistance(pos, spawn.coords);
        if (d < minDistance) {
            closest = spawn;
            minDistance = d;
        }
    }
    return closest;
}

const RENT_BIKE_MODELS = new Set(['ktm125']);
const RENT_HELI_MODELS = new Set(['seasparrow2']);

const RENT_SITE_FRACTION = {
    rent_frac_1: 1,
    rent_frac_2: 2,
    rent_frac_3: 3,
    rent_frac_4: 4,
    rent_frac_5: 5,
    rent_fib: 6
};

/** Вертолётные площадки фракций (как factionheli в other.js). */
const RENT_HELI_PADS = {
    1: { coords: [195.10916137695312, -1717.4456787109375, 32.87907409667969], heading: -152.99810791015625 },
    2: { coords: [-27.69335174560547, -1404.211669921875, 34.58267593383789], heading: -84.3482894897461 },
    3: { coords: [277.1607971191406, -1911.7969970703125, 29.318302154541016], heading: 46.84783935546875 },
    4: { coords: [-334.8177185058594, -1544.5433349609375, 36.10999298095703], heading: -88.7071762084961 },
    5: { coords: [553.998046875, -1776.806884765625, 37.10675048828125], heading: -114.60282135009766 },
    6: { coords: [449.1666259765625, -981.3761596679688, 43.6916618347168], heading: 178.8184356689453 }
};

function isRentBikeModel(spawnCar) {
    return RENT_BIKE_MODELS.has(String(spawnCar || '').toLowerCase());
}

function isRentHeliModel(spawnCar) {
    return RENT_HELI_MODELS.has(String(spawnCar || '').toLowerCase());
}

function getRentHeliSpawnForPlayer(player, fallbackSpawn) {
    const siteId = player.getVariable('rentSiteId');
    const frac = RENT_SITE_FRACTION[siteId];
    if (frac && RENT_HELI_PADS[frac]) {
        const pad = RENT_HELI_PADS[frac];
        return {
            coords: new mp.Vector3(pad.coords[0], pad.coords[1], pad.coords[2]),
            heading: Number(pad.heading) || 0
        };
    }
    if (!fallbackSpawn || !fallbackSpawn.coords) return null;
    const c = fallbackSpawn.coords;
    return {
        coords: new mp.Vector3(c.x, c.y, c.z + 1.5),
        heading: Number(fallbackSpawn.heading) || 0
    };
}

const rentCars = [{
        id: 1,
        name: 'Pariah',
        spawnCar: 'pariah',
        price: 500
    }, {
        id: 2,
        name: 'Raiden',
        spawnCar: 'raiden',
        price: 500
    }, {
        id: 3,
        name: 'XA-21',
        spawnCar: 'xa21',
        price: 1000
    }, {
        id: 4,
        name: 'T20',
        spawnCar: 't20',
        price: 1000
    }, {
        id: 5,
        name: 'Elegy2',
        spawnCar: 'elegy2',
        price: 2500
    }, {
        id: 6,
        name: 'Toros',
        spawnCar: 'toros',
        price: 2500
    }, {
        id: 7,
        name: 'Dominator3',
        spawnCar: 'dominator3',
        price: 5000
    }, {
        id: 8,
        name: 'Baller6',
        spawnCar: 'baller6',
        price: 1000
    }, {
        id: 9,
        name: 'XLS2',
        spawnCar: 'xls2',
        price: 2500
    }, {
        id: 10,
        name: 'FBI2',
        spawnCar: 'fbi2',
        price: 5000
    }, {
        id: 12,
        name: 'Avtr',
        spawnCar: 'avtr',
        price: 7500
    }, {
        id: 13,
        name: 'BMW E70',
        spawnCar: 'bmwe70',
        price: 6000
    }, {
        id: 14,
        name: 'Principe 125 2006',
        spawnCar: 'ktm125',
        price: 2500
    }, {
        id: 15,
        name: 'Sparrow',
        spawnCar: 'seasparrow2',
        price: 50000
    }
];

function resolveRentCar(vehmodel) {
    const raw = String(vehmodel || '').trim();
    if (!raw) return null;
    const aliases = {
        xa21: 'XA-21',
        baller6: 'Baller6',
        xls2: 'XLS2',
        fbi: 'FBI2',
        elegy2: 'Elegy2',
        dominator3: 'Dominator3',
        toros: 'Toros',
        pariah: 'Pariah',
        raiden: 'Raiden',
        t20: 'T20',
        avtr: 'Avtr',
        bmwe70: 'BMW E70',
        ktm125: 'Principe 125 2006',
        seasparrow2: 'Sparrow',
        sparrow: 'Sparrow',
        komoda: 'Komoda',
        massacro: 'Massacro',
        revolter: 'Revolter',
        kuruma: 'Kuruma',
        specter2: 'Specter2',
        gp1: 'GP1',
        pfister811: 'Pfister811',
        italigto: 'Italigto'
    };
    const lower = raw.toLowerCase();
    const canonical = aliases[lower] || raw;
    for (let i = 0; i < rentCars.length; i++) {
        const rentCar = rentCars[i];
        if (rentCar.name === canonical) return rentCar;
        if (String(rentCar.name).toLowerCase() === lower) return rentCar;
        if (String(rentCar.spawnCar).toLowerCase() === lower) return rentCar;
    }
    return null;
}

function offsetVehicleSpawnPos(coords, heading, metersBack) {
    const hRad = (Number(heading) * Math.PI) / 180;
    const m = Number(metersBack) || 5;
    return new mp.Vector3(
        coords.x - Math.sin(hRad) * m,
        coords.y + Math.cos(hRad) * m,
        coords.z + 0.05
    );
}

mp.events.add('s:rentCar', (player, vehmodel) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        if (!ensurePlayerRentSiteContext(player)) {
            return isNotify(player, 2, 'top-mid', 'Подойдите к NPC аренды.', 3000);
        }
        if (player.spawnCar && (Date.now() - player.spawnCar < 3000)) return;

        const rentCar = resolveRentCar(vehmodel);
        if (!rentCar) {
            return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        }

        const hubRent = isFactionlessHubRentContext(player);
        let spawnCoord = getRentSpawnCoordForPlayer(player);

        if (!spawnCoord || !spawnCoord.coords) {
            return isNotify(player, 2, 'top-mid', 'Аренда доступна у NPC на базе фракции или на спавне новичков.', 3500);
        }

        const isBike = isRentBikeModel(rentCar.spawnCar);
        const isHeli = isRentHeliModel(rentCar.spawnCar);

        if (isHeli) {
            spawnCoord = getRentHeliSpawnForPlayer(player, spawnCoord) || spawnCoord;
        }

        let vehHeading = Number(spawnCoord.heading) || 0;
        let vehSpawnPos = spawnCoord.coords;

        if (isHeli || isBike) {
            // Мото и вертолёт — без смещения назад (иначе застревают / падают).
        } else if (!hubRent) {
            vehSpawnPos = offsetVehicleSpawnPos(vehSpawnPos, vehHeading, 5);
        }

        if (Number(player.money) < rentCar.price) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для аренды.', 3000);
        }

        let newMoney = parseInt(player.money, 10) - rentCar.price;
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err) {
            if (err) return console.log(err);
        });
        player.call('updateMoney', [global.formatnum1(newMoney)]);
        player.money = newMoney;

        isNotify(player, 3, 'top-mid', `-${formatnum1(rentCar.price)}$`, 3000);

        global.deleteVeh(player.carActive);

        player.call('stopcrawling');

        const skipPlayerTeleport = isBike || isHeli;
        if (!skipPlayerTeleport) {
            try {
                player.position = vehSpawnPos;
                player.heading = vehHeading;
            } catch (_ePos) {}
        }

        const fracId = parseInt(player.getVariable('fraction'), 10) || 0;
        const colorveh =
            global.color && global.color[fracId]
                ? global.color[fracId]
                : global.color && global.color[0]
                ? global.color[0]
                : [111, 111];
        const carOptions = {
            numberPlate: global.flowVehiclePlate(),
            dimension: player.dimension,
            locked: false,
            engine: isHeli,
            alpha: 255
        };
        const car = mp.vehicles.new(mp.joaat(`${rentCar.spawnCar}`), vehSpawnPos, {
            ...carOptions,
            heading: vehHeading
        });
        if (car && mp.vehicles.exists(car)) {
            car.setColor(colorveh[0], 0);
            car.setVariable('owner', player.static);
            player.carActive = car;
            car.setVariable('rent', true);
        }

        try {
            player.call('rent:syncSpawn:c', [vehSpawnPos.x, vehSpawnPos.y, vehSpawnPos.z, vehHeading, skipPlayerTeleport ? 1 : 0]);
        } catch (_eSync) {}

        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            if (!car || !mp.vehicles.exists(car)) return;
            try {
                car.position = vehSpawnPos;
                car.heading = vehHeading;
                if (!skipPlayerTeleport) {
                    player.position = vehSpawnPos;
                    player.heading = vehHeading;
                }
                player.putIntoVehicle(car, 0);
            } catch (_eVeh) {}
        }, isHeli || isBike ? 250 : 450);

        if (!mp.players.exists(player)) return;
        player.call('rent:close');
        player.spawnCar = Date.now();
        if (typeof global.tryCompleteNewbieQuest === 'function') global.tryCompleteNewbieQuest(player, 'rent_car');
    } catch (error) {
        console.log(error);
    }
});

/** Подписи над NPC аренды — как у остальных точек на карте. */
const RENT_NPC_LABEL_LIFT = 1.15;
const RENT_NPC_LABEL_OPTS = {
    font: 4,
    drawDistance: 12,
    color: [255, 255, 255, 255],
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
};

function rentInteractionLabel(label) {
    const text = String(label || 'Аренда транспорта').trim();
    return /\(E\)$/i.test(text) ? text : `${text} (E)`;
}

RENT_SPAWN_SITES.forEach((site) => {
    if (!site.ped || site.clientPed) return;
    const p = site.ped.pos;
    const pedModel = String(site.ped.model || 'a_m_m_prolhost_01').trim();
    global.creatorPedsNew(mp.joaat(pedModel), new mp.Vector3(p[0], p[1], p[2]), {
        dynamic: true,
        invincible: true,
        frozen: true,
        heading: site.ped.heading
    });

    global.creatorLabelsNew(rentInteractionLabel(site.ped.label), new mp.Vector3(p[0], p[1], p[2] + RENT_NPC_LABEL_LIFT), RENT_NPC_LABEL_OPTS);
});

{
    const p = [_flRent.x, _flRent.y, _flRent.z];
    global.creatorPedsNew(mp.joaat('a_m_m_prolhost_01'), new mp.Vector3(p[0], p[1], p[2]), {
        dynamic: true,
        invincible: true,
        frozen: true,
        heading: _flRent.h
    });
    global.creatorLabelsNew('Аренда транспорта (E)', new mp.Vector3(p[0], p[1], p[2] + RENT_NPC_LABEL_LIFT), RENT_NPC_LABEL_OPTS);
}
