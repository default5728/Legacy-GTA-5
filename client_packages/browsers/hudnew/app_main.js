(function () {
    const RPM_ARC_LEN = 88;
    const FUEL_SEGS = 14;
    const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    const el = {
        topRight: document.getElementById('topRight'),
        trOnline: document.getElementById('trOnline'),
        trRemote: document.getElementById('trRemote'),
        trNick: document.getElementById('trNick'),
        trStatic: document.getElementById('trStatic'),
        trTime: document.getElementById('trTime'),
        trDate: document.getElementById('trDate'),
        moneyBar: document.getElementById('moneyBar'),
        bankVal: document.getElementById('bankVal'),
        cashVal: document.getElementById('cashVal'),
        micIco: document.getElementById('micIco'),
        caseBonus: document.getElementById('caseBonus'),
        caseBonusTime: document.getElementById('caseBonusTime'),
        pathQuest: document.getElementById('pathQuest'),
        pathQuestTitle: document.getElementById('pathQuestTitle'),
        pathQuestDesc: document.getElementById('pathQuestDesc'),
        resistBox: document.getElementById('resistBox'),
        resistSpankRow: document.getElementById('resistSpankRow'),
        resistAlcoRow: document.getElementById('resistAlcoRow'),
        resistEnergyRow: document.getElementById('resistEnergyRow'),
        resistSpankVal: document.getElementById('resistSpankVal'),
        resistAlcoVal: document.getElementById('resistAlcoVal'),
        resistEnergyVal: document.getElementById('resistEnergyVal'),
        minimapStack: document.getElementById('minimapStack'),
        leftMiniStack: document.getElementById('leftMiniStack'),
        streetBar: document.getElementById('streetBar'),
        streetArea: document.getElementById('streetArea'),
        streetName: document.getElementById('streetName'),
        streetDir: document.getElementById('streetDir'),
        vzp: document.getElementById('vzp'),
        vzpDefName: document.getElementById('vzpDefName'),
        vzpDefAlive: document.getElementById('vzpDefAlive'),
        vzpAtkName: document.getElementById('vzpAtkName'),
        vzpAtkAlive: document.getElementById('vzpAtkAlive'),
        vzpTimer: document.getElementById('vzpTimer'),
        vzpRole: document.getElementById('vzpRole'),
        ammoBlock: document.getElementById('ammoBlock'),
        ammoClip: document.getElementById('ammoClip'),
        ammoTotal: document.getElementById('ammoTotal'),
        root: document.getElementById('speedo'),
        gearBadge: document.getElementById('gearBadge'),
        spd0: document.getElementById('spd0'),
        spd1: document.getElementById('spd1'),
        spd2: document.getElementById('spd2'),
        rpmArc: document.getElementById('rpmArc'),
        fuelPctVal: document.getElementById('fuelPctVal'),
        fuelSegs: document.getElementById('fuelSegs'),
        odoVal: document.getElementById('odoVal'),
        icoLock: document.getElementById('icoLock'),
        icoEngine: document.getElementById('icoEngine'),
        icoCruise: document.getElementById('icoCruise'),
        icoTurn: document.getElementById('icoTurn'),
        icoBelt: document.getElementById('icoBelt'),
        chOverlay: document.getElementById('hudCrosshair'),
        chRoot: document.getElementById('hudChRoot'),
        chMid: document.getElementById('hudChMid'),
        chVTop: document.getElementById('hudChVTop'),
        chVBot: document.getElementById('hudChVBot'),
        chHLeft: document.getElementById('hudChHLeft'),
        chHRight: document.getElementById('hudChHRight'),
        chDot: document.getElementById('hudChDot')
    };

    if (el.fuelSegs) {
        let html = '';
        for (let i = 0; i < FUEL_SEGS; i++) html += '<span class="fuel-seg"></span>';
        el.fuelSegs.innerHTML = html;
    }
    const fuelSegNodes = el.fuelSegs ? el.fuelSegs.querySelectorAll('.fuel-seg') : [];

    let chromeOn = false;
    let styleNew = false;
    let vzpWanted = false;
    let vzpTick = null;
    let vzpSec = 0;
    let ammoWanted = false;
    let greenZone = false;

    let caseLeft = 0;
    let caseTick = null;
    let spankLeft = 0;
    let alcoLeft = 0;
    let energyLeft = 0;
    let resistTick = null;

    let crosshair = null;
    let crosshairActive = false;
    let crosshairVisible = false;
    let crosshairTargetNear = false;

    function chNum(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function applyBoxStyle(node, style) {
        if (!node) return;
        node.style.cssText = '';
        if (!style) return;
        const keys = Object.keys(style);
        for (let i = 0; i < keys.length; i++) node.style[keys[i]] = style[keys[i]];
    }

    function crosshairColor() {
        if (!crosshair) return '#e8e8e8';
        if (crosshairTargetNear) return crosshair.TargetColor || '#ef4444';
        return crosshair.DefaultColor || '#e8e8e8';
    }

    function chVertStyle(top) {
        if (!crosshair) return {};
        const w = chNum(crosshair.Width, 2);
        const h = chNum(crosshair.Height, 10);
        const op = crosshair.ChossHairOpacity != null ? crosshair.ChossHairOpacity : 1;
        const r = crosshair.CrosshairRadius || 0;
        const col = crosshairColor();
        const br = top ? (r + '% ' + r + '% 0 0') : ('0 0 ' + r + '% ' + r + '%');
        const style = {
            width: w + 'px',
            height: h + 'px',
            minWidth: w + 'px',
            minHeight: h + 'px',
            opacity: String(op),
            background: col,
            borderRadius: br,
            flexShrink: '0'
        };
        if (!h || !w) style.display = 'none';
        return style;
    }

    function chHorizStyle(left) {
        if (!crosshair) return {};
        const w = chNum(crosshair.Width, 2);
        const h = chNum(crosshair.Height, 10);
        const op = crosshair.ChossHairOpacity != null ? crosshair.ChossHairOpacity : 1;
        const r = crosshair.CrosshairRadius || 0;
        const col = crosshairColor();
        const br = left ? (r + '% 0 0 ' + r + '%') : ('0 ' + r + '% ' + r + '% 0');
        const style = {
            width: h + 'px',
            height: w + 'px',
            minWidth: h + 'px',
            minHeight: w + 'px',
            opacity: String(op),
            background: col,
            borderRadius: br,
            flexShrink: '0'
        };
        if (!h || !w) style.display = 'none';
        return style;
    }

    function chDotStyle() {
        if (!crosshair) return {};
        let s = Number(crosshair.CenterPointSize);
        if (!Number.isFinite(s) || s < 0) s = 0;
        const vis = crosshairDotVisible();
        if (vis && s < 1) s = 1;
        const pr = crosshair.CenterPointRadius || 0;
        const op = crosshair.ChossHairOpacity != null ? crosshair.ChossHairOpacity : 1;
        return {
            width: s + 'px',
            height: s + 'px',
            minWidth: s + 'px',
            minHeight: s + 'px',
            flexShrink: '0',
            opacity: String(op),
            background: crosshairColor(),
            borderRadius: pr + '%',
            display: vis ? 'block' : 'none'
        };
    }

    function crosshairDotVisible() {
        if (!crosshair) return false;
        const v = crosshair.CenterPointVisible;
        return v === true || v === 1 || v === '1' || v === 'true';
    }

    function paintCrosshair() {
        const show = !!(crosshairVisible && crosshairActive && crosshair);
        if (el.chOverlay) el.chOverlay.classList.toggle('is-on', show);
        if (!show) return;
        const gap = (Number(crosshair.CenterDistance) || 0) + 'px';
        if (el.chRoot) el.chRoot.style.gap = gap;
        if (el.chMid) el.chMid.style.gap = gap;
        applyBoxStyle(el.chVTop, chVertStyle(true));
        applyBoxStyle(el.chVBot, chVertStyle(false));
        applyBoxStyle(el.chHLeft, chHorizStyle(true));
        applyBoxStyle(el.chHRight, chHorizStyle(false));
        applyBoxStyle(el.chDot, chDotStyle());
    }

    function resetCrosshair() {
        crosshair = null;
        crosshairActive = false;
        crosshairVisible = false;
        paintCrosshair();
    }

    function setIco(node, on, mode) {
        if (!node) return;
        node.classList.remove('active-green', 'active-red', 'blink');
        if (!on) return;
        if (mode === 'red') node.classList.add('active-red');
        else if (mode === 'blink') node.classList.add('blink');
        else node.classList.add('active-green');
    }

    function formatMoney(raw) {
        /* formatnum1 на сервере: 15441425 → "15.441.425" — точки не десятичные */
        const digits = String(raw == null ? '' : raw).replace(/[^\d]/g, '');
        let n = digits ? parseInt(digits, 10) : 0;
        if (!Number.isFinite(n)) n = 0;
        n = Math.floor(Math.abs(n));
        let s;
        try {
            s = n.toLocaleString('ru-RU').replace(/,/g, ' ');
        } catch (_e) {
            s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
        return s + '$';
    }

    function formatTimer(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
    }

    function formatCaseTimer(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const p = (n) => (n < 10 ? '0' + n : '' + n);
        return h + ':' + p(m);
    }

    function formatResist(sec) {
        const n = Math.max(0, Math.floor(Number(sec) || 0));
        if (n >= 100) return String(Math.min(n, 999));
        return String(n);
    }

    function headingToDir(heading) {
        let h = Number(heading);
        if (!Number.isFinite(h)) h = 0;
        h = ((h % 360) + 360) % 360;
        return DIRS[Math.round(h / 45) % 8];
    }

    function setSpeedDigits(speed) {
        const n = Math.max(0, Math.min(999, Math.round(Number(speed) || 0)));
        const s = String(n).padStart(3, '0');
        el.spd0.textContent = s[0];
        el.spd1.textContent = s[1];
        el.spd2.textContent = s[2];
        el.spd0.classList.toggle('spd-dim', s[0] === '0');
        el.spd1.classList.toggle('spd-dim', s[0] === '0' && s[1] === '0');
        el.spd2.classList.remove('spd-dim');
    }

    function refreshChromeBits() {
        const on = chromeOn && styleNew;
        el.topRight.classList.toggle('is-on', on);
        el.moneyBar.classList.toggle('is-on', on);
        if (el.minimapStack) el.minimapStack.classList.toggle('is-on', on);
        if (el.leftMiniStack) el.leftMiniStack.classList.toggle('is-on', on);
        el.streetBar.classList.toggle('is-on', on);
        refreshCaseVisible();
        refreshResistVisible();
        refreshVzpVisible();
        refreshAmmoVisible();
        if (!on) el.root.classList.remove('is-on');
    }

    function refreshAmmoVisible() {
        if (chromeOn && styleNew && ammoWanted) el.ammoBlock.classList.add('is-on');
        else el.ammoBlock.classList.remove('is-on');
    }

    function refreshVzpVisible() {
        if (chromeOn && styleNew && vzpWanted) el.vzp.classList.add('is-on');
        else el.vzp.classList.remove('is-on');
    }

    function refreshCaseVisible() {
        if (chromeOn && styleNew && caseLeft > 0) {
            el.caseBonus.classList.add('is-on');
            try {
                el.caseBonus.style.setProperty('position', 'relative', 'important');
                el.caseBonus.style.setProperty('top', 'auto', 'important');
                el.caseBonus.style.setProperty('right', 'auto', 'important');
                el.caseBonus.style.setProperty('transform', 'translateY(-15px)', 'important');
            } catch (_e) {}
        } else {
            el.caseBonus.classList.remove('is-on');
        }
    }

    function refreshResistVisible() {
        const spankOn = spankLeft > 0;
        const alcoOn = alcoLeft > 0;
        const energyOn = energyLeft > 0;
        el.resistSpankRow.classList.toggle('is-on', spankOn);
        el.resistAlcoRow.classList.toggle('is-on', alcoOn);
        if (el.resistEnergyRow) el.resistEnergyRow.classList.toggle('is-on', energyOn);
        if (chromeOn && styleNew && (spankOn || alcoOn || energyOn)) el.resistBox.classList.add('is-on');
        else el.resistBox.classList.remove('is-on');
    }

    function stopVzpTick() {
        if (vzpTick != null) {
            clearInterval(vzpTick);
            vzpTick = null;
        }
    }

    function startVzpTick() {
        stopVzpTick();
        vzpTick = setInterval(function () {
            if (vzpSec > 0) {
                vzpSec -= 1;
                el.vzpTimer.textContent = formatTimer(vzpSec);
            }
        }, 1000);
    }

    function stopCaseTick() {
        if (caseTick != null) {
            clearInterval(caseTick);
            caseTick = null;
        }
    }

    function startCaseTick() {
        stopCaseTick();
        caseTick = setInterval(function () {
            if (caseLeft <= 0) {
                caseLeft = 0;
                stopCaseTick();
                refreshCaseVisible();
                return;
            }
            caseLeft -= 1;
            el.caseBonusTime.textContent = formatCaseTimer(caseLeft);
            if (caseLeft <= 0) refreshCaseVisible();
        }, 1000);
    }

    function ensureResistTick() {
        if (resistTick != null) return;
        resistTick = setInterval(function () {
            let changed = false;
            if (spankLeft > 0) {
                spankLeft -= 1;
                el.resistSpankVal.textContent = formatResist(spankLeft);
                if (spankLeft <= 0) changed = true;
            }
            if (alcoLeft > 0) {
                alcoLeft -= 1;
                el.resistAlcoVal.textContent = formatResist(alcoLeft);
                if (alcoLeft <= 0) changed = true;
            }
            if (energyLeft > 0) {
                energyLeft -= 1;
                if (el.resistEnergyVal) el.resistEnergyVal.textContent = formatResist(energyLeft);
                if (energyLeft <= 0) changed = true;
            }
            if (spankLeft <= 0 && alcoLeft <= 0 && energyLeft <= 0) {
                clearInterval(resistTick);
                resistTick = null;
                changed = true;
            }
            if (changed) refreshResistVisible();
        }, 1000);
    }

    function applyGreenZone(on) {
        greenZone = !!on;
        el.streetBar.classList.toggle('is-gz', greenZone);
    }

    window.hudNew = {
        setStyleNew(v) {
            styleNew = !!v;
            refreshChromeBits();
            if (!styleNew) {
                el.root.classList.remove('is-on');
                stopVzpTick();
            }
        },
        setChrome(v) {
            chromeOn = !!v;
            refreshChromeBits();
            if (!chromeOn) {
                el.root.classList.remove('is-on');
                stopVzpTick();
            } else if (vzpWanted) {
                startVzpTick();
            }
        },
        setVisible(v) {
            if (v && styleNew && chromeOn) el.root.classList.add('is-on');
            else el.root.classList.remove('is-on');
        },
        setMinimapLayout(leftX, rightX, bottomY, hudTopY) {
            const left = Math.max(0, Math.min(1, Number(leftX) || 0));
            const right = Math.max(left, Math.min(1, Number(rightX) || 0));
            const bottom = Math.max(0, Math.min(1, Number(bottomY) || 0));
            const topY = Math.max(0, Math.min(1, Number(hudTopY) || 0));
            const fromBottomTop = Math.max(0, 1 - topY);
            const fromBottomBot = Math.max(0, 1 - bottom);
            const width = Math.max(0.1, right - left);
            const gapPx = Math.max(10, Math.round(window.innerWidth * 0.008));

            /* деньги — над миникартой */
            if (el.minimapStack) {
                el.minimapStack.style.left = (left * 100) + '%';
                el.minimapStack.style.width = (width * 100) + '%';
                el.minimapStack.style.maxWidth = (width * 100) + '%';
                el.minimapStack.style.bottom = 'calc(' + (fromBottomTop * 100) + '% + 6px)';
            }

            /* улицы / ЗЗ — ВВЕРХУ миникарты (координаты экрана) */
            if (el.streetBar) {
                el.streetBar.style.left = (left * 100) + '%';
                el.streetBar.style.width = (width * 100) + '%';
                el.streetBar.style.maxWidth = (width * 100) + '%';
                el.streetBar.style.bottom = 'auto';
                el.streetBar.style.top = 'calc(' + (topY * 100) + '% + 0.5vh)';
            }

            /* патроны + резисты — справа от миникарты */
            if (el.leftMiniStack) {
                el.leftMiniStack.style.left = 'calc(' + (right * 100) + '% + ' + gapPx + 'px)';
                el.leftMiniStack.style.right = 'auto';
                el.leftMiniStack.style.transform = 'none';
                el.leftMiniStack.style.bottom = 'calc(' + (fromBottomBot * 100) + '% + 10px)';
                el.leftMiniStack.style.top = 'auto';
            }
        },
        updateMoney(raw, bankRaw) {
            if (raw != null && raw !== '') {
                el.cashVal.textContent = formatMoney(raw);
            }
            if (bankRaw != null && bankRaw !== '') {
                el.bankVal.textContent = formatMoney(bankRaw);
            } else if (raw != null && raw !== '' && (!el.bankVal.textContent || el.bankVal.textContent === '0$')) {
                /* если банк не пришёл — дублируем кэш в банке не надо, оставляем банк */
            }
        },
        updateBank(raw) {
            el.bankVal.textContent = formatMoney(raw);
        },
        updateMicro(on) {
            if (on) el.micIco.classList.add('is-live');
            else el.micIco.classList.remove('is-live');
        },
        updateAmmo(clip, total, armed) {
            const isArmed = armed === true || armed === 'true' || armed === 1 || armed === '1';
            const clipN = Math.max(0, parseInt(clip, 10) || 0);
            ammoWanted = isArmed;
            if (isArmed) {
                el.ammoClip.textContent = String(clipN);
                el.ammoTotal.textContent = '∞';
            }
            refreshAmmoVisible();
        },
        updateOnline(n) {
            el.trOnline.textContent = String(Math.max(0, parseInt(n, 10) || 0));
        },
        updatePlayer(nick, staticId, remoteId) {
            el.trNick.textContent = nick ? String(nick) : '—';
            el.trStatic.textContent = String(Math.max(0, parseInt(staticId, 10) || 0));
            if (remoteId != null && remoteId !== '') {
                el.trRemote.textContent = String(Math.max(0, parseInt(remoteId, 10) || 0));
            } else {
                el.trRemote.textContent = el.trStatic.textContent;
            }
        },
        updateWorldTime(t) {
            if (t != null && t !== '') el.trTime.textContent = String(t);
        },
        updateWorldDate(d) {
            if (d == null || d === '') return;
            el.trDate.textContent = String(d).split('.').slice(0, 2).join('.');
        },
        updateLocation(streetName, areaName, heading) {
            let street = String(streetName == null ? '' : streetName).trim();
            let area = String(areaName == null ? '' : areaName).trim();
            if (street.charAt(0) === '"') {
                try { street = JSON.parse(street); } catch (_e) {}
                street = String(street || '').trim();
            }
            if (area.charAt(0) === '"') {
                try { area = JSON.parse(area); } catch (_e2) {}
                area = String(area || '').trim();
            }
            if (area && street && area !== street) {
                el.streetArea.textContent = area;
                el.streetName.textContent = street;
            } else {
                el.streetArea.textContent = area || street || '—';
                el.streetName.textContent = '';
            }
            if (heading != null && heading !== '') {
                el.streetDir.textContent = headingToDir(heading);
            }
        },
        setGreenZone(on) { applyGreenZone(on); },
        isActiveGreenZone(on) { applyGreenZone(on); },
        FreeTimeCase(seconds) {
            stopCaseTick();
            const s = Math.max(0, parseInt(seconds, 10) || 0);
            caseLeft = s;
            el.caseBonusTime.textContent = formatCaseTimer(s);
            refreshCaseVisible();
            if (s > 0) startCaseTick();
        },
        activateSpank(seconds) {
            const s = (typeof seconds === 'number') ? Math.floor(seconds) : parseInt(seconds, 10);
            spankLeft = (Number.isFinite(s) && s > 0) ? s : 0;
            el.resistSpankVal.textContent = formatResist(spankLeft);
            refreshResistVisible();
            if (spankLeft > 0) ensureResistTick();
        },
        activateAlco(seconds) {
            const s = (typeof seconds === 'number') ? Math.floor(seconds) : parseInt(seconds, 10);
            alcoLeft = (Number.isFinite(s) && s > 0) ? s : 0;
            el.resistAlcoVal.textContent = formatResist(alcoLeft);
            refreshResistVisible();
            if (alcoLeft > 0) ensureResistTick();
        },
        activateEnergy(seconds) {
            const s = (typeof seconds === 'number') ? Math.floor(seconds) : parseInt(seconds, 10);
            energyLeft = (Number.isFinite(s) && s > 0) ? s : 0;
            if (el.resistEnergyVal) el.resistEnergyVal.textContent = formatResist(energyLeft);
            refreshResistVisible();
            if (energyLeft > 0) ensureResistTick();
        },
        setCaptBattle(active, attacker, defender, attackerCount, defenderCount, timeSec, role) {
            vzpWanted = !!active;
            if (!vzpWanted) {
                stopVzpTick();
                refreshVzpVisible();
                return;
            }
            el.vzpDefName.textContent = (defender ? String(defender) : '—') + ' (' + Math.max(0, Number(defenderCount) || 0) + ')';
            el.vzpAtkName.textContent = (attacker ? String(attacker) : '—') + ' (' + Math.max(0, Number(attackerCount) || 0) + ')';
            el.vzpDefAlive.textContent = String(Math.max(0, Number(defenderCount) || 0));
            el.vzpAtkAlive.textContent = String(Math.max(0, Number(attackerCount) || 0));
            vzpSec = Math.max(0, Math.floor(Number(timeSec) || 0));
            el.vzpTimer.textContent = formatTimer(vzpSec);
            const r = String(role || '');
            el.vzpRole.textContent = (r === 'Защита' || r === 'defense') ? 'Защита' : 'Атака';
            refreshVzpVisible();
            if (chromeOn && styleNew) startVzpTick();
        },
        hideCaptBattle() {
            vzpWanted = false;
            stopVzpTick();
            refreshVzpVisible();
        },
        applyCrosshairJson(jsonStr) {
            if (!jsonStr || typeof jsonStr !== 'string') {
                resetCrosshair();
                return;
            }
            try {
                const arr = JSON.parse(jsonStr);
                if (!arr || !arr[0]) {
                    resetCrosshair();
                    return;
                }
                crosshair = arr[0];
                crosshairActive = crosshair.Type === 'Crosshair';
                if (!crosshairActive) crosshairVisible = false;
                paintCrosshair();
            } catch (_e) {
                resetCrosshair();
            }
        },
        setCrosshairVisible(v) {
            crosshairVisible = !!v;
            paintCrosshair();
        },
        setCrosshairTargetNear(v) {
            crosshairTargetNear = !!v;
            paintCrosshair();
        },
        setPathQuest(show, title, desc) {
            if (!el.pathQuest) return;
            if (show) {
                if (el.pathQuestTitle) el.pathQuestTitle.textContent = String(title || 'Начало пути');
                if (el.pathQuestDesc) el.pathQuestDesc.textContent = String(desc || '');
                el.pathQuest.classList.add('is-on');
            } else {
                el.pathQuest.classList.remove('is-on');
                try { el.pathQuest.style.removeProperty('display'); } catch (_eOff) {}
            }
            // Позиции всегда с клиента (hud.js) — здесь только дубль на случай старого кэша
            try {
                const stack = el.pathQuest.parentElement;
                if (stack) {
                    stack.style.setProperty('display', 'flex', 'important');
                    stack.style.setProperty('flex-direction', 'column', 'important');
                    stack.style.setProperty('align-items', 'flex-end', 'important');
                    stack.style.setProperty('gap', '16px', 'important');
                }
                if (el.caseBonus) {
                    el.caseBonus.style.setProperty('position', 'relative', 'important');
                    el.caseBonus.style.setProperty('top', 'auto', 'important');
                    el.caseBonus.style.setProperty('right', 'auto', 'important');
                    el.caseBonus.style.setProperty('transform', 'translateY(-15px)', 'important');
                }
                el.pathQuest.style.setProperty('position', 'relative', 'important');
                el.pathQuest.style.setProperty('top', 'auto', 'important');
                el.pathQuest.style.setProperty('left', 'auto', 'important');
                el.pathQuest.style.setProperty('right', 'auto', 'important');
                el.pathQuest.style.setProperty('margin', '0', 'important');
                el.pathQuest.style.setProperty('transform', 'translate(10px, 20px)', 'important');
                if (show) el.pathQuest.style.setProperty('display', 'flex', 'important');
            } catch (_ePos) {}
        },
        update(d) {
            if (!d) return;
            setSpeedDigits(d.speed);

            let gear = d.gear;
            if (gear == null || gear === '' || Number(gear) === 0) gear = 'N';
            else if (Number(gear) < 0) gear = 'R';
            else gear = String(Math.floor(Number(gear)));
            el.gearBadge.textContent = gear;

            const rpm = Math.max(0, Math.min(1, Number(d.rpm) || 0));
            if (el.rpmArc) el.rpmArc.style.strokeDashoffset = String(RPM_ARC_LEN * (1 - rpm));

            const fuelPct = Math.max(0, Math.min(100, Math.round(Number(d.fuelPct) || 0)));
            if (el.fuelPctVal) el.fuelPctVal.textContent = fuelPct + '%';
            const onSegs = Math.round((fuelPct / 100) * FUEL_SEGS);
            for (let i = 0; i < fuelSegNodes.length; i++) {
                fuelSegNodes[i].classList.toggle('is-on', i < onSegs);
            }

            const odo = Math.max(0, Math.floor(Number(d.odo) || 0));
            if (el.odoVal) el.odoVal.textContent = String(odo).padStart(6, '0');

            setIco(el.icoLock, !!d.locked, 'red');
            setIco(el.icoEngine, !!d.engine, 'green');
            setIco(el.icoCruise, !!d.cruise, 'green');
            setIco(el.icoBelt, !!d.belt, 'green');

            const turn = !!(d.turnL || d.turnR);
            setIco(el.icoTurn, turn, turn ? 'blink' : null);
        }
    };

    try {
        if (typeof mp !== 'undefined' && mp.trigger) {
            mp.trigger('hud_new:cef:ready');
        } else {
            // Превью в браузере (вне игры)
            document.documentElement.classList.add('hud2-preview');
            window.hudNew.setStyleNew(true);
            window.hudNew.setChrome(true);
            window.hudNew.updatePlayer('John Legion', 215, 215);
            window.hudNew.updateOnline(743);
            window.hudNew.updateMoney('15441425', '14375284');
            window.hudNew.updateWorldTime('20:11');
            window.hudNew.updateWorldDate('21.05');
            window.hudNew.updateLocation('Взлетная полоса 1', 'Международный аэропорт Лос Сантос', 180);
            window.hudNew.updateAmmo(17, 47, true);
            window.hudNew.FreeTimeCase(3600);
            window.hudNew.activateSpank(38);
            window.hudNew.activateAlco(109);
            window.hudNew.activateEnergy(60);
            window.hudNew.setVisible(true);
            window.hudNew.setMinimapLayout(0.015, 0.16, 0.98, 0.78);
            window.hudNew.update({
                speed: 254,
                gear: 3,
                rpm: 0.72,
                fuelPct: 89,
                odo: 3410,
                locked: true,
                engine: true,
                belt: true,
                cruise: false,
                turnL: false,
                turnR: false
            });
        }
    } catch (_e) {}
})();
