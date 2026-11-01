/**
 * Фрагмент из src_client/browsers/hud/script.js — Vue data/computed/methods для кастомного прицела.
 * Вставить в hudMain (Vue instance).
 */
// data:
// crosshair: null,
// crosshairActive: false,
// crosshairVisible: false,
// crosshairTargetNear: false

// computed:
crosshairLineColorComputed() {
    if (!this.crosshair) return '#e8e8e8';
    if (this.crosshairTargetNear) return this.crosshair.TargetColor || '#ef4444';
    return this.crosshair.DefaultColor || '#e8e8e8';
},
chStyleVTop() { return this._chVertStyle(true); },
chStyleVBot() { return this._chVertStyle(false); },
chStyleHLeft() { return this._chHorizStyle(true); },
chStyleHRight() { return this._chHorizStyle(false); },
chStyleRoot() {
    const c = this.crosshair;
    if (!c) return {};
    const cd = Number(c.CenterDistance) || 0;
    return { gap: `${cd}px` };
},
chStyleMid() {
    const c = this.crosshair;
    if (!c) return {};
    const cd = Number(c.CenterDistance) || 0;
    return { gap: `${cd}px` };
},
crosshairCenterDotVisible() {
    const c = this.crosshair;
    if (!c) return false;
    const v = c.CenterPointVisible;
    return v === true || v === 1 || v === '1' || v === 'true';
},
chStyleDot() {
    const c = this.crosshair;
    if (!c) return {};
    let s = Number(c.CenterPointSize);
    if (!Number.isFinite(s) || s < 0) s = 0;
    if (this.crosshairCenterDotVisible && s < 1) s = 1;
    const pr = c.CenterPointRadius || 0;
    const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
    return {
        width: `${s}px`,
        height: `${s}px`,
        minWidth: `${s}px`,
        minHeight: `${s}px`,
        flexShrink: '0',
        opacity: op,
        background: this.crosshairLineColorComputed,
        borderRadius: `${pr}%`
    };
},

// methods:
_chVertStyle(top) {
    const c = this.crosshair;
    if (!c) return {};
    const w = c.Width != null ? Number(c.Width) : 2;
    const h = c.Height != null ? Number(c.Height) : 10;
    const wPx = Number.isFinite(w) ? w : 2;
    const hPx = Number.isFinite(h) ? h : 10;
    const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
    const r = c.CrosshairRadius || 0;
    const col = this.crosshairLineColorComputed;
    const br = top ? `${r}% ${r}% 0 0` : `0 0 ${r}% ${r}%`;
    const style = {
        width: `${wPx}px`,
        height: `${hPx}px`,
        minWidth: `${wPx}px`,
        minHeight: `${hPx}px`,
        opacity: op,
        background: col,
        borderRadius: br,
        flexShrink: '0'
    };
    if (!hPx || !wPx) style.display = 'none';
    return style;
},
_chHorizStyle(left) {
    const c = this.crosshair;
    if (!c) return {};
    const w = c.Width != null ? Number(c.Width) : 2;
    const h = c.Height != null ? Number(c.Height) : 10;
    const wPx = Number.isFinite(w) ? w : 2;
    const hPx = Number.isFinite(h) ? h : 10;
    const op = c.ChossHairOpacity != null ? c.ChossHairOpacity : 1;
    const r = c.CrosshairRadius || 0;
    const col = this.crosshairLineColorComputed;
    const br = left ? `${r}% 0 0 ${r}%` : `0 ${r}% ${r}% 0`;
    const style = {
        width: `${hPx}px`,
        height: `${wPx}px`,
        minWidth: `${hPx}px`,
        minHeight: `${wPx}px`,
        opacity: op,
        background: col,
        borderRadius: br,
        flexShrink: '0'
    };
    if (!hPx || !wPx) style.display = 'none';
    return style;
},
applyCrosshairJson(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
        this.crosshair = null;
        this.crosshairActive = false;
        this.crosshairVisible = false;
        return;
    }
    try {
        const parsed = JSON.parse(jsonStr);
        let row = null;
        if (Array.isArray(parsed) && parsed[0]) row = parsed[0];
        else if (parsed && parsed.v === 2 && Array.isArray(parsed.phantom) && parsed.phantom[0]) {
            row = parsed.phantom[0];
        }
        if (!row) {
            this.crosshair = null;
            this.crosshairActive = false;
            this.crosshairVisible = false;
            return;
        }
        this.crosshair = row;
        this.crosshairActive = this.crosshair.Type === 'Crosshair';
        if (!this.crosshairActive) this.crosshairVisible = false;
    } catch (_e) {
        this.crosshair = null;
        this.crosshairActive = false;
        this.crosshairVisible = false;
    }
},
setCrosshairVisible(v) {
    this.crosshairVisible = !!v;
},
setCrosshairTargetNear(v) {
    this.crosshairTargetNear = !!v;
},
