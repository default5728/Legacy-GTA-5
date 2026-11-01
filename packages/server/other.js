mp.events.add('playerJoin', (player) => {
    if (typeof global.syncPlayerMpIdVar === 'function') global.syncPlayerMpIdVar(player);
});

global.formatnum1 = function (number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

global.formatnum2 = function (number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** HP от аптечки/спанка/бонга — с разрешением AC (иначе healSpike откатывает лечение). */
function setConsumableHealth(player, value, reason) {
    if (!player || !mp.players.exists(player)) return false;
    const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (typeof global.applyAuthorizedHealth === 'function') {
        return global.applyAuthorizedHealth(player, v, reason || 'consumable');
    }
    try {
        if (global.allowedActions && typeof global.allowedActions.allowHeal === 'function') {
            global.allowedActions.allowHeal(player, { expiresInMs: 8000, reason: reason || 'consumable' });
        }
    } catch (_e) {}
    player.health = v;
    player._acAllowedHealth = v;
    return true;
}

function addConsumableHealth(player, amount, reason) {
    if (!player || !mp.players.exists(player)) return false;
    if (typeof global.applyAuthorizedHeal === 'function') {
        return global.applyAuthorizedHeal(player, amount, reason || 'consumable');
    }
    const cur = typeof player.health === 'number' ? player.health : 100;
    return setConsumableHealth(player, Math.min(100, cur + Math.max(0, Number(amount) || 0)), reason);
}

mp.events.add("setInvisible", (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player) && player.adminlvl >= 1 && Number(toogle) === 0) return;
        if (typeof global.requireAdminDuty === 'function' ? global.requireAdminDuty(player, 1) : player.adminlvl >= 1) {
            player.alpha = toogle
            player.setVariable('invisible', toogle)
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('healplayer', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (rejectIfConsumableUseCooldown(player, 'med')) return;
        if (isPostDamageMedBlockedServer(player)) {
            syncDamageConsumableLockToClient(player);
            return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        }
        if (typeof global.consumeOneConsumableStackInGrid !== 'function') return;
        if (!global.consumeOneConsumableStackInGrid(player, 'Аптечка')) {
            return isNotify(player, 2, 'top-mid', 'Нет аптечки.', 2500);
        }
        player.health = 100;
        stampConsumableUse(player, 'med');
        global.saveInventory(player);
        if (global.emitPlayerInventory) global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('showHud:SERVER', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (
            player.getVariable('gangwar') !== true &&
            player.getVariable('factionlessHub') !== true &&
            player.getVariable('afklobby') !== true &&
            player.getVariable('revolverdm') !== true &&
            player.getVariable('carabinedm') !== true &&
            player.getVariable('heavydm') !== true
        ) {
            return;
        }
        player.call('showHud:CLIENT', [player.id, player.static]);
        if (typeof global.pushHudClockToPlayer === 'function') global.pushHudClockToPlayer(player);
        const m = Number(player.money);
        if (!Number.isNaN(m)) {
            player.call('updateMoney', [global.formatnum1(m)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("add_voice_listener", (player, target) =>
{
	if(player && target && mp.players.exists(player) && mp.players.exists(target))
	{
		player.enableVoiceTo(target);
	}
});

mp.events.add("remove_voice_listener", (player, target) =>
{
	if(player && target && mp.players.exists(player) && mp.players.exists(target))
	{
		player.disableVoiceTo(target);
	}
});

mp.events.add('voice:anim', (player, status) => {
    try  {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (status) {
            mp.players.forEach(p => {
                if (!mp.players.exists(p) || !p.getVariable('auth')) return;
                p.call('voice:anim', [player, status]);
            });
        } else {
            mp.players.forEach(p => {
                if (!mp.players.exists(p) || !p.getVariable('auth')) return;
                p.call('voice:anim', [player, status]);
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('table:anim', (player, toggle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (toggle) {
            if (player.vehicle) return;
            player.playAnimation("amb@code_human_in_bus_passenger_idles@female@tablet@base", "base", 1, 49);
        } else {
            /** В ТС анимация планшета не ставится — stopAnimation ломает idle и может «выкидывать» с места */
            if (player.vehicle) return;
            player.stopAnimation();
        }
    } catch (error) {
        console.log(error);
    }
});

const maxDistance = 30;

const helicopterHashes = [
    'frogger',
    'buzzard2',
    'frogger2',
    'oppressor2',
    'havok',
    'seasparrow2',
    "elicottero"
];

function isHelicopter(hash) {
    return helicopterHashes.includes(hash);
}

const factioncars = [
    { fraction: '1', coords: new mp.Vector3(162.6346893310547, -1737.1805419921875, 29.296659469604492), heading: 143.68858337402344 },
    { fraction: '2', coords: new mp.Vector3(-8.27456283569336, -1393.0020751953125, 29.325071334838867), heading: -0.49740394949913025 },
    { fraction: '3', coords: new mp.Vector3(947.6864013671875, -1575.105712890625, 30.406959533691406), heading: -90.59761810302734 },
    { fraction: '4', coords: new mp.Vector3(882.578369140625, -2349.63818359375, 30.3311767578125), heading: 85.19712829589844 },
    { fraction: '5', coords: new mp.Vector3(1365.00537109375, -2027.314453125, 52.04342269897461), heading: 27.64814567565918 },
    { fraction: '6', coords: new mp.Vector3(399.7075500488281, -976.3340454101562, 28.864429473876953), heading: 178.8184356689453 },
    { fraction: 'EMS', coords: new mp.Vector3(315.5148620605469, -1371.0447998046875, 32.5093994140625), heading: 140.22457885742188 }
];

/** 1–5: { pos, heading }; 6: только позиция (курс как у factioncars для фракции) */
const factionheli = {
    1: { pos: new mp.Vector3(195.10916137695312, -1717.4456787109375, 32.87907409667969), heading: -152.99810791015625 },
    2: { pos: new mp.Vector3(-27.69335174560547, -1404.211669921875, 34.58267593383789), heading: -84.3482894897461 },
    3: { pos: new mp.Vector3(277.1607971191406, -1911.7969970703125, 29.318302154541016), heading: 46.84783935546875 },
    4: { pos: new mp.Vector3(-334.8177185058594, -1544.5433349609375, 36.10999298095703), heading: -88.7071762084961 },
    5: { pos: new mp.Vector3(553.998046875, -1776.806884765625, 37.10675048828125), heading: -114.60282135009766 },
    6: new mp.Vector3(449.1666259765625, -981.3761596679688, 43.6916618347168)
};

function factionHeliPosition(entry) {
    if (!entry) return null;
    return entry.pos !== undefined ? entry.pos : entry;
}

const universalSpawn = new mp.Vector3(-115.98294830322266, -604.9407958984375, 36.28074645996094);
const universalRadius = 50;

const universalCarSpawn = new mp.Vector3(-105.1443862915039, -610.6466674804688, 36.07176971435547);
const universalHeliSpawn = new mp.Vector3(-144.37887573242188, -593.4597778320312, 211.77525329589844);

const restrictedZones = [
    { position: [1107.8448486328125, 212.5265655517578, -49.44013977050781], radius: 100 },
    { position: [138.3193817138672, -1707.297607421875, 29.2916316986084], radius: 15 },
    { position: [296.13739013671875, -1714.0819091796875, 29.575132751464844], radius: 15 },
    { position: [77.2723617553711, -1389.311767578125, 29.37615203857422], radius: 15 },
    { position: [21.490087509155273, -1106.705810546875, 28.82], radius: 15 },
    { position: [810.494873046875, -2157.57763671875, 28.69], radius: 15 },
    { position: [371.7030944824219, -1421.536865234375, 33.63254165649414], radius: 78 }
];

function isInNewbieHubGreenZone(pos) {
    const z = global.NEWBIE_HUB_GREEN_ZONE;
    if (!z || !pos) return false;
    const dx = pos.x - z.x;
    const dy = pos.y - z.y;
    const dz = (pos.z || 0) - z.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= (z.r || 35);
}

function isInRestrictedZone(playerPosition) {
    for (const zone of restrictedZones) {
        const [x, y, z] = zone.position;
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - x, 2) +
            Math.pow(playerPosition.y - y, 2) +
            Math.pow(playerPosition.z - z, 2)
        );
        if (distance <= zone.radius) {
            return true;
        }
    }
    return false;
}

const personalFleet = require('./legacy/personal-fleet');
mp.events.add('carCall:SERVER', (player, hash) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (player && mp.players.exists(player)) {

            if (player.vehicle) return isNotify(player, 2, "top-mid", `Для вызова транспорта вы не должны находиться в транспорте.`, 3000);
            if (player.dimension !== 0) return isNotify(player, 2, "top-mid", `Спавнить транспорт можно только в GHETTO GANGWAR.`, 3000);

            const playerPosition = player.position;

            if (isInNewbieHubGreenZone(playerPosition)) {
                isNotify(player, 2, 'top-mid', 'Нельзя вызывать личный транспорт в зелёной зоне начального спавна.', 4000);
                return;
            }

            if (isInRestrictedZone(playerPosition)) {
                isNotify(player, 2, "top-mid", `Спавнить транспорт тут запрещено.`, 3000);
                return;
            }

            const fleetOwner=player.static,fleetCharacter=player._legacyCharacterId;
            global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], function (err, results) {
                if(!mp.players.exists(player)||!player.getVariable('auth')||player.static!==fleetOwner||player._legacyCharacterId!==fleetCharacter)return;
                if (err) return console.log(err);
        
                if (results.length == 0) return;
        
                let carsNorm = [];
                try {
                    const carsFromDB = results[0].cars;
                    carsNorm = global.normalizeCarsArray(JSON.parse(carsFromDB));
                } catch (error) {
                    console.log(error);
                }
        
                if (!global.carsListHasModel(carsNorm, hash)) {
                    return isNotify(player, 2, 'top-mid', 'Этот транспорт недоступен в вашем гараже.', 3000);
                }

                const viplvl = player.viplvl;
                const fraction = parseInt(player.getVariable('fraction'), 10) || 0;

                const spawns = global.spawnslist[fraction];
                const hub = global.FACTIONLESS_HUB_SPAWN || { x: -169.429931640625, y: -813.7645874023438, z: 31.305158615112305 };
                const hubSpawn = new mp.Vector3(hub.x, hub.y, hub.z);

                let teleportPositionCar = factioncars.find(car => car.fraction === String(fraction));
                const heliEntry = factionheli[fraction];
                const teleportHeliPos = factionHeliPosition(heliEntry);

                let spawnPosition;
                let spawnHeading = player.heading || 0;

                if (fraction >= 1 && fraction <= 6 && spawns && teleportPositionCar) {
                    const distanceToFactionSpawn = playerPosition.subtract(spawns.pos).length();
                    const distanceToUniversalSpawn = playerPosition.subtract(universalSpawn).length();

                    if (distanceToFactionSpawn <= maxDistance) {
                        spawnPosition = isHelicopter(hash) ? teleportHeliPos : teleportPositionCar.coords;
                        spawnHeading = teleportPositionCar.heading;
                        if (isHelicopter(hash) && distanceToFactionSpawn <= maxDistance && heliEntry && heliEntry.pos !== undefined && typeof heliEntry.heading === 'number') {
                            spawnHeading = heliEntry.heading;
                        }
                    } else if (distanceToUniversalSpawn <= universalRadius) {
                        spawnPosition = isHelicopter(hash) ? universalHeliSpawn : universalCarSpawn;
                    } else if (viplvl >= 2) {
                        const isNearOtherSpawn = Object.values(global.spawnslist).some(spawn => playerPosition.subtract(spawn.pos).length() <= maxDistance) || playerPosition.subtract(universalSpawn).length() <= universalRadius;

                        if (isNearOtherSpawn) {
                            isNotify(player, 2, 'top-mid', 'Вы не можете вызывать транспорт на чужих спавнах.', 3000);
                            return;
                        }

                        spawnPosition = playerPosition;
                    } else {
                        isNotify(player, 2, 'top-mid', 'Спавнить транспорт вне территории фракции можно только со 2 уровня VIP.', 3000);
                        return;
                    }
                } else if (fraction === 0 || player.getVariable('factionlessHub') === true) {
                    if (isInNewbieHubGreenZone(playerPosition)) {
                        isNotify(player, 2, 'top-mid', 'Нельзя вызывать личный транспорт в зелёной зоне начального спавна.', 4000);
                        return;
                    }
                    spawnPosition = playerPosition;
                } else {
                    return isNotify(player, 2, 'top-mid', 'Спавн транспорта недоступен.', 3000);
                }

                if(personalFleet.find(player.static,hash))return isNotify(player,2,'top-mid','Эта машина уже вызвана. Другие машины из имущества можно вызвать отдельно.',4000);

                player.call('stopcrawling');

                const colorveh = global.color[fraction] || global.color[1] || [111, 111];

                let spawnHeadingFinal = spawnHeading;
                if (teleportPositionCar && typeof teleportPositionCar.heading === 'number' && fraction >= 1) {
                    spawnHeadingFinal = teleportPositionCar.heading;
                }

                if (isInNewbieHubGreenZone(spawnPosition)) {
                    isNotify(player, 2, 'top-mid', 'Нельзя вызывать личный транспорт в зелёной зоне начального спавна.', 4000);
                    return;
                }

                const veh = mp.vehicles.new(mp.joaat(hash), personalFleet.spawnPosition(spawnPosition,spawnHeadingFinal,player.dimension), {
                    heading: spawnHeadingFinal,
                    numberPlate: global.flowVehiclePlate(),
                    alpha: 255,
                    locked: false,
                    engine: false,
                    dimension: player.dimension
                });

                if (veh && mp.vehicles.exists(veh)) {
                    veh.setColor(colorveh[0], 0);
                    veh.setVariable('owner', player.static);
                    veh.setVariable('carModel', String(hash));
                    veh.setVariable('engineState', false);
                    player.carActive = veh;
                    personalFleet.register(veh,player.static,hash);

                    try {
                        const needle = String(hash).trim().toLowerCase();
                        const entry = carsNorm.find((e) => String(e.m).trim().toLowerCase() === needle);
                        if (entry && entry.t && typeof global.applyVehicleTuning === 'function') {
                            global.applyVehicleTuning(veh, entry.t);
                        }
                    } catch (_eTune) {}
                }

                setTimeout(() => {
                    if (!mp.players.exists(player)) return;
                    if (!veh || !mp.vehicles.exists(veh)) return;

                    player.putIntoVehicle(veh, 0);
                }, 200);

                player.call('phoneHide:CLIENT');
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('carUncall:SERVER', (player, hash) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (player && mp.players.exists(player)) {

            if (player.vehicle) return isNotify(player, 2, "top-mid", `Для эвакуации транспорта вы не должны находиться в транспорте.`, 3000);
            if (player.dimension !== 0) return isNotify(player, 2, "top-mid", `Вы можете эвакуировать транспорт только в 0 измерении.`, 3000);

            global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], function (err, results) {
                if (err) return console.log(err);
        
                if (results.length === 0) {
                    return;
                }
        
                let carsNorm = [];
                try {
                    carsNorm = global.normalizeCarsArray(JSON.parse(results[0].cars));
                } catch (_e) {
                    carsNorm = [];
                }
    
                if (!global.carsListHasModel(carsNorm, hash)) {
                    return;
                }
                
                const activeCar = personalFleet.find(player.static,hash);
                if (!activeCar || !mp.vehicles.exists(activeCar)) {
                    return isNotify(player, 2, "top-mid", `У вас нету вызванного транспорта.`, 3000); 
                }
                if (activeCar.model == mp.joaat(hash) && mp.vehicles.exists(activeCar)) {
                    global.deleteVeh(activeCar);
                } else {
                    return isNotify(player, 2, "top-mid", `Эта машина не вызвана.`, 3000); 
                }
                player.call('stopcrawling');
                isNotify(player, 3, "top-mid", `Вы эвакуировали машину.`, 3000); 
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if(player.carActive&&!player.carActive.getVariable('legacyPersonalVehicle'))global.deleteVeh(player.carActive);
    } catch (error) {
        console.log(error);
    }
});

function getNearestVehicle(player, radius) {
    let nearestVehicle = null;
    let minDistance = radius;

    mp.vehicles.forEachInRange(player.position, radius, (veh) => {
        const distance = player.dist(veh.position);
        if (distance < minDistance) {
            nearestVehicle = veh;
            minDistance = distance;
        }
    });

    return nearestVehicle;
}

function isSkateVehicleEntity(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    try {
        if (veh.getVariable('skateRide') === true) return true;
        if (veh.getVariable('skateOwner') != null) return true;
        if (veh.model === mp.joaat('5rp_skate')) return true;
    } catch (_e) { return false; }
    return false;
}

mp.events.add('playerPressKey:L', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000) return;
        player.clicked = new Date().getTime();
        if (player.getVariable('dead') === true) return;
        if (player.getVariable('casmenu') === true) return;
        if (player.getVariable('blackmenu') === true) return;
        if (player.getVariable('animsmenu') === true) return;
        if (player.getVariable('shopc') === true) return;

        const veh = getNearestVehicle(player, 3);
        if (veh && mp.vehicles.exists(veh)) {
            if (isSkateVehicleEntity(veh)) return;
            if (veh.getVariable('fibMatsTruck') === true) {
                return isNotify(player, 2, 'top-mid', 'Этот транспорт нельзя закрыть.', 3000);
            }
            if (veh.getVariable('fractioncar') === true) {
                if (Number(veh.getVariable('fraction')) !== Number(player.getVariable('fraction'))) return isNotify(player, 2, "top-mid", `Это фракционное авто не вашей фракции.`, 3000);
            }
            if (veh.getVariable('familyGarage') === true) {
                if (Number(veh.getVariable('familyId')) !== Number(player.familyID)) {
                    return isNotify(player, 2, 'top-mid', 'Это не ваш семейный транспорт.', 3000);
                }
                const dr = veh.getVariable('familyDriveRanks');
                if (typeof global.playerCanDriveFamilyVehicle === 'function' && !global.playerCanDriveFamilyVehicle(player, dr)) {
                    return isNotify(player, 2, 'top-mid', 'Ваш ранг не позволяет открывать эту машину.', 4000);
                }
                veh.locked = !veh.locked;
                const toggle = veh.locked;
                const status = veh.locked ? 'Вы закрыли машину.' : 'Вы открыли машину.';
                isNotify(player, 3, 'bottom-mid', `${status}`, 3000);
                veh.setVariable('doorState', toggle);
                player.call('setdoor', [toggle]);
                return;
            }
            if (veh.getVariable('testdrivetwo') === true) {
                const nextEngineState = veh.getVariable('engineState') !== true;
                veh.engine = nextEngineState;
                veh.setVariable('engineState', nextEngineState);
                isNotify(player, 3, 'bottom-mid', nextEngineState ? 'Вы завели двигатель.' : 'Вы заглушили двигатель.', 3000);
                return;
            }
            if (veh.getVariable('owner') === player.static || (veh.getVariable('fractioncar') === true && player.getVariable('fraction') == veh.getVariable('fraction'))) {
                veh.locked = !veh.locked;
                const toggle = veh.locked;
                let status = veh.locked ? "Вы закрыли машину." : "Вы открыли машину.";
                isNotify(player, 3, "bottom-mid", `${status}`, 3000);
                veh.setVariable('doorState', toggle);
                player.call('setdoor', [toggle]);
                return;
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerPressKey:B', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000) return;
        player.clicked = new Date().getTime();
        if (player.getVariable('dead') === true) return;
        if (player.getVariable('casmenu') === true) return;
        if (player.getVariable('blackmenu') === true) return;
        if (player.getVariable('animsmenu') === true) return;
        if (player.getVariable('shopc') === true) return;

        const veh = player.vehicle;
        if (veh && mp.vehicles.exists(veh)) {
            if (isSkateVehicleEntity(veh)) return;

            // Barracks поставки FIB: после погрузки крайм (1–5) тоже может заводить/глушить двигатель.
            if (veh.getVariable('fibMatsTruck') === true) {
                const canControl =
                    typeof global.canControlFibMatsTruck === 'function'
                        ? global.canControlFibMatsTruck(player, veh)
                        : false;
                if (!canControl) {
                    if (veh.getVariable('fibMatsLoaded') === true) {
                        return isNotify(player, 2, 'top-mid', 'Перехват доступен только фракциям Ballas, Families, Bloods, Vagos и Marabunta.', 4000);
                    }
                    return isNotify(player, 2, 'top-mid', 'Этот транспорт доступен только сотрудникам FIB.', 3000);
                }
                veh.engine = !veh.engine;
                veh.setVariable('engineState', veh.engine);
                const status = veh.engine ? 'Вы завели двигатель.' : 'Вы заглушили двигатель.';
                isNotify(player, 3, 'bottom-mid', `${status}`, 3000);
                return;
            }

            if (veh.getVariable('fractioncar') === true) {
                if (Number(veh.getVariable('fraction')) !== Number(player.getVariable('fraction'))) return isNotify(player, 2, "top-mid", `Это фракционное авто не вашей фракции.`, 3000);
            }
            if (veh.getVariable('familyGarage') === true) {
                if (Number(veh.getVariable('familyId')) !== Number(player.familyID)) {
                    return isNotify(player, 2, 'top-mid', 'Это не ваш семейный транспорт.', 3000);
                }
                const dr = veh.getVariable('familyDriveRanks');
                if (typeof global.playerCanDriveFamilyVehicle === 'function' && !global.playerCanDriveFamilyVehicle(player, dr)) {
                    return isNotify(player, 2, 'top-mid', 'Ваш ранг не позволяет заводить эту машину.', 4000);
                }
                veh.engine = !veh.engine;
                veh.setVariable('engineState', veh.engine);
                const status = veh.engine ? 'Вы завели двигатель.' : 'Вы заглушили двигатель.';
                isNotify(player, 3, 'bottom-mid', `${status}`, 3000);
                return;
            }
            if (veh.getVariable('owner') === player.static || (veh.getVariable('fractioncar') === true && player.getVariable('fraction') == veh.getVariable('fraction'))) {
                veh.engine = !veh.engine;
                veh.setVariable('engineState', veh.engine);
                let status = veh.engine ? "Вы завели двигатель." : "Вы заглушили двигатель.";
                isNotify(player, 3, "bottom-mid", `${status}`, 3000);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

const POST_DAMAGE_ARMOR_MS = 5000;
const POST_DAMAGE_MED_MS = 5000;
const POST_DAMAGE_SPANK_MS = 5000;
const USE_COOLDOWN_MS = 2000;
const CAPT_MAX_ARMOR_USES = 5;

function rejectIfConsumableUseCooldown(player, kind) {
    if (!player || !mp.players.exists(player)) return false;
    const map = player._lastConsumableUseMs;
    const t = map && map[kind];
    if (typeof t !== 'number' || !Number.isFinite(t)) return false;
    const left = USE_COOLDOWN_MS - (Date.now() - t);
    if (left <= 0) return false;
    const sec = Math.max(1, Math.ceil(left / 1000));
    isNotify(player, 2, 'top-mid', `Подождите ${sec} сек.`, 2000);
    return true;
}

function stampConsumableUse(player, kind) {
    if (!player || !mp.players.exists(player)) return;
    if (!player._lastConsumableUseMs || typeof player._lastConsumableUseMs !== 'object') {
        player._lastConsumableUseMs = {};
    }
    player._lastConsumableUseMs[kind] = Date.now();
    try {
        player.call('consumableUseCooldown:c', [kind]);
    } catch (_e) {}
}

function syncDamageConsumableLockToClient(player) {
    if (!player || !mp.players.exists(player)) return;
    const t = player._lastCombatDamageAtMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) {
        try {
            player.call('damageConsumableLockSync', [0, 0, 0]);
        } catch (_e) {}
        return;
    }
    const elapsed = Date.now() - t;
    const remA = Math.max(0, POST_DAMAGE_ARMOR_MS - elapsed);
    const remM = Math.max(0, POST_DAMAGE_MED_MS - elapsed);
    const remS = Math.max(0, POST_DAMAGE_SPANK_MS - elapsed);
    try {
        player.call('damageConsumableLockSync', [remA, remM, remS]);
    } catch (_e) {}
}

function markPlayerRecentCombatDamage(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    player._lastCombatDamageAtMs = Date.now();
    try {
        player.call('damageConsumableLockSync', [POST_DAMAGE_ARMOR_MS, POST_DAMAGE_MED_MS, POST_DAMAGE_SPANK_MS]);
    } catch (_e) {}
}
global.markPlayerRecentCombatDamage = markPlayerRecentCombatDamage;

function isPostDamageArmorBlockedServer(player) {
    if (!player || !mp.players.exists(player)) return false;
    const t = player._lastCombatDamageAtMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return false;
    return Date.now() - t < POST_DAMAGE_ARMOR_MS;
}

function isPostDamageMedBlockedServer(player) {
    if (!player || !mp.players.exists(player)) return false;
    const t = player._lastCombatDamageAtMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return false;
    return Date.now() - t < POST_DAMAGE_MED_MS;
}

function isPostDamageSpankBlockedServer(player) {
    if (!player || !mp.players.exists(player)) return false;
    const t = player._lastCombatDamageAtMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return false;
    return Date.now() - t < POST_DAMAGE_SPANK_MS;
}

function rejectIfSpankBuffActive(player) {
    if (typeof global.hasSpankBuffActive !== 'function' || !global.hasSpankBuffActive(player)) {
        return false;
    }
    const sec = typeof global.getSpankBuffRemainingSec === 'function'
        ? global.getSpankBuffRemainingSec(player)
        : 1;
    try { player.call('spankAlco:reject'); } catch (_e) {}
    try { player.call('spankConsumableCdSync', [sec]); } catch (_e2) {}
    isNotify(player, 2, 'top-mid', `Спанк ещё активен. Осталось ${sec} сек.`, 2500);
    return true;
}

function notifyPostDamageArmorBlocked(player) {
    syncDamageConsumableLockToClient(player);
    return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
}

global.isPostDamageSpankBlockedServer = isPostDamageSpankBlockedServer;
global.syncDamageConsumableLockToClient = syncDamageConsumableLockToClient;

const playerConsumableUseLockUntil = new Map();
const SPANK_ALCO_ANIM_LOCK_VARS = ['ANIM_THERMOS', 'ANIM_ALCOHOL', 'ANIM_SPANK', 'ANIM_BONG'];
const ALCO_USE_ANIM_MS = 5250;

function releasePlayerConsumableUse(player) {
    if (!player || !mp.players.exists(player)) return;
    playerConsumableUseLockUntil.delete(player.id);
}

function isPlayerSpankAlcoConsumableBusy(player) {
    if (!player || !mp.players.exists(player)) return true;
    const until = playerConsumableUseLockUntil.get(player.id);
    if (typeof until === 'number' && until > Date.now()) return true;
    for (let i = 0; i < SPANK_ALCO_ANIM_LOCK_VARS.length; i++) {
        if (player.getVariable(SPANK_ALCO_ANIM_LOCK_VARS[i]) === true) return true;
    }
    return false;
}

function lockPlayerConsumableUse(player, ms) {
    if (!player || !mp.players.exists(player)) return;
    const dur = Math.max(0, Number(ms) || 0);
    if (dur <= 0) return;
    const newUntil = Date.now() + dur;
    const existing = playerConsumableUseLockUntil.get(player.id);
    if (typeof existing === 'number' && existing > Date.now()) {
        playerConsumableUseLockUntil.set(player.id, Math.max(existing, newUntil));
    } else {
        playerConsumableUseLockUntil.set(player.id, newUntil);
    }
}

function tryAcquirePlayerConsumableUse(player, ms) {
    if (!player || !mp.players.exists(player)) return false;
    if (isPlayerSpankAlcoConsumableBusy(player)) return false;
    lockPlayerConsumableUse(player, ms);
    return true;
}

global.releasePlayerConsumableUse = releasePlayerConsumableUse;
global.isPlayerSpankAlcoConsumableBusy = isPlayerSpankAlcoConsumableBusy;
global.lockPlayerConsumableUse = lockPlayerConsumableUse;
global.tryAcquirePlayerConsumableUse = tryAcquirePlayerConsumableUse;

const SPANK_USE_ANIM_MS = 2450;
const BONG_USE_ANIM_MS = 2100;
/** mp_suicide / pill_fp @ speed 8 — таблетка ко рту ~1.75 с от старта анимации */
const SPANK_EFFECT_DELAY_MS = 1750;

function clearSpankConsumablePending(player) {
    if (!player || !mp.players.exists(player)) return;
    if (player._spankEffectTimer) {
        clearTimeout(player._spankEffectTimer);
        player._spankEffectTimer = null;
    }
    player._spankUsePending = false;
}

function cancelSpankConsumableUse(player, notify) {
    if (!player || !mp.players.exists(player)) return false;
    if (!player._spankUsePending && !player._spankEffectTimer) return false;
    clearSpankConsumablePending(player);
    try { player.setVariable('ANIM_SPANK', false); } catch (_e) {}
    if (typeof global.releasePlayerConsumableUse === 'function') {
        global.releasePlayerConsumableUse(player);
    }
    try { player.call('cancelSpankConsumableAnim'); } catch (_e2) {}
    if (notify !== false) {
        isNotify(player, 2, 'top-mid', 'Использование спанка прервано.', 2500);
    }
    return true;
}

function scheduleSpankConsumableEffect(player) {
    if (!player || !mp.players.exists(player)) return;
    clearSpankConsumablePending(player);
    player._spankUsePending = true;
    player._spankEffectTimer = setTimeout(() => {
        player._spankEffectTimer = null;
        player._spankUsePending = false;
        try {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;
            if (player.getVariable('dead') === true) return;
            if (typeof global.applySpankBuff === 'function') {
                global.applySpankBuff(player, 60);
            } else {
                player.call('activateSpankBuff', [60]);
            }
            let newHp = player.health + 75;
            if (newHp > 100) newHp = 100;
            player.health = newHp;
        } catch (_e) {}
    }, SPANK_EFFECT_DELAY_MS);
}

global.cancelSpankConsumableUse = cancelSpankConsumableUse;
global.scheduleSpankConsumableEffect = scheduleSpankConsumableEffect;
global.isSpankConsumableUsePending = function isSpankConsumableUsePending(player) {
    return !!(player && player._spankUsePending);
};

mp.events.add('playerQuit', (player) => {
    if (player && player.id != null) {
        playerConsumableUseLockUntil.delete(player.id);
        clearSpankConsumablePending(player);
    }
});

const ARMOR_COSMETIC_CFG = require('./config/armor_cosmetic');

const FIB_ARMOR_DRAWABLES = new Set([65, 67, 68, 69]);

function resolveCosmeticArmorPersist(player) {
    if (!mp.players.exists(player)) return null;
    let raw =
        player._cosmeticArmorPersist != null ? String(player._cosmeticArmorPersist).trim() : '';
    if (raw && raw !== '0:0') return raw;
    if (player._clothesRowCache && player._clothesRowCache.armor != null) {
        raw = String(player._clothesRowCache.armor).trim();
        if (raw && raw !== '0:0') {
            player._cosmeticArmorPersist = raw;
            return raw;
        }
    }
    return null;
}

global.ensureCosmeticArmorPersistFromDb = function (player, cb) {
    const existing = resolveCosmeticArmorPersist(player);
    if (existing) {
        if (typeof cb === 'function') cb(existing);
        return;
    }
    if (!mp.players.exists(player) || !global.DB) {
        if (typeof cb === 'function') cb(null);
        return;
    }
    const staticId = player.static;
    if (staticId == null) {
        if (typeof cb === 'function') cb(null);
        return;
    }
    const clothesFr =
        typeof global.getClothesFractionForPlayer === 'function'
            ? global.getClothesFractionForPlayer(player)
            : 0;
    global.DB.query(
        'SELECT armor FROM clothes WHERE static = ? AND fraction = ? LIMIT 1',
        [staticId, clothesFr],
        (err, rows) => {
            if (!mp.players.exists(player)) {
                if (typeof cb === 'function') cb(null);
                return;
            }
            if (err || !rows || !rows[0] || rows[0].armor == null) {
                if (typeof cb === 'function') cb(null);
                return;
            }
            const raw = String(rows[0].armor).trim();
            if (!raw || raw === '0:0') {
                if (typeof cb === 'function') cb(null);
                return;
            }
            player._cosmeticArmorPersist = raw;
            if (!player._clothesRowCache) player._clothesRowCache = {};
            player._clothesRowCache.armor = raw;
            if (typeof cb === 'function') cb(raw);
        }
    );
};

/** Один setClothes; после него Rage часто обнуляет armour — сразу возвращаем %. */
function setArmorVestClothes(player, drawable, texture) {
    if (!mp.players.exists(player)) return;
    try {
        const d = Number(drawable);
        const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
        if (!Number.isFinite(d)) return;
        player.setClothes(9, d, t, 0);
        try {
            player.call('sc:syncClothesLocal', [9, d, t]);
        } catch (_sync) {}
        if (player.getVariable('armor') === true) {
            const stored = Math.max(0, Math.min(100, Math.round(Number(player._gameplayArmorStoredPct) || 0)));
            if (stored > 0) {
                try {
                    player.armour = stored;
                } catch (_a) {}
            }
        }
    } catch (_e) {}
}

global.scheduleGameplayArmorVestVisual = function (player, delaysMs) {
    if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
    const list = Array.isArray(delaysMs) && delaysMs.length ? delaysMs : [160];
    let ms = parseInt(list[0], 10);
    if (!Number.isFinite(ms) || ms < 0) ms = 160;
    if (ms > 400) ms = 160;
    setTimeout(() => {
        try {
            if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
            if (typeof global.applyGameplayArmorVestVisual === 'function') {
                global.applyGameplayArmorVestVisual(player);
            }
        } catch (_e) {}
    }, ms);
};

/** Визуал слота 9: донат-скины / FIB / фракции 1–5. */
global.applyGameplayArmorVestVisual = function (player) {
    try {
        if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
        const fr = parseInt(player.getVariable('fraction'), 10);
        const raw =
            player._cosmeticArmorPersist ||
            (player._clothesRowCache && player._clothesRowCache.armor) ||
            resolveCosmeticArmorPersist(player);
        let cd = NaN;
        let ct = 0;
        if (raw != null && String(raw).trim() !== '') {
            const parts = String(raw).trim().split(':');
            cd = Number(parts[0]);
            ct = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : 0;
        }
        if (fr === 6) {
            let d = 64;
            let t = 0;
            if (Number.isFinite(cd) && !(cd === 0 && ct === 0)) {
                if (FIB_ARMOR_DRAWABLES.has(cd) && ct === 0) {
                    d = cd;
                    t = 0;
                } else if (ARMOR_COSMETIC_CFG.isAllowedDonationArmorPair(cd, ct)) {
                    const migrated = ARMOR_COSMETIC_CFG.migrateDonationArmorPair(cd, ct);
                    const key = ARMOR_COSMETIC_CFG.unlockKey(migrated.d, migrated.t);
                    if (ARMOR_COSMETIC_CFG.normalizeUnlockArray(player.armorCosmeticUnlocks).includes(key)) {
                        d = migrated.d;
                        t = migrated.t;
                    } else if (typeof global.migrateFibArmorPair === 'function') {
                        const fibMigrated = global.migrateFibArmorPair(cd, ct);
                        d = fibMigrated.d;
                        t = fibMigrated.t;
                    } else {
                        d = cd;
                        t = ct;
                    }
                } else if (typeof global.migrateFibArmorPair === 'function') {
                    const migrated = global.migrateFibArmorPair(cd, ct);
                    d = migrated.d;
                    t = migrated.t;
                } else {
                    d = cd;
                    t = ct;
                }
            }
            if (
                d === 69 &&
                t === 0 &&
                typeof global.hasFibArmorV4Unlocked === 'function' &&
                !global.hasFibArmorV4Unlocked(player)
            ) {
                d = 64;
                t = 0;
            }
            setArmorVestClothes(player, d, t);
            return;
        }
        if (
            Number.isFinite(cd) &&
            !(cd === 0 && ct === 0) &&
            ARMOR_COSMETIC_CFG.isAllowedDonationArmorPair(cd, ct)
        ) {
            const migrated = ARMOR_COSMETIC_CFG.migrateDonationArmorPair(cd, ct);
            const key = ARMOR_COSMETIC_CFG.unlockKey(migrated.d, migrated.t);
            if (ARMOR_COSMETIC_CFG.normalizeUnlockArray(player.armorCosmeticUnlocks).includes(key)) {
                setArmorVestClothes(player, migrated.d, migrated.t);
                return;
            }
        }
        setArmorVestClothes(player, 1, 0);
    } catch (_e) {}
};

mp.events.add("setarmor", (player) => {
    try {
        if (player && mp.players.exists(player)) {
            if (!player.getVariable('auth')) return;
            if (rejectIfConsumableUseCooldown(player, 'armor')) return;
            if (player.getVariable('inCapt') === true && player.getVariable('captAllowArmor') !== true) {
                player.armour = 0;
                clearGameplayArmorEquippedState(player);
                return isNotify(player, 2, "top-mid", "В этой войне семей бронежилет запрещён.", 3000);
            }
            if (player.getVariable('adminDutyGround') === true) {
                return isNotify(player, 2, 'top-mid', 'После /offnc бронежилет недоступен.', 4000);
            }
            if (player.getVariable('inCapt') === true && player.getVariable('captAllowArmor') === true) {
                const usedArmor = parseInt(player.getVariable('captArmorUses'), 10) || 0;
                if (usedArmor >= CAPT_MAX_ARMOR_USES) {
                    return isNotify(player, 2, "top-mid", `В войне семей можно надеть не более ${CAPT_MAX_ARMOR_USES} бронежилетов.`, 3500);
                }
            }
            if (isPostDamageArmorBlockedServer(player)) {
                return notifyPostDamageArmorBlocked(player);
            }
            if (!ensureGameplayArmorUnequippedBeforeEquip(player)) return;
            const armorTaken =
                typeof global.consumeOneArmorItemForPlayer === 'function'
                    ? global.consumeOneArmorItemForPlayer(player)
                    : null;
            if (!armorTaken) {
                return isNotify(player, 2, 'top-mid', 'Нет бронежилета.', 2500);
            }
            applyGameplayArmorEquipped(player, armorTaken);
            global.saveInventory(player);
            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            stampConsumableUse(player, 'armor');
        }
    } catch (error) {
        console.log(error);
    }
});

function clearGameplayArmorEquippedState(player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    player.setVariable('armor', null);
    try {
        player._gameplayArmorEquipAt = 0;
        player._gameplayArmorToken = null;
        player._gameplayArmorStoredPct = null;
        player._gameplayArmorZeroSince = 0;
        player._armorVehicleTransitionUntil = 0;
    } catch (_g) {}
    try {
        player.setClothes(9, 0, 0, 0);
        player.call('sc:syncClothesLocal', [9, 0, 0]);
    } catch (_c) {}
    try {
        player.armour = 0;
    } catch (_a) {}
}

global.clearGameplayArmorEquippedState = clearGameplayArmorEquippedState;

global.getGameplayArmorPct = function getGameplayArmorPct(player) {
    if (!player || !mp.players.exists(player) || player.getVariable('armor') !== true) return 0;
    const live = Math.max(0, Math.min(100, Math.round(Number(player.armour) || 0)));
    if (live > 0) return live;
    const stored = Math.max(0, Math.min(100, Math.round(Number(player._gameplayArmorStoredPct) || 0)));
    return stored;
};

function restoreGameplayArmorPctIfNeeded(player) {
    if (!mp.players.exists(player) || player.getVariable('armor') !== true) return false;
    const stored = Math.max(0, Math.min(100, Math.round(Number(player._gameplayArmorStoredPct) || 0)));
    if (stored <= 0) return false;
    const live = Math.max(0, Math.min(100, Math.round(Number(player.armour) || 0)));
    if (live >= stored) return false;
    try {
        player.armour = stored;
    } catch (_e) {
        return false;
    }
    return true;
}

function markArmorVehicleTransition(player, ms) {
    if (!mp.players.exists(player)) return;
    const dur = Number.isFinite(Number(ms)) ? Math.max(500, Number(ms)) : 3500;
    try {
        player._armorVehicleTransitionUntil = Date.now() + dur;
    } catch (_e) {}
}

global.restoreGameplayArmorPctIfNeeded = restoreGameplayArmorPctIfNeeded;
global.markArmorVehicleTransition = markArmorVehicleTransition;

global.unequipGameplayArmorToInventory = function (player, gridSlotOpt) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (player.getVariable('armor') !== true) return false;

    const pct =
        typeof global.getGameplayArmorPct === 'function'
            ? global.getGameplayArmorPct(player)
            : Math.max(0, Math.min(100, Math.round(Number(player.armour) || 0)));
    if (pct <= 0) {
        clearGameplayArmorEquippedState(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        return true;
    }

    const token =
        typeof global.formatArmorInventoryToken === 'function'
            ? global.formatArmorInventoryToken(pct)
            : pct >= 100
              ? 'Бронежилет'
              : `Бронежилет#${pct}`;

    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);

    if (pct >= 100) {
        if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
            if (!global.mergeConsumableQtyIntoGrid(player, 'Бронежилет', 1)) {
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять бронежилет.', 3500);
                return false;
            }
        } else {
            return false;
        }
    } else {
        const maxSlots =
            typeof global.getInventoryMaxSlots === 'function' ? global.getInventoryMaxSlots(player) : 20;
        let targetIdx = -1;
        const gs = parseInt(gridSlotOpt, 10);
        if (Number.isInteger(gs) && gs >= 0 && gs < maxSlots) {
            const cell = player.inventory[gs];
            if (cell == null || cell === '') targetIdx = gs;
        }
        if (targetIdx < 0 && typeof global.invGridFirstEmpty === 'function') {
            targetIdx = global.invGridFirstEmpty(player);
        }
        if (targetIdx < 0) {
            isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять бронежилет.', 3500);
            return false;
        }
        player.inventory[targetIdx] = token;
    }

    clearGameplayArmorEquippedState(player);
    if (typeof global.saveInventory === 'function') global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    return true;
};

function ensureGameplayArmorUnequippedBeforeEquip(player) {
    if (!mp.players.exists(player) || player.getVariable('armor') !== true) return true;
    if (typeof global.unequipGameplayArmorToInventory !== 'function') return true;
    if (global.unequipGameplayArmorToInventory(player)) return true;
    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре для текущего бронежилета.', 3500);
    return false;
}

function applyGameplayArmorEquipped(player, armorGot) {
    if (!mp.players.exists(player) || !armorGot) return;
    const pct = Math.max(1, Math.min(100, Math.round(Number(armorGot.pct) || 0)));
    player.armour = pct;
    player.setVariable('armor', true);
    try {
        player._gameplayArmorToken =
            armorGot.token ||
            (typeof global.formatArmorInventoryToken === 'function'
                ? global.formatArmorInventoryToken(pct)
                : pct >= 100
                  ? 'Бронежилет'
                  : `Бронежилет#${pct}`);
        player._gameplayArmorEquipAt = Date.now();
        player._gameplayArmorStoredPct = pct;
        player._gameplayArmorZeroSince = 0;
        if (player.vehicle) {
            markArmorVehicleTransition(player, 5000);
        } else {
            player._armorVehicleTransitionUntil = 0;
        }
    } catch (_g) {}
    if (player.getVariable('inCapt') === true && player.getVariable('captAllowArmor') === true) {
        const u = parseInt(player.getVariable('captArmorUses'), 10) || 0;
        player.setVariable('captArmorUses', u + 1);
    }

    const reassertArmour = () => {
        try {
            if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
            const stored = Math.max(0, Math.min(100, Math.round(Number(player._gameplayArmorStoredPct) || pct)));
            if (stored > 0) player.armour = stored;
        } catch (_e) {}
    };

    const applyVest = () => {
        if (typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        }
        reassertArmour();
    };

    applyVest();
    setTimeout(() => {
        try {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;
            if (player.getVariable('armor') !== true) return;
            applyVest();
        } catch (_r) {}
    }, 160);

    if (typeof global.ensureCosmeticArmorPersistFromDb === 'function') {
        global.ensureCosmeticArmorPersistFromDb(player, () => {
            try {
                if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
                applyVest();
                setTimeout(reassertArmour, 100);
            } catch (_eDb) {}
        });
    }

    if (player.vehicle) {
        setTimeout(reassertArmour, 400);
        setTimeout(reassertArmour, 1000);
        setTimeout(reassertArmour, 2200);
    }
}

mp.events.add("removearmor", (player, colorarmor) => {
    try {
        if (player && mp.players.exists(player)) {
            if (!player.getVariable('auth')) return;
            clearGameplayArmorEquippedState(player);
        }
    } catch (error) {
        console.log(error);
    }
});

setInterval(() => {
    try {
        mp.players.forEach((player) => {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;
            if (player.getVariable('armor') !== true) return;

            const stored = Math.max(0, Math.min(100, Math.round(Number(player._gameplayArmorStoredPct) || 0)));
            let live = 0;
            try { live = Math.max(0, Math.min(100, Math.round(Number(player.armour) || 0))); } catch (_ar) { return; }
            if (live > 0) {
                if (stored !== live) {
                    try { player._gameplayArmorStoredPct = live; } catch (_e) {}
                }
                return;
            }

            const tEq = Number(player._gameplayArmorEquipAt) || 0;
            const equipGrace = tEq > 0 && Date.now() - tEq < 3500;
            const vehGrace = Date.now() < (Number(player._armorVehicleTransitionUntil) || 0);
            let inVeh = false;
            try { inVeh = !!player.vehicle; } catch (_veh) { inVeh = false; }

            if (stored > 0 && (inVeh || vehGrace || equipGrace)) {
                try { player.armour = stored; } catch (_e2) {}
                return;
            }

            if (equipGrace) return;

            clearGameplayArmorEquippedState(player);
        });
    } catch (_e) {}
}, 1000);

mp.events.add('playerEnterVehicle', (player) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
        markArmorVehicleTransition(player, 4000);
        restoreGameplayArmorPctIfNeeded(player);
        setTimeout(() => {
            try {
                if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
                restoreGameplayArmorPctIfNeeded(player);
            } catch (_r) {}
        }, 200);
    } catch (_e) {}
});

mp.events.add('playerExitVehicle', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('armor') !== true) return;
        markArmorVehicleTransition(player, 3500);
        restoreGameplayArmorPctIfNeeded(player);
        if (typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        }
        setTimeout(() => {
            try {
                if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
                restoreGameplayArmorPctIfNeeded(player);
                if (typeof global.applyGameplayArmorVestVisual === 'function') {
                    global.applyGameplayArmorVestVisual(player);
                }
            } catch (_r) {}
        }, 160);
    } catch (_e2) {}
});

mp.events.add("setvariablevoice", (player, variable) => {
    try {
        if (player && mp.players.exists(player)) {
            if (!player.getVariable('auth')) return;
            player.setVariable('voice', variable);
        }
    } catch (error) {
        console.log(error);
    }
});

/** Передача голоса именно в канале Brawl (HUD «говорят в бравле» + полный охват канала на клиенте). Обычный PTT это не выставляет. */
mp.events.add('brawlVoiceTransmit', (player, active) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('brawlVoice', active === true);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("setvariablefly", (player, variable) => {
    try {
        if (player && mp.players.exists(player)) {
            if (!player.getVariable('auth')) return;
            if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player) && variable === true) return;
            const al = Number(player.adminlvl) || 0;
            if (variable === true) {
                const mayFly = al >= 8 || (al >= 1 && al <= 7 && player.getVariable('adminSession') === true);
                if (!mayFly) return;
            }
            player.setVariable('fly', variable);
            if (variable === true) {
                if (typeof global.applyAdminDutyGroundMode === 'function' && al >= 1 && al <= 7 && player.getVariable('adminSession') === true) {
                    global.applyAdminDutyGroundMode(player, false);
                }
                if (typeof global.adminNoclipFlyWeaponVisualStart === 'function') global.adminNoclipFlyWeaponVisualStart(player);
            } else {
                if (typeof global.applyAdminDutyGroundMode === 'function' && al >= 1 && al <= 7 && player.getVariable('adminSession') === true) {
                    global.applyAdminDutyGroundMode(player, true);
                }
                if (typeof global.adminNoclipFlyWeaponVisualEnd === 'function') global.adminNoclipFlyWeaponVisualEnd(player);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("heal:anim", (player, toggle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || player.vehicle) return;
        if (toggle) {
            player.playAnimation('amb@medic@standing@tendtodead@base', 'base', 1, 49);
        } else {
            player.stopAnimation();
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('buygun:SERVER', (player, buygun) => {
    try {
        if (buygun === 'Alcohol' || buygun === 'Алкоголь') buygun = 'Медовуха';

        if (player && mp.players.exists(player)) {
            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            if (typeof global.canUseAmunationShop !== 'function' || !global.canUseAmunationShop(player)) return;

            const prices = {
                "Revolver MKII" : 25000,
                "Carabine Rifle" : 1000,
                "Assault Rifle" : 1000,
                "Heavy Shotgun" : 10000,
                "Assault Shotgun" : 25000,
                "Combat MG" : 50000,
                "Combat MG MKII" : 100000,
                "Special Carbine" : 2500,
                "Mini SMG" : 5000,
                "Бронежилет": 500
            }

            const names = {
                "Revolver MKII" : "weapon_revolver_mk2",
                "Carabine Rifle" : "weapon_carbinerifle",
                "Assault Rifle" : "weapon_assaultrifle",
                "Heavy Shotgun" : "weapon_heavyshotgun",
                "Assault Shotgun" : "weapon_assaultshotgun",
                "Combat MG" : "weapon_combatmg",
                "Combat MG MKII" : "weapon_combatmg_mk2",
                "Special Carbine" : "weapon_specialcarbine",
                "Mini SMG" : "weapon_minismg",
                "Бронежилет": "Бронежилет"
            }

            const price = prices[buygun];
            const name = names[buygun];

            if (!price || !name) {
                return isNotify(player, 2, "top-mid", `Товар недоступен.`, 3000);
            }
            if (typeof global.isSniperWeaponBase === 'function' && global.isSniperWeaponBase(name)) {
                return isNotify(player, 2, "top-mid", `Это оружие больше недоступно.`, 3000);
            }

            let money = Number(player.money);
            let newMoney = parseInt(money) - price;

            if (price > money) {
                isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);
                return;
            }

            const _isWeapBuy = name && String(name).startsWith('weapon_');
            if (_isWeapBuy && global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                return isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
            }

            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (name === 'Бронежилет' || name === 'item_extendedclip') {
                if (typeof global.canAddConsumableQtyToGrid === 'function' && !global.canAddConsumableQtyToGrid(player, name, 1)) {
                    return isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
                }
            }

            if (typeof global.savePlayerMoneyToDb === 'function') {
                global.savePlayerMoneyToDb(player, newMoney);
            } else {
                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err) {
                    if (err) return console.log(err);
                });
            }
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            player.money = newMoney;

            isNotify(player, 3, "top-mid", `-${global.formatnum1(price)}$`, 3000);

            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
            if (name === "Бронежилет" || name === "item_extendedclip") {
                if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
                    global.mergeConsumableQtyIntoGrid(player, name, 1);
                } else if (global.invGridTryPush) {
                    global.invGridTryPush(player, `${name} (1)`);
                } else {
                    player.inventory.push(`${name} (1)`);
                }
            } else {
                player.inventory.push(name || buygun);
            }

            global.saveInventory(player);
            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

            if (_isWeapBuy && typeof global.onNewbieWeaponPurchased === 'function') {
                global.onNewbieWeaponPurchased(player, name);
            }
        }
    } catch (error) {
        console.log(error);
    }
});


mp.events.add('buygun10:SERVER', (player, buygun) => {
    try {
        if (player && mp.players.exists(player) && player.getVariable('auth')) {
            return isNotify(player, 2, 'top-mid', 'Покупка оружия доступна только по одной единице.', 3000);
        }
        return;
        if (buygun === 'Alcohol' || buygun === 'Алкоголь') buygun = 'Медовуха';

        if (player && mp.players.exists(player)) {
            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            if (typeof global.canUseAmunationShop !== 'function' || !global.canUseAmunationShop(player)) return;

            const prices = {
                "Revolver MKII" : 25000,
                "Carabine Rifle" : 1000,
                "Assault Rifle" : 1000,
                "Heavy Shotgun" : 10000,
                "Assault Shotgun" : 25000,
                "Combat MG" : 50000,
                "Combat MG MKII" : 100000,
                "Special Carbine" : 2500,
                "Mini SMG" : 5000,
                "Бронежилет": 500
            }

            const names = {
                "Revolver MKII" : "weapon_revolver_mk2",
                "Carabine Rifle" : "weapon_carbinerifle",
                "Assault Rifle" : "weapon_assaultrifle",
                "Heavy Shotgun" : "weapon_heavyshotgun",
                "Assault Shotgun" : "weapon_assaultshotgun",
                "Combat MG" : "weapon_combatmg",
                "Combat MG MKII" : "weapon_combatmg_mk2",
                "Special Carbine" : "weapon_specialcarbine",
                "Mini SMG" : "weapon_minismg",
                "Бронежилет": "Бронежилет"
            }

            const price = prices[buygun] * 10;
            const name = names[buygun];

            if (!prices[buygun] || !name) {
                return isNotify(player, 2, "top-mid", `Товар недоступен.`, 3000);
            }
            if (typeof global.isSniperWeaponBase === 'function' && global.isSniperWeaponBase(name)) {
                return isNotify(player, 2, "top-mid", `Это оружие больше недоступно.`, 3000);
            }

            let money = Number(player.money);
            let newMoney = parseInt(money) - price;

            if (price > money) {
                isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);
                return;
            }

            const _isWeap10 = name && String(name).startsWith('weapon_');
            if (_isWeap10 && global.getInventoryMaxSlots && global.getInventoryUsedSlots) {
                const mx = global.getInventoryMaxSlots(player);
                const us = global.getInventoryUsedSlots(player);
                if (us + 10 > mx) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно места в инвентаре (нужно 10 слотов).', 4000);
                }
            }

            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (name === 'Бронежилет' || name === 'item_extendedclip') {
                if (typeof global.canAddConsumableQtyToGrid === 'function' && !global.canAddConsumableQtyToGrid(player, name, 10)) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно места в инвентаре.', 4000);
                }
            }

            if (typeof global.savePlayerMoneyToDb === 'function') {
                global.savePlayerMoneyToDb(player, newMoney);
            } else {
                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err) {
                    if (err) return console.log(err);
                });
            }
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            player.money = newMoney;

            isNotify(player, 3, "top-mid", `-${global.formatnum1(price)}$`, 3000);

            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

            if (name === "Бронежилет" || name === "item_extendedclip") {
                if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
                    global.mergeConsumableQtyIntoGrid(player, name, 10);
                }
            } else {
                for(let i=0; i<10; i++){
                    player.inventory.push(name || buygun);
                }
            }

            global.saveInventory(player);
            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

            if (_isWeap10 && typeof global.onNewbieWeaponPurchased === 'function') {
                global.onNewbieWeaponPurchased(player, name);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

/**
 * Изъять одну единицу стакаемого расходника по отображаемому имени (чёрный рынок и т.д.).
 * Учитывает «Бронежилет», «Бронежилет (n)», item_spank, item_alco stacks.
 */
function blackMarketConsumeOneConsumableByLabel(player, displayName) {
    if (!player || !mp.players.exists(player) || !Array.isArray(player.inventory)) return false;
    const map = {
        Спанк: 'item_spank',
        Медовуха: 'item_alco',
        Бронежилет: 'Бронежилет',
        Аптечка: 'Аптечка'
    };
    const baseTok = map[displayName];
    if (!baseTok) return false;
    const inv = player.inventory;
    for (let i = 0; i < inv.length; i++) {
        const raw = inv[i];
        if (raw == null || raw === '') continue;
        const s = String(raw).trim();
        const stem = s.split('(')[0].trim();
        if (stem !== baseTok) continue;
        if (!s.includes('(')) {
            inv.splice(i, 1);
            return true;
        }
        const m = s.match(/\((\d+)\)/);
        const count = m ? parseInt(m[1], 10) : 1;
        if (!Number.isFinite(count) || count < 1) {
            inv.splice(i, 1);
            return true;
        }
        if (count <= 1) inv.splice(i, 1);
        else inv[i] = `${baseTok} (${count - 1})`;
        return true;
    }
    return false;
}

const BLACK_MARKET_SHOP_POS = new mp.Vector3(296.13739013671875, -1714.0819091796875, 29.575132751464844);
const BLACK_MARKET_SHOP_RADIUS = 2.5;

function playerAtBlackMarketShop(player) {
    if (!player || !mp.players.exists(player) || player.dimension !== 0 || !player.position) return false;
    const p = player.position;
    const dx = p.x - BLACK_MARKET_SHOP_POS.x;
    const dy = p.y - BLACK_MARKET_SHOP_POS.y;
    const dz = p.z - BLACK_MARKET_SHOP_POS.z;
    return (dx * dx + dy * dy + dz * dz) <= (BLACK_MARKET_SHOP_RADIUS * BLACK_MARKET_SHOP_RADIUS);
}

mp.events.add('sellgun:SERVER', (player, sellgun) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player && mp.players.exists(player)) {
            
            if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
            player.clicked = new Date().getTime();

            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            if (!playerAtBlackMarketShop(player)) {
                return isNotify(player, 2, 'top-mid', 'Подойдите к чёрному рынку.', 3000);
            }

            const consumableSell = ['Спанк', 'Медовуха', 'Бронежилет'];
            // Скупка ниже минимальной цены покупки (ганшоп / фракция / Каблук), без арбитража.
            prices = {
                "Revolver MKII" : 12500,
                "Carabine Rifle" : 300,
                "Assault Rifle" : 300,
                "Heavy Shotgun" : 1500,
                "Assault Shotgun" : 5000,
                "Special Carbine" : 2000,
                "Mini SMG" : 2000,
                "Спанк": 800,
                "Медовуха": 500,
                "Бронежилет": 100
            };

            names = {
                "Revolver MKII" : "weapon_revolver_mk2",
                "Carabine Rifle" : "weapon_carbinerifle",
                "Assault Rifle" : "weapon_assaultrifle",
                "Heavy Shotgun" : "weapon_heavyshotgun",
                "Assault Shotgun" : "weapon_assaultshotgun",
                "Special Carbine" : "weapon_specialcarbine",
                "Mini SMG" : "weapon_minismg"
            };

            const price = prices[sellgun];
            const name = names[sellgun];

            if (price == null) {
                return isNotify(player, 2, 'top-mid', 'Некорректный лот.', 2000);
            }

            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

            let removed = false;
            if (consumableSell.includes(sellgun)) {
                removed = blackMarketConsumeOneConsumableByLabel(player, sellgun);
                if (!removed) return isNotify(player, 2, 'top-mid', 'У вас нет такого количества товара.', 3000);
            } else {
                if (!name) return isNotify(player, 2, 'top-mid', 'Некорректный лот.', 2000);
                const itemIndex = player.inventory.indexOf(name);
                if (itemIndex === -1)
                    return isNotify(player, 2, 'top-mid', 'У вас нет такого оружия.', 3000);
                player.inventory.splice(itemIndex, 1);
                removed = true;
            }

            if (!removed) return;

            let money = Number(player.money) || 0;
            let newMoney = parseInt(money + price, 10);
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err, resluts) {
                if (err) return console.log(err);
            })
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            player.money = newMoney;

            isNotify(player, 3, "top-mid", `+${global.formatnum1(price)}$`, 3000);

            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function')
                global.emitPlayerInventory(player);
            else
                player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('removeweapondeath', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (typeof global.deathDropHeldWeapon === 'function') {
            global.deathDropHeldWeapon(player);
        }
        player.removeAllWeapons();
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('servarablef3', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('f3key', toogle)
    } catch (error) {
        console.log(error);
    }
});

global.loadcar = function(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], function (err, results) {
            if (err || !results || !results[0]) return;
            let cars = results[0].cars;
            player.call('carsLoad:CLIENT', [global.carsPayloadForClient(cars || '[]')]);
        });
    } catch (error) {
        console.log(error);
    }
}

global.addcar = function(player, carName, source) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], function (err, results) {
            if (err) return console.log(err);

            if (results.length > 0) {
                let cars = results[0].cars;
                let carArray;
                try {
                    carArray = global.normalizeCarsArray(JSON.parse(cars || '[]'));
                } catch (_e) {
                    carArray = [];
                }

                carArray.push({ m: carName, s: source || 'legacy' });

                let updatedCars = global.serializeCarsForDb(carArray);

                global.DB.query('UPDATE accounts SET cars = ? WHERE static = ?', [updatedCars, player.static], function (err, results) {
                    if (err) return console.log(err);

                    player.call('carsLoad:CLIENT', [global.carsPayloadForClient(updatedCars)]);
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

global.removecar = function(player, carName) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.DB.query('SELECT cars FROM accounts WHERE static = ?', [player.static], function (err, results) {
            if (err) return console.log(err);

            if (results.length > 0) {
                let cars = results[0].cars;
                let carArray;
                try {
                    carArray = global.normalizeCarsArray(JSON.parse(cars || '[]'));
                } catch (_e) {
                    carArray = [];
                }

                const index = carArray.findIndex((e) => e.m === carName);
                if (index > -1) {
                    carArray.splice(index, 1);
                }

                let updatedCars = global.serializeCarsForDb(carArray);

                global.DB.query('UPDATE accounts SET cars = ? WHERE static = ?', [updatedCars, player.static], function (err, results) {
                    if (err) return console.log(err);

                    player.call('carsLoad:CLIENT', [global.carsPayloadForClient(updatedCars)]);
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

mp.events.add('setinvkey', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('invkey', toogle)
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('s:setvarshopc', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const active = toogle === true || toogle === 1 || toogle === '1' || toogle === 'true';
        // Обычный close одежды теперь сам выводит игрока из dimension.
        // Этот fallback чистит только уже завершённую сессию, чтобы не сломать
        // legacy-порядок: shopc=false -> teleportToLocation(exit).
        if (!active && player._clothesShopSession && Number(player.dimension) === 0) {
            if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
                global.reapplyPlayerClothesAfterShopClose(player);
            }
            player._clothesShopSession = null;
            player._clothesShopExitUntil = Date.now() + 5000;
        }
        player.setVariable('shopc', active);
    } catch (error) {
        console.log(error);
    }
});

/** Анимации «сдачи» / руки вверх — нельзя стрелять и бить, пока они активны. */
const ANIM_COMBAT_LOCK_KEYS = new Set([
    'random@mugging3|handsup_standing_base',
    'random@arrests|kneeling_arrest_idle',
    'random@shop_robbery|kneel_loop_p',
    'anim@move_hostages@male|male_idle',
    'anim@miss@low@fin@vagos@|idle_ped06',
    'amb@code_human_cower@male@react_cowering|base_front',
    'anim@heists@prison_heistunfinished_biz@popov_react|popov_cower',
    'anim@heists@ornate_bank@hostages@cashier_b@|flinch_loop_underfire',
    'anim@mp_player_intcelebrationfemale@surrender|surrender'
]);

function animCombatLockKey(dict, anim) {
    return String(dict || '').trim().toLowerCase() + '|' + String(anim || '').trim().toLowerCase();
}

function isAnimCombatLocked(dict, anim) {
    return ANIM_COMBAT_LOCK_KEYS.has(animCombatLockKey(dict, anim));
}

function clearPlayerAnimCombatLock(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.setVariable('animCombatLock', false);
    } catch (_e) {}
}

function applyPlayerAnimCombatLock(player, dict, anim) {
    if (!player || !mp.players.exists(player)) return false;
    const locked = isAnimCombatLocked(dict, anim);
    try {
        player.setVariable('animCombatLock', locked);
    } catch (_e) {}
    if (locked) {
        try {
            player.removeAllWeapons();
        } catch (_e2) {}
        try {
            player.setVariable('activeWeaponSlot', null);
            player.call('hideAmmo');
            if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, 0);
        } catch (_e3) {}
    }
    return locked;
}

global.clearPlayerAnimCombatLock = clearPlayerAnimCombatLock;
global.applyPlayerAnimCombatLock = applyPlayerAnimCombatLock;

global.isPlayerAnimCombatLocked = function (player) {
    try {
        return !!(player && mp.players.exists(player) && player.getVariable('animCombatLock') === true);
    } catch (_e) {
        return false;
    }
};

mp.events.add('anim:play:s', (player, dict, anim, flag) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isPlayerInCaptOrBizwarArena === 'function' && global.isPlayerInCaptOrBizwarArena(player)) {
            return isNotify(player, 2, 'top-mid', 'Анимации недоступны во время войны семей/капта.', 2500);
        }

        const dictStr = dict == null ? '' : String(dict).trim();
        const animStr = anim == null ? '' : String(anim).trim();
        if (!dictStr || !animStr) {
            player.stopAnimation();
            player.setVariable('anim', false);
            clearPlayerAnimCombatLock(player);
            if (player.data) {
                player.data._flowAnimDict = '';
                player.data._flowAnimName = '';
            }
            return;
        }

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (!player.data) player.data = {};

        const prevDict = String(player.data._flowAnimDict || '');
        const prevAnim = String(player.data._flowAnimName || '');
        const sameAnim =
            player.getVariable('anim') === true && prevDict === dictStr && prevAnim === animStr;

        if (sameAnim) {
            player.stopAnimation();
            player.setVariable('anim', false);
            clearPlayerAnimCombatLock(player);
            player.data._flowAnimDict = '';
            player.data._flowAnimName = '';
            return;
        }

        const flagNum = Number(flag);
        const animFlag = Number.isFinite(flagNum) ? flagNum : 49;

        player.stopAnimation();
        player.data._flowAnimDict = dictStr;
        player.data._flowAnimName = animStr;
        player.setVariable('anim', true);
        applyPlayerAnimCombatLock(player, dictStr, animStr);
        player.playAnimation(dictStr, animStr, 1, animFlag);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('s:stopanim', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player && mp.players.exists(player)) {
            if (!player.getVariable('auth')) return;

            if (player.getVariable('pairActive') === true) {
                if (player.getVariable('pairCancelByG') === false) return;
                if (typeof global.endPairInteractionForPlayer === 'function') {
                    global.endPairInteractionForPlayer(player, null, player);
                }
                return;
            }

            player.stopAnimation();
            player.setVariable('anim', false);
            clearPlayerAnimCombatLock(player);
            if (player.data) {
                player.data._flowAnimDict = '';
                player.data._flowAnimName = '';
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("playerDeath", (player, reason) => {
    try {
        player.data.isCrouched = false;
        player.setVariable('isCrouched', false);
        player.setVariable('anim', false);
        if (typeof clearPlayerAnimCombatLock === 'function') clearPlayerAnimCombatLock(player);
        else player.setVariable('animCombatLock', false);
        if (player.data) {
            player.data._flowAnimDict = '';
            player.data._flowAnimName = '';
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("toggleCrouch", (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (typeof global.isPlayerInCaptOrBizwarPrep === 'function' && global.isPlayerInCaptOrBizwarPrep(player)) {
            return;
        }
        if (player.data.isCrouched === undefined) {
            player.data.isCrouched = true;
        } else {
            player.data.isCrouched = !player.data.isCrouched;
        }
        player.setVariable('isCrouched', !!player.data.isCrouched);
    } catch (error) {
        console.log(error);
    }
});

const WHISTLE_BIND_MS_OLD = 2260;
mp.events.add('whistleBind:SERVER', (player, variant) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.vehicle) return;
        if (player.getVariable('dead')) return;
        if (new Date().getTime() - player.clicked < 2000) return;
        player.clicked = new Date().getTime();
        const v = variant === 'new' ? 'new' : 'old';
        const rid = typeof player.remoteId === 'number' ? player.remoteId : player.id;

        if (v === 'new') {
            // Локально уже сыграл client_packages/whistle_gta5rp.js — шлём только звук + аним соседям
            mp.players.broadcastInRange(player.position, 35, 'playWhistleGta5rpRemote', rid);
            mp.players.broadcastInRange(player.position, 35, 'Whistle:CLIENT', rid, 'new');
            return;
        }

        player.setVariable('ANIM_WHISTLE_STYLE', 'old');
        player.setVariable('ANIM_WHISTLE', true);
        setTimeout(() => {
            if (mp.players.exists(player)) {
                player.setVariable('ANIM_WHISTLE', false);
                player.setVariable('ANIM_WHISTLE_STYLE', null);
            }
        }, WHISTLE_BIND_MS_OLD);
        player.call('playWhistleLocalAnim', ['old']);
        mp.players.broadcastInRange(player.position, 30, 'Whistle:CLIENT', rid, 'old');
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('hitmarker', (player, toogle) => {
    try {
        if (!mp.players.exists(player)) return;
        player.setVariable('hitmarker', toogle);
    } catch (error) {
        console.log(error);
    }
});

global.creatorPedsNew(mp.joaat('u_m_y_antonb'), new mp.Vector3(296.13739013671875, -1714.0819091796875, 29.175132751464844), {
    dynamic: true,
    invincible: true,
    frozen: true,
    heading: -169.202
});

global.creatorLabelsNew('Черный рынок (E)', new mp.Vector3(296.13739013671875, -1714.0819091796875, 30.275132751464844),
    {
        font: 4,
        color: [255, 255, 255, 255],
        scale: [0.35, 0.35],
        drawDistance: 25,
        outline: true,
        los: true,
    });

const blackpos = BLACK_MARKET_SHOP_POS;
let blackshopcolshape = global.creatorShapeSphere(blackpos.x, blackpos.y, blackpos.z, 1.5)

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (colshape === blackshopcolshape) {
            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            player.setVariable('black', true);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (colshape === blackshopcolshape) {
            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            player.setVariable('black', false);
            player.call('closeBlackShopMenu');
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player, reason) => {
    try {
        if (player.getVariable('auth')) {
            global.DB.query(
                `INSERT INTO logsexit (static, social, ipadr, reason, time) VALUES (?, ?, ?, ?, NOW())`,
                [player.static, player.rgscId, player.ip, reason],
                (err, result) => {
                    if (err) return console.log(err);
                }
            );
            global.sendDiscordLog(`Выход из игры!\n\nLOGIN: ${player.login}\nIP: ${player.ip}\nSocialClub ID: ${player.rgscId}\nПричина - ||${reason}||`, '1321877408894419046')
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('setvrblphone', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('phone', toogle);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('setvrbltable', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('table', toogle);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('teleportToInterior', (player, id) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if(!require('./legacy/access').hasPermission(player,'player.teleport'))return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : !(player.getVariable('adminlvl') >= 1)) return;
        if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
            return isNotify(player, 2, "top-mid", "В войне семей админ-функции недоступны.", 3000);
        }
        const teleportPositions = [
                { id: 1, position: new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875) },
                { id: 2, position: new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168) },
                { id: 3, position: new mp.Vector3(924.6547241210938, -1559.1331787109375, 30.755172729492188) },
                { id: 4, position: new mp.Vector3(840.6149291992188, -2335.831298828125, 30.334321975708008) },
                { id: 5, position: new mp.Vector3(1379.235107421875, -2079.55322265625, 51.998565673828125) },
                { id: 6, position: new mp.Vector3(442.406982421875, -982.6343994140625, 30.689603805541992) },
                { id: 7, position: new mp.Vector3(-39.805076599121094, -1112.9384765625, 26.43741798400879) },
                { id: 8, position: new mp.Vector3(136.8494110107422, -1708.429443359375, 29.291629791259766) },
                { id: 9, position: new mp.Vector3(18.87891387939453, -1111.3028564453125, 29.797039031982422) },
                { id: 10, position: new mp.Vector3(812.0521240234375, -2152.930908203125, 29.619022369384766) },
                { id: 11, position: new mp.Vector3(136.46192932128906, -1312.0025634765625, 29.164318084716797) },
                { id: 13, position: new mp.Vector3(296.73016357421875, -1718.272216796875, 29.23214340209961) },
                { id: 14, position: new mp.Vector3(-110.64299011230469, -606.833251953125, 36.28078079223633) },
                { id: 15, position: new mp.Vector3(345.48406982421875, -2051.235107421875, 21.577693939208984) },
                { id: 16, position: new mp.Vector3(1109.0545654296875, 219.25430297851562, -49.4609489440918) },
                { id: 18, position: new mp.Vector3(3077.10791015625, -4696.69677734375, 15.261431694030762) },
                { id: 19, position: new mp.Vector3(358.5575866699219, -2576.047119140625, 9.860130310058594) },
                { id: 20, position: new mp.Vector3(1483.0081787109375, 1066.07470703125, 114.33401489257812) },
                { id: 21, position: new mp.Vector3(2896.565185546875, 4330.298828125, 102.10135650634766) },
                { id: 22, position: new mp.Vector3(2383.88818359375, 3086.07958984375, 48.15302658081055) },
                { id: 23, position: new mp.Vector3(342.212890625, -1397.3890380859375, 32.509342193603516) },
                { id: 24, position: new mp.Vector3(-195.6310, -797.3820, 30.4551) },
                { id: 25, position: new mp.Vector3(1321.7530517578125, -1653.036865234375, 52.275203704833984) },
            ];

            const teleport = teleportPositions.find(tp => tp.id === id);

            if (teleport) {
                if (typeof global.metaAcTeleport === 'function') {
                    global.metaAcTeleport(player, teleport.position.x, teleport.position.y, teleport.position.z, {
                        reason: 'admin-interior',
                        dimension: player.dimension
                    });
                } else {
                    player.position = teleport.position;
                }
                if (teleport.heading !== undefined && teleport.heading !== null && typeof teleport.heading === 'number') {
                    player.heading = teleport.heading;
                }
            } else {
                isNotify(player, 2, "top-mid", `Неизвестный телепорт.`, 3000);
            }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('goto', (player, static_id) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if(!require('./legacy/access').hasPermission(player,'player.teleport'))return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : !(Number(player.adminlvl) >= 1)) return;
        if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
            return isNotify(player, 2, "top-mid", "В войне семей админ-функции недоступны.", 3000);
        }

        if (!static_id) {
            return isNotify(player, 2, "top-mid", `Введите статик.`, 3000);
        }

        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        if (targetPlayer && mp.players.exists(targetPlayer) && targetPlayer._legacySpawned === true && targetPlayer.getVariable('auth') === true) {
            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'goto')) return;
            const login = targetPlayer.login
            const adminlogin = player.login

            global.sendDiscordLog(`Телепортирование к игроку!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

            if (typeof global.metaAcTeleportToPlayer === 'function') {
                global.metaAcTeleportToPlayer(player, targetPlayer, 'admin-goto');
            } else {
                player.position = targetPlayer.position;
                player.dimension = targetPlayer.dimension;
            }
            player.call('legacy:admin:teleported');
            isNotify(player, 3, "top-mid", `Вы успешно телепортировались к игроку ${login}.`, 5000);
        } else {
            return isNotify(player, 2, "top-mid", `Игрок с таким статиком не найден на сервере.`, 5000);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('gethere', (player, static_id) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if(!require('./legacy/access').hasPermission(player,'player.teleport'))return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : !(Number(player.adminlvl) >= 1)) return;
        if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
            return isNotify(player, 2, "top-mid", "В войне семей админ-функции недоступны.", 3000);
        }

        if (!static_id) {
            return isNotify(player, 2, "top-mid", `Введите статик.`, 3000);
        }

        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        if (targetPlayer && mp.players.exists(targetPlayer) && targetPlayer._legacySpawned === true && targetPlayer.getVariable('auth') === true) {
            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'gethere')) return;

            const login = targetPlayer.login
            const adminlogin = player.login

            global.sendDiscordLog(`Телепортирование игрока к себе!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')
                
            targetPlayer.outputChatBox(`!{#ff0000} Администратор ${adminlogin} телепортировал вас к себе.`)
            isNotify(targetPlayer, 1, "top-mid", `Администратор ${adminlogin} телепортировал вас к себе.`, 5000);

            if (typeof global.metaAcTeleportToPlayer === 'function') {
                global.metaAcTeleportToPlayer(targetPlayer, player, 'admin-gethere');
            } else {
                targetPlayer.position = player.position;
                targetPlayer.dimension = player.dimension;
            }
                
            player.call('legacy:admin:teleported');
            isNotify(player, 3, "top-mid", `Вы телепортировали игрока ${login} к себе.`, 3000);
        } else {
            return isNotify(player, 2, "top-mid", `Игрок с таким статиком не найден на сервере.`, 5000);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('amenu', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if(toogle===true&&!require('./legacy/staff-policy').has(Number(player.adminlvl)||0,'flow.panel'))return isNotify(player,2,'top-mid','Ваш ранг не даёт доступ к Flow Panel.',3000);
        if (player.adminlvl >= 1 && toogle === true && global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
            return isNotify(player, 2, "top-mid", "В войне семей админ-панель недоступна.", 3000);
        }
        if (toogle === true && (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : !(Number(player.adminlvl) >= 1))) return;
        if (Number(player.adminlvl) >= 1) {
            player.setVariable('amenu', toogle);
            if (toogle === true) {
                player.call('adminPanel:setCmdHints', [global.buildChatCmdHintsJson(player) || '[]']);
                if(typeof global.syncAdminSessionClient==='function')global.syncAdminSessionClient(player);
                try {
                    const trueLv = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
                    player.call('adminPanel:setAdminLevel', [trueLv]);
                } catch (_eLv) {}
                mp.players.forEach(p => {
                    const reportText = p.getVariable('report');
                    if (reportText !== null && reportText !== undefined) {
                        const isMedia = typeof global.playerHasMedia === 'function' && global.playerHasMedia(p);
                        if (typeof global.buildAdminReportPayload === 'function') {
                            player.call('adminPanel:addReportPayload', [
                                global.buildAdminReportPayload(p.static, p.login, reportText, isMedia)
                            ]);
                        } else {
                            player.call('adminPanel:addReport', [p.static, reportText, isMedia ? 1 : 0, p.login]);
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('ammo', (player, toogle) => {
    try {
        if (!mp.players.exists(player)) return;
        const enabled = !!toogle;
        player.setVariable('ammo', enabled);
        player.call('ammo', [enabled]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('voice', (player, toogle) => {
    try {
        if (!mp.players.exists(player)) return;
        player.setVariable('voicee', toogle);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('names', (player, toogle) => {
    try {
        if (!mp.players.exists(player)) return;
        player.setVariable('names', toogle);
    } catch (error) {
        console.log(error);
    }
})

mp.events.add('playerQuit', player => {
    try {
        if (!player || !player.position) return;

        const pos = player.position;
        const dim = player.dimension || 0;
        const sessionId = player.id;
        const staticId = player.static != null ? player.static : '?';

        const marker = global.creatorMarkersNew(
            42,
            new mp.Vector3(pos.x, pos.y, pos.z),
            1,
            {
                dimension: dim,
                color: [255, 255, 255, 120],
                rotation: new mp.Vector3(0.0, 0.0, 0.0),
                visible: true
            }
        );

        const now = new Date();
        const parts = new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            hour12: false,
            timeZone: 'Europe/Moscow'
        }).formatToParts(now);

        const get = (type) => {
            const p = parts.find((x) => x.type === type);
            return p ? p.value : '';
        };
        const timeStr = `${get('hour')}:${get('minute')}:${get('second')}`;
        const dateStr = `${get('day')}.${get('month')}`;

        // 1:1 как на скрине + static: "ID: 795 (#10) вышел в\n13:50:56 10.11"
        const labelText = `ID: ${sessionId} (#${staticId}) вышел в\n${timeStr} ${dateStr}`;

        const label = global.creatorLabelsNew(
            labelText,
            new mp.Vector3(pos.x, pos.y, pos.z + 0.5),
            {
                los: true,
                font: 4,
                drawDistance: 5,
                dimension: dim,
                color: [255, 255, 255, 255]
            }
        );

        setTimeout(() => {
            try {
                if (marker && mp.markers.exists(marker)) marker.destroy();
            } catch (_e) {}
            try {
                if (label && mp.labels.exists(label)) label.destroy();
            } catch (_e2) {}
        }, 3 * 60 * 1000);
    } catch (e) {
        console.log('[QUIT LABEL]', e && e.message ? e.message : e);
    }
});

mp.events.add("playerStartExitVehicle", (player) => {
    vehicle = player.vehicle
    if (vehicle && mp.vehicles.exists(vehicle)) {
        vehicle.engine = vehicle.engine
    }
});


mp.events.add('useConsumable:SERVER', (player, itemName, slotTypeRaw, slotIndexRaw) => {
    let consumableLockHeld = false;
    try {
        if (!mp.players.exists(player)) return;
        const isSpankItem = itemName === "item_spank";
        const isAlcoItem = itemName === "item_alco";
        if (!player.getVariable('auth')) {
            if (isSpankItem || isAlcoItem) player.call('spankAlco:reject');
            return;
        }

        const stEarly = String(slotTypeRaw || '').trim();
        const siEarly = parseInt(slotIndexRaw, 10);
        if ((stEarly === 'bagItem' || stEarly === 'bag') && Number.isInteger(siEarly) && siEarly >= 0) {
            if (isSpankItem || isAlcoItem) player.call('spankAlco:reject');
            isNotify(player, 2, 'top-mid', 'Сначала перенесите предмет в инвентарь.', 3500);
            return;
        }

        if (
            typeof itemName === 'string' &&
            itemName.indexOf('agift:') === 0 &&
            typeof global.armorCosmeticGiftUnwrap === 'function'
        ) {
            global.armorCosmeticGiftUnwrap(player, itemName, slotTypeRaw, slotIndexRaw);
            return;
        }

        if (itemName === 'item_spectrum_charm') {
            if (typeof global.useSpectrumCharmOnBag === 'function') {
                global.useSpectrumCharmOnBag(player);
            } else {
                isNotify(player, 2, 'top-mid', 'Брелок временно недоступен.', 3000);
            }
            return;
        }
        
        let isSpank = isSpankItem;
        let isAlco = isAlcoItem;
        let isArmor =
            itemName === 'Бронежилет' ||
            (typeof global.parseArmorDurabilityFromToken === 'function' &&
                global.parseArmorDurabilityFromToken(itemName) != null);
        let isHeal = itemName === 'Аптечка' || itemName === 'Аптека';
        const consumeToken = isHeal ? 'Аптечка' : itemName;
        
        if (isArmor && player.getVariable('adminDutyGround') === true) {
            return isNotify(player, 2, 'top-mid', 'После /offnc бронежилет недоступен.', 4000);
        }
        const inCapt = player.getVariable('inCapt') === true;
        const inBizwar = player.getVariable('inBizwar') === true;
        if (isArmor && inCapt && player.getVariable('captAllowArmor') !== true) {
            player.armour = 0;
            player.setVariable('armor', null);
            player.setClothes(9, 0, 0, 0);
            return isNotify(player, 2, "top-mid", "В этой войне семей бронежилет запрещён.", 3000);
        }
        if (isArmor && inBizwar && player.getVariable('bizwarAllowArmor') !== true) {
            player.armour = 0;
            player.setVariable('armor', null);
            player.setClothes(9, 0, 0, 0);
            return isNotify(player, 2, "top-mid", "На этом капте бронежилет запрещён.", 3000);
        }
        if (isSpank && inCapt && player.getVariable('captAllowSpank') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, "top-mid", "Спанк в этой войне семей отключён.", 3000);
        }
        if (isSpank && inBizwar && player.getVariable('bizwarAllowSpunk') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, "top-mid", "Спанк на этом капте отключён.", 3000);
        }
        if (isAlco && inCapt && player.getVariable('captAllowAlco') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, "top-mid", "Медовуха в этой войне семей отключён.", 3000);
        }
        if (isAlco && inBizwar && player.getVariable('bizwarAllowAlco') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, "top-mid", "Медовуха на этом капте отключён.", 3000);
        }

        if (!isSpank && !isAlco && !isArmor && !isHeal) return;

        if (isHeal && rejectIfConsumableUseCooldown(player, 'med')) return;
        if (isArmor && rejectIfConsumableUseCooldown(player, 'armor')) return;
        if (isSpank && rejectIfConsumableUseCooldown(player, 'spank')) return;
        if (isAlco && rejectIfConsumableUseCooldown(player, 'alco')) return;

        if (isHeal) {
            if (isPostDamageMedBlockedServer(player)) {
                syncDamageConsumableLockToClient(player);
                return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
            }
        }
        if (isSpank) {
            if (isPostDamageSpankBlockedServer(player)) {
                syncDamageConsumableLockToClient(player);
                player.call('spankAlco:reject');
                return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
            }
        }
        if (isAlco) {
            if (isPostDamageSpankBlockedServer(player)) {
                syncDamageConsumableLockToClient(player);
                player.call('spankAlco:reject');
                return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
            }
        }
        if (isSpank || isAlco) {
            if (typeof global.isPlayerSpankAlcoConsumableBusy === 'function' && global.isPlayerSpankAlcoConsumableBusy(player)) {
                player.call('spankAlco:reject');
                return isNotify(player, 2, 'top-mid', 'Дождитесь окончания использования спанка или запива.', 2500);
            }
        }
        if (isArmor) {
            if (isPostDamageArmorBlockedServer(player)) {
                return notifyPostDamageArmorBlocked(player);
            }
            if (player.getVariable('inCapt') === true && player.getVariable('captAllowArmor') === true) {
                const usedArmor = parseInt(player.getVariable('captArmorUses'), 10) || 0;
                if (usedArmor >= CAPT_MAX_ARMOR_USES) {
                    return isNotify(player, 2, "top-mid", `В войне семей можно надеть не более ${CAPT_MAX_ARMOR_USES} бронежилетов.`, 3500);
                }
            }
            if (!ensureGameplayArmorUnequippedBeforeEquip(player)) return;
        }
        
        if (isSpank || isAlco) {
            const animMs = isAlco ? ALCO_USE_ANIM_MS : SPANK_USE_ANIM_MS;
            if (typeof global.tryAcquirePlayerConsumableUse === 'function') {
                if (!global.tryAcquirePlayerConsumableUse(player, animMs)) {
                    player.call('spankAlco:reject');
                    return isNotify(player, 2, 'top-mid', 'Дождитесь окончания использования спанка или запива.', 2500);
                }
                consumableLockHeld = true;
            }
        }

        let armorEquipPct = 100;
        let armorGotResult = null;
        let consumed = false;
        if (isArmor && typeof global.consumeArmorItemForPlayer === 'function') {
            const si = parseInt(slotIndexRaw, 10);
            const st = String(slotTypeRaw || '').trim();
            const opts = {};
            if (Number.isInteger(si) && si >= 0) {
                opts.slotIndex = si;
                if (st === 'bagItem') opts.source = 'bag';
                else if (st === 'weapon') opts.source = 'fast';
                else opts.source = 'grid';
            }
            const armorGot = global.consumeArmorItemForPlayer(player, itemName, opts);
            if (armorGot) {
                armorEquipPct = armorGot.pct;
                armorGotResult = armorGot;
                consumed = true;
            }
        } else if (isArmor && typeof global.consumeOneArmorItemForPlayer === 'function') {
            const armorGot = global.consumeOneArmorItemForPlayer(player);
            if (armorGot) {
                armorEquipPct = armorGot.pct;
                armorGotResult = armorGot;
                consumed = true;
            }
        } else if (typeof global.consumeOneConsumableStackInGrid === 'function') {
            consumed = global.consumeOneConsumableStackInGrid(player, consumeToken);
        }

        if (!consumed) {
            if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                global.releasePlayerConsumableUse(player);
            }
            if (isSpank || isAlco) {
                player.call('spankAlco:reject');
                isNotify(player, 2, 'top-mid', 'У вас нет этого предмета.', 2500);
            } else if (isArmor) {
                isNotify(player, 2, 'top-mid', 'Нет бронежилета.', 2500);
            } else if (isHeal) {
                isNotify(player, 2, 'top-mid', 'Нет аптечки.', 2500);
            }
            return;
        }

        global.saveInventory(player);
        if (global.emitPlayerInventory) global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        // Apply effect (анимации на клиенте + синхрон для других, как BulbaDM)
        if (isSpank) {
            player.setVariable('ANIM_SPANK', true);
            setTimeout(() => {
                if (mp.players.exists(player)) player.setVariable('ANIM_SPANK', false);
            }, SPANK_USE_ANIM_MS);
            player.call('playSpankConsumableAnim');
            if (typeof global.scheduleSpankConsumableEffect === 'function') {
                global.scheduleSpankConsumableEffect(player);
            }
        } else if (isAlco) {
            player.setVariable('ANIM_ALCOHOL', true);
            setTimeout(() => {
                if (mp.players.exists(player)) player.setVariable('ANIM_ALCOHOL', false);
            }, ALCO_USE_ANIM_MS);
            player.call('playAlcoConsumableAnim');
            if (typeof global.applyAlcoholBuff === 'function') {
                global.applyAlcoholBuff(player, 120);
            } else {
                player.call('activateAlcoBuff', [120]);
            }
        } else if (isArmor) {
            applyGameplayArmorEquipped(player, armorGotResult || { pct: armorEquipPct });
        } else if (isHeal) {
            player.health = 100;
        }
        if (isSpank) stampConsumableUse(player, 'spank');
        else if (isAlco) stampConsumableUse(player, 'alco');
        else if (isArmor) stampConsumableUse(player, 'armor');
        else if (isHeal) stampConsumableUse(player, 'med');
        if (isSpank || isAlco) {
            player.call('spankAlco:used');
        }
    } catch(err) {
        console.log(err);
        try {
            if (mp.players.exists(player) && (itemName === 'item_spank' || itemName === 'item_alco')) {
                if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                    global.releasePlayerConsumableUse(player);
                }
                player.call('spankAlco:reject');
            }
        } catch (e) {}
    }
});

mp.events.add('useBong:SERVER', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const inCapt = player.getVariable('inCapt') === true;
        const inBizwar = player.getVariable('inBizwar') === true;
        if (inCapt && player.getVariable('captAllowSpank') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Спанк на этом капте отключён.', 3000);
        }
        if (inBizwar && player.getVariable('bizwarAllowSpunk') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Спанк на этом Капте отключён.', 3000);
        }
        if (isPostDamageSpankBlockedServer(player)) {
            syncDamageConsumableLockToClient(player);
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        }
        if (rejectIfConsumableUseCooldown(player, 'spank')) {
            player.call('spankAlco:reject');
            return;
        }
        if (typeof global.isPlayerSpankAlcoConsumableBusy === 'function' && global.isPlayerSpankAlcoConsumableBusy(player)) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Дождитесь окончания использования бонга.', 2500);
        }

        const hasBong = (() => {
            if (!Array.isArray(player.inventory)) return false;
            for (const x of player.inventory) {
                if (!x) continue;
                const xs = String(x);
                if (xs === 'item_bong' || xs.startsWith('item_bong (')) return true;
            }
            return false;
        })();

        if (!hasBong) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Трубка Bong не найдена в инвентаре.', 3000);
        }

        const hasSpank = (() => {
            if (!Array.isArray(player.inventory)) return false;
            for (const x of player.inventory) {
                if (!x) continue;
                const xs = String(x);
                if (xs === 'item_spank' || xs.startsWith('item_spank (')) return true;
            }
            if (Array.isArray(player.fastSlots)) {
                for (const x of player.fastSlots) {
                    if (!x) continue;
                    const xs = String(x);
                    if (xs === 'item_spank' || xs.startsWith('item_spank (')) return true;
                }
            }
            return false;
        })();

        if (!hasSpank) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'В инвентаре нету спанка.', 3000);
        }

        if (typeof global.consumeOneConsumableForPlayer !== 'function') {
            player.call('spankAlco:reject');
            return;
        }

        let consumableLockHeld = false;
        if (typeof global.tryAcquirePlayerConsumableUse === 'function') {
            if (!global.tryAcquirePlayerConsumableUse(player, BONG_USE_ANIM_MS)) {
                player.call('spankAlco:reject');
                return isNotify(player, 2, 'top-mid', 'Дождитесь окончания использования бонга.', 2500);
            }
            consumableLockHeld = true;
        }

        const consumedSpank = global.consumeOneConsumableForPlayer(player, 'item_spank');
        if (!consumedSpank) {
            if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                global.releasePlayerConsumableUse(player);
            }
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'В инвентаре нету спанка.', 3000);
        }

        stampConsumableUse(player, 'spank');

        if (typeof global.normalizeBongInPlayerGrid === 'function') {
            global.normalizeBongInPlayerGrid(player);
        }

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        player.setVariable('ANIM_BONG', true);
        setTimeout(() => {
            if (mp.players.exists(player)) player.setVariable('ANIM_BONG', false);
        }, 2100);

        player.call('playBongConsumableAnim');

        if (typeof global.applyBongBuff === 'function') {
            global.applyBongBuff(player);
        }

        addConsumableHealth(player, 75, 'bong');

        player.call('spankAlco:used');

    } catch (err) {
        console.log('[useBong:SERVER]', err);
        try {
            if (mp.players.exists(player)) player.call('spankAlco:reject');
        } catch (_e) {}
    }
});

mp.events.add('useThermos:SERVER', (player) => {
    let consumableLockHeld = false;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (typeof global.isPlayerSpankAlcoConsumableBusy === 'function' && global.isPlayerSpankAlcoConsumableBusy(player)) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Подождите, термокружка используется.', 2000);
        }

        const inCapt = player.getVariable('inCapt') === true;
        const inBizwar = player.getVariable('inBizwar') === true;
        if (inCapt && player.getVariable('captAllowAlco') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Медовуха на этом капте отключена.', 3000);
        }
        if (inBizwar && player.getVariable('bizwarAllowAlco') !== true) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Медовуха на этом Капте отключена.', 3000);
        }
        if (typeof isPostDamageSpankBlockedServer === 'function' && isPostDamageSpankBlockedServer(player)) {
            if (typeof syncDamageConsumableLockToClient === 'function') syncDamageConsumableLockToClient(player);
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        }
        if (rejectIfConsumableUseCooldown(player, 'alco')) {
            player.call('spankAlco:reject');
            return;
        }

        const hasThermos = (() => {
            if (!Array.isArray(player.inventory)) return false;
            for (const x of player.inventory) {
                if (!x) continue;
                const xs = String(x);
                if (
                    xs === 'item_thermos' || xs.startsWith('item_thermos (') ||
                    xs === 'item_thermocup' || xs.startsWith('item_thermocup (')
                ) return true;
            }
            return false;
        })();

        if (!hasThermos) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'Термокружка не найдена в инвентаре.', 3000);
        }

        const hasAlco = (() => {
            if (!Array.isArray(player.inventory)) return false;
            for (const x of player.inventory) {
                if (!x) continue;
                const xs = String(x);
                if (xs === 'item_alco' || xs.startsWith('item_alco (')) return true;
            }
            if (Array.isArray(player.fastSlots)) {
                for (const x of player.fastSlots) {
                    if (!x) continue;
                    const xs = String(x);
                    if (xs === 'item_alco' || xs.startsWith('item_alco (')) return true;
                }
            }
            return false;
        })();

        if (!hasAlco) {
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'В инвентаре нет Медовухи.', 3000);
        }

        const THERMOS_USE_MS = 5500;
        if (typeof global.tryAcquirePlayerConsumableUse === 'function') {
            if (!global.tryAcquirePlayerConsumableUse(player, THERMOS_USE_MS)) {
                player.call('spankAlco:reject');
                return isNotify(player, 2, 'top-mid', 'Подождите, термокружка используется.', 2000);
            }
            consumableLockHeld = true;
        } else if (typeof global.lockPlayerConsumableUse === 'function') {
            global.lockPlayerConsumableUse(player, THERMOS_USE_MS);
            consumableLockHeld = true;
        }

        if (typeof global.consumeOneConsumableStackInGrid !== 'function') {
            if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                global.releasePlayerConsumableUse(player);
            }
            player.call('spankAlco:reject');
            return;
        }

        const consumedAlco = global.consumeOneConsumableStackInGrid(player, 'item_alco');
        if (!consumedAlco) {
            if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                global.releasePlayerConsumableUse(player);
            }
            player.call('spankAlco:reject');
            return isNotify(player, 2, 'top-mid', 'В инвентаре нет Медовухи.', 3000);
        }

        if (typeof global.normalizeThermosInPlayerGrid === 'function') {
            global.normalizeThermosInPlayerGrid(player);
        }

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        player.setVariable('ANIM_THERMOS', true);
        setTimeout(() => {
            if (mp.players.exists(player)) player.setVariable('ANIM_THERMOS', false);
        }, THERMOS_USE_MS);

        player.call('playThermosConsumableAnim');

        if (typeof global.applyAlcoholBuff === 'function') {
            global.applyAlcoholBuff(player, 240);
        } else {
            player.call('activateAlcoBuff', [240]);
        }

        stampConsumableUse(player, 'alco');
        player.call('spankAlco:used');
    } catch (err) {
        console.log('[useThermos:SERVER]', err);
        try {
            if (consumableLockHeld && typeof global.releasePlayerConsumableUse === 'function') {
                global.releasePlayerConsumableUse(player);
            }
            if (mp.players.exists(player)) player.call('spankAlco:reject');
        } catch (_e) {}
    }
});

mp.events.add('setSpankResist', (player, state) => {
    if (!mp.players.exists(player)) return;
    const active = state === true || state === 1 || state === '1' || state === 'true';
    player.setVariable('spankResist', active);
    try { player.call('setSpankResistStatus', [active]); } catch (_e) {}
});

mp.events.add('setAlcoResist', (player, state) => {
    if (!mp.players.exists(player)) return;
    const active = state === true || state === 1 || state === '1' || state === 'true';
    player.setVariable('alcoResist', active);
    try { player.call('setAlcoholResistStatus', [active]); } catch (_e) {}
});


mp.events.add('Whistle:SERVER', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.vehicle) return;

        player.call('playWhistleLocalAnim', ['old']);
        player.setVariable('ANIM_WHISTLE', true);
        setTimeout(() => {
            if (mp.players.exists(player)) player.setVariable('ANIM_WHISTLE', false);
        }, 2260);

        const rid = typeof player.remoteId === 'number' ? player.remoteId : player.id;
        mp.players.broadcastInRange(player.position, 30, 'Whistle:CLIENT', rid, 'old');
    } catch(e) {
        console.log(e);
    }
});

// ─── Скейтборд: за спиной / езда ─────────────────────────────────────────────

function destroySkateVehByVar(player, varName) {
    if (!mp.players.exists(player)) return;
    const vehId = player.getVariable(varName);
    player.setVariable(varName, null);
    if (vehId == null) return;
    mp.vehicles.forEach(v => {
        try {
            if (mp.vehicles.exists(v) && v.id === vehId) v.destroy();
        } catch (_e) {}
    });
}

mp.events.add('skateboard:carry:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isPlayerInCaptOrBizwarArena === 'function' && global.isPlayerInCaptOrBizwarArena(player)) return;
        if (player.vehicle) return;
        if (!Array.isArray(player.inventory) || !player.inventory.some(s => typeof s === 'string' && s.toLowerCase().startsWith('item_skateboard'))) return;

        destroySkateVehByVar(player, 'skateCarryId');
        destroySkateVehByVar(player, 'skateVehId');

        const pos = player.position;
        const hd  = player.heading || 0;
        const rad = (hd * Math.PI) / 180;
        const veh = mp.vehicles.new(mp.joaat('5rp_skate'), new mp.Vector3(
            pos.x - Math.sin(rad) * 0.4,
            pos.y + Math.cos(rad) * 0.4,
            pos.z + 0.55
        ), {
            heading: hd,
            dimension: player.dimension,
            alpha: 255,
            locked: true,
            engine: false
        });

        if (!veh || !mp.vehicles.exists(veh)) return;

        try {
            if (typeof veh.freezePosition === 'boolean') veh.freezePosition = true;
        } catch (_e) {}

        veh.setVariable('skateOwner', player.static);
        veh.setVariable('skateCarry', true);
        player.setVariable('skateCarryId', veh.id);
        /* Флаг для других клиентов — скейт за спиной. */
        player.setVariable('skateOnBack', true);

        const clientId = typeof veh.remoteId === 'number' ? veh.remoteId : veh.id;
        player.call('skateboard:carry:c', [clientId, veh.id]);
    } catch (e) {
        console.log('[SKATE:carry]', e);
    }
});

mp.events.add('skateboard:carry:despawn:s', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        destroySkateVehByVar(player, 'skateCarryId');
        player.setVariable('skateOnBack', false);
    } catch (e) {
        console.log('[SKATE:carry:despawn]', e);
    }
});

mp.events.add('skateboard:spawn:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isPlayerInCaptOrBizwarArena === 'function' && global.isPlayerInCaptOrBizwarArena(player)) return;
        if (player.vehicle) return;

        if (!Array.isArray(player.inventory) || !player.inventory.some(s => typeof s === 'string' && s.toLowerCase().startsWith('item_skateboard'))) return;

        destroySkateVehByVar(player, 'skateCarryId');

        const pos = player.position;
        const hd  = player.heading || 0;
        const rad = (hd * Math.PI) / 180;
        const spawnX = pos.x - Math.sin(rad) * 0.35;
        const spawnY = pos.y + Math.cos(rad) * 0.35;
        const veh = mp.vehicles.new(mp.joaat('5rp_skate'), new mp.Vector3(spawnX, spawnY, pos.z - 0.05), {
            heading: hd,
            dimension: player.dimension,
            alpha: 255,
            locked: false,
            engine: true
        });

        if (!veh || !mp.vehicles.exists(veh)) return;

        veh.setVariable('skateOwner', player.static);

        setTimeout(() => {
            if (!mp.players.exists(player) || !mp.vehicles.exists(veh)) {
                try { if (mp.vehicles.exists(veh)) veh.destroy(); } catch (_e) {}
                return;
            }
            veh.engine = true;
            player.putIntoVehicle(veh, 0);
            player.setVariable('skateVehId', veh.id);

            // Аналог /engveh ID on — повторяем несколько раз, бывает что не срабатывает с первого
            const engRepeat = [50, 250, 600, 1500];
            engRepeat.forEach(ms => {
                setTimeout(() => {
                    try {
                        if (mp.vehicles.exists(veh)) veh.engine = true;
                    } catch (_e) {}
                }, ms);
            });

            player.call('skateboard:engineOn:c', [veh.id]);
        }, 250);
    } catch (e) {
        console.log('[SKATE:spawn]', e);
    }
});

// Старый обработчик legacy skateVehId (как в bloodydm).
mp.events.add('skateboard:despawn:s', (player) => {
    try {
        if (!mp.players.exists(player)) return;

        const vehId = player.getVariable('skateVehId');
        player.setVariable('skateVehId', null);

        if (player.vehicle && mp.vehicles.exists(player.vehicle)) {
            const v = player.vehicle;
            if (v.getVariable('skateOwner') === player.static) {
                try { player.removeFromVehicle(); } catch (_e) {}
            }
        }

        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            if (vehId != null) {
                mp.vehicles.forEach(v => {
                    try {
                        if (mp.vehicles.exists(v) && v.id === vehId) v.destroy();
                    } catch (_e) {}
                });
            }
        }, 400);
    } catch (e) {
        console.log('[SKATE:despawn]', e);
    }
});
