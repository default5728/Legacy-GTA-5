'use strict';
/**
 * Bags remap v3: сумки на новые drawable + img; Guard 114↔115; LW 127↔128.
 * Остальная одежда не трогается (уже original).
 */
const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, 'config', 'donate_clothes_remap_v2.json');
const BAGS_FLAG = path.join(__dirname, 'config', '.donate_clothes_bags_v3_sql_done');

let REMAP = null;
try {
    REMAP = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
} catch (e) {
    console.log('[donate_clothes_remap_v2] map missing:', e && e.message);
    REMAP = { byItemId: {}, bagsColumnRemap: {}, bagAlt: {} };
}

function buildBagImg(drawable, texture) {
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    return `ItemsMale/Bags/${drawable}_${t}.jpg`;
}

function withBaseName(itemName, base) {
    if (!base) return itemName;
    const s = String(itemName || '');
    const suffix = s.includes(' · ') ? s.slice(s.indexOf(' · ')) : '';
    return base + suffix;
}

const WEB_PAIT_COLOR_NAMES = ['Бордовый', 'Жёлтый', 'Белый', 'Чёрно-белый', 'Розово-белый', 'Розовый'];

function repairWebPaitPayload(pl) {
    if (!pl || !(pl.wp === 1 || pl.wp === true)) return { pl, changed: false };
    if (Number(pl.cid) !== 5 || Number(pl.d) !== 173) return { pl, changed: false };
    const nm = String(pl.nm || '');
    if (nm.indexOf('Пеинты') >= 0) return { pl, changed: false };
    const tex = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    const color = WEB_PAIT_COLOR_NAMES[tex] || 'цвет ' + tex;
    const next = Object.assign({}, pl, { nm: 'Пеинты · ' + color });
    return { pl: next, changed: true };
}

function migrateIc1Payload(pl) {
    if (!pl) return { pl, changed: false };
    const repaired = repairWebPaitPayload(pl);
    if (repaired.changed) return repaired;
    if (!REMAP || !REMAP.byItemId) return { pl, changed: false };
    if (pl.wp === 1 || pl.wp === true || (typeof pl.nm === 'string' && pl.nm.indexOf('Пеинты') >= 0)) {
        return { pl, changed: false };
    }
    const iid = Number(pl.iid);
    const meta = REMAP.byItemId[String(iid)] || REMAP.byItemId[iid];
    if (!meta) return { pl, changed: false };
    const cid = Number(pl.cid);

    // Обувь / аксессуары: только новые названия
    if (cid === 5 || cid === 6 || meta.nameOnly === true) {
        if (!meta.name) return { pl, changed: false };
        const next = Object.assign({}, pl);
        const nm = withBaseName(pl.nm, meta.name);
        if (nm === pl.nm) return { pl, changed: false };
        next.nm = nm;
        return { pl: next, changed: true };
    }

    if (cid !== 8) return { pl, changed: false };

    const oldD = Number(pl.d);
    const target = Number(meta.drawable);
    const alt = meta.alt != null ? Number(meta.alt) : null;
    const from = Array.isArray(meta.fromDrawables) ? meta.fromDrawables.map(Number) : [target];
    let newD = target;

    // alt wear
    if (alt != null) {
        const altLegacy = {
            // Guard
            122: 115,
            150: 115,
            115: alt === 115 ? 115 : null,
            // Balenciara
            142: 142,
            // LW
            135: 128,
            120: 128,
            128: 128
        };
        if (oldD === alt || altLegacy[oldD] === alt) newD = alt;
        else if (from.includes(oldD) || oldD === target || oldD === meta.oldDrawable) newD = target;
        else newD = target;
    } else if (from.includes(oldD) || oldD === target || oldD === meta.oldDrawable) {
        newD = target;
    } else {
        newD = target;
    }

    // Guard ItemID specifics
    if (iid === 85637) {
        if (oldD === 115 || oldD === 122 || oldD === 150) newD = 115;
        else newD = 114;
    }
    // LW
    if (iid === 85813 || iid === 85814) {
        if (oldD === 128 || oldD === 135 || oldD === 120) newD = 128;
        else newD = 127;
    }
    // Balenciara
    if (iid === 85991 || (meta.oldDrawable === 114 && meta.drawable === 141)) {
        if (Number(meta.drawable) === 141) {
            if (oldD === 142 || oldD === 115) newD = oldD === 115 && meta.oldDrawable === 114 ? 142 : oldD === 142 ? 142 : 141;
            // careful: 115 is now Guard alt. Balenciara alt is only 142.
            if (oldD === 142) newD = 142;
            else if (oldD === 115 && meta.oldDrawable === 114) newD = 142; // old Balenciara alt
            else if (oldD === 114 || oldD === 141) newD = 141;
        }
    }

    let changed = false;
    const next = Object.assign({}, pl);
    if (!Number.isFinite(oldD) || oldD !== newD) {
        next.d = newD;
        changed = true;
    }
    if (meta.name) {
        const nm = withBaseName(pl.nm, meta.name);
        if (nm !== pl.nm) {
            next.nm = nm;
            changed = true;
        }
    }
    const t = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    let wantImg = buildBagImg(newD, t);
    // Guard: превью как «на живот» (121_*)
    if (iid === 85637 || (meta.keepImgDrawable != null && Number(meta.keepImgDrawable) === 121)) {
        wantImg = buildBagImg(121, t);
    }
    if (wantImg && pl.img !== wantImg) {
        next.img = wantImg;
        changed = true;
    }
    return { pl: next, changed };
}

function migrateDtString(col, raw) {
    if (col !== 'bags') return { value: raw, changed: false };
    if (raw == null || raw === '') return { value: raw, changed: false };
    const s = String(raw).trim();
    if (!s || s.indexOf(':') < 0) return { value: raw, changed: false };
    const parts = s.split(':');
    const d = Number(parts[0]);
    const t = parts[1];
    if (!Number.isFinite(d)) return { value: raw, changed: false };
    const table = REMAP.bagsColumnRemap || {};
    const nd = table[String(d)] != null ? Number(table[String(d)]) : null;
    if (nd == null || nd === d) return { value: raw, changed: false };
    return { value: `${nd}:${t}`, changed: true };
}

function migrateClothesRowObject(row) {
    if (!row) return { row, changed: false };
    let changed = false;
    const next = Object.assign({}, row);
    const sqlDone = fs.existsSync(BAGS_FLAG);
    if (!sqlDone && Object.prototype.hasOwnProperty.call(next, 'bags')) {
        const r = migrateDtString('bags', next.bags);
        if (r.changed) {
            next.bags = r.value;
            changed = true;
        }
    }
    if (typeof next.bags_equip_ic1 === 'string' && next.bags_equip_ic1.startsWith('ic1.')) {
        try {
            const b64 = next.bags_equip_ic1.slice(4).split('(')[0];
            const json = Buffer.from(b64, 'base64').toString('utf8');
            const pl = JSON.parse(json);
            const m = migrateIc1Payload(pl);
            if (m.changed) {
                next.bags_equip_ic1 = 'ic1.' + Buffer.from(JSON.stringify(m.pl), 'utf8').toString('base64');
                changed = true;
            }
        } catch (_e) {}
    }
    return { row: next, changed };
}

function runSqlBagsOnce() {
    if (!global.DB || typeof global.DB.query !== 'function') return;
    if (fs.existsSync(BAGS_FLAG)) {
        console.log('[donate_clothes_remap_v2] bags v3 SQL already done');
        return;
    }
    const table = REMAP.bagsColumnRemap || {};
    const keys = Object.keys(table);
    const whens = [];
    for (let i = 0; i < keys.length; i++) {
        const od = parseInt(keys[i], 10);
        const nd = Number(table[keys[i]]);
        if (!Number.isFinite(od) || !Number.isFinite(nd) || od === nd) continue;
        whens.push(
            `WHEN CAST(SUBSTRING_INDEX(bags, ':', 1) AS UNSIGNED) = ${od} THEN CONCAT('${nd}', ':', SUBSTRING_INDEX(bags, ':', -1))`
        );
    }
    if (!whens.length) {
        try {
            fs.writeFileSync(BAGS_FLAG, String(Date.now()), 'utf8');
        } catch (_e) {}
        return;
    }
    const sql =
        `UPDATE clothes SET bags = CASE ${whens.join(' ')} ELSE bags END ` +
        `WHERE bags IS NOT NULL AND bags <> ''`;
    console.log('[donate_clothes_remap_v2] bags v3 SQL…');
    global.DB.query(sql, [], (err) => {
        if (err) {
            console.log('[donate_clothes_remap_v2] bags SQL error:', err);
            return;
        }
        const byItem = REMAP.byItemId || {};
        const iids = Object.keys(byItem);
        let left = iids.length;
        if (!left) {
            try {
                fs.writeFileSync(BAGS_FLAG, String(Date.now()), 'utf8');
            } catch (_e2) {}
            return;
        }
        for (let i = 0; i < iids.length; i++) {
            const iid = iids[i];
            const meta = byItem[iid];
            const from = (meta.fromDrawables || [meta.oldDrawable, meta.drawable]).map(Number);
            const ph = from.map(() => '?').join(',');
            const imgD = meta.keepImgDrawable != null ? Number(meta.keepImgDrawable) : meta.drawable;
            global.DB.query(
                `UPDATE donate_bag_instances SET drawable = ?, item_name = COALESCE(?, item_name), item_img = CONCAT('ItemsMale/Bags/', ?, '_', IFNULL(texture,0), '.jpg') WHERE item_id = ? AND drawable IN (${ph})`,
                [meta.drawable, meta.name, imgD, Number(iid)].concat(from),
                () => {
                    left--;
                    if (!left) {
                        try {
                            fs.writeFileSync(BAGS_FLAG, String(Date.now()), 'utf8');
                        } catch (_e3) {}
                        console.log('[donate_clothes_remap_v2] bags v3 SQL complete');
                    }
                }
            );
        }
    });
}

function schedule(attempt) {
    const n = Number(attempt) || 0;
    if (!global.DB || typeof global.DB.query !== 'function') {
        if (n < 40) setTimeout(() => schedule(n + 1), 1000);
        return;
    }
    try {
        runSqlBagsOnce();
    } catch (e) {
        console.log('[donate_clothes_remap_v2] boot error', e);
        if (n < 10) setTimeout(() => schedule(n + 1), 2000);
    }
}
setTimeout(() => schedule(0), 2500);

global.donateClothesRemapV2 = {
    REMAP,
    migrateIc1Payload,
    migrateDtString,
    migrateClothesRowObject,
    runSqlRemapOnce: runSqlBagsOnce
};

module.exports = global.donateClothesRemapV2;
