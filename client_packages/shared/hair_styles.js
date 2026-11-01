'use strict';

/** Male mp_m_freemode_01, component 2. Drawable 23 в GTA пустой — пропускаем. */
const HAIR_MAX_DRAWABLE = 73;
/** Первый drawable новых DLC-причёсок (нужен client replay и варианты под шапку). */
const HAIR_DLC_MIN_DRAWABLE = 62;

/**
 * Новые причёски 62–73: что ставить под шапкой / маской / капюшоном вместо лысины 0:0.
 * null / отсутствует — обычная лысина (как у старых 0–61).
 * texture 1 — типичный «под головной убор» вариант в DLC-паке.
 */
const HAIR_UNDER_COVER_BY_DRAWABLE = {
    62: { drawable: 62, texture: 1 },
    63: { drawable: 63, texture: 1 },
    64: { drawable: 64, texture: 1 },
    65: { drawable: 65, texture: 1 },
    66: { drawable: 66, texture: 1 },
    67: { drawable: 67, texture: 1 },
    68: { drawable: 68, texture: 1 },
    69: { drawable: 69, texture: 1 },
    70: { drawable: 70, texture: 1 },
    71: { drawable: 71, texture: 1 },
    72: { drawable: 72, texture: 1 },
    73: { drawable: 73, texture: 1 }
};

function hairSkipDrawable(d) {
    return d === 23;
}

const HAIR_NAMES_BY_DRAWABLE = {
    0: 'Налысо',
    1: 'Классическая короткая',
    2: 'Спортивная стрижка',
    3: 'Ирокез',
    4: 'Короткий боб',
    5: 'Зализанные назад',
    6: 'Ежик',
    7: 'Кудрявый топ',
    8: 'Военная стрижка',
    9: 'Андеркат',
    10: 'Британка',
    11: 'Панк-ирокез',
    12: 'Длинные волнистые',
    13: 'Канадка',
    14: 'Ретро стиль',
    15: 'Гладко выбритые бока',
    16: 'Классический гребень',
    17: 'Длинные локоны',
    18: 'Средняя длина',
    19: 'Шэгги',
    20: 'Стрижка с пробором',
    21: 'Рокабилли',
    22: 'Месси',
    24: 'Пучок',
    25: 'Дреды короткие',
    26: 'Дреды длинные',
    27: 'Растаманские косички',
    28: 'Бокс',
    29: 'Полубокс',
    30: 'Кудрявый объем',
    31: 'Гладко зачесанный топ',
    32: 'Высокий фейд',
    33: 'Низкий фейд',
    34: 'Фейд с челкой',
    35: 'Афро',
    36: 'Косички',
    37: 'Длинные косы',
    38: 'Корнроу',
    39: 'Плетеные дреды',
    40: 'Лысина с рисунком',
    41: 'Плетеный верх',
    42: 'Спортивный ежик',
    43: 'Короткий ирокез',
    44: 'Фейд с узором',
    45: 'Рокерская прическа',
    46: 'Зализанный пучок',
    47: 'Длинные волосы назад',
    48: 'Завитки',
    49: 'Боб с челкой',
    50: 'Голливудская стрижка',
    51: 'Чоппи',
    52: 'Текстурированная прическа',
    53: 'Панк с пробором',
    54: 'Ретро-гребень',
    55: 'Густой и длинный',
    56: 'Грязный стиль',
    57: 'Классический афро',
    58: 'Гладкий фейд',
    59: 'Объемный андеркат',
    60: 'Хипстерский стиль',
    61: 'Пышный завиток',
    62: 'Короткий кроп',
    63: 'Модный фейд',
    64: 'Зачёс назад 2',
    65: 'Объёмные кудри 2',
    66: 'Текстурный топ 2',
    67: 'Прямой пробор 2',
    68: 'Растрепанный стиль',
    69: 'Элегантная укладка',
    70: 'Короткий гребень 2',
    71: 'Мини-ирокез',
    72: 'Косички с банданой',
    73: 'Длинные дреды 2'
};

function priceForDrawable(d) {
    if (d === 0) return 500;
    if (d <= 8) return 800;
    if (d <= 16) return 1000;
    if (d <= 24) return 1200;
    if (d <= 34) return 1500;
    if (d <= 44) return 1800;
    if (d <= 54) return 2000;
    if (d <= 61) return 2200;
    return 2500;
}

function buildHairStyles(maxDrawable) {
    const max = Math.min(
        Number.isFinite(maxDrawable) ? maxDrawable : HAIR_MAX_DRAWABLE,
        HAIR_MAX_DRAWABLE
    );
    const out = [];
    for (let d = 0; d <= max; d++) {
        if (hairSkipDrawable(d)) continue;
        out.push({
            name: HAIR_NAMES_BY_DRAWABLE[d] || ('Причёска ' + (d + 1)),
            drawable: d,
            price: priceForDrawable(d)
        });
    }
    return out;
}

function getHairDrawableList(maxDrawable) {
    return buildHairStyles(maxDrawable).map((h) => h.drawable);
}

function isValidHairDrawable(d) {
    const n = parseInt(d, 10);
    if (!Number.isFinite(n) || n < 0 || n > HAIR_MAX_DRAWABLE) return false;
    return !hairSkipDrawable(n);
}

function normalizeHairDrawable(d) {
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return 0;
    if (isValidHairDrawable(n)) return n;
    if (n === 23) return 22;
    return Math.max(0, Math.min(HAIR_MAX_DRAWABLE, n));
}

function normalizeHairTexture(t) {
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function isDlcHairDrawable(d) {
    const n = normalizeHairDrawable(d);
    return n >= HAIR_DLC_MIN_DRAWABLE;
}

/** Разбор "drawable:texture" из БД / canonicalHair. */
function parseHairSlot(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    if (!s) return null;
    const parts = s.split(':');
    const drawable = normalizeHairDrawable(parts[0]);
    if (drawable <= 0) return null;
    return {
        drawable,
        texture: normalizeHairTexture(parts[1])
    };
}

/**
 * Под шапкой / маской / капюшоном: лысина 0:0 для старых, вариант из HAIR_UNDER_COVER для 62+.
 */
function getHairCoverReplacement(drawable, texture) {
    const d = normalizeHairDrawable(drawable);
    const t = normalizeHairTexture(texture);
    if (d <= 0) return { drawable: 0, texture: 0 };
    const cover = HAIR_UNDER_COVER_BY_DRAWABLE[d];
    if (cover && Number.isFinite(cover.drawable)) {
        return {
            drawable: normalizeHairDrawable(cover.drawable),
            texture: normalizeHairTexture(cover.texture != null ? cover.texture : t)
        };
    }
    return { drawable: 0, texture: 0 };
}

/** На ped уже стоит лысина или DLC-вариант «под шапку», а не обычная причёска. */
function isHairCoverSlot(drawable, texture) {
    const d = normalizeHairDrawable(drawable);
    const t = normalizeHairTexture(texture);
    if (d <= 0) return true;
    const cover = HAIR_UNDER_COVER_BY_DRAWABLE[d];
    if (!cover) return false;
    const coverTex = normalizeHairTexture(cover.texture != null ? cover.texture : 0);
    return t === coverTex;
}

const api = {
    HAIR_MAX_DRAWABLE,
    HAIR_DLC_MIN_DRAWABLE,
    HAIR_UNDER_COVER_BY_DRAWABLE,
    buildHairStyles,
    getHairDrawableList,
    isValidHairDrawable,
    isDlcHairDrawable,
    normalizeHairDrawable,
    normalizeHairTexture,
    parseHairSlot,
    getHairCoverReplacement,
    isHairCoverSlot
};

if (typeof global !== 'undefined') {
    global.HairStylesConfig = api;
}
if (typeof window !== 'undefined') {
    window.HairStylesConfig = api;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
