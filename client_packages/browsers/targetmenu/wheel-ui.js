(function () {
  var WHEEL_SIZE_X = 1000;
  var WHEEL_SIZE_Y = 1000;
  var WHEEL_RADIUS = 250;
  var WHEEL_SPREADER_RADIUS = 167;
  var WHEEL_DONUT_SIZE = 0.6;
  var WHEEL_NAV_ANGLE = 270;

  var HUB_ICONS = {
    money: 'give-money.svg',
    dice: 'coin-toss.svg',
    trade: 'exchange.svg',
    handshake: 'handshake.svg',
    fracinv: 'work-invite.svg'
  };

  var menuObject = null;

  function iconSrc(item) {
    var ico = (item && item.ico) || HUB_ICONS[item.id] || 'gift.svg';
    return 'imgsrc:PlayerTargetMenu/Icons/' + ico;
  }

  function destroyHubWheel() {
    if (menuObject) {
      try {
        menuObject.removeWheel();
      } catch (_e) {}
      menuObject = null;
    }
  }

  function bindSpreaderClose(onClose) {
    var spreader = document.getElementById('wheelnav-playerTargetMenu-spreader');
    var spreaderTitle = document.getElementById('wheelnav-playerTargetMenu-spreadertitle');
    if (spreader) spreader.onmousedown = onClose;
    if (spreaderTitle) spreaderTitle.onmousedown = onClose;
  }

  function buildHubWheel(items, callbacks) {
    destroyHubWheel();
    if (!items || !items.length || typeof wheelnav === 'undefined') return;

    var holder = document.getElementById('playerTargetMenu');
    if (!holder) return;

    var icons = items.map(iconSrc);

    menuObject = new wheelnav('playerTargetMenu', null, WHEEL_SIZE_X, WHEEL_SIZE_Y);
    menuObject.wheelRadius = WHEEL_RADIUS;
    menuObject.navAngle = WHEEL_NAV_ANGLE;
    menuObject.animatetime = 0;
    menuObject.clickModeRotate = false;
    menuObject.selectedNavItemIndex = null;
    menuObject.sliceTransformFunction = sliceTransform().CustomTitleTransform;
    menuObject.sliceTransformCustom = new sliceTransformCustomization();
    menuObject.sliceTransformCustom.scaleString = 's1.98';
    menuObject.spreaderEnable = true;
    menuObject.spreaderRadius = WHEEL_SPREADER_RADIUS;
    menuObject.spreaderInTitle = '';
    menuObject.spreaderOutTitle = '';
    menuObject.spreaderPathInAttr = { fill: 'rgba(14, 18, 28, 0)', 'stroke-width': 0 };
    menuObject.spreaderPathOutAttr = { fill: 'rgba(14, 18, 28, 0)', 'stroke-width': 0 };
    menuObject.slicePathAttr = { fill: 'rgb(7, 22, 45)', 'fill-opacity': 0, 'stroke-width': 0 };
    menuObject.sliceHoverAttr = { fill: '90-#FF5C00-#FFC702', 'fill-opacity': 1, 'stroke-width': 0 };
    menuObject.sliceSelectedAttr = { fill: '90-#FF5C00-#FFC702', 'fill-opacity': 1, 'stroke-width': 0 };
    menuObject.titleAttr = { fill: '#FFF' };
    menuObject.titleSelectedAttr = { fill: '#FFF' };
    menuObject.titleHoverAttr = { fill: '#FFF' };
    menuObject.slicePathFunction = slicePath().DonutSlice;
    menuObject.slicePathCustom = slicePath().DonutSliceCustomization();
    menuObject.slicePathCustom.minRadiusPercent = WHEEL_DONUT_SIZE;
    menuObject.slicePathCustom.maxRadiusPercent = 1;
    menuObject.sliceSelectedPathFunction = slicePath().DonutSlice;
    menuObject.sliceSelectedPathCustom = slicePath().DonutSliceCustomization();
    menuObject.sliceSelectedPathCustom.minRadiusPercent = WHEEL_DONUT_SIZE;
    menuObject.sliceSelectedPathCustom.maxRadiusPercent = 1;
    menuObject.initWheel(icons);
    menuObject.createWheel();

    for (var i = 0; i < items.length; i++) {
      (function (item, navItem) {
        if (!navItem || !navItem.navItem || !navItem.navItem[0]) return;
        var node = navItem.navItem[0].node;
        node.onmouseover = function () {
          if (callbacks.onHover) callbacks.onHover(item.label, item.sub || '');
        };
        node.onmouseout = function () {
          if (callbacks.onHover) callbacks.onHover(null, null);
        };
        navItem.navigateFunction = function () {
          if (callbacks.onPick) callbacks.onPick(item);
        };
      })(items[i], menuObject.navItems[i]);
    }

    bindSpreaderClose(function () {
      if (callbacks.onClose) callbacks.onClose();
    });

    if (callbacks.onHover) callbacks.onHover(null, null);
  }

  window.tgtHubWheel = {
    build: buildHubWheel,
    destroy: destroyHubWheel
  };
})();
