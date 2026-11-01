/**
 * Примерка в магазине одежды — только локальный ped (/sc), без сервера и БД.
 * При выходе: снимок на входе + серверный sc:sync* после restore.
 */
const SHOP_MALE_FREE_HASH = mp.game.joaat('mp_m_freemode_01');
const SHOP_FEMALE_FREE_HASH = mp.game.joaat('mp_f_freemode_01');
const SHOP_PREVIEW_PROP_SLOTS = [0, 1, 2, 6, 7];
const SHOP_PREVIEW_COMPONENT_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const DONATE_SKEL_GLOVE_TORSO_BARE = 224;
const DONATE_SKEL_GLOVE_TORSO_HOODIE = 222;
const DONATE_SKEL_GLOVE_TORSO_LAYER = 230;
const DONATE_SKEL_GLOVE_TOP_DRAWABLES_222 = new Set([
    619, 620, 621, 640, 641, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660
]);

function localComponentPair(component) {
    try {
        const ped = mp.players.local;
        if (!ped || !ped.handle) return { d: 0, t: 0 };
        const c = Number(component);
        return {
            d: ped.getDrawableVariation(c),
            t: ped.getTextureVariation(c)
        };
    } catch (_e) {
        return { d: 0, t: 0 };
    }
}

function localPropPair(prop) {
    try {
        const ped = mp.players.local;
        if (!ped || !ped.handle) return { d: -1, t: 0 };
        const p = Number(prop);
        const d = typeof ped.getPropIndex === 'function' ? ped.getPropIndex(p) : ped.getProp(p);
        const t = typeof ped.getPropTextureIndex === 'function' ? ped.getPropTextureIndex(p) : 0;
        return { d: Number.isFinite(Number(d)) ? Number(d) : -1, t: Number.isFinite(Number(t)) ? Number(t) : 0 };
    } catch (_e) {
        return { d: -1, t: 0 };
    }
}

function sc(component, drawable, texture) {
    if (typeof global.applyLocalClothesSync === 'function') {
        global.applyLocalClothesSync(component, drawable, texture);
    }
}

function scProp(prop, drawable, texture) {
    const apply = () => {
        if (typeof global.applyLocalPropSync === 'function') {
            return global.applyLocalPropSync(prop, drawable, texture);
        }
        return false;
    };
    if (apply()) return;
    /** DLC/donate props (155+, 247+) иногда появляются не с первого кадра. */
    let attempts = 0;
    const tick = setInterval(() => {
        attempts++;
        if (apply() || attempts >= 12) clearInterval(tick);
    }, 250);
}

function isFreemodeModel(model) {
    return model === SHOP_MALE_FREE_HASH || model === SHOP_FEMALE_FREE_HASH;
}

function applyLocalDonateSkeletonGlovesTorso(texVariant) {
    const ped = mp.players.local;
    if (!ped) return;
    const t = Number(texVariant);
    const tt = Number.isFinite(t) ? t : 0;
    if (ped.model !== SHOP_MALE_FREE_HASH) {
        sc(3, DONATE_SKEL_GLOVE_TORSO_LAYER, tt);
        return;
    }
    const top = localComponentPair(11);
    let d = DONATE_SKEL_GLOVE_TORSO_LAYER;
    if (top.d === 15 && top.t === 0) d = DONATE_SKEL_GLOVE_TORSO_BARE;
    else if (DONATE_SKEL_GLOVE_TOP_DRAWABLES_222.has(top.d)) d = DONATE_SKEL_GLOVE_TORSO_HOODIE;
    sc(3, d, tt);
}

/** Сохранить локальный ped после телепорта в магазин (до примерки). */
global.captureClothesShopLocalSnapshot = function captureClothesShopLocalSnapshot() {
    // Не перезаписывать снимок после начала примерки — иначе «восстановим» превью.
    if (global.__clothesShopPreviewActive === true && global.__clothesShopEntrySnap) return;
    const snap = { components: {}, props: {} };
    SHOP_PREVIEW_COMPONENT_SLOTS.forEach((c) => {
        snap.components[c] = localComponentPair(c);
    });
    SHOP_PREVIEW_PROP_SLOTS.forEach((p) => {
        snap.props[p] = localPropPair(p);
    });
    global.__clothesShopEntrySnap = snap;
};

function restoreClothesShopLocalSnapshot() {
    const snap = global.__clothesShopEntrySnap;
    if (!snap) return;
    SHOP_PREVIEW_COMPONENT_SLOTS.forEach((c) => {
        const row = snap.components[c];
        if (!row) return;
        sc(c, row.d, row.t);
    });
    SHOP_PREVIEW_PROP_SLOTS.forEach((p) => {
        const row = snap.props[p];
        if (!row) return;
        scProp(p, row.d, row.t);
    });
}

/** После выхода: только слоты, которые трогает примерка верха/сумки — не затирать штаны с сервера. */
function restoreClothesShopUpperFromSnapshot(snapshot) {
    const snap = snapshot || global.__clothesShopEntrySnap;
    if (!snap || !snap.components) return;
    [3, 5, 8, 10, 11].forEach((c) => {
        const row = snap.components[c];
        if (!row) return;
        sc(c, row.d, row.t);
    });
}

/** Локальная примерка (как /sc): меняет только client ped, сервер/БД не трогаем. */
global.applyClothesShopPreviewLocal = function applyClothesShopPreviewLocal(item) {
    if (!item || global.__clothesShopOpen !== true) return;
    const ped = mp.players.local;
    if (!ped) return;

    const cid = Number(item.ClothID);
    const d = Number(item.Drawable);
    const t = Number(item.TopTexture);
    const torsoRaw = item.Torso;
    const hasTorso = torsoRaw !== null && torsoRaw !== undefined && torsoRaw !== 'null' && !Number.isNaN(Number(torsoRaw));

    // Первый снимок до любой примерки, если delayed capture ещё не успел.
    if (!global.__clothesShopEntrySnap) {
        try {
            global.captureClothesShopLocalSnapshot();
        } catch (_eCap) {}
    }

    global.__clothesShopPreviewActive = true;

    if (cid === 1) {
        scProp(0, d, t);
        return;
    }
    if (cid === 2) {
        sc(1, d, t);
        return;
    }
    if (cid === 3) {
        if (hasTorso) {
            const tt = Number(torsoRaw);
            if (!Number.isNaN(tt)) sc(3, tt, 0);
        } else if (isFreemodeModel(ped.model)) {
            sc(3, 15, 0);
        }
        sc(10, 0, 0);
        if (isFreemodeModel(ped.model)) sc(8, 15, 0);
        sc(11, d, t);
        return;
    }
    if (cid === 4) {
        sc(4, d, t);
        return;
    }
    if (cid === 5) {
        sc(6, d, t);
        return;
    }
    if (cid === 6) {
        sc(7, d, t);
        return;
    }
    if (cid === 7) {
        scProp(1, d, t);
        return;
    }
    if (cid === 8) {
        // Визуальная примерка сумки. Карман на сервере заморожен (shopc freeze).
        sc(5, d, t);
        return;
    }
    if (cid === 9) {
        sc(10, d, t);
        return;
    }
    if (cid === 12) {
        scProp(2, d, t);
        return;
    }
    if (cid === 13) {
        scProp(6, d, t);
        return;
    }
    if (cid === 14) {
        scProp(7, d, t);
        return;
    }
    if (cid === 15) {
        applyLocalDonateSkeletonGlovesTorso(t);
    }
};

global.clearClothesShopLocalPreview = function clearClothesShopLocalPreview() {
    const closingSnap = global.__clothesShopEntrySnap;
    const closeSeq = (Number(global.__clothesShopPreviewCloseSeq) || 0) + 1;
    global.__clothesShopPreviewCloseSeq = closeSeq;
    try {
        restoreClothesShopLocalSnapshot();
    } catch (_e) {}
    global.__clothesShopPreviewActive = false;
    // Снимок принадлежит завершённой сессии и не должен попасть в следующий вход.
    global.__clothesShopEntrySnap = null;
    // Повторно только верх/сумка — полный snap затрёт штаны после серверного restore.
    if (closingSnap) {
        const reapplyUpper = () => {
            if (global.__clothesShopOpen === true) return;
            if (global.__clothesShopPreviewCloseSeq !== closeSeq) return;
            try {
                restoreClothesShopUpperFromSnapshot(closingSnap);
            } catch (_e2) {}
        };
        setTimeout(reapplyUpper, 50);
        setTimeout(reapplyUpper, 250);
        setTimeout(reapplyUpper, 600);
    }
};

global.scheduleClothesShopLocalSnapshot = function scheduleClothesShopLocalSnapshot() {
    // Отменить delayed restore от предыдущего закрытия.
    global.__clothesShopPreviewCloseSeq = (Number(global.__clothesShopPreviewCloseSeq) || 0) + 1;
    try {
        global.captureClothesShopLocalSnapshot();
    } catch (_e0) {}
    setTimeout(() => {
        if (global.__clothesShopOpen !== true) return;
        if (global.__clothesShopPreviewActive === true) return;
        global.captureClothesShopLocalSnapshot();
    }, 80);
    setTimeout(() => {
        if (global.__clothesShopOpen !== true) return;
        if (global.__clothesShopPreviewActive === true) return;
        global.captureClothesShopLocalSnapshot();
    }, 250);
};

mp.events.add('clothes:shop:visualRestored', () => {
    global.__clothesShopPreviewActive = false;
    global.__clothesShopPreviewCloseSeq = (Number(global.__clothesShopPreviewCloseSeq) || 0) + 1;
    // Сервер уже вернул боевую одежду — локальный shop-snap больше не нужен.
    global.__clothesShopEntrySnap = null;
});
