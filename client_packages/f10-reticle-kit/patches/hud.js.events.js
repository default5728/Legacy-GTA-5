// Вставить в client_packages/hud.js (если событий ещё нет)

mp.events.add('hudCrosshairApply', (jsonStr) => {
    hudrWhenReady(() => {
        try {
            const safe = JSON.stringify(jsonStr == null ? '' : String(jsonStr));
            hudr.execute(`hudMain.applyCrosshairJson(${safe})`);
        } catch (_e) {}
    });
});

mp.events.add('hudCrosshairShow', (show) => {
    hudrWhenReady(() => {
        try {
            hudr.execute(`hudMain.setCrosshairVisible(${!!show})`);
        } catch (_e) {}
    });
});

mp.events.add('hudCrosshairTarget', (hasTarget) => {
    hudrWhenReady(() => {
        try {
            hudr.execute(`hudMain.setCrosshairTargetNear(${!!hasTarget})`);
        } catch (_e) {}
    });
});
