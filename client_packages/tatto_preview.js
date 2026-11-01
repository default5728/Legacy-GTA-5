'use strict';

/** Локальное превью тату (сервер шлёт tatprev:apply) — setDecoration надёжнее только на клиенте. */

let tatprevActive = false;
let tatprevCollection = '';
let tatprevOverlay = '';

function applyLocalTattooPreview(collection, overlay) {
    try {
        const col = String(collection || '').trim();
        const ov = String(overlay || '').trim();
        if (!col || !ov) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        ped.clearDecorations();
        ped.setDecoration(mp.game.joaat(col), mp.game.joaat(ov));
    } catch (_e) {}
}

mp.events.add('tatprev:apply', (collection, overlay) => {
    tatprevActive = true;
    tatprevCollection = String(collection || '');
    tatprevOverlay = String(overlay || '');
    applyLocalTattooPreview(tatprevCollection, tatprevOverlay);
});

mp.events.add('tatprev:stop', () => {
    tatprevActive = false;
    tatprevCollection = '';
    tatprevOverlay = '';
    try {
        mp.players.local.clearDecorations();
    } catch (_e) {}
});

setInterval(() => {
    if (!tatprevActive || !tatprevCollection || !tatprevOverlay) return;
    applyLocalTattooPreview(tatprevCollection, tatprevOverlay);
}, 400);
