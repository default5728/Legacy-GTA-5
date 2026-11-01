/**
 * Парные RP: поцелуй/рукопожатие — лицом к лицу; за руку — бок о бок, attach на клиенте.
 */

function pairPlayersDistance(p1, p2) {
    if (!p1 || !p2 || !p1.position || !p2.position) return 1e9;
    const dx = p1.position.x - p2.position.x;
    const dy = p1.position.y - p2.position.y;
    const dz = p1.position.z - p2.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const KISS_FACE_GAP = 1.0;
/** Дистанция между педами при обычном рукопожатии (как в референсе). */
const HANDSHAKE_FACE_GAP = 0.95;

const PAIR_KINDS = {
    kiss: {
        label: 'поцелуй',
        initiator: { dict: 'mp_ped_interaction', anim: 'kisses_guy_a', flag: 0 },
        partner: { dict: 'mp_ped_interaction', anim: 'kisses_guy_b', flag: 0 },
        syncGap: KISS_FACE_GAP,
        attach: false,
        freeze: true,
        cancelByG: false,
        durationMs: 5500
    },
    handhold: {
        label: 'взять за руку',
        initiator: { dict: 'gta5rp@hands_together', anim: 'together_man', flag: 49 },
        partner: { dict: 'gta5rp@hands_together', anim: 'together_girl', flag: 49 },
        sideOffset: -0.5,
        attach: true,
        freeze: false,
        cancelByG: true,
        durationMs: 0
    },
    handshake: {
        label: 'пожать руку',
        initiator: { dict: 'mp_ped_interaction', anim: 'handshake_guy_a', flag: 0 },
        partner: { dict: 'mp_ped_interaction', anim: 'handshake_guy_b', flag: 0 },
        syncGap: HANDSHAKE_FACE_GAP,
        attach: false,
        freeze: true,
        cancelByG: false,
        durationMs: 5200
    }
};

const PAIR_PREP_MS = 800;

const pairSessions = new Map();

function pairSessionKey(a, b) {
    const x = Number(a);
    const y = Number(b);
    return x < y ? `${x}:${y}` : `${y}:${x}`;
}

function findPairSessionByPlayer(player) {
    if (!player || player.static == null) return null;
    const st = String(player.static);
    for (const [key, session] of pairSessions) {
        if (String(session.a) === st || String(session.b) === st) return { key, session };
    }
    return null;
}

function getPlayerByStatic(staticId) {
    return mp.players.toArray().find((p) => String(p.static) === String(staticId));
}

function pairCfg(kind) {
    return PAIR_KINDS[String(kind || '').trim()] || null;
}

function clearPairPlayerVars(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.setVariable('anim', false);
        player.setVariable('pairActive', false);
        player.setVariable('pairKind', null);
        player.setVariable('pairPartnerStatic', null);
        player.setVariable('pairRole', null);
        player.setVariable('pairAttach', false);
        player.setVariable('pairCancelByG', false);
        player.setVariable('pairEpsilonPrep', false);
    } catch (_e) {}
}

function setPairMovementLock(player, locked) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.freezePosition(!!locked);
    } catch (_e) {}
}

function markPairPlayersRuntime(initiator, partner, kind, cfg) {
    if (!initiator || !partner) return;
    const partnerStatic = partner.static;
    [initiator, partner].forEach((p, idx) => {
        if (!p || !mp.players.exists(p)) return;
        const isInit = p === initiator;
        p.setVariable('pairActive', true);
        p.setVariable('pairKind', kind);
        p.setVariable('pairPartnerStatic', isInit ? partnerStatic : initiator.static);
        p.setVariable('pairRole', isInit ? 'initiator' : 'partner');
        p.setVariable('pairAttach', cfg && cfg.attach === true);
        p.setVariable('pairCancelByG', cfg ? cfg.cancelByG !== false : false);
    });
}

function playPairAnim(player, cfg) {
    if (!player || !mp.players.exists(player) || !cfg) return;
    const dict = cfg.dict ? String(cfg.dict) : '';
    const anim = cfg.anim ? String(cfg.anim) : '';
    if (!dict || !anim) return;
    try {
        player.setVariable('anim', true);
        player.playAnimation(dict, anim, 8.0, cfg.flag != null && cfg.flag !== '' ? Number(cfg.flag) : 1);
    } catch (e) {
        try { console.log('[pair] playAnimation', player.login, dict, anim, e); } catch (_e) {}
    }
}

function stopPairAnim(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.stopAnimation();
    } catch (_e) {}
    clearPairPlayerVars(player);
}

function notifyPairEnd(player, msg) {
    if (player && mp.players.exists(player) && msg) {
        isNotify(player, 1, 'top-mid', msg, 2800);
    }
}

function endPairSession(key, reasonMsg, whoCancelled) {
    const session = pairSessions.get(key);
    if (!session) return;
    pairSessions.delete(key);

    if (session.timer) {
        try { clearTimeout(session.timer); } catch (_e) {}
    }

    const pa = getPlayerByStatic(session.a);
    const pb = getPlayerByStatic(session.b);

    const handshakeOk = !reasonMsg && !whoCancelled && session.kind === 'handshake';
    if (handshakeOk && pa && pb && mp.players.exists(pa) && mp.players.exists(pb)) {
        if (typeof global.addPlayerAcquaintancePair === 'function') {
            global.addPlayerAcquaintancePair(pa, pb);
        }
        if (typeof global.onNewbieHandshakeComplete === 'function') {
            global.onNewbieHandshakeComplete(pa, pb.static);
            global.onNewbieHandshakeComplete(pb, pa.static);
        }
    }

    if (pa && mp.players.exists(pa)) {
        stopPairAnim(pa);
        setPairMovementLock(pa, false);
        pa.call('pair:session:stop');
    }
    if (pb && mp.players.exists(pb)) {
        stopPairAnim(pb);
        setPairMovementLock(pb, false);
        pb.call('pair:session:stop');
    }

    if (reasonMsg) {
        notifyPairEnd(pa, reasonMsg);
        notifyPairEnd(pb, reasonMsg);
    } else if (whoCancelled && mp.players.exists(whoCancelled)) {
        const other = whoCancelled === pa ? pb : pa;
        notifyPairEnd(whoCancelled, 'Парное действие завершено.');
        if (other && mp.players.exists(other)) {
            const whoName = typeof global.citizenDisplayLogin === 'function'
                ? global.citizenDisplayLogin(other, whoCancelled)
                : whoCancelled.login;
            notifyPairEnd(other, `${whoName} завершил парное действие.`);
        }
    }
}

function pairHeadingTo(from, to) {
    const dx = to.position.x - from.position.x;
    const dy = to.position.y - from.position.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI - 90;
}

function offsetFromHeading(x, y, z, heading, offX, offY, offZ) {
    const rad = (heading * Math.PI) / 180;
    const fx = -Math.sin(rad);
    const fy = Math.cos(rad);
    const rx = Math.cos(rad);
    const ry = Math.sin(rad);
    return {
        x: x + rx * offX + fx * offY,
        y: y + ry * offX + fy * offY,
        z: z + offZ
    };
}

function alignFaceToFace(initiator, partner, gap) {
    if (!initiator || !partner || !mp.players.exists(initiator) || !mp.players.exists(partner)) return;
    const ip = initiator.position;
    const pp = partner.position;
    if (!ip || !pp || !isFinite(ip.x) || !isFinite(ip.y) || !isFinite(pp.x) || !isFinite(pp.y)) return;

    let dx = pp.x - ip.x;
    let dy = pp.y - ip.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) {
        dx = 0;
        dy = 1;
        dist = 1;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const hInit = (Math.atan2(dy, dx) * 180 / Math.PI) - 90;
    if (!isFinite(hInit)) return;

    const g = Math.max(0.55, Number(gap) || HANDSHAKE_FACE_GAP);
    const half = g * 0.5;
    const midX = (ip.x + pp.x) * 0.5;
    const midY = (ip.y + pp.y) * 0.5;

    initiator.position = new mp.Vector3(midX - nx * half, midY - ny * half, ip.z);
    partner.position = new mp.Vector3(midX + nx * half, midY + ny * half, pp.z);
    initiator.heading = hInit;
    partner.heading = hInit + 180;
}

function alignHandholdSideBySide(initiator, partner, sideOffset) {
    const facePartner = pairHeadingTo(initiator, partner);
    const h = facePartner + 90;

    initiator.heading = h;
    partner.heading = h;

    const off = offsetFromHeading(
        initiator.position.x,
        initiator.position.y,
        initiator.position.z,
        h,
        sideOffset,
        0.0,
        0.0
    );
    partner.position = new mp.Vector3(off.x, off.y, partner.position.z);
}

function alignPairPlayers(initiator, partner, kind, cfg) {
    if (!initiator || !partner || !mp.players.exists(initiator) || !mp.players.exists(partner)) return;

    try {
        if (kind === 'handhold') {
            // Партнёра не телепортируем на сервере — attach на клиенте сам поставит на место.
            // Только heading у инициатора (партнёра привяжет attach).
            const facePartner = pairHeadingTo(initiator, partner);
            initiator.heading = facePartner + 90;
            return;
        }
        if (kind === 'kiss' || kind === 'handshake') {
            const gap = cfg.syncGap || (kind === 'handshake' ? HANDSHAKE_FACE_GAP : KISS_FACE_GAP);
            alignFaceToFace(initiator, partner, gap);
        }
    } catch (e) {
        console.log('[pair] alignPairPlayers', kind, e);
    }
}

function pushPairAlignToClients(initiator, partner, kind) {
    try {
        if (kind === 'handhold') {
            // Не телепортируем участников — для handhold позиции и heading партнёра
            // ставит клиентский attach.
            return;
        }
        initiator.call('pair:session:align', [
            kind,
            initiator.position.x,
            initiator.position.y,
            initiator.position.z,
            initiator.heading
        ]);
        partner.call('pair:session:align', [
            kind,
            partner.position.x,
            partner.position.y,
            partner.position.z,
            partner.heading
        ]);
    } catch (_e) {}
}

/** ~2 с, флаг 1 (синх для других игроков); локально клиент 1|32 (верх тела, можно идти). */
const EPSILON_HANDSHAKE_MS = 2000;
const EPSILON_HANDSHAKE_ANIM = { dict: 'gta5rp@epsilon_hi', anim: 'epsilon_hi', flag: 49 };

function pairHandshakeUsesEpsilon(initiator, partner) {
    return playerHasEpsilonUnlock(initiator) || playerHasEpsilonUnlock(partner);
}

function playEpsilonPairAnim(player) {
    if (!player || !mp.players.exists(player)) return;
    const dict = EPSILON_HANDSHAKE_ANIM.dict;
    const anim = EPSILON_HANDSHAKE_ANIM.anim;
    const flag = EPSILON_HANDSHAKE_ANIM.flag != null ? Number(EPSILON_HANDSHAKE_ANIM.flag) : 1;
    try {
        player.setVariable('anim', true);
        player.playAnimation(dict, anim, 1.0, flag);
    } catch (e) {
        try { console.log('[pair] playEpsilonPairAnim', player.login, e); } catch (_e) {}
    }
}

function playerHasEpsilonUnlock(player) {
    return typeof global.isPlayerEpsilonUnlocked === 'function' && global.isPlayerEpsilonUnlocked(player);
}

function callPairSessionStart(player, payload) {
    if (!player || !mp.players.exists(player) || !payload) return;
    player.call(
        'pair:session:start',
        payload[0], payload[1], payload[2], payload[3], payload[4],
        payload[5], payload[6], payload[7], payload[8], payload[9]
    );
}

function buildPairStartPayload(role, partnerId, kind, attach, freeze, durationMs, heading, animCfg) {
    return [
        role,
        partnerId,
        kind,
        !!attach,
        !!freeze,
        durationMs || 0,
        heading,
        animCfg.dict,
        animCfg.anim,
        animCfg.flag != null && animCfg.flag !== '' ? Number(animCfg.flag) : 0
    ];
}

/**
 * Хотя бы один купил Epsilon:
 * - оба купили → epsilon у обоих;
 * - один купил → epsilon только у купившего, у второго ничего (без анимации);
 * без attach/freeze/выравнивания у epsilon-игрока.
 */
function beginEpsilonHandshakeRuntime(session, key, _cfg, initiator, partner) {
    const epsilonPlayers = [];
    if (playerHasEpsilonUnlock(initiator)) epsilonPlayers.push(initiator);
    if (playerHasEpsilonUnlock(partner)) epsilonPlayers.push(partner);

    if (!epsilonPlayers.length) {
        beginPairSessionRuntime(session, key, PAIR_KINDS.handshake);
        return;
    }

    session.epsilonHandshake = true;
    session.epsilonSolo = epsilonPlayers.length === 1;

    [initiator, partner].forEach((p) => {
        if (!p || !mp.players.exists(p)) return;
        setPairMovementLock(p, false);
    });

    if (session.epsilonSolo) {
        const soloPlayer = epsilonPlayers[0];
        const other = soloPlayer === initiator ? partner : initiator;
        if (other && mp.players.exists(other)) {
            stopPairAnim(other);
            clearPairPlayerVars(other);
            try { other.setVariable('pairEpsilonPrep', false); } catch (_e) {}
            try { other.call('pair:session:stop'); } catch (_eStop) {}
        }
    }

    epsilonPlayers.forEach((p) => {
        if (!p || !mp.players.exists(p)) return;

        const isInit = p === initiator;
        const role = isInit ? 'initiator' : 'partner';
        const pid = isInit ? partner.id : initiator.id;
        const partnerStatic = isInit ? partner.static : initiator.static;

        p.setVariable('pairActive', true);
        p.setVariable('pairKind', session.kind);
        p.setVariable('pairPartnerStatic', partnerStatic);
        p.setVariable('pairRole', role);
        p.setVariable('pairAttach', false);
        p.setVariable('pairCancelByG', false);
        try { p.setVariable('pairEpsilonPrep', true); } catch (_ePrep) {}

        const payload = buildPairStartPayload(
            role,
            pid,
            session.kind,
            false,
            false,
            EPSILON_HANDSHAKE_MS,
            p.heading,
            EPSILON_HANDSHAKE_ANIM
        );
        callPairSessionStart(p, payload);
        playEpsilonPairAnim(p);
        isNotify(p, 3, 'top-mid', 'Рукопожатие Epsilon.', 3500);
    });

    if (session.epsilonSolo) {
        const other = epsilonPlayers[0] === initiator ? partner : initiator;
        if (other && mp.players.exists(other)) {
            isNotify(other, 3, 'top-mid', 'Рукопожатие.', 2500);
        }
    }

    session.timer = setTimeout(() => {
        if (pairSessions.get(key) === session) endPairSession(key, null, null);
    }, EPSILON_HANDSHAKE_MS);
}

function beginPairSessionRuntime(session, key, cfg) {
    const initiator = getPlayerByStatic(session.initiatorStatic);
    const partner = getPlayerByStatic(String(session.a) === String(session.initiatorStatic) ? session.b : session.a);

    if (!initiator || !partner || !mp.players.exists(initiator) || !mp.players.exists(partner)) {
        endPairSession(key, 'Парное действие прервано.');
        return;
    }

    if (pairPlayersDistance(initiator, partner) > 5) {
        endPairSession(key, 'Вы слишком далеко — парное действие сброшено.');
        return;
    }

    if (session.kind === 'handshake') {
        if (playerHasEpsilonUnlock(initiator) || playerHasEpsilonUnlock(partner)) {
            beginEpsilonHandshakeRuntime(session, key, cfg, initiator, partner);
            return;
        }
    }

    const runtimeCfg = cfg;
    alignPairPlayers(initiator, partner, session.kind, cfg);
    pushPairAlignToClients(initiator, partner, session.kind);

    markPairPlayersRuntime(initiator, partner, session.kind, runtimeCfg);
    if (runtimeCfg.freeze) {
        setPairMovementLock(initiator, true);
        setPairMovementLock(partner, true);
    }

    if (session.kind === 'handhold') {
        initiator.setVariable('anim', true);
        partner.setVariable('anim', true);
    } else {
        playPairAnim(initiator, runtimeCfg.initiator);
        playPairAnim(partner, runtimeCfg.partner);
    }

    initiator.setVariable('pairCancelByG', runtimeCfg.cancelByG !== false);
    partner.setVariable('pairCancelByG', runtimeCfg.cancelByG !== false);

    const startPayload = (role, partnerId, heading, animCfg) => [
        role,
        partnerId,
        session.kind,
        !!cfg.attach,
        !!cfg.freeze,
        cfg.durationMs || 0,
        heading,
        animCfg.dict,
        animCfg.anim,
        animCfg.flag
    ];

    const initPayload = startPayload('initiator', partner.id, initiator.heading, runtimeCfg.initiator);
    const partPayload = startPayload('partner', initiator.id, partner.heading, runtimeCfg.partner);
    initiator.call('pair:session:start', initPayload[0], initPayload[1], initPayload[2], initPayload[3], initPayload[4], initPayload[5], initPayload[6], initPayload[7], initPayload[8], initPayload[9]);
    partner.call('pair:session:start', partPayload[0], partPayload[1], partPayload[2], partPayload[3], partPayload[4], partPayload[5], partPayload[6], partPayload[7], partPayload[8], partPayload[9]);
    if (session.kind === 'handshake') {
        try {
            initiator.call('pair:handshake:play:c', 'initiator');
            partner.call('pair:handshake:play:c', 'partner');
        } catch (_eHs) {}
    }

    const hint = cfg.cancelByG !== false
        ? `${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} — G чтобы завершить.`
        : `${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)}.`;

    isNotify(initiator, 3, 'top-mid', hint, 4000);
    isNotify(partner, 3, 'top-mid', hint, 4000);

    if (cfg.durationMs > 0) {
        session.timer = setTimeout(() => {
            if (pairSessions.get(key) === session) endPairSession(key, null, null);
        }, cfg.durationMs);
    }
}

global.playerInPairSession = function playerInPairSession(player) {
    return !!findPairSessionByPlayer(player);
};

global.endPairInteractionForPlayer = function endPairInteractionForPlayer(player, reasonMsg, whoCancelled) {
    const found = findPairSessionByPlayer(player);
    if (!found) return false;
    const cfg = pairCfg(found.session.kind);
    if (cfg && cfg.cancelByG === false && whoCancelled && !reasonMsg) {
        return false;
    }
    endPairSession(found.key, reasonMsg, whoCancelled || player);
    return true;
};

global.startPairInteraction = function startPairInteraction(initiator, partner, kindRaw) {
    try {
        const kind = String(kindRaw || '').trim();
        const cfg = pairCfg(kind);
        if (!cfg) {
            isNotify(initiator, 2, 'top-mid', 'Неизвестное парное действие.', 3000);
            return false;
        }
        if (!initiator || !partner || !mp.players.exists(initiator) || !mp.players.exists(partner)) return false;
        if (initiator === partner) return false;

        if (initiator.dimension !== 0 || partner.dimension !== 0) {
            isNotify(initiator, 2, 'top-mid', 'Доступно только в основном измерении.', 3000);
            isNotify(partner, 2, 'top-mid', 'Доступно только в основном измерении.', 3000);
            return false;
        }

        if (pairPlayersDistance(initiator, partner) > 4.5) {
            isNotify(initiator, 2, 'top-mid', 'Игрок слишком далеко.', 3000);
            isNotify(partner, 2, 'top-mid', 'Игрок слишком далеко.', 3000);
            return false;
        }

        if (findPairSessionByPlayer(initiator) || findPairSessionByPlayer(partner)) {
            isNotify(initiator, 2, 'top-mid', 'Один из вас уже в парном действии.', 3000);
            isNotify(partner, 2, 'top-mid', 'Один из вас уже в парном действии.', 3000);
            return false;
        }

        if (initiator.vehicle || partner.vehicle) {
            isNotify(initiator, 2, 'top-mid', 'Нельзя в транспорте.', 3000);
            return false;
        }

        const a = String(Math.min(Number(initiator.static), Number(partner.static)));
        const b = String(Math.max(Number(initiator.static), Number(partner.static)));
        const key = pairSessionKey(a, b);

        const session = {
            a,
            b,
            kind,
            initiatorStatic: String(initiator.static),
            timer: null
        };
        pairSessions.set(key, session);

        const epsilonHandshake = kind === 'handshake' && pairHandshakeUsesEpsilon(initiator, partner);

        if (!epsilonHandshake) {
            initiator.setVariable('pairActive', true);
            partner.setVariable('pairActive', true);
            initiator.setVariable('pairKind', kind);
            partner.setVariable('pairKind', kind);
            initiator.setVariable('pairPartnerStatic', partner.static);
            partner.setVariable('pairPartnerStatic', initiator.static);
            initiator.setVariable('pairRole', 'initiator');
            partner.setVariable('pairRole', 'partner');
            initiator.setVariable('pairAttach', !!cfg.attach);
            partner.setVariable('pairAttach', !!cfg.attach);
            initiator.setVariable('pairCancelByG', cfg.cancelByG !== false);
            partner.setVariable('pairCancelByG', cfg.cancelByG !== false);

            initiator.call('pair:session:prep', [partner.id, kind, 'initiator']);
            partner.call('pair:session:prep', [initiator.id, kind, 'partner']);
        } else {
            session.epsilonHandshake = true;
            if (playerHasEpsilonUnlock(initiator)) {
                try { initiator.setVariable('pairEpsilonPrep', true); } catch (_e) {}
                initiator.call('pair:session:prep', [partner.id, kind, 'initiator']);
            }
            if (playerHasEpsilonUnlock(partner)) {
                try { partner.setVariable('pairEpsilonPrep', true); } catch (_e) {}
                partner.call('pair:session:prep', [initiator.id, kind, 'partner']);
            }
        }

        setTimeout(() => {
            if (pairSessions.get(key) !== session) return;
            beginPairSessionRuntime(session, key, cfg);
        }, PAIR_PREP_MS);

        return true;
    } catch (e) {
        console.log('[startPairInteraction]', e);
        if (initiator && mp.players.exists(initiator)) {
            isNotify(initiator, 2, 'top-mid', 'Ошибка парного действия.', 3500);
        }
        return false;
    }
};

mp.events.add('pair:cancel:s', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.getVariable('pairActive')) return;
        if (player.getVariable('pairCancelByG') === false) return;
        if (!player.clicked) player.clicked = 0;
        if (new Date().getTime() - player.clicked < 400) return;
        player.clicked = new Date().getTime();
        global.endPairInteractionForPlayer(player, null, player);
    } catch (e) {
        console.log('[pair:cancel:s]', e);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || player.static == null) return;
        global.endPairInteractionForPlayer(player, 'Парное действие прервано — игрок вышел.');
    } catch (_e) {}
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!player || player.static == null) return;
        global.endPairInteractionForPlayer(player, 'Парное действие прервано.');
    } catch (_e) {}
});

setInterval(() => {
    if (pairSessions.size === 0) return;
    try {
        for (const [key, session] of Array.from(pairSessions.entries())) {
            try {
                const pa = getPlayerByStatic(session.a);
                const pb = getPlayerByStatic(session.b);
                if (!pa || !mp.players.exists(pa) || !pb || !mp.players.exists(pb)) {
                    endPairSession(key, 'Парное действие прервано.');
                    continue;
                }
                if (pa.dimension !== 0 || pb.dimension !== 0) {
                    endPairSession(key, 'Парное действие прервано (измерение).');
                    continue;
                }
                if (session.kind === 'handhold' && pairPlayersDistance(pa, pb) > 10) {
                    endPairSession(key, 'Вы слишком далеко — парное действие сброшено.');
                } else if (session.epsilonSolo) {
                    /* Epsilon: можно отойти, сессия завершится по таймеру. */
                } else if (session.kind !== 'handhold' && pairPlayersDistance(pa, pb) > 6) {
                    endPairSession(key, 'Вы слишком далеко — парное действие сброшено.');
                }
            } catch (e) {
                try { console.log('[pair] interval iter', e); } catch (_e) {}
                try { pairSessions.delete(key); } catch (_e) {}
            }
        }
    } catch (e) {
        try { console.log('[pair] interval outer', e); } catch (_e) {}
    }
}, 2000);
