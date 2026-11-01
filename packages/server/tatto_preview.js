'use strict';

const fs = require('fs');
const path = require('path');

const MP_M_FREEMODE = mp.joaat('mp_m_freemode_01');
const MP_F_FREEMODE = mp.joaat('mp_f_freemode_01');
const GTA5RP_COLLECTION = 'gta5rptattoo_overlays';
const CATALOG_PATH = path.join(__dirname, 'config', 'tattoo_catalog.json');
const ZONE_NAMES = ['Торс', 'Голова', 'Левая рука', 'Правая рука', 'Левая нога', 'Правая нога'];

let tattooCatalog = [];

function loadTattooCatalog() {
    try {
        if (!fs.existsSync(CATALOG_PATH)) {
            console.log('[tatprev] Нет', CATALOG_PATH);
            tattooCatalog = [];
            return;
        }
        const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
        tattooCatalog = Array.isArray(parsed) ? parsed : [];
        console.log('[tatprev] Каталог салона:', tattooCatalog.length);
    } catch (e) {
        console.log('[tatprev] load catalog:', e.message || e);
        tattooCatalog = [];
    }
}

function isTatprevAdmin(player) {
    return (parseInt(player.adminlvl, 10) || 0) >= 5;
}

function isPlayerMale(player) {
    try {
        return player.model === MP_M_FREEMODE;
    } catch (_e) {
        return true;
    }
}

function gta5rpOverlay(num, male) {
    const n = parseInt(num, 10);
    if (!Number.isFinite(n)) return '';
    return male ? `MP_Gta5rptattoo_Tat_${n}_M` : `MP_Gta5rptattoo_Tat_${n}_F`;
}

/** Варианты имён для DLC-файла mp_gta5rptattoo_tat_NNN.ytd */
function buildDlcNameVariants(num) {
    const n = parseInt(num, 10);
    if (!Number.isFinite(n)) return [];
    const low = `mp_gta5rptattoo_tat_${n}`;
    const cap = `MP_Gta5rptattoo_Tat_${n}`;
    return [
        { collection: GTA5RP_COLLECTION, overlayMale: `${cap}_M`, overlayFemale: `${cap}_F`, label: 'pack overlay' },
        { collection: low, overlayMale: low, overlayFemale: low, label: 'ytd as collection' },
        { collection: low, overlayMale: `${cap}_M`, overlayFemale: `${cap}_F`, label: 'ytd + pack overlay' },
        { collection: GTA5RP_COLLECTION, overlayMale: low, overlayFemale: low, label: 'pack + ytd name' },
    ];
}

function buildDlcBrowseList(from, to, zone) {
    const list = [];
    const z = zone != null && !Number.isNaN(zone) ? zone : 0;
    for (let i = from; i <= to; i++) {
        list.push({
            collection: GTA5RP_COLLECTION,
            overlayMale: `MP_Gta5rptattoo_Tat_${i}_M`,
            overlayFemale: `MP_Gta5rptattoo_Tat_${i}_F`,
            zone: z,
            name: `DLC gta5rp #${i}`,
            dlcId: i,
        });
    }
    return list;
}

function pickOverlay(entry, player) {
    if (!entry) return '';
    if (entry.overlay && !entry.overlayMale) return entry.overlay;
    if (isPlayerMale(player)) return entry.overlayMale || entry.overlayFemale || '';
    return entry.overlayFemale || entry.overlayMale || '';
}

function beginPreviewMode(player) {
    player._tatprevWasShopc = player.getVariable('shopc') === true;
    player.setVariable('shopc', true);
    if (typeof global.capturePedShopRestoreSnapshot === 'function') {
        global.capturePedShopRestoreSnapshot(player);
    }
    stripForPreview(player);
}

function endPreviewMode(player) {
    player.setVariable('shopc', player._tatprevWasShopc === true);
    delete player._tatprevWasShopc;
    player._tattooPreview = null;
    player._tatprevBrowseIdx = null;
    player._tatprevZoneFilter = null;
    player._tatprevBrowseListLen = null;
    player._tatprevBrowseList = null;
    player._tatprevVariantIdx = null;
    player._tatprevVariantList = null;
    if (mp.players.exists(player)) {
        player.call('tatprev:stop');
    }
    if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
        global.reapplyPlayerClothesAfterShopClose(player);
    }
    if (typeof global.setTatto === 'function') {
        global.setTatto(player);
    }
}

function stripForPreview(player) {
    if (!mp.players.exists(player)) return;
    const isMale = isPlayerMale(player);
    player.setClothes(3, 15, 0, 0);
    player.setClothes(4, isMale ? 14 : 15, 0, 0);
    player.setClothes(6, isMale ? 34 : 35, 0, 0);
    player.setClothes(7, 0, 0, 0);
    player.setClothes(8, 15, 0, 0);
    player.setClothes(9, 0, 0, 0);
    player.setClothes(10, 0, 0, 0);
    player.setClothes(11, isMale ? 15 : 82, 0, 0);
}

function syncPreviewToClient(player, collection, overlay) {
    if (!mp.players.exists(player)) return;
    player.call('tatprev:apply', [collection, overlay]);
    setTimeout(() => {
        if (mp.players.exists(player)) player.call('tatprev:apply', [collection, overlay]);
    }, 150);
    setTimeout(() => {
        if (mp.players.exists(player)) player.call('tatprev:apply', [collection, overlay]);
    }, 500);
}

function applyPreviewDecoration(player, collection, overlay) {
    const col = String(collection || '').trim();
    const ov = String(overlay || '').trim();
    if (!col || !ov) return false;

    beginPreviewMode(player);

    player.clearDecorations();
    player.setDecoration(mp.joaat(col), mp.joaat(ov));
    player._tattooPreview = { collection: col, overlay: ov };
    syncPreviewToClient(player, col, ov);
    return true;
}

function getBrowseList(player) {
    if (Array.isArray(player._tatprevBrowseList) && player._tatprevBrowseList.length) {
        return player._tatprevBrowseList;
    }
    const zoneFilter = player._tatprevZoneFilter;
    if (zoneFilter == null || Number.isNaN(zoneFilter)) return tattooCatalog;
    return tattooCatalog.filter((e) => e.zone === zoneFilter);
}

function showCurrentPreview(player, entry, index, total, extra) {
    const col = entry.collection;
    const ov = pickOverlay(entry, player);
    const zoneName = ZONE_NAMES[entry.zone] || String(entry.zone);
    player.outputChatBox(`!{#74BE79}[tatprev] ${index + 1}/${total} | ${entry.name || '—'} | ${zoneName}${extra ? ' | ' + extra : ''}`);
    player.outputChatBox(`!{#ffffff}collection: !{#e53935}${col}`);
    player.outputChatBox(`!{#ffffff}overlay: !{#e53935}${ov}`);
    if (entry.dlcId != null) {
        player.outputChatBox(`!{#aaaaaa}Файл DLC: mp_gta5rptattoo_tat_${entry.dlcId}.ytd | /tatprev try ${entry.dlcId} — другие варианты имён`);
    }
}

function applyBrowseIndex(player, list, index) {
    if (!list.length) {
        return player.outputChatBox('!{red}[tatprev] Список пуст.');
    }
    const idx = ((index % list.length) + list.length) % list.length;
    const entry = list[idx];
    const overlay = pickOverlay(entry, player);
    if (!applyPreviewDecoration(player, entry.collection, overlay)) {
        return player.outputChatBox('!{red}[tatprev] Не удалось применить.');
    }
    player._tatprevBrowseIdx = idx;
    player._tatprevBrowseListLen = list.length;
    showCurrentPreview(player, entry, idx, list.length);
}

function applyDlcByNumber(player, num) {
    const overlay = gta5rpOverlay(num, isPlayerMale(player));
    if (!overlay) return player.outputChatBox('!{red}[tatprev] Укажи номер, напр. 160');
    if (!applyPreviewDecoration(player, GTA5RP_COLLECTION, overlay)) {
        return player.outputChatBox('!{red}[tatprev] Ошибка применения.');
    }
    player._tatprevBrowseIdx = null;
    player.outputChatBox(`!{#74BE79}[tatprev] DLC #${num} (торс) — ${GTA5RP_COLLECTION}`);
    player.outputChatBox(`!{#ffffff}overlay: !{#e53935}${overlay}`);
    player.outputChatBox(`!{#aaaaaa}Не видно? /tatprev try ${num} — перебор вариантов имён`);
}

function applyVariantIndex(player, num, variantIdx) {
    const variants = buildDlcNameVariants(num);
    if (!variants.length) return;
    const idx = ((variantIdx % variants.length) + variants.length) % variants.length;
    const v = variants[idx];
    const entry = {
        collection: v.collection,
        overlayMale: v.overlayMale,
        overlayFemale: v.overlayFemale,
        zone: 0,
        name: `try #${num} (${v.label})`,
    };
    player._tatprevVariantList = variants;
    player._tatprevVariantIdx = idx;
    player._tatprevBrowseList = variants.map((item, i) => ({
        collection: item.collection,
        overlayMale: item.overlayMale,
        overlayFemale: item.overlayFemale,
        zone: 0,
        name: `variant ${i + 1}: ${item.label}`,
        dlcId: num,
    }));
    applyBrowseIndex(player, player._tatprevBrowseList, idx);
}

function stopPreview(player) {
    endPreviewMode(player);
    isNotify(player, 3, 'top-mid', 'Просмотр тату остановлен.', 2500);
}

function printHelp(player) {
    player.outputChatBox('!{#74BE79}── Просмотр тату (admin 5+) ──');
    player.outputChatBox('!{#ffffff}/tatprev 160 — DLC gta5rp тату #160 (торс)');
    player.outputChatBox('!{#ffffff}/tatprev try 160 — варианты имён (если не видно)');
    player.outputChatBox('!{#ffffff}/tatprev dlc 155 175 — листать DLC #155–175');
    player.outputChatBox('!{#ffffff}/tatprev start [зона] — каталог салона');
    player.outputChatBox('!{#ffffff}/tatprev next | prev | show | strip | stop');
    player.outputChatBox('!{#ffffff}/tatprev set collection overlay');
}

mp.events.addCommand('tatprev', (player, fullText) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isTatprevAdmin(player)) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав (admin 5+).', 3000);
        }

        const args = String(fullText || '').trim().split(/\s+/).filter(Boolean);
        const sub = (args[0] || '').toLowerCase();

        if (!sub || sub === 'help') {
            return printHelp(player);
        }

        if (sub === 'stop' || sub === 'exit') {
            return stopPreview(player);
        }

        if (sub === 'strip') {
            beginPreviewMode(player);
            return player.outputChatBox('!{green}[tatprev] Одежда снята. Используй /tatprev 160 или next/prev.');
        }

        if (sub === 'show' || sub === 'info') {
            if (player._tattooPreview) {
                const p = player._tattooPreview;
                player.outputChatBox(`!{#74BE79}[tatprev] collection: ${p.collection}`);
                player.outputChatBox(`!{#74BE79}[tatprev] overlay: ${p.overlay}`);
                return;
            }
            return player.outputChatBox('!{red}[tatprev] Нет активного превью.');
        }

        if (sub === 'try') {
            const num = parseInt(args[1], 10);
            if (Number.isNaN(num)) {
                return player.outputChatBox('!{red}/tatprev try [номер] — напр. 160');
            }
            const nextIdx = player._tatprevVariantIdx != null ? player._tatprevVariantIdx + 1 : 0;
            return applyVariantIndex(player, num, nextIdx);
        }

        if (sub === 'dlc') {
            const a = parseInt(args[1], 10);
            const b = parseInt(args[2], 10);
            if (Number.isNaN(a)) {
                return player.outputChatBox('!{red}/tatprev dlc [от] [до] — напр. dlc 155 175');
            }
            const from = a;
            const to = Number.isNaN(b) ? a : Math.max(a, b);
            player._tatprevBrowseList = buildDlcBrowseList(from, to, 0);
            player._tatprevZoneFilter = null;
            applyBrowseIndex(player, player._tatprevBrowseList, 0);
            player.outputChatBox(`!{green}[tatprev] DLC #${from}–${to} (торс). next/prev, try N — варианты имён.`);
            return;
        }

        if (/^\d+$/.test(sub)) {
            return applyDlcByNumber(player, parseInt(sub, 10));
        }

        if (sub === 'start' || sub === 'browse') {
            const zoneRaw = args[1] != null && args[1] !== '' ? parseInt(args[1], 10) : null;
            if (zoneRaw != null && (Number.isNaN(zoneRaw) || zoneRaw < 0 || zoneRaw > 5)) {
                return player.outputChatBox('!{red}[tatprev] Зона 0–5.');
            }
            player._tatprevZoneFilter = zoneRaw;
            player._tatprevBrowseList = null;
            const list = getBrowseList(player);
            applyBrowseIndex(player, list, 0);
            const zoneNote = zoneRaw != null ? ` (${ZONE_NAMES[zoneRaw]})` : '';
            player.outputChatBox(`!{green}[tatprev] Каталог салона${zoneNote}. next/prev`);
            return;
        }

        if (sub === 'next' || sub === 'n') {
            const list = getBrowseList(player);
            if (player._tatprevBrowseIdx == null) {
                return player.outputChatBox('!{red}[tatprev] Сначала /tatprev start или /tatprev 160');
            }
            return applyBrowseIndex(player, list, player._tatprevBrowseIdx + 1);
        }

        if (sub === 'prev' || sub === 'p' || sub === 'back') {
            const list = getBrowseList(player);
            if (player._tatprevBrowseIdx == null) {
                return player.outputChatBox('!{red}[tatprev] Сначала /tatprev start или /tatprev 160');
            }
            return applyBrowseIndex(player, list, player._tatprevBrowseIdx - 1);
        }

        if (sub === 'set' || sub === 'dlcname') {
            const collection = args[1];
            const overlay = args.slice(2).join(' ');
            if (!collection || !overlay) {
                return player.outputChatBox('!{red}/tatprev set [collection] [overlay]');
            }
            if (!applyPreviewDecoration(player, collection, overlay)) {
                return player.outputChatBox('!{red}[tatprev] Пустые collection/overlay.');
            }
            player._tatprevBrowseIdx = null;
            player.outputChatBox(`!{#74BE79}[tatprev] collection: ${collection}`);
            player.outputChatBox(`!{#74BE79}[tatprev] overlay: ${overlay}`);
            return;
        }

        if (args[0] && args[1] && !['start', 'browse', 'next', 'n', 'prev', 'p', 'back', 'stop', 'exit', 'strip', 'show', 'info', 'help', 'set', 'dlcname', 'try', 'dlc'].includes(sub)) {
            const collection = args[0];
            const overlay = args.slice(1).join(' ');
            if (!applyPreviewDecoration(player, collection, overlay)) {
                return player.outputChatBox('!{red}[tatprev] Пустые collection/overlay.');
            }
            player._tatprevBrowseIdx = null;
            player.outputChatBox(`!{#74BE79}[tatprev] collection: ${collection}`);
            player.outputChatBox(`!{#74BE79}[tatprev] overlay: ${overlay}`);
            return;
        }

        printHelp(player);
    } catch (e) {
        console.log('[tatprev]', e.message || e);
    }
});

loadTattooCatalog();
