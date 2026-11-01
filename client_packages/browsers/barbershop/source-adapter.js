(function () {
    'use strict';

    const PRICE_EYEBROWS = 500;
    const PRICE_BEARD = 700;
    const PRICE_EYECOLOR = 800;
    const MAKEUP_PRICE = 1000;

    const EYEBROW_NAMES = [
        'Аккуратные', 'Модные', 'Клеопатра', 'Ироничные', 'Женственные', 'Обольстительные', 'Нахмуренные',
        'Чикса', 'Торжествующие', 'Беззаботные', 'Дугой', 'Мышка', 'Двойная высечка', 'Впалые',
        'Карандашом', 'Выщипанные', 'Прямые и тонкие', 'Естественные', 'Пышные', 'Неопрятные', 'Широкие',
        'Обычные', 'Южно-европейские', 'Ухоженные', 'Кустистые', 'Перышки', 'Колючие', 'Сросшиеся',
        'Крылатые', 'Тройная высечка', 'Высечка дугой', 'Подрезанные', 'Сходящие на нет', 'Высечка'
    ];

    const BEARD_NAMES = [
        'Нет', 'Лёгкая щетина', 'Бальбо', 'Круглая борода', 'Эспаньола', 'Козлиная бородка', 'Островок',
        'Тонкая бородка', 'Короткая бородка', 'Мушкетёр', 'Усы', 'Подстриженная борода', 'Щетина',
        'Круглая борода 2', 'Борода-подкова', 'Карандашные усы', 'Борода-ремень', 'Бальбо и баки', 'Баки',
        'Короткая бородка 2', 'Дали', 'Дали и борода', 'Велосипедный руль', 'Островок с усами',
        'Английские усы', 'Голливудская', 'Фу манчу', 'Островок с баками', 'Широкие баки', 'Борода "ширма"'
    ];

    const EYECOLOR_NAMES = [
        'Зелёные', 'Изумрудные', 'Голубые', 'Синие', 'Светлый шатен', 'Тёмно-коричневые', 'Карие',
        'Тёмно-серые', 'Светло-серые'
    ];

    const MAIN_COLOR_RGB = [
        '#1B1B1B', '#232323', '#312C2C', '#352319', '#482816', '#673012', '#814524', '#735443', '#746754', '#877862',
        '#A9977B', '#BAB19C', '#D2C7AB', '#AD9150', '#C6AB6C', '#D7C497', '#947D68', '#714039', '#693030', '#661010',
        '#791414', '#8F211A', '#992A07', '#CF3200', '#BC502D', '#DD572C', '#555555', '#717171', '#8E8E8E', '#DCDCDC',
        '#695B7B', '#724D88', '#7D3B88', '#D617DA', '#EC1971', '#FF96CF', '#009099', '#016F9E', '#005AAD', '#45BB58',
        '#00A37C', '#054743', '#7AA500', '#5A9214', '#32AF06', '#E3CB49', '#F3C00B', '#F6A300', '#FF5C00', '#FF3D00',
        '#FF5E1A', '#FF3002', '#FF1102', '#E00000', '#980009', '#322121', '#493232', '#543B3B', '#664949', '#452E2E',
        '#2E2323', '#000000', '#81756A', '#A19285'
    ];

    const LIST_COLOR_RGB = [
        '#B70000', '#E83289', '#DF4DA5', '#DB77AD', '#C3478A', '#CE363F', '#5C1414', '#BF6969', '#D99A9A', '#E9B8B8',
        '#E9B8CA', '#C97E7E', '#CF6E4F', '#B64623', '#C07088', '#D98AB5', '#EFA6CE', '#F470B8', '#ED008E', '#C31F82',
        '#600E30', '#330A20', '#D61919', '#FF0000', '#D60000', '#F8294E', '#DD00D4', '#B900B1', '#7700AF', '#440064',
        '#560064', '#3B0045', '#5400BE', '#182386', '#163AB8', '#006DD2', '#00A4EB', '#00E0FF', '#00FFC2', '#4FDD77',
        '#00A925', '#27850F', '#96DC00', '#D7FA00', '#E6EB00', '#FFD600', '#FFC700', '#F6A300', '#FF5C00', '#B24421',
        '#D9B55A', '#EDE5BC', '#FFFFFF', '#D6D6D6', '#7A7A7A', '#454545', '#101010', '#34C0B8', '#4684BD', '#001D65',
        '#CEAD8F', '#9C735C', '#785542', '#352424'
    ];

    const CUSTOM_BEARD_RGB = [
        '#282828', '#41312C', '#757575', '#C2C2C2', '#D8CCAD', '#D17152', '#A49791', '#755649', '#7F39C5', '#FF9797',
        '#FF2222', '#38EBE0', '#DEB4FF', '#5036F3', '#FF0E82', '#06EC1D', '#0F6868', '#0033E7', '#F3B7E6', '#148EFF',
        '#9D0000', '#AFD80C', '#FF8A00', '#FFE600', '#E9F3FF', '#D3FFF2'
    ];

    function formatMoney(value) {
        const number = Math.max(0, parseInt(value, 10) || 0);
        return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function clampColor(n) {
        const v = parseInt(n, 10);
        if (!Number.isFinite(v)) return 0;
        return Math.max(0, Math.min(63, v));
    }

    function trigger() {
        if (typeof mp === 'undefined' || !mp.trigger) return;
        mp.trigger.apply(mp, arguments);
    }

    let maxHairDrawableCap = null;

    function buildHairTuples(isMan) {
        const cfg = typeof HairStylesConfig !== 'undefined' ? HairStylesConfig : null;
        const cap = Number.isFinite(maxHairDrawableCap) ? maxHairDrawableCap : undefined;
        const list = cfg && cfg.buildHairStyles ? cfg.buildHairStyles(cap) : [{ name: 'Налысо', drawable: 0, price: 500 }];
        return list.map((h, i) => [i, h.name, h.drawable, h.price]);
    }

    function buildCatalogPayload(isMan) {
        const hairList = buildHairTuples(isMan);
        const eyebList = EYEBROW_NAMES.map((name, i) => [i, name, i, PRICE_EYEBROWS]);
        const beardList = BEARD_NAMES.map((name, i) => {
            const beardId = i === 0 ? 255 : i - 1;
            return [i, name, beardId, PRICE_BEARD];
        });
        const eyeList = [];
        for (let i = 0; i < 32; i++) {
            eyeList.push([i, EYECOLOR_NAMES[i] || ('Цвет ' + (i + 1)), i, PRICE_EYECOLOR]);
        }
        const makeupList = [];
        for (let i = 0; i < 95; i++) {
            makeupList.push([i, 'Стиль ' + (i + 1), i, MAKEUP_PRICE]);
        }
        return {
            isMan: !!isMan,
            hairList: hairList,
            hairTattoList: [],
            beardList: isMan ? beardList : [],
            beardCustomList: [],
            chestList: [],
            eyeList: eyeList,
            eyebList: eyebList,
            lipsList: [],
            makeupList: makeupList,
            blushList: []
        };
    }

    function hairColorList() {
        const arr = [];
        for (let i = 0; i <= 63; i++) arr.push(i);
        return arr;
    }

    const shop = new Vue({
        el: '#shop_barbershop',
        data: {
            loaded: false,
            balance: 0,
            selectedTab: -1,
            isMan: true,
            hairList: [],
            hairStyleCount: 0,
            hairColorList: hairColorList(),
            selectedHair: 0,
            selectedHairStyle: 0,
            selectedHairStyleMax: 0,
            selectedHairColor: 0,
            selectedHairColor2: 0,
            hairTattoList: [],
            selectedHairTatto: 0,
            beardList: [],
            beardColorList: hairColorList(),
            selectedBeard: 0,
            selectedBeardColor: 0,
            beardCustomList: [],
            selectedBeardCustom: null,
            selectedBeardCustomColor: 0,
            chestList: [],
            chestColorList: hairColorList(),
            selectedChest: 0,
            selectedChestColor: 0,
            eyeList: [],
            selectedEye: 0,
            makeupList: [],
            selectedMakeup: 0,
            lipsList: [],
            lipsColorList: hairColorList(),
            selectedLips: 0,
            selectedLipsColor: 0,
            eyebList: [],
            eyebColorList: hairColorList(),
            selectedEyeb: 0,
            selectedEyebColor: 0,
            blushList: [],
            blushColorList: hairColorList(),
            selectedBlush: 0,
            selectedBlushColor: 0,
            mainColorRGBList: MAIN_COLOR_RGB,
            listColorRGBList: LIST_COLOR_RGB,
            customBeardColorRGBList: CUSTOM_BEARD_RGB,
            shopStartRotate: false,
            shopMousePositionX: 0,
            shopMousePositionY: 0,
            shopMouseCounter: 0,
            buyPending: false
        },
        methods: {
            formatMoney: formatMoney,
            changeBalance(value) { const n = Number(String(value).replace(/\s/g, '')); if (Number.isFinite(n) && n >= 0) this.balance = n; },
            beardImg(beard) {
                if (!beard) return '';
                return 'https://files.gta5rp.com/UI/hair/beard/' + beard.beardId + '.png';
            },
            onHairImgError(ev) {
                try {
                    const el = ev && ev.target;
                    if (!el || el._barberFallback) return;
                    el._barberFallback = true;
                    // 1x1 transparent — no browser "broken image" icon
                    el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                } catch (_e) {}
            },
            selectTab(a) {
                if (this.selectedTab === a) return;
                if (a === 0) {
                    if (!this.hairList.length) return;
                    this.selectedHairStyle = 0;
                    this.updateHair(0, this.selectedHairColor, this.selectedHairColor2);
                }
                if (a === 1) {
                    if (!this.beardList.length) return;
                    this.updateBeard(0, this.selectedBeardColor);
                }
                if (a === 2) {
                    if (!this.chestList.length) return;
                    this.updateChest(0, 0);
                }
                if (a === 3) this.updateEye(0);
                if (a === 4) {
                    if (!this.lipsList.length) return;
                    this.updateLips(0, 0);
                }
                if (a === 5) this.updateEyeb(0, this.selectedEyebColor);
                if (a === 6) this.updateMakeup(0);
                if (a === 7) {
                    if (!this.blushList.length) return;
                    this.updateBlush(0, 0);
                }
                if (a === 8) this.selectedHairTatto = 0;
                if (a === 9 && !this.selectedBeardCustom && this.beardCustomList.length) {
                    this.selectedBeardCustom = this.beardCustomList[0];
                }
                this.selectedTab = a;
                // 0 лицо / 1 торс (грудь)
                trigger('barber:setcamera:c', a === 2 ? 1 : 0);
            },
            selectHair(a, b, c) {
                this.updateHair(a, b, c);
            },
            updateHair(a, b, c) {
                this.selectedHair = a;
                this.selectedHairColor = b;
                this.selectedHairColor2 = c;
                this.updateHairClient();
            },
            updateHairClient() {
                const hair = this.hairList[this.selectedHair];
                if (!hair) return;
                const c1 = clampColor(this.hairColorList[this.selectedHairColor]);
                const c2 = clampColor(this.hairColorList[this.selectedHairColor2]);
                // Локальная примерка по drawable — без серверных delayed-sync
                trigger('barber:hair:demo', hair.hairId, 0);
                trigger('barber:haircolor:demo', c1, c2);
            },
            buyHair(_pay) {
                if (this.buyPending) return;
                const hair = this.hairList[this.selectedHair];
                if (!hair) return;
                this.buyPending = true;
                const c1 = clampColor(this.hairColorList[this.selectedHairColor]);
                const c2 = clampColor(this.hairColorList[this.selectedHairColor2]);
                trigger('barber:buy:c', hair.name, String(c1), String(c2));
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            selectBeard(a, b) {
                this.updateBeard(a, b);
            },
            updateBeard(a, b) {
                this.selectedBeard = a;
                this.selectedBeardColor = b;
                const item = this.beardList[a];
                if (!item) return;
                trigger('barber:beard:demo', item.beardId, clampColor(this.beardColorList[b]));
            },
            buyBeard(_pay) {
                if (this.buyPending) return;
                const item = this.beardList[this.selectedBeard];
                if (!item) return;
                this.buyPending = true;
                trigger('barber:appearance:buy:c', 'beard', item.beardId, clampColor(this.beardColorList[this.selectedBeardColor]));
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            selectBeardCustom(a, b) {
                this.selectedBeardCustom = a;
                this.selectedBeardCustomColor = b;
            },
            buyBeardCustom() {},
            selectChest(a, b) {
                this.updateChest(a, b);
            },
            updateChest(a, b) {
                this.selectedChest = a;
                this.selectedChestColor = b;
            },
            buyChest() {},
            selectEye(a) {
                this.updateEye(a);
            },
            updateEye(a) {
                this.selectedEye = a;
                const item = this.eyeList[a];
                if (!item) return;
                trigger('barber:eyecolor:demo', item.eId);
            },
            buyEye(_pay) {
                if (this.buyPending) return;
                const item = this.eyeList[this.selectedEye];
                if (!item) return;
                this.buyPending = true;
                trigger('barber:appearance:buy:c', 'eyecolor', item.eId, 0);
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            selectMakelup(a) {
                this.updateMakeup(a);
            },
            updateMakeup(a) {
                this.selectedMakeup = a;
                const item = this.makeupList[a];
                if (!item) return;
                trigger('barber:makeup:demo:local', item.mId, 1);
            },
            buyMakeup(_pay) {
                if (this.buyPending) return;
                const item = this.makeupList[this.selectedMakeup];
                if (!item) return;
                this.buyPending = true;
                trigger('barber:makeup:buy:c', item.mId, 1);
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            selectLips(a, b) {
                this.updateLips(a, b);
            },
            updateLips(a, b) {
                this.selectedLips = a;
                this.selectedLipsColor = b;
            },
            buyLips() {},
            selectEyeb(a, b) {
                this.updateEyeb(a, b);
            },
            updateEyeb(a, b) {
                this.selectedEyeb = a;
                this.selectedEyebColor = b;
                const item = this.eyebList[a];
                if (!item) return;
                trigger('barber:eyebrows:demo', item.ebId, clampColor(this.eyebColorList[b]));
            },
            buyEyeb(_pay) {
                if (this.buyPending) return;
                const item = this.eyebList[this.selectedEyeb];
                if (!item) return;
                this.buyPending = true;
                trigger(
                    'barber:appearance:buy:c',
                    'eyebrows',
                    item.ebId,
                    clampColor(this.eyebColorList[this.selectedEyebColor])
                );
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            selectBlush(a, b) {
                this.updateBlush(a, b);
            },
            updateBlush(a, b) {
                this.selectedBlush = a;
                this.selectedBlushColor = b;
            },
            buyBlush() {},
            selectHairTatto(a) {
                this.selectedHairTatto = a;
            },
            buyHairTatto() {},
            removeHairTatto() {},
            mouseDown(a) {
                if (a.target !== document.body) return;
                this.shopMouseCounter = 0;
                this.shopStartRotate = true;
                this.shopMousePositionX = a.clientX;
                this.shopMousePositionY = a.clientY;
            },
            mouseUp() {
                this.shopStartRotate = false;
            },
            mouseMove(a) {
                if (!this.shopStartRotate) return;
                const b = a.clientX - this.shopMousePositionX;
                this.shopMouseCounter++;
                if (b !== 0) trigger('barber:rotate:c', b);
                this.shopMousePositionX = a.clientX;
                this.shopMousePositionY = a.clientY;
            },
            keyHandler(a) {
                const code = a.which || a.keyCode;
                // Tab — не даём CEF фокусировать/подсвечивать список
                if (code === 9) {
                    if (a.preventDefault) a.preventDefault();
                    if (a.stopPropagation) a.stopPropagation();
                    try {
                        if (document.activeElement && document.activeElement.blur) {
                            document.activeElement.blur();
                        }
                    } catch (_e) {}
                    return false;
                }
                if (code === 27) this.closeShop();
            },
            closeShop() {
                trigger('barber:close:c');
            },
            load(payload) {
                const a = payload || buildCatalogPayload(this.isMan);
                this.isMan = !!a.isMan;
                this.hairList = (a.hairList || []).map((row) => ({
                    id: row[0], name: row[1], hairId: row[2], price: row[3]
                }));
                this.hairTattoList = (a.hairTattoList || []).map((row) => ({
                    id: row[0], name: row[1], collection: row[2], overlay: row[3], price: row[4]
                }));
                this.beardList = (a.beardList || []).map((row) => ({
                    id: row[0], name: row[1], beardId: row[2], price: row[3]
                }));
                this.beardCustomList = (a.beardCustomList || []).map((row) => ({
                    id: row[0], name: row[1], beardId: row[2], price: row[3]
                }));
                this.chestList = (a.chestList || []).map((row) => ({
                    id: row[0], name: row[1], chestId: row[2], price: row[3]
                }));
                this.eyeList = (a.eyeList || []).map((row) => ({
                    id: row[0], name: row[1], eId: row[2], price: row[3]
                }));
                this.eyebList = (a.eyebList || []).map((row) => ({
                    id: row[0], name: row[1], ebId: row[2], price: row[3]
                }));
                this.lipsList = (a.lipsList || []).map((row) => ({
                    id: row[0], name: row[1], lId: row[2], price: row[3]
                }));
                this.makeupList = (a.makeupList || []).map((row) => ({
                    id: row[0], name: row[1], mId: row[2], price: row[3]
                }));
                this.blushList = (a.blushList || []).map((row) => ({
                    id: row[0], name: row[1], bId: row[2], price: row[3]
                }));
                this.selectedTab = -1;
                this.buyPending = false;
                this.loaded = true;
                this.$nextTick(() => {
                    if (this.hairList.length) this.selectTab(0);
                });
                if (!this._listenersBound) {
                    document.addEventListener('mousedown', this.mouseDown);
                    document.addEventListener('mouseup', this.mouseUp);
                    document.addEventListener('mousemove', this.mouseMove);
                    document.addEventListener('keydown', this.keyHandler, true);
                    document.addEventListener('keyup', this.keyHandler, true);
                    this._listenersBound = true;
                }
                try {
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                } catch (_e2) {}
            },
            close() {
                this.loaded = false;
                this.selectedTab = -1;
                this.buyPending = false;
                if (this._listenersBound) {
                    document.removeEventListener('mousedown', this.mouseDown);
                    document.removeEventListener('mouseup', this.mouseUp);
                    document.removeEventListener('mousemove', this.mouseMove);
                    document.removeEventListener('keydown', this.keyHandler, true);
                    document.removeEventListener('keyup', this.keyHandler, true);
                    this._listenersBound = false;
                }
            },
            open() {
                this.load(buildCatalogPayload(this.isMan));
            },
            moveSelection(delta) {
                const d = Number(delta) || 0;
                if (this.selectedTab === 0 && this.hairList.length) {
                    const next = Math.max(0, Math.min(this.hairList.length - 1, this.selectedHair + d));
                    this.selectHair(next, this.selectedHairColor, this.selectedHairColor2);
                } else if (this.selectedTab === 1 && this.beardList.length) {
                    const next = Math.max(0, Math.min(this.beardList.length - 1, this.selectedBeard + d));
                    this.selectBeard(next, this.selectedBeardColor);
                } else if (this.selectedTab === 5 && this.eyebList.length) {
                    const next = Math.max(0, Math.min(this.eyebList.length - 1, this.selectedEyeb + d));
                    this.selectEyeb(next, this.selectedEyebColor);
                } else if (this.selectedTab === 3 && this.eyeList.length) {
                    const next = Math.max(0, Math.min(this.eyeList.length - 1, this.selectedEye + d));
                    this.selectEye(next);
                } else if (this.selectedTab === 6 && this.makeupList.length) {
                    const next = Math.max(0, Math.min(this.makeupList.length - 1, this.selectedMakeup + d));
                    this.selectMakelup(next);
                }
            }
        }
    });

    window.barberShop = shop;

    window.barberSetMaxHairDrawable = function (max) {
        const n = parseInt(max, 10);
        maxHairDrawableCap = Number.isFinite(n) ? Math.max(0, n) : null;
        if (shop.loaded) shop.load(buildCatalogPayload(shop.isMan));
    };

    window.barberSetGender = function (isFemale) {
        shop.isMan = !isFemale;
        if (shop.loaded) shop.load(buildCatalogPayload(shop.isMan));
    };

    window.changeBarberShopDisplay = function (action) {
        if (action === 'open') shop.open();
        else shop.close();
    };

    window.barberShopOnArrow = function (delta) {
        shop.moveSelection(delta);
    };

    if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('barber:ready:c');
})();
