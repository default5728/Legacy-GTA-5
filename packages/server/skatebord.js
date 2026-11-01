const SKATE_MODEL   = '5rp_skate';
const skateVehicles = new Map();
const skateHandVehs = new Map();
const skateMods     = new Map();

const SLOT_ALIAS = {
    spoiler:   0,  bumperf:   1,  bumperr:   2,  skirt:     3,  exhaust:   4,
    frame:     5,  grille:    6,  hood:      7,  fender:    8,  fenderr:   9,
    roof:      10, engine:    11, brakes:    12, transmission: 13, horn:   14,
    suspension: 15, armor:    16, turbo:     18, xenon:     22, wheels:   23,
    livery:    48, plate:     25, trim:      27, ornaments: 28, dashboard:29,
    dial:      30, doorspeak:31, seats:     32, steering: 33, shifter:   34,
    plaques:   35, speakers: 36, trunk:     37, hydraulics:38, enginebl: 39,
    airfilter: 40, struts:   41, archcover:42, aerials:   43, trim2:    44,
    tank:      45, windows: 46
};

function resolveSlot(raw) {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    const s = String(raw).toLowerCase().trim();
    if (SLOT_ALIAS[s] !== undefined) return SLOT_ALIAS[s];
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? NaN : n;
}

function getActiveSkate(player) {
    if (skateVehicles.has(player.id)) {
        const v = skateVehicles.get(player.id);
        if (mp.vehicles.exists(v)) return v;
    }
    if (skateHandVehs.has(player.id)) {
        const v = skateHandVehs.get(player.id);
        if (mp.vehicles.exists(v)) return v;
    }
    return null;
}

function applySkateMods(veh, mods) {
    if (!veh || !mp.vehicles.exists(veh) || !mods) return;
    try {
        if ('modKit' in veh) veh.modKit = 0;
        else if (typeof veh.setModKit === 'function') veh.setModKit(0);
    } catch (_e) {}
    Object.keys(mods).forEach(k => {
        const slot = parseInt(k, 10);
        const idx  = parseInt(mods[k], 10);
        if (Number.isNaN(slot)) return;
        try {
            if (idx < 0) {
                if (typeof veh.removeMod === 'function') veh.removeMod(slot);
            } else {
                veh.setMod(slot, idx);
            }
        } catch (_e2) {}
    });
}

function getOrInitMods(player) {
    if (!skateMods.has(player.id)) skateMods.set(player.id, {});
    return skateMods.get(player.id);
}

function syncModsToClient(player, veh, mods) {
    if (!veh || !mp.vehicles.exists(veh) || !mods) return;
    const clientId = typeof veh.remoteId === 'number' ? veh.remoteId : veh.id;
    try { player.call('skateboard:applyMods:c', [clientId, JSON.stringify(mods)]); } catch (_e) {}
}

global.skateApplyModsToVehicle = function (veh, mods, player) {
    applySkateMods(veh, mods);
    if (player) syncModsToClient(player, veh, mods);
};

global.skateSessionModsGet = function (player) {
    return skateMods.get(player.id) || {};
};

mp.events.add('skateboard:spawnHand:s', (player) => {
    try {
        if (typeof global.isPlayerInCaptOrBizwarArena === 'function' && global.isPlayerInCaptOrBizwarArena(player)) return;
        if (skateHandVehs.has(player.id)) {
            try { skateHandVehs.get(player.id).destroy(); } catch (_e) {}
            skateHandVehs.delete(player.id);
        }

        const pos = player.position;
        const hd  = player.getHeading ? player.getHeading() : 0;
        const veh = mp.vehicles.new(
            mp.joaat(SKATE_MODEL),
            new mp.Vector3(pos.x, pos.y, pos.z + 0.85),
            {
                heading:     hd,
                numberPlate: '',
                alpha:       255,
                color:       [[0, 0, 0], [0, 0, 0]],
                locked:      false,
                engine:      false,
                dimension:   player.dimension,
            }
        );

        veh.engine = false;
        skateHandVehs.set(player.id, veh);
        const skateItem = typeof global.findSkateboardItemInInventory === 'function'
            ? global.findSkateboardItemInInventory(player)
            : null;
        if (typeof global.applySkateboardLiveryFromInventory === 'function') {
            global.applySkateboardLiveryFromInventory(player, veh, skateItem);
        } else {
            const mods = skateMods.get(player.id);
            applySkateMods(veh, mods);
            syncModsToClient(player, veh, mods);
        }

        const clientId = typeof veh.remoteId === 'number' ? veh.remoteId : veh.id;
        player.setVariable('skateOnBack', clientId);

        player.call('skateboard:handSpawned:c', [veh.id]);
    } catch (_e) {}
});

mp.events.add('skateboard:despawnHand:s', (player) => {
    try {
        if (skateHandVehs.has(player.id)) {
            try { skateHandVehs.get(player.id).destroy(); } catch (_e) {}
            skateHandVehs.delete(player.id);
        }
        player.setVariable('skateOnBack', null);
    } catch (_e) {}
});

mp.events.add('skateboard:ride:s', (player) => {
    try {
        if (typeof global.isPlayerInCaptOrBizwarArena === 'function' && global.isPlayerInCaptOrBizwarArena(player)) return;
        if (skateHandVehs.has(player.id)) {
            try { skateHandVehs.get(player.id).destroy(); } catch (_e) {}
            skateHandVehs.delete(player.id);
        }
        if (skateVehicles.has(player.id)) {
            try { skateVehicles.get(player.id).destroy(); } catch (_e) {}
            skateVehicles.delete(player.id);
        }

        player.setVariable('skateOnBack', null);

        const pos     = player.position;
        const heading = player.getHeading ? player.getHeading() : 0;

        const veh = mp.vehicles.new(
            mp.joaat(SKATE_MODEL),
            new mp.Vector3(pos.x, pos.y, pos.z),
            {
                heading:     heading,
                numberPlate: '',
                alpha:       255,
                color:       [[0, 0, 0], [0, 0, 0]],
                locked:      false,
                engine:      true,
                dimension:   player.dimension,
            }
        );

        veh.engine = true;
        try { veh.setVariable('skateOwner', player.static); } catch (_e) {}
        try { veh.setVariable('skateRide', true); } catch (_e2) {}
        skateVehicles.set(player.id, veh);
        const skateItem = typeof global.findSkateboardItemInInventory === 'function'
            ? global.findSkateboardItemInInventory(player)
            : null;
        if (typeof global.applySkateboardLiveryFromInventory === 'function') {
            global.applySkateboardLiveryFromInventory(player, veh, skateItem);
        } else {
            const mods = skateMods.get(player.id);
            applySkateMods(veh, mods);
            syncModsToClient(player, veh, mods);
        }

        const notifySeated = () => {
            if (!mp.players.exists(player) || !mp.vehicles.exists(veh)) return;
            try { veh.engine = true; } catch (_e) {}
            try { player.call('skateboard:seated:c', [veh.id]); } catch (_e2) {}
        };

        try { player.putIntoVehicle(veh, 0); } catch (_e3) {}
        notifySeated();
        [0, 50, 120, 250].forEach((ms) => {
            setTimeout(() => {
                if (!mp.players.exists(player) || !mp.vehicles.exists(veh)) return;
                if (!player.vehicle || player.vehicle.id !== veh.id) {
                    try { player.putIntoVehicle(veh, 0); } catch (_e4) {}
                }
                try { veh.engine = true; } catch (_e5) {}
                notifySeated();
            }, ms);
        });
    } catch (_e) {}
});

mp.events.add('skateboard:despawn:s', (player) => {
    try {
        if (skateVehicles.has(player.id)) {
            try {
                if (player.vehicle) player.removeFromVehicle();
            } catch (_e0) {}
            try { skateVehicles.get(player.id).destroy(); } catch (_e) {}
            skateVehicles.delete(player.id);
        }
        /* Сбрасываем анимацию и состояние для других клиентов. */
        player.setVariable('skateAnim', null);
        skateInputState.delete(player.id);
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    if (skateHandVehs.has(player.id)) {
        try { skateHandVehs.get(player.id).destroy(); } catch (_e) {}
        skateHandVehs.delete(player.id);
    }
    if (skateVehicles.has(player.id)) {
        try { skateVehicles.get(player.id).destroy(); } catch (_e) {}
        skateVehicles.delete(player.id);
    }
    skateMods.delete(player.id);
    skateInputState.delete(player.id);
});

// ─── Серверная логика анимаций ────────────────────────────────────────────────

const SKATE_DICT_MAIN = 'gta5rp@skateboard';
const SKATE_DICT_RIDE = '5rp_skate';
const SKOROST_MEDLEN  = 6.11;
const VREMA_PRYZHKA   = 900;

/**
 * Состояние анимации на сервере для каждого игрока.
 * player.id → { tekAnim, animZakonchits, pryzhokZakonchits }
 */
const skateInputState = new Map();

function getAnimState(playerId) {
    if (!skateInputState.has(playerId)) {
        skateInputState.set(playerId, { tekAnim: null, animZakonchits: 0, pryzhokZakonchits: 0 });
    }
    return skateInputState.get(playerId);
}

function setSkateAnim(player, slovar, nazvanie, tsikl) {
    const val = `${slovar}|${nazvanie}|${tsikl ? 1 : 0}`;
    player.setVariable('skateAnim', val);
}

const tablitsaAnimatsiy = {
    'push_normal':       '5rp_skate_push_normal',
    'push_normal_left':  '5rp_skate_push_normal_left',
    'push_normal_right': '5rp_skate_push_normal_right',
    'push_fast':         '5rp_skate_push_fast',
    'push_fast_left':    '5rp_skate_push_fast_left',
    'push_fast_right':   '5rp_skate_push_fast_right',
    'idle':              '5rp_skate_idle',
    'idle_fast':         '5rp_skate_idle_fast',
    'idle_left':         '5rp_skate_idle_left',
    'idle_right':        '5rp_skate_idle_right',
    'idle_fast_left':    '5rp_skate_idle_fast_left',
    'idle_fast_right':   '5rp_skate_idle_fast_right',
};

const dlitelnostAnimatsiy = {
    'push_normal': 800, 'push_normal_left': 800, 'push_normal_right': 800,
    'push_fast': 600,   'push_fast_left': 600,   'push_fast_right': 600,
};

function etoDvizhenie(klyuch) {
    return klyuch && (klyuch.startsWith('push_'));
}

function opredelitKlyuchAnim(w, a, d, bystro) {
    if (w) {
        return bystro ? 'push_fast' : 'push_normal';
    }
    if (a) return bystro ? 'idle_fast_left'  : 'idle_left';
    if (d) return bystro ? 'idle_fast_right' : 'idle_right';
    return   bystro ? 'idle_fast' : 'idle';
}

mp.events.add('skateboard:input:s', (player, w, s, a, d, probelNazhat, skorost) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!skateVehicles.has(player.id)) return;

        const now   = Date.now();
        const state = getAnimState(player.id);

        if (probelNazhat && now >= state.pryzhokZakonchits) {
            state.pryzhokZakonchits = now + VREMA_PRYZHKA;
            state.tekAnim           = 'pryzhok';
            state.animZakonchits    = now + VREMA_PRYZHKA;
            setSkateAnim(player, SKATE_DICT_MAIN, 'jump', false);

            /* Через VREMA_PRYZHKA явно сбрасываем анимацию педа — чтобы не застрял в позе jump. */
            setTimeout(() => {
                try {
                    if (!mp.players.exists(player)) return;
                    const st = getAnimState(player.id);
                    /* Сбрасываем только если всё ещё в состоянии прыжка. */
                    if (st.tekAnim !== 'pryzhok') return;
                    st.tekAnim        = null;
                    st.animZakonchits = 0;
                    /* null → клиент вызовет clearTasks на педе. */
                    player.setVariable('skateAnim', null);
                } catch (_e) {}
            }, VREMA_PRYZHKA + 50);

            return;
        }

        /* Прыжок ещё идёт — не перебиваем. */
        if (state.tekAnim === 'pryzhok' && now < state.animZakonchits) return;

        const estSkorost = Number(skorost) > 0.1;
        const bystro     = Number(skorost) >= SKOROST_MEDLEN;

        if (!estSkorost) {
            if (state.tekAnim !== 'stoyka') {
                state.tekAnim        = 'stoyka';
                state.animZakonchits = 0;
                setSkateAnim(player, SKATE_DICT_MAIN, 'stop_idel', true);
            }
            return;
        }

        const klyuch = opredelitKlyuchAnim(w, a, d, bystro);

        /* Блокируем повтор той же анимации пока не доиграла.
           Смену направления (push_normal → push_normal_left и т.п.) НЕ блокируем — реагируем сразу. */
        if (state.tekAnim === klyuch && etoDvizhenie(klyuch) && now < state.animZakonchits) return;

        if (state.tekAnim !== klyuch) {
            state.tekAnim        = klyuch;
            state.animZakonchits = etoDvizhenie(klyuch) ? now + (dlitelnostAnimatsiy[klyuch] || 800) : 0;
            setSkateAnim(player, SKATE_DICT_RIDE, tablitsaAnimatsiy[klyuch], true);
        }
    } catch (_e) {}
});
/**
 * /tskate — открыть/закрыть редактор позиции скейта.
 * Без аргументов: режим зависит от состояния (рука/посадка) — переключает клиент.
 * /tskate ruka — редактор скейта в руке (только когда скейт в руке).
 * /tskate posadka — редактор посадки (только когда едешь).
 */
mp.events.addCommand('tskate', (player, _, rezhim) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (Number(player.adminlvl) < 1) {
            return player.outputChatBox('!{#ff6666}[tskate] Нет прав (admin 1+).');
        }
        const r = (rezhim || '').toLowerCase();
        const target = (r === 'posadka' || r === 'ride' || r === 'sit') ? 'posadka' : 'ruka';
        player.call('skateboard:editor:open', [target]);
        player.outputChatBox(`!{#7CFC00}[tskate] Редактор: ${target}. F2 — выйти, Enter — вывести в чат, Shift/Ctrl + WASD/QE — править.`);
    } catch (e) { console.log('[cmd:tskate]', e); }
});

// ─── Тюнинг скейта ────────────────────────────────────────────────────────────

function adminMods(player) {
    return mp.players.exists(player) && player.getVariable('auth') && Number(player.adminlvl) >= 1;
}

/**
 * /skatemod [slot|alias] [idx]
 * slot: 0–48 или alias (spoiler, wheels, livery, horn и т.д.)
 * idx:  -1 = снять, 0..N = установить вариант.
 * Применяется к текущему скейту (в руке или езде) и сохраняется до выхода.
 */
mp.events.addCommand('skatemod', (player, _, slotRaw, idxRaw) => {
    try {
        if (!adminMods(player)) return player.outputChatBox('!{#ff6666}[skatemod] Нет прав (admin 1+).');
        if (slotRaw == null || idxRaw == null) {
            player.outputChatBox('!{#cccccc}Использование: /skatemod [slot|alias] [idx]');
            player.outputChatBox('!{#aaaaaa}slot: 0–48 или alias (wheels=23, livery=48, horn=14 …)');
            player.outputChatBox('!{#aaaaaa}idx: -1 — снять, 0..N — поставить вариант. /skatemods — список.');
            return;
        }
        const slot = resolveSlot(slotRaw);
        const idx  = parseInt(idxRaw, 10);
        if (Number.isNaN(slot) || Number.isNaN(idx)) {
            return player.outputChatBox('!{#ff6666}[skatemod] Неверный slot или idx.');
        }

        const mods = getOrInitMods(player);
        if (idx < 0) delete mods[slot];
        else mods[slot] = idx;

        const veh = getActiveSkate(player);
        if (veh) {
            applySkateMods(veh, mods);
            syncModsToClient(player, veh, mods);
        }

        player.outputChatBox(`!{#7CFC00}[skatemod] slot ${slot} = ${idx}${veh ? '' : ' (применится при следующем спавне)'}`);
    } catch (e) { console.log('[cmd:skatemod]', e); }
});

/** /skatemodclear — сбросить весь тюнинг. */
mp.events.addCommand('skatemodclear', (player) => {
    try {
        if (!adminMods(player)) return player.outputChatBox('!{#ff6666}[skatemodclear] Нет прав.');
        skateMods.set(player.id, {});
        const veh = getActiveSkate(player);
        if (veh) {
            try {
                if ('modKit' in veh) veh.modKit = 0;
                for (let s = 0; s <= 48; s++) {
                    try {
                        if (typeof veh.removeMod === 'function') veh.removeMod(s);
                        else veh.setMod(s, -1);
                    } catch (_e) {}
                }
            } catch (_e2) {}
        }
        player.outputChatBox('!{#7CFC00}[skatemodclear] Тюнинг сброшен.');
    } catch (e) { console.log('[cmd:skatemodclear]', e); }
});

/**
 * /skatelivery [idx] — ливрея (текстура деки) на скейте.
 * 5rp_skate_livery1.yft → обычно idx 1, livery0 → idx 0. Перебирай 0,1,2…
 */
mp.events.addCommand('skatelivery', (player, _, idxRaw) => {
    try {
        if (!adminMods(player)) return player.outputChatBox('!{#ff6666}[skatelivery] Нет прав (admin 1+).');
        if (idxRaw == null) {
            player.outputChatBox('!{#cccccc}Использование: /skatelivery [0|1|2|…]  (-1 — снять)');
            player.outputChatBox('!{#aaaaaa}5rp_skate_livery1.yft → попробуй /skatelivery 1');
            player.outputChatBox('!{#aaaaaa}/skatemodlist — сколько ливрей в DLC');
            return;
        }
        const idx = parseInt(idxRaw, 10);
        if (Number.isNaN(idx)) return player.outputChatBox('!{#ff6666}[skatelivery] Неверный номер.');

        const slot = SLOT_ALIAS.livery;
        const mods = getOrInitMods(player);
        if (idx < 0) delete mods[slot];
        else mods[slot] = idx;

        const veh = getActiveSkate(player);
        if (veh) {
            applySkateMods(veh, mods);
            syncModsToClient(player, veh, mods);
        } else {
            player.outputChatBox('!{#aaaaaa}Возьми скейт в руку — применится сразу.');
        }

        player.outputChatBox(`!{#7CFC00}[skatelivery] livery (slot 48) = ${idx}`);
    } catch (e) { console.log('[cmd:skatelivery]', e); }
});

/** /skatemodlist — показать текущий тюнинг + варианты на клиенте. */
mp.events.addCommand('skatemodlist', (player) => {
    try {
        if (!adminMods(player)) return player.outputChatBox('!{#ff6666}[skatemodlist] Нет прав.');
        const mods = skateMods.get(player.id) || {};
        const keys = Object.keys(mods);
        if (keys.length === 0) player.outputChatBox('!{#aaaaaa}[skatemodlist] Текущий тюнинг пуст.');
        else {
            player.outputChatBox('!{#7CFC00}── Текущий тюнинг скейта ──');
            keys.forEach(k => player.outputChatBox(`!{#cccccc}  slot ${k} = ${mods[k]}`));
        }
        const veh = getActiveSkate(player);
        if (veh && mp.vehicles.exists(veh)) {
            const clientId = typeof veh.remoteId === 'number' ? veh.remoteId : veh.id;
            player.call('skateboard:modsScan:c', [clientId]);
        } else {
            player.outputChatBox('!{#aaaaaa}Скейт не активен — список вариантов недоступен. Возьми его в руку.');
        }
    } catch (e) { console.log('[cmd:skatemodlist]', e); }
});

/**
 * /skatespawnt slot:idx,slot:idx,...
 * Записать пресет и сразу взять скейт в руку с тюнингом.
 * Пример: /skatespawnt wheels:2,livery:1,horn:5
 */
mp.events.addCommand('skatespawnt', (player, _, preset) => {
    try {
        if (!adminMods(player)) return player.outputChatBox('!{#ff6666}[skatespawnt] Нет прав.');
        const mods = {};
        if (preset) {
            preset.split(',').forEach(pair => {
                const [k, v] = pair.split(':').map(s => s && s.trim());
                if (!k || v == null) return;
                const slot = resolveSlot(k);
                const idx  = parseInt(v, 10);
                if (!Number.isNaN(slot) && !Number.isNaN(idx)) mods[slot] = idx;
            });
        }
        skateMods.set(player.id, mods);
        player.outputChatBox(`!{#7CFC00}[skatespawnt] Пресет: ${JSON.stringify(mods)}`);

        if (skateHandVehs.has(player.id)) {
            try { skateHandVehs.get(player.id).destroy(); } catch (_e) {}
            skateHandVehs.delete(player.id);
        }
        if (skateVehicles.has(player.id)) {
            try { skateVehicles.get(player.id).destroy(); } catch (_e) {}
            skateVehicles.delete(player.id);
            player.call('skateboard:forceStop', []);
        }
        player.call('skateboard:takeInHand', []);
    } catch (e) { console.log('[cmd:skatespawnt]', e); }
});

/** Клиент вернул список доступных модов. */
mp.events.add('skateboard:modsResult:s', (player, jsonRaw) => {
    try {
        if (!adminMods(player)) return;
        const data = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
        if (!data) return;
        player.outputChatBox('!{#7CFC00}── Доступные слоты тюнинга (всего вариантов) ──');
        Object.keys(data).forEach(slot => {
            const n = data[slot];
            if (n > 0) {
                const alias = Object.keys(SLOT_ALIAS).find(a => SLOT_ALIAS[a] === parseInt(slot, 10));
                player.outputChatBox(`!{#cccccc}  slot ${slot}${alias ? ' ('+alias+')' : ''}: 0..${n - 1} (всего ${n})`);
            }
        });
    } catch (e) { console.log('[skatemod:result]', e); }
});

mp.events.add('skateboard:debug:s', (player, json) => {
    try {
        const d = JSON.parse(json);
        console.log(`[SKATE DBG] ${player.name} | anim=${d.anim}`);
    } catch (_e) {}
});