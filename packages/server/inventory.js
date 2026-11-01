const bandolierStorage = require('./config/bandolier');
const { getWeaponWorldModel, getWeaponDropZOffset } = require('./config/weapon_world_models.js');
const {
    fastSlotFindConflict,
    fastSlotConflictMessage
} = require('./config/weapon_fast_slot_calibers.js');

const weaponNames = {
    item_spank: "Спанк",
    item_materials: "Материалы",
    item_bong: "Трубка Bong",
    item_drone: "Дрон",
    item_thermos: "Термокружка",
    item_alco: "Медовуха",
    item_skateboard: "Скейтборд",
    "weapon_heavyshotgun": "Heavy Shotgun",
    "weapon_carbinerifle": "Carabine Rifle",
    "weapon_assaultrifle": "Assault Rifle",
    "weapon_assaultshotgun": "Assault Shotgun",
    "weapon_combatmg": "Combat MG",
    "weapon_combatmg_mk2": "Combat MG MKII",
    "weapon_minismg": "Mini SMG",
    "weapon_militaryrifle": "Military Rifle",
    "weapon_sniperrifle": "Sniper Rifle",
    "weapon_heavysniper": "Heavy Sniper MK1",
    "weapon_heavysniper_mk2": "Heavy Sniper MKII",
    "weapon_marksmanrifle": "Marksman Rifle",
    "weapon_specialcarbine": "Special Carbine",
    "weapon_specialcarbine_mk2": "Special Carbine MK2",
    "weapon_precisionrifle": "Precision Rifle",
    "weapon_revolver": "Revolver",
    "weapon_revolver_mk2": "Revolver MKII",
    "weapon_navyrevolver": "Navy Revolver",
    "weapon_musket": "Musket",
    "weapon_gadgetpistol": "Gadget Pistol",
    "weapon_pumpshotgun": "Pump Shotgun",
    "weapon_pumpshotgun_mk2": "Pump Shotgun MKII",
    "weapon_sawnoffshotgun": "Sawed-Off Shotgun",
    "weapon_bullpupshotgun": "Bullpup Shotgun",
    "weapon_dbshotgun": "Double Barrel Shotgun",
    "weapon_autoshotgun": "Sweeper Shotgun",
    "weapon_pistol": "Pistol",
    "weapon_pistol_mk2": "Pistol MKII",
    "weapon_combatpistol": "Combat Pistol",
    "weapon_appistol": "AP Pistol",
    "weapon_microsmg": "Micro SMG",
    "weapon_smg": "SMG",
    "weapon_smg_mk2": "SMG MKII",
    "weapon_assaultsmg": "Assault SMG",
    "weapon_gusenberg": "Gusenberg Sweeper",
    "weapon_machinepistol": "Machine Pistol",
    "weapon_raypistol": "Up-n-Atomizer",
    "weapon_doubleaction": "Double-Action Revolver"
};

function humanizeWeaponId(id) {
    if (!id || typeof id !== "string" || !id.startsWith("weapon_")) return id;
    const s = id.slice(7);
    return s.split("_").map((part) => {
        if (part.toLowerCase() === "mk2") return "MKII";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join(" ");
}

global.formweap = function(name) {
    if (!name || typeof name !== "string") return name;
    const base = String(name).split('#')[0].split('(')[0].trim();
    if (weaponNames[base]) return weaponNames[base];
    if (base.toLowerCase().startsWith('item_skateboard')) return 'Скейтборд';
    return humanizeWeaponId(base);
};

function getWeaponModel(name) {
    return getWeaponWorldModel(name);
}

global._weaponDropPending = global._weaponDropPending || {};
global._invDropPending = global._invDropPending || {};

const IVHOL_ACCOUNT_COL = { cobura: true, coburaw: true };

/** Колонка accounts: JSON { own, pending } — учёт одной донат-сумки на аккаунт (не по фракциям). Старое имя donate_bags_frac всё ещё читается при загрузке. */
const ACCOUNT_DONATE_BAG_STATE_COL = 'donate_bag_state';

/** Метаданные для подбора/выброса ivhol/ivbag: sql-колонка (если есть) и ключ сумки для donate_bag_state. */
function resolveInvDonateDropMeta(token) {
    let s = String(token || '').replace(/^\uFEFF/, '').trim().split('(')[0].trim();
    if (typeof global.canonicalDonateToken === 'function' && (s.startsWith('ivhol:') || s.startsWith('ivbag:'))) {
        s = global.canonicalDonateToken(s);
    }
    if (s.startsWith('ivhol:')) {
        const k = s.slice(6);
        if (!IVHOL_ACCOUNT_COL[k]) return null;
        return { sqlCol: k, bagKey: null };
    }
    if (s.startsWith('ivbag:')) {
        const k = s.slice(6);
        if (!global.DONATE_BAGS_REGISTRY || !global.DONATE_BAGS_REGISTRY[k]) return null;
        const sqlCol = global.IVBAG_LEGACY_SQL_KEYS[k] ? k : null;
        return { sqlCol, bagKey: k };
    }
    return null;
}

/** Одна запись на аккаунт: ключ реестра ivbag/dbag + очередь ic1-сумок, если не влезли в сетку (колонка donate_bag_state). */
global.ensurePlayerDonateBagStateShape = function (player) {
    if (!mp.players.exists(player)) return;
    if (player._donateBagOwnKey === undefined) player._donateBagOwnKey = null;
    if (!Array.isArray(player._donateBagIc1Pending)) player._donateBagIc1Pending = [];
    if (player._donateBagIc1Stash && typeof player._donateBagIc1Stash === 'object' && !Array.isArray(player._donateBagIc1Stash)) {
        for (let i = 1; i <= 6; i++) {
            const a = player._donateBagIc1Stash[String(i)];
            if (!Array.isArray(a)) continue;
            for (let j = 0; j < a.length; j++) {
                const x = a[j];
                if (typeof x === 'string' && x.startsWith('ic1.')) player._donateBagIc1Pending.push(x);
            }
        }
        delete player._donateBagIc1Stash;
    }
    try {
        delete player._donateBagsFracMap;
    } catch (_e) {}
};

/** Разбор JSON сумки: { own, pending }, legacy 1..6 + _ic1stash; колонка donate_bag_state или легаси donate_bags_frac. */
global.parseDonateBagsFracMapAndStashFromAccountRow = function (row) {
    let ownKey = null;
    let wearIvbagInst = null;
    const pending = [];
    const pushPendingArr = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const x = arr[i];
            if (typeof x === 'string' && x.startsWith('ic1.')) pending.push(x);
        }
    };
    let raw = null;
    if (row) {
        const vNew = row[ACCOUNT_DONATE_BAG_STATE_COL];
        const vOld = row.donate_bags_frac;
        if (vNew != null && String(vNew).trim() !== '') raw = vNew;
        else if (vOld != null && String(vOld).trim() !== '') raw = vOld;
    }
    if (raw != null && String(raw).trim() !== '') {
        try {
            const o = JSON.parse(String(raw));
            if (o && typeof o === 'object') {
                if (
                    o.own != null &&
                    o.own !== '' &&
                    global.DONATE_BAGS_REGISTRY &&
                    global.DONATE_BAGS_REGISTRY[String(o.own)]
                )
                    ownKey = String(o.own);
                if (o.pending && Array.isArray(o.pending)) pushPendingArr(o.pending);
                if (o._ic1stash && typeof o._ic1stash === 'object') {
                    for (let i = 1; i <= 6; i++) pushPendingArr(o._ic1stash[String(i)]);
                }
                if (ownKey == null) {
                    for (let i = 1; i <= 6; i++) {
                        const v = o[String(i)];
                        if (v != null && v !== '' && global.DONATE_BAGS_REGISTRY && global.DONATE_BAGS_REGISTRY[String(v)]) {
                            ownKey = String(v);
                            break;
                        }
                    }
                }
                if (o.wearIvbagInst != null) {
                    const w = parseInt(String(o.wearIvbagInst), 10);
                    if (Number.isFinite(w) && w > 0) wearIvbagInst = w;
                }
            }
        } catch (_e) {}
    }
    /** Легаси bag_* в accounts больше не задают ownKey: только JSON donate_bag_state / donate_bags_frac (иначе «фантом» после удаления сумки). */
    const seen = new Set();
    const pendOut = [];
    for (let p = 0; p < pending.length; p++) {
        const t = pending[p];
        const b = t.split('(')[0].trim();
        if (seen.has(b)) continue;
        seen.add(b);
        pendOut.push(t);
    }
    return { ownKey, pending: pendOut, wearIvbagInst };
};

/** Совместимость: вернуть только ключ сумки (для syncDonateMirrorItems). */
global.parseDonateBagsFracMapFromAccountRow = function (row) {
    return global.parseDonateBagsFracMapAndStashFromAccountRow(row || {}).ownKey;
};

global.hydratePlayerDonateBagsFrac = function (player, row) {
    if (!mp.players.exists(player)) return;
    const full = global.parseDonateBagsFracMapAndStashFromAccountRow(row || {});
    player._donateBagOwnKey = full.ownKey;
    player._donateBagIc1Pending = full.pending;
    try {
        if (full.wearIvbagInst > 0) player._ivbagWearResolvedInstId = full.wearIvbagInst;
    } catch (_eW) {}
    try {
        delete player._donateBagsFracMap;
        delete player._donateBagIc1Stash;
    } catch (_e) {}
};

global.serializeDonateBagsFracForDb = function (player) {
    try {
        const o = { own: null, pending: [] };
        if (mp.players.exists(player)) {
            if (player._donateBagOwnKey != null && player._donateBagOwnKey !== '') o.own = player._donateBagOwnKey;
            if (Array.isArray(player._donateBagIc1Pending)) o.pending = player._donateBagIc1Pending.slice();
            const w = Number(player._ivbagWearResolvedInstId);
            if (Number.isFinite(w) && w > 0) o.wearIvbagInst = w;
        }
        return JSON.stringify(o);
    } catch (_e) {
        return '{"own":null,"pending":[]}';
    }
};

global.clearPlayerDonateBagFracIfHoldingKey = function (player, bagKey) {
    if (!mp.players.exists(player) || bagKey == null || bagKey === '') return;
    if (String(player._donateBagOwnKey) === String(bagKey)) player._donateBagOwnKey = null;
};

/** Устанавливает единственный ключ донат-сумки на аккаунт (имя «…ForCurrentFraction» — легаси, фракция не учитывается). */
global.markPlayerDonateBagOwnedForCurrentFraction = function (_player, _bagKey) {};

function donateDropDisplayName(token) {
    const s = String(token);
    if (s.startsWith('frdef:') && typeof global.clothTokenDropLabel === 'function') {
        const nm = global.clothTokenDropLabel(s);
        if (nm) {
            return typeof global.clothDisplayShortName === 'function' ? global.clothDisplayShortName(nm) : nm;
        }
    }
    if (s.startsWith('ic1.') && typeof global.clothTokenDropLabel === 'function') {
        const nm = global.clothTokenDropLabel(s);
        if (nm) {
            return typeof global.clothDisplayShortName === 'function' ? global.clothDisplayShortName(nm) : nm;
        }
    }
    if (s === 'ivhol:cobura') return 'Чёрная Кобура';
    if (s === 'ivhol:coburaw') return 'Белая Кобура';
    if (s.startsWith('ivbag:')) {
        const k = s.slice(6);
        const reg = global.DONATE_BAGS_REGISTRY;
        if (reg && reg[k] && reg[k].name) return reg[k].name;
        return 'Сумка';
    }
    return 'Предмет';
}

function accountColumnForDonateToken(token) {
    let s = String(token).replace(/^\uFEFF/, '').trim().split('(')[0].trim();
    if (typeof global.canonicalDonateToken === 'function' && (s.startsWith('ivhol:') || s.startsWith('ivbag:'))) {
        s = global.canonicalDonateToken(s);
    }
    if (s.startsWith('ivhol:')) {
        const k = s.slice(6);
        return IVHOL_ACCOUNT_COL[k] ? k : null;
    }
    if (s.startsWith('ivbag:')) {
        const k = s.slice(6);
        if (!global.DONATE_BAGS_REGISTRY || !global.DONATE_BAGS_REGISTRY[k]) return null;
        return global.IVBAG_LEGACY_SQL_KEYS[k] ? k : null;
    }
    return null;
}

function groundPickupLabelText(title) {
    return String(title || '').trim();
}

function pickupColshapeDimension(player) {
    const d = Number(player && player.dimension);
    return Number.isFinite(d) ? d : 0;
}

function colshapeMatchesPlayerDimension(colshape, playerDim) {
    try {
        if (!colshape) return false;
        const stored = colshape.getVariable && colshape.getVariable('pickupDimension');
        if (stored !== undefined && stored !== null) {
            return Number(stored) === Number(playerDim);
        }
        if (colshape.dimension !== undefined && colshape.dimension !== null) {
            return Number(colshape.dimension) === Number(playerDim);
        }
    } catch (_e) {}
    return Number(playerDim) === 0;
}

function spawnInvTokenPickupAt(player, position, invToken) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const label = donateDropDisplayName(invToken);
        const modelName = String(invToken).startsWith('ivbag:') ? 'prop_cs_heist_bag_02' : 'prop_security_case_01';
        const droppedObj = global.creatorObjectsNew(mp.joaat(modelName), position, {
            rotation: new mp.Vector3(0, 0, 0),
            dimension: player.dimension
        });
        const dim = pickupColshapeDimension(player);
        const colshape = global.creatorShapeSphere(position.x, position.y, position.z, WEAPON_PICKUP_COLSHAPE_RADIUS, dim);
        if (!colshape) return;
        colshape.setVariable('pickupDimension', dim);
        colshape.setVariable('weaponName', invToken);
        colshape.setVariable('FixWeaponName', label);
        colshape.setVariable('isWeaponPickup', true);
        colshape.setVariable('isInvDonateDrop', true);
        colshape.setVariable('droppedWeapon', droppedObj);
        colshape.setVariable('textLabel', null);
        scheduleRefreshPlayersNearWeaponPickupPos(position, dim);
        setTimeout(() => {
            if (colshape && mp.colshapes.exists(colshape)) {
                destroyWeaponPickupWorld(colshape);
            }
        }, 500000);
    } catch (e) {
        console.log(e);
    }
}

function spawnInvTokenWorldPickup(player, position, invToken) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const it = String(invToken);
        const token = `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        const fallbackZ = position.z - 1.0;
        global._invDropPending[token] = {
            static: player.static,
            x: position.x,
            y: position.y,
            z: position.z,
            dimension: player.dimension,
            invToken: it
        };
        const t = setTimeout(() => {
            const p = global._invDropPending[token];
            if (!p) return;
            delete global._invDropPending[token];
            if (!mp.players.exists(player)) return;
            spawnInvTokenPickupAt(player, new mp.Vector3(p.x, p.y, fallbackZ), p.invToken);
        }, 2800);
        global._invDropPending[token].timeoutId = t;
        try {
            player.call('invDropRequestGround', [token, position.x, position.y, position.z, player.dimension, it]);
        } catch (_callErr) {
            delete global._invDropPending[token];
            clearTimeout(t);
            spawnInvTokenPickupAt(player, new mp.Vector3(position.x, position.y, fallbackZ), it);
        }
    } catch (e) {
        console.log(e);
    }
}

/** Финальный спавн дропа по уже рассчитанной позиции (земля + offset). */
function spawnWeaponWorldPickupAt(player, position, base) {
    try {
        if (!mp.players.exists(player) || !position) return;
        if (!base.startsWith('weapon_') || base === 'weapon_revolver') return;

        const FixWeaponName = global.formweap(base);
        const weaponModel = getWeaponModel(base);

        const droppedWeapon = global.creatorObjectsNew(mp.joaat(weaponModel), position, {
            rotation: new mp.Vector3(0, 0, 0),
            dimension: player.dimension
        });

        const dim = pickupColshapeDimension(player);
        const colshape = global.creatorShapeSphere(position.x, position.y, position.z, WEAPON_PICKUP_COLSHAPE_RADIUS, dim);
        if (!colshape) return;

        colshape.setVariable('pickupDimension', dim);
        colshape.setVariable('weaponName', base);
        colshape.setVariable('weaponModel', weaponModel);
        colshape.setVariable('FixWeaponName', FixWeaponName);
        colshape.setVariable('isWeaponPickup', true);
        colshape.setVariable('textLabel', null);
        colshape.setVariable('droppedWeapon', droppedWeapon);
        scheduleRefreshPlayersNearWeaponPickupPos(position, dim);

        setTimeout(() => {
            if (colshape && mp.colshapes.exists(colshape)) {
                destroyWeaponPickupWorld(colshape);
            }
        }, 500000);
    } catch (e) {
        console.log(e);
    }
}

/**
 * Спавн дропа: клиент считает высоту земли (иначе модели висят на z игрока).
 */
function spawnWeaponWorldPickup(player, position, itemKey) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const raw = String(itemKey || '');
        const base = raw.split('(')[0].trim();
        if (!base.startsWith('weapon_') || base === 'weapon_revolver') return;

        const token = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        const offset = getWeaponDropZOffset(base);
        const fallbackZ = position.z - 1.0 + offset;

        global._weaponDropPending[token] = {
            static: player.static,
            x: position.x,
            y: position.y,
            z: position.z,
            dimension: player.dimension,
            base,
            offset
        };

        const t = setTimeout(() => {
            const p = global._weaponDropPending[token];
            if (!p) return;
            delete global._weaponDropPending[token];
            if (!mp.players.exists(player)) return;
            spawnWeaponWorldPickupAt(player, new mp.Vector3(p.x, p.y, fallbackZ), p.base);
        }, 2800);

        global._weaponDropPending[token].timeoutId = t;

        try {
            player.call('weaponDropRequestGround', [token, position.x, position.y, position.z, player.dimension, base]);
        } catch (_callErr) {
            delete global._weaponDropPending[token];
            clearTimeout(t);
            spawnWeaponWorldPickupAt(player, new mp.Vector3(position.x, position.y, fallbackZ), base);
        }
    } catch (e) {
        console.log(e);
    }
}

mp.events.add('weaponDropGroundReady', (player, token, groundZ) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const consumP = global._consumDropPending && global._consumDropPending[token];
        if (consumP) {
            if (consumP.static !== player.static) return;
            delete global._consumDropPending[token];
            if (consumP.timeoutId) clearTimeout(consumP.timeoutId);
            const gz = Number(groundZ);
            const finalZ = (isFinite(gz) && gz > 0 && Math.abs(gz - consumP.z) <= 85) ? gz + 0.02 : consumP.z - 1.0;
            spawnConsumableWorldPickupAt(player, new mp.Vector3(consumP.x, consumP.y, finalZ), consumP.item);
            return;
        }

        const p = global._weaponDropPending[token];
        if (!p) return;
        if (p.static !== player.static) return;

        delete global._weaponDropPending[token];
        if (p.timeoutId) clearTimeout(p.timeoutId);

        const gz = Number(groundZ);
        let finalZ;
        if (!isFinite(gz) || gz <= 0) {
            finalZ = p.z - 1.0 + p.offset;
        } else if (Math.abs(gz - p.z) > 85) {
            finalZ = p.z - 1.0 + p.offset;
        } else {
            finalZ = gz + p.offset;
        }

        spawnWeaponWorldPickupAt(player, new mp.Vector3(p.x, p.y, finalZ), p.base);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('invDropGroundReady', (player, token, groundZ) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const p = global._invDropPending[token];
        if (!p) return;
        if (p.static !== player.static) return;

        delete global._invDropPending[token];
        if (p.timeoutId) clearTimeout(p.timeoutId);

        const gz = Number(groundZ);
        let finalZ;
        if (!isFinite(gz) || gz <= 0) {
            finalZ = p.z - 1.0;
        } else if (Math.abs(gz - p.z) > 85) {
            finalZ = p.z - 1.0;
        } else {
            finalZ = gz + 0.02;
        }

        spawnInvTokenPickupAt(player, new mp.Vector3(p.x, p.y, finalZ), p.invToken);
    } catch (e) {
        console.log(e);
    }
});

global._consumDropPending = global._consumDropPending || {};

/** Финальный спавн подбираемого объекта-расходника (спанк/алко/бонг) на земле. */
function spawnConsumableWorldPickupAt(player, position, itemKey) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const item = String(itemKey || '');
        const base = item.split('(')[0].trim();
        const m = item.match(/\((\d+)\)/);
        const qty = m ? parseInt(m[1], 10) : 1;

        let model, displayName;
        if (base === 'item_spank') {
            model = 'prop_drug_package_02';
            displayName = qty > 1 ? `Спанк (${qty})` : 'Спанк';
        } else if (base === 'item_alco') {
            model = 'p_cs_bottle_01';
            displayName = qty > 1 ? `Медовуха (${qty})` : 'Медовуха';
        } else if (base === 'item_thermos') {
            model = 'shr_thermos';
            displayName = 'Термокружка';
        } else if (base === 'item_bong') {
            model = 'prop_bong_01';
            displayName = weaponNames.item_bong || 'Трубка Bong';
        } else if (base === 'item_drone') {
            model = 'ch_prop_casino_drone_02a';
            displayName = weaponNames.item_drone || 'Дрон';
        } else if (base === 'Бронежилет') {
            model = 'prop_bodyarmour_03';
            displayName = qty > 1 ? `Бронежилет (${qty})` : 'Бронежилет';
        } else if (base === 'Аптечка') {
            model = 'prop_ld_health_pack';
            displayName = qty > 1 ? `Аптечка (${qty})` : 'Аптечка';
        } else {
            model = 'prop_bong_01';
            displayName = weaponNames.item_bong || 'Трубка Bong';
        }

        let modelHash;
        try { modelHash = mp.joaat(model); } catch (_e) { modelHash = mp.joaat('prop_bong_01'); }

        const droppedObj = global.creatorObjectsNew(modelHash, position, {
            rotation: new mp.Vector3(0, 0, 0),
            dimension: player.dimension
        });

        const dim = pickupColshapeDimension(player);
        const colshape = global.creatorShapeSphere(position.x, position.y, position.z, WEAPON_PICKUP_COLSHAPE_RADIUS, dim);
        if (!colshape) { if (droppedObj && mp.objects.exists(droppedObj)) droppedObj.destroy(); return; }

        colshape.setVariable('pickupDimension', dim);
        colshape.setVariable('isWeaponPickup', true);
        colshape.setVariable('isConsumablePickup', true);
        colshape.setVariable('weaponName', item);
        colshape.setVariable('FixWeaponName', displayName);
        colshape.setVariable('textLabel', null);
        colshape.setVariable('droppedWeapon', droppedObj);
        scheduleRefreshPlayersNearWeaponPickupPos(position, dim);

        setTimeout(() => {
            try {
                if (colshape && mp.colshapes.exists(colshape)) {
                    destroyWeaponPickupWorld(colshape);
                }
            } catch (_e) {}
        }, 500000);
    } catch (e) {
        console.log('[spawnConsumableWorldPickupAt]', e);
    }
}

const SKATEBOARD_WORLD_MODEL = '5rp_skate';

function spawnSkateboardWorldPickupAt(player, position, itemKey) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const item = String(itemKey || '');
        if (!item.toLowerCase().startsWith('item_skateboard')) return;
        const heading = (typeof player.heading === 'number' && isFinite(player.heading)) ? player.heading : 0;

        const droppedVeh = mp.vehicles.new(mp.joaat(SKATEBOARD_WORLD_MODEL), position, {
            heading,
            locked: true,
            engine: false,
            dimension: player.dimension
        });

        const dim = pickupColshapeDimension(player);
        const colshape = global.creatorShapeSphere(position.x, position.y, position.z, WEAPON_PICKUP_COLSHAPE_RADIUS, dim);
        if (!colshape) {
            if (droppedVeh && mp.vehicles.exists(droppedVeh)) droppedVeh.destroy();
            return;
        }

        colshape.setVariable('pickupDimension', dim);
        colshape.setVariable('isWeaponPickup', true);
        colshape.setVariable('isSkateboardPickup', true);
        colshape.setVariable('weaponName', item);
        colshape.setVariable('FixWeaponName', 'Скейтборд');
        colshape.setVariable('textLabel', null);
        colshape.setVariable('droppedWeapon', droppedVeh);
        scheduleRefreshPlayersNearWeaponPickupPos(position, dim);

        setTimeout(() => {
            try {
                if (colshape && mp.colshapes.exists(colshape)) {
                    destroyWeaponPickupWorld(colshape);
                }
            } catch (_e) {}
        }, 500000);
    } catch (e) {
        console.log('[spawnSkateboardWorldPickupAt]', e);
    }
}

function spawnSkateboardWorldPickup(player, position, itemKey) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const pos = new mp.Vector3(position.x, position.y, position.z - 0.85);
        spawnSkateboardWorldPickupAt(player, pos, itemKey);
    } catch (e) {
        console.log('[spawnSkateboardWorldPickup]', e);
    }
}

/** Запрашивает Z земли у клиента, затем спавнит объект-расходник. */
function spawnConsumableWorldPickup(player, position, itemKey) {
    try {
        if (!mp.players.exists(player) || !position) return;
        const item = String(itemKey || '');
        const token = `cd_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        const fallbackZ = position.z - 1.0;

        global._consumDropPending[token] = {
            static: player.static,
            x: position.x,
            y: position.y,
            z: position.z,
            dimension: player.dimension,
            item
        };

        const t = setTimeout(() => {
            const p = global._consumDropPending[token];
            if (!p) return;
            delete global._consumDropPending[token];
            if (!mp.players.exists(player)) return;
            spawnConsumableWorldPickupAt(player, new mp.Vector3(p.x, p.y, fallbackZ), p.item);
        }, 2800);

        global._consumDropPending[token].timeoutId = t;

        try {
            player.call('weaponDropRequestGround', [token, position.x, position.y, position.z, player.dimension, 'item_consum']);
        } catch (_callErr) {
            clearTimeout(t);
            delete global._consumDropPending[token];
            spawnConsumableWorldPickupAt(player, new mp.Vector3(position.x, position.y, fallbackZ), item);
        }
    } catch (e) {
        console.log('[spawnConsumableWorldPickup]', e);
    }
}

/**
 * При смерти: падает только одно оружие, которое было в руках (активный быстрый слот).
 * Обычный револьвер не дропается. Остальной инвентарь не трогаем.
 */
global.deathDropHeldWeapon = function (player) {
    try {
        if (!mp.players.exists(player)) return;
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

        const slotVar = player.getVariable('activeWeaponSlot');
        const slot = slotVar === null || slotVar === undefined ? NaN : parseInt(slotVar, 10);
        if (Number.isNaN(slot) || slot < 0 || slot >= 3) return;

        const item = player.fastSlots[slot];
        if (!item) return;

        const base = String(item).split('(')[0].trim();
        if (!base.startsWith('weapon_') || base === 'weapon_revolver') return;

        player.fastSlots[slot] = '';
        try {
            player.setVariable('activeWeaponSlot', null);
        } catch (_e) {}

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        const FixWeaponName = global.formweap(base);
        if (typeof global.pushSystemChatLine === 'function') {
            global.pushSystemChatLine(
                player,
                'При смерти выпало оружие: ',
                FixWeaponName,
                '.'
            );
        }

        let captLootCollected = false;
        if (typeof global.tryCaptBattleCollectWeaponDrop === 'function') {
            captLootCollected = global.tryCaptBattleCollectWeaponDrop(player, item) === 'collected';
        }

        if (!captLootCollected) {
            const pos = player.position;
            spawnWeaponWorldPickup(player, new mp.Vector3(pos.x, pos.y, pos.z), base);
        } else if (typeof global.pushSystemChatLine === 'function') {
            global.pushSystemChatLine(
                player,
                'Оружие ',
                FixWeaponName,
                ' будет отправлено на склад атакующих после войны.'
            );
        }
    } catch (e) {
        console.log(e);
    }
};

/** Обёртки вида { items: [...] } или двойной JSON-строкой — приводим к массиву слотов. */
function coerceInventoryArrayFromParsed(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.inventory)) return data.inventory;
        if (Array.isArray(data.inv)) return data.inv;
    }
    return null;
}

function extractInventoryArrayFromJsonValue(data) {
    if (data == null) return null;
    let cur = data;
    if (typeof cur === 'string') {
        try {
            cur = JSON.parse(cur);
        } catch (_e) {
            return null;
        }
    }
    const coerced = coerceInventoryArrayFromParsed(cur);
    return Array.isArray(coerced) ? coerced : null;
}

/** Устойчивый разбор inventory из БД — при мусорном JSON не терять всё тихо. */
function safeParseInventoryFromDb(raw, staticId) {
    const emptyOk = () => [];
    if (raw == null || raw === '') return emptyOk();
    let s = String(raw).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    try {
        const data = JSON.parse(s);
        const arr = extractInventoryArrayFromJsonValue(data);
        if (arr) return arr;
    } catch (_e) {
        try {
            const fixed = s.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
            const data = JSON.parse(fixed);
            const arr = extractInventoryArrayFromJsonValue(data);
            if (arr) {
                console.log('[inventory] repaired trailing-comma JSON static=' + staticId);
                return arr;
            }
        } catch (_e2) {}
        console.log('[inventory] JSON.parse failed static=' + staticId + ' preview=' + String(s).slice(0, 160));
        return emptyOk();
    }
    console.log('[inventory] JSON ok but no array static=' + staticId + ' preview=' + String(s).slice(0, 160));
    return emptyOk();
}

function isMissingInventorySqlMetaColumnsErr(err) {
    const code = err && err.code;
    const msg = String((err && (err.message || err.sqlMessage)) || '');
    if (code === 'ER_BAD_FIELD_ERROR') return true;
    if (/unknown column/i.test(msg)) return true;
    return false;
}

function normalizeFastSlotsFromDb(parsedArr, rawFallback, staticId) {
    let a = parsedArr;
    if (!Array.isArray(a) || a.length < 3) {
        try {
            const fb = String(rawFallback || '["","",""]').trim();
            a = JSON.parse(fb);
        } catch (_e) {
            a = ['', '', ''];
        }
    }
    if (!Array.isArray(a) || a.length < 3) {
        console.log('[inventory] fast slots fallback static=' + staticId);
        return ['', '', ''];
    }
    return a.slice(0, 3).map((x) => (x == null ? '' : typeof x === 'string' ? x : String(x)));
}

function pickInventoryRowFromAccount(accountRow) {
    if (!accountRow || typeof accountRow !== 'object') return null;
    return {
        inventory: accountRow.inventory,
        legacy_bandolier: accountRow.legacy_bandolier,
        fast: accountRow.fast,
        cobura: accountRow.cobura,
        coburaw: accountRow.coburaw,
        bag_antisocial: accountRow.bag_antisocial,
        bag_anime: accountRow.bag_anime,
        bag_grob: accountRow.bag_grob,
        bag_big_black: accountRow.bag_big_black,
        bag_big_white: accountRow.bag_big_white,
        bag_waist: accountRow.bag_waist,
        bag_contents: accountRow.bag_contents,
        inv_slot_binds: accountRow.inv_slot_binds,
        donate_bag_state: accountRow.donate_bag_state,
        __donateBagInstRows: accountRow.__donateBagInstRows
    };
}

global.loadInventory = function(player, accountRowOptional, opts) {
    try {
        if (!mp.players.exists(player)) return;
        if (player._loadingInventory) return;
        opts = opts && typeof opts === 'object' ? opts : {};
        player._loadingInventory = true;
        const static = player.static;

        function applyInventoryRow(result) {
            if (result.length > 0) {
                try {
                    player.bandolier = bandolierStorage.normalize(result[0].legacy_bandolier);
                    player.inventory = safeParseInventoryFromDb(result[0].inventory, static);
                    player.fastSlots = normalizeFastSlotsFromDb(
                        safeParseInventoryFromDb(result[0].fast, static),
                        result[0].fast,
                        static
                    );
                } catch (e) {
                    console.log('[inventory] load row parse unexpected static=' + static, e);
                    player.bandolier = bandolierStorage.normalize(result[0].legacy_bandolier);
                    player.inventory = safeParseInventoryFromDb(result[0].inventory, static);
                    player.fastSlots = normalizeFastSlotsFromDb(
                        safeParseInventoryFromDb(result[0].fast, static),
                        result[0].fast,
                        static
                    );
                }
                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

                player.inventory = player.inventory.map((item) => {
                    if (item == null || item === '') return null;
                    if (item === 1 || item === '1') return 'weapon_revolver';
                    return typeof item === 'string' ? item : String(item);
                });

                let revolverInFastSlot = false;
                player.fastSlots = player.fastSlots.map((slot) => {
                    if (slot === 'weapon_revolver') {
                        if (revolverInFastSlot) return '';
                        revolverInFastSlot = true;
                    }
                    return slot;
                });

                if (typeof global.hydrateInventoryMetaFromDbRow === 'function') {
                    global.hydrateInventoryMetaFromDbRow(player, result[0]);
                } else if (typeof global.ensureInventoryGrid50 === 'function') {
                    global.ensureInventoryGrid50(player);
                }
                if (typeof global.mergeDonateBagInstanceContentsFromDb === 'function' && result[0].__donateBagInstRows) {
                    global.mergeDonateBagInstanceContentsFromDb(player, result[0].__donateBagInstRows);
                }
                if (typeof global.hydratePlayerDonateBagsFrac === 'function') {
                    global.hydratePlayerDonateBagsFrac(player, result[0]);
                }

                if (typeof global.reconcileDonateBagStateAfterInventoryHydrate === 'function') {
                    global.reconcileDonateBagStateAfterInventoryHydrate(player);
                }

                if (typeof global.dedupeRevolverGrid === 'function') global.dedupeRevolverGrid(player);

                let accRow = global.mergeAccountRowDonateDefaults(result[0]);
                if (global.syncDonateMirrorItems) global.syncDonateMirrorItems(player, accRow);
                if (typeof global.stripFrdefDefaultShoeTokens === 'function') {
                    global.stripFrdefDefaultShoeTokens(player);
                }
                if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
                if (typeof global.normalizeThermosInPlayerGrid === 'function') global.normalizeThermosInPlayerGrid(player);
                if (typeof global.normalizeBongInPlayerGrid === 'function') global.normalizeBongInPlayerGrid(player);
                if (typeof global.normalizeDroneInPlayerGrid === 'function') global.normalizeDroneInPlayerGrid(player);
                if (typeof global.dedupeRevolverGrid === 'function') global.dedupeRevolverGrid(player);
                if (typeof global.sanitizeClothingSlotBinds === 'function') {
                    global.sanitizeClothingSlotBinds(player);
                }
                // deferBagInstances: saveInventory до baginst затирает donate_bag_instances пустым массивом.
                if (!opts.deferBagInstances) global.saveInventory(player);
            } else {
                player.inventory = [];
                player.bandolier = bandolierStorage.normalize(null);
                player.fastSlots = ['', '', ''];
                player.invSlotBinds = {};
                if (typeof global.initPlayerBagStorageEmpty === 'function') global.initPlayerBagStorageEmpty(player);
                else player.bagContents = [];
                if (typeof global.hydratePlayerDonateBagsFrac === 'function') {
                    global.hydratePlayerDonateBagsFrac(player, {});
                }
                if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
                if (typeof global.dedupeRevolverGrid === 'function') global.dedupeRevolverGrid(player);
            }

            if (typeof global.sendLoadInventoryClient === 'function') global.sendLoadInventoryClient(player);
            else player.call('loadInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            player._inventoryReady = true;
            setImmediate(() => {
                if (global.syncWeaponBodyPlayer && mp.players.exists(player)) {
                    try {
                        global.syncWeaponBodyPlayer(player);
                    } catch (_e) {}
                }
            });
            player._loadingInventory = false;
            player._inventoryHydrated = true;
            if (opts.deferBagInstances) {
                player._bagInstDeferLoadPending = true;
                setTimeout(() => {
                    if (!mp.players.exists(player)) return;
                    global.DB.query(
                        'SELECT id, contents, drawable, texture FROM donate_bag_instances WHERE account_static = ?',
                        [static],
                        (eInst, instRows) => {
                            try {
                                if (!mp.players.exists(player)) return;
                                if (
                                    !eInst &&
                                    instRows &&
                                    instRows.length &&
                                    typeof global.mergeDonateBagInstanceContentsFromDb === 'function'
                                ) {
                                    global.mergeDonateBagInstanceContentsFromDb(player, instRows);
                                }
                                if (typeof global.sendLoadInventoryClient === 'function') {
                                    global.sendLoadInventoryClient(player);
                                }
                            } finally {
                                player._bagInstDeferLoadPending = false;
                            }
                        }
                    );
                }, 1400);
            }
        }

        function attachDonateBagInstancesRowsThenApply(res, applyFn) {
            if (opts.deferBagInstances) {
                applyFn(res || []);
                return;
            }
            if (!res || res.length === 0) {
                applyFn(res || []);
                return;
            }
            global.DB.query(
                'SELECT id, contents, drawable, texture FROM donate_bag_instances WHERE account_static = ?',
                [static],
                (eInst, instRows) => {
                    if (
                        eInst &&
                        (eInst.code === 'ER_BAD_FIELD_ERROR' || /unknown column/i.test(String(eInst.message || eInst.sqlMessage || '')))
                    ) {
                        global.DB.query(
                            'SELECT id, contents FROM donate_bag_instances WHERE account_static = ?',
                            [static],
                            (e2, rows2) => {
                                if (!e2 && rows2 && res[0]) res[0].__donateBagInstRows = rows2;
                                applyFn(res);
                            }
                        );
                        return;
                    }
                    if (!eInst && instRows && res[0]) res[0].__donateBagInstRows = instRows;
                    applyFn(res);
                }
            );
        }

        if (accountRowOptional) {
            const invRow = pickInventoryRowFromAccount(accountRowOptional);
            if (invRow) {
                if (invRow.__donateBagInstRows !== undefined) {
                    applyInventoryRow([invRow]);
                    return;
                }
                attachDonateBagInstancesRowsThenApply([invRow], applyInventoryRow);
                return;
            }
        }

        global.DB.query(
            'SELECT legacy_bandolier, inventory, fast, cobura, coburaw, bag_antisocial, bag_anime, bag_grob, bag_big_black, bag_big_white, bag_waist, bag_contents, inv_slot_binds, donate_bag_state FROM accounts WHERE static = ?',
            [static],
            (err, result) => {
                if (err) {
                    player._loadingInventory = false;
                    if (isMissingInventorySqlMetaColumnsErr(err)) {
                        console.log('[inventory] retry load reduced columns static=' + static);
                        player._loadingInventory = true;
                        global.DB.query(
                            'SELECT inventory, fast, cobura, coburaw, bag_contents, inv_slot_binds FROM accounts WHERE static = ?',
                            [static],
                            (err2, result2) => {
                                if (err2) {
                                    player._loadingInventory = false;
                                    return console.log(err2);
                                }
                                if (result2.length > 0) {
                                    const row = result2[0];
                                    row.bag_contents = row.bag_contents != null ? row.bag_contents : null;
                                    row.inv_slot_binds = row.inv_slot_binds != null ? row.inv_slot_binds : null;
                                    row.donate_bag_state = null;
                                    row.donate_bags_frac = null;
                                    global.DB.query(
                                        'SELECT bag_antisocial, bag_anime, bag_grob, bag_big_black, bag_big_white, bag_waist FROM accounts WHERE static = ?',
                                        [static],
                                        (e3, r3) => {
                                            if (!e3 && r3 && r3[0]) Object.assign(row, r3[0]);
                                            attachDonateBagInstancesRowsThenApply(result2 || [], applyInventoryRow);
                                        }
                                    );
                                    return;
                                }
                                attachDonateBagInstancesRowsThenApply(result2 || [], applyInventoryRow);
                            }
                        );
                        return;
                    }
                    return console.log(err);
                }
                attachDonateBagInstancesRowsThenApply(result || [], applyInventoryRow);
            }
        );
    } catch (error) {
        if (player && player._loadingInventory !== undefined) player._loadingInventory = false;
        console.log(error);
    }
};

global.saveInventory = function(player, opts) {
    opts = opts || {};
    const forceSave = opts.force === true;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) return;
        if (!forceSave && player._loadingInventory === true) return;
        if (!forceSave && player._bagInstDeferLoadPending === true) return;
        if (!Array.isArray(player.inventory)) player.inventory = [];
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

        if (typeof global.sanitizeDonateInventory === 'function') {
            try {
                global.sanitizeDonateInventory(player);
            } catch (_e) {}
        }

        if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
        if (typeof global.sanitizeClothingSlotBinds === 'function') {
            global.sanitizeClothingSlotBinds(player);
        }

        if (typeof global.syncBagContentsArrayToCapacity === 'function') {
            try {
                global.syncBagContentsArrayToCapacity(player);
            } catch (_eBagPreSave) {}
        }

        if (typeof global.purgeWeaponsFromBagStorage === 'function') {
            try {
                global.purgeWeaponsFromBagStorage(player);
            } catch (_ePurgeBagW) {}
        }

        let revolverInFastSlot = false;
        player.fastSlots = player.fastSlots.map((slot) => {
            if (slot === 'weapon_revolver') {
                if (revolverInFastSlot) return '';
                revolverInFastSlot = true;
            }
            return slot;
        });
        if (typeof global.dedupeRevolverGrid === 'function') global.dedupeRevolverGrid(player);

        const static = player.static;
        const inventory = JSON.stringify(player.inventory);
        const fastSlots = JSON.stringify(player.fastSlots);
        const invBinds =
            typeof global.serializeInvSlotBindsForDb === 'function' ? global.serializeInvSlotBindsForDb(player) : '{}';
        const donateBagsFrac =
            typeof global.serializeDonateBagsFracForDb === 'function' ? global.serializeDonateBagsFracForDb(player) : '{}';

        function saveInvRow(inventory_, fast_, bag_, binds_, frac_) {
            global.DB.query(
                'UPDATE accounts SET inventory = ?, fast = ?, bag_contents = ?, inv_slot_binds = ?, donate_bag_state = ?, legacy_bandolier = COALESCE(?, legacy_bandolier) WHERE static = ?',
                [inventory_, fast_, bag_, binds_, frac_, Array.isArray(player.bandolier)?JSON.stringify(player.bandolier):null, static],
                (err) => {
                    if (err && isMissingInventorySqlMetaColumnsErr(err)) {
                        global.DB.query(
                            'UPDATE accounts SET inventory = ?, fast = ?, bag_contents = ?, inv_slot_binds = ? WHERE static = ?',
                            [inventory_, fast_, bag_, binds_, static],
                            (err2) => {
                                if (err2) return console.log(err2);
                            }
                        );
                        return;
                    }
                    if (err) return console.log(err);
                }
            );
        }

        function flushBagInstancesThenSave() {
            const bagContents =
                typeof global.serializeBagContentsForDb === 'function' ? global.serializeBagContentsForDb(player) : '[]';
            saveInvRow(inventory, fastSlots, bagContents, invBinds, donateBagsFrac);
        }

        if (typeof global.persistDonateBagInstanceContentsToTable === 'function') {
            global.persistDonateBagInstanceContentsToTable(player, flushBagInstancesThenSave);
        } else {
            flushBagInstancesThenSave();
        }
        setImmediate(() => {
            if (global.syncWeaponBodyPlayer && mp.players.exists(player)) {
                try {
                    global.syncWeaponBodyPlayer(player);
                } catch (_e) {}
            }
        });
    } catch (error) {
        console.log(error);
    }
};

function fastSlotItemBaseName(itemName) {
    return String(itemName || '').split('(')[0].trim().split('#')[0].trim();
}

function fastSlotWeaponHash(itemName) {
    const base = fastSlotItemBaseName(itemName);
    if (!base) return 0;
    return (mp.joaat(base) >>> 0);
}

function fastSlotSavedClip(weaponName) {
    const m = /\((\d+)\)\s*$/.exec(String(weaponName || ''));
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function giveWeapon(player, slot) {
    if (!mp.players.exists(player)) return;
    try {
        const weaponName = player.fastSlots[slot];
        if (weaponName) {
            const weaponHash = fastSlotWeaponHash(weaponName);
            if (!weaponHash) return;
            const clip = fastSlotSavedClip(weaponName);
            if (clip > 0) player.call('givegun', [weaponHash, clip]);
            else player.call('givegun', [weaponHash]);
        }
    } catch (error) {
        return;
    }
}

function removeWeapons(player) {
    try {
        player.removeAllWeapons();
    } catch (error) {
        console.log(error);
    }
}

/** Всё из быстрых слотов обратно в рюкзак (как при ручном снятии со слота). */
function moveAllFastSlotsToInventory(player) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (let i = 0; i < 3; i++) {
        const item = player.fastSlots[i];
        if (item && String(item).trim() !== '') {
            if (global.invGridTryPush && !global.invGridTryPush(player, item)) break;
            else if (!global.invGridTryPush) player.inventory.push(item);
            player.fastSlots[i] = '';
        }
    }
}

/** Админ noclip (F5): только визуал — с педа убрать оружие и не показывать на теле; fastSlots и инвентарь не меняем. */
global.adminNoclipFlyWeaponVisualStart = function (player) {
    if (!mp.players.exists(player) || player.getVariable('adminlvl') <= 0) return;
    player._flyNoclipHideBodyWeapons = true;
    removeWeapons(player);
    player.call('hideAmmo');
    if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, 0);
};

global.adminNoclipFlyWeaponVisualEnd = function (player) {
    if (!mp.players.exists(player) || player.getVariable('adminlvl') <= 0) return;
    if (player._flyNoclipHideBodyWeapons !== true) return;
    player._flyNoclipHideBodyWeapons = false;
    const slot = player.getVariable('activeWeaponSlot');
    player.lastGiveGunTime = 0;
    removeWeapons(player);
    if (slot !== null && slot !== undefined && slot >= 0 && slot < 3 && Array.isArray(player.fastSlots) && player.fastSlots[slot]) {
        giveWeapon(player, slot);
        if (player.getVariable('ammo') !== false) player.call('showAmmo');
        const h = fastSlotWeaponHash(player.fastSlots[slot]);
        if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, h);
    } else {
        player._clientWeaponU = 0;
        if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, 0);
    }
};

mp.events.add('playerJoin', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player.lastGiveGunTime = 0;
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('setvariableslot', (player, slot) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const { combatWeaponHashFromItem: combatCaliberWeaponHash } = require('./config/combat_loadout.js');

        function applyCombatFastSlotSwitch(isAllowedWeapon, slotToHash) {
            const currentTimeCombat = Date.now();
            if (currentTimeCombat - (player.lastGiveGunTime || 0) < 1000) return true;
            if (player.getVariable('dead')) return true;
            if (player.vehicle) return true;
            player.lastGiveGunTime = currentTimeCombat;
            if (slot >= 0 && slot < 3) {
                if (!Array.isArray(player.fastSlots) || !player.fastSlots[slot] || !isAllowedWeapon(player.fastSlots[slot])) {
                    removeWeapons(player);
                    player.setVariable('activeWeaponSlot', null);
                    player.call('hideAmmo');
                    return true;
                }
                const activeSlot = player.getVariable('activeWeaponSlot');
                if (activeSlot !== null && activeSlot !== undefined && Number(activeSlot) === slot) {
                    removeWeapons(player);
                    for (let i = 0; i < 3; i++) {
                        const nm = player.fastSlots[i];
                        if (!nm || !isAllowedWeapon(nm)) continue;
                        if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, slotToHash(nm), 9999, true, 'combat-slot');
                        else player.giveWeapon(slotToHash(nm), 9999, true);
                    }
                    player.setVariable('activeWeaponSlot', null);
                    player.call('hideAmmo');
                    return true;
                }
                removeWeapons(player);
                for (let i = 0; i < 3; i++) {
                    const nm = player.fastSlots[i];
                    if (!nm || !isAllowedWeapon(nm)) continue;
                    if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, slotToHash(nm), 9999, true, 'combat-slot');
                    else player.giveWeapon(slotToHash(nm), 9999, true);
                }
                const activeHash = slotToHash(player.fastSlots[slot]);
                const activeClip = fastSlotSavedClip(player.fastSlots[slot]);
                if (activeClip > 0) player.call('givegun', [activeHash, activeClip]);
                else player.call('givegun', [activeHash]);
                player.setVariable('activeWeaponSlot', slot);
                if (player.getVariable('inCapt') === true) player.setVariable('captWeaponHash', activeHash);
                if (player.getVariable('inBizwar') === true) player.setVariable('captWeaponHash', activeHash);
                if (player.getVariable('ammo') !== false) player.call('showAmmo');
            } else if (slot === 3) {
                removeWeapons(player);
                for (let i = 0; i < 3; i++) {
                    const nm = player.fastSlots[i];
                    if (!nm || !isAllowedWeapon(nm)) continue;
                    if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, slotToHash(nm), 9999, true, 'combat-slot');
                    else player.giveWeapon(slotToHash(nm), 9999, true);
                }
                player.setVariable('activeWeaponSlot', null);
                player.call('hideAmmo');
            }
            return true;
        }

        if (player.getVariable('inMbaArena') === true) {
            const item = player.getVariable('mbaWeaponItem') || (Array.isArray(player.fastSlots) ? player.fastSlots[0] : '');
            const hash = Number(player.getVariable('mbaWeaponHash')) || 0;
            if (!item || !hash) return;
            player.lastGiveGunTime = Date.now();
            try { player.removeAllWeapons(); } catch (_e) {}
            if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, hash, 9999, true, 'mba-arena');
            else { try { player.giveWeapon(hash, 9999, true); } catch (_e2) {} }
            try {
                player.call('givegun', [hash]);
                player.setVariable('activeWeaponSlot', 0);
                player.setVariable('captWeaponHash', hash);
                if (player.getVariable('ammo') !== false) player.call('showAmmo');
            } catch (_e3) {}
            return;
        }

        if (player.getVariable('inCapt') === true) {
            const isAllowedCaptWeapon = (nm) =>
                typeof global.captIsFastSlotWeaponAllowed === 'function'
                    ? global.captIsFastSlotWeaponAllowed(player, nm)
                    : false;
            const { combatWeaponHashFromItem } = require('./config/combat_loadout.js');
            const slotToHashCapt = (name) => combatWeaponHashFromItem(name);
            if (applyCombatFastSlotSwitch(isAllowedCaptWeapon, slotToHashCapt)) return;
        }

        if (player.getVariable('inBizwar') === true) {
            const isAllowedBizwarWeapon = (nm) =>
                typeof global.bizwarIsFastSlotWeaponAllowed === 'function'
                    ? global.bizwarIsFastSlotWeaponAllowed(player, nm)
                    : false;
            if (applyCombatFastSlotSwitch(isAllowedBizwarWeapon, combatCaliberWeaponHash)) return;
        }

        const currentTime = Date.now();
        if (currentTime - player.lastGiveGunTime >= 1000) {
            if (player.getVariable('dead')) return;
            if (player.vehicle) return;
            if (player.getVariable('fly')) return;
            if (player.getVariable('casmenu')) return;
            if (player.getVariable('blackmenu')) return;
            if (player.getVariable('animsmenu')) return;
            if (player.getVariable('animCombatLock') === true) {
                return isNotify(player, 2, 'top-mid', 'Нельзя достать оружие во время этой анимации.', 2500);
            }
            if (player.getVariable('shopc')) return;
            if (player.getVariable('phone')) return;
            if (player.getVariable('familymenu')) return;
            if (player.vehicle) return;
            player.lastGiveGunTime = currentTime;
            if (slot >= 0 && slot < 3) {
                if (!Array.isArray(player.fastSlots) || slot < 0 || slot >= player.fastSlots.length || !player.fastSlots[slot]) {
                    removeWeapons(player);
                    player.setVariable('activeWeaponSlot', null);
                    player.call('hideAmmo');
                    return;
                }
                const activeGw = player.getVariable('activeWeaponSlot');
                if (activeGw !== null && activeGw !== undefined && Number(activeGw) === slot) {
                    removeWeapons(player);
                    player.setVariable('activeWeaponSlot', null);
                    player.call('hideAmmo');
                    player._clientWeaponU = 0;
                    if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, 0);
                    return;
                }
                removeWeapons(player);
                giveWeapon(player, slot);
                player.setVariable('activeWeaponSlot', slot);
                const activeHash = fastSlotWeaponHash(player.fastSlots[slot]);
                player._clientWeaponU = activeHash;
                if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, activeHash);
                if (player.getVariable('ammo') !== false) player.call('showAmmo');
            } else if (slot === 3) {
                removeWeapons(player);
                player.setVariable('activeWeaponSlot', null);
                player._clientWeaponU = 0;
                if (global.syncWeaponBodyPlayer) global.syncWeaponBodyPlayer(player, 0);
                player.call('hideAmmo');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('removeweaponadm', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('adminlvl') <= 0) return;

        moveAllFastSlotsToInventory(player);
        removeWeapons(player);
        player.setVariable('activeWeaponSlot', null);
        player.call('hideAmmo');
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('requestInventory', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('jail') === true) return;
        if (player.getVariable('inMbaArena') === true) {
            return isNotify(player, 2, 'top-mid', 'Инвентарь недоступен во время матча на арене.', 3000);
        }
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            global.loadInventory(player);
            return;
        }
        if (typeof global.sendLoadInventoryClient === 'function') global.sendLoadInventoryClient(player);
        else player.call('loadInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) return;

        if (player.getVariable('testdriveone') || player.getVariable('testdrivetwo')) return;
        if (global.normalizePlayerDeathArgs) {
            const n = global.normalizePlayerDeathArgs(reason, killer);
            killer = n.killer;
            reason = n.reason;
        }
        if (typeof global.resolveDeathKiller === 'function') {
            killer = global.resolveDeathKiller(player, killer);
        }
        player.call('hideAmmo');
        if (player.getVariable('jail') || player.getVariable('afklobby') !== true && player.getVariable('revolverdm') !== true && player.getVariable('carabinedm') !== true && player.getVariable('heavydm') !== true) player.setVariable('dead', true);
        const activeWeaponSlot = player.getVariable('activeWeaponSlot');
        
        if (activeWeaponSlot === null || activeWeaponSlot < 0 || activeWeaponSlot >= 3 || player.fastSlots[activeWeaponSlot] === '') {
            return;
        }
        
        const weaponName = player.fastSlots[activeWeaponSlot];
        if (weaponName === 'weapon_revolver') {
            player.setVariable('activeWeaponSlot', null);
            return;
        }

        const baseHeld = String(weaponName || '').split('(')[0].trim();
        const FixWeaponName = global.formweap(baseHeld);
        const dropOnGround = baseHeld.startsWith('weapon_') && baseHeld !== 'weapon_revolver';

        login = player.login;
        static = player.static;

        global.sendDiscordLog(`Потеря оружия!\n\nИгрок - ${login} (#${static})\nОружие - ${FixWeaponName} | ${weaponName}`, '1266445828608884767');

        sortGun(killer, player, FixWeaponName);

        global.DB.query(
            'INSERT INTO logsweapon (static, weapon, dey, ipadr, time) VALUES (?, ?, ?, ?, NOW())',
            [player.static, FixWeaponName, 'потерял', player.ip],
            (err) => {
                if (err) return console.log(err);
            }
        );

        if (typeof global.pushSystemChatLine === 'function') {
            global.pushSystemChatLine(
                player,
                'При смерти выпало оружие: ',
                FixWeaponName,
                '.'
            );
        }

        let captLootCollected = false;
        if (dropOnGround && typeof global.tryCaptBattleCollectWeaponDrop === 'function') {
            const lootResult = global.tryCaptBattleCollectWeaponDrop(player, weaponName);
            captLootCollected = lootResult === 'collected';
        }

        if (dropOnGround && !captLootCollected) {
            const pos = player.position;
            const ox = (Math.random() - 0.5) * 0.5;
            const oy = (Math.random() - 0.5) * 0.5;
            spawnWeaponWorldPickup(player, new mp.Vector3(pos.x + ox, pos.y + oy, pos.z), baseHeld);
        } else if (captLootCollected && typeof global.pushSystemChatLine === 'function') {
            global.pushSystemChatLine(
                player,
                'Оружие ',
                FixWeaponName,
                ' будет отправлено на склад атакующих после войны.'
            );
        }

        player.fastSlots[activeWeaponSlot] = '';
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        player.setVariable('activeWeaponSlot', null);
    } catch (error) {
        console.log(error);
    }
});

function sortGun(player, killed, weapon) {
    try {
        if (!mp.players.exists(player)) return;
        if (!mp.players.exists(killed)) return;
        if (typeof global.pushSystemChatLine === 'function') {
            global.pushSystemChatLine(
                player,
                'Вы выбили оружие ',
                weapon,
                ` у игрока ${killed.login}.`
            );
        }
    } catch (error) {
        console.log(error);
    }
};

const WEAPON_PICKUP_SCAN_RADIUS = 2.35;
const WEAPON_PICKUP_COLSHAPE_RADIUS = 2.35;

function pickupDropEntityExists(colshape) {
    try {
        const droppedWeapon = colshape.getVariable('droppedWeapon');
        if (!droppedWeapon) return false;
        if (colshape.getVariable('isSkateboardPickup') === true) {
            return mp.vehicles.exists(droppedWeapon);
        }
        return mp.objects.exists(droppedWeapon);
    } catch (_e) {
        return false;
    }
}

function isValidWeaponPickupColshape(colshape) {
    try {
        if (!colshape || !mp.colshapes.exists(colshape)) return false;
        if (!colshape.getVariable || !colshape.getVariable('isWeaponPickup')) return false;
        if (colshape.getVariable('weaponName') == null) return false;
        if (!pickupDropEntityExists(colshape)) return false;
        return true;
    } catch (_e) {
        return false;
    }
}

function weaponPickupColshapePos(colshape) {
    try {
        const droppedWeapon = colshape.getVariable('droppedWeapon');
        if (colshape.getVariable('isSkateboardPickup') === true) {
            if (droppedWeapon && mp.vehicles.exists(droppedWeapon)) return droppedWeapon.position;
        } else if (droppedWeapon && mp.objects.exists(droppedWeapon)) {
            return droppedWeapon.position;
        }
    } catch (_e) {}
    return null;
}

function destroyWeaponPickupWorld(colshape, textLabel, droppedWeapon) {
    let remPos = null;
    try {
        if (colshape && mp.colshapes.exists(colshape)) {
            remPos = weaponPickupColshapePos(colshape);
        }
    } catch (_ePos) {}

    try {
        const tl = textLabel != null ? textLabel : (colshape && colshape.getVariable ? colshape.getVariable('textLabel') : null);
        if (tl && mp.labels.exists(tl)) tl.destroy();
    } catch (_e1) {}
    try {
        const dw = droppedWeapon != null ? droppedWeapon : (colshape && colshape.getVariable ? colshape.getVariable('droppedWeapon') : null);
        if (dw) {
            if (mp.vehicles.exists(dw)) dw.destroy();
            else if (mp.objects.exists(dw)) dw.destroy();
        }
    } catch (_e2) {}
    try {
        if (colshape && mp.colshapes.exists(colshape)) colshape.destroy();
    } catch (_e3) {}

    try {
        refreshPlayersAfterPickupColshapeGone(colshape, remPos);
    } catch (_e0) {}
}

function findNearestWeaponPickupColshape(player, excludeColshape) {
    if (!player || !mp.players.exists(player)) return null;
    const pos = player.position;
    const playerDim = pickupColshapeDimension(player);
    let best = null;
    let bestDist = WEAPON_PICKUP_SCAN_RADIUS;
    try {
        mp.colshapes.forEach((colshape) => {
            if (colshape === excludeColshape) return;
            if (!colshapeMatchesPlayerDimension(colshape, playerDim)) return;
            if (!isValidWeaponPickupColshape(colshape)) return;
            const itemPos = weaponPickupColshapePos(colshape);
            if (!itemPos) return;
            const dx = itemPos.x - pos.x;
            const dy = itemPos.y - pos.y;
            const dz = itemPos.z - pos.z;
            const dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
            if (dist <= bestDist) {
                bestDist = dist;
                best = colshape;
            }
        });
    } catch (_e) {}
    return best;
}

const GROUND_STACK_PICKUP_BASES = new Set(['item_spank', 'item_alco', 'Бронежилет', 'Аптечка']);

function buildGroundPickupHintPayload(itemKey, isConsumable, labelOverride, pos) {
    const item = String(itemKey || '');
    const base = item.split('(')[0].trim();
    const baseNoHash = base.split('#')[0].trim();
    const isSingleConsumable = baseNoHash === 'item_bong' || baseNoHash === 'item_thermos' || baseNoHash === 'item_drone';
    const m = item.match(/\((\d+)\)/);
    let qty = 1;
    if (m && !isSingleConsumable) {
        qty = Math.max(1, parseInt(m[1], 10) || 1);
    }
    let label = labelOverride;
    if (!label) {
        if (weaponNames[baseNoHash]) label = weaponNames[baseNoHash];
        else if (baseNoHash.toLowerCase().startsWith('item_skateboard')) label = 'Скейтборд';
        else label = base;
    }
    label = String(label);
    const stackable = !!isConsumable && GROUND_STACK_PICKUP_BASES.has(baseNoHash);
    const isWeapon = baseNoHash.indexOf('weapon_') === 0;
    const payload = {
        item,
        label,
        qty: stackable ? qty : 1,
        stackable,
        needsQty: !isWeapon && stackable && qty > 1
    };
    if (pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y)) && Number.isFinite(Number(pos.z))) {
        payload.pos = { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) };
    }
    return JSON.stringify(payload);
}

function setPlayerGroundPickupHint(player, colshape) {
    if (!player || !mp.players.exists(player)) return;
    if (!colshape || !isValidWeaponPickupColshape(colshape)) {
        player.setVariable('groundPickupHint', null);
        return;
    }
    const isConsumable = colshape.getVariable('isConsumablePickup') === true;
    const itemKey = colshape.getVariable('weaponName');
    const fixName = colshape.getVariable('FixWeaponName');
    const pos = weaponPickupColshapePos(colshape);
    player.setVariable('groundPickupHint', buildGroundPickupHintPayload(itemKey, isConsumable, fixName, pos));
}

function clearPlayerGroundPickupHint(player) {
    if (player && mp.players.exists(player)) player.setVariable('groundPickupHint', null);
}

function refreshPlayersNearWeaponPickupPos(pos, dimension) {
    if (!pos) return;
    const dim = Number(dimension);
    const r = WEAPON_PICKUP_SCAN_RADIUS + 1.0;
    try {
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            if (pickupColshapeDimension(p) !== dim) return;
            const pp = p.position;
            const dx = pp.x - pos.x;
            const dy = pp.y - pos.y;
            const dz = pp.z - pos.z;
            if ((dx * dx + dy * dy + dz * dz) > r * r) return;
            refreshPlayerWeaponPickupColshape(p);
        });
    } catch (_e) {}
}

function scheduleRefreshPlayersNearWeaponPickupPos(pos, dimension) {
    refreshPlayersNearWeaponPickupPos(pos, dimension);
    setTimeout(() => refreshPlayersNearWeaponPickupPos(pos, dimension), 100);
    setTimeout(() => refreshPlayersNearWeaponPickupPos(pos, dimension), 350);
}

function refreshPlayerWeaponPickupColshape(player) {
    if (!player || !mp.players.exists(player)) return;
    const nearest = findNearestWeaponPickupColshape(player);
    player.setVariable('currentWeaponColshape', nearest || null);
    if (nearest) setPlayerGroundPickupHint(player, nearest);
    else clearPlayerGroundPickupHint(player);
}

/** После лута/деспавна предмета — убрать подсказку E у всех, кто смотрел на этот дроп. */
function refreshPlayersAfterPickupColshapeGone(removedColshape, remPosOverride) {
    let remPos = remPosOverride || null;
    try {
        if (!remPos && removedColshape && mp.colshapes.exists(removedColshape)) {
            remPos = weaponPickupColshapePos(removedColshape);
        }
    } catch (_e) {}

    try {
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;

            const cur = p.getVariable('currentWeaponColshape');
            if (cur === removedColshape) {
                p.setVariable('currentWeaponColshape', null);
                clearPlayerGroundPickupHint(p);
                refreshPlayerWeaponPickupColshape(p);
                return;
            }

            if (!remPos) return;
            try {
                const raw = p.getVariable('groundPickupHint');
                if (!raw) return;
                const meta = JSON.parse(String(raw));
                if (!meta || !meta.pos) return;
                const dx = Number(meta.pos.x) - remPos.x;
                const dy = Number(meta.pos.y) - remPos.y;
                const dz = Number(meta.pos.z) - remPos.z;
                if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) return;
                if ((dx * dx) + (dy * dy) + (dz * dz) > 2.25) return;
                clearPlayerGroundPickupHint(p);
                if (p.getVariable('currentWeaponColshape') === removedColshape) {
                    p.setVariable('currentWeaponColshape', null);
                }
                refreshPlayerWeaponPickupColshape(p);
            } catch (_e2) {}
        });
    } catch (_e3) {}
}

function finishWeaponPickupColshape(player) {
    if (!player || !mp.players.exists(player)) return;
    player.setVariable('currentWeaponColshape', null);
    clearPlayerGroundPickupHint(player);
    refreshPlayerWeaponPickupColshape(player);
}

function updateConsumableGroundPickupMeta(colshape, itemKey, displayName) {
    if (!colshape || !mp.colshapes.exists(colshape)) return;
    const item = String(itemKey || '');
    colshape.setVariable('weaponName', item);
    colshape.setVariable('FixWeaponName', displayName);
    try {
        const tl = colshape.getVariable('textLabel');
        const title = String(displayName || '').trim();
        if (tl && mp.labels.exists(tl)) tl.text = groundPickupLabelText(title);
    } catch (_e) {}
    try {
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            if (p.getVariable('currentWeaponColshape') === colshape) {
                setPlayerGroundPickupHint(p, colshape);
            }
        });
    } catch (_e2) {}
}

function finalizeConsumablePickupAnim(player, labelNice) {
    if (!mp.players.exists(player)) return;
    global.saveInventory(player);
    player.playAnimation('pickup_object', 'pickup_low', 1, 49);
    setTimeout(() => { if (player && mp.players.exists(player)) player.stopAnimation(); }, 1900);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    player.outputChatBox(`!{green}Вы подобрали !{red}${labelNice}!{green}.`);
}

function resolvePlayerWeaponPickupColshape(player) {
    let colshape = player.getVariable('currentWeaponColshape');
    if (isValidWeaponPickupColshape(colshape)) return colshape;
    colshape = findNearestWeaponPickupColshape(player);
    player.setVariable('currentWeaponColshape', colshape || null);
    return colshape;
}

function playerCloseEnoughToPickup(player, colshape) {
    try {
        if (!player || !mp.players.exists(player) || !isValidWeaponPickupColshape(colshape)) return false;
        const itemPos = weaponPickupColshapePos(colshape);
        if (!itemPos) return false;
        const pos = player.position;
        const dx = itemPos.x - pos.x;
        const dy = itemPos.y - pos.y;
        const dz = itemPos.z - pos.z;
        return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) <= WEAPON_PICKUP_SCAN_RADIUS;
    } catch (_e) {
        return false;
    }
}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;


        if (colshape && colshape.getVariable && colshape.getVariable('isWeaponPickup')) {
            const nearest = findNearestWeaponPickupColshape(player) || colshape;
            player.setVariable('currentWeaponColshape', nearest);
            setPlayerGroundPickupHint(player, nearest);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (colshape.getVariable('isWeaponPickup')) {
            if (!mp.players.exists(player)) return;
            if (!player.getVariable('auth')) return;

            if (colshape && colshape.getVariable && colshape.getVariable('isWeaponPickup')) {
                player.setVariable('currentWeaponColshape', null);
                refreshPlayerWeaponPickupColshape(player);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

function tryClaimInventoryGroundPickup(colshape) {
    if (!colshape || !mp.colshapes.exists(colshape)) return false;
    if (colshape.getVariable('inventoryPickupClaimed') === true) return false;
    colshape.setVariable('inventoryPickupClaimed', true);
    return true;
}

function releaseInventoryGroundPickupClaim(colshape) {
    try {
        if (colshape && mp.colshapes.exists(colshape)) {
            colshape.setVariable('inventoryPickupClaimed', false);
        }
    } catch (_e) {}
}

mp.events.add('pickupWeapon', (player, qtyRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (player.getVariable('dead')) return;
        if (player.getVariable('fly') === true) return;
        if (player.vehicle) return;

        if (player._weaponPickupLockUntil && Date.now() < player._weaponPickupLockUntil) return;

        const colshape = resolvePlayerWeaponPickupColshape(player);
        if (!colshape || !mp.colshapes.exists(colshape)) {
            player.setVariable('currentWeaponColshape', null);
            return;
        }
        if (!playerCloseEnoughToPickup(player, colshape)) {
            player.setVariable('currentWeaponColshape', null);
            clearPlayerGroundPickupHint(player);
            return;
        }

        const weaponName = colshape.getVariable('weaponName');
        if (weaponName == null) {
            player.setVariable('currentWeaponColshape', null);
            return;
        }

        const FixWeaponName = colshape.getVariable('FixWeaponName');
        const textLabel = colshape.getVariable('textLabel');
        const droppedWeapon = colshape.getVariable('droppedWeapon');
        const isSkatePickup = colshape.getVariable('isSkateboardPickup') === true;
        const isConsumablePickup = colshape.getVariable('isConsumablePickup') === true;

        if (!pickupDropEntityExists(colshape)) {
            destroyWeaponPickupWorld(colshape, textLabel, droppedWeapon);
            finishWeaponPickupColshape(player);
            return;
        }

        const invPickupStr = String(weaponName);
        if (isSkatePickup || /^item_skateboard/i.test(invPickupStr.split('(')[0].trim())) {
            if (typeof global.findSkateboardItemInInventory === 'function' && global.findSkateboardItemInInventory(player)) {
                isNotify(player, 2, 'top-mid', 'У вас уже есть скейтборд.', 3000);
                player.setVariable('currentWeaponColshape', null);
                return;
            }
            if (!tryClaimInventoryGroundPickup(colshape)) return;
            player._weaponPickupLockUntil = Date.now() + 380;
            let pushedSkate = false;
            if (global.tryPushInventoryItem) {
                pushedSkate = global.tryPushInventoryItem(player, invPickupStr);
            } else {
                if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                    releaseInventoryGroundPickupClaim(colshape);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                    player.setVariable('currentWeaponColshape', null);
                    return;
                }
                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (global.invGridTryPush) pushedSkate = global.invGridTryPush(player, invPickupStr);
                else { player.inventory.push(invPickupStr); pushedSkate = true; }
            }
            if (!pushedSkate) {
                releaseInventoryGroundPickupClaim(colshape);
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                player.setVariable('currentWeaponColshape', null);
                return;
            }
            const finishSkatePickup = () => {
                if (!mp.players.exists(player)) return;
                destroyWeaponPickupWorld(colshape, textLabel, droppedWeapon);
                finishWeaponPickupColshape(player);
                global.saveInventory(player);
                player.playAnimation('pickup_object', 'pickup_low', 1, 49);
                setTimeout(() => { if (player && mp.players.exists(player)) player.stopAnimation(); }, 1900);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                player.outputChatBox('!{green}Вы подобрали !{red}Скейтборд!{green}.');
            };
            const skateBase = invPickupStr.split('(')[0].trim();
            if (/^item_skateboard#\d+/i.test(skateBase) && typeof global.transferSkateboardInstanceOwnership === 'function') {
                global.transferSkateboardInstanceOwnership(invPickupStr, player.static, finishSkatePickup);
            } else {
                finishSkatePickup();
            }
            return;
        }

        if (invPickupStr.startsWith('frdef:')) {
            if (!tryClaimInventoryGroundPickup(colshape)) return;
            player._weaponPickupLockUntil = Date.now() + 380;
            let pushed = false;
            if (global.tryPushInventoryItem) {
                pushed = global.tryPushInventoryItem(player, invPickupStr);
            } else {
                if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                    releaseInventoryGroundPickupClaim(colshape);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                    player.setVariable('currentWeaponColshape', null);
                    return;
                }
                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (global.invGridTryPush) global.invGridTryPush(player, invPickupStr);
                else player.inventory.push(invPickupStr);
                pushed = true;
            }
            if (!pushed) {
                releaseInventoryGroundPickupClaim(colshape);
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                player.setVariable('currentWeaponColshape', null);
                return;
            }
            try {
                if (colshape && mp.colshapes.exists(colshape)) colshape.destroy();
            } catch (_e0) {}
            try {
                if (textLabel && mp.labels.exists(textLabel)) textLabel.destroy();
            } catch (_e1) {}
            try {
                if (droppedWeapon && mp.objects.exists(droppedWeapon)) droppedWeapon.destroy();
            } catch (_e2) {}
            finishWeaponPickupColshape(player);
            global.saveInventory(player);
            player.playAnimation('pickup_object', 'pickup_low', 1, 49);
            setTimeout(() => {
                if (player && mp.players.exists(player)) player.stopAnimation();
            }, 1900);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            const nice = (global.clothTokenDropLabel && global.clothTokenDropLabel(invPickupStr)) || 'Одежда';
            player.outputChatBox(`!{green}Вы подобрали !{red}${nice}!{green}.`);
            return;
        }
        if (invPickupStr.startsWith('ic1.')) {
            if (!tryClaimInventoryGroundPickup(colshape)) return;
            player._weaponPickupLockUntil = Date.now() + 380;
            let pushedIc1 = false;
            if (global.tryPushInventoryItem) {
                pushedIc1 = global.tryPushInventoryItem(player, invPickupStr);
            } else {
                if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                    releaseInventoryGroundPickupClaim(colshape);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                    player.setVariable('currentWeaponColshape', null);
                    return;
                }
                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (global.invGridTryPush) global.invGridTryPush(player, invPickupStr);
                else player.inventory.push(invPickupStr);
                pushedIc1 = true;
            }
            if (!pushedIc1) {
                releaseInventoryGroundPickupClaim(colshape);
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                player.setVariable('currentWeaponColshape', null);
                return;
            }
            const finishIc1Pickup = () => {
                if (!mp.players.exists(player)) return;
                global.saveInventory(player);
                player.playAnimation('pickup_object', 'pickup_low', 1, 49);
                setTimeout(() => {
                    if (player && mp.players.exists(player)) player.stopAnimation();
                }, 1900);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                const nice = (global.clothTokenDropLabel && global.clothTokenDropLabel(invPickupStr)) || 'Одежда';
                player.outputChatBox(`!{green}Вы подобрали !{red}${nice}!{green}.`);
            };
            const afterBagOwnerPersist = () => {
                try {
                    if (colshape && mp.colshapes.exists(colshape)) colshape.destroy();
                } catch (_e0) {}
                try {
                    if (textLabel && mp.labels.exists(textLabel)) textLabel.destroy();
                } catch (_e1) {}
                try {
                    if (droppedWeapon && mp.objects.exists(droppedWeapon)) droppedWeapon.destroy();
                } catch (_e2) {}
                finishWeaponPickupColshape(player);
                if (typeof global.refreshPlayerDonateBagInstancesFromDb === 'function') {
                    global.refreshPlayerDonateBagInstancesFromDb(player, finishIc1Pickup);
                } else {
                    finishIc1Pickup();
                }
            };
            if (typeof global.transferDonateBagInstanceOwnership === 'function') {
                global.transferDonateBagInstanceOwnership(invPickupStr, player.static, afterBagOwnerPersist);
            } else {
                afterBagOwnerPersist();
            }
            return;
        }
        if (colshape.getVariable('isInvDonateDrop') === true) {
            if (!tryClaimInventoryGroundPickup(colshape)) return;
            const dropMeta = resolveInvDonateDropMeta(invPickupStr);
            if (!dropMeta) {
                releaseInventoryGroundPickupClaim(colshape);
                player.setVariable('currentWeaponColshape', null);
                return;
            }
            player._weaponPickupLockUntil = Date.now() + 380;
            const labelNice = FixWeaponName || donateDropDisplayName(invPickupStr);
            const finalizePickup = () => {
                try {
                    if (colshape && mp.colshapes.exists(colshape)) colshape.destroy();
                } catch (_e0) {}
                try {
                    if (textLabel && mp.labels.exists(textLabel)) textLabel.destroy();
                } catch (_e1) {}
                try {
                    if (droppedWeapon && mp.objects.exists(droppedWeapon)) droppedWeapon.destroy();
                } catch (_e2) {}
                finishWeaponPickupColshape(player);
                global.saveInventory(player);
                player.playAnimation('pickup_object', 'pickup_low', 1, 49);
                setTimeout(() => {
                    if (player && mp.players.exists(player)) player.stopAnimation();
                }, 1900);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                player.outputChatBox(`!{green}Вы подобрали !{red}${labelNice}!{green}.`);
            };
            const rollbackSqlFalse = (col) => {
                global.DB.query(`UPDATE accounts SET ${col} = 'false' WHERE static = ?`, [player.static], () => {});
            };
            if (dropMeta.sqlCol) {
                global.DB.query(`UPDATE accounts SET ${dropMeta.sqlCol} = 'true' WHERE static = ?`, [player.static], (err) => {
                    if (err || !mp.players.exists(player)) {
                        releaseInventoryGroundPickupClaim(colshape);
                        return;
                    }
                    if (!global.tryPushInventoryItem || !global.tryPushInventoryItem(player, invPickupStr)) {
                        rollbackSqlFalse(dropMeta.sqlCol);
                        releaseInventoryGroundPickupClaim(colshape);
                        isNotify(player, 2, 'top-mid', 'Нет места в инвентаре или такой предмет уже есть.', 4000);
                        return;
                    }
                    if (dropMeta.bagKey && global.markPlayerDonateBagOwnedForCurrentFraction) {
                        global.markPlayerDonateBagOwnedForCurrentFraction(player, dropMeta.bagKey);
                    }
                    finalizePickup();
                });
            } else {
                if (!global.tryPushInventoryItem || !global.tryPushInventoryItem(player, invPickupStr)) {
                    releaseInventoryGroundPickupClaim(colshape);
                    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре или такой предмет уже есть.', 4000);
                    player.setVariable('currentWeaponColshape', null);
                    return;
                }
                if (dropMeta.bagKey && global.markPlayerDonateBagOwnedForCurrentFraction) {
                    global.markPlayerDonateBagOwnedForCurrentFraction(player, dropMeta.bagKey);
                }
                finalizePickup();
            }
            return;
        }

        if (isConsumablePickup) {
            if (!tryClaimInventoryGroundPickup(colshape)) return;
            player._weaponPickupLockUntil = Date.now() + 380;
            const consumKey = String(weaponName || '');
            const consumBase = consumKey.split('(')[0].trim();
            const consumM = consumKey.match(/\((\d+)\)/);
            const totalOnGround = consumM ? Math.max(1, parseInt(consumM[1], 10) || 1) : 1;
            let pickQty = parseInt(qtyRaw, 10);
            if (!Number.isFinite(pickQty) || pickQty < 1) pickQty = totalOnGround;
            pickQty = Math.min(pickQty, totalOnGround);

            let pushed = false;
            if (consumBase === 'item_bong' || consumBase === 'item_thermos') {
                pushed = typeof global.invGridTryPush === 'function'
                    ? global.invGridTryPush(player, consumKey)
                    : (player.inventory.push(consumKey), true);
                pickQty = totalOnGround;
            } else if (GROUND_STACK_PICKUP_BASES.has(consumBase)) {
                if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
                    global.mergeConsumableQtyIntoGrid(player, consumBase, pickQty);
                    pushed = true;
                } else {
                    const token = pickQty > 1 ? `${consumBase} (${pickQty})` : consumBase;
                    pushed = typeof global.invGridTryPush === 'function'
                        ? global.invGridTryPush(player, token)
                        : (player.inventory.push(token), true);
                }
            } else {
                if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
                    global.mergeConsumableQtyIntoGrid(player, consumBase, pickQty);
                    pushed = true;
                } else {
                    pushed = typeof global.invGridTryPush === 'function'
                        ? global.invGridTryPush(player, consumKey)
                        : (player.inventory.push(consumKey), true);
                }
            }
            if (!pushed) {
                releaseInventoryGroundPickupClaim(colshape);
                isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
                refreshPlayerWeaponPickupColshape(player);
                return;
            }

            const left = totalOnGround - pickQty;
            const rawPickupLabel = String(FixWeaponName || weaponNames[consumBase] || consumBase);
            const pickupLabelBase = rawPickupLabel
                .replace(/\s+(?:×|x)\d+\s*$/i, '')
                .replace(/\s+\(\d+\)\s*$/, '')
                .trim();
            const labelNice = totalOnGround > 1
                ? `${pickupLabelBase} (${pickQty})`
                : rawPickupLabel;
            if (left > 0 && GROUND_STACK_PICKUP_BASES.has(consumBase)) {
                const newToken = `${consumBase} (${left})`;
                const newLabel = left > 1
                    ? `${weaponNames[consumBase] || consumBase} (${left})`
                    : (weaponNames[consumBase] || consumBase);
                updateConsumableGroundPickupMeta(colshape, newToken, newLabel);
                releaseInventoryGroundPickupClaim(colshape);
                finishWeaponPickupColshape(player);
                finalizeConsumablePickupAnim(player, labelNice);
                return;
            }

            destroyWeaponPickupWorld(colshape, textLabel, droppedWeapon);
            finishWeaponPickupColshape(player);
            finalizeConsumablePickupAnim(player, labelNice);
            return;
        }

        if (!tryClaimInventoryGroundPickup(colshape)) return;
        player._weaponPickupLockUntil = Date.now() + 380;

        if (global.tryPushInventoryItem) {
            if (!global.tryPushInventoryItem(player, weaponName)) {
                releaseInventoryGroundPickupClaim(colshape);
                return;
            }
        } else {
            if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                releaseInventoryGroundPickupClaim(colshape);
                return;
            }
            if (global.invGridTryPush) global.invGridTryPush(player, weaponName);
            else player.inventory.push(weaponName);
        }

        destroyWeaponPickupWorld(colshape, textLabel, droppedWeapon);
        finishWeaponPickupColshape(player);

        global.saveInventory(player);

        player.playAnimation('pickup_object', 'pickup_low', 1, 49);
        setTimeout(() => {
            if (player && mp.players.exists(player)) {
                player.stopAnimation();
            }
        }, 1900);

        login = player.login;
        static = player.static;

        global.sendDiscordLog(`Подбор оружия!\n\nИгрок - ${login} (#${static})\nОружие - ${FixWeaponName} | ${weaponName}`, '1266445828608884767');

        global.DB.query(
            'INSERT INTO logsweapon (static, weapon, dey, ipadr, time) VALUES (?, ?, ?, ?, NOW())',
            [player.static, FixWeaponName, 'подобрал', player.ip],
            (err, result) => {
                if (err) return console.log(err);
            }
        );

        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        player.outputChatBox(`!{green}Вы подобрали оружие !{red}${FixWeaponName}!{green}.`);
    } catch (error) {
        console.log(error);
    }
});

global.performDropItemString = function(player, item) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) {
            return isNotify(player, 2, 'top-mid', 'На арене нельзя выбрасывать предметы.', 3000);
        }
        if (!canDropItemsOnGround(player)) return;

        const rawIt = String(item || '');
        const base = rawIt.split('(')[0].trim();
        if (global.isGridConsumableStackBase && global.isGridConsumableStackBase(base)) {
            const qty = (() => {
                const m = rawIt.match(/\((\d+)\)/);
                return m ? parseInt(m[1], 10) : 1;
            })();
            return global.performDropConsumableQty(player, rawIt, qty);
        }

        if (typeof rawIt === 'string' && rawIt.toLowerCase().startsWith('item_skateboard')) {
            let idx = -1;
            for (let i = 0; i < player.inventory.length; i++) {
                const cell = player.inventory[i];
                if (cell != null && String(cell).toLowerCase().startsWith('item_skateboard')) { idx = i; break; }
            }
            if (idx === -1) return isNotify(player, 2, 'top-mid', 'Предмет не найден в инвентаре.', 3000);
            const droppedToken = String(player.inventory[idx]);
            player.inventory[idx] = null;
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            player.call('skateboard:forceStop', []);
            spawnSkateboardWorldPickup(player, player.position, droppedToken);
            return;
        }

        if (rawIt.startsWith('item_bong') || rawIt.startsWith('item_thermos') || rawIt.startsWith('item_thermocup') || rawIt.startsWith('item_drone')) {
            let dropIdx = -1;
            const dropBase = rawIt.split('(')[0].trim();
            for (let i = 0; i < player.inventory.length; i++) {
                const cell = player.inventory[i];
                if (cell != null && String(cell).startsWith(dropBase)) { dropIdx = i; break; }
            }
            if (dropIdx === -1) return isNotify(player, 2, 'top-mid', 'Предмет не найден в инвентаре.', 3000);
            const dropToken = String(player.inventory[dropIdx]);
            player.inventory[dropIdx] = null;
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            if (dropBase === 'item_drone') player.call('drone:forceStop', []);
            spawnConsumableWorldPickup(player, player.position, dropToken);
            return;
        }

        if (rawIt.startsWith('item_spank') || rawIt.startsWith('item_alco')) {
            return global.performDropConsumableQty(player, rawIt, (() => {
                const m = rawIt.match(/\((\d+)\)/);
                return m ? parseInt(m[1], 10) : 1;
            })());
        }

        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, rawIt)) {
            return isNotify(
                player,
                2,
                'top-mid',
                'Снимите предмет с экипировки или из быстрого слота — такой нельзя выбросить.',
                4500
            );
        }

        if (rawIt.startsWith('ic1.')) {
            if (!global.removeOneInventoryExact || !global.removeOneInventoryExact(player, rawIt)) {
                return isNotify(player, 2, 'top-mid', 'Нет предмета в инвентаре.', 3000);
            }
            if (typeof global.stripDonateBagInstanceLocalStorage === 'function') {
                global.stripDonateBagInstanceLocalStorage(player, rawIt);
            }
            const ic1Base = rawIt.split('(')[0].trim();
            if (typeof global.clearDonateBagFracOnIc1BagRemoved === 'function') {
                global.clearDonateBagFracOnIc1BagRemoved(player, ic1Base);
            }
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            spawnInvTokenWorldPickup(player, player.position, rawIt);
            return;
        }

        if (rawIt.split('(')[0].trim().startsWith('frdef:')) {
            if (!global.removeOneInventoryExact || !global.removeOneInventoryExact(player, rawIt)) {
                return isNotify(player, 2, 'top-mid', 'Нет предмета в инвентаре.', 3000);
            }
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            spawnInvTokenWorldPickup(player, player.position, rawIt);
            return;
        }

        if (rawIt.startsWith('ivhol:') || rawIt.startsWith('ivbag:')) {
            const canon = typeof global.canonicalDonateToken === 'function' ? global.canonicalDonateToken(rawIt) : rawIt.split('(')[0].trim();
            const dropMeta = resolveInvDonateDropMeta(canon);
            if (!dropMeta) return isNotify(player, 2, 'top-mid', 'Этот предмет нельзя выбросить.', 3000);
            if (!global.removeFirstInventoryDonate || !global.removeFirstInventoryDonate(player, rawIt)) {
                return isNotify(player, 2, 'top-mid', 'Нет предмета в инвентаре.', 3000);
            }
            if (typeof global.stripDonateWearableIfEquipped === 'function') global.stripDonateWearableIfEquipped(player, canon);
            const position = player.position;
            const afterDrop = () => {
                if (dropMeta.bagKey && global.clearPlayerDonateBagFracIfHoldingKey) {
                    global.clearPlayerDonateBagFracIfHoldingKey(player, dropMeta.bagKey);
                }
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                spawnInvTokenWorldPickup(player, position, canon);
            };
            if (dropMeta.sqlCol) {
                global.DB.query(`UPDATE accounts SET ${dropMeta.sqlCol} = 'false' WHERE static = ?`, [player.static], (err) => {
                    if (err || !mp.players.exists(player)) {
                        if (mp.players.exists(player)) {
                            if (global.tryPushInventoryItem) global.tryPushInventoryItem(player, canon);
                            else if (global.invGridTryPush) global.invGridTryPush(player, canon);
                            else player.inventory.push(canon);
                            isNotify(player, 2, 'top-mid', 'Не удалось выбросить предмет.', 3000);
                        }
                        return;
                    }
                    afterDrop();
                });
            } else {
                afterDrop();
            }
            return;
        }

        const baseDrop = String(item).split('(')[0].trim();
        const FixWeaponName = global.formweap(baseDrop);

        if (FixWeaponName === "Revolver") return isNotify(player, 2, "top-mid", `Выкинуть обычный револьвер нельзя.`, 3000);
        if (FixWeaponName === "Musket") return isNotify(player, 2, "top-mid", `Выкинуть ивентовое оружие нельзя.`, 3000);
        if (FixWeaponName === "Heavy Sniper MK1") return isNotify(player, 2, "top-mid", `Это оружие нельзя выкинуть.`, 3000);
        if (FixWeaponName === "Sniper Rifle") return isNotify(player, 2, "top-mid", `Выкинуть снайперскую винтовку нельзя.`, 3000);
        if (FixWeaponName === "Marksman Rifle") return isNotify(player, 2, "top-mid", `Это оружие нельзя выкинуть.`, 3000);

        let removed = false;

            for (let i = 0; i < player.inventory.length; i++) {
                if (player.inventory[i] === item) {
                    player.inventory[i] = null;
                    removed = true;
                    break;
                }
            }

        if (!removed) {
            for (let i = 0; i < player.fastSlots.length; i++) {
                if (player.fastSlots[i] === item) {
                    player.fastSlots.splice(i, 1);
                    removed = true;
                    break;
                }
            }
        }

        if (!removed) {
            return;
        }

        login = player.login;
        static = player.static;

        global.sendDiscordLog(`Выброс оружия!\n\nИгрок - ${login} (#${static})\nОружие - ${FixWeaponName} | ${item}`, '1266445828608884767')

        global.DB.query(
            'INSERT INTO logsweapon (static, weapon, dey, ipadr, time) VALUES (?, ?, ?, ?, NOW())', 
            [player.static, FixWeaponName, 'выкинул', player.ip], 
            (err, result) => {
                if (err) return console.log(err);
            }
        );

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        const position = player.position;
        spawnWeaponWorldPickup(player, position, item);
    } catch (error) {
        console.log(error);
    }
};
mp.events.add('dropItem', (player, item) => global.performDropItemString(player, item));

global.performDropConsumableQty = function (player, itemToken, qtyRaw) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!canDropItemsOnGround(player)) return;
        const rawIt = String(itemToken || '');
        const base = rawIt.split('(')[0].trim();
        if (!global.isGridConsumableStackBase || !global.isGridConsumableStackBase(base)) {
            return global.performDropItemString(player, rawIt);
        }
        const { removeStackQtyFromPlayer, countStackBaseOnPlayer } = require('./config/combat_loadout.js');
        const have = countStackBaseOnPlayer(player, base);
        if (have < 1) return isNotify(player, 2, 'top-mid', 'Предмет не найден в инвентаре.', 3000);
        let qty = parseInt(qtyRaw, 10);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;
        if (qty > have) qty = have;
        if (!removeStackQtyFromPlayer(player, base, qty)) {
            return isNotify(player, 2, 'top-mid', 'Не удалось выбросить предмет.', 3000);
        }
        const dropToken = qty === 1 ? base : `${base} (${qty})`;
        spawnConsumableWorldPickup(player, player.position, dropToken);
    } catch (e) {
        console.log('[performDropConsumableQty]', e.message || e);
    }
};

mp.events.add('dropItemQty', (player, payloadJson) => {
    try {
        let data = payloadJson;
        if (typeof payloadJson === 'string') {
            try { data = JSON.parse(payloadJson); } catch (_) { return; }
        }
        if (!data || !data.item) return;
        global.performDropConsumableQty(player, data.item, data.q);
    } catch (e) {
        console.log('[dropItemQty]', e.message || e);
    }
});

function canDropItemsOnGround(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (Number(player.dimension) !== 0) {
        isNotify(player, 2, 'top-mid', 'Выкинуть предметы можно только в основном измерении.', 3000);
        return false;
    }
    return true;
}

function normalizeDropSlotType(typeRaw) {
    const t = String(typeRaw || '').trim().toLowerCase();
    return t === 'bag' ? 'bag' : 'grid';
}

function canDropExactSlotToken(player, item) {
    const raw = String(item || '');
    const base = raw.split('(')[0].trim();
    if (base.startsWith('weapon_')) {
        const fixed = global.formweap(base);
        if (fixed === 'Revolver') {
            isNotify(player, 2, 'top-mid', 'Выкинуть обычный револьвер нельзя.', 3000);
            return false;
        }
        if (fixed === 'Musket') {
            isNotify(player, 2, 'top-mid', 'Выкинуть ивентовое оружие нельзя.', 3000);
            return false;
        }
        if (fixed === 'Heavy Sniper MK1') {
            isNotify(player, 2, 'top-mid', 'Это оружие нельзя выкинуть.', 3000);
            return false;
        }
        if (fixed === 'Sniper Rifle') {
            isNotify(player, 2, 'top-mid', 'Выкинуть снайперскую винтовку нельзя.', 3000);
            return false;
        }
        if (fixed === 'Marksman Rifle') {
            isNotify(player, 2, 'top-mid', 'Это оружие нельзя выкинуть.', 3000);
            return false;
        }
    }
    if (typeof global.inventoryItemIsBlockedForTransfer === 'function') {
        const savedFastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : null;
        let restored = false;
        if (savedFastSlots) {
            const rawBase = raw.split('(')[0].trim().split('#')[0].trim();
            player.fastSlots = player.fastSlots.filter((slot) => {
                if (!slot) return false;
                const slotBase = String(slot).split('(')[0].trim().split('#')[0].trim();
                return slotBase !== rawBase;
            });
            restored = true;
        }
        const blocked = global.inventoryItemIsBlockedForTransfer(player, raw);
        if (restored) player.fastSlots = savedFastSlots;
        if (blocked) {
            isNotify(player, 2, 'top-mid', 'Снимите предмет с экипировки — такой нельзя выбросить.', 4500);
            return false;
        }
    }
    return true;
}

function dropTokenFromExactSlot(player, slotTypeRaw, indexRaw, qtyRaw) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return null;
    if (!canDropItemsOnGround(player)) return null;
    const slotType = normalizeDropSlotType(slotTypeRaw);
    const idx = parseInt(indexRaw, 10);
    if (!Number.isInteger(idx) || idx < 0) return null;

    if (slotType === 'bag') {
        if (
            typeof global.syncBagContentsArrayToCapacity !== 'function' ||
            typeof global.getActiveBagCapacity !== 'function'
        )
            return null;
        global.syncBagContentsArrayToCapacity(player);
        const cap = global.getActiveBagCapacity(player);
        if (cap <= 0 || idx >= cap || !Array.isArray(player._bagContentsFull)) return null;
        const item = player._bagContentsFull[idx];
        if (item == null || item === '') return null;
        if (!canDropExactSlotToken(player, item)) return null;
        const base = String(item).split('(')[0].trim();
        if (global.isGridConsumableStackBase && global.isGridConsumableStackBase(base)) {
            const stackQty = (() => {
                const m = String(item).match(/\((\d+)\)/);
                return m ? parseInt(m[1], 10) : 1;
            })();
            let q = parseInt(qtyRaw, 10);
            if (!Number.isFinite(q) || q < 1) q = stackQty;
            q = Math.min(q, stackQty);
            const rem = stackQty - q;
            player._bagContentsFull[idx] = rem <= 0 ? null : rem === 1 ? base : `${base} (${rem})`;
            global.syncBagContentsArrayToCapacity(player);
            return q === 1 ? base : `${base} (${q})`;
        }
        player._bagContentsFull[idx] = null;
        global.syncBagContentsArrayToCapacity(player);
        return String(item);
    }

    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    if (!Array.isArray(player.inventory) || idx >= player.inventory.length) return null;
    const item = player.inventory[idx];
    if (item == null || item === '') return null;
    if (!canDropExactSlotToken(player, item)) return null;
    const base = String(item).split('(')[0].trim();
    if (global.isGridConsumableStackBase && global.isGridConsumableStackBase(base)) {
        const stackQty = (() => {
            const m = String(item).match(/\((\d+)\)/);
            return m ? parseInt(m[1], 10) : 1;
        })();
        let q = parseInt(qtyRaw, 10);
        if (!Number.isFinite(q) || q < 1) q = stackQty;
        q = Math.min(q, stackQty);
        const rem = stackQty - q;
        player.inventory[idx] = rem <= 0 ? null : rem === 1 ? base : `${base} (${rem})`;
        return q === 1 ? base : `${base} (${q})`;
    }
    player.inventory[idx] = null;
    return String(item);
}

function finishDropExactSlot(player, dropToken) {
    if (!dropToken) return;
    const base = String(dropToken).split('(')[0].trim();
    const normalizedBase = typeof global.skateboardItemBase === 'function'
        ? global.skateboardItemBase(base)
        : base.split('#')[0].trim();
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    if (normalizedBase === 'item_skateboard') {
        player.call('skateboard:forceStop', []);
        spawnSkateboardWorldPickup(player, player.position, dropToken);
        return;
    }
    if (base === 'item_drone') {
        player.call('drone:forceStop', []);
        spawnConsumableWorldPickup(player, player.position, dropToken);
        return;
    }
    if (base.startsWith('weapon_')) spawnWeaponWorldPickup(player, player.position, dropToken);
    else if (
        (global.isGridConsumableStackBase && global.isGridConsumableStackBase(base)) ||
        base === 'item_bong' ||
        base === 'item_thermos'
    )
        spawnConsumableWorldPickup(player, player.position, dropToken);
    else spawnInvTokenWorldPickup(player, player.position, dropToken);
}

mp.events.add('inventory:dropSlot', (player, slotType, index) => {
    try {
        const token = dropTokenFromExactSlot(player, slotType, index, -1);
        finishDropExactSlot(player, token);
    } catch (e) {
        console.log('[inventory:dropSlot]', e.message || e);
    }
});

mp.events.add('inventory:dropSlotQty', (player, slotType, index, qty) => {
    try {
        const token = dropTokenFromExactSlot(player, slotType, index, qty);
        finishDropExactSlot(player, token);
    } catch (e) {
        console.log('[inventory:dropSlotQty]', e.message || e);
    }
});

function setFastSlotInternal(player, item, preferredSlotRaw) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
        if (!Array.isArray(player.inventory)) player.inventory = [];

        if (typeof global.captCheckFastSlot === 'function' && global.captCheckFastSlot(player, item)) return;
        if (typeof global.bizwarCheckFastSlot === 'function' && global.bizwarCheckFastSlot(player, item)) return;

        const rawFs = String(item == null ? '' : item);
        const base = fastSlotItemBaseName(rawFs);
        if (base === 'item_spank' || base === 'item_alco' || base === 'Бронежилет' || base === 'Аптечка' || base === 'item_bong' || base === 'item_thermos' || base === 'item_drone' || base === 'item_skateboard') {
            isNotify(player, 2, 'top-mid', 'Этот предмет нельзя положить в быстрый слот.', 3000);
            return;
        }
        if (
            rawFs.startsWith('ic1.') ||
            rawFs.startsWith('frdef:') ||
            rawFs.startsWith('ivhol:') ||
            rawFs.startsWith('ivbag:')
        ) {
            isNotify(player, 2, 'top-mid', 'Одежду нельзя положить в быстрый слот.', 3000);
            return;
        }

        const invIdx = player.inventory.findIndex((cell) => cell && cell === item);
        const sourceFastIndex = invIdx === -1
            ? player.fastSlots.findIndex((slot) => slot && slot === item)
            : -1;

        let targetSlot = -1;
        if (preferredSlotRaw !== undefined && preferredSlotRaw !== null) {
            targetSlot = parseInt(preferredSlotRaw, 10);
            if (!Number.isInteger(targetSlot) || targetSlot < 0 || targetSlot >= 3) return;
        } else {
            targetSlot = player.fastSlots.indexOf('');
        }

        if (invIdx !== -1) {
            const addConflict = fastSlotFindConflict(player.fastSlots, base, []);
            if (addConflict) {
                isNotify(player, 2, 'top-mid', fastSlotConflictMessage(addConflict), 3000);
                return;
            }
            if (targetSlot === -1) {
                isNotify(player, 2, 'top-mid', 'Нет свободных быстрых слотов.', 3000);
                return;
            }

            const currentInTarget = player.fastSlots[targetSlot] || '';
            player.inventory[invIdx] = null;

            if (currentInTarget) {
                if (global.invGridTryPush && !global.invGridTryPush(player, currentInTarget)) {
                    player.inventory[invIdx] = item;
                    return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
                }
                if (!global.invGridTryPush) player.inventory.push(currentInTarget);
            }

            player.fastSlots[targetSlot] = item;
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            return;
        }

        if (sourceFastIndex !== -1) {
            if (preferredSlotRaw === undefined || preferredSlotRaw === null) {
                targetSlot = player.fastSlots.indexOf('');
            }
            if (targetSlot === -1) {
                isNotify(player, 2, 'top-mid', 'Нет свободных быстрых слотов.', 3000);
                return;
            }
            if (targetSlot === sourceFastIndex) {
                isNotify(player, 2, 'top-mid', 'Это оружие уже выбрано в быстром слоте.', 3000);
                return;
            }
            const moveConflict = fastSlotFindConflict(player.fastSlots, base, [targetSlot, sourceFastIndex]);
            if (moveConflict) {
                isNotify(player, 2, 'top-mid', fastSlotConflictMessage(moveConflict), 3000);
                return;
            }

            const currentInTarget = player.fastSlots[targetSlot] || '';
            player.fastSlots[sourceFastIndex] = currentInTarget;
            player.fastSlots[targetSlot] = item;

            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            return;
        }
    } catch (error) {
        console.log(error);
    }
}

function fastSlotItemIsWeapon(itemStr) {
    const base = String(itemStr || '').split('(')[0].trim().split('#')[0].trim();
    return base.indexOf('weapon_') === 0;
}

function clearActiveFastWeaponVisual(player, fastIdx) {
    const active = player.getVariable('activeWeaponSlot');
    if (active === null || active === undefined || Number(active) !== fastIdx) return;
    removeWeapons(player);
    player.setVariable('activeWeaponSlot', null);
    player.call('hideAmmo');
}

function emitPlayerInventoryFast(player) {
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
}

function swapFastSlotWithGrid(player, fi, gi) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!Number.isInteger(fi) || fi < 0 || fi > 2) return;
    const maxGrid = typeof global.getInventoryMaxSlots === 'function' ? global.getInventoryMaxSlots() : 20;
    if (!Number.isInteger(gi) || gi < 0 || gi >= maxGrid) return;
    global.ensureInventoryGrid50(player);
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    const weaponFast = player.fastSlots[fi];
    const weaponGrid = player.inventory[gi];
    if (!weaponFast || weaponGrid == null || weaponGrid === '') return;
    if (!fastSlotItemIsWeapon(weaponGrid)) {
        return isNotify(player, 2, 'top-mid', 'Можно менять местами только с другим оружием.', 3000);
    }
    if (typeof global.captCheckFastSlot === 'function' && global.captCheckFastSlot(player, weaponGrid)) {
        return isNotify(player, 2, 'top-mid', 'Нельзя! Это оружие не подходит по калибру.', 3000);
    }
    if (typeof global.bizwarCheckFastSlot === 'function' && global.bizwarCheckFastSlot(player, weaponGrid)) {
        return isNotify(player, 2, 'top-mid', 'Нельзя! Это оружие не подходит по калибру.', 3000);
    }
    clearActiveFastWeaponVisual(player, fi);
    player.fastSlots[fi] = weaponGrid;
    player.inventory[gi] = weaponFast;
    emitPlayerInventoryFast(player);
}

function moveFastSlotToGrid(player, fastIdxRaw, gridIdxRaw) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    const fi = parseInt(fastIdxRaw, 10);
    const gi = parseInt(gridIdxRaw, 10);
    if (!Number.isInteger(fi) || fi < 0 || fi > 2) return;
    const maxGrid = typeof global.getInventoryMaxSlots === 'function' ? global.getInventoryMaxSlots() : 20;
    if (!Number.isInteger(gi) || gi < 0 || gi >= maxGrid) return;
    global.ensureInventoryGrid50(player);
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    const weaponItem = player.fastSlots[fi];
    if (!weaponItem) return;
    const gridItem = player.inventory[gi];
    if (gridItem != null && gridItem !== '') {
        return swapFastSlotWithGrid(player, fi, gi);
    }
    clearActiveFastWeaponVisual(player, fi);
    player.fastSlots[fi] = '';
    player.inventory[gi] = weaponItem;
    emitPlayerInventoryFast(player);
}

mp.events.add('inventory:fastSlotToGrid', (player, fastIdx, gridIdx) => {
    try {
        moveFastSlotToGrid(player, fastIdx, gridIdx);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('inventory:fastSlotGridSwap', (player, fastIdx, gridIdx) => {
    try {
        swapFastSlotWithGrid(player, parseInt(fastIdx, 10), parseInt(gridIdx, 10));
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('setFastSlot', (player, item) => {
    if (player && mp.players.exists(player) && player.getVariable('inMbaArena') === true) {
        return isNotify(player, 2, 'top-mid', 'На арене нельзя менять быстрые слоты.', 3000);
    }
    setFastSlotInternal(player, item);
});

mp.events.add('setFastSlotAt', (player, item, slotIndex) => {
    if (player && mp.players.exists(player) && player.getVariable('inMbaArena') === true) {
        return isNotify(player, 2, 'top-mid', 'На арене нельзя менять быстрые слоты.', 3000);
    }
    setFastSlotInternal(player, item, slotIndex);
});

mp.events.add('removeFastSlot1', (player, item) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) {
            return isNotify(player, 2, 'top-mid', 'На арене нельзя убирать оружие из слота.', 3000);
        }

        if (player.fastSlots[0] && player.fastSlots[0] === item) {
            player.fastSlots[0] = "";
            removeWeapons(player);
            player.setVariable('activeWeaponSlot', null);
            player.call('hideAmmo');
            if (global.invGridTryPush && !global.invGridTryPush(player, item)) {
                player.fastSlots[0] = item;
                return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
            }
            if (!global.invGridTryPush) player.inventory.push(item);
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('removeFastSlot2', (player, item) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) {
            return isNotify(player, 2, 'top-mid', 'На арене нельзя убирать оружие из слота.', 3000);
        }

        if (player.fastSlots[1] && player.fastSlots[1] === item) {
            player.fastSlots[1] = "";
            removeWeapons(player);
            player.setVariable('activeWeaponSlot', null);
            player.call('hideAmmo');
            if (global.invGridTryPush && !global.invGridTryPush(player, item)) {
                player.fastSlots[1] = item;
                return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
            }
            if (!global.invGridTryPush) player.inventory.push(item);
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('removeFastSlot3', (player, item) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') === true) {
            return isNotify(player, 2, 'top-mid', 'На арене нельзя убирать оружие из слота.', 3000);
        }

        if (player.fastSlots[2] && player.fastSlots[2] === item) {
            player.fastSlots[2] = "";
            removeWeapons(player);
            player.setVariable('activeWeaponSlot', null);
            player.call('hideAmmo');
            if (global.invGridTryPush && !global.invGridTryPush(player, item)) {
                player.fastSlots[2] = item;
                return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
            }
            if (!global.invGridTryPush) player.inventory.push(item);
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('giveParachute', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.vehicle) return;
        if (player.getVariable('dead')) return;
        const hash = mp.joaat('gadget_parachute');
        player.call('givegun', [hash]);
    } catch (error) {
        console.log(error);
    }
});

require('./inventory_equipment.js');
require('./inventory_grid.js');

/** Вернуть ic1-сумки из очереди pending в сетку (место в инвентаре; фракция не используется). */
global.unstashDonateBagIc1ForCurrentFraction = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return false;
    if (typeof global.ensurePlayerDonateBagStateShape === 'function') global.ensurePlayerDonateBagStateShape(player);
    if (!Array.isArray(player._donateBagIc1Pending) || player._donateBagIc1Pending.length === 0) return false;
    let changed = false;
    const baseInContainers = (base) => {
        const scan = (arr) => {
            if (!Array.isArray(arr)) return false;
            for (let i = 0; i < arr.length; i++) {
                const raw = arr[i];
                if (typeof raw !== 'string' || !raw.startsWith('ic1.')) continue;
                if (raw.split('(')[0].trim() === base) return true;
            }
            return false;
        };
        return scan(player.inventory) || scan(player.fastSlots);
    };
    const remain = [];
    for (let si = 0; si < player._donateBagIc1Pending.length; si++) {
        const tok = player._donateBagIc1Pending[si];
        if (typeof tok !== 'string' || !tok.startsWith('ic1.')) continue;
        const b = tok.split('(')[0].trim();
        if (typeof global.isRegisteredDonateBagIc1Token === 'function' && !global.isRegisteredDonateBagIc1Token(tok)) {
            changed = true;
            continue;
        }
        if (baseInContainers(b)) {
            changed = true;
            continue;
        }
        if (global.invGridTryPush && global.invGridTryPush(player, tok)) changed = true;
        else remain.push(tok);
    }
    player._donateBagIc1Pending = remain;
    return changed;
};

global.stashDonateBagIc1TokenForFraction = function (player, _fkIgnored, itemStr) {
    if (!mp.players.exists(player) || itemStr == null || itemStr === '') return;
    if (typeof global.ensurePlayerDonateBagStateShape === 'function') global.ensurePlayerDonateBagStateShape(player);
    if (!Array.isArray(player._donateBagIc1Pending)) player._donateBagIc1Pending = [];
    player._donateBagIc1Pending.push(String(itemStr));
};

/**
 * Перед отправкой сетки на клиент: убрать «чужие» сумки в тайник, чтобы в UI не висели и не пропадали по клику.
 * Возвращает true, если инвентарь менялся (имеет смысл сохранить).
 */
global.prepareInventoryOutboundForPlayer = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return false;
    if (typeof global.sanitizeDonateInventory === 'function') {
        try {
            return global.sanitizeDonateInventory(player);
        } catch (_e) {}
    }
    return false;
};

global.emitPlayerInventory = function (player) {
    if (!mp.players.exists(player)) return;
    let dirty = false;
    if (typeof global.prepareInventoryOutboundForPlayer === 'function') {
        if (global.prepareInventoryOutboundForPlayer(player)) dirty = true;
    }
    if (dirty && typeof global.saveInventory === 'function') {
        global.saveInventory(player);
    }
    if (typeof global.buildEquipSnapshotAsync === 'function') {
        global.buildEquipSnapshotAsync(player, (snap) => {
            player.call('updateInventory', [
                JSON.stringify(player.inventory),
                JSON.stringify(player.fastSlots),
                JSON.stringify(snap)
            ]);
        });
    } else {
        player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    }
};

global.sendLoadInventoryClient = function (player) {
    if (!mp.players.exists(player)) return;
    let dirty = false;
    if (typeof global.prepareInventoryOutboundForPlayer === 'function') {
        if (global.prepareInventoryOutboundForPlayer(player)) dirty = true;
    }
    if (dirty && typeof global.saveInventory === 'function') {
        global.saveInventory(player);
    }
    if (typeof global.buildEquipSnapshotAsync === 'function') {
        global.buildEquipSnapshotAsync(player, (snap) => {
            player.call('loadInventory', [
                JSON.stringify(player.inventory),
                JSON.stringify(player.fastSlots),
                JSON.stringify(snap)
            ]);
        });
    } else {
        player.call('loadInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    }
};

mp.events.add('legacy:inventory:drop',(p,request,slot,index,expected)=>{
 let ok=false,message='Предмет не удалось выбросить.';
 try{
  if(!mp.players.exists(p)||p.getVariable('auth')!==true||!p._legacySpawned)return;
  if(typeof request!=='string'||request.length>80||typeof expected!=='string'||expected.length>32768||!Number.isInteger(index)||index<0||index>200)return;
  if(p.getVariable('dead')===true||p.getVariable('inMbaArena')===true)throw Error('Сейчас нельзя выбрасывать предметы.');
  if(!['grid','bag','weapon'].includes(slot))throw Error('Некорректный слот.');
  if(!canDropItemsOnGround(p))throw Error('Выбрасывать предметы можно только в игровом мире.');
  if(slot==='weapon'){
   if(!Array.isArray(p.fastSlots)||p.fastSlots[index]!==expected)throw Error('Слот изменился. Откройте инвентарь заново.');
   if(!canDropExactSlotToken(p,expected))throw Error('Этот предмет нельзя передать.');
   p.fastSlots[index]='';removeWeapons(p);p.setVariable('activeWeaponSlot',null);p.call('hideAmmo');finishDropExactSlot(p,expected);ok=true;
  }else{
   const array=slot==='bag'?p._bagContentsFull:p.inventory;
   if(!Array.isArray(array)||array[index]!==expected)throw Error('Слот изменился. Откройте инвентарь заново.');
   const token=dropTokenFromExactSlot(p,slot,index,-1);
   if(!token)throw Error('Сначала снимите предмет с экипировки или закройте обмен.');
   finishDropExactSlot(p,token);ok=true;
  }
  console.log('[INVENTORY DROP] CID='+p.static+' slot='+slot+' index='+index+' success='+ok);
 }catch(e){message=e.message;}
 if(mp.players.exists(p))p.call('legacy:inventory:ack',[request,ok,ok?'':message]);
});

bandolierStorage.register();
