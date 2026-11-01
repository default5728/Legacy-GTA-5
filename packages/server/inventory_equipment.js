/**
 * Экипировка из инвентаря: токены ic1.* (одежда из магазина), ivhol:*, ivbag:*
 */

const BASE_INV_SLOTS = 20;

function paitItemIdFromTex(tex) {
    const t = parseInt(tex, 10) || 0;
    if (t < 0 || t > 8) return 85759;
    return 85759 + t;
}

function isWebPaitIc1Payload(payload) {
    if (!payload) return false;
    if (payload.wp === 1 || payload.wp === true) return true;
    return typeof payload.nm === 'string' && payload.nm.indexOf('Пеинты') >= 0;
}

function webPaitSellRow(payload) {
    if (!isWebPaitIc1Payload(payload) || Number(payload.cid) !== 5 || Number(payload.d) !== 173) {
        return null;
    }
    const t = Number(payload.t);
    const tex = Number.isFinite(t) ? t : 0;
    return {
        ClothID: 5,
        ItemID: paitItemIdFromTex(tex),
        ItemName: typeof payload.nm === 'string' && payload.nm ? payload.nm : 'Пеинты',
        Price: 0,
        Drawable: 173,
        ItemImg: 'ItemsMale/Shoes/173_' + tex + '.jpg',
        Textures: null,
        TopTexture: tex,
        Frac: Number(payload.fr) || 1,
        Component: 6,
        Torso: null
    };
}

function shoes173CatalogRow(texture, frac) {
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    const fr = Number(frac);
    const hitFrac = findInClothesSellPools(
        (it) => it.ClothID === 5 && Number(it.Drawable) === 173 && Number(it.TopTexture) === t && Number(it.Frac) === fr
    );
    if (hitFrac) return hitFrac;
    return findInClothesSellPools(
        (it) => it.ClothID === 5 && Number(it.Drawable) === 173 && Number(it.TopTexture) === t
    );
}

/**
 * Вместимость отдельной панели сумки по компоненту 5: drawable / texture
 * как в каталогах одежды (ClothID 8). Основная сетка остаётся на 20 слотов.
 *
 * drawable | текстуры | DP (ориентир) | бонус | название
 * ---------|----------|-----------------|-------|----------
 * 111      | 0        | 9000            | +20   | Школьный Портфель
 * 112      | 0–8      | 3000            | +10   | Рюкзак сердечко
 * 113      | 0        | 8000            | +20   | Сумка готическая
 * 114      | 0        | 12000           | +30   | Сумка Gaurd на плечо
 * 115      | 0        | 11000           | +25   | Сумка Gaurd на живот
 * 116      | 0–14     | 4000            | +15   | Сумки на плечо
 * 117      | 0        | 9000            | +30   | Рюкзак Stonik
 * 118      | 0        | 7500            | +15   | Рюкзак Чиловый парень
 * 119      | 0–1      | 13000           | +40   | Сумка Gucci большая
 * 120      | 0        | 6000            | +15   | Сумка Dior на плечо
 * 121      | 0        | 4500            | +20   | Сумка Antisocial
 * 122      | 0        | —              | +25   | Сумка на плечи
 * 123      | 0–1      | —              | +35   | Рюкзак Gucci
 * 124      | 0        | —              | +15   | Сумка с мишкой
 * 125      | 0–3      | —              | +15   | Сумка с драконом
 * 126      | 0        | —              | +15   | Рюкзак jivenchy
 * 127      | 0        | —              | +20   | Рюкзак lui wution
 *
 * ivbag:* (реестр DONATE_BAGS) надевает те же drawable:texture — бонус считается этой функцией.
 */
function getBagSlotBonusFromDrawableTexture(d, t) {
    const dn = Number(d);
    const tn = Number(t);
    if (!Number.isFinite(dn) || dn === 0 || !Number.isFinite(tn)) return 0;
    switch (dn) {
        case 111:
            return tn === 0 ? 20 : 0;
        case 112:
            return tn >= 0 && tn <= 8 ? 10 : 0;
        case 113:
            return tn === 0 ? 20 : 0;
        case 114:
        case 115:
            return tn === 0 ? 25 : 0;
        case 142:
            return tn >= 0 && tn <= 4 ? 15 : 0;
        case 117:
            return tn === 0 ? 30 : 0;
        case 118:
            return tn === 0 ? 15 : 0;
        case 119:
            return tn === 0 || tn === 1 ? 40 : 0;
        case 120:
            return tn >= 0 && tn <= 1 ? 20 : 0;
        case 123:
            return tn >= 0 && tn <= 1 ? 30 : 0;
        case 124:
            return tn === 0 ? 15 : 0;
        case 125:
            return tn >= 0 && tn <= 3 ? 15 : 0;
        case 126:
            return tn >= 0 && tn <= 10 ? 10 : 0;
        case 127:
        case 128:
            return tn === 0 || tn === 1 ? 20 : 0;
        case 129:
            return tn === 0 ? 25 : 0;
        case 130:
            return tn === 0 || tn === 1 ? 30 : 0;
        case 131:
            return tn === 0 || tn === 1 ? 35 : 0;
        case 132:
            return tn >= 0 && tn <= 3 ? 15 : 0;
        case 133:
            return tn >= 0 && tn <= 15 ? 30 : 0;
        case 134:
            return tn >= 0 && tn <= 14 ? 20 : 0;
        case 135:
            return tn >= 0 && tn <= 14 ? 25 : 0;
        case 136:
            return tn >= 0 && tn <= 12 ? 20 : 0;
        case 137:
            return tn >= 0 && tn <= 7 ? 30 : 0;
        case 138:
            return tn >= 0 && tn <= 17 ? 20 : 0;
        case 139:
            return tn === 0 ? 10 : 0;
        case 140:
            return tn >= 0 && tn <= 1 ? 20 : 0;
        case 143:
            return tn >= 0 && tn <= 4 ? 20 : 0;
        case 144:
            return tn === 0 ? 10 : 0;
        case 110:
            return tn >= 0 && tn <= 14 ? 15 : 0;
        case 145:
            return tn >= 0 && tn <= 6 ? 10 : 0;
        case 146:
            return tn >= 0 && tn <= 7 ? 20 : 0;
        case 147:
            return tn >= 0 && tn <= 8 ? 5 : 0;
        case 148:
            return tn >= 0 && tn <= 8 ? 15 : 0;
        case 149:
        case 150:
        case 151:
        case 152:
        case 153:
        case 154:
        case 155:
        case 156:
            return tn >= 0 && tn <= 7 ? 20 : 0;
        case 157:
            return tn >= 0 && tn <= 11 ? 15 : 0;
        case 158:
            return tn >= 0 && tn <= 13 ? 10 : 0;
        case 159:
            return tn === 0 ? 15 : 0;
        case 160:
            return tn >= 0 && tn <= 7 ? 15 : 0;
        default:
            return 0;
    }
}

const DONATE_BAGS_LEGACY = {
    bag_antisocial: { slot: 5, drawable: 115, texture: 0, name: 'Сумка Antisocial' },
    bag_anime: { slot: 5, drawable: 119, texture: 0, name: 'Рюкзак сердечко' },
    bag_grob: { slot: 5, drawable: 120, texture: 0, name: 'Сумка готическая' },
    bag_big_black: { slot: 5, drawable: 124, texture: 0, name: 'Рюкзак Stonik' },
    bag_big_white: { slot: 5, drawable: 110, texture: 0, name: 'Сумки на плечо' },
    bag_waist: { slot: 5, drawable: 125, texture: 0, name: 'Рюкзак Чиловый парень' }
};

function donateBagDisplayNameFromItemName(itemName) {
    const s = String(itemName || '').trim();
    const cut = s.split(/\s·\s/)[0].trim();
    return cut || s;
}

function buildDonateBagsMerged() {
    const merged = {};
    for (const k of Object.keys(DONATE_BAGS_LEGACY)) {
        merged[k] = Object.assign({}, DONATE_BAGS_LEGACY[k]);
    }
    const seenDt = new Set();
    for (const k of Object.keys(merged)) {
        const b = merged[k];
        seenDt.add(`${Number(b.drawable)}:${Number(b.texture)}`);
    }
    const lists = [
        global.DonateClothesItemsSell,
        global.SpectrumClothesItemsSell,
        global.ClothesItemsSell
    ];
    for (let listIndex = 0; listIndex < lists.length; listIndex++) {
        const list = lists[listIndex];
        if (!Array.isArray(list)) continue;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (Number(it.ClothID) !== 8 || it.spectrumCharmOnly) continue;
            const d = Number(it.Drawable);
            const t = Number(it.TopTexture);
            if (!Number.isFinite(d) || d === 0 || !Number.isFinite(t)) continue;
            const dt = `${d}:${t}`;
            if (seenDt.has(dt)) continue;
            const iid = Number(it.ItemID);
            const baseKey = Number.isFinite(iid) ? `dbag_${iid}` : `dbag_${d}_${t}`;
            const key = merged[baseKey] ? `${baseKey}_${d}_${t}` : baseKey;
            merged[key] = {
                slot: 5,
                drawable: d,
                texture: t,
                name: donateBagDisplayNameFromItemName(it.ItemName)
            };
            seenDt.add(dt);
        }
    }
    return merged;
}

const DONATE_BAGS = buildDonateBagsMerged();
const BAG_ACCOUNT_KEYS = Object.keys(DONATE_BAGS);

global.DONATE_BAGS_REGISTRY = DONATE_BAGS;

/** Колонки accounts.bag_* только у шести legacy ivbag; остальные — donate_bag_state + инвентарь. */
global.IVBAG_LEGACY_SQL_KEYS = {
    bag_antisocial: true,
    bag_anime: true,
    bag_grob: true,
    bag_big_black: true,
    bag_big_white: true,
    bag_waist: true
};

function buildDrawableTextureToIvBagKeyMap() {
    const map = {};
    for (const k of Object.keys(DONATE_BAGS)) {
        const b = DONATE_BAGS[k];
        map[`${b.drawable}:${b.texture}`] = k;
    }
    return map;
}

const DRAWABLE_TEXTURE_TO_IVBAG_KEY = buildDrawableTextureToIvBagKeyMap();

/** ic1-сумка из донат-реестра (ClothID 8 в каталоге / DONATE_BAGS). Не путать с обычными сумками cid 8 из tokenFromDbColumn. */
function ic1PayloadIsRegisteredDonateBag(pl) {
    if (!pl || Number(pl.cid) !== 8) return false;
    const dn = Number(pl.d);
    const tn = Number(pl.t);
    if (!Number.isFinite(dn) || !Number.isFinite(tn)) return false;
    return !!DRAWABLE_TEXTURE_TO_IVBAG_KEY[`${dn}:${tn}`];
}

/** Для unstash / инвентаря: это донат-сумка из реестра (не любой ic1 cid 8). */
global.isRegisteredDonateBagIc1Token = function (rawTok) {
    if (typeof rawTok !== 'string' || !rawTok.startsWith('ic1.')) return false;
    const pl = decodeIc1(rawTok.split('(')[0].trim());
    return ic1PayloadIsRegisteredDonateBag(pl);
};

function replaceTokenStringPreservingStackSuffix(oldFull, newBase) {
    const s = String(oldFull);
    const m = /\((\d+)\)\s*$/.exec(s);
    if (m) return `${newBase} (${m[1]})`;
    return newBase;
}

function replaceExactTokenInInventoryAndFast(player, oldTok, newTok) {
    if (!mp.players.exists(player)) return false;
    if (oldTok === newTok) return true;
    let ok = false;
    if (Array.isArray(player.inventory)) {
        for (let i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i] === oldTok) {
                player.inventory[i] = newTok;
                ok = true;
                break;
            }
        }
    }
    if (!ok && Array.isArray(player.fastSlots)) {
        for (let i = 0; i < player.fastSlots.length; i++) {
            if (player.fastSlots[i] === oldTok) {
                player.fastSlots[i] = newTok;
                ok = true;
                break;
            }
        }
    }
    return ok;
}

function insertDonateBagInstanceRow(player, def, cb) {
    if (!player || !def) return cb(new Error('no'));
    const img = def.ItemImg && typeof def.ItemImg === 'string' ? def.ItemImg.slice(0, 512) : null;
    global.DB.query(
        'INSERT INTO donate_bag_instances (account_static, item_id, frac, drawable, texture, item_name, item_img) VALUES (?,?,?,?,?,?,?)',
        [player.static, def.ItemID, def.Frac, def.Drawable, def.TopTexture, String(def.ItemName || '').slice(0, 384), img],
        (err, res) => {
            if (err || !res || !res.insertId) return cb(err || new Error('insert'));
            cb(null, res.insertId);
        }
    );
}

/**
 * Реестровая донат-сумка ic1 без bagInst → INSERT + новый токен (отдельный карман на каждую физическую сумку).
 * Переносит предметы со старого общего ключа ic1bag:/bagped: в baginst:{id}.
 */
global.ensureDonateBagIc1InstanceThen = function (player, workItem, def, payload, cb) {
    if (!mp.players.exists(player) || !workItem || !def || !payload) return cb(new Error('bad'));
    if (!ic1PayloadIsRegisteredDonateBag(payload)) return cb(null, workItem);
    const inst = payload.bagInst != null ? Number(payload.bagInst) : NaN;
    if (Number.isFinite(inst) && inst > 0) return cb(null, workItem);
    insertDonateBagInstanceRow(player, def, (err, insertId) => {
        if (err || !insertId) return cb(err || new Error('alloc'));
        if (!mp.players.exists(player)) return cb(new Error('gone'));
        const newBase =
            typeof global.inventoryMakeClothToken === 'function' ? global.inventoryMakeClothToken(def, insertId) : null;
        if (!newBase) return cb(new Error('token'));
        const newItem = replaceTokenStringPreservingStackSuffix(workItem, newBase);
        if (!replaceExactTokenInInventoryAndFast(player, workItem, newItem)) {
            global.DB.query('DELETE FROM donate_bag_instances WHERE id = ?', [insertId], () => {});
            return cb(new Error('replace'));
        }
        if (typeof global.migrateSharedDonateBagSlotsIntoBagInstKey === 'function') {
            global.migrateSharedDonateBagSlotsIntoBagInstKey(player, insertId, payload);
        }
        cb(null, newItem);
    });
};

/** ivbag:* из реестра DONATE_BAGS (без привязки к _donateBagOwnKey). */
function registryIvbagKeyFromSlotString(raw) {
    if (typeof raw !== 'string') return null;
    const b = raw.split('(')[0].trim();
    if (!b.startsWith('ivbag:')) return null;
    const k = b.slice(6).trim();
    return k && DONATE_BAGS[k] ? k : null;
}

function invOrFastHasRegistryIvbag(player) {
    if (!mp.players.exists(player)) return false;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return false;
        for (let i = 0; i < arr.length; i++) {
            if (registryIvbagKeyFromSlotString(arr[i])) return true;
        }
        return false;
    };
    return scan(player.inventory) || scan(player.fastSlots);
}

/** Убрать из pending ic1, которые уже есть в сетке / не являются донат-сумкой (мусор после багов/миграций). */
function pruneStaleDonateBagPending(player) {
    if (!mp.players.exists(player) || !Array.isArray(player._donateBagIc1Pending)) return false;
    const bases = new Set();
    const collect = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const raw = arr[i];
            if (typeof raw !== 'string' || !raw.startsWith('ic1.')) continue;
            bases.add(raw.split('(')[0].trim());
        }
    };
    collect(player.inventory);
    collect(player.fastSlots);
    const next = [];
    let changed = false;
    for (let i = 0; i < player._donateBagIc1Pending.length; i++) {
        const tok = player._donateBagIc1Pending[i];
        if (typeof tok !== 'string' || !tok.startsWith('ic1.')) {
            changed = true;
            continue;
        }
        const b = tok.split('(')[0].trim();
        const pl = decodeIc1(b);
        if (!ic1PayloadIsRegisteredDonateBag(pl)) {
            changed = true;
            continue;
        }
        if (bases.has(b)) {
            changed = true;
            continue;
        }
        next.push(tok);
    }
    if (changed) player._donateBagIc1Pending = next;
    return changed;
}

/** Если вещь есть, а в БД own пустой — восстановить ключ (починка после сбоев). */
function syncDonateBagOwnKeyFromContainers(player) {
    if (!mp.players.exists(player)) return false;
    if (typeof global.ensurePlayerDonateBagStateShape === 'function') global.ensurePlayerDonateBagStateShape(player);
    if (player._donateBagOwnKey != null && player._donateBagOwnKey !== '') return false;
    let found = null;
    const scanIv = (arr) => {
        if (!Array.isArray(arr) || found) return;
        for (let i = 0; i < arr.length; i++) {
            const k = registryIvbagKeyFromSlotString(arr[i]);
            if (k) {
                found = k;
                return;
            }
        }
    };
    scanIv(player.inventory);
    scanIv(player.fastSlots);
    const scanIc1 = (arr) => {
        if (!Array.isArray(arr) || found) return;
        for (let i = 0; i < arr.length; i++) {
            const raw = arr[i];
            if (typeof raw !== 'string' || !raw.startsWith('ic1.')) continue;
            const pl = decodeIc1(raw.split('(')[0].trim());
            if (!ic1PayloadIsRegisteredDonateBag(pl)) continue;
            const k =
                typeof global.ivBagKeyForDrawableTexture === 'function'
                    ? global.ivBagKeyForDrawableTexture(Number(pl.d), Number(pl.t))
                    : null;
            if (k) {
                found = k;
                return;
            }
        }
    };
    scanIc1(player.inventory);
    scanIc1(player.fastSlots);
    if (!found) {
        try {
            if (typeof global.peekUnequipTokenForBagSlot === 'function') {
                const peek = global.peekUnequipTokenForBagSlot(player);
                if (peek && !peek.isEmpty && peek.token && typeof peek.token === 'string') {
                    const t = peek.token.split('(')[0].trim();
                    if (t.startsWith('ivbag:')) {
                        const k = t.slice(6).trim();
                        if (k && DONATE_BAGS[k]) found = k;
                    } else if (t.startsWith('ic1.')) {
                        const pl = decodeIc1(t);
                        if (ic1PayloadIsRegisteredDonateBag(pl) && typeof global.ivBagKeyForDrawableTexture === 'function') {
                            const k = global.ivBagKeyForDrawableTexture(Number(pl.d), Number(pl.t));
                            if (k) found = k;
                        }
                    }
                }
            }
        } catch (_e) {}
    }
    if (!found) return false;
    player._donateBagOwnKey = found;
    return true;
}

global.ivBagKeyForDrawableTexture = function (d, t) {
    const dn = Number(d);
    const tn = Number(t);
    if (!Number.isFinite(dn) || !Number.isFinite(tn)) return null;
    return DRAWABLE_TEXTURE_TO_IVBAG_KEY[`${dn}:${tn}`] || null;
};

global.internalSlotsForDonateBagKey = function (k) {
    const b = DONATE_BAGS[k];
    if (!b) return 0;
    const n = getBagSlotBonusFromDrawableTexture(b.drawable, b.texture);
    return n > 0 ? n : 15;
};

/**
 * Внутренние слоты «полки» сумки по тому, что надето на компоненте 5.
 * Не использовать getInventoryBagBonusExtra из inventory_grid.js (там он всегда 0 для сетки 50).
 * peekUnequipToken('bag') часто отдаёт ic1 из каталога, а не ivbag — ёмкость считаем по ped d:t.
 */
global.getBagInnerCapacityFromPedSlot5 = function (player) {
    if (!mp.players.exists(player)) return 0;
    try {
        const c = player.getClothes(5);
        if (!c || Number(c.drawable) === 0) return 0;
        const d = Number(c.drawable);
        const t = c.texture !== undefined ? Number(c.texture) : 0;
        if (!Number.isFinite(d) || !Number.isFinite(t)) return 0;
        const k =
            typeof global.ivBagKeyForDrawableTexture === 'function' ? global.ivBagKeyForDrawableTexture(d, t) : null;
        if (k && typeof global.internalSlotsForDonateBagKey === 'function') {
            const cap = global.internalSlotsForDonateBagKey(k);
            if (cap > 0) return cap;
        }
        return getBagSlotBonusFromDrawableTexture(d, t);
    } catch (_e) {}
    return 0;
};

/** Ключ реестра сумок (ivbag / donate_bag_state в БД) по строке каталога ClothID 8. */
global.donateBagRegistryKeyFromSellRow = function (row) {
    if (!row || Number(row.ClothID) !== 8) return null;
    const d = Number(row.Drawable);
    const t = Number(row.TopTexture);
    if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
    if (typeof global.ivBagKeyForDrawableTexture === 'function') {
        const k = global.ivBagKeyForDrawableTexture(d, t);
        if (k) return k;
    }
    const iid = Number(row.ItemID);
    return Number.isFinite(iid) ? `dbag_${iid}` : null;
};

global.countIc1DonateBagsInContainers = function (player) {
    if (!mp.players.exists(player)) return 0;
    let n = 0;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const x = arr[i];
            if (typeof x !== 'string' || !x.startsWith('ic1.')) continue;
            const pl = decodeIc1(x.split('(')[0].trim());
            if (!ic1PayloadIsRegisteredDonateBag(pl)) continue;
            n++;
        }
    };
    scan(player.inventory);
    scan(player.fastSlots);
    return n;
};

/** Совместимость: аргумент фракции игнорируется — одна сумка на аккаунт. */
global.countIc1DonateBagsForFractionInContainers = function (player, _fkIgnored) {
    return global.countIc1DonateBagsInContainers(player);
};

/** ic1-сумки с тем же drawable:texture, что у ключа реестра (без учёта fr в payload). */
global.countIc1DonateBagsMatchingRegistryKey = function (player, bagKey, _fkIgnored) {
    const b = DONATE_BAGS[bagKey];
    if (!b || !mp.players.exists(player)) return 0;
    let n = 0;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const x = arr[i];
            if (typeof x !== 'string' || !x.startsWith('ic1.')) continue;
            const pl = decodeIc1(x.split('(')[0].trim());
            if (!pl || Number(pl.cid) !== 8) continue;
            if (Number(pl.d) === b.drawable && Number(pl.t) === b.texture) n++;
        }
    };
    scan(player.inventory);
    scan(player.fastSlots);
    return n;
};

global.removeIc1DonateBagsMatchingRegistryKeyForFraction = function (player, bagKey, _fkIgnored) {
    const b = DONATE_BAGS[bagKey];
    if (!b || !mp.players.exists(player)) return false;
    let changed = false;
    const inv = player.inventory;
    if (Array.isArray(inv)) {
        for (let i = inv.length - 1; i >= 0; i--) {
            const x = inv[i];
            if (typeof x !== 'string' || !x.startsWith('ic1.')) continue;
            const pl = decodeIc1(x.split('(')[0].trim());
            if (!pl || Number(pl.cid) !== 8) continue;
            if (Number(pl.d) === b.drawable && Number(pl.t) === b.texture) {
                inv[i] = null;
                changed = true;
            }
        }
    }
    if (Array.isArray(player.fastSlots)) {
        for (let s = player.fastSlots.length - 1; s >= 0; s--) {
            const x = player.fastSlots[s];
            if (typeof x !== 'string' || !x.startsWith('ic1.')) continue;
            const pl = decodeIc1(x.split('(')[0].trim());
            if (!pl || Number(pl.cid) !== 8) continue;
            if (Number(pl.d) === b.drawable && Number(pl.t) === b.texture) {
                player.fastSlots.splice(s, 1);
                changed = true;
            }
        }
    }
    return changed;
};

function stashIc1PendingHasAnyBag(player) {
    const pend = player._donateBagIc1Pending;
    if (!Array.isArray(pend) || pend.length === 0) return false;
    for (let i = 0; i < pend.length; i++) {
        const tok = pend[i];
        if (typeof tok !== 'string' || !tok.startsWith('ic1.')) continue;
        const pl = decodeIc1(tok.split('(')[0].trim());
        if (ic1PayloadIsRegisteredDonateBag(pl)) return true;
    }
    return false;
}

/** Свести дубликаты в pending; перенести остаток легаси-объекта stash из ensure. */
function normalizeDonateBagIc1PendingDedupe(player) {
    if (!mp.players.exists(player)) return false;
    if (typeof global.ensurePlayerDonateBagStateShape === 'function') global.ensurePlayerDonateBagStateShape(player);
    if (!Array.isArray(player._donateBagIc1Pending)) player._donateBagIc1Pending = [];
    const seen = new Set();
    const next = [];
    let changed = false;
    for (let i = 0; i < player._donateBagIc1Pending.length; i++) {
        const tok = player._donateBagIc1Pending[i];
        if (typeof tok !== 'string' || !tok.startsWith('ic1.')) {
            changed = true;
            continue;
        }
        const b = tok.split('(')[0].trim();
        if (seen.has(b)) {
            changed = true;
            continue;
        }
        seen.add(b);
        next.push(tok);
    }
    if (next.length !== player._donateBagIc1Pending.length) {
        player._donateBagIc1Pending = next;
        changed = true;
    }
    return changed;
}
global.normalizeDonateBagIc1PendingDedupe = normalizeDonateBagIc1PendingDedupe;

function donateBagPhysicalEvidenceGlobal(player) {
    if (!mp.players.exists(player)) return false;
    if (stashIc1PendingHasAnyBag(player)) return true;
    if (
        typeof global.countIc1DonateBagsInContainers === 'function' &&
        global.countIc1DonateBagsInContainers(player) >= 1
    )
        return true;
    if (invOrFastHasRegistryIvbag(player)) return true;
    try {
        if (typeof global.peekUnequipTokenForBagSlot === 'function') {
            const peek = global.peekUnequipTokenForBagSlot(player);
            if (peek && !peek.isEmpty && peek.token && typeof peek.token === 'string') {
                const t = peek.token.split('(')[0].trim();
                if (t.startsWith('ic1.')) {
                    const pl = decodeIc1(t);
                    if (ic1PayloadIsRegisteredDonateBag(pl)) return true;
                }
                if (t.startsWith('ivbag:')) {
                    const k = t.slice(6).trim();
                    if (k && DONATE_BAGS[k]) return true;
                }
            }
        }
    } catch (_e) {}
    return false;
}

/** «Сумка есть» без учёта очереди pending (для сброса битого pending в БД). */
function donateBagPhysicalEvidenceSansPending(player) {
    if (!mp.players.exists(player)) return false;
    if (
        typeof global.countIc1DonateBagsInContainers === 'function' &&
        global.countIc1DonateBagsInContainers(player) >= 1
    )
        return true;
    if (invOrFastHasRegistryIvbag(player)) return true;
    try {
        if (typeof global.peekUnequipTokenForBagSlot === 'function') {
            const peek = global.peekUnequipTokenForBagSlot(player);
            if (peek && !peek.isEmpty && peek.token && typeof peek.token === 'string') {
                const t = peek.token.split('(')[0].trim();
                if (t.startsWith('ic1.')) {
                    const pl = decodeIc1(t);
                    if (ic1PayloadIsRegisteredDonateBag(pl)) return true;
                }
                if (t.startsWith('ivbag:')) {
                    const k = t.slice(6).trim();
                    if (k && DONATE_BAGS[k]) return true;
                }
            }
        }
    } catch (_e) {}
    return false;
}

function repairOrphanDonateBagOwnKey(player) {
    if (!mp.players.exists(player)) return false;
    if (player._donateBagOwnKey == null || player._donateBagOwnKey === '') return false;
    if (!donateBagPhysicalEvidenceGlobal(player)) {
        player._donateBagOwnKey = null;
        return true;
    }
    return false;
}
global.repairOrphanDonateBagsFracMapEntries = repairOrphanDonateBagOwnKey;

/** Лимит «одна донат-сумка» отключён — всегда свободный слот для покупок/пуша. */
global.playerDonateBagFractionSlotOccupied = function (_player, _fkOptIgnored) {
    return false;
};

/** После загрузки: лимит сумок отключён — ничего не чиним по учёту. */
global.reconcileDonateBagStateAfterInventoryHydrate = function (_player) {
    return false;
};

/** Ранее: снять чужую ic1-сумку с педа. Теперь фракции не различаем — no-op. */
global.stripDonateBagWearIfWrongIc1Fraction = function (_player) {
    return false;
};

global.clearDonateBagFracOnIc1BagRemoved = function (player, ic1RawStr) {
    if (!mp.players.exists(player) || ic1RawStr == null) return;
    const base = String(ic1RawStr).split('(')[0].trim();
    if (!base.startsWith('ic1.')) return;
    const pl = decodeIc1(base);
    if (!pl || Number(pl.cid) !== 8) return;
    const k =
        typeof global.ivBagKeyForDrawableTexture === 'function'
            ? global.ivBagKeyForDrawableTexture(Number(pl.d), Number(pl.t))
            : null;
    if (!k || player._donateBagOwnKey == null) return;
    if (String(player._donateBagOwnKey) === String(k)) player._donateBagOwnKey = null;
};

global.clearDonateBagFracIfIc1BagMatchesOwnedMap = function (player, pl) {
    if (!mp.players.exists(player) || !pl || Number(pl.cid) !== 8) return;
    const k =
        typeof global.ivBagKeyForDrawableTexture === 'function'
            ? global.ivBagKeyForDrawableTexture(Number(pl.d), Number(pl.t))
            : null;
    if (!k || player._donateBagOwnKey == null) return;
    if (String(player._donateBagOwnKey) === String(k)) player._donateBagOwnKey = null;
};

global.getInventoryBagBonusExtra = function (player) {
    try {
        if (!mp.players.exists(player)) return 0;
        const c = player.getClothes(5);
        const d = c && c.drawable !== undefined ? Number(c.drawable) : NaN;
        const t = c && c.texture !== undefined ? Number(c.texture) : NaN;
        return getBagSlotBonusFromDrawableTexture(d, t);
    } catch (_e) {}
    return 0;
};

function playerHasBagBonus(player) {
    if (typeof global.getActiveBagCapacity === 'function') return global.getActiveBagCapacity(player) > 0;
    return global.getInventoryBagBonusExtra(player) > 0;
}

global.getInventoryMaxSlots = function () {
    return BASE_INV_SLOTS;
};

global.getInventoryUsedSlots = function (player) {
    if (!Array.isArray(player.inventory)) return 0;
    let used = 0;
    for (let i = 0; i < BASE_INV_SLOTS; i++) {
        if (player.inventory[i] != null && player.inventory[i] !== '') used++;
    }
    return used;
};

/** Кабура slot 7: чёрная 206:0, белая 206:1. Legacy: 201:0/1, 50:0/1, 44:0, 45:0. Донат: кабура 209, цепь 207, костюм священника 208. */
const HOLSTERS = {
    cobura: { slot: 7, drawable: 206, texture: 0, name: 'Чёрная Кобура' },
    coburaw: { slot: 7, drawable: 206, texture: 1, name: 'Белая Кобура' }
};

const HOLSTER_KEYS = Object.keys(HOLSTERS);

/** «Босые ноги»: компонент 6, drawable 34, texture 0 (/sc 6 34 0). */
const DEFAULT_BARE_FEET = { d: 34, t: 0 };

function isBarefootShoesDrawable(d, t) {
    return Number(d) === DEFAULT_BARE_FEET.d && Number(t) === DEFAULT_BARE_FEET.t;
}

/** Стартовый комплект регистрации (не фракционная форма). */
const STARTER_OUTFIT_CFG = { tors: [15, 0], top: [1, 0], bottom: [6, 0], shoes: [34, 0] };

const DEFAULT_FRACTION_OUTFIT = {
    '1': STARTER_OUTFIT_CFG,
    '2': STARTER_OUTFIT_CFG,
    '3': STARTER_OUTFIT_CFG,
    '4': STARTER_OUTFIT_CFG,
    '5': STARTER_OUTFIT_CFG,
    '6': STARTER_OUTFIT_CFG
};

const MALE_FREE_MODE_HASH = mp.joaat('mp_m_freemode_01');
const FEMALE_FREE_MODE_HASH = mp.joaat('mp_f_freemode_01');

/** Майка под верхом (slot 8) — разная для муж/жен freemode. */
global.setFreemodeDefaultUndershirtForPlayer = function setFreemodeDefaultUndershirtForPlayer(player) {
    try {
        if (!mp.players.exists(player)) return;
        const isMale = player.model === MALE_FREE_MODE_HASH;
        const isFemale = player.model === FEMALE_FREE_MODE_HASH;
        if (!isMale && !isFemale) return;
        player.setClothes(8, isMale ? 15 : 6, 0, 0);
    } catch (_e) {}
};


/**
 * Пустой слот головного убора (prop 0): у мужчины freemode — legacy 8:0 / 0:0,
 * у женщины — снятый проп (drawable < 0) или дефолт 0:0 после clear (не предмет).
 */
function isFreemodeHeadwearSlotConsideredEmpty(player, drawable, texture) {
    if (!mp.players.exists(player)) return true;
    const d = drawable == null ? NaN : Number(drawable);
    const t = texture == null ? 0 : Number(texture);
    if (!Number.isFinite(d)) return true;
    if (d < 0) return true;
    if (d === 0 && t === 0) return true;
    if (player.model === MALE_FREE_MODE_HASH) {
        return d === 8 && t === 0;
    }
    return false;
}

function clearFreemodeHeadwearSlot(player) {
    if (!mp.players.exists(player)) return;
    try {
        if (!player._propReplaySlotSeq) player._propReplaySlotSeq = {};
        player._propReplaySlotSeq[0] = (player._propReplaySlotSeq[0] || 0) + 1;
    } catch (_eB) {}
    try {
        player._headwearEquipIc1 = null;
    } catch (_e0) {}
    if (player.model === FEMALE_FREE_MODE_HASH) {
        player.setProp(0, -1, 0);
        try {
            player.call('sc:syncPropLocal', [0, -1, 0]);
        } catch (_e) {}
    } else if (player.model === MALE_FREE_MODE_HASH) {
        player.setProp(0, 8, 0);
        try {
            player.call('sc:syncPropLocal', [0, 8, 0]);
        } catch (_e) {}
    } else {
        player.setProp(0, -1, 0);
        try {
            player.call('sc:syncPropLocal', [0, -1, 0]);
        } catch (_e) {}
    }
}

/** Снять очки: всегда -1 (на женском freemode 0:0 = видимые очки). */
function clearFreemodeGlassesSlot(player) {
    if (!mp.players.exists(player)) return;
    try {
        if (!player._propReplaySlotSeq) player._propReplaySlotSeq = {};
        player._propReplaySlotSeq[1] = (player._propReplaySlotSeq[1] || 0) + 1;
    } catch (_eB) {}
    player.setProp(1, -1, 0);
    try {
        player.call('sc:syncPropLocal', [1, -1, 0]);
    } catch (_e) {}
    if (typeof global.replayPropSyncForDelayedSpawn === 'function') {
        try {
            global.replayPropSyncForDelayedSpawn(player, 1, -1, 0);
        } catch (_e2) {}
    }
}
global.isFreemodeHeadwearSlotConsideredEmpty = isFreemodeHeadwearSlotConsideredEmpty;
global.clearFreemodeHeadwearSlot = clearFreemodeHeadwearSlot;
global.clearFreemodeGlassesSlot = clearFreemodeGlassesSlot;

/** Соответствует resetPlayerClothes: setProp(6, 2, 0) — не инвентарный предмет, снять нельзя. */
const DEFAULT_FREEMODE_WATCH_PROP = { d: 2, t: 0 };
function isDefaultFreemodeWatchProp(cur) {
    if (!cur || cur.drawable === undefined || cur.texture === undefined) return true;
    return (
        Number(cur.drawable) === DEFAULT_FREEMODE_WATCH_PROP.d && Number(cur.texture) === DEFAULT_FREEMODE_WATCH_PROP.t
    );
}

/** Визуально «нет пропа» на freemode (не создаём ic1 и не показываем слот заполненным). */
function isAccessoryPropVisuallyEmpty(slotKey, cur, player) {
    if (!cur || cur.drawable === undefined) return true;
    const d = Number(cur.drawable);
    const t = Number(cur.texture);
    if (!Number.isFinite(d)) return true;
    if (d < 0) return true;
    if (slotKey === 'glasses') {
        /** 0:0 — legacy «пусто», на женском педе это видимые очки → считаем пустым и чистим в -1. */
        return d === 0;
    }
    if (slotKey === 'ears' || slotKey === 'bracelet') {
        return d === 0 && Number(t) === 0;
    }
    if (slotKey === 'watch') {
        if (d === 0 && Number(t) === 0) return true;
        return isDefaultFreemodeWatchProp(cur);
    }
    return false;
}

/** Только реальный предмет из каталога — без синтетического ic1 (иначе ложное «надето» и бесконечный дроп). */
function peekAccessoryTokenSellOnly(column, drawable, texture, fk) {
    const tt = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    const dd = Number(drawable);
    if (!Number.isFinite(dd)) return null;
    const entry = findSellEntryForColumn(column, dd, tt, fk);
    if (!entry) return null;
    return encodeIc1({
        cid: entry.ClothID,
        iid: entry.ItemID,
        fr: entry.Frac,
        d: entry.Drawable,
        t: entry.TopTexture,
        nm: entry.ItemName
    });
}

global.isPedAccessorySlotVisuallyEmpty = function (player, slotKey) {
    try {
        if (!mp.players.exists(player)) return true;
        const idx =
            slotKey === 'glasses' ? 1 : slotKey === 'ears' ? 2 : slotKey === 'watch' ? 6 : slotKey === 'bracelet' ? 7 : -1;
        if (idx < 0) return true;
        const cur = player.getProp(idx);
        return isAccessoryPropVisuallyEmpty(slotKey, cur, player);
    } catch (_e) {
        return true;
    }
};

function fractionKey(player) {
    if (!mp.players.exists(player)) return '1';
    const raw = player.getVariable('fraction');
    if (raw === undefined || raw === null || raw === '') return '1';
    const n = parseInt(String(raw).trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 6) return String(n);
    return String(raw);
}

function parseFrdefToken(base) {
    const p = String(base || '').split(':');
    if (p[0] !== 'frdef' || p.length < 5) return null;
    const slot = p[1];
    const fk = String(Math.min(6, Math.max(1, parseInt(p[2], 10) || 1)));
    const d = Number(p[3]);
    const t = Number(p[4]);
    if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
    if (slot !== 'top' && slot !== 'bottom' && slot !== 'shoes') return null;
    return { slot, fk, d, t };
}

/** Верх/низ из инвентаря недоступны, пока на педе принудительная админ-форма после /offnc. */
function adminDutyScOutfitBlocksTopBottom(_player) {
    return false;
}

function equipFrdefTopFromInventory(player, fkT, drawable, texture) {
    if (adminDutyScOutfitBlocksTopBottom(player)) return false;
    if (!Number.isFinite(drawable) || !Number.isFinite(texture)) return false;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    const curTop = player.getClothes(11);
    const old =
        curTop && curTop.drawable !== undefined
            ? tokenFromDbColumn('top', `${curTop.drawable}:${curTop.texture}`, fk)
            : null;
    if (old && !pushReturnedToken(player, old)) return false;
    const savedPatr = captureWornPatrontazh(player);
    player.setClothes(10, 0, 0, 0);
    const cfg = DEFAULT_FRACTION_OUTFIT[fkT];
    const en = findSellEntryForColumn('top', drawable, texture, fk);
    if (en) {
        applyTorsoForTopEquip(player, en, staticId, fraction);
    } else if (cfg && cfg.top && cfg.top[0] === drawable && cfg.top[1] === texture && cfg.tors) {
        player.setClothes(3, cfg.tors[0], cfg.tors[1], 0);
        global.updateOrInsertClothes(staticId, fraction, 'tors', `${cfg.tors[0]}:${cfg.tors[1]}`, () => {});
    } else {
        player.setClothes(3, 15, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
    }
    if (player.model === MALE_FREE_MODE_HASH || player.model === FEMALE_FREE_MODE_HASH) {
        if (typeof global.setFreemodeDefaultUndershirtForPlayer === 'function') {
            global.setFreemodeDefaultUndershirtForPlayer(player);
        } else {
            player.setClothes(8, 15, 0, 0);
        }
    }
    player.setClothes(11, drawable, texture, 0);
    global.updateOrInsertClothes(staticId, fraction, 'top', `${drawable}:${texture}`, () => {});
    if (savedPatr) {
        reapplyWornPatrontazh(player, savedPatr, staticId, fraction);
    } else {
        global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
    }
    const u8 = player.getClothes(8);
    if (u8 && u8.drawable !== undefined) {
        global.updateOrInsertClothes(staticId, fraction, 'undershirt', `${u8.drawable}:${u8.texture}`, () => {});
    }
    global.reapplyDonateGlovesIfEquipped(player);
    return true;
}

function equipFrdefBottomFromInventory(player, fkT, drawable, texture) {
    if (adminDutyScOutfitBlocksTopBottom(player)) return false;
    if (!Number.isFinite(drawable) || !Number.isFinite(texture)) return false;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    const cur = player.getClothes(4);
    const old =
        cur && cur.drawable !== 14 ? tokenFromDbColumn('bottom', `${cur.drawable}:${cur.texture}`, fk) : null;
    if (old && !pushReturnedToken(player, old)) return false;
    player.setClothes(4, drawable, texture, 0);
    global.updateOrInsertClothes(staticId, fraction, 'bottom', `${drawable}:${texture}`, () => {});
    return true;
}

function equipFrdefShoesFromInventory(player, fkT, drawable, texture) {
    if (!Number.isFinite(drawable) || !Number.isFinite(texture)) return false;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    const cur = player.getClothes(6);
    const defS = defaultShoesForFraction(fk);
    const old =
        cur && (cur.drawable !== defS.d || cur.texture !== defS.t)
            ? tokenFromDbColumn('shoes', `${cur.drawable}:${cur.texture}`, fk)
            : null;
    if (old && !pushReturnedToken(player, old)) return false;
    player.setClothes(6, drawable, texture, 0);
    global.updateOrInsertClothes(staticId, fraction, 'shoes', `${drawable}:${texture}`, () => {});
    return true;
}

function inventoryTokenIsUniqueDonate(itemStr) {
    const s = String(itemStr || '');
    return s.startsWith('ivhol:') || s.startsWith('ivbag:');
}

/** Как в CEF: отрезать суффикс (кол-во) и привести ivhol/ivbag к одной строке. */
function normalizeDonateItemStr(itemStr) {
    const s = String(itemStr || '').replace(/^\uFEFF/, '').trim();
    if (!inventoryTokenIsUniqueDonate(s)) return s;
    return s.split('(')[0].trim();
}

function canonicalDonateToken(itemStr) {
    const n = normalizeDonateItemStr(itemStr);
    if (n.startsWith('ivhol:')) {
        const k = n.slice(6);
        return HOLSTER_KEYS.includes(k) ? `ivhol:${k}` : n;
    }
    if (n.startsWith('ivbag:')) {
        const k = n.slice(6);
        return BAG_ACCOUNT_KEYS.includes(k) ? `ivbag:${k}` : n;
    }
    return n;
}

function inventoryHasNormalizedDonate(player, itemStr) {
    if (!Array.isArray(player.inventory) || !inventoryTokenIsUniqueDonate(itemStr)) return false;
    const want = normalizeDonateItemStr(canonicalDonateToken(itemStr));
    if (!want.startsWith('ivhol:') && !want.startsWith('ivbag:')) return false;
    for (let i = 0; i < player.inventory.length; i++) {
        const it = player.inventory[i];
        if (typeof it !== 'string' || !inventoryTokenIsUniqueDonate(it)) continue;
        if (normalizeDonateItemStr(canonicalDonateToken(it)) === want) return true;
    }
    return false;
}
global.inventoryHasNormalizedDonate = inventoryHasNormalizedDonate;

function removeFirstInventoryDonate(player, rawItem) {
    if (!Array.isArray(player.inventory)) return false;
    const want = normalizeDonateItemStr(canonicalDonateToken(rawItem));
    if (!want.startsWith('ivhol:') && !want.startsWith('ivbag:')) return false;
    for (let i = 0; i < player.inventory.length; i++) {
        const it = player.inventory[i];
        if (typeof it !== 'string' || !inventoryTokenIsUniqueDonate(it)) continue;
        if (normalizeDonateItemStr(canonicalDonateToken(it)) === want) {
            player.inventory[i] = null;
            return true;
        }
    }
    return false;
}

/** Снять одну копию ivhol/ivbag из сетки, быстрого слота или любого кармана рюкзака (без тела педа). */
function removeFirstDonateTokenFromStash(player, rawItem) {
    if (removeFirstInventoryDonate(player, rawItem)) return true;
    const want = normalizeDonateItemStr(canonicalDonateToken(rawItem));
    if (!want.startsWith('ivhol:') && !want.startsWith('ivbag:')) return false;
    if (Array.isArray(player.fastSlots)) {
        for (let i = 0; i < player.fastSlots.length; i++) {
            const x = player.fastSlots[i];
            if (typeof x !== 'string' || !inventoryTokenIsUniqueDonate(x)) continue;
            if (normalizeDonateItemStr(canonicalDonateToken(x)) === want) {
                player.fastSlots[i] = '';
                return true;
            }
        }
    }
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            const arr = player._bagStorageByKey[k];
            if (!Array.isArray(arr)) continue;
            for (let i = 0; i < arr.length; i++) {
                const x = arr[i];
                if (typeof x !== 'string' || !inventoryTokenIsUniqueDonate(x)) continue;
                if (normalizeDonateItemStr(canonicalDonateToken(x)) === want) {
                    arr[i] = null;
                    return true;
                }
            }
        }
    }
    return false;
}

global.removeFirstInventoryDonate = removeFirstInventoryDonate;
global.removeFirstDonateTokenFromStash = removeFirstDonateTokenFromStash;
global.canonicalDonateToken = canonicalDonateToken;

global.countInventoryDonateNormalized = function (player, itemStr) {
    if (!mp.players.exists(player) || !itemStr || typeof itemStr !== 'string') return 0;
    if (!inventoryTokenIsUniqueDonate(itemStr)) return 0;
    const want = normalizeDonateItemStr(canonicalDonateToken(itemStr));
    let n = 0;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const x of arr) {
            if (typeof x !== 'string' || !inventoryTokenIsUniqueDonate(x)) continue;
            if (normalizeDonateItemStr(canonicalDonateToken(x)) === want) n++;
        }
    };
    scan(player.inventory);
    scan(player.fastSlots);
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            scan(player._bagStorageByKey[k]);
        }
    }
    return n;
};

/** Подпись для дропа ic1.* (имя из токена). */
global.clothTokenDropLabel = function (itemStr) {
    const s = String(itemStr || '').split('(')[0].trim();
    if (s.startsWith('frdef:')) {
        const p = s.split(':');
        if (p.length >= 5) {
            const slot = p[1];
            if (slot === 'top') return 'Верх';
            if (slot === 'bottom') return 'Штаны';
            if (slot === 'shoes') return 'Кроссовки';
        }
        return 'Одежда';
    }
    if (!s.startsWith('ic1.')) return null;
    const payload = decodeIc1(s);
    if (payload && payload.nm) return clothDisplayShortName(String(payload.nm));
    return 'Одежда';
};

global.tryPushInventoryItem = function (player, itemStr) {
    if (!mp.players.exists(player)) return false;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    else if (!Array.isArray(player.inventory)) player.inventory = [];
    const max = global.getInventoryMaxSlots(player);
    if (typeof global.invGridFirstEmpty === 'function') {
        if (global.invGridFirstEmpty(player) < 0) {
            isNotify(player, 2, 'top-mid', `Инвентарь полон (${max} слотов).`, 3500);
            return false;
        }
    } else if (global.getInventoryUsedSlots(player) >= max) {
        isNotify(player, 2, 'top-mid', `Инвентарь полон (${max} слотов).`, 3500);
        return false;
    }
    let toPush = itemStr;
    if (inventoryTokenIsUniqueDonate(itemStr)) {
        toPush = canonicalDonateToken(itemStr);
        const k = toPush.startsWith('ivhol:') ? toPush.slice(6) : toPush.startsWith('ivbag:') ? toPush.slice(6) : '';
        if (toPush.startsWith('ivhol:') && !HOLSTER_KEYS.includes(k)) return false;
        if (toPush.startsWith('ivbag:') && !BAG_ACCOUNT_KEYS.includes(k)) return false;
        if (
            !toPush.startsWith('ivbag:') &&
            !toPush.startsWith('ivhol:') &&
            inventoryHasNormalizedDonate(player, toPush)
        ) {
            isNotify(player, 2, 'top-mid', 'Такой предмет уже есть в инвентаре.', 3500);
            return false;
        }
    }
    const basePush = String(toPush || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .split('(')[0]
        .trim();
    if (typeof global.invGridTryPush === 'function') return global.invGridTryPush(player, toPush);
    player.inventory.push(toPush);
    return true;
};

/** Есть ли хотя бы один свободный слот (без уведомления). */
global.isPlayerInventoryFull = function (player) {
    if (!mp.players.exists(player)) return true;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    if (typeof global.invGridFirstEmpty === 'function') return global.invGridFirstEmpty(player) < 0;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    const used = inv.reduce((count, item) => count + (item != null && item !== '' ? 1 : 0), 0);
    return used >= global.getInventoryMaxSlots(player);
};

/** Единое уведомление для покупок и выдачи предметов при заполненной сетке. */
global.notifyInventoryNoSpace = function (player, opts) {
    if (!mp.players.exists(player)) return;
    const purchase = !!(opts && opts.purchase);
    const qty = parseInt(opts && opts.qty, 10);
    const max = typeof global.getInventoryMaxSlots === 'function' ? global.getInventoryMaxSlots(player) : BASE_INV_SLOTS;
    let msg;
    if (Number.isFinite(qty) && qty > 1) {
        msg = `Недостаточно места в инвентаре (нужно ${qty} из ${max} слотов).`;
    } else {
        msg = purchase
            ? `Нет свободного места в инвентаре (${max} слотов), покупка невозможна.`
            : `Нет свободного места в инвентаре (${max} слотов).`;
    }
    isNotify(player, 2, 'top-mid', msg, 4000);
};

/** Хватит ли основной сетки под count отдельных предметов. */
global.canAddInventorySlotCount = function (player, count) {
    if (!mp.players.exists(player)) return false;
    const need = Math.max(1, parseInt(count, 10) || 1);
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    if (typeof global.getInventoryMaxSlots === 'function' && typeof global.getInventoryUsedSlots === 'function') {
        return global.getInventoryUsedSlots(player) + need <= global.getInventoryMaxSlots(player);
    }
    if (need === 1 && typeof global.isPlayerInventoryFull === 'function') {
        return !global.isPlayerInventoryFull(player);
    }
    return false;
};

function encodeIc1(payload) {
    const json = JSON.stringify(payload);
    return `ic1.${Buffer.from(json, 'utf8').toString('base64')}`;
}

function decodeIc1(str) {
    if (typeof str !== 'string' || !str.startsWith('ic1.')) return null;
    const b64 = str.slice(4);
    try {
        const json = Buffer.from(b64, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (_e) {
        return null;
    }
}

global.encodeIc1 = encodeIc1;
global.decodeIc1 = decodeIc1;

const SPECTRUM_CLOTH_TOGGLE = {
    1: { 253: 252, 252: 253 },
    2: { 258: 259, 259: 258 }
};

const DONATE_BAG_TOGGLE_DRAWABLE = {
    114: 115,
    115: 114,
    127: 128,
    128: 127
};
const LW_MESSENGER_BAG_ITEM_IDS = { 85813: true, 85814: true };
const GUARD_BAG_ITEM_IDS = { 85637: true };

function spectrumToggleCatalogDrawable(cid, drawable) {
    const c = Number(cid);
    const d = Number(drawable);
    if (c === 1 && d === 252) return 253;
    if (c === 2 && d === 259) return 258;
    return d;
}

function spectrumToggleNextDrawable(cid, drawable) {
    const map = SPECTRUM_CLOTH_TOGGLE[Number(cid)];
    if (!map) return null;
    const next = map[Number(drawable)];
    return Number.isFinite(next) ? next : null;
}

global.spectrumLddPreviewImg = function (texture) {
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    return `spectrum/p/8/149/${t}.png`;
};

global.spectrumLddDisplayName = function (charms) {
    const n = Math.max(0, parseInt(charms, 10) || 0);
    if (n <= 0) return 'Сумка LW LDD без брелков';
    if (n === 1) return 'Сумка LW LDD с 1 брелком';
    return `Сумка LW LDD с ${n} брелками`;
};

/** Сохранить ic1 надетой сумки (с bagInst) в clothes — для релога и ключа baginst:{id}. */
global.persistClothesBagsEquipIc1 = function (player) {
    if (!mp.players.exists(player)) return;
    const staticId = player.static;
    if (staticId == null) return;
    const clothesFr =
        typeof global.getClothesFractionForPlayer === 'function'
            ? global.getClothesFractionForPlayer(player)
            : 0;
    const v = player._bagEquipIc1 && typeof player._bagEquipIc1 === 'string' ? player._bagEquipIc1 : null;
    if (typeof global.updateOrInsertClothes === 'function') {
        global.updateOrInsertClothes(staticId, clothesFr, 'bags_equip_ic1', v, () => {});
        return;
    }
    global.DB.query(
        'UPDATE clothes SET bags_equip_ic1 = ? WHERE static = ? AND fraction = ?',
        [v, staticId, clothesFr],
        () => {}
    );
};

global.verifyBagEquipIc1PayloadMatchesPed = function (player, rawIc1) {
    if (!mp.players.exists(player) || typeof rawIc1 !== 'string' || !rawIc1.startsWith('ic1.')) return false;
    const pl = decodeIc1(rawIc1.split('(')[0].trim());
    if (!pl || Number(pl.cid) !== 8) return false;
    const cur = player.getClothes(5);
    if (!cur || Number(cur.drawable) === 0) return false;
    const d = Number(pl.d);
    const t = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    return Number.isFinite(d) && d === Number(cur.drawable) && t === Number(cur.texture);
};

/** При смене владельца (трейд / подбор / маркет) — строка donate_bag_instances.account_static. done — после UPDATE или если нечего менять. */
global.transferDonateBagInstanceOwnership = function (itemStr, newAccountStatic, done) {
    const finish = function () {
        if (typeof done === 'function') done();
    };
    if (itemStr == null || newAccountStatic == null) return finish();
    const base = String(itemStr).split('(')[0].trim();
    if (!base.startsWith('ic1.')) return finish();
    const pl = decodeIc1(base);
    if (!pl || Number(pl.cid) !== 8) return finish();
    const id = pl.bagInst != null ? Number(pl.bagInst) : NaN;
    if (!Number.isFinite(id) || id <= 0) return finish();
    global.DB.query(
        'UPDATE donate_bag_instances SET account_static = ? WHERE id = ?',
        [newAccountStatic, id],
        () => finish()
    );
};

/** Убрать локальный кэш слотов baginst после выброса/продажи сумки (данные живут в donate_bag_instances.contents). */
global.stripDonateBagInstanceLocalStorage = function (player, itemStr) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return;
    const base = String(itemStr || '').split('(')[0].trim();
    if (!base.startsWith('ic1.')) return;
    const pl = decodeIc1(base);
    if (!pl || Number(pl.cid) !== 8) return;
    const bid = pl.bagInst != null ? Number(pl.bagInst) : NaN;
    if (!Number.isFinite(bid) || bid <= 0) return;
    if (typeof global.persistSingleDonateBagInstanceContents === 'function') {
        global.persistSingleDonateBagInstanceContents(player, bid);
    }
    try {
        delete player._bagStorageByKey[`baginst:${bid}`];
    } catch (_e) {}
};

/**
 * Фракция донат-сумки (ic1, cid 8) из payload. Если fr отсутствует или не число — null.
 * Не подставлять 1: битые/старые токены иначе засчитываются как Ballas и блокируют покупку.
 */
function ic1DonateBagFractionFromPayload(pl) {
    if (!pl || Number(pl.cid) !== 8) return null;
    const raw = pl.fr !== undefined && pl.fr !== null && pl.fr !== '' ? pl.fr : pl.Frac;
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(6, Math.max(1, Math.floor(n)));
}
global.ic1DonateBagFractionFromPayload = ic1DonateBagFractionFromPayload;

/** Базовая строка предмета без суффикса `(стек)` и т.п. */
function ic1InventoryBase(raw) {
    if (typeof raw !== 'string') return '';
    return raw.split('(')[0].trim();
}

/**
 * Последний надетый донат‑/магазинный головной убор: авторитетный ic1 для UI и снятия.
 * Серверный getProp(0) для DLC (drawable 200+) часто расходится с тем, что отрисовывает клиент после setPropIndex(_,_,_,true)
 * — без этого в инвентарь уходит плейсхолдер «Головной убор» и чужие d:t.
 */
global.syncHeadwearEquipCanonicalFromDb = function (player, headwearDbVal) {
    if (!mp.players.exists(player)) return;
    const fk = fractionKey(player);
    if (headwearDbVal == null || headwearDbVal === '') {
        player._headwearEquipIc1 = null;
        return;
    }
    const parts = String(headwearDbVal).trim().split(':');
    const wantD = Number(parts[0]);
    const wantT = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : 0;
    try {
        const canon = player._headwearEquipIc1;
        if (typeof canon === 'string' && canon.startsWith('ic1.') && Number.isFinite(wantD)) {
            const pl = decodeIc1(ic1InventoryBase(canon));
            if (pl && (Number(pl.cid) === 1 || Number(pl.cid) === 0)) {
                const pd = Number(pl.d);
                const pt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
                const sameFamily =
                    pt === wantT &&
                    (pd === wantD ||
                        spectrumToggleCatalogDrawable(1, pd) === spectrumToggleCatalogDrawable(1, wantD));
                if (sameFamily && pl.nm && Number(pl.iid) !== 9901) {
                    if (pd !== wantD || pt !== wantT) {
                        pl.d = wantD;
                        pl.t = wantT;
                        if (Number(pl.iid) >= 91001 && typeof global.spectrumPreviewImg === 'function') {
                            pl.img = global.spectrumPreviewImg(1, wantD, wantT);
                        }
                        player._headwearEquipIc1 = encodeIc1(pl);
                    }
                    return;
                }
            }
        }
    } catch (_eKeep) {}
    const tok = tokenFromDbColumn('headwear', String(headwearDbVal).trim(), fk);
    player._headwearEquipIc1 = tok ? ic1InventoryBase(tok) : null;
};

/**
 * Строка для колонки clothes.headwear при persistPlayerClothesRow.
 * Серверный getProp(0) для DLC (drawable 200+) часто не совпадает с реальной надетой шапкой → в БД попадали чужие d:t и после релога ломались модель/ic1.
 */
global.getPersistHeadwearColumnValue = function (player) {
    if (!mp.players.exists(player)) return null;
    const p0 = player.getProp(0);
    if (!p0 || isFreemodeHeadwearSlotConsideredEmpty(player, p0.drawable, p0.texture)) {
        return null;
    }
    const canon = player._headwearEquipIc1;
    if (typeof canon === 'string' && canon.startsWith('ic1.')) {
        const pl = decodeIc1(ic1InventoryBase(canon));
        if (pl && Number.isFinite(Number(pl.d))) {
            const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
            return `${Number(pl.d)}:${tt}`;
        }
    }
    const tt0 = Number.isFinite(Number(p0.texture)) ? Number(p0.texture) : 0;
    return `${Number(p0.drawable)}:${tt0}`;
};

/** Короткое имя для UI (экипировка, дроп): без « · текст.N», без (Ballas) и «Кроссовки 1». */
function clothDisplayShortName(nm) {
    if (nm == null || typeof nm !== 'string') return nm;
    let s = nm.replace(/\s*\(\d+\s*слотов\)/gi, '').trim();
    s = s.replace(/\s*[·•\-]\s*(?:текст|text)\.\d+\s*$/i, '').trim();
    s = s.replace(/\s*[·•]\s*\d+\s*$/, '').trim();
    s = s.replace(/\s+вар\.\s*\d+\s*$/i, '').trim();
    let i = s.indexOf(' · текст.');
    if (i === -1) i = s.indexOf(' · text.');
    if (i === -1) i = s.indexOf(' · т.');
    if (i !== -1) s = s.slice(0, i).trim();
    s = s.replace(/\s*\(\s*(?:Ballas|Families|Bloods|Vagos|Marabunta|FIB)\s*\)\s*$/i, '').trim();
    s = s.replace(/^Кроссовки\s+(\d+)(?:\s+(.*))?$/i, (_all, _num, rest) =>
        rest && String(rest).trim() ? `Кроссовки ${String(rest).trim()}` : 'Кроссовки'
    );
    if (/^Обувь(?:\s|$)/i.test(s)) s = s.replace(/^Обувь/i, 'Кроссовки');
    return s;
}

global.clothDisplayShortName = clothDisplayShortName;

function findInClothesSellPools(predicate) {
    if (global.DonateClothesItemsSell && Array.isArray(global.DonateClothesItemsSell)) {
        const d = global.DonateClothesItemsSell.find(predicate);
        if (d) return d;
    }
    if (global.SpectrumClothesItemsSell && Array.isArray(global.SpectrumClothesItemsSell)) {
        const spectrum = global.SpectrumClothesItemsSell.find(predicate);
        if (spectrum) return spectrum;
    }
    if (global.ClothesItemsSell && Array.isArray(global.ClothesItemsSell)) {
        return global.ClothesItemsSell.find(predicate) || null;
    }
    return null;
}

/**
 * Жёстко прописанные донат‑шапки (drawable вне обычного диапазона) — гарантируем,
 * что имя/текстуры подхватятся даже если каталог DonateClothesItemsSell где‑то не загрузился.
 * Синхронно с scripts/gen_donate_clothes.js.
 */
const KNOWN_DONATE_HATS = {
    247: { name: 'Шапка с рожками', textures: [0, 1, 2, 3, 4, 5, 6, 7] },
    248: { name: 'Шапка теплая', textures: [0, 1, 2, 3, 5, 6] },
    249: { name: 'Рожки чертика', textures: [0, 1, 2, 3, 4, 5] },
    250: { name: 'Шапка с рожками чертика', textures: [0, 1, 2, 3, 4] },
    251: { name: 'Шапка ушанка', textures: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
};

function knownDonateHatRow(drawable, texture, preferFracKey) {
    const dN = Number(drawable);
    const e = KNOWN_DONATE_HATS[dN];
    if (!e) return null;
    let tN = Number(texture);
    if (!Number.isFinite(tN) || !e.textures.includes(tN)) tN = e.textures[0];
    const fr = Math.min(6, Math.max(1, Number(preferFracKey) || 1));
    const pool = global.DonateClothesItemsSell;
    if (Array.isArray(pool) && pool.length) {
        const pred = (it) =>
            it &&
            (it.ClothID === 1 || it.ClothID === 0) &&
            Number(it.Drawable) === dN &&
            Number(it.TopTexture) === tN;
        let hit = pool.find((it) => pred(it) && Number(it.Frac) === fr);
        if (!hit) hit = pool.find(pred);
        if (hit) return hit;
    }
    return {
        ClothID: 1,
        ItemID: 9901,
        ItemName: `${e.name} · текст.${tN}`,
        Price: 0,
        Drawable: dN,
        ItemImg: null,
        Textures: null,
        TopTexture: tN,
        Frac: fr,
        Component: 0,
        Torso: null
    };
}

/** Головной убор из Spectrum / premium / обычного каталога. */
function findHeadwearSellRowInPools(drawable, texture, preferFracKey) {
    const wearD = Number(drawable);
    let tN = Number(texture);
    if (!Number.isFinite(tN)) tN = 0;
    if (!Number.isFinite(wearD)) return null;
    const catD = spectrumToggleCatalogDrawable(1, wearD);
    const drawableTries = catD !== wearD ? [wearD, catD] : [wearD];
    const fk = Number(preferFracKey);
    const isHat = (it) => it && (it.ClothID === 1 || it.ClothID === 0) && !it.spectrumCharmOnly;

    const collect = (pred) => {
        const out = [];
        const scan = (arr) => {
            if (!Array.isArray(arr)) return;
            for (let i = 0; i < arr.length; i++) {
                if (pred(arr[i])) out.push(arr[i]);
            }
        };
        scan(global.SpectrumClothesItemsSell);
        scan(global.DonateClothesItemsSell);
        if (!out.length) scan(global.ClothesItemsSell);
        return out;
    };

    let candidates = [];
    for (let i = 0; i < drawableTries.length && !candidates.length; i++) {
        const d = drawableTries[i];
        candidates = collect(
            (it) => isHat(it) && Number(it.Drawable) === d && Number(it.TopTexture) === tN
        );
    }
    for (let i = 0; i < drawableTries.length && !candidates.length; i++) {
        const d = drawableTries[i];
        candidates = collect((it) => isHat(it) && Number(it.Drawable) === d);
    }
    if (!candidates.length) {
        return knownDonateHatRow(wearD, tN, fk);
    }
    let hit = null;
    if (Number.isFinite(fk)) {
        hit = candidates.find((it) => Number(it.Frac) === fk) || null;
    }
    if (!hit) hit = candidates[0];
    if (hit && Number(hit.Drawable) !== wearD) {
        return Object.assign({}, hit, { Drawable: wearD, TopTexture: tN });
    }
    return hit;
}

function preserveDonateTopWearDrawable(row, wearDrawable) {
    if (!row || Number(row.ClothID) !== 3) return row;
    const wearD = Number(wearDrawable);
    const rowD = Number(row.Drawable);
    if (!Number.isFinite(wearD)) return row;
    const legacyToCurrent = {
        612: 631,
        619: 638,
        620: 639,
        621: 639,
        640: 659,
        641: 660,
        644: 659,
        645: 660,
        661: 663,
        662: 664
    };
    const wearOut = legacyToCurrent[wearD] != null ? legacyToCurrent[wearD] : wearD;
    if (wearOut === rowD) return row;
    if (!donateTopDrawableAliasSet(wearD).has(rowD)) return row;
    return Object.assign({}, row, { Drawable: wearOut });
}

function findClothSellMatch(payload) {
    if (!payload) return null;
    const webPait = webPaitSellRow(payload);
    if (webPait) return webPait;
    const cid = Number(payload.cid);
    const iid = Number(payload.iid);
    const fr = Number(payload.fr);
    const d = Number(payload.d);
    const t = Number(payload.t);
    const predFull = (it) =>
        it.ClothID === cid &&
        it.ItemID === iid &&
        Number(it.Frac) === fr &&
        Number(it.Drawable) === d &&
        Number(it.TopTexture) === t;
    let hit = findInClothesSellPools(predFull);
    if (hit) {
        if (!(isWebPaitIc1Payload(payload) && Number(hit.Drawable) === 173)) return hit;
        hit = null;
    }
    const spectrumCatalogD = spectrumToggleCatalogDrawable(cid, d);
    if (spectrumCatalogD !== d && Number.isFinite(spectrumCatalogD)) {
        hit = findInClothesSellPools(
            (it) =>
                it.ClothID === cid &&
                it.ItemID === iid &&
                Number(it.Drawable) === spectrumCatalogD &&
                Number(it.TopTexture) === t
        );
        if (hit) return hit;
    }
    /** Старый Frac в ic1 после смены фракции — всё ещё та же вещь по ItemID и drawable:texture. */
    hit = findInClothesSellPools(
        (it) =>
            it.ClothID === cid &&
            it.ItemID === iid &&
            Number(it.Drawable) === d &&
            Number(it.TopTexture) === t
    );
    if (hit) {
        if (!(isWebPaitIc1Payload(payload) && Number(hit.Drawable) === 173)) return hit;
        hit = null;
    }
    /** Голова: ic1 с битым ItemID / синтетик 9901 / смена каталога — матч по видимой паре на педе */
    if ((cid === 1 || cid === 0) && Number.isFinite(d) && Number.isFinite(t)) {
        hit = findHeadwearSellRowInPools(d, t, fr);
        if (hit) return hit;
    }
    /** Пеинты с сайта (173): не подменять премиальным Veezy 700 из каталога */
    if (cid === 5 && d === 173 && Number.isFinite(t)) {
        if (!isWebPaitIc1Payload(payload)) {
            hit = findInClothesSellPools(
                (it) => it.ClothID === 5 && Number(it.Drawable) === 173 && Number(it.TopTexture) === t
            );
            if (hit) return hit;
        }
    }
    if (cid === 3 && Number.isFinite(t)) {
        const ds = donateTopDrawableAliasSet(d);
        if (Number.isFinite(iid)) {
            for (const dTry of ds) {
                hit = findInClothesSellPools(
                    (it) =>
                        it.ClothID === 3 &&
                        it.ItemID === iid &&
                        Number(it.Drawable) === dTry &&
                        Number(it.TopTexture) === t
                );
                if (hit) return preserveDonateTopWearDrawable(hit, d);
            }
        }
        for (const dTry of ds) {
            hit = findInClothesSellPools(
                (it) => it.ClothID === 3 && Number(it.Drawable) === dTry && Number(it.TopTexture) === t
            );
            if (hit) return preserveDonateTopWearDrawable(hit, d);
        }
    }
    if (cid === 8 && Number.isFinite(d) && d >= 149 && d <= 156 && Number.isFinite(t)) {
        hit = findInClothesSellPools(
            (it) =>
                it.ClothID === 8 &&
                Number(it.Drawable) === 149 &&
                Number(it.TopTexture) === t &&
                !it.spectrumCharmOnly &&
                (it.spectrumLddBase === true || Number(it.ItemID) === iid)
        );
        if (hit) {
            const charms = Math.max(0, d - 149);
            return Object.assign({}, hit, {
                Drawable: d,
                ItemImg: global.spectrumLddPreviewImg(t),
                ItemName: global.spectrumLddDisplayName(charms)
            });
        }
    }
    return null;
}

function removeOneInventoryExact(player, itemStr) {
    if (!Array.isArray(player.inventory)) return false;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    for (let i = 0; i < player.inventory.length; i++) {
        if (player.inventory[i] === itemStr) {
            player.inventory[i] = null;
            return true;
        }
    }
    return false;
}

global.removeOneInventoryExact = removeOneInventoryExact;

/** Экипировка меняет одновременно сетку, педа и clothes в БД — короткий спам создавал гонки/дубли. */
const INV_EQUIP_ACTION_MS = 650;

function takeInventoryActionLock(player) {
    if (!mp.players.exists(player)) return false;
    const now = Date.now();
    if (player._invEquipLockUntil && now < player._invEquipLockUntil) {
        isNotify(player, 2, 'top-mid', 'Подождите.', 1200);
        return false;
    }
    player._invEquipLockUntil = now + INV_EQUIP_ACTION_MS;
    return true;
}

function isUsableTopTorsoValue(torsoVal) {
    if (torsoVal === null || torsoVal === undefined || torsoVal === 'null') return false;
    const n = Number(String(torsoVal).trim().split(':')[0]);
    // 0 — валидный торс у многих DLC-топов (как в bloody-dm); invalid только NaN/отрицательные
    return Number.isFinite(n) && n >= 0;
}
global.isUsableTopTorsoValue = isUsableTopTorsoValue;

function applyTorsoIfAny(player, torsoVal) {
    if (!isUsableTopTorsoValue(torsoVal)) return false;
    const parts = String(torsoVal).trim().split(':');
    const d = Number(parts[0]);
    const tx = parts.length > 1 ? Number(parts[1]) : 0;
    if (!Number.isFinite(d)) return false;
    const texture = Number.isFinite(tx) ? tx : 0;
    player.setClothes(3, d, texture, 0);
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    global.updateOrInsertClothes(staticId, fraction, 'tors', parts.length > 1 ? `${d}:${texture}` : String(d), () => {});
    return true;
}

function applyDefaultFreemodeTopTorso(player, staticId, fraction) {
    if (player.model !== MALE_FREE_MODE_HASH && player.model !== FEMALE_FREE_MODE_HASH) return;
    player.setClothes(3, 15, 0, 0);
    if (staticId != null) {
        global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
    }
}

function applyTorsoForTopEquip(player, def, staticId, fraction) {
    if (applyTorsoIfAny(player, def && def.Torso)) return;
    applyDefaultFreemodeTopTorso(player, staticId, fraction);
}

global.resolveClothDefForPlayer = function resolveClothDefForPlayer(_player, def) {
    return def;
};

function applyFactionDefaultTop(player, fk) {
    const cfg = DEFAULT_FRACTION_OUTFIT[fk] || STARTER_OUTFIT_CFG;
    if (cfg.tors) player.setClothes(3, cfg.tors[0], cfg.tors[1], 0);
    else player.setClothes(3, 15, 0, 0);
    if (player.model === MALE_FREE_MODE_HASH || player.model === FEMALE_FREE_MODE_HASH) {
        player.setClothes(8, 15, 0, 0);
    }
    if (cfg.top) player.setClothes(11, cfg.top[0], cfg.top[1], 0);
}

function findSellEntryForColumn(column, drawable, texture, frac) {
    const fr = Number(frac);
    const d = Number(drawable);
    const t = Number(texture);
    const matchDt = (it) => Number(it.Drawable) === d && Number(it.TopTexture) === t;
    const matchFrac = (it) => Number(it.Frac) === fr && matchDt(it);
    const findTwoPassPools = (predFrac, predAny) =>
        findInClothesSellPools(predFrac) || findInClothesSellPools(predAny) || null;

    if (column === 'headwear') {
        return findHeadwearSellRowInPools(d, t, fr);
    }
    if (column === 'masks') {
        const dMatch = spectrumToggleCatalogDrawable(2, d);
        const maskDt = (it) => Number(it.Drawable) === dMatch && Number(it.TopTexture) === t;
        return findTwoPassPools(
            (it) => it.ClothID === 2 && Number(it.Frac) === fr && maskDt(it),
            (it) => it.ClothID === 2 && maskDt(it)
        );
    }
    if (column === 'top') {
        let dMatch = donateTopCatalogDrawable(d);
        const matchDt = (it) => Number(it.Drawable) === dMatch && Number(it.TopTexture) === t;
        const matchFrac = (it) => Number(it.Frac) === fr && matchDt(it);
        return findTwoPassPools(
            (it) => it.ClothID === 3 && matchFrac(it),
            (it) => it.ClothID === 3 && matchDt(it)
        );
    }
    if (column === 'bottom') {
        return findTwoPassPools((it) => it.ClothID === 4 && matchFrac(it), (it) => it.ClothID === 4 && matchDt(it));
    }
    if (column === 'shoes') {
        return findTwoPassPools((it) => it.ClothID === 5 && matchFrac(it), (it) => it.ClothID === 5 && matchDt(it));
    }
    if (column === 'accessories') {
        const hitFrac = findInClothesSellPools((it) => it.ClothID === 6 && matchFrac(it));
        if (hitFrac) return hitFrac;
        /** Не брать «первый в массиве» (часто Frac 1 — шарф), а строку с Frac игрока или первую подходящую по d:t. */
        const candidates = [];
        const scan = (arr) => {
            if (!Array.isArray(arr)) return;
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i];
                if (it.ClothID === 6 && matchDt(it)) candidates.push(it);
            }
        };
        scan(global.SpectrumClothesItemsSell);
        scan(global.DonateClothesItemsSell);
        scan(global.ClothesItemsSell);
        if (!candidates.length) return null;
        const pref = candidates.find((it) => Number(it.Frac) === fr);
        return pref || candidates[0];
    }
    if (column === 'glasses') {
        return findTwoPassPools((it) => it.ClothID === 7 && matchFrac(it), (it) => it.ClothID === 7 && matchDt(it));
    }
    if (column === 'ears') {
        return findTwoPassPools((it) => it.ClothID === 12 && matchFrac(it), (it) => it.ClothID === 12 && matchDt(it));
    }
    if (column === 'watch_prop') {
        return findTwoPassPools((it) => it.ClothID === 13 && matchFrac(it), (it) => it.ClothID === 13 && matchDt(it));
    }
    if (column === 'bracelet_prop') {
        return findTwoPassPools((it) => it.ClothID === 14 && matchFrac(it), (it) => it.ClothID === 14 && matchDt(it));
    }
    if (column === 'bags') {
        if (Number.isFinite(d) && d >= 149 && d <= 156) {
            const ldd = findTwoPassPools(
                (it) =>
                    it.ClothID === 8 &&
                    Number(it.Frac) === fr &&
                    Number(it.Drawable) === 149 &&
                    Number(it.TopTexture) === t &&
                    !it.spectrumCharmOnly,
                (it) =>
                    it.ClothID === 8 &&
                    Number(it.Drawable) === 149 &&
                    Number(it.TopTexture) === t &&
                    !it.spectrumCharmOnly
            );
            if (ldd) {
                return Object.assign({}, ldd, {
                    Drawable: d,
                    ItemImg: global.spectrumLddPreviewImg(t),
                    ItemName: global.spectrumLddDisplayName(Math.max(0, d - 149))
                });
            }
        }
        return findTwoPassPools((it) => it.ClothID === 8 && matchFrac(it), (it) => it.ClothID === 8 && matchDt(it));
    }
    if (column === 'decals') {
        return findTwoPassPools((it) => it.ClothID === 9 && matchFrac(it), (it) => it.ClothID === 9 && matchDt(it));
    }
    return null;
}

/**
 * Какой токен надетой сейчас сумки положить в инвентарь при свопе.
 * Сохраняем bagInst у ic1 — иначе хранилище baginst:{id} осиротеет, и предметы «исчезнут» при повторном надевании.
 * Для ivbag из реестра возвращаем стабильный ivbag:KEY (drawable:texture → KEY).
 */
function getCurrentBagInventoryToken(player) {
    if (!mp.players.exists(player)) return null;
    const cur = player.getClothes(5);
    if (!cur || Number(cur.drawable) === 0) return null;
    const d = Number(cur.drawable);
    const t = Number.isFinite(Number(cur.texture)) ? Number(cur.texture) : 0;
    const fk = fractionKey(player);

    const canon = player._bagEquipIc1;
    if (typeof canon === 'string' && canon.startsWith('ic1.')) {
        const base = ic1InventoryBase(canon);
        const pl = decodeIc1(base);
        if (pl && Number(pl.cid) === 8 && Number(pl.d) === d && Number(pl.t || 0) === t) {
            return base;
        }
    }

    const dKey = `${d}:${t}`;
    const ivbagKey = DRAWABLE_TEXTURE_TO_IVBAG_KEY[dKey];
    if (ivbagKey && BAG_ACCOUNT_KEYS.includes(ivbagKey)) {
        return `ivbag:${ivbagKey}`;
    }

    return tokenFromDbColumn('bags', dKey, fk);
}

function tokenFromDbColumn(column, val, frac) {
    if (!val || typeof val !== 'string') return null;
    if (column === 'gloves') {
        const parts = String(val).split(':');
        const iid = Number(parts[0]);
        const tx = Number(parts[1]);
        if (!Number.isFinite(iid)) return null;
        const it = findInClothesSellPools(
            (row) =>
                row.ClothID === 15 &&
                row.ItemID === iid &&
                row.TopTexture === (Number.isFinite(tx) ? tx : 0)
        );
        if (!it) return null;
        const payload = {
            cid: 15,
            iid: it.ItemID,
            fr: it.Frac,
            d: it.Drawable,
            t: it.TopTexture,
            nm: it.ItemName
        };
        if (it.ItemImg && typeof it.ItemImg === 'string') payload.img = it.ItemImg;
        return encodeIc1(payload);
    }
    const parts = val.split(':');
    const d = Number(parts[0]);
    const t = Number(parts[1]);
    if (!Number.isFinite(d)) return null;
    const tt = Number.isFinite(t) ? t : 0;
    /** Дефолт «босиком» — не предмет инвентаря (до findSellEntryForColumn, иначе ic1 «Босиком»). */
    if (column === 'shoes' && isBarefootShoesDrawable(d, tt)) return null;
    /** Кабура (ivhol) должна иметь приоритет над любой записью ClothID 6 в каталоге с тем же drawable:texture. */
    if (column === 'accessories') {
        if (d === 206 && tt === 0) return 'ivhol:cobura';
        if (d === 206 && tt === 1) return 'ivhol:coburaw';
        if (d === 201 && tt === 0) return 'ivhol:cobura';
        if (d === 201 && tt === 1) return 'ivhol:coburaw';
        if (d === 50 && tt === 0) return 'ivhol:cobura';
        if (d === 50 && tt === 1) return 'ivhol:coburaw';
        if (d === 44 && tt === 0) return 'ivhol:cobura';
        if (d === 45 && tt === 0) return 'ivhol:coburaw';
    }
    /** Головной убор: только каталог. Без синтетического ic1 — иначе фантомные шапки и дюп при снятии. */
    if (column === 'headwear' && Number.isFinite(d)) {
        if (d < 0) return null;
        if (d === 0 && tt === 0) return null;
        if (d === 8 && tt === 0) return null;
        const hatRow = findHeadwearSellRowInPools(d, tt, frac);
        if (hatRow) {
            const payload = {
                cid: hatRow.ClothID,
                iid: hatRow.ItemID,
                fr: hatRow.Frac,
                d: hatRow.Drawable,
                t: tt,
                nm: hatRow.ItemName
            };
            if (hatRow.ItemImg && typeof hatRow.ItemImg === 'string') {
                payload.img = hatRow.ItemImg;
            } else if (Number(hatRow.ItemID) >= 91001 && typeof global.spectrumPreviewImg === 'function') {
                payload.img = global.spectrumPreviewImg(1, d, tt);
            }
            return encodeIc1(payload);
        }
        return null;
    }
    const entry = findSellEntryForColumn(column, d, tt, frac);
    if (entry) {
        const payload = {
            cid: entry.ClothID,
            iid: entry.ItemID,
            fr: entry.Frac,
            d: entry.Drawable,
            t: entry.TopTexture,
            nm: entry.ItemName
        };
        if (entry.ItemImg && typeof entry.ItemImg === 'string') payload.img = entry.ItemImg;
        return encodeIc1(payload);
    }
    if (column === 'shoes' && Number.isFinite(d) && d === 173) {
        const hit = shoes173CatalogRow(tt, frac);
        if (!hit) return null;
        const payload = {
            cid: 5,
            iid: hit.ItemID,
            fr: hit.Frac,
            d: 173,
            t: tt,
            nm: hit.ItemName
        };
        if (hit.ItemImg && typeof hit.ItemImg === 'string') payload.img = hit.ItemImg;
        return encodeIc1(payload);
    }
    if (column === 'decals' && Number.isFinite(d) && d === 305) {
        const tex = Number.isFinite(tt) ? tt : 0;
        const colorNum = tex >= 0 && tex <= 2 ? tex + 1 : 1;
        return encodeIc1({
            cid: 9,
            iid: 87001,
            fr: Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)),
            d: 305,
            t: tex,
            nm: 'Патронтаж',
            img: 'patrontazh_' + colorNum + '.png'
        });
    }
    if (column === 'glasses' && Number.isFinite(d)) {
        if (d < 0 || d === 0) return null;
        const anyG = findInClothesSellPools(
            (it) => it.ClothID === 7 && it.Drawable === d && it.TopTexture === (Number.isFinite(t) ? t : 0)
        );
        if (anyG) {
            return encodeIc1({
                cid: anyG.ClothID,
                iid: anyG.ItemID,
                fr: anyG.Frac,
                d: anyG.Drawable,
                t: anyG.TopTexture,
                nm: anyG.ItemName
            });
        }
        return encodeIc1({
            cid: 7,
            iid: 999,
            fr: Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)),
            d,
            t: Number.isFinite(t) ? t : 0,
            nm: 'Очки'
        });
    }
    if (column === 'ears' && Number.isFinite(d)) {
        const anyE = findInClothesSellPools(
            (it) => it.ClothID === 12 && it.Drawable === d && it.TopTexture === (Number.isFinite(t) ? t : 0)
        );
        if (anyE) {
            return encodeIc1({
                cid: anyE.ClothID,
                iid: anyE.ItemID,
                fr: anyE.Frac,
                d: anyE.Drawable,
                t: anyE.TopTexture,
                nm: anyE.ItemName
            });
        }
        return encodeIc1({
            cid: 12,
            iid: 9912,
            fr: Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)),
            d,
            t: Number.isFinite(t) ? t : 0,
            nm: 'Серьги'
        });
    }
    if (column === 'watch_prop' && Number.isFinite(d)) {
        const anyW = findInClothesSellPools(
            (it) => it.ClothID === 13 && it.Drawable === d && it.TopTexture === (Number.isFinite(t) ? t : 0)
        );
        if (anyW) {
            return encodeIc1({
                cid: anyW.ClothID,
                iid: anyW.ItemID,
                fr: anyW.Frac,
                d: anyW.Drawable,
                t: anyW.TopTexture,
                nm: anyW.ItemName
            });
        }
        return encodeIc1({
            cid: 13,
            iid: 9913,
            fr: Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)),
            d,
            t: Number.isFinite(t) ? t : 0,
            nm: 'Часы'
        });
    }
    if (column === 'bracelet_prop' && Number.isFinite(d)) {
        const anyB = findInClothesSellPools(
            (it) => it.ClothID === 14 && it.Drawable === d && it.TopTexture === (Number.isFinite(t) ? t : 0)
        );
        if (anyB) {
            return encodeIc1({
                cid: anyB.ClothID,
                iid: anyB.ItemID,
                fr: anyB.Frac,
                d: anyB.Drawable,
                t: anyB.TopTexture,
                nm: anyB.ItemName
            });
        }
        return encodeIc1({
            cid: 14,
            iid: 9914,
            fr: Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)),
            d,
            t: Number.isFinite(t) ? t : 0,
            nm: 'Браслет'
        });
    }
    const fkNorm = String(Math.min(6, Math.max(1, parseInt(String(frac), 10) || 1)));
    const cfgDef = DEFAULT_FRACTION_OUTFIT[fkNorm];
    if (column === 'top' && cfgDef && cfgDef.top && cfgDef.top[0] === d && cfgDef.top[1] === tt) {
        return `frdef:top:${fkNorm}:${d}:${tt}`;
    }
    if (column === 'bottom' && cfgDef && cfgDef.bottom && cfgDef.bottom[0] === d && cfgDef.bottom[1] === tt) {
        return `frdef:bottom:${fkNorm}:${d}:${tt}`;
    }
    if (column === 'shoes' && cfgDef && cfgDef.shoes && cfgDef.shoes[0] === d && cfgDef.shoes[1] === tt) {
        return `frdef:shoes:${fkNorm}:${d}:${tt}`;
    }
    if (column === 'bags') {
        for (const key of Object.keys(DONATE_BAGS)) {
            const b = DONATE_BAGS[key];
            if (b.drawable === d && b.texture === tt) return `ivbag:${key}`;
        }
    }
    /** Стартовая/редакторская одежда вне каталога — frdef-токен, чтобы слот экипировки не был «пустым». */
    if (column === 'top' && Number.isFinite(d)) {
        if (d === 15 && tt === 0) return null;
        return `frdef:top:${fkNorm}:${d}:${tt}`;
    }
    if (column === 'bottom' && Number.isFinite(d)) {
        if (d === 14 && tt === 0) return null;
        return `frdef:bottom:${fkNorm}:${d}:${tt}`;
    }
    if (column === 'shoes' && Number.isFinite(d)) {
        const defS = defaultShoesForFraction(fkNorm);
        if (Number(d) === defS.d && Number(tt) === defS.t) return null;
        return `frdef:shoes:${fkNorm}:${d}:${tt}`;
    }
    return null;
}

/** Уши (ClothID 12): донат может не попадать в Frac-пул peekAccessoryTokenSellOnly — иначе «пустой слот» при снятии.
 * Не вызывать tokenFromDbColumn('ears',…): там синтетический ic1 («Серьги», iid 9912), который попадал в инвентарь
 * при каждой смене серёг и не одевается обратно. */
function peekEarsTokenForInventory(drawable, texture, fk) {
    let token = peekAccessoryTokenSellOnly('ears', drawable, texture, fk);
    if (token) return token;
    const tt = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    const dd = Number(drawable);
    if (!Number.isFinite(dd)) return null;
    const anyE = findInClothesSellPools(
        (it) => it.ClothID === 12 && it.Drawable === dd && it.TopTexture === tt
    );
    if (!anyE) return null;
    return encodeIc1({
        cid: anyE.ClothID,
        iid: anyE.ItemID,
        fr: anyE.Frac,
        d: anyE.Drawable,
        t: anyE.TopTexture,
        nm: anyE.ItemName
    });
}

function inventoryHasNormalizedBase(player, baseNorm) {
    if (!baseNorm) return false;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return false;
        for (let i = 0; i < arr.length; i++) {
            const x = arr[i];
            if (typeof x !== 'string') continue;
            if (x.split('(')[0].trim() === baseNorm) return true;
        }
        return false;
    };
    return scan(player.inventory) || scan(player.fastSlots);
}

/**
 * Один и тот же предмет ic1 может отличаться в base64 (nm, fr, img, iid между строками каталога).
 * Для синка «надетое → инвентарь» достаточно совпадения слота каталога и пары drawable:texture.
 */
function ic1PayloadsVisuallySame(a, b) {
    if (!a || !b) return false;
    const cid = Number(a.cid);
    const d = Number(a.d);
    const t = Number(a.t);
    const cid2 = Number(b.cid);
    const d2 = Number(b.d);
    const t2 = Number(b.t);
    if (![cid, d, t, cid2, d2, t2].every((n) => Number.isFinite(n))) return false;
    if (cid !== cid2 || t !== t2) return false;
    if (d === d2) return true;
    if (cid === 3) {
        const pair = (x, y) => donateTopDrawableAliasSet(x).has(y);
        if (pair(d, d2)) return true;
    }
    return false;
}

/** Только для syncWorn: frdef:top|bottom:…:d:t без проверки дефолта фракции. */
function syncFrdefTopBottomParts(base) {
    const p = String(base || '').split(':');
    if (p[0] !== 'frdef' || p.length < 5) return null;
    const slot = p[1];
    if (slot !== 'top' && slot !== 'bottom') return null;
    const d = Number(p[3]);
    const t = Number(p[4]);
    if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
    return { slot, d, t };
}

/** Уже есть в инвентаре / быстрых слотах то же верх/низ (тот же base64, тот же вид ic1, или ic1↔frdef). */
function syncWornOutfitAlreadyPresent(player, tokenStr) {
    if (!mp.players.exists(player) || !tokenStr || typeof tokenStr !== 'string') return false;
    const base = tokenStr.split('(')[0].trim();
    if (inventoryHasNormalizedBase(player, base)) return true;

    if (base.startsWith('ic1.')) {
        const pNew = decodeIc1(base);
        if (!pNew) return false;
        const cid = Number(pNew.cid);
        const d = Number(pNew.d);
        const t = Number(pNew.t);
        if (![cid, d, t].every(Number.isFinite)) return false;
        const scan = (arr) => {
            if (!Array.isArray(arr)) return false;
            for (let i = 0; i < arr.length; i++) {
                const x = arr[i];
                if (typeof x !== 'string') continue;
                const b = x.split('(')[0].trim();
                if (b.startsWith('ic1.')) {
                    const p2 = decodeIc1(b);
                    if (p2 && ic1PayloadsVisuallySame(pNew, p2)) return true;
                } else {
                    const fb = syncFrdefTopBottomParts(b);
                    if (fb && fb.slot === 'top' && cid === 3 && fb.d === d && fb.t === t) return true;
                    if (fb && fb.slot === 'bottom' && cid === 4 && fb.d === d && fb.t === t) return true;
                }
            }
            return false;
        };
        return scan(player.inventory) || scan(player.fastSlots);
    }

    const fr = syncFrdefTopBottomParts(base);
    if (fr) {
        const scan = (arr) => {
            if (!Array.isArray(arr)) return false;
            for (let i = 0; i < arr.length; i++) {
                const x = arr[i];
                if (typeof x !== 'string') continue;
                const b = x.split('(')[0].trim();
                const fb = syncFrdefTopBottomParts(b);
                if (fb && fb.slot === fr.slot && fb.d === fr.d && fb.t === fr.t) return true;
                if (!b.startsWith('ic1.')) continue;
                const p2 = decodeIc1(b);
                if (!p2) continue;
                const cid = Number(p2.cid);
                const d = Number(p2.d);
                const t = Number(p2.t);
                if (fr.slot === 'top' && cid === 3 && d === fr.d && t === fr.t) return true;
                if (fr.slot === 'bottom' && cid === 4 && d === fr.d && t === fr.t) return true;
            }
            return false;
        };
        return scan(player.inventory) || scan(player.fastSlots);
    }

    return false;
}

function isBarefootShoeInventoryToken(base) {
    if (typeof base !== 'string') return false;
    const p = parseFrdefToken(base);
    if (p && p.slot === 'shoes') return true;
    if (base.startsWith('ic1.')) {
        const pl = decodeIc1(base);
        if (pl && Number(pl.cid) === 5 && isBarefootShoesDrawable(pl.d, pl.t)) return true;
    }
    return false;
}

/** Удалить из инвентаря «босиком» / frdef:shoes — дефолтная обувь не предмет. */
function stripFrdefDefaultShoeTokens(player) {
    if (!Array.isArray(player.inventory)) return false;
    let changed = false;
    for (let i = player.inventory.length - 1; i >= 0; i--) {
        const it = player.inventory[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        if (isBarefootShoeInventoryToken(base)) {
            player.inventory[i] = null;
            changed = true;
        }
    }
    return changed;
}
global.stripFrdefDefaultShoeTokens = stripFrdefDefaultShoeTokens;

/** Надетый верх/низ не должен дублироваться в сетке инвентаря — только в слотах экипировки. */
function stripEquippedTopBottomFromInventory(player) {
    if (!Array.isArray(player.inventory) || !mp.players.exists(player)) return false;
    let changed = false;
    let topCur;
    let bottomCur;
    try {
        topCur = player.getClothes(11);
        bottomCur = player.getClothes(4);
    } catch (_e) {
        return false;
    }
    for (let i = 0; i < player.inventory.length; i++) {
        const it = player.inventory[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        const fr = syncFrdefTopBottomParts(base);
        if (fr) {
            if (fr.slot === 'top' && topCur && Number(topCur.drawable) === fr.d && Number(topCur.texture) === fr.t) {
                player.inventory[i] = null;
                changed = true;
            } else if (
                fr.slot === 'bottom' &&
                bottomCur &&
                Number(bottomCur.drawable) === fr.d &&
                Number(bottomCur.texture) === fr.t
            ) {
                player.inventory[i] = null;
                changed = true;
            }
            continue;
        }
        if (!base.startsWith('ic1.')) continue;
        const pl = decodeIc1(base);
        const cid = pl && Number(pl.cid);
        const d = pl && Number(pl.d);
        const t = pl && Number(pl.t);
        if (cid === 3 && topCur && Number(topCur.drawable) === d && Number(topCur.texture) === t) {
            player.inventory[i] = null;
            changed = true;
        } else if (cid === 4 && bottomCur && Number(bottomCur.drawable) === d && Number(bottomCur.texture) === t) {
            player.inventory[i] = null;
            changed = true;
        }
    }
    return changed;
}
global.stripEquippedTopBottomFromInventory = stripEquippedTopBottomFromInventory;

/** Убрать лишние копии верха/низа (frdef / ic1 cid 3–4) — после регистрации sync мог сработать несколько раз. */
function dedupeWornOutfitTokensInInventory(player) {
    if (!Array.isArray(player.inventory)) return false;
    const seenTop = new Set();
    const seenBottom = new Set();
    let changed = false;
    const markDup = (seen, key, idx) => {
        if (seen.has(key)) {
            player.inventory[idx] = null;
            changed = true;
            return;
        }
        seen.add(key);
    };
    for (let i = 0; i < player.inventory.length; i++) {
        const it = player.inventory[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        const fr = syncFrdefTopBottomParts(base);
        if (fr) {
            const key = `${fr.d}:${fr.t}`;
            if (fr.slot === 'top') markDup(seenTop, key, i);
            else if (fr.slot === 'bottom') markDup(seenBottom, key, i);
            continue;
        }
        if (base.startsWith('ic1.')) {
            const pl = decodeIc1(base);
            const cid = pl && Number(pl.cid);
            if (cid === 3 || cid === 4) {
                const key = `${Number(pl.d)}:${Number(pl.t)}`;
                if (cid === 3) markDup(seenTop, key, i);
                else markDup(seenBottom, key, i);
            }
        }
    }
    return changed;
}
global.dedupeWornOutfitTokensInInventory = dedupeWornOutfitTokensInInventory;

/** Снять верх/низ из инвентаря перед финальным sync после редактора персонажа. */
global.stripRegistrationOutfitFromInventory = function stripRegistrationOutfitFromInventory(player) {
    if (!Array.isArray(player.inventory)) return false;
    let changed = false;
    for (let i = 0; i < player.inventory.length; i++) {
        const it = player.inventory[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        if (syncFrdefTopBottomParts(base)) {
            player.inventory[i] = null;
            changed = true;
            continue;
        }
        if (base.startsWith('ic1.')) {
            const pl = decodeIc1(base);
            const cid = pl && Number(pl.cid);
            const iid = pl && Number(pl.iid);
            if (cid === 3 || cid === 4) {
                player.inventory[i] = null;
                changed = true;
            }
            /** Фантомный головной убор после создания женского персонажа. */
            if (cid === 1 && iid === 9901) {
                player.inventory[i] = null;
                changed = true;
            }
            /** Фантомные очки (drawable 0 / placeholder 999). */
            if (cid === 7 && (iid === 999 || Number(pl.d) === 0)) {
                player.inventory[i] = null;
                changed = true;
            }
        }
    }
    return changed;
};

/** Раньше: схлопывала дубликаты ic1 верх/низ (cid 3/4) в один слот.
 * Отключено по запросу — разрешены две одинаковые вещи в инвентаре. */
global.dedupeIc1TopBottomInventory = function (_player) {
    return false;
};

/** Токены верха/низа с тела для синка в инвентарь при загрузке (обувь дефолта не добавляем — не предмет). */
function outfitInventoryTokensFromPed(player) {
    const fk = fractionKey(player);
    const out = [];
    try {
        const top = player.getClothes(11);
        if (top && top.drawable !== undefined) {
            const t = tokenFromDbColumn('top', `${top.drawable}:${top.texture}`, fk);
            if (t) out.push(t);
        }
        const bottom = player.getClothes(4);
        if (bottom && bottom.drawable !== undefined) {
            const t = tokenFromDbColumn('bottom', `${bottom.drawable}:${bottom.texture}`, fk);
            if (t) out.push(t);
        }
    } catch (_e) {}
    return out;
}

global.syncWornFactionClothesIntoInventory = function (player) {
    if (player && player._syncWornClothesBusy) return;
    if (player) player._syncWornClothesBusy = true;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('charCreating') === true) return;
        if (
            !!player._clothesShopSession ||
            player.getVariable('shopc') === true ||
            player.getVariable('tabletTryOn') === true
        ) return;
        if (!player._inventoryReady) return;
        if (!Array.isArray(player.inventory)) return;
        if (player.model !== MALE_FREE_MODE_HASH && player.model !== FEMALE_FREE_MODE_HASH) return;
        let stripped = false;
        if (stripFrdefDefaultShoeTokens(player)) stripped = true;
        if (stripEquippedTopBottomFromInventory(player)) stripped = true;
        if (dedupeWornOutfitTokensInInventory(player)) stripped = true;
        if (stripped) {
            global.saveInventory(player);
            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
        }
    } catch (_e) {}
    finally {
        if (player) player._syncWornClothesBusy = false;
    }
};

function pushReturnedToken(player, token) {
    if (!token) return true;
    if (inventoryTokenIsUniqueDonate(token)) {
        const canon = canonicalDonateToken(token);
        while (removeFirstInventoryDonate(player, canon)) {}
        return global.tryPushInventoryItem(player, canon);
    }
    return global.tryPushInventoryItem(player, token);
}

function defaultShoesForFraction(_fk) {
    return { d: DEFAULT_BARE_FEET.d, t: DEFAULT_BARE_FEET.t };
}

/** Перчатки Skeleton (donate ClothID 15): 224 если верх «голый» (11 = 15:0); для ряда худи/кофт — 222; иначе 230. Текстура на педе всегда 0. */
const DONATE_SKEL_GLOVE_TORSO_BARE = 224;
const DONATE_SKEL_GLOVE_TORSO_HOODIE = 222;
const DONATE_SKEL_GLOVE_TORSO_LAYER = 230;

/**
 * Drawable верха (комп. 11) → торс перчаток 222 вместо 230.
 * Синхронизировать с scripts/gen_donate_clothes.js (clothId 3 → комп. 11).
 * Не включать 614 водолазка, 622 футболку Abibas — тонкий слой / артефакт с перчатками.
 */
const DONATE_SKEL_GLOVE_TOP_DRAWABLES_222 = new Set([
    629, 631, 632, 633, 634, 635, 636, 637, 639, 642, 644, 647, 649, 651, 652, 653, 654, 655, 656, 657, 658
]);

/** У Skeleton один вариант текстуры (0); на педе всегда t=0 для компонента 3. */
function clampSkeletonGloveTexture(_tex) {
    return 0;
}

global.clampSkeletonGloveTexture = clampSkeletonGloveTexture;

function shouldUseSkeletonGlovesBareTorso(player) {
    if (!mp.players.exists(player) || player.model !== MALE_FREE_MODE_HASH) return false;
    const c11 = player.getClothes(11);
    if (!c11 || c11.drawable === undefined) return true;
    return Number(c11.drawable) === 15 && Number(c11.texture) === 0;
}

function topDrawableUsesSkeletonGloveTorso222(player) {
    if (!mp.players.exists(player) || player.model !== MALE_FREE_MODE_HASH) return false;
    const c11 = player.getClothes(11);
    if (!c11 || c11.drawable === undefined) return false;
    return DONATE_SKEL_GLOVE_TOP_DRAWABLES_222.has(Number(c11.drawable));
}

global.restoreTorsoAfterDonateGloves = function restoreTorsoAfterDonateGloves(player) {
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    try {
        const top = player.getClothes(11);
        if (!top || top.drawable === undefined) {
            player.setClothes(3, 15, 0, 0);
            global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
            return;
        }
        const en = findSellEntryForColumn('top', top.drawable, top.texture, fk);
        if (en) {
            applyTorsoForTopEquip(player, en, staticId, fraction);
            return;
        }
        if (player.model === MALE_FREE_MODE_HASH && Number(top.drawable) === 15) {
            player.setClothes(3, 15, 0, 0);
            global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
        } else {
            player.setClothes(3, 15, 0, 0);
            global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
        }
    } catch (_e) {}
};

global.applyDonateSkeletonGlovesTorso = function (player, texVariant, persistDb) {
    const persist = persistDb !== false;
    const t = clampSkeletonGloveTexture(texVariant);
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    if (!mp.players.exists(player)) return;
    if (player.model !== MALE_FREE_MODE_HASH) {
        player.setClothes(3, DONATE_SKEL_GLOVE_TORSO_LAYER, t, 0);
        if (persist) {
            global.updateOrInsertClothes(staticId, fraction, 'tors', `${DONATE_SKEL_GLOVE_TORSO_LAYER}:${t}`, () => {});
        }
        return;
    }
    const bare = shouldUseSkeletonGlovesBareTorso(player);
    let d;
    if (bare) d = DONATE_SKEL_GLOVE_TORSO_BARE;
    else if (topDrawableUsesSkeletonGloveTorso222(player)) d = DONATE_SKEL_GLOVE_TORSO_HOODIE;
    else d = DONATE_SKEL_GLOVE_TORSO_LAYER;
    player.setClothes(3, d, t, 0);
    if (persist) {
        global.updateOrInsertClothes(staticId, fraction, 'tors', `${d}:${t}`, () => {});
    }
};

global.reapplyDonateGlovesIfEquipped = function (player) {
    try {
        if (!mp.players.exists(player)) return;
        if (player._donateGlovesTex == null || player._donateGlovesItemId == null) return;
        const persist =
            player.getVariable('tabletTryOn') !== true &&
            player.getVariable('shopc') !== true &&
            !player._clothesShopSession;
        global.applyDonateSkeletonGlovesTorso(player, player._donateGlovesTex, persist);
    } catch (_e) {}
};

function equipClothItem(player, _itemStr, def) {
    if (typeof global.resolveClothDefForPlayer === 'function') {
        def = global.resolveClothDefForPlayer(player, def);
    }
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    const cid = def.ClothID;
    if (adminDutyScOutfitBlocksTopBottom(player) && (Number(cid) === 3 || Number(cid) === 4)) {
        isNotify(player, 2, 'top-mid', 'После /offnc нельзя сменить верх или низ. Сбрось визуал (/onc или exitadmin).', 4500);
        return false;
    }

    if (cid === 1) {
        const cur = player.getProp(def.Component);
        let old = null;
        if (cur && !isFreemodeHeadwearSlotConsideredEmpty(player, cur.drawable, cur.texture)) {
            const canonOld = player._headwearEquipIc1;
            if (typeof canonOld === 'string' && canonOld.startsWith('ic1.')) {
                old = ic1InventoryBase(canonOld);
            } else {
                old = tokenFromDbColumn('headwear', `${cur.drawable}:${cur.texture}`, fk);
            }
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setProp(def.Component, def.Drawable, def.TopTexture);
        /** Donate dlc (drawable >=200) на клиенте требует setPropIndex(_,_,_,true) с повторами — иначе подменяется на дефолтную модель. */
        if (typeof global.replayPropSyncForDelayedSpawn === 'function') {
            global.replayPropSyncForDelayedSpawn(player, def.Component, def.Drawable, def.TopTexture);
        } else {
            try {
                player.call('sc:syncPropLocal', [def.Component, def.Drawable, def.TopTexture]);
            } catch (_e) {}
        }
        global.updateOrInsertClothes(staticId, fraction, 'headwear', `${def.Drawable}:${def.TopTexture}`, () => {});
        try {
            const payload = {
                cid: def.ClothID,
                iid: def.ItemID,
                fr: def.Frac,
                d: def.Drawable,
                t: def.TopTexture,
                nm: def.ItemName
            };
            if (def.ItemImg && typeof def.ItemImg === 'string') payload.img = def.ItemImg;
            player._headwearEquipIc1 = ic1InventoryBase(encodeIc1(payload));
        } catch (_eC) {}
        return true;
    }
    if (cid === 2) {
        const cur = player.getClothes(1);
        const old =
            cur && cur.drawable !== 0 ? tokenFromDbColumn('masks', `${cur.drawable}:${cur.texture}`, fk) : null;
        if (old && !pushReturnedToken(player, old)) return false;
        player.setClothes(1, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'masks', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 3) {
        const curTop = player.getClothes(11);
        const old =
            curTop && curTop.drawable !== undefined
                ? tokenFromDbColumn('top', `${curTop.drawable}:${curTop.texture}`, fk)
                : null;
        if (old && !pushReturnedToken(player, old)) return false;
        const savedPatr = captureWornPatrontazh(player);
        player.setClothes(10, 0, 0, 0);
        applyTorsoForTopEquip(player, def, staticId, fraction);
        if (player.model === MALE_FREE_MODE_HASH || player.model === FEMALE_FREE_MODE_HASH) {
            if (typeof global.setFreemodeDefaultUndershirtForPlayer === 'function') {
                global.setFreemodeDefaultUndershirtForPlayer(player);
            } else {
                player.setClothes(8, 15, 0, 0);
            }
        }
        player.setClothes(11, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'top', `${def.Drawable}:${def.TopTexture}`, () => {});
        if (savedPatr) {
            reapplyWornPatrontazh(player, savedPatr, staticId, fraction);
        } else {
            global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
        }
        const u8 = player.getClothes(8);
        if (u8 && u8.drawable !== undefined) {
            global.updateOrInsertClothes(staticId, fraction, 'undershirt', `${u8.drawable}:${u8.texture}`, () => {});
        }
        global.reapplyDonateGlovesIfEquipped(player);
        return true;
    }
    if (cid === 4) {
        const cur = player.getClothes(4);
        const old =
            cur && cur.drawable !== 14 ? tokenFromDbColumn('bottom', `${cur.drawable}:${cur.texture}`, fk) : null;
        if (old && !pushReturnedToken(player, old)) return false;
        player.setClothes(4, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'bottom', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 5) {
        const cur = player.getClothes(6);
        const defS = defaultShoesForFraction(fk);
        let old = null;
        if (cur && (cur.drawable !== defS.d || cur.texture !== defS.t)) {
            const canonOld = player._shoesEquipIc1;
            if (typeof canonOld === 'string' && canonOld.startsWith('ic1.')) {
                old = ic1InventoryBase(canonOld);
            }
            if (!old) {
                old = tokenFromDbColumn('shoes', `${cur.drawable}:${cur.texture}`, fk);
            }
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setClothes(6, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'shoes', `${def.Drawable}:${def.TopTexture}`, () => {});
        try {
            const rawShoe = typeof _itemStr === 'string' ? _itemStr.split('(')[0].trim() : '';
            if (rawShoe.startsWith('ic1.')) {
                const plSh = decodeIc1(rawShoe);
                if (plSh && Number(plSh.cid) === 5 && Number(plSh.d) === Number(def.Drawable)) {
                    player._shoesEquipIc1 = ic1InventoryBase(rawShoe);
                } else {
                    player._shoesEquipIc1 = null;
                }
            } else if (typeof def.ItemName === 'string' && def.ItemName.indexOf('Пеинты') >= 0) {
                const payload = {
                    cid: def.ClothID,
                    iid: def.ItemID,
                    fr: def.Frac,
                    d: def.Drawable,
                    t: def.TopTexture,
                    nm: def.ItemName
                };
                if (def.ItemImg && typeof def.ItemImg === 'string') payload.img = def.ItemImg;
                player._shoesEquipIc1 = ic1InventoryBase(encodeIc1(payload));
            } else {
                player._shoesEquipIc1 = null;
            }
        } catch (_eSh) {
            try {
                player._shoesEquipIc1 = null;
            } catch (_e2) {}
        }
        return true;
    }
    if (cid === 9) {
        const cur = player.getClothes(10);
        const old =
            cur && Number(cur.drawable) !== 0
                ? tokenFromDbColumn('decals', `${cur.drawable}:${cur.texture}`, fk)
                : null;
        if (old && !pushReturnedToken(player, old)) return false;
        player.setClothes(10, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'decals', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 6) {
        const cur = player.getClothes(7);
        const holsterOld = accessoriesToHolsterToken(cur);
        const shopOld = !holsterOld && cur && cur.drawable !== 0 ? tokenFromDbColumn('accessories', `${cur.drawable}:${cur.texture}`, fk) : null;
        const old = holsterOld || shopOld;
        if (old && !pushReturnedToken(player, old)) return false;
        player.setClothes(7, def.Drawable, def.TopTexture, 0);
        global.updateOrInsertClothes(staticId, fraction, 'accessories', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 7) {
        const cur = player.getProp(1);
        let old = null;
        if (cur && !isAccessoryPropVisuallyEmpty('glasses', cur, player)) {
            old = peekAccessoryTokenSellOnly('glasses', cur.drawable, cur.texture, fk);
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setProp(1, def.Drawable, def.TopTexture);
        syncPropToClientAfterServerSet(player, 1, def.Drawable, def.TopTexture);
        global.updateOrInsertClothes(staticId, fraction, 'glasses', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 8) {
        const old = getCurrentBagInventoryToken(player);
        if (
            old &&
            typeof global.invGridFirstEmpty === 'function' &&
            global.invGridFirstEmpty(player) < 0
        ) {
            isNotify(player, 2, 'top-mid', 'Нет места в инвентаре для текущей сумки.', 5000);
            return false;
        }
        if (old && !pushReturnedToken(player, old)) return false;
        applyBagClothesToPed(player, def.Drawable, def.TopTexture);
        global.updateOrInsertClothes(staticId, fraction, 'bags', `${def.Drawable}:${def.TopTexture}`, () => {});
        try {
            delete player._ivbagWearResolvedInstId;
        } catch (_eIvC) {}
        try {
            const rawBag = typeof _itemStr === 'string' ? _itemStr.split('(')[0].trim() : '';
            if (rawBag.startsWith('ic1.')) {
                const pbag = decodeIc1(rawBag);
                const binst = pbag && pbag.bagInst != null ? Number(pbag.bagInst) : NaN;
                if (Number.isFinite(binst) && binst > 0 && Number(pbag.cid) === 8) player._bagEquipIc1 = rawBag;
                else player._bagEquipIc1 = null;
            } else {
                player._bagEquipIc1 = null;
            }
        } catch (_eBE) {
            try {
                player._bagEquipIc1 = null;
            } catch (_e2) {}
        }
        if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
        return true;
    }
    if (cid === 12) {
        const cur = player.getProp(2);
        let old = null;
        if (cur && !isAccessoryPropVisuallyEmpty('ears', cur, player)) {
            old = peekEarsTokenForInventory(cur.drawable, cur.texture, fk);
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setProp(2, def.Drawable, def.TopTexture);
        try {
            player.call('sc:syncPropLocal', [2, def.Drawable, def.TopTexture]);
        } catch (_e) {}
        global.updateOrInsertClothes(staticId, fraction, 'ears', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 13) {
        const cur = player.getProp(6);
        let old = null;
        if (cur && !isAccessoryPropVisuallyEmpty('watch', cur, player)) {
            old = peekAccessoryTokenSellOnly('watch_prop', cur.drawable, cur.texture, fk);
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setProp(6, def.Drawable, def.TopTexture);
        global.updateOrInsertClothes(staticId, fraction, 'watch_prop', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 14) {
        const cur = player.getProp(7);
        let old = null;
        if (cur && !isAccessoryPropVisuallyEmpty('bracelet', cur, player)) {
            old = peekAccessoryTokenSellOnly('bracelet_prop', cur.drawable, cur.texture, fk);
        }
        if (old && !pushReturnedToken(player, old)) return false;
        player.setProp(7, def.Drawable, def.TopTexture);
        global.updateOrInsertClothes(staticId, fraction, 'bracelet_prop', `${def.Drawable}:${def.TopTexture}`, () => {});
        return true;
    }
    if (cid === 15) {
        const prevId = player._donateGlovesItemId;
        const prevTx = player._donateGlovesTex;
        const old =
            prevId != null && prevTx != null ? tokenFromDbColumn('gloves', `${prevId}:${prevTx}`, fk) : null;
        if (old && !pushReturnedToken(player, old)) return false;
        player._donateGlovesItemId = def.ItemID;
        player._donateGlovesTex = clampSkeletonGloveTexture(def.TopTexture);
        global.updateOrInsertClothes(staticId, fraction, 'gloves', `${player._donateGlovesItemId}:${player._donateGlovesTex}`, () => {});
        global.applyDonateSkeletonGlovesTorso(player, player._donateGlovesTex);
        return true;
    }
    return false;
}

function accessoriesToHolsterToken(cur) {
    if (!cur) return null;
    const d = Number(cur.drawable);
    const t = Number(cur.texture);
    if (d === 206 && t === 0) return 'ivhol:cobura';
    if (d === 206 && t === 1) return 'ivhol:coburaw';
    if (d === 201 && t === 0) return 'ivhol:cobura';
    if (d === 201 && t === 1) return 'ivhol:coburaw';
    if (d === 50 && t === 0) return 'ivhol:cobura';
    if (d === 50 && t === 1) return 'ivhol:coburaw';
    if (d === 44 && t === 0) return 'ivhol:cobura';
    if (d === 45 && t === 0) return 'ivhol:coburaw';
    return null;
}

function equipHolster(player, key) {
    const h = HOLSTERS[key];
    if (!h) return false;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    const cur = player.getClothes(7);
    const holsterOld = accessoriesToHolsterToken(cur);
    const shopOld = !holsterOld && cur && cur.drawable !== 0 ? tokenFromDbColumn('accessories', `${cur.drawable}:${cur.texture}`, fk) : null;
    const old = holsterOld || shopOld;
    if (old && !pushReturnedToken(player, old)) return false;
    player.setClothes(7, h.drawable, h.texture, 0);
    syncClothesComponentToClientAfterServerSet(player, 7, h.drawable, h.texture);
    global.updateOrInsertClothes(staticId, fraction, 'accessories', `${h.drawable}:${h.texture}`, () => {});
    return true;
}

function equipDonateBag(player, key) {
    const b = DONATE_BAGS[key];
    if (!b) return false;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const old = getCurrentBagInventoryToken(player);
    if (
        old &&
        typeof global.invGridFirstEmpty === 'function' &&
        global.invGridFirstEmpty(player) < 0
    ) {
        isNotify(player, 2, 'top-mid', 'Нет места в инвентаре для текущей сумки.', 5000);
        return false;
    }
    if (old && !pushReturnedToken(player, old)) return false;
    applyBagClothesToPed(player, b.drawable, b.texture);
    global.updateOrInsertClothes(staticId, fraction, 'bags', `${b.drawable}:${b.texture}`, () => {});
    try {
        player._bagEquipIc1 = null;
    } catch (_eIv) {}
    if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
    return true;
}

global.inventoryEquipItem = function (player, rawItem) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const item = String(rawItem || '');
        const itemBasePre = item.split('(')[0].trim();
        if (typeof global.sanitizeDonateInventory === 'function') {
            try {
                global.sanitizeDonateInventory(player);
            } catch (_e) {}
        }
        const itemBase = item.split('(')[0].trim();
        if (itemBase.startsWith('frdef:')) {
            const parsed = parseFrdefToken(itemBase);
            if (!parsed) {
                isNotify(player, 2, 'top-mid', 'Предмет одежды не найден.', 3000);
                return;
            }
            if (adminDutyScOutfitBlocksTopBottom(player) && (parsed.slot === 'top' || parsed.slot === 'bottom')) {
                isNotify(player, 2, 'top-mid', 'После /offnc нельзя сменить верх или низ. Сбрось визуал (/onc или exitadmin).', 4500);
                return;
            }
            if (!takeInventoryActionLock(player)) return;
            if (!removeOneInventoryExact(player, item)) {
                isNotify(player, 2, 'top-mid', 'Нет предмета в инвентаре.', 3000);
                return;
            }
            let ok = false;
            if (parsed.slot === 'top') ok = equipFrdefTopFromInventory(player, parsed.fk, parsed.d, parsed.t);
            else if (parsed.slot === 'bottom') ok = equipFrdefBottomFromInventory(player, parsed.fk, parsed.d, parsed.t);
            else if (parsed.slot === 'shoes') ok = equipFrdefShoesFromInventory(player, parsed.fk, parsed.d, parsed.t);
            if (!ok) {
                global.tryPushInventoryItem(player, item);
                isNotify(player, 2, 'top-mid', 'Не удалось надеть или нет места под снятое.', 4000);
                return;
            }
            global.saveInventory(player);
            global.emitPlayerInventory(player);
            return;
        }
        if (item.startsWith('ic1.')) {
            let workItem = item;
            let payload = decodeIc1(workItem);
            let def = payload && findClothSellMatch(payload);
            if (!def && payload && (Number(payload.cid) === 1 || Number(payload.cid) === 0)) {
                const fkHead = fractionKey(player);
                const row = findHeadwearSellRowInPools(payload.d, payload.t, fkHead);
                if (row) def = row;
            }
            /** Универсальный фолбэк для головных уборов: обычные шапки (не донат) отсутствуют в каталоге.
             *  Если в payload корректные cid=1/0 и d>=0 (не «снять» 8:0), собираем синтетический def — equipClothItem
             *  отработает по setProp(0, d, t). */
            if (!def && payload) {
                const cidPL = Number(payload.cid);
                const dPL = Number(payload.d);
                const tPL = Number(payload.t);
                if (cidPL === 5 && Number.isFinite(dPL) && dPL === 173) {
                    if (isWebPaitIc1Payload(payload)) {
                        def = {
                            ClothID: 5,
                            ItemID: paitItemIdFromTex(tPL),
                            ItemName: typeof payload.nm === 'string' && payload.nm ? payload.nm : 'Пеинты',
                            Price: 0,
                            Drawable: 173,
                            ItemImg: 'ItemsMale/Shoes/173_' + (Number.isFinite(tPL) ? tPL : 0) + '.jpg',
                            Textures: null,
                            TopTexture: Number.isFinite(tPL) ? tPL : 0,
                            Frac: Number(payload.fr) || Number(fractionKey(player)) || 1,
                            Component: 6,
                            Torso: null
                        };
                    } else {
                        const shoeHit = shoes173CatalogRow(tPL, fractionKey(player));
                        if (shoeHit) {
                            def = {
                                ClothID: 5,
                                ItemID: shoeHit.ItemID,
                                ItemName: shoeHit.ItemName,
                                Price: 0,
                                Drawable: 173,
                                ItemImg: shoeHit.ItemImg,
                                Textures: null,
                                TopTexture: Number.isFinite(tPL) ? tPL : 0,
                                Frac: Number(shoeHit.Frac) || Number(fractionKey(player)) || 1,
                                Component: 6,
                                Torso: null
                            };
                        }
                    }
                }
                if (cidPL === 9 && Number.isFinite(dPL) && dPL === 305) {
                    const texP = Number.isFinite(tPL) ? tPL : 0;
                    const colorP = texP >= 0 && texP <= 2 ? texP + 1 : 1;
                    def = {
                        ClothID: 9,
                        ItemID: Number(payload.iid) || 87001,
                        ItemName: typeof payload.nm === 'string' && payload.nm ? payload.nm : 'Патронтаж',
                        Price: 0,
                        Drawable: 305,
                        ItemImg: 'patrontazh_' + colorP + '.png',
                        Textures: null,
                        TopTexture: Number.isFinite(tPL) ? tPL : 0,
                        Frac: Number(payload.fr) || Number(fractionKey(player)) || 1,
                        Component: 10,
                        Torso: null
                    };
                }
                if ((cidPL === 1 || cidPL === 0) && Number.isFinite(dPL) && dPL >= 0 && !(dPL === 8 && tPL === 0)) {
                    /** Известная донат‑шапка — берём имя/текстуру из словаря (приоритетнее plnm). */
                    const known = knownDonateHatRow(dPL, tPL, payload.fr);
                    if (known) {
                        def = known;
                    } else {
                        def = {
                            ClothID: 1,
                            ItemID: Number(payload.iid) || 9901,
                            ItemName: typeof payload.nm === 'string' && payload.nm ? payload.nm : 'Головной убор',
                            Price: 0,
                            Drawable: dPL,
                            ItemImg: null,
                            Textures: null,
                            TopTexture: Number.isFinite(tPL) ? tPL : 0,
                            Frac: Number(payload.fr) || Number(fractionKey(player)) || 1,
                            Component: 0,
                            Torso: null
                        };
                    }
                }
            }
            if (!def) {
                isNotify(player, 2, 'top-mid', 'Предмет одежды не найден.', 3000);
                return;
            }
            if (
                payload &&
                typeof payload.nm === 'string' &&
                payload.nm.indexOf('Пеинты') >= 0 &&
                Number(def.Drawable) === 173
            ) {
                def = Object.assign({}, def, { ItemName: payload.nm });
            }
            if (adminDutyScOutfitBlocksTopBottom(player) && (Number(def.ClothID) === 3 || Number(def.ClothID) === 4)) {
                isNotify(player, 2, 'top-mid', 'После /offnc нельзя сменить верх или низ. Сбрось визуал (/onc или exitadmin).', 4500);
                return;
            }
            if (!takeInventoryActionLock(player)) return;

            function tryRemoveAndEquip(workItemFinal) {
                let itemToEquip = workItemFinal;
                if (!removeOneInventoryExact(player, itemToEquip)) {
                    let removed = false;
                    if (payload && (Number(payload.cid) === 1 || Number(payload.cid) === 0)) {
                        const dPL = Number(payload.d);
                        const tPL = Number(payload.t);
                        const inv = Array.isArray(player.inventory) ? player.inventory : [];
                        for (let i = 0; i < inv.length; i++) {
                            const raw = inv[i];
                            if (typeof raw !== 'string' || !raw.startsWith('ic1.')) continue;
                            const baseTok = raw.split('(')[0].trim();
                            const pl = decodeIc1(baseTok);
                            if (!pl) continue;
                            const cidPL = Number(pl.cid);
                            if (cidPL !== 1 && cidPL !== 0) continue;
                            if (Number(pl.d) !== dPL || Number(pl.t) !== tPL) continue;
                            inv[i] = null;
                            removed = true;
                            itemToEquip = raw;
                            break;
                        }
                    }
                    if (!removed) {
                        isNotify(player, 2, 'top-mid', 'Нет предмета в инвентаре.', 3000);
                        return;
                    }
                }
                if (!equipClothItem(player, itemToEquip, def)) {
                    global.tryPushInventoryItem(player, itemToEquip);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять текущую вещь.', 4000);
                    return;
                }
                if (typeof global.scheduleCosmeticReapply === 'function') {
                    global.scheduleCosmeticReapply(player, [0, 400, 1200]);
                }
                global.saveInventory(player);
                global.emitPlayerInventory(player);
            }

            const needBagInst =
                payload &&
                Number(payload.cid) === 8 &&
                ic1PayloadIsRegisteredDonateBag(payload) &&
                !(Number(payload.bagInst) > 0);

            if (needBagInst && typeof global.ensureDonateBagIc1InstanceThen === 'function') {
                /** Держать блокировку до завершения INSERT/замены токена, иначе два equip создают две сумки. */
                player._invEquipLockUntil = Date.now() + 8000;
                global.ensureDonateBagIc1InstanceThen(player, workItem, def, payload, (err, newItem) => {
                    if (!mp.players.exists(player)) return;
                    player._invEquipLockUntil = Date.now() + INV_EQUIP_ACTION_MS;
                    if (err || !newItem) {
                        isNotify(player, 2, 'top-mid', 'Не удалось зарегистрировать сумку. Повтори или зайди позже.', 4000);
                        return;
                    }
                    tryRemoveAndEquip(newItem);
                });
                return;
            }

            tryRemoveAndEquip(workItem);
            return;
        }
        if (item.startsWith('ivhol:')) {
            const holCanon = canonicalDonateToken(item);
            const key = holCanon.startsWith('ivhol:') ? holCanon.slice(6) : '';
            if (!HOLSTER_KEYS.includes(key)) return;
            if (!takeInventoryActionLock(player)) return;
            if (!removeFirstInventoryDonate(player, item)) return;
            if (!equipHolster(player, key)) {
                global.tryPushInventoryItem(player, holCanon);
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять текущую вещь.', 4000);
                return;
            }
            global.saveInventory(player);
            global.emitPlayerInventory(player);
            return;
        }
        if (item.startsWith('ivbag:')) {
            const bagCanon = canonicalDonateToken(item);
            const key = bagCanon.startsWith('ivbag:') ? bagCanon.slice(6) : '';
            if (!BAG_ACCOUNT_KEYS.includes(key)) return;
            if (!takeInventoryActionLock(player)) return;
            if (!removeFirstInventoryDonate(player, item)) return;
            try {
                player._invEquipLockUntil = Date.now() + 8000;
            } catch (_eLk) {}
            ensureIvbagWearBagInstThen(player, key, (err) => {
                if (!mp.players.exists(player)) return;
                if (err) {
                    global.tryPushInventoryItem(player, bagCanon);
                    isNotify(player, 2, 'top-mid', 'Не удалось привязать хранилище сумки. Повтори позже.', 4000);
                    return;
                }
                if (!equipDonateBag(player, key)) {
                    global.tryPushInventoryItem(player, bagCanon);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять текущую вещь.', 4000);
                    return;
                }
                try {
                    if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
                } catch (_eSyncBag) {}
                global.saveInventory(player);
                global.emitPlayerInventory(player);
            });
            return;
        }
    } catch (e) {
        console.log(e);
    }
};

const PATRONTAZH_DRAWABLE = 305;

function captureWornPatrontazh(player) {
    try {
        if (!mp.players.exists(player)) return null;
        const cur = player.getClothes(10);
        if (!cur || Number(cur.drawable) !== PATRONTAZH_DRAWABLE) return null;
        return {
            d: PATRONTAZH_DRAWABLE,
            t: Number.isFinite(Number(cur.texture)) ? Number(cur.texture) : 0
        };
    } catch (_e) {
        return null;
    }
}

function reapplyWornPatrontazh(player, saved, staticId, fraction) {
    if (!saved || !mp.players.exists(player)) return;
    player.setClothes(10, saved.d, saved.t, 0);
    if (staticId != null) {
        global.updateOrInsertClothes(staticId, fraction, 'decals', `${saved.d}:${saved.t}`, () => {});
    }
}

function isBareUpperMaleFreemode(player) {
    if (!mp.players.exists(player) || player.model !== MALE_FREE_MODE_HASH) return false;
    const c3 = player.getClothes(3);
    const c8 = player.getClothes(8);
    const c10 = player.getClothes(10);
    const c11 = player.getClothes(11);
    if (!c3 || !c8 || !c11) return false;
    const decOk = !c10 || Number(c10.drawable) === 0 || Number(c10.drawable) === PATRONTAZH_DRAWABLE;
    return (
        Number(c3.drawable) === 15 &&
        Number(c3.texture) === 0 &&
        Number(c8.drawable) === 15 &&
        Number(c8.texture) === 0 &&
        Number(c11.drawable) === 15 &&
        Number(c11.texture) === 0 &&
        decOk
    );
}

function applyBareUpperMaleFreemode(player, staticId, fraction) {
    const savedPatr = captureWornPatrontazh(player);
    player.setClothes(3, 15, 0, 0);
    player.setClothes(8, 15, 0, 0);
    player.setClothes(10, 0, 0, 0);
    player.setClothes(11, 15, 0, 0);
    global.updateOrInsertClothes(staticId, fraction, 'tors', '15', () => {});
    global.updateOrInsertClothes(staticId, fraction, 'top', null, () => {});
    global.updateOrInsertClothes(staticId, fraction, 'undershirt', '15:0', () => {});
    if (savedPatr) {
        reapplyWornPatrontazh(player, savedPatr, staticId, fraction);
    } else {
        global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
    }
}

function applyUpperAfterUnequipTop(player, staticId, fraction, fk) {
    if (mp.players.exists(player) && (player.model === MALE_FREE_MODE_HASH || player.model === FEMALE_FREE_MODE_HASH)) {
        applyBareUpperMaleFreemode(player, staticId, fraction);
        global.reapplyDonateGlovesIfEquipped(player);
        return;
    }
    applyBareUpperMaleFreemode(player, staticId, fraction);
    global.updateOrInsertClothes(staticId, fraction, 'top', null, () => {});
    global.updateOrInsertClothes(staticId, fraction, 'tors', null, () => {});
    global.updateOrInsertClothes(staticId, fraction, 'undershirt', null, () => {});
    if (!captureWornPatrontazh(player)) {
        global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
    }
    global.reapplyDonateGlovesIfEquipped(player);
}

/** Что вернётся в инвентарь и пустой ли слот (без изменения педа). */
function peekUnequipToken(player, slotKey) {
    const fk = fractionKey(player);
    if (slotKey === 'headwear') {
        /** Стори-пед: prop 0 — часть модели, не донат-слот; иначе tokenFromDbColumn даёт ложный токен → бесконечное снятие. */
        if (player.model !== MALE_FREE_MODE_HASH && player.model !== FEMALE_FREE_MODE_HASH) {
            return { isEmpty: true, token: null };
        }
        const cur = player.getProp(0);
        if (!cur || isFreemodeHeadwearSlotConsideredEmpty(player, cur.drawable, cur.texture)) {
            try {
                player._headwearEquipIc1 = null;
            } catch (_e) {}
            return { isEmpty: true, token: null };
        }
        let token = null;
        const canon = player._headwearEquipIc1;
        if (typeof canon === 'string' && canon.startsWith('ic1.')) {
            token = ic1InventoryBase(canon);
        }
        if (!token) {
            token = tokenFromDbColumn('headwear', `${cur.drawable}:${cur.texture}`, fk);
        }
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'mask') {
        const cur = player.getClothes(1);
        if (!cur || cur.drawable === 0) return { isEmpty: true, token: null };
        return { isEmpty: false, token: tokenFromDbColumn('masks', `${cur.drawable}:${cur.texture}`, fk) };
    }
    if (slotKey === 'top') {
        if (isBareUpperMaleFreemode(player)) return { isEmpty: true, token: null };
        const cur = player.getClothes(11);
        if (!cur || cur.drawable === undefined) return { isEmpty: true, token: null };
        const token = tokenFromDbColumn('top', `${cur.drawable}:${cur.texture}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'pants') {
        const cur = player.getClothes(4);
        if (!cur || cur.drawable === 14) return { isEmpty: true, token: null };
        const token = tokenFromDbColumn('bottom', `${cur.drawable}:${cur.texture}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'shoes') {
        const cur = player.getClothes(6);
        if (!cur || cur.drawable === undefined) {
            try {
                player._shoesEquipIc1 = null;
            } catch (_e) {}
            return { isEmpty: true, token: null };
        }
        const defS = defaultShoesForFraction(fk);
        if (Number(cur.drawable) === defS.d && Number(cur.texture) === defS.t) {
            try {
                player._shoesEquipIc1 = null;
            } catch (_e) {}
            return { isEmpty: true, token: null };
        }
        let token = null;
        const canonShoe = player._shoesEquipIc1;
        if (typeof canonShoe === 'string' && canonShoe.startsWith('ic1.')) {
            token = ic1InventoryBase(canonShoe);
        }
        if (!token) {
            token = tokenFromDbColumn('shoes', `${cur.drawable}:${cur.texture}`, fk);
        }
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'bag') {
        const cur = player.getClothes(5);
        if (!cur || Number(cur.drawable) === 0) {
            try {
                player._bagEquipIc1 = null;
            } catch (_e) {}
            return { isEmpty: true, token: null };
        }
        const canon = player._bagEquipIc1;
        if (typeof canon === 'string' && canon.startsWith('ic1.')) {
            const b = ic1InventoryBase(canon);
            const pl = decodeIc1(b);
            if (pl && Number(pl.cid) === 8) {
                const d = Number(pl.d);
                const t = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
                const cd = Number(cur.drawable);
                const ct = Number.isFinite(Number(cur.texture)) ? Number(cur.texture) : 0;
                if (Number.isFinite(d) && d === cd && t === ct) {
                    return { isEmpty: false, token: b };
                }
            }
        }
        const token = tokenFromDbColumn('bags', `${cur.drawable}:${cur.texture}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'holster') {
        const cur = player.getClothes(7);
        if (!cur || cur.drawable === 0) return { isEmpty: true, token: null };
        let token = accessoriesToHolsterToken(cur);
        if (!token) token = tokenFromDbColumn('accessories', `${cur.drawable}:${cur.texture}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'glasses') {
        const cur = player.getProp(1);
        if (isAccessoryPropVisuallyEmpty('glasses', cur, player)) return { isEmpty: true, token: null };
        const token = peekAccessoryTokenSellOnly('glasses', cur.drawable, cur.texture, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'ears') {
        const cur = player.getProp(2);
        if (isAccessoryPropVisuallyEmpty('ears', cur, player)) return { isEmpty: true, token: null };
        const token = peekEarsTokenForInventory(cur.drawable, cur.texture, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'watch') {
        const cur = player.getProp(6);
        if (isAccessoryPropVisuallyEmpty('watch', cur, player)) return { isEmpty: true, token: null };
        const token = peekAccessoryTokenSellOnly('watch_prop', cur.drawable, cur.texture, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'bracelet') {
        const cur = player.getProp(7);
        if (isAccessoryPropVisuallyEmpty('bracelet', cur, player)) return { isEmpty: true, token: null };
        const token = peekAccessoryTokenSellOnly('bracelet_prop', cur.drawable, cur.texture, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'gloves') {
        const iid = player._donateGlovesItemId;
        const tx = player._donateGlovesTex;
        if (iid == null || tx == null) return { isEmpty: true, token: null };
        const token = tokenFromDbColumn('gloves', `${iid}:${tx}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    if (slotKey === 'decals') {
        const cur = player.getClothes(10);
        if (!cur || Number(cur.drawable) === 0) return { isEmpty: true, token: null };
        const token = tokenFromDbColumn('decals', `${cur.drawable}:${cur.texture}`, fk);
        if (!token) return { isEmpty: true, token: null };
        return { isEmpty: false, token };
    }
    return { isEmpty: true, token: null };
}

function applyUnequipMutate(player, slotKey) {
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const fk = fractionKey(player);
    if (slotKey === 'headwear') {
        clearFreemodeHeadwearSlot(player);
        global.updateOrInsertClothes(staticId, fraction, 'headwear', null, () => {});
        return;
    }
    if (slotKey === 'mask') {
        player.setClothes(1, 0, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'masks', null, () => {});
        return;
    }
    if (slotKey === 'top') {
        applyUpperAfterUnequipTop(player, staticId, fraction, fk);
        return;
    }
    if (slotKey === 'pants') {
        player.setClothes(4, 14, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'bottom', null, () => {});
        return;
    }
    if (slotKey === 'shoes') {
        const defS = defaultShoesForFraction(fk);
        player.setClothes(6, defS.d, defS.t, 0);
        global.updateOrInsertClothes(staticId, fraction, 'shoes', null, () => {});
        return;
    }
    if (slotKey === 'bag') {
        applyBagClothesToPed(player, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'bags', null, () => {});
        try {
            player._bagEquipIc1 = null;
        } catch (_e) {}
        try {
            delete player._ivbagWearResolvedInstId;
        } catch (_eIvbag) {}
        if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
        return;
    }
    if (slotKey === 'holster') {
        player.setClothes(7, 0, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'accessories', null, () => {});
        return;
    }
    if (slotKey === 'glasses') {
        if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            try {
                player.call('sc:syncPropLocal', [1, -1, 0]);
            } catch (_e) {}
        }
        global.updateOrInsertClothes(staticId, fraction, 'glasses', null, () => {});
        return;
    }
    if (slotKey === 'ears') {
        player.setProp(2, -1, 0);
        try {
            player.call('sc:syncPropLocal', [2, -1, 0]);
        } catch (_e) {}
        global.updateOrInsertClothes(staticId, fraction, 'ears', null, () => {});
        return;
    }
    if (slotKey === 'watch') {
        player.setProp(6, -1, 0);
        global.updateOrInsertClothes(staticId, fraction, 'watch_prop', null, () => {});
        return;
    }
    if (slotKey === 'bracelet') {
        player.setProp(7, -1, 0);
        global.updateOrInsertClothes(staticId, fraction, 'bracelet_prop', null, () => {});
        return;
    }
    if (slotKey === 'gloves') {
        player._donateGlovesItemId = null;
        player._donateGlovesTex = null;
        global.updateOrInsertClothes(staticId, fraction, 'gloves', null, () => {});
        restoreTorsoAfterDonateGloves(player);
        return;
    }
    if (slotKey === 'decals') {
        player.setClothes(10, 0, 0, 0);
        global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
        return;
    }
}

global.inventoryUnequipSlot = function (player, slotKey) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (slotKey === 'armor') {
            if (typeof global.unequipGameplayArmorToInventory === 'function') {
                global.unequipGameplayArmorToInventory(player);
            }
            return;
        }
        if (typeof global.sanitizeDonateInventory === 'function') {
            try {
                global.sanitizeDonateInventory(player);
            } catch (_e) {}
        }
        if (!takeInventoryActionLock(player)) return;
        const allowed = [
            'headwear',
            'mask',
            'glasses',
            'ears',
            'watch',
            'bracelet',
            'top',
            'pants',
            'shoes',
            'bag',
            'holster',
            'gloves',
            'decals'
        ];
        if (!allowed.includes(slotKey)) return;
        if (slotKey === 'headwear') {
            if (player.model !== MALE_FREE_MODE_HASH && player.model !== FEMALE_FREE_MODE_HASH) {
                isNotify(player, 2, 'top-mid', 'На кастомном педе головной убор нельзя снять в инвентарь.', 4000);
                return;
            }
        }
        const peek = peekUnequipToken(player, slotKey);
        if (peek.isEmpty) {
            isNotify(player, 2, 'top-mid', 'Слот пустой.', 2500);
            return;
        }
        /** Сумка больше не расширяет основную сетку — нужен один свободный слот под предмет с тела. */
        if (slotKey === 'bag' && peek.token) {
            if (!Array.isArray(player.inventory)) player.inventory = [];
            if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
            if (typeof global.invGridFirstEmpty === 'function' && global.invGridFirstEmpty(player) < 0) {
                isNotify(player, 2, 'top-mid', 'Нельзя снять сумку: нет свободного слота в инвентаре.', 5000);
                return;
            }
        }
        if (peek.token && global.isPlayerInventoryFull(player)) {
            isNotify(player, 2, 'top-mid', 'Нет места в инвентаре, чтобы снять вещь.', 4000);
            return;
        }
        if (
            peek.token &&
            inventoryTokenIsUniqueDonate(peek.token) &&
            !String(peek.token).startsWith('ivhol:') &&
            inventoryHasNormalizedDonate(player, peek.token)
        ) {
            isNotify(player, 2, 'top-mid', 'Предмет уже есть в инвентаре.', 3500);
            return;
        }
        if (peek.token) {
            if (!global.tryPushInventoryItem(player, peek.token)) {
                isNotify(player, 2, 'top-mid', 'Не удалось положить предмет в инвентарь.', 3500);
                return;
            }
        }
        applyUnequipMutate(player, slotKey);
        global.saveInventory(player);
        global.emitPlayerInventory(player);
    } catch (e) {
        console.log(e);
    }
};

function rowToSlotLabels(row, frac) {
    const empty = (key) => ({ slot: key, filled: false });
    const slots = {
        headwear: empty('headwear'),
        mask: empty('mask'),
        bag: empty('bag'),
        top: empty('top'),
        holster: empty('holster'),
        gloves: empty('gloves'),
        pants: empty('pants'),
        shoes: empty('shoes'),
        decals: empty('decals')
    };
    if (!row) return slots;
    if (row.headwear) {
        const [d, t] = row.headwear.split(':').map(Number);
        let en = findSellEntryForColumn('headwear', d, t, frac);
        if (!en) en = findHeadwearSellRowInPools(d, t, frac);
        slots.headwear = { filled: true, name: en ? clothDisplayShortName(en.ItemName) : 'Головной убор', raw: row.headwear };
    }
    if (row.masks) {
        const [d, t] = row.masks.split(':').map(Number);
        const en = findSellEntryForColumn('masks', d, t, frac);
        slots.mask = { filled: true, name: en ? clothDisplayShortName(en.ItemName) : 'Маска', raw: row.masks };
    }
    if (row.bags) {
        const [d, t] = row.bags.split(':').map(Number);
        const en = findSellEntryForColumn('bags', d, t, frac);
        let name = en ? clothDisplayShortName(en.ItemName) : 'Сумка';
        for (const bk of Object.keys(DONATE_BAGS)) {
            const b = DONATE_BAGS[bk];
            if (b.drawable === d && b.texture === t) name = b.name;
        }
        slots.bag = { filled: true, name, raw: row.bags };
    }
    if (row.top) {
        const [d, t] = row.top.split(':').map(Number);
        let topName = 'Верх';
        const en = findSellEntryForColumn('top', d, t, frac);
        if (en) topName = clothDisplayShortName(en.ItemName);
        slots.top = { filled: true, name: topName, raw: row.top };
    }
    if (row.bottom) {
        const [d, t] = row.bottom.split(':').map(Number);
        const en = findSellEntryForColumn('bottom', d, t, frac);
        slots.pants = { filled: true, name: en ? clothDisplayShortName(en.ItemName) : 'Штаны', raw: row.bottom };
    }
    if (row.shoes) {
        const [d, t] = row.shoes.split(':').map(Number);
        const en = findSellEntryForColumn('shoes', d, t, frac);
        slots.shoes = { filled: true, name: en ? clothDisplayShortName(en.ItemName) : 'Кроссовки', raw: row.shoes };
    }
    if (row.accessories) {
        const [d, t] = row.accessories.split(':').map(Number);
        let name = 'Аксессуар';
        if (d === 206 && t === 0) name = HOLSTERS.cobura.name;
        else if (d === 206 && t === 1) name = HOLSTERS.coburaw.name;
        else if (d === 201 && t === 0) name = HOLSTERS.cobura.name;
        else if (d === 201 && t === 1) name = HOLSTERS.coburaw.name;
        else if (d === 50 && t === 0) name = HOLSTERS.cobura.name;
        else if (d === 50 && t === 1) name = HOLSTERS.coburaw.name;
        else if (d === 44 && t === 0) name = HOLSTERS.cobura.name;
        else if (d === 45 && t === 0) name = HOLSTERS.coburaw.name;
        else {
            const en = findSellEntryForColumn('accessories', d, t, frac);
            if (en) name = clothDisplayShortName(en.ItemName);
        }
        slots.holster = { filled: true, name, raw: row.accessories };
    }
    if (row.gloves) {
        const parts = String(row.gloves).split(':').map(Number);
        const giid = parts[0];
        const gtx = parts[1];
        const it = findInClothesSellPools(
            (r) => r.ClothID === 15 && r.ItemID === giid && r.TopTexture === (Number.isFinite(gtx) ? gtx : 0)
        );
        slots.gloves = {
            filled: true,
            name: it ? clothDisplayShortName(it.ItemName) : 'Перчатки',
            raw: row.gloves
        };
    }
    if (row.decals) {
        const [d, t] = String(row.decals).split(':').map(Number);
        if (Number(d) === PATRONTAZH_DRAWABLE) {
            slots.decals = { filled: true, name: 'Патронтаж', raw: row.decals };
        } else {
            const en = findSellEntryForColumn('decals', d, t, frac);
            slots.decals = {
                filled: true,
                name: en ? clothDisplayShortName(en.ItemName) : 'Патронтаж',
                raw: row.decals
            };
        }
    }
    return slots;
}

function playerWearsHolsterKey(player, key) {
    const h = HOLSTERS[key];
    if (!h || !mp.players.exists(player)) return false;
    try {
        const cur = player.getClothes(7);
        return cur && Number(cur.drawable) === h.drawable && Number(cur.texture) === h.texture;
    } catch (_e) {
        return false;
    }
}

function playerWearsDonateBagKey(player, key) {
    const b = DONATE_BAGS[key];
    if (!b || !mp.players.exists(player)) return false;
    try {
        const cur = player.getClothes(5);
        return cur && Number(cur.drawable) === b.drawable && Number(cur.texture) === b.texture;
    } catch (_e) {
        return false;
    }
}

function holsterPedKey(player) {
    if (!mp.players.exists(player)) return null;
    try {
        const cur = player.getClothes(7);
        if (!cur || Number(cur.drawable) === 0) return null;
        const d = Number(cur.drawable);
        const t = Number(cur.texture);
        if (d === 206 && t === 0) return 'cobura';
        if (d === 206 && t === 1) return 'coburaw';
        if (d === 201 && t === 0) return 'cobura';
        if (d === 201 && t === 1) return 'coburaw';
        if (d === 50 && t === 0) return 'cobura';
        if (d === 50 && t === 1) return 'coburaw';
        if (d === 44 && t === 0) return 'cobura';
        if (d === 45 && t === 0) return 'coburaw';
    } catch (_e) {}
    return null;
}

/** Снять донат-сумку/кабуру с педа, если совпадает с выброшенным токеном (аккаунт уже сброшен). */
global.stripDonateWearableIfEquipped = function (player, token) {
    if (!mp.players.exists(player) || !token) return;
    const staticId = player.static;
    const fraction = player.getVariable('fraction');
    const s = String(token);
    if (s.startsWith('ivhol:')) {
        const key = s.slice(6);
        const h = HOLSTERS[key];
        if (!h) return;
        const cur = player.getClothes(7);
        if (cur && Number(cur.drawable) === h.drawable && Number(cur.texture) === h.texture) {
            player.setClothes(7, 0, 0, 0);
            global.updateOrInsertClothes(staticId, fraction, 'accessories', null, () => {});
        }
        return;
    }
    if (s.startsWith('ivbag:')) {
        const key = s.slice(6);
        const b = DONATE_BAGS[key];
        if (!b) return;
        const cur = player.getClothes(5);
        if (cur && Number(cur.drawable) === b.drawable && Number(cur.texture) === b.texture) {
            applyBagClothesToPed(player, 0, 0);
            global.updateOrInsertClothes(staticId, fraction, 'bags', null, () => {});
            try {
                player._bagEquipIc1 = null;
            } catch (_eB) {}
            if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
        }
    }
};

/** ivhol/ivbag: в инвентаре + на персонаже = владение; иначе при одевании снова клонируется предмет. */
global.syncDonateMirrorItems = function (player, accountRow) {
    if (!mp.players.exists(player) || !accountRow || !Array.isArray(player.inventory)) return false;
    if (typeof global.unstashDonateBagIc1ForCurrentFraction === 'function') {
        global.unstashDonateBagIc1ForCurrentFraction(player);
    }
    let changed = false;
    const inv = player.inventory;
    const max = global.getInventoryMaxSlots(player);

    const holsterToCount = (v) => {
        if (v === true || v === 'true') return 1;
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? 1 : 0;
    };

    for (const hk of HOLSTER_KEYS) {
        const need = holsterToCount(accountRow[hk]) > 0 ? 1 : 0;
        const tok = `ivhol:${hk}`;
        let stash = global.countInventoryDonateNormalized(player, tok);
        const onBody = playerWearsHolsterKey(player, hk) ? 1 : 0;

        if (need === 0) {
            while (stash > 0) {
                if (!removeFirstDonateTokenFromStash(player, tok)) break;
                changed = true;
                stash = global.countInventoryDonateNormalized(player, tok);
            }
            continue;
        }

        while (stash + onBody > 1 && stash > 0) {
            if (!removeFirstDonateTokenFromStash(player, tok)) break;
            changed = true;
            stash = global.countInventoryDonateNormalized(player, tok);
        }

        const accounted = global.countInventoryDonateNormalized(player, tok) + onBody;
        if (accounted < 1 && typeof global.invGridFirstEmpty === 'function' && global.invGridFirstEmpty(player) >= 0) {
            if (global.invGridTryPush) global.invGridTryPush(player, tok);
            else inv.push(tok);
            changed = true;
        } else if (accounted < 1 && inv.length < max) {
            inv.push(tok);
            changed = true;
        }
    }

    if (changed && typeof global.syncBagContentsArrayToCapacity === 'function') {
        try {
            global.syncBagContentsArrayToCapacity(player);
        } catch (_e) {}
    }

    return changed;
};

/** Устаревший плейсхолдер ic1 головы → канон из пула (имя «Рожки чертика», корректный ItemID). */
function upgradePlaceholderHeadwearIc1IfNeeded(rawItem, fkHead) {
    if (typeof rawItem !== 'string' || !rawItem.startsWith('ic1.')) return null;
    const paren = rawItem.indexOf('(');
    const baseTok = (paren >= 0 ? rawItem.slice(0, paren) : rawItem).trim();
    const suffix = paren >= 0 ? rawItem.slice(paren) : '';
    const pl = decodeIc1(baseTok);
    if (!pl) return null;
    const cidn = Number(pl.cid);
    if (cidn !== 1 && cidn !== 0) return null;
    const nmStr = pl.nm == null ? '' : String(pl.nm).trim();
    const needsFix = Number(pl.iid) === 9901 || nmStr === '' || nmStr === 'Головной убор';
    if (!needsFix) return null;
    const row = findHeadwearSellRowInPools(pl.d, pl.t, fkHead);
    if (!row) return null;
    const neu = encodeIc1({
        cid: row.ClothID,
        iid: row.ItemID,
        fr: row.Frac,
        d: row.Drawable,
        t: row.TopTexture,
        nm: row.ItemName
    });
    if (neu === baseTok) return null;
    return neu + suffix;
}

/** Для inventory_grid / CEF: что надето в слоте сумки (без глобального экспорта peekUnequipToken). */
global.peekUnequipTokenForBagSlot = function (player) {
    return peekUnequipToken(player, 'bag');
};

/** Лимит по «одной сумке» снят — не снимаем ivbag с педа из-за учёта. */
global.stripIvbagWearIfFractionMismatch = function (_player, _ownedBagKeyForFraction) {
    return false;
};

global.sanitizeDonateInventory = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return false;
    let changed = false;
    const inv = player.inventory;
    for (let i = inv.length - 1; i >= 0; i--) {
        const it = inv[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        if (!base.startsWith('ic1.')) continue;
        const pl = decodeIc1(base);
        if (!pl) continue;
        const cid = Number(pl.cid);
        const iid = Number(pl.iid);
        /** Фантомы после создания женского персонажа / legacy clear 0:0. */
        if (cid === 1 && iid === 9901) {
            inv[i] = null;
            changed = true;
            continue;
        }
        if (cid === 7 && (iid === 999 || Number(pl.d) === 0)) {
            inv[i] = null;
            changed = true;
        }
    }
    for (let i = inv.length - 1; i >= 0; i--) {
        const it = inv[i];
        if (typeof it === 'string' && it.split('(')[0].trim() === 'amongys_suit') {
            inv[i] = null;
            changed = true;
        }
    }
    for (let i = inv.length - 1; i >= 0; i--) {
        const it = inv[i];
        if (typeof it !== 'string') continue;
        const base = it.split('(')[0].trim();
        if (base === 'ivhol:coburas' || base.startsWith('ivhol:coburas(')) {
            inv[i] = null;
            changed = true;
        }
    }
    for (let i = 0; i < inv.length; i++) {
        const it = inv[i];
        if (typeof it !== 'string' || !inventoryTokenIsUniqueDonate(it)) continue;
        const canon = canonicalDonateToken(it);
        if (canon !== it) {
            inv[i] = canon;
            changed = true;
        }
    }
    for (let i = inv.length - 1; i >= 0; i--) {
        const it = inv[i];
        if (typeof it !== 'string' || !inventoryTokenIsUniqueDonate(it)) continue;
        const n = normalizeDonateItemStr(it);
        const k = n.startsWith('ivhol:') ? n.slice(6) : n.startsWith('ivbag:') ? n.slice(6) : '';
        if (n.startsWith('ivhol:') && !HOLSTER_KEYS.includes(k)) {
            inv[i] = null;
            changed = true;
        } else if (n.startsWith('ivbag:') && !BAG_ACCOUNT_KEYS.includes(k)) {
            inv[i] = null;
            changed = true;
        }
    }
    /** Кабуры: можно держать несколько шт. в сетке даже при надетой такой же — лимит только на покупку в донате. */
    /** Remap DLC v2: drawable + название сумок/одежды по ItemID (инвентарь / быстрые слоты). */
    const migrateTok = (raw) => {
        if (typeof raw !== 'string' || !raw.startsWith('ic1.')) return null;
        if (!global.donateClothesRemapV2 || typeof global.donateClothesRemapV2.migrateIc1Payload !== 'function') return null;
        const base = raw.split('(')[0].trim();
        const pl = decodeIc1(base);
        if (!pl) return null;
        const m = global.donateClothesRemapV2.migrateIc1Payload(pl);
        if (!m || !m.changed) return null;
        const suffix = raw.length > base.length ? raw.slice(base.length) : '';
        return encodeIc1(m.pl) + suffix;
    };
    for (let i = 0; i < inv.length; i++) {
        const neu = migrateTok(inv[i]);
        if (neu) {
            inv[i] = neu;
            changed = true;
        }
    }
    if (Array.isArray(player.fastSlots)) {
        for (let s = 0; s < player.fastSlots.length; s++) {
            const neu = migrateTok(player.fastSlots[s]);
            if (neu) {
                player.fastSlots[s] = neu;
                changed = true;
            }
        }
    }
    if (player._bagEquipIc1 && typeof player._bagEquipIc1 === 'string') {
        const neu = migrateTok(player._bagEquipIc1);
        if (neu) {
            player._bagEquipIc1 = neu;
            changed = true;
            if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
        }
    }
    /** Старые drawable верха → актуальный каталог (после сдвига +19). */
    const LEGACY_TOP_DRAWABLE_TO_CATALOG = {
        612: 631,
        614: 633,
        615: 634,
        616: 635,
        617: 636,
        618: 637,
        619: 638,
        620: 639,
        621: 639,
        640: 659,
        641: 660,
        644: 659,
        645: 660,
        /** 661/662 в DLC — админ Bloody DM; Wings/Spotik сдвинуты на 663/664 */
        661: 663,
        662: 664
    };
    for (let i = 0; i < inv.length; i++) {
        const it = inv[i];
        if (typeof it !== 'string' || !it.startsWith('ic1.')) continue;
        const base = it.split('(')[0].trim();
        const pl = decodeIc1(base);
        if (!pl || Number(pl.cid) !== 3) continue;
        const nd = LEGACY_TOP_DRAWABLE_TO_CATALOG[Number(pl.d)];
        if (!Number.isFinite(nd)) continue;
        const suffix = it.length > base.length ? it.slice(base.length) : '';
        inv[i] = encodeIc1(Object.assign({}, pl, { d: nd })) + suffix;
        changed = true;
    }
    if (Array.isArray(player.fastSlots)) {
        for (let s = 0; s < player.fastSlots.length; s++) {
            const it = player.fastSlots[s];
            if (typeof it !== 'string' || !it.startsWith('ic1.')) continue;
            const base = it.split('(')[0].trim();
            const pl = decodeIc1(base);
            if (!pl || Number(pl.cid) !== 3) continue;
            const nd = LEGACY_TOP_DRAWABLE_TO_CATALOG[Number(pl.d)];
            if (!Number.isFinite(nd)) continue;
            const suffix = it.length > base.length ? it.slice(base.length) : '';
            player.fastSlots[s] = encodeIc1(Object.assign({}, pl, { d: nd })) + suffix;
            changed = true;
        }
    }
    /** Плейсхолдерные ic1 головы — заменить на строку из каталога (инвентарь + быстрые слоты). */
    try {
        const fkHead = fractionKey(player);
        for (let i = 0; i < inv.length; i++) {
            const u = upgradePlaceholderHeadwearIc1IfNeeded(inv[i], fkHead);
            if (u) {
                inv[i] = u;
                changed = true;
            }
        }
        if (Array.isArray(player.fastSlots)) {
            for (let s = 0; s < player.fastSlots.length; s++) {
                const u = upgradePlaceholderHeadwearIc1IfNeeded(player.fastSlots[s], fkHead);
                if (u) {
                    player.fastSlots[s] = u;
                    changed = true;
                }
            }
        }
    } catch (_e) {}
    return changed;
};

/** Заголовок панели сумки: ivbag → имя доната; ic1 → из предмета; иначе каталог (не смешивать Stonik с «чужим» донат-именем). */
global.getBagPanelTitleFromEquip = function (player) {
    if (!mp.players.exists(player)) return '';
    const cur = player.getClothes(5);
    if (!cur || Number(cur.drawable) === 0) return '';
    const fk = fractionKey(player);
    const peek = peekUnequipToken(player, 'bag');
    if (!peek.isEmpty && peek.token && typeof peek.token === 'string') {
        if (peek.token.startsWith('ivbag:')) {
            const kk = peek.token.split('(')[0].trim().slice(6);
            if (DONATE_BAGS[kk]) return DONATE_BAGS[kk].name;
        }
        if (peek.token.startsWith('ic1.')) {
            const pl = decodeIc1(ic1InventoryBase(peek.token));
            if (pl && pl.nm) return clothDisplayShortName(String(pl.nm));
        }
    }
    const en = findSellEntryForColumn('bags', cur.drawable, cur.texture, fk);
    if (en && en.ItemName) return clothDisplayShortName(en.ItemName);
    for (let bi = 0; bi < BAG_ACCOUNT_KEYS.length; bi++) {
        const bk = BAG_ACCOUNT_KEYS[bi];
        const b = DONATE_BAGS[bk];
        if (b && Number(b.drawable) === Number(cur.drawable) && Number(b.texture) === Number(cur.texture))
            return b.name;
    }
    return 'Сумка';
};

/** Найти bagInst по ic1 в сетке/карманах с тем же drawable:texture, что у донат‑сумки (ivbag). */
function findBagInstIdFromStashMatchingBagDrawable(player, d, t) {
    if (!mp.players.exists(player)) return 0;
    const wantD = Number(d);
    const wantT = Number.isFinite(Number(t)) ? Number(t) : 0;
    if (!Number.isFinite(wantD)) return 0;
    const scanArr = (arr) => {
        if (!Array.isArray(arr)) return 0;
        for (let i = 0; i < arr.length; i++) {
            const cell = arr[i];
            if (typeof cell !== 'string' || !cell.startsWith('ic1.')) continue;
            const pl = decodeIc1(ic1InventoryBase(cell));
            if (!pl || Number(pl.cid) !== 8) continue;
            const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
            if (Number(pl.d) !== wantD || tt !== wantT) continue;
            const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
            if (Number.isFinite(inst) && inst > 0) return inst;
        }
        return 0;
    };
    let id = scanArr(player.inventory);
    if (id) return id;
    id = scanArr(player.fastSlots);
    if (id) return id;
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            id = scanArr(player._bagStorageByKey[k]);
            if (id) return id;
        }
    }
    return 0;
}

function donateBagInsertDefFromRegistry(player, bdef) {
    const fk = fractionKey(player);
    const entry = findSellEntryForColumn('bags', bdef.drawable, bdef.texture, fk);
    if (entry) {
        return {
            ItemID: entry.ItemID,
            Frac: entry.Frac,
            Drawable: entry.Drawable,
            TopTexture: entry.TopTexture,
            ItemName: entry.ItemName,
            ItemImg: entry.ItemImg
        };
    }
    return {
        ItemID: 0,
        Frac: fk,
        Drawable: bdef.drawable,
        TopTexture: bdef.texture,
        ItemName: bdef.name || 'Сумка',
        ItemImg: null
    };
}

function collectClaimedBagInstIdsFromPlayer(player) {
    const claimed = new Set();
    const scanCell = (cell) => {
        if (typeof cell !== 'string' || !cell.startsWith('ic1.')) return;
        const pl = decodeIc1(ic1InventoryBase(cell));
        if (!pl || Number(pl.cid) !== 8) return;
        const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
        if (Number.isFinite(inst) && inst > 0) claimed.add(inst);
    };
    const scanArr = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) scanCell(arr[i]);
    };
    scanArr(player.inventory);
    scanArr(player.fastSlots);
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            scanArr(player._bagStorageByKey[k]);
        }
    }
    return claimed;
}

function pickUnclaimedBagInstId(orderedIds, claimed) {
    for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        if (!claimed.has(id)) return id;
    }
    return 0;
}

function registerDonateBagInstanceMaps(player, id, drawable, texture) {
    if (!mp.players.exists(player) || !Number.isFinite(Number(id)) || Number(id) <= 0) return;
    const d = Number(drawable);
    const t = Number(texture);
    if (!Number.isFinite(d) || !Number.isFinite(t)) return;
    const dk = `${d}:${t}`;
    try {
        if (!player._donateBagInstIdToDt || typeof player._donateBagInstIdToDt !== 'object') player._donateBagInstIdToDt = {};
        if (!player._donateBagInstByDrawableKey || typeof player._donateBagInstByDrawableKey !== 'object')
            player._donateBagInstByDrawableKey = {};
        player._donateBagInstIdToDt[String(id)] = dk;
        if (player._donateBagInstByDrawableKey[dk] == null) player._donateBagInstByDrawableKey[dk] = Number(id);
    } catch (_e) {}
}

function ensureBagStorageRowExistsForInst(player, id, drawable, texture) {
    const iid = Number(id);
    if (!mp.players.exists(player) || !Number.isFinite(iid) || iid <= 0) return;
    if (!player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') player._bagStorageByKey = {};
    const key = `baginst:${iid}`;
    if (player._bagStorageByKey[key] != null) return;
    if (typeof global.mergeDonateBagInstanceContentsFromDb === 'function') {
        global.mergeDonateBagInstanceContentsFromDb(player, [{ id: iid, drawable, texture }], { appendOnly: true });
    }
}

function ensureIvbagWearBagInstThen(player, bagAccKey, cb) {
    const bdef = DONATE_BAGS[bagAccKey];
    if (!bdef) return cb(new Error('bag'));
    const dk = `${Number(bdef.drawable)}:${Number(bdef.texture)}`;
    const fromStash = findBagInstIdFromStashMatchingBagDrawable(player, bdef.drawable, bdef.texture);
    if (fromStash > 0) {
        try {
            player._ivbagWearResolvedInstId = fromStash;
        } catch (_e) {}
        registerDonateBagInstanceMaps(player, fromStash, bdef.drawable, bdef.texture);
        ensureBagStorageRowExistsForInst(player, fromStash, bdef.drawable, bdef.texture);
        return cb(null, true);
    }
    const claimed = collectClaimedBagInstIdsFromPlayer(player);
    const memoryIds = [];
    try {
        if (player._donateBagInstIdToDt && typeof player._donateBagInstIdToDt === 'object') {
            for (const iis of Object.keys(player._donateBagInstIdToDt)) {
                if (player._donateBagInstIdToDt[iis] !== dk) continue;
                const n = parseInt(iis, 10);
                if (Number.isFinite(n) && n > 0) memoryIds.push(n);
            }
        }
    } catch (_eM) {}
    memoryIds.sort((a, b) => a - b);
    let pick = pickUnclaimedBagInstId(memoryIds, claimed);
    if (pick > 0) {
        try {
            player._ivbagWearResolvedInstId = pick;
        } catch (_e2) {}
        registerDonateBagInstanceMaps(player, pick, bdef.drawable, bdef.texture);
        ensureBagStorageRowExistsForInst(player, pick, bdef.drawable, bdef.texture);
        return cb(null, true);
    }
    if (player.static == null) return cb(new Error('static'));
    global.DB.query(
        'SELECT id FROM donate_bag_instances WHERE account_static = ? AND drawable = ? AND texture = ? ORDER BY id ASC',
        [player.static, bdef.drawable, bdef.texture],
        (err, rows) => {
            if (!mp.players.exists(player)) return cb(new Error('gone'));
            if (err) return cb(err);
            const ids = (rows || []).map((r) => parseInt(String(r.id), 10)).filter((n) => n > 0);
            const pickDb = pickUnclaimedBagInstId(ids, claimed);
            if (pickDb > 0) {
                try {
                    player._ivbagWearResolvedInstId = pickDb;
                } catch (_e3) {}
                registerDonateBagInstanceMaps(player, pickDb, bdef.drawable, bdef.texture);
                ensureBagStorageRowExistsForInst(player, pickDb, bdef.drawable, bdef.texture);
                return cb(null, true);
            }
            const insDef = donateBagInsertDefFromRegistry(player, bdef);
            insertDonateBagInstanceRow(player, insDef, (e2, insertId) => {
                if (!mp.players.exists(player)) return cb(new Error('gone'));
                if (e2 || !insertId) return cb(e2 || new Error('insert'));
                try {
                    player._ivbagWearResolvedInstId = insertId;
                } catch (_e4) {}
                registerDonateBagInstanceMaps(player, insertId, bdef.drawable, bdef.texture);
                ensureBagStorageRowExistsForInst(player, insertId, bdef.drawable, bdef.texture);
                cb(null, true);
            });
        }
    );
}

global.ensureIvbagWearBagInstThen = ensureIvbagWearBagInstThen;

/**
 * Ключ хранилища предметов внутри сумки: baginst:{id} для донат-сумок; ic1bag только как наследие без inst.
 */
global.computeBagInventoryStorageKey = function (player) {
    if (!mp.players.exists(player)) return null;
    const sid = player.static != null ? String(player.static) : '0';
    const peek = peekUnequipToken(player, 'bag');
    if (!peek.isEmpty && peek.token && typeof peek.token === 'string') {
        const tok = peek.token.split('(')[0].trim();
        if (tok.startsWith('ivbag:')) {
            const bagAccKey = tok.slice(6);
            const bdef = DONATE_BAGS[bagAccKey];
            if (!bdef) return null;
            const dK = `${Number(bdef.drawable)}:${Number(bdef.texture)}`;
            const fromStash = findBagInstIdFromStashMatchingBagDrawable(player, bdef.drawable, bdef.texture);
            if (fromStash > 0) return `baginst:${fromStash}`;
            const persisted = Number(player._ivbagWearResolvedInstId);
            if (Number.isFinite(persisted) && persisted > 0) {
                const idt =
                    player._donateBagInstIdToDt &&
                    typeof player._donateBagInstIdToDt === 'object' &&
                    player._donateBagInstIdToDt[String(persisted)];
                if (idt === dK) return `baginst:${persisted}`;
            }
            const matchingIds = [];
            if (player._donateBagInstIdToDt && typeof player._donateBagInstIdToDt === 'object') {
                for (const iis of Object.keys(player._donateBagInstIdToDt)) {
                    if (player._donateBagInstIdToDt[iis] !== dK) continue;
                    const n = parseInt(iis, 10);
                    if (Number.isFinite(n) && n > 0) matchingIds.push(n);
                }
            }
            matchingIds.sort((a, b) => a - b);
            if (matchingIds.length === 1) return `baginst:${matchingIds[0]}`;
            if (matchingIds.length > 1) {
                const claimed2 = collectClaimedBagInstIdsFromPlayer(player);
                const pickAmb = pickUnclaimedBagInstId(matchingIds, claimed2);
                if (pickAmb > 0) return `baginst:${pickAmb}`;
            }
            return null;
        }
        if (tok.startsWith('ic1.')) {
            const pl = decodeIc1(ic1InventoryBase(tok));
            if (pl && Number(pl.cid) === 8) {
                const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
                if (Number.isFinite(inst) && inst > 0) return `baginst:${inst}`;
            }
            if (pl && Number.isFinite(Number(pl.cid)) && Number.isFinite(Number(pl.d))) {
                const iid = Number.isFinite(Number(pl.iid)) ? Number(pl.iid) : 0;
                const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
                return `ic1bag:${pl.cid}:${iid}:${pl.d}:${tt}:s${sid}`;
            }
        }
    }
    try {
        const c = player.getClothes(5);
        if (!c || Number(c.drawable) === 0) return null;
        const d = Number(c.drawable);
        const t = Number(c.texture);
        if (!Number.isFinite(d)) return null;
        const cap = typeof global.getActiveBagCapacity === 'function' ? global.getActiveBagCapacity(player) : 0;
        if (cap > 0) {
            try {
                const ic1eq = player._bagEquipIc1;
                if (typeof ic1eq === 'string' && ic1eq.startsWith('ic1.')) {
                    const base = ic1eq.split('(')[0].trim();
                    const pl = decodeIc1(ic1InventoryBase(base));
                    const inst = pl && pl.bagInst != null ? Number(pl.bagInst) : NaN;
                    if (
                        pl &&
                        Number(pl.cid) === 8 &&
                        Number.isFinite(inst) &&
                        inst > 0 &&
                        Number(pl.d) === d &&
                        Number.isFinite(Number(pl.t)) &&
                        Number(pl.t) === t
                    ) {
                        return `baginst:${inst}`;
                    }
                }
            } catch (_eBag) {}
            return `bagped:${d}:${t}:s${sid}`;
        }
    } catch (_e) {}
    return null;
};

/** Быстрый снимок слотов с педа для CEF (без асинхронного I/O — callback в том же проходе). */
global.buildEquipSnapshotAsync = function (player, cb) {
    if (!mp.players.exists(player)) return cb(null);
    const fk = fractionKey(player);
    const fallbacks = {
        mask: 'Маска',
        headwear: 'Головной убор',
        glasses: 'Очки',
        ears: 'Серьги',
        watch: 'Часы',
        bracelet: 'Браслет',
        top: 'Верх',
        pants: 'Штаны',
        shoes: 'Кроссовки',
        bag: 'Сумка',
        holster: 'Аксессуар',
        gloves: 'Перчатки',
        decals: 'Патронтаж'
    };
    const keys = [
        'headwear',
        'mask',
        'ears',
        'glasses',
        'bracelet',
        'top',
        'watch',
        'bag',
        'pants',
        'holster',
        'gloves',
        'shoes',
        'decals'
    ];
    function displayNameForSlot(slotKey, peek) {
        if (peek.isEmpty) return null;
        /** Для headwear: подпись слота — из последнего надетого ic1 (серверный getProp для DLC часто врёт). */
        if (slotKey === 'headwear') {
            const canon = player._headwearEquipIc1;
            if (typeof canon === 'string' && canon.startsWith('ic1.')) {
                const pl = decodeIc1(ic1InventoryBase(canon));
                if (pl && pl.nm) return clothDisplayShortName(String(pl.nm));
            }
        }
        const t = peek.token;
        if (t && typeof t === 'string' && t.startsWith('ic1.')) {
            const pl = decodeIc1(t);
            if (pl && pl.nm) return clothDisplayShortName(String(pl.nm));
        }
        if (t && typeof t === 'string' && t.startsWith('ivhol:')) {
            const k = t.slice(6);
            return HOLSTERS[k] ? HOLSTERS[k].name : fallbacks.holster;
        }
        if (t && typeof t === 'string' && t.startsWith('ivbag:')) {
            const k = t.slice(6);
            return DONATE_BAGS[k] ? DONATE_BAGS[k].name : fallbacks.bag;
        }
        if (t && typeof t === 'string' && t.startsWith('frdef:') && typeof global.clothTokenDropLabel === 'function') {
            const nm = global.clothTokenDropLabel(t);
            if (nm) return clothDisplayShortName(nm);
        }
        if (slotKey === 'top') {
            const cur = player.getClothes(11);
            if (cur && cur.drawable !== undefined) {
                const en = findSellEntryForColumn('top', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'holster') {
            const hk = holsterPedKey(player);
            if (hk && HOLSTERS[hk]) return HOLSTERS[hk].name;
            const cur = player.getClothes(7);
            if (cur && cur.drawable !== undefined && Number(cur.drawable) !== 0) {
                const en = findSellEntryForColumn('accessories', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'bag') {
            const cur = player.getClothes(5);
            if (cur && Number(cur.drawable) !== 0) {
                const en = findSellEntryForColumn('bags', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
                for (const bk of BAG_ACCOUNT_KEYS) {
                    const b = DONATE_BAGS[bk];
                    if (b && b.drawable === Number(cur.drawable) && b.texture === Number(cur.texture)) return b.name;
                }
            }
        }
        if (slotKey === 'mask') {
            const cur = player.getClothes(1);
            if (cur && cur.drawable !== undefined && cur.drawable !== 0) {
                const en = findSellEntryForColumn('masks', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'pants') {
            const cur = player.getClothes(4);
            if (cur && cur.drawable !== undefined && cur.drawable !== 14) {
                const en = findSellEntryForColumn('bottom', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'shoes') {
            const cur = player.getClothes(6);
            const defS = defaultShoesForFraction(fk);
            if (cur && (cur.drawable !== defS.d || cur.texture !== defS.t)) {
                const en = findSellEntryForColumn('shoes', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'decals') {
            const cur = player.getClothes(10);
            if (cur && Number(cur.drawable) === PATRONTAZH_DRAWABLE) return 'Патронтаж';
            if (cur && Number(cur.drawable) !== 0) {
                const en = findSellEntryForColumn('decals', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'glasses') {
            const cur = player.getProp(1);
            if (isAccessoryPropVisuallyEmpty('glasses', cur, player)) return null;
            if (cur && Number(cur.drawable) !== 0) {
                const en = findSellEntryForColumn('glasses', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'ears') {
            const cur = player.getProp(2);
            if (isAccessoryPropVisuallyEmpty('ears', cur, player)) return null;
            if (cur && Number.isFinite(Number(cur.drawable)) && Number(cur.drawable) >= 0) {
                const en = findSellEntryForColumn('ears', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'watch') {
            const cur = player.getProp(6);
            if (isAccessoryPropVisuallyEmpty('watch', cur, player)) return null;
            if (cur && !isDefaultFreemodeWatchProp(cur) && Number.isFinite(Number(cur.drawable)) && Number(cur.drawable) >= 0) {
                const en = findSellEntryForColumn('watch_prop', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        if (slotKey === 'bracelet') {
            const cur = player.getProp(7);
            if (isAccessoryPropVisuallyEmpty('bracelet', cur, player)) return null;
            if (cur && Number.isFinite(Number(cur.drawable)) && Number(cur.drawable) >= 0) {
                const en = findSellEntryForColumn('bracelet_prop', cur.drawable, cur.texture, fk);
                if (en) return clothDisplayShortName(en.ItemName);
            }
        }
        return fallbacks[slotKey] || '—';
    }
    const slots = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const p = peekUnequipToken(player, k);
        if (p.isEmpty) {
            slots[k] = { filled: false };
        } else {
            const nm = displayNameForSlot(k, p) || fallbacks[k];
            const entry = { filled: true, name: nm };
            if (p.token) entry.equipToken = p.token;
            if (k === 'top' && p.token) {
                entry.equipToken = p.token;
                try {
                    const curTop = player.getClothes(11);
                    if (curTop && curTop.drawable !== undefined) {
                        entry.raw = `${curTop.drawable}:${curTop.texture}`;
                        if (DONATE_TOP_TOGGLE_DRAWABLE[Number(curTop.drawable)] != null) {
                            entry.canToggleTop = true;
                        }
                    }
                } catch (_eT) {}
            }
            if (k === 'bag') {
                try {
                    const curBag = player.getClothes(5);
                    if (curBag && curBag.drawable !== undefined) {
                        const bagD = Number(curBag.drawable);
                        entry.raw = `${bagD}:${curBag.texture}`;
                        const tok = p.token && String(p.token).split('(')[0].trim();
                        const pl = tok && tok.startsWith('ic1.') ? decodeIc1(tok) : null;
                        const iid = pl ? Number(pl.iid) : NaN;
                        entry.canToggleBag =
                            ((bagD === 114 || bagD === 115) && !!GUARD_BAG_ITEM_IDS[iid]) ||
                            ((bagD === 127 || bagD === 128) && !!LW_MESSENGER_BAG_ITEM_IDS[iid]);
                    }
                } catch (_eBag) {}
            }
            if (k === 'mask') {
                try {
                    const curMask = player.getClothes(1);
                    if (
                        curMask &&
                        curMask.drawable !== undefined &&
                        spectrumToggleNextDrawable(2, curMask.drawable) != null
                    ) {
                        entry.raw = `${curMask.drawable}:${curMask.texture}`;
                        entry.canToggleMask = true;
                    }
                } catch (_eMask) {}
            }
            if (k === 'headwear') {
                try {
                    const curHat = player.getProp(0);
                    if (
                        curHat &&
                        curHat.drawable !== undefined &&
                        spectrumToggleNextDrawable(1, curHat.drawable) != null
                    ) {
                        entry.raw = `${curHat.drawable}:${curHat.texture}`;
                        entry.canToggleHat = true;
                    }
                } catch (_eHat) {}
            }
            if (k === 'holster') {
                const ik = holsterPedKey(player);
                if (ik) entry.holsterIcon = ik;
                else {
                    try {
                        const curA = player.getClothes(7);
                        if (curA && Number(curA.drawable) !== 0) {
                            entry.accessoryCalamity = [6, Number(curA.drawable), Number(curA.texture) || 0];
                        }
                    } catch (_e) {}
                }
            }
            slots[k] = entry;
        }
    }
    slots.armor =
        player.getVariable('armor') === true
            ? {
                filled: true,
                name:
                    typeof global.getGameplayArmorPct === 'function'
                        ? 'Бронежилет ' + global.getGameplayArmorPct(player) + '%'
                        : 'Бронежилет',
                equipToken:
                    player._gameplayArmorToken ||
                    (typeof global.formatArmorInventoryToken === 'function'
                        ? global.formatArmorInventoryToken(global.getGameplayArmorPct(player))
                        : 'Бронежилет')
            }
            : { filled: false };
    cb({
        maxSlots: global.getInventoryMaxSlots(player),
        usedSlots: global.getInventoryUsedSlots(player),
        bagBonus: playerHasBagBonus(player),
        bagPanel: typeof global.buildBagPanelSnap === 'function' ? global.buildBagPanelSnap(player) : null,
        slotBinds:
            player.invSlotBinds && typeof player.invSlotBinds === 'object' ? JSON.parse(JSON.stringify(player.invSlotBinds)) : {},
        slots
    });
};

/** Нельзя отдавать в обмен / продавать предметы с тела и из быстрых слотов. */
const EQUIP_TRANSFER_LOCK_SLOT_KEYS = [
    'headwear',
    'mask',
    'ears',
    'glasses',
    'bracelet',
    'top',
    'watch',
    'bag',
    'pants',
    'holster',
    'gloves',
    'shoes',
    'decals'
];

function normalizeInvTransferBase(raw) {
    if (raw == null || typeof raw !== 'string') return '';
    return raw.replace(/^\uFEFF/, '').split('(')[0].trim();
}

function inventoryTokensSameOutfit(a, b) {
    const ba = normalizeInvTransferBase(a);
    const bb = normalizeInvTransferBase(b);
    if (!ba || !bb) return false;
    if (ba === bb) return true;
    if (ba.startsWith('ic1.') && bb.startsWith('ic1.')) {
        const pa = decodeIc1(ba);
        const pb = decodeIc1(bb);
        if (!pa || !pb) return false;
        if (
            Number(pa.cid) === Number(pb.cid) &&
            Number(pa.iid) === Number(pb.iid) &&
            Number(pa.d) === Number(pb.d) &&
            Number(pa.t) === Number(pb.t)
        ) {
            return true;
        }
        if (Number(pa.cid) === 3 && Number(pb.cid) === 3 && Number(pa.iid) === Number(pb.iid) && Number(pa.t) === Number(pb.t)) {
            const da = Number(pa.d);
            const db = Number(pb.d);
            if (donateTopDrawableAliasSet(da).has(db)) {
                return true;
            }
        }
        return false;
    }
    if (inventoryTokenIsUniqueDonate(ba) && inventoryTokenIsUniqueDonate(bb)) {
        return normalizeDonateItemStr(canonicalDonateToken(ba)) === normalizeDonateItemStr(canonicalDonateToken(bb));
    }
    if (ba.startsWith('frdef:') && bb.startsWith('frdef:')) return ba === bb;
    return false;
}

function itemMatchesAnyFastSlot(player, rawItem) {
    if (!Array.isArray(player.fastSlots)) return false;
    const rbase = normalizeInvTransferBase(rawItem);
    /** ic1/frdef в инвентаре могут дублироваться; в быстром слоте только конкретная строка. */
    const clothTokenFastSlotExact = rbase.startsWith('ic1.') || rbase.startsWith('frdef:');
    const rTrim = rawItem.replace(/^\uFEFF/, '').trim();
    for (let i = 0; i < player.fastSlots.length; i++) {
        const fs = player.fastSlots[i];
        if (typeof fs !== 'string' || !fs) continue;
        if (clothTokenFastSlotExact) {
            if (rTrim === fs.replace(/^\uFEFF/, '').trim()) return true;
            continue;
        }
        if (inventoryTokensSameOutfit(rawItem, fs)) return true;
    }
    return false;
}

function inventoryItemMatchesWornEquip(player, rawItem) {
    const bs = normalizeInvTransferBase(rawItem);
    /**
     * Надетая ic1/frdef снимается из инвентаря при экипировке; оставшиеся строки с тем же видом — другие
     * экземпляры. Сравнение с peek по «одинаковому костюму» ломало передачу дубликатов.
     */
    if (bs.startsWith('ic1.') || bs.startsWith('frdef:')) return false;
    for (let i = 0; i < EQUIP_TRANSFER_LOCK_SLOT_KEYS.length; i++) {
        const p = peekUnequipToken(player, EQUIP_TRANSFER_LOCK_SLOT_KEYS[i]);
        if (p.isEmpty || !p.token) continue;
        if (inventoryTokensSameOutfit(rawItem, p.token)) return true;
    }
    return false;
}

/**
 * true — предмет сейчас на теле или в быстром слоте (нельзя продавать/обменивать/выставлять).
 */
global.inventoryItemIsBlockedForTransfer = function (player, rawItem) {
    if (!mp.players.exists(player) || rawItem == null || typeof rawItem !== 'string') return false;
    const s = rawItem.replace(/^\uFEFF/, '').trim();
    if (!s) return false;
    const base = s.split('(')[0].trim().split('#')[0].trim();
    if (itemMatchesAnyFastSlot(player, s)) return true;
    if (inventoryItemMatchesWornEquip(player, s)) return true;
    return false;
};

/** Не показывать в списках обмена / продажи + донатные trade_donate, эквивантные надетой кобуре/сумке. */
global.inventoryItemHiddenFromTransferLists = function (player, rawItem) {
    if (!mp.players.exists(player) || rawItem == null || typeof rawItem !== 'string') return false;
    if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, rawItem)) return true;
    const s = rawItem.replace(/^\uFEFF/, '').trim();
    const hol = /^trade_donate:holster:(cobura|coburaw):/.exec(s);
    if (hol && typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, `ivhol:${hol[1]}`)) return true;
    const bagm = /^trade_donate:bag:(bag_[a-z0-9_]+)$/i.exec(s);
    if (bagm && typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, `ivbag:${bagm[1]}`)) return true;
    return false;
};

/** Количество стака, доступное для продажи/лота (без ячеек, скрытых как экипировка/быстрый слот). */
global.countStackBaseUnblockedForSale = function (player, base) {
    let sum = 0;
    const b = String(base || '');
    const hidden = (cell) =>
        typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, String(cell || ''));
    const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const x of arr) {
            if (!x) continue;
            const xs = String(x);
            if (hidden(xs)) continue;
            if (xs === b) sum += 1;
            else if (xs.startsWith(b + ' (')) {
                const mm = xs.match(/\((\d+)\)/);
                sum += mm ? parseInt(mm[1], 10) : 0;
            }
        }
    };
    scan(player.inventory);
    scan(player.fastSlots);
    return sum;
};

/** Снять qty со стака только с незаблокированных ячеек (для маркета и т.п.). */
global.removeStackQtySkippingBlocked = function (player, base, qty) {
    let left = qty;
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    const hidden = (cell) =>
        typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, String(cell || ''));
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const invItem = player.inventory[i] || '';
        if (!invItem || hidden(invItem)) continue;
        if (invItem === base) {
            player.inventory[i] = null;
            left--;
            continue;
        }
        if (invItem.startsWith(base + ' (')) {
            const match = invItem.match(/\((\d+)\)/);
            const count = match ? parseInt(match[1], 10) : 1;
            if (count <= left) {
                player.inventory[i] = null;
                left -= count;
            } else {
                player.inventory[i] = `${base} (${count - left})`;
                left = 0;
            }
        }
    }
    if (left > 0 && Array.isArray(player.fastSlots)) {
        for (let s = 0; s < player.fastSlots.length && left > 0; s++) {
            const invItem = player.fastSlots[s] || '';
            if (!invItem || hidden(invItem)) continue;
            if (invItem === base) {
                player.fastSlots[s] = '';
                left--;
                continue;
            }
            if (invItem.startsWith(base + ' (')) {
                const match = invItem.match(/\((\d+)\)/);
                const count = match ? parseInt(match[1], 10) : 1;
                if (count <= left) {
                    player.fastSlots[s] = '';
                    left -= count;
                } else {
                    player.fastSlots[s] = `${base} (${count - left})`;
                    left = 0;
                }
            }
        }
    }
    return left === 0;
};

function applyTorsoForTopEquipVisual(player, def) {
    if (applyTorsoIfAny(player, def && def.Torso)) return;
    applyDefaultFreemodeTopTorso(player, null, null);
}

global.applyTorsoForTopEquipVisual = applyTorsoForTopEquipVisual;

function syncPropToClientAfterServerSet(player, slot, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const p = Number(slot);
    const d = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(p) || p < 0 || p > 7 || !Number.isFinite(d)) return;
    if (typeof global.replayPropSyncForDelayedSpawn === 'function') {
        global.replayPropSyncForDelayedSpawn(player, p, d, t);
    } else {
        try {
            player.call('sc:syncPropLocal', [p, d, t]);
        } catch (_e) {}
    }
}

global.syncPropToClientAfterServerSet = syncPropToClientAfterServerSet;

/** DLC-компоненты (сумки, кабура и т.д.) — без client-side setComponentVariation локальный ped часто «пустой». */
function syncClothesComponentToClientAfterServerSet(player, component, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const c = Number(component);
    const d = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(c) || !Number.isFinite(d)) return;
    const fire = () => {
        try {
            if (!mp.players.exists(player)) return;
            player.call('sc:syncClothesLocal', [c, d, t]);
        } catch (_e) {}
    };
    fire();
    setTimeout(fire, 600);
    setTimeout(fire, 1800);
}

/** Сумки — компонент 5 (спина). */
function syncBagClothesToClientAfterServerSet(player, drawable, texture) {
    syncClothesComponentToClientAfterServerSet(player, 5, drawable, texture);
}

function applyBagClothesToPed(player, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const d = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(d)) return;
    player.setClothes(5, d, t, 0);
    syncBagClothesToClientAfterServerSet(player, d, t);
}

global.syncClothesComponentToClientAfterServerSet = syncClothesComponentToClientAfterServerSet;
global.syncBagClothesToClientAfterServerSet = syncBagClothesToClientAfterServerSet;
global.applyBagClothesToPed = applyBagClothesToPed;

/** Донат: в каталоге только «открытая» модель; закрытая — через ПКМ «Использовать» на слоте верха. */
const DONATE_TOP_TOGGLE_DRAWABLE = {
    657: 658,
    658: 657,
    637: 636,
    636: 637,
    661: 658,
    662: 657,
    638: 636,
    621: 636
};

/** Drawable в каталоге DonateClothesItemsSell (только «открытые» позиции). */
function donateTopCatalogDrawable(d) {
    const n = Number(d);
    if (n === 658 || n === 662 || n === 661) return 657;
    if (n === 636 || n === 638 || n === 619 || n === 621) return 637;
    return n;
}

function donateTopDrawableAliasSet(d) {
    const n = Number(d);
    const set = new Set([n]);
    if ([657, 658, 661, 662].includes(n)) {
        [657, 658, 661, 662].forEach((x) => set.add(x));
    }
    if ([636, 637, 638, 619, 620, 621].includes(n)) {
        [636, 637, 638, 619, 620, 621].forEach((x) => set.add(x));
    }
    return set;
}

function donateSellRowByItemTop(def) {
    if (!def || !Array.isArray(global.DonateClothesItemsSell)) return false;
    const iid = Number(def.ItemID);
    const catD = donateTopCatalogDrawable(def.Drawable);
    const t = Number(def.TopTexture);
    if (!Number.isFinite(iid) || !Number.isFinite(catD) || !Number.isFinite(t)) return false;
    const arr = global.DonateClothesItemsSell;
    for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        if (
            r.ClothID === 3 &&
            Number(r.ItemID) === iid &&
            Number(r.Drawable) === catD &&
            Number(r.TopTexture) === t
        ) {
            return true;
        }
    }
    return false;
}

global.toggleDonateTopVariant = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!takeInventoryActionLock(player)) return;
        if (player.model !== MALE_FREE_MODE_HASH && player.model !== FEMALE_FREE_MODE_HASH) return;
        const c11 = player.getClothes(11);
        if (!c11 || c11.drawable === undefined) return;
        const d = Number(c11.drawable);
        const t = Number(c11.texture);
        if (!Number.isFinite(d) || !Number.isFinite(t)) return;
        const nextD = DONATE_TOP_TOGGLE_DRAWABLE[d];
        if (!Number.isFinite(nextD)) {
            isNotify(player, 2, 'top-mid', 'Этот верх нельзя переключить.', 2500);
            return;
        }
        const staticId = player.static;
        const fraction = player.getVariable('fraction');
        const fk = fractionKey(player);
        const defCur = findSellEntryForColumn('top', d, t, fk);
        let defNext = findSellEntryForColumn('top', nextD, t, fk);
        if (!defNext && defCur) {
            defNext = Object.assign({}, defCur, { Drawable: nextD });
        }
        if (!defCur || !defNext) {
            isNotify(player, 2, 'top-mid', 'Вариант не найден в каталоге.', 2500);
            return;
        }
        if (!donateSellRowByItemTop(defCur)) {
            isNotify(player, 2, 'top-mid', 'Только донат-худи с очками или Кофта Spider Man.', 3000);
            return;
        }
        const u8 = player.getClothes(8);
        const savedPatr = captureWornPatrontazh(player);
        player.setClothes(10, 0, 0, 0);
        applyTorsoForTopEquip(player, defNext, staticId, fraction);
        if (player.model === MALE_FREE_MODE_HASH || player.model === FEMALE_FREE_MODE_HASH) {
            if (u8 && u8.drawable !== undefined) {
                player.setClothes(8, u8.drawable, u8.texture, 0);
            } else {
                player.setClothes(8, 15, 0, 0);
            }
        }
        player.setClothes(11, nextD, t, 0);
        global.updateOrInsertClothes(staticId, fraction, 'top', `${nextD}:${t}`, () => {});
        if (u8 && u8.drawable !== undefined) {
            global.updateOrInsertClothes(staticId, fraction, 'undershirt', `${u8.drawable}:${u8.texture}`, () => {});
        }
        if (savedPatr) {
            reapplyWornPatrontazh(player, savedPatr, staticId, fraction);
        } else {
            global.updateOrInsertClothes(staticId, fraction, 'decals', null, () => {});
        }
        global.reapplyDonateGlovesIfEquipped(player);
        try {
            player.call('client:resetHatHairAfterClothing');
        } catch (_eC) {}
        global.emitPlayerInventory(player);
    } catch (e) {
        console.log(e);
    }
};

mp.events.add('inventory:equipItem:s', (player, itemStr) => {
    global.inventoryEquipItem(player, itemStr);
});

mp.events.add('inventory:unequipSlot:s', (player, slotKey) => {
    global.inventoryUnequipSlot(player, String(slotKey || ''));
});

mp.events.add('inventory:toggleDonateTopVariant:s', (player) => {
    global.toggleDonateTopVariant(player);
});

function patchEquippedBagIc1Drawable(player, nextD, texture) {
    const canon = player._bagEquipIc1;
    if (typeof canon !== 'string' || !canon.startsWith('ic1.')) return null;
    const base = ic1InventoryBase(canon);
    const payload = decodeIc1(base);
    if (!payload || Number(payload.cid) !== 8) return null;
    payload.d = Number(nextD);
    if (Number.isFinite(Number(texture))) payload.t = Number(texture);
    const next = encodeIc1(payload);
    const suffix = canon.length > base.length ? canon.slice(base.length) : '';
    player._bagEquipIc1 = next + suffix;
    if (typeof global.persistClothesBagsEquipIc1 === 'function') {
        global.persistClothesBagsEquipIc1(player);
    }
    const bagInst = Number(payload.bagInst);
    if (Number.isFinite(bagInst) && bagInst > 0) {
        global.DB.query(
            'UPDATE donate_bag_instances SET drawable = ?, texture = ? WHERE id = ? AND account_static = ?',
            [Number(nextD), Number(payload.t) || 0, bagInst, player.static],
            () => {}
        );
    }
    return payload;
}

global.toggleDonateBagVariant = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!takeInventoryActionLock(player)) return;
        const current = player.getClothes(5);
        if (!current || current.drawable === undefined) return;
        const d = Number(current.drawable);
        const t = Number(current.texture);
        const nextD = DONATE_BAG_TOGGLE_DRAWABLE[d];
        if (!Number.isFinite(nextD)) {
            return isNotify(player, 2, 'top-mid', 'Эту сумку нельзя переключить.', 2500);
        }
        const base =
            typeof player._bagEquipIc1 === 'string'
                ? player._bagEquipIc1.split('(')[0].trim()
                : '';
        const payload = base.startsWith('ic1.') ? decodeIc1(base) : null;
        const iid = payload ? Number(payload.iid) : NaN;
        if ((d === 127 || d === 128) && !LW_MESSENGER_BAG_ITEM_IDS[iid]) {
            return isNotify(player, 2, 'top-mid', 'Эту сумку нельзя переключить.', 2500);
        }
        if ((d === 114 || d === 115) && !GUARD_BAG_ITEM_IDS[iid]) {
            return isNotify(player, 2, 'top-mid', 'Эту сумку нельзя переключить.', 2500);
        }
        applyBagClothesToPed(player, nextD, t);
        global.updateOrInsertClothes(player.static, player.getVariable('fraction'), 'bags', `${nextD}:${t}`, () => {});
        patchEquippedBagIc1Drawable(player, nextD, t);
        global.emitPlayerInventory(player);
        const isAlt = nextD === 115 || nextD === 128;
        isNotify(player, 3, 'top-mid', isAlt ? 'Сумка: альтернативный вид.' : 'Сумка: основной вид.', 2000);
    } catch (e) {
        console.log('[toggleDonateBagVariant]', e);
    }
};

mp.events.add('inventory:toggleDonateBagVariant:s', (player) => {
    global.toggleDonateBagVariant(player);
});

function patchEquipIc1DrawableForSlot(player, slotKey, nextD, texture) {
    const field = slotKey === 'headwear' ? '_headwearEquipIc1' : null;
    if (!field) return;
    const canon = player[field];
    if (typeof canon !== 'string' || !canon.startsWith('ic1.')) return;
    const base = ic1InventoryBase(canon);
    const payload = decodeIc1(base);
    if (!payload) return;
    payload.d = Number(nextD);
    if (Number.isFinite(Number(texture))) payload.t = Number(texture);
    if (Number(payload.iid) >= 91001 && typeof global.spectrumPreviewImg === 'function') {
        payload.img = global.spectrumPreviewImg(payload.cid, nextD, payload.t);
    }
    const next = encodeIc1(payload);
    const suffix = canon.length > base.length ? canon.slice(base.length) : '';
    player[field] = next + suffix;
}

global.toggleSpectrumClothVariant = function (player, kind) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!takeInventoryActionLock(player)) return;
        const staticId = player.static;
        const fraction = player.getVariable('fraction');
        if (kind === 'mask') {
            const current = player.getClothes(1);
            if (!current || current.drawable === undefined) return;
            const d = Number(current.drawable);
            const t = Number(current.texture);
            const nextD = spectrumToggleNextDrawable(2, d);
            if (!Number.isFinite(nextD)) {
                return isNotify(player, 2, 'top-mid', 'Эту маску нельзя переключить.', 2500);
            }
            player.setClothes(1, nextD, t, 0);
            global.updateOrInsertClothes(staticId, fraction, 'masks', `${nextD}:${t}`, () => {});
            global.emitPlayerInventory(player);
            isNotify(player, 3, 'top-mid', nextD === 259 ? 'Маска: альтернативный вид.' : 'Маска: основной вид.', 2000);
            return;
        }
        if (kind === 'hat' || kind === 'headwear') {
            const current = player.getProp(0);
            if (!current || current.drawable === undefined) return;
            const d = Number(current.drawable);
            const t = Number(current.texture);
            const nextD = spectrumToggleNextDrawable(1, d);
            if (!Number.isFinite(nextD)) {
                return isNotify(player, 2, 'top-mid', 'Эту кепку нельзя переключить.', 2500);
            }
            player.setProp(0, nextD, t);
            syncPropToClientAfterServerSet(player, 0, nextD, t);
            global.updateOrInsertClothes(staticId, fraction, 'headwear', `${nextD}:${t}`, () => {});
            patchEquipIc1DrawableForSlot(player, 'headwear', nextD, t);
            global.emitPlayerInventory(player);
            isNotify(player, 3, 'top-mid', nextD === 252 ? 'Кепка: альтернативный вид.' : 'Кепка: основной вид.', 2000);
        }
    } catch (e) {
        console.log('[toggleSpectrumClothVariant]', e);
    }
};

mp.events.add('inventory:toggleSpectrumCloth:s', (player, kind) => {
    global.toggleSpectrumClothVariant(player, String(kind || ''));
});

global.inventoryMakeClothToken = function (sellItem, bagInstanceDbId) {
    if (!sellItem) return null;
    const payload = {
        cid: sellItem.ClothID,
        iid: sellItem.ItemID,
        fr: sellItem.Frac,
        d: sellItem.Drawable,
        t: sellItem.TopTexture,
        nm: sellItem.ItemName
    };
    if (sellItem.ItemImg && typeof sellItem.ItemImg === 'string') payload.img = sellItem.ItemImg;
    if (!payload.img && Number(sellItem.ClothID) === 9 && Number(sellItem.Drawable) === 305) {
        const tex = Number(sellItem.TopTexture);
        const colorNum = tex >= 0 && tex <= 2 ? tex + 1 : 1;
        payload.img = 'patrontazh_' + colorNum + '.png';
    }
    if (!payload.img && Number(sellItem.ClothID) === 5 && Number(sellItem.Drawable) === 173) {
        const tex = Number(sellItem.TopTexture) || 0;
        payload.img = 'ItemsMale/Shoes/173_' + tex + '.jpg';
    }
    if (sellItem.webPait) payload.wp = 1;
    const bid = bagInstanceDbId != null ? Number(bagInstanceDbId) : NaN;
    if (Number(sellItem.ClothID) === 8 && Number.isFinite(bid) && bid > 0) payload.bagInst = bid;
    return encodeIc1(payload);
};
