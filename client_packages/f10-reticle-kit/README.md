# F10 Прицел — перенос на другую сборку

Готовый набор файлов для вкладки **F10 → Настройки → ПРИЦЕЛ** (Life5 playermenu).

Типы прицела:
- **Стандартный** — нативный GTA
- **Точка** (`point2`)
- **Перекрестие** (`cross2`) — HTML-прицел в HUD
- **Треугольники** (`4tr2`) — рисуется нативно на клиенте

---

## Содержимое папки

```
f10-reticle-kit/
├── README.md                          ← эта инструкция
├── client/
│   ├── playermenu_reticle.js          ← логика прицела (типы, превью, сохранение)
│   ├── playermenu_reticle_rpc.js      ← RPC client_hud_reticle_getList / _set
│   └── crosshair.js                   ← показ прицела в игре (прицеливание + оружие)
├── server/
│   ├── f10_reticle_server.js          ← сохранение в БД accounts.crosshair_json
│   └── sql/add_crosshair_json.sql
├── cef/
│   ├── css/                           ← стили вкладки и шрифтов
│   ├── fonts/                         ← Montserrat + fonts.css
│   └── fragments/reticle-tab.html     ← HTML вкладки для playermenu.html
├── hud/                               ← если в HUD ещё нет кастомного прицела
└── patches/                           ← готовые вставки в index.js, hud.js и т.д.
```

---

## Быстрая установка (5 шагов)

### 1. Скопировать kit в client_packages

Скопируйте всю папку `f10-reticle-kit` в:

```
ваша_сборка/client_packages/f10-reticle-kit/
```

> Путь `package://f10-reticle-kit/...` в инструкциях ниже предполагает именно это расположение.

---

### 2. Клиент — подключить скрипты

Скопируйте файлы из `client/` в `client_packages/`:

| Из kit | Куда |
|--------|------|
| `client/playermenu_reticle.js` | `client_packages/playermenu_reticle.js` |
| `client/playermenu_reticle_rpc.js` | `client_packages/playermenu_reticle_rpc.js` |
| `client/crosshair.js` | `client_packages/crosshair.js` |

В `client_packages/index.js` добавьте **после** инициализации `global.rpc` (rage-rpc):

```js
require('./playermenu_reticle.js');
require('./playermenu_reticle_rpc.js');
require('./crosshair.js');
```

Если у вас уже есть `playermenu_rpc.js` с другими RPC — достаточно добавить только эти три строки.  
RPC прицела можно **не** дублировать в `playermenu_rpc.js`, если подключён `playermenu_reticle_rpc.js`.

**Зависимость:** в CEF PlayerMenu должен быть подключён `rage-rpc.min.js` и Vue-меню с методами `openReticleSetting`, `settingReticleSave` и т.д. (стандартный Life5 `playermenu.html` из дампа).

---

### 3. CEF — playermenu.html

#### 3.1 Шрифты и CSS (в `<head>`)

```html
<link rel="stylesheet" href="package://f10-reticle-kit/cef/fonts/css/fonts.css">
<link rel="stylesheet" href="package://f10-reticle-kit/cef/css/playermenu-f10-reticle.css">
<link rel="stylesheet" href="package://f10-reticle-kit/cef/css/playermenu-reticle-inline.css">
```

**Альтернатива:** скопируйте `cef/fonts/` → `browsers/PlayerMenu/Lib/` и CSS → `browsers/PlayerMenu/Lib/css/`, тогда:

```html
<link rel="stylesheet" href="../Lib/css/fonts.css">
<link rel="stylesheet" href="../Lib/css/playermenu-f10-reticle.css">
<link rel="stylesheet" href="../Lib/css/playermenu-reticle-inline.css">
```

#### 3.2 Кнопка «ПРИЦЕЛ» в настройках

В блоке `currentTab === 5` (Настройки), в боковой колонке кнопок добавьте:

```html
<button @click="openReticleSetting" :class="{'orange': currentSettingTab === 4}" class="yk-btn s-14 p-10 w-100 list-mt-10">ПРИЦЕЛ</button>
```

#### 3.3 HTML вкладки прицела

Скопируйте содержимое `cef/fragments/reticle-tab.html` внутрь scroll-области настроек (рядом с вкладками 0–3).

> Если используете **полный** `playermenu.html` из Life5/дампа — HTML и Vue-логика уже встроены, нужны только CSS + RPC + client-скрипты.

---

### 4. HUD — отображение перекрестия/точки

Для типов **point2** и **cross2** прицел рисуется в браузере HUD.

**Проверка:** в `browsers/hud/js/index.js` должны быть методы:
- `applyCrosshairJson(jsonStr)`
- `setCrosshairVisible(v)`
- `setCrosshairTargetNear(v)`

Если их нет — возьмите из Phantom-сборки или добавьте фрагменты из папки `hud/`:
- `hud/crosshair-overlay.html` → в `hud/index.html`
- `hud/crosshair-style.css` → в `hud/style.css`
- `patches/hud.js.events.js` → в `client_packages/hud.js`

В `hud.js` также при старте HUD желательно применить сохранённый прицел:

```js
const st = mp.storage.data && mp.storage.data.settings;
if (st && typeof st.crosshair === 'string' && st.crosshair.length) {
    mp.events.call('hudCrosshairApply', st.crosshair);
}
```

---

### 5. Сервер — сохранение в аккаунт

В `packages/server/index.js`:

```js
require('./f10_reticle_server.js');
```

Скопируйте `server/f10_reticle_server.js` в `packages/server/`.

При логине игрока (после SELECT из `accounts`) вызовите:

```js
if (typeof global.hydrateCrosshairSettingsFromAccount === 'function') {
    global.hydrateCrosshairSettingsFromAccount(player, row);
}
```

Колонка `accounts.crosshair_json` создаётся автоматически при старте сервера.  
Или выполните вручную: `server/sql/add_crosshair_json.sql`.

---

## Как это работает

```
F10 CEF (Vue)
    ↓ serverAPI.getApiAsync("client_hud_reticle_getList")
    ↓ serverAPI.getApiAsync("client_hud_reticle_set", [type, data])
playermenu_reticle_rpc.js  →  playermenu_reticle.js
    ↓
mp.storage.data.settings.reticle   — тип Life5 (point2/cross2/4tr2)
mp.storage.data.settings.crosshair   — JSON для HUD (point2/cross2)
    ↓
crosshair.js + hud.js  →  browsers/hud (HTML прицел)
playermenu_reticle.js render  →  4tr2 (нативные прямоугольники)
    ↓
crosshairSettingsSave:s  →  accounts.crosshair_json (сервер)
```

**Превью:** при движении слайдера CEF шлёт `mp.trigger("client_hud_reticle_set_test", ...)` — показывается ~1 сек.

**Share-код:** base64 JSON `[type, values[]]` — кнопки «Поделиться» / «Применить» в UI.

---

## Требования к целевой сборке

| Компонент | Обязательно |
|-----------|-------------|
| F10 PlayerMenu (Life5 / dump playermenu) | Да |
| rage-rpc в CEF + `global.rpc` на клиенте | Да |
| Vue + chrome-picker (color picker) в playermenu | Да |
| HUD с crosshair overlay | Для point2/cross2 |
| MySQL `accounts` + `global.DB` | Для сохранения на сервере |
| `notify:client` или аналог | Для уведомлений (не критично) |

---

## Проверка после установки

1. Зайти на сервер, открыть **F10 → Настройки → ПРИЦЕЛ**
2. Должны загрузиться типы: Точка, Перекрестие, Треугольники
3. Выбрать **Перекрестие**, двигать слайдер — превью ~1 сек
4. **Сохранить**, взять оружие, прицелиться — кастомный прицел в центре экрана
5. Перезайти — настройки должны подтянуться из `accounts.crosshair_json`

---

## Частые проблемы

**Пустой список типов / кнопки не работают**
- Не подключён `playermenu_reticle.js` или `playermenu_reticle_rpc.js`
- Нет `global.rpc` (rage-rpc не загружен до RPC-модуля)

**Сохраняется, но не видно в игре**
- Нет `crosshair.js` или HUD без `applyCrosshairJson`
- Игрок без оружия или не прицеливается (превью в меню работает отдельно)

**Шрифты системные, не Montserrat**
- Не подключён `fonts.css` или папка `cef/fonts/fonts/` не скопирована

**Не сохраняется после релога**
- Не подключён `f10_reticle_server.js`
- Нет вызова `hydrateCrosshairSettingsFromAccount` при логине

---

## Минимальный набор (если playermenu уже из дампа)

Если `playermenu.html` уже Life5 с вкладкой прицела:

1. `client_packages/playermenu_reticle.js`
2. `client_packages/playermenu_reticle_rpc.js`
3. `client_packages/crosshair.js`
4. 3 строки в `index.js`
5. CSS + fonts в `<head>`
6. Серверный модуль + hydrate при логине

---

*Phantom DM — F10 Reticle Kit*
