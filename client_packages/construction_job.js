'use strict';

const CONSTRUCTION_KEY_VK = {
    F: 0x46,
    E: 0x45,
    G: 0x47,
    H: 0x48
};

const CONSTRUCTION_CEF_URL = 'package://browsers/construction_work/index.html?v=1';

let jobState = null;
let workBlip = null;
let uiBrowser = null;
let inWorkZone = false;
let constructionNearNpc = false;
let constructionDialogOpen = false;
let constructionWorking = false;
let lastE = 0;
let lastUiSig = '';
let keyHandlersBound = false;

function ensureUiBrowser() {
    if (uiBrowser && mp.browsers.exists(uiBrowser)) return uiBrowser;
    try {
        uiBrowser = mp.browsers.new(CONSTRUCTION_CEF_URL);
        if (uiBrowser) {
            uiBrowser.active = false;
            try { uiBrowser.orderId = 140; } catch (_eOrd) {}
        }
    } catch (_e) {
        uiBrowser = null;
    }
    return uiBrowser;
}

function uiExec(code) {
    const br = ensureUiBrowser();
    if (!br || !mp.browsers.exists(br)) return;
    if (typeof global.browserExec === 'function') global.browserExec(br, code);
    else try { br.execute(code); } catch (_e) {}
}

function dist2dLocal(x, y) {
    const p = mp.players.local.position;
    const dx = p.x - x;
    const dy = p.y - y;
    return Math.sqrt(dx * dx + dy * dy);
}

function drawWorkCylinder(x, y, z) {
    try {
        mp.game.graphics.drawMarker(
            1,
            x,
            y,
            z - 0.95,
            0, 0, 0,
            0, 0, 0,
            2.8,
            2.8,
            5.0,
            255, 0, 0, 165,
            false, false, 2, false, null, null, false
        );
    } catch (_e) {}
}

function updateWorkBlip(pos) {
    try {
        if (!pos) {
            if (workBlip) {
                try { if (mp.blips.exists(workBlip)) workBlip.destroy(); } catch (_d) {}
                workBlip = null;
            }
            return;
        }
        const v = new mp.Vector3(pos.x, pos.y, pos.z);
        if (!workBlip || !mp.blips.exists(workBlip)) {
            workBlip = mp.blips.new(1, v, {
                name: 'Рабочая зона',
                color: 1,
                shortRange: false,
                scale: 0.85
            });
        } else {
            try { workBlip.position = v; } catch (_p) {}
        }
    } catch (_e) {
        workBlip = null;
    }
}

function setWaypoint(x, y) {
    try {
        mp.game.ui.setNewWaypoint(Number(x), Number(y));
    } catch (_e) {}
}

function refreshWorkUi() {
    if (!jobState || !jobState.active) {
        inWorkZone = false;
        lastUiSig = '';
        if (uiBrowser && mp.browsers.exists(uiBrowser)) uiBrowser.active = false;
        uiExec('try{constructionWorkUi.setVisible(false);}catch(_e){}');
        return;
    }

    const near = dist2dLocal(jobState.x, jobState.y) <= 2.85;
    inWorkZone = near;

    if (!inWorkZone) {
        const sigOff = 'off';
        if (lastUiSig !== sigOff) {
            lastUiSig = sigOff;
            if (uiBrowser && mp.browsers.exists(uiBrowser)) uiBrowser.active = false;
            uiExec('try{constructionWorkUi.setVisible(false);}catch(_e){}');
        }
        return;
    }

    const pct = (jobState.hitsRequired > 0)
        ? (jobState.hits / jobState.hitsRequired) * 100
        : 0;
    const sig = jobState.key + '|' + Math.round(pct);
    if (sig === lastUiSig) return;
    lastUiSig = sig;

    const br = ensureUiBrowser();
    if (br) br.active = true;
    uiExec(
        'try{constructionWorkUi.setVisible(true);constructionWorkUi.setState(' +
        JSON.stringify(jobState.key) + ',' + pct +
        ');}catch(_e){}'
    );
}

function closeConstructionDialog() {
    if (!constructionDialogOpen) return;
    constructionDialogOpen = false;
    try {
        if (typeof global.hideSharedPedDialog === 'function') global.hideSharedPedDialog();
    } catch (_eHide) {}
    try {
        if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
        else {
            mp.gui.cursor.show(false, false);
            mp.players.local.freezePosition(false);
        }
    } catch (_eClose) {}
}

function openConstructionDialog() {
    if (constructionDialogOpen) return;
    constructionDialogOpen = true;
    try {
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
        else {
            mp.gui.cursor.show(true, true);
            mp.players.local.freezePosition(true);
        }
    } catch (_eOpen) {}

    const working = constructionWorking === true || (mp.players.local.getVariable('constructionJob') === true);
    const cfg = {
        header: 'Прораб',
        text: working
            ? 'Смена идёт. Красная метка на карте — твоя следующая точка. Закончил — можешь снять смену здесь.'
            : 'Нужны руки на объекте. Бегай по красным зонам, жми клавишу как на экране — за каждый участок плата на карман. Готов?',
        buttons: working
            ? [
                { id: 'stop', label: 'Закончить смену' },
                { id: 'leave', label: 'Уйти' }
            ]
            : [
                { id: 'start', label: 'Начать работу' },
                { id: 'leave', label: 'Уйти' }
            ]
    };
    try {
        if (typeof global.showSharedPedDialog === 'function') global.showSharedPedDialog(cfg);
    } catch (_eShow) {
        closeConstructionDialog();
    }
}

function onConstructionKey(keyName) {
    if (!jobState || !jobState.active || !inWorkZone) return;
    if (constructionDialogOpen) return;
    try {
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
    } catch (_e) {}
    mp.events.callRemote('construction:hit:server', keyName);
}

function bindConstructionKeys() {
    if (keyHandlersBound) return;
    keyHandlersBound = true;
    Object.keys(CONSTRUCTION_KEY_VK).forEach((keyName) => {
        const vk = CONSTRUCTION_KEY_VK[keyName];
        global.bindGameplayKey(vk, true, () => onConstructionKey(keyName));
    });
}

bindConstructionKeys();
ensureUiBrowser();

mp.events.add('construction:nearNpc', (flag) => {
    constructionNearNpc = flag === true || flag === 1;
    if (!constructionNearNpc) closeConstructionDialog();
});

mp.events.add('construction:sync', (jsonRaw) => {
    try {
        const data = JSON.parse(String(jsonRaw || '{}'));
        if (!data || !data.active) {
            jobState = null;
            constructionWorking = false;
            updateWorkBlip(null);
            lastUiSig = '';
            refreshWorkUi();
            return;
        }
        jobState = {
            active: true,
            x: Number(data.x),
            y: Number(data.y),
            z: Number(data.z),
            key: String(data.key || 'F').toUpperCase(),
            hits: parseInt(data.hits, 10) || 0,
            hitsRequired: parseInt(data.hitsRequired, 10) || 22
        };
        constructionWorking = true;
        updateWorkBlip(jobState);
        setWaypoint(jobState.x, jobState.y);
        lastUiSig = '';
        refreshWorkUi();
    } catch (_e) {
        jobState = null;
        constructionWorking = false;
        updateWorkBlip(null);
        refreshWorkUi();
    }
});

global.bindGameplayKey(0x45, true, () => {
    try {
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.gui.cursor.visible) return;
        if (global.isChatOpen) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
        if (!mp.players.local.getVariable('auth')) return;
        if (inWorkZone && jobState && jobState.active) return;
        const now = Date.now();
        if (now - lastE < 700) return;
        if (constructionNearNpc || mp.players.local.getVariable('constructionNpc') === true) {
            lastE = now;
            openConstructionDialog();
        }
    } catch (_e) {}
});

mp.events.add('peddialog:button', (btn) => {
    if (!constructionDialogOpen) return;
    const id = String(btn || '');
    if (id === 'start') {
        closeConstructionDialog();
        mp.events.callRemote('construction:start:server');
        return;
    }
    if (id === 'stop') {
        closeConstructionDialog();
        mp.events.callRemote('construction:stop:server');
        return;
    }
    closeConstructionDialog();
});

mp.events.add('playerDeath', () => {
    closeConstructionDialog();
    jobState = null;
    constructionWorking = false;
    inWorkZone = false;
    updateWorkBlip(null);
    lastUiSig = '';
    refreshWorkUi();
});

mp.events.add('render', () => {
    if (!jobState || !jobState.active) return;
    try {
        if (mp.players.local.dimension !== 0) return;
    } catch (_e) {}
    drawWorkCylinder(jobState.x, jobState.y, jobState.z);
    const near = dist2dLocal(jobState.x, jobState.y) <= 2.85;
    if (near !== inWorkZone) refreshWorkUi();
});
