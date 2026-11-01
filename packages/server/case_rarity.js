/**
 * Единая таблица редкости для всех кейсов рулетки.
 * Шансы в сумме = 100% (отсутствующие тиры перераспределяются).
 *
 * gray  — обычный
 * blue  — необычный
 * purple — редкий
 * gold  — эпический
 * red   — легендарный
 * unique — уникальный (бирюзовый)
 */
const RARITY_CHANCE = {
    gray: 55,
    blue: 25,
    purple: 12,
    gold: 5.5,
    red: 2,
    unique: 0.5
};

const RARITY_ORDER = ['gray', 'blue', 'purple', 'gold', 'red', 'unique'];

const RARITY_LABEL = {
    gray: 'Обычный',
    blue: 'Необычный',
    purple: 'Редкий',
    gold: 'Эпический',
    red: 'Легендарный',
    unique: 'Уникальный'
};

function rollRarity() {
    const r = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < RARITY_ORDER.length; i++) {
        const key = RARITY_ORDER[i];
        acc += RARITY_CHANCE[key];
        if (r < acc) return key;
    }
    return 'gray';
}

/** Равномерно делит шанс цвета между N предметами этого цвета. */
function chancePerItem(color, count) {
    const total = RARITY_CHANCE[color];
    const n = Math.max(1, parseInt(count, 10) || 1);
    if (total == null) return 0;
    return total / n;
}

/**
 * Проставляет chance предметам по color.
 * Если в кейсе нет какого-то тира — его % распределяется пропорционально
 * между присутствующими (сумма всегда ≈ 100%). Иначе «дыра» в Math.random()*100
 * падала на последний слот (часто бирюзовый unique).
 */
function applyRarityChances(items) {
    if (!Array.isArray(items)) return [];
    if (!items.length) return [];

    const byColor = {};
    for (let i = 0; i < items.length; i++) {
        const c = (items[i] && items[i].color) || 'gray';
        if (!byColor[c]) byColor[c] = [];
        byColor[c].push(items[i]);
    }

    const present = Object.keys(byColor);
    let sumBase = 0;
    const baseOf = {};
    for (let i = 0; i < present.length; i++) {
        const c = present[i];
        const base = RARITY_CHANCE[c] != null ? Number(RARITY_CHANCE[c]) : 0;
        baseOf[c] = base;
        sumBase += base;
    }

    const colorTotal = {};
    if (sumBase <= 0) {
        const eq = 100 / present.length;
        for (let i = 0; i < present.length; i++) colorTotal[present[i]] = eq;
    } else {
        for (let i = 0; i < present.length; i++) {
            const c = present[i];
            colorTotal[c] = (baseOf[c] / sumBase) * 100;
        }
    }

    return items.map((it) => {
        const c = (it && it.color) || 'gray';
        const n = byColor[c].length;
        const chance = (colorTotal[c] || 0) / Math.max(1, n);
        return Object.assign({}, it, { chance });
    });
}

/** Взвешенный выбор по полю chance (сумма может быть любой). */
function pickWeighted(items) {
    if (!Array.isArray(items) || !items.length) return null;
    const withChance = items[0] && items[0].chance != null ? items : applyRarityChances(items);
    let total = 0;
    for (let i = 0; i < withChance.length; i++) {
        total += Math.max(0, Number(withChance[i].chance) || 0);
    }
    if (total <= 0) return withChance[0];
    let r = Math.random() * total;
    for (let i = 0; i < withChance.length; i++) {
        r -= Math.max(0, Number(withChance[i].chance) || 0);
        if (r <= 0) return withChance[i];
    }
    return withChance[withChance.length - 1];
}

/** Случайный элемент из списка тиров выбранной редкости. */
function pickTierForRarity(tiersByRarity, rarity) {
    const list = tiersByRarity[rarity] || tiersByRarity.gray || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
    RARITY_CHANCE,
    RARITY_ORDER,
    RARITY_LABEL,
    rollRarity,
    chancePerItem,
    applyRarityChances,
    pickWeighted,
    pickTierForRarity
};
