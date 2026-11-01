/**
 * Парные RP:
 * - поцелуй: проигрывается и завершается сам;
 * - рукопожатие: проигрывается и завершается сам;
 * - за руку: A (инициатор) ведёт B (партнёра). Левая A ↔ правая B. Логика наручников.
 */
(function () {
    const localPlayer = mp.players.local;

    const KISS_DICT = 'mp_ped_interaction';
    const HANDSHAKE_DICT = 'mp_ped_interaction';
    const EPSILON_HI_DICT = 'gta5rp@epsilon_hi';
    const EPSILON_HI_ANIM = 'epsilon_hi';
    /** Флаг 1 (как на сервере); длительность 4 с — без бесконечного loop. */
    const EPSILON_HI_FLAG = 1;
    const EPSILON_HI_MS_FALLBACK = 2000;
    const EPSILON_HI_BLEND_MS = 2000;

    const HANDHOLD_DICT = 'gta5rp@hands_together';
    const HANDHOLD_ANIM = {
        initiator: 'together_man',
        partner: 'together_girl'
    };
    const HANDHOLD_FLAG = 49;

    const BONE_L_HAND = 18905;
    const BONE_R_HAND = 57005;
    const BONE_PELVIS = 11816;

    const NATIVE_SET_ENTITY_COLLISION = '0x8339643499D1222E';

    /**
     * Партнёр Б — со стороны левой руки инициатора А.
     * Левая рука A держит правую руку Б, оба смотрят в одну сторону.
     * (В GTA локальной системе ped'a +X = правая сторона, -X = левая.)
     */
    const HANDHOLD_ATTACH = {
        bone: BONE_PELVIS,
        x: -0.5,
        y: 0.0,
        z: 0.0,
        rx: 0.0,
        ry: 0.0,
        rz: 0.0
    };

    let pairSession = null;
    let pairRenderBound = false;
    let handholdInterval = null;

    global.pairActive = false;

    function syncPairActiveFromVar() {
        try {
            global.pairActive = localPlayer.getVariable('pairActive') === true;
        } catch (_e) {
            global.pairActive = false;
        }
    }

    mp.events.addDataHandler('pairActive', (entity, value) => {
        if (entity === localPlayer) global.pairActive = value === true;
    });

    function ensureAnimDict(dict) {
        try {
            if (mp.game.streaming.hasAnimDictLoaded(dict)) return true;
            mp.game.streaming.requestAnimDict(dict);
            return mp.game.streaming.hasAnimDictLoaded(dict);
        } catch (_e) {
            return false;
        }
    }

    function preloadDict(dict) {
        try {
            if (!mp.game.streaming.hasAnimDictLoaded(dict)) {
                mp.game.streaming.requestAnimDict(dict);
            }
        } catch (_e) {}
    }

    function headingToFace(from, to) {
        const dx = to.position.x - from.position.x;
        const dy = to.position.y - from.position.y;
        return (Math.atan2(dy, dx) * 180) / Math.PI - 90;
    }

    function getPartnerEntity(partnerRemoteId) {
        if (partnerRemoteId == null) return null;
        const p = mp.players.at(parseInt(partnerRemoteId, 10));
        if (p && mp.players.exists(p)) return p;
        return null;
    }

    function getPhysicsHeading(ped) {
        if (!ped || !mp.players.exists(ped)) return 0;
        return typeof ped.getPhysicsHeading === 'function' ? ped.getPhysicsHeading() : ped.getHeading();
    }

    function playLocalAnim(dict, anim, flag, durationMs, speedOut) {
        preloadDict(dict);
        const dur = durationMs != null && Number(durationMs) > 0 ? Number(durationMs) : -1;
        const so = speedOut != null ? Number(speedOut) : 1.0;
        try {
            localPlayer.taskPlayAnim(dict, anim, 8.0, so, dur, Number(flag) || 0, 0, false, false, false);
        } catch (_e) {}
    }

    function waitAnimDictLoaded(dict, cb, maxTries) {
        let tries = 0;
        const limit = maxTries || 120;
        const tick = () => {
            try {
                if (!mp.game.streaming.hasAnimDictLoaded(dict)) {
                    mp.game.streaming.requestAnimDict(dict);
                }
                if (mp.game.streaming.hasAnimDictLoaded(dict)) {
                    cb();
                    return;
                }
            } catch (_e) {}
            if (++tries >= limit) {
                cb();
                return;
            }
            setTimeout(tick, 50);
        };
        tick();
    }

    function runEpsilonHandshakeAnimOnce() {
        if (localPlayer.vehicle) return;
        if (pairSession && pairSession.epsilonPlayed) return;
        waitAnimDictLoaded(EPSILON_HI_DICT, () => {
            playLocalAnim(
                EPSILON_HI_DICT,
                EPSILON_HI_ANIM,
                EPSILON_HI_FLAG | 32,
                EPSILON_HI_BLEND_MS,
                1.0
            );
            if (pairSession && isEpsilonHandshakeSession(pairSession)) {
                pairSession.epsilonPlayed = true;
                pairSession.epsilonStartedAt = Date.now();
                pairSession.epsilonDurationMs = EPSILON_HI_MS_FALLBACK;
            }
            setTimeout(() => {
                if (!pairSession || !isEpsilonHandshakeSession(pairSession)) return;
                try {
                    localPlayer.stopAnimTask(EPSILON_HI_DICT, EPSILON_HI_ANIM, 3.0);
                } catch (_eStop) {}
            }, EPSILON_HI_MS_FALLBACK + 80);
        });
    }

    function playEpsilonHandshakeLocal() {
        if (pairSession && pairSession.epsilonPlayed) return;
        runEpsilonHandshakeAnimOnce();
    }

    function runNormalHandshakeAnim(role) {
        if (localPlayer.vehicle) return;
        const anim = String(role) === 'partner' ? 'handshake_guy_b' : 'handshake_guy_a';
        waitAnimDictLoaded(HANDSHAKE_DICT, () => {
            playLocalAnim(HANDSHAKE_DICT, anim, 0, 5200);
        });
    }

    function isEpsilonHandshakeSession(sess) {
        if (!sess || sess.kind !== 'handshake') return false;
        const dict = String(sess.animDict || '');
        const anim = String(sess.animName || '');
        return dict === EPSILON_HI_DICT || anim === EPSILON_HI_ANIM;
    }

    function playPairHandshakeLocal(sess) {
        if (!sess || sess.kind !== 'handshake') return;
        const dict = String(sess.animDict || HANDSHAKE_DICT);
        const anim = String(sess.animName || '');
        if (!dict || !anim) return;
        const durMs = sess.durationMs > 0 ? sess.durationMs : 5200;
        waitAnimDictLoaded(dict, () => {
            if (!pairSession || pairSession !== sess) return;
            playLocalAnim(dict, anim, sess.animFlag, durMs);
        });
    }

    function stopLocalPairAnim() {
        try {
            localPlayer.clearTasks();
        } catch (_e) {}
    }

    function applySnap(kind, x, y, z, heading) {
        if (kind === 'handhold') return;
        if (pairSession && isEpsilonHandshakeSession(pairSession)) return;
        try {
            localPlayer.setCoordsNoOffset(Number(x), Number(y), Number(z), false, false, false);
            localPlayer.setHeading(Number(heading));
            if (kind === 'kiss' || (kind === 'handshake' && pairSession && pairSession.freeze)) {
                localPlayer.freezePosition(true);
            }
        } catch (_e) {}
    }

    function prepFacing(partnerRemoteId, kind, role) {
        if (kind === 'handshake' && localPlayer.getVariable('pairEpsilonPrep') === true) {
            preloadDict(EPSILON_HI_DICT);
            return;
        }
        const partner = getPartnerEntity(partnerRemoteId);
        if (!partner) return;

        if (kind === 'handhold') preloadDict(HANDHOLD_DICT);
        if (kind === 'kiss') preloadDict(KISS_DICT);
        if (kind === 'handshake') {
            preloadDict(HANDSHAKE_DICT);
            preloadDict(EPSILON_HI_DICT);
        }

        try {
            if (kind === 'handhold') {
                localPlayer.setHeading(headingToFace(localPlayer, partner) + 90);
                return;
            }
            if (kind === 'kiss' || kind === 'handshake') {
                localPlayer.setHeading(headingToFace(localPlayer, partner));
            }
        } catch (_e) {}
    }

    function detachHandhold() {
        if (handholdInterval) {
            clearInterval(handholdInterval);
            handholdInterval = null;
        }
        try {
            if (localPlayer.isAttached && localPlayer.isAttached()) {
                localPlayer.detach(true, true);
            }
        } catch (_e) {}
        try {
            mp.game.invoke(NATIVE_SET_ENTITY_COLLISION, localPlayer.handle, true, true);
        } catch (_e) {}
    }

    function handholdPartnerTick(initiator) {
        if (!initiator || !mp.players.exists(initiator) || !initiator.handle) return;
        if (!ensureAnimDict(HANDHOLD_DICT)) return;

        try {
            if (!localPlayer.isPlayingAnim(HANDHOLD_DICT, HANDHOLD_ANIM.partner, 3)) {
                localPlayer.taskPlayAnim(
                    HANDHOLD_DICT,
                    HANDHOLD_ANIM.partner,
                    8.0,
                    -8.0,
                    -1,
                    HANDHOLD_FLAG,
                    0,
                    false,
                    false,
                    false
                );
            }
        } catch (_e) {}

        try {
            localPlayer.attachTo(
                initiator.handle,
                HANDHOLD_ATTACH.bone,
                HANDHOLD_ATTACH.x,
                HANDHOLD_ATTACH.y,
                HANDHOLD_ATTACH.z,
                HANDHOLD_ATTACH.rx,
                HANDHOLD_ATTACH.ry,
                HANDHOLD_ATTACH.rz,
                true,
                false,
                false,
                false,
                2,
                true
            );
        } catch (_e) {}

        try {
            localPlayer.setHeading(getPhysicsHeading(initiator));
        } catch (_e) {}

        // Правая рука партнёра (Б) тянется к левой руке инициатора (А).
        try {
            localPlayer.setIkTarget(3, initiator.handle, BONE_L_HAND, 0.0, 0.0, 0.0, 0, 200, -1);
        } catch (_e) {}

        try {
            mp.game.invoke(NATIVE_SET_ENTITY_COLLISION, localPlayer.handle, false, false);
        } catch (_e) {}
    }

    function startHandholdFollow(initiator) {
        detachHandhold();
        preloadDict(HANDHOLD_DICT);

        let waitTries = 0;
        const waitAndAttach = () => {
            if (!pairSession || pairSession.kind !== 'handhold' || pairSession.role !== 'partner') return;

            const stillExists = initiator && mp.players.exists(initiator);
            const hasHandle = stillExists && initiator.handle && initiator.handle !== 0;
            if (!stillExists || !hasHandle) {
                if (waitTries++ < 40) {
                    setTimeout(waitAndAttach, 50);
                }
                return;
            }

            handholdInterval = setInterval(() => {
                if (!pairSession || pairSession.kind !== 'handhold' || pairSession.role !== 'partner') {
                    detachHandhold();
                    return;
                }
                if (!mp.players.exists(initiator) || !initiator.handle) {
                    detachHandhold();
                    return;
                }
                handholdPartnerTick(initiator);
            }, 16);
        };
        waitAndAttach();
    }

    function handholdInitiatorTick(partner) {
        if (!ensureAnimDict(HANDHOLD_DICT)) return;

        try {
            if (!localPlayer.isPlayingAnim(HANDHOLD_DICT, HANDHOLD_ANIM.initiator, 3)) {
                localPlayer.taskPlayAnim(
                    HANDHOLD_DICT,
                    HANDHOLD_ANIM.initiator,
                    8.0,
                    -8.0,
                    -1,
                    HANDHOLD_FLAG,
                    0,
                    false,
                    false,
                    false
                );
            }
        } catch (_e) {}

        // Левая рука инициатора (А) тянется к правой руке партнёра (Б).
        if (partner && mp.players.exists(partner)) {
            try {
                localPlayer.setIkTarget(4, partner.handle, BONE_R_HAND, 0.0, 0.0, 0.0, 0, 200, -1);
            } catch (_e) {}
        }
    }

    function faceToFaceTick() {
        if (!pairSession || pairSession.lockedHeading == null) return;
        try {
            localPlayer.setHeading(pairSession.lockedHeading);
            localPlayer.freezePosition(true);
        } catch (_e) {}
    }

    function handshakeAnimTick() {
        /* Анимация синхронизируется с сервера через playAnimation. */
    }

    function epsilonHandshakeAnimTick() {
        if (!pairSession || !pairSession.epsilonPlayed || !pairSession.epsilonStartedAt) return;
        if (Date.now() - pairSession.epsilonStartedAt < (pairSession.epsilonDurationMs || EPSILON_HI_MS_FALLBACK)) {
            return;
        }
        try {
            localPlayer.stopAnimTask(EPSILON_HI_DICT, EPSILON_HI_ANIM, 3.0);
        } catch (_e) {}
    }

    function kissAnimTick() {
        // Поцелуй проигрывается один раз — не перезапускаем циклически.
    }

    function handholdPartnerControls() {
        const n = mp.game.controls;
        n.disableControlAction(0, 21, true);
        n.disableControlAction(0, 30, true);
        n.disableControlAction(0, 31, true);
        n.disableControlAction(0, 32, true);
        n.disableControlAction(0, 33, true);
        n.disableControlAction(0, 34, true);
        n.disableControlAction(0, 35, true);
    }

    function combatBlockTick() {
        const n = mp.game.controls;
        // ЛКМ / ПКМ (атака, прицел) и все варианты ближнего боя
        n.disableControlAction(0, 24, true);   // INPUT_ATTACK
        n.disableControlAction(0, 25, true);   // INPUT_AIM
        n.disableControlAction(0, 47, true);   // INPUT_DETONATE
        n.disableControlAction(0, 69, true);   // INPUT_VEH_ATTACK
        n.disableControlAction(0, 70, true);   // INPUT_VEH_ATTACK2
        n.disableControlAction(0, 92, true);   // INPUT_VEH_PASSENGER_ATTACK
        n.disableControlAction(0, 114, true);  // INPUT_VEH_FLY_ATTACK
        n.disableControlAction(0, 121, true);  // INPUT_VEH_FLY_ATTACK_CAMERA
        n.disableControlAction(0, 140, true);  // INPUT_MELEE_ATTACK_LIGHT
        n.disableControlAction(0, 141, true);  // INPUT_MELEE_ATTACK_HEAVY
        n.disableControlAction(0, 142, true);  // INPUT_MELEE_ATTACK_ALTERNATE
        n.disableControlAction(0, 257, true);  // INPUT_ATTACK2
        n.disableControlAction(0, 263, true);  // INPUT_MELEE_ATTACK1
        n.disableControlAction(0, 264, true);  // INPUT_MELEE_ATTACK2
        // Запретить переключение оружия — иначе ПКМ/wheel сбивает анимку.
        n.disableControlAction(0, 37, true);   // INPUT_SELECT_WEAPON (TAB)
        n.disableControlAction(0, 12, true);   // INPUT_LOOK_UP_ONLY
        n.disableControlAction(0, 13, true);   // INPUT_LOOK_DOWN_ONLY
        n.disableControlAction(0, 99, true);   // INPUT_SELECT_NEXT_WEAPON
        n.disableControlAction(0, 100, true);  // INPUT_SELECT_PREV_WEAPON
        n.disableControlAction(0, 157, true);  // INPUT_SELECT_WEAPON_UNARMED
        n.disableControlAction(0, 158, true);
        n.disableControlAction(0, 159, true);
        n.disableControlAction(0, 160, true);
        n.disableControlAction(0, 161, true);
        n.disableControlAction(0, 162, true);
        n.disableControlAction(0, 163, true);
        n.disableControlAction(0, 164, true);
        n.disableControlAction(0, 165, true);
        n.disableControlAction(0, 166, true);  // INPUT_REPLAY_START_STOP_RECORDING
        n.disableControlAction(0, 167, true);
    }

    function freezeTick() {
        if (!pairSession || !pairSession.freeze) return;
        const n = mp.game.controls;
        n.disableControlAction(0, 21, true);
        n.disableControlAction(0, 22, true);
        n.disableControlAction(0, 30, true);
        n.disableControlAction(0, 31, true);
        n.disableControlAction(0, 32, true);
        n.disableControlAction(0, 33, true);
        n.disableControlAction(0, 34, true);
        n.disableControlAction(0, 35, true);
        n.disableControlAction(0, 36, true);
        n.disableControlAction(0, 44, true);
    }

    function bindPairRender() {
        if (pairRenderBound) return;
        pairRenderBound = true;
        mp.events.add('render', () => {
            if (!pairSession) return;

            if (pairSession.kind === 'kiss') {
                faceToFaceTick();
                kissAnimTick();
            } else if (pairSession.kind === 'handshake' && pairSession.freeze) {
                faceToFaceTick();
            }

            if (pairSession.kind === 'handhold' && pairSession.role === 'initiator') {
                handholdInitiatorTick(getPartnerEntity(pairSession.partnerRemoteId));
            }

            if (pairSession.kind === 'handhold' && pairSession.role === 'partner') {
                handholdPartnerControls();
            }

            if (isEpsilonHandshakeSession(pairSession)) {
                epsilonHandshakeAnimTick();
            } else {
                freezeTick();
                combatBlockTick();
            }
        });
    }

    function clearPairLocal() {
        global.pairActive = false;
        detachHandhold();
        try {
            localPlayer.stopAnimTask(EPSILON_HI_DICT, EPSILON_HI_ANIM, 3.0);
        } catch (_eEp) {}
        stopLocalPairAnim();
        try {
            localPlayer.freezePosition(false);
        } catch (_e) {}
        try {
            if (typeof localPlayer.setBlockingOfNonTemporaryEvents === 'function') {
                localPlayer.setBlockingOfNonTemporaryEvents(false);
            }
        } catch (_e) {}
        try {
            if (typeof localPlayer.setKeepTask === 'function') localPlayer.setKeepTask(false);
        } catch (_eK) {}
        pairSession = null;
    }

    function startPairLocal(role, partnerRemoteId, kind, attach, freeze, durationMs, lockedHeading, animDict, animName, animFlag) {
        detachHandhold();
        pairSession = null;
        syncPairActiveFromVar();
        bindPairRender();

        const partner = getPartnerEntity(partnerRemoteId);
        if (!partner && kind !== 'handshake') return;

        pairSession = {
            role,
            partnerRemoteId: parseInt(partnerRemoteId, 10),
            kind,
            attach: !!attach,
            freeze: !!freeze,
            lockedHeading: lockedHeading != null ? Number(lockedHeading) : null,
            animDict: String(animDict || ''),
            animName: String(animName || ''),
            animFlag: Number(animFlag) || 0,
            durationMs: Number(durationMs) || 0
        };

        const epsilonHandshake =
            kind === 'handshake' &&
            (String(animDict || '') === EPSILON_HI_DICT || String(animName || '') === EPSILON_HI_ANIM);

        if (!epsilonHandshake) {
            try {
                if (typeof localPlayer.setKeepTask === 'function') localPlayer.setKeepTask(true);
            } catch (_e) {}
            try {
                if (typeof localPlayer.setBlockingOfNonTemporaryEvents === 'function') {
                    localPlayer.setBlockingOfNonTemporaryEvents(true);
                }
            } catch (_e) {}
        }

        if (kind === 'handhold') preloadDict(HANDHOLD_DICT);
        if (kind === 'kiss') preloadDict(KISS_DICT);
        if (kind === 'handshake') {
            preloadDict(HANDSHAKE_DICT);
            preloadDict(EPSILON_HI_DICT);
        }

        if (freeze && kind !== 'handhold') {
            try {
                localPlayer.freezePosition(true);
            } catch (_e) {}
        }

        if (epsilonHandshake) {
            playEpsilonHandshakeLocal();
        } else if (kind === 'handshake') {
            playPairHandshakeLocal(pairSession);
        }

        setTimeout(() => {
            if (!pairSession) return;

            if (isEpsilonHandshakeSession(pairSession)) {
                return;
            }

            if (pairSession.kind === 'handhold') {
                const p = getPartnerEntity(pairSession.partnerRemoteId);
                if (!p) return;
                if (pairSession.role === 'initiator') {
                    handholdInitiatorTick(p);
                } else {
                    startHandholdFollow(p);
                }
            }
        }, 250);
    }

    mp.events.add('pair:session:prep', (partnerRemoteId, kind, role) => {
        prepFacing(partnerRemoteId, kind, role);
    });

    mp.events.add('pair:session:align', (kind, x, y, z, heading) => {
        applySnap(kind, x, y, z, heading);
    });

    mp.events.add('pair:session:start', (...rawArgs) => {
        let args = rawArgs;
        if (args.length === 1 && Array.isArray(args[0])) {
            args = args[0];
        } else if (args.length === 1 && args[0] != null && typeof args[0] === 'object' && args[0].length >= 8) {
            args = args[0];
        }
        startPairLocal(
            args[0],
            args[1],
            args[2],
            args[3],
            args[4],
            args[5],
            args[6],
            args[7],
            args[8],
            args[9]
        );
    });

    mp.events.add('pair:session:stop', () => {
        clearPairLocal();
    });

    mp.events.add('pair:handshake:play:c', (role) => {
        runNormalHandshakeAnim(role);
    });

    global.bindGameplayKey(0x47, true, () => {
        syncPairActiveFromVar();
        if (!global.pairActive && localPlayer.getVariable('pairActive') !== true) return;
        if (localPlayer.getVariable('pairCancelByG') === false) return;
        if (mp.game.ui.isPauseMenuActive()) return;
        if (localPlayer.isTypingInTextChat) return;
        mp.events.callRemote('pair:cancel:s');
    });
})();
