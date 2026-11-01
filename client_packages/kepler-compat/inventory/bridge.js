'use strict';
function emptySlot(){return {id:'E',name:'',count:0,weight:0,slot:-1};}
function emptyWeapon(){return emptySlot();}
window.invApp={data:{},replaceItem:{start:false},binderSlotData:[],$set:(o,k,v)=>{o[k]=v;},$delete:(o,k)=>{delete o[k];},closeInv(){mp.trigger('closeInventory');}};
window.invTrigger=(event,...args)=>mp.trigger(event,...args);
const keplerComps=new Map();
const keplerSlotNames={legs:'pants',foot:'shoes',under:'backpack',accessories:'accessory',bracelets:'bracelet',hat:'hat',mask:'mask',glasses:'glasses',top:'top',armor:'vest',holster:'accessory',bag:'backpack',pants:'pants',shoes:'shoes',ears:'earrings',watch:'watch',bracelet:'bracelet',gloves:'gloves',decals:'special'};
function keplerDecode(raw){try{if(!String(raw).startsWith('kpl.'))return null;return JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));}catch(_){return null;}}
function keplerView(item,id,comp){
 const legacy=keplerDecode(item.raw),payload=String(item.raw||'').startsWith('ic1.')?decodeIc1Payload(invItemBaseId(item.raw)):null;
 const slot=legacy&&legacy.slot||({1:'hat',2:'mask',3:'top',4:'pants',5:'shoes',6:'accessory',7:'glasses',8:'backpack',9:'vest',12:'earrings',13:'watch',14:'bracelet',15:'gloves'})[payload&&payload.cid];
 const origin=comp.type==='bandolier'?'bandolier':comp.type==='clothes'?'equipment':comp.type==='weapon'?'quick':comp.type==='bagItem'?'bag':'grid';
 const sourceSlot=comp.itemslot!==undefined?Number(comp.itemslot):comp.weaponslot!==undefined?Number(comp.weaponslot):undefined;
 keplerComps.set(id,comp);
 return {...(legacy||{}),raw:item.raw||item.id,readOnly:item.readOnly===true||!!(legacy&&legacy.readOnly),id,name:legacy?(legacy.name||({burger:'Бургер',water:'Вода',chocolate:'Шоколад',medkit:'Аптечка',repair:'Ремонтный набор'})[legacy.type]||'Предмет'):(item.name||'Предмет'),count:legacy?legacy.count:item.count||1,type:comp.type==='clothes'?'clothing':comp.type==='weapon'?'weapon':legacy?legacy.type:slot?'clothing':'source',slot,image:legacy?(legacy.type==='license_plate'?'package://browsers/inventory/UI/Inventory/Items/veh_number.png':undefined):item.icoFull,weight:legacy?Number(legacy.weight)||0:Number(item.weight)||0,origin,sourceSlot};
}
window.openInventory=function(payload){
 invApp.data=payload;keplerComps.clear();const items=[],weapons=[],bagItems=[],bandolier=[],equipment={};
 for(const [index,item]of (payload.items||[]).entries())if(item&&item.id!=='E')items.push(keplerView(item,'grid-'+index,{type:'item',data:item,itemslot:index}));
 for(const [index,item]of (payload.weapons||[]).entries())if(item&&item.id!=='E')weapons.push(keplerView(item,'weapon-'+index,{type:'weapon',data:item,weaponslot:index}));
 for(const [slot,item]of Object.entries(payload.clothes||{}))if(item&&item.id!=='E'){const key=keplerSlotNames[slot]||slot;const view=keplerView(item,'equip-'+slot,{type:'clothes',data:item,clothesslot:item.slot});view.type='clothing';view.origin='equipment';view.slot=key;equipment[key]=view;}
 if(!window.inventoryWarehouseMode)for(const [index,item]of (payload.bagItems||[]).entries())if(item&&item.id!=='E')bagItems.push(keplerView(item,'bag-'+index,{type:'bagItem',data:item,itemslot:index}));
 for(const [index,item]of (payload.bandolier||[]).entries())if(item&&item.id!=='E')bandolier.push(keplerView(item,'bandolier-'+index,{type:'bandolier',data:item,itemslot:index}));
 INVENTORY_UI.update({items,weapons,bagItems,bandolier,bagLimit:(payload.bagItems||[]).length,bagName:payload.bagName||'',bagWeight:Number(payload.bagWeight)||0,bagMaxWeight:Number(payload.bagMaxWeight)||0,ammo:Array.isArray(payload.ammo)?payload.ammo:[],equipment,itemLimit:window.inventoryWarehouseMode?Math.max(20,items.length):20,capacityUnit:'slots',maxWeight:Number(payload.maxSlots)||50,currentWeight:Number(payload.usedSlots)||0,satiety:payload.player&&payload.player.satiety,thirst:payload.player&&payload.player.thirst,mood:payload.player&&payload.player.mood});
};
window.keplerInventoryRefresh=()=>{if(invApp.data.items)openInventory(invApp.data);};
window.keplerInventoryAction=(action,id,requestId,extra)=>{
 const comp=keplerComps.get(id);if(comp&&comp.data.readOnly){INVENTORY_UI.ack(requestId,false,'Это надетый внешний вид из редактора; отдельного предмета в сумке нет.');return;}if(!comp){INVENTORY_UI.ack(requestId,false,'Предмет уже изменился.');return;}
 if(comp.type==='bandolier'){mp.trigger('legacy:bandolier:move','take',comp.itemslot,-1,comp.data.raw||comp.data.id);INVENTORY_UI.ack(requestId,true,'');return;}
 if(action==='assignFast'){const ok=invTryAssignFastSlot(comp.data.raw||comp.data.id,extra);INVENTORY_UI.ack(requestId,ok,'');return;}
 if(action==='split'){const opened=INVENTORY_UI.openSplit(id);INVENTORY_UI.ack(requestId,opened,opened?'':'Нельзя разделить этот предмет.');return;}
 if(action==='unequip'||action==='remove'){invPerformItemUse(comp,false);INVENTORY_UI.ack(requestId,true,'');return;}
 if(action==='use'){
  const raw=comp.data.raw||comp.data.id;
  if(keplerDecode(raw))mp.trigger('kepler:legacy:use:client',raw);
  else invPerformItemUse(comp,false);
 }else if(action==='drop'){
  if(comp.type==='clothes'){INVENTORY_UI.ack(requestId,false,'Сначала снимите одежду.');return;}
  if(window.inventoryWarehouseMode&&comp.type==='bagItem'){whWithdrawFromItem(comp.data.raw,comp.data.count);INVENTORY_UI.ack(requestId,true,'');return;}
  const slot=comp.type==='bagItem'?'bag':comp.type==='weapon'?'weapon':'grid',index=comp.type==='weapon'?comp.weaponslot:comp.itemslot;
  mp.trigger('legacy:inventory:drop',requestId,slot,index,comp.data.raw||comp.data.id);return;
 }
 INVENTORY_UI.ack(requestId,true,'');
};
window.applyInventoryCenterSetting=on=>{document.body.dataset.centerInventory=String(!!on);};
new MutationObserver(()=>{if(document.body.classList.contains('inventory-ui-open'))INVENTORY_UI.show(1);else INVENTORY_UI.hide();}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.exitWarehouseUiMode = function () {
    window.inventoryWarehouseMode = false;
    if (window.invApp && window.invApp.data) {
        window.invApp.data.bagName = '';
        window.invApp.data.bagItems = [];
    }
};
window.scheduleInventorySlotScaleResync = function () {};

var INV_GRID_SIZE = 20;

var INV_PKG_MENUNEW = 'package://browsers/menunew/img/';
var INV_PKG_IMG = 'package://browsers/inventory/img/';
var INV_FALLBACK_WEAPON = INV_PKG_MENUNEW + 'cartridge.svg';

function humanizeWeaponIdClient(id) {
    if (!id || typeof id !== 'string' || !id.startsWith('weapon_')) return id;
    var s = id.slice(7);
    return s.split('_').map(function (part) {
        if (part.toLowerCase() === 'mk2') return 'MKII';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join(' ');
}

function decodeIc1Payload(full) {
    if (!full || typeof full !== 'string' || !full.startsWith('ic1.')) return null;
    try {
        var json = decodeURIComponent(escape(atob(full.slice(4))));
        return JSON.parse(json);
    } catch (e1) {
        try {
            return JSON.parse(atob(full.slice(4)));
        } catch (e2) {
            return null;
        }
    }
}

function invResolveClothIconUrl(cid) {
    if (typeof window.clothCategoryIconSrc === 'function') return window.clothCategoryIconSrc(Number(cid));
    return 'package://browsers/inventory/img/body.svg';
}

var CALAM_CLOTH_CID_FOLDER = {
    1: 'hats',
    2: 'masks',
    3: 'tops',
    4: 'legs',
    5: 'shoes',
    6: 'accessories',
    7: 'glasses',
    8: 'bags',
    9: 'armor',
    12: 'ears',
    13: 'watches',
    14: 'bracelets',
    15: 'gloves'
};

function invClothGenderDir() {
    return window.__invClothMale === false ? 'female' : 'male';
}

function invClothGenderAltDir() {
    return window.__invClothMale === false ? 'male' : 'female';
}

function invPkgClothesBase() {
    return 'package://browsers/inventory/clothes_assets/';
}

function invCalclothPngUrl(cid, drawable, texture, genderDir) {
    var fld = CALAM_CLOTH_CID_FOLDER[Number(cid)];
    var d = Number(drawable);
    var t = Number(texture);
    if (!fld || !Number.isFinite(d) || !Number.isFinite(t)) return null;
    var gd = genderDir || invClothGenderDir();
    return invPkgClothesBase() + gd + '/' + fld + '/' + d + '_' + t + '.png';
}

function invCalclothTokenFromIc1Payload(po) {
    if (!po || po.cid == null || po.d == null || po.t == null) return null;
    var cid = Number(po.cid);
    var d = Number(po.d);
    var t = Number(po.t);
    if (!CALAM_CLOTH_CID_FOLDER[cid] || !Number.isFinite(d) || !Number.isFinite(t)) return null;
    return 'CALCLOTHPNG|' + cid + '|' + d + '|' + t;
}

/** ItemImg из ic1 (ItemsMale/…, spectrum/…) → package:// путь. */
function invResolveClothPhotoRel(imgRel) {
    if (!imgRel || typeof imgRel !== 'string') return null;
    var s = imgRel.replace(/^\uFEFF/, '').trim().replace(/^\/+/, '');
    if (!s) return null;
    if (s.indexOf('package://') === 0 || s.indexOf('http://') === 0 || s.indexOf('https://') === 0) return s;
    if (/^patrontazh_\d+\.png$/i.test(s)) return INV_PKG_IMG + s;
    if (s.indexOf('clothes/') === 0) return INV_PKG_MENUNEW + s;
    return INV_PKG_IMG + s;
}

/** Локальные фото, которые уже лежат в сборке (как skateborde.png). */
function invClothLocalPhotoOverride(cid, drawable, texture) {
    var c = Number(cid);
    var d = Number(drawable);
    var t = Number(texture);
    if (!Number.isFinite(c) || !Number.isFinite(d)) return null;
    if (c === 9 && d === 305) return INV_PKG_IMG + invPatrontazhColorFile(t);
    if (c === 6 && d === 210) {
        if (t === 1) return INV_PKG_MENUNEW + 'clothes/coburaw.png';
        if (t === 2) return INV_PKG_MENUNEW + 'clothes/coburas.png';
        return INV_PKG_MENUNEW + 'clothes/cobura.png';
    }
    return null;
}

function invBuildClothPhotoCandidates(po) {
    var out = [];
    var push = function (u) {
        if (u && out.indexOf(u) < 0) out.push(u);
    };
    if (!po) return out;
    var cid = Number(po.cid);
    var d = Number(po.d);
    var t = Number(po.t);
    push(invClothLocalPhotoOverride(cid, d, t));
    if (po.img) {
        push(invResolveClothPhotoRel(String(po.img)));
        var imgStr = String(po.img);
        if (/\.jpe?g$/i.test(imgStr)) {
            push(invResolveClothPhotoRel(imgStr.replace(/\.jpe?g$/i, '.png')));
        }
    }
    if (Number.isFinite(cid) && Number.isFinite(d) && Number.isFinite(t)) {
        push(invCalclothPngUrl(cid, d, t, invClothGenderDir()));
        push(invCalclothPngUrl(cid, d, t, invClothGenderAltDir()));
    }
    return out;
}

function invIsPatrontazhPayload(po) {
    return !!(po && Number(po.cid) === 9 && Number(po.d) === 305);
}

function invPatrontazhColorFile(tex) {
    var n = Number(tex);
    var color = Number.isFinite(n) ? n + 1 : 1;
    if (color < 1 || color > 3) color = 1;
    return 'patrontazh_' + color + '.png';
}

var INV_WEAPON_MOD_SUFFIXES = ['+supp', '+flash', '+scope', '+grip', '+exmag'];

function invStripWeaponModSuffix(stem) {
    var s = String(stem || '').trim();
    var changed = true;
    while (changed) {
        changed = false;
        for (var i = 0; i < INV_WEAPON_MOD_SUFFIXES.length; i++) {
            var suf = INV_WEAPON_MOD_SUFFIXES[i];
            if (s.endsWith(suf)) {
                s = s.slice(0, -suf.length);
                changed = true;
            }
        }
    }
    return s;
}

function invWeaponIconBase(itemStr) {
    var stem = invItemBaseId(itemStr).split('#')[0].trim();
    if (stem.indexOf('weapon_') !== 0) return stem;
    return invStripWeaponModSuffix(stem);
}

function invItemParenNumber(itemStr) {
    var m = /\((\d+)\)\s*$/.exec(String(itemStr == null ? '' : itemStr));
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
}

function invWeaponIconSrcCandidates(base) {
    var ov = INV_WEAPON_IMG_OVERRIDES[base];
    return [
        INV_PKG_IMG + (ov || base + '.png'),
        INV_PKG_IMG + base + '.png',
        INV_PKG_MENUNEW + base + '.png'
    ];
}

function invItemBaseId(itemName) {
    var s = typeof itemName === 'string' ? itemName : '';
    s = s.replace(/^\uFEFF/, '').trim();
    return s.split('(')[0].trim();
}

function invWeaponBaseId(itemStr) {
    return invItemBaseId(itemStr).split('#')[0].trim();
}

var INV_WEAPON_TO_CALIBER = {
    weapon_pistol: '9mm',
    weapon_pistol_mk2: '9mm',
    weapon_combatpistol: '9mm',
    weapon_appistol: '9mm',
    weapon_heavypistol: '9mm',
    weapon_vintagepistol: '9mm',
    weapon_snspistol: '9mm',
    weapon_snspistol_mk2: '9mm',
    weapon_gadgetpistol: '9mm',
    weapon_revolver: '11.43mm',
    weapon_revolver_mk2: '11.43mm',
    weapon_doubleaction: '11.43mm',
    weapon_pistol50: '11.43mm',
    weapon_navyrevolver: '11.43mm',
    weapon_machinepistol: '5.56mm',
    weapon_minismg: '5.56mm',
    weapon_microsmg: '5.56mm',
    weapon_smg: '5.56mm',
    weapon_smg_mk2: '5.56mm',
    weapon_assaultsmg: '5.56mm',
    weapon_assaultrifle: '7.62mm',
    weapon_assaultrifle_mk2: '7.62mm',
    weapon_carbinerifle: '7.62mm',
    weapon_carbinerifle_mk2: '7.62mm',
    weapon_compactrifle: '7.62mm',
    weapon_gusenberg: '7.62mm',
    weapon_specialcarbine: '7.62mm',
    weapon_specialcarbine_mk2: '7.62mm',
    weapon_militaryrifle: '7.62mm',
    weapon_bullpuprifle: '7.62mm',
    weapon_bullpuprifle_mk2: '7.62mm',
    weapon_advancedrifle: '7.62mm',
    weapon_combatmg: '7.62mm',
    weapon_combatmg_mk2: '7.62mm',
    weapon_mg: '7.62mm',
    weapon_pumpshotgun: '12mm',
    weapon_pumpshotgun_mk2: '12mm',
    weapon_sawnoffshotgun: '12mm',
    weapon_dbshotgun: '12mm',
    weapon_heavyshotgun: '12mm',
    weapon_bullpupshotgun: '12mm',
    weapon_assaultshotgun: '12mm',
    weapon_combatshotgun: '12mm',
    weapon_autoshotgun: '12mm',
    weapon_sniperrifle: '.50mm',
    weapon_heavysniper: '.50mm',
    weapon_heavysniper_mk2: '.50mm',
    weapon_marksmanrifle: '.50mm',
    weapon_marksmanrifle_mk2: '.50mm',
    weapon_precisionrifle: '.50mm'
};

function invWeaponCaliberKey(base) {
    if (!base || base.indexOf('weapon_') !== 0) return '';
    return INV_WEAPON_TO_CALIBER[base] || base;
}

function invFastSlotFindConflict(itemStr, ignoreSlotIdx, alsoIgnoreSlotIdx) {
    var base = invWeaponBaseId(itemStr);
    if (!base || base.indexOf('weapon_') !== 0) return null;
    var cal = invWeaponCaliberKey(base);
    var fs = window.inventoryFastSlotsRef || [];
    var ignoreA = ignoreSlotIdx != null ? Number(ignoreSlotIdx) : -1;
    var ignoreB = alsoIgnoreSlotIdx != null ? Number(alsoIgnoreSlotIdx) : -1;
    for (var i = 0; i < fs.length; i++) {
        if (i === ignoreA || i === ignoreB) continue;
        var slot = fs[i];
        if (!slot) continue;
        var slotBase = invWeaponBaseId(slot);
        if (slotBase === base) return { type: 'same', caliber: cal };
        if (invWeaponCaliberKey(slotBase) === cal) return { type: 'caliber', caliber: cal };
    }
    return null;
}

function invFastSlotConflictMessage(conflict) {
    if (!conflict) return 'Такое оружие уже в быстром слоте.';
    if (conflict.type === 'same') return 'Это оружие уже выбрано в быстром слоте.';
    if (conflict.caliber && conflict.caliber.indexOf('weapon_') !== 0) {
        return 'Оружие калибра ' + conflict.caliber + ' уже в быстром слоте.';
    }
    return 'Такое оружие уже в быстром слоте.';
}

function invFastSlotHasWeaponBase(itemStr, ignoreSlotIdx, alsoIgnoreSlotIdx) {
    return !!invFastSlotFindConflict(itemStr, ignoreSlotIdx, alsoIgnoreSlotIdx);
}

function invRawIsInInventoryGrid(raw) {
    var grid = window.inventoryGridItemsRef || [];
    for (var i = 0; i < grid.length; i++) {
        if (grid[i] && grid[i] === raw) return true;
    }
    return false;
}

function invRawFastSlotIndex(raw) {
    var fs = window.inventoryFastSlotsRef || [];
    for (var i = 0; i < fs.length; i++) {
        if (fs[i] && fs[i] === raw) return i;
    }
    return -1;
}

function invWeaponBaseInAnyFastSlot(base) {
    if (!base || base.indexOf('weapon_') !== 0) return false;
    return !!invFastSlotFindConflict(base, -1, -1);
}

function invNotifyFastSlot(msg) {
    invBridgeTrigger('notify:client', 2, 'top-mid', msg || 'Такое оружие уже в быстром слоте.', 3000);
}

function invTryAssignFastSlot(raw, preferredSlot) {
    if (!raw || invFastSlotBlockedBaseName(raw)) return false;
    var fs = window.inventoryFastSlotsRef || [];
    var base = invWeaponBaseId(raw);
    if (base.indexOf('weapon_') !== 0) return false;

    var inInventory = invRawIsInInventoryGrid(raw);
    var sourceIdx = inInventory ? -1 : invRawFastSlotIndex(raw);
    var targetSlot = preferredSlot != null && preferredSlot !== ''
        ? parseInt(preferredSlot, 10)
        : fs.indexOf('');

    if (inInventory) {
        var addConflict = invFastSlotFindConflict(raw, -1, -1);
        if (addConflict) {
            invNotifyFastSlot(invFastSlotConflictMessage(addConflict));
            return false;
        }
        if (!Number.isFinite(targetSlot) || targetSlot < 0) {
            invNotifyFastSlot('Нет свободных быстрых слотов.');
            return false;
        }
        if (preferredSlot != null && preferredSlot !== '') {
            invBridgeTrigger('setFastSlotAt', raw, targetSlot);
        } else {
            invBridgeTrigger('setFastSlot', raw);
        }
        return true;
    }

    if (sourceIdx !== -1) {
        if (preferredSlot != null && preferredSlot !== '' && parseInt(preferredSlot, 10) === sourceIdx) {
            invNotifyFastSlot('Это оружие уже выбрано в быстром слоте.');
            return false;
        }
        if (!Number.isFinite(targetSlot) || targetSlot < 0) {
            invNotifyFastSlot('Нет свободных быстрых слотов.');
            return false;
        }
        if (targetSlot === sourceIdx) {
            invNotifyFastSlot('Это оружие уже выбрано в быстром слоте.');
            return false;
        }
        if (invFastSlotHasWeaponBase(raw, targetSlot, sourceIdx)) {
            invNotifyFastSlot(invFastSlotConflictMessage(invFastSlotFindConflict(raw, targetSlot, sourceIdx)));
            return false;
        }
        invBridgeTrigger('setFastSlotAt', raw, targetSlot);
        return true;
    }

    var tailConflict = invFastSlotFindConflict(raw, -1, -1);
    if (tailConflict) {
        invNotifyFastSlot(invFastSlotConflictMessage(tailConflict));
        return false;
    }
    if (!Number.isFinite(targetSlot) || targetSlot < 0) {
        invNotifyFastSlot('Нет свободных быстрых слотов.');
        return false;
    }
    if (preferredSlot != null && preferredSlot !== '') {
        invBridgeTrigger('setFastSlotAt', raw, targetSlot);
    } else {
        invBridgeTrigger('setFastSlot', raw);
    }
    return true;
}

function invConsumableStackQty(itemStr) {
    var m = /\((\d+)\)\s*$/.exec(String(itemStr == null ? '' : itemStr));
    if (!m) return 1;
    var n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

function invIsConsumableStackBase(baseId) {
    var b = String(baseId || '').trim();
    return b === 'item_spank' || b === 'item_alco' || b === 'item_admin_raskur' || b === 'item_spectrum_charm' || b === 'Бронежилет' || b === 'Аптечка';
}

function invShouldShowStackCount(baseId, qty) {
    var b = String(baseId || '').trim();
    if (!b || b === 'E') return false;
    if (b.indexOf('weapon_') === 0) return false;
    if (!invIsConsumableStackBase(b)) return false;
    var n = parseInt(qty, 10);
    return Number.isFinite(n) && n > 1;
}

function invFastSlotBlockedBaseName(itemStr) {
    var b = (typeof itemStr === 'string' ? itemStr : '').split('(')[0].trim();
    return b === 'item_spank' || b === 'item_alco' || b === 'item_bong' || b === 'item_admin_raskur' || b === 'item_spectrum_charm' || b === 'item_thermos' || b === 'item_drone' || b === 'item_skateboard';
}

function invTokenIsClothing(raw) {
    var base = String(raw || '').split('(')[0].trim().split('#')[0].trim();
    return (
        base.indexOf('ic1.') === 0 ||
        base.indexOf('frdef:') === 0 ||
        base.indexOf('ivhol:') === 0 ||
        base.indexOf('ivbag:') === 0
    );
}

function invBridgeTrigger(name) {
    if (typeof window.invTrigger === 'function') {
        var args = Array.prototype.slice.call(arguments);
        window.invTrigger.apply(null, args);
    } else if (typeof mp !== 'undefined' && mp && mp.trigger) {
        var a = Array.prototype.slice.call(arguments, 1);
        mp.trigger.apply(mp, a.length ? [name].concat(a) : [name]);
    }
}
function invIsBagOrHolsterToken(s) {
    if (typeof s !== 'string') return false;
    var b = invItemBaseId(s);
    return b.indexOf('ivbag:') === 0 || b.indexOf('ivhol:') === 0;
}

function invCanUnequipBag(snap) {
    if (!snap || snap.usedSlots == null || snap.maxSlots == null) return true;
    return snap.usedSlots < snap.maxSlots;
}

function invEquipTopHasDonateToggle(snap) {
    if (!snap || !snap.slots || !snap.slots.top || !snap.slots.top.filled) return false;
    if (snap.slots.top.canToggleTop === true) return true;
    var raw = snap.slots.top.raw;
    if (!raw || typeof raw !== 'string') return false;
    var p = raw.split(':');
    var d = parseInt(p[0], 10);
    if (!isFinite(d)) return false;
    return d === 657 || d === 658 || d === 637 || d === 636 || d === 661 || d === 662 || d === 638 || d === 621;
}

function invCalcUsedSlots(items) {
    var n = 0;
    for (var i = 0; i < items.length; i++) {
        if (items[i] && items[i].id !== 'E') n++;
    }
    return n;
}

function invPerformItemUse(comp, closeAfter) {
    if (!comp || !comp.data || comp.data.id === 'E') return;
    var raw = comp.data.raw || comp.data.id;
    var base = invItemBaseId(raw);
    if (comp.type === 'weapon') {
        invBridgeTrigger('removeFastSlot' + (comp.weaponslot + 1), raw);
        if (closeAfter && window.invApp) window.invApp.closeInv();
        return;
    }
    if (comp.type === 'clothes') {
        var eqKey = INV_CLOTHES_SLOT_TO_EQ[String(comp.clothesslot)];
        if (eqKey === 'bag' && !invCanUnequipBag(window.lastEquipSnap)) {
            invBridgeTrigger('notify:client', 2, 'bottom-mid', 'Освободите слот в инвентаре, чтобы снять сумку.', 3500);
            return;
        }
        if (eqKey === 'armor') {
            invBridgeTrigger('inventoryUnequipSlot', 'armor');
        } else if (eqKey) {
            invBridgeTrigger('inventoryUnequipSlot', eqKey);
        }
    } else if (invIsEquipableClothToken(raw)) {
        invBridgeTrigger('inventoryEquipItem', raw);
    } else if (base === 'item_change_name') {
        if (typeof window.openChangeNameModal === 'function') window.openChangeNameModal({ closeAfter: !!closeAfter });
        else invBridgeTrigger('changeNameItem:openPrompt');
        return;
    } else if (base.indexOf('agift:') === 0 || base === 'Бронежилет' || base.split('#')[0].trim() === 'Бронежилет') {
        invBridgeTrigger('useConsumable', raw);
    } else if (base.indexOf('weapon_') === 0) {
        invTryAssignFastSlot(raw);
    } else {
        invBridgeTrigger('useConsumable', base);
    }
    if (closeAfter && window.invApp) window.invApp.closeInv();
}

window.resetInventoryEscState = function () {
    if (window._invBindWaitingSlot != null && window._invBindWaitingSlot !== '') {
        invCancelSlotBind(false);
    }
    if (window.invClearAllItemSelections) window.invClearAllItemSelections();
    if (window.invApp) {
        window.invApp.startSelectedItem = null;
        window.invApp.selectedItem = null;
        window.invApp.dropItem = null;
        window.invApp.replaceItem.start = false;
    }
};

function invClearAllItemSelections() {
    if (!window.invApp || !window.invApp.data) return;
    ['items', 'bagItems', 'weapons'].forEach(function (key) {
        var arr = window.invApp.data[key];
        if (!Array.isArray(arr)) return;
        arr.forEach(function (it) {
            if (it && it.vueComponent) it.vueComponent.selected = false;
        });
    });
    var clothes = window.invApp.data.clothes;
    if (clothes && typeof clothes === 'object') {
        Object.keys(clothes).forEach(function (k) {
            var c = clothes[k];
            if (c && c.vueComponent) c.vueComponent.selected = false;
        });
    }
}
window.invClearAllItemSelections = invClearAllItemSelections;
function invIsEquipableClothToken(s) {
    if (typeof s !== 'string') return false;
    var b = invItemBaseId(s);
    if (b.indexOf('frdef:') === 0) return true;
    return b.indexOf('ic1.') === 0 || b.indexOf('ivhol:') === 0 || b.indexOf('ivbag:') === 0;
}

function invIsDefaultRevolverToken(s) {
    if (typeof s !== 'string') return false;
    return invItemBaseId(s) === 'weapon_revolver';
}
window.invIsDefaultRevolverToken = invIsDefaultRevolverToken;

var F3_HOLSTER = {
    cobura: { title: 'Чёрная Кобура', file: 'clothes/cobura.png' },
    coburaw: { title: 'Белая Кобура', file: 'clothes/coburaw.png' }
};

var F3_BAG = {
    bag_antisocial: { title: 'Antisocial', file: 'bags/antisocial.png' },
    bag_anime: { title: 'Anime', file: 'bags/anime.png' },
    bag_grob: { title: 'Гроб', file: 'bags/grob.png' },
    bag_big_black: { title: 'Большой рюкзак черный', file: 'bags/big_black.png' },
    bag_big_white: { title: 'Большой рюкзак белый', file: 'bags/big_white.png' },
    bag_waist: { title: 'Сумка поясная', file: 'bags/waist.png' }
};

var INV_PKG_MENUNEW = INV_PKG_MENUNEW || 'package://browsers/menunew/img/';
var INV_PKG_IMG = INV_PKG_IMG || 'package://browsers/inventory/img/';
var INV_FALLBACK_WEAPON = INV_FALLBACK_WEAPON || (INV_PKG_MENUNEW + 'cartridge.svg');

var INV_WEAPON_IMG_OVERRIDES = {
    weapon_heavysniper: 'svc.png'
};

var INV_CATALOG = [
    { name: 'item_spank', img: 'item_spank.png' },
    { name: 'item_alco', img: 'package://browsers/hud/images/med.png' },
    { name: 'item_bong', img: 'bong.png' },
    { name: 'item_admin_raskur', img: 'gta5rp_cigarette_inventory.png' },
    { name: 'item_spectrum_charm', img: 'package://browsers/inventory/img/body.svg' },
    { name: 'item_thermos', img: 'item_thermos.png' },
    { name: 'item_drone', img: 'drone.png' },
    { name: 'item_skateboard', img: 'skateborde.png' },
    { name: 'item_change_name', img: 'materials.png' },
    { name: 'item_materials', img: 'materials.png' },
    { name: 'Бронежилет', img: 'armor.png' },
    { name: 'Аптечка', img: 'heal.png' },
    { name: 'weapon_revolver', img: 'weapon_revolver.png' },
    { name: 'weapon_revolver_mk2', img: 'weapon_revolver_mk2.png' },
    { name: 'weapon_assaultrifle', img: 'weapon_assaultrifle.png' },
    { name: 'weapon_heavyshotgun', img: 'weapon_heavyshotgun.png' },
    { name: 'weapon_assaultshotgun', img: 'weapon_assaultshotgun.png' },
    { name: 'weapon_carbinerifle', img: 'weapon_carbinerifle.png' },
    { name: 'weapon_sniperrifle', img: 'weapon_sniperrifle.png' },
    { name: 'weapon_heavysniper', img: 'svc.png' },
    { name: 'weapon_heavysniper_mk2', img: 'weapon_heavysniper_mk2.png' },
    { name: 'weapon_marksmanrifle', img: 'weapon_marksmanrifle.png' },
    { name: 'weapon_precisionrifle', img: 'weapon_precisionrifle.png' },
    { name: 'weapon_specialcarbine', img: 'weapon_specialcarbine.png' },
    { name: 'weapon_combatmg', img: 'weapon_combatmg.png' },
    { name: 'weapon_navyrevolver', img: 'weapon_navyrevolver.png' },
    { name: 'weapon_combatmg_mk2', img: 'weapon_combatmg_mk2.png' },
    { name: 'weapon_minismg', img: 'weapon_minismg.png' },
    { name: 'weapon_musket', img: 'weapon_musket.png' },
    { name: 'weapon_militaryrifle', img: 'weapon_militaryrifle.png' },
    { name: 'weapon_gadgetpistol', img: 'weapon_gadgetpistol.png' },
    { name: 'weapon_gusenberg', img: 'weapon_gusenberg.png' }
];

var WEAPON_NAMES = {
    item_spank: 'Спанк',
    item_alco: 'Медовуха',
    item_bong: 'Трубка Bong',
    item_admin_raskur: 'Админский Раскур',
    item_spectrum_charm: 'Брелок Ladydy',
    item_thermos: 'Термокружка',
    item_drone: 'Дрон',
    item_skateboard: 'Скейтборд',
    item_change_name: 'Смена ника',
    Бронежилет: 'Бронежилет',
    Аптечка: 'Аптечка',
    weapon_heavyshotgun: 'Heavy Shotgun',
    weapon_assaultshotgun: 'Assault Shotgun',
    weapon_carbinerifle: 'Carbine Rifle',
    weapon_assaultrifle: 'Assault Rifle',
    weapon_combatmg: 'Combat MG',
    weapon_combatmg_mk2: 'Combat MG MKII',
    weapon_specialcarbine: 'Special Carbine',
    weapon_revolver: 'Revolver',
    weapon_revolver_mk2: 'Revolver MKII',
    weapon_navyrevolver: 'Navy Revolver',
    weapon_minismg: 'Mini SMG',
    weapon_musket: 'Musket',
    weapon_militaryrifle: 'Military Rifle',
    weapon_sniperrifle: 'Sniper Rifle',
    weapon_heavysniper: 'Heavy Sniper',
    weapon_heavysniper_mk2: 'Heavy Sniper MKII',
    weapon_marksmanrifle: 'Marksman Rifle',
    weapon_precisionrifle: 'Precision Rifle',
    weapon_gadgetpistol: 'Gadget Pistol',
    weapon_gusenberg: 'Gusenberg'
};

function invNormalizeClothDisplayName(full) {
    if (full == null || typeof full !== 'string') return 'Одежда';
    var s = full.replace(/\s*\(\d+\s*слотов\)/gi, '').trim();
    s = s.replace(/\s*[·•\-]\s*(?:текст|text)\.\d+\s*$/i, '').trim();
    s = s.replace(/\s*[·•]\s*\d+\s*$/, '').trim();
    s = s.replace(/\s+вар\.\s*\d+\s*$/i, '').trim();
    var i = s.indexOf(' · текст.');
    if (i === -1) i = s.indexOf(' · text.');
    if (i === -1) i = s.indexOf(' · т.');
    if (i !== -1) s = s.slice(0, i).trim();
    s = s.replace(/\s*\(\s*(?:Ballas|Families|Bloods|Vagos|Marabunta|FIB)\s*\)\s*$/i, '').trim();
    s = s.replace(/^Кроссовки\s+(\d+)(?:\s+(.*))?$/i, function (_all, _num, rest) {
        return rest && String(rest).trim() ? ('Кроссовки ' + String(rest).trim()) : 'Кроссовки';
    });
    if (/^Обувь(?:\s|$)/i.test(s)) s = s.replace(/^Обувь/i, 'Кроссовки');
    return s || 'Одежда';
}

function invShortItemNameFromCatalog(full) {
    return invNormalizeClothDisplayName(full);
}

function getImageForItem(itemName) {
    var raw = typeof itemName === 'string' ? itemName : '';
    raw = raw.replace(/^\uFEFF/, '').trim();
    if (raw.indexOf('ic1.') === 0) {
        var ic1s = invItemBaseId(raw);
        var po = decodeIc1Payload(ic1s);
        if (invIsPatrontazhPayload(po)) {
            return 'INVPIC|' + invPatrontazhColorFile(po.t);
        }
        var localPhoto = po ? invClothLocalPhotoOverride(po.cid, po.d, po.t) : null;
        if (localPhoto) return 'INVPIC|' + localPhoto;
        if (po && po.img) return 'CLOTHIMG|' + String(po.img);
        var calam = po ? invCalclothTokenFromIc1Payload(po) : null;
        if (calam) return calam;
        var cidFallback = po && po.cid != null ? Number(po.cid) : NaN;
        var fn = !Number.isNaN(cidFallback) ? invResolveClothIconUrl(cidFallback) : invResolveClothIconUrl(3);
        return 'INVPIC|' + fn;
    }
    var s = invItemBaseId(raw);
    if (s.indexOf('agift:') === 0) return 'INVPIC|armor_gift.svg';
    if (s.indexOf('ivhol:') === 0) {
        var hk = s.slice(6);
        if (F3_HOLSTER[hk]) return 'F3IMG|' + F3_HOLSTER[hk].file;
    }
    if (s.indexOf('ivbag:') === 0) {
        var bkk = s.slice(6);
        if (F3_BAG[bkk]) return 'F3IMG|' + F3_BAG[bkk].file;
        return 'F3IMG|bags/antisocial.png';
    }
    if (s.indexOf('frdef:') === 0) {
        var frp = s.split(':');
        if (frp[1] === 'top') return 'INVPIC|' + invResolveClothIconUrl(3);
        if (frp[1] === 'bottom') return 'INVPIC|' + invResolveClothIconUrl(4);
        if (frp[1] === 'shoes') return 'INVPIC|' + invResolveClothIconUrl(5);
        return 'INVPIC|' + invResolveClothIconUrl(3);
    }
    var base = invWeaponIconBase(s);
    var item = INV_CATALOG.find(function (data) { return data.name === base; });
    if (item) return 'INVPIC|' + item.img;
    if (base.indexOf('weapon_') === 0) {
        var ov = INV_WEAPON_IMG_OVERRIDES[base];
        return 'INVPIC|' + (ov || base + '.png');
    }
    return 'INVPIC|default.png';
}

function resolveInventoryImgSrc(imgFile) {
    if (imgFile.indexOf('CALCLOTHPNG|') === 0) {
        var qc = imgFile.split('|');
        var cidNum = Number(qc[1]);
        var drw = Number(qc[2]);
        var trx = Number(qc[3]);
        var localOv = invClothLocalPhotoOverride(cidNum, drw, trx);
        if (localOv) return localOv;
        var url = invCalclothPngUrl(cidNum, drw, trx, invClothGenderDir());
        if (url) return url;
        return invResolveClothIconUrl(cidNum);
    }
    if (imgFile.indexOf('CLOTHIMG|') === 0) {
        var rel = imgFile.slice(9);
        return invResolveClothPhotoRel(rel) || invResolveClothIconUrl(3);
    }
    if (imgFile.indexOf('F3IMG|') === 0) return INV_PKG_MENUNEW + imgFile.slice(6);
    if (imgFile.indexOf('INVPIC|') === 0) {
        var invFn = imgFile.slice(7);
        if (invFn.indexOf('package://') === 0) return invFn;
        if (invFn === 'default.png') return INV_FALLBACK_WEAPON;
        if (invFn === 'cobura.png' || invFn === 'coburaw.png' || invFn === 'coburas.png' || invFn === 'amongys.png') {
            return INV_PKG_MENUNEW + 'clothes/' + invFn;
        }
        return INV_PKG_IMG + invFn;
    }
    if (imgFile === 'INVICONGEN|weapon') return INV_FALLBACK_WEAPON;
    if (imgFile === 'default.png') return INV_FALLBACK_WEAPON;
    return INV_PKG_IMG + imgFile;
}

function getNameForItem(itemName) {
    var raw = typeof itemName === 'string' ? itemName : '';
    raw = raw.replace(/^\uFEFF/, '').trim();
    if (raw.indexOf('ic1.') === 0) {
        var ic = decodeIc1Payload(invItemBaseId(raw));
        if (ic && ic.nm) return invShortItemNameFromCatalog(ic.nm);
        return 'Одежда';
    }
    var s = invItemBaseId(raw);
    if (s.indexOf('agift:') === 0) {
        var giftKey = s.slice(6);
        var giftName = 'Подарок: скин бронежилета';
        if (typeof ARMOR_SHOP_VARIANTS !== 'undefined' && ARMOR_SHOP_VARIANTS.length) {
            for (var gi = 0; gi < ARMOR_SHOP_VARIANTS.length; gi++) {
                var gv = ARMOR_SHOP_VARIANTS[gi];
                if (gv.d + ':' + gv.t === giftKey) {
                    giftName = 'Подарок: ' + gv.name;
                    break;
                }
            }
        }
        return giftName;
    }
    if (s.split('#')[0].trim() === 'Бронежилет') {
        var am = s.match(/#(\d+)/);
        if (am) {
            var ap = parseInt(am[1], 10);
            if (Number.isFinite(ap) && ap < 100) return 'Бронежилет ' + ap + '%';
        }
        return 'Бронежилет';
    }
    if (s.indexOf('ivhol:') === 0) {
        var hkk = s.slice(6);
        if (F3_HOLSTER[hkk]) return F3_HOLSTER[hkk].title;
    }
    if (s.indexOf('ivbag:') === 0) {
        var bkk = s.slice(6);
        if (F3_BAG[bkk]) return F3_BAG[bkk].title;
        return 'Сумка';
    }
    if (s.indexOf('frdef:') === 0) {
        var fp = s.split(':');
        if (fp.length >= 3) {
            if (fp[1] === 'top') return 'Верх';
            if (fp[1] === 'bottom') return 'Штаны';
            if (fp[1] === 'shoes') return 'Кроссовки';
        }
        return 'Одежда';
    }
    var base = invWeaponIconBase(s);
    var finalName = WEAPON_NAMES[base] || (base.startsWith('weapon_') ? humanizeWeaponIdClient(base) : base);
    finalName = finalName.replace('item_', '').replace('iten_', '');
    return finalName;
}

function invItemWeightBase(base) {
    if (base === 'Бронежилет') return 2.9;
    if (base === 'Аптечка') return 0.5;
    if (base === 'item_spank' || base === 'item_alco') return 0.1;
    if (base.indexOf('weapon_') === 0) return 3.0;
    return 0.5;
}

function invResolveItemIconUrl(data) {
    if (!data || data.id === 'E') return '';
    if (data.icoFull && (data.icoFull.indexOf('package:') === 0 || data.icoFull.indexOf('http') === 0)) return data.icoFull;
    if (data.logicalImg) return resolveInventoryImgSrc(String(data.logicalImg));
    if (data.placeholderIco) return data.placeholderIco;
    if (data.cidFallback != null && Number.isFinite(Number(data.cidFallback))) {
        return invResolveClothIconUrl(Number(data.cidFallback));
    }
    if (data.ico && (data.ico.indexOf('package:') === 0 || data.ico.indexOf('../') === 0 || data.ico.indexOf('http') === 0)) {
        return data.ico;
    }
    if (data.ico && data.ico.indexOf('UI/Inventory/Items/') !== 0 && data.ico !== 'E') return INV_PKG_IMG + data.ico;
    return INV_FALLBACK_WEAPON;
}

function invResolveDragIconUrl(data, compType, clothesslot) {
    if (!data || data.id === 'E') return '';
    if (data._dragIco) return data._dragIco;
    var logical = data.logicalImg != null ? String(data.logicalImg) : '';
    if (logical.indexOf('CALCLOTHPNG|') === 0 && data.cidFallback != null && Number.isFinite(Number(data.cidFallback))) {
        return invResolveClothIconUrl(Number(data.cidFallback));
    }
    if (compType === 'clothes') {
        var cid = data.cidFallback;
        if (cid == null && clothesslot != null && INV_CLOTH_SLOT_CID[String(clothesslot)] != null) {
            cid = INV_CLOTH_SLOT_CID[String(clothesslot)];
        }
        if (cid != null && Number.isFinite(Number(cid))) return invResolveClothIconUrl(Number(cid));
    }
    if (data.raw && String(data.raw).indexOf('ic1.') === 0 && data.cidFallback != null && Number.isFinite(Number(data.cidFallback))) {
        return invResolveClothIconUrl(Number(data.cidFallback));
    }
    if (logical) return resolveInventoryImgSrc(logical);
    return invResolveItemIconUrl(data);
}
window.invResolveDragIconUrl = invResolveDragIconUrl;

window.invOnItemImgError = function (imgEl, data) {
    if (!imgEl) return;
    var step = parseInt(imgEl.dataset.invFallbackStep || '0', 10) || 0;
    if (step >= 5) {
        imgEl.style.visibility = 'hidden';
        return;
    }
    imgEl.dataset.invFallbackStep = String(step + 1);
    var logical = data && data.logicalImg;

    // 1) CLOTHIMG / CALCLOTHPNG: альтернативы фото, потом категория
    if (logical && logical.indexOf('CLOTHIMG|') === 0) {
        var cand = data && data.photoCandidates;
        if (cand && cand.length) {
            var tryIdx = parseInt(imgEl.dataset.invClothTry || '0', 10) || 0;
            if (tryIdx < cand.length) {
                imgEl.dataset.invClothTry = String(tryIdx + 1);
                imgEl.src = cand[tryIdx];
                return;
            }
        }
        if (step <= 2 && data && data.cidFallback != null) {
            imgEl.src = invResolveClothIconUrl(data.cidFallback);
            return;
        }
    }
    if (logical && logical.indexOf('CALCLOTHPNG|') === 0) {
        var parts = logical.split('|');
        var cid = Number(parts[1]);
        var drw = Number(parts[2]);
        var trx = Number(parts[3]);
        if (step === 0) {
            var localCal = invClothLocalPhotoOverride(cid, drw, trx);
            if (localCal) {
                imgEl.src = localCal;
                return;
            }
            var alt = invCalclothPngUrl(cid, drw, trx, invClothGenderAltDir());
            if (alt) {
                imgEl.src = alt;
                return;
            }
        }
        if (step <= 1) {
            imgEl.src = invResolveClothIconUrl(cid);
            return;
        }
    }

    if (step <= 3 && data && data.raw) {
        var base = invWeaponIconBase(data.raw);
        if (base.indexOf('weapon_') === 0) {
            var tryIdx = parseInt(imgEl.dataset.invWeaponTry || '0', 10) || 0;
            var candidates = invWeaponIconSrcCandidates(base);
            if (tryIdx < candidates.length) {
                imgEl.dataset.invWeaponTry = String(tryIdx + 1);
                imgEl.src = candidates[tryIdx];
                return;
            }
        }
    }
    if (step <= 4 && data && data.cidFallback != null) {
        imgEl.src = invResolveClothIconUrl(data.cidFallback);
        return;
    }
    imgEl.src = INV_FALLBACK_WEAPON;
};

window.invResolveItemIconUrl = invResolveItemIconUrl;

var INV_CLOTHES_SLOT_TO_EQ = {
    0: 'headwear', 1: 'mask', 11: 'top', 9: 'armor', 8: 'bag', 4: 'pants', 6: 'shoes',
    7: 'holster', '-1': 'glasses', '-6': 'watch', 12: 'gloves', '-2': 'ears', '-7': 'bracelet',
    10: 'decals'
};

window.invClothSlotToEqKey = function (clothesslot) {
    return INV_CLOTHES_SLOT_TO_EQ[String(clothesslot)] || null;
};

var VUE_CLOTHES_MAP = [
    { vue: 'hat', eq: 'headwear', slot: 0 },
    { vue: 'mask', eq: 'mask', slot: 1 },
    { vue: 'top', eq: 'top', slot: 11 },
    { vue: 'armor', eq: 'armor', slot: 9 },
    { vue: 'under', eq: 'bag', slot: 8 },
    { vue: 'legs', eq: 'pants', slot: 4 },
    { vue: 'foot', eq: 'shoes', slot: 6 },
    { vue: 'accessories', eq: 'holster', slot: 7 },
    { vue: 'glasses', eq: 'glasses', slot: -1 },
    { vue: 'watch', eq: 'watch', slot: -6 },
    { vue: 'gloves', eq: 'gloves', slot: 12 },
    { vue: 'ears', eq: 'ears', slot: -2 },
    { vue: 'bracelets', eq: 'bracelet', slot: -7 },
    { vue: 'decals', eq: 'decals', slot: 10 }
];

function invEquipSlotIcon(eqKey, slotData) {
    if (!slotData || !slotData.filled) return null;
    if (eqKey === 'armor') {
        if (slotData.equipToken) return resolveInventoryImgSrc(getImageForItem(slotData.equipToken));
        return INV_PKG_IMG + 'armor.png';
    }
    if (eqKey === 'holster' && slotData.holsterIcon) {
        var hm = { cobura: 'cobura.png', coburaw: 'coburaw.png' };
        if (hm[slotData.holsterIcon]) return INV_PKG_MENUNEW + 'clothes/' + hm[slotData.holsterIcon];
    }
    if (slotData.equipToken) return resolveInventoryImgSrc(getImageForItem(slotData.equipToken));
    if (slotData.accessoryCalamity && slotData.accessoryCalamity.length >= 3) {
        var ac = slotData.accessoryCalamity;
        return resolveInventoryImgSrc('CALCLOTHPNG|' + Number(ac[0]) + '|' + Number(ac[1]) + '|' + Number(ac[2]));
    }
    return invResolveClothIconUrl(({ headwear: 1, mask: 2, ears: 12, glasses: 7, bracelet: 14, top: 3, watch: 13, bag: 8, pants: 4, holster: 6, gloves: 15, shoes: 5, armor: 9, decals: 6 })[eqKey] || 3);
}

function invGridItemToVue(raw, slotIdx) {
    if (!raw) return emptySlot();
    var base = invItemBaseId(raw);
    var qty = 1;
    if (invIsConsumableStackBase(base)) {
        qty = invConsumableStackQty(raw);
    } else if (base.indexOf('weapon_') !== 0 && invItemParenNumber(raw) != null) {
        qty = invConsumableStackQty(raw);
    }
    var logical = getImageForItem(raw);
    var icoFull = resolveInventoryImgSrc(logical);
    var cidFallback = null;
    var photoCandidates = null;
    if (base.indexOf('ic1.') === 0) {
        var po = decodeIc1Payload(base);
        if (po && po.cid != null) cidFallback = Number(po.cid);
        photoCandidates = invBuildClothPhotoCandidates(po);
        var localImm = po ? invClothLocalPhotoOverride(po.cid, po.d, po.t) : null;
        // В CEF отсутствующий package:// часто не даёт onerror → сразу безопасная иконка,
        // а реальное фото подставится через probe (photoCandidates) в Vue.
        icoFull = localImm || (cidFallback != null ? invResolveClothIconUrl(cidFallback) : icoFull);
    }
    return {
        id: base,
        name: getNameForItem(raw) || base,
        ico: icoFull,
        icoFull: icoFull,
        logicalImg: logical,
        cidFallback: cidFallback,
        photoCandidates: photoCandidates,
        preferredPhoto: photoCandidates && photoCandidates.length ? photoCandidates[0] : null,
        raw: raw,
        count: qty,
        showStackCount: invShouldShowStackCount(base, qty),
        weight: 0,
        trade: true,
        needGetSpecialActionList: false,
        startLoadSpecialAction: false,
        specialActionList: [],
        slot: slotIdx
    };
}

var INV_CLOTH_SLOT_CID = {
    0: 1, 1: 2, 11: 3, 9: 9, 8: 8, 4: 4, 6: 5, 7: 6,
    '-1': 7, '-6': 13, 12: 15, '-2': 12, '-7': 14, 10: 6
};

function invEmptyClothesForSlot(slot) {
    var cid = INV_CLOTH_SLOT_CID[String(slot)] || 3;
    var ico = invResolveClothIconUrl(cid);
    return {
        id: 'E',
        name: '',
        ico: ico,
        icoFull: ico,
        placeholderIco: ico,
        cidFallback: cid,
        count: 0,
        weight: 0,
        slot: slot
    };
}
window.invEmptyClothesForSlot = invEmptyClothesForSlot;

function invBuildClothesFromSnap(snap) {
    var clothes = {};
    var slots = snap && snap.slots ? snap.slots : {};
    VUE_CLOTHES_MAP.forEach(function (m) {
        if (!m.eq) {
            clothes[m.vue] = invEmptyClothesForSlot(m.slot);
            return;
        }
        var sd = slots[m.eq];
        if (!sd || !sd.filled) {
            clothes[m.vue] = invEmptyClothesForSlot(m.slot);
            return;
        }
        var token = sd.equipToken || '';
        var eqCid = ({ headwear: 1, mask: 2, ears: 12, glasses: 7, bracelet: 14, top: 3, watch: 13, bag: 8, pants: 4, holster: 6, gloves: 15, shoes: 5, armor: 9, decals: 6 })[m.eq] || 3;
        var logical = token ? getImageForItem(token) : ('INVPIC|' + invResolveClothIconUrl(eqCid));
        var icoFull = invEquipSlotIcon(m.eq, sd) || invResolveClothIconUrl(eqCid);
        var photoCandidates = null;
        var poEq = null;
        if (token && String(token).indexOf('ic1.') === 0) {
            poEq = decodeIc1Payload(invItemBaseId(token));
            photoCandidates = invBuildClothPhotoCandidates(poEq);
            var localEq = poEq ? invClothLocalPhotoOverride(poEq.cid, poEq.d, poEq.t) : null;
            if (localEq) icoFull = localEq;
            else if (photoCandidates && photoCandidates.length && (!icoFull || icoFull.indexOf('shopclothesnew') !== -1 || icoFull.indexOf('icon_') !== -1)) {
                // оставляем категорийную иконку — Vue поднимет фото если файл есть
            }
        } else if (sd.accessoryCalamity && sd.accessoryCalamity.length >= 3) {
            var ac = sd.accessoryCalamity;
            poEq = { cid: Number(ac[0]), d: Number(ac[1]), t: Number(ac[2]) };
            photoCandidates = invBuildClothPhotoCandidates(poEq);
            var localAc = invClothLocalPhotoOverride(poEq.cid, poEq.d, poEq.t);
            if (localAc) icoFull = localAc;
        }
        clothes[m.vue] = {
            id: token || ('eq_' + m.eq),
            readOnly:sd.readOnly===true,
            name: sd.name ? invNormalizeClothDisplayName(sd.name) : '',
            ico: icoFull,
            icoFull: icoFull,
            logicalImg: logical,
            cidFallback: eqCid,
            photoCandidates: photoCandidates,
            preferredPhoto: photoCandidates && photoCandidates.length ? photoCandidates[0] : null,
            raw: token,
            eqKey: m.eq,
            canToggleTop: sd.canToggleTop === true,
            canToggleBag: sd.canToggleBag === true,
            canToggleMask: sd.canToggleMask === true,
            canToggleHat: sd.canToggleHat === true,
            count: 1,
            weight: 0,
            slot: m.slot
        };
    });
    return clothes;
}

function invBuildWeapons(fastSlots) {
    var out = [emptyWeapon(), emptyWeapon(), emptyWeapon()];
    for (var i = 0; i < 3; i++) {
        var it = fastSlots[i];
        if (!it) continue;
        var logical = getImageForItem(it);
        var icoFull = resolveInventoryImgSrc(logical);
        out[i] = {
            id: invItemBaseId(it),
            name: getNameForItem(it) || it,
            ico: icoFull,
            icoFull: icoFull,
            logicalImg: logical,
            raw: it,
            count: 1,
            weight: 0,
            serial: '',
            ammo: 0
        };
    }
    return out;
}

function invCalcGridWeight(items) {
    var w = 0;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it && it.id !== 'E') w += (it.weight || 0) * (it.count || 1);
    }
    return w;
}

function whDepositPayload(item, qty) {
    var payload = JSON.stringify({ item: item, q: qty });
    if (window.inventoryWarehouseKind === 'fraction') invBridgeTrigger('fractionWarehouseDeposit', payload);
    else invBridgeTrigger('familyWarehouseDeposit', payload);
}
function whWithdrawPayload(item, qty) {
    var payload = JSON.stringify({ item: item, q: qty });
    if (window.inventoryWarehouseKind === 'fraction') invBridgeTrigger('fractionWarehouseWithdraw', payload);
    else invBridgeTrigger('familyWarehouseWithdraw', payload);
}
function whDepositFromItem(raw, count) {
    if (!raw) return;
    var base = invItemBaseId(raw);
    if (base === 'item_spank' || base === 'item_alco') whDepositPayload(raw, count || invConsumableStackQty(raw));
    else whDepositPayload(raw, 1);
}
function whWithdrawFromItem(raw, count) {
    if (!raw) return;
    var base = invItemBaseId(raw);
    if (base === 'item_spank' || base === 'item_alco') whWithdrawPayload(raw, count || invConsumableStackQty(raw));
    else whWithdrawPayload(raw, 1);
}
window.whDepositFromItem = whDepositFromItem;
window.whWithdrawFromItem = whWithdrawFromItem;

function updateInventoryUI(inventory, fastSlots, arg3, arg4) {
    if (typeof window.openInventory !== 'function' || !window.invApp) return;

    var warehouseMode = false;
    var warehouseItems = [];
    var equipSnap = null;
    if (arg3 !== undefined && arg3 !== null && arg3 !== '') {
        var p3 = arg3;
        if (typeof arg3 === 'string') {
            try { p3 = JSON.parse(arg3); } catch (e0) { p3 = null; }
        }
        if (Array.isArray(p3)) {
            warehouseMode = true;
            warehouseItems = p3;
            if (arg4 !== undefined && arg4 !== null && arg4 !== '') {
                try { equipSnap = typeof arg4 === 'string' ? JSON.parse(arg4) : arg4; } catch (e1) { equipSnap = null; }
            }
        } else if (p3 && typeof p3 === 'object' && Array.isArray(p3.items)) {
            warehouseMode = true;
            warehouseItems = p3.items;
            if (arg4 !== undefined && arg4 !== null && arg4 !== '') {
                try { equipSnap = typeof arg4 === 'string' ? JSON.parse(arg4) : arg4; } catch (e1b) { equipSnap = null; }
            }
        } else if (p3 && typeof p3 === 'object' && p3.maxSlots != null) {
            equipSnap = p3;
        }
    }

    if (typeof inventory === 'string') {
        try { inventory = JSON.parse(inventory || '[]'); } catch (e) { inventory = []; }
    } else if (!Array.isArray(inventory)) {
        inventory = [];
    }
    if (typeof fastSlots === 'string') {
        try { fastSlots = JSON.parse(fastSlots || '["", "", ""]'); } catch (e) { fastSlots = ['', '', '']; }
    } else if (!Array.isArray(fastSlots)) {
        fastSlots = ['', '', ''];
    }

    window.inventoryWarehouseMode = warehouseMode;
    window.inventoryFastSlotsRef = fastSlots;
    window.inventoryGridItemsRef = inventory.slice();
    if (!warehouseMode) window.inventoryWarehouseKind = window.inventoryWarehouseKind || 'family';
    window.lastEquipSnap = equipSnap || window.lastEquipSnap || null;
    equipSnap = window.lastEquipSnap;

    var gridSize = Math.max(INV_GRID_SIZE, inventory.length, Number(equipSnap && equipSnap.maxSlots) || 0);
    var items = [];
    for (var gi = 0; gi < gridSize; gi++) {
        var cell = inventory[gi];
        items.push(cell ? invGridItemToVue(cell, gi) : emptySlot());
    }

    var usedSlots = equipSnap && equipSnap.usedSlots != null ? Number(equipSnap.usedSlots) : invCalcUsedSlots(items);
    var maxSlots = equipSnap && equipSnap.maxSlots != null ? Number(equipSnap.maxSlots) : gridSize;

    var bagItems = [];
    var bagName = '';
    var canToggleBag = false;
    if (warehouseMode) {
        bagName = window.inventoryWarehouseKind === 'fraction' ? 'Склад фракции' : 'Склад семьи';
        for (var wi = 0; wi < warehouseItems.length; wi++) {
            var wRaw = warehouseItems[wi];
            if (wRaw) bagItems.push(invGridItemToVue(wRaw, wi));
        }
    } else {
        var bagPanel = equipSnap && equipSnap.bagPanel ? equipSnap.bagPanel : null;
        if (bagPanel && bagPanel.capacity > 0) {
            var shortBag = invShortItemNameFromCatalog(bagPanel.title || 'Сумка');
            bagName = shortBag + ' (' + bagPanel.capacity + ' слотов)';
            canToggleBag = !!(
                equipSnap &&
                equipSnap.slots &&
                equipSnap.slots.bag &&
                equipSnap.slots.bag.canToggleBag === true
            );
            var bagSlots = bagPanel.slots || [];
            for (var bi = 0; bi < bagPanel.capacity; bi++) {
                bagItems.push(bagSlots[bi] ? invGridItemToVue(bagSlots[bi], bi) : emptySlot());
            }
        }
    }

    var slotBinds = equipSnap && equipSnap.slotBinds && typeof equipSnap.slotBinds === 'object' ? equipSnap.slotBinds : {};
    var binderSlotData = [];
    Object.keys(slotBinds).forEach(function (k) {
        var ent = slotBinds[k];
        binderSlotData[Number(k)] = {
            keyName: invNormalizeBindLabel(ent && ent.label ? ent.label : '-')
        };
    });

    var payload = {
        type: 'playerInventory',
        weight: 0,
        maxWeight: 0,
        usedSlots: usedSlots,
        maxSlots: maxSlots,
        bagWeight: 0,
        bagMaxWeight: 0,
        bagName: bagName,
        canToggleBag: canToggleBag,
        bagItems: bagItems,
        currentMaskId: 0,
        player: { mood: 0, satiety: 0 },
        weapons: invBuildWeapons(fastSlots),
        bandolier: Array.from({length:6},function(_,i){var raw=equipSnap&&equipSnap.bandolier&&equipSnap.bandolier[i];return raw?invGridItemToVue(raw,i):emptySlot();}),
        items: items,
        clothes: invBuildClothesFromSnap(equipSnap)
    };

    window.openInventory(payload);
    if (window.invApp) window.invApp.binderSlotData = binderSlotData;
}

window.updateInventoryUI = updateInventoryUI;

/* ── slot key binds ── */
var invBindListenAttached = false;

function invNormalizeBindLabel(label) {
    if (label === 'Mouse4') return 'M4';
    if (label === 'Mouse5') return 'M5';
    return label;
}

function invBindLabelFromVk(vk) {
    var n = Number(vk);
    if (!Number.isFinite(n)) return 'Key';
    if (n === 0x01) return 'ЛКМ';
    if (n === 0x02) return 'ПКМ';
    if (n === 0x04) return 'СКМ';
    if (n === 0x05) return 'M4';
    if (n === 0x06) return 'M5';
    if (n === 0x20) return 'Space';
    if (n >= 0x30 && n <= 0x39) return String.fromCharCode(n);
    if (n >= 0x41 && n <= 0x5a) return String.fromCharCode(n);
    if (n >= 0x70 && n <= 0x87) return 'F' + (n - 0x6f);
    return 'VK' + n;
}

function invVkToUsLabel(vk) {
    return invBindLabelFromVk(vk);
}

function invBindLabelFromKeyboardEvent(ev, vk) {
    var code = ev && ev.code;
    if (code && code.length && code !== 'Unidentified') {
        if (code === 'Space') return 'Space';
        var km = /^Key([A-Z])$/.exec(code);
        if (km) return km[1];
        var dm = /^Digit([0-9])$/.exec(code);
        if (dm) return dm[1];
        var map = {
            Tab: 'Tab', Enter: 'Enter', Escape: 'Esc', Backspace: 'Bksp',
            ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
            AltLeft: 'Alt', AltRight: 'Alt',
            ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right'
        };
        if (map[code]) return map[code];
        if (/^F\d{1,2}$/.test(code)) return code;
    }
    return invBindLabelFromVk(vk);
}

function invFinishSlotBind(slot, vk, label) {
    window._invBindWaitingSlot = null;
    if (window.invApp && window.invApp.binderSlotData) {
        window.invApp.$set(window.invApp.binderSlotData, Number(slot), { keyName: label });
    }
    invBridgeTrigger('inventorySetSlotBind', slot, JSON.stringify({ label: label, code: vk, type: 'key' }));
    invBridgeTrigger('invBindCaptureEnd');
}

function invCancelSlotBind(notify) {
    if (window._invBindWaitingSlot == null || window._invBindWaitingSlot === '') return;
    window._invBindWaitingSlot = null;
    invBridgeTrigger('invBindCaptureEnd');
    if (notify !== false) {
        invBridgeTrigger('notify:client', 1, 'bottom-mid', 'Назначение клавиши отменено.', 2200);
    }
}

window.invApplySlotBindCapture = function (slotStr, vk, label) {
    if (window._invBindWaitingSlot == null || String(window._invBindWaitingSlot) !== String(slotStr)) return;
    var safeLabel = invNormalizeBindLabel(label || invBindLabelFromVk(vk));
    invFinishSlotBind(slotStr, Number(vk), safeLabel);
};

function invBindFromMouseButton(ev) {
    if (window._invBindWaitingSlot == null || window._invBindWaitingSlot === '') return;
    var btn = ev && ev.button;
    var vk = null;
    if (btn === 3) vk = 0x05;
    else if (btn === 4) vk = 0x06;
    else return;
    ev.preventDefault();
    ev.stopPropagation();
    invFinishSlotBind(window._invBindWaitingSlot, vk, invBindLabelFromVk(vk));
}

function invEnsureBindListener() {
    if (invBindListenAttached) return;
    invBindListenAttached = true;
    window.addEventListener('keydown', function (ev) {
        if (window._invBindWaitingSlot == null || window._invBindWaitingSlot === '') return;
        if (ev.repeat) return;
        var vk = ev.keyCode != null ? ev.keyCode : ev.which;
        if (ev.key === 'Escape' || vk === 27) {
            invCancelSlotBind(true);
            ev.preventDefault();
            ev.stopPropagation();
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        var slot = window._invBindWaitingSlot;
        var label = invBindLabelFromKeyboardEvent(ev, vk);
        invFinishSlotBind(slot, vk, label);
    }, true);
    window.addEventListener('mousedown', invBindFromMouseButton, true);
    window.addEventListener('mouseup', invBindFromMouseButton, true);
    window.addEventListener('auxclick', invBindFromMouseButton, true);
}

window.invBeginBindSlot = function (slotStr) {
    var idx = Number(slotStr);
    var grid = window.inventoryGridItemsRef || [];
    if (Number.isInteger(idx) && invTokenIsClothing(grid[idx])) {
        invBridgeTrigger('notify:client', 2, 'top-mid', 'Одежду нельзя привязывать к клавишам.', 3000);
        return;
    }
    invEnsureBindListener();
    window._invBindWaitingSlot = slotStr;
    invBridgeTrigger('invBindCaptureStart', slotStr);
    invBridgeTrigger('notify:client', 1, 'bottom-mid', 'Нажмите клавишу или M4/M5. Esc — отмена.', 14000);
};

window.invClearBindSlot = function (slotStr) {
    if (window.invApp && window.invApp.binderSlotData) {
        window.invApp.$delete(window.invApp.binderSlotData, Number(slotStr));
    }
    invBridgeTrigger('inventorySetSlotBind', slotStr, JSON.stringify({ clear: true }));
};

window.invHasSlotBind = function (slotIdx) {
    if (!window.invApp || !window.invApp.binderSlotData) return false;
    var ent = window.invApp.binderSlotData[slotIdx];
    return !!(ent && ent.keyName && ent.keyName !== '-');
};

window.invItemBaseId = invItemBaseId;
window.invWeaponBaseId = invWeaponBaseId;
window.invFastSlotHasWeaponBase = invFastSlotHasWeaponBase;
window.invWeaponBaseInAnyFastSlot = invWeaponBaseInAnyFastSlot;
window.invTryAssignFastSlot = invTryAssignFastSlot;
window.invShortItemNameFromCatalog = invShortItemNameFromCatalog;
window.invNormalizeClothDisplayName = invNormalizeClothDisplayName;
window.invIsEquipableClothToken = invIsEquipableClothToken;
window.invIsConsumableStackBase = invIsConsumableStackBase;
window.invShouldShowStackCount = invShouldShowStackCount;
window.invFastSlotBlockedBaseName = invFastSlotBlockedBaseName;
window.invConsumableStackQty = invConsumableStackQty;
window.invWeaponIconBase = invWeaponIconBase;

window.invDropNeedsQtyModal = function (comp) {
    if (!comp || !comp.data || comp.data.id === 'E') return false;
    if (comp.type === 'weapon') return false;
    var raw = comp.data.raw || comp.data.id;
    var base = invItemBaseId(raw);
    if (!invIsConsumableStackBase(base)) return false;
    var qty = parseInt(comp.data.count, 10);
    if (!Number.isFinite(qty) || qty <= 0) qty = invConsumableStackQty(raw);
    return qty > 1;
};

window.invPerformInstantDrop = function (comp) {
    if (!comp || !comp.data || comp.data.id === 'E') return;
    var raw = comp.data.raw || comp.data.id;
    if (comp.type === 'bagItem') {
        invBridgeTrigger('inventory:dropSlot', 'bag', comp.itemslot);
    } else if (comp.type === 'weapon') {
        invBridgeTrigger('removeFastSlot' + (comp.weaponslot + 1), raw);
    } else {
        if (Number.isInteger(comp.itemslot) && comp.itemslot >= 0) {
            invBridgeTrigger('inventory:dropSlot', 'grid', comp.itemslot);
        } else {
            invBridgeTrigger('dropItem', raw);
        }
    }
};
window.invPerformItemUse = invPerformItemUse;
window.invIsBagOrHolsterToken = invIsBagOrHolsterToken;
window.invCanUnequipBag = invCanUnequipBag;
window.invEquipTopHasDonateToggle = invEquipTopHasDonateToggle;

(function initGroundPickupModal() {
    var overlay = document.getElementById('groundPickupOverlay');
    var input = document.getElementById('groundPickupQtyInput');
    var titleEl = document.getElementById('groundPickupTitle');
    var countTextEl = document.getElementById('groundPickupCountText');
    var btnOk = document.getElementById('groundPickupOkBtn');
    var btnCancel = document.getElementById('groundPickupCancelBtn');
    var btnMax = document.getElementById('groundPickupMaxBtn');
    if (!overlay || !input || !btnOk) return;

    var groundPickupMax = 1;
    var groundPickupBound = false;

    function clampQty(raw) {
        var q = parseInt(String(raw || '').replace(/\D/g, ''), 10);
        if (!Number.isFinite(q) || q < 1) q = 1;
        if (q > groundPickupMax) q = groundPickupMax;
        return q;
    }

    function finishGroundPickupOverlay() {
        overlay.style.display = 'none';
        if (window.__groundPickupHideInventory) {
            document.body.classList.remove('ground-pickup-only');
            window.__groundPickupHideInventory = false;
        }
    }

    function closeGroundPickupModal() {
        finishGroundPickupOverlay();
        invBridgeTrigger('pickupQty:cancel');
    }

    function confirmGroundPickup() {
        var q = clampQty(input.value);
        finishGroundPickupOverlay();
        invBridgeTrigger('pickupQty:confirm', q);
    }

    function bindOnce() {
        if (groundPickupBound) return;
        groundPickupBound = true;
        btnOk.addEventListener('click', confirmGroundPickup);
        btnCancel.addEventListener('click', closeGroundPickupModal);
        if (btnMax) {
            btnMax.addEventListener('click', function () {
                input.value = String(groundPickupMax);
            });
        }
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmGroundPickup();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeGroundPickupModal();
            }
        });
        input.addEventListener('input', function () {
            input.value = String(input.value || '').replace(/\D/g, '');
        });
    }

    window.openGroundPickupModal = function (hint, keepInventoryVisible) {
        bindOnce();
        var h = hint || {};
        var label = String(h.label || h.item || 'Предмет');
        groundPickupMax = Math.max(1, parseInt(h.qty, 10) || 1);
        titleEl.textContent = 'Поднять ' + label;
        if (countTextEl) countTextEl.textContent = 'Введите количество ( 1 - ' + groundPickupMax + ' )';
        input.value = '1';
        window.__groundPickupHideInventory = !keepInventoryVisible;
        if (!keepInventoryVisible) {
            document.body.classList.add('ground-pickup-only');
        }
        overlay.style.display = 'block';
        invBridgeTrigger('pickupQty:cursor', true);
        setTimeout(function () {
            try {
                input.focus();
                var len = String(input.value || '').length;
                if (input.setSelectionRange) input.setSelectionRange(len, len);
            } catch (_e) {}
        }, 0);
    };

    window.closeGroundPickupModal = closeGroundPickupModal;
})();

(function initChangeNameModal() {
    var overlay = document.getElementById('changeNameOverlay');
    var input = document.getElementById('changeNameInput');
    var btnOk = document.getElementById('changeNameOkBtn');
    var btnCancel = document.getElementById('changeNameCancelBtn');
    if (!overlay || !input || !btnOk) return;

    var changeNameBound = false;
    var changeNameCloseAfter = false;

    function closeChangeNameModal() {
        overlay.style.display = 'none';
        input.value = '';
        changeNameCloseAfter = false;
    }

    function confirmChangeName() {
        var nick = String(input.value || '').trim();
        if (!nick) return;
        var shouldClose = changeNameCloseAfter;
        closeChangeNameModal();
        invBridgeTrigger('changeNameItem:submit', nick);
        if (shouldClose && window.invApp) window.invApp.closeInv();
    }

    function bindOnce() {
        if (changeNameBound) return;
        changeNameBound = true;
        btnOk.addEventListener('click', confirmChangeName);
        if (btnCancel) btnCancel.addEventListener('click', closeChangeNameModal);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmChangeName();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeChangeNameModal();
            }
        });
    }

    window.openChangeNameModal = function (opts) {
        bindOnce();
        changeNameCloseAfter = !!(opts && opts.closeAfter);
        overlay.style.display = 'block';
        setTimeout(function () {
            input.focus();
            input.select();
        }, 0);
    };

    window.closeChangeNameModal = closeChangeNameModal;
})();
