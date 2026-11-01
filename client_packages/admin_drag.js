const localPlayer = mp.players.local;

const MAJDICT = 'majestic_animations_custom';
const ANIM_OWNER = 'arrest_owner';
const ANIM_FOLLOWER = 'arrest_follower';

const NATIVE_SET_ENTITY_COLLISION = '0x8339643499D1222E';

function requestAnimDict(dict) {
    return new Promise((resolve) => {
        if (mp.game.streaming.hasAnimDictLoaded(dict)) return resolve(true);
        mp.game.streaming.requestAnimDict(dict);
        let n = 0;
        const t = setInterval(() => {
            if (mp.game.streaming.hasAnimDictLoaded(dict) || n++ > 200) {
                clearInterval(t);
                resolve(mp.game.streaming.hasAnimDictLoaded(dict));
            }
        }, 25);
    });
}

mp.events.add('playerReady', () => {
    mp.game.streaming.requestAnimDict(MAJDICT);
});

function stopDragCop(cop) {
    try {
        if (cop.intervalChecker) {
            clearInterval(cop.intervalChecker);
            delete cop.intervalChecker;
        }
        cop.isDragging = false;
        if (cop.suspect && mp.players.exists(cop.suspect)) {
            try {
                if (cop.suspect.isAttached()) cop.suspect.detach(true, true);
            } catch (_e) {}
            try {
                cop.suspect.clearTasks();
            } catch (_e) {}
            cop.suspect.isSuspected = false;
        }
        if (cop && mp.players.exists(cop)) {
            try {
                cop.clearTasks();
            } catch (_e) {}
        }
        delete cop.suspect;
    } catch (_e) {}
}

function dragTick(cop) {
    const e = cop;
    const t = cop.suspect;
    if (!e || !t || !mp.players.exists(e) || !mp.players.exists(t)) {
        stopDragCop(cop);
        return;
    }

    if (!mp.game.streaming.hasAnimDictLoaded(MAJDICT)) {
        mp.game.streaming.requestAnimDict(MAJDICT);
        return;
    }

    try {
        if (!e.isPlayingAnim(MAJDICT, ANIM_OWNER, 3)) {
            e.taskPlayAnim(MAJDICT, ANIM_OWNER, 8, -8, -1, 49, 0, false, false, false);
        }
        if (!t.isPlayingAnim(MAJDICT, ANIM_FOLLOWER, 3)) {
            t.taskPlayAnim(MAJDICT, ANIM_FOLLOWER, 8, -8, -1, 49, 0, false, false, false);
        }
    } catch (_e) {}

    try {
        t.attachTo(e.handle, 10000, 0.0, 0.6, 0, 0.0, 0.0, 0.0, true, false, false, false, 2, true);
    } catch (_e) {}

    try {
        const o = mp.game.entity.getBoneRotation(e.handle, 91);
        t.setHeading(o.z - 90);
    } catch (_e) {}

    try {
        e.setIkTarget(4, t.handle, 24818, 0, -0.12, -0.1, 0, -1, -1);
        e.setIkTarget(3, t.handle, 61007, -0.1, -0.06, -0.075, 0, 200, -1);
    } catch (_e) {}

    try {
        const ph = typeof e.getPhysicsHeading === 'function' ? e.getPhysicsHeading() : e.getHeading();
        const a = mp.game.object.getOffsetFromCoords(e.position.x, e.position.y, e.position.z, ph, 0, 3, 0);
        mp.game.invoke(NATIVE_SET_ENTITY_COLLISION, t.handle, 0, 0, 0);
        const walking = typeof e.isWalking === 'function' && e.isWalking();
        if (walking) {
            t.taskGoStraightToCoord(a.x, a.y, a.z, 1.2, -1, e.getHeading(), 0);
        } else {
            t.taskStandStill(1);
        }
    } catch (_e) {}

    if (e === localPlayer || t === localPlayer) {
        const n = mp.game.controls;
        if (t === localPlayer) {
            n.disableControlAction(0, 21, true);
        }
        n.disableControlAction(0, 24, true);
        n.disableControlAction(0, 25, true);
        n.disableControlAction(0, 69, true);
        n.disableControlAction(0, 75, true);
        n.disableControlAction(0, 92, true);
        n.disableControlAction(0, 114, true);
        n.disableControlAction(0, 140, true);
        n.disableControlAction(0, 141, true);
        n.disableControlAction(0, 142, true);
        n.disableControlAction(0, 257, true);
        n.disableControlAction(0, 263, true);
        n.disableControlAction(0, 264, true);
    }
}

async function dragTarget(cop, target) {
    if (!target || !cop || !target.handle || !cop.handle || !mp.players.exists(cop) || !mp.players.exists(target)) return;

    await requestAnimDict(MAJDICT);
    stopDragCop(cop);

    cop.isDragging = true;
    cop.suspect = target;
    target.isSuspected = true;

    cop.intervalChecker = setInterval(() => dragTick(cop), 16);
}

mp.events.addDataHandler('follow.suspect', (entity, value) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (value === null || value === undefined || value === -1) {
            stopDragCop(entity);
            return;
        }
        const suspect = typeof mp.players.atRemoteId === 'function' ? mp.players.atRemoteId(value) : null;
        if (suspect) dragTarget(entity, suspect);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addDataHandler('im.followed', (entity, value) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (value === null || value === undefined || value === -1) {
            if (entity.isAttached && entity.isAttached()) {
                try {
                    entity.detach(true, true);
                } catch (_e) {}
            }
            try {
                entity.clearTasks();
            } catch (_e) {}
            entity.isSuspected = false;
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.addDataHandler('adminCuffed', (entity, value) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (value === null || value === undefined || value === -1) {
            entity.isCuffed = false;
            try {
                entity.clearTasks();
            } catch (_e) {}
            try {
                entity.freezePosition(false);
            } catch (_e) {}
            return;
        }
        entity.isCuffed = true;
        requestAnimDict(MAJDICT).then(() => {
            if (!entity || !mp.players.exists(entity) || entity.isCuffed !== true) return;
            try {
                entity.taskPlayAnim(MAJDICT, ANIM_FOLLOWER, 8, -8, -1, 1, 0, false, false, false);
            } catch (_e) {}
            try {
                entity.freezePosition(true);
            } catch (_e) {}
        });
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('render', () => {
    try {
        const cuffed = localPlayer.getVariable('adminCuffed');
        if (cuffed != null && cuffed !== -1) {
            mp.game.controls.disableAllControlActions(0);
            mp.game.controls.disableAllControlActions(1);
            mp.game.controls.disableAllControlActions(2);
            return;
        }
        const v = localPlayer.getVariable('im.followed');
        if (v != null && v !== -1) {
            mp.game.controls.disableAllControlActions(2);
            mp.game.controls.enableControlAction(2, 30, true);
            mp.game.controls.enableControlAction(2, 31, true);
            mp.game.controls.enableControlAction(2, 32, true);
            mp.game.controls.enableControlAction(2, 1, true);
            mp.game.controls.enableControlAction(2, 2, true);
        }
    } catch (_e) {}
});