/* hitmarker.js
 * Плавающие хитмаркеры: при попадании в игрока над ним появляется число
 * снесённого HP. Берём реальные данные с сервера: жертва считает урон в
 * client_packages/damage.js → mp.events.callRemote('hitmarker:notify', ...) →
 * сервер пересылает стрелку через player.call('showHitmarker', [dmg, isHead, victimRemoteId, x, y, z]).
 *
 * Здесь мы только отрисовка: ничего не правим в логике урона, не трогаем
 * client_packages/damage.js пользователя.
 */

(function () {
    /* Активные хитмаркеры. */
    const markers = [];

    /* Параметры визуала. */
    const LIFE_MS = 950;          // длительность анимации
    const RISE_M = 0.55;          // на сколько метров текст всплывает
    const HEAD_BONE = 12844;      // SKEL_Head — над головой жертвы
    const MAX_DRAW_DISTANCE = 220; // снайперы / дальний бой
    const MAX_MARKERS = 32;       // защита от спама

    /* Дедуп: серверный форвард дублирует локальный outgoingDamage (тот же хит).
     * Локальные маркеры рисуем всегда (быстрая стрельба не теряется),
     * форварды пропускаем, если по этой жертве недавно был локальный хит.
     * Окно покрывает RTT, чтобы двоение не возвращалось на высоком пинге.
     * Дополнительная защита по паре (dmg, isHead): если ID жертвы у локального
     * хита и у форварда разошёлся (сервер/клиент), дубль всё равно гасится. */
    const HIT_DEDUP_MS = 500;
    const lastVictimHitAt = new Map();
    const lastLocalHitByDmg = new Map();

    /* Палитра — белый текст с чёрной обводкой (outline: true). */
    const COLOR_HIT = [255, 255, 255];

    function pushMarker(victimRemoteId, dmg, isHead, fx, fy, fz) {
        if (markers.length >= MAX_MARKERS) markers.shift();
        const entry = {
            remoteId: Number(victimRemoteId),
            dmg: Math.max(1, Math.round(Number(dmg) || 0)),
            isHead: !!isHead,
            startedAt: Date.now()
        };
        if (typeof fx === 'number' && isFinite(fx) &&
            typeof fy === 'number' && isFinite(fy) &&
            typeof fz === 'number' && isFinite(fz)) {
            entry.fx = fx;
            entry.fy = fy;
            entry.fz = fz + 0.95;
        }
        markers.push(entry);
    }

    /* Сервер шлёт сюда: [dmg, isHead, victimRemoteId, x?, y?, z?, isForward?].
     * isForward=1 — серверный форвард (дублирует локальный хит). */
    mp.events.add('showHitmarker', (dmg, isHead, victimRemoteId, fx, fy, fz, isForward) => {
        try {
            const me = mp.players.local;
            if (!me) return;
            // если стрелок выключил у себя хитмаркеры в настройках — не показываем
            try {
                if (me.getVariable('hitmarker') === false) return;
            } catch (_e) {}

            // не рисуем сами над собой (на всякий случай)
            if (typeof victimRemoteId === 'number' && victimRemoteId === me.remoteId) return;

            const victimId = Number(victimRemoteId);
            const now = Date.now();
            const dmgNum = Math.max(1, Math.round(Number(dmg) || 0));
            const headNum = Number(isHead) ? 1 : 0;
            // резервный ключ дедупа по паре (урон, голова) без жертвы: гасит
            // дубль, даже если remoteId у локального хита и форварда разошёлся
            const dedupKey = `${dmgNum}:${headNum}`;

            if (isForward === 1) {
                // серверный форвард того же хита: пропускаем, если локальный
                // маркер по этой жертве был нарисован недавно
                if (Number.isFinite(victimId)) {
                    const lastAt = lastVictimHitAt.get(victimId);
                    if (lastAt != null && (now - lastAt) < HIT_DEDUP_MS) return;
                }
                // резервный дедуп: недавно был локальный хит с тем же уроном
                // и флагом головы — форвард лишний (локальный уже нарисован)
                const lastDmgAt = lastLocalHitByDmg.get(dedupKey);
                if (lastDmgAt != null && (now - lastDmgAt) < HIT_DEDUP_MS) return;
            } else {
                // локальный хит: рисуем всегда и запоминаем время для дедупа форвардов
                if (Number.isFinite(victimId)) {
                    lastVictimHitAt.set(victimId, now);
                    if (lastVictimHitAt.size > 100) lastVictimHitAt.clear();
                }
                lastLocalHitByDmg.set(dedupKey, now);
                if (lastLocalHitByDmg.size > 100) lastLocalHitByDmg.clear();
            }

            pushMarker(victimRemoteId, dmg, isHead, fx, fy, fz);
        } catch (_e) {}
    });

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function markerBasePos(m, victim) {
        if (victim && victim.handle) {
            try {
                const bone = victim.getBoneCoords(HEAD_BONE, 0, 0, 0);
                if (bone) return bone;
            } catch (_e) {}
            try {
                if (victim.position) return victim.position;
            } catch (_e2) {}
        }
        if (typeof m.fx === 'number' && typeof m.fy === 'number' && typeof m.fz === 'number') {
            return new mp.Vector3(m.fx, m.fy, m.fz);
        }
        return null;
    }

    mp.events.add('render', () => {
        if (markers.length === 0) return;

        const me = mp.players.local;
        if (!me) return;

        const now = Date.now();
        // отрисовываем с конца, чтобы позже добавленные были поверх
        for (let i = markers.length - 1; i >= 0; i--) {
            const m = markers[i];
            const age = now - m.startedAt;
            if (age >= LIFE_MS) {
                markers.splice(i, 1);
                continue;
            }

            let victim = null;
            try { victim = mp.players.atRemoteId(m.remoteId); } catch (_e) {}

            const basePos = markerBasePos(m, victim);
            if (!basePos) continue;

            // дистанция — слишком далеко не рисуем
            try {
                const dx = basePos.x - me.position.x;
                const dy = basePos.y - me.position.y;
                const dz = basePos.z - me.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist > MAX_DRAW_DISTANCE) continue;
            } catch (_e) {}

            const t = age / LIFE_MS;          // 0..1
            const eased = easeOutCubic(t);
            const lift = RISE_M * eased;
            // плавное затухание во второй половине жизни
            const alpha01 = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
            const alpha = Math.round(alpha01 * 255);

            // лёгкое горизонтальное колебание, чтобы серии не накладывались
            const wobble = Math.sin((m.startedAt % 1000) * 0.012 + i) * 0.05;

            const worldPos = new mp.Vector3(
                basePos.x + wobble,
                basePos.y,
                basePos.z + 0.32 + lift
            );

            const screen = mp.game.graphics.world3dToScreen2d(worldPos);
            if (!screen) continue;

            const baseColor = COLOR_HIT;
            const text = '-' + m.dmg;
            const scale = [0.38, 0.38];

            mp.game.graphics.drawText(text, [screen.x, screen.y], {
                font: 4,
                color: [baseColor[0], baseColor[1], baseColor[2], alpha],
                scale: scale,
                outline: true,
                centre: true
            });
        }
    });
})();
