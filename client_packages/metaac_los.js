// MetaAC wallshot — camera→bone rays (shot line), not body center
(function () {
    const FLAGS_MAP = 1;
    const FLAGS_WORLD = 1 | 16;
    const MIN_WALL_DIST = 7;
    const MAX_WALL_DIST = 185;
    const BODY_BONE = 24818;
    let lastShooterReportAt = 0;

    function dist3(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function vec3(x, y, z) {
        return new mp.Vector3(Number(x), Number(y), Number(z));
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
            const b = Number(boneIndex) || BODY_BONE;
            if (ent && typeof ent.getBoneCoords === 'function') {
                let c = ent.getBoneCoords(b, 0.0, 0.0, 0.0);
                if ((!c || !Number.isFinite(c.x)) && b !== BODY_BONE) {
                    c = ent.getBoneCoords(BODY_BONE, 0.0, 0.0, 0.0);
                }
                if (c && Number.isFinite(c.x)) return c;
            }
        } catch (_e) {}
        try {
            const p = ent.position;
            return new mp.Vector3(p.x, p.y, p.z + 0.55);
        } catch (_e2) {
            return null;
        }
    }

    function rayWallBetween(from, to, ignoreEntity, flags, midLo, midHi) {
        try {
            const targetDist = dist3(from, to);
            if (targetDist < MIN_WALL_DIST || targetDist > MAX_WALL_DIST) return false;

            const hit = mp.raycasting.testPointToPoint(from, to, ignoreEntity || null, flags);
            if (!hit) return false;

            let hitDist = targetDist;
            try {
                if (hit.position) hitDist = dist3(from, hit.position);
            } catch (_e) {}

            if (hitDist >= targetDist - 0.85) return false;

            const nearShooter = Math.max(1.4, targetDist * 0.12);
            if (hitDist <= nearShooter) return false;

            const nearTarget = Math.max(1.8, targetDist * 0.1);
            if (hitDist >= targetDist - nearTarget) return false;

            const lo = targetDist * midLo;
            const hi = targetDist * midHi;
            if (hitDist < lo || hitDist > hi) return false;

            return true;
        } catch (_e3) {
            return false;
        }
    }

    /** Shot line: gameplay cam → hit bone (or target point) */
    function wallAlongShot(camPos, targetPos, ignoreEntity, strict) {
        if (!camPos || !targetPos) return false;
        return rayWallBetween(
            camPos,
            targetPos,
            ignoreEntity,
            strict ? FLAGS_MAP : FLAGS_WORLD,
            strict ? 0.24 : 0.14,
            strict ? 0.76 : 0.86
        );
    }

    /** Victim POV: my cam → attacker (can't see them through wall) */
    function wallVictimCamToAttacker(attackerEnt, ignoreEntity) {
        const cam = getGameplayCam();
        if (!cam || !attackerEnt) return false;
        const attPos = getBoneWorld(attackerEnt, BODY_BONE);
        if (!attPos) return false;
        return wallAlongShot(cam.cpos, attPos, ignoreEntity, true);
    }

    /** Shooter POV: my cam → victim bone at hit moment */
    function wallShooterCamToVictim(targetEnt, boneIndex, ignoreEntity) {
        const cam = getGameplayCam();
        if (!cam || !targetEnt) return false;
        const bone = getBoneWorld(targetEnt, boneIndex);
        if (!bone) return false;
        return wallAlongShot(cam.cpos, bone, ignoreEntity, false);
    }

    function findPlayerById(id) {
        const n = Number(id);
        let found = null;
        mp.players.forEach((p) => {
            if (found || !p || !mp.players.exists(p)) return;
            if (p.remoteId === n || p.id === n) found = p;
        });
        return found;
    }

    function reportShooterWallPvP(target, boneIndex) {
        const now = Date.now();
        if (now - lastShooterReportAt < 250) return;
        const me = mp.players.local;
        if (!me || !target || target.type !== 'player') return;
        if (target === me) return;

        const bone = getBoneWorld(target, boneIndex);
        const dist = bone ? dist3(me.position, bone) : dist3(me.position, target.position);
        if (dist < MIN_WALL_DIST || dist > MAX_WALL_DIST) return;

        if (!wallShooterCamToVictim(target, boneIndex, me)) return;

        lastShooterReportAt = now;
        const vRef = typeof target.remoteId === 'number' ? target.remoteId : target.id;
        try {
            mp.events.callRemote('metaac:wallshot:shooter', vRef, Math.round(dist * 10) / 10);
        } catch (_e) {}
    }

    mp.events.add('metaac:los:req', (_token, fx, fy, fz, tx, ty, tz, attackerId, role) => {
        const token = String(_token || '');
        const r = String(role || '');
        let blocked = 0;

        try {
            const me = mp.players.local;
            if (!me) {
                blocked = 0;
            } else if (r === 'victim') {
                const attacker = findPlayerById(attackerId);
                let hit = false;
                if (attacker && mp.players.exists(attacker)) {
                    hit = wallVictimCamToAttacker(attacker, me);
                }
                if (!hit) {
                    const att = vec3(fx, fy, fz);
                    const cam = getGameplayCam();
                    const attPos = getBoneWorld(attacker || { position: att }, BODY_BONE) || att;
                    if (cam && dist3(cam.cpos, attPos) >= MIN_WALL_DIST) {
                        hit = wallAlongShot(cam.cpos, attPos, me, true);
                    }
                }
                blocked = hit ? 1 : 0;
            } else if (r === 'attacker') {
                const vic = vec3(tx, ty, tz);
                const cam = getGameplayCam();
                if (cam && dist3(cam.cpos, vic) >= MIN_WALL_DIST) {
                    blocked = wallAlongShot(cam.cpos, vic, me, false) ? 1 : 0;
                }
            }
        } catch (_e) {
            blocked = 0;
        }

        try {
            mp.events.callRemote('metaac:los:res', token, blocked, r || 'victim');
        } catch (_e4) {}
    });

    mp.events.add('outgoingDamage', (sourceEntity, targetEntity, _sourcePlayer, _weapon, boneIndex) => {
        try {
            if (!sourceEntity || sourceEntity !== mp.players.local) return;
            if (global.flyStatus === true) return;
            if (!targetEntity) return;
            if (targetEntity.type === 'player') {
                reportShooterWallPvP(targetEntity, boneIndex);
                return;
            }
            if (targetEntity.type === 'ped') {
                const me = mp.players.local;
                if (!me || !wallShooterCamToVictim(targetEntity, boneIndex, me)) return;
                const bone = getBoneWorld(targetEntity, boneIndex);
                const dist = bone ? dist3(me.position, bone) : dist3(me.position, targetEntity.position);
                if (dist < MIN_WALL_DIST || dist > MAX_WALL_DIST) return;
                mp.events.callRemote('metaac:wallshot:client', Math.round(dist * 10) / 10, 'npc');
            }
        } catch (_e) {}
    });
})();
