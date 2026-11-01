'use strict';

/** Не слетать с мото/питбайка при аренде и личном транспорте (как BloodyDM). */
const KNOCKOFF_NEVER = 1;
const FLAG_NO_WINDSCREEN_EJECT = 32;

function isMotorcycleVehicle(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    try {
        const model = veh.model;
        if (mp.game.vehicle.isThisModelABike(model)) return true;
        if (typeof veh.getClass === 'function' && veh.getClass() === 8) return true;
    } catch (_e) {}
    return false;
}

function applyMotorcycleStayOn(player) {
    if (!player || !player.handle) return;
    try {
        if (typeof player.setCanBeKnockedOffVehicle === 'function') {
            player.setCanBeKnockedOffVehicle(KNOCKOFF_NEVER);
        }
        mp.game.ped.setCanBeKnockedOffVehicle(player.handle, KNOCKOFF_NEVER);
    } catch (_e) {}
    try {
        player.setConfigFlag(FLAG_NO_WINDSCREEN_EJECT, false);
    } catch (_e2) {}
    try {
        mp.game.ped.setCanRagdoll(player.handle, false);
        mp.game.ped.setPedCanRagdollFromPlayerImpact(player.handle, false);
    } catch (_e3) {}
    try {
        mp.game.ped.setPedStayInVehicleWhenJacked(player.handle, true);
    } catch (_e4) {}
}

function restoreMotorcyclePedDefaults(player) {
    if (!player || !player.handle) return;
    try {
        if (typeof player.setCanBeKnockedOffVehicle === 'function') {
            player.setCanBeKnockedOffVehicle(0);
        }
        mp.game.ped.setCanBeKnockedOffVehicle(player.handle, 0);
    } catch (_e) {}
    try {
        mp.game.ped.setCanRagdoll(player.handle, true);
        mp.game.ped.setPedCanRagdollFromPlayerImpact(player.handle, true);
    } catch (_e2) {}
    try {
        mp.game.ped.setPedStayInVehicleWhenJacked(player.handle, false);
    } catch (_e3) {}
}

function tickMotorcycleAnchor() {
    const pl = mp.players.local;
    if (!pl || !pl.getVariable('auth')) return;
    if (pl.getVariable('dead') === true) return;
    const veh = pl.vehicle;
    if (veh && isMotorcycleVehicle(veh)) {
        applyMotorcycleStayOn(pl);
    }
}

mp.events.add('playerEnterVehicle', (vehicle) => {
    if (isMotorcycleVehicle(vehicle)) {
        applyMotorcycleStayOn(mp.players.local);
    }
});

mp.events.add('playerLeaveVehicle', () => {
    restoreMotorcyclePedDefaults(mp.players.local);
});

mp.events.add('render', tickMotorcycleAnchor);
