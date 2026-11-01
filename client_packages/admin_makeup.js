/** Админ-команда /makeup — RAGE: Player.setHeadOverlay (без mp.game.invoke). */
mp.events.add('admin:makeup:apply', (overlayIndex, styleId, opacity, colorFirst, colorSecond) => {
    try {
        const oi = parseInt(overlayIndex, 10);
        const sid = parseInt(styleId, 10);
        const op = typeof opacity === 'number' && !Number.isNaN(opacity) ? opacity : parseFloat(opacity);
        const c1 = Number.isNaN(parseInt(colorFirst, 10)) ? 0 : parseInt(colorFirst, 10);
        const c2 = Number.isNaN(parseInt(colorSecond, 10)) ? 0 : parseInt(colorSecond, 10);
        if (Number.isNaN(oi) || Number.isNaN(sid) || Number.isNaN(op)) return;
        mp.players.local.setHeadOverlay(oi, sid, op, c1, c2);
    } catch (_e) {}
});
