'use strict';

/** CEF MenuManager для LS Customs (Flow: cef/PlayerMenu). */
const menuBrowser = mp.browsers.new('package://cef/PlayerMenu/Menu/__menu.html');
menuBrowser.active = false;
global.menuBrowser = menuBrowser;
