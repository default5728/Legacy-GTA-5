// MetaAC silent aim — sample at outgoingDamage hit (cam vs bone)
(function () {
    let lastSendAt = 0;

    const HEAD_BONES = new Set([16, 18, 20, 31086, 12844, 39317]);
    const BODY_BONE = 24818;

    const SKIP_NAMES = [
        'weapon_unarmed', 'weapon_knife', 'weapon_bat', 'weapon_nightstick', 'weapon_hammer',
        'weapon_crowbar', 'weapon_golfclub', 'weapon_bottle', 'weapon_dagger', 'weapon_hatchet',
        'weapon_machete', 'weapon_switchblade', 'weapon_battleaxe', 'weapon_poolcue', 'weapon_wrench',
        'weapon_stone_hatchet', 'weapon_knuckle', 'weapon_flashlight',
        'weapon_pumpshotgun', 'weapon_pumpshotgun_mk2', 'weapon_sawnoffshotgun', 'weapon_assaultshotgun',
        'weapon_bullpupshotgun', 'weapon_heavyshotgun', 'weapon_dbshotgun', 'weapon_autoshotgun',
        'weapon_combatshotgun', 'weapon_musket', 'weapon_firework', 'weapon_rpg',
        'weapon_grenadelauncher', 'weapon_hominglauncher', 'weapon_compactlauncher',
        'weapon_rayminigun', 'weapon_minigun'
    ];
    const SKIP_WEAPONS = new Set();
    try {
        for (let i = 0; i < SKIP_NAMES.length; i++) {
            SKIP_WEAPONS.add(mp.game.joaat(SKIP_NAMES[i]) >>> 0);
        }
    } catch (_e) {}

    function isHeadBone(boneIndex) {
        const b = Number(boneIndex);
        return Number.isFinite(b) && HEAD_BONES.has(b);
    }

    function getGameplayCam() {
        try {
            const cpos = mp.game.cam.getGameplayCamCoord();
            const rot = mp.game.cam.getGameplayCamRot(2);
            const z = (rot.z * Math.PI) / 180;
            const x = (rot.x * Math.PI) / 180;
            const num = Math.abs(Math.cos(x));
            return {
                cpos,
                dir: {
                    x: -Math.sin(z) * num,
                    y: Math.cos(z) * num,
                    z: Math.sin(x)
                }
            };
        } catch (_e) {
            return null;
        }
    }

    function getBoneWorld(ent, boneIndex) {
        try {
            const b = Number(boneIndex);
            let boneId = b;
            if (b === 16 || b === 18 || b === 20) boneId = 31086;
            if (Number.isFinite(boneId) && typeof ent.getBoneCoords === 'function') {
                let c = ent.getBoneCoords(boneId, 0.0, 0.0, 0.0);
                if ((!c || !Number.isFinite(c.x)) && boneId === 31086) {
                    c = ent.getBoneCoords(12844, 0.0, 0.0, 0.0);
                }
                if (c && Number.isFinite(c.x)) return c;
            }
        } catch (_e) {}
        try {
            const p = ent.position;
            const zo = isHeadBone(boneIndex) ? 0.72 : 0.45;
            return new mp.Vector3(p.x, p.y, p.z + zo);
        } catch (_e2) {
            return null;
        }
    }

    function sampleAndSend(targetEntity, boneIndex, weapon) {
        try {
            const me = mp.players.local;
            if (!me || !targetEntity || targetEntity.type !== 'player') return;
            if (targetEntity === me) return;
            if (!mp.players.exists(targetEntity)) return;
            if (global.flyStatus === true) return;

            const wh = Number(weapon != null ? weapon : me.weapon) >>> 0;
            if (wh && SKIP_WEAPONS.has(wh)) return;

            const now = Date.now();
            if (now - lastSendAt < 35) return;
            lastSendAt = now;

            const cam = getGameplayCam();
            if (!cam || !cam.cpos || !cam.dir) return;
            const cpos = cam.cpos;
            const dir = cam.dir;

            const bone = getBoneWorld(targetEntity, boneIndex);
            if (!bone) return;

            const dx = bone.x - cpos.x;
            const dy = bone.y - cpos.y;
            const dz = bone.z - cpos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 3 || dist > 250) return;

            const inv = 1 / dist;
            const tx = dx * inv;
            const ty = dy * inv;
            const tz = dz * inv;

            const alen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
            const ax = dir.x / alen;
            const ay = dir.y / alen;
            const az = dir.z / alen;

            let dot = ax * tx + ay * ty + az * tz;
            if (dot > 1) dot = 1;
            if (dot < -1) dot = -1;
            const angleDeg = (Math.acos(dot) * 180) / Math.PI;

            const cxp = ay * tz - az * ty;
            const cyp = az * tx - ax * tz;
            const czp = ax * ty - ay * tx;
            const missM = Math.sqrt(cxp * cxp + cyp * cyp + czp * czp) * dist;

            const head = isHeadBone(boneIndex) ? 1 : 0;
            const victimId =
                typeof targetEntity.remoteId === 'number' ? targetEntity.remoteId : targetEntity.id;

            const payload = JSON.stringify({
                v: victimId,
                b: Number(boneIndex) || 0,
                h: head,
                a: Math.round(angleDeg * 10) / 10,
                m: Math.round(missM * 100) / 100,
                d: Math.round(dist * 10) / 10,
                ax: Math.round(ax * 1000) / 1000,
                ay: Math.round(ay * 1000) / 1000,
                az: Math.round(az * 1000) / 1000,
                cx: Math.round(cpos.x * 10) / 10,
                cy: Math.round(cpos.y * 10) / 10,
                cz: Math.round(cpos.z * 10) / 10,
                bx: Math.round(bone.x * 10) / 10,
                by: Math.round(bone.y * 10) / 10,
                bz: Math.round(bone.z * 10) / 10
            });

            mp.events.callRemote('metaac:silent:hit', payload);
        } catch (_e) {}
    }

    global.metaAcSilentOnHit = sampleAndSend;

    mp.events.add('metaac:silent:req', (victimRemoteId, isHead, boneIndex) => {
        try {
            let victim = null;
            const n = Number(victimRemoteId);
            mp.players.forEach((p) => {
                if (victim || !p || !mp.players.exists(p)) return;
                if (p.remoteId === n || p.id === n) victim = p;
            });
            if (!victim) return;
            const bone = Number(boneIndex) > 0 ? Number(boneIndex) : Number(isHead) ? 31086 : BODY_BONE;
            sampleAndSend(victim, bone, mp.players.local.weapon);
        } catch (_e) {}
    });

    mp.events.add('outgoingDamage', (sourceEntity, targetEntity, _sourcePlayer, weapon, boneIndex) => {
        try {
            if (!sourceEntity || sourceEntity !== mp.players.local) return;
            if (!targetEntity || targetEntity.type !== 'player') return;
            sampleAndSend(targetEntity, boneIndex, weapon);
        } catch (_e) {}
    });
})();
