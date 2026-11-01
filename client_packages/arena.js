/**
 * Maze Bank Arena — CEF + freeze + HUD bridge
 */
(function () {
    let arenaBrowser = null;
    let arenaDomReady = false;
    let arenaPendingExec = [];
    let uiOpen = false;
    let freezeActive = false;
    let freezeEndsAt = 0;
    let freezeInterval = null;

    function ensureBrowser() {
        if (arenaBrowser && mp.browsers.exists(arenaBrowser)) return arenaBrowser;
        arenaDomReady = false;
        arenaPendingExec = [];
        arenaBrowser = mp.browsers.new('package://browsers/arena/index.html?v=2');
        arenaBrowser.active = true;
        try {
            arenaBrowser.orderId = 165;
        } catch (_e) {}
        return arenaBrowser;
    }

    function flushArenaQueue() {
        const b = arenaBrowser;
        if (!b || !mp.browsers.exists(b) || !arenaDomReady) return;
        while (arenaPendingExec.length) {
            const code = arenaPendingExec.shift();
            try {
                b.execute(code);
            } catch (_e) {}
        }
    }

    function exec(code) {
        try {
            ensureBrowser();
            if (!arenaDomReady) {
                arenaPendingExec.push(code);
                return;
            }
            if (arenaBrowser && mp.browsers.exists(arenaBrowser)) arenaBrowser.execute(code);
        } catch (_e) {}
    }

    function openUi() {
        ensureBrowser();
        if (arenaBrowser && mp.browsers.exists(arenaBrowser)) arenaBrowser.active = true;
        uiOpen = true;
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
        mp.gui.cursor.visible = true;
        try {
            mp.gui.cursor.show(true, true);
        } catch (_e) {}
        if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal('arena');
        const show = () => exec('try{if(window.arenaUi&&arenaUi.setVisible)arenaUi.setVisible(true);}catch(_e){}');
        show();
        if (!arenaDomReady) {
            setTimeout(show, 350);
            setTimeout(show, 900);
        }
    }

    function closeUi() {
        uiOpen = false;
        exec('try{if(window.arenaUi&&arenaUi.setVisible)arenaUi.setVisible(false);}catch(_e){}');
        mp.gui.cursor.visible = false;
        try {
            mp.gui.cursor.show(false, false);
        } catch (_e2) {}
        if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal('arena');
    }

    function clearFreeze() {
        freezeActive = false;
        freezeEndsAt = 0;
        if (freezeInterval) {
            clearInterval(freezeInterval);
            freezeInterval = null;
        }
        exec('try{if(window.arenaUi&&arenaUi.setFreeze)arenaUi.setFreeze(0);}catch(_e){}');
    }

    function startFreezeCountdown(ms) {
        clearFreeze();
        freezeActive = true;
        freezeEndsAt = Date.now() + (Number(ms) || 5000);
        const tick = () => {
            const left = Math.ceil((freezeEndsAt - Date.now()) / 1000);
            if (left <= 0) {
                clearFreeze();
                return;
            }
            exec('try{if(window.arenaUi&&arenaUi.setFreeze)arenaUi.setFreeze(' + left + ');}catch(_e){}');
        };
        tick();
        freezeInterval = setInterval(tick, 200);
    }

    const FREEZE_BLOCK = [21, 22, 24, 25, 30, 31, 32, 33, 34, 35, 37, 44, 140, 141, 142, 257, 263, 264];

    mp.events.add('render', () => {
        const frozen =
            freezeActive ||
            mp.players.local.getVariable('mbaFrozen') === true ||
            mp.players.local.getVariable('mbaDead') === true;
        if (!frozen) return;
        const n = mp.game.controls;
        for (let i = 0; i < FREEZE_BLOCK.length; i++) {
            n.disableControlAction(0, FREEZE_BLOCK[i], true);
        }
    });

    mp.events.add('browserDomReady', (browser) => {
        if (browser !== arenaBrowser) return;
        arenaDomReady = true;
        flushArenaQueue();
        if (uiOpen) {
            exec('try{if(window.arenaUi&&arenaUi.setVisible)arenaUi.setVisible(true);}catch(_e){}');
        }
    });

    mp.events.add('arena:ui:open', () => openUi());
    mp.events.add('arena:ui:close', () => closeUi());

    mp.events.add('arena:ui:sync', (json) => {
        ensureBrowser();
        const safe = JSON.stringify(String(json || '{}'));
        exec('try{if(window.arenaUi&&arenaUi.sync)arenaUi.sync(' + safe + ');}catch(_e){}');
    });

    mp.events.add('arena:scoreboard', (json) => {
        ensureBrowser();
        if (!json || json === 'null') {
            exec('try{if(window.arenaUi&&arenaUi.setScoreboard)arenaUi.setScoreboard(null);}catch(_e){}');
            return;
        }
        exec('try{if(window.arenaUi&&arenaUi.setScoreboard)arenaUi.setScoreboard(' + JSON.stringify(String(json)) + ');}catch(_e){}');
    });

    mp.events.add('arena:results', (json) => {
        ensureBrowser();
        clearFreeze();
        exec('try{if(window.arenaUi&&arenaUi.showResults)arenaUi.showResults(' + JSON.stringify(String(json || '{}')) + ');}catch(_e){}');
        mp.gui.cursor.visible = true;
    });

    mp.events.add('arena:freeze', (on) => {
        if (on) startFreezeCountdown(5000);
        else clearFreeze();
    });

    mp.events.add('arena:round:start', (_round, _rounds, freezeMs) => {
        startFreezeCountdown(freezeMs || 5000);
    });

    mp.events.add('arena:match:end', () => {
        clearFreeze();
        exec('try{if(window.arenaUi&&arenaUi.setScoreboard)arenaUi.setScoreboard(null);}catch(_e){}');
    });

    mp.events.add('arena:closeInventory', () => {
        try {
            if (typeof global.tryCloseInventoryEsc === 'function') global.tryCloseInventoryEsc();
        } catch (_e) {}
    });

    // CEF → client
    mp.events.add('arena:close:CLIENT', () => {
        closeUi();
        mp.events.callRemote('arena:closeUi:s');
    });
    mp.events.add('arena:list:CLIENT', () => mp.events.callRemote('arena:list:s'));
    mp.events.add('arena:leaveUi:CLIENT', () => {});
    mp.events.add('arena:create:CLIENT', (raw) => mp.events.callRemote('arena:create:s', String(raw || '{}')));
    mp.events.add('arena:join:CLIENT', (id, pass) => mp.events.callRemote('arena:join:s', String(id || ''), String(pass || '')));
    mp.events.add('arena:leave:CLIENT', () => mp.events.callRemote('arena:leave:s'));
    mp.events.add('arena:start:CLIENT', () => mp.events.callRemote('arena:start:s'));
    mp.events.add('arena:team:CLIENT', (team) => mp.events.callRemote('arena:team:s', String(team || '1')));
    mp.events.add('arena:closeResults:CLIENT', () => {
        mp.gui.cursor.visible = false;
    });

    global.openArenaFromPhone = function openArenaFromPhone() {
        mp.events.call('phone:arena:open:CLIENT');
    };

    global.tryCloseArenaEsc = function tryCloseArenaEsc() {
        if (!uiOpen) return false;
        if (mp.players.local.getVariable('inMbaArena') === true) return false;
        closeUi();
        mp.events.callRemote('arena:closeUi:s');
        return true;
    };

    global.isArenaUiOpen = function isArenaUiOpen() {
        return uiOpen;
    };

    /** Тот же полигон ЗЗ арены, что на сервере (greenzones.js). */
    const MBA_ARENA_POLYGON = [
        [-256.8443908691406, -1998.61767578125],
        [-205.33827209472656, -1988.726318359375],
        [-255.1090545654297, -2086.84912109375],
        [-282.89886474609375, -2029.8726806640625]
    ];
    const MBA_ARENA_Z_LOW = 0.0;
    const MBA_ARENA_Z_HIGH = 80.0;
    const MBA_ARENA_BLIP = new mp.Vector3(-257.8638610839844, -2024.740478515625, 30.14549446105957);
    const MBA_ARENA_FALLBACK_RADIUS = 45;

    function pointInPolygon2D(px, py, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i][0];
            const yi = pts[i][1];
            const xj = pts[j][0];
            const yj = pts[j][1];
            const intersect =
                (yi > py) !== (yj > py) &&
                px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    }

    global.canOpenArenaFromPhone = function canOpenArenaFromPhone() {
        try {
            const me = mp.players.local;
            if (!me || !me.getVariable('auth')) return false;
            if (me.getVariable('inMbaArena') === true) return true;
            if ((me.dimension || 0) !== 0) return false;
            const p = me.position;
            if (p.z < MBA_ARENA_Z_LOW || p.z > MBA_ARENA_Z_HIGH) return false;
            if (pointInPolygon2D(p.x, p.y, MBA_ARENA_POLYGON)) return true;
            const dx = p.x - MBA_ARENA_BLIP.x;
            const dy = p.y - MBA_ARENA_BLIP.y;
            return Math.hypot(dx, dy) <= MBA_ARENA_FALLBACK_RADIUS;
        } catch (_e) {
            return false;
        }
    };

    const ARENA_ENTRANCE_BLIP = MBA_ARENA_BLIP;
    const ARENA_BLIP_SPRITE = 647;
    const ARENA_BLIP_COLOR = 1;
    let arenaEntranceBlip = null;

    function applyArenaEntranceBlipNatives(blip) {
        if (!blip || !mp.blips.exists(blip)) return;
        try {
            const h = blip.handle;
            if (!h) return;
            mp.game.ui.setBlipCoords(h, ARENA_ENTRANCE_BLIP.x, ARENA_ENTRANCE_BLIP.y, ARENA_ENTRANCE_BLIP.z);
            mp.game.ui.setBlipSprite(h, ARENA_BLIP_SPRITE);
            mp.game.ui.setBlipColour(h, ARENA_BLIP_COLOR);
            mp.game.ui.setBlipScale(h, 1.0);
            mp.game.ui.setBlipAsShortRange(h, true);
            mp.game.ui.setBlipDisplay(h, 2);
        } catch (_e) {}
    }

    function ensureArenaEntranceBlip() {
        if (arenaEntranceBlip && mp.blips.exists(arenaEntranceBlip)) {
            applyArenaEntranceBlipNatives(arenaEntranceBlip);
            return;
        }
        try {
            arenaEntranceBlip = mp.blips.new(ARENA_BLIP_SPRITE, ARENA_ENTRANCE_BLIP, {
                name: 'Арена',
                color: ARENA_BLIP_COLOR,
                shortRange: true,
                scale: 1.0,
                dimension: 0
            });
            applyArenaEntranceBlipNatives(arenaEntranceBlip);
        } catch (_e2) {}
    }

    mp.events.add('playerReady', () => {
        setTimeout(ensureArenaEntranceBlip, 1200);
        setTimeout(() => {
            try {
                ensureBrowser();
            } catch (_e) {}
        }, 1500);
    });
    setTimeout(ensureArenaEntranceBlip, 2500);

    try {
        setTimeout(() => ensureBrowser(), 800);
    } catch (_pref) {}
})();
