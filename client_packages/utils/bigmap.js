class BigMap {
    constructor() {
        this.init();
        this.bigmap = [];
        this.bigmap.status = 0;
        this.bigmap.timer = null;
    }
    init() {
        mp.events.add('render', this.handleRender.bind(this));
        mp.game.ui.setRadarZoom(1.0);
        mp.game.ui.setRadarBigmapEnabled(false, false);
        global.getMinimapAnchor = () => {
            let sfX = 1.0 / 20.0;
            let sfY = 1.0 / 20.0;
            let safeZone = mp.game.graphics.getSafeZoneSize();
            let aspectRatio = mp.game.graphics.getScreenAspectRatio(false);
            let resolution = mp.game.graphics.getScreenActiveResolution(0, 0);
            let scaleX = 1.0 / resolution.x;
            let scaleY = 1.0 / resolution.y;
        
            let minimap = {
                width: scaleX * (resolution.x / (4 * aspectRatio)),
                height: scaleY * (resolution.y / 5.674),
                scaleX: scaleX,
                scaleY: scaleY,
                leftX: scaleX * (resolution.x * (sfX * (Math.abs(safeZone - 1.0) * 10))),
                bottomY: 1.0 - scaleY * (resolution.y * (sfY * (Math.abs(safeZone - 1.0) * 10))),
            };
        
            minimap.rightX = minimap.leftX + minimap.width;
            minimap.topY = minimap.bottomY - minimap.height;
            // Полоски HP/брони нативного радара чуть выше bitmap — сдвигаем «потолок» для CEF.
            const radarBarsNorm = scaleY * (resolution.y * 0.013);
            minimap.hudTopY = Math.max(0, minimap.topY - radarBarsNorm);
            return minimap;
        }
    }
    handleRender() {
        // Z использует сразу два GTA-control. Блокируем оба и всегда держим
        // радар в обычном режиме, чтобы игра или старый обработчик не могли
        // переключить увеличенную мини-карту.
        mp.game.controls.disableControlAction(0, 20, true);
        mp.game.controls.disableControlAction(0, 48, true);
        mp.game.controls.disableControlAction(2, 20, true);
        mp.game.controls.disableControlAction(2, 48, true);

        if (this.bigmap.timer != null) {
            clearTimeout(this.bigmap.timer);
            this.bigmap.timer = null;
        }

        this.bigmap.status = 0;
        mp.game.ui.setRadarBigmapEnabled(false, false);
        mp.game.ui.setRadarZoom(1.0);
    }
}

new BigMap();
