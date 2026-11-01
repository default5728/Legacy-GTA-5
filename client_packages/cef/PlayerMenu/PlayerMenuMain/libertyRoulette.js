/* F10 → Магазин → РУЛЕТКА — локальный порт dump cases (scoped CSS). */
(function () {
    'use strict';

    /* Реальная оплата DP — без бесплатной демо-крутки */
    var A = 'assets/cases/';

    var CASES = {
        /* 1-й ряд */
        default: {
            id: 1, main: true, price: 0, discount: 0, free: true,
            title: 'Стандартный кейс', description: 'Бесплатный кейс с HUD. Выдаётся по таймеру.',
            bloodCase: 'FreeCase', img: 'default'
        },
        silver: {
            id: 2, main: true, price: 149, discount: 0,
            title: 'Silver Case', description: 'Серебряный кейс: деньги, VIP и транспорт.',
            bloodCase: 'SilverCase', img: 'silver'
        },
        gold: {
            id: 3, main: true, price: 249, discount: 0,
            title: 'Gold Case', description: 'Золотой кейс: VIP Platinum и редкий транспорт.',
            bloodCase: 'GoldCase', img: 'gold'
        },
        armor: {
            id: 4, main: true, price: 199, discount: 0,
            title: 'Armor Case', description: 'Кейс со скинами бронежилета.',
            bloodCase: 'ArmorCase', img: 'armor'
        },
        /* ниже — остальные */
        vehicles: {
            id: 5, main: false, price: 600, discount: 0,
            title: 'Транспортный кейс', description: 'Кейс с акцентом на автомобили.',
            bloodCase: 'VehiclesCase', img: 'vehicles'
        },
        spring2026: {
            id: 6, main: false, price: 450, discount: 20,
            title: 'Весенний кейс 2026', description: 'В разработке.',
            bloodCase: 'Spring2026Case', img: 'spring2026'
        },
        spring2025: {
            id: 7, main: false, price: 450, discount: 0,
            title: 'Весенний кейс 2025', description: 'В разработке.',
            bloodCase: 'Spring2025Case', img: 'spring2025'
        },
        seasonsCollection: {
            id: 8, main: false, price: 4000, discount: 0,
            title: 'Админ кейс', description: 'Админский кейс: уровень админки 1–5.',
            bloodCase: 'AdminCase', img: 'seasonsCollection'
        }
    };

    var RARITY_CHANCE = {
        gray: 55,
        blue: 25,
        purple: 12,
        gold: 5.5,
        red: 2,
        unique: 0.5
    };

    /** Как на сервере: отсутствующие тиры не оставляют «дыру» в 100%. */
    function applyRarityChances(items) {
        var byColor = {};
        var i, c, col, n, copy, k, present, sumBase, baseOf, colorTotal, eq, chance;
        for (i = 0; i < items.length; i++) {
            c = (items[i] && items[i].color) || 'gray';
            if (!byColor[c]) byColor[c] = [];
            byColor[c].push(items[i]);
        }
        present = Object.keys(byColor);
        sumBase = 0;
        baseOf = {};
        for (i = 0; i < present.length; i++) {
            col = present[i];
            baseOf[col] = RARITY_CHANCE[col] != null ? Number(RARITY_CHANCE[col]) : 0;
            sumBase += baseOf[col];
        }
        colorTotal = {};
        if (sumBase <= 0) {
            eq = 100 / Math.max(1, present.length);
            for (i = 0; i < present.length; i++) colorTotal[present[i]] = eq;
        } else {
            for (i = 0; i < present.length; i++) {
                col = present[i];
                colorTotal[col] = (baseOf[col] / sumBase) * 100;
            }
        }
        return items.map(function (it) {
            col = (it && it.color) || 'gray';
            n = byColor[col].length;
            chance = (colorTotal[col] || 0) / Math.max(1, n);
            copy = {};
            for (k in it) if (Object.prototype.hasOwnProperty.call(it, k)) copy[k] = it[k];
            copy.chance = chance;
            return copy;
        });
    }

    var CONTENT = {
        default: applyRarityChances([
            { type: 'weapon', color: 'gray', value: 'weapon_specialcarbine', label: 'Special Carbine x2' },
            { type: 'money', color: 'gray', value: 250000, label: '250.000$' },
            { type: 'armor', color: 'gray', value: 'armor30', label: 'Бронежилет x30' },
            { type: 'money', color: 'blue', value: 350000, label: '350.000$' },
            { type: 'vip', color: 'blue', value: 'vip1', label: 'STANDARD VIP 31 DAY', sellDp: 100, textOnly: true },
            { type: 'vehicle', color: 'purple', value: 'ktm125', label: 'Principe 125 2006', sellDp: 150 },
            { type: 'vehicle', color: 'purple', value: 'ktm690', label: 'Principe 690 2017', sellDp: 300 },
            { type: 'vehicle', color: 'gold', value: 'panigale', label: 'Principe Ranigale V4 R', sellDp: 500 },
            { type: 'vehicle', color: 'gold', value: 'audiq8', label: 'Obey 08 2022', sellDp: 600 }
        ]),
        silver: applyRarityChances([
            { type: 'weapon', color: 'gray', value: 'weapon_specialcarbine', label: 'Special Carbine x2' },
            { type: 'money', color: 'gray', value: 250000, label: '250.000$' },
            { type: 'armor', color: 'gray', value: 'armor30', label: 'Бронежилет x30' },
            { type: 'money', color: 'blue', value: 350000, label: '350.000$' },
            { type: 'vip', color: 'blue', value: 'vip2', label: 'GOLD VIP 31 DAY', sellDp: 200, textOnly: true },
            { type: 'vehicle', color: 'purple', value: 'ktm125', label: 'Principe 125 2006', sellDp: 150 },
            { type: 'vehicle', color: 'purple', value: 'ktm690', label: 'Principe 690 2017', sellDp: 300 },
            { type: 'vehicle', color: 'gold', value: 'panigale', label: 'Principe Ranigale V4 R', sellDp: 500 },
            { type: 'vehicle', color: 'gold', value: 'audiq8', label: 'Obey 08 2022', sellDp: 600 }
        ]),
        gold: applyRarityChances([
            { type: 'money', color: 'gray', value: 350000, label: '350.000$' },
            { type: 'vip', color: 'blue', value: 'vip3', label: 'PLATINUM VIP 31 DAY', sellDp: 400, textOnly: true },
            { type: 'vehicle', color: 'blue', value: 'ktm125', label: 'Principe 125 2006', sellDp: 150 },
            { type: 'vehicle', color: 'blue', value: 'ktm690', label: 'Principe 690 2017', sellDp: 300 },
            { type: 'vehicle', color: 'blue', value: 'panigale', label: 'Principe Ranigale V4 R', sellDp: 500 },
            { type: 'vehicle', color: 'purple', value: 'audiq8', label: 'Obey 08 2022', sellDp: 600 },
            { type: 'vehicle', color: 'purple', value: 'bmwm5f90lci', label: 'BMW M5 F90 LCI', sellDp: 700 },
            { type: 'vehicle', color: 'red', value: 'bmwxm', label: 'BMW XM', sellDp: 1000 },
            { type: 'vehicle', color: 'unique', value: 'alphard', label: 'Karin Alfa', sellDp: 2000 },
            { type: 'vehicle', color: 'unique', value: 'battista', label: 'Pegassi Bellista 2022', sellDp: 2000 }
        ]),
        armor: [],
        vehicles: applyRarityChances([
            { type: 'vehicle', color: 'gray', value: 'ktm125', label: 'Principe 125 2006', sellDp: 150 },
            { type: 'vehicle', color: 'gray', value: 'ktm690', label: 'Principe 690 2017', sellDp: 300 },
            { type: 'vehicle', color: 'gray', value: 'panigale', label: 'Principe Ranigale V4 R', sellDp: 500 },
            { type: 'vehicle', color: 'blue', value: 'audiq8', label: 'Obey 08 2022', sellDp: 600 },
            { type: 'vehicle', color: 'blue', value: 'bmwm5f90lci', label: 'BMW M5 F90 LCI', sellDp: 700 },
            { type: 'vehicle', color: 'blue', value: 'kabluk', label: 'Highhell', sellDp: 400 },
            { type: 'vehicle', color: 'purple', value: 'bmwxm', label: 'BMW XM', sellDp: 1000 },
            { type: 'vehicle', color: 'red', value: 'alphard', label: 'Karin Alfa', sellDp: 2000 },
            { type: 'vehicle', color: 'red', value: 'battista', label: 'Pegassi Bellista 2022', sellDp: 2000 },
            { type: 'vehicle', color: 'unique', value: 'temerario', label: 'Pegassi Temario 2025', sellDp: 2500 },
            { type: 'vehicle', color: 'unique', value: 'tourbillon', label: 'Truffade Billllion 2026', sellDp: 4000 },
            { type: 'vehicle', color: 'unique', value: 'urus24', label: 'Pegassi Urus 2024', sellDp: 1500 },
            { type: 'skateboard', color: 'unique', value: 'skateboard', label: 'Скейтборд', sellDp: 2500 }
        ]),
        seasonsCollection: applyRarityChances([
            { type: 'admin', color: 'gray', value: 1, label: '1 LVL', textOnly: true },
            { type: 'admin', color: 'blue', value: 2, label: '2 LVL', textOnly: true },
            { type: 'admin', color: 'purple', value: 3, label: '3 LVL', textOnly: true },
            { type: 'admin', color: 'gold', value: 4, label: '4 LVL', textOnly: true },
            { type: 'admin', color: 'gold', value: 5, label: '5 LVL', textOnly: true }
        ])
    };
    CONTENT.spring2026 = CONTENT.silver;
    CONTENT.spring2025 = CONTENT.silver;

    var IMG = {
        tick: A + 'tick.svg',
        money: 'package://browsers/menunew/img/productMoney1.svg',
        money250k: 'package://browsers/menunew/img/productMoney250k.png',
        money350k: 'package://browsers/menunew/img/productMoney350k.png',
        dp: 'package://browsers/menunew/img/productMoney2.svg',
        car: 'package://browsers/menunew/img/car/car.svg',
        inv: 'package://browsers/inventory/img/',
        auto: 'package://auto/',
        preview: 'package://browsers/vehicle_previews/',
        armorFb: 'package://browsers/inventory/img/armor.svg'
    };

    function armorColorForName(name) {
        var n = String(name || '').toLowerCase();
        if (/черн|бел|white|black/.test(n)) return 'unique';
        if (/оригинал/.test(n)) return 'gold';
        if (/красн|\bred\b/.test(n)) return 'red';
        if (/фиолет|розов|purple|pink/.test(n)) return 'purple';
        if (/син|голуб|blue|cyan/.test(n)) return 'blue';
        return 'gray';
    }

    function armorImgUrl(rel) {
        if (typeof window.armorCosmeticImgUrl === 'function') return window.armorCosmeticImgUrl(rel);
        var s = String(rel || '').trim();
        if (!s) return IMG.armorFb;
        if (s.indexOf('package://') === 0) return s;
        if (s.indexOf('img/') === 0) return 'package://browsers/menunew/' + s;
        return IMG.armorFb;
    }

    function findArmorVariantByLabel(label) {
        if (typeof ARMOR_SHOP_VARIANTS === 'undefined' || !ARMOR_SHOP_VARIANTS.length) return null;
        var n = String(label || '').trim();
        if (!n) return null;
        for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
            if (ARMOR_SHOP_VARIANTS[i].name === n) return ARMOR_SHOP_VARIANTS[i];
        }
        return null;
    }

    function buildArmorLootItems() {
        if (typeof ARMOR_SHOP_VARIANTS === 'undefined' || !ARMOR_SHOP_VARIANTS.length) {
            return applyRarityChances([
                { type: 'armor', color: 'unique', value: 'black', label: 'Чёрный / Белый скин' },
                { type: 'armor', color: 'blue', value: 'other', label: 'Остальные скины брони' }
            ]);
        }
        var raw = [];
        for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
            var v = ARMOR_SHOP_VARIANTS[i];
            raw.push({
                type: 'armor',
                color: armorColorForName(v.name),
                value: v.d + ':' + v.t,
                label: v.name,
                armorImg: armorImgUrl(v.img),
                armorImgFb: window.ARMOR_COSMETIC_IMG_FB || IMG.armorFb
            });
        }
        return applyRarityChances(raw);
    }

    function invImg(file) {
        return IMG.inv + String(file || '').replace(/^\/+/, '');
    }

    function isTextOnlyPrize(item) {
        if (!item) return false;
        if (item.textOnly) return true;
        var t = String(item.type || '');
        if (t === 'vip' || t === 'admin') return true;
        var lab = String(item.label || '');
        if (/Vip\s*31\s*Day/i.test(lab)) return true;
        if (/^\d+\s*LVL$/i.test(lab) || /\bLVL\b/i.test(lab) && /админ|admin/i.test(lab)) return true;
        if (/^\d+\s*LVL$/i.test(lab)) return true;
        return false;
    }

    function prizeSrc(item) {
        if (!item || isTextOnlyPrize(item)) return '';
        var t = String(item.type || '');
        var val = String(item.value || item.vehicleModel || '');
        if (t === 'vehicle' || item.vehicleModel) {
            var model = String(item.vehicleModel || val || '').toLowerCase();
            if (model) return IMG.auto + model + '.png';
            return IMG.car;
        }
        if (t === 'money') {
            var moneyAmt = Number(item.value || item.amount || 0);
            if (moneyAmt === 350000) return IMG.money350k;
            if (moneyAmt === 250000) return IMG.money250k;
            return IMG.money;
        }
        if (t === 'coins' || t === 'dp') return IMG.dp;
        if (t === 'weapon') {
            var w = val.indexOf('weapon_') === 0 ? val : (item.weaponId || 'weapon_specialcarbine');
            return invImg(w + '.png');
        }
        if (t === 'armor' || t === 'armor_stack') {
            if (item.armorImg) return item.armorImg;
            return invImg('armor.png');
        }
        if (t === 'skateboard' || /скейт/i.test(String(item.label || ''))) return invImg('skateborde.png');
        if (t === 'item') {
            if (/weapon_/i.test(val)) return invImg(val + '.png');
            if (/брон|armor/i.test(String(item.label || '') + val)) return invImg('armor.png');
            if (/скейт|skate/i.test(String(item.label || '') + val)) return invImg('skateborde.png');
        }
        return IMG.car;
    }

    function prizeImgOnErrorAttr() {
        return (
            ' onerror="(function(el){var s=el.dataset.fb||\'0\';' +
            'var m=el.dataset.model||\'\';' +
            'if(s===\'0\'&&m){el.dataset.fb=\'1\';el.src=\'' + IMG.preview + '\'+m+\'.png\';return;}' +
            'if(s===\'1\'&&m){el.dataset.fb=\'2\';el.src=\'package://browsers/phone/img/cars/\'+m+\'.png\';return;}' +
            'el.style.display=\'none\';})(this)"'
        );
    }

    function prizeMediaHtml(item, imgClass) {
        if (isTextOnlyPrize(item)) {
            return '<div class="text-prize ' + rarityOf(item) + '">' + escapeHtml(item.label || '') + '</div>';
        }
        var src = prizeSrc(item);
        var model = String(item.vehicleModel || (item.type === 'vehicle' ? item.value : '') || '').toLowerCase();
        var armorFb = item.armorImgFb || IMG.armorFb;
        var armorErr = item.armorImg
            ? ' onerror="this.onerror=null;this.src=\'' + armorFb.replace(/'/g, "\\'") + '\'"'
            : '';
        return (
            '<img class="' + (imgClass || '') + '" src="' + src + '"' +
                (model ? ' data-model="' + model + '"' : '') +
                ' data-fb="0"' +
                armorErr +
                prizeImgOnErrorAttr() + '>'
        );
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function rarityOf(item) { return (item && item.color) || 'gray'; }
    /* dump Color: полоска + радиальная подсветка редкости */
    function rarityMark(color) {
        var c = color || 'gray';
        return '<div class="color-container ' + c + '">' +
            '<div class="color-shadow"></div>' +
            '<div class="color-block"></div>' +
            '</div>';
    }
    function typeLabel(t) {
        if (t === 'vehicle') return 'Транспорт';
        if (t === 'coins' || t === 'dp') return 'Монеты';
        if (t === 'money') return 'Деньги';
        if (t === 'armor' || t === 'armor_stack') return 'Броня';
        if (t === 'weapon') return 'Оружие';
        if (t === 'vip') return 'VIP';
        if (t === 'admin') return 'Админ';
        if (t === 'skateboard') return 'Скейтборд';
        if (t === 'item') return 'Приз';
        return t || '';
    }

    function cefTrigger() {
        try {
            if (typeof mp !== 'undefined' && mp.trigger) {
                mp.trigger.apply(mp, arguments);
                return true;
            }
        } catch (e) {}
        return false;
    }

    var STOCK = {
        FreeCase: 0,
        SilverCase: 0,
        GoldCase: 0,
        ArmorCase: 0,
        VehiclesCase: 0,
        Spring2026Case: 0,
        Spring2025Case: 0,
        AdminCase: 0
    };

    function stockOf(c) {
        if (!c || !c.bloodCase) return 0;
        return Math.max(0, parseInt(STOCK[c.bloodCase], 10) || 0);
    }

    function isFreeCase(c) {
        return !!(c && (c.free || c.bloodCase === 'FreeCase'));
    }

    function applyStock(map) {
        if (!map) return;
        Object.keys(STOCK).forEach(function (key) {
            if (map[key] != null) STOCK[key] = Math.max(0, parseInt(map[key], 10) || 0);
        });
        if (state.waiting) {
            var ownedEl = $('lrOwned');
            if (ownedEl && state.openCase) ownedEl.textContent = String(stockOf(state.openCase));
            return;
        }
        if (state.open && state.page === 'main') renderMain();
        else if (state.open && state.page === 'details' && state.type) renderDetails(state.type);
    }

    function png(t) {
        var c = CASES[t];
        return A + ((c && c.img) || t) + '.png';
    }
    function loot(t) {
        if (t === 'armor') return buildArmorLootItems();
        if (CONTENT[t]) return CONTENT[t];
        var c = CASES[t];
        if (c && c.bloodCase === 'FreeCase') return CONTENT.default;
        if (c && c.bloodCase === 'GoldCase') return CONTENT.gold;
        if (c && c.bloodCase === 'ArmorCase') return CONTENT.armor;
        if (c && c.bloodCase === 'VehiclesCase') return CONTENT.vehicles;
        if (c && c.bloodCase === 'AdminCase') return CONTENT.seasonsCollection;
        return CONTENT.silver;
    }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    function priceOf(c) {
        if (c.priceOld != null) {
            return { old: c.priceOld, current: c.price };
        }
        var d = c.discount || 0;
        if (!d) return { current: c.price };
        return { old: c.price, current: Math.round(c.price - c.price / 100 * d) };
    }
    function keys() {
        var k = Object.keys(CASES);
        return k.filter(function (x) { return CASES[x].main; }).sort(function (a, b) { return CASES[a].id - CASES[b].id; })
            .concat(k.filter(function (x) { return !CASES[x].main; }).sort(function (a, b) { return CASES[a].id - CASES[b].id; }));
    }
    function priceHtml(c, p) {
        var showOld = p.old != null;
        return (showOld ? '<span class="old-price">' + fmt(p.old) + '</span>' : '') +
            '<span class="current-price">' + fmt(p.current) + '</span>' +
            '<span class="dp-label">DP</span>';
    }

    var state = {
        open: false, page: 'main', type: null,
        buyAmount: 1, openAmount: 1, fast: false, waiting: false,
        pendingOpens: 0, openType: null, openCase: null, openWatch: null
    };

    var overlayEl, mainEl, titleEl, balEl, bandEl;

    function $(id) { return document.getElementById(id); }

    function findVue() {
        try {
            if (window.palyerMainMenuMenu && window.palyerMainMenuMenu.vue) return window.palyerMainMenuMenu.vue;
        } catch (e) {}
        return null;
    }
    function getDpNum() {
        try {
            var v = findVue();
            if (v && v.playerData) return Math.max(0, parseInt(v.playerData.donatePoint, 10) || 0);
        } catch (e) {}
        return -1;
    }
    function getDp() {
        try {
            var v = findVue();
            if (v && typeof v.bloodGetDonatePointDisplay === 'function') return v.bloodGetDonatePointDisplay();
            if (v && v.playerData) return fmt(parseInt(v.playerData.donatePoint, 10) || 0);
        } catch (e) {}
        return '—';
    }
    function refreshBal() { if (balEl) balEl.textContent = getDp(); }
    function setTitle(t) { if (titleEl) titleEl.textContent = t || 'Кейсы'; }

    function build() {
        if (overlayEl) return;
        overlayEl = document.createElement('div');
        overlayEl.id = 'lr-overlay';
        overlayEl.innerHTML =
            '<div class="cases-page">' +
                '<div class="background"></div>' +
                '<div class="lr-chrome">' +
                    '<button type="button" class="esc-button" id="lrExit">ESC</button>' +
                    '<div class="title" id="lrTitle">Кейсы</div>' +
                    '<div class="coins"><span class="dp-label">DP</span><span id="lrBal">—</span></div>' +
                '</div>' +
                '<div class="cases-page__main" id="lrMain"></div>' +
                '<div class="prize-overlay" id="lrPrize"></div>' +
            '</div>';
        /* toast lives inside overlay so styles apply */
        var toastHost = document.createElement('div');
        toastHost.id = 'lrToastHost';
        overlayEl.appendChild(toastHost);
        document.body.appendChild(overlayEl);
        mainEl = $('lrMain');
        titleEl = $('lrTitle');
        balEl = $('lrBal');
        $('lrExit').addEventListener('click', onEsc);
        document.addEventListener('keyup', function (e) {
            if (!state.open || e.which !== 27) return;
            onEsc();
        });
    }

    function onEsc() {
        if (state.waiting) return;
        var prize = $('lrPrize');
        if (prize && prize.classList.contains('show')) {
            prize.classList.remove('show');
            renderDetails(state.type);
            return;
        }
        if (state.page === 'details') renderMain();
        else LRoulette.close();
    }

    function renderMain() {
        state.page = 'main';
        state.type = null;
        setTitle('Кейсы');
        var prize = $('lrPrize');
        if (prize) prize.classList.remove('show');

        var html = '<div class="cases-list"><div class="cases-grid">';
        keys().forEach(function (type) {
            var c = CASES[type];
            var p = priceOf(c);
            var owned = stockOf(c);
            var priceBlock = isFreeCase(c)
                ? '<div class="price-row"><span class="current-price">Бесплатно</span></div>'
                : '<div class="price-row">' + priceHtml(c, p) + '</div>';
            html +=
                '<div class="case-card" data-type="' + type + '">' +
                    '<div class="owned-badge"><div class="tick"><img src="' + IMG.tick + '" alt=""></div>' +
                        '<span class="txt">' + (canPayCase(c) ? ('Открыть за <b>' + fmt(p.current) + '</b> DP') : (isFreeCase(c) ? 'Недоступен' : 'Скоро')) + '</span></div>' +
                    (c.discount ? '<div class="discount-badge">-' + c.discount + '%</div>' : '') +
                    '<img class="case__picture" src="' + png(type) + '" alt=""' +
                        ' onerror="this.onerror=null;this.src=\'' + A + 'silver.png\'">' +
                    '<div class="case__title">' + c.title + '</div>' +
                    priceBlock +
                '</div>';
        });
        html += '</div></div>';
        mainEl.innerHTML = html;
        var cards = mainEl.querySelectorAll('.case-card[data-type]');
        for (var i = 0; i < cards.length; i++) {
            (function (el) {
                el.addEventListener('click', function () { renderDetails(el.getAttribute('data-type')); });
            })(cards[i]);
        }
        refreshBal();
    }

    function renderDetails(type) {
        var c = CASES[type];
        if (!c) return;
        state.page = 'details';
        state.type = type;
        state.buyAmount = Math.max(1, Math.min(20, state.buyAmount || 1));
        setTitle(c.title);

        var p = priceOf(c);
        var now = p.current * state.buyAmount;
        var old = (p.old != null ? p.old : c.price) * state.buyAmount;
        var pct = ((state.buyAmount - 1) / 19) * 100;
        var owned = stockOf(c);
        var showOld = p.old != null;

        var amts = '';
        for (var a = 1; a <= 5; a++) {
            amts += '<div class="amt' + (a === state.openAmount ? ' selected' : '') + '" data-amt="' + a + '">' + a + '</div>';
        }

        var buyBlock = canPayCase(c)
            ? (
                '<div class="cases-control">' +
                    '<div class="cases-control__title">Открытие за DP</div>' +
                    '<div class="buy-amount-label">Кейс списывается сразу при нажатии «Открыть». Покупка впрок не нужна.</div>' +
                    '<div class="input-field">' +
                        '<div class="coins">' +
                            '<span class="coins__value" id="lrNow">' + fmt(p.current) + '</span>' +
                            '<span class="dp-label">DP</span>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            )
            : (
                '<div class="cases-control">' +
                    '<div class="cases-control__title">' + (isFreeCase(c) ? 'Бесплатный кейс' : 'Недоступно') + '</div>' +
                    '<div class="buy-amount-label">' + (isFreeCase(c) ? 'На FLOWDM этот кейс не открывается. Используйте Silver, Gold или Armor.' : 'Этот кейс пока недоступен.') + '</div>' +
                '</div>'
            );

        var lootItems = loot(type);
        var lootHtml = '<div class="case-elements">';
        for (var li = 0; li < lootItems.length; li++) {
            var it = lootItems[li];
            var col = rarityOf(it);
            var ch = '';
            var sellNote = it.sellDp > 0 ? (' · продажа ' + it.sellDp + ' DP') : '';
            lootHtml +=
                '<div class="loot-card ' + col + '">' +
                    rarityMark(col) +
                    prizeMediaHtml(it, 'loot-pic') +
                    '<div class="meta">' +
                        '<div class="meta__title">' + escapeHtml(it.label || '') + sellNote + '</div>' +
                    '</div>' +
                '</div>';
        }
        lootHtml += '</div>';

        mainEl.innerHTML =
            '<div class="roulette-view">' +
                '<div class="band-cover">' +
                    '<div class="case-data" id="lrCaseData">' +
                        '<div class="description">' +
                            '<span class="description__title">' + c.title + '</span>' +
                            '<span class="description__text">' + c.description + '</span>' +
                        '</div>' +
                        '<div class="image-container">' +
                            '<img class="image-container__picture" src="' + png(type) + '" alt=""' +
                                ' onerror="this.onerror=null;this.src=\'' + A + 'silver.png\'">' +
                            '<div class="player-cases">' +
                                '<div class="tick"><img src="' + IMG.tick + '" alt=""></div>' +
                                '<span class="txt">' + (canPayCase(c) ? ('Цена <b id="lrOwned">' + fmt(p.current) + '</b> DP') : 'Недоступен') + '</span>' +
                            '</div>' +
                        '</div>' +
                        buyBlock +
                    '</div>' +
                    '<div class="band-container" id="lrBandBox">' +
                        '<div class="cursor"><div class="line"></div></div>' +
                        '<div class="roulette-band" id="lrBand"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="control-bar">' +
                    '<div class="open-amount"><span>Открыть кейсов</span><div class="amt-list">' + amts + '</div></div>' +
                    '<button type="button" class="open-btn" id="lrOpenBtn">' + (canPayCase(c) ? ('Открыть за ' + fmt(p.current) + ' DP') : 'Открыть') + '</button>' +
                    '<div class="fast-open">' +
                        '<label class="fast-open__title" for="lrFast">Моментально</label>' +
                        '<input id="lrFast" class="fast-open__checkbox" type="checkbox"' + (state.fast ? ' checked' : '') + '>' +
                    '</div>' +
                '</div>' +
                lootHtml +
            '</div>';

        bandEl = $('lrBand');
        bindDetails(type, c);
        refreshBal();
    }

    function syncBuy(c) {
        state.buyAmount = Math.max(1, Math.min(20, parseInt(state.buyAmount, 10) || 1));
        var p = priceOf(c);
        var now = p.current * state.buyAmount;
        var old = (p.old != null ? p.old : c.price) * state.buyAmount;
        var pct = ((state.buyAmount - 1) / 19) * 100;
        var inp = $('lrBuyInput'), sl = $('lrSlider');
        if (inp) inp.value = String(state.buyAmount);
        if (sl) { sl.value = String(state.buyAmount); sl.style.setProperty('--pct', pct + '%'); }
        var n = $('lrNow'); if (n) n.textContent = fmt(now);
        var o = $('lrOld'); if (o) o.textContent = fmt(old);
        var bn = $('lrBuyNow'); if (bn) bn.textContent = fmt(now);
        var bo = $('lrBuyOld'); if (bo) bo.textContent = fmt(old);
    }

    function doBuy(type, c) {
        if (isFreeCase(c)) {
            toast('Стандартный кейс выдаётся бесплатно по таймеру');
            return;
        }
        if (!canPayCase(c)) {
            toast('Этот кейс пока недоступен');
            return;
        }
        var qty = Math.max(1, Math.min(20, parseInt(state.buyAmount, 10) || 1));
        var unit = priceOf(c).current;
        var total = unit * qty;
        var dp = getDpNum();
        if (dp >= 0 && dp < total) {
            toast('Недостаточно DP.');
            return;
        }
        var ok = cefTrigger('DonateCaseBuy', c.bloodCase, qty);
        if (!ok) toast('Покупка только в игре');
    }

    function bindDetails(type, c) {
        if (!isFreeCase(c)) {
            var inp = $('lrBuyInput'), sl = $('lrSlider');
            if (inp) inp.addEventListener('input', function () {
                state.buyAmount = parseInt(inp.value, 10) || 1;
                syncBuy(c);
            });
            if (sl) sl.addEventListener('input', function () {
                state.buyAmount = parseInt(sl.value, 10) || 1;
                syncBuy(c);
            });
            var buyBtn = $('lrBuyBtn');
            if (buyBtn) buyBtn.addEventListener('click', function () { doBuy(type, c); });
        }
        $('lrOpenBtn').addEventListener('click', function () { doOpen(type, c); });
        var fast = $('lrFast');
        if (fast) fast.addEventListener('change', function () { state.fast = !!fast.checked; });
        var amts = mainEl.querySelectorAll('.amt[data-amt]');
        for (var i = 0; i < amts.length; i++) {
            (function (el) {
                el.addEventListener('click', function () {
                    state.openAmount = parseInt(el.getAttribute('data-amt'), 10) || 1;
                    var all = mainEl.querySelectorAll('.amt');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('selected');
                    el.classList.add('selected');
                });
            })(amts[i]);
        }
    }

    var rollGen = 0;
    var prizeBindTimer = null;
    var openBlockedUntil = 0;

    function blockOpen(ms) {
        openBlockedUntil = Date.now() + (ms || 600);
    }

    function prizeToItem(prize) {
        var label = (prize && (prize.label || prize.name || prize.prize)) || 'Приз';
        var t = (prize && prize.type) || 'item';
        var color = (prize && (prize.color || prize.rarity)) || null;
        if (!color) {
            color = 'blue';
            if (t === 'money' || /\$|₽|руб/i.test(label)) color = 'gray';
            else if (t === 'dp' || /DP/i.test(label)) color = 'purple';
            else if (prize && prize.vehicleModel) color = 'gold';
            else if (/брон|armor/i.test(label)) color = 'gray';
            else if (/VIP/i.test(label)) color = 'blue';
            else if (/LVL/i.test(label)) color = 'gray';
        }
        var type = t;
        if (t === 'money' || /\$|₽|руб/i.test(label)) type = 'money';
        else if (t === 'dp' || /DP/i.test(label)) type = 'coins';
        else if (t === 'vehicle' || (prize && prize.vehicleModel)) type = 'vehicle';
        else if (t === 'armor' || t === 'armor_stack' || /брон|armor/i.test(label)) type = 'armor';
        else if (t === 'weapon' || /weapon_/i.test(String(prize && prize.weaponId || ''))) type = 'weapon';
        else if (t === 'vip' || /Vip\s*31/i.test(label)) type = 'vip';
        else if (t === 'admin' || /^\d+\s*LVL$/i.test(label)) type = 'admin';
        else if (t === 'skateboard' || /скейт/i.test(label)) type = 'skateboard';
        else if (t === 'item') type = 'item';

        var sellDp = null;
        if (prize && prize.sellPrice != null && Number(prize.sellPrice) > 0) sellDp = Number(prize.sellPrice);
        else if (prize && prize.sellDp != null && Number(prize.sellDp) > 0) sellDp = Number(prize.sellDp);

        var value = (prize && prize.vehicleModel) || (prize && prize.weaponId) || (prize && prize.amount) || (prize && prize.value) || label;
        if (type === 'weapon' && prize && prize.weaponId) value = prize.weaponId;

        var item = {
            type: type,
            color: color,
            label: String(label),
            value: value,
            vehicleModel: prize && prize.vehicleModel ? String(prize.vehicleModel) : (type === 'vehicle' ? String(value) : ''),
            weaponId: prize && prize.weaponId ? String(prize.weaponId) : '',
            sellDp: sellDp,
            sellPrice: sellDp,
            textOnly: type === 'vip' || type === 'admin',
            armorImg: null,
            armorImgFb: window.ARMOR_COSMETIC_IMG_FB || IMG.armorFb
        };

        if (type === 'armor' || String(prize && prize.caseName || '') === 'ArmorCase') {
            item.type = 'armor';
            var av = findArmorVariantByLabel(label);
            if (av) {
                item.color = armorColorForName(av.name);
                item.value = av.d + ':' + av.t;
                item.armorImg = armorImgUrl(av.img);
            } else {
                item.color = armorColorForName(label);
            }
        }

        return item;
    }

    function beginOpenUi() {
        var data = $('lrCaseData');
        var box = $('lrBandBox');
        var btn = $('lrOpenBtn');
        if (data) data.classList.add('is-hidden');
        if (box) box.classList.add('is-visible');
        if (btn) { btn.classList.add('is-opening'); btn.textContent = 'Открытие...'; }
    }

    function canPayCase(c) {
        return !!(c && c.bloodCase && (
            c.bloodCase === 'SilverCase' ||
            c.bloodCase === 'GoldCase' ||
            c.bloodCase === 'ArmorCase'
        ));
    }

    function doOpen(type, c) {
        if (state.waiting) return;
        if (Date.now() < openBlockedUntil) return;

        if (c && (c.bloodCase === 'Spring2026Case' || c.bloodCase === 'Spring2025Case')) {
            toast('В разработке.');
            return;
        }
        if (isFreeCase(c) || !canPayCase(c)) {
            toast(isFreeCase(c) ? 'Бесплатный кейс недоступен. Откройте Silver, Gold или Armor за DP.' : 'Этот кейс пока недоступен');
            return;
        }

        var price = priceOf(c).current;
        var dp = getDpNum();
        if (dp >= 0 && dp < price) {
            toast('Недостаточно DP.');
            return;
        }

        blockOpen(1200);
        state.openType = type;
        state.openCase = c;
        state.waiting = true;
        state.pendingOpens = 0;

        var bloodName = (c && c.bloodCase) || 'SilverCase';
        var ok = cefTrigger('DonateCaseDoOpen', bloodName, !!state.fast, 'dp');
        if (!ok) {
            state.waiting = false;
            toast('Открытие только в игре (нужен сервер)');
            return;
        }
        if (state.openWatch) clearTimeout(state.openWatch);
        state.openWatch = setTimeout(function () {
            state.openWatch = null;
            if (!state.waiting) return;
            denyOpen('Сервер не ответил. Кейс не списан — попробуйте снова.');
        }, 22000);
    }

    function denyOpen(msg) {
        if (state.openWatch) {
            clearTimeout(state.openWatch);
            state.openWatch = null;
        }
        state.waiting = false;
        state.pendingOpens = 0;
        toast(msg || 'Недостаточно кейсов.');
        if (state.openType) renderDetails(state.openType);
        else if (state.type) renderDetails(state.type);
    }

    function ensureRollCounter(current, max) {
        var box = $('lrBandBox');
        if (!box) return;
        var el = $('lrRollCount');
        if (!el) {
            el = document.createElement('div');
            el.id = 'lrRollCount';
            el.className = 'roll-count';
            box.appendChild(el);
        }
        el.textContent = 'Открыто: ' + current + ' / ' + max;
        el.style.display = max > 1 ? 'block' : 'none';
    }

    function runBand(items, win, fast, done) {
        if (!bandEl) { done && done(); return; }
        if (fast) {
            bandEl.innerHTML = '';
            bandEl.style.transition = 'none';
            bandEl.style.transform = 'translateY(-50%) translateX(0)';
            setTimeout(function () { done && done(); }, 120);
            return;
        }

        var FILL = 18;
        var TAIL = 4;
        var strip = [];
        var i;
        for (i = 0; i < FILL; i++) strip.push(items[Math.floor(Math.random() * items.length)]);
        var winIndex = strip.length;
        strip.push(win);
        for (i = 0; i < TAIL; i++) strip.push(items[Math.floor(Math.random() * items.length)]);

        bandEl.innerHTML = '';
        bandEl.style.transition = 'none';
        bandEl.style.transform = 'translateY(-50%) translateX(0)';
        strip.forEach(function (it) {
            var col = rarityOf(it);
            var el = document.createElement('div');
            el.className = 'roulette-item ' + col + (isTextOnlyPrize(it) ? ' is-text' : '');
            el.innerHTML =
                rarityMark(col) +
                prizeMediaHtml(it, 'roulette-item__picture') +
                '<div class="meta">' + (it.label || '') + '</div>';
            bandEl.appendChild(el);
        });

        var first = bandEl.firstChild;
        var gap = 10;
        var slotW = first ? first.getBoundingClientRect().width + gap : 280;
        if (!slotW || slotW < 40) slotW = 280;
        var parent = bandEl.parentElement;
        var cw = parent ? parent.clientWidth : 1200;
        var targetX = -(winIndex * slotW - cw / 2 + slotW / 2);
        var dur = 4200;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                bandEl.style.transition = 'transform ' + (dur / 1000) + 's cubic-bezier(0.12, 0.75, 0.12, 1)';
                bandEl.style.transform = 'translateY(-50%) translateX(' + targetX + 'px)';
            });
        });
        setTimeout(function () { done && done(); }, dur + 250);
    }

    function hidePrizeOverlay() {
        var prize = $('lrPrize');
        if (prize) {
            prize.className = 'prize-overlay';
            prize.style.pointerEvents = '';
            prize.innerHTML = '';
        }
        if (prizeBindTimer) {
            clearTimeout(prizeBindTimer);
            prizeBindTimer = null;
        }
    }

    /* Закрыть приз: забрать на сервере */
    function finishPrizeFlow(type, mode) {
        blockOpen(1400);
        var action = mode === 'sell' ? 'sellPrize' : 'collectPrize';
        cefTrigger(action);
        try {
            if (typeof window.bloodSyncDonatePoints === 'function') window.bloodSyncDonatePoints();
        } catch (e) {}

        /* collect может отказать (инвентарь полон) — overlay держим до casePrizeCollected */
        if (mode === 'sell') {
            hidePrizeOverlay();
            state.pendingOpens = 0;
            state.waiting = false;
            if (type) renderDetails(type);
            else renderMain();
            refreshBal();
            return;
        }

        state._prizeAwaitCollect = true;
        state._prizeAwaitType = type || state.openType;
        if (state.openWatch) clearTimeout(state.openWatch);
        state.openWatch = setTimeout(function () {
            state.openWatch = null;
            if (!state._prizeAwaitCollect) return;
            /* таймаут: считаем, что сервер молчит — оставим оверлей */
            toast('Не удалось подтвердить забор. Попробуйте ещё раз.');
            state._prizeAwaitCollect = false;
        }, 8000);
    }

    function onPrizeCollectedOk() {
        if (state.openWatch) {
            clearTimeout(state.openWatch);
            state.openWatch = null;
        }
        state._prizeAwaitCollect = false;
        hidePrizeOverlay();
        state.pendingOpens = 0;
        state.waiting = false;
        var t = state._prizeAwaitType || state.openType;
        state._prizeAwaitType = null;
        if (t) renderDetails(t);
        else renderMain();
        refreshBal();
    }

    function onPrizeCollectDenied(msg) {
        if (state.openWatch) {
            clearTimeout(state.openWatch);
            state.openWatch = null;
        }
        state._prizeAwaitCollect = false;
        toast(msg || 'Инвентарь полон.');
        /* оверлей остаётся — после освобождения слотов можно снова нажать «Забрать» */
    }

    function showPrizeQueue(wins, type, c, idx) {
        var prize = $('lrPrize');
        if (!prize) return;
        var list = Array.isArray(wins) ? wins : [wins];
        var win = list[idx];
        if (!win) {
            finishPrizeFlow(type, 'take');
            return;
        }

        blockOpen(700);
        ensureRollCounter(idx + 1, list.length);

        var more = idx < list.length - 1;
        var col = rarityOf(win);
        var sellDp = win.sellDp || win.sellPrice || 0;
        var canSell = !more && sellDp > 0;

        prize.style.pointerEvents = 'none';
        prize.className = 'prize-overlay show ' + col;
        prize.innerHTML =
            '<div class="prize-container ' + col + '">' +
                '<div class="prize-element">' +
                    '<span class="prize-element__title">Поздравляем!</span>' +
                    '<span class="prize-element__text-value">Вы выиграли ' + escapeHtml(win.label || '') + '</span>' +
                    '<div class="item-image-container' + (isTextOnlyPrize(win) ? ' is-text' : '') + '">' +
                        '<div class="line"></div>' +
                        '<div class="color-type ' + col + '"></div>' +
                        '<div class="ellipse ' + col + '"></div>' +
                        prizeMediaHtml(win, 'win-item') +
                        '<div class="title-container">' +
                            '<div class="title-container__title">' + escapeHtml(win.label || '') + '</div>' +
                            '<div class="title-container__value">' + typeLabel(win.type) + '</div>' +
                        '</div>' +
                    '</div>' +
                    (list.length > 1
                        ? ('<div class="pcnt">Приз ' + (idx + 1) + ' из ' + list.length + '</div>')
                        : '') +
                    '<div class="prize-actions">' +
                        (more
                            ? '<button type="button" class="primary" id="lrNextPrize">Далее</button>'
                            : (
                                '<button type="button" class="primary" id="lrDone">Забрать</button>' +
                                (canSell
                                    ? '<button type="button" class="secondary" id="lrSell">Продать за ' + sellDp + ' DP</button>'
                                    : '')
                            )) +
                    '</div>' +
                '</div>' +
            '</div>';

        if (prizeBindTimer) clearTimeout(prizeBindTimer);
        prizeBindTimer = setTimeout(function () {
            prizeBindTimer = null;
            if (!$('lrPrize') || !$('lrPrize').classList.contains('show')) return;
            prize.style.pointerEvents = '';

            var next = $('lrNextPrize');
            var doneBtn = $('lrDone');
            var sellBtn = $('lrSell');

            if (next) {
                next.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    showPrizeQueue(list, type, c, idx + 1);
                });
            }
            if (doneBtn) {
                doneBtn.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    finishPrizeFlow(type, 'take');
                });
            }
            if (sellBtn) {
                sellBtn.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    finishPrizeFlow(type, 'sell');
                });
            }
        }, 280);
    }

    function handleServerPrize(casename, fast, prize) {
        if (state.openWatch) {
            clearTimeout(state.openWatch);
            state.openWatch = null;
        }
        var type = state.openType;
        var c = state.openCase || CASES[type];
        if (!type) {
            var keys = Object.keys(CASES);
            for (var i = 0; i < keys.length; i++) {
                if (CASES[keys[i]].bloodCase === casename) { type = keys[i]; c = CASES[type]; break; }
            }
        }
        if (!type) type = 'silver';
        if (!c) c = CASES[type];

        var win = prizeToItem(prize);
        var items = loot(type);
        var myGen = ++rollGen;
        var isFast = fast === true || fast === 1 || fast === 'true' || !!state.fast;

        beginOpenUi();
        ensureRollCounter(1, (state.pendingOpens || 0) + 1);
        runBand(items, win, isFast, function () {
            if (myGen !== rollGen) return;
            state.waiting = false;
            blockOpen(800);
            showPrizeQueue([win], type, c, 0);
            refreshBal();
        });
    }

    function toast(text) {
        try {
            if (typeof serverAPI !== 'undefined' && serverAPI.notifySuccess) serverAPI.notifySuccess(text);
        } catch (e) {}
        try {
            var tip = document.createElement('div');
            tip.className = 'lr-toast';
            tip.textContent = text;
            overlayEl.appendChild(tip);
            setTimeout(function () { tip.classList.add('show'); }, 10);
            setTimeout(function () {
                tip.classList.remove('show');
                setTimeout(function () { tip.remove(); }, 250);
            }, 2800);
        } catch (e2) {}
    }

    window.LRoulette = {
        open: function () {
            build();
            state.open = true;
            overlayEl.classList.add('lr-open');
            renderMain();
            refreshBal();
            cefTrigger('donateCaseStockPull');
        },
        close: function () {
            if (!state.open || state.waiting) return;
            state.open = false;
            state.page = 'main';
            if (overlayEl) overlayEl.classList.remove('lr-open');
            hidePrizeOverlay();
        },
        isOpen: function () { return state.open; },
        onPrize: function (casename, fast, prize) {
            handleServerPrize(casename, fast, prize);
        },
        refreshBal: refreshBal,
        setStock: function (map) { applyStock(map); },
        denyOpen: function (msg) { denyOpen(msg); },
        onPrizeCollected: function () { onPrizeCollectedOk(); },
        onPrizeCollectDenied: function (msg) { onPrizeCollectDenied(msg); }
    };

    function hooks() {
        if (window._lrScopedHooked) return;
        window._lrScopedHooked = true;
        window.openDonateRoulette = function () { LRoulette.open(); };
        window.openPlayerDonateRoulette = function () { LRoulette.open(); };
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') hooks();
    else document.addEventListener('DOMContentLoaded', hooks);
    setTimeout(hooks, 0);
})();
