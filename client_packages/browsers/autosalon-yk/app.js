(function () {
    function formatMoney(num) {
        const n = Number(num) || 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function classLabel(cls) {
        if (cls === 'exclusive') return 'Эксклюзив';
        if (cls === 'premium') return 'Премиум';
        return 'Базовый';
    }

    function statsFromVehicle(veh) {
        const ms = Number(veh.maxSpeed) || 185;
        return {
            maxSpeed: Math.round(Math.min(100, (ms / 350) * 100)),
            acceleration: Math.round(Math.min(100, ms / 3.5)),
            maxTraction: Math.round(Math.min(100, 55 + ms / 8)),
            maxBraking: Math.round(Math.min(100, 50 + ms / 10)),
            numberOfPassengers: 4,
        };
    }

    function emitRotate(delta) {
        const d = Number(delta);
        if (!d || typeof mp === 'undefined' || !mp.trigger) return;
        mp.trigger('autosalon:yk:rotate', d);
    }

    const app = new Vue({
        el: '#shop_vehicle',
        data: {
            loaded: false,
            vehicles: [],
            selectedVeh: -1,
            maxSpeed: 1,
            acceleration: 1,
            maxTraction: 1,
            maxBraking: 1,
            numberOfPassengers: 4,
            family: false,
            lastSelect: 0,
            testDriverStarted: false,
            startBuyVehType: -1,
            vehicleShopStartRotate: false,
            vehicleShopMousePositionX: 0,
        },
        methods: {
            applyStats(veh) {
                const s = statsFromVehicle(veh);
                this.maxSpeed = s.maxSpeed;
                this.acceleration = s.acceleration;
                this.maxTraction = s.maxTraction;
                this.maxBraking = s.maxBraking;
                this.numberOfPassengers = s.numberOfPassengers;
            },
            selectVeh(index, force) {
                const now = Date.now();
                if (!force && now - this.lastSelect < 800) return;
                if (!force && this.selectedVeh === index) return;
                this.lastSelect = now;
                this.selectedVeh = index;
                const veh = this.vehicles[index];
                if (!veh) return;
                this.applyStats(veh);
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('autosalon:yk:select', veh.model);
                }
            },
            selectPreviousVeh() {
                if (this.selectedVeh > 0) this.selectVeh(this.selectedVeh - 1, true);
            },
            selectNextVeh() {
                if (this.selectedVeh >= 0 && this.selectedVeh < this.vehicles.length - 1) {
                    this.selectVeh(this.selectedVeh + 1, true);
                }
            },
            startTestDrive() {
                if (this.selectedVeh < 0 || !this.vehicles[this.selectedVeh]) return;
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('autosalon:testdrive:start:c');
                }
            },
            startBuyVeh(type) {
                this.vehicleShopStartRotate = false;
                this.startBuyVehType = type;
            },
            cancelBuy() {
                this.startBuyVehType = -1;
                this.vehicleShopStartRotate = false;
            },
            buyVeh() {
                const veh = this.vehicles[this.selectedVeh];
                if (!veh) return;
                const buyType = this.startBuyVehType;
                this.startBuyVehType = -1;
                this.vehicleShopStartRotate = false;
                if (typeof mp === 'undefined' || !mp.trigger) return;
                if (buyType === 2) {
                    mp.trigger('c:autoSalonBuyFamily', veh.model);
                } else {
                    mp.trigger('c:autoSalonBuy', veh.model);
                }
            },
            closeShop() {
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('closeautosalon');
                }
            },
            load(payload) {
                const rows = (payload && payload.vehicles) || [];
                const preferredModel = (payload && payload.preferredModel) || null;
                const prevModel = preferredModel
                    || (this.selectedVeh >= 0 && this.vehicles[this.selectedVeh]
                        ? this.vehicles[this.selectedVeh].model
                        : null);
                const mapped = rows.map((row) => ({
                    name: row.title ? `${row.brand} ${row.title}` : (row.name || row.model),
                    model: row.model,
                    price: row.price,
                    priceDisplay: formatMoney(row.price),
                    currencyLabel: row.currency === 'DP' ? ' DP' : '$',
                    className: classLabel(row.class || 'basic'),
                    maxSpeed: row.maxSpeed || 185,
                    params: {
                        maxItems: row.class === 'exclusive' ? '4' : '2',
                        fuelTank: 65,
                    },
                }));
                this.family = !!(payload && payload.family);
                this.vehicles = mapped;
                this.startBuyVehType = -1;
                this.testDriverStarted = false;
                this.loaded = true;
                this.vehicleShopStartRotate = false;

                if (this.vehicles.length === 0) {
                    this.selectedVeh = -1;
                    return;
                }

                let nextIndex = prevModel
                    ? this.vehicles.findIndex((v) => v.model === prevModel)
                    : -1;
                if (nextIndex < 0) {
                    nextIndex = (this.selectedVeh >= 0 && this.selectedVeh < this.vehicles.length)
                        ? this.selectedVeh
                        : 0;
                }
                this.$nextTick(() => this.selectVeh(nextIndex, true));
            },
            unload() {
                this.vehicleShopStartRotate = false;
                this.loaded = false;
                this.vehicles = [];
                this.selectedVeh = -1;
                this.startBuyVehType = -1;
                this.testDriverStarted = false;
            },
            endTestDrive() {
                this.testDriverStarted = false;
                this.loaded = true;
            },
            isUiTarget(el) {
                if (!el || !el.closest) return false;
                return !!(
                    el.closest('.yk-shadow-block-right') ||
                    el.closest('.yk-shadow-block-left') ||
                    el.closest('.content-block') ||
                    el.closest('.autosalon-buy-confirm') ||
                    el.closest('.autosalon-buy-actions') ||
                    el.closest('button')
                );
            },
            mouseDown(e) {
                if (this.startBuyVehType !== -1) return;
                if (e.button != null && e.button !== 0) return;
                if (this.isUiTarget(e.target)) return;
                this.vehicleShopStartRotate = true;
                this.vehicleShopMousePositionX = e.clientX;
            },
            mouseUp() {
                this.vehicleShopStartRotate = false;
            },
            mouseMove(e) {
                if (this.startBuyVehType !== -1) {
                    this.vehicleShopStartRotate = false;
                    return;
                }
                if (!this.vehicleShopStartRotate) return;
                const dx = e.clientX - this.vehicleShopMousePositionX;
                if (Math.abs(dx) >= 1) {
                    emitRotate(dx * 0.45);
                    this.vehicleShopMousePositionX = e.clientX;
                }
            },
            keyHandler(e) {
                const code = e.which || e.keyCode;
                if (code === 9) {
                    if (e.preventDefault) e.preventDefault();
                    try {
                        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
                    } catch (_e) {}
                    return;
                }
                if (code !== 27) return;
                // ESC закрывает автосалон на клиенте (esc_universal / tryCloseAutosalonEsc).
                // Здесь ничего не делаем: если CEF закроет магазин на keydown, а ESC ещё зажат —
                // после закрытия контролы разблокируются и GTA откроет карту/паузу.
            },
        },
    });

    document.addEventListener('mousedown', (e) => app.mouseDown(e));
    document.addEventListener('mouseup', () => app.mouseUp());
    window.addEventListener('mouseup', () => app.mouseUp());
    document.addEventListener('mousemove', (e) => app.mouseMove(e));
    document.addEventListener('keydown', (e) => app.keyHandler(e), true);

    window.autosalonYk = {
        load(payload) { app.load(payload); },
        unload() { app.unload(); },
        endTestDrive() { app.endTestDrive(); },
    };
})();
