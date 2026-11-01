(function () {
    'use strict';

    const QTY_MIN = 1;

    function formatMoney(num) {
        const n = Number(num) || 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    const CATALOG = [
        {
            id: 0,
            name: 'Медовуха',
            price: 600,
            image: 'package://browsers/hud/images/med.png',
        },
        {
            id: 1,
            name: 'Спанк',
            price: 1000,
            image: 'package://browsers/inventory/img/item_spank.png',
        },
    ];

    const app = new Vue({
        el: '#club_shop',
        data: {
            loaded: false,
            selectedProductIndex: -1,
            products: [],
        },
        methods: {
            selectProduct(p) {
                this.selectedProductIndex = p.id;
            },
            productCount(p) {
                const value = Math.trunc(Number(p && p.buyCount));
                if (!Number.isFinite(value)) return QTY_MIN;
                return Math.max(QTY_MIN, value);
            },
            normalizeProductCount(p) {
                if (p) p.buyCount = this.productCount(p);
            },
            buy(p) {
                if (!p || p.buying) return;
                if (typeof mp === 'undefined' || !mp.trigger) return;

                const productId = Number(p.id);
                if (!Number.isInteger(productId) || productId < 0) return;

                const quantity = this.productCount(p);
                p.buyCount = quantity;
                p.buying = true;
                mp.trigger('kablukBar:buy', productId, quantity);
                window.setTimeout(() => {
                    p.buying = false;
                }, 900);
            },
            closeShop() {
                if (typeof window.hide === 'function') window.hide();
            },
            prepareProducts() {
                this.products = CATALOG.map((row) => ({
                    id: row.id,
                    name: row.name,
                    price: row.price,
                    priceDisplay: formatMoney(row.price),
                    image: row.image,
                    buyCount: 1,
                    buyInfo: false,
                    buying: false,
                }));
            },
            show() {
                this.prepareProducts();
                this.loaded = true;
            },
            hide() {
                this.loaded = false;
                this.products = [];
                this.selectedProductIndex = -1;
            },
        },
    });

    window.clubShopMenu = app;

    window.show = function () {
        app.show();
    };

    window.hide = function (silent) {
        app.hide();
        if (!silent && typeof mp !== 'undefined' && mp.trigger) {
            mp.trigger('kablukBar:close');
        }
    };

    if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('kablukBar:ready');
    }
})();
