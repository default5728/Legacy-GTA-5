'use strict';

/** Точка auth-лобби — как veprais RP (setStartCam). */
global.AUTH_LOBBY_BASE = {
    x: 809.11414,
    y: -19.974813,
    z: 97.08313
};
global.AUTH_LOBBY_HEADING = -97.68315;
global.AUTH_LOBBY_OFFSET_STEP = 1.15;
global.AUTH_LOBBY_OCCUPY_RADIUS = 1.1;

function authLobbyPerpOffset(slot, headingDeg) {
    const rad = (Number(headingDeg) * Math.PI) / 180;
    const perpX = Math.cos(rad + Math.PI / 2);
    const perpY = Math.sin(rad + Math.PI / 2);
    const step = global.AUTH_LOBBY_OFFSET_STEP;
    return {
        x: global.AUTH_LOBBY_BASE.x + perpX * step * slot,
        y: global.AUTH_LOBBY_BASE.y + perpY * step * slot,
        z: global.AUTH_LOBBY_BASE.z
    };
}

function authLobbyPosNear(base, otherPos) {
    if (!otherPos) return false;
    const dx = Number(otherPos.x) - Number(base.x);
    const dy = Number(otherPos.y) - Number(base.y);
    const dz = Number(otherPos.z) - Number(base.z);
    const r = global.AUTH_LOBBY_OCCUPY_RADIUS;
    return dx * dx + dy * dy + dz * dz < r * r;
}

/** Слот 0 — центр; дальше чередуем влево/вправо относительно heading. */
global.resolveAuthLobbySpawnPos = function resolveAuthLobbySpawnPos(headingDeg, isOccupiedFn) {
    const heading = Number.isFinite(Number(headingDeg)) ? Number(headingDeg) : global.AUTH_LOBBY_HEADING;
    const slots = [0, -1, 1, -2, 2, -3, 3, -4, 4];
    const occupied = typeof isOccupiedFn === 'function' ? isOccupiedFn : () => false;

    for (let i = 0; i < slots.length; i++) {
        const pos = authLobbyPerpOffset(slots[i], heading);
        if (!occupied(pos)) {
            return { x: pos.x, y: pos.y, z: pos.z, heading };
        }
    }

    return {
        x: global.AUTH_LOBBY_BASE.x,
        y: global.AUTH_LOBBY_BASE.y,
        z: global.AUTH_LOBBY_BASE.z,
        heading
    };
};

global.__authLobbySpawn = null;

global.getAuthLobbySpawn = function getAuthLobbySpawn() {
    if (global.__authLobbySpawn && Number.isFinite(global.__authLobbySpawn.x)) {
        return global.__authLobbySpawn;
    }

    try {
        const lp = mp.players.local;
        const dim = lp ? lp.dimension : 0;
        return global.resolveAuthLobbySpawnPos(global.AUTH_LOBBY_HEADING, (pos) => {
            let busy = false;
            mp.players.forEachInStreamRange((p) => {
                if (!p || p === lp) return;
                if (p.dimension !== dim) return;
                if (authLobbyPosNear(pos, p.position)) busy = true;
            });
            return busy;
        });
    } catch (_e) {
        return {
            x: global.AUTH_LOBBY_BASE.x,
            y: global.AUTH_LOBBY_BASE.y,
            z: global.AUTH_LOBBY_BASE.z,
            heading: global.AUTH_LOBBY_HEADING
        };
    }
};

mp.events.add('authLobbySpawnApply', (x, y, z, heading) => {
    global.__authLobbySpawn = {
        x: Number(x),
        y: Number(y),
        z: Number(z),
        heading: Number.isFinite(Number(heading)) ? Number(heading) : global.AUTH_LOBBY_HEADING
    };
});
