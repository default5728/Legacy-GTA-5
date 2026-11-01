const luckywheel = require('./casino/module'),
    player = mp.players.local;

luckywheel.init();

const ipl_list = [
    'vw_casino_main',
    'hei_dlc_windows_casino',
    'hei_dlc_casino_door',
    'hei_dlc_casino_aircon'
];

for (let i = 0; i < ipl_list.length; i++) {
    mp.game.streaming.requestIpl(ipl_list[i]);
}

mp.events.add({
    render: () => {
        const data = luckywheel.interaction;
        if (mp.game.gameplay.getDistanceBetweenCoords(player.position.x, player.position.y, player.position.z, data.pos.x, data.pos.y, data.pos.z, true) < data.radius) {
            if (!data.isNear) {
                data.isNear = true;
                global.bindGameplayKey(luckywheel.interaction.button, false, luckywheel.onClick);
                data.sendNotify('Нажмите ~INPUT_CONTEXT~ что бы прокрутить колесо удачи');
            }
        } else if (data.isNear) {
            data.isNear = false;
            global.unbindGameplayKey(luckywheel.interaction.button, false, luckywheel.onClick);
            data.clearNotify();
        }
    },
    'luckywheel.cometoluckywheel': (pos) => {
        luckywheel.comeToLuckyWheel(pos);
    },
    'luckywheel.spin': (pos) => {
        luckywheel.object.spin(pos);
    }
});

global.tryCloseCasinoEsc = function () {
    return false;
};

mp.events.add('closecasino', () => {});
