//jungledev пиздатый
let defaultPercent = { "max": 85, "min": 40, "head": 99 };

let alcoholResistActive = false;
mp.events.add('setAlcoholResistStatus', state => { alcoholResistActive = !!state; });
let spankResistActive = false;
mp.events.add('setSpankResistStatus', state => { spankResistActive = !!state; });

/** Алкоголь −40%, спанк −20%, вместе −52% (0.6 × 0.8). */
const ALCO_DAMAGE_MULT = 0.60;
const SPANK_DAMAGE_MULT = 0.80;

function targetConsumableResistFlags(targetEntity) {
    if (!targetEntity || targetEntity.type !== 'player') {
        return { alco: false, spank: false };
    }
    const alco = targetEntity === mp.players.local
        ? alcoholResistActive
        : targetEntity.getVariable('alcoResist') === true;
    const spank = targetEntity === mp.players.local
        ? spankResistActive
        : targetEntity.getVariable('spankResist') === true;
    return { alco, spank };
}

function applyConsumableResistMultiplier(damage, hasAlcohol, hasSpank) {
    let d = Number(damage) || 0;
    if (hasAlcohol) d *= ALCO_DAMAGE_MULT;
    if (hasSpank) d *= SPANK_DAMAGE_MULT;
    return Math.max(1, Math.round(d));
}

/** Резисты только по HP: броня получает полный урон из base, по телу — resisted. */
function applyDamageResistArmorFullHealthReduced(targetEntity, baseDamage, resistedTotalDamage) {
    const base = Math.max(0, Number(baseDamage) || 0);
    const resisted = Math.max(0, Number(resistedTotalDamage) ?? base);
    if (Math.abs(resisted - base) < 0.01) return Math.max(1, Math.round(base));

    let armour = 0;
    try {
        armour = Math.max(0, Number(targetEntity.getArmour()) || 0);
    } catch (_e) {}
    const armourAbsorb = Math.min(armour, base);
    const final = armourAbsorb + Math.max(0, resisted - armourAbsorb);
    return Math.max(1, Math.round(final));
}

function applyConsumableResistToHealthOnly(targetEntity, rawDamage, hasAlcohol, hasSpank) {
    const base = Math.max(0, Number(rawDamage) || 0);
    if (!hasAlcohol && !hasSpank) return Math.max(1, Math.round(base));
    const resisted = applyConsumableResistMultiplier(base, hasAlcohol, hasSpank);
    return applyDamageResistArmorFullHealthReduced(targetEntity, base, resisted);
}

/** Урон сначала по броне, остаток — по HP (90 при 50 броне → −50 броня и −40 HP). */
function applyCustomDamageToPlayer(targetEntity, totalDamage) {
    const dmg = Math.max(1, Math.round(Number(totalDamage) || 0));
    let armour = 0;
    try {
        armour = Math.max(0, Number(targetEntity.getArmour()) || 0);
    } catch (_e) {}
    const armourLoss = Math.min(armour, dmg);
    const healthLoss = Math.max(0, dmg - armourLoss);
    try {
        if (armourLoss > 0) {
            targetEntity.setArmour(Math.max(0, armour - armourLoss));
        }
        if (healthLoss > 0) {
            targetEntity.applyDamageTo(healthLoss, false);
        }
    } catch (_e) {
        try { targetEntity.applyDamageTo(dmg, true); } catch (_e2) {}
    }
}

/** КД брони/аптеки после урона — other.js подключается после damage.js, вызов в рантайме. */
function applyLocalPostDamageConsumableLockIfLocalVictim(targetEntity) {
    if (targetEntity !== mp.players.local) return;
    try {
        if (typeof global !== 'undefined' && typeof global.applyPostDamageConsumableLockLocal === 'function') {
            global.applyPostDamageConsumableLockLocal();
        }
    } catch (_e) {}
}

const weaponDamages = {
    3249783761: {
        "name": "Heavy Revolver",
        "max": 45,
        "head": 90
    },
    3415619887: {
        "name": "Heavy Revolver Mk II",
        "max": 55,
        "head": 95,
    },
    1785463520: {
        "name": "Marksman Rifle MKII",
        "max": 35,
        "head": 45,
    },
    324215364: {
        "name": "Micro SMG",
        "max": 14,
        "min": 10,
        "head": 21
    },
    736523883: {
        "name": "SMG",
        "max": 14,
        "min": 10,
        "head": 21
    },
    171789620: {
        "name": "Combat PDW",
        "max": 14,
        "min": 10,
        "head": 21
    },
    2144741730: {
        "name": "Combat MG",
        "max": 15,
        "min": 10,
        "head": 17
    },
    3686625920: {
        "name": "Combat MG MK2",
        "max": 17,
        "min": 13,
        "head": 20
    },
    3220176749: {
        "name": "Assault Rifle",
        "max": 14,
        "min": 10,
        "head": 21
    },
    487013001: {
        "name": "Pump Shotgun",
        "max": 45,
        "min": 35,
        "head": 50
    },
    100416529: {
        "name": "Sniper Rifle",
        "max": 55,
        "head": 100
    },
    487013001: {
        "name": "Battle Axe",
        "max": 50,
        "min": 40,
        "head": -1
    },
    205991906: {
        "name": "Heavy Sniper",
        "max": 55,
        "head": 90
    },
    177293209: {
        "name": "Heavy Sniper Mk II",
        "max": 125,
        "head": 150,
    },
    1649403952: {
        "name": "Compact Rifle",
        "max": 14,
        "min": 10,
        "head": 21
    },
    4024951519: {
        "name": "Assault SMG",
        "max": 14,
        "min": 10,
        "head": 21
    },
    2210333304: {
        "name": "Carbine Rifle",
        "max": 14,
        "min": 10,
        "head": 21
    },
    1627465347: {
        "name": "Gusenberg Sweeper",
        "max": 14,
        "min": 10,
        "head": 21
    },
    3675956304: {
        "name": "Machine Pistol",
        "max": 14,
        "min": 10,
        "head": 21
    },
    984333226: {
        "name": "Heavy Shotgun",
        "max": 40,
        "head": 25
    },
    2017895192: {
        "name": "Sawed-Off Shotgun",
        "max": 40,
        "min": 30,
        "head": 45
    },
    1593441988: {
        "name": "Combat Pistol",
        "max": 14,
        "min": 10,
        "head": 21
    },
    137902532: {
        "name": "Vintage Pistol",
        "max": 11,
        "min": 10,
        "head": 12
    },
    2640438543: {
        "name": "Bullpup Shotgun",
        "max": 40,
        "min": 30,
        "head": 45
    },
    453432689: {
        "name": "Pistol",
        "max": 12,
        "min": 9,
        "head": 18
    },
    2548703416: {
        "name": "Double Action",
        "max": 12,
        "min": 9,
        "head": 18
    },
    3523564046: {
        "name": "Heavy Pistol",
        "max": 12,
        "min": 10,
        "head": 18
    },
    2937143193: {
        "name": "Advanced Rifle",
        "max": 14,
        "min": 10,
        "head": 21
    },
    2578377531: {
        "name": "Pistol .50",
        "max": 10,
        "min": 5,
        "head": 12
    },
    3218215474: {
        "name": "SNS Pistol",
        "max": 10,
        "min": 5,
        "head": 12
    },
    2634544996: {
        "name": "MG",
        "max": 17,
        "min": 14,
        "head": 25
    },
    3231910285: {
        "name": "Special Carbine",
        "max": 14,
        "min": 10,
        "head": 21
    },
    [mp.game.joaat('weapon_militaryrifle')]: {
        "name": "Military Rifle",
        "max": 14,
        "min": 10,
        "head": 21
    },
    3342088282: {
        "name": "Marksman Rifle",
        "max": 25,
        "head": 35
    },
    1853742572: {
        "name": "Precision Rifle",
        "max": 75,
        "head": 90
    },
};

const ignoreWeapons = {
    911657153: "Stun Gun",
};

const huhuiWeaponDamage = {
    [mp.game.joaat('weapon_knife')]: { damage: 33, shotCount: 1, melee: true },
    [mp.game.joaat('weapon_nightstick')]: { damage: 33, shotCount: 1, melee: true },
    [mp.game.joaat('weapon_bat')]: { damage: 33, shotCount: 1, melee: true },
    [mp.game.joaat('weapon_pistol')]: { damage: 9, shotCount: 1 },
    [mp.game.joaat('weapon_pistol_mk2')]: { damage: 11, shotCount: 1 },
    [mp.game.joaat('weapon_combatpistol')]: { damage: 11, shotCount: 1 },
    [mp.game.joaat('weapon_appistol')]: { damage: 7, shotCount: 1 },
    [mp.game.joaat('weapon_pistol50')]: { damage: 15, shotCount: 1 },
    [mp.game.joaat('weapon_snspistol')]: { damage: 9, shotCount: 1 },
    [mp.game.joaat('weapon_snspistol_mk2')]: { damage: 11, shotCount: 1 },
    [mp.game.joaat('weapon_heavypistol')]: { damage: 12, shotCount: 1 },
    [mp.game.joaat('weapon_vintagepistol')]: { damage: 12, shotCount: 1 },
    [mp.game.joaat('weapon_revolver')]: { damage: 45, head: 90, shotCount: 1 },
    [mp.game.joaat('weapon_revolver_mk2')]: { damage: 45, head: 90, shotCount: 1 },
    [mp.game.joaat('weapon_doubleaction')]: { damage: 29, shotCount: 1 },
    [mp.game.joaat('weapon_microsmg')]: { damage: 6, shotCount: 1 },
    [mp.game.joaat('weapon_smg')]: { damage: 7.5, shotCount: 1 },
    [mp.game.joaat('weapon_smg_mk2')]: { damage: 8, shotCount: 1 },
    [mp.game.joaat('weapon_combatpdw')]: { damage: 7, shotCount: 1 },
    [mp.game.joaat('weapon_machinepistol')]: { damage: 7, shotCount: 1 },
    [mp.game.joaat('weapon_minismg')]: { damage: 7, shotCount: 1 },
    [mp.game.joaat('weapon_assaultsmg')]: { damage: 8, shotCount: 1 },
    [mp.game.joaat('weapon_assaultrifle')]: { damage: 9, shotCount: 1 },
    [mp.game.joaat('weapon_assaultrifle_mk2')]: { damage: 9.5, shotCount: 1 },
    [mp.game.joaat('weapon_carbinerifle')]: { damage: 9, shotCount: 1 },
    [mp.game.joaat('weapon_carbinerifle_mk2')]: { damage: 9.5, shotCount: 1 },
    [mp.game.joaat('weapon_advancedrifle')]: { damage: 8.5, shotCount: 1 },
    [mp.game.joaat('weapon_specialcarbine')]: { damage: 14, head: 21, shotCount: 1 },
    [mp.game.joaat('weapon_specialcarbine_mk2')]: { damage: 14, head: 21, shotCount: 1 },
    [mp.game.joaat('weapon_militaryrifle')]: { damage: 14, head: 21, shotCount: 1 },
    [mp.game.joaat('weapon_bullpuprifle')]: { damage: 8, shotCount: 1 },
    [mp.game.joaat('weapon_compactrifle')]: { damage: 8, shotCount: 1 },
    [mp.game.joaat('weapon_mg')]: { damage: 12, shotCount: 1 },
    [mp.game.joaat('weapon_combatmg')]: { damage: 13.5, shotCount: 1 },
    [mp.game.joaat('weapon_combatmg_mk2')]: { damage: 14.5, shotCount: 1 },
    [mp.game.joaat('weapon_gusenberg')]: { damage: 9.5, shotCount: 1 },
    [mp.game.joaat('weapon_pumpshotgun')]: { damage: 22, shotCount: 8 },
    [mp.game.joaat('weapon_pumpshotgun_mk2')]: { damage: 26, shotCount: 8 },
    [mp.game.joaat('weapon_sawnoffshotgun')]: { damage: 25, shotCount: 8 },
    [mp.game.joaat('weapon_bullpupshotgun')]: { damage: 28, shotCount: 8 },
    [mp.game.joaat('weapon_heavyshotgun')]: { damage: 22, shotCount: 1 },
    [mp.game.joaat('weapon_combatshotgun')]: { damage: 17, shotCount: 6 },
    [mp.game.joaat('weapon_sniperrifle')]: { damage: 50, shotCount: 1 },
    [mp.game.joaat('weapon_heavysniper')]: { damage: 70, shotCount: 1 },
    [mp.game.joaat('weapon_heavysniper_mk2')]: { damage: 91, shotCount: 1 },
    [mp.game.joaat('weapon_marksmanrifle')]: { damage: 30, shotCount: 1 },
    [mp.game.joaat('weapon_marksmanrifle_mk2')]: { damage: 35, shotCount: 1 },
    [mp.game.joaat('weapon_precisionrifle')]: { damage: 43, shotCount: 1 }
};

let randomInt = (min, max) => Math.random() * (max - min) + min;

function isHeadShotBone(boneIndex) {
    const b = Number(boneIndex);
    if (!Number.isFinite(b)) return false;
    // RAGE incomingDamage: и bone index (16/18/20), и bone id (SKEL_Head / IK_Head).
    return b === 16 || b === 18 || b === 20 || b === 31086 || b === 12844 || b === 39317;
}

function isCaptOrBizwarCombatBlocked(entity) {
    try {
        if (!entity || typeof entity.getVariable !== 'function') return false;
        if (entity.getVariable('inCapt') === true) {
            if (entity.getVariable('captFrozen') === true) return true;
            if (entity.getVariable('captRegDamage') !== true) return true;
        }
        if (entity.getVariable('inBizwar') === true) {
            if (entity.getVariable('bizwarFrozen') === true) return true;
            if (entity.getVariable('bizwarRegDamage') !== true) return true;
        }
    } catch (_e) {}
    return false;
}

function normFriendlyKey(v) {
    return String(v || '').trim().toLowerCase();
}

/** Однокомандники в бою (капт/война семей — семья, бизвар — фракция): фрэндли-файр запрещён. */
function isSameTeamInBattle(shooter, targetEntity) {
    try {
        if (!shooter || !targetEntity || typeof shooter.getVariable !== 'function') return false;
        const sDim = Number(shooter.dimension);
        const tDim = Number(targetEntity.dimension);
        if (!Number.isFinite(sDim) || sDim !== tDim) return false;
        if (sDim >= 2000 && sDim <= 2050) {
            const sf = normFriendlyKey(shooter.getVariable('family'));
            const tf = normFriendlyKey(targetEntity.getVariable('family'));
            return !!sf && sf === tf;
        }
        if (sDim >= 3000 && sDim <= 3128) {
            const sf = Number(shooter.getVariable('fraction')) || 0;
            const tf = Number(targetEntity.getVariable('fraction')) || 0;
            return sf > 0 && sf === tf;
        }
    } catch (_e) {}
    return false;
}

const REG_762 = {
    none: { body: 14, head: 21 },
    alcohol: { body: 8, head: 12 },
    spank: { body: 10, head: 13 },
    both: { body: 7, head: 10 }
};

const REG_REVOLVER = {
    none: { body: 45, head: 90 },
    alcohol: { body: 33, head: 54 },
    spank: { body: 39, head: 72 },
    both: { body: 22, head: 43 }
};

const REG_MINI_SMG = {
    none: { body: 10, head: 14 },
    alcohol: { body: 8, head: 12 },
    spank: { body: 10, head: 12 },
    both: { body: 7, head: 10 }
};

const REG_ASSAULT_HEAVY_SHOTGUN = {
    none: { body: 25, head: 33 },
    alcohol: { body: 22, head: 25 },
    spank: { body: 19, head: 22 },
    both: { body: 19, head: 22 }
};

const customRegProfiles = {
    [mp.game.joaat('weapon_revolver')]: REG_REVOLVER,
    [mp.game.joaat('weapon_revolver_mk2')]: REG_REVOLVER,
    [mp.game.joaat('weapon_navyrevolver')]: {
        none: { body: 40, head: 65 },
        spank: { body: 40, head: 65 },
        alcohol: { body: 40, head: 65 },
        both: { body: 40, head: 65 }
    },
    [mp.game.joaat('weapon_heavysniper')]: {
        none: { body: 85, head: 100 },
        spank: { body: 80, head: 95 },
        alcohol: { body: 75, head: 90 }
    },
    [mp.game.joaat('weapon_heavysniper_mk2')]: {
        none: { body: 100, head: 150 },
        spank: { body: 95, head: 140 },
        alcohol: { body: 90, head: 130 }
    },
    [mp.game.joaat('weapon_specialcarbine')]: REG_762,
    [mp.game.joaat('weapon_specialcarbine_mk2')]: REG_762,
    [mp.game.joaat('weapon_militaryrifle')]: REG_762,
    [mp.game.joaat('weapon_carbinerifle')]: REG_762,
    [mp.game.joaat('weapon_carbinerifle_mk2')]: REG_762,
    [mp.game.joaat('weapon_assaultrifle')]: REG_762,
    [mp.game.joaat('weapon_assaultrifle_mk2')]: REG_762,
    [mp.game.joaat('weapon_minismg')]: REG_MINI_SMG,
    [mp.game.joaat('weapon_assaultshotgun')]: REG_ASSAULT_HEAVY_SHOTGUN,
    [mp.game.joaat('weapon_heavyshotgun')]: REG_ASSAULT_HEAVY_SHOTGUN,
    [mp.game.joaat('weapon_combatmg')]: {
        none: { body: 10, head: 24 },
        spank: { body: 9, head: 13 },
        alcohol: { body: 8, head: 11 }
    },
    [mp.game.joaat('weapon_combatmg_mk2')]: {
        none: { body: 5, head: 8 },
        spank: { body: 4, head: 7 },
        alcohol: { body: 3, head: 6 }
    }
};

function pickRegDamageTier(profile, hasAlcohol, hasSpank) {
    if (hasSpank && hasAlcohol && profile.both) return profile.both;
    if (hasSpank && profile.spank) return profile.spank;
    if (hasAlcohol && profile.alcohol) return profile.alcohol;
    return profile.none;
}

function normalizeWeaponHash(weapon) {
    return Number(weapon) >>> 0;
}

const HEAVY_SNIPER_HASHES = new Set([
    mp.game.joaat('weapon_heavysniper') >>> 0,
    mp.game.joaat('weapon_heavysniper_mk2') >>> 0,
]);

function isHeavySniperHash(weapon) {
    return HEAVY_SNIPER_HASHES.has(normalizeWeaponHash(weapon));
}

const WEAPON_UNARMED_HASH = mp.game.joaat('weapon_unarmed') >>> 0;

function isUnarmedWeapon(weapon) {
    return normalizeWeaponHash(weapon) === WEAPON_UNARMED_HASH;
}

function isPlayerInCapt(entity) {
    try {
        return !!(entity && typeof entity.getVariable === 'function' && entity.getVariable('inCapt') === true);
    } catch (_e) {
        return false;
    }
}

function rekeyWeaponHashMap(map) {
    Object.keys(map).forEach((key) => {
        const normalized = normalizeWeaponHash(key);
        if (normalized !== Number(key)) {
            map[normalized] = map[key];
            delete map[key];
        }
    });
}

rekeyWeaponHashMap(weaponDamages);
rekeyWeaponHashMap(huhuiWeaponDamage);
rekeyWeaponHashMap(customRegProfiles);

function getHuhuiDamage(weapon, boneIndex) {
    const data = huhuiWeaponDamage[normalizeWeaponHash(weapon)];
    if (!data) return null;
    const shotCount = Math.max(1, Number(data.shotCount) || 1);
    let damage = Math.max(1, Math.round(Number(data.damage) / shotCount));
    if (data.head != null && isHeadShotBone(boneIndex)) {
        damage = Math.max(1, Math.round(Number(data.head) / shotCount));
    }
    return {
        damage,
        melee: !!data.melee
    };
}

function getRegDamage(weapon, boneIndex, hasAlcohol, hasSpank, targetEntity) {
    const profile = customRegProfiles[normalizeWeaponHash(weapon)];
    if (!profile || !profile.none) return null;

    const noneTier = profile.none;
    const baseRaw = isHeadShotBone(boneIndex) ? Number(noneTier.head) : Number(noneTier.body);
    if (!Number.isFinite(baseRaw)) return null;
    const base = Math.max(1, Math.round(baseRaw));
    if (!hasAlcohol && !hasSpank) return base;

    const resistTier = pickRegDamageTier(profile, hasAlcohol, hasSpank);
    const resistRaw = isHeadShotBone(boneIndex) ? Number(resistTier.head) : Number(resistTier.body);
    if (!Number.isFinite(resistRaw)) return base;
    const resisted = Math.max(1, Math.round(resistRaw));
    return applyDamageResistArmorFullHealthReduced(targetEntity, base, resisted);
}

function isTargetDamageImmune(targetEntity) {
    if (!targetEntity || targetEntity.type !== 'player') return false;
    if (targetEntity.getVariable('gm') === true) return true;
    if (targetEntity.getVariable('fly') === true) return true;
    if (targetEntity.getVariable('greenzones') === true) return true;
    return false;
}

const ASSAULT_SHOTGUN_HASH = mp.game.joaat('weapon_assaultshotgun');
const ASSAULT_SHOTGUN_PELLET_MERGE_MS = 200;
const assaultShotgunPelletMergeUntilByShooter = new Map();

/** Вторые и дальнейшие дробинки того же выстрела — без урона (один рег за нажатие). */
function shouldSuppressAssaultShotgunPellet(sourcePlayer, weaponHash) {
    if (Number(weaponHash) !== ASSAULT_SHOTGUN_HASH) return false;
    if (!sourcePlayer || typeof sourcePlayer.remoteId !== 'number') return false;
    const id = sourcePlayer.remoteId;
    const now = Date.now();
    const until = assaultShotgunPelletMergeUntilByShooter.get(id);
    if (until != null && now < until) {
        return true;
    }
    assaultShotgunPelletMergeUntilByShooter.set(id, now + ASSAULT_SHOTGUN_PELLET_MERGE_MS);
    return false;
}

/** GTA health: 200 = full, <= 100 = смерть. cancel только пока игрок жив. */
function shouldCancelIncomingDamage(targetEntity) {
    try {
        if (!targetEntity || typeof targetEntity.getHealth !== 'function') return true;
        return targetEntity.getHealth() > 100;
    } catch (_e) {
        return true;
    }
}

function resolveShooter(sourceEntity, sourcePlayer) {
    if (sourcePlayer && mp.players.exists(sourcePlayer)) return sourcePlayer;
    if (sourceEntity && sourceEntity.type === 'player' && mp.players.exists(sourceEntity)) return sourceEntity;
    return null;
}

function markOutgoingHit(targetEntity) {
    if (!targetEntity || targetEntity.type !== 'player') return;
    try {
        mp.events.callRemote('damage:registerHit', targetEntity.remoteId);
    } catch (_e) {}
}

const victimHitDedup = new Map();
const VICTIM_HIT_DEDUP_MS = 100;

function shouldSkipDuplicateVictimHit(shooterRemoteId) {
    const rid = Number(shooterRemoteId);
    if (!Number.isFinite(rid)) return false;
    const bucket = Math.floor(Date.now() / VICTIM_HIT_DEDUP_MS);
    const key = `${rid}:${bucket}`;
    if (victimHitDedup.has(key)) return true;
    victimHitDedup.set(key, Date.now());
    if (victimHitDedup.size > 500) victimHitDedup.clear();
    return false;
}

const outgoingHitDedup = new Map();
const OUTGOING_HIT_DEDUP_MS = 100;

function shouldSkipDuplicateOutgoingHit(targetRemoteId) {
    const rid = Number(targetRemoteId);
    if (!Number.isFinite(rid)) return false;
    const bucket = Math.floor(Date.now() / OUTGOING_HIT_DEDUP_MS);
    const key = `${rid}:${bucket}`;
    if (outgoingHitDedup.has(key)) return true;
    outgoingHitDedup.set(key, Date.now());
    if (outgoingHitDedup.size > 500) outgoingHitDedup.clear();
    return false;
}

function showLocalHitmarker(targetEntity, finalDamage, boneIndex) {
    if (!targetEntity || targetEntity.type !== 'player') return;
    try {
        let fx;
        let fy;
        let fz;
        try {
            const bone = targetEntity.getBoneCoords(12844, 0, 0, 0.35);
            if (bone) {
                fx = bone.x;
                fy = bone.y;
                fz = bone.z;
            }
        } catch (_eBone) {}
        if (typeof fx !== 'number') {
            const pos = targetEntity.position;
            fx = pos.x;
            fy = pos.y;
            fz = pos.z + 0.9;
        }
        mp.events.call(
            'showHitmarker',
            Math.max(1, Math.round(Number(finalDamage) || 0)),
            isHeadShotBone(boneIndex) ? 1 : 0,
            targetEntity.remoteId,
            fx,
            fy,
            fz
        );
    } catch (_e) {}
}

function computePvPDamage(shooter, targetEntity, weapon, boneIndex, damage) {
    if (isUnarmedWeapon(weapon)) return 15;
    const resist = targetConsumableResistFlags(targetEntity);

    const regDamage = getRegDamage(weapon, boneIndex, resist.alco, resist.spank, targetEntity);
    if (regDamage !== null) {
        return Math.max(1, Math.round(regDamage));
    }

    const customWeaponDamage = getHuhuiDamage(weapon, boneIndex);
    if (customWeaponDamage) {
        let cDamage = customWeaponDamage.damage;
        cDamage = applyConsumableResistToHealthOnly(targetEntity, cDamage, resist.alco, resist.spank);
        return Math.max(1, Math.round(cDamage));
    }

    let max = defaultPercent.max;
    let min = defaultPercent.min;
    let head = defaultPercent.head;
    let wp = '';
    const weaponKey = normalizeWeaponHash(weapon);
    if (weaponKey in weaponDamages) {
        max = weaponDamages[weaponKey].max;
        min = weaponDamages[weaponKey].min;
        head = weaponDamages[weaponKey].head;
        wp = weaponDamages[weaponKey].name;
    }
    let percent = randomInt(min, max) / 100;
    let cDamage = damage - (damage * percent);
    if (wp == 'Heavy Revolver') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 45;
    } else if (wp == 'Combat PDW') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 9;
    } else if (wp == 'Assault Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 18;
    } else if (wp == 'Combat MG') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 10;
    } else if (wp == 'Combat MG MK2') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 15;
    } else if (wp == 'SMG') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 12;
    } else if (wp == 'Micro SMG') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 8;
    } else if (wp == 'Sniper Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 65;
    } else if (wp == 'Heavy Sniper') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 45;
    } else if (wp == 'Heavy Sniper Mk II') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 65;
    } else if (wp == 'Compact Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 7;
    } else if (wp == 'Assault SMG') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 7;
    } else if (wp == 'Carbine Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 14;
    } else if (wp == 'Gusenberg Sweeper') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 8;
    } else if (wp == 'Machine Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 8;
    } else if (wp == 'Heavy Shotgun') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 22;
    } else if (wp == 'Sawed-Off Shotgun') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 40;
    } else if (wp == 'Combat Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 10;
    } else if (wp == 'Vintage Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 12;
    } else if (wp == 'Bullpup Shotgun') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 4;
    } else if (wp == 'Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 7;
    } else if (wp == 'Double Action') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 28;
    } else if (wp == 'Heavy Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 18;
    } else if (wp == 'Advanced Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 10;
    } else if (wp == 'Pistol .50') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 9;
    } else if (wp == 'SNS Pistol') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 9;
    } else if (wp == 'Heavy Revolver Mk II') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 75;
    } else if (wp == 'Marksman Rifle MKII') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 50;
    } else if (wp == 'Marksman Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 40;
    } else if (wp == 'Precision Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 84;
    } else if (wp == 'MG') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 15;
    } else if (wp == 'Special Carbine') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 14;
    } else if (wp == 'Military Rifle') {
        if (isHeadShotBone(boneIndex)) cDamage = head;
        else cDamage = 14;
    } else if (isHeadShotBone(boneIndex)) {
        cDamage = damage - (damage * percent) / 10;
    }

    cDamage = applyConsumableResistToHealthOnly(targetEntity, cDamage, resist.alco, resist.spank);

    try {
        const srcPos = shooter.position;
        const trgPos = targetEntity.position;
        const dx = srcPos.x - trgPos.x;
        const dy = srcPos.y - trgPos.y;
        const dz = srcPos.z - trgPos.z;
        const dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        if (dist <= 2.8 && !isHeadShotBone(boneIndex) && Number(cDamage) >= 50) {
            cDamage = 35;
        }
    } catch (_eDist) {}

    return Math.max(1, Math.round(Number(cDamage)));
}

function applyVictimHit(targetEntity, shooter, weapon, boneIndex, finalDamage) {
    if (targetEntity !== mp.players.local || !shooter) return;
    if (shouldSkipDuplicateVictimHit(shooter.remoteId)) return;

    try {
        if (typeof global.blockFlyFor === 'function' && global.getClientAdminTrueLevel() >= 8) {
            global.blockFlyFor(5000);
        }
    } catch (_e) {}

    try {
        // FLOW-совместимость: урон уже посчитан (вкл. резист) на клиенте.
        // Флаг шлём ДО применения урона, чтобы серверный playerDamage успел
        // его увидеть и не применил резист повторно (двойной откат).
        mp.events.callRemote('damage:customRegIncoming');
        if (typeof shooter.remoteId === 'number') {
            mp.events.callRemote('hitmarker:notify', shooter.remoteId, finalDamage, isHeadShotBone(boneIndex) ? 1 : 0, Number(boneIndex) | 0);
        }
    } catch (_e) {}

    applyCustomDamageToPlayer(targetEntity, finalDamage);
    applyLocalPostDamageConsumableLockIfLocalVictim(targetEntity);
}

const vehicleImpactHashes=new Set(['weapon_rammed_by_car','weapon_run_over_by_car'].map(name=>mp.game.joaat(name)>>>0));
function isVehicleImpact(source,weapon){return !!(source&&source.type==='vehicle')||vehicleImpactHashes.has(Number(weapon)>>>0);}

function handleIncomingDamage(sourceEntity, sourcePlayer, targetEntity, weapon, boneIndex, damage) {
    if (!targetEntity || targetEntity.type !== 'player') return true;

    if (isTargetDamageImmune(targetEntity)) return true;

    const invincibility = targetEntity.getVariable('Invincibility');
    if (invincibility === true) return true;
    if(isVehicleImpact(sourceEntity,weapon)){const driver=resolveShooter(sourceEntity,sourcePlayer);if(driver&&driver.getVariable('greenzones')===true)return true;return;}
    if(weapon in ignoreWeapons)return true;

    const shooter = resolveShooter(sourceEntity, sourcePlayer);
    if (!shooter) return true;

    if (shooter.getVariable('greenzones') === true) return true;

    if (isCaptOrBizwarCombatBlocked(targetEntity) || isCaptOrBizwarCombatBlocked(shooter)) return true;

    if (isSameTeamInBattle(shooter, targetEntity)) return true;

    if (isHeavySniperHash(weapon) && (isPlayerInCapt(targetEntity) || isPlayerInCapt(shooter))) return true;

    if (shouldSuppressAssaultShotgunPellet(shooter, weapon)) return true;

    const finalDamage = computePvPDamage(shooter, targetEntity, weapon, boneIndex, damage);
    applyVictimHit(targetEntity, shooter, weapon, boneIndex, finalDamage);
    return true;
}

function handleOutgoingDamage(sourceEntity, targetEntity, sourcePlayer, weapon, boneIndex, damage) {
    try {
        if (!sourceEntity || sourceEntity !== mp.players.local) return;
        if (!targetEntity || targetEntity.type !== 'player' || (weapon in ignoreWeapons)) return;

        const shooter = resolveShooter(sourceEntity, sourcePlayer) || mp.players.local;
        if (isTargetDamageImmune(targetEntity)) return;
        if (targetEntity.getVariable('Invincibility') === true) return;
        if (shooter.getVariable('greenzones') === true) return;
        if (isCaptOrBizwarCombatBlocked(targetEntity) || isCaptOrBizwarCombatBlocked(shooter)) return;
        if (isSameTeamInBattle(shooter, targetEntity)) return;
        if (isHeavySniperHash(weapon) && (isPlayerInCapt(targetEntity) || isPlayerInCapt(shooter))) return;
        if (shouldSuppressAssaultShotgunPellet(shooter, weapon)) return;

        if (shouldSkipDuplicateOutgoingHit(targetEntity.remoteId)) return;

        const finalDamage = computePvPDamage(shooter, targetEntity, weapon, boneIndex, damage);
        showLocalHitmarker(targetEntity, finalDamage, boneIndex);
        markOutgoingHit(targetEntity);
        try {
            if (typeof global.metaAcSilentOnHit === 'function') {
                global.metaAcSilentOnHit(targetEntity, boneIndex, weapon);
            }
        } catch (_eSilent) {}
    } catch (_e) {}
}

function bindDamageEvent(name, handler) {
    mp.events.add(name, handler);
}

bindDamageEvent('incomingDamage', handleIncomingDamage);
bindDamageEvent('outgoingDamage', handleOutgoingDamage);
