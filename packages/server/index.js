require('./legacy/creator/source-registry');
require('./legacy/command-registry');
require('./legacy/boot-trace');
//SHUTDOWN
// mp.events.add("serverShutdown", async () => {
//     mp.events.delayShutdown = true;
//     mp.players.forEach(player => {
//         player.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
//         player.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
//         player.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
//     });
//     mp.events.delayShutdown = false;
// });
//ERROR
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
    const msg = reason && reason.message ? reason.message : String(reason || '');
    console.error("Unhandled Rejection:", msg.replace(/\s+/g, ' ').slice(0, 300));
});

// Discord log stub (discordbot disabled)
global.sendDiscordLog = function(message, channelId) {
    console.log('[DiscordLog]', message);
};
// UTILS
require('./utils.js');
require('./ban_guard.js');
require('./interact_hint.js');
require('./clothing_shop_support.js');
require('./admin_session.js');
require('./admin_stealth.js');
require('./cars_helpers.js');
// WEAPON ON BODY (RedAge v3 / replace)
require('./modules/attachment/body.js');
require('./modules/attachment/sync.js');
//CONFIG
require('./config/other.js');
require('./config/clothes.js');
require('./server_events.js');
require('./config/donate_clothes.js');
require('./donate_clothes_remap_v2.js');
require('./config/spectrum_clothes.js');
require('./config/barber.js');
require('./config/fractioncars.js');
//VEHICLE
require('./vehicle');
require('./skateboard_instances.js');
require('./skatebord.js');
require('./drone.js');
//LITE
require('./db.js');
require('./donate_credit.js');
require('./donate_fulfill.js');
require('./clothing_schema.js');
require('./account_row_defaults.js');
require('./citizen_identity.js');
require('./accounts.js');
require('./media.js');
require('./charcreator.js');
require('./anim_slots.js');
require('./drop.js');
require('./chat.js');
require('./jail_release.js');
require('./faction.js');
require('./playerreport.js');
require('./commands.js');
require('./admin_spectate.js');
require('./logs.js');
require('./hud.js');
require('./other.js');
require('./amunation_purchase.js');
require('./gangwar_shop.js');
require('./brawl.js');
require('./admin_check.js');
require('./blips.js');
require('./kabluk_bar_shop.js');
require('./greenzones.js');
require('./arena.js');
require('./killlist.js');
require('./inventory.js');
require('./vehicle_trunk.js');
require('./anticheat.js');
// require('./metaac');
require('./menu.js');
require('./playermenu.js');
// require('./discordbot.js');
require('./capt_combat_stats.js');
require('./damage.js');
require('./shoot_logger.js');
require('./notify.js');
require('./port_job.js');
require('./construction_job.js');
require('./antiaim.js');
require('./admin_drag.js');
require('./fib_armor_npc.js');
require('./fib_materials_supply.js');
require('./payday.js');
require('./minigame_dp_roulette.js');
require('./war_hud_alert.js');
require('./family.js');
require('./family_tablet.js');
require('./faction_materials.js');
require('./fraction_system.js');
require('./faction_craft.js');
require('./rentcar.js');
require('./economy_safe.js');
require('./shopclothes.js');
require('./shopclothes_donate.js');
require('./shopclothes_spectrum.js');
require('./clothes_shop_cef.js');
require('./spectrum_bag_charms.js');
require('./bonus.js');
require('./newbie_quests.js');
require('./promocodes.js');
require('./torg.js');
require('./ygon.js');
require('./autosalon.js');
require('./lscustom.js');
require('./family_mansion.js');
// require('./platega_webhook.js');
// require('./discord_console.js');
// require('./discord_game_api.js');
require('./fractioncars.js');
require('./barbershop.js');
require('./targetmenu.js');
require('./pair_interaction.js');
require('./tatto.js');
require('./ems.js');
//HARD — Diamond Casino
require('./ui_menu_vars.js');
require('./casino_chip.js');
require('./global_casino/index.js');
require('./lobby.js');
require('./bank_phone.js');
//CONFIG
global.jailCoords = { x: 1651.794677734375, y: 2570.817138671875, z: 45.564842224121094 };
global.releaseCoords = { x: -471.3369445800781, y: -1444.4189453125, z: 82.72962188720703 };

require('./kepler-compat').install();

require('./kepler-legacy-items').install();

require('./legacy-tools');
global.syncLegacyHud=require('./legacy-hud-state').syncBalances;
