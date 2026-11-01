(function () {
    'use strict';

    const SOURCE_ZONE_BY_OLD_ZONE = [1, 0, 2, 3, 4, 5];
    let femaleModel = false;

    function formatMoney(value) {
        const number = Math.max(0, parseInt(value, 10) || 0);
        return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function buildCatalog() {
        if (!Array.isArray(window.TattooShopList)) return [];
        return window.TattooShopList.reduce((result, tattoo, index) => {
            if (!tattoo || !tattoo.Collection) return result;
            const oldZone = parseInt(tattoo.Zone, 10);
            const isBlackwork = String(tattoo.Collection).toLowerCase() === 'gta5rptattoo_overlays';
            const zone = isBlackwork ? 7 : SOURCE_ZONE_BY_OLD_ZONE[oldZone];
            if (!Number.isInteger(zone)) return result;
            const overlay = femaleModel ? tattoo.OverlayFemale : tattoo.OverlayMale;
            if (!overlay) return result;
            const item = {
                id: index,
                zone: zone,
                name: String(tattoo.Name || 'Татуировка'),
                price: Math.max(1, parseInt(tattoo.Price, 10) || 1),
                collection: String(tattoo.Collection),
                hash: String(overlay)
            };
            result.push(item);

            // The exported UI has separate Back and Blackwork tabs, but its
            // export does not include the server-side lists for those tabs.
            if (oldZone === 0 && !isBlackwork) {
                result.push(Object.assign({}, item, { id: `${index}:back`, zone: 6 }));
            }
            return result;
        }, []);
    }

    const shop = new Vue({
        el: '#shop_tatto',
        data: {
            loaded: false,
            list: [],
            currentList: [],
            selectedZone: -1,
            selectedTatto: null,
            buyPending: false
        },
        computed: {
            priceText() {
                return this.selectedTatto ? formatMoney(this.selectedTatto.price) : '0';
            }
        },
        methods: {
            selectType(zone) {
                this.selectedZone = zone;
                this.selectedTatto = null;
                this.applyFilter();
                let cameraMode = 1;
                if (zone === 0) cameraMode = 0;
                else if (zone === 4 || zone === 5) cameraMode = 2;
                else if (zone === 7) cameraMode = 3;
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('tatto:setcamera:c', cameraMode);
                }
            },
            applyFilter() {
                this.currentList = this.list.filter((tattoo) =>
                    tattoo.zone === this.selectedZone
                );
                if (this.selectedTatto && this.currentList.indexOf(this.selectedTatto) === -1) {
                    this.selectedTatto = null;
                }
            },
            scrollList(event) {
                const list = document.getElementById('menuMainRightList');
                if (!list) return;
                const delta = Number(event && event.deltaY) || 0;
                list.scrollTop += delta;
            },
            selectTatto(tattoo) {
                if (!tattoo) return;
                this.selectedTatto = tattoo;
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('tatto:setdemo:c', tattoo.collection, tattoo.hash);
                }
            },
            buy(payType) {
                const tattoo = this.selectedTatto;
                if (!tattoo || this.buyPending || typeof mp === 'undefined' || !mp.trigger) return;
                this.buyPending = true;
                mp.trigger('tatto:buy:c', tattoo.collection, tattoo.hash, tattoo.price, payType);
                window.setTimeout(() => { this.buyPending = false; }, 1200);
            },
            closeShop() {
                if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('tatto:close:c');
            },
            open() {
                this.list = buildCatalog();
                this.currentList = [];
                this.selectedZone = -1;
                this.selectedTatto = null;
                this.buyPending = false;
                this.loaded = true;
                this.$nextTick(() => this.selectType(1));
            },
            close() {
                this.loaded = false;
                this.currentList = [];
                this.selectedZone = -1;
                this.selectedTatto = null;
                this.buyPending = false;
            },
            moveSelection(delta) {
                if (!this.currentList.length) return;
                let index = this.selectedTatto ? this.currentList.indexOf(this.selectedTatto) : -1;
                index = Math.max(0, Math.min(this.currentList.length - 1, index + (Number(delta) || 0)));
                this.selectTatto(this.currentList[index]);
                this.$nextTick(() => {
                    const active = document.querySelector('#shop_tatto .yk-shadow-block-item.active');
                    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
                });
            }
        }
    });

    window.tattooSetGender = function (isFemale) {
        femaleModel = !!isFemale;
        if (shop.loaded) {
            shop.list = buildCatalog();
            shop.applyFilter();
        }
    };

    window.changeTattooShopDisplay = function (action) {
        if (action === 'open') shop.open();
        else shop.close();
    };

    window.tattooShopOnArrow = function (delta) {
        shop.moveSelection(delta);
    };

    window.addEventListener('keyup', function (event) {
        if (shop.loaded && event.keyCode === 27) shop.closeShop();
    });

    if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('tatto:ready:c');
})();
