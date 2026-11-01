/**
 * ESC: закрыть верхнее открытое меню (порядок важен — сначала модальные/оверлеи).
 * После закрытия меню тот же кадр/следующие кадры иначе открывают паузу GTA (карта) —
 * кратко глушим INPUT_FRONTEND_PAUSE (199) и альтернативу (200).
 *
 * Ключевое: подавление действует ТОЛЬКО для того нажатия, которое закрыло меню.
 * Как только свежее нажатие ESC ничего не закрыло — подавление тут же сбрасывается,
 * и нативная пауза (карта) открывается нормально, без зажатий и глюков.
 */
let escPauseSuppressFrames = 0;
const ESC_PAUSE_SUPPRESS_FRAMES = 22;

function suppressPauseMenuAfterEsc(frames) {
    const next =
        Number.isFinite(frames) && frames > 0 ? Math.floor(frames) : ESC_PAUSE_SUPPRESS_FRAMES;
    escPauseSuppressFrames = Math.max(escPauseSuppressFrames, next);
}

if (typeof global !== 'undefined') {
    global.suppressPauseMenuAfterEsc = suppressPauseMenuAfterEsc;
}

function tryCloseEsc(fn) {
    if (typeof fn !== 'function') return false;
    const ok = fn();
    if (ok) suppressPauseMenuAfterEsc();
    return ok;
}

mp.events.add('render', () => {
    if (escPauseSuppressFrames <= 0) return;
    escPauseSuppressFrames--;
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
});

global.bindGameplayKey(0x1B, true, () => {
    if (global.__keybindEscSwallowUntilUp) {
        suppressPauseMenuAfterEsc();
        return;
    }
    if (global.__keybindCaptureActive || (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen())) {
        if (tryCloseEsc(global.tryClosePlayerMenuEsc)) return;
        suppressPauseMenuAfterEsc();
        return;
    }
    if (mp.game.ui.isPauseMenuActive()) return;
    if (tryCloseEsc(global.tryCloseChatEsc)) return;
    /** Смена внешности (EMS): полный экран — ESC отменяет без списания. */
    if (tryCloseEsc(global.tryCloseCharCreatorEditEsc)) return;
    if (tryCloseEsc(global.tryCloseWarMapEsc)) return;
    /** Чёрный рынок / лицензионный склад: ESC должен закрывать окно CEF, а не только режим игрового курсора. */
    if (tryCloseEsc(global.tryCloseBlackShopEsc)) return;
    if (tryCloseEsc(global.tryCloseKablukBarEsc)) return;
    if (tryCloseEsc(global.tryCloseAmmuEsc)) return;
    if (tryCloseEsc(global.tryCloseCaptResultEsc)) return;
    if (tryCloseEsc(global.tryCloseFracInteractEsc)) return;
    if (tryCloseEsc(global.tryCloseFractionEsc)) return;
    if (tryCloseEsc(global.tryCloseFamilyTabletEsc)) return;

    if (typeof targetMenu !== 'undefined' && targetMenu && targetMenu.active && typeof global.CloseTarget === 'function') {
        global.CloseTarget();
        suppressPauseMenuAfterEsc();
        return;
    }
    if (tryCloseEsc(global.tryCloseReportEsc)) return;
    if (tryCloseEsc(global.tryCloseAdminSpectateEsc)) return;
    if (tryCloseEsc(global.tryClosePhoneMarketEsc)) return;
    if (tryCloseEsc(global.tryCloseInventoryEsc)) return;
    if (tryCloseEsc(global.tryCloseFibArmorEsc)) return;
    if (tryCloseEsc(global.tryCloseAdminEsc)) return;
    if (tryCloseEsc(global.tryCloseAnimsEsc)) return;
    if (tryCloseEsc(global.tryClosePlayerMenuEsc)) return;
    if (tryCloseEsc(global.tryCloseF3Esc)) return;
    if (tryCloseEsc(global.tryCloseRentEsc)) return;
    if (tryCloseEsc(global.tryCloseMbaParkerEsc)) return;
    if (tryCloseEsc(global.tryCloseEmsEsc)) return;
    if (tryCloseEsc(global.tryCloseBarbershopEsc)) return;
    if (tryCloseEsc(global.tryCloseShopClothesEsc)) return;
    if (tryCloseEsc(global.tryCloseDonateClothesEsc)) return;
    if (tryCloseEsc(global.tryCloseSpectrumClothesEsc)) return;
    if (tryCloseEsc(global.tryCloseAnyClothesShopEsc)) return;
    if (tryCloseEsc(global.tryCloseTattoEsc)) return;
    if (tryCloseEsc(global.tryCloseClothesEditorEsc)) return;
    if (tryCloseEsc(global.tryCloseAutosalonEsc)) return;
    if (tryCloseEsc(global.tryCloseLsCustomEsc)) return;
    if (tryCloseEsc(global.tryCloseGlobalCasinoEsc)) return;
    if (tryCloseEsc(global.tryCloseArenaEsc)) return;
    if (tryCloseEsc(global.tryCloseCasinoEsc)) return;
    if (tryCloseEsc(global.tryCloseFamilyEsc)) return;
    if (tryCloseEsc(global.tryCloseFamilyHubExitEsc)) return;
    if (tryCloseEsc(global.tryCloseCoburaSellEsc)) return;
    if (tryCloseEsc(global.tryCloseYgonEsc)) return;
    if (tryCloseEsc(global.tryCloseBonusEsc)) return;
    /** Ничего не закрыли — это обычное нажатие ESC: снимаем подавление, карта открывается сразу. */
    escPauseSuppressFrames = 0;
});
