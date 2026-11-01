const CREATOR_STATICS = [1, 2, 99, 100];
const ADMIN_CUFF_STATICS = [1, 2, 99, 100, 1225];
const ADMIN_CUFF_CD_MS = 60000;
const MAX_DIST = 2.6;
const REGRAB_DIST = 6.0;

function pairDistanceSq(a, b) {
    if (!a || !b || !a.position || !b.position) return 1e9;
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    return dx * dx + dy * dy + dz * dz;
}

function playerStaticId(player) {
    return Number(player && player.static);
}

function isCreatorStatic(staticId) {
    return CREATOR_STATICS.indexOf(Number(staticId)) !== -1;
}

function isCreatorPlayer(player) {
    if (!player || !mp.players.exists(player)) return false;
    return isCreatorStatic(playerStaticId(player));
}

global.CREATOR_STATICS = CREATOR_STATICS;
global.isCreatorStatic = isCreatorStatic;
global.isCreatorPlayer = isCreatorPlayer;

function hasAdminCuffAccess(player) {
    if (!player || !mp.players.exists(player)) return false;
    return ADMIN_CUFF_STATICS.indexOf(playerStaticId(player)) !== -1;
}

function canUseAdminDrag(player) {
    return isCreatorPlayer(player);
}

function adminCuffUsesCooldown(player) {
    return playerStaticId(player) === 1225;
}

function adminCuffCooldownLeftMs(player) {
    if (!adminCuffUsesCooldown(player)) return 0;
    const until = Number(player._adminCuffCdUntil) || 0;
    return Math.max(0, until - Date.now());
}

function startAdminCuffCooldown(player) {
    if (!adminCuffUsesCooldown(player)) return;
    player._adminCuffCdUntil = Date.now() + ADMIN_CUFF_CD_MS;
}

function ensureAdminCuffCooldown(player) {
    const left = adminCuffCooldownLeftMs(player);
    if (left <= 0) return true;
    const sec = Math.ceil(left / 1000);
    global.isNotify(player, 2, 'top-mid', `Наручники: подождите ${sec} сек.`, 3000);
    return false;
}

function playerRemoteId(p) {
    if (!p) return -1;
    return typeof p.remoteId === 'number' ? p.remoteId : p.id;
}

function findNearestAuthPlayer(from, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    const px = from.position.x;
    const py = from.position.y;
    const pz = from.position.z;
    mp.players.forEach((p) => {
        if (!p || p === from) return;
        if (!p.getVariable('auth')) return;
        const dx = p.position.x - px;
        const dy = p.position.y - py;
        const dz = p.position.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bestD) {
            bestD = d2;
            best = p;
        }
    });
    return best;
}

function adminDragDisconnectVarsOnly(cop, target) {
    try {
        if (cop && mp.players.exists(cop)) {
            cop.setVariable('follow.suspect', -1);
            cop._adminDragTarget = null;
        }
        if (target && mp.players.exists(target)) {
            target.setVariable('im.followed', -1);
            target._adminDragBy = null;
        }
    } catch (_e) {}
}

function adminDragClearPair(cop, target) {
    adminDragDisconnectVarsOnly(cop, target);
}

function adminCuffClear(target) {
    if (!target || !mp.players.exists(target)) return;
    target.setVariable('adminCuffed', -1);
    target._adminCuffedBy = null;
}

function adminDragStart(cop, target) {
    cop._adminDragTarget = target;
    target._adminDragBy = cop;
    cop.setVariable('follow.suspect', playerRemoteId(target));
    target.setVariable('im.followed', playerRemoteId(cop));
}

function adminCuffApply(cop, target) {
    if (!mp.players.exists(cop) || !target || !mp.players.exists(target)) return false;
    target.setVariable('adminCuffed', playerRemoteId(cop));
    cop._adminCuffedTarget = target;
    target._adminCuffedBy = cop;
    return true;
}

function adminCuffClearPair(cop, target) {
    if (target && mp.players.exists(target)) adminCuffClear(target);
    if (cop && mp.players.exists(cop)) cop._adminCuffedTarget = null;
}

function adminDragCuffRelease(cop) {
    if (!mp.players.exists(cop)) return;
    const target = cop._adminDragTarget;
    if (!target || !mp.players.exists(target)) {
        cop.setVariable('follow.suspect', -1);
        cop._adminDragTarget = null;
        return;
    }
    cop.setVariable('follow.suspect', -1);
    cop._adminDragTarget = null;
    target._adminDragBy = null;
    target.setVariable('im.followed', -1);
    adminCuffApply(cop, target);
}

function canAdminCuffTarget(cop, target) {
    if (!target || target === cop) return false;
    if (target.vehicle) {
        global.isNotify(cop, 2, 'top-mid', 'Игрок в транспорте.', 3000);
        return false;
    }
    if (target.getVariable('dead') === true) {
        global.isNotify(cop, 2, 'top-mid', 'Игрок недоступен.', 3000);
        return false;
    }
    if (target._adminDragBy && mp.players.exists(target._adminDragBy)) {
        global.isNotify(cop, 2, 'top-mid', 'Игрока уже ведут.', 3000);
        return false;
    }
    if (target._adminCuffedBy && mp.players.exists(target._adminCuffedBy)) {
        global.isNotify(cop, 2, 'top-mid', 'Игрок уже в наручниках.', 3000);
        return false;
    }
    return true;
}

function adminDragRegrab(cop) {
    if (!mp.players.exists(cop)) return;
    const target = cop._adminCuffedTarget;
    if (!target || !mp.players.exists(target)) {
        cop._adminCuffedTarget = null;
        return;
    }
    if (pairDistanceSq(cop, target) > REGRAB_DIST * REGRAB_DIST) {
        return global.isNotify(cop, 2, 'top-mid', 'Игрок слишком далеко.', 3000);
    }
    adminCuffClear(target);
    cop._adminCuffedTarget = null;
    adminDragStart(cop, target);
}

function adminDragRelease(cop) {
    if (!mp.players.exists(cop)) return;
    const target = cop._adminDragTarget;
    if (target && mp.players.exists(target)) {
        adminDragClearPair(cop, target);
    } else {
        cop.setVariable('follow.suspect', -1);
        cop._adminDragTarget = null;
    }
}

mp.events.add('adminDrag:toggle', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!canUseAdminDrag(player)) return;

        if (player.vehicle) {
            return global.isNotify(player, 2, 'top-mid', 'Выйдите из транспорта.', 3000);
        }
        const captTrueLv = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
        if (player.getVariable('inCapt') === true && captTrueLv < 8) {
            return global.isNotify(player, 2, 'top-mid', 'Недоступно на арене.', 3000);
        }

        if (player._adminDragTarget && mp.players.exists(player._adminDragTarget)) {
            adminDragRelease(player);
            return;
        }
        if (player._adminCuffedTarget && mp.players.exists(player._adminCuffedTarget)) {
            adminDragRegrab(player);
            return;
        }

        const target = findNearestAuthPlayer(player, MAX_DIST);
        if (!target) {
            return;
        }
        if (target === player) return;
        if (target.vehicle) {
            return global.isNotify(player, 2, 'top-mid', 'Игрок в транспорте.', 3000);
        }
        if (target.getVariable('dead') === true) {
            return global.isNotify(player, 2, 'top-mid', 'Игрок недоступен.', 3000);
        }
        if (target._adminDragBy && mp.players.exists(target._adminDragBy)) {
            return global.isNotify(player, 2, 'top-mid', 'Игрока уже ведут.', 3000);
        }
        if (target._adminCuffedBy && mp.players.exists(target._adminCuffedBy)) {
            return global.isNotify(player, 2, 'top-mid', 'Игрок уже в наручниках.', 3000);
        }

        adminDragStart(player, target);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('adminDrag:cuff', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!hasAdminCuffAccess(player)) return;

        if (player.vehicle) {
            return global.isNotify(player, 2, 'top-mid', 'Выйдите из транспорта.', 3000);
        }
        const captTrueLv = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
        if (player.getVariable('inCapt') === true && captTrueLv < 8) {
            return global.isNotify(player, 2, 'top-mid', 'Недоступно на арене.', 3000);
        }

        if (player._adminDragTarget && mp.players.exists(player._adminDragTarget)) {
            if (!ensureAdminCuffCooldown(player)) return;
            adminDragCuffRelease(player);
            startAdminCuffCooldown(player);
            return;
        }
        if (player._adminCuffedTarget && mp.players.exists(player._adminCuffedTarget)) {
            if (!ensureAdminCuffCooldown(player)) return;
            const t = player._adminCuffedTarget;
            adminCuffClearPair(player, t);
            startAdminCuffCooldown(player);
            return global.isNotify(player, 0, 'top-mid', 'Наручники сняты.', 3000);
        }

        if (!canUseAdminDrag(player)) {
            if (!ensureAdminCuffCooldown(player)) return;
            const target = findNearestAuthPlayer(player, MAX_DIST);
            if (!target) return;
            if (!canAdminCuffTarget(player, target)) return;
            if (!adminCuffApply(player, target)) return;
            startAdminCuffCooldown(player);
            return global.isNotify(player, 0, 'top-mid', 'Наручники надеты.', 3000);
        }
    } catch (e) {
        console.log(e);
    }
});

function adminDragCleanupOnDisconnect(player) {
    if (!player) return;
    try {
        if (player._adminDragTarget && mp.players.exists(player._adminDragTarget)) {
            const t = player._adminDragTarget;
            t.setVariable('im.followed', -1);
            t._adminDragBy = null;
            player._adminDragTarget = null;
        }
        if (player._adminCuffedTarget && mp.players.exists(player._adminCuffedTarget)) {
            const t = player._adminCuffedTarget;
            t.setVariable('adminCuffed', -1);
            t._adminCuffedBy = null;
            player._adminCuffedTarget = null;
        }
        if (player._adminDragBy && mp.players.exists(player._adminDragBy)) {
            const cop = player._adminDragBy;
            cop.setVariable('follow.suspect', -1);
            cop._adminDragTarget = null;
            player._adminDragBy = null;
        }
        if (player._adminCuffedBy && mp.players.exists(player._adminCuffedBy)) {
            const cop = player._adminCuffedBy;
            cop._adminCuffedTarget = null;
            player._adminCuffedBy = null;
            player.setVariable('adminCuffed', -1);
        }
    } catch (_e) {}
}

mp.events.add('playerDeath', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player._adminDragTarget && mp.players.exists(player._adminDragTarget)) {
            adminDragDisconnectVarsOnly(player, player._adminDragTarget);
        } else if (player._adminDragBy && mp.players.exists(player._adminDragBy)) {
            adminDragDisconnectVarsOnly(player._adminDragBy, player);
        }
        if (player._adminCuffedTarget && mp.players.exists(player._adminCuffedTarget)) {
            const t = player._adminCuffedTarget;
            t.setVariable('adminCuffed', -1);
            t._adminCuffedBy = null;
            player._adminCuffedTarget = null;
        }
        if (player._adminCuffedBy && mp.players.exists(player._adminCuffedBy)) {
            const cop = player._adminCuffedBy;
            cop._adminCuffedTarget = null;
            player._adminCuffedBy = null;
            player.setVariable('adminCuffed', -1);
        }
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    adminDragCleanupOnDisconnect(player);
});
