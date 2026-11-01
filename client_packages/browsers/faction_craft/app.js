(function () {
    'use strict';

    const ITEM_IMAGES = {
        weapon_revolver_mk2: 'package://browsers/inventory/img/weapon_revolver_mk2.png',
        weapon_navyrevolver: 'package://browsers/menunew/img/boxes/navy.png',
        weapon_assaultshotgun: 'package://browsers/amunation/images/assaultshotgun.png',
        weapon_heavyshotgun: 'package://browsers/inventory/img/weapon_heavyshotgun.png',
        weapon_specialcarbine: 'package://browsers/inventory/img/weapon_specialcarbine.png',
        weapon_carbinerifle: 'package://browsers/inventory/img/weapon_carbinerifle.png',
        weapon_minismg: 'package://browsers/menunew/img/MiniSMG.png',
        weapon_assaultrifle: 'package://browsers/amunation/images/assaultrifle.png',
        weapon_combatmg: 'package://browsers/inventory/img/weapon_combatmg.png',
        weapon_combatmg_mk2: 'package://browsers/inventory/img/weapon_combatmg_mk2.png',
        weapon_heavysniper: 'package://browsers/menunew/img/svc.png',
        weapon_heavysniper_mk2: 'package://browsers/inventory/img/weapon_heavysniper_mk2.png',
        weapon_sniperrifle: 'package://browsers/tablet/img/guns/sniperrifle.png',
        weapon_marksmanrifle: 'package://browsers/inventory/img/weapon_marksmanrifle.png',
        weapon_precisionrifle: 'package://browsers/inventory/img/weapon_precisionrifle.png',
        item_spank: 'package://browsers/inventory/img/item_spank.png',
        item_alco: 'package://browsers/hud/images/med.png',
        'Бронежилет': 'package://browsers/inventory/img/armor.png',
        'Аптечка': 'package://browsers/inventory/img/heal.png'
    };

    const DEFAULT_WEAPON_IMG = 'package://browsers/faction_craft/img/items/default_weapon.svg';

    function formatNum(num) {
        const n = Number(num) || 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function itemImageSrc(itemKey) {
        return ITEM_IMAGES[itemKey] || DEFAULT_WEAPON_IMG;
    }

    const app = new Vue({
        el: '#craft_weapon',
        data: {
            loaded: false,
            sections: [],
            selectedSectionIdx: 0,
            selectedItemUid: '',
            materials: 0,
            craftItems: []
        },
        computed: {
            currentItems() {
                const sec = this.sections[this.selectedSectionIdx];
                if (!sec) return [];
                return this.craftItems.filter((item) => item.sectionId === sec.id);
            }
        },
        methods: {
            formatNum,
            sectionLabel(name) {
                return String(name || '').toUpperCase();
            },
            tabIconType(key) {
                if (key === 'pistol') return 'pistol';
                if (key === 'shotgun') return 'shotgun';
                if (key === 'rifle' || key === 'sniper') return 'rifle';
                return 'other';
            },
            selectSection(idx) {
                const next = parseInt(idx, 10);
                if (!Number.isFinite(next) || next === this.selectedSectionIdx) return;
                this.selectedSectionIdx = next;
                this.selectedItemUid = '';
            },
            selectItem(item) {
                if (!item) return;
                this.selectedItemUid = item.uid;
            },
            onImgError(ev) {
                if (!ev || !ev.target) return;
                ev.target.onerror = null;
                ev.target.src = DEFAULT_WEAPON_IMG;
            },
            rebuildItems() {
                const list = [];
                this.sections.forEach((sec) => {
                    (sec.items || []).forEach((it) => {
                        list.push({
                            uid: `${sec.id}_${it.id}`,
                            sectionId: sec.id,
                            sectionKey: sec.key,
                            itemId: it.id,
                            name: it.name,
                            mats: parseInt(it.mats, 10) || 0,
                            image: itemImageSrc(it.item),
                            crafting: false
                        });
                    });
                });
                this.craftItems = list;
            },
            craftItem(item) {
                if (!item || item.crafting) return;
                if (this.materials < item.mats) return;
                if (typeof mp === 'undefined' || !mp.trigger) return;
                item.crafting = true;
                mp.trigger('faction:craft:do', String(item.sectionId), String(item.itemId));
                window.setTimeout(() => {
                    item.crafting = false;
                }, 650);
            },
            closeCraft() {
                if (typeof mp !== 'undefined' && mp.trigger) {
                    mp.trigger('faction:craft:close');
                }
            },
            open(sectionsData, mats) {
                this.sections = Array.isArray(sectionsData) ? sectionsData : [];
                if (this.selectedSectionIdx >= this.sections.length) {
                    this.selectedSectionIdx = 0;
                }
                this.materials = parseInt(mats, 10) || 0;
                this.selectedItemUid = '';
                this.rebuildItems();
                this.loaded = true;
            },
            close() {
                this.loaded = false;
                this.selectedItemUid = '';
            },
            setMaterials(mats) {
                this.materials = parseInt(mats, 10) || 0;
            }
        }
    });

    window.FactionCraft = {
        open(sectionsData, mats) {
            app.open(sectionsData, mats);
        },
        close() {
            app.close();
        },
        setMaterials(mats) {
            app.setMaterials(mats);
        }
    };

    try {
        if (typeof mp !== 'undefined' && mp.trigger) {
            mp.trigger('faction:craft:browser:ready');
        }
    } catch (_) {}
})();
