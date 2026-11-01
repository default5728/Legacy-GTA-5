// client_packages/inventory/index.js
let invBrowser = null;
let isInventoryActive = false;
let activeSelectedItemId = null;

// Инициализация браузера инвентаря
mp.events.add('guiReady', () => {
    if (!invBrowser) {
        invBrowser = mp.browsers.new('package://inventory/index.html');
        invBrowser.active = false;
    }
});

// Открытие / закрытие по клавише 'I' (0x49)
mp.keys.bind(0x49, false, () => {
    if (mp.gui.chat.isChatOpen()) return;
    setInventoryState(!isInventoryActive);
});

// Закрытие по клавише 'ESC' (0x1B)
mp.keys.bind(0x1B, false, () => {
    if (isInventoryActive) {
        setInventoryState(false);
    }
});

function setInventoryState(state) {
    isInventoryActive = state;
    mp.gui.cursor.visible = state;
    if (invBrowser) {
        invBrowser.active = state;
    }
    if (state) {
        // Запрос актуальных данных инвентаря у сервера
        mp.events.callRemote('server:inventory:open');
    }
}

// Запоминаем ID выбранного предмета из CEF
mp.events.add('client:inv:selectItem', (itemId) => {
    activeSelectedItemId = itemId;
});

// Быстрое использование по клавише [E] (0x45)
mp.keys.bind(0x45, false, () => {
    if (isInventoryActive && activeSelectedItemId !== null) {
        mp.events.callRemote('server:inventory:useItem', activeSelectedItemId);
    }
});

// Быстрый сброс по клавише [R] (0x52)
mp.keys.bind(0x52, false, () => {
    if (isInventoryActive && activeSelectedItemId !== null) {
        mp.events.callRemote('server:inventory:dropItem', activeSelectedItemId);
    }
});

// Контекстные действия из CEF меню
mp.events.add('client:inv:action', (action, itemId) => {
    if (action === 'use') {
        mp.events.callRemote('server:inventory:useItem', itemId);
    } else if (action === 'drop') {
        mp.events.callRemote('server:inventory:dropItem', itemId);
    } else if (action === 'split') {
        mp.events.callRemote('server:inventory:splitItem', itemId);
    }
});

// Снятие экипировки
mp.events.add('client:inv:unequip', (slotKey) => {
    mp.events.callRemote('server:inventory:unequip', slotKey);
});

// Получение данных от сервера и передача в HTML
mp.events.add('client:inventory:update', (itemsJson, curWeight, maxWeight, mood, hunger, thirst) => {
    if (invBrowser) {
        invBrowser.execute(`window.invInterface && window.invInterface.updateItems('${itemsJson}', ${curWeight}, ${maxWeight});`);
        invBrowser.execute(`window.invInterface && window.invInterface.updateStats(${mood || 100}, ${hunger || 100}, ${thirst || 100});`);
    }
});
