(function () {
  /* =========================================================
   *  КЕЙСЫ: toolbar, единая кнопка, авто-обновление лейбла
   * ========================================================= */
  function isCasePane(id) {
    return id && id !== "boxes_list";
  }

  function syncCasesOpenState() {
    var root = document.getElementById("boxes");
    if (!root) return;
    var active = root.querySelector(".bm-cases-tab-content > .tab-pane.active");
    var open = active && isCasePane(active.id);
    root.classList.toggle("is-case-open", !!open);
    if (open) {
      ensureCaseOpenBar(active);
      setupCaseButtons(active);
    }
  }

  function casePriceText(pane) {
    var p = pane.querySelector(".left_buts > p");
    if (!p) return "";
    var m = String(p.textContent || "").match(/(\d[\d\s.]*)/);
    return m ? m[1].trim() : "";
  }

  function setupCaseButtons(pane) {
    var openA = pane.querySelector(".left_buts > a");
    if (!openA) return;
    if (!openA.__bmWired) {
      var oc = openA.getAttribute("onclick") || "";
      var m = oc.match(/openDonateCase\((\d+)\)/);
      var idx = m ? parseInt(m[1], 10) : 0;
      openA.removeAttribute("onclick");
      openA.__bmIdx = idx;
      openA.__bmWired = true;
      openA.addEventListener("click", function (e) {
        e.preventDefault();
        try {
          if (typeof openDonateCase === "function") openDonateCase(openA.__bmIdx);
        } catch (_e) {}
      });
    }
    refreshCaseButtonLabel(pane, openA);
  }

  function refreshCaseButtonLabel(pane, openA) {
    openA = openA || pane.querySelector(".left_buts > a");
    if (!openA) return;
    var price = casePriceText(pane);
    openA.textContent = price ? "Открыть за " + price + " DP" : "Открыть";
    openA.removeAttribute("data-free");
  }

  function ensureCaseOpenBar(pane) {
    if (!pane || pane.querySelector(".bm-case-open-bar")) return;
    var back = pane.querySelector("a.back_boxes");
    var bal = pane.querySelector(".bm-hide-dp-row");
    if (!back || !bal) return;
    var bar = document.createElement("div");
    bar.className = "bm-case-open-bar";
    pane.insertBefore(bar, back);
    bar.appendChild(back);
    bar.appendChild(bal);
  }

  function initAllCaseBars() {
    document.querySelectorAll("#boxes .tab-pane").forEach(function (pane) {
      if (isCasePane(pane.id)) {
        ensureCaseOpenBar(pane);
        setupCaseButtons(pane);
      }
    });
  }

  function bindCasesTabs() {
    if (typeof jQuery === "undefined") return;
    jQuery(document).on("shown.bs.tab", '#boxes a[data-toggle="tab"]', function () {
      syncCasesOpenState();
      if (typeof mp !== "undefined" && mp.trigger) {
        try { mp.trigger("casesCatalogPull"); } catch (_eCat) {}
      }
    });
    jQuery(document).on("shown.bs.tab", 'a[href="#boxes"]', function () {
      if (typeof mp !== "undefined" && mp.trigger) {
        try { mp.trigger("casesCatalogPull"); } catch (_eCat2) {}
      }
    });
    jQuery(document).on("shown.bs.tab", '#main-nav a[data-toggle="tab"]', function (e) {
      var href = e.target && e.target.getAttribute("href");
      if (href === "#boxes") syncCasesOpenState();
    });
  }

  /* =========================================================
   *  EMBED-вкладка (Мини-игра): прячем iframe вне активной
   * ========================================================= */
  function syncEmbedFrames() {
    var activeHref = "";
    var activeNav = document.querySelector("#main-nav li.active > a[data-toggle=\"tab\"]");
    if (activeNav) activeHref = activeNav.getAttribute("href") || "";
    var mgFrame = document.getElementById("bm-embed-minigame");
    if (mgFrame) {
      var mgShow = activeHref === "#menu-minigame";
      mgFrame.style.visibility = mgShow ? "visible" : "hidden";
      mgFrame.style.pointerEvents = mgShow ? "auto" : "none";
    }
  }

  function bindEmbedTabs() {
    if (typeof jQuery === "undefined") return;
    jQuery(document).on("shown.bs.tab hidden.bs.tab", '.main-nav a[data-toggle="tab"]', syncEmbedFrames);
  }

  function ensureCrosshairCenterSwitch() {
    var wrap = document.querySelector(".bm-ch-center-toggle[data-bm-square-switch]");
    if (!wrap || wrap.__bmBound) return;
    wrap.__bmBound = true;
    var inp = wrap.querySelector("#aim_checkbox_settings");
    if (!inp) return;
    if (typeof window.bmSyncSquareSwitchVisual === "function") {
      window.bmSyncSquareSwitchVisual(wrap);
    }
    inp.addEventListener("change", function () {
      if (typeof window.bmSyncSquareSwitchVisual === "function") {
        window.bmSyncSquareSwitchVisual(wrap);
      }
    });
    if (typeof window.bmSyncCrosshairCenterDots === "function") {
      window.bmSyncCrosshairCenterDots();
    }
  }

  /* =========================================================
   *  ПРИЦЕЛ: мастер-тумблер «Кастомный прицел»
   * ========================================================= */
  function bmCrosshairKey() { return "bm_crosshair_enabled"; }
  function bmCrosshairIsEnabled() {
    try {
      var v = localStorage.getItem(bmCrosshairKey());
      return v === "1";
    } catch (_e) { return false; }
  }
  function bmCrosshairSetEnabled(enabled, opts) {
    var pane = document.getElementById("settings-account-crosshair-pane");
    if (!pane) return;
    var skipPush = opts && opts.skipPush;
    pane.classList.toggle("bm-ch-enabled", !!enabled);
    var sw = pane.querySelector(".bm-ch-master .bm-ch-switch");
    if (sw) sw.classList.toggle("is-on", !!enabled);
    try { localStorage.setItem(bmCrosshairKey(), enabled ? "1" : "0"); } catch (_e) {}
    try {
      if (typeof window.CustomCrosshair !== "undefined") {
        window.CustomCrosshair = !!enabled;
      }
      if (enabled && typeof window.CrossHairSettings !== "undefined" && window.CrossHairSettings[0]) {
        window.CrossHairSettings[0].Type = "Crosshair";
      }
      if (enabled && typeof window.refreshCrosshairPreviewPaint === "function") {
        window.refreshCrosshairPreviewPaint();
      }
    } catch (_eSync) {}
    if (!skipPush && typeof mp !== "undefined" && mp.trigger) {
      if (enabled && typeof window.CrossHairSettings !== "undefined" && window.CrossHairSettings[0]) {
        try { mp.trigger("crosshairPersistStorage", JSON.stringify(window.CrossHairSettings)); } catch (_ePersist) {}
      }
      try { mp.trigger("crosshairCustomEnabled", enabled ? "1" : "0"); } catch (_e2) {}
      if (enabled && typeof window.CrossHairSettings !== "undefined") {
        try { mp.trigger("crosshairLiveHud", JSON.stringify(window.CrossHairSettings)); } catch (_e3) {}
      }
    }
  }
  window.bmCrosshairSetEnabled = bmCrosshairSetEnabled;

  function ensureCrosshairMaster() {
    var pane = document.getElementById("settings-account-crosshair-pane");
    if (!pane || pane.querySelector(".bm-ch-master")) return;
    var body = pane.querySelector(".crosshair-v2__body");
    if (!body) return;
    var master = document.createElement("div");
    master.className = "bm-ch-master";
    master.innerHTML =
      '<div class="bm-ch-master__txt">' +
        '<span class="bm-ch-master__title">Кастомный прицел</span>' +
        '<span class="bm-ch-master__sub">Включите, чтобы настроить вид перекрестия и цвета. Когда выключен — используется стандартный прицел GTA 5.</span>' +
      '</div>' +
      '<div class="bm-ch-switch" role="switch" aria-checked="false" tabindex="0"></div>';
    pane.insertBefore(master, body);
    var sw = master.querySelector(".bm-ch-switch");
    sw.addEventListener("click", function () {
      bmCrosshairSetEnabled(!pane.classList.contains("bm-ch-enabled"));
    });
    sw.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        bmCrosshairSetEnabled(!pane.classList.contains("bm-ch-enabled"));
      }
    });
    var initial = bmCrosshairIsEnabled();
    bmCrosshairSetEnabled(initial, { skipPush: true });
    if (typeof mp !== "undefined" && mp.trigger) {
      try { mp.trigger("crosshairCustomEnabled", initial ? "1" : "0"); } catch (_e3) {}
    }
  }

  /* =========================================================
   *  Long-press для bm-ch-dot (+ / -) — повтор шага
   * ========================================================= */
  function bindLongPressSteppers() {
    var INITIAL_DELAY = 380;
    var REPEAT_FAST = 55;
    document.addEventListener("mousedown", function (ev) {
      var btn = ev.target.closest ? ev.target.closest(".bm-ch-dot") : null;
      if (!btn) return;
      if (btn.classList.contains("bm-ch-dot--toggle")) return;
      ev.preventDefault();
      var onclick = btn.getAttribute("onclick") || "";
      var m = onclick.match(/adjustCrosshairInputDelta\('([^']+)',\s*(-?\d+)\)/);
      if (!m) return;
      var inputId = m[1];
      var dir = parseInt(m[2], 10);
      var fire = function () {
        try {
          if (typeof window.adjustCrosshairInputDelta === "function") {
            window.adjustCrosshairInputDelta(inputId, dir);
          }
        } catch (_e) {}
      };
      var initialT = null;
      var intervalT = null;
      var stop = function () {
        if (initialT) { clearTimeout(initialT); initialT = null; }
        if (intervalT) { clearInterval(intervalT); intervalT = null; }
        document.removeEventListener("mouseup", stop, true);
        document.removeEventListener("mouseleave", stop, true);
      };
      initialT = setTimeout(function () {
        intervalT = setInterval(fire, REPEAT_FAST);
      }, INITIAL_DELAY);
      document.addEventListener("mouseup", stop, true);
      document.addEventListener("mouseleave", stop, true);
    });
  }

  /* =========================================================
   *  Retry профиля статистики (на случай поздней BD)
   * ========================================================= */
  function retryProfileLoad() {
    if (typeof mp === "undefined" || !mp.trigger) return;
    [0, 800, 2500, 5000, 9000].forEach(function (ms) {
      setTimeout(function () {
        try { mp.trigger("menuAccountProfileRequest"); } catch (_e) {}
      }, ms);
    });
  }

  /* =========================================================
   *  СТАТИСТИКА: sticky-кэш (не затирать нормальные значения «—»)
   * ========================================================= */
  function bmInstallStickyProfile() {
    if (typeof window.setMenuAccountProfile !== "function") return;
    if (window.__bmStickyWrapped) return;
    window.__bmStickyWrapped = true;
    var original = window.setMenuAccountProfile;
    window.__bmStickyProfile = window.__bmStickyProfile || {};
    function isEmpty(val) {
      if (val == null) return true;
      var s = String(val).trim();
      return s === "" || s === "—" || s === "Нет" || s === "Нет VIP" || s === "Нет фракции" || s === "0";
    }
    window.setMenuAccountProfile = function (jsonStr) {
      try {
        var d = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
        if (d && typeof d === "object") {
          var sticky = window.__bmStickyProfile;
          if (isEmpty(d.login) && !isEmpty(sticky.login)) d.login = sticky.login;
          if (isEmpty(d.vipLine) && !isEmpty(sticky.vipLine)) d.vipLine = sticky.vipLine;
          if ((!d.vip || isEmpty(d.vip.name)) && sticky.vip) d.vip = sticky.vip;
          if (!d.family && sticky.family) d.family = sticky.family;
          if ((!d.fraction || (d.fraction.name && d.fraction.name === "Нет фракции")) && sticky.fraction) {
            d.fraction = sticky.fraction;
          }
          if (isEmpty(d.dp) && !isEmpty(sticky.dp)) d.dp = sticky.dp;
          if (isEmpty(d.bank) && !isEmpty(sticky.bank)) d.bank = sticky.bank;
          if (!isEmpty(d.login)) sticky.login = d.login;
          if (!isEmpty(d.vipLine)) sticky.vipLine = d.vipLine;
          if (d.vip && !isEmpty(d.vip.name)) sticky.vip = d.vip;
          if (d.family) sticky.family = d.family;
          if (d.fraction && d.fraction.name && d.fraction.name !== "Нет фракции") sticky.fraction = d.fraction;
          if (!isEmpty(d.dp)) sticky.dp = d.dp;
          if (!isEmpty(d.bank)) sticky.bank = d.bank;
          arguments[0] = JSON.stringify(d);
        }
      } catch (_e) {}
      return original.apply(this, arguments);
    };
  }

  /* =========================================================
   *  BOOT
   * ========================================================= */
  function boot() {
    initAllCaseBars();
    bindCasesTabs();
    bindEmbedTabs();
    syncCasesOpenState();
    syncEmbedFrames();
    bindLongPressSteppers();
    ensureCrosshairMaster();
    ensureCrosshairCenterSwitch();
    bmInstallStickyProfile();
    retryProfileLoad();
    setTimeout(bmInstallStickyProfile, 1500);
    setTimeout(ensureCrosshairMaster, 1500);
    setTimeout(ensureCrosshairCenterSwitch, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
