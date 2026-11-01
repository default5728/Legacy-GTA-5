'use strict';

const path = require('path');
const hairCfg = require(path.join(__dirname, '../../../client_packages/shared/hair_styles.js'));

global.HAIR_MAX_DRAWABLE = hairCfg.HAIR_MAX_DRAWABLE;
global.buildHairStyles = hairCfg.buildHairStyles;

global.barberlist = {};
hairCfg.buildHairStyles(hairCfg.HAIR_MAX_DRAWABLE).forEach((h) => {
    global.barberlist[h.name] = {
        slot: 2,
        drawable: h.drawable,
        texture: 0,
        price: h.price
    };
});
