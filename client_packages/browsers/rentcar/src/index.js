const IS_PREVIEW = !!(typeof window !== 'undefined' && window.__RENTCAR_PREVIEW__);

if (IS_PREVIEW) {
    window.mp = {
        trigger: function () {
            console.log('[rentcar preview]', Array.prototype.slice.call(arguments));
        }
    };
}

function rentImg(url) {
    if (!IS_PREVIEW) return url;
    return String(url)
        .replace('package://browsers/rentcarnew/', '../rentcarnew/')
        .replace('package://browsers/vehicle_previews/', '../vehicle_previews/');
}

const VEHICLE_PREVIEW_PKG = 'package://browsers/vehicle_previews/';

const RENT_VEHICLES_CRIME = [
    { Name: 'Pariah', img: rentImg('package://browsers/anims/img/rent/Pariah_2.png'), price: '500', MaxSpeed: 220 },
    { Name: 'Raiden', img: rentImg('package://browsers/anims/img/rent/Raiden_2.png'), price: '500', MaxSpeed: 240 },
    { Name: 'XA-21', img: rentImg('package://browsers/anims/img/rent/Raiden_2.png'), price: '1.000', MaxSpeed: 240 },
    { Name: 'T20', img: rentImg('package://browsers/anims/img/rent/T20_2.png'), price: '1.000', MaxSpeed: 180 },
    { Name: 'Elegy2', img: rentImg('package://browsers/anims/img/rent/Elegy2_2.png'), price: '2.500', MaxSpeed: 150 },
    { Name: 'Toros', img: rentImg('package://browsers/anims/img/rent/toros2.png'), price: '2.500', MaxSpeed: 225 },
    { Name: 'Dominator3', img: rentImg('package://browsers/anims/img/rent/Dominator3_2.png'), price: '5.000', MaxSpeed: 210 },
    { Name: 'Avtr', img: rentImg(VEHICLE_PREVIEW_PKG + 'avtr.png'), price: '7.500', MaxSpeed: 220 },
    { Name: 'BMW E70', img: rentImg(VEHICLE_PREVIEW_PKG + 'bmwe70.png'), price: '6.000', MaxSpeed: 210 },
    { Name: 'Principe 125 2006', img: rentImg(VEHICLE_PREVIEW_PKG + 'ktm125.png'), price: '2.500', MaxSpeed: 165 },
    { Name: 'Sparrow', img: rentImg(VEHICLE_PREVIEW_PKG + 'seasparrow2.png'), price: '50.000', MaxSpeed: 160 }
];

const RENT_VEHICLES_FIB = [
    { Name: 'Baller6', img: rentImg('package://browsers/anims/img/rent/baller6_2.png'), price: '1.000', MaxSpeed: 203 },
    { Name: 'XLS2', img: rentImg('package://browsers/anims/img/rent/xls2_2.png'), price: '2.500', MaxSpeed: 201 },
    { Name: 'FBI2', img: rentImg('package://browsers/anims/img/rent/fbi2_2.png'), price: '5.000', MaxSpeed: 188 },
    { Name: 'FBI', img: rentImg('package://browsers/anims/img/rent/fbi_2.png'), price: '10.000', MaxSpeed: 184 },
    { Name: 'Avtr', img: rentImg(VEHICLE_PREVIEW_PKG + 'avtr.png'), price: '7.500', MaxSpeed: 220 },
    { Name: 'BMW E70', img: rentImg(VEHICLE_PREVIEW_PKG + 'bmwe70.png'), price: '6.000', MaxSpeed: 210 }
];

var autoRent = new Vue({
    el: '#rentcar',
    data: {
        opened: false,
        tab: 'crime',
        showFibTab: false,
        search: '',
        rentModal: false,
        rentModalProduct: { Name: '', img: '', MaxSpeed: 0, price: '0' },
        RentVehiclesCrime: RENT_VEHICLES_CRIME,
        RentVehiclesFIB: RENT_VEHICLES_FIB,
        visibleVehicles: [],
        _revealTimer: null
    },

    computed: {
        activeList() {
            return this.tab === 'fib' ? this.RentVehiclesFIB : this.RentVehiclesCrime;
        },
        filteredVehicles() {
            const base = this.visibleVehicles.length ? this.visibleVehicles : [];
            if (!this.search.trim()) return base;
            const q = this.search.trim().toLowerCase();
            return base.filter((v) =>
                String(v.Name).toLowerCase().includes(q) ||
                String(v.MaxSpeed).includes(q)
            );
        }
    },

    methods: {
        setTab(next) {
            if (this.tab === next) return;
            this.tab = next;
            this.search = '';
            this.revealVehicles();
        },

        changeVeh(type) {
            const next = type === 'fib' ? 'fib' : 'crime';
            if (next === 'fib' && !this.showFibTab) {
                this.setTab('crime');
                return;
            }
            this.setTab(next);
        },

        setFractionContext(fraction) {
            const fib = Number(fraction) === 6;
            this.showFibTab = fib;
            if (fib) this.setTab('fib');
            else this.setTab('crime');
        },

        revealVehicles() {
            if (this._revealTimer) {
                clearTimeout(this._revealTimer);
                this._revealTimer = null;
            }
            const list = this.activeList.slice();
            this.visibleVehicles = [];
            let index = 0;
            const reveal = () => {
                if (index < list.length) {
                    this.visibleVehicles.push(list[index]);
                    index += 1;
                    this._revealTimer = setTimeout(reveal, 90);
                }
            };
            reveal();
        },

        onRent(item) {
            this.rentModalProduct = {
                Name: item.Name,
                img: item.img,
                MaxSpeed: item.MaxSpeed,
                price: item.price
            };
            this.rentModal = true;
        },

        confirmRent() {
            if (!this.rentModalProduct || !this.rentModalProduct.Name) return;
            mp.trigger('c:rentcarAuto', this.rentModalProduct.Name);
            this.closeRentModal();
        },

        closeRentModal() {
            this.rentModal = false;
        },

        CloseRentModal() {
            this.closeRentModal();
        },

        tryClose() {
            this.closeRentModal();
            mp.trigger('rent:close');
            this.reset();
        },

        openUi() {
            this.opened = true;
            this.revealVehicles();
        },

        reset() {
            this.opened = false;
            this.search = '';
            this.rentModal = false;
            this.visibleVehicles = [];
            if (this._revealTimer) {
                clearTimeout(this._revealTimer);
                this._revealTimer = null;
            }
        },

        keyUp(event) {
            if (!this.opened) return;
            if (event.keyCode === 27) this.tryClose();
        }
    }
});

document.addEventListener('keyup', autoRent.keyUp.bind(autoRent));

(function rentCarUiGate() {
    function setRentOpen(on) {
        try {
            if (on) document.body.classList.add('rent-car-open');
            else document.body.classList.remove('rent-car-open');
        } catch (_e) {}
    }

    window.hideRentCar = function hideRentCar() {
        setRentOpen(false);
        autoRent.reset();
    };

    window.show = function show() {
        setRentOpen(true);
        autoRent.openUi();
    };

    if (IS_PREVIEW) {
        document.body.classList.add('rent-car-preview');
        window.show();
    }
})();
