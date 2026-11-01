let hudMain = new Vue({
    el: "#hud",
    data: {
        isActive: false,
        isActiveSettings: true,
        isHelp: false,
        isMinimap: true,
        FreeCase: false,
        FreeCaseTime: "00:00",
        LuckyWheelReady: false,
        FreeSnow: false,
        FreeSnowTime: "00:30",
        serverName: 'LA PUERTA',
        online: 0,
        staticId: 0,
        playerLogin: '',
        projectName: 'FlowDM',
        projectSuffix: '.fun',
        serverLabel: '',
        time: "00:00",
        date: "00.00.0000",
        weekday: "",
        isAmmo: false,
        ammo: 0,
        maxAmmo: 0,
        street: "Los Santos",
        area: "",
        greenZone: false,
        isVehicle: false,
        speed: 0,
        engine: false,
        lock: false,
        money: 0,
        micro: false,
        minimapFix: 0,
        minimapBottomY: 0.993,
        /** Общий сдвиг нижних панелей HUD вниз (локация/патроны и блок справа) */
        hudBottomDrop: '0px',
        /** Панель ТС: топливо (л, оценка), ремень */
        vehFuelLiters: 0,
        vehSeatbelt: false,
        vehILight: -1,
        notifications: [],
        alerte: false,
        alertetext: "хз",
        isPhone: false,
        captBattleActive: false,
        captAttacker: "",
        captDefender: "",
        captAttackerCount: 0,
        captDefenderCount: 0,
        captPrepLeft: 0,
        captTimeLeft: "",
        captCanTeleport: false,
        captTeleportLeft: "",
        captBattleKind: 'capt',
        warAlerts: [],
        ygonQuest: null,
        _ygonQuestTimerId: null,
        newbieQuestsVisible: false,
        newbieQuestsUserEnabled: true,
        newbieQuestsTitle: 'Задания',
        newbieQuestsSubtitle: 'Выполняйте по порядку',
        newbieCurrent: null,
        newbieCurrentTitle: '',
        newbieCurrentDesc: '',
        newbieCurrentStep: 1,
        newbieQuestsCompleted: 0,
        newbieQuestsTotal: 12,
        newbieProgressMax: 0,
        newbieProgressPercent: 0,
        newbieProgressText: '',
        spankActive: false,
        alcoActive: false,
        spankTime: 0,
        alcoTime: 0,
        adminRaskurActive: false,
        adminRaskurTime: 0,
        adminRaskurDamageActive: false,
        adminRaskurDamageTime: 0,
        brawlSpeakers: [],
        groundPickupMeta: null,
        pickupQtyOpen: false,
        pickupQtyItemLabel: '',
        pickupQtyMax: 1,
        pickupQtyValue: 1,
        showKeyHints: false,
        keyHints: [],
        crosshair: null,
        crosshairActive: false,
        crosshairVisible: false,
        crosshairTargetNear: false,
        gameCounterSec: 0,
        _gameCounterTimerId: null,
        _gameCounterEndAt: 0
    },
    
    computed: {
        captWarTopVisible() {
            return this.captBattleActive === true;
        },
        minimapStackStyle() {
            const r = Number(this.minimapFix) || 0;
            const b = Number(this.minimapBottomY);
            const gap = 'clamp(6px, 1vmin, 16px)';
            const drop = this.hudBottomDrop || '0px';
            /** Низ колонки совпадает с низом миникарты (якорь из клиента), без доп. «подъёма». */
            const bottom =
                typeof b === 'number' && b > 0 && b <= 1
                    ? `calc((1 - ${b}) * 100vh + ${gap} - ${drop})`
                    : `calc(${gap} - ${drop})`;
            return {
                left: `calc(${r}% + ${gap})`,
                bottom,
                maxWidth: 'min(42vmin, 40vw, 320px)',
                pointerEvents: 'none'
            };
        },
        /** Низ колонки совпадает с низом миникарты (якорь из клиента). */
        extHudDownRightStyle() {
            const b = Number(this.minimapBottomY);
            const gap = 'clamp(6px, 1vmin, 16px)';
            const bottom =
                typeof b === 'number' && b > 0 && b <= 1
                    ? `calc((1 - ${b}) * 100vh + ${gap})`
                    : gap;
            return {
                bottom,
                pointerEvents: 'none'
            };
        },
        vehDoorsUnlocked() {
            return !this.lock;
        },
        vehDoorsLocked() {
            return !!this.lock;
        },
        vehDoorColor() {
            return this.vehDoorsLocked ? '#98B0EE' : '#BDFF00';
        },
        vehTurnLeftColor() {
            const il = Number(this.vehILight);
            return il === 0 || il === 2 ? '#BDFF00' : '#98B0EE';
        },
        vehTurnRightColor() {
            const il = Number(this.vehILight);
            return il === 1 || il === 2 ? '#BDFF00' : '#98B0EE';
        },
        ammoText() {
            const clip = Number(this.ammo);
            if (!Number.isFinite(clip) || clip <= 0) return '0';
            return String(Math.floor(clip));
        },
        /** DD.MM как в veprais (без года) */
        dateDisplay() {
            const d = this.normalizeHudDate(this.date);
            if (d) {
                const p = d.split('.');
                if (p.length >= 2) {
                    const day = String(p[0]).padStart(2, '0');
                    const mon = String(p[1]).padStart(2, '0');
                    if (day !== '00' || mon !== '00') return `${day}.${mon}`;
                }
            }
            const now = new Date();
            return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
        },
        timeFormatted() {
            return this.normalizeHudTime(this.time);
        },
        moneyFormatted() {
            const raw = this.money;
            if (raw === null || raw === undefined) return '0';
            const str = String(raw).trim();
            if (!str) return '0';
            const normalized = str.replace(/\s/g, '');
            if (/^\d[\d.]*$/.test(normalized)) {
                const compact = normalized.replace(/\./g, '');
                if (!/^\d+$/.test(compact)) return str;
                return compact.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            }
            return str;
        },
        locationPrimaryText() {
            const c = String(this.area || '').trim();
            const s = String(this.street || '').trim();
            if (c) return c;
            return s || '—';
        },
        /** Вторая строка — только если есть и район, и улица и они различаются */
        locationShowStreetLine() {
            const c = String(this.area || '').trim();
            const s = String(this.street || '').trim();
            return !!s && !!c && s !== c;
        },
        enterWrapStyle() {
            return { bottom: this.isHelp ? '12vh' : '11vh' };
        },
        enterHintText() {
            if (!this.alerte) return '';
            const raw = String(this.alertetext || '').trim();
            if (!raw) return 'Нажмите для взаимодействия';
            const map = {
                'начать забирать дроп': 'Забрать дроп',
                'продать машину': 'Продать машину'
            };
            const key = raw.toLowerCase();
            if (map[key]) return map[key];
            return this._cap(raw);
        },
        captBattleKindLabel() {
            return this.captBattleKind === 'bizwar' ? 'Капт' : 'Война семей';
        },
        captDisplayTime() {
            if (this.captPrepLeft > 0) {
                const s = Math.max(0, Math.floor(Number(this.captPrepLeft) || 0));
                const m = Math.floor(s / 60);
                const sec = s % 60;
                return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            }
            const t = String(this.captTimeLeft || '').trim();
            return t || '00:00';
        },
        /** Время разбито на отдельные цифры (для блочного таймера в стиле плашки). */
        captTimeDigits() {
            const t = String(this.captDisplayTime || '').trim();
            const digits = t.replace(/[^0-9]/g, '');
            return (digits || '0000').split('');
        },
        vehFuelNum() {
            if (!this.isVehicle) return '';
            const n = Number(this.vehFuelLiters);
            if (Number.isNaN(n)) return '—';
            return String(Math.max(0, Math.min(99, Math.floor(n))));
        },
        /** Панель ТС: тот же угол, что пеший HUD */
        hudVehicleBarStyle() {
            const b = Number(this.minimapBottomY);
            const gap = 'clamp(6px, 1vmin, 16px)';
            const bottom =
                typeof b === 'number' && b > 0 && b <= 1
                    ? `calc((1 - ${b}) * 100vh + ${gap})`
                    : gap;
            return {
                position: 'absolute',
                right: gap,
                left: 'auto',
                bottom,
                zIndex: 22,
                pointerEvents: 'none',
                maxWidth: 'min(96vw, 720px)',
                display: 'flex',
                justifyContent: 'flex-end'
            };
        },
        crosshairLineColorComputed() {
            if (!this.crosshair) return '#e8e8e8';
            if (this.crosshairTargetNear) return this.crosshair.TargetColor || '#ef4444';
            return this.crosshair.DefaultColor || '#e8e8e8';
        },
        chStyleVTop() {
            return this._chVertStyle(true);
        },
        chStyleVBot() {
            return this._chVertStyle(false);
        },
        chStyleHLeft() {
            return this._chHorizStyle(true);
        },
        chStyleHRight() {
            return this._chHorizStyle(false);
        },
        chStyleRoot() {
            const c = this.crosshair;
            if (!c) return {};
            const cd = Number(c.CenterDistance) || 0;
            return { gap: `${cd}px` };
        },
        chStyleMid() {
            const c = this.crosshair;
            if (!c) return {};
            const cd = Number(c.CenterDistance) || 0;
            return { gap: `${cd}px` };
        },
        crosshairCenterDotVisible() {
            const c = this.crosshair;
            if (!c) return false;
            const v = c.CenterPointVisible;
            return v === true || v === 1 || v === '1' || v === 'true';
        },
        chStyleDot() {
            const c = this.crosshair;
            if (!c) return {};
            let s = Number(c.CenterPointSize);
            if (!Number.isFinite(s) || s < 0) s = 0;
            if (this.crosshairCenterDotVisible && s < 1) s = 1;
            const pr = c.CenterPointRadius || 0;
            const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
            return {
                width: `${s}px`,
                height: `${s}px`,
                minWidth: `${s}px`,
                minHeight: `${s}px`,
                flexShrink: '0',
                opacity: op,
                background: this.crosshairLineColorComputed,
                borderRadius: `${pr}%`
            };
        }
    },

    mounted() {
        if (typeof mp === 'undefined') {
            document.documentElement.classList.add('hud-browser-preview');
            this.isActive = true;
            this.playerLogin = 'Player';
            this.staticId = 128;
            this.online = 256;
            this.time = '18:42';
            this.date = '01.07.2026';
            this.money = 1250000;
            this.street = 'Grove Street';
            this.area = 'Los Santos';
            this.isVehicle = true;
            this.speed = 87;
            this.engine = true;
            this.vehFuelLiters = 42;
            this.micro = true;
            this.isAmmo = true;
            this.ammo = 30;
            this.maxAmmo = 120;
            this.showKeyHints = true;
            this.keyHints = [
                { k: 'I', t: 'Инвентарь' },
                { k: 'B', t: 'Микрофон' },
                { k: 'T', t: 'Чат' }
            ];
            this.lock = false;
            this.vehILight = -1;
            this.minimapFix = 18;
            this.minimapBottomY = 0.993;
            this.FreeCase = true;
            this.LuckyWheelReady = false;
            this.FreeCaseTime = '04:22';
            this.FreeSnow = true;
            this.FreeSnowTime = '01:50';
            this.newbieQuestsVisible = true;
            this.newbieCurrent = { title: 'Первое задание', desc: 'Зайди в инвентарь и осмотри вещи' };
            this.newbieCurrentTitle = 'Первое задание';
            this.newbieCurrentDesc = 'Зайди в инвентарь и осмотри вещи';
            this.newbieProgressMax = 1;
            this.newbieProgressText = '0/1';
        }
        this._spankAlcoHudInterval = setInterval(() => {
            if (this.spankActive) {
                this.spankTime--;
                if (this.spankTime <= 0) {
                    this.spankActive = false;
                }
            }
            if (this.alcoActive) {
                this.alcoTime--;
                if (this.alcoTime <= 0) {
                    this.alcoActive = false;
                }
            }
            if (this.adminRaskurActive) {
                this.adminRaskurTime--;
                if (this.adminRaskurTime <= 0) {
                    this.adminRaskurActive = false;
                }
            }
            if (this.adminRaskurDamageActive) {
                this.adminRaskurDamageTime--;
                if (this.adminRaskurDamageTime <= 0) {
                    this.adminRaskurDamageActive = false;
                }
            }
        }, 1000);
    },
    beforeDestroy() {
        if (this._spankAlcoHudInterval) {
            clearInterval(this._spankAlcoHudInterval);
        }
    },
    methods: {
        _chVertStyle(top) {
            const c = this.crosshair;
            if (!c) return {};
            const wRaw = Number(c.Width);
            const hRaw = Number(c.Height);
            const w = Number.isFinite(wRaw) ? wRaw : 2;
            const h = Number.isFinite(hRaw) ? hRaw : 10;
            const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
            const r = c.CrosshairRadius || 0;
            const col = this.crosshairLineColorComputed;
            const br = top ? `${r}% ${r}% 0 0` : `0 0 ${r}% ${r}%`;
            const style = {
                width: `${w}px`,
                height: `${h}px`,
                minWidth: `${w}px`,
                minHeight: `${h}px`,
                opacity: op,
                background: col,
                borderRadius: br,
                flexShrink: '0'
            };
            if (h <= 0 || w <= 0) {
                style.display = 'none';
            }
            return style;
        },
        _chHorizStyle(left) {
            const c = this.crosshair;
            if (!c) return {};
            const wRaw = Number(c.Width);
            const hRaw = Number(c.Height);
            const w = Number.isFinite(wRaw) ? wRaw : 2;
            const h = Number.isFinite(hRaw) ? hRaw : 10;
            const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
            const r = c.CrosshairRadius || 0;
            const col = this.crosshairLineColorComputed;
            const br = left ? `${r}% 0 0 ${r}%` : `0 ${r}% ${r}% 0`;
            const style = {
                width: `${h}px`,
                height: `${w}px`,
                minWidth: `${h}px`,
                minHeight: `${w}px`,
                opacity: op,
                background: col,
                borderRadius: br,
                flexShrink: '0'
            };
            if (h <= 0 || w <= 0) {
                style.display = 'none';
            }
            return style;
        },
        applyCrosshairJson(jsonStr) {
            const keepVis = !!this.crosshairVisible;
            if (!jsonStr || typeof jsonStr !== 'string') {
                this.crosshair = null;
                this.crosshairActive = false;
                this.crosshairVisible = false;
                return;
            }
            try {
                const parsed = JSON.parse(jsonStr);
                let row = null;
                if (Array.isArray(parsed) && parsed[0]) row = parsed[0];
                else if (parsed && parsed.v === 2 && Array.isArray(parsed.phantom) && parsed.phantom[0]) {
                    row = parsed.phantom[0];
                }
                if (!row) {
                    this.crosshair = null;
                    this.crosshairActive = false;
                    this.crosshairVisible = false;
                    return;
                }
                // In-place update — меньше мерцания при превью слайдеров/цвета
                if (this.crosshair && this.crosshair.Type === row.Type) {
                    Object.assign(this.crosshair, row);
                } else {
                    this.crosshair = row;
                }
                this.crosshairActive = this.crosshair.Type === 'Crosshair';
                if (!this.crosshairActive) this.crosshairVisible = false;
                else if (keepVis) this.crosshairVisible = true;
            } catch (_e) {
                this.crosshair = null;
                this.crosshairActive = false;
                this.crosshairVisible = false;
            }
        },
        setCrosshairVisible(v) {
            this.crosshairVisible = !!v;
        },
        setCrosshairTargetNear(v) {
            this.crosshairTargetNear = !!v;
        },
        activateSpank(seconds) {
            this.spankActive = true;
            this.spankTime = (typeof seconds === 'number' && seconds > 0) ? Math.floor(seconds) : 60;
        },
        activateAlco(seconds) {
            this.alcoActive = true;
            this.alcoTime = (typeof seconds === 'number' && seconds > 0) ? Math.floor(seconds) : 120;
        },
        clearConsumableResists() {
            this.spankActive = false;
            this.alcoActive = false;
            this.spankTime = 0;
            this.alcoTime = 0;
        },
        activateAdminRaskur(seconds) {
            const sec = Math.max(0, Math.floor(Number(seconds) || 0));
            this.adminRaskurActive = sec > 0;
            this.adminRaskurTime = sec;
            this.adminRaskurDamageActive = sec > 0;
            this.adminRaskurDamageTime = sec;
        },
        setGroundPickupHint(jsonRaw) {
            let p = null;
            try {
                p = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
            } catch (_e) {
                p = null;
            }
            if (!p || !p.item) {
                this.groundPickupMeta = null;
                return;
            }
            this.groundPickupMeta = p;
        },
        clearGroundPickupHint() {
            this.groundPickupMeta = null;
            if (this.pickupQtyOpen) this.cancelPickupQty();
        },
        openPickupQtyModal() {
            const p = this.groundPickupMeta;
            if (!p || !p.needsQty) return;
            this.pickupQtyItemLabel = String(p.label || '');
            this.pickupQtyMax = Math.max(1, parseInt(p.qty, 10) || 1);
            this.pickupQtyValue = 1;
            this.pickupQtyOpen = true;
            try {
                if (typeof mp !== 'undefined') mp.trigger('pickupQty:cursor', true);
            } catch (_e) {}
            this.$nextTick(() => {
                const el = this.$el && this.$el.querySelector('.pickup-qty-input');
                if (el) el.focus();
            });
        },
        cancelPickupQty() {
            this.pickupQtyOpen = false;
            try {
                if (typeof mp !== 'undefined') mp.trigger('pickupQty:cursor', false);
            } catch (_e) {}
        },
        confirmPickupQty() {
            const max = Math.max(1, parseInt(this.pickupQtyMax, 10) || 1);
            let v = parseInt(this.pickupQtyValue, 10);
            if (!Number.isFinite(v) || v < 1) v = 1;
            if (v > max) v = max;
            this.pickupQtyOpen = false;
            try {
                if (typeof mp !== 'undefined') {
                    mp.trigger('pickupQty:cursor', false);
                    mp.trigger('pickupQty:confirm', v);
                }
            } catch (_e) {}
        },
        setBrawlSpeakers(arr) {
            if (typeof arr === 'string') {
                try {
                    arr = JSON.parse(arr);
                } catch (_e) {
                    arr = [];
                }
            }
            this.brawlSpeakers = Array.isArray(arr) ? arr : [];
        },
        setKeyHintsVisible(show) {
            this.showKeyHints = !!show;
        },
        setKeyHints(rows) {
            this.keyHints = Array.isArray(rows) ? rows : [];
        },
        isActivePhone(toogle) {
            this.isPhone = toogle;
        },
        isActiveMinimap(toogle) {
            this.isMinimap = toogle;
        },
        isActiveHud(toogle) {
            this.isActive = !!toogle;
        },
        isActiveHudSettings(toogle) {
            this.isActiveSettings = toogle;
        },
        formatTime(seconds) {
            const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            return `${mins}:${secs}`;
        },
        /** Секунды для спанка/алко: 1–9 без ведущего нуля; 10–99 как есть; 100–999 три цифры */
        formatConsumableSeconds(sec) {
            const n = Math.max(0, Math.floor(Number(sec) || 0));
            if (n >= 100) return String(Math.min(n, 999));
            return String(n);
        },
        formatLuckyWheelMinutes(totalMinutes) {
            const m = Math.max(0, Math.floor(Number(totalMinutes) || 0));
            const hrs = Math.floor(m / 60);
            const mins = m % 60;
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        },
        FreeTimeCase(time) {
            const minutes = Math.max(0, Math.floor(Number(time) || 0));
            this.LuckyWheelReady = minutes <= 0;
            this.FreeCase = true;
            this.FreeCaseTime = minutes <= 0 ? "00:00" : this.formatLuckyWheelMinutes(minutes);
        },
        FreeTimeSnow(time) {
            const sec = Math.max(0, Math.floor(Number(time) || 0));
            this.FreeSnow = sec > 0;
            this.FreeSnowTime = this.formatTime(sec);
        },
        setHelpVisibility(toggle) {
            this.isHelp = toggle;
        },
        isActiveHelp(toggle) {
            this.setHelpVisibility(toggle);
        },
        updateOnline(playersCount) {
            this.online = Number(playersCount) || 0;
        },
        updatePlayerId(_playerId, staticId, login) {
            this.staticId = staticId != null && staticId !== '' ? staticId : 0;
            if (login != null && String(login).trim() !== '') {
                this.playerLogin = String(login).trim();
            }
        },
        updateHudHeader(online, staticId) {
            this.online = Number(online) || 0;
            this.staticId = staticId != null && staticId !== '' ? staticId : 0;
        },
        updateWorldTime(worldTime) {
            const t = this.normalizeHudTime(worldTime);
            if (t === this.time) return;
            this.time = t;
        },
        updateWorldDate(worldDate) {
            const d = this.normalizeHudDate(worldDate);
            if (d === this.date) return;
            this.date = d;
            this.weekday = this.computeWeekdayFromRuDate(d);
        },
        normalizeHudTime(raw) {
            const s = String(raw == null ? '' : raw).trim();
            if (!s) return '00:00';
            const m = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(s);
            if (!m) return s;
            const hh = Math.min(23, Math.max(0, parseInt(m[1], 10) || 0));
            const mm = Math.min(59, Math.max(0, parseInt(m[2], 10) || 0));
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        },
        normalizeHudDate(raw) {
            const s = String(raw == null ? '' : raw).trim();
            if (!s) return '';
            const m = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/.exec(s);
            if (!m) return s;
            const day = String(Math.min(31, Math.max(1, parseInt(m[1], 10) || 1))).padStart(2, '0');
            const mon = String(Math.min(12, Math.max(1, parseInt(m[2], 10) || 1))).padStart(2, '0');
            const year = m[3] ? String(m[3]).padStart(4, '0') : '';
            return year ? `${day}.${mon}.${year}` : `${day}.${mon}`;
        },
        computeWeekdayFromRuDate(worldDate) {
            if (!worldDate || typeof worldDate !== 'string') return '';
            const parts = worldDate.split('.');
            if (parts.length !== 3) return '';
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return '';
            const dt = new Date(year, month, day);
            if (Number.isNaN(dt.getTime())) return '';
            const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
            return days[dt.getDay()];
        },
        isActiveAmmo(toogle) {
            this.isAmmo = toogle;
        },
        updateAmmo(weaponAmmo, weaponMaxAmmo) {
            this.ammo = weaponAmmo;
            this.maxAmmo = weaponMaxAmmo;
        },
        updateLocation(streetName, areaName) {
            this.street = String(streetName == null ? '' : streetName).trim();
            this.area = String(areaName == null ? '' : areaName).trim();
        },
        isActiveGreenZone(toogle) {
            this.greenZone = toogle;
        },
        isActiveVehicle(toogle, vehicleSpeed) {
            this.isVehicle = toogle;
            this.speed = vehicleSpeed;
            if (!toogle) {
                this.vehFuelLiters = 0;
                this.vehSeatbelt = false;
            }
        },
        syncVehicleHudState(fuelL, seatbeltOn, doorsLocked, iLight) {
            const f = parseInt(fuelL, 10);
            this.vehFuelLiters = Number.isNaN(f) ? 0 : f;
            this.vehSeatbelt = !!seatbeltOn;
            if (doorsLocked !== undefined && doorsLocked !== null) {
                this.lock = !!doorsLocked;
            }
            if (iLight !== undefined && iLight !== null) {
                const il = parseInt(iLight, 10);
                this.vehILight = Number.isNaN(il) ? -1 : il;
            }
        },
        updateVehicleEngine(toogle) {
            this.engine = toogle;
        },
        updateVehicleLock(toogle) {
            this.lock = toogle;
        },
        updateMoney(playerMoney) {
            this.money = playerMoney;
        },
        updateMicro(toogle) {
            this.micro = toogle;
        },
        updateE(_toogle, _text) {
            this.alerte = false;
            this.alertetext = '';
        },
        _cap(s) {
            if (!s) return '';
            return s.charAt(0).toUpperCase() + s.slice(1);
        },
        _normalizeWarFormatLabel(raw) {
            const s = String(raw || '').trim();
            if (!s) return '';
            let m = /^(\d+)x(\d+)$/i.exec(s);
            if (m && m[1] === m[2]) return `${m[1]}v${m[2]}`;
            m = /^(\d+)v(\d+)$/i.exec(s);
            if (m && m[1] === m[2]) return `${m[1]}v${m[2]}`;
            return s;
        },
        warAlertKindLabel(alert) {
            return alert && alert.kind === 'bizwar' ? 'ВОЙНА ЗА ТЕРРИТОРИЮ' : 'ВОЙНА СЕМЕЙ';
        },
        warAlertBody(alert) {
            if (!alert) return '';
            if (alert.kind === 'capt' && alert.role === 'attacker') {
                const enemy = String(alert.themName || 'противник');
                const pointMatch = String(alert.target || '').match(/\d+/);
                const pointId = pointMatch ? pointMatch[0] : '—';
                const start = new Date(Number(alert.fightStartAt) || Date.now());
                const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                const calibers = String(alert.calibers || '—')
                    .split(',')
                    .map((value) => {
                        const caliber = String(value || '').trim();
                        if (!caliber || caliber === '—') return caliber;
                        return /\smm$/i.test(caliber) ? caliber : `${caliber.replace(/mm$/i, '').trim()} mm`;
                    })
                    .filter(Boolean)
                    .join(', ');
                const format = this._normalizeWarFormatLabel(alert.format);
                return `Вы объявили войну семье «${enemy}». Точка №${pointId}, начало в ${time}, калибр: ${calibers}, ${alert.extras || 'Спанк, Алкоголь разрешены'}${format ? `, ${format}` : ''}`;
            }
            if (alert.kind === 'capt' && alert.role === 'defender') {
                const enemy = String(alert.themName || 'противник');
                const pointMatch = String(alert.target || '').match(/\d+/);
                const pointId = pointMatch ? pointMatch[0] : '—';
                const start = new Date(Number(alert.fightStartAt) || Date.now());
                const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                const calibers = String(alert.calibers || '—')
                    .split(',')
                    .map((value) => {
                        const caliber = String(value || '').trim();
                        if (!caliber || caliber === '—') return caliber;
                        return /\smm$/i.test(caliber) ? caliber : `${caliber.replace(/mm$/i, '').trim()} mm`;
                    })
                    .filter(Boolean)
                    .join(', ');
                const format = this._normalizeWarFormatLabel(alert.format);
                return `Семья «${enemy}» объявила вам войну. Точка №${pointId}, начало в ${time}, калибр: ${calibers}, ${alert.extras || 'Спанк, Алкоголь разрешены'}${format ? `, ${format}` : ''}`;
            }
            if (alert.text) return String(alert.text);
            return this.warAlertMessage(alert);
        },
        warAlertMessage(alert) {
            if (!alert) return '';
            const isBiz = alert.kind === 'bizwar';
            const kindWord = isBiz ? 'капт' : 'войну семей';
            const sideWord = isBiz ? 'фракция' : 'семья';
            const place = alert.target || (isBiz ? 'квадрат' : 'точка');
            const cal = alert.calibers || 'не указаны';
            const rules = alert.extras ? `. ${alert.extras}` : '';
            const fmt = this._normalizeWarFormatLabel(alert.format);
            const fmtPart = fmt ? ` · ${fmt}` : '';
            if (alert.role === 'defender') {
                const enemy = alert.themName || 'противник';
                return `${this._cap(sideWord)} «${enemy}» забила ${kindWord} (${place})${fmtPart}. Калибры: ${cal}${rules}`;
            }
            const enemy = alert.themName || 'противник';
            return `Ваша ${sideWord} забила ${kindWord} (${place}) против «${enemy}»${fmtPart}. Калибры: ${cal}${rules}`;
        },
        setWarAlert(payload) {
            let data = payload;
            if (typeof payload === 'string') {
                try { data = JSON.parse(payload); } catch (_e) { return; }
            }
            if (!data || typeof data !== 'object') return;
            const kind = data.kind === 'bizwar' ? 'bizwar' : 'capt';
            const role = data.role === 'attacker' ? 'attacker' : 'defender';
            const target = data.target || '';
            const id = `${kind}:${target || 'unknown'}`;
            const fightStartAt = Number(data.fightStartAt) || (Date.now() + (Number(data.prepSec) || 480) * 1000);
            const entry = {
                id,
                kind,
                role,
                usName: data.usName || '',
                themName: data.themName || '',
                calibers: data.calibers || '',
                extras: data.extras || '',
                text: data.text || '',
                target,
                fightStartAt,
                format: this._normalizeWarFormatLabel(data.format)
            };
            const idx = this.warAlerts.findIndex((a) => a.id === id);
            if (idx >= 0) {
                this.$set(this.warAlerts, idx, entry);
            } else {
                this.warAlerts.push(entry);
            }
        },
        clearWarAlert(kind) {
            const k = kind != null && String(kind).trim() !== '' ? String(kind).trim() : '';
            if (!k) {
                this.warAlerts = [];
            } else {
                this.warAlerts = this.warAlerts.filter((a) => a.kind !== k);
            }
        },
        setYgonQuest(payload) {
            let data = payload;
            if (typeof payload === 'string') {
                try { data = JSON.parse(payload); } catch (_e) { return; }
            }
            if (!data || typeof data !== 'object') return;
            if (data.show === false) {
                this.clearYgonQuest();
                return;
            }
            const body = String(data.body || '').trim();
            if (!body) {
                this.clearYgonQuest();
                return;
            }
            const timerSec = Math.max(0, Math.floor(Number(data.timerSec) || 0));
            const endsAt = timerSec > 0 ? Date.now() + timerSec * 1000 : 0;
            this.ygonQuest = {
                phase: String(data.phase || 'find'),
                body,
                endsAt,
                timerLine: ''
            };
            this._stopYgonQuestTimer();
            if (endsAt > Date.now()) {
                this._tickYgonQuestTimer();
                this._ygonQuestTimerId = setInterval(() => this._tickYgonQuestTimer(), 1000);
            }
        },
        clearYgonQuest() {
            this.ygonQuest = null;
            this._stopYgonQuestTimer();
        },
        refreshNewbieQuestsVisible() {
            if (this.newbieQuestsUserEnabled === false) {
                this.newbieQuestsVisible = false;
                return;
            }
            this.newbieQuestsVisible = !!(this.newbieCurrent && this.newbieQuestsCompleted < this.newbieQuestsTotal);
        },
        setNewbieQuestsUserEnabled(enabled) {
            this.newbieQuestsUserEnabled = enabled !== false;
            this.refreshNewbieQuestsVisible();
        },
        syncNewbieQuests(payload) {
            let p = payload;
            if (typeof p === 'string') {
                try { p = JSON.parse(p); } catch (_e) { return; }
            }
            if (!p || typeof p !== 'object') return;
            this.newbieQuestsTitle = p.title || 'Задания';
            this.newbieQuestsSubtitle = p.subtitle || 'Выполняйте по порядку';
            this.newbieQuestsCompleted = parseInt(p.completed, 10) || 0;
            this.newbieQuestsTotal = parseInt(p.total, 10) || 12;
            const cur = p.current && typeof p.current === 'object' ? p.current : null;
            this.newbieCurrent = cur;
            this.newbieCurrentTitle = cur ? String(cur.title || '') : '';
            this.newbieCurrentDesc = cur ? String(cur.desc || '') : '';
            this.newbieCurrentStep = cur ? (parseInt(cur.step, 10) || 1) : 1;
            if (cur && cur.target != null && cur.progress != null) {
                const max = Math.max(1, parseInt(cur.target, 10) || 1);
                const val = Math.max(0, parseInt(cur.progress, 10) || 0);
                this.newbieProgressMax = max;
                this.newbieProgressPercent = Math.min(100, Math.round((val / max) * 100));
                this.newbieProgressText = val + ' / ' + max;
            } else {
                this.newbieProgressMax = 0;
                this.newbieProgressPercent = 0;
                this.newbieProgressText = '';
            }
            this.refreshNewbieQuestsVisible();
        },
        _stopYgonQuestTimer() {
            if (this._ygonQuestTimerId) {
                clearInterval(this._ygonQuestTimerId);
                this._ygonQuestTimerId = null;
            }
        },
        _tickYgonQuestTimer() {
            if (!this.ygonQuest || !this.ygonQuest.endsAt) {
                this._stopYgonQuestTimer();
                return;
            }
            const left = Math.max(0, Math.floor((this.ygonQuest.endsAt - Date.now()) / 1000));
            if (left <= 0) {
                this.ygonQuest = { ...this.ygonQuest, timerLine: 'Задание отменяется...' };
                this._stopYgonQuestTimer();
                return;
            }
            const m = Math.floor(left / 60);
            const s = left % 60;
            this.ygonQuest = {
                ...this.ygonQuest,
                timerLine: `Вернитесь в машину: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            };
        },
        setCaptBattle(active, attacker, defender, attackerCount, defenderCount, prepLeft, timeLeft, canTeleport, teleportLeft, kind) {
            this.captBattleActive = !!active;
            this.captAttacker = attacker || "";
            this.captDefender = defender || "—";
            this.captAttackerCount = Number(attackerCount) || 0;
            this.captDefenderCount = Number(defenderCount) || 0;
            this.captPrepLeft = Number(prepLeft) || 0;
            this.captTimeLeft = timeLeft || "";
            this.captCanTeleport = !!canTeleport;
            this.captTeleportLeft = teleportLeft || "";
            if (kind === 'bizwar' || kind === 'capt') this.captBattleKind = kind;
        },
        _animateGameCounter() {
            this.$nextTick(() => {
                const el = this.$refs.gameCounterStart;
                if (!el || this.gameCounterSec <= 0) return;
                if (this._gameCounterLastAnimated === this.gameCounterSec) return;
                this._gameCounterLastAnimated = this.gameCounterSec;
                try {
                    el.animate(
                        [
                            { opacity: 0, transform: 'translate(-50%, -50%) scaleY(0.15)' },
                            { opacity: 1, transform: 'translate(-50%, -50%) scaleY(1)' }
                        ],
                        { duration: 300, easing: 'linear', fill: 'forwards' }
                    );
                } catch (_e) {}
            });
        },
        startGameCounterSec(sec) {
            const s = Math.max(0, Math.floor(Number(sec) || 0));
            this._gameCounterEndAt = Date.now() + s * 1000;
            this._gameCounterLastAnimated = null;
            this.gameCounterSec = s;
            if (this._gameCounterTimerId !== null) clearInterval(this._gameCounterTimerId);
            if (s <= 0) return;
            this._animateGameCounter();
            this._gameCounterTimerId = setInterval(() => {
                const left = Math.ceil((this._gameCounterEndAt - Date.now()) / 1000);
                if (left <= 0) {
                    this.gameCounterSec = 0;
                    if (this._gameCounterTimerId !== null) {
                        clearInterval(this._gameCounterTimerId);
                        this._gameCounterTimerId = null;
                    }
                    return;
                }
                this.gameCounterSec = left;
                this._animateGameCounter();
            }, 250);
        },
        stopGameCounter() {
            this.gameCounterSec = 0;
            if (this._gameCounterTimerId !== null) {
                clearInterval(this._gameCounterTimerId);
                this._gameCounterTimerId = null;
            }
        },
        hideCaptBattle() {
            this.captBattleActive = false;
        },
        setMinimapLayout(rightXPct, bottomY, _hudTopY) {
            const r = parseFloat(rightXPct);
            if (!Number.isNaN(r)) this.minimapFix = r;
            const b = parseFloat(bottomY);
            if (!Number.isNaN(b) && b > 0 && b <= 1) this.minimapBottomY = b;
        }
    }
});
