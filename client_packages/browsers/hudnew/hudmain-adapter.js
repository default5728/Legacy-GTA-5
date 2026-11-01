/**
 * Слой совместимости нового HUD.
 *
 * Клиентские скрипты (hud.js, keybinds.js, inventory.js, brawl_client.js) обращаются
 * к HUD строками вида `hudr.execute('hudMain.МЕТОД(...)')` — это API старого Vue-худа.
 * Новый HUD устроен иначе и отдаёт наружу `window.hudNew`, поэтому здесь объявляется
 * `window.hudMain`, который переводит старые вызовы в новые.
 *
 * Благодаря этому переключение версии HUD не требует правок в вызывающем коде.
 * Методы, которым в новом HUD не соответствует ни один элемент, намеренно пустые —
 * см. раздел «Нет аналога в новом HUD» внизу файла.
 */
(function () {
    var api = window.hudNew;
    if (!api) return;

    /** hudEstimateFuelLiters в hud.js масштабирует бак до 65 «литров». */
    var FUEL_TANK_LITERS = 65;

    var hudOn = false;
    var phoneOn = false;
    var minimapOn = true;

    /* Патроны: старый API разносит количество и «оружие в руках» по разным
       вызовам, новый ждёт оба значения в одном. Держим последнее состояние. */
    var ammoClip = 0;
    var ammoTotal = 0;
    var ammoArmed = false;

    /* Спидометр: старый API присылает поля по одному, новый — пакетом. */
    var vehVisible = false;
    var veh = {
        speed: 0,
        gear: 0,
        rpm: 0,
        fuelPct: 0,
        odo: 0,
        locked: true,
        engine: false,
        belt: false,
        cruise: false,
        turnL: false,
        turnR: false
    };

    /* Задания «Начало пути»: видимость зависит и от данных, и от настройки игрока. */
    var questEnabled = true;
    var questShow = false;
    var questTitle = '';
    var questDesc = '';

    function num(v, def) {
        var n = Number(v);
        return isFinite(n) ? n : (def || 0);
    }

    function bool(v) {
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    function chromeEffective() {
        return hudOn && !phoneOn;
    }

    /** В старом HUD настройка «Скрытие миникарты» убирала блоки, привязанные к радару. */
    function applyMinimapGate() {
        var on = chromeEffective() && minimapOn;
        var ids = ['minimapStack', 'streetBar'];
        for (var i = 0; i < ids.length; i++) {
            var node = document.getElementById(ids[i]);
            if (node) node.classList.toggle('is-on', on);
        }
    }

    /** setChrome внутри пере-раскрывает блоки, поэтому гейт миникарты применяем после. */
    function applyChrome() {
        api.setChrome(chromeEffective());
        if (!chromeEffective()) api.setVisible(false);
        else if (vehVisible) api.setVisible(true);
        applyMinimapGate();
    }

    function pushVehicle() {
        if (!vehVisible) return;
        api.update(veh);
    }

    function pushAmmo() {
        api.updateAmmo(ammoClip, ammoTotal, ammoArmed);
    }

    function pushQuest() {
        var show = questShow && questEnabled;
        api.setPathQuest(show, questTitle, questDesc);
    }

    function noop() {}

    window.hudMain = {
        /* ——— общая видимость ——— */
        isActiveHud: function (v) {
            hudOn = bool(v);
            applyChrome();
        },
        isActivePhone: function (v) {
            /* В старом HUD телефон скрывал весь худ: v-if="isActive && !isPhone". */
            phoneOn = bool(v);
            applyChrome();
        },
        isActiveMinimap: function (v) {
            minimapOn = bool(v);
            applyMinimapGate();
        },
        isActiveGreenZone: function (v) {
            api.isActiveGreenZone(bool(v));
        },

        /* ——— шапка ——— */
        updatePlayerId: function (_playerId, staticId, login) {
            /* Старый HUD игнорировал первый аргумент, id брался из static. */
            api.updatePlayer(login, staticId, '');
        },
        updateOnline: function (n) {
            api.updateOnline(num(n, 0));
        },
        updateWorldTime: function (t) {
            api.updateWorldTime(t);
        },
        updateWorldDate: function (d) {
            api.updateWorldDate(d);
        },
        updateMoney: function (m) {
            api.updateMoney(m);
        },
        updateMicro: function (v) {
            api.updateMicro(bool(v));
        },

        /* ——— положение относительно радара ——— */
        setMinimapLayout: function (rightXPct, bottomY, hudTopY, leftXPct) {
            /* Старый HUD принимал правую границу в процентах; новый ждёт доли 0..1
               и дополнительно левую границу (её hud.js дописывает четвёртым аргументом). */
            api.setMinimapLayout(num(leftXPct, 0) / 100, num(rightXPct, 0) / 100, num(bottomY, 0), num(hudTopY, 0));
            applyMinimapGate();
        },
        updateLocation: function (streetName, areaName, heading) {
            api.updateLocation(streetName, areaName, heading);
        },

        /* ——— патроны ——— */
        isActiveAmmo: function (v) {
            ammoArmed = bool(v);
            pushAmmo();
        },
        updateAmmo: function (clip, max) {
            ammoClip = num(clip, 0);
            ammoTotal = num(max, 0);
            pushAmmo();
        },
        showgun: function (v) {
            ammoArmed = v === undefined ? true : bool(v);
            pushAmmo();
        },

        /* ——— транспорт ——— */
        isActiveVehicle: function (v, vehicleSpeed, rpm, gear) {
            vehVisible = bool(v);
            if (!vehVisible) {
                veh.fuelPct = 0;
                veh.belt = false;
                api.setVisible(false);
                return;
            }
            veh.speed = num(vehicleSpeed, 0);
            if (rpm !== undefined) veh.rpm = num(rpm, 0);
            if (gear !== undefined) veh.gear = num(gear, 0);
            api.setVisible(true);
            pushVehicle();
        },
        updateVehicleEngine: function (v) {
            veh.engine = bool(v);
            pushVehicle();
        },
        updateVehicleLock: function (v) {
            veh.locked = bool(v);
            pushVehicle();
        },
        syncVehicleHudState: function (fuelL, seatbeltOn, doorsLocked, iLight) {
            var liters = Math.max(0, num(fuelL, 0));
            veh.fuelPct = Math.max(0, Math.min(100, Math.round((liters / FUEL_TANK_LITERS) * 100)));
            veh.belt = bool(seatbeltOn);
            if (doorsLocked !== undefined && doorsLocked !== null) veh.locked = bool(doorsLocked);
            if (iLight !== undefined && iLight !== null) {
                /* Битовое поле поворотников GTA: 1 — левый, 2 — правый. */
                var il = num(iLight, 0);
                veh.turnL = (il & 1) === 1;
                veh.turnR = (il & 2) === 2;
            }
            pushVehicle();
        },

        /* ——— резисты и кейс ——— */
        activateSpank: function (sec) {
            api.activateSpank(num(sec, 0));
        },
        activateAlco: function (sec) {
            api.activateAlco(num(sec, 0));
        },
        clearConsumableResists: function () {
            api.activateSpank(0);
            api.activateAlco(0);
            api.activateEnergy(0);
        },
        FreeTimeCase: function (minutes) {
            /* Старый HUD принимал МИНУТЫ, новый считает в СЕКУНДАХ. */
            api.FreeTimeCase(Math.max(0, Math.floor(num(minutes, 0))) * 60);
        },

        /* ——— задания «Начало пути» ——— */
        syncNewbieQuests: function (payload) {
            var p = payload;
            if (typeof p === 'string') {
                try { p = JSON.parse(p); } catch (_e) { return; }
            }
            if (!p || typeof p !== 'object') return;
            var cur = p.current && typeof p.current === 'object' ? p.current : null;
            var completed = parseInt(p.completed, 10) || 0;
            var total = parseInt(p.total, 10) || 12;
            questShow = !!(cur && completed < total);
            questTitle = cur ? String(cur.title || '') : '';
            questDesc = cur ? String(cur.desc || '') : '';
            if (cur && cur.target != null && cur.progress != null) {
                var max = Math.max(1, parseInt(cur.target, 10) || 1);
                var val = Math.max(0, parseInt(cur.progress, 10) || 0);
                questDesc = (questDesc ? questDesc + ' — ' : '') + val + ' / ' + max;
            }
            pushQuest();
        },
        setNewbieQuestsUserEnabled: function (v) {
            questEnabled = v !== false;
            pushQuest();
        },

        /* ——— захват ——— */
        hideCaptBattle: function () {
            api.hideCaptBattle();
        },

        applyCrosshairJson: function (jsonStr) {
            api.applyCrosshairJson(jsonStr);
        },
        setCrosshairVisible: function (v) {
            api.setCrosshairVisible(v);
        },
        setCrosshairTargetNear: function (v) {
            api.setCrosshairTargetNear(v);
        },

        /*
         * Нет аналога в новом HUD — вызовы принимаются и игнорируются,
         * чтобы клиентский код не падал:
         *   isActiveHelp / updateE      — блок подсказки действия
         *   setKeyHints*                — список подсказок клавиш
         *   setWarAlert / clearWarAlert — оповещения о войне
         *   setYgonQuest / clearYgon…   — задания Югона
         *   setGroundPickupHint и др.   — подсказка подбора предмета
         *   setBrawlSpeakers            — говорящие в рации
         *   startGameCounterSec и др.   — центральный отсчёт перед захватом
         *   FreeTimeSnow                — таймер снежного ивента
         *   activateAdminRaskur         — резист «раскур»
         */
        isActiveHelp: noop,
        setHelpVisibility: noop,
        updateE: noop,
        setKeyHints: noop,
        setKeyHintsVisible: noop,
        setWarAlert: noop,
        clearWarAlert: noop,
        setYgonQuest: noop,
        clearYgonQuest: noop,
        setGroundPickupHint: noop,
        clearGroundPickupHint: noop,
        setBrawlSpeakers: noop,
        startGameCounterSec: noop,
        stopGameCounter: noop,
        FreeTimeSnow: noop,
        activateAdminRaskur: noop,
        isActiveHudSettings: noop,
        setMpTimerOverlayActive: noop,
        updateHudHeader: function (online, staticId) {
            api.updateOnline(num(online, 0));
            api.updatePlayer('', staticId, '');
        }
    };

    /* Новый HUD показывает блоки только при включённом «стиле». */
    api.setStyleNew(true);
})();
