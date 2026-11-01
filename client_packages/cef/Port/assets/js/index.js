const KEYS = [{ name: 'E', keyCode: 69 }];

function cefTrigger(name) {
    try {
        if (typeof mp !== 'undefined' && mp.trigger) mp.trigger(name);
    } catch (_e) {}
}

var app = new Vue({
    el: '#app',
    data: {
        opened: false,
        key: 0,
        zoneLeft: 0,
        zoneWidth: 20,
        needlePos: 50,
        direction: 1,
        busy: false
    },
    computed: {
        keyName() {
            var row = KEYS[this.key];
            return row ? row.name : 'E';
        },
        zoneStyle() {
            return { left: this.zoneLeft + '%' };
        }
    },
    mounted() {
        var self = this;
        setInterval(function () {
            if (!self.opened) return;
            self.zoneLeft += self.direction * 1.11;
            var maxLeft = 100 - self.zoneWidth;
            if (self.zoneLeft >= maxLeft) {
                self.zoneLeft = maxLeft;
                self.direction = -1;
            } else if (self.zoneLeft <= 0) {
                self.zoneLeft = 0;
                self.direction = 1;
            }
        }, 16);
        document.addEventListener('keyup', function (ev) {
            self.tryKey(ev.keyCode);
        });
    },
    methods: {
        init(keyIndex) {
            this.busy = false;
            this.opened = true;
            this.zoneLeft = 0;
            this.direction = 1;
            var idx = parseInt(keyIndex, 10);
            if (!isFinite(idx) || idx < 0 || idx >= KEYS.length) {
                idx = Math.floor(Math.random() * KEYS.length);
            }
            this.key = idx;
        },
        tryKey(keyCode) {
            if (!this.opened || this.busy) return;
            var row = KEYS[this.key];
            if (!row || Number(keyCode) !== row.keyCode) return;
            this.busy = true;
            this.opened = false;
            var zoneEnd = this.zoneLeft + this.zoneWidth;
            var hit = this.needlePos >= this.zoneLeft && this.needlePos <= zoneEnd;
            cefTrigger(hit ? 'client.portmenu.yes' : 'client.portmenu.no');
        },
        closeMinigame() {
            this.opened = false;
            this.busy = false;
        }
    }
});

window.portInit = function (keyIndex) {
    try { app.init(keyIndex); } catch (_e) {}
};
window.portTryKey = function (keyCode) {
    try { app.tryKey(keyCode); } catch (_e) {}
};
window.portCloseMinigame = function () {
    try { app.closeMinigame(); } catch (_e) {}
};
