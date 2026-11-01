'use strict';

function setPlayerUiVar(player, key, toggle) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable(key, !!toggle);
    } catch (error) {
        console.log(error);
    }
}

mp.events.add('setvarc', (player, toggle) => setPlayerUiVar(player, 'casmenu', toggle));
mp.events.add('setvara', (player, toggle) => setPlayerUiVar(player, 'animsmenu', toggle));
mp.events.add('setvarb', (player, toggle) => setPlayerUiVar(player, 'blackmenu', toggle));
mp.events.add('setvary', (player, toggle) => setPlayerUiVar(player, 'zarabotok', toggle));
mp.events.add('setvaryf', (player, toggle) => setPlayerUiVar(player, 'finalygon', toggle));
