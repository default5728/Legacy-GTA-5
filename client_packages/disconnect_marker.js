/**
 * Локальная метка выхода игрока.
 * Показ зависит от F10 → «Скрыть маркер выхода» (settings.disconnect_marker === true → показывать).
 * По умолчанию скрыто.
 */
const localDisconnectMarkers = new Map();

function isDisconnectMarkerEnabled() {
    try {
        const s = mp.storage.data && mp.storage.data.settings;
        if (!s || s.disconnect_marker === undefined || s.disconnect_marker === null) return false;
        return !!s.disconnect_marker;
    } catch (_e) {
        return false;
    }
}

function destroyLocalDisconnectMarker(id) {
    try {
        const entry = localDisconnectMarkers.get(id);
        if (!entry) return;
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
        }
        try {
            if (entry.marker && mp.markers.exists(entry.marker)) entry.marker.destroy();
        } catch (_e1) {}
        try {
            if (entry.label && mp.labels.exists(entry.label)) entry.label.destroy();
        } catch (_e2) {}
        localDisconnectMarkers.delete(id);
    } catch (_e) {}
}

function clearAllLocalDisconnectMarkers() {
    try {
        const ids = Array.from(localDisconnectMarkers.keys());
        for (let i = 0; i < ids.length; i++) destroyLocalDisconnectMarker(ids[i]);
    } catch (_e) {}
}

function addLocalDisconnectMarker(payloadJson) {
    try {
        if (!isDisconnectMarkerEnabled()) return;

        const d = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
        if (!d) return;

        const id = d.id;
        const x = Number(d.x);
        const y = Number(d.y);
        const z = Number(d.z);
        const dim = Number(d.dim) || 0;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

        try {
            if ((mp.players.local.dimension || 0) !== dim) return;
        } catch (_eDim) {}

        destroyLocalDisconnectMarker(id);

        const name = String(d.name || 'Unknown');
        const staticId = d.staticId != null ? d.staticId : '-';
        const dateTime = String(d.dateTime || '');
        const labelText = `~w~${name}\n~w~#: ${staticId} ID: ${id}\n~w~${dateTime}`;

        const marker = mp.markers.new(
            42,
            new mp.Vector3(x, y, z),
            1,
            {
                dimension: dim,
                color: [255, 255, 255, 220],
                rotation: new mp.Vector3(0, 0, 0),
                visible: true
            }
        );

        const label = mp.labels.new(
            labelText,
            new mp.Vector3(x, y, z + 0.3),
            {
                los: true,
                font: 0,
                drawDistance: 10,
                dimension: dim,
                color: [255, 255, 255, 255]
            }
        );

        const timer = setTimeout(() => {
            destroyLocalDisconnectMarker(id);
        }, 5 * 60 * 1000);

        localDisconnectMarkers.set(id, { marker, label, timer });
    } catch (_e) {}
}

mp.events.add('disconnectMarker:add', (payloadJson) => {
    addLocalDisconnectMarker(payloadJson);
});

mp.events.add('disconnectMarker:remove', (id) => {
    destroyLocalDisconnectMarker(id);
});

mp.events.add('disconnectMarker:settingChanged', (enabled) => {
    try {
        if (!enabled) clearAllLocalDisconnectMarkers();
    } catch (_e) {}
});
