/**
 * F10 «Прицел» (Life5 playermenu): типы point2 / cross2 / 4tr2 → Phantom HUD / native draw.
 */
(function () {
    function deepClone(v) {
        try { return JSON.parse(JSON.stringify(v)); } catch (_e) { return v; }
    }

    function rgbaToHex(c) {
        const rgba = (c && c.rgba) ? c.rgba : { r: 255, g: 255, b: 255, a: 1 };
        const r = Math.max(0, Math.min(255, Math.round(Number(rgba.r) || 0)));
        const g = Math.max(0, Math.min(255, Math.round(Number(rgba.g) || 0)));
        const b = Math.max(0, Math.min(255, Math.round(Number(rgba.b) || 0)));
        return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    }

    function hexToRgbaParam(hex) {
        const h = String(hex || '#ffffff').replace('#', '');
        const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const n = parseInt(full, 16) || 0xffffff;
        return { rgba: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 } };
    }

    function defaultColorParam() {
        return { rgba: { r: 255, g: 255, b: 255, a: 1 } };
    }

    const RETICLE_TYPE_DEFS = [
        {
            type: 'point2',
            name: 'Точка',
            params: [
                { name: 'Размер', type: 'progress', min: 1, max: 100, value: 10 },
                { name: 'Цвет', type: 'color', value: defaultColorParam() },
                { name: 'Цвет при наведении на противника', type: 'color', value: defaultColorParam() }
            ],
            checkData(data) {
                const n = parseInt(data[0], 10);
                if (isNaN(n) || n < 1 || n > 100) return 'Размер должен быть от 1 до 100';
                return '';
            }
        },
        {
            type: 'cross2',
            name: 'Перекрестие',
            params: [
                { name: 'Длина', type: 'progress', min: 1, max: 100, value: 10 },
                { name: 'Ширина', type: 'progress', min: 1, max: 100, value: 10 },
                { name: 'Расстояние', type: 'progress', min: 1, max: 100, value: 10 },
                { name: 'Цвет', type: 'color', value: defaultColorParam() },
                { name: 'Цвет при наведении на противника', type: 'color', value: defaultColorParam() }
            ],
            checkData: () => ''
        }
    ];

    let reticleActiveType = '';
    let reticleActiveData = [];
    let reticlePreviewUntil = 0;
    let reticlePreviewType = '';
    let reticlePreviewData = null;
    let reticlePreviewTimer = null;
    let crosshairFullSaveTimer = null;

    function getSettings() {
        if (!mp.storage.data) mp.storage.data = {};
        if (!mp.storage.data.settings) mp.storage.data.settings = {};
        return mp.storage.data.settings;
    }

    function getReticleStorage() {
        const s = getSettings();
        if (!s.reticle || typeof s.reticle !== 'object') {
            s.reticle = { type: '', data: [] };
        }
        return s.reticle;
    }

    function cross2ToPhantomJson(data) {
        const len = parseInt(data[0], 10) || 10;
        const wid = parseInt(data[1], 10) || 10;
        const dist = parseInt(data[2], 10) || 10;
        return JSON.stringify([{
            Type: 'Crosshair',
            Height: Math.max(1, Math.round(12 * len / 10)),
            Width: Math.max(1, Math.round(2 * wid / 10)),
            CenterDistance: Math.max(0, Math.round(4 * dist / 10)),
            CenterPointSize: 0,
            CrosshairRadius: 10,
            CenterPointVisible: false,
            CenterPointRadius: 0,
            ChossHairOpacity: 1,
            DefaultColor: rgbaToHex(data[3]),
            TargetColor: rgbaToHex(data[4])
        }]);
    }

    function point2ToPhantomJson(data) {
        const size = parseInt(data[0], 10) || 10;
        return JSON.stringify([{
            Type: 'Crosshair',
            Height: 0,
            Width: 0,
            CenterDistance: 0,
            ChossHairOpacity: 1,
            CenterPointVisible: true,
            CenterPointSize: Math.max(1, Math.round(size / 4)),
            CenterPointRadius: 50,
            CrosshairRadius: 0,
            DefaultColor: rgbaToHex(data[1]),
            TargetColor: rgbaToHex(data[2])
        }]);
    }

    function phantomJsonToCross2Data(jsonStr) {
        try {
            const arr = JSON.parse(String(jsonStr || '[]'));
            const c = arr && arr[0];
            if (!c || c.Type !== 'Crosshair') return null;
            const h = Number(c.Height) || 10;
            const w = Number(c.Width) || 2;
            const d = Number(c.CenterDistance) || 2;
            if (c.CenterPointVisible && (!h || !w)) {
                return {
                    type: 'point2',
                    data: [
                        Math.max(1, Math.min(100, Math.round((Number(c.CenterPointSize) || 2) * 4))),
                        hexToRgbaParam(c.DefaultColor),
                        hexToRgbaParam(c.TargetColor)
                    ]
                };
            }
            return {
                type: 'cross2',
                data: [
                    Math.max(1, Math.min(100, Math.round(h * 10 / 12))),
                    Math.max(1, Math.min(100, Math.round(w * 10 / 2))),
                    Math.max(1, Math.min(100, Math.round(d * 10 / 4))),
                    hexToRgbaParam(c.DefaultColor),
                    hexToRgbaParam(c.TargetColor)
                ]
            };
        } catch (_e) {
            return null;
        }
    }

    function rgbaFromParam(c) {
        const rgba = (c && c.rgba) ? c.rgba : { r: 255, g: 255, b: 255, a: 1 };
        return [
            Math.max(0, Math.min(255, Math.round(Number(rgba.r) || 0))),
            Math.max(0, Math.min(255, Math.round(Number(rgba.g) || 0))),
            Math.max(0, Math.min(255, Math.round(Number(rgba.b) || 0))),
            Math.max(0, Math.min(255, Math.round((Number(rgba.a != null ? rgba.a : 1)) * 255)))
        ];
    }

    function reticleHasTarget() {
        try {
            const ent = mp.game.player.getEntityIsFreeAimingAt();
            if (ent && ent.type === 'player' && ent !== mp.players.local) return true;
        } catch (_e) {}
        return false;
    }

    function canDrawReticleNow() {
        try {
            const p = mp.players.local;
            if (!p.getVariable('auth')) return false;
            const unarmed = mp.game.joaat('weapon_unarmed');
            const weapon = p.weapon;
            if (!weapon || weapon === unarmed) return false;
            const aiming = p.getConfigFlag(78, true);
            if (!aiming) return false;
            return true;
        } catch (_e2) {
            return false;
        }
    }

    function drawRectNorm(cx, cy, w, h, r, g, b, a) {
        mp.game.graphics.drawRect(cx, cy, w, h, r, g, b, a, false);
    }

    function draw4tr2(data, targeting) {
        const size = (parseInt(data[0], 10) || 10) / 900;
        const rot = ((parseInt(data[1], 10) || 0) * Math.PI) / 180;
        const [r, g, b, a] = rgbaFromParam(targeting ? data[3] : data[2]);
        const cx = 0.5;
        const cy = 0.5;
        const gap = size * 2.4;
        const triW = size * 1.1;
        const triH = size * 2.2;
        const dirs = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 }
        ];
        for (let i = 0; i < dirs.length; i++) {
            const d = dirs[i];
            const ang = rot + (i * Math.PI) / 2;
            const dx = Math.cos(ang) * d.x - Math.sin(ang) * d.y;
            const dy = Math.sin(ang) * d.x + Math.cos(ang) * d.y;
            drawRectNorm(cx + dx * gap, cy + dy * gap, triW, triH, r, g, b, a);
        }
    }

    function applyPhantomLocal(jsonStr) {
        const s = getSettings();
        if (!jsonStr) {
            delete s.crosshair;
            mp.storage.flush();
            mp.events.call('hudCrosshairApply', '[]');
            return;
        }
        s.crosshair = jsonStr;
        mp.storage.flush();
        mp.events.call('hudCrosshairApply', jsonStr);
    }

    function saveCrosshairFullToServer() {
        try {
            if (mp.players.local.getVariable('auth') !== true) return;
            const payload = buildCrosshairDbPayload();
            if (!payload || payload.length > 12000) return;
            mp.events.callRemote('crosshairSettingsSave:s', payload);
        } catch (_e) {}
    }

    function scheduleCrosshairFullSave() {
        if (crosshairFullSaveTimer) clearTimeout(crosshairFullSaveTimer);
        crosshairFullSaveTimer = setTimeout(() => {
            crosshairFullSaveTimer = null;
            saveCrosshairFullToServer();
        }, 700);
    }

    function buildCrosshairDbPayload() {
        const s = getSettings();
        const st = getReticleStorage();
        let phantom = null;
        if (typeof s.crosshair === 'string' && s.crosshair.length) {
            try {
                const parsed = JSON.parse(s.crosshair);
                if (Array.isArray(parsed)) phantom = parsed;
            } catch (_e) {}
        }
        let type = reticleActiveType || st.type || '';
        let data = reticleActiveData && reticleActiveData.length
            ? deepClone(reticleActiveData)
            : deepClone(Array.isArray(st.data) ? st.data : []);
        if (!type && phantom) {
            const fromPhantom = phantomJsonToCross2Data(JSON.stringify(phantom));
            if (fromPhantom) {
                type = fromPhantom.type;
                data = fromPhantom.data;
            }
        }
        if (!phantom && type === 'cross2') phantom = JSON.parse(cross2ToPhantomJson(data));
        if (!phantom && type === 'point2') phantom = JSON.parse(point2ToPhantomJson(data));
        return JSON.stringify({
            v: 2,
            phantom: phantom,
            reticle: { type: type, data: data },
            enabled: s.crosshairEnabled !== false
        });
    }

    function applyCrosshairDbPayload(raw) {
        if (typeof raw !== 'string' || !raw.length) return false;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (_e) {
            return false;
        }

        if (parsed && parsed.v === 2 && typeof parsed === 'object') {
            const s = getSettings();
            if (parsed.enabled !== undefined) s.crosshairEnabled = !!parsed.enabled;
            if (parsed.reticle && parsed.reticle.type) {
                const st = getReticleStorage();
                st.type = String(parsed.reticle.type);
                st.data = Array.isArray(parsed.reticle.data) ? deepClone(parsed.reticle.data) : [];
                mp.storage.flush();
                applyReticleRuntime(st.type, st.data, { boot: true, skipServer: true });
            } else if (parsed.phantom && Array.isArray(parsed.phantom)) {
                applyPhantomLocal(JSON.stringify(parsed.phantom));
                const phantomParsed = phantomJsonToCross2Data(JSON.stringify(parsed.phantom));
                if (phantomParsed) {
                    const st = getReticleStorage();
                    st.type = phantomParsed.type;
                    st.data = phantomParsed.data;
                    mp.storage.flush();
                }
            }
            mp.storage.flush();
            return true;
        }

        if (Array.isArray(parsed)) {
            const s = getSettings();
            s.crosshair = raw;
            const phantomParsed = phantomJsonToCross2Data(raw);
            if (phantomParsed) {
                const st = getReticleStorage();
                st.type = phantomParsed.type;
                st.data = phantomParsed.data;
                applyReticleRuntime(st.type, st.data, { boot: true, skipServer: true });
            } else {
                applyPhantomLocal(raw);
            }
            mp.storage.flush();
            return true;
        }
        return false;
    }

    function pushPhantomCrosshair(jsonStr) {
        if (!jsonStr) {
            applyPhantomLocal(null);
            return;
        }
        const s = getSettings();
        s.crosshairEnabled = true;
        applyPhantomLocal(jsonStr);
        scheduleCrosshairFullSave();
    }

    function clearPhantomCrosshair() {
        const s = getSettings();
        delete s.crosshair;
        mp.storage.flush();
        mp.events.call('hudCrosshairApply', '[]');
    }

    function applyReticleRuntime(type, data, options) {
        const opts = options || {};
        reticleActiveType = type ? String(type) : '';
        reticleActiveData = data ? deepClone(data) : [];

        const st = getReticleStorage();
        st.type = reticleActiveType;
        st.data = deepClone(reticleActiveData);
        mp.storage.flush();

        if (!reticleActiveType) {
            clearPhantomCrosshair();
            return true;
        }

        if (reticleActiveType === 'cross2') {
            const json = cross2ToPhantomJson(reticleActiveData);
            if (opts.boot || opts.skipServer) applyPhantomLocal(json);
            else pushPhantomCrosshair(json);
            return true;
        }
        if (reticleActiveType === 'point2') {
            const json = point2ToPhantomJson(reticleActiveData);
            if (opts.boot || opts.skipServer) applyPhantomLocal(json);
            else pushPhantomCrosshair(json);
            return true;
        }

        clearPhantomCrosshair();
        return false;
    }

    function previewReticle(type, data, ms) {
        const def = RETICLE_TYPE_DEFS.find((t) => t.type === type);
        if (!type || !def || def.checkData(data)) return;
        const duration = ms || 1000;
        reticlePreviewType = type;
        reticlePreviewData = deepClone(data);
        reticlePreviewUntil = Date.now() + duration;
        if (typeof global !== 'undefined') {
            global.__f10ReticlePreviewUntil = reticlePreviewUntil;
        }
        if (reticlePreviewTimer) clearTimeout(reticlePreviewTimer);
        reticlePreviewTimer = setTimeout(() => {
            reticlePreviewUntil = 0;
            reticlePreviewType = '';
            reticlePreviewData = null;
            reticlePreviewTimer = null;
            if (typeof global !== 'undefined') {
                global.__f10ReticlePreviewUntil = 0;
            }
            bootApplySavedReticle();
        }, duration);

        if (type === 'cross2' || type === 'point2') {
            const json = type === 'cross2' ? cross2ToPhantomJson(data) : point2ToPhantomJson(data);
            const s = getSettings();
            s.crosshair = json;
            mp.storage.flush();
            mp.events.call('hudCrosshairApply', json);
            mp.events.call('hudCrosshairShow', true);
        }
    }

    function buildReticleListForUi() {
        const saved = getReticleStorage();
        let type = saved.type || '';
        let data = Array.isArray(saved.data) ? saved.data : [];

        if (!type) {
            const s = getSettings();
            if (typeof s.crosshair === 'string' && s.crosshair.length) {
                const parsed = phantomJsonToCross2Data(s.crosshair);
                if (parsed) {
                    type = parsed.type;
                    data = parsed.data;
                }
            }
        }

        return RETICLE_TYPE_DEFS.map((t) => ({
            type: t.type,
            name: t.name,
            params: t.params.map((p, i) => ({
                name: p.name,
                type: p.type,
                min: p.min,
                max: p.max,
                value: (type === t.type && data[i] != null) ? deepClone(data[i]) : deepClone(p.value)
            }))
        }));
    }

    function setReticleFromPayload(payload) {
        const arr = Array.isArray(payload) ? payload : [];
        const type = arr[0] == null ? '' : String(arr[0]);
        const data = Array.isArray(arr[1]) ? arr[1] : [];

        if (type === '4tr2') {
            return { ok: false, err: 'Тип прицела недоступен' };
        }

        if (!type) {
            applyReticleRuntime('', []);
            return { ok: true };
        }

        const def = RETICLE_TYPE_DEFS.find((t) => t.type === type);
        if (!def) return { ok: false, err: 'Неизвестный тип прицела' };
        const err = def.checkData(data);
        if (err) return { ok: false, err: err };
        applyReticleRuntime(type, data);
        return { ok: true };
    }

    function bootApplySavedReticle() {
        if (typeof global !== 'undefined' && global.__crosshairServerHydrated) return;
        const s = getSettings();
        if (typeof s.crosshair === 'string' && s.crosshair.length) {
            try {
                const root = JSON.parse(s.crosshair);
                if (root && root.v === 2) {
                    applyCrosshairDbPayload(s.crosshair);
                    return;
                }
            } catch (_eV2) {}
        }
        if (typeof s.crosshair === 'string' && s.crosshair.length && s.crosshairEnabled !== false) {
            syncReticleFromPhantomJson(s.crosshair);
            return;
        }
        const saved = getReticleStorage();
        if (saved.type === '4tr2') {
            applyReticleRuntime('', []);
            return;
        }
        if (saved.type) {
            applyReticleRuntime(saved.type, saved.data, { boot: true, skipServer: true });
        }
    }

    mp.events.add('client_hud_reticle_set_test', (jsonStr) => {
        try {
            const parsed = JSON.parse(String(jsonStr || '[]'));
            previewReticle(parsed[0], parsed[1], 1000);
        } catch (_e) {}
    });

    mp.events.add('client_hud_reticle_set_bridge', (jsonStr) => {
        try {
            const parsed = JSON.parse(String(jsonStr || '[]'));
            setReticleFromPayload(parsed);
        } catch (_eBridge) {}
    });

    function syncReticleFromPhantomJson(jsonStr) {
        if (typeof jsonStr !== 'string' || !jsonStr.length) return false;
        let parsedRoot;
        try {
            parsedRoot = JSON.parse(jsonStr);
        } catch (_e) {
            return false;
        }
        if (parsedRoot && parsedRoot.v === 2) {
            return applyCrosshairDbPayload(jsonStr);
        }
        const s = getSettings();
        s.crosshair = jsonStr;
        const parsed = phantomJsonToCross2Data(jsonStr);
        if (parsed) {
            const st = getReticleStorage();
            st.type = parsed.type;
            st.data = parsed.data;
            applyReticleRuntime(parsed.type, parsed.data, { boot: true, skipServer: true });
        } else {
            applyPhantomLocal(jsonStr);
        }
        mp.storage.flush();
        return true;
    }

    mp.events.add('playerReady', () => {
        setTimeout(bootApplySavedReticle, 1500);
    });

    setTimeout(bootApplySavedReticle, 2200);

    if (typeof global !== 'undefined') {
        global.__f10Reticle = {
            buildReticleListForUi,
            setReticleFromPayload,
            applyReticleRuntime,
            previewReticle,
            syncReticleFromPhantomJson,
            buildCrosshairDbPayload,
            applyCrosshairDbPayload,
            saveCrosshairFullToServer,
            RETICLE_TYPE_DEFS
        };
    }
})();
