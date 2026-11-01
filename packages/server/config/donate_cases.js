/**
 * Донат-кейсы: Gun / Bags / Clothes.
 * Bags + Clothes строятся из global.DonateClothesItemsSell (как донат-магазин).
 * Редкость (шанс) — обратно пропорциональна цене в DP.
 */

const { premiumDpPrice } = require('./clothing_economy');

/** Категории донат-магазина (без сумок — ClothID 8). */
const CLOTHES_CASE_CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15];
const BAGS_CLOTH_ID = 8;
const BAGS_CASE_PICK_COUNT = 5;
const CLOTHES_PER_CATEGORY = 2;

function resolveDonateSellRow(pool, clothid, itemid, itemname, itemfraction, drawable, texture) {
    if (!pool || !pool.length) return null;
    const cid = Number(clothid);
    const iid = Number(itemid);
    const nf = Number(itemfraction);
    const name = itemname == null ? '' : String(itemname);
    const d = drawable != null && drawable !== '' ? Number(drawable) : NaN;
    const t = texture != null && texture !== '' ? Number(texture) : NaN;
    const hasDraw = Number.isFinite(d);
    const hasTex = Number.isFinite(t);
    if (hasDraw !== hasTex) return null;
    if (hasDraw && hasTex) {
        const exact = pool.filter(
            (it) =>
                Number(it.ClothID) === cid &&
                Number(it.ItemID) === iid &&
                Number(it.Frac) === nf &&
                Number(it.Drawable) === d &&
                Number(it.TopTexture) === t
        );
        const named = exact.find((it) => String(it.ItemName || '') === name);
        return named || (exact.length === 1 ? exact[0] : null);
    }
    const same = pool.filter(
        (it) =>
            Number(it.ClothID) === cid &&
            Number(it.ItemID) === iid &&
            Number(it.Frac) === nf &&
            String(it.ItemName || '') === name
    );
    if (same.length === 1) return same[0];
    const byIds = pool.filter(
        (it) => Number(it.ClothID) === cid && Number(it.ItemID) === iid && Number(it.Frac) === nf
    );
    if (byIds.length === 1) return byIds[0];
    return null;
}

function getDonateDp(row) {
    return row ? premiumDpPrice(row) : 1;
}

function pickCatalogRow(rows) {
    if (!rows || !rows.length) return null;
    const sorted = rows.slice().sort((a, b) => {
        const fa = Number(a.Frac);
        const fb = Number(b.Frac);
        if (fa !== fb) return fa - fb;
        return Number(a.TopTexture) - Number(b.TopTexture);
    });
    return sorted[0];
}

function rowToPrize(row) {
    return `CaseCloth|${row.ItemID}|${row.ClothID}|${encodeURIComponent(row.ItemName)}|${row.Frac}|${row.Drawable}|${row.TopTexture}`;
}

function applyPriceBasedChances(rows) {
    if (!rows || !rows.length) return [];
    const weights = rows.map((row) => ({ row, w: 1 / getDonateDp(row) }));
    const sumW = weights.reduce((s, x) => s + x.w, 0);
    if (sumW <= 0) return [];
    return weights.map((x) => ({
        prize: rowToPrize(x.row),
        chance: Math.max(1, Math.round((10000 * x.w) / sumW)),
        dp: getDonateDp(x.row)
    }));
}

function groupPoolByDrawable(pool, clothId) {
    const map = new Map();
    for (let i = 0; i < pool.length; i++) {
        const it = pool[i];
        if (Number(it.ClothID) !== clothId) continue;
        const d = Number(it.Drawable);
        if (!Number.isFinite(d)) continue;
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(it);
    }
    return map;
}

/** Две разные позиции из категории: самая дешёвая и самая дорогая (разные drawable или текстуры). */
function pickTwoFromCategory(pool, clothId) {
    const byDrawable = groupPoolByDrawable(pool, clothId);
    const groups = [];
    byDrawable.forEach((rows) => {
        const rep = pickCatalogRow(rows);
        if (!rep) return;
        groups.push({ rows, rep, dp: getDonateDp(rep) });
    });
    groups.sort((a, b) => a.dp - b.dp);

    if (groups.length >= 2) {
        return [pickCatalogRow(groups[0].rows), pickCatalogRow(groups[groups.length - 1].rows)];
    }
    if (groups.length === 1) {
        const uniq = new Map();
        for (let i = 0; i < groups[0].rows.length; i++) {
            const r = groups[0].rows[i];
            const key = `${r.Drawable}|${r.TopTexture}`;
            if (!uniq.has(key)) uniq.set(key, r);
        }
        const list = [...uniq.values()].sort((a, b) => getDonateDp(a) - getDonateDp(b));
        if (list.length >= CLOTHES_PER_CATEGORY) {
            return [list[0], list[list.length - 1]];
        }
        return list.length ? [list[0]] : [];
    }
    return [];
}

function buildClothesCasePool() {
    const pool = global.DonateClothesItemsSell;
    if (!pool || !pool.length) return [];

    const picked = [];
    const seen = new Set();

    for (let c = 0; c < CLOTHES_CASE_CATEGORY_IDS.length; c++) {
        const cid = CLOTHES_CASE_CATEGORY_IDS[c];
        const two = pickTwoFromCategory(pool, cid);
        for (let i = 0; i < two.length; i++) {
            const row = two[i];
            const key = `${row.ClothID}|${row.Drawable}|${row.TopTexture}|${row.ItemName}|${row.Frac}`;
            if (seen.has(key)) continue;
            seen.add(key);
            picked.push(row);
        }
    }

    return applyPriceBasedChances(picked);
}

/** Ровно 5 разных сумок — равномерно по цене из каталога. */
function buildBagsCasePool() {
    const pool = global.DonateClothesItemsSell;
    if (!pool || !pool.length) return [];

    const byDrawable = groupPoolByDrawable(pool, BAGS_CLOTH_ID);
    const groups = [];
    byDrawable.forEach((rows) => {
        const rep = pickCatalogRow(rows);
        if (!rep) return;
        groups.push({ row: rep, dp: getDonateDp(rep) });
    });
    groups.sort((a, b) => a.dp - b.dp);

    const n = groups.length;
    if (!n) return [];

    let pickedRows;
    if (n <= BAGS_CASE_PICK_COUNT) {
        pickedRows = groups.map((g) => g.row);
    } else {
        pickedRows = [];
        for (let i = 0; i < BAGS_CASE_PICK_COUNT; i++) {
            const idx = Math.round((i * (n - 1)) / (BAGS_CASE_PICK_COUNT - 1));
            pickedRows.push(groups[idx].row);
        }
    }

    return applyPriceBasedChances(pickedRows);
}

function getGunCaseItems() {
    return [
        { prize: 'Heavy Sniper MK1', chance: 10 },
        { prize: 'Heavy Sniper MK2', chance: 5 },
        { prize: 'SniperRifle', chance: 15 },
        { prize: 'Marksman Rifle', chance: 30 },
        { prize: 'Precision Rifle', chance: 40 }
    ];
}

function getBagsCaseItems() {
    return buildBagsCasePool();
}

function getClothesCaseItems() {
    return buildClothesCasePool();
}

function parseCaseClothPrize(raw) {
    const s = String(raw || '').trim();
    if (!s.startsWith('CaseCloth|')) return null;
    const parts = s.split('|');
    if (parts.length < 5) return null;
    const itemid = parseInt(parts[1], 10);
    const clothid = parseInt(parts[2], 10);
    let itemname = '';
    try {
        itemname = decodeURIComponent(parts[3]);
    } catch (_e) {
        return null;
    }
    const frac = parseInt(parts[4], 10);
    const drawable = parts.length > 5 ? parseInt(parts[5], 10) : NaN;
    const texture = parts.length > 6 ? parseInt(parts[6], 10) : NaN;
    if (!Number.isFinite(itemid) || !Number.isFinite(clothid)) return null;
    return {
        itemid,
        clothid,
        itemname,
        frac: Number.isFinite(frac) ? frac : 1,
        drawable: Number.isFinite(drawable) ? drawable : null,
        texture: Number.isFinite(texture) ? texture : null
    };
}

function caseClothSellMoney(prizeStr) {
    const p = parseCaseClothPrize(prizeStr);
    if (!p) return 0;
    const row = resolveDonateSellRow(
        global.DonateClothesItemsSell,
        p.clothid,
        p.itemid,
        p.itemname,
        p.frac,
        p.drawable,
        p.texture
    );
    if (!row) return 0;
    const legacyCash = Math.max(1, Math.floor(Number(row.Price) || 0) + 50000);
    return Math.max(500, Math.floor(legacyCash / 2));
}

const CLIENT_CLOTH_ICONS = {
    1: 'package://browsers/shopclothesnew/img/icon_hat.png',
    2: 'package://browsers/shopclothesnew/img/icon_mask.png',
    3: 'package://browsers/shopclothesnew/img/icon_top.png',
    4: 'package://browsers/shopclothesnew/img/icon_legs.png',
    5: 'package://browsers/shopclothesnew/img/icon_shoes.png',
    6: 'package://browsers/shopclothesnew/img/icon_accessory.png',
    7: 'package://browsers/shopclothesnew/img/icon_glasses.png',
    8: 'package://browsers/shopclothesnew/img/icon_bag.png',
    9: 'package://browsers/shopclothesnew/img/icon_armor.png',
    12: 'package://browsers/shopclothesnew/img/icon_earring.png',
    13: 'package://browsers/shopclothesnew/img/icon_watch.png',
    14: 'package://browsers/shopclothesnew/img/icon_bracelet.png',
    15: 'package://browsers/shopclothesnew/img/icon_gloves.png'
};

const DONATE_CLOTH_ASSETS_BASE = 'package://browsers/inventory/clothes_assets/';
const DONATE_CID_TO_FOLDER = {
    1: 'hats',
    2: 'masks',
    3: 'tops',
    4: 'legs',
    5: 'shoes',
    6: 'accessories',
    7: 'glasses',
    8: 'bags',
    12: 'ears',
    13: 'watches',
    14: 'bracelets',
    15: 'gloves'
};

function donateShopDisplayBase(full) {
    let s = String(full || '').trim();
    s = s.replace(/\s*\(\d+\s*слотов\)/gi, '').trim();
    const i = s.indexOf(' · текст.');
    if (i >= 0) return s.slice(0, i).trim();
    const j = s.indexOf(' · text.');
    if (j >= 0) return s.slice(0, j).trim();
    const k = s.indexOf(' · ');
    if (k >= 0) return s.slice(0, k).trim();
    return s;
}

function donateVariantNumber(row) {
    const tt = row && row.TopTexture != null ? Number(row.TopTexture) : 0;
    return (Number.isFinite(tt) ? tt : 0) + 1;
}

function caseClothDisplayLabelFromItem(item) {
    if (!item) return 'Одежда';
    const base = donateShopDisplayBase(item.ItemName);
    const raw = String(item.ItemName || '');
    if (/[·•]\s*(?:текст|text)\.\d+/i.test(raw)) {
        return `${base} · Вариант ${donateVariantNumber(item)}`;
    }
    return base || 'Одежда';
}

function caseClothCategoryIcon(clothid) {
    const cid = Number(clothid);
    return CLIENT_CLOTH_ICONS[cid] || CLIENT_CLOTH_ICONS[3];
}

function caseClothPreviewImg(item, genderMale) {
    if (!item) return caseClothCategoryIcon(3);
    const gdir = genderMale === false ? 'female' : 'male';
    const cid = Number(item.ClothID);
    const folder = DONATE_CID_TO_FOLDER[cid];
    const d = Number(item.Drawable);
    const t = item.TopTexture != null ? Number(item.TopTexture) : 0;
    if (folder && Number.isFinite(d) && Number.isFinite(t)) {
        return `${DONATE_CLOTH_ASSETS_BASE}${gdir}/${folder}/${d}_${t}.png`;
    }
    return caseClothCategoryIcon(cid);
}

function buildClientCaseCatalogRows(items, pool) {
    if (!items || !items.length) return [];
    const sumChance = items.reduce((s, row) => s + (Number(row.chance) || 0), 0) || 1;
    const out = [];
    for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const prize = String(row.prize || '').trim();
        const p = parseCaseClothPrize(prize);
        if (!p) continue;
        const sellRow = resolveDonateSellRow(
            pool,
            p.clothid,
            p.itemid,
            p.itemname,
            p.frac,
            p.drawable,
            p.texture
        );
        const label = caseClothDisplayLabelFromItem(sellRow) || donateShopDisplayBase(p.itemname) || prize;
        const img = sellRow
            ? caseClothPreviewImg(sellRow, true)
            : caseClothCategoryIcon(p.clothid);
        const chancePct = Math.max(0.1, (Number(row.chance) || 0) / sumChance * 100);
        const dp = sellRow ? getDonateDp(sellRow) : (Number(row.dp) || 0);
        out.push({
            Prize: prize,
            Label: label,
            ClothID: p.clothid,
            dp,
            Price: caseClothSellMoney(prize) * 2,
            img,
            imgFallback: caseClothCategoryIcon(p.clothid),
            chancePct: chancePct.toFixed(chancePct >= 10 ? 0 : 1)
        });
    }
    return out;
}

function getClientCasesCatalogPayload() {
    return {};
}

module.exports = {
    resolveDonateSellRow,
    getGunCaseItems,
    getBagsCaseItems,
    getClothesCaseItems,
    parseCaseClothPrize,
    caseClothSellMoney,
    getClientCasesCatalogPayload,
    buildBagsCasePool,
    buildClothesCasePool
};
