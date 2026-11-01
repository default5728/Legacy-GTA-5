'use strict';

const tattooSalonLabels = require('./tattoo_salon_labels.js');

const EMS_NPC_LABEL_LIFT = 1.15;
const EMS_NPC_LABEL_OPTS = {
    font: 4,
    drawDistance: 12,
    color: [255, 255, 255, 255],
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
};

let emsDialogBr = null;
let emsDlgOpen = false;
let emsDlgMode = 'main';
let emscolshape = false;
let peddlgTattoos = [];
let peddlgMakeups = [];

const colshapeems = mp.colshapes.newSphere(333.4821, -1429.4337, 32.5093, 2.5);

function ensureEmsDialogBrowser() {
    if (emsDialogBr && mp.browsers.exists(emsDialogBr)) return emsDialogBr;
    emsDialogBr = mp.browsers.new('package://browsers/ems/dialog/index.html');
    if (emsDialogBr) {
        emsDialogBr.active = false;
        try { emsDialogBr.orderId = 150; } catch (_e) {}
    }
    return emsDialogBr;
}

function emsDialogExec(cmd) {
    try {
        ensureEmsDialogBrowser();
        if (emsDialogBr && mp.browsers.exists(emsDialogBr)) emsDialogBr.execute(cmd);
    } catch (_e) {}
}

function emsTattooRowsForUi(tattooKeys) {
    if (!Array.isArray(tattooKeys)) return [];
    return tattooKeys.map((k) => {
        const key = String(k || '');
        const name = tattooSalonLabels && typeof tattooSalonLabels[key] === 'string' ? tattooSalonLabels[key] : '';
        const label = name ? name : key;
        return { key, label };
    });
}

function emsMakeupRowsForUi(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(function (r) {
        return { id: r.id, label: 'Стиль ' + (r.style_id + 1) + ' · ' + parseFloat(r.opacity).toFixed(2) };
    });
}

function emsDialogShow(cfg) {
    emsDialogExec('window.emsDialog && window.emsDialog.show(' + JSON.stringify(cfg) + ')');
}

function emsMoneyLabel(n) {
    return String(Math.max(0, Math.round(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function openEmsDialogMain() {
    if (emsDlgOpen) {
        emsDlgMode = 'main';
        emsDialogShow({
            actor: 'Медработник:',
            text: 'Здравствуйте! Могу свести татуировки, убрать макияж или изменить внешность. Процедуры — 10 000 $, смена внешности — 100 000 $ или 150 DP.',
            layout: 'triple',
            buttons: [
                { id: 'tattoo', label: 'Смыть тату' },
                { id: 'makeup', label: 'Смыть макияж' },
                { id: 'appearance', label: 'Сменить внешность' },
                { id: 'leave', label: 'Уйти' }
            ]
        });
        return;
    }

    ensureEmsDialogBrowser();
    emsDlgOpen = true;
    emsDlgMode = 'main';
    emsDialogBr.active = true;
    if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
    else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();

    emsDialogShow({
        actor: 'Медработник:',
        text: 'Здравствуйте! Могу свести татуировки, убрать макияж или изменить внешность. Процедуры — 10 000 $, смена внешности — 100 000 $ или 150 DP.',
        layout: 'triple',
        buttons: [
            { id: 'tattoo', label: 'Смыть тату' },
            { id: 'makeup', label: 'Смыть макияж' },
            { id: 'appearance', label: 'Сменить внешность' },
            { id: 'leave', label: 'Уйти' }
        ]
    });
}

function openEmsDialogAppearancePay() {
    emsDlgMode = 'appearance_pay';
    emsDialogShow({
        actor: 'Медработник:',
        text: 'Смена внешности откроет редактор персонажа: лицо, причёска и другие параметры. Оплата: 100 000 $ или 150 DP.',
        layout: 'scroll',
        buttons: [
            { id: 'pay_money', label: 'Сменить внешность · 100 000 $' },
            { id: 'pay_dp', label: 'Сменить внешность · 150 DP' },
            { id: 'back', label: 'Назад' }
        ]
    });
}

function openEmsDialogTattooList() {
    emsDlgMode = 'tattoo';
    const buttons = [];

    if (!peddlgTattoos.length) {
        buttons.push({ id: 'back', label: 'Назад' });
        emsDialogShow({
            actor: 'Медработник:',
            text: 'У вас нет татуировок, которые можно свести.',
            layout: 'single',
            buttons: buttons
        });
        return;
    }

    peddlgTattoos.forEach(function (t, i) {
        buttons.push({ id: 'pick_' + i, label: t.label + ' · 10 000 $' });
    });
    buttons.push({ id: 'remove_all', label: 'Снять все · ' + emsMoneyLabel(peddlgTattoos.length * 10000) + ' $' });
    buttons.push({ id: 'back', label: 'Назад' });

    emsDialogShow({
        actor: 'Медработник:',
        text: 'Выберите татуировку для сведения или снимите все сразу.',
        layout: 'scroll',
        buttons: buttons
    });
}

function openEmsDialogMakeupList() {
    emsDlgMode = 'makeup';
    const buttons = [];

    if (!peddlgMakeups.length) {
        buttons.push({ id: 'back', label: 'Назад' });
        emsDialogShow({
            actor: 'Медработник:',
            text: 'У вас нет макияжа, который можно снять.',
            layout: 'single',
            buttons: buttons
        });
        return;
    }

    peddlgMakeups.forEach(function (m, i) {
        buttons.push({ id: 'pick_' + i, label: m.label + ' · 10 000 $' });
    });
    buttons.push({ id: 'remove_all', label: 'Снять все · ' + emsMoneyLabel(peddlgMakeups.length * 10000) + ' $' });
    buttons.push({ id: 'back', label: 'Назад' });

    emsDialogShow({
        actor: 'Медработник:',
        text: 'Выберите макияж, который нужно снять, или снимите все сразу.',
        layout: 'scroll',
        buttons: buttons
    });
}

function closeEmsDialog() {
    if (!emsDlgOpen) return;
    emsDlgOpen = false;
    emsDlgMode = 'main';
    emsDialogExec('window.emsDialog && window.emsDialog.hide()');
    if (emsDialogBr && mp.browsers.exists(emsDialogBr)) emsDialogBr.active = false;
    if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
    else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
}

function requestTattooList() {
    mp.events.callRemote('ems:tattoo:open:s');
}

function requestMakeupList() {
    mp.events.callRemote('ems:makeup:open:s');
}

function emsClickGuard() {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
        return false;
    }
    mp.players.local.clicked = new Date().getTime();
    return true;
}

function canOpenEmsDialogNow() {
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (mp.players.local.isTypingInTextChat) return false;
    if (mp.players.local.getVariable('dead')) return false;
    if (mp.players.local.vehicle) return false;
    if (mp.players.local.getVariable('afklobby')) return false;
    if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen()) return false;
    if (typeof global.isWorldChromeSuppressedByOverlay === 'function' && global.isWorldChromeSuppressedByOverlay()) return false;
    if (typeof global.isNearRentCarZone === 'function' && global.isNearRentCarZone()) return false;
    return true;
}

mp.events.add('ems:dialog:btn', (actionRaw) => {
    if (!emsDlgOpen) return;
    const action = String(actionRaw || '');

    if (action === 'esc') {
        if (emsDlgMode === 'main') closeEmsDialog();
        else openEmsDialogMain();
        return;
    }

    if (emsDlgMode === 'main') {
        if (action === 'tattoo') { requestTattooList(); return; }
        if (action === 'makeup') { requestMakeupList(); return; }
        if (action === 'appearance') { openEmsDialogAppearancePay(); return; }
        if (action === 'leave') { closeEmsDialog(); return; }
        return;
    }

    if (emsDlgMode === 'appearance_pay') {
        if (action === 'back') { openEmsDialogMain(); return; }
        if (action === 'pay_money') {
            if (!emsClickGuard()) return;
            closeEmsDialog();
            mp.events.callRemote('ems:appearance:pay:s', 'money');
            return;
        }
        if (action === 'pay_dp') {
            if (!emsClickGuard()) return;
            closeEmsDialog();
            mp.events.callRemote('ems:appearance:pay:s', 'dp');
            return;
        }
        return;
    }

    if (emsDlgMode === 'tattoo') {
        if (action === 'back') { openEmsDialogMain(); return; }
        if (action === 'remove_all') {
            if (!emsClickGuard()) return;
            mp.events.callRemote('ems:tattoo:accept:s');
            return;
        }
        if (action.indexOf('pick_') === 0) {
            const idx = parseInt(action.slice(5), 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= peddlgTattoos.length) return;
            if (!emsClickGuard()) return;
            mp.events.callRemote('ems:tattoo:removeOne:s', idx);
        }
        return;
    }

    if (emsDlgMode === 'makeup') {
        if (action === 'back') { openEmsDialogMain(); return; }
        if (action === 'remove_all') {
            if (!emsClickGuard()) return;
            mp.events.callRemote('ems:makeup:accept:s');
            return;
        }
        if (action.indexOf('pick_') === 0) {
            const idx = parseInt(action.slice(5), 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= peddlgMakeups.length) return;
            if (!emsClickGuard()) return;
            mp.events.callRemote('ems:makeup:removeOne:s', idx);
        }
    }
});

global.bindGameplayKey(0x45, true, () => {
    if (!canOpenEmsDialogNow()) return;
    if (!emsDlgOpen && emscolshape === true) openEmsDialogMain();
});

mp.events.add('ems:tattoo:data', (jsonStr) => {
    try {
        const keys = JSON.parse(typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr));
        peddlgTattoos = emsTattooRowsForUi(keys);
        if (emsDlgOpen) openEmsDialogTattooList();
    } catch (_e) {}
});

mp.events.add('ems:makeup:data', (jsonStr) => {
    try {
        const raw = JSON.parse(typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr));
        peddlgMakeups = emsMakeupRowsForUi(raw);
        if (emsDlgOpen) openEmsDialogMakeupList();
    } catch (_e) {}
});

global.tryCloseEmsEsc = function () {
    if (!emsDlgOpen) return false;
    if (emsDlgMode === 'main') closeEmsDialog();
    else openEmsDialogMain();
    return true;
};

global.getEmsDialogBrowser = function () {
    try {
        if (!emsDialogBr || !mp.browsers.exists(emsDialogBr) || !emsDialogBr.active) return null;
        return emsDialogBr;
    } catch (_e) {
        return null;
    }
};

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => global.getEmsDialogBrowser && global.getEmsDialogBrowser());
}

mp.events.add('playerEnterColshape', (colshape) => {
    if (colshape === colshapeems) emscolshape = true;
});

mp.events.add('playerExitColshape', (colshape) => {
    if (colshape === colshapeems) {
        emscolshape = false;
        if (emsDlgOpen) closeEmsDialog();
    }
});

const EMS_NPCS = [
    {
        x: 333.4821,
        y: -1429.4337,
        z: 32.5093,
        heading: 5.7930,
        model: 's_m_m_paramedic_01',
        NPCName: 'Смена внешности (E)'
    },
    {
        x: 330.4800109863281,
        y: -1400.243896484375,
        z: 32.5093994140625,
        heading: 320.15789794921875,
        model: 'a_m_m_prolhost_01',
        NPCName: 'Аренда транспорта (E)'
    }
];

for (let i = 0; i < EMS_NPCS.length; i++) {
    const npc = EMS_NPCS[i];
    mp.peds.new(mp.game.joaat('' + npc.model), new mp.Vector3(npc.x, npc.y, npc.z), npc.heading, 0);
    mp.labels.new('' + npc.NPCName, new mp.Vector3(npc.x, npc.y, npc.z + EMS_NPC_LABEL_LIFT), EMS_NPC_LABEL_OPTS);
}

setTimeout(ensureEmsDialogBrowser, 0);
