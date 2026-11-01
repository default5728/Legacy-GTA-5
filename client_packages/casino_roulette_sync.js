'use strict';

(function installCasinoRouletteBallAlignment() {
    if (global.__casinoRouletteBallAlignmentInstalled) return;
    global.__casinoRouletteBallAlignmentInstalled = true;

    const rouletteBallHash = mp.game.joaat('vw_prop_roulette_ball') >>> 0;
    const ballRotationOffset = 32.6;
    const rouletteTables = [
        { x: 942.325195, y: 55.3995285 },
        { x: 945.523193, y: 53.4012032 },
        { x: 947.521484, y: 56.5991898 },
        { x: 944.318176, y: 58.5890465 }
    ];
    const originalNew = mp.objects.new.bind(mp.objects);

    function isDiamondRouletteBall(model, position) {
        if ((Number(model) >>> 0) !== rouletteBallHash || !position) return false;

        return rouletteTables.some((table) => {
            const dx = Number(position.x) - table.x;
            const dy = Number(position.y) - table.y;
            return dx * dx + dy * dy < 4;
        });
    }

    mp.objects.new = function createAlignedObject(model, position, options) {
        if (!isDiamondRouletteBall(model, position) || !options || !options.rotation) {
            return originalNew(model, position, options);
        }

        const rotation = options.rotation;
        const alignedOptions = Object.assign({}, options, {
            rotation: new mp.Vector3(
                Number(rotation.x) || 0,
                Number(rotation.y) || 0,
                (Number(rotation.z) || 0) + ballRotationOffset
            )
        });

        return originalNew(model, position, alignedOptions);
    };
})();
