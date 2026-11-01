'use strict';

if (typeof global.spawnFrozenPed !== 'function') {
    global.spawnFrozenPed = function spawnFrozenPed(model, position, heading, opts) {
        const hash = typeof model === 'string' ? mp.joaat(model) : model;
        const pos =
            position instanceof mp.Vector3
                ? position
                : new mp.Vector3(position[0], position[1], position[2]);
        const extra = opts && typeof opts === 'object' ? opts : {};
        return global.creatorPedsNew(hash, pos, {
            dynamic: false,
            invincible: true,
            frozen: true,
            heading: Number(heading) || 0,
            dimension: extra.dimension != null ? Number(extra.dimension) : 0
        });
    };
}
