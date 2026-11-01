'use strict';

/**
 * MetaAC bypass helpers.
 * IMPORTANT: adminlvl alone does NOT bypass — otherwise admins testing cheats see "nothing works".
 * Bypass only real duty modes: noclip/fly/spectate.
 */
function isDutyBypass(player) {
    try {
        if (!player || !mp.players.exists(player)) return true;
        if (player.spSpectateActive === true) return true;
        if (player.getVariable('fly') === true) return true;
        if (player.getVariable('noclip') === true) return true;
    } catch (_e) {}
    return false;
}

module.exports = { isDutyBypass };
