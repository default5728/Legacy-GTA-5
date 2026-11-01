(function () {
    function formatMoney(num) {
        const n = Number(num) || 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    const CATALOG = [
        { buyName: 'Revolver MKII', name: 'Revolver MKII', price: 25000, categoryId: 'categoryPistol', image: '../inventory/img/weapon_revolver_mk2.png', desc: 'Мощный револьвер MK II.' },
        { buyName: 'Mini SMG', name: 'Mini SMG', price: 5000, categoryId: 'categoryPistol', image: '../inventory/img/weapon_minismg.png', desc: 'Компактный автоматический пистолет-пулемёт.' },
        { buyName: 'Heavy Shotgun', name: 'Heavy Shotgun', price: 10000, categoryId: 'categoryShotgun', image: 'images/HeavyShotgun.png', desc: 'Тяжёлый дробовик ближнего боя.' },
        { buyName: 'Assault Shotgun', name: 'Assault Shotgun', price: 25000, categoryId: 'categoryShotgun', image: 'images/assaultshotgun.png', desc: 'Автоматический дробовик.' },
        { buyName: 'Carabine Rifle', name: 'Carabine Rifle', price: 1000, categoryId: 'categoryRifle', image: 'images/carabine.png', desc: 'Carabine Rifle — универсальная винтовка.' },
        { buyName: 'Assault Rifle', name: 'Assault Rifle', price: 1000, categoryId: 'categoryRifle', image: 'images/assaultrifle.png', desc: 'Штурмовая винтовка.' },
        { buyName: 'Special Carbine', name: 'Special Carbine', price: 2500, categoryId: 'categoryRifle', image: 'images/weapon_specialcarbine.png', desc: 'Special Carbine — модифицированная винтовка.' },
        { buyName: 'Бронежилет', name: 'Бронежилет', price: 500, categoryId: 'categoryOther', image: '../inventory/img/armor.png', desc: 'Защитный бронежилет.', maxCount: 9999 },
    ];

    const app = new Vue({
        el: '#shop_weapon',
        data: {
            loaded: false,
            isFib: false,
            selectedCategoryId: 'categoryPistol',
            selectedProductIndex: -1,
            allProducts: [],
        },
        computed: {
            visibleProducts() {
                return this.allProducts;
            },
            productListCurrent() {
                return this.visibleProducts.filter((p) => p.categoryId === this.selectedCategoryId);
            },
        },
        methods: {
            categoryHasProducts(categoryId) {
                return this.visibleProducts.some((p) => p.categoryId === categoryId);
            },
            selectCategory(categoryId) {
                if (this.selectedCategoryId === categoryId) return;
                this.selectedCategoryId = categoryId;
                this.selectedProductIndex = -1;
            },
            pickDefaultCategory() {
                const cats = ['categoryPistol', 'categoryShotgun', 'categoryRifle', 'categoryOther'];
                for (let i = 0; i < cats.length; i++) {
                    if (this.categoryHasProducts(cats[i])) {
                        this.selectCategory(cats[i]);
                        return;
                    }
                }
            },
            selectProduct(p) {
                this.selectedProductIndex = p.id;
            },
            productCount(p) {
                const value = Math.trunc(Number(p && p.buyCount));
                if (!Number.isFinite(value)) return 1;
                const max = Number(p && p.maxCount) || 10;
                return Math.max(1, Math.min(max, value));
            },
            normalizeProductCount(p) {
                if (p) p.buyCount = this.productCount(p);
            },
            buy(p) {
                if (!p || p.buying) return;
                const quantity = this.productCount(p);
                p.buyCount = quantity;
                if (typeof mp === 'undefined' || !mp.trigger) return;
                p.buying = true;
                mp.trigger('amunation:buy', p.buyName, quantity);
                window.setTimeout(() => {
                    p.buying = false;
                }, 650);
            },
            closeShop() {
                if (typeof window.hide === 'function') window.hide();
            },
            prepareProducts() {
                this.allProducts = CATALOG.map((row, index) => ({
                    id: index,
                    buyName: row.buyName,
                    name: row.name,
                    price: row.price,
                    priceDisplay: formatMoney(row.price),
                    categoryId: row.categoryId,
                    image: row.image,
                    desc: row.desc || null,
                    ammo: row.ammo || null,
                    fibOnly: !!row.fibOnly,
                    gangOnly: !!row.gangOnly,
                    buyCount: 1,
                    buyInfo: false,
                    buying: false,
                    openInfo: false,
                    maxCount: row.maxCount || 10,
                }));
            },
            show(fractionRaw) {
                this.isFib = parseInt(fractionRaw, 10) === 6;
                this.prepareProducts();
                const opening = !this.loaded;
                this.loaded = true;
                this.$nextTick(() => {
                    if (opening || !this.categoryHasProducts(this.selectedCategoryId)) {
                        this.pickDefaultCategory();
                    }
                });
            },
            hide() {
                this.loaded = false;
                this.selectedProductIndex = -1;
            },
        },
    });

    window.weaponShop = app;

    window.show = function (fractionRaw) {
        app.show(fractionRaw);
    };

    window.hide = function (silent) {
        app.hide();
        if (!silent && typeof mp !== 'undefined' && mp.trigger) {
            mp.trigger('closemenutwo');
        }
    };

    // Прогрев каталога без открытия UI — иначе show() сбрасывает вкладку на пистолеты.
    app.prepareProducts();
    if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('amunation:ready');
    }
})();
