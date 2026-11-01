# F10 Прицел — полный список файлов

Собрано в `crosshair/` из `f10-reticle-kit` + актуальные файлы из `src_client`.

## Ядро (client)

| Файл | Назначение |
|------|------------|
| `client/crosshair.js` | Показ прицела в игре (aim + weapon, скрытие HUD 14) |
| `client/playermenu_reticle.js` | Логика F10: типы point2/cross2, превью, сохранение |
| `client/playermenu_reticle_rpc.js` | RPC `client_hud_reticle_getList` / `_set` |

Подключение в `src_client/index.js`:
```js
require('./playermenu_reticle.js');
require('./playermenu_reticle_rpc.js');
require('./crosshair.js');
```

## Сервер

| Файл | Назначение |
|------|------------|
| `server/f10_reticle_server.js` | `crosshairSettingsSave:s` → `accounts.crosshair_json` |
| `server/sql/add_crosshair_json.sql` | ALTER TABLE accounts |

Hydrate при логине: `global.hydrateCrosshairSettingsFromAccount(player, row)` → `crosshairSettingsHydrate` на клиенте.

## CEF (F10 playermenu)

| Файл | Назначение |
|------|------------|
| `cef/fragments/reticle-tab.html` | HTML вкладки «ПРИЦЕЛ» |
| `cef/css/playermenu-f10-reticle.css` | Стили вкладки |
| `cef/css/playermenu-reticle-inline.css` | Inline-стили |
| `cef/fonts/` | Montserrat и др. для color picker |

В проекте подключено в `client_packages/PlayerMenuMain/playermenu.html`:
```html
<link rel="stylesheet" href="package://f10-reticle-kit/cef/fonts/css/fonts.css">
<link rel="stylesheet" href="package://f10-reticle-kit/cef/css/playermenu-f10-reticle.css">
<link rel="stylesheet" href="package://f10-reticle-kit/cef/css/playermenu-reticle-inline.css">
```

Vue-логика (openReticleSetting, settingReticleSave и т.д.) — в `playermenu.html` + `blood_compat.js`.

## HUD (отрисовка cross2/point2)

| Файл | Назначение |
|------|------------|
| `hud/crosshair-overlay.html` | DOM overlay в центре экрана |
| `hud/crosshair-style.css` | CSS overlay |
| `hud/script-crosshair-vue.js` | Vue data/computed/methods (extract) |

В проекте уже встроено в:
- `src_client/browsers/hud/index.html` (overlay)
- `src_client/browsers/hud/style.css` (стили)
- `src_client/browsers/hud/script.js` (Vue методы)

События клиента → HUD: `patches/hud.js.events.js` (hudCrosshairApply/Show/Target).

## Patches / интеграция

| Файл | Куда вставлять |
|------|----------------|
| `patches/index.js.snippet` | require в index.js |
| `patches/hud.js.events.js` | события в hud.js |
| `patches/menu.js.crosshair.snippet` | hydrate/save в menu.js |
| `patches/playermenu.html.head` | CSS в head playermenu |
| `patches/accounts.js.login.snippet` | hydrate при логине |

## Типы прицела

- **Стандартный** — нативный GTA
- **point2** — точка (HTML HUD)
- **cross2** — перекрестие (HTML HUD)
- ~~4tr2~~ — треугольники (отключены в текущей сборке)

## Поток данных

```
F10 CEF → RPC → playermenu_reticle.js
  → mp.storage.settings.reticle + .crosshair
  → crosshair.js (render loop)
  → hud.js events → HUD Vue overlay
  → crosshairSettingsSave:s → accounts.crosshair_json
```
