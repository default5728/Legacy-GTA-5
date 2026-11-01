'use strict';

const DRONE_WORLD_MODEL = 'ch_prop_casino_drone_02a';
const DRONE_COOLDOWN_MS = 30 * 60 * 1000;
const DRONE_MAX_SESSION_MS = 2 * 60 * 1000;
const DRONE_DAMAGE_BLOCK_MS = 5 * 1000;

/** @type {Map<number, number>} static → timestamp until next use */
const droneCooldownUntil = new Map();

function fastSlotWeaponHashFromPlayer(player) {
    try {
        const slot = player.getVariable('activeWeaponSlot');
        if (slot === null || slot === undefined || slot < 0 || !Array.isArray(player.fastSlots)) return 0;
        const item = player.fastSlots[slot];
        if (!item) return 0;
        const base = String(item).split('(')[0].trim();
        if (!base.startsWith('weapon_')) return 0;
        return (mp.joaat(base) | 0) >>> 0;
    } catch (_e) {
        return 0;
    }
}

function destroyDroneWorldObject(player) {
    if (!player || !player._droneWorldObj) return;
    try {
        if (mp.players.exists(player)) player.call('drone:worldObjDestroyed', []);
    } catch (_eCall) {}
    try {
        if (mp.objects.exists(player._droneWorldObj)) player._droneWorldObj.destroy();
    } catch (_e) {}
    player._droneWorldObj = null;
}

function spawnDroneWorldObject(player, x, y, z, heading) {
    destroyDroneWorldObject(player);
    try {
        const obj = global.creatorObjectsNew(mp.joaat(DRONE_WORLD_MODEL), new mp.Vector3(x, y, z), {
            rotation: new mp.Vector3(0, 0, Number(heading) || 0),
            dimension: player.dimension
        });
        if (!obj) return null;
        try {
            obj.setVariable('droneOwnerStatic', player.static);
            obj.alpha = 255;
        } catch (_eVar) {}
        player._droneWorldObj = obj;
        try {
            player.call('drone:worldObjSpawned', [obj.id]);
        } catch (_eCall) {}
        return obj;
    } catch (_e) {
        return null;
    }
}

function droneHideBodyWeaponsStart(player) {
    if (!mp.players.exists(player)) return;
    player._droneHideBodyWeapons = true;
    if (typeof global.syncWeaponBodyPlayer === 'function') global.syncWeaponBodyPlayer(player, 0);
}

function droneHideBodyWeaponsEnd(player) {
    if (!mp.players.exists(player) || player._droneHideBodyWeapons !== true) return;
    player._droneHideBodyWeapons = false;
    if (typeof global.syncWeaponBodyPlayer === 'function') {
        global.syncWeaponBodyPlayer(player, fastSlotWeaponHashFromPlayer(player));
    }
}

function clearDroneSessionTimer(player) {
    if (!player) return;
    if (player._droneSessionTimer) {
        try { clearTimeout(player._droneSessionTimer); } catch (_e) {}
        player._droneSessionTimer = null;
    }
}

function droneStaticKey(player) {
    const st = Number(player && player.static);
    return Number.isFinite(st) && st > 0 ? st : 0;
}

function getDroneStartDenyReason(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return 'Нельзя.';
    if (player.getVariable('droneActive') === true) return 'Дрон уже активен.';
    const now = Date.now();
    const dmgUntil = Number(player._droneDamageBlockUntil) || 0;
    if (now < dmgUntil) {
        const sec = Math.max(1, Math.ceil((dmgUntil - now) / 1000));
        return `После получения урона дрон недоступен ещё ${sec} сек.`;
    }
    const st = droneStaticKey(player);
    const cdUntil = st ? (Number(droneCooldownUntil.get(st)) || 0) : (Number(player._droneCooldownUntil) || 0);
    if (now < cdUntil) {
        const leftMs = cdUntil - now;
        const mins = Math.floor(leftMs / 60000);
        const secs = Math.ceil((leftMs % 60000) / 1000);
        if (mins > 0) return `Дрон можно использовать раз в 30 мин. Осталось ${mins} мин. ${secs} сек.`;
        return `Дрон можно использовать раз в 30 мин. Осталось ${secs} сек.`;
    }
    return null;
}

function markDroneCombatBlock(player) {
    if (!player || !mp.players.exists(player)) return;
    player._droneDamageBlockUntil = Date.now() + DRONE_DAMAGE_BLOCK_MS;
}

function startDroneSessionWatch(player) {
    clearDroneSessionTimer(player);
    if (!player || !mp.players.exists(player)) return;
    player._droneSessionTimer = setTimeout(() => {
        try {
            if (!mp.players.exists(player)) return;
            if (player.getVariable('droneActive') !== true) return;
            if (typeof global.isNotify === 'function') {
                global.isNotify(player, 2, 'top-mid', 'Время дрона истекло (2 мин).', 3500);
            }
            forceEndDroneSession(player);
            try { player.call('drone:forceStop', []); } catch (_e) {}
        } catch (_e2) {}
    }, DRONE_MAX_SESSION_MS);
}

function forceEndDroneSession(player) {
    if (!player || !mp.players.exists(player)) return;
    clearDroneSessionTimer(player);
    player.setVariable('droneActive', false);
    try { player.alpha = 255; } catch (_a) {}
    destroyDroneWorldObject(player);
    droneHideBodyWeaponsEnd(player);
    if (typeof global.acAllowMovement === 'function') {
        global.acAllowMovement(player, 8000, 'drone-off');
    }
}

mp.events.add('drone:requestStart', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const deny = getDroneStartDenyReason(player);
        if (deny) {
            if (typeof global.isNotify === 'function') global.isNotify(player, 2, 'top-mid', deny, 3500);
            try { player.call('drone:startDenied', [deny]); } catch (_e) {}
            return;
        }
        player._droneStartGrantedUntil = Date.now() + 8000;
        try { player.call('drone:startOk', []); } catch (_e2) {}
    } catch (e) {
        console.log('[drone:requestStart]', e.message || e);
    }
});

mp.events.add('drone:setActive', (player, active, ex, ey, ez, heading) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const on = active === true || active === 1 || active === 'true';

        if (on) {
            const deny = getDroneStartDenyReason(player);
            const grantedUntil = Number(player._droneStartGrantedUntil) || 0;
            if (deny || Date.now() > grantedUntil) {
                if (deny && typeof global.isNotify === 'function') {
                    global.isNotify(player, 2, 'top-mid', deny, 3500);
                }
                forceEndDroneSession(player);
                try { player.call('drone:forceStop', []); } catch (_e) {}
                return;
            }
            player._droneStartGrantedUntil = 0;
            const st = droneStaticKey(player);
            const cdUntil = Date.now() + DRONE_COOLDOWN_MS;
            if (st) droneCooldownUntil.set(st, cdUntil);
            player._droneCooldownUntil = cdUntil;

            player.setVariable('droneActive', true);
            try { player.alpha = 0; } catch (_alpha) {}
            if (typeof global.acAllowMovement === 'function') {
                global.acAllowMovement(player, DRONE_MAX_SESSION_MS + 10000, 'drone-on');
            }
            if (typeof global.touchNoclipGrace === 'function') {
                try { global.touchNoclipGrace(player); } catch (_g) {}
            }
            const x = Number(ex);
            const y = Number(ey);
            const z = Number(ez);
            if ([x, y, z].every(Number.isFinite)) {
                player.position = new mp.Vector3(x, y, z);
                spawnDroneWorldObject(player, x, y, z, heading);
            }
            droneHideBodyWeaponsStart(player);
            startDroneSessionWatch(player);
            return;
        }

        clearDroneSessionTimer(player);
        player.setVariable('droneActive', false);
        try { player.alpha = 255; } catch (_alpha2) {}
        if (typeof global.acAllowMovement === 'function') {
            global.acAllowMovement(player, 8000, 'drone-off');
        }
        if (typeof global.touchNoclipGrace === 'function') {
            try { global.touchNoclipGrace(player); } catch (_g2) {}
        }
        destroyDroneWorldObject(player);
        droneHideBodyWeaponsEnd(player);
        const x = Number(ex);
        const y = Number(ey);
        const z = Number(ez);
        if ([x, y, z].every(Number.isFinite)) {
            player.position = new mp.Vector3(x, y, z);
        }
    } catch (error) {
        console.log('[drone:setActive]', error.message || error);
    }
});

mp.events.add('drone:syncPos', (player, x, y, z, heading) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('droneActive') !== true) return;
        if (typeof global.touchNoclipGrace === 'function') {
            try { global.touchNoclipGrace(player); } catch (_g) {}
        }
        const px = Number(x);
        const py = Number(y);
        const pz = Number(z);
        if (![px, py, pz].every(Number.isFinite)) return;
        player.position = new mp.Vector3(px, py, pz);
        const obj = player._droneWorldObj;
        if (obj && mp.objects.exists(obj)) {
            obj.position = new mp.Vector3(px, py, pz);
            const rz = Number(heading);
            if (Number.isFinite(rz)) obj.rotation = new mp.Vector3(0, 0, rz);
        }
    } catch (error) {
        console.log('[drone:syncPos]', error.message || error);
    }
});

mp.events.add('playerDamage', (player, healthLoss, armorLoss) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl <= 0 && al <= 0) return;
        markDroneCombatBlock(player);
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        clearDroneSessionTimer(player);
        if (!mp.players.exists(player)) return;
        destroyDroneWorldObject(player);
        player.setVariable('droneActive', false);
        player._droneHideBodyWeapons = false;
    } catch (_e) {}
});
