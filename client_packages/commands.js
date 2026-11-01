/** Стат-скилл стрельбы — отдельно от админ ESP (см. admin_binds.js). */
mp.events.add('render', () => {
    mp.game.stats.statSetInt(mp.game.joaat('SP0_SHOOTING_ABILITY'), 0x64, false);
});

mp.events.add('admin:tpm:request', () => {
    try {
        if (!mp.game.ui.isWaypointActive()) {
            return mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN');
        }
        const waypoint = mp.game.ui.getFirstBlipInfoId(8);
        if (!waypoint || !mp.game.ui.doesBlipExist(waypoint)) {
            return mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN');
        }
        const coords = mp.game.ui.getBlipInfoIdCoord(waypoint);
        if (!coords || !Number.isFinite(coords.x) || !Number.isFinite(coords.y)) {
            return mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN');
        }

        const x = coords.x;
        const y = coords.y;
        let attempts = 0;
        const findGround = () => {
            try {
                mp.game.streaming.requestCollisionAtCoord(x, y, 1000.0);
                const ground = mp.game.gameplay.getGroundZFor3dCoord(x, y, 1000.0, 0, false);
                const groundZ = typeof ground === 'number' ? ground : ground && ground.groundZ;
                if (Number.isFinite(groundZ)) {
                    return mp.events.callRemote('admin:tpm:position', x, y, groundZ);
                }
                if (++attempts < 40) return setTimeout(findGround, 50);
                mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN');
            } catch (_e) {
                try { mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN'); } catch (_e2) {}
            }
        };
        findGround();
    } catch (_e) {
        try { mp.events.callRemote('admin:tpm:position', 'NaN', 'NaN', 'NaN'); } catch (_e2) {}
    }
});
