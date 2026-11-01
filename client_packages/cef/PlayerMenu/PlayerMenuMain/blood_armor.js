/*
 * blood_armor.js — вкладка «Бронежилет» (скины из кейса Armor).
 */
(function () {
    if (typeof window.mp === 'undefined') return;

    var LEGACY_DRAWABLE_MAP = { 65: 70, 67: 72, 73: 66 };
    var IMG_BASE = 'package://browsers/menunew/';
    var IMG_FB = IMG_BASE + 'img/Armor/vest.svg';
    var GIFT_ICON = 'package://browsers/inventory/img/armor_gift.png';
    var GIFT_ICON_FB = 'package://browsers/inventory/img/armor_gift.svg';

    window.ARMOR_COSMETIC_IMG_FB = IMG_FB;

    window.armorCosmeticImgUrl = function (rel) {
        rel = String(rel || '').trim();
        if (!rel) return IMG_FB;
        if (rel.indexOf('package://') === 0) return rel;
        if (rel.indexOf('../inventory/') === 0) return 'package://inventory/' + rel.slice('../inventory/'.length);
        return IMG_BASE + rel.replace(/^\.\//, '');
    };

    function vueInst() {
        return typeof window.palyerMainMenuMenu !== 'undefined' && window.palyerMainMenuMenu.vue
            ? window.palyerMainMenuMenu.vue
            : null;
    }

    function isArmorTabActive() {
        var v = vueInst();
        if (!v) return false;
        if (v.currentTab === 2) return true;
        /* Подраздел «Бронежилет» внутри вкладки «Магазин». */
        return v.currentTab === 4 && v.shopTab === 2;
    }

    function parsePayload(payload) {
        var data = payload;
        if (typeof payload === 'string') {
            try { data = JSON.parse(payload); } catch (e) { return null; }
        }
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e2) { return null; }
        }
        return data && typeof data === 'object' ? data : null;
    }

    function findVariantByName(name) {
        if (typeof ARMOR_SHOP_VARIANTS === 'undefined' || !ARMOR_SHOP_VARIANTS.length) return null;
        var n = String(name || '').trim();
        for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
            if (ARMOR_SHOP_VARIANTS[i].name === n) return ARMOR_SHOP_VARIANTS[i];
        }
        return null;
    }

    function normalizeKey(raw) {
        var k = String(raw || '').trim();
        if (!k) return null;
        if (k.indexOf(':') >= 0) {
            var parts = k.split(':');
            var d = parseInt(parts[0], 10);
            var t = parseInt(parts[1], 10);
            if (!isFinite(d) || !isFinite(t)) return null;
            if (LEGACY_DRAWABLE_MAP[d] != null) d = LEGACY_DRAWABLE_MAP[d];
            return d + ':' + t;
        }
        var byName = findVariantByName(k);
        return byName ? byName.d + ':' + byName.t : null;
    }

    function collectUnlocks(data) {
        var set = {};
        var list = data.unlocks;
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (e) {
                list = list.split(/[,;]+/).map(function (s) { return String(s || '').trim(); }).filter(Boolean);
            }
        }
        if (list && list.length) {
            for (var i = 0; i < list.length; i++) {
                var nk = normalizeKey(list[i]);
                if (nk) set[nk] = true;
            }
        }
        return set;
    }

    function variantFromKey(key) {
        if (typeof ARMOR_SHOP_VARIANTS !== 'undefined') {
            for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
                var v = ARMOR_SHOP_VARIANTS[i];
                if (v.d + ':' + v.t === key) return v;
            }
        }
        var parts = key.split(':');
        var d = parseInt(parts[0], 10);
        var t = parseInt(parts[1], 10);
        if (!isFinite(d) || !isFinite(t)) return null;
        return { name: 'Скин ' + key, d: d, t: t, img: 'img/Armor/vest.svg' };
    }

    function renderCard(v, active) {
        var imgUrl = window.armorCosmeticImgUrl(v.img);
        var btnLabel = active ? 'Надето' : 'Надеть';
        var btnDisabled = active ? ' disabled' : '';
        var activeCls = active ? ' shop-armor-card--active' : '';
        return (
            '<div class="shop-armor-card' + activeCls + '">' +
            '<div class="shop-armor-card__body">' +
            '<img class="shop-armor-card__img" src="' + imgUrl + '" alt="" onerror="this.onerror=null;this.src=\'' + IMG_FB + '\'">' +
            '</div>' +
            '<div class="shop-armor-card__title">' + v.name + '</div>' +
            '<div class="shop-armor-card__foot">' +
            '<button type="button" class="shop-armor-use-btn"' + btnDisabled + ' data-ad="' + v.d + '" data-at="' + v.t + '">' + btnLabel + '</button>' +
            '<button type="button" class="shop-armor-gift-btn" title="Упаковать в подарок" data-ad="' + v.d + '" data-at="' + v.t + '">' +
            '<img class="shop-armor-gift-btn__ico" src="' + GIFT_ICON + '" alt="" onerror="this.onerror=null;this.src=\'' + GIFT_ICON_FB + '\'">' +
            '</button>' +
            '</div></div>'
        );
    }

    function renderHtml(data) {
        if (typeof ARMOR_SHOP_VARIANTS === 'undefined' || !ARMOR_SHOP_VARIANTS.length) {
            return '<p class="shop-armor-empty">Каталог скинов не загружен.</p>';
        }
        var unlockSet = collectUnlocks(data);
        var equippedRaw = data.equipped != null ? String(data.equipped) : '';
        var equippedNorm = normalizeKey(equippedRaw) || equippedRaw;
        var keys = Object.keys(unlockSet);
        if (!keys.length) {
            return (
                '<p class="shop-armor-empty">У вас нет открытых скинов бронежилета.<br>' +
                'Откройте кейс <b>Armor</b> в разделе «Кейсы», чтобы получить скин.</p>'
            );
        }
        var html = '';
        var count = 0;
        for (var i = 0; i < keys.length; i++) {
            var vv = variantFromKey(keys[i]);
            if (!vv) continue;
            html += renderCard(vv, equippedNorm === keys[i]);
            count++;
        }
        if (!count) {
            return '<p class="shop-armor-empty">Не удалось отобразить скины. Откройте вкладку ещё раз.</p>';
        }
        return (
            '<div class="shop-armor-grid__head">' +
            '<span class="shop-armor-grid__counter">Открыто скинов: <b>' + count + '</b></span>' +
            '<span class="shop-armor-grid__hint">«Надеть» — экипировать скин. Квадрат с подарком — упаковать в инвентарь.</span>' +
            '</div>' +
            '<div class="shop-armor-grid__items">' + html + '</div>'
        );
    }

    window.bloodArmorApplyPending = function () {
        if (!window.__lastArmorCosmeticShopPayload) return;
        window.armorCosmeticShopApply(window.__lastArmorCosmeticShopPayload);
    };

    window.armorCosmeticShopApply = function (payload) {
        var data = parsePayload(payload) || {};
        window.__lastArmorCosmeticShopPayload = data;

        if (!isArmorTabActive()) return;

        var el = document.getElementById('ShopArmorCosmeticList');
        if (!el) return;

        el.innerHTML = renderHtml(data);
    };

    document.addEventListener('click', function (e) {
        var giftBtn = e.target && e.target.closest ? e.target.closest('.shop-armor-gift-btn') : null;
        if (giftBtn) {
            var gd = parseInt(giftBtn.getAttribute('data-ad'), 10);
            var gt = parseInt(giftBtn.getAttribute('data-at'), 10);
            if (!isFinite(gd) || !isFinite(gt)) return;
            try { window.mp.trigger('armorCosmeticGiftWrap', gd, gt); } catch (errGift) {}
            return;
        }
        var btn = e.target && e.target.closest ? e.target.closest('.shop-armor-use-btn') : null;
        if (!btn || btn.disabled) return;
        var d = parseInt(btn.getAttribute('data-ad'), 10);
        var t = parseInt(btn.getAttribute('data-at'), 10);
        if (!isFinite(d) || !isFinite(t)) return;
        try { window.mp.trigger('armorCosmeticEquip', d, t); } catch (err) {}
    });
})();
