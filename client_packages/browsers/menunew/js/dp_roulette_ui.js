/**
 * Рулетка DP (F2 → Мини-игра). Горизонтальная лента, таймер после первой ставки.
 */
(function () {
  var tickTimer = null;
  var isSpinning = false;
  var BET_COL_IDS = ['c2', 'c3', 'c5', 'c10'];
  var STRIP_ITEM_W = 96;
  var STRIP_GAP = 10;
  var STRIP_STEP = STRIP_ITEM_W + STRIP_GAP;

  function parseJson(raw) {
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_e) {
      return null;
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setTimerCountdown(sec, el) {
    if (!el) return;
    var s = Math.max(0, parseInt(sec, 10) || 0);
    var m = Math.floor(s / 60);
    var r = s % 60;
    el.textContent = 'До спина: ' + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function multLabel(id) {
    var m = { c2: '2X', c3: '3X', c5: '5X', c10: '10X' };
    return m[id] || id;
  }

  function dpMpTrigger() {
    var args = Array.prototype.slice.call(arguments);
    if (typeof mp !== 'undefined' && mp.trigger) {
      return mp.trigger.apply(mp, args);
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ __cefMp: 1, a: args }, '*');
      }
    } catch (_e) {}
  }

  function histMultOnly(h) {
    if (!h) return '';
    if (h.colorId) return multLabel(h.colorId);
    if (h.mult != null) {
      var n = parseInt(h.mult, 10);
      var byN = { 2: '2X', 3: '3X', 5: '5X', 10: '10X' };
      if (byN[n]) return byN[n];
    }
    return '';
  }

  function formatNumber(v) {
    var n = parseInt(v, 10);
    if (!Number.isFinite(n)) return String(v == null ? 0 : v);
    return n.toLocaleString('ru-RU').replace(/,/g, ' ');
  }

  function getStripWrapWidth(wrap) {
    if (!wrap) return 720;
    var w = wrap.clientWidth || 0;
    if (w < 80 && wrap.parentElement) {
      w = wrap.parentElement.clientWidth || 0;
    }
    if (w < 80 && wrap.closest('.dprou-card')) {
      w = wrap.closest('.dprou-card').clientWidth || 0;
    }
    if (w < 80 && window.innerWidth) {
      w = Math.min(window.innerWidth - 80, 920);
    }
    return w > 80 ? w : 720;
  }

  function resetStripPosition(strip, wrap) {
    if (!strip) return;
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    void strip.offsetHeight;
  }

  function showSpinResult(d) {
    if (!d) return;
    var card = document.querySelector('#minigames .dprou-card') || document.querySelector('.dprou-card');
    if (!card) return;

    var old = document.getElementById('dprouResultOverlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var ov = document.createElement('div');
    ov.id = 'dprouResultOverlay';
    ov.className = 'dprou-result-overlay';

    var winnerColor = d.colorId ? ('dprou--' + d.colorId) : '';
    var winnerMult = multLabel(d.colorId || '');
    var winnerLabel = d.label || '';
    var my = d.myResult || null;
    var html = '';

    if (!my) {
      html =
        '<div class="dprou-result__title dprou-result__title--info">Раунд завершён</div>' +
        '<div class="dprou-result__chip ' + winnerColor + '">' + winnerMult + '</div>' +
        '<div class="dprou-result__sub">Выпало: ' + escapeHtml(winnerLabel || winnerMult) + '</div>' +
        '<div class="dprou-result__hint">Вы не ставили в этом раунде</div>';
    } else if (my.won) {
      html =
        '<div class="dprou-result__title dprou-result__title--win">ПОБЕДА!</div>' +
        '<div class="dprou-result__chip ' + winnerColor + '">' + winnerMult + '</div>' +
        '<div class="dprou-result__sub">Выпало: ' + escapeHtml(winnerLabel || winnerMult) + '</div>' +
        '<div class="dprou-result__amount dprou-result__amount--win">+' + formatNumber(my.payout) + ' DP</div>' +
        '<div class="dprou-result__hint">Зачислено на баланс</div>';
    } else {
      html =
        '<div class="dprou-result__title dprou-result__title--lose">Проигрыш</div>' +
        '<div class="dprou-result__chip ' + winnerColor + '">' + winnerMult + '</div>' +
        '<div class="dprou-result__sub">Выпало: ' + escapeHtml(winnerLabel || winnerMult) + '</div>' +
        '<div class="dprou-result__amount dprou-result__amount--lose">−' + formatNumber(my.betAmount) + ' DP</div>' +
        '<div class="dprou-result__hint">Не повезло, попробуйте ещё</div>';
    }

    ov.innerHTML = '<div class="dprou-result__inner">' + html + '</div>';
    card.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('is-active'); });

    setTimeout(function () {
      if (ov && ov.parentNode) {
        ov.classList.remove('is-active');
        setTimeout(function () {
          if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
        }, 350);
      }
    }, 4200);
  }

  function clearBetColumns() {
    BET_COL_IDS.forEach(function (cid) {
      var el = document.getElementById('dprouBets_' + cid);
      if (el) el.innerHTML = '';
    });
  }

  function renderRoundBets(d) {
    clearBetColumns();
    if (!d.roundBets || !d.roundBets.length) return;
    var myLogin = (d.myLogin || '').trim();
    d.roundBets.forEach(function (row) {
      var host = document.getElementById('dprouBets_' + row.colorId);
      if (!host) return;
      var line = document.createElement('div');
      var isMe = myLogin && row.login === myLogin;
      line.className = 'dprou-bet-row' + (isMe ? ' dprou-bet-row--me' : '');
      line.innerHTML =
        '<span class="dprou-bet-name">' + escapeHtml(row.login) + '</span>' +
        '<span class="dprou-bet-amt">' + escapeHtml(row.amountFmt) + ' DP</span>';
      host.appendChild(line);
    });
  }

  function renderHistory(lastFive) {
    var ul = document.getElementById('dprouHistory');
    if (!ul) return;
    ul.innerHTML = '';
    if (!lastFive || !lastFive.length) {
      var li = document.createElement('li');
      li.className = 'dprou-hist-empty';
      li.textContent = 'Пока нет';
      ul.appendChild(li);
      return;
    }
    lastFive.forEach(function (h) {
      var li = document.createElement('li');
      li.className = 'dprou-hist-chip dprou-hist--' + (h.colorId || '');
      li.textContent = histMultOnly(h);
      ul.appendChild(li);
    });
  }

  function buildStripHtml(seq) {
    return seq
      .map(function (id) {
        return (
          '<div class="dprou-cell dprou-cell--h dprou--' +
          id +
          '"><span>' +
          multLabel(id) +
          '</span></div>'
        );
      })
      .join('');
  }

  function ensureStripPlaceholder() {
    var strip = document.getElementById('dprouStrip');
    var wrap = document.querySelector('.dprou-strip-wrap');
    if (!strip) return;
    if (strip.children.length === 0) {
      var ids = [];
      for (var i = 0; i < 24; i++) {
        ids.push(['c2', 'c3', 'c5', 'c10'][i % 4]);
      }
      strip.innerHTML = buildStripHtml(ids);
    }
    resetStripPosition(strip, wrap);
  }

  function runSpinAnimation(d) {
    var strip = document.getElementById('dprouStrip');
    var wrap = document.querySelector('.dprou-strip-wrap');
    if (!strip || !wrap || !d || !d.seq) return;

    isSpinning = true;
    strip.innerHTML = buildStripHtml(d.seq);
    resetStripPosition(strip, wrap);

    var vw = getStripWrapWidth(wrap);
    var target = -(d.targetIndex * STRIP_STEP - (vw / 2 - STRIP_ITEM_W / 2));
    var start = target + STRIP_STEP * 56;

    strip.style.transform = 'translateX(' + start + 'px)';
    void strip.offsetHeight;

    var prevOverlay = document.getElementById('dprouResultOverlay');
    if (prevOverlay && prevOverlay.parentNode) prevOverlay.parentNode.removeChild(prevOverlay);

    var spinSec = 5 + Math.random() * 3;
    var spinMs = Math.round(spinSec * 1000);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        vw = getStripWrapWidth(wrap);
        target = -(d.targetIndex * STRIP_STEP - (vw / 2 - STRIP_ITEM_W / 2));
        start = target + STRIP_STEP * 56;
        strip.style.transition = 'none';
        strip.style.transform = 'translateX(' + start + 'px)';
        void strip.offsetHeight;
        strip.style.transition = 'transform ' + spinSec + 's cubic-bezier(0.12, 0.72, 0.08, 1)';
        strip.style.transform = 'translateX(' + target + 'px)';
      });
    });

    var timerEl = document.getElementById('dprouTimer');
    if (timerEl) {
      timerEl.classList.remove('dprou-timer--wait');
      timerEl.textContent = 'Крутим…';
    }

    setTimeout(function () {
      dpMpTrigger('minigameDpRouletteAnimationDone');
      setTimeout(function () {
        showSpinResult(d);
        isSpinning = false;
        ensureStripPlaceholder();
        if (typeof DpRouletteGame !== 'undefined' && DpRouletteGame.pull) {
          setTimeout(function () { DpRouletteGame.pull(); }, 450);
        }
      }, 120);
    }, spinMs + 300);
  }

  function showDpRouletteMaintenanceMsg() {
    var card = document.querySelector('#minigames .dprou-card') || document.querySelector('.dprou-card');
    if (!card) return;
    var old = document.getElementById('dprouMaintenanceToast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var toast = document.createElement('div');
    toast.id = 'dprouMaintenanceToast';
    toast.textContent = 'Мини-игра на тех. работах.';
    toast.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:40;' +
      'padding:14px 22px;border-radius:10px;border:1px solid #3a4048;' +
      'background:rgba(18,18,18,0.96);color:#fff;font-size:14px;font-weight:600;' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.45);pointer-events:none;';
    card.style.position = 'relative';
    card.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2800);
  }

  window.DpRouletteGame = {
    applyState: function (raw) {
      var d = parseJson(raw);
      if (!d) return;

      var dpEl = document.getElementById('dprouDp');
      if (dpEl && d.dp != null) dpEl.textContent = d.dp;

      renderHistory(d.lastFive);
      renderRoundBets(d);

      if (isSpinning) return;

      ensureStripPlaceholder();

      var timerEl = document.getElementById('dprouTimer');
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }

      if (timerEl) {
        if (d.waitingBets) {
          timerEl.classList.add('dprou-timer--wait');
          timerEl.textContent = 'Ожидание ставок…';
        } else {
          timerEl.classList.remove('dprou-timer--wait');
          var left = Math.max(0, parseInt(d.sec, 10) || 0);
          setTimerCountdown(left, timerEl);
          tickTimer = setInterval(function () {
            left--;
            if (left < 0) left = 0;
            setTimerCountdown(left, timerEl);
          }, 1000);
        }
      }
    },

    onSpin: function (raw) {
      var d = parseJson(raw);
      if (!d || !d.seq) return;

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          runSpinAnimation(d);
        });
      });
    },

    pull: function () {
      dpMpTrigger('minigameDpRoulettePull');
    },

    placeBet: function (colorId) {
      if (isSpinning) return;
      showDpRouletteMaintenanceMsg();
      return;
      var inp = document.getElementById('dprouAmount');
      var raw = inp ? inp.value : '';
      dpMpTrigger('minigameDpRouletteBet', colorId, String(raw));
    }
  };

  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d || d.t !== 'dprou' || !window.DpRouletteGame) return;
    try {
      if (d.k === 'applyState') window.DpRouletteGame.applyState(d.p);
      else if (d.k === 'onSpin') window.DpRouletteGame.onSpin(d.p);
      else if (d.k === 'pull') window.DpRouletteGame.pull();
      else if (d.k === 'openGame') {
        try {
          var pick = document.getElementById('mg-picker');
          var root = document.getElementById('mg-game-root');
          if (pick && root) {
            pick.classList.add('is-hidden');
            root.classList.add('is-visible');
          }
          window.DpRouletteGame.pull();
          ensureStripPlaceholder();
        } catch (_og) {}
      }
    } catch (_e2) {}
  });

  function bootRouletteUi() {
    ensureStripPlaceholder();
    if (typeof DpRouletteGame !== 'undefined' && DpRouletteGame.pull) {
      DpRouletteGame.pull();
    }
    if (typeof ResizeObserver !== 'undefined') {
      var wrap = document.querySelector('.dprou-strip-wrap');
      if (wrap && !wrap.__dprouRo) {
        wrap.__dprouRo = new ResizeObserver(function () {
          if (!isSpinning) ensureStripPlaceholder();
        });
        wrap.__dprouRo.observe(wrap);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRouletteUi);
  } else {
    bootRouletteUi();
  }
})();
