mp.events.callRemote('legacy:boot:phase','scripts-start');
mp.console.enabled = false;

require('./shared/typing_guard.js');

//VEHICLE
// require('./vehicle/siren.js');
//LITE
require('./player/attachment/sync.js');
require('./player/attachment/body.js');
require('./shared/browser_bridge.js');
require('./shared/shop_cef.js');
require('./noclip.js');
require('./admin_spectate.js');
require('./admin_makeup.js');
require('./auth_scenery.js');
require('./shared/auth_lobby.js');
require('./welcome_screen.js');
require('./accounts.js');
require('./shared/hair_styles.js');
require('./charcreator.js');
require('./clothing');
require('./character');
require('./kepler-compat/client.js');
require('./drop.js');
require('./disable.js');
require('./hospital_map.js');
require('./admin_duty_client.js');
require('./binds.js');
require('./chat.js');
require('./discord.js');
require('./damage.js');
require('./shoot_logger.js');
require('./hitmarker.js');
require('./commands.js');
require('./scdev.js');
require('./other.js');
require('./welcome_lobby_peds.js');
require('./voice.js');
require('./inventory.js');
require('./whistle_gta5rp.js');
require('./consumables_anim.js');
require('./skateboard.js');
require('./drone.js');
require('./amunation.js');
require('./kabluk_bar_shop.js');
require('./anticheat.js');
try {
    require('./metaac_los.js');
} catch (e) {
    try { mp.console.logError('[MetaAC] metaac_los: ' + (e && e.stack ? e.stack : e)); } catch (_e) {}
}
try {
    require('./metaac_silent.js');
} catch (e) {
    try { mp.console.logError('[MetaAC] metaac_silent: ' + (e && e.stack ? e.stack : e)); } catch (_e) {}
}
try {
    require('./metaac_vertical.js');
} catch (e) {
    try { mp.console.logError('[MetaAC] metaac_vertical: ' + (e && e.stack ? e.stack : e)); } catch (_e) {}
}
require('./menu.js');
require('./playermenu_rpc.js');
require('./disconnect_marker.js');
require('./playermenu_reticle.js');
require('./playermenu_reticle_rpc.js');
require('./playermenu.js');
require('./org_menu_browser.js');
require('./lscustom.js');
require('./world_ui_overlays.js');
require('./crosshair.js');
require('./citizen_identity.js');
require('./js/notify.js');
require('./nametags.js');
require('./hud.js');
require('./utils/bigmap.js');
require('./phone.js');
require('./moonvito.js');
require('./brawl_client.js');
require('./keybinds.js');
require('./admin_binds.js');
require('./antiaim.js');
require('./admin_drag.js');
require('./playerreport.js');
require('./kost.js');
require('./coburaSell.js');
require('./fib_armor_npc.js')
require('./port_job.js');
require('./construction_job.js')
require('./fib_materials_supply_client.js')
require('./clothesEditor.js')
require('./anims.js')
require('./blackshop.js')
require('./barbershop.js')
require('./clothes_shop_camera.js')
require('./clothes_shop_preview.js')
require('./clothes_shop_gta5rp.js')
require('./shopclothes.js')
require('./shopclothes_donate.js')
require('./shopclothes_spectrum.js')
require('./gangwar_shop.js')
require('./hat_hair.js')
require('./autosalon.js')
require('./adminpanel.js')
require('./admin_check.js')
require('./family.js')
require('./family_tablet_client.js')
require('./war_map.js')
require('./faction_hq.js')
require('./faction_craft.js')
require('./fraction_system.js')
require('./frac_interact_client.js')
require('./spawnselect.js')
require('./family_mansion_client.js')
require('./capt_arena.js')
require('./capt_combat_stats_client.js')
require('./bizwar.js')
require('./motorcycle_anchor.js')
require('./rentcar.js')
require('./ygon.js')
require('./top.js')
require('./interaction_offer.js')
require('./pair_interaction.js')
require('./targetmenu.js')
require('./tatto.js')
require('./ems.js')
require('./esc_universal.js')
require('./peddialog_client.js')
// Diamond Casino + Maze Bank Arena (BloodyDM stack)
require('./casino_rpc.js');
require('./action_colshape.js');
require('./casino_menu.js');
require('./casino_diamond_ipl.js');
require('./casino_roulette_sync.js');
require('./casino_chip_world.js');
require('./global_casino_screen.js');
require('./arena.js');
require('./register_overlay_browsers.js')
//SETTINGS
// require('./settings/ammo.js');

const _0x170d26 = () => {
    return '[#' + mp.players.local.getVariable('static') + '] ' + mp.players.local.name.toUpperCase();
};
const _0x231b38 = () => {
    if (!mp.game.ui.isPauseMenuActive()) {
        return;
    }
    const _0xd8b55a = _0x170d26();
    let _0x244277 = `${mp.players.local.money || 0}$`, _0x16f545 = 'moon.com';
    mp.game.graphics.beginScaleformMovieMethodOnFrontend('SET_HEADING_DETAILS');
    mp.game.graphics.scaleformMovieMethodAddParamTextureNameString(_0xd8b55a);
    mp.game.graphics.scaleformMovieMethodAddParamTextureNameString(_0x244277);
    mp.game.graphics.scaleformMovieMethodAddParamTextureNameString(_0x16f545);
    mp.game.graphics.scaleformMovieMethodAddParamBool(false);
    mp.game.graphics.endScaleformMovieMethod();
};
mp.events.add('render', _0x231b38);

mp.events.add('render', () => {
    try {
        if (typeof global !== 'undefined' && typeof global.__applyPreworldChromeNativeSuppress === 'function') {
            global.__applyPreworldChromeNativeSuppress();
        }
        if (typeof global !== 'undefined' && typeof global.shouldForceHideMinimap === 'function' && global.shouldForceHideMinimap()) {
            mp.game.ui.displayRadar(false);
            if (typeof mp.game.ui.hideHudAndRadarThisFrame === 'function') {
                mp.game.ui.hideHudAndRadarThisFrame();
            }
        }
    } catch (_e) {}
});

require('./legacy/administration/index');
require('./legacy/administration/god');
require('./legacy/vehicles/streaming');
require('./legacy/object-placer/index');
require('./legacy/waypoint');
require('./legacy/tools');
mp.events.callRemote('legacy:boot:phase','modules-ready');

require('./legacy/wardrobe');
require('./npc_interact.js');

require('./legacy/content-clothes');
require('./legacy/vehicles/tesla-flight');

require('./legacy/speedometer');

require('./legacy/clothing-identity');

require('./legacy/plates');
require('./legacy/plate-textures');

require('./legacy/vehicles/dynamics');

require('./legacy/creator');
