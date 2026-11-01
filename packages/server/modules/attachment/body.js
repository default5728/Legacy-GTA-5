/**
 * Оружие на теле: только из быстрых слотов (0–2), не то что в руках — показывается на теле.
 * Кобура (правое бедро): револьверы + Mini SMG — одна точка, как у ревика.
 * За спиной максимум 2: первое по слотам — слева, второе — справа (любые «длинные»).
 */
const weaponData = require('./weaponData.json');

/** Поиск по HashKey (WEAPON_*), если по uint-хешу из mp.joaat('weapon_*') ключ в JSON не совпал с сервером. */
const WEAPON_BY_HASHKEY = {};
for (const k of Object.keys(weaponData)) {
    const e = weaponData[k];
    if (e && e.HashKey) WEAPON_BY_HASHKEY[e.HashKey] = e;
}

/** DLC / отсутствует в weaponData.json — только для резолва имени и крепления на спине */
const WEAPON_EXTRA_BY_HASHKEY = {
    WEAPON_PRECISIONRIFLE: {
        HashKey: 'WEAPON_PRECISIONRIFLE',
        ModelHashKey: 'w_sr_precisionrifle_reh'
    }
};
for (const hk of Object.keys(WEAPON_EXTRA_BY_HASHKEY)) {
    if (!WEAPON_BY_HASHKEY[hk]) WEAPON_BY_HASHKEY[hk] = WEAPON_EXTRA_BY_HASHKEY[hk];
}

/** Игровой хеш = mp.joaat('weapon_*'), не joaat('WEAPON_*'). */
function joaatFromHashKey(weaponKey) {
    if (!weaponKey || typeof weaponKey !== 'string' || !weaponKey.startsWith('WEAPON_')) return 0;
    const base = 'weapon_' + weaponKey.slice(7).toLowerCase();
    return mp.joaat(base) >>> 0;
}

function weaponDataEntryByHash(hash) {
    if (hash === undefined || hash === null) return null;
    const u = hash >>> 0;
    return weaponData[String(u)] || weaponData[u] || null;
}

/** Инвентарь хранит weapon_*; надёжно получить запись weaponData по HashKey, если joaat дал другой uint. */
function resolveWeaponEntryFromInventoryBase(base) {
    if (!base || typeof base !== 'string') return null;
    const norm = base.trim().toLowerCase();
    if (!norm.startsWith('weapon_')) return null;
    const u = mp.joaat(norm) >>> 0;
    let entry = weaponDataEntryByHash(u);
    if (entry && entry.ModelHashKey && entry.HashKey !== 'WEAPON_UNARMED') return entry;
    const hk = 'WEAPON_' + norm.slice(7).toUpperCase();
    entry = WEAPON_BY_HASHKEY[hk];
    if (entry && entry.ModelHashKey) return entry;
    return null;
}

function weaponSlotMatchesHeldWeapon(slotHashU, heldU) {
    return (slotHashU >>> 0) === (heldU >>> 0);
}

const pos = {
    pistol: new mp.Vector3(0.02, 0.06, 0.1),
    pistolRot: new mp.Vector3(-100, 0, 0),
    smg: new mp.Vector3(0.08, 0.03, -0.1),
    smgRot: new mp.Vector3(-80.77, 0, 0),
    /** Левая сторона спины (первое «длинное» в быстрых слотах) */
    backLeft: new mp.Vector3(-0.1, -0.15, 0.11),
    backLeftRot: new mp.Vector3(-180, 0, 0),
    /** Правая сторона спины (второе «длинное») */
    backRight: new mp.Vector3(-0.1, -0.15, -0.13),
    backRightRot: new mp.Vector3(0, 0, 3.5)
};

/** Кобура (правое бедро): револьверы + Mini SMG — одна точка, как у ревика */
const LEGS_RIGHT_HOLSTER = ['WEAPON_REVOLVER', 'WEAPON_REVOLVER_MK2', 'WEAPON_MINISMG'];

const BACK_LEFT_SHOTGUN = [
    'WEAPON_PUMPSHOTGUN', 'WEAPON_PUMPSHOTGUN_MK2', 'WEAPON_SAWNOFFSHOTGUN', 'WEAPON_ASSAULTSHOTGUN',
    'WEAPON_BULLPUPSHOTGUN', 'WEAPON_HEAVYSHOTGUN'
];

const BACK_RIGHT_REST = [
    'WEAPON_ASSAULTRIFLE', 'WEAPON_ASSAULTRIFLE_MK2', 'WEAPON_CARBINERIFLE', 'WEAPON_CARBINERIFLE_MK2',
    'WEAPON_SPECIALCARBINE', 'WEAPON_SPECIALCARBINE_MK2', 'WEAPON_MARKSMANRIFLE', 'WEAPON_MARKSMANRIFLE_MK2',
    'WEAPON_BULLPUPRIFLE', 'WEAPON_BULLPUPRIFLE_MK2', 'WEAPON_ADVANCEDRIFLE', 'WEAPON_SNIPERRIFLE', 'WEAPON_HEAVYSNIPER', 'WEAPON_HEAVYSNIPER_MK2',
    'WEAPON_PRECISIONRIFLE',
    'WEAPON_COMBATMG', 'WEAPON_COMBATMG_MK2', 'WEAPON_RPG', 'WEAPON_GRENADELAUNCHER', 'WEAPON_MINIGUN',
    'WEAPON_RAYMINIGUN', 'WEAPON_RAILGUN',
    'WEAPON_PISTOL', 'WEAPON_PISTOL_MK2', 'WEAPON_COMBATPISTOL', 'WEAPON_APPISTOL', 'WEAPON_STUNGUN',
    'WEAPON_PISTOL50', 'WEAPON_SNSPISTOL', 'WEAPON_SNSPISTOL_MK2', 'WEAPON_HEAVYPISTOL', 'WEAPON_VINTAGEPISTOL',
    'WEAPON_DOUBLEACTION', 'WEAPON_RAYPISTOL',
    'WEAPON_MICROSMG', 'WEAPON_SMG', 'WEAPON_SMG_MK2', 'WEAPON_ASSAULTSMG', 'WEAPON_COMBATPDW', 'WEAPON_MACHINEPISTOL',
    'WEAPON_DBSHOTGUN'
];

const WEAPON_BODY_LAYOUT = [
    { slot: 'RIGHT_THIGH', bone: 51826, pos: pos.pistol, rot: pos.pistolRot, keys: LEGS_RIGHT_HOLSTER },
    { slot: 'LEFT_BACK', bone: 24818, pos: pos.backLeft, rot: pos.backLeftRot, keys: BACK_LEFT_SHOTGUN },
    { slot: 'RIGHT_BACK', bone: 24818, pos: pos.backRight, rot: pos.backRightRot, keys: BACK_RIGHT_REST }
];

const weaponAttachmentData = {};

for (const row of WEAPON_BODY_LAYOUT) {
    for (const key of row.keys) {
        weaponAttachmentData[key] = {
            Slot: row.slot,
            AttachBone: row.bone,
            AttachPosition: row.pos,
            AttachRotation: row.rot
        };
    }
}

for (const weaponKey of Object.keys(weaponAttachmentData)) {
    const hash = joaatFromHashKey(weaponKey);
    let entry = weaponDataEntryByHash(hash);
    if (!entry || !entry.ModelHashKey) {
        entry = WEAPON_BY_HASHKEY[weaponKey] || null;
    }
    if (!entry || !entry.ModelHashKey) {
        delete weaponAttachmentData[weaponKey];
        continue;
    }
    weaponAttachmentData[weaponKey].AttachName = `WDSP_${entry.HashKey}`;
    weaponAttachmentData[weaponKey].AttachModel = entry.ModelHashKey;
}

/**
 * Кобура: Mark II / ревик часто выпадают из цикла выше, если mp.joaat('weapon_*') не совпал с ключами weaponData.
 * Всегда добиваем слоты бедра из WEAPON_BY_HASHKEY + фиксированные модели для ревиков.
 */
const HOLSTER_MODEL_FALLBACK = {
    WEAPON_REVOLVER: 'w_pi_revolver',
    WEAPON_REVOLVER_MK2: 'w_pi_revolvermk2',
    WEAPON_MINISMG: 'w_sb_minismg'
};
for (const hk of LEGS_RIGHT_HOLSTER) {
    const fromData = WEAPON_BY_HASHKEY[hk];
    let model = (fromData && fromData.ModelHashKey) ? fromData.ModelHashKey : HOLSTER_MODEL_FALLBACK[hk];
    if (!model) continue;
    const hkName = fromData && fromData.HashKey ? fromData.HashKey : hk;
    weaponAttachmentData[hk] = {
        Slot: 'RIGHT_THIGH',
        AttachBone: 51826,
        AttachPosition: pos.pistol,
        AttachRotation: pos.pistolRot,
        AttachName: `WDSP_${hkName}`,
        AttachModel: model
    };
}

/** Отдельные точки: любое «длинное» оружие на левую / правую сторону спины (не два с одной стороны). */
const weaponAttachmentBackLeft = {};
const weaponAttachmentBackRight = {};
for (const key of Object.keys(weaponAttachmentData)) {
    const w = weaponAttachmentData[key];
    if (w.Slot !== 'LEFT_BACK' && w.Slot !== 'RIGHT_BACK') continue;
    weaponAttachmentBackLeft[key] = {
        AttachName: `WDSP_${key}_SBL`,
        AttachModel: w.AttachModel,
        AttachBone: w.AttachBone,
        AttachPosition: pos.backLeft,
        AttachRotation: pos.backLeftRot
    };
    weaponAttachmentBackRight[key] = {
        AttachName: `WDSP_${key}_SBR`,
        AttachModel: w.AttachModel,
        AttachBone: w.AttachBone,
        AttachPosition: pos.backRight,
        AttachRotation: pos.backRightRot
    };
}

function serializeAttachmentPayload() {
    const out = {};
    for (const key of Object.keys(weaponAttachmentData)) {
        const w = weaponAttachmentData[key];
        if (w.Slot !== 'RIGHT_THIGH') continue;
        const p = w.AttachPosition;
        const r = w.AttachRotation;
        out[key] = {
            Slot: w.Slot,
            AttachBone: w.AttachBone,
            AttachName: w.AttachName,
            AttachModel: w.AttachModel,
            AttachPosition: { x: p.x, y: p.y, z: p.z },
            AttachRotation: { x: r.x, y: r.y, z: r.z }
        };
    }
    function row(w) {
        const p = w.AttachPosition;
        const r = w.AttachRotation;
        return {
            AttachBone: w.AttachBone,
            AttachName: w.AttachName,
            AttachModel: w.AttachModel,
            AttachPosition: { x: p.x, y: p.y, z: p.z },
            AttachRotation: { x: r.x, y: r.y, z: r.z }
        };
    }
    for (const key of Object.keys(weaponAttachmentBackLeft)) {
        out[`${key}_SBL`] = row(weaponAttachmentBackLeft[key]);
    }
    for (const key of Object.keys(weaponAttachmentBackRight)) {
        out[`${key}_SBR`] = row(weaponAttachmentBackRight[key]);
    }
    return JSON.stringify(out);
}

/**
 * Снимает все «на теле», вешает модели только для оружия из быстрых слотов, кроме того что сейчас в руках.
 * @param {number} [forcedCurrentHash] — хеш оружия в руках (надёжнее с клиента при смене)
 */
function syncWeaponBodyPlayer(player, forcedCurrentHash) {
    if (!mp.players.exists(player) || !player.addAttachment) return;
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

    try {
        if (Array.isArray(player._bodyWeapons)) {
            for (let i = 0; i < player._bodyWeapons.length; i++) {
                player.addAttachment(player._bodyWeapons[i], true);
            }
        } else if (player._bodyWeapons && typeof player._bodyWeapons === 'object') {
            for (const slot in player._bodyWeapons) {
                player.addAttachment(player._bodyWeapons[slot], true);
            }
        }
        player._bodyWeapons = [];

        /* Админ F5 (noclip): пед без оружия в руках, модели на спине/бедре не вешаем — быстрые слоты не трогаем. */
        if (player._flyNoclipHideBodyWeapons === true) return;

        /* player.weapon на сервере часто не совпадает с клиентом — иначе «в руках» считается неверно и кобура скрывается. */
        let curU;
        if (forcedCurrentHash !== undefined && forcedCurrentHash !== null) {
            curU = forcedCurrentHash >>> 0;
        } else if (typeof player._clientWeaponU === 'number') {
            curU = player._clientWeaponU >>> 0;
        } else {
            curU = (player.weapon | 0) >>> 0;
        }

        const holsterKeys = [];
        const backKeys = [];
        /** Порядок на бедре: тяжёлый/обычный револьвер важнее Mini SMG (иначе SMG в первом слоте перекрывает ревик). */
        const HOLSTER_PRIORITY = ['WEAPON_REVOLVER_MK2', 'WEAPON_REVOLVER', 'WEAPON_MINISMG'];
        const holsterCandidates = [];

        for (let si = 0; si < player.fastSlots.length; si++) {
            const item = player.fastSlots[si];
            if (!item) continue;

            const base = String(item).split('(')[0].trim().toLowerCase();
            if (!base.startsWith('weapon_')) continue;

            const wHash = mp.joaat(base) | 0;
            const wU = wHash >>> 0;
            const entry = resolveWeaponEntryFromInventoryBase(base);
            if (!entry || entry.HashKey === 'WEAPON_UNARMED') continue;

            if (weaponSlotMatchesHeldWeapon(wU, curU)) continue;

            const cfg = weaponAttachmentData[entry.HashKey];
            if (!cfg || !cfg.AttachName) continue;

            if (cfg.Slot === 'RIGHT_THIGH') {
                holsterCandidates.push({ si, hashKey: entry.HashKey });
            } else if (cfg.Slot === 'LEFT_BACK' || cfg.Slot === 'RIGHT_BACK') {
                if (backKeys.length < 2) backKeys.push(entry.HashKey);
            }
        }

        if (holsterCandidates.length) {
            holsterCandidates.sort((a, b) => {
                const ia = HOLSTER_PRIORITY.indexOf(a.hashKey);
                const ib = HOLSTER_PRIORITY.indexOf(b.hashKey);
                const pa = ia === -1 ? 100 : ia;
                const pb = ib === -1 ? 100 : ib;
                if (pa !== pb) return pa - pb;
                return a.si - b.si;
            });
            holsterKeys.push(holsterCandidates[0].hashKey);
        }

        const pushAttachHolster = (hashKey) => {
            const cfg = weaponAttachmentData[hashKey];
            if (!cfg || !cfg.AttachName) return;
            player.addAttachment(cfg.AttachName, false);
            player._bodyWeapons.push(cfg.AttachName);
        };

        const pushAttachBack = (hashKey, side) => {
            const cfg = side === 'left' ? weaponAttachmentBackLeft[hashKey] : weaponAttachmentBackRight[hashKey];
            if (!cfg || !cfg.AttachName) return;
            player.addAttachment(cfg.AttachName, false);
            player._bodyWeapons.push(cfg.AttachName);
        };

        if (holsterKeys.length) {
            pushAttachHolster(holsterKeys[0]);
        }
        if (backKeys.length >= 1) {
            pushAttachBack(backKeys[0], 'left');
        }
        if (backKeys.length >= 2) {
            pushAttachBack(backKeys[1], 'right');
        }
    } catch (e) {
        console.log(e);
    }
}

mp.events.add('attachment:weaponChange', (player, oldWeapon, newWeapon) => {
    try {
        if (!mp.players.exists(player)) return;
        player._clientWeaponU = (newWeapon | 0) >>> 0;
        syncWeaponBodyPlayer(player, newWeapon);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('attachment:syncWeaponBody', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        syncWeaponBodyPlayer(player);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerReady', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player._bodyWeapons = [];
        player.call('registerWeaponAttachments', [serializeAttachmentPayload()]);
        setTimeout(() => {
            if (!mp.players.exists(player) || !global.syncWeaponBodyPlayer) return;
            try {
                global.syncWeaponBodyPlayer(player);
            } catch (_e) {}
        }, 200);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!mp.players.exists(player) || !player._bodyWeapons || !player.addAttachment) return;
        if (Array.isArray(player._bodyWeapons)) {
            for (let i = 0; i < player._bodyWeapons.length; i++) {
                player.addAttachment(player._bodyWeapons[i], true);
            }
        } else {
            for (const slot in player._bodyWeapons) {
                player.addAttachment(player._bodyWeapons[slot], true);
            }
        }
        player._bodyWeapons = [];
    } catch (e) {
        console.log(e);
    }
});

global.syncWeaponBodyPlayer = syncWeaponBodyPlayer;
