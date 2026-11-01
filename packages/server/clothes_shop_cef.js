'use strict';

/**
 * Adapter for the original GTA5RP clothes-shop CEF from menu_shop_clothes.
 * The browser stays byte-for-byte identical to the source project; this file
 * converts FLOW catalogues to the payload expected by that UI.
 */

const { isRegularShopBlockedRow } = require('./config/regular_shop_blocked');
const {
    regularCashPrice,
    premiumCashPrice,
    spectrumDpPrice
} = require('./config/clothing_economy');

const VALID_MODES = new Set(['regular', 'donate', 'spectrum']);
const FEMALE_MODEL = mp.joaat('mp_f_freemode_01');

/** FLOW ClothID -> GTA5RP shop_clothes bodyPart. */
const CLOTH_TO_BODY_PART = Object.freeze({
    1: 0,
    2: 1,
    3: 11,
    4: 4,
    5: 6,
    6: 7,
    7: -1,
    8: 5,
    9: 10,
    12: -2,
    13: -6,
    14: -7,
    15: 3
});

/** Вкладка «Эксклюзив» в Spectrum (пеинты, патронтаж). */
const SPECTRUM_EXCLUSIVE_BODY_PART = -88;

/** Кэш каталога магазина (mode|gender|frac) — не гоняем 5k+ строк и JSON на каждое открытие. */
const shopPayloadCache = new Map();

function shopCacheKey(mode, isFemale, preferredFraction) {
    return `${mode}|${isFemale ? 'f' : 'm'}|${preferredFraction}`;
}

function notify(player, text) {
    if (!mp.players.exists(player)) return;
    if (typeof global.isNotify === 'function') {
        global.isNotify(player, 2, 'top-mid', text, 3500);
        return;
    }
    if (typeof isNotify === 'function') isNotify(player, 2, 'top-mid', text, 3500);
}

function playerFraction(player) {
    const variable = Number(player.getVariable('fraction'));
    const property = Number(player.fraction);
    if (Number.isFinite(variable) && variable >= 1 && variable <= 6) return variable;
    if (Number.isFinite(property) && property >= 1 && property <= 6) return property;
    return 1;
}

function catalogueForMode(mode) {
    if (mode === 'regular') return global.ClothesItemsSell;
    if (mode === 'donate') return global.DonateClothesItemsSell;
    if (mode === 'spectrum') return global.SpectrumClothesItemsSell;
    return null;
}

function priceForMode(mode, row) {
    if (mode === 'regular') return regularCashPrice(row);
    if (mode === 'donate') return premiumCashPrice(row);
    return spectrumDpPrice(row);
}

function displayName(row) {
    const raw = String((row && row.ItemName) || 'Одежда').trim();
    const suffix = raw.match(/\s*[·•-]\s*(?:текст|text)\.(\d+)\s*$/i);
    let name = suffix ? raw.slice(0, suffix.index).trim() : raw;
    name = name.replace(/\s*\(\d+\s*слотов\)/gi, '').trim();
    return name || 'Одежда';
}

function normalizedTorso(row) {
    const raw = row && row.Torso;
    if (raw === null || raw === undefined || raw === '' || raw === 'null') return null;
    const value = Number(String(raw).trim().split(':')[0]);
    return Number.isFinite(value) && value >= 0 ? value : null;
}

function rowAllowed(mode, row, isFemale) {
    if (!row) return false;
    const cid = Number(row.ClothID);
    const itemId = Number(row.ItemID);
    const drawable = Number(row.Drawable);
    const texture = Number(row.TopTexture);
    const isSpectrumExclusive = mode === 'spectrum' && row.spectrumExclusive === true;
    if (!isSpectrumExclusive && CLOTH_TO_BODY_PART[cid] === undefined) return false;
    if (isSpectrumExclusive && cid !== 5 && cid !== 9) return false;
    if (![itemId, drawable, texture].every(Number.isFinite)) return false;

    if (mode === 'regular') {
        const name = String(row.ItemName || '').trim().toLowerCase();
        if (itemId === 999 || itemId === 99999 || name === 'снять' || name === 'bagsdef') return false;
        if (Number(row.Price) > 999999 || isRegularShopBlockedRow(row)) return false;
        if ((itemId >= 10000) !== isFemale) return false;
    }

    if (mode === 'spectrum' && (itemId < 91001 || itemId > 99999)) return false;
    return priceForMode(mode, row) > 0;
}

function choosePreferredVariant(current, candidate, preferredFraction) {
    if (!current) return candidate;
    const currentPreferred = Number(current.Frac) === preferredFraction;
    const candidatePreferred = Number(candidate.Frac) === preferredFraction;
    if (candidatePreferred && !currentPreferred) return candidate;
    return current;
}

function buildShopPayload(player, mode) {
    const catalogue = mode==='regular'&&typeof global.legacyRegularClothesCatalogue==='function'?global.legacyRegularClothesCatalogue(player):catalogueForMode(mode);
    if (!Array.isArray(catalogue) || !catalogue.length) return null;

    const isFemale = player.model === FEMALE_MODEL;
    const preferredFraction = playerFraction(player);
    const cacheKey = shopCacheKey(mode, isFemale, preferredFraction)+':'+JSON.stringify(player._legacy26Styles||null)+':'+(global.legacyPriceRevision||0);
    const cached = shopPayloadCache.get(cacheKey);
    if (cached) {
        return {
            payload: cached.payload,
            meta: cached.meta,
            payloadJson: cached.payloadJson
        };
    }

    const grouped = new Map();

    for (let i = 0; i < catalogue.length; i++) {
        const row = catalogue[i];
        if (Number(row.Frac) !== preferredFraction) continue;
        if (!rowAllowed(mode, row, isFemale)) continue;

        const cid = Number(row.ClothID);
        const drawable = Number(row.Drawable);
        const price = priceForMode(mode, row);
        const torso = normalizedTorso(row);
        const charmOnly = row.spectrumCharmOnly === true;
        const exclusive = mode === 'spectrum' && row.spectrumExclusive === true;
        const key = [cid, drawable, price, torso == null ? 'n' : torso, charmOnly ? 1 : 0, exclusive ? 1 : 0].join(':');
        let group = grouped.get(key);
        if (!group) {
            group = {
                cid,
                drawable,
                price,
                torso,
                charmOnly,
                exclusive,
                name: exclusive
                    ? String(row.ItemName || '')
                          .split(' · ')[0]
                          .trim() || displayName(row)
                    : displayName(row),
                variants: new Map()
            };
            grouped.set(key, group);
        }

        const variantKey = `${drawable}:${Number(row.TopTexture)}`;
        group.variants.set(
            variantKey,
            choosePreferredVariant(group.variants.get(variantKey), row, preferredFraction)
        );
    }

    const groups = [...grouped.values()].sort((a, b) => {
        if (a.cid !== b.cid) return a.cid - b.cid;
        if (a.drawable !== b.drawable) return a.drawable - b.drawable;
        if (a.price !== b.price) return a.price - b.price;
        return a.name.localeCompare(b.name, 'ru');
    });

    const list = [];
    const meta = [];
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const rows = [...group.variants.values()].sort((a, b) => {
            const textureDiff = Number(a.TopTexture) - Number(b.TopTexture);
            if (textureDiff) return textureDiff;
            return Number(a.Frac) - Number(b.Frac);
        });
        if (!rows.length) continue;

        const index = list.length;
        const previewBodyPart = CLOTH_TO_BODY_PART[group.cid];
        const bodyPart = group.exclusive ? SPECTRUM_EXCLUSIVE_BODY_PART : previewBodyPart;
        const textures = rows.map((row) => Number(row.TopTexture) || 0);
        const pieces = [[previewBodyPart, group.drawable, textures[0] || 0]];
        if (group.cid === 3) {
            pieces.push([3, group.torso == null ? 15 : group.torso, 0]);
            pieces.push([8, player.model === FEMALE_MODEL ? 6 : 15, 0]);
        }

        list.push({
            i: index,
            price: group.price,
            clothId: group.cid,
            torso: group.torso,
            previewDisabled: group.charmOnly,
            clothes: [
                bodyPart,
                group.drawable,
                textures,
                pieces,
                group.name
            ]
        });
        meta.push(rows);
    }

    if (!list.length) return null;
    const payload = {
        mode,
        '\u0441urrency': mode === 'spectrum' ? ' DP' : '$',
        isMan: !isFemale,
        list
    };
    const payloadJson = JSON.stringify(payload);
    const built = { payload, meta, payloadJson };
    shopPayloadCache.set(cacheKey, built);
    return built;
}

global.openFlowClothesShopUi = function openFlowClothesShopUi(player, requestedMode) {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return false;
        const mode = String(requestedMode || player._clothesShopSession || '');
        if (!VALID_MODES.has(mode) || player._clothesShopSession !== mode) return false;

        const built = buildShopPayload(player, mode);
        if (!built) {
            notify(player, 'Каталог магазина одежды пуст или не загружен.');
            player._flowClothesUiMeta = null;
            return false;
        }

        player._flowClothesUiMeta = {
            mode,
            groups: built.meta,
            openedAt: Date.now()
        };
        player.call('flowClothesShop:open:c', [built.payloadJson || JSON.stringify(built.payload)]);
        return true;
    } catch (error) {
        console.log('[clothes_shop_cef open]', error);
        if (mp.players.exists(player)) player._flowClothesUiMeta = null;
        return false;
    }
};

function resolveSelectedRow(player, listIndex, colorIndex) {
    const state = player && player._flowClothesUiMeta;
    if (!state || state.mode !== player._clothesShopSession || !Array.isArray(state.groups)) return null;
    const groupIndex = Number(listIndex);
    const variantIndex = Number(colorIndex);
    if (!Number.isInteger(groupIndex) || !Number.isInteger(variantIndex)) return null;
    const group = state.groups[groupIndex];
    if (!Array.isArray(group) || variantIndex < 0 || variantIndex >= group.length) return null;
    return group[variantIndex] || null;
}

function dispatchPurchase(player, mode, row) {
    const args = [
        player,
        row.ClothID,
        row.ItemID,
        row.ItemName,
        row.Frac,
        row.Drawable,
        row.TopTexture
    ];
    if (mode === 'regular') mp.events.call('clothes:buy:s', ...args);
    else if (mode === 'donate') mp.events.call('clothes:buy:donate:s', ...args);
    else mp.events.call('clothes:buy:spectrum:s', ...args);
}

function ensureRpc() {
    if (global.rpc) return global.rpc;
    try {
        global.rpc = require('./rage-rpc.min.js');
    } catch (error) {
        console.log('[clothes_shop_cef rpc]', error);
    }
    return global.rpc || null;
}

const rpc = ensureRpc();
if (rpc && typeof rpc.register === 'function') {
    rpc.register('server_donateClothesShop_buy', (args, info) => {
        const player = info && info.player;
        if (!player || !mp.players.exists(player) || player.getVariable('auth') !== true) return false;
        if (player.getVariable('shopc') !== true || !VALID_MODES.has(player._clothesShopSession)) return false;

        const listIndex = Array.isArray(args) ? Number(args[1]) : NaN;
        const colorIndex = Array.isArray(args) ? Number(args[2]) : NaN;
        const row = resolveSelectedRow(player, listIndex, colorIndex);
        if (!row) {
            notify(player, 'Выбранная позиция больше недоступна.');
            return false;
        }

        dispatchPurchase(player, player._clothesShopSession, row);
        return true;
    });
}

mp.events.add('clothes:close:s', (player) => {
    if (player) player._flowClothesUiMeta = null;
});

mp.events.add('playerQuit', (player) => {
    if (player) player._flowClothesUiMeta = null;
});

module.exports = {
    buildShopPayload
};
