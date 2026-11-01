/**

 * Скрытие причёски: шапка (prop 0), часть масок (comp 1), донат-верх с капюшоном (comp 11).

 * Пока условие «прятать» активно — подставляется лысина или DLC-вариант «под шапку» (62+).

 * Варианты новых причёсок под шапку — shared/hair_styles.js.

 */



function hatHairCfg() {

    if (typeof global !== 'undefined' && global.HairStylesConfig) return global.HairStylesConfig;

    return {

        parseHairSlot: function () { return null; },

        getHairCoverReplacement: function () { return { drawable: 0, texture: 0 }; },

        isDlcHairDrawable: function () { return false; },

        isHairCoverSlot: function () { return false; }

    };

}



const HAT_NO_HIDE_DRAWABLES = new Set([249, 257]);



function hatIsNone(d) {

    return d < 0 || d === 8;

}



function hatHidesHair(d) {

    return !hatIsNone(d) && !HAT_NO_HIDE_DRAWABLES.has(d);

}



function maskHidesHair(drawable, texture) {

    const d = Number(drawable);

    const t = Number(texture);

    if (!Number.isFinite(d) || d <= 0) return false;

    if (d === 250 && Number.isFinite(t) && t >= 0 && t <= 9) return true;

    if (d === 252 && Number.isFinite(t) && t >= 0 && t <= 23) return true;

    return false;

}



/** Без 644 (худи с очками открытая) — причёска остаётся. */

const TOP_HIDE_HAIR_DRAWABLES = new Set([620, 621, 645]);



function topHidesHair(drawable) {

    const d = Number(drawable);

    return Number.isFinite(d) && TOP_HIDE_HAIR_DRAWABLES.has(d);

}



function shouldHideHairFromPed() {

    try {

        const hat = mp.players.local.getPropIndex(0);

        const maskD = mp.players.local.getDrawableVariation(1);

        const maskT = mp.players.local.getTextureVariation(1);

        const topD = mp.players.local.getDrawableVariation(11);

        return hatHidesHair(hat) || maskHidesHair(maskD, maskT) || topHidesHair(topD);

    } catch (_e) {

        return false;

    }

}



function readCanonicalHairFromVariable() {

    try {

        const raw = mp.players.local.getVariable('canonicalHair');

        return hatHairCfg().parseHairSlot(raw);

    } catch (_e) {

        return null;

    }

}



function readCurrentHairFromPed() {

    const canonical = readCanonicalHairFromVariable();

    if (canonical && canonical.drawable > 0) return canonical;



    try {

        const hd = mp.players.local.getDrawableVariation(2);

        const ht = mp.players.local.getTextureVariation(2);

        if (typeof hd !== 'number' || hd <= 0) return null;

        const pedHair = { drawable: hd, texture: typeof ht === 'number' ? ht : 0 };

        const cfg = hatHairCfg();

        if (typeof cfg.isHairCoverSlot === 'function' && cfg.isHairCoverSlot(pedHair.drawable, pedHair.texture)) {

            if (cfg.isDlcHairDrawable(pedHair.drawable)) {

                return { drawable: pedHair.drawable, texture: 0 };

            }

            return null;

        }

        return pedHair;

    } catch (_e) {}

    return null;

}



function applyHairLocal(drawable, texture, repeatDlc) {
    const d = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(d)) return;

    // Сброс прошлых delayed-replay — иначе старые таймеры дёргают причёску
    if (!Array.isArray(global.__hatHairApplyTimers)) global.__hatHairApplyTimers = [];
    for (let i = 0; i < global.__hatHairApplyTimers.length; i++) {
        try { clearTimeout(global.__hatHairApplyTimers[i]); } catch (_e0) {}
    }
    global.__hatHairApplyTimers = [];
    const gen = (global.__hatHairApplyGen = (global.__hatHairApplyGen || 0) + 1);

    try {
        mp.players.local.setComponentVariation(2, d, t, 0);
    } catch (_e) {}

    try {
        if (typeof global.applyLocalClothesSync === 'function') global.applyLocalClothesSync(2, d, t);
    } catch (_e2) {}

    if (!repeatDlc || !hatHairCfg().isDlcHairDrawable(d)) return;
    if (typeof global.isBarberShopOpen === 'function' && global.isBarberShopOpen()) return;

    const delays = [80, 200, 500, 1200];
    for (let i = 0; i < delays.length; i++) {
        const id = setTimeout(() => {
            try {
                if (global.__hatHairApplyGen !== gen) return;
                if (typeof global.isBarberShopOpen === 'function' && global.isBarberShopOpen()) return;
                mp.players.local.setComponentVariation(2, d, t, 0);
                if (typeof global.applyLocalClothesSync === 'function') global.applyLocalClothesSync(2, d, t);
            } catch (_e3) {}
        }, delays[i]);
        global.__hatHairApplyTimers.push(id);
    }
}



let _hairSuppressed = false;

let _savedHairDrawable = null;

let _savedHairTexture = null;

let _coverHairDrawable = 0;

let _coverHairTexture = 0;

let _frameCounter = 0;

const POLL_INTERVAL = 12;



let _resyncTimeoutIds = [];



function clearResyncSchedule() {

    for (let i = 0; i < _resyncTimeoutIds.length; i++) {

        try {

            clearTimeout(_resyncTimeoutIds[i]);

        } catch (_e) {}

    }

    _resyncTimeoutIds = [];

}



function scheduleHatHairResyncDelays() {

    clearResyncSchedule();

    const delays = [50, 150, 400, 900, 2000, 4000];

    for (let i = 0; i < delays.length; i++) {

        const id = setTimeout(() => {

            try {

                if (typeof global.resetHatHairState === 'function') global.resetHatHairState();

                hatHairStepFromPed();

            } catch (_e) {}

        }, delays[i]);

        _resyncTimeoutIds.push(id);

    }

}



function hatHairStepFromPed() {

    const cfg = hatHairCfg();

    const nowHide = shouldHideHairFromPed();

    if (nowHide) {

        if (!_hairSuppressed) {

            const saved = readCurrentHairFromPed();

            if (saved && saved.drawable > 0) {

                _savedHairDrawable = saved.drawable;

                _savedHairTexture = saved.texture || 0;

            } else {

                _savedHairDrawable = null;

                _savedHairTexture = null;

            }

            const cover = cfg.getHairCoverReplacement(_savedHairDrawable || 0, _savedHairTexture || 0);

            _coverHairDrawable = cover.drawable;

            _coverHairTexture = cover.texture;

            _hairSuppressed = true;

        }

        applyHairLocal(_coverHairDrawable, _coverHairTexture, false);

        return;

    }

    if (_hairSuppressed) {

        _hairSuppressed = false;

        const canonical = readCanonicalHairFromVariable();

        let restoreD = _savedHairDrawable;

        let restoreT = _savedHairTexture || 0;

        if (canonical && canonical.drawable > 0) {

            restoreD = canonical.drawable;

            restoreT = canonical.texture || 0;

        }

        if (restoreD !== null && restoreD > 0) {

            applyHairLocal(restoreD, restoreT, true);

        } else {

            try {

                mp.events.callRemote('hat:restoreHair:s');

            } catch (_e3) {}

        }

        _savedHairDrawable = null;

        _savedHairTexture = null;

        _coverHairDrawable = 0;

        _coverHairTexture = 0;

    }

}



mp.events.add('render', () => {
    _frameCounter++;
    if (_frameCounter < POLL_INTERVAL) return;
    _frameCounter = 0;

    try {
        if (!mp.players.local.getVariable('auth')) return;
        if (typeof global.isBarberShopOpen === 'function' && global.isBarberShopOpen()) return;
        if (typeof brrs !== 'undefined' && brrs && brrs.active) return;
        hatHairStepFromPed();
    } catch (_e) {}
});



mp.events.add('playerSpawn', () => {

    _hairSuppressed = false;

    _savedHairDrawable = null;

    _savedHairTexture = null;

    scheduleHatHairResyncDelays();

});



mp.events.addDataHandler('auth', (entity, value) => {

    try {

        if (entity !== mp.players.local) return;

        if (!value) return;

        _hairSuppressed = false;

        _savedHairDrawable = null;

        _savedHairTexture = null;

        scheduleHatHairResyncDelays();

    } catch (_e) {}

});



mp.events.addDataHandler('canonicalHair', (entity, value) => {
    try {
        if (entity !== mp.players.local) return;
        if (typeof global.isBarberShopOpen === 'function' && global.isBarberShopOpen()) return;

        const slot = hatHairCfg().parseHairSlot(value);
        if (_hairSuppressed) {
            if (slot && slot.drawable > 0) {
                _savedHairDrawable = slot.drawable;
                _savedHairTexture = slot.texture || 0;
            }
            return;
        }
        if (shouldHideHairFromPed()) {
            hatHairStepFromPed();
            return;
        }
        if (slot && slot.drawable > 0) {
            applyHairLocal(slot.drawable, slot.texture || 0, true);
        }
    } catch (_e) {}
});



mp.events.add('client:resetHatHairAfterClothing', () => {

    try {

        if (typeof global.forceHatHairResync === 'function') global.forceHatHairResync();

        else if (typeof global.resetHatHairState === 'function') global.resetHatHairState();

    } catch (_e) {}

});



global.resetHatHairState = function () {

    _hairSuppressed = false;

    _savedHairDrawable = null;

    _savedHairTexture = null;

    _coverHairDrawable = 0;

    _coverHairTexture = 0;

};



global.forceHatHairResync = function () {

    try {

        global.resetHatHairState();

        scheduleHatHairResyncDelays();

    } catch (_e) {}

};


