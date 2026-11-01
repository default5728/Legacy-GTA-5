const isGame = typeof mp !== 'undefined';
const INV_DIR = isGame ? 'package://browsers/inventory/img/' : '../inventory/img/';
const CAT_DIR = INV_DIR;

const STATE = {
    partnerName: 'ПАРТНЁР',
    partnerStatic: 0,
    balance: 0,
    money: 0,
    ready: false,
    partnerReady: false,
    inv: [],
    offer: [],
    receive: [],
    receiveMoney: 0,
    stackTradeable: {},
    localReadyChecked: false,
};

let tradeContainer, readyCheckboxInput, moneyInput, balanceLabel;
let moneyTimer = null;
let qtyModal = null;
let qtyModalInput = null;
let qtyModalOk = null;
let qtyAction = null;

function trigger(name) {
    if (!isGame || !mp.trigger) return;
    const args = Array.prototype.slice.call(arguments, 1);
    mp.trigger.apply(mp, [name].concat(args));
}

function itemBase(item) {
    return String(item || '').replace(/^\uFEFF/, '').trim().split('(')[0].trim().split('#')[0].trim();
}

function stackQty(item) {
    const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(item || ''));
    if (st) return parseInt(st[2], 10) || 1;
    const m = /\((\d+)\)\s*$/.exec(String(item || ''));
    return m ? (parseInt(m[1], 10) || 1) : 1;
}

const WEAPON_NAMES = {
    weapon_heavyshotgun: 'Heavy Shotgun',
    weapon_carbinerifle: 'Carbine Rifle',
    weapon_assaultrifle: 'Assault Rifle',
    weapon_assaultshotgun: 'Assault Shotgun',
    weapon_combatmg: 'Combat MG',
    weapon_combatmg_mk2: 'Combat MG MKII',
    weapon_minismg: 'Mini SMG',
    weapon_militaryrifle: 'Military Rifle',
    weapon_sniperrifle: 'Sniper Rifle',
    weapon_heavysniper: 'Heavy Sniper MK1',
    weapon_heavysniper_mk2: 'Heavy Sniper MKII',
    weapon_marksmanrifle: 'Marksman Rifle',
    weapon_specialcarbine: 'Special Carbine',
    weapon_specialcarbine_mk2: 'Special Carbine MK2',
    weapon_precisionrifle: 'Precision Rifle',
    weapon_revolver: 'Revolver',
    weapon_revolver_mk2: 'Revolver MKII',
    weapon_navyrevolver: 'Navy Revolver',
    weapon_musket: 'Musket',
    weapon_gadgetpistol: 'Gadget Pistol',
};

function itemName(item) {
    const raw = String(item || '');
    const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(raw);
    if (st) return (st[1] === 'item_spank' ? 'Спанк' : 'Медовуха');
    const hol = /^trade_donate:holster:(cobura|coburaw):/.exec(raw);
    if (hol) return hol[1] === 'cobura' ? 'Чёрная Кобура' : 'Белая Кобура';
    const bag = /^trade_donate:bag:(bag_\w+)$/.exec(raw);
    if (bag) return 'Сумка ' + bag[1].replace(/^bag_/, '');
    if (raw.indexOf('ic1.') === 0) {
        try {
            const b64 = raw.split('(')[0].trim().slice(4);
            const json = decodeURIComponent(escape(atob(b64)));
            const o = JSON.parse(json);
            if (o && o.nm) return String(o.nm).replace(/\s*\(\d+\s*слотов\)/gi, '').split(' · ')[0];
        } catch (_e) {}
        return 'Одежда';
    }
    if (raw.indexOf('ivhol:') === 0) {
        const k = raw.split('(')[0].trim().slice(6);
        return ({ cobura: 'Чёрная Кобура', coburaw: 'Белая Кобура' }[k]) || 'Кобура';
    }
    if (raw.indexOf('ivbag:') === 0) return 'Сумка';
    const base = itemBase(raw);
    if (WEAPON_NAMES[base]) return WEAPON_NAMES[base];
    const names = {
        item_spank: 'Спанк',
        item_alco: 'Медовуха',
        item_bong: 'Трубка Bong',
        item_drone: 'Дрон',
        item_skateboard: 'Скейтборд',
        'Бронежилет': 'Бронежилет',
        'Аптечка': 'Аптечка',
    };
    return names[base] || base.replace('item_', '') || 'Предмет';
}

function itemImage(item) {
    const raw = String(item || '');
    const base = itemBase(raw);
    const st = /^trade_stack:(item_spank|item_alco):/.exec(raw);
    if (st) return st[1] === 'item_spank' ? INV_DIR + 'item_spank.png' : 'package://browsers/hud/images/med.png';
    if (base === 'item_alco') return 'package://browsers/hud/images/med.png';
    const map = {
        item_spank: 'item_spank.png',
        item_bong: 'bong.png',
        item_drone: 'drone.png',
        item_skateboard: 'skateborde.png',
        'Бронежилет': 'armor.png',
        'Аптечка': 'heal.png',
        weapon_heavysniper: 'svc.png',
    };
    if (base.indexOf('weapon_') === 0) return INV_DIR + (map[base] || (base + '.png'));
    if (map[base]) return INV_DIR + map[base];
    if (base.indexOf('ic1.') === 0) return CAT_DIR + 'body.svg';
    if (base.indexOf('ivbag:') === 0) return CAT_DIR + 'bascket.svg';
    if (base.indexOf('ivhol:') === 0) return INV_DIR + 'cobura.png';
    if (base.indexOf('trade_donate:holster:') === 0) return INV_DIR + 'cobura.png';
    if (base.indexOf('trade_donate:bag:') === 0) return CAT_DIR + 'bascket.svg';
    return '../menunew/img/cartridge.svg';
}

function stackBase(item) {
    const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(item || ''));
    return st ? st[1] : null;
}

function cellInner(item, qtyOverride) {
    const q = qtyOverride != null ? qtyOverride : stackQty(item);
    const qtyHtml = q > 1 ? `<div class="ti-qty">x${q}</div>` : '';
    const img = `<img class="ti-img${itemBase(item).indexOf('weapon_') === 0 ? ' ti-img--weapon' : ''}" src="${itemImage(item)}" onerror="this.onerror=null;this.src='../menunew/img/cartridge.svg'" alt="">`;
    return `${qtyHtml}${img}<div class="ti-name">${itemName(item)}</div>`;
}

function clientTradeableItem(item) {
    if (!item || typeof item !== 'string') return false;
    if (/^trade_donate:car:/.test(item)) return false;
    if (/^trade_family:mansion:/.test(item)) return false;
    if (item.indexOf('trade_donate:') === 0) return true;
    if (item.indexOf('ic1.') === 0) return true;
    if (item.indexOf('ivhol:') === 0 || item.indexOf('ivbag:') === 0) return true;
    if (item === 'weapon_revolver') return false;
    const base = itemBase(item);
    if (base === 'item_spank' || base === 'item_alco') return false;
    if (base === 'Бронежилет') return false;
    return base.startsWith('weapon_');
}

function stackQtyInOffer(base) {
    let q = 0;
    for (const it of STATE.offer) {
        const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(it || ''));
        if (st && st[1] === base) q += parseInt(st[2], 10) || 0;
    }
    return q;
}

function visibleInventoryRaw() {
    const inv = Array.isArray(STATE.inv) ? STATE.inv.slice() : [];
    for (const offered of STATE.offer) {
        const ix = inv.indexOf(offered);
        if (ix >= 0) inv.splice(ix, 1);
    }
    const out = inv.filter(clientTradeableItem);
    const spank = parseInt(STATE.stackTradeable.item_spank, 10) || 0;
    const alco = parseInt(STATE.stackTradeable.item_alco, 10) || 0;
    const spankLeft = spank - stackQtyInOffer('item_spank');
    const alcoLeft = alco - stackQtyInOffer('item_alco');
    if (spankLeft > 0) out.push('trade_stack:item_spank:' + spankLeft);
    if (alcoLeft > 0) out.push('trade_stack:item_alco:' + alcoLeft);
    return out;
}

function groupItems(list) {
    const order = [];
    const map = {};
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const key = itemGroupKey(item, i);
        if (!map[key]) {
            map[key] = { key, item, count: 0, firstIndex: i };
            order.push(map[key]);
        }
        const sb = stackBase(item);
        map[key].count += sb ? stackQty(item) : 1;
    }
    return order;
}

function itemGroupKey(item, index) {
    const sb = stackBase(item);
    const base = itemBase(item);
    return sb ? ('stack:' + sb) : (base.indexOf('item_') === 0 ? ('base:' + base) : ('item:' + String(item) + ':' + String(index == null ? '' : index)));
}

function renderInv() {
    const grid = document.getElementById('yourItemsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const list = groupItems(visibleInventoryRaw());
    for (let i = 0; i < 20; i++) {
        const group = list[i];
        const it = group && group.item;
        const cell = document.createElement('div');
        cell.className = 'playerInventory-item-container';
        if (it) {
            cell.innerHTML = cellInner(it, group.count);
            cell.style.cursor = 'pointer';
            cell.draggable = true;
            cell.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'inv', item: it })));
            cell.addEventListener('click', (e) => addOfferItem(it, e.ctrlKey));
        }
        attachDrop(cell, 'inv');
        grid.appendChild(cell);
    }
}

function renderOffer() {
    const grid = document.getElementById('yourOfferGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const grouped = groupItems(STATE.offer);
    for (let i = 0; i < 6; i++) {
        const group = grouped[i];
        const it = group && group.item;
        const cell = document.createElement('div');
        cell.className = 'playerInventory-item-container';
        cell.style.margin = '3px';
        if (it) {
            cell.innerHTML = cellInner(it, group.count);
            cell.style.cursor = 'pointer';
            cell.draggable = true;
            cell.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'offer', idx: group.firstIndex, item: it, count: group.count })));
            cell.addEventListener('click', (e) => removeOfferGroup(group, e.ctrlKey));
        }
        attachDrop(cell, 'offer');
        grid.appendChild(cell);
    }
}

function attachDrop(cell, zone) {
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('dragover'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('dragover'));
    cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('dragover');
        let s;
        try { s = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_e) { return; }
        if (s.from === 'inv' && zone === 'offer') addOfferItem(s.item, e.ctrlKey);
        else if (s.from === 'offer' && zone === 'inv') {
            if (e.ctrlKey && s.item && stackBase(s.item) && s.count > 1) removeOfferGroup({ item: s.item, count: s.count, firstIndex: s.idx }, true);
            else removeOfferGroup({ item: s.item, count: s.count || 1, firstIndex: s.idx }, false);
        }
    });
}

function renderRecv() {
    const el = document.getElementById('tradeRecvList');
    if (!el) return;
    el.innerHTML = '';
    if (STATE.receiveMoney > 0) {
        const money = document.createElement('div');
        money.className = 'trade-recv-money';
        money.textContent = '$ ' + formatMoney(STATE.receiveMoney);
        el.appendChild(money);
    }
    for (const group of groupItems(STATE.receive)) {
        const it = group.item;
        const row = document.createElement('div');
        row.className = 'trade-recv-row';
        row.textContent = itemName(it) + (group.count > 1 ? ' x' + group.count : '');
        el.appendChild(row);
    }
}

function renderReady() {
    if (readyCheckboxInput) readyCheckboxInput.checked = !!(STATE.ready || STATE.localReadyChecked);
}

function formatMoney(n) {
    const x = parseInt(n, 10) || 0;
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function renderMoney() {
    if (balanceLabel) balanceLabel.textContent = ' / ' + formatMoney(STATE.balance) + '$';
    if (moneyInput) {
        const cur = parseInt(String(moneyInput.value || '').replace(/\D/g, ''), 10) || 0;
        moneyInput.style.color = cur > STATE.balance ? '#ff5555' : '#fff';
    }
}

function renderStatus() {
    const label = document.querySelector('.yk-checkbox-text');
    if (!label) return;
    label.textContent = 'Готов к обмену';
    const btn = document.querySelector('.yk-btn.green');
    if (btn) {
        btn.disabled = !!STATE.ready || !STATE.localReadyChecked;
        btn.classList.toggle('is-dim', !STATE.localReadyChecked || !!STATE.ready);
    }
}

function renderAll() {
    const name = document.getElementById('tradePartnerName');
    if (name) name.textContent = STATE.partnerName || 'ПАРТНЁР';
    renderInv();
    renderOffer();
    renderRecv();
    renderReady();
    renderMoney();
    renderStatus();
}

function addOfferItem(item, splitMode) {
    if (!item) return;
    const grouped = groupItems(STATE.offer);
    const key = itemGroupKey(item, -1);
    const hasGroup = grouped.some((g) => g.key === key);
    if (grouped.length >= 6 && !hasGroup) return;
    const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(item));
    if (st) {
        const max = parseInt(st[2], 10) || 1;
        if (splitMode && max > 1) {
            openQtyModal({ title:'Сколько передать?', max:max, def:1, okText:'Передать', action:function(q) {
                trigger('trade:addStack:c', st[1], q);
            }});
        } else {
            trigger('trade:addStack:c', st[1], max);
        }
        return;
    }
    trigger('trade:addItem:c', item);
}

function removeOfferItem(idx) {
    trigger('trade:removeItem:c', idx);
}

function removeOfferGroup(group, splitMode) {
    if (!group) return;
    const sb = stackBase(group.item);
    if (splitMode && sb && group.count > 1) {
        openQtyModal({ title:'Сколько убрать?', max:group.count, def:1, okText:'Убрать', action:function(q) {
            trigger('trade:removeStack:c', sb, q);
        }});
        return;
    }
    if (sb && group.count > 1) trigger('trade:removeStack:c', sb, group.count);
    else removeOfferItem(group.firstIndex);
}

function toggleReady() {
    if (STATE.ready) {
        STATE.localReadyChecked = false;
        trigger('trade:ready:c', false);
        return;
    }
    STATE.localReadyChecked = !STATE.localReadyChecked;
    renderReady();
    renderStatus();
}

function confirmTrade() {
    if (!STATE.localReadyChecked && !STATE.ready) {
        const label = document.querySelector('.yk-checkbox-text');
        if (label) label.textContent = 'Сначала отметьте готовность';
        return;
    }
    trigger('trade:ready:c', true);
}

function closeTrade() {
    trigger('trade:cancel:c');
}

function onMoneyInput() {
    if (!moneyInput) return;
    const raw = String(moneyInput.value || '').replace(/\D/g, '');
    moneyInput.value = raw;
    STATE.money = parseInt(raw, 10) || 0;
    STATE.ready = false;
    STATE.localReadyChecked = false;
    renderReady();
    renderMoney();
    if (moneyTimer) clearTimeout(moneyTimer);
    moneyTimer = setTimeout(() => trigger('trade:setMoney:c', STATE.money), 350);
}

function beginTrade(partnerLogin, partnerStatic, invJson) {
    let inv = [];
    try { inv = typeof invJson === 'string' ? JSON.parse(invJson) : invJson; } catch (_e) { inv = []; }
    STATE.partnerName = partnerLogin || 'ПАРТНЁР';
    STATE.partnerStatic = parseInt(partnerStatic, 10) || 0;
    STATE.inv = Array.isArray(inv) ? inv : [];
    STATE.money = 0;
    STATE.ready = false;
    STATE.partnerReady = false;
    STATE.localReadyChecked = false;
    STATE.offer = [];
    STATE.receive = [];
    STATE.receiveMoney = 0;
    if (moneyInput) moneyInput.value = '0';
    if (tradeContainer) tradeContainer.style.display = 'block';
    renderAll();
}

function applyTradeSync(payloadStr) {
    let d;
    try { d = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr; } catch (_e) { return; }
    if (!d) return;
    STATE.offer = Array.isArray(d.myItems) ? d.myItems.slice() : [];
    STATE.money = parseInt(d.myMoney, 10) || 0;
    STATE.receive = Array.isArray(d.partnerItems) ? d.partnerItems.slice() : [];
    STATE.receiveMoney = parseInt(d.partnerMoney, 10) || 0;
    STATE.ready = !!d.myReady;
    STATE.partnerReady = !!d.partnerReady;
    STATE.localReadyChecked = STATE.ready ? true : false;
    STATE.inv = Array.isArray(d.invSnapshot) ? d.invSnapshot.slice() : STATE.inv;
    STATE.stackTradeable = d.stackTradeable && typeof d.stackTradeable === 'object' ? d.stackTradeable : {};
    STATE.balance = parseInt(d.moneyBalance, 10) || STATE.balance || 0;
    if (moneyInput) moneyInput.value = STATE.money > 0 ? String(STATE.money) : '0';
    renderAll();
}

function resetTradeUi() {
    STATE.ready = false;
    STATE.partnerReady = false;
    STATE.localReadyChecked = false;
    STATE.inv = [];
    STATE.offer = [];
    STATE.receive = [];
    STATE.receiveMoney = 0;
    STATE.money = 0;
    if (moneyInput) moneyInput.value = '0';
    if (tradeContainer) tradeContainer.style.display = 'none';
    renderAll();
}

document.addEventListener('DOMContentLoaded', function () {
    tradeContainer = document.getElementById('tradeContainer');
    readyCheckboxInput = document.getElementById('readyCheckboxInput');
    moneyInput = document.getElementById('tradeMoneyInput');
    balanceLabel = document.getElementById('tradeBalanceLabel');
    if (moneyInput) moneyInput.addEventListener('input', onMoneyInput);
    if (tradeContainer) tradeContainer.style.display = 'none';
    ensureQtyModal();
    renderAll();
});

function ensureQtyModal() {
    if (qtyModal) return;
    qtyModal = document.createElement('div');
    qtyModal.className = 'qty-modal trade-qty-modal';
    qtyModal.innerHTML = '<div class="qty-card trade-qty-card"><div class="qty-title trade-qty-title">Количество</div><div class="qty-sub trade-qty-sub">Доступно: 1</div><div class="qty-input-wrap"><input class="trade-qty-input" type="number" min="1" value="1"><button class="qty-max-inline trade-qty-max" type="button">MAX</button></div><div class="qty-actions trade-qty-actions"><button class="qty-btn ghost trade-qty-cancel" type="button">Отмена</button><button class="qty-btn ok trade-qty-ok" type="button">ОК</button></div></div>';
    document.body.appendChild(qtyModal);
    qtyModalInput = qtyModal.querySelector('.trade-qty-input');
    qtyModalOk = qtyModal.querySelector('.trade-qty-ok');
    qtyModal.querySelector('.trade-qty-cancel').addEventListener('click', closeQtyModal);
    qtyModal.querySelector('.trade-qty-max').addEventListener('click', function () {
        if (qtyModalInput) qtyModalInput.value = qtyModalInput.getAttribute('max') || '1';
    });
    qtyModalOk.addEventListener('click', function () {
        if (!qtyAction || !qtyModalInput) return closeQtyModal();
        const max = parseInt(qtyModalInput.getAttribute('max'), 10) || 1;
        let q = parseInt(String(qtyModalInput.value || '').replace(/\D/g, ''), 10) || 1;
        if (q < 1) q = 1;
        if (q > max) q = max;
        const fn = qtyAction;
        closeQtyModal();
        fn(q);
    });
    qtyModalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); qtyModalOk.click(); }
        if (e.key === 'Escape') { e.preventDefault(); closeQtyModal(); }
    });
}

function openQtyModal(opt) {
    ensureQtyModal();
    opt = opt || {};
    qtyAction = opt.action;
    const t = qtyModal.querySelector('.trade-qty-title');
    const s = qtyModal.querySelector('.trade-qty-sub');
    const max = parseInt(opt.max, 10) || 1;
    if (t) t.textContent = opt.title || 'Сколько?';
    if (s) s.textContent = 'Доступно: ' + max;
    qtyModalInput.setAttribute('max', String(max));
    qtyModalInput.value = String(Math.max(1, Math.min(max, opt.def || 1)));
    qtyModalOk.textContent = opt.okText || 'ОК';
    qtyModal.classList.add('show');
    setTimeout(function () { qtyModalInput.focus(); qtyModalInput.select(); }, 0);
}

function closeQtyModal() {
    qtyAction = null;
    if (qtyModal) qtyModal.classList.remove('show');
}

window.beginTrade = beginTrade;
window.applyTradeSync = applyTradeSync;
window.resetTradeUi = resetTradeUi;
window.closeTrade = closeTrade;
window.toggleReady = toggleReady;
window.confirmTrade = confirmTrade;
