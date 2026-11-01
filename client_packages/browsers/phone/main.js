const PHONE_ANIM_CLOSE_MS = 380;

/**
 * Подписи для моделей (совпадают с /givecar и донатом). Остальные ключи из БД — humanize.
 */
const CAR_DISPLAY_NAMES = {
    deluxo: 'Deluxo',
    oppressor: 'Oppressor Mk1',
    oppressor2: 'Oppressor Mk2',
    cullinan: 'Rolls Cullinan',
    gemera: 'Koenigsegg Gemera',
    g63: 'Mercedes G63',
    '2021ladaraven': 'Lada Raven 2021',
    avtr: 'Mercedes AVTR',
    vclass: 'Mercedes V-Class',
    asvjneon: 'Lamborghini SVJ Neon',
    terzo: 'Pegassi Terzo / Zero',
    banana: 'Banana',
    bmwm5f90: 'BMW M5 F90',
    bentayga: 'Bentley Bentayga',
    insurgent2: 'Insurgent',
    scarab3: 'Scarab',
    shotaro: 'Shotaro',
    wastelander: 'Wastelander',
    frogger2: 'FIB Helicopter',
    frogger: 'Frogger',
    havok: 'Havok',
    elicottero: 'Elicottero Neon',
    bbolide: 'Bugatti Bolide',
    panamera18: 'Panamera Turbo S',
    buzzard2: 'Buzzard',
    monster: 'Monster Truck',
    zr3802: 'ZR380 Future Shock',
    revolter: 'Revolter',
    r35: 'Nissan GT-R',
    taycan: 'Porsche Taycan',
    toros: 'Toros',
    huracan: 'Lamborghini Huracan',
    '811': 'Pfister 811',
    gt63s: 'Mercedes GT63S',
    gp1: 'GP-1',
    chiron17: 'Bugatti Chiron 17',
    '2020rs7': 'Audi RS 7',
    '2022c63': 'Mercedes-AMG C63 2022',
    audiq8: 'Audi Q8',
    audisport: 'Audi Sport',
    lada2107: 'Lada 2107',
    sian: 'Lamborghini Sian',
    Sian: 'Lamborghini Sian',
    rmodsian: 'Lamborghini Sian',
    bmwe70: 'BMW E70',
    i8: 'BMW i8',
    '812superfast': 'Ferrari 812 Superfast',
    '2019m5': 'BMW M5',
    agerars: 'Koenigsegg Agera RS',
    alphard: 'Toyota Alphard',
    amgone1: 'Mercedes-AMG ONE',
    astondb11: 'Aston Martin DB11',
    battista: 'Pininfarina Battista',
    bmwix: 'BMW iX',
    fera458: 'Ferrari 458',
    tourbillon: 'Bugatti Tourbillon',
    valkyriespider: 'Aston Martin Valkyrie Spider',
    divo: 'Bugatti Divo',
    exp100: 'Lotus EXP 100'
};

const CASE_IMG_BASE = 'package://browsers/menunew/img/';
const CAR_CASE_IMAGE = {
    avtr: 'boxes/bronze_case/avtr.png',
    g63: 'boxes/gold_case/prize_1.png',
    '2021ladaraven': 'car/2021ladaraven.png',
    panamera18: 'boxes/platinum_case/prize_5.png',
    cullinan: 'boxes/gold_case/prize_7.png',
    gemera: 'boxes/platinum_case/prize_3.png',
    vclass: 'boxes/gold_case/prize_7.png',
    asvjneon: 'boxes/platinum_case/prize_3.png',
    terzo: 'boxes/platinum_case/prize_6.png',
    banana: 'boxes/platinum_case/prize_10.png',
    bmwm5f90: 'boxes/platinum_case/prize_9.png',
    bentayga: 'boxes/gold_case/prize_5.png',
    bbolide: 'boxes/platinum_case/prize_3.png',
    deluxo: 'boxes/platinum_case/prize_6.png',
    oppressor: 'boxes/silver_case/prize_8.png',
    oppressor2: 'boxes/silver_case/prize_8.png',
    insurgent2: 'boxes/silver_case/prize_4.png',
    scarab3: 'boxes/gold_case/prize_7.png',
    shotaro: 'boxes/platinum_case/prize_10.png',
    wastelander: 'boxes/gold_case/prize_7.png',
    monster: 'boxes/gold_case/prize_7.png',
    zr3802: 'boxes/platinum_case/prize_1.png',
    frogger2: 'boxes/platinum_case/prize_8.png',
    frogger: 'boxes/platinum_case/prize_8.png',
    buzzard2: 'boxes/platinum_case/prize_8.png',
    havok: 'boxes/platinum_case/prize_8.png',
    elicottero: 'boxes/platinum_case/prize_3.png',
    revolter: 'boxes/silver_case/prize_8.png',
    r35: 'boxes/silver_case/prize_9.png',
    taycan: 'boxes/gold_case/prize_5.png',
    toros: 'boxes/gold_case/prize_7.png',
    huracan: 'boxes/platinum_case/prize_3.png',
    '811': 'boxes/platinum_case/prize_6.png',
    gt63s: 'boxes/platinum_case/prize_9.png',
    gp1: 'boxes/platinum_case/prize_10.png'
};

function humanizeCarKey(key) {
    if (!key || typeof key !== 'string') return 'Транспорт';
    const k = key.trim();
    if (!k) return 'Транспорт';
    return k
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

let phoneMain = new Vue({
    el: '#phone',
    data: {
        isActive: false,
        isClosing: false,
        currentApp: 'home',
        navDirection: 'forward',
        time: '00:00',
        carSearch: '',
        filteredCars: [],
        serverClockHour: null,
        serverClockMinute: null,
        serverClockSyncedAt: 0,
        homeApps: [
            { id: 'bank', name: 'Банк', short: '$' },
            { id: 'arena', name: 'Арена', short: '⚔' },
            { id: 'brawl', name: 'Бравл', short: 'Б' },
            { id: 'cars', name: 'Авто', short: '🚗' },
            { id: 'moonvito', name: 'MoonVito', short: 'MV' }
        ],
        dockApps: [
            { id: 'bank', name: 'Банк', short: '$' },
            { id: 'cars', name: 'Авто', short: '🚗' }
        ],
        bankData: {
            cash: 0,
            hasFamily: false,
            hasFraction: false,
            familyName: '',
            fractionId: 0,
            transferStatic: '',
            transferAmount: '',
            familyAmount: '',
            fractionAmount: '',
            epsilonDonated: 0,
            epsilonGoal: 5000000,
            epsilonUnlocked: false,
            epsilonAmount: '',
            mode: 'transfer'
        },
        brawlScreen: 'hub',
        brawlData: null,
        brawlGateName: '',
        brawlGatePwd: '',
        brawlSearch: '',
        brawlPwdChannel: '',
        brawlMaxInput: 0,
        brawlSpeakers: [],
        brawlNavDirection: 'forward',
        brawlListenGlobal: 100,
        brawlMemberListen: {},
        moonvito: {
            tab: 'market',
            category: 'all',
            search: '',
            listings: [],
            inventory: [],
            minPrice: 100000,
            maxPrice: 100000000,
            myStatic: 0,
            sellPrice: '',
            sellInvIndex: null,
            loading: false
        }
    },
    computed: {
        phoneVisible() {
            return this.isActive || this.isClosing;
        },
        sortedCarNames() {
            return this.filteredCars.slice().sort((a, b) => {
                const nameA = Object.values(a)[0].toLowerCase();
                const nameB = Object.values(b)[0].toLowerCase();
                return nameA.localeCompare(nameB);
            });
        },
        carsFiltered() {
            const q = (this.carSearch || '').toLowerCase().trim();
            if (!q) return this.sortedCarNames;
            return this.sortedCarNames.filter((car) =>
                Object.values(car)[0].toLowerCase().indexOf(q) >= 0
            );
        },
        brawlMembersFiltered() {
            if (!this.brawlData || !this.brawlData.members) return [];
            const q = (this.brawlSearch || '').toLowerCase().trim();
            const arr = this.brawlData.members.slice();
            if (!q) return arr;
            return arr.filter((m) => (m.login || '').toLowerCase().indexOf(q) >= 0);
        },
        brawlIsOwner() {
            if (!this.brawlData || this.brawlData.myStatic == null) return false;
            return Number(this.brawlData.ownerStatic) === Number(this.brawlData.myStatic);
        },
        brawlIsMod() {
            if (!this.brawlData || this.brawlData.myStatic == null) return false;
            const me = this.brawlData.members.find(
                (x) => Number(x.static) === Number(this.brawlData.myStatic)
            );
            return this.brawlIsOwner || (me && me.assistant);
        },
        brawlLcdChannel() {
            if (this.brawlScreen === 'settings') return 'SET';
            if (this.brawlData && this.brawlData.name) {
                return String(this.brawlData.name).toUpperCase().slice(0, 14);
            }
            return 'OFF';
        },
        brawlLcdHint() {
            if (this.brawlScreen === 'settings') return 'CFG';
            if (this.brawlScreen === 'channel' && this.brawlData) return '—';
            return 'READY';
        },
        appTitle() {
            const titles = {
                bank: 'Банк',
                cars: 'Транспорт',
                brawl: (() => {
                    if (this.brawlScreen === 'settings') return 'Настройки';
                    if (this.brawlData && this.brawlScreen === 'channel') {
                        const count = (this.brawlData.members || []).length;
                        return `${this.brawlData.name} · ${count}`;
                    }
                    return 'Бравл';
                })(),
                arena: 'Арена',
                moonvito: 'MoonVito'
            };
            return titles[this.currentApp] || '';
        },
        viewTransitionName() {
            return this.navDirection === 'back' ? 'np-view-back' : 'np-view-forward';
        },
        brawlTransitionName() {
            return this.brawlNavDirection === 'back' ? 'np-brawl-back' : 'np-brawl-forward';
        },
        bankEpsilonProgress() {
            const goal = parseInt(this.bankData.epsilonGoal, 10) || 1;
            const donated = parseInt(this.bankData.epsilonDonated, 10) || 0;
            return Math.min(100, Math.max(0, Math.round((donated / goal) * 100)));
        },
        moonvitoListingsFiltered() {
            const q = (this.moonvito.search || '').toLowerCase().trim();
            const cat = this.moonvito.category || 'all';
            return (this.moonvito.listings || []).filter((row) => {
                if (cat !== 'all' && row.category !== cat) return false;
                if (!q) return true;
                const hay = ((row.label || '') + ' ' + (row.name || '')).toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        },
        moonvitoMyListings() {
            return (this.moonvito.listings || []).filter((row) => !!row.mine);
        },
        moonvitoInventoryFiltered() {
            const q = (this.moonvito.search || '').toLowerCase().trim();
            const cat = this.moonvito.category || 'all';
            return (this.moonvito.inventory || []).filter((row) => {
                if (cat !== 'all' && row.category !== cat) return false;
                if (!q) return true;
                const hay = ((row.label || '') + ' ' + (row.name || '')).toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
    },
    watch: {
        isActive(val) {
            if (!val) this.currentApp = 'home';
        }
    },
    mounted() {
        this.updateTime();
        setInterval(this.updateTime, 1000);
        this.bindPhoneInputFocus();
    },
    beforeDestroy() {
        if (this._onPhoneFocusIn) {
            document.removeEventListener('focusin', this._onPhoneFocusIn);
            document.removeEventListener('focusout', this._onPhoneFocusOut);
        }
        if (this._onPhoneKeyDown) {
            document.removeEventListener('keydown', this._onPhoneKeyDown);
        }
        if (this._onPhoneMouseDown) {
            document.removeEventListener('mousedown', this._onPhoneMouseDown, true);
        }
    },
    methods: {
        isTextInput(el) {
            if (!el) return false;
            if (el.tagName === 'TEXTAREA') return true;
            if (el.tagName !== 'INPUT') return false;
            const type = String(el.type || 'text').toLowerCase();
            return type !== 'checkbox' && type !== 'range' && type !== 'button' && type !== 'submit' && type !== 'radio';
        },
        syncPhoneInputFocus() {
            const focused = this.isTextInput(document.activeElement);
            try { mp.trigger('phone:inputFocus:CLIENT', focused); } catch (_e) {}
        },
        bindPhoneInputFocus() {
            if (this._phoneFocusBound) return;
            this._phoneFocusBound = true;
            this._onPhoneFocusIn = (e) => {
                const el = e.target;
                if (el && el.closest && el.closest('#phone') && this.shouldBlurPhoneFocus(el)) {
                    requestAnimationFrame(() => {
                        if (document.activeElement === el) el.blur();
                    });
                }
                this.syncPhoneInputFocus();
            };
            this._onPhoneFocusOut = () => setTimeout(() => this.syncPhoneInputFocus(), 0);
            this._onPhoneMouseDown = (e) => {
                if (!this.isActive || this.isClosing) return;
                const el = e.target;
                if (!el || !el.closest || !el.closest('#phone')) return;
                if (this.shouldBlurPhoneFocus(el)) e.preventDefault();
            };
            this._onPhoneKeyDown = (e) => {
                if (!this.isActive || this.isClosing) return;
                if (e.key === 'Tab' || e.keyCode === 9) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (document.activeElement && this.shouldBlurPhoneFocus(document.activeElement)) {
                        document.activeElement.blur();
                    }
                    return;
                }
                if (e.key !== 'Backspace' && e.keyCode !== 8) return;
                if (this.handleBackspace(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            };
            document.addEventListener('focusin', this._onPhoneFocusIn);
            document.addEventListener('focusout', this._onPhoneFocusOut);
            document.addEventListener('mousedown', this._onPhoneMouseDown, true);
            document.addEventListener('keydown', this._onPhoneKeyDown);
        },
        shouldBlurPhoneFocus(el) {
            if (!el) return false;
            if (this.isTextInput(el)) return false;
            const tag = el.tagName;
            if (tag === 'BUTTON') return true;
            if (tag === 'INPUT') {
                const type = String(el.type || '').toLowerCase();
                if (type === 'range') return false;
                if (type === 'checkbox' && el.closest && el.closest('.np-switch')) return false;
                return type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit';
            }
            if (el.getAttribute && el.getAttribute('role') === 'tab') return true;
            return false;
        },
        blurPhoneFocus() {
            const el = document.activeElement;
            if (el && el !== document.body && el.closest && el.closest('#phone') && this.shouldBlurPhoneFocus(el)) {
                el.blur();
            }
        },
        appIcon(id) {
            const map = {
                bank: 'img/icon-bank.svg',
                fraction: 'img/crew.svg',
                cars: 'img/icon-cars.svg',
                brawl: 'img/crew.svg',
                arena: 'img/icon-arena.svg',
                moonvito: 'img/icon-moonvito.svg'
            };
            return map[id] || null;
        },
        getClockDate() {
            if (this.serverClockSyncedAt > 0 && this.serverClockHour != null) {
                const elapsedMs = Date.now() - this.serverClockSyncedAt;
                const d = new Date();
                d.setHours(Number(this.serverClockHour) || 0);
                d.setMinutes(Number(this.serverClockMinute) || 0);
                d.setSeconds(0);
                d.setMilliseconds(0);
                d.setTime(d.getTime() + elapsedMs);
                return d;
            }
            return new Date();
        },
        updateTime() {
            const d = this.getClockDate();
            this.time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        },
        openShell() {
            this.isClosing = false;
            this.isActive = true;
            this.navDirection = 'forward';
            this.currentApp = 'home';
            this.updateTime();
            this.blurPhoneFocus();
            try { mp.trigger('phone:inputFocus:CLIENT', false); } catch (_e) {}
        },
        closeAnimated() {
            if (!this.isActive || this.isClosing) return;
            this.isClosing = true;
            try { mp.trigger('phone:inputFocus:CLIENT', false); } catch (_e) {}
            setTimeout(() => {
                this.isActive = false;
                this.isClosing = false;
                this.currentApp = 'home';
                this.brawlScreen = this.brawlData ? 'channel' : 'hub';
                try { mp.trigger('phone:hideAnimDone'); } catch (_e) {}
            }, PHONE_ANIM_CLOSE_MS);
        },
        openApp(id) {
            if (id === 'arena') {
                try { mp.trigger('phone:arena:open:CLIENT'); } catch (_eArena) {}
                return;
            }
            if (id === 'brawl') {
                this.brawlNavDirection = 'forward';
                this.brawlScreen = this.brawlData ? 'channel' : 'hub';
            }
            if (id === 'bank') {
                this.bankData.mode = 'transfer';
                try { mp.trigger('phone:bank:open:CLIENT'); } catch (_e) {}
            }
            if (id === 'moonvito') {
                try { mp.trigger('phone:moonvito:open:CLIENT'); } catch (_eMv) {}
                return;
            }
            this.navDirection = 'forward';
            this.currentApp = id;
            this.blurPhoneFocus();
        },
        goHome() {
            if (this.currentApp === 'home') return;
            this.navDirection = 'back';
            this.currentApp = 'home';
            if (this.brawlScreen === 'settings') this.brawlBackFromSettings();
            this.blurPhoneFocus();
        },
        brawlOpenSettings() {
            this.brawlNavDirection = 'forward';
            this.brawlScreen = 'settings';
        },
        brawlBackFromSettings() {
            this.brawlNavDirection = 'back';
            this.brawlScreen = 'channel';
        },
        handleBackspace(e) {
            if (!this.isActive || this.isClosing) return false;
            if (this.isTextInput(document.activeElement)) return false;
            if (e && e.repeat && this.currentApp === 'home') return true;

            if (this.currentApp === 'brawl' && this.brawlScreen === 'settings') {
                this.brawlBackFromSettings();
                return true;
            }
            if (this.currentApp !== 'home') {
                this.goHome();
                return true;
            }
            try { mp.trigger('phone:close:BACKSPACE'); } catch (_e) {}
            return true;
        },
        setServerClock(payload) {
            let data = payload;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (_e) { return; }
            }
            if (!data || typeof data !== 'object') return;
            const h = Number(data.hour);
            const m = Number(data.minute);
            if (!Number.isFinite(h) || !Number.isFinite(m)) return;
            this.serverClockHour = h;
            this.serverClockMinute = m;
            this.serverClockSyncedAt = Date.now();
            this.updateTime();
        },
        deleteCars() {
            this.filteredCars = [];
        },
        brawlSync(data) {
            if (data == null || data === '') {
                this.brawlData = null;
                this.brawlScreen = 'hub';
                this.brawlSpeakers = [];
                this.brawlListenGlobal = 100;
                this.brawlMemberListen = {};
                return;
            }
            try {
                const raw = typeof data === 'string' ? JSON.parse(data) : data;
                if (!raw || typeof raw !== 'object') {
                    this.brawlData = null;
                    this.brawlScreen = 'hub';
                    return;
                }
                const prevScreen = this.brawlScreen;
                const prevGlobal = this.brawlListenGlobal;
                const prevMemberListen = { ...this.brawlMemberListen };
                this.brawlData = raw;
                if (!this.brawlData.members) this.$set(this.brawlData, 'members', []);
                this.$set(this.brawlData, 'globalVol', prevGlobal);
                this.brawlData.members.forEach((m) => {
                    const st = Number(m.static);
                    let vol = prevMemberListen[st] != null ? prevMemberListen[st] : (Number(m.volume) || 100);
                    vol = Math.max(0, Math.min(125, vol));
                    this.$set(m, 'volume', vol);
                    this.$set(this.brawlMemberListen, st, vol);
                });
                if (this.brawlData.maxMembers != null) this.brawlMaxInput = this.brawlData.maxMembers;
                const my = Number(this.brawlData.myStatic);
                const owner = Number(this.brawlData.ownerStatic);
                if (prevScreen === 'settings' && my === owner) {
                    this.brawlScreen = 'settings';
                } else {
                    this.brawlScreen = 'channel';
                }
                if (this.isActive && this.currentApp !== 'brawl') {
                    /* не переключаем экран, если игрок в другом приложении */
                }
            } catch (_e) {
                this.brawlData = null;
                this.brawlScreen = 'hub';
                this.brawlSpeakers = [];
            }
        },
        setBrawlSpeakers(arr) {
            this.brawlSpeakers = Array.isArray(arr) ? arr : [];
        },
        brawlMemberSpeaking(m) {
            if (!m || !this.brawlSpeakers.length) return false;
            const login = String(m.login || '');
            return this.brawlSpeakers.some((n) => {
                const s = String(n);
                return s === login || s === '#' + m.static;
            });
        },
        brawlBackToChannel() {
            this.brawlBackFromSettings();
        },
        brawlGateCreate() {
            const n = (this.brawlGateName || '').trim();
            if (n.length < 2) return mp.trigger('notify:client', 2, 'bottom-mid', 'Введите название канала.', 2500);
            mp.trigger('brawl:create:CLIENT', n, this.brawlGatePwd || '');
        },
        brawlGateJoin() {
            const n = (this.brawlGateName || '').trim();
            if (n.length < 2) return mp.trigger('notify:client', 2, 'bottom-mid', 'Введите название канала.', 2500);
            mp.trigger('brawl:join:CLIENT', n, this.brawlGatePwd || '');
        },
        brawlCopyInvite() {
            if (!this.brawlData || !this.brawlData.invite) return;
            const t = String(this.brawlData.invite);
            const done = () => mp.trigger('notify:client', 3, 'bottom-mid', 'Успешно скопировано!', 2500);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(t).then(done).catch(() => {
                    if (this._brawlCopyTextFallback(t)) done();
                });
                return;
            }
            if (this._brawlCopyTextFallback(t)) done();
        },
        _brawlCopyTextFallback(text) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                return ok;
            } catch (_e) {
                return false;
            }
        },
        brawlOpenFromChatJoin(name) {
            const n = String(name == null ? '' : name).trim();
            if (n.length < 2) return;
            this.currentApp = 'brawl';
            this.navDirection = 'forward';
            if (this.brawlData && this.brawlData.name) {
                if (String(this.brawlData.name).toLowerCase() === n.toLowerCase()) {
                    this.brawlScreen = 'channel';
                    this.brawlGateName = n;
                    this.brawlGatePwd = '';
                    return;
                }
                return;
            }
            this.brawlScreen = 'hub';
            this.brawlGateName = n;
            this.brawlGatePwd = '';
            mp.trigger('brawl:join:CLIENT', n, '');
        },
        brawlDoLeave() {
            mp.trigger('brawl:leave:CLIENT');
            this.brawlData = null;
            this.brawlScreen = 'hub';
            this.brawlListenGlobal = 100;
            this.brawlMemberListen = {};
        },
        brawlSetGlobalVol() {
            this.brawlApplyGlobalVol(this.brawlListenGlobal);
        },
        brawlOnGlobalVolInput(val) {
            const v = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
            this.brawlListenGlobal = v;
            if (this.brawlData) this.$set(this.brawlData, 'globalVol', v);
            this.brawlApplyGlobalVol(v);
        },
        brawlApplyGlobalVol(v) {
            mp.trigger('brawl:vol:CLIENT', 'global', 0, v);
        },
        brawlToggle(key, ev) {
            if (!this.brawlData) return;
            const v = ev && ev.target ? !!ev.target.checked : !this.brawlData[key];
            mp.trigger('brawl:setting:CLIENT', key, v);
            this.$set(this.brawlData, key, v);
        },
        brawlApplyMax() {
            mp.trigger('brawl:setting:CLIENT', 'maxMembers', parseInt(this.brawlMaxInput, 10) || 0);
        },
        brawlMaxDigits(e) {
            if (!e || !e.target) return;
            const clean = String(e.target.value || '').replace(/\D/g, '');
            const val = clean === '' ? 0 : parseInt(clean, 10);
            if (this.brawlMaxInput !== val) this.brawlMaxInput = val;
            if (e.target.value !== clean) e.target.value = clean;
        },
        brawlMaxPaste(e) {
            if (!e || !e.target) return;
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
            const el = e.target;
            const cur = String(this.brawlMaxInput || '');
            const start = el.selectionStart != null ? el.selectionStart : cur.length;
            const end = el.selectionEnd != null ? el.selectionEnd : cur.length;
            const clean = (cur.slice(0, start) + pasted + cur.slice(end)).replace(/\D/g, '');
            const val = clean === '' ? 0 : parseInt(clean, 10);
            this.brawlMaxInput = val;
            el.value = clean;
        },
        brawlApplyPwd() {
            mp.trigger('brawl:setting:CLIENT', 'password', this.brawlPwdChannel || '');
        },
        brawlMemberVol(st, v) {
            const vol = Math.max(0, Math.min(125, parseInt(v, 10) || 0));
            const key = Number(st);
            this.$set(this.brawlMemberListen, key, vol);
            if (this.brawlData && this.brawlData.members) {
                const row = this.brawlData.members.find((x) => Number(x.static) === key);
                if (row) this.$set(row, 'volume', vol);
            }
            mp.trigger('brawl:vol:CLIENT', 'member', key, vol);
        },
        brawlMemberMute(st) {
            const row = this.brawlData.members.find((x) => Number(x.static) === Number(st));
            if (!row) return;
            mp.trigger('brawl:member:CLIENT', st, 'mute', !row.muted);
        },
        brawlMemberKick(st) {
            mp.trigger('brawl:member:CLIENT', st, 'kick', true);
        },
        brawlMemberAssist(st) {
            const row = this.brawlData.members.find((x) => Number(x.static) === Number(st));
            if (!row) return;
            mp.trigger('brawl:member:CLIENT', st, 'assistant', !row.assistant);
        },
        brawlMemberMarkToggle(st) {
            if (!this.brawlData || !this.brawlData.members) return;
            const row = this.brawlData.members.find((x) => Number(x.static) === Number(st));
            if (!row) return;
            if (this.brawlData.marksAll) {
                mp.trigger('brawl:member:CLIENT', st, 'markersBanned', !row.markersBanned);
            } else {
                mp.trigger('brawl:member:CLIENT', st, 'allowMarkers', !row.allowMarkers);
            }
        },
        brawlMarkBtnClass(m) {
            if (!this.brawlData) return {};
            if (this.brawlData.marksAll) {
                if (m.markersBanned) return { 'np-btn--danger-soft': true };
                return {};
            }
            if (m.markersBanned) return { 'np-btn--danger-soft': true };
            return { 'np-btn--active': !!m.allowMarkers };
        },
        carLoad(cars) {
            let arr = cars;
            if (typeof arr === 'string') {
                try { arr = JSON.parse(arr); } catch (_e) { arr = []; }
            }
            if (!Array.isArray(arr)) arr = [];
            this.filteredCars = arr
                .map((raw) => (typeof raw === 'string' ? raw.trim() : ''))
                .filter(Boolean)
                .map((key) => {
                    const label = Object.prototype.hasOwnProperty.call(CAR_DISPLAY_NAMES, key)
                        ? CAR_DISPLAY_NAMES[key]
                        : humanizeCarKey(key);
                    return { [key]: label };
                });
        },
        carCall(car) {
            mp.trigger('carCall:CLIENT', Object.keys(car)[0]);
        },
        carUncall(car) {
            mp.trigger('carUncall:CLIENT', Object.keys(car)[0]);
        },
        carImageSrc(car) {
            const key = Object.keys(car)[0];
            if (key === '2021ladaraven') {
                return CASE_IMG_BASE + 'car/2021ladaraven.png';
            }
            return 'package://browsers/vehicle_previews/' + key + '.png';
        },
        onCarImgError(ev, car) {
            const el = ev.target;
            if (!el || el.tagName !== 'IMG') return;
            const key = Object.keys(car)[0];
            const step = el.dataset.phoneImgStep || '0';
            const hideThumb = () => {
                const thumb = el.closest('.np-car-card__thumb');
                if (thumb) thumb.style.display = 'none';
                else el.style.display = 'none';
            };
            if (step === '0') {
                el.dataset.phoneImgStep = '1';
                el.src = 'img/cars/' + key + '.png';
                el.style.display = '';
                return;
            }
            if (step === '1') {
                const rel = CAR_CASE_IMAGE[key];
                if (rel) {
                    el.dataset.phoneImgStep = '2';
                    el.src = CASE_IMG_BASE + rel;
                    el.style.display = '';
                    return;
                }
            }
            hideThumb();
        },
        fmtMoney(n) {
            const v = parseInt(n, 10) || 0;
            return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        },
        setBankState(payload) {
            let data = payload;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (_e) { return; }
            }
            if (!data || typeof data !== 'object') return;
            this.bankData.cash = parseInt(data.cash, 10) || 0;
            this.bankData.hasFamily = !!data.hasFamily;
            this.bankData.hasFraction = !!data.hasFraction;
            this.bankData.familyName = data.familyName || '';
            this.bankData.fractionId = parseInt(data.fractionId, 10) || 0;
            this.bankData.epsilonDonated = parseInt(data.epsilonDonated, 10) || 0;
            this.bankData.epsilonGoal = parseInt(data.epsilonGoal, 10) || 5000000;
            this.bankData.epsilonUnlocked = !!data.epsilonUnlocked;
        },
        bankDoEpsilonDeposit() {
            mp.trigger('phone:bank:epsilon:deposit:CLIENT', this.bankData.epsilonAmount);
        },
        bankDoTransfer() {
            mp.trigger('phone:bank:transfer:CLIENT', this.bankData.transferStatic, this.bankData.transferAmount);
        },
        bankDoFamilyDeposit() {
            mp.trigger('phone:bank:family:deposit:CLIENT', this.bankData.familyAmount);
        },
        bankDoFractionDeposit() {
            mp.trigger('phone:bank:fraction:deposit:CLIENT', this.bankData.fractionAmount);
        },
        bankInputDigits(key, e) {
            if (!e || !e.target) return;
            const clean = String(e.target.value || '').replace(/\D/g, '');
            if (this.bankData[key] !== clean) {
                this.$set(this.bankData, key, clean);
            }
            if (e.target.value !== clean) {
                e.target.value = clean;
            }
        },
        bankPasteDigits(key, e) {
            if (!e || !e.target) return;
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
            const el = e.target;
            const cur = String(this.bankData[key] || '');
            const start = el.selectionStart != null ? el.selectionStart : cur.length;
            const end = el.selectionEnd != null ? el.selectionEnd : cur.length;
            const clean = (cur.slice(0, start) + pasted + cur.slice(end)).replace(/\D/g, '');
            this.$set(this.bankData, key, clean);
            el.value = clean;
        },
        setMoonvitoState(payload) {
            let data = payload;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (_e) { return; }
            }
            if (!data || typeof data !== 'object') return;
            this.moonvito.listings = Array.isArray(data.listings) ? data.listings : [];
            this.moonvito.inventory = Array.isArray(data.inventory) ? data.inventory : [];
            this.moonvito.minPrice = parseInt(data.minPrice, 10) || 100000;
            this.moonvito.maxPrice = parseInt(data.maxPrice, 10) || 100000000;
            this.moonvito.myStatic = parseInt(data.myStatic, 10) || 0;
            this.moonvito.loading = false;
            if (this.moonvito.sellInvIndex != null) {
                const still = this.moonvito.inventory.some((x) => x.invIndex === this.moonvito.sellInvIndex);
                if (!still) {
                    this.moonvito.sellInvIndex = null;
                    this.moonvito.sellPrice = '';
                }
            }
        },
        moonvitoSetTab(tab) {
            this.moonvito.tab = tab;
            this.moonvito.search = '';
            this.blurPhoneFocus();
        },
        moonvitoSetCategory(cat) {
            this.moonvito.category = cat;
        },
        moonvitoRefresh() {
            this.moonvito.loading = true;
            try { mp.trigger('phone:moonvito:refresh:CLIENT'); } catch (_e) {}
        },
        moonvitoCatLabel(cat) {
            if (cat === 'weapon') return 'Оружие';
            if (cat === 'cloth') return 'Одежда';
            return 'Другое';
        },
        moonvitoSelectSellItem(row) {
            if (!row) return;
            this.moonvito.sellInvIndex = row.invIndex;
            if (!this.moonvito.sellPrice) this.moonvito.sellPrice = String(this.moonvito.minPrice);
        },
        moonvitoDoBuy(row) {
            if (!row || row.mine) return;
            try { mp.trigger('phone:moonvito:buy:CLIENT', row.indexbd, row.name); } catch (_e) {}
        },
        moonvitoDoCancel(row) {
            if (!row || !row.mine) return;
            try { mp.trigger('phone:moonvito:cancel:CLIENT', row.indexbd, row.name); } catch (_e) {}
        },
        moonvitoDoSell() {
            const idx = this.moonvito.sellInvIndex;
            if (idx == null) return;
            const row = (this.moonvito.inventory || []).find((x) => x.invIndex === idx);
            if (!row) return;
            const price = String(this.moonvito.sellPrice || '').replace(/\D/g, '');
            try { mp.trigger('phone:moonvito:sell:CLIENT', row.invIndex, price, row.name); } catch (_e) {}
        },
        moonvitoPriceInput(e) {
            if (!e || !e.target) return;
            const clean = String(e.target.value || '').replace(/\D/g, '');
            this.moonvito.sellPrice = clean;
            if (e.target.value !== clean) e.target.value = clean;
        }
    }
});
