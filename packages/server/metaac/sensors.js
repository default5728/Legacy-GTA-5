'use strict';

/**
 * Thin sensors — facts for HOST only.
 * Wallshot: hook custom PvP (hitmarker:notify), not native playerDamage
 * (incomingDamage returns true → native HP loss often 0).
 */

const crypto = require('crypto');
const bypass = require('./bypass');
const cfg = require('./config');

const pending = new Map();
const PENDING_TTL_MS = 2600;
const MIN_DIST = 6;
const MAX_DIST = 200;
const WALL_PAIR_COOLDOWN_MS = 3200;
const PROBE_WAIT_MS = 900;
const SHOOTER_CLAIM_TTL_MS = 1800;
const VIC_WALL_MIN_DIST = 14;
const shooterClaims = new Map();
const hitDedup = new Map();
const wallPairDedup = new Map();

function findPlayerByRef(ref) {
    const n = parseInt(ref, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    try {
        const direct = mp.players.at(n);
        if (direct && mp.players.exists(direct)) return direct;
    } catch (_e) {}
    let found = null;
    mp.players.forEach((p) => {
        if (found || !p || !mp.players.exists(p)) return;
        if (p.remoteId === n || p.id === n) found = p;
    });
    return found;
}

function resolveShooterFromHitmarker(shooterRemoteId) {
    return findPlayerByRef(shooterRemoteId);
}

let meleeHashes = new Set([2725352035]);
try {
    const names = [
        'weapon_unarmed', 'weapon_knife', 'weapon_nightstick', 'weapon_hammer', 'weapon_bat',
        'weapon_crowbar', 'weapon_golfclub', 'weapon_bottle', 'weapon_dagger', 'weapon_hatchet',
        'weapon_knuckle', 'weapon_machete', 'weapon_flashlight', 'weapon_switchblade',
        'weapon_poolcue', 'weapon_wrench', 'weapon_battleaxe', 'weapon_stone_hatchet'
    ];
    meleeHashes = new Set(names.map((n) => mp.joaat(n) >>> 0));
} catch (_e) {}

function sensorsActive() {
    if (!cfg.enabled) return false;
    return typeof global.metaAcHostActive === 'function' && global.metaAcHostActive();
}

function wallshotSensorEnabled() {
    return cfg.wallshotEnabled !== false;
}

function silentaimSensorEnabled() {
    return cfg.silentaimEnabled !== false;
}

function report(evt) {
    try {
        if (typeof global.metaAcReportEvent === 'function') global.metaAcReportEvent(evt);
    } catch (_e) {}
}

function reportWallHit(attacker, reason, victimId) {
    try {
        if (!wallshotSensorEnabled()) return;
        if (!sensorsActive()) return;
        if (!attacker || !mp.players.exists(attacker) || attacker.static == null) return;
        if (bypass.isDutyBypass(attacker)) return;
        const now = Date.now();
        if (attacker._metaAcWallHitAt && now - attacker._metaAcWallHitAt < 900) return;
        if (victimId != null) {
            const pairKey = `${attacker.id}:${victimId}`;
            if (
                attacker._metaAcWallPairKey === pairKey &&
                attacker._metaAcWallPairAt &&
                now - attacker._metaAcWallPairAt < WALL_PAIR_COOLDOWN_MS
            ) {
                return;
            }
            attacker._metaAcWallPairKey = pairKey;
            attacker._metaAcWallPairAt = now;
        }
        attacker._metaAcWallHitAt = now;
        report({
            type: 'wallshot',
            action: 'hit',
            static: Number(attacker.static),
            name: attacker.login || attacker.name || '?',
            reason: String(reason || 'wallshot').slice(0, 80),
            score: 1
        });
    } catch (_e) {}
}

function shouldProbe(a, b) {
    const key = `${a}:${b}`;
    const now = Date.now();
    if (now - (hitDedup.get(key) || 0) < 70) return false;
    hitDedup.set(key, now);
    return true;
}

function restoreDamage(victim, hl, al) {
    try {
        if (!victim || !mp.players.exists(victim) || victim.health <= 0) return;
        // Custom damage path often never reduced server HP — restore only if we tracked loss
        if (hl > 0) victim.health = Math.min(100, (Number(victim.health) || 0) + hl);
        if (al > 0) victim.armour = Math.min(100, (Number(victim.armour) || 0) + al);
    } catch (_e) {}
}

function rememberShooterClaim(attackerId, victimId) {
    const key = `${attackerId}:${victimId}`;
    shooterClaims.set(key, Date.now());
}

function hasShooterClaim(attackerId, victimId) {
    const key = `${attackerId}:${victimId}`;
    const at = shooterClaims.get(key);
    if (!at) return false;
    if (Date.now() - at > SHOOTER_CLAIM_TTL_MS) {
        shooterClaims.delete(key);
        return false;
    }
    return true;
}

function tryFinalizeWallshot(token, meta, force) {
    if (!meta || meta.settled) return;
    const aged = Date.now() - meta.at >= PROBE_WAIT_MS;
    if (!force && !aged) return;

    if (meta.victimBlocked !== true) return;

    // Give attacker LOS a moment to answer when victim already sees a wall.
    if (!force && meta.victimBlocked === true && meta.attackerBlocked === null && !aged) return;

    meta.settled = true;
    pending.delete(token);

    const attacker = mp.players.at(meta.attackerId);
    const victim = mp.players.at(meta.victimId);
    if (victim && mp.players.exists(victim) && (meta.hl > 0 || meta.al > 0)) {
        restoreDamage(victim, meta.hl, meta.al);
    }
    if (!attacker || !mp.players.exists(attacker) || attacker.static == null) return;

    const dist = Number(meta.dist) || 0;
    const distTag = dist.toFixed(1);
    const shooterAlso = hasShooterClaim(meta.attackerId, meta.victimId);
    const attackerBlocked = meta.attackerBlocked === true;
    const attackerClear = meta.attackerBlocked === false;

    // Classic magic bullet: victim blocked, shooter clear LOS.
    if (attackerClear) {
        reportWallHit(attacker, `wallbang dist=${distTag}m`, meta.victimId);
        return;
    }

    // Both cams hit wall along shot line — real wallbang through cover (any range).
    if (shooterAlso && attackerBlocked) {
        reportWallHit(attacker, `both-wall dist=${distTag}m`, meta.victimId);
        return;
    }

    // Shooter reported wall at hit moment + victim blocked (attacker probe slow/missing).
    if (shooterAlso) {
        reportWallHit(attacker, `wallbang dist=${distTag}m shooter+vic`, meta.victimId);
        return;
    }

    // Weak: victim-only — far shots only (reduces peek/cover false positives).
    if (dist >= VIC_WALL_MIN_DIST) {
        reportWallHit(attacker, `vic-wall dist=${distTag}m`, meta.victimId);
    }
}

function startLosProbe(attacker, victim, healthLoss, armorLoss, weaponHash) {
    try {
        if (!wallshotSensorEnabled()) return;
        if (!sensorsActive()) return;
        if (!attacker || !victim || !mp.players.exists(attacker) || !mp.players.exists(victim)) return;
        if (attacker === victim) return;
        if (!attacker.getVariable('auth') || !victim.getVariable('auth')) return;
        if (bypass.isDutyBypass(attacker)) return;
        if (victim.getVariable('dead') === true) return;

        const wh = Number(weaponHash) >>> 0;
        if (wh && meleeHashes.has(wh)) return;

        const hl = Math.max(0, Number(healthLoss) || 0);
        const al = Math.max(0, Number(armorLoss) || 0);

        if (attacker.dimension !== victim.dimension) return;

        const dist = attacker.dist(victim.position);
        if (dist < MIN_DIST || dist > MAX_DIST) return;
        if (!shouldProbe(attacker.id, victim.id)) return;

        const ap = attacker.position;
        const vp = victim.position;
        const from = { x: ap.x, y: ap.y, z: ap.z + 0.85 };
        const to = { x: vp.x, y: vp.y, z: vp.z + 0.85 };
        const token = crypto.randomBytes(8).toString('hex');
        const attackerRef = typeof attacker.remoteId === 'number' ? attacker.remoteId : attacker.id;

        pending.set(token, {
            at: Date.now(),
            attackerId: attacker.id,
            victimId: victim.id,
            hl,
            al,
            dist,
            victimBlocked: null,
            attackerBlocked: null,
            settled: false
        });

        try {
            victim.call('metaac:los:req', [
                token, from.x, from.y, from.z, to.x, to.y, to.z, attackerRef, 'victim'
            ]);
        } catch (_e) {}
        try {
            attacker.call('metaac:los:req', [
                token, from.x, from.y, from.z, to.x, to.y, to.z, attackerRef, 'attacker'
            ]);
        } catch (_e2) {}

        setTimeout(() => {
            const m = pending.get(token);
            if (m) tryFinalizeWallshot(token, m, false);
        }, PROBE_WAIT_MS);
    } catch (_e) {}
}

function reportClientHit(player, dist, kind) {
    try {
        if (!wallshotSensorEnabled()) return;
        if (!cfg.enabled || !player || !mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        // Shooter self-report only for NPC bot tests — PvP uses victim LOS probe
        if (String(kind || '') === 'player') return;
        if (Number(dist) > 0 && Number(dist) < MIN_DIST) return;
        reportWallHit(player, `${kind || 'client'} dist=${Number(dist) || 0}m`, null);
    } catch (_e) {}
}

/** Silent aim: cam direction far from hit bone but bullet still lands. */
function processSilentAim(
    shooter,
    victimRemoteId,
    boneIndex,
    isHead,
    clientAngle,
    clientMiss,
    clientDist,
    ax,
    ay,
    az,
    cx,
    cy,
    cz,
    bx,
    by,
    bz
) {
    try {
        if (!silentaimSensorEnabled()) return;
        if (!sensorsActive()) return;
        if (!shooter || !mp.players.exists(shooter)) return;
        if (!shooter.getVariable('auth')) return;
        if (bypass.isDutyBypass(shooter)) return;

        const victim = findPlayerByRef(victimRemoteId);
        if (!victim || !mp.players.exists(victim) || victim === shooter) return;
        if (!victim.getVariable('auth')) return;
        if (shooter.dimension !== victim.dimension) return;

        const now = Date.now();
        if (shooter._metaAcSilentAt && now - shooter._metaAcSilentAt < 28) return;
        shooter._metaAcSilentAt = now;

        // Recompute angle from cam→bone (client numbers) + server positions as sanity
        const cam = {
            x: Number(cx),
            y: Number(cy),
            z: Number(cz)
        };
        const bone = {
            x: Number(bx),
            y: Number(by),
            z: Number(bz)
        };
        const dir = {
            x: Number(ax),
            y: Number(ay),
            z: Number(az)
        };

        let angle = Number(clientAngle);
        let miss = Number(clientMiss);
        let dist = Number(clientDist);

        if (
            Number.isFinite(cam.x) &&
            Number.isFinite(bone.x) &&
            Number.isFinite(dir.x)
        ) {
            const dx = bone.x - cam.x;
            const dy = bone.y - cam.y;
            const dz = bone.z - cam.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d >= 3 && d <= 280) {
                dist = d;
                const inv = 1 / d;
                const tx = dx * inv;
                const ty = dy * inv;
                const tz = dz * inv;
                let alen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
                if (alen < 0.5 || alen > 1.5) return; // forged / garbage aim vector
                const axn = dir.x / alen;
                const ayn = dir.y / alen;
                const azn = dir.z / alen;
                let dot = axn * tx + ayn * ty + azn * tz;
                if (dot > 1) dot = 1;
                if (dot < -1) dot = -1;
                angle = (Math.acos(dot) * 180) / Math.PI;
                const cxp = ayn * tz - azn * ty;
                const cyp = azn * tx - axn * tz;
                const czp = axn * ty - ayn * tx;
                miss = Math.sqrt(cxp * cxp + cyp * cyp + czp * czp) * d;
            }
        }

        if (!Number.isFinite(angle) || !Number.isFinite(miss) || !Number.isFinite(dist)) return;
        if (dist < 3.5 || dist > 250) return;

        // Server sanity: cam dir vs hit bone (same geometry client used)
        try {
            if (Number.isFinite(bone.x) && Number.isFinite(dir.x)) {
                const sdx = bone.x - cam.x;
                const sdy = bone.y - cam.y;
                const sdz = bone.z - cam.z;
                const sd = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz) || 1;
                if (sd >= 2.8 && sd <= 280) {
                    dist = sd;
                    const stx = sdx / sd;
                    const sty = sdy / sd;
                    const stz = sdz / sd;
                    let alen2 = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
                    if (alen2 >= 0.45 && alen2 <= 1.55) {
                        const ax2 = dir.x / alen2;
                        const ay2 = dir.y / alen2;
                        const az2 = dir.z / alen2;
                        let dot2 = ax2 * stx + ay2 * sty + az2 * stz;
                        if (dot2 > 1) dot2 = 1;
                        if (dot2 < -1) dot2 = -1;
                        angle = (Math.acos(dot2) * 180) / Math.PI;
                        const scxp = ay2 * stz - az2 * sty;
                        const scyp = az2 * stx - ax2 * stz;
                        const sczp = ax2 * sty - ay2 * stx;
                        miss = Math.sqrt(scxp * scxp + scyp * scyp + sczp * sczp) * sd;
                    }
                }
            }
        } catch (_eSrv) {}

        const head = !!Number(isHead);

        let severity = 0;
        let pts = 0;
        if (head) {
            if (miss >= 0.95 || angle >= 16) {
                severity = 3;
                pts = 34;
            } else if (miss >= 0.48 || angle >= 9) {
                severity = 2;
                pts = 22;
            } else if (miss >= 0.24 || angle >= 4.8) {
                severity = 1;
                pts = 12;
            }
        } else {
            if (miss >= 1.35 || angle >= 20) {
                severity = 2;
                pts = 16;
            } else if (miss >= 0.72 || angle >= 11) {
                severity = 1;
                pts = 9;
            }
        }

        if (severity < 1 || pts < 1) {
            if (angle >= 5.5 || miss >= 0.4) {
                try {
                    console.log(
                        `[MetaAC] silent weak #${shooter.static} ${shooter.login || '?'}: ` +
                            `${head ? 'HS' : 'body'} ang=${angle.toFixed(1)} miss=${miss.toFixed(2)}m`
                    );
                } catch (_eW) {}
            }
            return;
        }
        if (shooter.static == null) return;

        try {
            console.log(
                `[MetaAC] silent sample #${shooter.static} ${shooter.login || '?'}: ` +
                    `${head ? 'HS' : 'body'} ang=${angle.toFixed(1)} miss=${miss.toFixed(2)}m d=${dist.toFixed(1)}`
            );
        } catch (_eLog) {}

        report({
            type: 'silentaim',
            action: 'hit',
            static: Number(shooter.static),
            name: shooter.login || shooter.name || '?',
            reason: `${head ? 'HS' : 'body'} ang=${angle.toFixed(1)}° miss=${miss.toFixed(2)}m d=${dist.toFixed(1)}`,
            score: pts,
            angle: Math.round(angle * 10) / 10,
            miss: Math.round(miss * 100) / 100,
            dist: Math.round(dist * 10) / 10,
            head: head ? 1 : 0,
            severity
        });
    } catch (_e) {}
}

function startSensors() {
    mp.events.add('metaac:los:res', (player, token, blocked, role) => {
        try {
            const meta = pending.get(String(token || ''));
            if (!meta || meta.settled) return;
            const r = String(role || '');
            if (r === 'victim') meta.victimBlocked = !!Number(blocked);
            if (r === 'attacker') meta.attackerBlocked = !!Number(blocked);
            if (meta.victimBlocked === true && meta.attackerBlocked !== null) {
                tryFinalizeWallshot(String(token), meta, false);
            }
        } catch (_e) {}
    });

    // Primary PvP — custom damage hitmarker (outgoingDamage often blocked by incomingDamage)
    mp.events.add('hitmarker:notify', (victim, shooterRemoteId, damage, isHead, boneIndex) => {
        try {
            if (!victim || !mp.players.exists(victim)) return;
            const shooter = resolveShooterFromHitmarker(shooterRemoteId);
            if (!shooter || !mp.players.exists(shooter)) return;
            const wh = Number(shooter.weapon) >>> 0;
            const dmg = Math.max(1, Math.round(Number(damage) || 1));
            if (sensorsActive() && shooter.static != null && !bypass.isDutyBypass(shooter)) {
                report({
                    type: 'damage',
                    action: 'dealt',
                    static: Number(shooter.static),
                    name: shooter.login || shooter.name || '?',
                    amount: dmg,
                    head: !!Number(isHead),
                    bone: Number(boneIndex) | 0
                });
            }
            startLosProbe(shooter, victim, dmg, 0, wh);
            try {
                const vRef = typeof victim.remoteId === 'number' ? victim.remoteId : victim.id;
                shooter.call('metaac:silent:req', [vRef, isHead ? 1 : 0, Number(boneIndex) | 0]);
            } catch (_eSilent) {}
        } catch (_e) {}
    });

    // Fallback if some hits still go native
    mp.events.add('playerDamage', (player, healthLoss, armorLoss, attacker, weaponHash) => {
        try {
            if (!attacker || !mp.players.exists(attacker)) return;
            const hl = Number(healthLoss) || 0;
            const al = Number(armorLoss) || 0;
            if (hl <= 0 && al <= 0) return;
            startLosProbe(attacker, player, hl, al, weaponHash);
        } catch (_e) {}
    });

    // Shooter cross-check at hit time (outgoingDamage on client)
    mp.events.add('metaac:wallshot:shooter', (player, victimRef, dist) => {
        try {
            if (!sensorsActive()) return;
            if (!player || !mp.players.exists(player) || player.static == null) return;
            if (bypass.isDutyBypass(player)) return;
            const victim = findPlayerByRef(victimRef);
            if (!victim || !mp.players.exists(victim)) return;
            const d = Number(dist) || player.dist(victim.position);
            if (d < MIN_DIST || d > MAX_DIST) return;
            rememberShooterClaim(player.id, victim.id);
        } catch (_e) {}
    });

    // Shooter self-report (NPC bot test)
    mp.events.add('metaac:wallshot:client', (player, dist, kind) => {
        reportClientHit(player, dist, kind);
    });

    // Silent aim sample — payload JSON (RAGE callRemote arg limit)
    mp.events.add('metaac:silent:hit', (player, payload) => {
        try {
            let data = payload;
            if (typeof payload === 'string') {
                try {
                    data = JSON.parse(payload);
                } catch (_eJson) {
                    return;
                }
            }
            if (!data || typeof data !== 'object') return;
            processSilentAim(
                player,
                data.v,
                data.b,
                data.h,
                data.a,
                data.m,
                data.d,
                data.ax,
                data.ay,
                data.az,
                data.cx,
                data.cy,
                data.cz,
                data.bx,
                data.by,
                data.bz
            );
        } catch (_e) {}
    });

    // Disabled — bypasses victim LOS probe, caused false positives
    mp.events.add('metaac:wallshot:victim', () => {});

    setInterval(() => {
        const now = Date.now();
        for (const [tok, meta] of pending) {
            if (now - meta.at > PENDING_TTL_MS) tryFinalizeWallshot(tok, meta, true);
        }
    }, 400);

    console.log(
        '[MetaAC] sensors ON (wallshot=' +
            (wallshotSensorEnabled() ? 'ON' : 'OFF') +
            ', silent=' +
            (silentaimSensorEnabled() ? 'ON' : 'OFF') +
            ' — host ONLINE)'
    );

    // /acwallbot — NPC for client-side wallshot test (shooter LOS → HOST)
    const wallBots = new Map();
    mp.events.addCommand('acwallbot', (player) => {
        try {
            if (!player || !mp.players.exists(player)) return;
            if ((Number(player.adminlvl) || 0) < 1) {
                player.outputChatBox('!{red}Нет доступа');
                return;
            }
            const pos = player.position;
            const h = ((Number(player.heading) || 0) * Math.PI) / 180;
            const x = pos.x - Math.sin(h) * 8;
            const y = pos.y + Math.cos(h) * 8;
            const z = pos.z;
            const old = wallBots.get(player.id);
            if (old) {
                try {
                    if (mp.peds.exists(old)) old.destroy();
                } catch (_e) {}
            }
            const ped = global.creatorPedsNew(mp.joaat('a_m_m_beach_01'), new mp.Vector3(x, y, z), {
                dynamic: true,
                invincible: false,
                freeze: true,
                locked: false,
                heading: (Number(player.heading) || 0) + 180
            });
            try {
                ped.dimension = player.dimension;
            } catch (_d) {}
            wallBots.set(player.id, ped);
            player.outputChatBox(
                '!{#7CFC00}[MetaAC] !{white}NPC-бот ~8м. Встань за СТЕНУ и стрельни в него (2 хита → kick). Лучше тест: 2 игрока через стену. /acwallbotdel'
            );
        } catch (e) {
            try {
                player.outputChatBox('!{red}[MetaAC] spawn fail: ' + (e.message || e));
            } catch (_e2) {}
        }
    });

    mp.events.addCommand('acwallbotdel', (player) => {
        try {
            if (!player || !mp.players.exists(player)) return;
            if ((Number(player.adminlvl) || 0) < 1) return;
            const old = wallBots.get(player.id);
            if (old) {
                try {
                    if (mp.peds.exists(old)) old.destroy();
                } catch (_e) {}
                wallBots.delete(player.id);
            }
            player.outputChatBox('!{#7CFC00}[MetaAC] !{white}бот удалён');
        } catch (_e) {}
    });
}

/** Inventory weapon hashes for telemetry (data only). */
function inventoryWeaponHashes(player) {
    const out = new Set();
    try {
        const inv = player.inventory;
        if (!Array.isArray(inv)) return out;
        for (const it of inv) {
            if (!it) continue;
            let name = '';
            if (typeof it === 'string') name = it;
            else if (it.name) name = String(it.name);
            else if (it.item) name = String(it.item);
            name = String(name).split('(')[0].trim();
            try {
                if (/^weapon_/i.test(name) || /^gadget_/i.test(name)) {
                    out.add(mp.joaat(name) >>> 0);
                }
            } catch (_e) {}
        }
    } catch (_e2) {}
    try {
        const fs = player.fastSlots;
        if (Array.isArray(fs)) {
            for (const it of fs) {
                if (!it) continue;
                const name = String(typeof it === 'string' ? it : it.name || it.item || '')
                    .split('(')[0]
                    .trim();
                if (/^weapon_/i.test(name) || /^gadget_/i.test(name)) {
                    try {
                        out.add(mp.joaat(name) >>> 0);
                    } catch (_e3) {}
                }
            }
        }
    } catch (_e4) {}
    return out;
}

module.exports = { startSensors, inventoryWeaponHashes };
