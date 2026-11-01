const blipsData = [
    { sprite: 672, position: new mp.Vector3(597.3562, -1456.1445, 19.2259), name: 'Чёрный заработок', color: 7 },
    { sprite: 84, position: new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875), name: 'East Side Ballas', color: 7 },
    { sprite: 84, position: new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168), name: 'The Families', color: 43 },
    { sprite: 84, position: new mp.Vector3(924.3528442382812, -1567.64501953125, 30.814775466918945), name: 'Bloods Street Gang', color: 6 },
    { sprite: 84, position: new mp.Vector3(846.9677124023438, -2332.51416015625, 30.336109161376953), name: 'Los Santos Vagos', color: 5 },
    { sprite: 84, position: new mp.Vector3(1386.5477294921875, -2072.5537109375, 51.99674606323242), name: 'Marabunta Grande', color: 18 },
    { sprite: 88, position: new mp.Vector3(442.406982421875, -982.6343994140625, 30.689603805541992), name: 'FIB', color: 50 },
    { sprite: 313, position: new mp.Vector3(21.490087509155273, -1106.705810546875, 29.797033309936523), name: 'Магазин оружия', color: 4 },
    { sprite: 313, position: new mp.Vector3(810.494873046875, -2157.57763671875, 29.619020462036133), name: 'Магазин оружия', color: 4 },
    { sprite: 73, position: new mp.Vector3(79.54159545898438, -1391.4171142578125, 0), name: 'Магазин одежды', color: 4 },
    { sprite: 73, position: new mp.Vector3(423.36865234375, -809.3922729492188, 29.491119384765625), name: 'Премиальный магазин одежды', color: 4 },
    { sprite: 366, position: new mp.Vector3(-199.210693359375, -30.50386619567871, 50.68611526489258), name: 'Spectrumi', color: 0 },
    // Каблук — блип создаётся в kabluk_bar_shop.js
    { sprite: 140, position: new mp.Vector3(296.0428771972656, -1714.01416015625, 29.17578887939453), name: 'Чёрный Рынок', color: 4 },
    { sprite: 71, position: new mp.Vector3(133.59059143066406, -1709.515869140625, 29.291629791259766), name: 'Барбершоп', color: 4 },
    { sprite: 225, position: new mp.Vector3(-38.720848083496094, -1109.891845703125, 25.55), name: 'Автосалон', color: 4 },
    { sprite: 76, position: new mp.Vector3(-115.98319244384766, -604.94091796875, 36.28074645996094), name: 'Аркадиус', color: 3 },
    { sprite: 61, position: new mp.Vector3(342.1249084472656, -1397.3992919921875, 32.50934982299805), name: 'EMS', color: 1 },
    { sprite: 371, position: new mp.Vector3(-423.53943, -2728.228, 6.000214), name: 'Порт', color: 4 },
    { sprite: 566, position: new mp.Vector3(142.4187774658203, -377.2091369628906, 43.25703811645508), name: 'Стройка', color: 0 },
    { sprite: 75, position: new mp.Vector3(1322.986572265625, -1651.230712890625, 52.27501678466797), name: 'Тату салон', color: 0 }
];

blipsData.forEach(blip => {
    mp.blips.new(blip.sprite, blip.position, {
        name: blip.name,
        color: blip.color,
        shortRange: true,
        scale: 1.0
    });
});

const positionm = new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875, 30);
const positionk = new mp.Vector3(-38.720848083496094, -1109.891845703125, 25.55);
const positionkk = new mp.Vector3(-38.720848083496094, -1109.891845703125, 26);

const TREVORKA_ENTER = new mp.Vector3(335.4120, -1403.5414, 32.5088);
const TREVORKA_EXIT = new mp.Vector3(1132.2098, 3032.2878, 40.5342);
const TREVORKA_EXIT_HEADING = -93.8302;

//LABELS
const textLabelk = global.creatorLabelsNew('Автосалон (E)', positionkk, {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 5,
    scale: [1.2, 1.2],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});
const markerk = global.creatorMarkersNew(1, positionk, 2, {
    color: [255, 255, 255, 255],
    visible: true,
    dimension: 0
});
global.creatorLabelsNew('Телепорт на треворку (E)', new mp.Vector3(TREVORKA_ENTER.x, TREVORKA_ENTER.y, TREVORKA_ENTER.z + 0.3), {
    font: 4,
    color: [255, 255, 255, 255],
    drawDistance: 12,
    scale: [1.45, 1.45],
    outline: true,
    outlineColor: [0, 0, 0, 255]
});
const markerTrevor = global.creatorMarkersNew(1, new mp.Vector3(TREVORKA_ENTER.x, TREVORKA_ENTER.y, TREVORKA_ENTER.z - 1), 2, {
    color: [220, 38, 38, 120],
    visible: true,
    dimension: 0
});
const colshapek = global.creatorShapeSphere(positionk.x, positionk.y, positionk.z, 1.5);
const colTrevor = global.creatorShapeSphere(TREVORKA_ENTER.x, TREVORKA_ENTER.y, TREVORKA_ENTER.z, 2.6);

function isPlayerNearTrevorkaEnter(player, maxDist) {
    try {
        if (!mp.players.exists(player)) return false;
        const pos = player.position;
        const dx = pos.x - TREVORKA_ENTER.x;
        const dy = pos.y - TREVORKA_ENTER.y;
        const dz = pos.z - TREVORKA_ENTER.z;
        const lim = maxDist != null ? maxDist : 3.2;
        return (dx * dx + dy * dy + dz * dz) <= (lim * lim);
    } catch (_e) {
        return false;
    }
}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (colshape === colshapek) {
            if (!player.getVariable('auth')) return;
            if (player.dimension !== 0) return;
            if (player.vehicle) return;
            player.setVariable('autosalonc', true);
        }
        if (colshape === colTrevor) {
            if (!player.getVariable('auth') || player.dimension !== 0 || player.vehicle) return;
            player.setVariable('trevorc', true);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (colshape === colshapek) {
            if (!player.getVariable('auth')) return;
            player.setVariable('autosalonc', false);
            if (player.dimension === 0) {
                player.call('closeautosalon');
            }
        }
        if (colshape === colTrevor) {
            if (!player.getVariable('auth')) return;
            player.setVariable('trevorc', false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerEnterVehicle', (player, vehicle, seat) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('autosalonc')) {
            player.setVariable('autosalonc', false);
        }
    } catch (_e) {}
});

mp.events.add('teleportPlayer', (player, to) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('jail') === true) return;

        if (to == 'trevorka') {
            const inZone = player.getVariable('trevorc') === true || isPlayerNearTrevorkaEnter(player, 3.5);
            if (!inZone) {
                try { player.call('trevorka:teleport:done', []); } catch (_eD0) {}
                return;
            }
            try { player._acJustTeleportedUntil = Date.now() + 8000; } catch (_eAc) {}
            try { player.setVariable('teleporting', true); } catch (_eTp) {}
            player.dimension = 0;
            player.position = TREVORKA_EXIT;
            player.heading = TREVORKA_EXIT_HEADING;
            try { player.call('trevorka:teleport:done', []); } catch (_eDone) {}
            setTimeout(() => {
                try {
                    if (!mp.players.exists(player)) return;
                    try { player.setVariable('teleporting', false); } catch (_eClr) {}
                    if (typeof global.syncPlayerGreenZoneState === 'function') {
                        global.syncPlayerGreenZoneState(player);
                    }
                } catch (_eGz) {}
            }, 150);
            return;
        }

        if (player.dimension !== 0) return;
    } catch (error) {
        console.log(error);
        try {
            if (mp.players.exists(player)) player.call('trevorka:teleport:done', []);
        } catch (_eFail) {}
    }
});
