global.tryCloseYgonEsc = function() { return false; };

setTimeout(() => {
    let talknpc1y = mp.browsers.new("package://browsers/ygon/dialognew/index.html?v=4");
    talknpc1y.active = false;
    try { talknpc1y.orderId = 150; } catch (_eOrd1) {}

    let final = mp.browsers.new("package://browsers/ygon/final/index.html");
    final.active = false;
    try { final.orderId = 150; } catch (_eOrd2) {}

    let ygonTalkModalOpen = false;
    let ygonFinalModalOpen = false;

    function ygonAnyModalOpen() {
        return ygonTalkModalOpen || ygonFinalModalOpen;
    }

    function openYgonTalkModal() {
        if (ygonTalkModalOpen) return;
        ygonTalkModalOpen = true;
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
        else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
    }

    function closeYgonTalkModal() {
        if (!ygonTalkModalOpen) return;
        ygonTalkModalOpen = false;
        if (!ygonAnyModalOpen()) {
            if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
            else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
        }
    }

    function openYgonFinalModal() {
        if (ygonFinalModalOpen) return;
        ygonFinalModalOpen = true;
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
        else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
    }

    function closeYgonFinalModal() {
        if (!ygonFinalModalOpen) return;
        ygonFinalModalOpen = false;
        if (!ygonAnyModalOpen()) {
            if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
            else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
        }
    }

    mp.events.add('closeygon', () => {
        try {
            if (talknpc1y && mp.browsers.exists(talknpc1y)) {
                talknpc1y.active = false;
                talknpc1y.execute(`NPCDialog.NPCIntercation('CrimeTasksDefault')`);
            }
        } catch (_eTalk) {}
        try {
            if (final && mp.browsers.exists(final)) final.active = false;
        } catch (_eFin) {}

        const hadTalk = ygonTalkModalOpen;
        const hadFinal = ygonFinalModalOpen;
        ygonTalkModalOpen = false;
        ygonFinalModalOpen = false;

        if (hadTalk || hadFinal) {
            if (typeof global.forceCloseNpcDialogModal === 'function') {
                global.forceCloseNpcDialogModal({ unfreeze: true });
            } else if (typeof global.showWorldUiAfterModal === 'function') {
                global.showWorldUiAfterModal();
            }
        } else {
            try { mp.gui.cursor.show(false, false); } catch (_eCur) {}
            try { mp.players.local.freezePosition(false); } catch (_eFr) {}
        }

        try { mp.events.callRemote('setvary', false); } catch (_eVar) {}
        try { mp.events.callRemote('setvaryf', false); } catch (_eVarF) {}
    });

    const YGON_NPC_X = 597.3562;
    const YGON_NPC_Y = -1456.1445;
    const YGON_NPC_R = 2.5;

    function isNearYgonNpcLocal() {
        try {
            const me = mp.players.local;
            if (!me || me.dimension !== 0) return false;
            const p = me.position;
            const dx = p.x - YGON_NPC_X;
            const dy = p.y - YGON_NPC_Y;
            return (dx * dx + dy * dy) <= (YGON_NPC_R * YGON_NPC_R);
        } catch (_e) {
            return false;
        }
    }

    global.bindGameplayKey(0x45, true, () => {
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
        if (!mp.players.local.getVariable('gangwar')) return;
        if (mp.players.local.getVariable('targetmenu')) return;
        if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen() && !ygonAnyModalOpen()) return;
        // Только рядом с Майклом (~2.5 м), не по залипшему zarabotok после телепорта.
        if (!isNearYgonNpcLocal()) return;

        if (!talknpc1y.active) {
            const login = String(mp.players.local.getVariable('login') || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            talknpc1y.execute(`NPCDialog.changelocalName('${login}');`);
            talknpc1y.active = true;
            openYgonTalkModal();
            try { mp.events.callRemote('setvary', true); } catch (_eVar) {}
        }
    });

    mp.events.add('quest:ygon:start:client', () => {
        mp.events.call('closeygon');
        mp.events.callRemote('quest:ygon:start:server');
    });

    let startblip = null;
    let finalblip = null;

    mp.events.add('quest:ygon:blip', (blip, toggle, pos) => {
        if (blip === 'start') {
            if (toggle === true) {
                if (startblip === null) {
                    startblip = mp.blips.new(315, pos, {
                        name: "Авто по заказу",
                        shortRange: false,
                        scale: 1,
                        color: 1,
                    });
                }
            } else {
                if (startblip !== null) {
                    startblip.destroy();
                    startblip = null;
                }
            }
        } else if (blip === 'final') {
            if (toggle === true) {
                if (finalblip === null) {
                    finalblip = mp.blips.new(315, pos, {
                        name: "Место доставки",
                        shortRange: false,
                        scale: 1,
                        color: 1,
                    });
                }
            } else {
                if (finalblip !== null) {
                    finalblip.destroy();
                    finalblip = null;
                }
            }
        }
    });

    global.vehicleBlips = global.vehicleBlips || {};

    mp.events.add('quest:ygon:updateBlip', (pos, playerStatic) => {
        if (!global.vehicleBlips[playerStatic]) {
            global.vehicleBlips[playerStatic] = mp.blips.new(315, pos, {
                name: "Угнанная машина",
                shortRange: false,
                scale: 1,
                color: 1,
            });
        } else {
            global.vehicleBlips[playerStatic].setPosition(pos);
        }
    });

    mp.events.add('quest:ygon:removeBlip', (playerStatic) => {
        if (global.vehicleBlips[playerStatic]) {
            global.vehicleBlips[playerStatic].destroy();
            delete global.vehicleBlips[playerStatic];
        }
    });

    let ygonMarker = null;
    let ygonColshape = null;
    mp.events.add('quest:ygon:createmarker', (position, toggle) => {
        if (!toggle) {
            if (ygonMarker) {
                ygonMarker.destroy();
                ygonMarker = null;
            }
            if (ygonColshape) {
                ygonColshape.destroy();
                ygonColshape = null;
            }
            return;
        }

        if (!position) return;
        ygonMarker = mp.markers.new(1, new mp.Vector3(position.x, position.y, position.z - 1.12), 1.5, {
            color: [255, 0, 0, 100],
            visible: true,
            dimension: mp.players.local.dimension
        });

        ygonColshape = mp.colshapes.newSphere(position.x, position.y, position.z, 2);

        // ygonTextLabel убран — только метка на карте
    });

    let ygonDeliverPending = false;

    mp.events.add('playerEnterColshape', (shape) => {
        if (shape !== ygonColshape) return;
        if (!mp.players.local.getVariable('ygon') || !mp.players.local.vehicle) return;
        if (ygonDeliverPending) return;
        ygonDeliverPending = true;
        mp.events.callRemote('setvaryf', true);
        setTimeout(() => { ygonDeliverPending = false; }, 2000);
    });

    mp.events.add('playerExitColshape', (shape) => {
        if (shape === ygonColshape) {
            mp.events.callRemote('setvaryf', false);
        }
    });

    mp.events.add('quest:ygon:final:client', (otvet) => {
        if (final && mp.browsers.exists(final)) final.active = false;
        closeYgonFinalModal();
        if (otvet == 'yes') {
            mp.events.callRemote('quest:ygon:final:server');
        }
        try { mp.events.callRemote('setvaryf', false); } catch (_eVarF) {}
    });

    mp.events.add('setwaypoint', (x, y) => {
        mp.game.ui.setNewWaypoint(x, y);
    });

    global.getYgonTalkBrowser = function () {
        try {
            if (!talknpc1y || !mp.browsers.exists(talknpc1y) || !talknpc1y.active) return null;
            return talknpc1y;
        } catch (_e) {
            return null;
        }
    };

    global.getYgonFinalBrowser = function () {
        try {
            if (!final || !mp.browsers.exists(final) || !final.active) return null;
            return final;
        } catch (_e) {
            return null;
        }
    };

    global.tryCloseYgonEsc = function() {
        if ((!talknpc1y || !talknpc1y.active) && (!final || !final.active)) return false;
        mp.events.call('closeygon');
        return true;
    };

    if (typeof global.registerActiveBrowserOverlay === 'function') {
        global.registerActiveBrowserOverlay(() => global.getYgonTalkBrowser && global.getYgonTalkBrowser());
        global.registerActiveBrowserOverlay(() => global.getYgonFinalBrowser && global.getYgonFinalBrowser());
    }
}, 2000);
