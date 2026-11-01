(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const send = (event, ...args) => { if (window.mp) mp.trigger(event, ...args); };
  const slots = [
    ['earrings', 'Серьги'], ['hat', 'Кепка'], ['mask', 'Маска'],
    ['glasses', 'Очки'], ['top', 'Верх'], ['vest', 'Броня'],
    ['accessory', 'Аксессуар'], ['undershirt', 'Бельё'], ['backpack', 'Рюкзак'],
    ['bracelet', 'Браслет'], ['pants', 'Брюки'], ['watch', 'Часы'],
    ['gloves', 'Перчатки'], ['shoes', 'Обувь'], ['special', 'Особое']
  ];
  const photos = {
    earrings: 0, hat: 1, mask: 2, glasses: 3, top: 4, vest: 5,
    accessory: 6, undershirt: 7, backpack: 8, bracelet: 9, pants: 10,
    watch: 11, gloves: 12, shoes: 13, special: 14, burger: 15,
    water: 16, chocolate: 17, medkit: 18, wrench: 19, repair: 19,
    radio: 20, phone: 21, keys: 22, tshirt: 23, box: 24
  };
  let data = { items: [], weapons: [], bagItems: [], equipment: {} };
  let environmentItem = null;
  let opened = false;
  let selected = null;
  let itemPage = 0;
  let dragged = null;
  let order = [];
  let counter = 0;
  let hideTimer = null;
  let noticeTimer = null;
  let revision = 0;
  let rotation = null;
  let menuItemId = null;
  let splitItemId = null;
  let splitDestination = -1;
  const pending = new Map();

  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function all() {
    return [...(data.items || []), ...(data.weapons || []), ...(data.bandolier || []), ...(data.bagItems || []),
      ...Object.values(data.equipment || {}), ...(environmentItem ? [environmentItem] : [])].filter(Boolean);
  }
  function itemById(id) { return all().find(item => item.id === id); }
  function equipped(item) { return Object.values(data.equipment || {}).some(value => value && value.id === item.id); }
  function iconKey(item) {
    const raw = `${item.raw || ''} ${item.id || ''} ${item.name || ''} ${item.iconType || ''}`.toLowerCase();
    if (item.type === 'clothing' && photos[item.slot] !== undefined) return item.slot;
    if (/drone|дрон/.test(raw)) return 'drone';
    if (/weapon_|shotgun|shotgun|дробов/.test(raw)) return /shotgun|дробов/.test(raw) ? 'shotgun' : /pistol|revolver|пистолет|револьвер/.test(raw) ? 'pistol' : 'rifle';
    if (/pistol|revolver|пистолет|револьвер/.test(raw)) return 'pistol';
    if (/ammo|патрон|7\.62|11\.43|12mm/.test(raw)) return 'ammo';
    if (/medkit|heal|аптеч/.test(raw)) return 'medkit';
    if (/repair|toolkit|ремонт|инструмент/.test(raw)) return 'wrench';
    if (/burger|бургер|еда/.test(raw)) return 'burger';
    if (/water|вода/.test(raw)) return 'water';
    if (/chocolate|шоколад/.test(raw)) return 'chocolate';
    if (/radio|раци/.test(raw)) return 'radio';
    if (/phone|телефон/.test(raw)) return 'phone';
    if (/key|ключ/.test(raw)) return 'keys';
    if (/backpack|рюкзак|сумк/.test(raw)) return 'backpack';
    if (photos[item.iconType] !== undefined) return item.iconType;
    if (item.type === 'clothing') return 'top';
    return photos[item.type] !== undefined ? item.type : 'box';
  }
  const weaponArt = {"carbinerifle": "package://browsers/inventory/img/weapon_carbinerifle.png", "combatmg": "package://browsers/inventory/img/weapon_combatmg.png", "combatmg_mk2": "package://browsers/inventory/img/weapon_combatmg_mk2.png", "heavyshotgun": "package://browsers/inventory/img/weapon_heavyshotgun.png", "heavysniper": "package://browsers/inventory/img/weapon_heavysniper.png", "heavysniper_mk2": "package://browsers/inventory/img/weapon_heavysniper_mk2.png", "marksmanrifle": "package://browsers/inventory/img/weapon_marksmanrifle.png", "militaryrifle": "package://browsers/inventory/img/weapon_militaryrifle.png", "precisionrifle": "package://browsers/inventory/img/weapon_precisionrifle.png", "revolver": "package://browsers/inventory/img/weapon_revolver.png", "revolver_mk2": "package://browsers/inventory/img/weapon_revolver_mk2.png", "specialcarbine": "package://browsers/inventory/img/weapon_specialcarbine.png", "assaultshotgun": "package://browsers/amunation/images/assaultshotgun.png"};
  const customIcons = {
    rifle: 'weapon-rifle.svg', shotgun: 'weapon-shotgun.svg', pistol: 'weapon-pistol.svg',
    drone: 'drone.svg', ammo: 'ammo.svg'
  };
  function icon(itemOrKey) {
    const key = typeof itemOrKey === 'string' ? itemOrKey : iconKey(itemOrKey);
    const el = node('span', undefined, 'art');
    const index = photos[key] === undefined ? 24 : photos[key];
    el.style.backgroundPosition = `${(index % 5) * 25}% ${Math.floor(index / 5) * 25}%`;
    if (key === 'burger' || key === 'water') el.classList.add('food-art');
    const token=typeof itemOrKey==='object'?String((itemOrKey.raw||'')+' '+(itemOrKey.name||'')).toLowerCase().replace(/[^a-z0-9]/g,''):'';
    const detailed=Object.entries(weaponArt).sort((a,b)=>b[0].length-a[0].length).find(([name])=>token.includes(name.replace(/[^a-z0-9]/g,'')));
    const asset = detailed?detailed[1]:customIcons[key];
    if (asset) {
      const generated = node('img', undefined, 'generated-icon');
      generated.src = asset.startsWith('package://')?asset:`package://inventory/item-icons/${asset}`;
      generated.onload=()=>{el.style.backgroundImage='none';};
      generated.alt = '';
      generated.draggable = false;
      generated.onerror = () => generated.remove();
      el.append(generated);
    }
    el.setAttribute('aria-hidden', 'true');
    return el;
  }
  function notify(message) {
    $('notice').textContent = String(message);
    $('notice').hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 3500);
  }
  function isStackable(item) {
    if (!item || Number(item.count) <= 1 || !['grid', 'bag'].includes(item.origin)) return false;
    if (item.type === 'clothing' || item.type === 'weapon') return false;
    const raw = item.raw || item.id;
    const base = typeof window.invItemBaseId === 'function' ? window.invItemBaseId(raw) : raw;
    return typeof window.invIsConsumableStackBase !== 'function' || window.invIsConsumableStackBase(base);
  }
  function isBandolierItem(item){if(!item)return false;const raw=String(item.raw||'').split('(')[0].split('#')[0].trim();return ['weapon','ammo'].includes(item.type)||/^weapon_[a-z0-9_]+$/.test(raw)||/^(?:item_)?ammo(?:_[a-z0-9_.]+)?$/i.test(raw);}
  function canUse(item) { return !!item && item.origin !== 'environment' && item.readOnly !== true; }
  function canDrop(item) { return canUse(item) && item.origin !== 'equipment' && item.origin !== 'quick' && item.origin !== 'bandolier'; }
  function defaultAction(item) {
    if (!item) return;
    if (item.origin === 'environment') { send('inventoryGroundPickup'); return; }
    if (item.origin === 'equipment') { act('unequip', item); return; }
    if (item.origin === 'quick' || item.origin === 'bandolier') { act('remove', item); return; }
    act('use', item);
  }
  function refreshSelection() {
    const item = itemById(selected);
    $('selection').textContent = item ? `${item.name}${Number(item.count) > 1 ? ` · ×${item.count}` : ''}` : 'Выберите предмет';
    const useButton = $('use');
    useButton.disabled = !canUse(item) || pending.has(item.id);
    useButton.querySelector('span').textContent = item && item.origin === 'equipment' ? 'Снять' :
      item && item.origin === 'quick' ? 'Убрать' : 'Использовать';
    $('drop').disabled = !canDrop(item) || pending.has(item.id);
    for (const cell of document.querySelectorAll('.cell')) {
      cell.classList.toggle('selected', cell.dataset.itemId === selected);
      cell.classList.toggle('pending', pending.has(cell.dataset.itemId));
      cell.disabled = pending.has(cell.dataset.itemId);
    }
  }
  function act(action, item, extra) {
    if (!item || pending.has(item.id) || !opened) return;
    const requestId = `inv-${Date.now().toString(36)}-${++counter}`;
    const timer = setTimeout(() => ack(requestId, false, 'Сервер не ответил. Откройте инвентарь заново.'), 15000);
    pending.set(item.id, { requestId, timer });
    refreshSelection();
    send('client:inventory:action', action, item.id, requestId, extra);
  }
  function ack(requestId, ok, message) {
    for (const [itemId, pendingAction] of pending) {
      if (pendingAction.requestId === requestId) {
        clearTimeout(pendingAction.timer);
        pending.delete(itemId);
        break;
      }
    }
    refreshSelection();
    if (!ok && message) notify(message);
  }
  function closeContextMenu() {
    $('itemContextMenu').hidden = true;
    menuItemId = null;
  }
  function showContextMenu(item, x, y) {
    const menu = $('itemContextMenu');
    menuItemId = item.id;
    const actions = item.origin === 'equipment' ? [['unequip', 'Снять']] :
      item.origin === 'quick' ? [['remove', 'Убрать']] :
      [['use', 'Использовать'], ...(isStackable(item) ? [['split', 'Разделить']] : []), ...(canDrop(item) ? [['drop', 'Выбросить']] : [])];
    menu.replaceChildren(...actions.map(([action, label]) => {
      const button = node('button', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        const target = itemById(menuItemId);
        closeContextMenu();
        if (!target) return;
        if (action === 'split') act('split', target);
        else act(action, target);
      });
      return button;
    }));
    menu.hidden = false;
    const pad = 8;
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(pad, Math.min(x, innerWidth - rect.width - pad))}px`;
    menu.style.top = `${Math.max(pad, Math.min(y, innerHeight - rect.height - pad))}px`;
  }
  function firstFreeGridSlot() {
    const used = new Set((data.items || []).map(item => Number(item.sourceSlot)).filter(Number.isInteger));
    for (let slot = 0; slot < 20; slot++) if (!used.has(slot)) return slot;
    return -1;
  }
  function openSplit(id) {
    const item = itemById(id);
    if (!isStackable(item)) { notify('Этот предмет нельзя разделить.'); return false; }
    splitDestination = firstFreeGridSlot();
    if (splitDestination < 0) { notify('Нет свободной ячейки в инвентаре.'); return false; }
    splitItemId = id;
    const maximum = Math.max(1, Number(item.count) - 1);
    $('splitName').textContent = item.name;
    $('splitSlider').min = '1';
    $('splitSlider').max = String(maximum);
    $('splitSlider').value = '1';
    updateSplitCount();
    $('splitDialog').hidden = false;
    return true;
  }
  function updateSplitCount() {
    const item = itemById(splitItemId);
    const total = item ? Math.max(1, Number(item.count) || 1) : 1;
    const amount = Math.max(1, Number($('splitSlider').value) || 1);
    $('splitAmount').textContent = `${amount} из ${total}`;
    $('splitRemainder').textContent = `В новой ячейке будет ${amount}, останется ${Math.max(0, total - amount)}.`;
  }
  function confirmSplit() {
    const item = itemById(splitItemId);
    if (!isStackable(item) || splitDestination < 0) { $('splitDialog').hidden = true; return; }
    const amount = Math.max(1, Math.min(Number($('splitSlider').value) || 1, Number(item.count) - 1));
    if (item.origin === 'bag') send('inventoryMoveFromBag', item.sourceSlot, splitDestination, amount);
    else send('inventoryGridSplitMove', item.sourceSlot, splitDestination, amount);
    $('splitDialog').hidden = true;
    splitItemId = null;
    splitDestination = -1;
  }
  function requestDrop() {
    const item = itemById(selected);
    if (!canDrop(item) || pending.has(item.id)) return;
    $('dropName').textContent = `${item.name}${Number(item.count) > 1 ? ` ×${item.count}` : ''}`;
    $('dropConfirm').hidden = false;
  }
  function cell(item, slot) {
    const el = node('button', undefined, `cell${item ? ' occupied' : ''}`);
    el.type = 'button';
    if (slot) el.dataset.slot = slot[0];
    if (item) {
      el.dataset.itemId = item.id;
      el.title = item.name || 'Предмет';
      el.draggable = item.origin !== 'environment';
      if (item.type === 'license_plate') el.append(node('span', item.plate || item.name, 'plate-art'));
      else {
        const artwork = icon(item);
        el.append(artwork);
        const key = iconKey(item);
        // The legacy weapon preview is rendered inside a cardboard case.
        if (!customIcons[key] && item.image && String(item.image).startsWith('package://')) {
          const photo = node('img', undefined, 'item-photo');
          photo.src = item.image;
          photo.alt = '';
          photo.draggable = false;
          photo.onload = () => artwork.classList.add('photo-loaded');
          photo.onerror = () => photo.remove();
          el.append(photo);
        }
      }
      if (Number(item.count) > 1) el.append(node('span', String(item.count), 'count'));
      if (!slot && Number.isFinite(Number(item.weight))) el.append(node('span', `${Number(item.weight).toFixed(1)} кг`, 'item-weight'));
      el.addEventListener('click', () => { selected = item.id; refreshSelection(); });
      el.addEventListener('dblclick', () => defaultAction(item));
      el.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();
        if (item.origin === 'environment') send('inventoryGroundPickup');
        else showContextMenu(item, event.clientX, event.clientY);
      });
      el.addEventListener('dragstart', event => {
        if (pending.has(item.id) || item.origin === 'environment') { event.preventDefault(); return; }
        selected = dragged = item.id;
        el.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
        refreshSelection();
      });
      el.addEventListener('dragend', () => {
        dragged = null;
        document.querySelectorAll('.dragging,.drop-target').forEach(entry => entry.classList.remove('dragging', 'drop-target'));
      });
    } else {
      el.setAttribute('aria-label', slot ? slot[1] : 'Пустой слот');
      if (slot) el.append(icon(slot[0]));
    }
    el.append(node('span', slot ? slot[1] : item ? item.name : '', slot ? 'slot-label' : 'item-name'));
    el.addEventListener('dragover', event => { if (dragged) { event.preventDefault(); el.classList.add('drop-target'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      el.classList.remove('drop-target');
      const source = itemById(dragged);
      if (!source) return;
      if (el.closest('#ammoGrid')) {
        if(!isBandolierItem(source)){notify('В патронташ можно положить только оружие и патроны.');return;}
        if(source.origin==='grid'||source.origin==='bandolier')send('legacy:bandolier:move',source.origin==='grid'?'put':'swap',source.sourceSlot,Number(el.dataset.bandolierSlot),source.raw);
      } else if(source.origin==='bandolier'&&el.closest('#itemsGrid')){send('legacy:bandolier:move','take',source.sourceSlot,Number(el.dataset.gridSlot),source.raw);
      } else if (slot) {
        if (source.type !== 'clothing' || source.slot !== slot[0]) { notify('Этот предмет не подходит к выбранному слоту.'); return; }
        if (!equipped(source)) defaultAction(source);
      } else if (el.closest('#weaponsGrid')) {
        const targetSlot = Number(el.dataset.weaponSlot) - 1;
        if (['grid', 'quick'].includes(source.origin) && Number.isInteger(targetSlot) && targetSlot >= 0) act('assignFast', source, targetSlot);
      } else if (source.origin === 'quick' && el.closest('#itemsGrid')) {
        const targetGridSlot = Number(el.dataset.gridSlot);
        if (Number.isInteger(targetGridSlot)) send('inventory:fastSlotToGrid', source.sourceSlot, targetGridSlot);
      } else if (source.origin === 'bag' && el.closest('#itemsGrid')) {
        const targetGridSlot = Number(el.dataset.gridSlot);
        if (Number.isInteger(targetGridSlot)) send('inventoryMoveFromBag', source.sourceSlot, targetGridSlot);
      } else if (source.origin === 'grid' && el.closest('#bagGrid')) {
        const targetBagSlot = Number(el.dataset.bagSlot);
        if (Number.isInteger(targetBagSlot)) send('inventoryMoveToBag', source.sourceSlot, targetBagSlot);
      } else if (source.origin === 'bag' && el.closest('#bagGrid') && item && item.origin === 'bag') {
        send('inventorySwapBagSlots', source.sourceSlot, item.sourceSlot);
      } else if (source.origin === 'grid' && el.closest('#itemsGrid')) {
        const targetGridSlot = Number(el.dataset.gridSlot);
        if (Number.isInteger(targetGridSlot)) send('inventoryGridSwap', source.sourceSlot, targetGridSlot);
      }
    });
    return el;
  }
  function render() {
    const items = data.items || [];
    const capacity = Math.max(20, Number(data.maxWeight) || 50, ...items.map(item => Number(item.sourceSlot) + 1 || 0));
    const pages = Math.ceil(capacity / 20);
    itemPage = Math.max(0, Math.min(pages - 1, itemPage));
    const pageStart = itemPage * 20;
    const weapons = data.weapons || [];
    const bagItems = data.bagItems || [];
    order = order.filter(id => items.some(item => item.id === id));
    for (const item of items) if (!order.includes(item.id)) order.push(item.id);
    if (!itemById(selected)) selected = null;
    for (const key of ['satiety', 'thirst', 'mood']) $(key).textContent = data[key] === undefined ? '—' : `${data[key]}%`;

    $('equipmentGrid').replaceChildren(...slots.map(slot => cell((data.equipment || {})[slot[0]], slot)));
    $('weaponsGrid').replaceChildren(...Array.from({ length: 3 }, (_, index) => {
      const weapon = weapons[index] || null;
      const el = cell(weapon);
      el.classList.add('weapon-cell');
      el.dataset.weaponSlot = String(index + 1);
      return el;
    }));
    const bagLimit = Math.max(0, Number(data.bagLimit) || bagItems.length);
    // Render the storage compartment only when the player actually has one.
    const hasBag = bagLimit > 0 || bagItems.length > 0 || !!data.bagName;
    $('bagSection').hidden = !hasBag;
    $('bagName').textContent = data.bagName || 'РЮКЗАК';
    const bagWeight = Number(data.bagWeight) || bagItems.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.count) || 1), 0);
    const bagMaxWeight = Number(data.bagMaxWeight) || bagLimit;
    $('bagCapacity').textContent = bagLimit ? (data.capacityUnit === 'slots' ? `${bagItems.length} / ${bagLimit} СЛОТОВ` : `${bagWeight.toFixed(1)} / ${bagMaxWeight.toFixed(1)} КГ`) : 'НЕТ СУМКИ';
    const bagVisibleSlots = hasBag ? Math.min(15, Math.max(1, bagLimit)) : 0;
    const bagBySlot = new Map(bagItems.map(item => [Number(item.sourceSlot), item]));
    const bagCells = Array.from({ length: bagVisibleSlots }, (_, index) => {
      const el = cell(bagBySlot.get(index) || null);
      el.dataset.bagSlot = String(index);
      return el;
    });
    $('bagGrid').replaceChildren(...bagCells);

    // Keep authoritative server slot numbers when paging or dragging.
    const bySlot = new Map(items.map(item => [Number(item.sourceSlot), item]));
    $('itemsGrid').replaceChildren(...Array.from({ length: 20 }, (_, index) => {
      const slot = pageStart + index, el = cell(bySlot.get(slot) || null);
      el.dataset.gridSlot = String(slot);
      el.disabled = slot >= capacity;
      return el;
    }));
    $('inventoryCount').textContent = `${items.length} / ${capacity} СЛОТОВ`;
    $('itemPage').textContent = `${itemPage + 1} / ${pages}`;
    $('previousPage').disabled = itemPage === 0;
    $('nextPage').disabled = itemPage >= pages - 1;

    const nearby = environmentItem ? [environmentItem] : [];
    const environmentCells = nearby.map(item => cell(item));
    while (environmentCells.length < 8) environmentCells.push(cell(null));
    $('environmentGrid').replaceChildren(...environmentCells);

    const bandolier=Array.isArray(data.bandolier)?data.bandolier:[];
    $('ammoGrid').replaceChildren(...Array.from({length:6},(_,i)=>{const item=bandolier.find(x=>Number(x.sourceSlot)===i)||null;const el=cell(item);el.dataset.bandolierSlot=String(i);return el;}));
    $('ammoCapacity').textContent=bandolier.length+' / 6';
    refreshSelection();
  }
  function update(next) {
    if (typeof next === 'string') { try { next = JSON.parse(next); } catch (_) { return; } }
    if (!next || typeof next !== 'object') return;
    data = { ...next,
      items: Array.isArray(next.items) ? next.items : [],
      weapons: Array.isArray(next.weapons) ? next.weapons : [],
      bagItems: Array.isArray(next.bagItems) ? next.bagItems : [],
      ammo: Array.isArray(next.ammo) ? next.ammo : [],
      equipment: next.equipment || {}
    };
    render();
  }
  function setEnvironment(meta) {
    if (!meta || !meta.label) environmentItem = null;
    else environmentItem = {
      id: '__nearby_environment_item', type: 'environment', origin: 'environment',
      name: String(meta.label), count: Math.max(1, Number(meta.qty) || 1), iconType: 'box'
    };
    render();
  }
  function viewport() {
    const rect = $('character').getBoundingClientRect();
    send('client:inventory:viewport', (rect.left + rect.width / 2) / innerWidth, innerWidth / innerHeight);
  }
  function show(attempt) {
    const root = $('inventory');
    if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
    revision++;
    opened = true;
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add('visible');
    viewport();
    requestAnimationFrame(() => { if (opened) send('client:inventory:shown', attempt); });
  }
  function hide(notifyClient = false) {
    opened = false;
    const root = $('inventory');
    const currentRevision = ++revision;
    root.classList.remove('visible');
    $('dropConfirm').hidden = true;
    $('splitDialog').hidden = true;
    closeContextMenu();
    rotation = null;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (currentRevision === revision) root.hidden = true; }, 350);
    if (notifyClient) send('client:inventory:closed');
  }
  function useSelected() { defaultAction(itemById(selected)); }

  $('close').addEventListener('click', () => hide(true));
  $('use').addEventListener('click', useSelected);
  $('drop').addEventListener('click', requestDrop);
  $('cancelDrop').addEventListener('click', () => { $('dropConfirm').hidden = true; });
  $('confirmDrop').addEventListener('click', () => {
    $('dropConfirm').hidden = true;
    const item = itemById(selected);
    if (item) act('drop', item);
  });
  document.addEventListener('dragover', event => {
    if (!dragged || event.target.closest('.cell,button,input,.confirm,.item-context-menu')) return;
    event.preventDefault();
  });
  document.addEventListener('drop', event => {
    if (!dragged || event.target.closest('.cell,button,input,.confirm,.item-context-menu')) return;
    event.preventDefault();
    selected = dragged;
    requestDrop();
  });
  $('splitSlider').addEventListener('input', updateSplitCount);
  $('splitCancel').addEventListener('click', () => { $('splitDialog').hidden = true; splitItemId = null; });
  $('previousPage').addEventListener('click', () => { itemPage--; closeContextMenu(); render(); });
  $('nextPage').addEventListener('click', () => { itemPage++; closeContextMenu(); render(); });
  $('splitConfirm').addEventListener('click', confirmSplit);
  document.addEventListener('pointerdown', event => {
    if (!$('itemContextMenu').hidden && !event.target.closest('#itemContextMenu')) closeContextMenu();
  });
  window.addEventListener('keydown', event => {
    if (!opened || event.repeat) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!$('splitDialog').hidden) { $('splitDialog').hidden = true; splitItemId = null; }
      else if (!$('dropConfirm').hidden) $('dropConfirm').hidden = true;
      else if (!$('itemContextMenu').hidden) closeContextMenu();
      else hide(true);
      return;
    }
    if (event.target.tagName === 'INPUT' || !$('dropConfirm').hidden || !$('splitDialog').hidden) return;
    if (event.code === 'KeyE') { event.preventDefault(); useSelected(); }
    if (event.code === 'KeyR') { event.preventDefault(); requestDrop(); }
  });
  window.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('resize', () => { if (opened) viewport(); });
  const area = $('rotateArea');
  area.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    rotation = event.clientX;
    area.setPointerCapture(event.pointerId);
  });
  area.addEventListener('pointermove', event => {
    if (rotation === null) return;
    const delta = event.clientX - rotation;
    rotation = event.clientX;
    send('client:inventory:rotate', Math.max(-40, Math.min(40, delta)));
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) area.addEventListener(eventName, () => { rotation = null; });

  function updateVitals(values){for(const key of ['satiety','thirst','mood']){const n=Number(values[key]);data[key]=values[key]===undefined?undefined:Math.round(Math.max(0,Math.min(100,Number.isFinite(n)?n:0)));$(key).textContent=data[key]===undefined?'—':data[key]+'%';}}
  window.INVENTORY_UI = { updateVitals, show, hide: () => hide(false), update, ack, notify, setEnvironment, openSplit };
  render();
  send('client:inventory:ready');
})();
