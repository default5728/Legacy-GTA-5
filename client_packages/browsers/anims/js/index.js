'use strict';

var FAV_KEY = 'bloody_rp_anim_favorites';
var SLOTS_KEY = 'bloody_rp_anim_slots';
var SLOT_COUNT = 5;

function loadJSON(key, def) {
    try {
        return JSON.parse(localStorage.getItem(key)) || def;
    } catch (_e) {
        return def;
    }
}

function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {}
}

function mpTrigger(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    try {
        if (typeof mp !== 'undefined' && mp && typeof mp.trigger === 'function') {
            mp.trigger.apply(mp, [event].concat(args));
        }
    } catch (_e) {}
}

var AnimMenu = new Vue({
    el: '#app',
    data: function () {
        return {
            Active: true,
            searchForm: '',
            currentAnimCategory: ANIM_CATEGORIES[0] ? ANIM_CATEGORIES[0].id : 'dance',
            currentAnimKey: '',
            openedContextKey: '',
            contextAnim: null,
            contextMenuX: 0,
            contextMenuY: 0,
            contextMenuW: 220,
            animHistoryList: [],
            lastChangeAnimTime: -1,
            favoriteAnims: [],
            animBindSlots: new Array(SLOT_COUNT).fill(null),
            _animFavIgnoreHydrateUntil: 0,
            _animSlotsIgnoreHydrateUntil: 0
        };
    },
    computed: {
        animCategoryList: function () {
            return ANIM_CATEGORIES.map(function (c) {
                return { id: c.id, name: c.name };
            });
        },
        currentAnimList: function () {
            var id = this.currentAnimCategory;
            return animFullList.filter(function (a) {
                return a.categoryId === id;
            });
        },
        fastAnimBinderList: function () {
            var slots = this.animBindSlots || [];
            var result = [];
            for (var i = 0; i < SLOT_COUNT; i++) {
                var s = slots[i];
                result.push(s ? (s.animName || s.animationName) : 'Пустой слот');
            }
            return result;
        },
        searchAnimList: function () {
            if (!this.searchForm) return [];
            var q = this.searchForm.toLowerCase();
            return animFullList.filter(function (a) {
                return (a.animName || '').toLowerCase().indexOf(q) !== -1;
            });
        }
    },
    methods: {
        animFlag: function (anim) {
            if (!anim) return 49;
            return anim.flag !== undefined && anim.flag !== null ? anim.flag : 49;
        },
        animKey: function (anim) {
            if (!anim) return '';
            return anim.animDictionary + '|' + anim.animationName + '|' + this.animFlag(anim);
        },
        enrichFavoriteAnim: function (anim) {
            if (!anim || !anim.animDictionary || !anim.animationName) return null;
            var out = {
                animDictionary: anim.animDictionary,
                animationName: anim.animationName,
                flag: this.animFlag(anim),
                animName: anim.animName || anim.animationName
            };
            if (out.animName === out.animationName) {
                var k = this.animKey(out);
                for (var i = 0; i < animFullList.length; i++) {
                    if (this.animKey(animFullList[i]) === k) {
                        out.animName = animFullList[i].animName || out.animationName;
                        break;
                    }
                }
            }
            return out;
        },
        selectAnimCategory: function (id) {
            this.currentAnimCategory = id;
            this.closeContextMenu();
        },
        canChangeAnim: function () {
            var now = Date.now();
            if (this.lastChangeAnimTime + 1500 > now) return false;
            this.lastChangeAnimTime = now;
            return true;
        },
        startPlayAnim: function (anim) {
            if (!anim || !anim.animDictionary || !anim.animationName) return;
            var key = this.animKey(anim);
            if (this.currentAnimKey === key) {
                this.currentAnimKey = '';
                mpTrigger('anim:play:c', '', '', 0);
                return;
            }
            if (!this.canChangeAnim()) return;
            this.currentAnimKey = key;
            mpTrigger('anim:play:c', anim.animDictionary, anim.animationName, this.animFlag(anim));

            var found = false;
            for (var i = 0; i < this.animHistoryList.length; i++) {
                if (this.animKey(this.animHistoryList[i]) === key) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                if (this.animHistoryList.length > 50) this.animHistoryList.shift();
                this.animHistoryList.push({
                    animName: anim.animName,
                    animDictionary: anim.animDictionary,
                    animationName: anim.animationName,
                    flag: this.animFlag(anim)
                });
            }
        },
        animContextMenu: function (anim, ev) {
            if (!anim || !anim.animDictionary || !anim.animationName) return;
            var key = this.animKey(anim);
            if (this.openedContextKey === key) {
                this.closeContextMenu();
                return;
            }
            this.openedContextKey = key;
            this.contextAnim = {
                animName: anim.animName || anim.animationName,
                animDictionary: anim.animDictionary,
                animationName: anim.animationName,
                flag: this.animFlag(anim)
            };
            var x = 8;
            var y = 8;
            var w = 220;
            var rowRect = null;
            try {
                var el = ev && (ev.currentTarget || ev.target);
                var row = el && el.closest
                    ? (el.closest('.animMenu-anim-item') || el.closest('.animMenu-item-wrap') || el)
                    : el;
                if (row && row.getBoundingClientRect) {
                    rowRect = row.getBoundingClientRect();
                    x = rowRect.left;
                    y = rowRect.bottom + 4;
                    w = Math.max(180, Math.min(280, rowRect.width || 220));
                } else if (ev) {
                    x = Number(ev.clientX) || 8;
                    y = Number(ev.clientY) || 8;
                }
            } catch (_e) {}
            this.contextMenuX = x;
            this.contextMenuY = y;
            this.contextMenuW = w;
            this._contextOpenedAt = Date.now();
            var self = this;
            this.$nextTick(function () {
                try {
                    var menu = document.querySelector('.animMenu-anim-context--float');
                    var mh = menu && menu.offsetHeight ? menu.offsetHeight : 52 * SLOT_COUNT;
                    var mw = menu && menu.offsetWidth ? menu.offsetWidth : w;
                    var vw = window.innerWidth || 1280;
                    var vh = window.innerHeight || 720;
                    var nx = x;
                    var ny = y;
                    if (nx + mw > vw - 8) nx = Math.max(8, vw - mw - 8);
                    if (nx < 8) nx = 8;
                    if (ny + mh > vh - 8) {
                        ny = rowRect
                            ? Math.max(8, rowRect.top - mh - 4)
                            : Math.max(8, vh - mh - 8);
                    }
                    if (ny < 8) ny = 8;
                    self.contextMenuX = nx;
                    self.contextMenuY = ny;
                    self.contextMenuW = mw;
                } catch (_e2) {}
            });
        },
        closeContextMenu: function () {
            this.openedContextKey = '';
            this.contextAnim = null;
        },
        isFavorite: function (anim) {
            var k = this.animKey(anim);
            for (var i = 0; i < this.favoriteAnims.length; i++) {
                if (this.animKey(this.favoriteAnims[i]) === k) return true;
            }
            return false;
        },
        loadFavoritesLocal: function () {
            var self = this;
            try {
                var arr = loadJSON(FAV_KEY, []);
                this.favoriteAnims = Array.isArray(arr)
                    ? arr
                          .filter(function (a) {
                              return a && a.animDictionary && a.animationName;
                          })
                          .map(function (a) {
                              return self.enrichFavoriteAnim(a);
                          })
                          .filter(Boolean)
                    : [];
            } catch (_e) {
                this.favoriteAnims = [];
            }
        },
        saveFavorites: function () {
            try {
                var payload = this.favoriteAnims.map(function (a) {
                    return {
                        animDictionary: a.animDictionary,
                        animationName: a.animationName,
                        flag: a.flag !== undefined && a.flag !== null ? a.flag : 49
                    };
                });
                var json = JSON.stringify(payload);
                saveJSON(FAV_KEY, payload);
                this._animFavIgnoreHydrateUntil = Date.now() + 4000;
                mpTrigger('anim:fav:save:c', json);
                setTimeout(function () {
                    mpTrigger('anim:fav:save:c');
                }, 220);
                setTimeout(function () {
                    mpTrigger('anim:fav:save:c');
                }, 900);
            } catch (_e) {}
        },
        toggleFavorite: function (anim) {
            if (!anim || !anim.animDictionary || !anim.animationName) return;
            var k = this.animKey(anim);
            var idx = -1;
            for (var i = 0; i < this.favoriteAnims.length; i++) {
                if (this.animKey(this.favoriteAnims[i]) === k) {
                    idx = i;
                    break;
                }
            }
            this._animFavIgnoreHydrateUntil = Date.now() + 3000;
            if (idx >= 0) {
                this.favoriteAnims.splice(idx, 1);
            } else {
                this.favoriteAnims.push({
                    animName: anim.animName,
                    animDictionary: anim.animDictionary,
                    animationName: anim.animationName,
                    flag: this.animFlag(anim)
                });
            }
            this.saveFavorites();
        },
        normalizeSlots: function (raw) {
            var arr = Array.isArray(raw) ? raw : [];
            var slots = [];
            for (var i = 0; i < SLOT_COUNT; i++) {
                var e = arr[i];
                if (e && e.animDictionary && e.animationName) {
                    slots.push({
                        animName: e.animName || e.animationName,
                        animDictionary: e.animDictionary,
                        animationName: e.animationName,
                        flag: this.animFlag(e)
                    });
                } else {
                    slots.push(null);
                }
            }
            return slots;
        },
        saveAnimSlots: function () {
            var json = JSON.stringify(this.animBindSlots);
            this._animSlotsIgnoreHydrateUntil = Date.now() + 4000;
            try {
                localStorage.setItem(SLOTS_KEY, json);
            } catch (_e) {}
            mpTrigger('anim:slots:save:c', json);
            /* Запасной путь: клиент сам вытащит из localStorage, если аргумент mp.trigger потерялся */
            setTimeout(function () {
                mpTrigger('anim:slots:save:c');
            }, 220);
        },
        bindAnimToSlot: function (anim, index) {
            index = parseInt(index, 10);
            if (isNaN(index) || index < 0 || index >= SLOT_COUNT) return;
            if (!anim || !anim.animDictionary || !anim.animationName) return;
            var entry = {
                animName: anim.animName || anim.animationName,
                animDictionary: String(anim.animDictionary),
                animationName: String(anim.animationName),
                flag: this.animFlag(anim)
            };
            var newKey = this.animKey(entry);
            var slots = (this.animBindSlots || []).slice();
            while (slots.length < SLOT_COUNT) slots.push(null);
            for (var i = 0; i < SLOT_COUNT; i++) {
                if (i === index) {
                    slots[i] = entry;
                } else if (slots[i] && this.animKey(slots[i]) === newKey) {
                    slots[i] = null;
                }
            }
            if (this.$set) {
                for (var j = 0; j < SLOT_COUNT; j++) {
                    this.$set(this.animBindSlots, j, slots[j]);
                }
            } else {
                this.animBindSlots = slots;
            }
            this.closeContextMenu();
            this.saveAnimSlots();
            try {
                mpTrigger(
                    'notify:client',
                    3,
                    'top-mid',
                    'Анимация в слот ' + (index + 1) + ': ' + (entry.animName || entry.animationName),
                    2500
                );
            } catch (_n) {}
        },
        closeMenu: function () {
            this.closeContextMenu();
            this.searchForm = '';
            mpTrigger('close:anim');
        },
        clearPlayingSelection: function () {
            this.currentAnimKey = '';
        }
    },
    mounted: function () {
        var self = this;

        window.__applyAnimFav = function (json) {
            try {
                if (self._animFavIgnoreHydrateUntil && Date.now() < self._animFavIgnoreHydrateUntil) {
                    return;
                }
                var raw = typeof json === 'string' ? json : '[]';
                var arr = JSON.parse(raw || '[]');
                var clean = Array.isArray(arr)
                    ? arr
                          .filter(function (a) {
                              return a && a.animDictionary && a.animationName;
                          })
                          .map(function (a) {
                              return self.enrichFavoriteAnim(a);
                          })
                          .filter(Boolean)
                    : [];
                self.favoriteAnims = clean;
                saveJSON(
                    FAV_KEY,
                    clean.map(function (a) {
                        return {
                            animDictionary: a.animDictionary,
                            animationName: a.animationName,
                            flag: a.flag
                        };
                    })
                );
            } catch (_e) {}
        };

        window.__applyAnimSlots = function (json) {
            try {
                if (self._animSlotsIgnoreHydrateUntil && Date.now() < self._animSlotsIgnoreHydrateUntil) {
                    return;
                }
                var raw = typeof json === 'string' ? json : '[]';
                var arr = JSON.parse(raw || '[]');
                self.animBindSlots = self.normalizeSlots(arr);
                try {
                    localStorage.setItem(SLOTS_KEY, JSON.stringify(self.animBindSlots));
                } catch (_e) {}
            } catch (_e) {}
        };

        window.__clearAnimMenuSelection = function () {
            self.clearPlayingSelection();
        };

        window.__setAnimMenuPlaying = function (key) {
            try {
                self.currentAnimKey = key == null ? '' : String(key);
            } catch (_e) {}
        };

        this.loadFavoritesLocal();
        try {
            var slotsRaw = localStorage.getItem(SLOTS_KEY);
            if (slotsRaw) window.__applyAnimSlots(slotsRaw);
        } catch (_e) {}

        this.$nextTick(function () {
            if (self.$refs.iSearch) self.$refs.iSearch.focus();
        });

        window.addEventListener('keyup', function (e) {
            if (e.which === 27) {
                if (self.openedContextKey) {
                    self.closeContextMenu();
                } else {
                    self.closeMenu();
                }
            }
        });

        document.addEventListener('mousedown', function (e) {
            if (!self.openedContextKey) return;
            if (self._contextOpenedAt && Date.now() - self._contextOpenedAt < 280) return;
            if (e.target && e.target.closest && e.target.closest('.animMenu-anim-context')) return;
            self.closeContextMenu();
        }, true);

        document.addEventListener('click', function (e) {
            if (!self.openedContextKey) return;
            if (self._contextOpenedAt && Date.now() - self._contextOpenedAt < 280) return;
            if (e.target && e.target.closest && e.target.closest('.animMenu-anim-context')) return;
            self.closeContextMenu();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') e.preventDefault();
        });

        document.addEventListener('dragstart', function (e) {
            e.preventDefault();
        }, true);

        document.addEventListener('selectstart', function (e) {
            var tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
        }, true);

        document.addEventListener('contextmenu', function (e) {
            if (
                e.target &&
                e.target.closest &&
                (e.target.closest('.animMenu-anim-item') || e.target.closest('.animMenu-anim-context'))
            ) {
                return;
            }
            e.preventDefault();
        }, true);
    }
});

window.animApp = AnimMenu;
