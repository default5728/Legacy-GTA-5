/** NPC «Чёрный заработок». */
const YGON_NPC_X = 597.3562;
const YGON_NPC_Y = -1456.1445;
const YGON_NPC_Z = 19.2259;
const YGON_NPC_POS = new mp.Vector3(YGON_NPC_X, YGON_NPC_Y, YGON_NPC_Z);
const YGON_NPC_HEADING = 173.5493;
const YGON_NPC_LABEL_LIFT = 1.15;

global.creatorPedsNew(mp.joaat('s_m_y_dealer_01'), YGON_NPC_POS, {
    dynamic: false,
    invincible: true,
    frozen: true,
    heading: YGON_NPC_HEADING
});

global.creatorLabelsNew('Чёрный заработок (E)', new mp.Vector3(YGON_NPC_POS.x, YGON_NPC_POS.y, YGON_NPC_POS.z + YGON_NPC_LABEL_LIFT), {
    los: false,
    font: 4,
    drawDistance: 12,
    color: [255, 255, 255, 255],
    scale: [0.9, 0.9],
    outline: true,
    outlineColor: [0, 0, 0, 255],
});

const blackpos = YGON_NPC_POS;
/** Только у NPC — не весь спавн. */
const YGON_NPC_INTERACT_RADIUS = 2.5;
let blackshopcolshape = global.creatorShapeSphere(blackpos.x, blackpos.y, blackpos.z, YGON_NPC_INTERACT_RADIUS);

function ygonDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function ygonDistance2d(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function isNearYgonNpcPos(player, maxDist2d) {
    try {
        if (!player || !mp.players.exists(player) || player.dimension !== 0) return false;
        const limit = Number(maxDist2d) || YGON_NPC_INTERACT_RADIUS;
        return ygonDistance2d(player.position, blackpos) <= limit;
    } catch (_e) {
        return false;
    }
}

global.isNearYgonNpcPos = isNearYgonNpcPos;

function ensureNearYgonNpc(player) {
    if (isNearYgonNpcPos(player, YGON_NPC_INTERACT_RADIUS)) return true;
    try {
        player.setVariable('zarabotok', false);
        player.call('closeygon');
    } catch (_e) {}
    isNotify(player, 2, 'top-mid', 'Подойдите к торговцу.', 3000);
    return false;
}

function ygonFinalPosVector(player) {
    const p = player && player.getVariable('ygonfinalpos');
    if (!p) return null;
    return new mp.Vector3(Number(p.x), Number(p.y), Number(p.z));
}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (colshape === blackshopcolshape) {
            if (player.dimension !== 0) return;
            if (!player.getVariable('auth')) return;
            player.setVariable('zarabotok', true);
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
            player.setVariable('zarabotok', false);
            player.call('closeygon');
        }
    } catch (error) {
        console.log(error);
    }
});

/** Сброс залипшего zarabotok после телепорта/респавна вне NPC. */
mp.events.add('playerSpawn', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!isNearYgonNpcPos(player, YGON_NPC_INTERACT_RADIUS + 0.5)) {
            player.setVariable('zarabotok', false);
        }
    } catch (_e) {}
});

const cars = [
    'asbo',
    'blista',
    'brioso',
    'brioso2',
    'club',
    'dilettante',
    'panto',
    'prairie',
    'rhapsody',
    'weevil'
]

const positions = [
    { pos: new mp.Vector3(556.7017211914062, -1900.4112548828125, 24.737226486206055), heading: 122.0865478515625 },
    { pos: new mp.Vector3(-53.442691802978516, -1764.9150390625, 28.98009490966797), heading: 51.92567825317383 },
    { pos: new mp.Vector3(-104.32144927978516, -1412.4073486328125, 29.71206283569336), heading: -172.94090270996094 },
    { pos: new mp.Vector3(102.47760009765625, -1397.327880859375, 29.27623176574707), heading: 139.32656860351562 },
    { pos: new mp.Vector3(327.86126708984375, -1471.3331298828125, 29.771745681762695), heading: -128.1090087890625 },
    { pos: new mp.Vector3(468.3338317871094, -1242.1536865234375, 29.63559913635254), heading: -1.779272437087494 }
];

const positionsfinal = [
    { x: 934.5982055664062, y: -1.5606880187988281, z: 78.76395416259766 },
    { x: 637.2902221679688, y: 255.7347412109375, z: 103.1522216796875 },
    { x: -704.953125, y: -1286.42919921875, z: 5.03801155090332 },
    { x: 735.6707763671875, y: -1192.328369140625, z: 24.269489288330078 },
    { x: 1308.1861572265625, y: -535.4545288085938, z: 71.2936019897461 }
];

let list = {};
const ygonBlipIntervals = new Map();

function ygonPlayerOk(p) {
    try { return !!(p && mp.players.exists(p)); } catch (_e) { return false; }
}

function ygonVehOk(v) {
    try { return !!(v && mp.vehicles.exists(v)); } catch (_e) { return false; }
}

function getYgonVehicle(player) {
    if (!player) return null;
    const v = player._ygonVeh;
    return ygonVehOk(v) ? v : null;
}

function setYgonVehicle(player, veh) {
    if (!player) return;
    player._ygonVeh = ygonVehOk(veh) ? veh : null;
}

function clearYgonBlipByStatic(staticId) {
    if (staticId == null) return;
    const iv = ygonBlipIntervals.get(staticId);
    if (iv) {
        try { clearInterval(iv); } catch (_e) {}
        ygonBlipIntervals.delete(staticId);
    }
}

function ygonNotifyFib(text, exceptPlayer) {
    mp.players.forEach((otherPlayer) => {
        try {
            if (!ygonPlayerOk(otherPlayer)) return;
            if (exceptPlayer && otherPlayer === exceptPlayer) return;
            if (otherPlayer.getVariable('auth') && Number(otherPlayer.getVariable('fraction')) === 6) {
                isNotify(otherPlayer, 1, 'top-mid', text, 5000);
            }
        } catch (_e) {}
    });
}

function ygonRemoveFibBlips(staticId) {
    if (staticId == null) return;
    mp.players.forEach((otherPlayer) => {
        try {
            if (!ygonPlayerOk(otherPlayer)) return;
            if (otherPlayer.getVariable('auth') && Number(otherPlayer.getVariable('fraction')) === 6) {
                otherPlayer.call('quest:ygon:removeBlip', [staticId]);
            }
        } catch (_e) {}
    });
}

const YGON_HUD_REWARD = 250000;

function ygonHudClear(player) {
    if (!player || !mp.players.exists(player)) return;
    try { player.call('hud:ygonQuest:clear:c'); } catch (_e) {}
}

function ygonHudSet(player, phase, opts) {
    if (!player || !mp.players.exists(player)) return;
    const o = opts || {};
    const rewardFmt = typeof global.formatnum1 === 'function'
        ? global.formatnum1(YGON_HUD_REWARD)
        : String(YGON_HUD_REWARD);
    const bodies = {
        find: `Доберитесь до авто по метке и сядьте за руль. Награда: ${rewardFmt}$.`,
        deliver: 'Подъедьте к точке сдачи на GPS — авто сдастся автоматически.',
        warn: 'Вы вышли из машины. Вернитесь за руль, иначе задание провалится.'
    };
    const payload = {
        phase: phase || 'find',
        body: o.body || bodies[phase] || bodies.deliver,
        timerSec: Math.max(0, parseInt(o.timerSec, 10) || 0)
    };
    try { player.call('hud:ygonQuest:c', [JSON.stringify(payload)]); } catch (_e) {}
}

mp.events.add('quest:ygon:start:server', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!ensureNearYgonNpc(player)) return;
        player.call('closeygon');
        if (player.getVariable('ygon')) return isNotify(player, 2, "top-mid", `У вас уже присутствует активный квест.`, 3000);;
        if (player.getVariable('fraction') == 6) return isNotify(player, 2, "top-mid", `Взять квест на угон нельзя за FIB.`, 3000);;

        const lastQuestTime = list[player.static]?.lastQuestTime;
        const currentTime = Date.now();

        if (lastQuestTime && currentTime - lastQuestTime < 1800000) {
            const timeLeft = 1800000 - (currentTime - lastQuestTime);
            const minutesLeft = Math.ceil(timeLeft / 60000);
            return isNotify(player, 2, "top-mid", `Вы не можете начать квест. Кулдаун: ${minutesLeft} минут(ы).`, 3000);
        }

        global.sendDiscordLog(`Взятие квеста на угон!\n\nИгрок - [#${player.static}] ${player.login}`, '1534361745244557363')

        list[player.static] = { lastQuestTime: currentTime };

        player.setVariable('ygon', player.static);
        player._ygonActive = true;
        const randomcar = cars[Math.floor(Math.random() * cars.length)];
        const randompos = positions[Math.floor(Math.random() * positions.length)];
        const randomfinal = positionsfinal[Math.floor(Math.random() * positionsfinal.length)];

        player.setVariable('ygonfinalpos', randomfinal);

        const veh = mp.vehicles.new(mp.joaat(randomcar), randompos.pos, {
            heading: randompos.heading,
            numberPlate: global.flowVehiclePlate(),
            alpha: 255,
            locked: true,
            engine: false,
            dimension: player.dimension
        });

        if (veh && mp.vehicles.exists(veh)) {
            veh.setColor(111, 111);
            veh.setVariable('owner', player.static);
            setYgonVehicle(player, veh);
            veh.setVariable('ygon', true);
        }

        player.call('sound:client', [3]);

        isNotify(player, 3, 'top-mid', 'Задание принято.', 5000);
        isNotify(player, 1, 'top-mid', 'Доберитесь до авто по метке и сядьте за руль.', 5000);

        player.call('quest:ygon:blip', ['start', true, randompos.pos]);
        ygonHudSet(player, 'find');
    } catch (error) {
        console.log(error);
    }
});

function clearYgonBlipInterval(veh) {
    try {
        if (veh && veh._ygonBlipInterval) {
            clearInterval(veh._ygonBlipInterval);
            veh._ygonBlipInterval = null;
        }
    } catch (_e) {}
}

function completeYgonQuest(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('ygon')) return false;

    const veh = getYgonVehicle(player);
    if (!veh) return false;

    const finalPos = ygonFinalPosVector(player);
    let vehPos = null;
    try { vehPos = veh.position; } catch (_e) { return false; }
    let inVeh = false;
    try { inVeh = !!(player.vehicle && player.vehicle === veh); } catch (_e) { inVeh = false; }
    if (!inVeh || !finalPos || !vehPos || ygonDistance2d(vehPos, finalPos) > 10.0) {
        return false;
    }

    const staticId = player.static;
    clearYgonBlipInterval(veh);
    clearYgonBlipByStatic(staticId);
    global.sendDiscordLog(`Завершение квеста на угон!\n\nИгрок - [#${player.static}] ${player.login}`, '1534361745244557363');

    player.setVariable('ygon', null);
    player._ygonActive = false;
    setYgonVehicle(player, null);
    player.setVariable('finalygon', false);
    global.deleteVehTwo(veh);

    player.call('quest:ygon:blip', ['start', false, null]);
    player.call('quest:ygon:blip', ['final', false, null]);
    player.call('quest:ygon:createmarker', [null, false]);
    player.call('closeygon');
    global.givemoney(player, YGON_HUD_REWARD);

    isNotify(player, 3, 'top-mid', `+${global.formatnum1(YGON_HUD_REWARD)}$`, 5000);
    player.call('sound:client', [3]);
    if (typeof global.onNewbieYgonDelivered === 'function') {
        global.onNewbieYgonDelivered(player);
    }
    ygonHudClear(player);

    ygonNotifyFib('Угнанная машина исчезла с радаров.. Похоже от неё избавились');
    ygonRemoveFibBlips(staticId);
    return true;
}

function tryAutoDeliverYgon(player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        completeYgonQuest(player);
    } catch (error) {
        console.log(error);
    }
}

mp.events.add('setvaryf', (player, toggle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (toggle === true || toggle === 'true' || toggle === 1) {
            tryAutoDeliverYgon(player);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('quest:ygon:final:server', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!completeYgonQuest(player)) {
            isNotify(player, 2, 'top-mid', 'Подъедьте к точке сдачи на угнанном авто.', 3000);
        }
    } catch (error) {
        console.log(error);
    }
});

let timers = new Map();

mp.events.add('playerEnterVehicle', (player, vehicle, seat) => {
    try {
        if (!vehicle || !player || !mp.vehicles.exists(vehicle) || !mp.players.exists(player) || vehicle.getVariable('deleted')) return;

        const playerCar = getYgonVehicle(player);
        if (vehicle.getVariable('ygon') && vehicle !== playerCar && seat === 0) {
            try { player.removeFromVehicle(); } catch (_e) {}
            isNotify(player, 2, "top-mid", `Это угнанный автомобиль другого игрока!`, 3000);
            return;
        }
        if (vehicle === playerCar && seat === 0) {
            if (timers.has(player.static)) {
                clearTimeout(timers.get(player.static));
                timers.delete(player.static);
                isNotify(player, 1, "top-mid", `Таймер отмены задания отменён.`, 5000);
                if (vehicle.getVariable('seat') === true) {
                    ygonHudSet(player, 'deliver');
                }
            }
        }
        if (vehicle === playerCar && mp.vehicles.exists(vehicle) && seat === 0 && vehicle.getVariable('seat') !== true) {
            player.call('quest:ygon:blip', ['start', false, null]);
            isNotify(player, 3, 'top-mid', 'Подъедьте к точке сдачи на GPS — сдача автоматическая.', 10000);
            isNotify(player, 1, "top-mid", `Учтите, полиции отправлено уведомление и транслируется ваше местоположение каждые 5 секунд.`, 5000);
            
            const randomfinal = player.getVariable('ygonfinalpos');
            if (!randomfinal) return;

            player.call('quest:ygon:blip', ['final', true, randomfinal]);
            player.call('setwaypoint', [randomfinal.x, randomfinal.y]);
            player.call('quest:ygon:createmarker', [randomfinal, true])

            vehicle.setVariable('seat', true);
            ygonHudSet(player, 'deliver');

            ygonNotifyFib('Новый угон! Машина транслируется на карте, тот кто убьёт угонщика получит 100.000$', player);
            mp.players.forEach((otherPlayer) => {
                try {
                    if (!ygonPlayerOk(otherPlayer) || otherPlayer === player) return;
                    if (otherPlayer.getVariable('auth') && Number(otherPlayer.getVariable('fraction')) === 6) {
                        otherPlayer.call('sound:client', [1]);
                    }
                } catch (_e) {}
            });

            const blipStatic = player.static;
            clearYgonBlipByStatic(blipStatic);
            const interval = setInterval(() => {
                try {
                    if (!ygonVehOk(vehicle) || !ygonPlayerOk(player) || !player.getVariable('ygon')) {
                        clearInterval(interval);
                        ygonBlipIntervals.delete(blipStatic);
                        ygonRemoveFibBlips(blipStatic);
                        return;
                    }

                    let pos = null;
                    try { pos = vehicle.position; } catch (_e) { pos = null; }
                    if (!pos) return;

                    mp.players.forEach((otherPlayer) => {
                        try {
                            if (!ygonPlayerOk(otherPlayer)) return;
                            if (otherPlayer.getVariable('auth') && Number(otherPlayer.getVariable('fraction')) === 6) {
                                otherPlayer.call('quest:ygon:updateBlip', [pos, blipStatic]);
                            }
                        } catch (_e) {}
                    });
                } catch (_e) {
                    try { clearInterval(interval); } catch (_e2) {}
                    ygonBlipIntervals.delete(blipStatic);
                }
            }, 5000);
            ygonBlipIntervals.set(blipStatic, interval);
            try {
                vehicle._ygonBlipInterval = interval;
            } catch (_e) {}
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitVehicle', (player, vehicle) => {
    try {
        if (!vehicle || !player || !mp.players.exists(player) || !mp.vehicles.exists(vehicle) || vehicle.getVariable('deleted')) return;
        if (player.getVariable('testdriveone') && vehicle.getVariable('testdriveone')) return mp.events.call('EndTestDriveVehicle', player);
        if (player.getVariable('testdrivetwo') && vehicle.getVariable('testdrivetwo')) return mp.events.call('autosalon:testdrive:final:s', player);

        const playerCar = getYgonVehicle(player);
        if (vehicle.getVariable('ygon') && vehicle === playerCar && player.getVariable('ygon')) {
            isNotify(player, 1, "top-mid", `Если вы не вернётесь в машину в течении 1 минуты квест завершится.`, 5000);
            ygonHudSet(player, 'warn', { timerSec: 60 });
            const timedel = setTimeout(() => {
                try {
                    if (!ygonPlayerOk(player)) return;
                    const stillCar = getYgonVehicle(player);
                    let inCar = false;
                    try { inCar = !!(player.vehicle && player.vehicle === stillCar); } catch (_e) { inCar = false; }
                    if (!inCar) {
                        failQuest(player);
                        ygonNotifyFib('Угнанная машина исчезла с радаров.. Похоже её утеряли');
                    }
                } catch (_e) {}
            }, 60000);
            timers.set(player.static, timedel);
        }
    } catch (error) {
        console.log(error);
    }
});

function failQuest(player) {
    try {
        if (!ygonPlayerOk(player)) return;
        const staticId = player.static;
        const veh = getYgonVehicle(player);
        clearYgonBlipByStatic(staticId);
        if (ygonVehOk(veh)) {
            clearYgonBlipInterval(veh);
            setYgonVehicle(player, null);
            global.deleteVehTwo(veh);
        } else {
            setYgonVehicle(player, null);
        }

        if (staticId != null && timers.has(staticId)) {
            try { clearTimeout(timers.get(staticId)); } catch (_e) {}
            timers.delete(staticId);
        }

        try {
            global.sendDiscordLog(`Провал квеста на угон!\n\nИгрок - [#${player.static}] ${player.login}`, '1534361745244557363');
        } catch (_e) {}

        player._ygonActive = false;
        try { player.call('quest:ygon:blip', ['start', false, null]); } catch (_e) {}
        try { player.call('quest:ygon:blip', ['final', false, null]); } catch (_e) {}
        try { player.call('quest:ygon:createmarker', [null, false]); } catch (_e) {}
        try { player.setVariable('ygon', null); } catch (_e) {}
        ygonHudClear(player);
        isNotify(player, 2, "top-mid", "Квест на угон машины провален.", 5000);
        ygonRemoveFibBlips(staticId);
    } catch (error) {
        console.log(error);
    }
}

mp.events.add("playerQuit", (player) => {
    try {
        const staticId = player && player.static;
        const veh = player && player._ygonVeh;
        const hadYgon = !!(player && (player._ygonActive || player._ygonVeh));
        if (player) {
            player._ygonVeh = null;
            player._ygonActive = false;
        }
        clearYgonBlipByStatic(staticId);
        if (staticId != null && timers.has(staticId)) {
            try { clearTimeout(timers.get(staticId)); } catch (_e) {}
            timers.delete(staticId);
        }
        if (ygonVehOk(veh)) {
            try { veh.setVariable('deleted', true); } catch (_e) {}
            try {
                if (ygonVehOk(veh)) veh.destroy();
            } catch (_e) {}
        }
        if (hadYgon) {
            ygonNotifyFib('Угнанная машина исчезла с радаров.. Похоже её перехватили бандиты');
            ygonRemoveFibBlips(staticId);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('vehicleDeath', (vehicle) => {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle) || vehicle.getVariable('deleted')) return;

        if (vehicle.getVariable('testdriveone') || vehicle.getVariable('testdrivetwo') || vehicle.getVariable('fractioncar') === true) return;

        const ownerId = vehicle.getVariable('owner');
        const player = mp.players.toArray().find(p => p && mp.players.exists(p) && p.static == ownerId);
        if (vehicle.getVariable('ygon')) {
            if (!ygonPlayerOk(player) || !player.getVariable('ygon')) {
                clearYgonBlipInterval(vehicle);
                try { vehicle.setVariable('deleted', true); } catch (_e) {}
                try { if (ygonVehOk(vehicle)) vehicle.destroy(); } catch (_e) {}
                return;
            }
            failQuest(player);
        } else {
            if (!ygonPlayerOk(player)) return;
            if (ygonVehOk(vehicle)) {
                player.carActive = null;
                global.deleteVehTwo(vehicle);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add("playerDeath", (player, reason, killer) => {
    try {
        if (!mp.players.exists(player)) return;
        if (global.normalizePlayerDeathArgs) {
            const n = global.normalizePlayerDeathArgs(reason, killer);
            killer = n.killer;
        }
        killer = global.resolveDeathKiller(player, killer);

        const hasYgon = !!(player._ygonActive || player.getVariable('ygon'));
        if (!hasYgon) return;

        const veh = getYgonVehicle(player);
        if (ygonPlayerOk(killer) && killer.getVariable('fraction') == 6 && ygonVehOk(veh) && player.getVariable('auth') && killer.getVariable('auth')) {
            const staticId = player.static;
            clearYgonBlipByStatic(staticId);
            if (ygonVehOk(veh)) {
                clearYgonBlipInterval(veh);
                setYgonVehicle(player, null);
                global.deleteVehTwo(veh);
            }

            global.sendDiscordLog(`Провал квеста на угон!\n\nИгрок - [#${player.static}] ${player.login}`, '1534361745244557363')

            player._ygonActive = false;
            try { player.call('quest:ygon:blip', ['start', false, null]); } catch (_e) {}
            try { player.call('quest:ygon:blip', ['final', false, null]); } catch (_e) {}
            try { player.call('quest:ygon:createmarker', [null, false]); } catch (_e) {}
            try { player.setVariable('ygon', null); } catch (_e) {}
            ygonHudClear(player);
            isNotify(player, 2, "top-mid", "Квест на угон машины провален.", 5000);

            global.givemoney(killer, 100000);
            isNotify(killer, 3, "top-mid", "Вы убили угонщика. +100.000$", 5000);
            killer.call('sound:client', [3]);

            ygonNotifyFib(`Угонщика ${player.login} убил ваш напарник ${killer.login}.`, killer);
            ygonRemoveFibBlips(staticId);
        } else {
            failQuest(player);
        }
    } catch (error) {
        console.log(error);
    }
});
