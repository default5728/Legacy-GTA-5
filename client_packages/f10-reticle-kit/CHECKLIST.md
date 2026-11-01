# F10 Reticle — чеклист установки

- [ ] Скопировать `f10-reticle-kit` → `client_packages/f10-reticle-kit/`
- [ ] Скопировать `client/*.js` → `client_packages/`
- [ ] Добавить 3 require в `client_packages/index.js`
- [ ] Подключить CSS + fonts в `playermenu.html` `<head>`
- [ ] Кнопка «ПРИЦЕЛ» + HTML вкладки (или полный Life5 playermenu)
- [ ] HUD: overlay + applyCrosshairJson (если нет)
- [ ] `hud.js`: события hudCrosshairApply / Show / Target
- [ ] `packages/server/f10_reticle_server.js` + require в index.js
- [ ] `hydrateCrosshairSettingsFromAccount(player, row)` при логине
- [ ] Тест: F10 → ПРИЦЕЛ → сохранить → прицелиться с оружием
