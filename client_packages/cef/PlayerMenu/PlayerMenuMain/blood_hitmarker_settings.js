/* F10 -> Настройки -> ХИТ-МАРКЕТ: палитра, HEX и типографика 1:1 как вкладка ПРИЦЕЛ. */
(function () {
    'use strict';

    var DEFAULTS = {
        color: [232, 232, 232],
        scale: 0.38,
        headScale: 0.42,
        duration: 950,
        rise: 0.55,
        maxDistance: 220
    };

    var SLIDERS = [
        { key: 'scale', label: 'Размер', min: 0.2, max: 0.8, step: 0.02, unit: '' },
        { key: 'headScale', label: 'Размер (голова)', min: 0.2, max: 0.9, step: 0.02, unit: '' },
        { key: 'duration', label: 'Длительность', min: 400, max: 2000, step: 50, unit: 'мс' },
        { key: 'rise', label: 'Высота подъёма', min: 0.2, max: 1.5, step: 0.05, unit: 'м' },
        { key: 'maxDistance', label: 'Дистанция', min: 50, max: 300, step: 10, unit: 'м' }
    ];

    var state = null;
    var syncing = false;
    var colorVue = null;
    var livePushTimer = null;
    var LIVE_PUSH_MS = 60;

    function trig() {
        try {
            if (typeof window.mp !== 'undefined' && window.mp && window.mp.trigger) {
                window.mp.trigger.apply(window.mp, arguments);
            }
        } catch (_e) {}
    }

    function vueMenu() {
        try {
            var m = typeof window.palyerMainMenuMenu !== 'undefined' ? window.palyerMainMenuMenu : null;
            return m && m.vue ? m.vue : null;
        } catch (_e2) {
            return null;
        }
    }

    function getHost() {
        return document.getElementById('bloodHitmarkerSettingsPanel');
    }

    function isHitmarkerTabActive() {
        var v = vueMenu();
        return !!(v && v.currentTab === 5 && v.currentSettingTab === 5);
    }

    function clampNum(n, min, max) {
        n = Number(n);
        if (!isFinite(n)) return min;
        return Math.max(min, Math.min(max, n));
    }

    function normalizeCfg(raw) {
        var cfg = {};
        var src = raw && typeof raw === 'object' ? raw : {};
        var c = src.color;
        if (Array.isArray(c) && c.length >= 3) {
            cfg.color = [
                clampNum(c[0], 0, 255),
                clampNum(c[1], 0, 255),
                clampNum(c[2], 0, 255)
            ];
        } else {
            cfg.color = DEFAULTS.color.slice();
        }
        cfg.scale = clampNum(src.scale != null ? src.scale : DEFAULTS.scale, 0.2, 0.8);
        cfg.headScale = clampNum(src.headScale != null ? src.headScale : DEFAULTS.headScale, 0.2, 0.9);
        cfg.duration = clampNum(src.duration != null ? src.duration : DEFAULTS.duration, 400, 2000);
        cfg.rise = clampNum(src.rise != null ? src.rise : DEFAULTS.rise, 0.2, 1.5);
        cfg.maxDistance = clampNum(src.maxDistance != null ? src.maxDistance : DEFAULTS.maxDistance, 50, 300);
        return cfg;
    }


    function pushLiveNow() {
        if (!state) return;
        trig('hitmarkerSettingsSet', JSON.stringify(state));
    }

    function pushLive() {
        if (!state) return;
        if (livePushTimer) clearTimeout(livePushTimer);
        livePushTimer = setTimeout(function () {
            livePushTimer = null;
            pushLiveNow();
        }, LIVE_PUSH_MS);
    }

    function flushLive() {
        if (livePushTimer) {
            clearTimeout(livePushTimer);
            livePushTimer = null;
        }
        pushLiveNow();
        try { trig('hitmarkerSettingsFlush'); } catch (_e0) {}
    }

    function destroyColorVue() {
        try {
            if (colorVue && colorVue.$destroy) colorVue.$destroy();
        } catch (_e) {}
        colorVue = null;
        try {
            var inner = document.getElementById('bhmColorVueMount');
            if (inner) inner.innerHTML = '';
        } catch (_e2) {}
    }

    function rgbToPickerColor(rgb) {
        var r = clampNum(rgb[0], 0, 255);
        var g = clampNum(rgb[1], 0, 255);
        var b = clampNum(rgb[2], 0, 255);
        var hex = '#' + [r, g, b].map(function (x) {
            var h = Math.round(x).toString(16);
            return h.length < 2 ? '0' + h : h;
        }).join('');
        return {
            hex: hex,
            rgba: { r: r, g: g, b: b, a: 1 }
        };
    }

    function mountColorPicker() {
        destroyColorVue();
        if (typeof Vue === 'undefined') return;
        var mountEl = document.getElementById('bhmColorVueMount');
        if (!mountEl) return;
        var Chrome = null;
        try {
            if (typeof VueColor !== 'undefined' && VueColor.Chrome) Chrome = VueColor.Chrome;
        } catch (_e0) {}
        if (!Chrome) return;

        var initial = rgbToPickerColor((state && state.color) || DEFAULTS.color);
        colorVue = new Vue({
            el: mountEl,
            components: { 'chrome-picker': Chrome },
            data: { colors: initial },
            template:
                '<chrome-picker style="width: 270px;" v-model="colors" @input="onInput"></chrome-picker>',
            methods: {
                onInput: function (val) {
                    if (syncing || !state || !val || !val.rgba) return;
                    state.color = [
                        clampNum(val.rgba.r, 0, 255),
                        clampNum(val.rgba.g, 0, 255),
                        clampNum(val.rgba.b, 0, 255)
                    ];
                    pushLive();
                },
                setRgb: function (rgb) {
                    syncing = true;
                    try {
                        this.colors = rgbToPickerColor(rgb);
                    } catch (_e1) {}
                    syncing = false;
                }
            }
        });
    }

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function initSliders() {
        try {
            if (typeof $ === 'undefined' || !$.fn || !$.fn.rangeslider) return;
            $('[bhm-rangeslider]').each(function () {
                var $el = $(this);
                try {
                    if ($el.data('rangeslider')) $el.rangeslider('destroy');
                } catch (_e0) {}
            });
            $('[bhm-rangeslider]').rangeslider({
                polyfill: false,
                onSlide: function (_position, value) {
                    if (syncing || !state) return;
                    var key = this.$element[0].getAttribute('bhm-key');
                    var f = SLIDERS.find(function (x) { return x.key === key; });
                    if (!f) return;
                    state[key] = value;
                    if (f._input) f._input.value = value;
                    pushLive();
                }
            });
        } catch (_e1) {}
    }

    function updateSliderUi(f, v) {
        if (f._range) f._range.value = v;
        if (f._input) f._input.value = v;
        try {
            if (typeof $ !== 'undefined' && f._range) $(f._range).rangeslider('update', true);
        } catch (_e2) {}
    }

    function buildPanel(host) {
        host.innerHTML = '';
        host.classList.add('playerMenu-settings-reticle');

        var wrap = el('div', 'd-flex flex-1 bhm-wrap');

        var left = el('div', 'bhm-left');
        var colorBlock = el('div', 'playerMenu-setting-reticle-param-item-block');
        var colorTitle = el('div', 'yk-text w-5 s-14 text-center');
        colorTitle.style.textShadow = '0px 1px 2px #2C2C2C';
        colorTitle.textContent = 'ОСНОВНОЙ ЦВЕТ';
        colorBlock.appendChild(colorTitle);
        var colorOuter = el('div', 'mt-10');
        var colorShell = el('div', 'playerMenu-setting-reticle-param-item-color playerMenu-setting-reticle-param-item-color-disable-a');
        var colorMount = el('div', '');
        colorMount.id = 'bhmColorVueMount';
        colorShell.appendChild(colorMount);
        colorOuter.appendChild(colorShell);
        colorBlock.appendChild(colorOuter);
        left.appendChild(colorBlock);

        var resetBlock = el('div', 'bhm-reset-block text-center');
        var resetBtn = el('button', 'yk-btn s-15 p-10-15 green', 'Сбросить по умолчанию');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
            state = normalizeCfg(DEFAULTS);
            applyFields(state);
            if (colorVue && colorVue.setRgb) colorVue.setRgb(state.color);
            flushLive();
        });
        resetBlock.appendChild(resetBtn);
        left.appendChild(resetBlock);
        wrap.appendChild(left);

        var right = el('div', 'yk-scroll playerMenu-scroll bhm-right ml-auto');

        var enableBlock = el('div', 'playerMenu-setting-reticle-param-item-block list-mt-10');
        var enableHead = el('div', 'd-flex center');
        enableHead.appendChild(el('div', 'yk-text w-5 s-14 flex-1', 'Показывать хит-маркер'));
        var enableVal = el('div', 'playerMenu-setting-value');
        var enableCbWrap = el('div', 'playerMenu-setting-checkbox-block');
        var enableCb = el('input', 'playerMenu-setting-checkbox');
        enableCb.type = 'checkbox';
        var v0 = vueMenu();
        enableCb.checked = !!(v0 && v0.currentSetting && v0.currentSetting.hitMarker);
        enableCb.addEventListener('change', function () {
            var v = vueMenu();
            if (!v || !v.currentSetting) return;
            if (v.$set) v.$set(v.currentSetting, 'hitMarker', !!enableCb.checked);
            else v.currentSetting.hitMarker = !!enableCb.checked;
            try {
                if (typeof window.bloodSettingChange === 'function') window.bloodSettingChange();
            } catch (_e2) {}
        });
        enableCbWrap.appendChild(enableCb);
        enableVal.appendChild(enableCbWrap);
        enableHead.appendChild(enableVal);
        enableBlock.appendChild(enableHead);
        right.appendChild(enableBlock);

        SLIDERS.forEach(function (f) {
            var block = el('div', 'playerMenu-setting-reticle-param-item-block list-mt-10');
            var label = el('div', 'yk-text w-5 s-14');
            label.style.textShadow = '0px 1px 2px #2C2C2C';
            label.textContent = f.label;
            block.appendChild(label);

            var sliderWrap = el('div', 'yk-slider orange playerMenu-setting-reticle-param-item-progress mt-10');
            var range = el('input', '');
            range.type = 'range';
            range.setAttribute('bhm-rangeslider', '');
            range.setAttribute('bhm-key', f.key);
            range.min = f.min;
            range.max = f.max;
            range.step = f.step;
            var v = state ? state[f.key] : DEFAULTS[f.key];
            range.value = v;
            sliderWrap.appendChild(range);
            block.appendChild(sliderWrap);

            var inputWrap = el('div', 'yk-input-block mt-10');
            inputWrap.style.width = '80px';
            inputWrap.style.background = '#111E37';
            inputWrap.style.borderRadius = '4px';
            inputWrap.style.padding = '5px 0px';
            var input = el('input', 'yk-input center');
            input.type = 'number';
            input.min = f.min;
            input.max = f.max;
            input.step = f.step;
            input.value = v;
            inputWrap.appendChild(input);
            block.appendChild(inputWrap);
            right.appendChild(block);

            input.addEventListener('input', function () {
                if (syncing || !state) return;
                var nv = parseFloat(input.value);
                if (!isFinite(nv)) return;
                nv = clampNum(nv, f.min, f.max);
                state[f.key] = nv;
                updateSliderUi(f, nv);
                pushLive();
            });

            f._range = range;
            f._input = input;
        });

        wrap.appendChild(right);
        host.appendChild(wrap);

        mountColorPicker();
        initSliders();
    }

    function applyFields(cfg) {
        syncing = true;
        try {
            state = normalizeCfg(cfg);
            SLIDERS.forEach(function (f) {
                updateSliderUi(f, state[f.key]);
            });
            if (colorVue && colorVue.setRgb) colorVue.setRgb(state.color);
        } catch (_e) {}
        syncing = false;
    }

    function ensureBuilt() {
        if (!isHitmarkerTabActive()) return false;
        var host = getHost();
        if (!host) return false;
        if (!host.querySelector('.bhm-wrap')) buildPanel(host);
        if (state) applyFields(state);
        return true;
    }

    window.applyHitmarkerSettingsToMenu = function (raw) {
        try {
            var cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
            state = normalizeCfg(cfg);
            var host = getHost();
            if (host && host.querySelector('.bhm-wrap')) applyFields(state);
        } catch (_e) {}
    };

    window.bloodHitmarkerSettingsClose = function () {
        flushLive();
        destroyColorVue();
        try {
            var host = getHost();
            if (host) host.innerHTML = '';
        } catch (_e2) {}
        state = null;
    };

    window.bloodHitmarkerSettingsOpen = function () {
        var attempts = 0;
        (function poll() {
            if (!isHitmarkerTabActive()) return;
            if (ensureBuilt()) {
                trig('hitmarkerSettingsRequest');
                return;
            }
            if (attempts++ < 30) setTimeout(poll, 30);
        })();
    };
})();
