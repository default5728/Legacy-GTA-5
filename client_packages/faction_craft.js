'use strict';

const CRAFT_POSITIONS = {
    1: { x: 155.11581420898438, y: -1724.0513916015625, z: 29.291685104370117, radius: 1.2 },
    2: { x: 4.08227014541626, y: -1405.1331787109375, z: 29.262664794921875, radius: 1.2 },
    3: { x: 924.1286010742188, y: -1547.480712890625, z: 30.806177139282227, radius: 1.2 },
    4: { x: 838.3292236328125, y: -2333.073974609375, z: 30.334318161010742, radius: 1.2 },
    5: { x: 1395.1986083984375, y: -2070.8916015625, z: 51.99855041503906, radius: 1.2 },
    6: { x: 444.7294921875, y: -979.9067993164062, z: 30.68960189819336, radius: 1.2 }
};

const CRAFT_DRAW_DIST = 35;
const CRAFT_USE_DIST = 1.8;
let _craftBrowser = null;
let _craftOpen = false;
let _craftReady = false;
let _craftQueue = [];

function craftExec(code) {
    const b = _craftBrowser;
    if (!b || !mp.browsers.exists(b)) return;
    if (_craftReady) {
        try { b.execute(code); } catch (_) {}
    } else {
        _craftQueue.push(code);
    }
}

function getCraftBrowser() {
    if (_craftBrowser && mp.browsers.exists(_craftBrowser)) return _craftBrowser;
    _craftReady = false;
    _craftQueue = [];
    _craftBrowser = mp.browsers.new('package://browsers/faction_craft/index.html?v=2');
    _craftBrowser.active = false;
    return _craftBrowser;
}

function openCraftMenu(sections, materials) {
    getCraftBrowser();
    _craftBrowser.active = true;
    mp.gui.cursor.visible = true;
    mp.gui.chat.activate(false);
    _craftOpen = true;
    const payload = JSON.stringify(Array.isArray(sections) ? sections : []);
    craftExec(`try{FactionCraft.open(${payload}, ${parseInt(materials, 10) || 0});}catch(_e){}`);
}

function closeCraftMenu() {
    _craftOpen = false;
    if (_craftBrowser && mp.browsers.exists(_craftBrowser)) {
        _craftBrowser.active = false;
        craftExec('try{FactionCraft.close();}catch(_e){}');
    }
    mp.gui.cursor.visible = false;
    mp.gui.chat.activate(false);
}

mp.events.add('faction:craft:browser:ready', () => {
    _craftReady = true;
    _craftQueue.forEach((c) => {
        try { if (_craftBrowser && mp.browsers.exists(_craftBrowser)) _craftBrowser.execute(c); } catch (_) {}
    });
    _craftQueue = [];
});

mp.events.add('fraction:craft:open:c', (sectionsJson, materials) => {
    let sections = sectionsJson;
    if (typeof sections === 'string') {
        try { sections = JSON.parse(sections); } catch (_) { sections = []; }
    }
    openCraftMenu(sections, materials);
});

mp.events.add('fraction:craft:materials:c', (materials) => {
    craftExec(`try{FactionCraft.setMaterials(${parseInt(materials, 10) || 0});}catch(_e){}`);
});

mp.events.add('faction:craft:close', () => closeCraftMenu());

mp.events.add('faction:craft:do', (sectionId, itemId) => {
    mp.events.callRemote('fraction:craft:do:s', String(sectionId), String(itemId));
});

function craftCanInteract() {
    const pl = mp.players.local;
    if (!pl || !pl.getVariable('auth')) return false;
    if (pl.dimension !== 0 || pl.vehicle || pl.getVariable('dead') === true) return false;
    if (pl.isTypingInTextChat || mp.game.ui.isPauseMenuActive()) return false;
    if (_craftOpen) return false;
    if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return false;
    return true;
}

function drawCraftCylinder(x, y, z) {
    try {
        mp.game.graphics.drawMarker(
            1, x, y, z - 1.0,
            0, 0, 0, 0, 0, 0,
            1.0, 1.0, 0.55,
            110, 179, 70, 170,
            false, false, 2, false, null, null, false
        );
    } catch (_) {}
}

function drawCraftLabel(x, y, z, text) {
    try {
        mp.game.graphics.drawText(
            text,
            [x, y, z + 0.45],
            {
                font: 4,
                color: [232, 232, 232, 230],
                scale: [0.34, 0.34],
                outline: true,
                centre: true
            }
        );
    } catch (_) {}
}

mp.events.add('render', () => {
    try {
        if (_craftOpen) return;
        const pl = mp.players.local;
        if (!pl || !pl.getVariable('auth') || pl.dimension !== 0) return;
        const myFrac = parseInt(pl.getVariable('fraction'), 10) || 0;
        const pos = CRAFT_POSITIONS[myFrac];
        if (!pos) return;
        const px = pl.position.x;
        const py = pl.position.y;
        const pz = pl.position.z;
        const dx = px - pos.x;
        const dy = py - pos.y;
        const dz = pz - pos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > CRAFT_DRAW_DIST) return;
        drawCraftCylinder(pos.x, pos.y, pos.z);
        if (craftCanInteract() && d < CRAFT_USE_DIST) {
            drawCraftLabel(pos.x, pos.y, pos.z + 0.5, 'Крафт');
            if (mp.game.controls.isControlJustPressed(0, 38)) {
                mp.events.callRemote('fraction:craft:open:s');
            }
        }
    } catch (_) {}
});

global.bindGameplayKey(0x1B, false, () => {
    if (_craftOpen) closeCraftMenu();
});
