/**
 * Модели одежды, скрытые из обычного магазина за $ (UI + покупка).
 * В донат-каталоге (DonateClothesItemsSell) остаются.
 */
const REGULAR_SHOP_BLOCKED_DRAWABLES = {
    1: new Set([247, 248, 249, 250, 251]),
    2: new Set([169, 249, 250, 251, 252, 253, 255]),
    3: new Set([
        612, 613, 614, 615, 616, 617, 618, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634,
        635, 636, 637, 638, 639, 640, 642, 643
    ]),
    4: new Set([230, 231, 232, 233, 235, 236, 237, 238, 239, 241, 242, 243, 244, 245, 246, 247, 248]),
    5: new Set([40, 162, 163, 164, 166, 167, 168, 169, 170]),
    6: new Set([203, 205, 207, 208, 209]),
    7: new Set([59]),
    8: new Set([
        111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
        133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144
    ]),
    12: new Set([42, 43, 44]),
    13: new Set([40, 49]),
    14: new Set([8, 16]),
    15: new Set([224])
};

function isRegularShopBlockedRow(row) {
    if (!row) return false;
    const cid = Number(row.ClothID);
    const d = Number(row.Drawable);
    const set = REGULAR_SHOP_BLOCKED_DRAWABLES[cid];
    return !!(set && set.has(d));
}

module.exports = {
    isRegularShopBlockedRow,
    REGULAR_SHOP_BLOCKED_DRAWABLES
};
