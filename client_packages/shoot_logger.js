'use strict';

/**
 * Shoot logger → ML dataset for aimbot detection.
 * Admin: /logger [static] on|off
 *         /logger [static] label 0|1   (0=legit, 1=cheat)
 *
 * Client samples ~20Hz while shooting (+1.5s tail).
 * File: logger_<static>.jsonl  (one JSON object per line)
 */

const SAMPLE_MS = 50;
const TAIL_MS = 1500;
const ATTACK_CONTROL = 24;
const AIM_CONTROL = 25;

const HEAD_BONES = {
    16: 1,
    18: 1,
    20: 1,
    31086: 1,
    12844: 1,
    39317: 1
};

let enabled = false;
let label = 0;
let recording = false;
let tailUntil = 0;
let samples = [];
let lastSampleAt = 0;
let lastCamRot = null;
let lastCamRotAt = 0;
let lastYawSpeed = 0;
let lastPitchSpeed = 0;
let headshotThisSample = 0;
let hitThisSample = 0;
let burstId = 0;
let burstStartAt = 0;
let sampleIndex = 0;

function normalizeAngleDelta(from, to) {
    let d = to - from;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
}

function getCamPose() {
    try {
        const rot = mp.game.cam.getGameplayCamRot(2);
        const cpos = mp.game.cam.getGameplayCamCoord();
        const z = ((Number(rot.z) || 0) * Math.PI) / 180;
        const x = ((Number(rot.x) || 0) * Math.PI) / 180;
        const num = Math.abs(Math.cos(x));
        const dir = {
            x: -Math.sin(z) * num,
            y: Math.cos(z) * num,
            z: Math.sin(x)
        };
        return {
            yaw: Number(rot.z) || 0,
            pitch: Number(rot.x) || 0,
            cpos: cpos,
            dir: dir
        };
    } catch (_e) {
        return null;
    }
}

function getCamSpeeds(now, yaw, pitch) {
    if (!lastCamRot || !lastCamRotAt) {
        lastCamRot = { yaw, pitch };
        lastCamRotAt = now;
        return { yaw_speed: 0, pitch_speed: 0, yaw_acc: 0, pitch_acc: 0 };
    }
    const dtSec = Math.max(0.001, (now - lastCamRotAt) / 1000);
    const yawSpeed = normalizeAngleDelta(lastCamRot.yaw, yaw) / dtSec;
    const pitchSpeed = (pitch - lastCamRot.pitch) / dtSec;
    const yawAcc = (yawSpeed - lastYawSpeed) / dtSec;
    const pitchAcc = (pitchSpeed - lastPitchSpeed) / dtSec;
    lastYawSpeed = yawSpeed;
    lastPitchSpeed = pitchSpeed;
    lastCamRot = { yaw, pitch };
    lastCamRotAt = now;
    return {
        yaw_speed: Number(yawSpeed.toFixed(4)),
        pitch_speed: Number(pitchSpeed.toFixed(4)),
        yaw_acc: Number(yawAcc.toFixed(4)),
        pitch_acc: Number(pitchAcc.toFixed(4))
    };
}

function getBoneWorld(ent, head) {
    try {
        if (typeof ent.getBoneCoords === 'function') {
            let c = ent.getBoneCoords(head ? 31086 : 11816, 0.0, 0.0, 0.0);
            if ((!c || !Number.isFinite(c.x)) && head) c = ent.getBoneCoords(12844, 0.0, 0.0, 0.0);
            if (c && Number.isFinite(c.x)) return c;
        }
    } catch (_e) {}
    try {
        const p = ent.position;
        return new mp.Vector3(p.x, p.y, p.z + (head ? 0.72 : 0.4));
    } catch (_e2) {
        return null;
    }
}

/** Invalid / no-target: aim_err=0 would look like perfect aim — use -1. */
const NO_TARGET = {
    distance: -1,
    aim_err_deg: -1,
    miss_m: -1,
    has_target: 0,
    target_id: -1
};

const MAX_TARGET_DIST = 220;
const MIN_TARGET_DIST = 2.0;

/**
 * Aim target = player closest to crosshair (low aim_err, in front),
 * NOT merely nearest in world (fails when someone is behind you).
 */
function nearestTargetMetrics(cpos, dir) {
    const me = mp.players.local;
    if (!me || !cpos || !dir) return Object.assign({}, NO_TARGET);

    const alen = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
    const ax = dir.x / alen;
    const ay = dir.y / alen;
    const az = dir.z / alen;

    let best = null;
    let bestScore = Infinity;

    const consider = (p) => {
        if (!p || p === me || !p.handle) return;
        try {
            if (p.dimension !== me.dimension) return;
        } catch (_e) {
            return;
        }
        try {
            const bone = getBoneWorld(p, true);
            if (!bone || !Number.isFinite(bone.x)) return;

            const dx = bone.x - cpos.x;
            const dy = bone.y - cpos.y;
            const dz = bone.z - cpos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (!Number.isFinite(dist) || dist < MIN_TARGET_DIST || dist > MAX_TARGET_DIST) return;

            const inv = 1 / dist;
            const tx = dx * inv;
            const ty = dy * inv;
            const tz = dz * inv;
            let dot = ax * tx + ay * ty + az * tz;
            if (dot > 1) dot = 1;
            if (dot < -1) dot = -1;
            // Behind / >~87° off aim — ignore
            if (dot <= 0.05) return;

            const aimErr = (Math.acos(dot) * 180) / Math.PI;
            const score = aimErr + dist * 0.02;
            if (score >= bestScore) return;

            bestScore = score;
            const cxp = ay * tz - az * ty;
            const cyp = az * tx - ax * tz;
            const czp = ax * ty - ay * tx;
            const missM = Math.sqrt(cxp * cxp + cyp * cyp + czp * czp) * dist;
            best = {
                distance: Number(dist.toFixed(2)),
                aim_err_deg: Number(aimErr.toFixed(3)),
                miss_m: Number(missM.toFixed(3)),
                has_target: 1,
                target_id: typeof p.remoteId === 'number' ? p.remoteId : p.id
            };
        } catch (_e2) {}
    };

    try {
        if (typeof mp.players.forEachInStreamRange === 'function') {
            mp.players.forEachInStreamRange(consider);
        } else {
            mp.players.forEach(consider);
        }
    } catch (_e3) {
        try {
            mp.players.forEach(consider);
        } catch (_e4) {}
    }

    return best || Object.assign({}, NO_TARGET);
}

function isShootingNow() {
    const lp = mp.players.local;
    if (!lp || !lp.handle) return false;
    if (mp.game.controls.isControlPressed(0, ATTACK_CONTROL)) return true;
    if (mp.game.controls.isDisabledControlPressed(0, ATTACK_CONTROL)) return true;
    try {
        if (mp.game.invoke('0x34616828CD07F1A1', lp.handle)) return true;
    } catch (_e) {}
    return false;
}

function isAimingNow() {
    try {
        if (mp.game.controls.isControlPressed(0, AIM_CONTROL)) return true;
        if (mp.game.controls.isDisabledControlPressed(0, AIM_CONTROL)) return true;
    } catch (_e) {}
    return false;
}

function isHeadBone(boneIndex) {
    return !!HEAD_BONES[Number(boneIndex)];
}

function pushSample(now) {
    const pose = getCamPose();
    if (!pose) return;
    const speeds = getCamSpeeds(now, pose.yaw, pose.pitch);
    const tgt = nearestTargetMetrics(pose.cpos, pose.dir);
    let weapon = 0;
    try {
        weapon = Number(mp.players.local.weapon) >>> 0;
    } catch (_e) {}

    samples.push({
        v: 2,
        burst_id: burstId,
        i: sampleIndex++,
        t_ms: now - burstStartAt,
        yaw_speed: speeds.yaw_speed,
        pitch_speed: speeds.pitch_speed,
        yaw_acc: speeds.yaw_acc,
        pitch_acc: speeds.pitch_acc,
        yaw: Number(pose.yaw.toFixed(3)),
        pitch: Number(pose.pitch.toFixed(3)),
        distance: tgt.distance,
        aim_err_deg: tgt.aim_err_deg,
        miss_m: tgt.miss_m,
        has_target: tgt.has_target,
        target_id: tgt.target_id,
        is_headshot: headshotThisSample ? 1 : 0,
        is_hit: hitThisSample ? 1 : 0,
        is_aiming: isAimingNow() ? 1 : 0,
        weapon: weapon,
        label: label ? 1 : 0
    });
    headshotThisSample = 0;
    hitThisSample = 0;
}

function flushToServer() {
    if (!samples.length) return;
    const batch = samples.slice();
    samples = [];
    try {
        mp.events.callRemote('shootLogger:submit:s', JSON.stringify(batch));
    } catch (_e) {}
}

function beginRecording() {
    recording = true;
    tailUntil = 0;
    samples = [];
    lastSampleAt = 0;
    lastCamRot = null;
    lastCamRotAt = 0;
    lastYawSpeed = 0;
    lastPitchSpeed = 0;
    headshotThisSample = 0;
    hitThisSample = 0;
    burstId = (burstId + 1) >>> 0;
    if (burstId === 0) burstId = 1;
    burstStartAt = Date.now();
    sampleIndex = 0;
}

function stopRecording() {
    recording = false;
    tailUntil = 0;
    flushToServer();
}

mp.events.add('shootLogger:set', (state, labelRaw) => {
    enabled = !!state;
    if (labelRaw !== undefined && labelRaw !== null) {
        label = Number(labelRaw) === 1 ? 1 : 0;
    }
    if (!enabled) stopRecording();
});

mp.events.add('shootLogger:setLabel', (labelRaw) => {
    label = Number(labelRaw) === 1 ? 1 : 0;
});

mp.events.add('outgoingDamage', (sourceEntity, targetEntity, _sourcePlayer, _weapon, boneIndex) => {
    if (!recording && !(tailUntil && Date.now() < tailUntil)) return;
    if (!sourceEntity || sourceEntity !== mp.players.local) return;
    if (!targetEntity || targetEntity.type !== 'player') return;
    hitThisSample = 1;
    if (isHeadBone(boneIndex)) headshotThisSample = 1;
});

mp.events.add('render', () => {
    if (!enabled) return;
    if (global.flyStatus === true) return;

    const now = Date.now();
    const shooting = isShootingNow();

    if (shooting) {
        if (!recording) beginRecording();
    } else if (recording && !tailUntil) {
        tailUntil = now + TAIL_MS;
    }

    const capturing = recording && (shooting || now < tailUntil);
    if (!capturing) {
        if (recording) stopRecording();
        return;
    }

    if (now - lastSampleAt >= SAMPLE_MS) {
        lastSampleAt = now;
        pushSample(now);
    }

    if (!shooting && tailUntil && now >= tailUntil) {
        stopRecording();
    }
});
