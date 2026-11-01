(function () {
    function formatMoney(num) {
        const n = Number(num) || 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    const CATALOG = [
        { sellName: 'Revolver MKII', name: 'Revolver MKII', price: 12500, categoryId: 'categoryPistol', image: '../inventory/img/weapon_revolver_mk2.png', desc: 'Скупка Revolver MK II.' },
        { sellName: 'Mini SMG', name: 'Mini SMG', price: 2000, categoryId: 'categoryPistol', image: '../inventory/img/weapon_minismg.png', desc: 'Скупка Mini SMG.' },
        { sellName: 'Heavy Shotgun', name: 'Heavy Shotgun', price: 1500, categoryId: 'categoryShotgun', image: '../amunation/images/HeavyShotgun.png', desc: 'Скупка Heavy Shotgun.' },
        { sellName: 'Assault Shotgun', name: 'Assault Shotgun', price: 5000, categoryId: 'categoryShotgun', image: '../amunation/images/assaultshotgun.png', desc: 'Скупка Assault Shotgun.' },
        { sellName: 'Carabine Rifle', name: 'Carabine Rifle', price: 300, categoryId: 'categoryRifle', image: '../amunation/images/carabine.png', desc: 'Скупка Carabine Rifle.' },
        { sellName: 'Assault Rifle', name: 'Assault Rifle', price: 300, categoryId: 'categoryRifle', image: '../amunation/images/assaultrifle.png', desc: 'Скупка Assault Rifle.' },
        { sellName: 'Special Carbine', name: 'Special Carbine', price: 2000, categoryId: 'categoryRifle', image: '../amunation/images/weapon_specialcarbine.png', desc: 'Скупка Special Carbine.' },
        { sellName: 'Спанк', name: 'Спанк', price: 800, categoryId: 'categoryOther', image: '../inventory/img/item_spank.png', desc: 'Скупка Спанк (1 шт.).' },
        { sellName: 'Медовуха', name: 'Медовуха', price: 500, categoryId: 'categoryOther', image: '../hud/images/med.png', desc: 'Скупка Медовуха (1 шт.).' },
        { sellName: 'Бронежилет', name: 'Бронежилет', price: 100, categoryId: 'categoryOther', image: '../inventory/img/armor.png', desc: 'Скупка бронежилета (1 шт.).' },
    ];

    const app = new Vue({
        el: '#shop_weapon',
        data: {
            loaded: false,
            selectedCategoryId: 'categoryPistol',
            selectedProductIndex: -1,
            allProducts: [],
        },
        computed: {
            productListCurrent() {
                return this.allProducts.filter((p) => p.categoryId === this.selectedCategoryId);
            },
        },
        methods: {
            categoryHasProducts(categoryId) {
                return this.allProducts.some((p) => p.categoryId === categoryId);
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
            sell(p) {
                if (!p || p.selling) return;
                if (typeof mp === 'undefined' || !mp.trigger) return;
                p.selling = true;
                mp.trigger('sellgun', p.sellName);
                window.setTimeout(() => {
                    p.selling = false;
                }, 650);
            },
            closeShop() {
                if (typeof window.hide === 'function') window.hide();
            },
            prepareProducts() {
                this.allProducts = CATALOG.map((row, index) => ({
                    id: index,
                    sellName: row.sellName,
                    name: row.name,
                    price: row.price,
                    priceDisplay: formatMoney(row.price),
                    categoryId: row.categoryId,
                    image: row.image,
                    desc: row.desc || null,
                    sellInfo: false,
                    selling: false,
                    openInfo: false,
                }));
            },
            show() {
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

    window.weaponSellShop = app;

    window.show = function () {
        app.show();
    };

    window.hide = function (silent) {
        app.hide();
        if (!silent && typeof mp !== 'undefined' && mp.trigger) {
            mp.trigger('closeBlackShopMenu');
        }
    };

    app.prepareProducts();
    if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('blackshop:ready');
    }
})();
