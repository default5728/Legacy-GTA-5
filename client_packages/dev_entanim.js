/**
 * Dev: проигрывание анимаций на педе и entity (машина/проп).
 * Вызывается с сервера: dev:entanim:c
 */

'use strict';

const SKATE_PED_DICT = 'gta5rp@skateboard';
const SKATE_VEH_DICT = 'gta5rp@skate@tricks@additive';

function chat(msg) {
    try { mp.gui.chat.push(msg); } catch (_e) {}
}

function loadDict(dict) {
    return new Promise(resolve => {
        try {
            if (mp.game.streaming.hasAnimDictLoaded(dict)) return resolve(true);
            mp.game.streaming.requestAnimDict(dict);
        } catch (_e) {
            return resolve(false);
        }
        let n = 0;
        const t = setInterval(() => {
            let ok = false;
            try { ok = mp.game.streaming.hasAnimDictLoaded(dict); } catch (_e2) {}
            if (ok || ++n > 250) {
                clearInterval(t);
                resolve(ok);
            }
        }, 40);
    });
}

function getTargetVeh() {
    const pl = mp.players.local;
    if (pl && pl.vehicle && pl.vehicle.handle) return pl.vehicle;
    let best = null;
    let bestD = 6.0;
    const pos = pl.position;
    mp.vehicles.forEachInStreamRange(v => {
        if (!v || !v.handle) return;
        const dx = v.position.x - pos.x;
        const dy = v.position.y - pos.y;
        const dz = v.position.z - pos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < bestD) {
            bestD = d;
            best = v;
        }
    });
    return best;
}

function playPed(dict, clip, flag) {
    const f = Number.isFinite(flag) ? flag : 1;
    mp.players.local.taskPlayAnim(dict, clip, 8.0, -8.0, -1, f, 0, false, false, false);
}

/** Анимация на entity (машина/объект) — RageMP: entity.playAnim / mp.game.entity.playAnim */
function playVeh(dict, clip) {
    const veh = getTargetVeh();
    if (!veh || !veh.handle) {
        chat('!{#ff6666}[entanim] Нет машины: сядь в транспорт или подойди ближе 6м.');
        return false;
    }

    const blend = 8.0;
    const loop = false;
    const hold = true;

    try {
        if (typeof veh.playAnim === 'function') {
            const r = veh.playAnim(clip, dict, blend, loop, hold, false, 0.0, 0);
            if (r !== false) return true;
        }
    } catch (_e) {}

    try {
        if (mp.game.entity && typeof mp.game.entity.playAnim === 'function') {
            const r = mp.game.entity.playAnim(veh.handle, clip, dict, blend, loop, hold, false, 0.0, 0);
            if (r !== false) return true;
        }
    } catch (_e2) {}

    try {
        const r = mp.game.invoke('0x7FB218262B810A29', veh.handle, clip, dict, blend, loop, hold, false, 0.0, 0);
        if (r) return true;
    } catch (_e3) {}

    chat('!{#ff6666}[entanim] Не удалось проиграть на машине (playAnim / native).');
    return false;
}

function stopVeh(dict, clip) {
    const veh = getTargetVeh();
    if (!veh || !veh.handle) return;
    try {
        if (typeof veh.stopAnim === 'function') {
            veh.stopAnim(clip || '', dict || '', 0.0);
            return;
        }
    } catch (_e) {}
    try {
        if (mp.game.entity && typeof mp.game.entity.stopAnim === 'function') {
            mp.game.entity.stopAnim(veh.handle, clip || '', dict || '', 0.0);
        }
    } catch (_e2) {}
}

mp.events.add('dev:entanim:c', async (target, dict, clip, flagRaw) => {
    try {
        if ((mp.players.local.getVariable('adminlvl') || 0) < 1) return;

        const t = String(target || '').toLowerCase();
        const d = String(dict || '').trim();
        const c = String(clip || '').trim();
        if (!d || !c) {
            chat('!{#cccccc}[entanim] Пустой dict или clip.');
            return;
        }

        const ok = await loadDict(d);
        if (!ok) {
            chat(`!{#ff6666}[entanim] Словарь не загрузился: ${d}`);
            return;
        }

        if (t === 'ped') {
            const flag = parseInt(flagRaw, 10);
            playPed(d, c, Number.isNaN(flag) ? 1 : flag);
            chat(`!{#7CFC00}[entanim] PED ${d} → ${c} (flag ${Number.isNaN(flag) ? 1 : flag})`);
            return;
        }

        if (t === 'veh' || t === 'vehicle') {
            if (playVeh(d, c)) {
                chat(`!{#7CFC00}[entanim] VEH ${d} → ${c}`);
            }
            return;
        }

        chat('!{#cccccc}[entanim] target: ped | veh');
    } catch (e) {
        chat(`!{#ff6666}[entanim] ${e}`);
    }
});

mp.events.add('dev:entanim:stop', () => {
    try {
        if ((mp.players.local.getVariable('adminlvl') || 0) < 1) return;
        mp.players.local.clearTasks();
        stopVeh('', '');
        chat('!{#7CFC00}[entanim] Остановлено.');
    } catch (_e2) {}
});
