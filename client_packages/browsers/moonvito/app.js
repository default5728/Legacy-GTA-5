(function () {
    const FAV_KEY = 'moonvito_fav_v1';
    const INV_IMG = 'package://browsers/inventory/img/';
    const MENUNEW = 'package://browsers/menunew/img/';
    const CLOTHES = 'package://browsers/inventory/clothes_assets/';
    const SHOP_CLOTH = 'package://browsers/shopclothesnew/img/';
    const FALLBACK_IMG = MENUNEW + 'cartridge.svg';
    const CALAM_FOLDER = {
        1: 'hats', 2: 'masks', 3: 'tops', 4: 'legs', 5: 'shoes', 6: 'accessories', 7: 'glasses', 8: 'bags'
    };
    const CLOTH_CAT_ICON = {
        1: 'icon_hat.png', 2: 'icon_mask.png', 3: 'icon_top.png', 4: 'icon_legs.png',
        5: 'icon_shoes.png', 6: 'icon_accessory.png', 7: 'icon_glasses.png', 8: 'icon_bag.png',
        9: 'icon_armor.png', 12: 'icon_earring.png', 13: 'icon_watch.png', 14: 'icon_bracelet.png',
        15: 'icon_gloves.png'
    };
    const ITEM_IMG_MAP = {
        item_spank: INV_IMG + 'item_spank.png',
        item_alco: 'package://browsers/hud/images/med.png',
        item_bong: INV_IMG + 'bong.png',
        item_admin_raskur: INV_IMG + 'gta5rp_cigarette_inventory.png',
        item_thermos: INV_IMG + 'item_thermos.png',
        item_drone: INV_IMG + 'drone.png',
        item_skateboard: INV_IMG + 'skateborde.png',
        item_change_name: INV_IMG + 'materials.png',
        item_materials: INV_IMG + 'materials.png',
        'Бронежилет': INV_IMG + 'armor.png',
        'Аптечка': INV_IMG + 'heal.png',
        weapon_heavysniper: INV_IMG + 'svc.png'
    };
    const F3_HOLSTER = {
        cobura: MENUNEW + 'clothes/cobura.png',
        coburaw: MENUNEW + 'clothes/coburaw.png'
    };
    const F3_BAG = {
        bag_antisocial: MENUNEW + 'bags/antisocial.png',
        bag_anime: MENUNEW + 'bags/anime.png',
        bag_grob: MENUNEW + 'bags/grob.png',
        bag_big_black: MENUNEW + 'bags/big_black.png',
        bag_big_white: MENUNEW + 'bags/big_white.png',
        bag_waist: MENUNEW + 'bags/waist.png'
    };
    const WEAPON_MOD_SUFFIXES = ['+supp', '+flash', '+scope', '+grip', '+exmag'];
    const CAT_BREADCRUMB = {
        all: 'Предметы',
        med: 'Медицина',
        weapon: 'Оружие и броня',
        food: 'Еда и напитки',
        other: 'Прочее',
        cloth: 'Одежда и аксессуары',
        bag: 'Сумки и рюкзаки'
    };

    function loadFav() {
        try {
            const raw = localStorage.getItem(FAV_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map(String) : [];
        } catch (_e) {
            return [];
        }
    }
    function saveFav(ids) {
        try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch (_e) {}
    }

    function itemBase(name) {
        return String(name || '').replace(/^\uFEFF/, '').trim().split('(')[0].trim().split('#')[0].trim();
    }

    function stripWeaponMods(stem) {
        let s = String(stem || '').trim();
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < WEAPON_MOD_SUFFIXES.length; i++) {
                const suf = WEAPON_MOD_SUFFIXES[i];
                if (s.length > suf.length && s.slice(-suf.length) === suf) {
                    s = s.slice(0, -suf.length);
                    changed = true;
                }
            }
        }
        return s;
    }

    function decodeIc1(full) {
        if (!full || typeof full !== 'string' || full.indexOf('ic1.') !== 0) return null;
        try {
            return JSON.parse(decodeURIComponent(escape(atob(full.slice(4)))));
        } catch (_e1) {
            try { return JSON.parse(atob(full.slice(4))); } catch (_e2) { return null; }
        }
    }

    function clothCatSrc(cid) {
        const n = Number(cid);
        const file = CLOTH_CAT_ICON[n] || CLOTH_CAT_ICON[3];
        return SHOP_CLOTH + file;
    }

    function itemImgCandidates(name) {
        const raw = String(name || '').replace(/^\uFEFF/, '').trim();
        const base = itemBase(raw);
        const out = [];
        const push = (u) => {
            if (u && out.indexOf(u) < 0) out.push(u);
        };

        if (raw.indexOf('ic1.') === 0 || base.indexOf('ic1.') === 0) {
            const po = decodeIc1(base.indexOf('ic1.') === 0 ? base : raw.split('(')[0].trim());
            if (po && Number(po.cid) === 9 && Number(po.d) === 305) {
                const color = Math.min(3, Math.max(1, (Number(po.t) || 0) + 1));
                push(INV_IMG + 'patrontazh_' + color + '.png');
            }
            if (po && Number(po.cid) === 6 && Number(po.d) === 210) {
                const t = Number(po.t) || 0;
                if (t === 1) push(MENUNEW + 'clothes/coburaw.png');
                else if (t === 2) push(MENUNEW + 'clothes/coburas.png');
                else push(MENUNEW + 'clothes/cobura.png');
                push(INV_IMG + 'ItemsMale/Accessories/210_' + t + '.png');
            }
            if (po && po.img) {
                const rel = String(po.img).replace(/^\/+/, '');
                push(INV_IMG + rel);
                if (/\.jpe?g$/i.test(rel)) push(INV_IMG + rel.replace(/\.jpe?g$/i, '.png'));
            }
            if (po && po.cid != null && po.d != null && po.t != null) {
                const cid = Number(po.cid);
                const d = Number(po.d);
                const t = Number(po.t);
                const fld = CALAM_FOLDER[cid];
                if (fld && Number.isFinite(d) && Number.isFinite(t)) {
                    push(CLOTHES + 'male/' + fld + '/' + d + '_' + t + '.png');
                    push(CLOTHES + 'female/' + fld + '/' + d + '_' + t + '.png');
                }
                push(clothCatSrc(cid));
            } else {
                push(clothCatSrc(3));
            }
            push(INV_IMG + 'body.svg');
            push(FALLBACK_IMG);
            return out;
        }

        if (base.indexOf('ivhol:') === 0) {
            const hk = base.slice(6);
            push(F3_HOLSTER[hk] || MENUNEW + 'clothes/cobura.png');
            push(FALLBACK_IMG);
            return out;
        }
        if (base.indexOf('ivbag:') === 0) {
            const bk = base.slice(6);
            push(F3_BAG[bk] || MENUNEW + 'bags/antisocial.png');
            push(INV_IMG + 'bascket.svg');
            push(FALLBACK_IMG);
            return out;
        }
        if (base.indexOf('frdef:') === 0) {
            const parts = base.split(':');
            if (parts[1] === 'top') push(clothCatSrc(3));
            else if (parts[1] === 'bottom') push(clothCatSrc(4));
            else if (parts[1] === 'shoes') push(clothCatSrc(5));
            else push(clothCatSrc(3));
            push(FALLBACK_IMG);
            return out;
        }

        const st = /^trade_stack:(item_spank|item_alco):/.exec(raw);
        if (st) {
            push(st[1] === 'item_spank' ? ITEM_IMG_MAP.item_spank : ITEM_IMG_MAP.item_alco);
            push(FALLBACK_IMG);
            return out;
        }

        const wbase = base.indexOf('weapon_') === 0 ? stripWeaponMods(base) : base;
        if (ITEM_IMG_MAP[wbase]) {
            push(ITEM_IMG_MAP[wbase]);
            push(FALLBACK_IMG);
            return out;
        }
        if (wbase.indexOf('weapon_') === 0) {
            push(INV_IMG + wbase + '.png');
            push(MENUNEW + wbase + '.png');
            push(MENUNEW + 'boxes/' + wbase + '.png');
            push(FALLBACK_IMG);
            return out;
        }

        push(INV_IMG + wbase + '.png');
        push(FALLBACK_IMG);
        return out;
    }

    function refineCategory(row) {
        const name = String(row.name || '').toLowerCase();
        let category = row.category || 'other';
        if (name.indexOf('ivbag:') === 0 || name.indexOf('ivhol:') === 0) category = 'bag';
        if (name.indexOf('item_spank') === 0 || name.indexOf('аптеч') >= 0 || name.indexOf('heal') >= 0 || name.indexOf('bandage') >= 0 || name.indexOf('medical') >= 0) {
            category = 'med';
        }
        if (name.indexOf('item_alco') === 0 || name.indexOf('item_bong') === 0) category = 'food';
        return Object.assign({}, row, { category });
    }

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatStubDate(offsetDays) {
        const d = new Date();
        d.setDate(d.getDate() + (offsetDays || 0));
        return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function buildChartSeries(basePrice, peers, rangeKey) {
        const base = Math.max(1, parseInt(basePrice, 10) || 1);
        const prices = (peers || [])
            .map((r) => parseInt(r.price, 10) || 0)
            .filter((p) => p > 0)
            .sort((a, b) => a - b);

        const count = rangeKey === '365' ? 12 : (rangeKey === '30' ? 8 : 7);
        const pts = [];

        if (prices.length >= 2) {
            for (let i = 0; i < count; i++) {
                const t = count === 1 ? 0 : i / (count - 1);
                const idx = Math.min(prices.length - 1, Math.round(t * (prices.length - 1)));
                pts.push(prices[idx]);
            }
        } else {
            const seed = base % 97;
            for (let i = 0; i < count; i++) {
                const wave = Math.sin((i + seed) * 0.85) * 0.04 + Math.cos((i + seed) * 0.35) * 0.02;
                pts.push(Math.max(1, Math.round(base * (1 + wave))));
            }
            pts[pts.length - 1] = base;
        }
        return pts;
    }

    const app = new Vue({
        el: '#app',
        data: {
            open: false,
            loading: false,
            view: 'market',
            category: 'all',
            search: '',
            sort: 'price_asc',
            listings: [],
            inventory: [],
            minPrice: 100000,
            maxPrice: 100000000,
            myStatic: 0,
            sellPrice: '',
            sellInvIndex: null,
            sellStep: 1,
            favIds: loadFav(),
            openCats: { items: false, transport: false },
            detailRow: null,
            detailBackView: 'market',
            chartRange: '7'
        },
        computed: {
            listViews() {
                return this.view === 'market' || this.view === 'mine' || this.view === 'fav' || this.view === 'history' || this.view === 'views';
            },
            breadcrumbTitle() {
                if (this.view === 'mine') return 'Мои объявления';
                if (this.view === 'fav') return 'Избранное';
                if (this.view === 'history') return 'История сделок';
                if (this.view === 'views') return 'История просмотров';
                const cat = CAT_BREADCRUMB[this.category] || 'Главная';
                if (this.category === 'all') return 'Главная';
                return 'Главная / ' + cat;
            },
            sortLabel() {
                if (this.sort === 'price_desc') return 'Цена ↓';
                if (this.sort === 'new') return 'Новые';
                return 'Цена ↑';
            },
            activeRows() {
                if (this.view === 'mine') return this.myListings;
                if (this.view === 'fav') return this.favListings;
                if (this.view === 'history' || this.view === 'views') return [];
                return this.filteredListings;
            },
            emptyText() {
                if (this.view === 'mine') return 'У вас нет объявлений';
                if (this.view === 'fav') return 'Избранное пусто';
                return 'Объявлений пока нет';
            },
            filteredListings() {
                const q = (this.search || '').toLowerCase().trim();
                let rows = (this.listings || []).slice();
                rows = rows.filter((row) => this.matchCategory(row) && this.matchSearch(row, q));
                rows.sort((a, b) => {
                    if (this.sort === 'price_desc') return (b.price || 0) - (a.price || 0);
                    if (this.sort === 'new') return (b.indexbd || 0) - (a.indexbd || 0);
                    return (a.price || 0) - (b.price || 0);
                });
                return rows;
            },
            myListings() {
                const q = (this.search || '').toLowerCase().trim();
                return (this.listings || []).filter((r) => !!r.mine && this.matchSearch(r, q));
            },
            favListings() {
                const set = {};
                (this.favIds || []).forEach((id) => { set[String(id)] = true; });
                const q = (this.search || '').toLowerCase().trim();
                return (this.listings || []).filter((r) => set[String(r.indexbd)] && this.matchSearch(r, q));
            },
            filteredInventory() {
                const q = (this.search || '').toLowerCase().trim();
                return (this.inventory || []).filter((row) => this.matchSearch(row, q));
            },
            selectedSellRow() {
                if (this.sellInvIndex == null) return null;
                return (this.inventory || []).find((x) => x.invIndex === this.sellInvIndex) || null;
            },
            sellPriceValid() {
                const p = parseInt(this.sellPrice, 10) || 0;
                return this.sellInvIndex != null && p >= this.minPrice && p <= this.maxPrice;
            },
            detailBreadcrumb() {
                if (!this.detailRow) return 'Главная';
                const cat = CAT_BREADCRUMB[this.detailRow.category] || 'Предметы';
                return 'Главная / ' + cat + ' / ' + (this.detailRow.label || '');
            },
            detailDateText() {
                return formatStubDate(0) + ' (до ' + formatStubDate(7) + ')';
            },
            detailViews() {
                if (!this.detailRow) return 0;
                return 3 + ((parseInt(this.detailRow.indexbd, 10) || 0) % 40);
            },
            chartValues() {
                if (!this.detailRow) return [1];
                const name = this.detailRow.name;
                const peers = (this.listings || []).filter((r) => r.name === name);
                return buildChartSeries(this.detailRow.price, peers, this.chartRange);
            },
            chartYLabels() {
                const vals = this.chartValues;
                let min = Math.min.apply(null, vals);
                let max = Math.max.apply(null, vals);
                if (min === max) {
                    min = Math.max(1, Math.floor(min * 0.95));
                    max = Math.ceil(max * 1.05);
                }
                const mid = Math.round((min + max) / 2);
                return [this.fmt(max), this.fmt(mid), this.fmt(min)];
            },
            chartGridYs() {
                return [20, 130, 240];
            },
            chartPoints() {
                const vals = this.chartValues;
                let min = Math.min.apply(null, vals);
                let max = Math.max.apply(null, vals);
                if (min === max) {
                    min = Math.max(1, min * 0.95);
                    max = max * 1.05;
                }
                const padX = 24;
                const padY = 20;
                const w = 560 - padX * 2;
                const h = 260 - padY * 2;
                const n = vals.length;
                return vals.map((v, i) => {
                    const x = padX + (n === 1 ? w / 2 : (i / (n - 1)) * w);
                    const t = (v - min) / (max - min || 1);
                    const y = padY + (1 - t) * h;
                    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, v: v };
                });
            },
            chartLinePath() {
                const pts = this.chartPoints;
                if (!pts.length) return '';
                return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
            },
            chartAreaPath() {
                const pts = this.chartPoints;
                if (!pts.length) return '';
                const first = pts[0];
                const last = pts[pts.length - 1];
                let d = 'M' + first.x + ' 240 ';
                d += pts.map((p) => 'L' + p.x + ' ' + p.y).join(' ');
                d += ' L' + last.x + ' 240 Z';
                return d;
            }
        },
        methods: {
            fmt(n) {
                const v = parseInt(n, 10) || 0;
                return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            },
            catLabel(cat) {
                if (cat === 'weapon') return 'Оружие';
                if (cat === 'cloth') return 'Одежда';
                if (cat === 'bag') return 'Сумка';
                if (cat === 'med') return 'Медицина';
                if (cat === 'food') return 'Еда';
                return 'Другое';
            },
            itemImg(name) {
                const cands = itemImgCandidates(name);
                return cands[0] || FALLBACK_IMG;
            },
            onItemImgError(e, row) {
                const el = e && e.target;
                if (!el) return;
                const cands = itemImgCandidates(row && row.name);
                const i = (parseInt(el.getAttribute('data-fb'), 10) || 0) + 1;
                if (i < cands.length) {
                    el.setAttribute('data-fb', String(i));
                    el.src = cands[i];
                    return;
                }
                el.onerror = null;
                el.src = FALLBACK_IMG;
            },
            matchCategory(row) {
                const cat = this.category || 'all';
                if (cat === 'all') return row.category !== 'cloth' && row.category !== 'bag';
                return row.category === cat;
            },
            matchSearch(row, q) {
                if (!q) return true;
                const hay = ((row.label || '') + ' ' + (row.name || '')).toLowerCase();
                return hay.indexOf(q) >= 0;
            },
            toggleCat(key) {
                this.$set(this.openCats, key, !this.openCats[key]);
            },
            setView(v) {
                this.view = v;
                this.search = '';
                this.detailRow = null;
                if (v === 'sell') {
                    this.sellInvIndex = null;
                    this.sellStep = 1;
                    this.sellPrice = '';
                }
                if (v === 'market') this.category = this.category || 'all';
            },
            setCategory(c) {
                this.category = c;
                this.view = 'market';
                this.detailRow = null;
            },
            goSell() {
                this.setView('sell');
            },
            cycleSort() {
                if (this.sort === 'price_asc') this.sort = 'price_desc';
                else if (this.sort === 'price_desc') this.sort = 'new';
                else this.sort = 'price_asc';
            },
            isFav(row) {
                return (this.favIds || []).indexOf(String(row.indexbd)) >= 0;
            },
            toggleFav(row) {
                if (!row) return;
                const id = String(row.indexbd);
                const next = (this.favIds || []).slice();
                const i = next.indexOf(id);
                if (i >= 0) next.splice(i, 1);
                else next.push(id);
                this.favIds = next;
                saveFav(next);
            },
            selectSell(row) {
                this.sellInvIndex = row.invIndex;
                if (!this.sellPrice) this.sellPrice = String(this.minPrice);
            },
            onPriceInput(e) {
                const clean = String(e.target.value || '').replace(/\D/g, '');
                this.sellPrice = clean;
                e.target.value = clean;
            },
            openDetail(row) {
                if (!row) return;
                this.detailBackView = this.view;
                this.detailRow = row;
                this.chartRange = '7';
                this.view = 'detail';
            },
            backFromDetail() {
                const back = this.detailBackView || 'market';
                this.detailRow = null;
                this.view = back === 'detail' ? 'market' : back;
            },
            filterSimilar() {
                if (!this.detailRow) return;
                const label = this.detailRow.label || '';
                this.search = label;
                this.view = 'market';
                this.detailRow = null;
            },
            doBuy(row) {
                if (!row || row.mine) return;
                try { mp.trigger('moonvito:buy', row.indexbd, row.name); } catch (_e) {}
            },
            doCancel(row) {
                if (!row) return;
                try { mp.trigger('moonvito:cancel', row.indexbd, row.name); } catch (_e) {}
                if (this.view === 'detail') this.backFromDetail();
            },
            doSell() {
                if (!this.sellPriceValid) return;
                const row = this.selectedSellRow;
                if (!row) return;
                try {
                    mp.trigger(
                        'moonvito:sell',
                        String(row.invIndex),
                        String(this.sellPrice || ''),
                        String(row.name || '')
                    );
                } catch (_e) {}
            },
            close() {
                try { mp.trigger('moonvito:close'); } catch (_e) {}
            },
            show() {
                this.open = true;
                this.loading = true;
                this.view = 'market';
                this.category = 'all';
                this.detailRow = null;
                this.sellStep = 1;
                try { mp.trigger('moonvito:request'); } catch (_e) {}
            },
            hide() {
                this.open = false;
                this.loading = false;
            },
            applyState(payload) {
                let data = payload;
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch (_e) { return; }
                }
                if (!data || typeof data !== 'object') return;
                this.listings = (Array.isArray(data.listings) ? data.listings : []).map(refineCategory);
                this.inventory = (Array.isArray(data.inventory) ? data.inventory : []).map(refineCategory);
                this.minPrice = parseInt(data.minPrice, 10) || 100000;
                this.maxPrice = parseInt(data.maxPrice, 10) || 100000000;
                this.myStatic = parseInt(data.myStatic, 10) || 0;
                this.loading = false;
                if (this.sellInvIndex != null) {
                    const still = this.inventory.some((x) => x.invIndex === this.sellInvIndex);
                    if (!still) {
                        this.sellInvIndex = null;
                        this.sellPrice = '';
                        this.sellStep = 1;
                    }
                }
                if (this.detailRow) {
                    const id = this.detailRow.indexbd;
                    const next = this.listings.find((r) => r.indexbd === id);
                    if (next) this.detailRow = next;
                    else {
                        this.detailRow = null;
                        if (this.view === 'detail') this.view = 'market';
                    }
                }
            }
        }
    });

    window.moonvitoApp = app;
    window.show = function () { app.show(); };
    window.hide = function () { app.hide(); };
    window.setMoonvitoState = function (payload) { app.applyState(payload); };

    document.addEventListener('keydown', function (e) {
        if (!app.open) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            if (app.view === 'detail') app.backFromDetail();
            else app.close();
        }
    });
})();
