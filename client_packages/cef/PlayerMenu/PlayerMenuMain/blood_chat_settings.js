/* F10 -> Настройки -> ЧАТ: блоки и ползунки как хит-маркер, компактный layout. */
(function () {
    'use strict';

    var FIELDS = [
        { mode: 1, key: 'width',      label: 'Ширина чата',          min: 18,  max: 90,  step: 1,    unit: '%'  },
        { mode: 0, key: 'height',     label: 'Высота чата',          min: 80,  max: 400, step: 5,    unit: 'px' },
        { mode: 2, key: 'fontSize',   label: 'Размер шрифта',        min: 0.4, max: 2.5, step: 0.05, unit: ''   },
        { mode: 3, key: 'lineHeight', label: 'Межстрочный интервал', min: 14,  max: 40,  step: 1,    unit: 'px' },
        { mode: 4, key: 'opacity',    label: 'Прозрачность',         min: 0.2, max: 1,   step: 0.05, unit: ''   }
    ];

    var state = null;
    var syncing = false;
    var observer = null;

    function trig(name, a, b) {
        try {
            if (typeof window.mp !== 'undefined' && window.mp && window.mp.trigger) {
                window.mp.trigger(name, a, b);
            }
        } catch (_e) {}
    }

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function clampNum(n, min, max) {
        n = Number(n);
        if (!isFinite(n)) return min;
        return Math.max(min, Math.min(max, n));
    }

    function initSliders() {
        try {
            if (typeof $ === 'undefined' || !$.fn || !$.fn.rangeslider) return;
            $('[bcs-rangeslider]').each(function () {
                var $el = $(this);
                try {
                    if ($el.data('rangeslider')) $el.rangeslider('destroy');
                } catch (_e0) {}
            });
            $('[bcs-rangeslider]').rangeslider({
                polyfill: false,
                onSlide: function (_position, value) {
                    if (syncing) return;
                    var mode = parseInt(this.$element[0].getAttribute('data-mode'), 10);
                    var f = FIELDS.find(function (x) { return x.mode === mode; });
                    if (!f) return;
                    if (f._input) f._input.value = value;
                    trig('CustomChatSettingsSet', f.mode, value);
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

        var wrap = el('div', 'bcs-wrap');

        FIELDS.forEach(function (f) {
            var block = el('div', 'playerMenu-setting-reticle-param-item-block list-mt-10');
            var label = el('div', 'yk-text w-5 s-14');
            label.style.textShadow = '0px 1px 2px #2C2C2C';
            label.textContent = f.label;
            block.appendChild(label);

            var row = el('div', 'bcs-slider-row mt-10');
            var sliderWrap = el('div', 'yk-slider orange playerMenu-setting-reticle-param-item-progress');
            var range = el('input', '');
            range.type = 'range';
            range.setAttribute('bcs-rangeslider', '');
            range.setAttribute('data-mode', String(f.mode));
            range.min = f.min;
            range.max = f.max;
            range.step = f.step;
            range.value = f.min;
            sliderWrap.appendChild(range);
            row.appendChild(sliderWrap);

            var inputWrap = el('div', 'yk-input-block');
            inputWrap.style.background = '#111E37';
            inputWrap.style.borderRadius = '4px';
            inputWrap.style.padding = '5px 0px';
            var input = el('input', 'yk-input center');
            input.type = 'number';
            input.min = f.min;
            input.max = f.max;
            input.step = f.step;
            input.value = f.min;
            inputWrap.appendChild(input);
            row.appendChild(inputWrap);
            block.appendChild(row);
            wrap.appendChild(block);

            input.addEventListener('input', function () {
                if (syncing) return;
                var nv = parseFloat(input.value);
                if (!isFinite(nv)) return;
                nv = clampNum(nv, f.min, f.max);
                updateSliderUi(f, nv);
                trig('CustomChatSettingsSet', f.mode, nv);
            });

            f._range = range;
            f._input = input;
        });

        var resetBlock = el('div', 'bcs-reset-block');
        var resetBtn = el('button', 'yk-btn s-15 p-10-15 green', 'Сбросить по умолчанию');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
            trig('CustomChatSettingsSet', 5, 0);
        });
        resetBlock.appendChild(resetBtn);
        wrap.appendChild(resetBlock);

        host.appendChild(wrap);
        initSliders();
    }

    function applyFields(cs) {
        syncing = true;
        try {
            FIELDS.forEach(function (f) {
                var v = cs && cs[f.key];
                if (typeof v !== 'number' || !isFinite(v)) v = f.min;
                updateSliderUi(f, v);
            });
        } catch (_e) {}
        syncing = false;
    }

    function getHost() {
        return document.getElementById('bloodChatSettingsPanel');
    }

    function isChatSettingsTabActive() {
        try {
            var m = typeof window.palyerMainMenuMenu !== 'undefined' ? window.palyerMainMenuMenu : null;
            var v = m && m.vue ? m.vue : null;
            return !!(v && v.currentTab === 5 && v.currentSettingTab === 3);
        } catch (_e) {
            return false;
        }
    }

    function ensureBuilt() {
        if (!isChatSettingsTabActive()) return false;
        var host = getHost();
        if (!host) return false;
        if (!host.querySelector('.bcs-wrap')) buildPanel(host);
        if (state) applyFields(state);
        return true;
    }

    window.applyChatSettingsToMenu = function (raw) {
        try {
            var cs = (typeof raw === 'string') ? JSON.parse(raw) : raw;
            if (!cs || typeof cs !== 'object') return;
            state = cs;
            var host = getHost();
            if (host && host.querySelector('.bcs-wrap')) applyFields(cs);
        } catch (_e) {}
    };

    window.bloodChatSettingsClose = function () {
        try {
            var host = getHost();
            if (host) host.innerHTML = '';
            state = null;
        } catch (_e) {}
    };

    window.bloodChatSettingsOpen = function () {
        var attempts = 0;
        (function poll() {
            if (!isChatSettingsTabActive()) return;
            if (ensureBuilt()) {
                trig('CustomChatSettingsRequest');
                return;
            }
            if (attempts++ < 30) setTimeout(poll, 30);
        })();
    };

    function installObserver() {
        if (observer) return;
        try {
            observer = new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    var added = muts[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.nodeType !== 1) continue;
                        if (node.id === 'bloodChatSettingsPanel' || (node.querySelector && node.querySelector('#bloodChatSettingsPanel'))) {
                            setTimeout(function () {
                                if (!isChatSettingsTabActive()) return;
                                if (ensureBuilt()) trig('CustomChatSettingsRequest');
                            }, 0);
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (_e) {}
    }

    if (document.body) installObserver();
    else document.addEventListener('DOMContentLoaded', installObserver);
})();
