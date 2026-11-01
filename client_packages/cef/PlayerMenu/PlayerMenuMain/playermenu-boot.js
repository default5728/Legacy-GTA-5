(function () {
    window.router = window.router || {
        setView: function () {}
    };

    if (window.Vue && !window.Vue.__flowErrHook) {
        window.Vue.__flowErrHook = true;
        window.Vue.config.errorHandler = function (err, vm, info) {
            var msg = String((err && err.message) || err || 'vue error');
            try { mp.trigger('notify:client', 2, 'top-mid', '[F10] ' + msg, 8000); } catch (_e) {}
        };
    }

    window.__flowGearOpen = function () {
        try {
            var vue = window.palyerMainMenuMenu && window.palyerMainMenuMenu.vue;
            if (vue) {
                try { vue.binderSelectKey = -1; } catch (_b) {}
                var st = parseInt(vue.currentSettingTab, 10);
                if (isNaN(st) || st === 3 || st === 5) vue.currentSettingTab = 0;
                vue.currentTab = 5;
                if (typeof vue.flowOpenSettings === 'function') {
                    vue.flowOpenSettings();
                    return;
                }
                return;
            }
        } catch (_e) {}
        try {
            if (typeof window.bloodOpenSettings === 'function') window.bloodOpenSettings();
        } catch (_e2) {}
    };

    function scrollReportChat(vue) {
        Vue.nextTick(function () {
            Vue.nextTick(function () {
                try {
                    var root = vue && vue.$refs ? vue.$refs.reportChat : null;
                    var el = null;
                    if (root && root.querySelector) el = root.querySelector('.yk-scroll.playerMenu-scroll') || root.querySelector('.yk-scroll');
                    if (!el && root && root.scrollTop != null) el = root;
                    if (el) el.scrollTop = el.scrollHeight + 9999;
                } catch (_e) {}
            });
        });
    }

    function focusReportTextarea(vue) {
        if (!vue || vue.currentTab !== 7) return;
        Vue.nextTick(function () {
            Vue.nextTick(function () {
                try {
                    var ta = vue.$refs && vue.$refs.reportInput ? vue.$refs.reportInput : null;
                    if (!ta) {
                        var root = document.getElementById('playerMainMenu');
                        if (!root) return;
                        var areas = root.querySelectorAll('textarea.yk-input');
                        ta = areas.length ? areas[areas.length - 1] : null;
                    }
                    if (ta && typeof ta.focus === 'function') ta.focus();
                } catch (_f) {}
            });
        });
    }

    function bindGearHitbox() {
        var root = document.getElementById('playerMainMenu');
        if (!root || !root.querySelector) return;
        var btn = root.querySelector('.pm-gear-btn');
        if (!btn || btn.__flowGearBound) return;
        btn.__flowGearBound = true;
        function openSettingsFromDom() {
            try {
                var v = window.palyerMainMenuMenu && window.palyerMainMenuMenu.vue;
                if (!v) return;
                try { v.binderSelectKey = -1; } catch (_b) {}
                v.currentSettingTab = 0;
                v.currentTab = 5;
            } catch (_e) {}
        }
        btn.addEventListener('mousedown', function (e) {
            if (e && e.button !== 0) return;
            if (e && e.preventDefault) e.preventDefault();
            openSettingsFromDom();
        });
        btn.addEventListener('click', function (e) {
            if (e && e.preventDefault) e.preventDefault();
            openSettingsFromDom();
        });
    }

    function pmStripMenuFocusables(root) {
        if (!root || !root.querySelectorAll) return;
        var nodes = root.querySelectorAll('button, svg, a[href], [tabindex], .playerMenu-header-button, .yk-btn, input, textarea, select');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (!node || !node.tagName) continue;
            if (node.getAttribute('tabindex') !== '-1') node.setAttribute('tabindex', '-1');
            try { node.style.outline = 'none'; } catch (_o) {}
        }
    }

    function pmInjectFocusGuard() {
        if (window.__flowFocusGuardStyle) return;
        try {
            var st = document.createElement('style');
            st.setAttribute('data-flow-focus-guard', '1');
            st.textContent =
                ':focus { outline: none !important; }' +
                ':focus-visible { outline: none !important; }' +
                'a:focus, [tabindex]:focus, input:focus, textarea:focus, select:focus { outline: none !important; }' +
                'button.yk-btn:focus { outline: none !important; }';
            (document.head || document.documentElement).appendChild(st);
            window.__flowFocusGuardStyle = true;
        } catch (_e) {}
    }

    function pmSuppressTabNav() {
        if (window.__flowTabNavGuard) return;
        window.__flowTabNavGuard = true;
        document.addEventListener('keydown', function (e) {
            try {
                if (!e || e.keyCode !== 9) return;
                if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
                if (palyerMainMenuMenu.vue.binderSelectKey < 0) return;
                var ae = document.activeElement;
                if (ae && ae.tagName && String(ae.tagName).match(/INPUT|TEXTAREA|SELECT/i)) return;
                if (e.preventDefault) e.preventDefault();
            } catch (_e) {}
        }, true);
    }

    function blurIfNotTextInput() {
        try {
            var el = document.activeElement;
            if (!el || !el.blur) return;
            if (el.tagName && String(el.tagName).match(/INPUT|TEXTAREA|SELECT/i)) return;
            if (el.isContentEditable) return;
            el.blur();
        } catch (_b) {}
    }

    function patchPlayerMenuEscAndFocus(vue) {
        if (!vue || vue.__flowEscPatched) return;
        vue.__flowEscPatched = true;

        if (typeof vue.onKeyUp === 'function') {
            var origOnKeyUp = vue.onKeyUp;
            vue.onKeyUp = function (e) {
                if (e && (e.which === 27 || e.keyCode === 27)) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    if (window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil) return;
                    /* Захват бинда: ESC = отмена назначения, меню остаётся */
                    if (this.binderSelectKey != null && this.binderSelectKey >= 0) {
                        try {
                            window.__pmEscCancelUntil = Date.now() + 500;
                            if (typeof window.flowEscClearBinderCapture === 'function') {
                                window.flowEscClearBinderCapture();
                            } else if (typeof window.cancelBinderCaptureFromEsc === 'function') {
                                window.cancelBinderCaptureFromEsc();
                            } else {
                                this.binderSelectKey = -1;
                                mp.trigger('flowMenuBinderCaptureEsc');
                            }
                        } catch (_c) {}
                        return;
                    }
                    try { mp.trigger('playermenu:cef:esc'); } catch (_t) {}
                    return;
                }
                return origOnKeyUp.call(this, e);
            };
        }
    }

    function flowBuildInterfaceSettingsPayload(cs) {
        return {
            enableHelpBox: cs.enableHelpBox !== false,
            enableQuestBox: cs.enableQuestBox !== false,
            enableNametags: cs.enableNametags !== false,
            showUI: cs.showUI !== false,
            enableVoiceChat: cs.enableVoiceChat !== false,
            hideChat: !!cs.hideChat,
            hideDisconnectMarker: cs.hideDisconnectMarker !== false,
            hideMinimap: !!cs.hideMinimap,
            enableTargetMenuRender: cs.enableTargetMenuRender !== false
        };
    }

    function flowApplySettings(cs) {
        if (!cs) return;
        var payload = flowBuildInterfaceSettingsPayload(cs);
        try {
            mp.trigger('saveSettings', 'hud_hints', !!payload.enableHelpBox);
            mp.trigger('saveSettings', 'hud', !!payload.showUI);
            mp.trigger('saveSettings', 'names', !!payload.enableNametags);
            mp.trigger('saveSettings', 'voice', !!payload.enableVoiceChat);
            mp.trigger('saveSettings', 'chat', !payload.hideChat);
            mp.trigger('saveSettings', 'disconnect_marker', !payload.hideDisconnectMarker);
            mp.trigger('saveSettings', 'map', !payload.hideMinimap);
            mp.trigger('saveSettings', 'quests', !!payload.enableQuestBox);
            mp.trigger('saveSettings', 'target_hint', !!payload.enableTargetMenuRender);
        } catch (_e) {}
        return payload;
    }

    async function flowPersistInterfaceSettings(cs) {
        if (!cs) return;
        try {
            var stored = await serverAPI.getApiAsync('client_global_storage_get');
            if (!stored || typeof stored !== 'object') stored = { settings: {}, chat: {} };
            if (!stored.settings || typeof stored.settings !== 'object') stored.settings = {};
            Object.assign(stored.settings, flowBuildInterfaceSettingsPayload(cs));
            await serverAPI.getApiAsync('client_global_storage_flush', stored);
        } catch (_e) {}
    }

    /** 'old' | 'new' — какой HUD выбрал игрок. Хранится отдельно от пака интерфейса,
     *  чтобы переключение чекбоксов на вкладке ИНТЕРФЕЙС не перезаписывало выбор. */
    function flowNormalizeHudVariant(value) {
        return value === 'new' ? 'new' : 'old';
    }

    function flowNormalizeWhistleVariant(value) {
        return value === 'new' ? 'new' : 'old';
    }

    async function flowPersistHudVariant(variant) {
        try {
            var stored = await serverAPI.getApiAsync('client_global_storage_get');
            if (!stored || typeof stored !== 'object') stored = { settings: {}, chat: {} };
            if (!stored.settings || typeof stored.settings !== 'object') stored.settings = {};
            stored.settings.hudVariant = flowNormalizeHudVariant(variant);
            await serverAPI.getApiAsync('client_global_storage_flush', stored);
        } catch (_e) {}
    }

    async function flowPersistWhistleVariant(variant) {
        try {
            var stored = await serverAPI.getApiAsync('client_global_storage_get');
            if (!stored || typeof stored !== 'object') stored = { settings: {}, chat: {} };
            if (!stored.settings || typeof stored.settings !== 'object') stored.settings = {};
            stored.settings.whistleVariant = flowNormalizeWhistleVariant(variant);
            await serverAPI.getApiAsync('client_global_storage_flush', stored);
        } catch (_e) {}
    }

    async function flowHydrateHudVariant(vue) {
        if (!vue || !vue.currentSetting) return;
        try {
            var stored = await serverAPI.getApiAsync('client_global_storage_get');
            var st = (stored && stored.settings) ? stored.settings : {};
            flowSetVueSettingField(vue, vue.currentSetting, 'hudVariant', flowNormalizeHudVariant(st.hudVariant));
        } catch (_e) {}
    }

    async function flowHydrateWhistleVariant(vue) {
        if (!vue || !vue.currentSetting) return;
        try {
            var stored = await serverAPI.getApiAsync('client_global_storage_get');
            var st = (stored && stored.settings) ? stored.settings : {};
            flowSetVueSettingField(vue, vue.currentSetting, 'whistleVariant', flowNormalizeWhistleVariant(st.whistleVariant));
        } catch (_e) {}
    }

    function flowSetVueSettingField(vue, cs, key, val) {
        try {
            if (vue.$set) vue.$set(cs, key, val);
            else cs[key] = val;
        } catch (_e) {}
    }

    function flowApplySettingsToVue(vue, st) {
        if (!vue || !vue.currentSetting || !st) return;
        var cs = vue.currentSetting;
        var helpOn = st.enableHelpBox !== undefined ? !!st.enableHelpBox
            : (st.hud_hints !== undefined ? !!st.hud_hints : (st.help !== false));
        var questOn = st.enableQuestBox !== undefined ? !!st.enableQuestBox
            : (st.quests !== false);
        var namesOn = st.enableNametags !== undefined ? !!st.enableNametags
            : (st.names !== false);
        var uiOn = st.showUI !== undefined ? !!st.showUI : (st.hud !== false);
        var voiceOn = st.enableVoiceChat !== undefined ? !!st.enableVoiceChat
            : (st.voice !== false);
        var hideChat = st.hideChat !== undefined ? !!st.hideChat : (st.chat === false);
        var hideDm = st.hideDisconnectMarker !== undefined ? !!st.hideDisconnectMarker
            : (st.disconnect_marker !== true);
        var hideMap = st.hideMinimap !== undefined ? !!st.hideMinimap : (st.map === false);
        var targetOn = st.enableTargetMenuRender !== undefined ? !!st.enableTargetMenuRender
            : (st.target_hint !== false);
        flowSetVueSettingField(vue, cs, 'enableHelpBox', helpOn);
        flowSetVueSettingField(vue, cs, 'enableQuestBox', questOn);
        flowSetVueSettingField(vue, cs, 'enableNametags', namesOn);
        flowSetVueSettingField(vue, cs, 'showUI', uiOn);
        flowSetVueSettingField(vue, cs, 'enableVoiceChat', voiceOn);
        flowSetVueSettingField(vue, cs, 'hideChat', hideChat);
        flowSetVueSettingField(vue, cs, 'hideDisconnectMarker', hideDm);
        flowSetVueSettingField(vue, cs, 'hideMinimap', hideMap);
        flowSetVueSettingField(vue, cs, 'enableTargetMenuRender', targetOn);
    }

    async function flowHydrateInterfaceSettings(vue) {
        if (!vue || !vue.currentSetting) return;
        try {
            if (typeof window.bloodHydrateInterfaceFromStorage === 'function') {
                await window.bloodHydrateInterfaceFromStorage();
                return;
            }
            var payload = await serverAPI.getApiAsync('client_global_storage_get');
            flowApplySettingsToVue(vue, payload && payload.settings ? payload.settings : {});
        } catch (_e) {}
    }

    function flowDefaultReticleColor() {
        return { rgba: { r: 255, g: 255, b: 255, a: 1 } };
    }

    function flowDefaultReticleTypes() {
        var c = flowDefaultReticleColor;
        return [
            {
                type: 'point2',
                name: 'Точка',
                params: [
                    { name: 'Размер', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Цвет', type: 'color', value: c() },
                    { name: 'Цвет при наведении на противника', type: 'color', value: c() }
                ]
            },
            {
                type: 'cross2',
                name: 'Перекрестие',
                params: [
                    { name: 'Длина', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Ширина', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Расстояние', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Цвет', type: 'color', value: c() },
                    { name: 'Цвет при наведении на противника', type: 'color', value: c() }
                ]
            }
        ];
    }

    function flowEnsureReticleTypeList(list) {
        var filtered = (Array.isArray(list) ? list : []).filter(function (item) {
            return item && item.type !== '4tr2';
        });
        return filtered.length ? filtered : flowDefaultReticleTypes();
    }

    function flowReticleRgbaCss(c) {
        var rgba = (c && c.rgba) ? c.rgba : { r: 255, g: 255, b: 255, a: 1 };
        var r = Math.max(0, Math.min(255, Math.round(Number(rgba.r) || 0)));
        var g = Math.max(0, Math.min(255, Math.round(Number(rgba.g) || 0)));
        var b = Math.max(0, Math.min(255, Math.round(Number(rgba.b) || 0)));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /**
     * Центр экрана — граница между пикселями, поэтому элемент нечётного размера
     * размазывается на два пикселя и прицел выглядит смещённым и мутным.
     */
    function flowReticleEven(value, min) {
        var v = Math.round(Number(value) / 2) * 2;
        return v < min ? min : v;
    }

    function flowReticleGeom(cur) {
        if (!cur || !cur.params) return null;
        var vals = (cur.params || []).map(function (p) { return p && p.value; });
        if (cur.type === 'point2') {
            var size = parseInt(vals[0], 10);
            if (isNaN(size)) size = 10;
            return {
                dot: true,
                color: flowReticleRgbaCss(vals[1]),
                dotSize: flowReticleEven(Math.round(size / 4), 2),
                h: 0,
                w: 0,
                gap: 0,
                rootGap: 0,
                midGap: 0
            };
        }
        if (cur.type === 'cross2') {
            var len = parseInt(vals[0], 10);
            var wid = parseInt(vals[1], 10);
            var dist = parseInt(vals[2], 10);
            if (isNaN(len)) len = 10;
            if (isNaN(wid)) wid = 10;
            if (isNaN(dist)) dist = 10;
            var w = flowReticleEven(Math.round(2 * wid / 10), 2);
            var gap = Math.max(0, Math.round(4 * dist / 10));
            return {
                dot: false,
                color: flowReticleRgbaCss(vals[3]),
                dotSize: 0,
                h: Math.max(1, Math.round(12 * len / 10)),
                w: w,
                gap: gap,
                /* Вертикальные плечи отодвигает ещё и горизонтальная перекладина (высота w),
                   поэтому её половину вычитаем — иначе верх и низ стоят дальше от центра,
                   чем лево и право, и перекрестие выглядит вытянутым. */
                rootGap: Math.max(0, gap - w / 2),
                midGap: gap * 2
            };
        }
        return null;
    }

    function flowInstallReticlePreviewMethods(vue) {
        if (!vue || vue.__flowReticlePreviewMethods) return;
        vue.__flowReticlePreviewMethods = true;
        vue.flowReticleGeom = function () {
            return flowReticleGeom(this.settingReticleCurrent);
        };
        vue.flowReticleDotVisible = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            return !!(g && g.dot);
        };
        vue.flowReticleRootStyle = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            if (!g || g.dot) return {};
            return { gap: (g.rootGap || 0) + 'px' };
        };
        vue.flowReticleMidStyle = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            if (!g || g.dot) return {};
            return { gap: (g.midGap || 0) + 'px' };
        };
        vue.flowReticleStyleV = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            if (!g || g.dot || g.h <= 0 || g.w <= 0) return { display: 'none' };
            return {
                width: g.w + 'px',
                height: g.h + 'px',
                minWidth: g.w + 'px',
                minHeight: g.h + 'px',
                background: g.color
            };
        };
        vue.flowReticleStyleH = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            if (!g || g.dot || g.h <= 0 || g.w <= 0) return { display: 'none' };
            return {
                width: g.h + 'px',
                height: g.w + 'px',
                minWidth: g.h + 'px',
                minHeight: g.w + 'px',
                background: g.color
            };
        };
        vue.flowReticleStyleDot = function () {
            var g = flowReticleGeom(this.settingReticleCurrent);
            if (!g || !g.dot) return { display: 'none' };
            var s = g.dotSize;
            return {
                width: s + 'px',
                height: s + 'px',
                minWidth: s + 'px',
                minHeight: s + 'px',
                borderRadius: '50%',
                background: g.color
            };
        };
    }

    if (window.Vue && !window.Vue.__flowReticlePreviewMixin) {
        window.Vue.__flowReticlePreviewMixin = true;
        window.Vue.mixin({
            methods: {
                flowReticleDotVisible: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    return !!(g && g.dot);
                },
                flowReticleRootStyle: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    if (!g || g.dot) return {};
                    return { gap: (g.rootGap || 0) + 'px' };
                },
                flowReticleMidStyle: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    if (!g || g.dot) return {};
                    return { gap: (g.midGap || 0) + 'px' };
                },
                flowReticleStyleV: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    if (!g || g.dot || g.h <= 0 || g.w <= 0) return { display: 'none' };
                    return {
                        width: g.w + 'px',
                        height: g.h + 'px',
                        minWidth: g.w + 'px',
                        minHeight: g.h + 'px',
                        background: g.color
                    };
                },
                flowReticleStyleH: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    if (!g || g.dot || g.h <= 0 || g.w <= 0) return { display: 'none' };
                    return {
                        width: g.h + 'px',
                        height: g.w + 'px',
                        minWidth: g.h + 'px',
                        minHeight: g.w + 'px',
                        background: g.color
                    };
                },
                flowReticleStyleDot: function () {
                    var g = flowReticleGeom(this.settingReticleCurrent);
                    if (!g || !g.dot) return { display: 'none' };
                    var s = g.dotSize;
                    return {
                        width: s + 'px',
                        height: s + 'px',
                        minWidth: s + 'px',
                        minHeight: s + 'px',
                        borderRadius: '50%',
                        background: g.color
                    };
                }
            }
        });
    }

    function flowLeaveSettingsSubTab(vue, fromTab) {
        fromTab = parseInt(fromTab, 10);
        if (fromTab === 4) {
            /* Превью в CEF, сохранённый прицел не откатываем. */
        }
    }

    function flowNormalizeReticleColor(v) {
        // Уже полный объект vue-color — не трогаем (иначе курсор пикера залипает)
        if (v && typeof v === 'object' && v.rgba && typeof v.rgba === 'object') {
            if (v.hex || v.hsl || v.hsv || v.a != null) return v;
            return {
                rgba: {
                    r: Math.max(0, Math.min(255, Math.round(Number(v.rgba.r) || 0))),
                    g: Math.max(0, Math.min(255, Math.round(Number(v.rgba.g) || 0))),
                    b: Math.max(0, Math.min(255, Math.round(Number(v.rgba.b) || 0))),
                    a: v.rgba.a == null ? 1 : Number(v.rgba.a)
                }
            };
        }
        if (typeof v === 'string') {
            var h = String(v).replace('#', '');
            if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
            var n = parseInt(h, 16);
            if (!isNaN(n)) {
                var r = (n >> 16) & 255;
                var g = (n >> 8) & 255;
                var b = n & 255;
                return {
                    hex: '#' + h.toLowerCase(),
                    rgba: { r: r, g: g, b: b, a: 1 },
                    a: 1
                };
            }
        }
        return flowDefaultReticleColor();
    }

    function flowPlainReticleColor(v) {
        var rgba = (v && v.rgba) ? v.rgba : { r: 255, g: 255, b: 255, a: 1 };
        return {
            rgba: {
                r: Math.max(0, Math.min(255, Math.round(Number(rgba.r) || 0))),
                g: Math.max(0, Math.min(255, Math.round(Number(rgba.g) || 0))),
                b: Math.max(0, Math.min(255, Math.round(Number(rgba.b) || 0))),
                a: rgba.a == null ? 1 : Number(rgba.a)
            }
        };
    }

    function flowBuildReticleRpcPayload(cur) {
        if (!cur) return ['', []];
        flowNormalizeReticleTypeItem(cur);
        var params = (cur.params || []).map(function (p) {
            if (!p) return null;
            if (p.type === 'progress') {
                var n = parseInt(p.value, 10);
                if (isNaN(n)) n = p.min != null ? Number(p.min) : 1;
                return n;
            }
            return flowPlainReticleColor(p.value);
        });
        return [String(cur.type || ''), params];
    }

    function flowColorToHex(v) {
        var rgba = (v && v.rgba) ? v.rgba : { r: 255, g: 255, b: 255 };
        var r = Math.max(0, Math.min(255, Math.round(Number(rgba.r) || 0)));
        var g = Math.max(0, Math.min(255, Math.round(Number(rgba.g) || 0)));
        var b = Math.max(0, Math.min(255, Math.round(Number(rgba.b) || 0)));
        return '#' + [r, g, b].map(function (x) {
            var s = x.toString(16);
            return s.length < 2 ? '0' + s : s;
        }).join('');
    }

    function flowBuildReticlePacked(cur) {
        if (!cur || !cur.type) return { type: '', packed: '' };
        flowNormalizeReticleTypeItem(cur);
        var vals = (cur.params || []).map(function (p) { return p && p.value; });
        if (cur.type === 'point2') {
            var size = parseInt(vals[0], 10);
            if (isNaN(size)) size = 10;
            return { type: 'point2', packed: [size, flowColorToHex(vals[1]), flowColorToHex(vals[2])].join('|') };
        }
        if (cur.type === 'cross2') {
            var len = parseInt(vals[0], 10);
            var wid = parseInt(vals[1], 10);
            var dist = parseInt(vals[2], 10);
            if (isNaN(len)) len = 10;
            if (isNaN(wid)) wid = 10;
            if (isNaN(dist)) dist = 10;
            return {
                type: 'cross2',
                packed: [len, wid, dist, flowColorToHex(vals[3]), flowColorToHex(vals[4])].join('|')
            };
        }
        return { type: String(cur.type), packed: '' };
    }

    var __flowLastReticlePack = null;
    var __flowReticleWantStandard = false;

    function flowRememberReticle(cur) {
        var pack = flowBuildReticlePacked(cur);
        if (pack && pack.type) {
            __flowLastReticlePack = pack;
            __flowReticleWantStandard = false;
            window.__flowLastReticlePack = pack;
        }
        return pack;
    }

    function flowHexToRgbaParam(hex) {
        var h = String(hex || '#ffffff').replace('#', '');
        var full = h.length === 3 ? h.split('').map(function (c) { return c + c; }).join('') : h;
        var n = parseInt(full, 16);
        if (isNaN(n)) n = 0xffffff;
        return { rgba: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 } };
    }

    function flowRpcPayloadFromPack(pack) {
        if (!pack || !pack.type) return null;
        var p = String(pack.packed || '').split('|');
        if (pack.type === 'point2') {
            return ['point2', [parseInt(p[0], 10) || 10, flowHexToRgbaParam(p[1]), flowHexToRgbaParam(p[2])]];
        }
        if (pack.type === 'cross2') {
            return ['cross2', [
                parseInt(p[0], 10) || 10,
                parseInt(p[1], 10) || 10,
                parseInt(p[2], 10) || 10,
                flowHexToRgbaParam(p[3]),
                flowHexToRgbaParam(p[4])
            ]];
        }
        return null;
    }

    function flowSendReticleSave(cur) {
        var pack = flowBuildReticlePacked(cur);
        if ((!pack || !pack.type) && __flowLastReticlePack && __flowLastReticlePack.type && !__flowReticleWantStandard) {
            pack = __flowLastReticlePack;
        }
        var payload = null;
        if (pack && pack.type) {
            __flowLastReticlePack = pack;
            payload = (cur && cur.type) ? flowBuildReticleRpcPayload(cur) : flowRpcPayloadFromPack(pack);
        } else if (__flowReticleWantStandard) {
            payload = ['', []];
        }
        if (!payload) {
            try { serverAPI.notifyError('Сначала выбери тип прицела'); } catch (_eN) {}
            return false;
        }
        try {
            if (window.serverAPI && typeof window.serverAPI.getApiAsync === 'function') {
                window.serverAPI.getApiAsync('client_hud_reticle_set', payload);
                return true;
            }
        } catch (_eRpc) {}
        try { mp.trigger('client_hud_reticle_set_bridge', JSON.stringify(payload)); } catch (_eB) { return false; }
        return true;
    }

    function flowNormalizeReticleTypeItem(item) {
        if (!item || typeof item !== 'object') return item;
        var params = Array.isArray(item.params) ? item.params : [];
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (!p) continue;
            if (p.type === 'progress') {
                var min = p.min != null ? Number(p.min) : 1;
                var max = p.max != null ? Number(p.max) : 100;
                var val = parseInt(p.value, 10);
                if (isNaN(val)) val = min;
                if (val < min) val = min;
                if (val > max) val = max;
                p.value = val;
            } else if (p.type === 'color') {
                // Только если битый/пустой — не перезаписывать живой объект пикера
                if (!p.value || typeof p.value !== 'object' || !p.value.rgba) {
                    p.value = flowNormalizeReticleColor(p.value);
                }
            }
        }
        return item;
    }

    function flowDestroyReticleSliders() {
        try {
            if (typeof window.jQuery === 'undefined') return;
            var $nodes = window.jQuery('[reticle-rangeslider]');
            if (!$nodes || !$nodes.length) return;
            $nodes.each(function () {
                try {
                    var $el = window.jQuery(this);
                    if ($el.data('rangeslider')) $el.rangeslider('destroy');
                } catch (_d) {}
            });
        } catch (_e) {}
    }

    var __flowReticlePreviewTimer = null;
    function flowPushReticlePreview(vue) {
        if (__flowReticlePreviewTimer) {
            clearTimeout(__flowReticlePreviewTimer);
            __flowReticlePreviewTimer = null;
        }
        __flowReticlePreviewTimer = setTimeout(function () {
            __flowReticlePreviewTimer = null;
            try {
                if (vue && typeof vue.$forceUpdate === 'function') vue.$forceUpdate();
            } catch (_e) {}
        }, 16);
    }

    function flowBindReticleSliders(vue) {
        if (!vue) return;
        var bind = function () {
            flowDestroyReticleSliders();
            if (!vue.settingReticleCurrent) {
                flowPushReticlePreview(vue);
                return;
            }
            flowNormalizeReticleTypeItem(vue.settingReticleCurrent);
            var params = vue.settingReticleCurrent.params || [];
            for (var i = 0; i < params.length; i++) {
                var p = params[i];
                if (!p || p.type !== 'progress') continue;
                var inp = document.getElementById('reticleInput' + i);
                if (inp) {
                    inp.value = String(p.value);
                    try { inp.setAttribute('value', String(p.value)); } catch (_a) {}
                }
            }
            try {
                if (typeof window.jQuery === 'undefined') {
                    flowPushReticlePreview(vue);
                    return;
                }
                window.jQuery('[reticle-rangeslider]').rangeslider({
                    polyfill: false,
                    onSlide: function (_pos, value) {
                        try {
                            var idx = parseInt(this.$element[0].getAttribute('reticle'), 10);
                            if (!vue.settingReticleCurrent || !vue.settingReticleCurrent.params) return;
                            var row = vue.settingReticleCurrent.params[idx];
                            if (!row) return;
                            row.value = value;
                            flowPushReticlePreview(vue);
                        } catch (_slide) {}
                    }
                });
            } catch (_rs) {}
            flowPushReticlePreview(vue);
        };
        if (typeof Vue !== 'undefined' && Vue.nextTick) {
            Vue.nextTick(function () {
                Vue.nextTick(bind);
            });
        } else {
            setTimeout(bind, 40);
        }
    }

    function flowParseReticleListPayload(raw) {
        var list = [];
        var currentType = '';
        var pack = raw;
        if (pack && typeof pack === 'object' && !Array.isArray(pack) && pack.data !== undefined && !Array.isArray(pack.list)) {
            pack = pack.data;
        }
        if (pack && typeof pack === 'object' && !Array.isArray(pack) && Array.isArray(pack.list)) {
            list = pack.list;
            currentType = pack.currentType ? String(pack.currentType) : '';
        } else if (Array.isArray(pack)) {
            list = pack;
        }
        list = flowEnsureReticleTypeList(list).map(flowNormalizeReticleTypeItem);
        return { list: list, currentType: currentType };
    }

    function flowSelectReticleByType(vue, typeName) {
        if (!vue) return null;
        var list = Array.isArray(vue.settingReticleTypeList) ? vue.settingReticleTypeList : [];
        var sel = null;
        if (typeName) {
            for (var i = 0; i < list.length; i++) {
                if (list[i] && list[i].type === typeName) {
                    sel = list[i];
                    break;
                }
            }
        }
        if (!sel) {
            if (vue.settingReticleCurrent && vue.settingReticleCurrent.type) return vue.settingReticleCurrent;
            return null;
        }
        if (vue.$set) vue.$set(vue, 'settingReticleCurrent', sel);
        else vue.settingReticleCurrent = sel;
        flowRememberReticle(sel);
        return sel;
    }

    function flowMarkReticleMounted(vue) {
        if (!vue) return;
        flowInstallReticlePreviewMethods(vue);
        try {
            if (vue.$set) vue.$set(vue, '__flowReticleMounted', true);
            else vue.__flowReticleMounted = true;
        } catch (_eM) {
            vue.__flowReticleMounted = true;
        }
    }

    function flowFinishReticleTab(vue) {
        if (!vue) return;
        flowMarkReticleMounted(vue);
        if (vue.$set) vue.$set(vue, 'currentSettingTab', 4);
        else vue.currentSettingTab = 4;
        flowBindReticleSliders(vue);
    }

    async function flowReloadReticleTab(vue, force) {
        if (!vue) return;
        flowMarkReticleMounted(vue);
        var haveList = Array.isArray(vue.settingReticleTypeList) && vue.settingReticleTypeList.length;
        if (haveList && !force) {
            if (vue.$set) vue.$set(vue, 'currentSettingTab', 4);
            else vue.currentSettingTab = 4;
            flowBindReticleSliders(vue);
            return;
        }
        try {
            var raw = await serverAPI.getApiAsync('client_hud_reticle_getList');
            var parsed = flowParseReticleListPayload(raw);
            if (vue.$set) vue.$set(vue, 'settingReticleTypeList', parsed.list);
            else vue.settingReticleTypeList = parsed.list;
            if (!vue.settingReticleCurrent || force) {
                flowSelectReticleByType(vue, parsed.currentType);
            }
            if (vue.$set) vue.$set(vue, 'currentSettingTab', 4);
            else vue.currentSettingTab = 4;
            flowBindReticleSliders(vue);
        } catch (_e) {
            flowFinishReticleTab(vue);
        }
    }

    async function flowPreloadReticleTab(vue) {
        if (!vue) return;
        flowMarkReticleMounted(vue);
        if (vue.__flowReticlePreloading) return;
        vue.__flowReticlePreloading = true;
        try {
            var raw = await serverAPI.getApiAsync('client_hud_reticle_getList');
            var parsed = flowParseReticleListPayload(raw);
            if (vue.$set) vue.$set(vue, 'settingReticleTypeList', parsed.list);
            else vue.settingReticleTypeList = parsed.list;
            if (Number(vue.currentSettingTab) !== 4 || !vue.settingReticleCurrent) {
                flowSelectReticleByType(vue, parsed.currentType);
            }
        } catch (_ePre) {
        } finally {
            vue.__flowReticlePreloading = false;
        }
    }

    function flowPreloadPromoTab(vue) {
        if (!vue) return;
        try {
            if (vue.$set) vue.$set(vue, '__flowPromoMounted', true);
            else vue.__flowPromoMounted = true;
        } catch (_eP) {
            vue.__flowPromoMounted = true;
        }
        try {
            ['UI/MainMenu/bg-confetti.png', 'UI/MainMenu/promo.png', 'UI/MainMenu/bg-reticle.png'].forEach(function (src) {
                var img = new Image();
                img.src = src;
            });
        } catch (_eImg) {}
    }

    function flowOpenReticleTab(vue) {
        if (!vue) return;
        vue.__flowWantReticleTab = true;
        flowMarkReticleMounted(vue);
        if (vue.$set) vue.$set(vue, 'currentSettingTab', 4);
        else vue.currentSettingTab = 4;

        var haveList = Array.isArray(vue.settingReticleTypeList) && vue.settingReticleTypeList.length;
        if (haveList) {
            flowBindReticleSliders(vue);
            return;
        }
        if (typeof vue.openReticleSetting !== 'function') {
            flowReloadReticleTab(vue, true);
            return;
        }
        try {
            var p = vue.openReticleSetting();
            if (p && typeof p.then === 'function') {
                p.then(function () { /* openReticleSetting already binds */ }).catch(function () {
                    flowReloadReticleTab(vue, true);
                });
            }
        } catch (_eOpen) {
            flowReloadReticleTab(vue, true);
        }
    }

    function flowSettingSubTab(tab) {
        tab = parseInt(tab, 10);
        if (isNaN(tab)) tab = 0;
        // Чат (3) и Хит-маркет (5) убраны из F10
        if (tab === 3 || tab === 5) tab = 0;
        if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
        var vue = palyerMainMenuMenu.vue;

        var prevTab = parseInt(vue.currentSettingTab, 10);
        if (isNaN(prevTab)) prevTab = 0;
        if (prevTab === tab && Number(vue.currentTab) === 5) {
            if (tab === 1 && typeof window.bloodLoadSettings === 'function') {
                try { window.bloodLoadSettings(vue); } catch (_eBindSame) {}
            }
            return;
        }

        if (prevTab !== tab) flowLeaveSettingsSubTab(vue, prevTab);

        vue.currentTab = 5;
        vue.binderSelectKey = -1;
        try { mp.trigger('flowMenuBinderCaptureEnd'); } catch (_eCap) {}

        if (tab === 4) {
            // Сначала показываем вкладку — без промежуточного кадра на другой панели
            if (vue.$set) vue.$set(vue, 'currentSettingTab', 4);
            else vue.currentSettingTab = 4;
            flowOpenReticleTab(vue);
            return;
        }

        vue.__flowWantReticleTab = false;
        if (vue.$set) vue.$set(vue, 'currentSettingTab', tab);
        else vue.currentSettingTab = tab;

        // Каждый раз читаем mp.storage — иначе после reopen F10 чекбоксы сбрасываются в default
        if (tab === 0) {
            flowHydrateInterfaceSettings(vue);
        }
        if (tab === 6) {
            flowHydrateHudVariant(vue);
        }
        if (tab === 7) {
            flowHydrateWhistleVariant(vue);
        }
        if (tab === 1 || tab === 0) {
            if (typeof window.bloodLoadSettings === 'function') {
                try { window.bloodLoadSettings(vue); } catch (_eBind) {}
            }
        }
    }

    function patchPlayerMenuInterfaceSettings(vue) {
        if (!vue || vue.__flowInterfaceSettingsPatched) return;
        vue.__flowInterfaceSettingsPatched = true;

        vue.settingChange = async function () {
            flowApplySettings(this.currentSetting);
            await flowPersistInterfaceSettings(this.currentSetting);
        };

        vue.flowSelectHudVariant = async function (variant) {
            var next = flowNormalizeHudVariant(variant);
            if (!this.currentSetting) return;
            if (flowNormalizeHudVariant(this.currentSetting.hudVariant) === next) return;
            flowSetVueSettingField(this, this.currentSetting, 'hudVariant', next);
            await flowPersistHudVariant(next);
            try { mp.trigger('hudVariantApply', next); } catch (_e) {}
        };
        vue.bloodSelectHudVariant = vue.flowSelectHudVariant;

        vue.flowSelectWhistleVariant = async function (variant) {
            var next = flowNormalizeWhistleVariant(variant);
            if (!this.currentSetting) return;
            if (flowNormalizeWhistleVariant(this.currentSetting.whistleVariant) === next) return;
            flowSetVueSettingField(this, this.currentSetting, 'whistleVariant', next);
            await flowPersistWhistleVariant(next);
            try { mp.trigger('whistleVariantApply', next); } catch (_e) {}
        };
        vue.bloodSelectWhistleVariant = vue.flowSelectWhistleVariant;

        vue.settingReloadVoice = function () {
            try { mp.trigger('client_voice_reload'); } catch (_e) {}
        };

        vue.flowGetVoiceReloadKeyName = function () {
            var label = 'F8';
            for (var i = 0; i < (this.binderData || []).length; i++) {
                var row = this.binderData[i];
                if (row && row.action === 'VOICE_CHAT_RELOAD') {
                    label = row.keyName || label;
                    break;
                }
            }
            if (label === '\u2014' || label === 'Нажмите') label = 'F8';
            return '\u041f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c [' + label + ']';
        };

        vue.flowSettingSubTab = flowSettingSubTab;
        window.flowSettingSubTab = flowSettingSubTab;
        window.bloodSettingSubTab = flowSettingSubTab;

        if (!vue.__flowOpenReticlePatched) {
            vue.__flowOpenReticlePatched = true;

            vue.openReticleSetting = async function () {
                await flowReloadReticleTab(this, !this.settingReticleTypeList || !this.settingReticleTypeList.length);
            };

            vue.selectReticleType = function (type) {
                var same = this.settingReticleCurrent === type;
                if (this.$set) this.$set(this, 'settingReticleCurrent', type || null);
                else this.settingReticleCurrent = type || null;
                if (!type) {
                    __flowReticleWantStandard = true;
                    flowDestroyReticleSliders();
                    return;
                }
                __flowReticleWantStandard = false;
                if (!same) flowNormalizeReticleTypeItem(type);
                flowRememberReticle(type);
                flowBindReticleSliders(this);
            };

            vue.settingReticleUpdate = function (p, pIndex) {
                try {
                    if (p && p.type === 'progress') {
                        var min = p.min != null ? Number(p.min) : 1;
                        var max = p.max != null ? Number(p.max) : 100;
                        var val = parseInt(p.value, 10);
                        if (isNaN(val)) val = min;
                        if (val < min) val = min;
                        if (val > max) val = max;
                        p.value = val;
                        var inp = document.getElementById('reticleInput' + pIndex);
                        if (inp) {
                            inp.value = String(val);
                            try {
                                if (typeof window.jQuery !== 'undefined') {
                                    window.jQuery(inp).rangeslider('update', true);
                                }
                            } catch (_rs) {}
                        }
                    }
                } catch (_n) {}
                flowPushReticlePreview(this);
                flowRememberReticle(this.settingReticleCurrent);
                try {
                    if (this.settingReticleCurrent && this.settingReticleCurrent.type) {
                        mp.trigger('client_hud_reticle_set_test', JSON.stringify([
                            this.settingReticleCurrent.type,
                            this.settingReticleCurrent.params.map(function (p) { return p && p.value; })
                        ]));
                    }
                } catch (_ePrev) {}
            };

            vue.settingReticleSaveCode = function () {
                var pack = flowBuildReticlePacked(this.settingReticleCurrent);
                if (!pack || !pack.type || !pack.packed) {
                    try { serverAPI.notifyError('Сначала выбери тип прицела'); } catch (_eC1) {}
                    return;
                }
                var code = pack.type + '|' + pack.packed;
                if (this.$set) this.$set(this, 'settingReticleCode', code);
                else this.settingReticleCode = code;
                try { serverAPI.notifySuccess('Код прицела в поле — скопируй его.'); } catch (_eC2) {}
            };

            vue.settingReticleLoadCode = function () {
                var parts = String(this.settingReticleCode || '').trim().split('|');
                var typeName = String(parts.shift() || '').trim();
                var list = Array.isArray(this.settingReticleTypeList) ? this.settingReticleTypeList : [];
                var target = null;
                for (var i = 0; i < list.length; i++) {
                    if (list[i] && list[i].type === typeName) {
                        target = list[i];
                        break;
                    }
                }
                if (!target) {
                    try { serverAPI.notifyError('Неверный код прицела'); } catch (_eC3) {}
                    return;
                }
                var params = Array.isArray(target.params) ? target.params : [];
                if (parts.length < params.length) {
                    try { serverAPI.notifyError('Код прицела неполный'); } catch (_eC4) {}
                    return;
                }
                for (var j = 0; j < params.length; j++) {
                    var p = params[j];
                    if (!p) continue;
                    if (p.type === 'progress') {
                        var min = p.min != null ? Number(p.min) : 1;
                        var max = p.max != null ? Number(p.max) : 100;
                        var n = parseInt(parts[j], 10);
                        if (isNaN(n)) n = min;
                        p.value = Math.max(min, Math.min(max, n));
                    } else {
                        p.value = flowHexToRgbaParam(parts[j]);
                    }
                }
                this.selectReticleType(target);
                try {
                    mp.trigger('client_hud_reticle_set_test', JSON.stringify([
                        target.type,
                        params.map(function (pp) { return pp && pp.value; })
                    ]));
                } catch (_eC5) {}
                try { serverAPI.notifySuccess('Прицел загружен, нажми «СОХРАНИТЬ».'); } catch (_eC6) {}
            };

        }

        window.__flowReticleSaveNow = function (vueInst) {
            var self = vueInst || (typeof palyerMainMenuMenu !== 'undefined' ? palyerMainMenuMenu.vue : null);
            if (!self) return false;
            if (self.__flowReticleSaving) return false;
            self.__flowReticleSaving = true;
            try {
                var cur = self.settingReticleCurrent;
                if (!cur && typeof palyerMainMenuMenu !== 'undefined' && palyerMainMenuMenu.vue) {
                    cur = palyerMainMenuMenu.vue.settingReticleCurrent || cur;
                }
                if (cur) flowRememberReticle(cur);
                return flowSendReticleSave(cur);
            } catch (_eSave) {
                try { serverAPI.notifyError('Не удалось сохранить прицел'); } catch (_eN3) {}
                return false;
            } finally {
                self.__flowReticleSaving = false;
                try {
                    var ae = document.activeElement;
                    if (ae && ae.blur) ae.blur();
                } catch (_blur) {}
            }
        };

        vue.settingReticleSave = function () {
            return window.__flowReticleSaveNow(this);
        };
        vue.flowReticleSave = function () {
            return window.__flowReticleSaveNow(this);
        };

        if (!vue.__flowSettingsTabWatch) {
            vue.__flowSettingsTabWatch = true;
            vue.$watch('currentTab', function (tab) {
                if (Number(tab) === 5) {
                    flowHydrateInterfaceSettings(vue);
                } else {
                    vue.__flowWantReticleTab = false;
                }
            });
        }

        flowInstallReticlePreviewMethods(vue);
        flowHydrateInterfaceSettings(vue);
        if (Number(vue.currentTab) === 5) {
            flowPreloadReticleTab(vue);
            flowPreloadPromoTab(vue);
        }
    }

    var __flowBindCaptureIgnoreUntil = 0;

    function flowArmBinderCapture() {
        __flowBindCaptureIgnoreUntil = Date.now() + 350;
    }

    function flowBinderCaptureArmed() {
        return Date.now() >= __flowBindCaptureIgnoreUntil;
    }

    function flowBinderCaptureAllowed(vue) {
        if (!vue || vue.binderSelectKey == null || vue.binderSelectKey < 0) return false;
        if (Number(vue.currentTab) !== 5) return false;
        var sub = Number(vue.currentSettingTab);
        return sub === 0 || sub === 1;
    }

    function flowCancelBinderCapture(vue, notify) {
        if (!vue || vue.binderSelectKey == null || vue.binderSelectKey < 0) return;
        window.__pmEscCancelUntil = Date.now() + 500;
        vue.binderSelectKey = -1;
        vue.binderShift = false;
        vue.binderCtrl = false;
        vue.binderAlt = false;
        try { mp.trigger('flowMenuBinderCaptureEsc'); } catch (_eEsc) {}
        if (notify) {
            try { mp.trigger('notify:client', 3, 'top-mid', 'Назначение отменено.', 2500); } catch (_n) {}
        }
    }

    function patchPlayerMenuBinder(vue) {
        if (!vue || vue.__flowBinderPatched) return;
        vue.__flowBinderPatched = true;

        vue.flowSelectBinder = function (idx) {
            idx = parseInt(idx, 10);
            if (isNaN(idx)) return;
            var row = this.binderData && this.binderData[idx];
            if (!row || row.readOnly) return;
            this.binderSelectKey = idx;
            flowArmBinderCapture();
            try { mp.trigger('flowMenuBinderCaptureStart'); } catch (_t) {}
            try { mp.trigger('notify:client', 3, 'top-mid', 'Нажмите любую клавишу.', 3500); } catch (_n) {}
        };

        window.flowCefMouseBindCapture = function (vk, label) {
            try {
                if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
                var v = palyerMainMenuMenu.vue;
                if (!flowBinderCaptureAllowed(v)) return;
                if (!flowBinderCaptureArmed()) return;
                if (v.binderSelectKey < 0 || !v.binderData || !v.binderData[v.binderSelectKey]) return;
                var row = v.binderData[v.binderSelectKey];
                if (row.readOnly) return;
                var info = { vk: Number(vk) || 0, key: label || ('VK' + vk) };
                if (typeof binder_getKeyNameByVK === 'function') info.key = binder_getKeyNameByVK(info.vk) || info.key;
                if (typeof v.binderChangeKey === 'function') {
                    v.binderChangeKey(info, { shift: !!v.binderShift, ctrl: !!v.binderCtrl, alt: !!v.binderAlt });
                } else if (typeof window.bloodCefMouseBindCapture === 'function') {
                    window.bloodCefMouseBindCapture(vk, label);
                    return;
                }
                v.binderShift = false;
                v.binderCtrl = false;
                v.binderAlt = false;
                try { mp.trigger('flowMenuBinderCaptureEnd'); } catch (_t) {}
            } catch (_e) {}
        };

        window.flowEscClearBinderCapture = function () {
            try {
                if (typeof palyerMainMenuMenu !== 'undefined' && palyerMainMenuMenu.vue) {
                    flowCancelBinderCapture(palyerMainMenuMenu.vue, false);
                } else {
                    mp.trigger('flowMenuBinderCaptureEsc');
                }
            } catch (_e) {}
        };

        if (!vue.__flowBinderWatch) {
            vue.__flowBinderWatch = true;
            vue.$watch('binderSelectKey', function (val) {
                try {
                    if (val >= 0) mp.trigger('flowMenuBinderCaptureStart');
                    else if (!(window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil)) {
                        mp.trigger('flowMenuBinderCaptureEnd');
                    }
                } catch (_w) {}
            });
        }

        var origBinderChangeKey = vue.binderChangeKey;
        vue.binderChangeKey = function (keyObj, comb) {
            var idx = this.binderSelectKey;
            if (idx < 0 || !this.binderData || !this.binderData[idx]) return;
            var row = this.binderData[idx];
            if (row.readOnly || row.action === 'MENULIST_OPEN' || row.action === 'HELPMENU_OPEN') {
                flowCancelBinderCapture(this, false);
                return;
            }
            var vk = 0;
            if (keyObj && typeof keyObj === 'object') vk = parseInt(keyObj.vk, 10) || 0;
            else vk = parseInt(keyObj, 10) || 0;
            try {
                mp.trigger('__client_menu_playerMenu_binderUpdate', row.action, vk, JSON.stringify(comb || {}));
            } catch (_eUpd) {
                if (typeof origBinderChangeKey === 'function') {
                    try { return origBinderChangeKey.call(this, keyObj, comb); } catch (_eOrig) {}
                }
            }
            this.binderSelectKey = -1;
            try { mp.trigger('flowMenuBinderCaptureEnd'); } catch (_eEnd2) {}
        };

        if (typeof vue.onKeyUp === 'function' && !vue.__flowBinderKeyUpPatched) {
            vue.__flowBinderKeyUpPatched = true;
            var origOnKeyUp = vue.onKeyUp.bind(vue);
            vue.onKeyUp = function (e) {
                if (flowBinderCaptureAllowed(this) || (window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil)) {
                    if (e && (e.which === 27 || e.keyCode === 27)) {
                        flowCancelBinderCapture(this, true);
                    }
                    return;
                }
                return origOnKeyUp(e);
            };
        }

        if (typeof vue.onKeyDown === 'function' && !vue.__flowBinderKeyDownPatched) {
            vue.__flowBinderKeyDownPatched = true;
            var origOnKeyDown = vue.onKeyDown.bind(vue);
            vue.onKeyDown = function (e) {
                if (flowBinderCaptureAllowed(this)) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    if (e && (e.which === 27 || e.keyCode === 27)) return;
                    if (e.which === 16) this.binderShift = true;
                    else if (e.which === 17) this.binderCtrl = true;
                    else if (e.which === 18) this.binderAlt = true;
                    if (!flowBinderCaptureArmed()) return;
                    if (e.which === 16 || e.which === 17 || e.which === 18) return;
                    var info = typeof binder_getKeyByJS === 'function' ? binder_getKeyByJS(e.which) : null;
                    if (info && typeof this.binderChangeKey === 'function') {
                        this.binderChangeKey(info, {
                            shift: !!this.binderShift,
                            ctrl: !!this.binderCtrl,
                            alt: !!this.binderAlt
                        });
                        this.binderShift = false;
                        this.binderCtrl = false;
                        this.binderAlt = false;
                    }
                    return;
                }
                return origOnKeyDown(e);
            };
        }

        if (typeof vue.onMouseDown === 'function' && !vue.__flowBinderMouseDownPatched) {
            vue.__flowBinderMouseDownPatched = true;
            var origOnMouseDown = vue.onMouseDown.bind(vue);
            vue.onMouseDown = function (e) {
                if (flowBinderCaptureAllowed(this) && flowBinderCaptureArmed() && e && e.button !== 0) {
                    var info = typeof binder_getKeyByMouseButton === 'function'
                        ? binder_getKeyByMouseButton(e.button)
                        : null;
                    if (info) {
                        e.preventDefault();
                        this.binderChangeKey(info, {
                            shift: !!this.binderShift,
                            ctrl: !!this.binderCtrl,
                            alt: !!this.binderAlt
                        });
                        this.binderShift = false;
                        this.binderCtrl = false;
                        this.binderAlt = false;
                        return;
                    }
                }
                return origOnMouseDown(e);
            };
        }

        if (!window.__flowBinderMouseHook) {
            window.__flowBinderMouseHook = true;
            function tryBindMouse(e) {
                try {
                    var btn = e && e.button;
                    if (btn === 0 || btn == null) return;
                    if (btn === 3 || btn === 4) {
                        if (e.preventDefault) e.preventDefault();
                        if (e.stopPropagation) e.stopPropagation();
                    }
                    if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
                    var v = palyerMainMenuMenu.vue;
                    if (!flowBinderCaptureAllowed(v) || !flowBinderCaptureArmed()) return;
                    if (v.binderSelectKey < 0 || !v.binderData || !v.binderData[v.binderSelectKey]) return;
                    var row = v.binderData[v.binderSelectKey];
                    if (row.readOnly) return;
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    var info = null;
                    if (typeof binder_getKeyByMouseButton === 'function' && e.button != null) {
                        info = binder_getKeyByMouseButton(e.button);
                    }
                    if (!info && typeof binder_getKeyByJS === 'function') {
                        info = binder_getKeyByJS(e.which);
                    }
                    if (!info || info.vk < 1) return;
                    if (typeof v.binderChangeKey === 'function') {
                        v.binderChangeKey(info, { shift: !!v.binderShift, ctrl: !!v.binderCtrl, alt: !!v.binderAlt });
                    }
                    v.binderShift = false;
                    v.binderCtrl = false;
                    v.binderAlt = false;
                } catch (_e) {}
            }
            document.addEventListener('mousedown', tryBindMouse, true);
            document.addEventListener('mouseup', tryBindMouse, true);
            document.addEventListener('auxclick', tryBindMouse, true);
        }
    }

    function patchPlayerMenuReport() {
        if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return false;
        var vue = palyerMainMenuMenu.vue;
        if (vue.__flowReportPatched) {
            vue.bloodOpenSettings = function () {
                try { this.binderSelectKey = -1; } catch (_e) {}
                this.currentSettingTab = 0;
                this.currentTab = 5;
                try { if (typeof window.bloodLoadSettings === 'function') window.bloodLoadSettings(this); } catch (_eLoad) {}
            };
            bindGearHitbox();
            return true;
        }
        vue.__flowReportPatched = true;

        pmInjectFocusGuard();
        pmSuppressTabNav();
        patchPlayerMenuEscAndFocus(vue);
        patchPlayerMenuBinder(vue);
        patchPlayerMenuInterfaceSettings(vue);

        vue.f10EnterShop = function () {
            try { mp.trigger('popolnenie'); } catch (_e) {}
        };

        vue.openWiki = function () {
            try { mp.trigger('flowPlayerMenuOpenWiki'); } catch (_eTrig) {}
            try { mp.trigger('playermenu:cef:esc'); } catch (_eEsc) {}
            try { mp.trigger('client.playermenu.close'); } catch (_eClose) {}
            try {
                if (this.currentMenu && typeof this.currentMenu.close === 'function') {
                    this.currentMenu.close();
                } else if (typeof this.close === 'function') {
                    this.close();
                }
            } catch (_eMenu) {}
        };

        pmStripMenuFocusables(document.getElementById('playerMainMenu'));
        Vue.nextTick(function () {
            pmStripMenuFocusables(document.getElementById('playerMainMenu'));
        });

        function transformReportMessages(msgs) {
            if (!Array.isArray(msgs)) return [];
            return msgs.map(function (m) {
                if (!m || typeof m !== 'object') return { name: '—', text: String(m || ''), isAdmin: false };
                var role = String(m.role || '').toLowerCase();
                var isAdmin = m.isAdmin === true || role === 'admin';
                var name = m.name || m.author;
                if (!name) name = isAdmin ? 'Администратор' : ((vue.playerData && vue.playerData.name) || 'Вы');
                return { name: String(name), text: String(m.text || ''), ts: m.ts || 0, isAdmin: !!isAdmin };
            });
        }

        function matchReportFaq(text) {
            if (typeof ReportTextChecker === 'undefined' || typeof reportAnswerList === 'undefined') return [];
            try {
                var checker = new ReportTextChecker(text);
                var matches = [];
                for (var i = 0; i < reportAnswerList.length; i++) {
                    var entry = reportAnswerList[i];
                    if (!entry || !entry.questionList) continue;
                    for (var j = 0; j < entry.questionList.length; j++) {
                        var q = entry.questionList[j];
                        if (!q || typeof q.compare !== 'function') continue;
                        var score = q.compare(checker);
                        if (score > 0.35) {
                            matches.push([score, entry]);
                            break;
                        }
                    }
                }
                if (!matches.length) return [];
                matches.sort(function (a, b) { return b[0] - a[0]; });
                return matches.map(function (m) { return m[1]; });
            } catch (_eFaq) {
                return [];
            }
        }

        vue.clearReportForm = function () {
            this.reportMessageForm = '';
        };
        vue.bloodClearReportForm = function () {
            this.reportMessageForm = '';
        };

        Object.defineProperty(vue, 'bloodReportCanSend', {
            configurable: true,
            get: function () {
                return String(this.reportMessageForm || '').trim().length > 2;
            }
        });

        vue.bloodOpenHelp = function () {
            try { mp.trigger('chat:forceCloseInput'); } catch (_eChat) {}
            this.currentHelpTabIndex = 0;
            this.reportFindAns = [];
            try { this.binderSelectKey = -1; } catch (_e) {}
            this.currentTab = 3;
            blurIfNotTextInput();
            pmStripMenuFocusables(document.getElementById('playerMainMenu'));
        };

        vue.bloodOpenSettings = function () {
            try { this.binderSelectKey = -1; } catch (_e) {}
            this.currentSettingTab = 0;
            this.currentTab = 5;
            try { if (typeof window.bloodLoadSettings === 'function') window.bloodLoadSettings(this); } catch (_eLoad) {}
        };
        vue.flowOpenSettings = vue.bloodOpenSettings;
        window.flowOpenSettings = function () {
            try {
                var v = window.palyerMainMenuMenu && window.palyerMainMenuMenu.vue;
                if (v) {
                    v.currentSettingTab = 0;
                    v.currentTab = 5;
                    try { if (typeof window.bloodLoadSettings === 'function') window.bloodLoadSettings(v); } catch (_eLoad) {}
                }
            } catch (_e) {}
        };
        window.__flowGearOpen = window.flowOpenSettings;
        bindGearHitbox();

        vue.bloodOpenReport = function () {
            var self = this;
            self.reportFindAns = [];
            self.currentTab = 7;
            // Подгружаем тред без очистки UI — без мигания warning↔чат
            serverAPI.getAsync('server_reportSystem_getMessages').then(function (msgs) {
                self.reportMessages = transformReportMessages(Array.isArray(msgs) ? msgs : []);
                scrollReportChat(self);
            }).catch(function (e) {
                if (!Array.isArray(self.reportMessages)) self.reportMessages = [];
                try { serverAPI.notifyError(e); } catch (_n) {}
            });
            blurIfNotTextInput();
            pmStripMenuFocusables(document.getElementById('playerMainMenu'));
            focusReportTextarea(self);
        };

        vue.bloodSendReport = function (forceSend) {
            var faq = forceSend === false ? false : ((this.reportMessages || []).length === 0);
            return this.sendReportMessage(this.reportMessageForm, faq);
        };

        vue.sendReportMessage = async function (text, runFaq) {
            var msg = String(text == null ? '' : text).replace(/[\r\n]+/g, ' ').trim();
            try {
                if (!msg.length) {
                    serverAPI.notifyError('Введите сообщение.');
                    return;
                }
                if (msg.length <= 2) {
                    serverAPI.notifyError('Сообщение слишком короткое.');
                    return;
                }
                if (msg.length > 600) {
                    serverAPI.notifyError('Сообщение слишком длинное (макс. 600).');
                    return;
                }
                if (msg.length < 6) {
                    serverAPI.notifyError('Слишком короткое сообщение. Минимум 6 символов.');
                    return;
                }

                var msgs = this.reportMessages || [];
                if (runFaq !== false && msgs.length === 0 && (!this.reportFindAns || !this.reportFindAns.length)) {
                    var faqHits = matchReportFaq(msg);
                    if (faqHits.length) {
                        this.reportFindAns = faqHits;
                        return;
                    }
                }

                this.reportFindAns = [];
                var sent = await serverAPI.getAsync('server_reportSystem_sendMessage', msg);
                if (Array.isArray(sent)) {
                    this.reportMessages = transformReportMessages(sent);
                } else {
                    var loaded = await serverAPI.getAsync('server_reportSystem_getMessages');
                    this.reportMessages = transformReportMessages(Array.isArray(loaded) ? loaded : []);
                }
                this.reportMessageForm = '';
                scrollReportChat(this);
                try { serverAPI.notifySuccess('Сообщение отправлено.'); } catch (_eOk) {}
            } catch (e) {
                serverAPI.notifyError(e);
            }
        };

        var origDeleteReport = vue.deleteReport;
        vue.deleteReport = async function () {
            try {
                if (typeof origDeleteReport === 'function') {
                    await origDeleteReport.call(this);
                } else {
                    await serverAPI.getAsync('server_reportSystem_deleteChat');
                    this.reportMessages = [];
                }
                this.reportFindAns = [];
                this.reportMessageForm = '';
            } catch (e) {
                serverAPI.notifyError(e);
            }
        };

        var origOpenTab = vue.openTab;
        if (typeof origOpenTab === 'function') {
            vue.openTab = async function (tab) {
                var tabNum = Number(tab);
                // Help живой (как в PlayerMenuMain) — НЕ ремапить 3→7
                if (tabNum === 3) {
                    this.bloodOpenHelp();
                    return;
                }
                if (tabNum === 8) {
                    tab = 0;
                    tabNum = 0;
                }
                if (tabNum === 7) {
                    this.bloodOpenReport();
                    return;
                }
                if (tabNum === 5) {
                    this.currentSettingTab = 0;
                    this.currentTab = 5;
                    try { if (typeof window.bloodLoadSettings === 'function') window.bloodLoadSettings(this); } catch (_eLoad) {}
                    return;
                }

                await origOpenTab.call(this, tab);
                if (tabNum !== 5) vue.__flowWantReticleTab = false;
                else if (vue.__flowWantReticleTab) flowReloadReticleTab(vue);
                blurIfNotTextInput();
                pmStripMenuFocusables(document.getElementById('playerMainMenu'));
            };
        }

        return true;
    }

    if (!window.__flowReportEnterBound) {
        window.__flowReportEnterBound = true;
        document.addEventListener('keydown', function (e) {
            if (!e || (e.keyCode !== 13 && e.which !== 13)) return;
            if (e.shiftKey) return;
            try {
                if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
                var vue = palyerMainMenuMenu.vue;
                if (Number(vue.currentTab) !== 7) return;
                var t = e.target;
                if (!t || !t.tagName || String(t.tagName).toUpperCase() !== 'TEXTAREA') return;
                if (!t.classList || !t.classList.contains('yk-input')) return;
                e.preventDefault();
                e.stopPropagation();
                if (typeof vue.bloodSendReport === 'function') vue.bloodSendReport();
            } catch (_eEnt) {}
        }, true);
    }

    function scheduleReportPatch() {
        if (patchPlayerMenuReport()) return;
        var tries = 0;
        var timer = setInterval(function () {
            tries++;
            if (patchPlayerMenuReport() || tries > 40) clearInterval(timer);
        }, 100);
    }

    window.scheduleReportPatch = scheduleReportPatch;

    if (window.events && typeof window.events.addEvent === 'function') {
        window.events.addEvent('cef.playermenu.open', function () {
            scheduleReportPatch();
            try { bindGearHitbox(); } catch (_eGear) {}
            try {
                if (typeof palyerMainMenuMenu !== 'undefined' && palyerMainMenuMenu.vue) {
                    flowHydrateInterfaceSettings(palyerMainMenuMenu.vue);
                    if (typeof window.bloodLoadSettings === 'function') window.bloodLoadSettings(palyerMainMenuMenu.vue);
                } else if (typeof window.bloodHydrateInterfaceFromStorage === 'function') {
                    window.bloodHydrateInterfaceFromStorage();
                }
            } catch (_eOpenHyd) {}
        });
        window.events.addEvent('cef.playermenu.setData', function () {
            scheduleReportPatch();
        });
        window.events.addEvent('cef.playermenu.setReport', function (payload) {
            try {
                var rep = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
                if (typeof palyerMainMenuMenu === 'undefined' || !palyerMainMenuMenu.vue) return;
                var vue = palyerMainMenuMenu.vue;
                scheduleReportPatch();
                var next = Array.isArray(rep.messages) ? rep.messages.map(function (m) {
                    if (!m || typeof m !== 'object') return { name: '—', text: String(m || ''), isAdmin: false };
                    var role = String(m.role || '').toLowerCase();
                    var isAdmin = m.isAdmin === true || role === 'admin' || String(m.name || '').indexOf('[A]') === 0;
                    return {
                        name: String(m.name || m.author || (isAdmin ? 'Администратор' : 'Вы')),
                        text: String(m.text || ''),
                        ts: m.ts || 0,
                        isAdmin: !!isAdmin
                    };
                }) : [];
                var cur = vue.reportMessages || [];
                var same = cur.length === next.length;
                if (same) {
                    for (var i = 0; i < cur.length; i++) {
                        if (cur[i].text !== next[i].text || cur[i].name !== next[i].name || cur[i].ts !== next[i].ts) {
                            same = false;
                            break;
                        }
                    }
                }
                if (!same) vue.reportMessages = next;
                if (rep.submitted) {
                    vue.reportMessageForm = '';
                    vue.reportFindAns = [];
                    scrollReportChat(vue);
                } else if (rep.draftText != null || rep.prefill != null) {
                    // Только префилл — без автоотправки
                    vue.reportMessageForm = String(rep.draftText != null ? rep.draftText : rep.prefill || '');
                    vue.reportFindAns = [];
                }
                if (rep.openTab === 7) {
                    if (typeof vue.bloodOpenReport === 'function') vue.bloodOpenReport();
                    else if (vue.currentTab !== 7 && typeof vue.openTab === 'function') vue.openTab(7);
                } else if (rep.openTab === 3) {
                    if (typeof vue.bloodOpenHelp === 'function') vue.bloodOpenHelp();
                }
                if (!rep.submitted && (rep.focusInput === true || rep.draftText || rep.prefill)) {
                    focusReportTextarea(vue);
                }
                if (!same && next.length > cur.length) scrollReportChat(vue);
            } catch (_e) {}
        });
    }

    scheduleReportPatch();
    try { bindGearHitbox(); } catch (_eGearBoot) {}
})();
