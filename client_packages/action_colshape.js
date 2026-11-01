const localPlayer = mp.players.local;
const actionColshapeList = new Set;

class ActionColshape {
    constructor(a, b, c, d, e) {
        this.position = a;
        this.dimension = b;
        this.range = c;
        this.text = d;
        this.onPlayerUse = e;
        this.active = true;
        this.colshape = mp.colshapes.newCircle(this.position.x, this.position.y, this.range, this.dimension);
        this.colshape.actionColshape = this;
        this.onceMode = false;
        this.isPlayerCanUse = () => true;
        this.getText = () => this.text;
    }
    destroy() {
        if (mp.colshapes.exists(this.colshape)) {
            this.colshape.destroy();
            if (actionColshapeList.has(this)) {
                actionColshapeList.delete(this);
                update();
            }
        }
    }
}

class TriggerColshape {
    constructor(a, b, c, d, e) {
        this.position = a;
        this.dimension = b;
        this.range = c;
        this.onEnter = d;
        this.onLeave = e;
        this.active = true;
        this.colshape = mp.colshapes.newCircle(this.position.x, this.position.y, this.range, this.dimension);
        this.colshape.triggerColshape = this;
    }
    destroy() {
        if (mp.colshapes.exists(this.colshape)) this.colshape.destroy();
    }
}

mp.events.add('playerEnterColshape', (a) => {
    if (a.actionColshape !== undefined) {
        if (localPlayer.vehicle) return;
        if (Math.abs(a.actionColshape.position.z - localPlayer.position.z) > 2) return;
        if (!a.actionColshape.active || !a.actionColshape.isPlayerCanUse()) return;
        actionColshapeList.add(a.actionColshape);
        update();
    } else if (a.triggerColshape !== undefined) {
        a.triggerColshape.onEnter();
    }
});

mp.events.add('playerExitColshape', (a) => {
    if (a.actionColshape !== undefined) {
        actionColshapeList.delete(a.actionColshape);
        update();
    } else if (a.triggerColshape !== undefined) {
        a.triggerColshape.onLeave();
    }
});

global.bindGameplayKey(69, true, () => {
    if (mp.gui.cursor.visible || global.isChatOpen || global.disableKeys) return;
    const size = actionColshapeList.size;
    if (size === 0) return;
    const col = Array.from(actionColshapeList)[size - 1];
    col.onPlayerUse();
    if (col.onceMode) {
        actionColshapeList.clear();
        update();
    }
});

function update() {}

global.ActionColshape = ActionColshape;
global.TriggerColshape = TriggerColshape;
