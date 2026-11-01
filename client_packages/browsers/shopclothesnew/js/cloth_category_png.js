/**
 * Единые иконки категорий одежды (ClothID) → PNG в shopclothesnew/img.
 * Имена файлов только ASCII — CEF RageMP не открывает package:// с кириллицей в пути.
 */
(function (global) {
    var BASE = 'package://browsers/shopclothesnew/img/';
    var FILES = {
        1: 'icon_hat.png',
        2: 'icon_mask.png',
        3: 'icon_top.png',
        4: 'icon_legs.png',
        5: 'icon_shoes.png',
        6: 'icon_accessory.png',
        7: 'icon_glasses.png',
        8: 'icon_bag.png',
        9: 'icon_armor.png',
        12: 'icon_earring.png',
        13: 'icon_watch.png',
        14: 'icon_bracelet.png',
        15: 'icon_gloves.png'
    };
    var SRC = {};
    for (var k in FILES) {
        SRC[k] = BASE + FILES[k];
    }
    var FALLBACK = SRC[3];

    function clothCategoryIconSrc(cid) {
        var n = Number(cid);
        if (!Number.isFinite(n)) return FALLBACK;
        return SRC[n] || FALLBACK;
    }

    global.CLOTH_CATEGORY_PNG_FILES = FILES;
    global.CLOTH_CATEGORY_ICON_SRC_MAP = SRC;
    global.clothCategoryIconSrc = clothCategoryIconSrc;
})(typeof window !== 'undefined' ? window : this);
