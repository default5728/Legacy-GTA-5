'use strict';

const CITIZEN_LABEL = 'Гражданин';
let acquaintanceStatics = new Set();

function normalizeFamilyKey(name) {
    if (name == null) return '';
    return String(name).trim();
}

function playerFractionId(p) {
    if (!p || !mp.players.exists(p)) return 0;
    return parseInt(p.getVariable('fraction'), 10) || 0;
}

mp.events.add('citizen:sync:c', (jsonRaw) => {
    try {
        const data = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
        acquaintanceStatics = new Set((data && data.acquaintances ? data.acquaintances : []).map((n) => Number(n)).filter((n) => n > 0));
    } catch (_e) {
        acquaintanceStatics = new Set();
    }
});

global.citizenResolveLogin = function citizenResolveLogin(remotePlayer) {
    const local = mp.players.local;
    if (!remotePlayer || !mp.players.exists(remotePlayer)) return CITIZEN_LABEL;

    const realLogin = String(remotePlayer.getVariable('login') || '').trim();

    // Себя всегда показываем с реальным логином; «Гражданин» — только маска для чужих.
    if (remotePlayer === local) {
        return realLogin || CITIZEN_LABEL;
    }

    const rs = Number(remotePlayer.getVariable('static'));
    const lf = normalizeFamilyKey(local.getVariable('family'));
    const rf = normalizeFamilyKey(remotePlayer.getVariable('family'));
    if (lf && rf && lf === rf) {
        return realLogin || CITIZEN_LABEL;
    }

    const lfr = playerFractionId(local);
    const rfr = playerFractionId(remotePlayer);
    if (lfr > 0 && lfr === rfr) {
        return realLogin || CITIZEN_LABEL;
    }

    if (acquaintanceStatics.has(rs)) {
        return realLogin || CITIZEN_LABEL;
    }

    return CITIZEN_LABEL;
};

global.citizenResolveLoginEscaped = function citizenResolveLoginEscaped(remotePlayer) {
    return String(global.citizenResolveLogin(remotePlayer) || CITIZEN_LABEL)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
};
