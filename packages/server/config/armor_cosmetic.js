/**
 * Донатные скины бронежилета (слот 9 при надетой боевой броне).
 * Шансы по таблице редкости case_rarity (линейки брендов).
 *
 * Sup_Luw (Фиолетовый 2): в исходном списке дублировался drawable 67 / texture 5 с «Красный» —texture сдвинут на 6.
 */

const RARITY = require('../case_rarity');

const VARIANTS = [
    { name: 'Luw (Коричневый)', d: 70, t: 0 },
    { name: 'Luw (Синий)', d: 70, t: 1 },
    { name: 'Luw (Черный)', d: 70, t: 2 },
    { name: 'Luw (Красный)', d: 70, t: 3 },
    { name: 'Luw (Зеленый)', d: 70, t: 4 },
    { name: 'Luw (Голубой)', d: 70, t: 5 },
    { name: 'Luw (Фиолетовый)', d: 70, t: 6 },
    { name: 'Luw (Оранжевый)', d: 70, t: 7 },
    { name: 'Luw (Белый)', d: 70, t: 8 },
    { name: 'Gucci (Оригинальный)', d: 70, t: 9 },
    { name: 'Gucci (Черный)', d: 70, t: 10 },
    { name: 'Gucci (Белый)', d: 70, t: 11 },
    { name: 'Gucci (Красный)', d: 70, t: 12 },
    { name: 'Gucci (Фиолетовый)', d: 70, t: 13 },
    { name: 'Gucci (Синий)', d: 70, t: 14 },
    { name: 'Gucci (Зеленый)', d: 70, t: 15 },
    { name: 'Gucci (Салатовый)', d: 70, t: 16 },
    { name: 'Gucci (Голубой)', d: 70, t: 17 },
    { name: 'Gucci (Желтый)', d: 70, t: 18 },
    { name: 'Gucci (Оранжевый)', d: 70, t: 19 },
    { name: 'PurBerry (Оригинальный)', d: 70, t: 20 },
    { name: 'Sup (Красный)', d: 71, t: 0 },
    { name: 'Sup (Салатовый)', d: 71, t: 1 },
    { name: 'Sup (Оранжевый)', d: 71, t: 2 },
    { name: 'Sup (Фиолетовый)', d: 71, t: 3 },
    { name: 'Sup (Голубой)', d: 71, t: 4 },
    { name: 'Sup (Белый 1)', d: 71, t: 5 },
    { name: 'Sup (Белый 2)', d: 71, t: 6 },
    { name: 'Sup (Желтый)', d: 71, t: 7 },
    { name: 'Sup_Luw (Фиолетовый 1)', d: 71, t: 9 },
    { name: 'Sup_Luw (Голубой)', d: 71, t: 10 },
    { name: 'Sup_Luw (Салатовый)', d: 71, t: 11 },
    { name: 'Sup_Luw (Желтый)', d: 72, t: 0 },
    { name: 'Sup_Luw (Оранжевый)', d: 72, t: 1 },
    { name: 'Sup_Luw (Розовый)', d: 72, t: 2 },
    { name: 'Sup_Luw (Коричневый)', d: 72, t: 3 },
    { name: 'Sup_Luw (Черный)', d: 72, t: 4 },
    { name: 'Sup_Luw (Красный)', d: 72, t: 5 },
    { name: 'Sup_Luw (Фиолетовый 2)', d: 72, t: 6 },
    { name: 'Sup_Luw (Синий)', d: 72, t: 7 },
    { name: 'Sup_Luw (Серый)', d: 72, t: 8 },
    { name: 'Sup_Luw (Зеленый)', d: 72, t: 9 },
    { name: 'Sup_Luw (Кожаный)', d: 72, t: 10 },
    { name: 'Sup_Luw (Белый)', d: 72, t: 11 },
    { name: 'Balenciaga (Белый)', d: 66, t: 0 },
    { name: 'Balenciaga (Красный 1)', d: 66, t: 1 },
    { name: 'Balenciaga (Розовый)', d: 66, t: 2 },
    { name: 'Balenciaga (Зеленый)', d: 66, t: 3 },
    { name: 'Balenciaga (Красный 2)', d: 66, t: 4 },
    { name: 'Balenciaga (Голубой)', d: 66, t: 5 },
    { name: 'Balenciaga (Черный)', d: 66, t: 6 }
];

const UNLOCK_KEY_MAP = new Map();
const NAME_MAP = new Map();
const ALLOWED_DRAWABLES = new Set([70, 71, 72, 66]);

/**
 * Старые drawable кейса ArmorCase → новые (миграция unlock-ключей и сохранённого armor).
 * 66 не мигрируем в 71: drawable 66 — Balenciaga; старый Sup уже на 71.
 */
const LEGACY_DRAWABLE_MAP = { 65: 70, 67: 72, 73: 66 };

function migrateDonationArmorPair(d, t) {
    const dd = Number(d);
    const tt = Number.isFinite(Number(t)) ? Number(t) : 0;
    const key = `${dd}:${tt}`;
    if (UNLOCK_KEY_MAP.has(key)) {
        return { d: dd, t: tt };
    }
    const nd = LEGACY_DRAWABLE_MAP[dd];
    if (nd != null) {
        const migratedKey = `${nd}:${tt}`;
        if (UNLOCK_KEY_MAP.has(migratedKey)) {
            return { d: nd, t: tt };
        }
    }
    return { d: dd, t: tt };
}

for (let i = 0; i < VARIANTS.length; i++) {
    const v = VARIANTS[i];
    const key = `${v.d}:${v.t}`;
    UNLOCK_KEY_MAP.set(key, v);
    NAME_MAP.set(v.name, v);
}

function unlockKey(d, t) {
    return `${Number(d)}:${Number(t)}`;
}

function getVariantByUnlockKey(key) {
    if (key == null || String(key).trim() === '') return null;
    return UNLOCK_KEY_MAP.get(String(key).trim()) || null;
}

function getVariantByPrizeName(name) {
    if (name == null || String(name).trim() === '') return null;
    return NAME_MAP.get(String(name).trim()) || null;
}

function acceptUnlockKey(key) {
    if (key == null || String(key).trim() === '') return false;
    const k = String(key).trim();
    if (getVariantByUnlockKey(k)) return true;
    const parts = k.split(':');
    if (parts.length < 2) return false;
    const migrated = migrateDonationArmorPair(parts[0], parts[1]);
    return ALLOWED_DRAWABLES.has(migrated.d);
}

function isAllowedDonationArmorPair(d, t) {
    const m = migrateDonationArmorPair(d, t);
    if (!ALLOWED_DRAWABLES.has(m.d)) return false;
    return acceptUnlockKey(`${m.d}:${m.t}`);
}

/**
 * Редкость скина брони по названию (все 6 тиров).
 * unique (бирюзовый) — только чёрные/белые; раньше почти всё было blue/unique
 * и из‑за дыры в % почти всегда падал последний unique.
 */
function armorRarityForName(name) {
    const n = String(name || '').toLowerCase();
    if (/черн|бел|white|black/.test(n)) return 'unique';
    if (/оригинал/.test(n)) return 'gold';
    if (/красн|\bred\b/.test(n)) return 'red';
    if (/фиолет|розов|purple|pink/.test(n)) return 'purple';
    if (/син|голуб|blue|cyan/.test(n)) return 'blue';
    return 'gray';
}

/** Элементы кейса: id с 2 — как у Silver (индекс 0 в рулетке — заглушка). */
function buildArmorCaseItems() {
    const withColor = VARIANTS.map((v, idx) => ({
        id: idx + 2,
        prize: v.name,
        color: armorRarityForName(v.name)
    }));
    return RARITY.applyRarityChances(withColor);
}

/** Инвентарный токен подарка: agift:70:0 */
const GIFT_PREFIX = 'agift:';

function giftTokenFromUnlockKey(key) {
    const k = String(key || '').trim();
    if (!k || !k.includes(':')) return null;
    return GIFT_PREFIX + k;
}

function giftTokenFromPair(d, t) {
    return giftTokenFromUnlockKey(unlockKey(d, t));
}

/**
 * Разбор токена подарка скина брони.
 * @returns {{ key: string, d: number, t: number, variant: object|null }|null}
 */
function parseGiftToken(raw) {
    if (raw == null) return null;
    let s = String(raw).replace(/^\uFEFF/, '').trim().split('(')[0].trim();
    if (!s.startsWith(GIFT_PREFIX)) return null;
    const rest = s.slice(GIFT_PREFIX.length).trim();
    if (!rest.includes(':')) return null;
    const parts = rest.split(':');
    const migrated = migrateDonationArmorPair(parts[0], parts[1]);
    const key = unlockKey(migrated.d, migrated.t);
    if (!acceptUnlockKey(key)) return null;
    return {
        key,
        d: migrated.d,
        t: migrated.t,
        variant: getVariantByUnlockKey(key)
    };
}

function isArmorGiftToken(raw) {
    return parseGiftToken(raw) != null;
}

function giftDisplayName(raw) {
    const parsed = parseGiftToken(raw);
    if (!parsed) return 'Подарок: скин бронежилета';
    if (parsed.variant && parsed.variant.name) return parsed.variant.name;
    return `Скин бронежилета ${parsed.key}`;
}

function normalizeUnlockArray(raw) {
    if (raw == null) return [];
    let arr = raw;
    if (Buffer.isBuffer && Buffer.isBuffer(arr)) {
        arr = arr.toString('utf8');
    }
    if (typeof arr === 'object' && arr !== null && !Array.isArray(arr)) {
        if (Array.isArray(arr.unlocks)) {
            arr = arr.unlocks;
        }
    }
    if (typeof arr === 'string') {
        let s = arr.trim();
        if (!s) return [];
        try {
            arr = JSON.parse(s);
        } catch (_e) {
            if (s.includes(':')) {
                arr = s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
            } else {
                return [];
            }
        }
        if (typeof arr === 'string') {
            try {
                arr = JSON.parse(arr);
            } catch (_e2) {
                return [];
            }
        }
    }
    if (!Array.isArray(arr)) return [];
    const out = [];
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
        const rawKey = String(arr[i] || '').trim();
        if (!rawKey) continue;
        let k = null;
        if (rawKey.includes(':')) {
            const parts = rawKey.split(':');
            const migrated = migrateDonationArmorPair(parts[0], parts[1]);
            k = `${migrated.d}:${migrated.t}`;
        } else {
            const byName = getVariantByPrizeName(rawKey);
            if (byName) k = unlockKey(byName.d, byName.t);
        }
        if (!k || seen.has(k)) continue;
        if (!acceptUnlockKey(k)) continue;
        seen.add(k);
        out.push(k);
    }
    return out;
}

module.exports = {
    VARIANTS,
    ALLOWED_DRAWABLES,
    GIFT_PREFIX,
    unlockKey,
    getVariantByUnlockKey,
    getVariantByPrizeName,
    isAllowedDonationArmorPair,
    acceptUnlockKey,
    migrateDonationArmorPair,
    armorRarityForName,
    buildArmorCaseItems,
    normalizeUnlockArray,
    giftTokenFromUnlockKey,
    giftTokenFromPair,
    parseGiftToken,
    isArmorGiftToken,
    giftDisplayName
};
