(function () {
    window.events = window.events || {
        _handlers: {},
        addEvent: function (name, fn) {
            if (!this._handlers[name]) this._handlers[name] = [];
            this._handlers[name].push(fn);
        },
        removeEvent: function (name) {
            delete this._handlers[name];
        },
        callEvent: function (name, arg) {
            var list = this._handlers[name] || [];
            var data = arg;
            if (typeof arg === 'string') {
                try { data = JSON.parse(arg); } catch (_e) {}
            }
            list.forEach(function (fn) {
                try { fn(data); } catch (_e2) {}
            });
        },
        on: function () {}
    };

    function parsePayload(payload) {
        if (payload == null) return {};
        if (typeof payload === 'string') {
            try { return JSON.parse(payload); } catch (_e) { return {}; }
        }
        return payload;
    }

    function waitMenuReady(cb) {
        var tries = 0;
        (function tick() {
            if (typeof palyerMainMenuMenu !== 'undefined') return cb();
            if (++tries > 120) return;
            setTimeout(tick, 50);
        })();
    }

    window.events.addEvent('cef.playermenu.open', function (payload) {
        waitMenuReady(function () {
            var data = parsePayload(payload);
            if (data.playerData && typeof data.playerData === 'object') {
                data = Object.assign({}, data.playerData, data);
            }
            try {
                palyerMainMenuMenu.load(data);
                if (typeof window.scheduleReportPatch === 'function') window.scheduleReportPatch();
                if (data.openTab != null && Number(data.openTab) === 7 &&
                    palyerMainMenuMenu.vue && typeof palyerMainMenuMenu.vue.openTab === 'function') {
                    palyerMainMenuMenu.vue.openTab(7);
                }
            } catch (_e) {}
        });
    });

    window.events.addEvent('cef.playermenu.close', function () {
        waitMenuReady(function () {
            try {
                if (palyerMainMenuMenu.vue) palyerMainMenuMenu.vue.close();
                else mp.trigger('client.playermenu.close');
            } catch (_e) {
                try { mp.trigger('client.playermenu.close'); } catch (_e2) {}
            }
        });
    });

    window.events.addEvent('cef.playermenu.setData', function (payload) {
        waitMenuReady(function () {
            var data = parsePayload(payload);
            if (!palyerMainMenuMenu.vue) return;
            try {
                var patch = data.playerData || data;
                if (!palyerMainMenuMenu.vue.playerData) {
                    palyerMainMenuMenu.vue.playerData = {};
                }
                Object.assign(palyerMainMenuMenu.vue.playerData, patch);
                if (Array.isArray(patch.reportMessages)) {
                    palyerMainMenuMenu.vue.reportMessages = patch.reportMessages;
                }
                if (patch.openTab != null && Number(patch.openTab) === 7 &&
                    typeof palyerMainMenuMenu.vue.openTab === 'function') {
                    palyerMainMenuMenu.vue.openTab(7);
                }
            } catch (_e) {}
        });
    });

    window.events.addEvent('cef.playermenu.setTab', function (tabIndex) {
        waitMenuReady(function () {
            try {
                if (palyerMainMenuMenu.vue && typeof palyerMainMenuMenu.vue.openTab === 'function') {
                    palyerMainMenuMenu.vue.openTab(Number(tabIndex));
                }
            } catch (_e) {}
        });
    });
})();
