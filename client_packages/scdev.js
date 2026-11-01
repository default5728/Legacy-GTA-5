/**
 * Помощь для /sc и /scprop: кол-во drawable/текстур у локального педа (freemode).
 * Слоты 0–11 — компоненты (setClothes); props 0–7 — кепки (0), очки (1) и т.д. (setProp).
 * /sc авто и /sc оружие — только на сервере (commands.js).
 *
 * Зеркало после серверного player.setProp: у локального педа иногда нужен client-side setPropIndex (DLC 155+, донат 255+).
 */
function applyLocalPropSync(prop, drawable, texture) {
    try {
        const local = mp.players && mp.players.local;
        if (!local || !local.handle) return false;
        const p = Number(prop);
        const d = Number(drawable);
        const t = Number(texture);
        if (!Number.isFinite(p) || p < 0 || p > 7 || !Number.isFinite(d)) return false;
        const tt = Number.isFinite(t) ? t : 0;
        if (d < 0) {
            try { local.clearProp(p); } catch (_e) {}
            try { local.setPropIndex(p, -1, 0, true); } catch (_e2) {}
            return true;
        }
        if (typeof local.setPropIndex === 'function') {
            local.setPropIndex(p, d, tt, true);
        } else {
            local.setProp(p, d, tt, true);
        }
        return true;
    } catch (_e) {
        return false;
    }
}

mp.events.add('sc:syncPropLocal', (prop, drawable, texture) => {
    if (applyLocalPropSync(prop, drawable, texture)) return;
    /** Пед ещё не готов сразу после spawn — повтор через короткие интервалы. */
    let attempts = 0;
    const tick = setInterval(() => {
        attempts++;
        if (applyLocalPropSync(prop, drawable, texture) || attempts >= 12) {
            clearInterval(tick);
        }
    }, 250);
});

function applyLocalClothesSync(component, drawable, texture) {
    try {
        const local = mp.players && mp.players.local;
        if (!local || !local.handle) return false;
        const c = Number(component);
        const d = Number(drawable);
        const t = Number(texture);
        if (!Number.isFinite(c) || c < 0 || c > 11 || !Number.isFinite(d)) return false;
        const tt = Number.isFinite(t) ? t : 0;
        if (typeof local.setComponentVariation === 'function') {
            local.setComponentVariation(c, d, tt, 0);
        }
        return true;
    } catch (_e) {
        return false;
    }
}

global.applyLocalClothesSync = applyLocalClothesSync;
global.applyLocalPropSync = applyLocalPropSync;

const _clothesSyncTicks = Object.create(null);

mp.events.add('sc:syncClothesLocal', (component, drawable, texture) => {
    const c = Number(component);
    if (Number.isFinite(c) && _clothesSyncTicks[c] != null) {
        try { clearInterval(_clothesSyncTicks[c]); } catch (_e) {}
        _clothesSyncTicks[c] = null;
    }
    // В барбере не крутим интервал — иначе старые sync перебивают примерку DLC-причёсок.
    try {
        if (typeof brrs !== 'undefined' && brrs && brrs.active && c === 2) {
            applyLocalClothesSync(component, drawable, texture);
            return;
        }
    } catch (_e2) {}
    if (applyLocalClothesSync(component, drawable, texture)) return;
    let attempts = 0;
    const tick = setInterval(() => {
        attempts++;
        if (applyLocalClothesSync(component, drawable, texture) || attempts >= 12) {
            clearInterval(tick);
            if (Number.isFinite(c)) _clothesSyncTicks[c] = null;
        }
    }, 250);
    if (Number.isFinite(c)) _clothesSyncTicks[c] = tick;
});

mp.events.add('sc:getVariations', (slot) => {
    try {
        const s = parseInt(slot, 10);
        if (isNaN(s) || s < 0 || s > 11) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        const n = ped.getNumberOfDrawableVariations(s);
        mp.events.callRemote('sc:variationsResult', s, n);
    } catch (_e) {}
});

mp.events.add('sc:getTextureVariations', (slot, drawable) => {
    try {
        const s = parseInt(slot, 10);
        const d = parseInt(drawable, 10);
        if (isNaN(s) || s < 0 || s > 11 || isNaN(d) || d < 0) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        const n = ped.getNumberOfTextureVariations(s, d);
        mp.events.callRemote('sc:textureVariationsResult', s, d, n);
    } catch (_e) {}
});

/** Props (кепки = 0): те же индексы, что у player.setProp на сервере. */
mp.events.add('sc:getPropVariations', (propStr) => {
    try {
        const p = parseInt(propStr, 10);
        if (isNaN(p) || p < 0 || p > 7) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        const n = typeof ped.getNumberOfPropDrawableVariations === 'function' ? ped.getNumberOfPropDrawableVariations(p) : 0;
        mp.events.callRemote('sc:propVariationsResult', p, n);
    } catch (_e) {}
});

mp.events.add('sc:getPropTextureVariations', (propStr, drawableStr) => {
    try {
        const p = parseInt(propStr, 10);
        const d = parseInt(drawableStr, 10);
        if (isNaN(p) || p < 0 || p > 7 || isNaN(d) || d < 0) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        const n =
            typeof ped.getNumberOfPropTextureVariations === 'function' ? ped.getNumberOfPropTextureVariations(p, d) : 0;
        mp.events.callRemote('sc:propTextureVariationsResult', p, d, n);
    } catch (_e) {}
});
