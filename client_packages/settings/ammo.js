;;
const _0xd6220a = mp.players.local;
if (mp.storage.data.ammoData == undefined) {
    mp.storage.data.ammoData = {};
    mp.storage.data.ammoData.work = 0;
    mp.storage.data.ammoData.scale = 0.4;
    mp.storage.data.ammoData.font = 4;
    mp.storage.data.ammoData.offsetX = 0.07;
    mp.storage.data.ammoData.offsetY = -0.05;
    mp.storage.data.ammoData.visibleAmmoIcon = 0;
    mp.storage.data.ammoData.visibleMaxAmmo = 0;
    mp.storage.data.ammoData.renderEveryFrame = 1;
    mp.storage.data.ammoData.textOutline = 1;
    mp.storage.data.ammoData.defaultColor = [
        255,
        255,
        255,
        255
    ];
    mp.storage.data.ammoData.targetColor = [
        255,
        255,
        255,
        255
    ];
    mp.storage.data.ammoData.iconColor = [
        255,
        255,
        255,
        255
    ];
    mp.storage.flush();
}
let _0x22658f = false;
if (mp.storage.data.ammoData.work == undefined) {
    mp.storage.data.ammoData.work = 0;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.scale == undefined) {
    mp.storage.data.ammoData.scale = 0.4;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.font == undefined) {
    mp.storage.data.ammoData.font = 4;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.offsetX == undefined) {
    mp.storage.data.ammoData.offsetX = 0.07;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.offsetY == undefined) {
    mp.storage.data.ammoData.offsetY = -0.05;
    _0x22658f = true;;
};
if (mp.storage.data.ammoData.visibleAmmoIcon == undefined) {
    mp.storage.data.ammoData.visibleAmmoIcon = 0;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.visibleMaxAmmo == undefined) {
    mp.storage.data.ammoData.visibleMaxAmmo = 0;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.renderEveryFrame == undefined) {
    mp.storage.data.ammoData.renderEveryFrame = 1;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.textOutline == undefined) {
    mp.storage.data.ammoData.textOutline = 1;
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.defaultColor == undefined) {
    mp.storage.data.ammoData.defaultColor = [
        255,
        255,
        255,
        255
    ];
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.targetColor == undefined) {
    mp.storage.data.ammoData.targetColor = [
        255,
        255,
        255,
        255
    ];
    _0x22658f = true;;
}
if (mp.storage.data.ammoData.iconColor == undefined) {
    mp.storage.data.ammoData.iconColor = [
        255,
        255,
        255,
        255
    ];
    _0x22658f = true;;
}
_0x22658f && mp.storage.flush();
global.ammoHandData = mp.storage.data.ammoData;
global.currentAmmo = 0;
global.handAmmoRenderActive = false;;;

function _0x34c3cd() {
    ;
    if (_0xd6220a.weapon == 2725352035 || ammoHandData.renderEveryFrame != 1) {
        return;
    }
    if (mp.game.controls.isControlPressed(0, 25) || mp.game.controls.isControlPressed(0, 24) || ammoHandData.renderEveryFrame == 1) {
        let _0x5bb53f = _0xd6220a.getBoneCoords(64016, 0, 0, 0), _0x11f062 = mp.game.graphics.world3dToScreen2d(new mp.Vector3(_0x5bb53f.x, _0x5bb53f.y, _0x5bb53f.z));
        if (typeof _0x5513a9 == 'undefined' || typeof _0x5513a9 == undefined || typeof _0x5513a9 == null) {
            return;
        }
        mp.game.graphics.drawText('' + (ammoHandData.visibleMaxAmmo == 1 ? _0xd6220a.getAmmoInClip(_0xd6220a.weapon) + '/' + mp.game.weapon.getWeaponClipSize(_0xd6220a.weapon) : _0xd6220a.getAmmoInClip(_0xd6220a.weapon)), [
            _0x11f062.x + parseFloat(ammoHandData.offsetX),
            _0x11f062.y + parseFloat(ammoHandData.offsetY)
        ], {
            'font': ammoHandData.font,
            'color': ammoHandData.defaultColor,
            'scale': [
                ammoHandData.scale,
                ammoHandData.scale
            ],
            'outline': ammoHandData.textOutline,
            'centre': true
        });     
    }
}

mp.events.add('render', _0x34c3cd);
handAmmoRenderActive = true;