/** F3 → Магазин → Бронежилет: карточки из unlocks в БД */
(function () {
  var LEGACY_DRAWABLE_MAP = { 65: 70, 67: 72, 73: 66 };

  function parseArmorPayload(payload) {
    var data = payload;
    if (typeof payload === "string") {
      try {
        data = JSON.parse(payload);
      } catch (_pe) {
        return null;
      }
    }
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (_pe2) {
        return null;
      }
    }
    if (!data || typeof data !== "object") return null;
    return data;
  }

  function findVariantByName(name) {
    if (typeof ARMOR_SHOP_VARIANTS === "undefined" || !ARMOR_SHOP_VARIANTS.length) return null;
    var n = String(name || "").trim();
    if (!n) return null;
    for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
      if (ARMOR_SHOP_VARIANTS[i].name === n) return ARMOR_SHOP_VARIANTS[i];
    }
    return null;
  }

  function normalizeUnlockKey(raw) {
    var k = String(raw || "").trim();
    if (!k) return null;
    if (k.indexOf(":") >= 0) {
      var parts = k.split(":");
      var d = parseInt(parts[0], 10);
      var t = parseInt(parts[1], 10);
      if (!isFinite(d) || !isFinite(t)) return null;
      if (LEGACY_DRAWABLE_MAP[d] != null) d = LEGACY_DRAWABLE_MAP[d];
      return d + ":" + t;
    }
    var byName = findVariantByName(k);
    if (byName) return byName.d + ":" + byName.t;
    return null;
  }

  function collectUnlockKeys(data) {
    var unlockSet = {};
    var list = data.unlocks;
    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch (_pu) {
        list = list.split(/[,;]+/).map(function (s) {
          return String(s || "").trim();
        }).filter(Boolean);
      }
    }
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        var nk = normalizeUnlockKey(list[i]);
        if (nk) unlockSet[nk] = true;
      }
    }
    return unlockSet;
  }

  function findVariant(key) {
    if (typeof ARMOR_SHOP_VARIANTS === "undefined" || !ARMOR_SHOP_VARIANTS.length) return null;
    for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
      var v = ARMOR_SHOP_VARIANTS[i];
      if (v.d + ":" + v.t === key) return v;
    }
    return null;
  }

  function variantFromKey(key) {
    var found = findVariant(key);
    if (found) return found;
    var parts = key.split(":");
    var d = parseInt(parts[0], 10);
    var t = parseInt(parts[1], 10);
    if (!isFinite(d) || !isFinite(t)) return null;
    return { name: "Скин " + key, d: d, t: t, img: "img/Armor/vest.svg" };
  }

  function sortKeysByCatalog(keys) {
    var order = {};
    if (typeof ARMOR_SHOP_VARIANTS !== "undefined") {
      for (var i = 0; i < ARMOR_SHOP_VARIANTS.length; i++) {
        order[ARMOR_SHOP_VARIANTS[i].d + ":" + ARMOR_SHOP_VARIANTS[i].t] = i;
      }
    }
    return keys.slice().sort(function (a, b) {
      var oa = order[a] != null ? order[a] : 9999;
      var ob = order[b] != null ? order[b] : 9999;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
  }

  function renderCard(v, active, fb) {
    var imgUrl = typeof window.armorCosmeticImgUrl === "function" ? window.armorCosmeticImgUrl(v.img) : v.img;
    var btnLabel = active ? "Надето" : "Использовать";
    var btnDisabled = active ? " disabled" : "";
    var activeCls = active ? " shop-armor-card--active" : "";
    return (
      '<div class="shop-armor-card' + activeCls + '">' +
      '<div class="shop-armor-card__body">' +
      '<img class="shop-armor-card__img" src="' + imgUrl + '" alt="" onerror="this.onerror=null;this.src=\'' + fb + '\'">' +
      '<div class="shop-armor-card__title">' + v.name + "</div>" +
      "</div>" +
      '<div class="shop-armor-card__foot">' +
      '<button type="button" class="shop-armor-use-btn"' + btnDisabled + ' data-ad="' + v.d + '" data-at="' + v.t + '">' + btnLabel + "</button>" +
      "</div></div>"
    );
  }

  function armorCosmeticShopApply(payload) {
    var data = parseArmorPayload(payload) || {};

    var el = document.getElementById("ShopArmorCosmeticList");
    if (!el) return;

    var unlockSet = collectUnlockKeys(data);
    var equippedRaw = data.equipped != null ? String(data.equipped) : "";
    var equippedNorm = normalizeUnlockKey(equippedRaw) || equippedRaw;
    var fb = window.ARMOR_COSMETIC_IMG_FB || "package://browsers/inventory/img/armor.svg";

    if (typeof ARMOR_SHOP_VARIANTS === "undefined" || !ARMOR_SHOP_VARIANTS.length) {
      el.innerHTML = '<p class="shop-armor-empty">Каталог скинов не загружен.</p>';
      window.__lastArmorCosmeticShopPayload = data;
      return;
    }

    var unlockedKeys = sortKeysByCatalog(Object.keys(unlockSet));
    if (!unlockedKeys.length) {
      el.innerHTML =
        '<p class="shop-armor-empty">У вас нет открытых скинов бронежилета.<br>' +
        'Откройте кейс <b>Armor</b> в разделе «Кейсы», чтобы получить скин.</p>';
      window.__lastArmorCosmeticShopPayload = data;
      return;
    }

    var html = "";
    var shownCount = 0;
    for (var ui = 0; ui < unlockedKeys.length; ui++) {
      var kk = unlockedKeys[ui];
      var vv = variantFromKey(kk);
      if (!vv) continue;
      var active = equippedNorm === kk;
      html += renderCard(vv, active, fb);
      shownCount++;
    }

    if (!shownCount) {
      el.innerHTML =
        '<p class="shop-armor-empty">Скины найдены в профиле, но не удалось отобразить карточки.<br>' +
        'Откройте вкладку ещё раз или перезайдите в игру.</p>';
      window.__lastArmorCosmeticShopPayload = data;
      return;
    }

    el.innerHTML =
      '<div class="shop-armor-grid__head">' +
      '<span class="shop-armor-grid__counter">Открыто скинов: <b>' + shownCount + '</b></span>' +
      '<span class="shop-armor-grid__hint">Нажмите «Использовать», чтобы надеть.</span>' +
      '</div>' +
      '<div class="shop-armor-grid__items">' + html + '</div>';

    window.__lastArmorCosmeticShopPayload = data;
  }

  window.armorCosmeticShopApply = armorCosmeticShopApply;

  function bootstrapArmorCosmeticShopFromStash() {
    if (window.__lastArmorCosmeticShopPayload) {
      try {
        armorCosmeticShopApply(window.__lastArmorCosmeticShopPayload);
        return;
      } catch (_e) {}
    }
    if (!window.__armorCosmeticBootstrapB64) return;
    try {
      var raw = atob(window.__armorCosmeticBootstrapB64);
      armorCosmeticShopApply(JSON.parse(raw));
    } catch (_e2) {}
  }

  bootstrapArmorCosmeticShopFromStash();
  [0, 300, 900, 2000].forEach(function (ms) {
    setTimeout(bootstrapArmorCosmeticShopFromStash, ms);
  });
})();
