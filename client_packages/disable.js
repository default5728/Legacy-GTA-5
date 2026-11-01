mp.game.audio.startAudioScene("CHARACTER_CHANGE_IN_SKY_SCENE");
mp.game.audio.setAudioFlag("DisableFlightMusic", true);

// Полностью убираем стандартное колесо оружия GTA (TAB/колёсико),
// включая автомобильные варианты управления и надпись «Безоружный».
const disabledWeaponWheelControls = [14, 15, 16, 17, 37, 99, 100, 115, 116];

mp.events.add('render', () => {
    for (let group = 0; group <= 2; group++) {
        for (const control of disabledWeaponWheelControls) {
            mp.game.controls.disableControlAction(group, control, true);
        }
    }

    // HUD::BLOCK_WEAPON_WHEEL_THIS_FRAME
    mp.game.invoke('0x0AFC4AF510774B47');
    mp.game.ui.hideHudComponentThisFrame(2);  // WEAPON_ICON
    mp.game.ui.hideHudComponentThisFrame(19); // WEAPON_WHEEL
    mp.game.ui.hideHudComponentThisFrame(20); // WEAPON_WHEEL_STATS
});

mp.events.add('render', () => {
    // ОТКЛЮЧЕНИЕ Z — стандартное переключение размера мини-карты
    mp.game.controls.disableControlAction(0, 20, true);
    mp.game.controls.disableControlAction(0, 48, true);
    mp.game.controls.disableControlAction(2, 20, true);
    mp.game.controls.disableControlAction(2, 48, true);

    const player = mp.players.local;
    //ЗЗ — полностью запрещены стрельба, удары кулаком и ближний бой (прицел/наведение разрешён)
    if (mp.players.local.getVariable('greenzones') === true) {
        mp.game.controls.disableControlAction(0, 24, true);  // ATTACK
        mp.game.controls.disableControlAction(0, 69, true);  // VEH_ATTACK
        mp.game.controls.disableControlAction(0, 70, true);  // VEH_ATTACK2
        mp.game.controls.disableControlAction(0, 92, true);  // VEH_PASSENGER_ATTACK
        mp.game.controls.disableControlAction(0, 114, true); // VEH_FLY_ATTACK
        mp.game.controls.disableControlAction(0, 140, true); // MELEE_ATTACK_LIGHT
        mp.game.controls.disableControlAction(0, 141, true); // MELEE_ATTACK_HEAVY
        mp.game.controls.disableControlAction(0, 142, true); // MELEE_ATTACK_ALTERNATE (ПКМ+ЛКМ урон)
        mp.game.controls.disableControlAction(0, 263, true); // MELEE_ATTACK1 (R / кулак)
        mp.game.controls.disableControlAction(0, 264, true); // MELEE_ATTACK2
        mp.game.controls.disableControlAction(2, 257, true); // ATTACK2
        // 25 (AIM) намеренно НЕ блокируем — можно наводиться
    }
    //ДЕФОЛТ МЕНЮ ОРУЖИЯ
    mp.game.controls.disableControlAction(0, 37, true);
    mp.game.controls.disableControlAction(0, 14, true);
    mp.game.controls.disableControlAction(0, 15, true);
    mp.game.controls.disableControlAction(2, 243, true);
    // Приклад огнестрельного оружия остаётся отключённым.
    const unarmedHash = mp.game.joaat('weapon_unarmed') >>> 0;
    const curWeapon = player.weapon >>> 0;
    if (curWeapon && curWeapon !== unarmedHash) {
        mp.game.controls.disableControlAction(2, 140, true);
        mp.game.controls.disableControlAction(2, 141, true);
        mp.game.controls.disableControlAction(2, 263, true);
        mp.game.controls.disableControlAction(2, 264, true);
        mp.game.controls.disableControlAction(2, 142, true);
    }
    //ДЕФОЛТ МЕСТО НАХОЖДЕНИЕ
    mp.game.ui.hideHudComponentThisFrame(7);
    mp.game.ui.hideHudComponentThisFrame(9);
    //ОТКЛЮЧЕНИЕ ДЕФОЛТНЫХ ПАТРОН
    mp.game.ui.hideHudComponentThisFrame(2);
    //ОТКЛЮЧЕНИЕ ОТДЫШКИ
    mp.game.player.restoreStamina(100.0);
    //ОТКЛЮЧЕНИЕ CTRL
    mp.game.controls.disableControlAction(0, 36, true);
    //ДЕФОЛТ ДЕНЬГИ
    mp.game.ui.hideHudComponentThisFrame(3);
    mp.game.ui.hideHudComponentThisFrame(4);
    //ОТКЛЮЧЕНИЕ ДЕФОЛТНОГО НАЗВАНИЯ МАШИНЫ
    mp.game.ui.hideHudComponentThisFrame(6);
    //ОТКЛЮЧЕНИЕ РАДИОСТАНЦИЙ
    // mp.game.ui.hideHudComponentThisFrame(16);
});

mp.events.add('render', () => {
    const player = mp.players.local;
    // ОТКЛЮЧЕНИЕ ПУЛЕМЁТА
    if (player.vehicle && player.getVariable('adminlvl') <= 5) {
        mp.game.controls.disableControlAction(0, 69, true);   
        mp.game.controls.disableControlAction(0, 70, true);   
        mp.game.controls.disableControlAction(0, 114, true);  
        mp.game.controls.disableControlAction(0, 140, true);  
        mp.game.controls.disableControlAction(0, 141, true);  
        mp.game.controls.disableControlAction(0, 142, true);  
        mp.game.controls.disableControlAction(0, 99, true);
        mp.game.controls.disableControlAction(0, 100, true);
        mp.game.controls.disableControlAction(0, 115, true);  
        mp.game.controls.disableControlAction(0, 24, true);
        mp.game.controls.disableControlAction(0, 25, true);   
        mp.game.controls.disableControlAction(0, 68, true);  
        mp.game.controls.disableControlAction(2, 257, true);  
    }
});

mp.events.add('offdefaultdeath', () => {
    mp.game.gameplay.setFadeOutAfterDeath(false);
});

mp.nametags.enabled = false;

mp.events.add("playerWeaponShot", (targetPosition, targetEntity) => {
    const weapon = mp.players.local.weapon;

    mp.game.invoke("0x4757F00BC6323CFE", mp.players.local.handle, weapon, 0.0);
});

// Melee damage passes through the common incomingDamage validation pipeline.

setInterval(() => {
    mp.game.invoke('0x9E4CFFF989258472');
    mp.game.invoke('0xF4F2C0D4EE209E20');
}, 25000);

// Акцент нативного меню паузы (ESC) — 1:1 как на GTA 5 RP (референс-скрин):
// полоска над активным табом + заливка слайдеров.
// HUD colour 116 / 143 через REPLACE_HUD_COLOUR_WITH_RGBA.
const pauseMenuAccent = { r: 242, g: 140, b: 95 }; // #F28C5F

// FIB blip — уникальный colour ID 50 → 1:1 со скрина (семпл буквы F).
const fibBlipAccent = { r: 32, g: 24, b: 72 }; // #201848 — сильно темнее
const FIB_BLIP_COLOUR_ID = 50;

mp.game.gxt.set("PM_PAUSE_HDR", "flow DM | discord.gg/flowdm");
mp.game.invoke('0xF314CF4F0211894E', 143, pauseMenuAccent.r, pauseMenuAccent.g, pauseMenuAccent.b, 255);
mp.game.invoke('0xF314CF4F0211894E', 116, pauseMenuAccent.r, pauseMenuAccent.g, pauseMenuAccent.b, 255);
mp.game.invoke('0xF314CF4F0211894E', FIB_BLIP_COLOUR_ID, fibBlipAccent.r, fibBlipAccent.g, fibBlipAccent.b, 255);

function applyPauseMenuAccent() {
    try {
        mp.game.invoke(
            '0xF314CF4F0211894E',
            143,
            pauseMenuAccent.r,
            pauseMenuAccent.g,
            pauseMenuAccent.b,
            255
        );
        mp.game.invoke(
            '0xF314CF4F0211894E',
            116,
            pauseMenuAccent.r,
            pauseMenuAccent.g,
            pauseMenuAccent.b,
            255
        );
    } catch (_e) {}
}

function applyFibBlipAccent() {
    try {
        mp.game.invoke(
            '0xF314CF4F0211894E',
            FIB_BLIP_COLOUR_ID,
            fibBlipAccent.r,
            fibBlipAccent.g,
            fibBlipAccent.b,
            255
        );
    } catch (_e) {}
}

// GTA иногда сбрасывает HUD-цвета — подтягиваем, пока открыта пауза / на карте.
mp.events.add('render', () => {
    try {
        if (mp.game.ui.isPauseMenuActive()) {
            applyPauseMenuAccent();
            applyFibBlipAccent();
        }
    } catch (_e) {}
});

// Подстраховка на старте и через пару секунд после входа.
applyFibBlipAccent();
setTimeout(applyFibBlipAccent, 2000);
setTimeout(applyFibBlipAccent, 8000);
mp.game.streaming.removeIpl('rc12b_fixed');
mp.game.streaming.removeIpl('rc12b_destroyed');
mp.game.streaming.removeIpl('rc12b_default');
mp.game.streaming.removeIpl('rc12b_hospitalinterior_lod');
mp.game.streaming.removeIpl('rc12b_hospitalinterior');

mp.players.local.setToRagdoll(2000, 2000, 1, false, false, false);
