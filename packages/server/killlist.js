mp.events.add("playerDeath", (player, reason, killer) => {
    try {
        if (global.normalizePlayerDeathArgs) {
            const n = global.normalizePlayerDeathArgs(reason, killer);
            killer = n.killer;
        }
        killer = global.resolveDeathKiller(player, killer);

        if (killer && player.login === killer.login) return;

        const killerAuthKill = killer && mp.players.exists(killer) && killer.getVariable('auth');
        const pvpForRewards = !!(killerAuthKill && player.login !== killer.login);
        if (
            pvpForRewards &&
            typeof global.pvpDeathShouldProcessRewards === 'function' &&
            !global.pvpDeathShouldProcessRewards(player, killer)
        ) {
            return;
        }

        const killerlogin = killer ? killer.login || 'unknown' : 'unknown';
        const playerlogin = player.login || 'unknown';

        const killerFraction = killer ? killer.getVariable('fraction') || 1 : 1;
        const playerFraction = player.getVariable('fraction') || 1;

        if (killerlogin !== 'unknown') {
            let weaponHash = 0;
            if (typeof reason === 'number' && Number.isFinite(reason)) {
                weaponHash = reason >>> 0;
            } else if (killer && mp.players.exists(killer)) {
                try {
                    const w = killer.weapon;
                    if (typeof w === 'number' && Number.isFinite(w)) weaponHash = w >>> 0;
                } catch (_w) {}
            }
        }

        // Система каптов для семей - начисление очков за убийство
        if (killer && mp.players.exists(killer)) {
            const killerFamily = killer.family;
            const victimFamily = player.family;

            // Убийца получает очки для своей семьи
            if (killerFamily) {
                let pointsToAdd = 10; // Базовые очки за убийство
                
                // Бонус если убил игрока из другой семьи
                if (victimFamily && victimFamily !== killerFamily) {
                    pointsToAdd = 15;
                }
                
                mp.events.call('family:addpoints:s', killerFamily, pointsToAdd, true);
            }

            // Жертва теряет очки для своей семьи
            if (victimFamily) {
                let pointsToRemove = -5; // Штраф за смерть
                mp.events.call('family:addpoints:s', victimFamily, pointsToRemove, false);
            }
        }
    } catch (error) {
        console.log(error);
    }
});