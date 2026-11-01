const VEHICLE_PREVIEW_PKG = 'package://browsers/vehicle_previews/';
let autoRent = new Vue({
    el: '#autoRent',
    data: {
        rentModal: 0,
        FIB: 0,
        rentModalProduct: [{
            Name: "Аптечка",
            Desc: "Основное",
            Price: "100",
            img: "img/gangwarShop/repairKit.png"
        }],
        RentVehiclesCrime: [{
            Name: "Pariah",
            img: "img/rent/Pariah_2.png",
            lvl: 1,
            price: '500',
            MaxSpeed: 220
        }, {
            Name: "Raiden",
            img: "img/rent/Raiden_2.png",
            lvl: 2,
            price: '500',
            MaxSpeed: 240
        }, {
            Name: 'XA-21',
            img: "img/rent/Raiden_2.png",
            lvl: 3,
            price: '1.000',
            MaxSpeed: 240
        }, {
            Name: "T20",
            img: "img/rent/T20_2.png",
            lvl: 4,
            price: '1.000',
            MaxSpeed: 180
        }, {
            Name: "Elegy2",
            img: "img/rent/Elegy2_2.png",
            lvl: 5,
            price: '2.500',
            MaxSpeed: 150
        }, {
            Name: "Toros",
            img: "img/rent/toros2.png",
            lvl: 6,
            price: '2.500',
            MaxSpeed: 225
        }, {
            Name: "Dominator3",
            img: "img/rent/Dominator3_2.png",
            lvl: 7,
            price: '5.000',
            MaxSpeed: 210
        }, {
            Name: "Avtr",
            img: VEHICLE_PREVIEW_PKG + "avtr.png",
            lvl: 1,
            price: '7.500',
            MaxSpeed: 220
        }, {
            Name: "BMW E70",
            img: VEHICLE_PREVIEW_PKG + "bmwe70.png",
            lvl: 1,
            price: '6.000',
            MaxSpeed: 210
        }],
        RentVehiclesFIB: [{
            Name: "Baller6",
            img: "img/rent/baller6_2.png",
            lvl: 1,
            price: '1.000',
            MaxSpeed: 203
        }, {
            Name: "XLS2",
            img: "img/rent/xls2_2.png",
            lvl: 1,
            price: '2.500',
            MaxSpeed: 201
        }, {
            Name: "FBI2",
            img: "img/rent/fbi2_2.png",
            lvl: 1,
            price: '5.000',
            MaxSpeed: 188
        }, {
            Name: "FBI",
            img: "img/rent/fbi_2.png",
            lvl: 1,
            price: '10.000',
            MaxSpeed: 184
        }, {
            Name: "Avtr",
            img: VEHICLE_PREVIEW_PKG + "avtr.png",
            lvl: 1,
            price: '7.500',
            MaxSpeed: 220
        }, {
            Name: "BMW E70",
            img: VEHICLE_PREVIEW_PKG + "bmwe70.png",
            lvl: 1,
            price: '6.000',
            MaxSpeed: 210
        }]
    },
    methods: {
        changeVeh: function(type) {
            if (type === 'fib') {
                this.FIB = 1;
            } else {
                this.FIB = 0;
            }
        },
        changeRentModal: function(_0x140B9, _0x14085, _0x1409F, price) {
            this.rentModalProduct = [{
                Name: _0x140B9,
                img: _0x14085,
                MaxSpeed: _0x1409F,
                price: price
            }];
            this.rentModal = 1;
        },
        SpawnRentVehicle: function() {
            mp.trigger("c:rentcarAuto", this.rentModalProduct[0].Name);
        },
        Exit: function() {
            mp.trigger('rent:close');
            this.rentModal = 0;
            if (typeof window.hideRentCar === 'function') window.hideRentCar();
        },
        CloseRentModal: function() {
            this.rentModal = 0;
        }
    }
});

(function rentCarUiGate() {
    function setRentOpen(on) {
        try {
            if (on) document.body.classList.add('rent-car-open');
            else document.body.classList.remove('rent-car-open');
        } catch (_e) {}
    }
    window.hideRentCar = function () {
        setRentOpen(false);
    };
    /** Вызывается из client_packages/rentcar.js */
    window.show = function () {
        setRentOpen(true);
    };
})();