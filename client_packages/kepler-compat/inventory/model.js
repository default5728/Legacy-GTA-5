'use strict';
function emptySlot(){return {id:'E',name:'',count:0,weight:0,slot:-1};}
function emptyWeapon(){return emptySlot();}
window.invApp={data:{},replaceItem:{start:false},binderSlotData:[],$set:(o,k,v)=>{o[k]=v;},$delete:(o,k)=>{delete o[k];},closeInv(){mp.trigger('closeInventory');}};
window.invTrigger=(event,...args)=>mp.trigger(event,...args);
const keplerComps=new Map();
const keplerSlotNames={hat:'hat',mask:'mask',glasses:'glasses',top:'top',armor:'vest',holster:'accessory',bag:'backpack',pants:'pants',shoes:'shoes',ears:'earrings',watch:'watch',bracelet:'bracelet',gloves:'gloves',decals:'special'};
function keplerDecode(raw){try{if(!String(raw).startsWith('kpl.'))return null;return JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));}catch(_){return null;}}
function keplerView(item,id,comp){
 const legacy=keplerDecode(item.raw),payload=String(item.raw||'').startsWith('ic1.')?decodeIc1Payload(invItemBaseId(item.raw)):null;
 const slot=legacy&&legacy.slot||({1:'hat',2:'mask',3:'top',4:'pants',5:'shoes',6:'accessory',7:'glasses',8:'backpack',9:'vest',12:'earrings',13:'watch',14:'bracelet',15:'gloves'})[payload&&payload.cid];
 keplerComps.set(id,comp);
 return {...(legacy||{}),id,name:legacy?(legacy.name||({burger:'Бургер',water:'Вода',chocolate:'Шоколад',medkit:'Аптечка',repair:'Ремонтный набор'})[legacy.type]||'Предмет'):(item.name||'Предмет'),count:legacy?legacy.count:item.count||1,type:legacy?legacy.type:slot?'clothing':'source',slot,image:legacy?(legacy.type==='license_plate'?'package://browsers/inventory/UI/Inventory/Items/veh_number.png':undefined):item.icoFull,weight:legacy?Number(legacy.weight)||0:Number(item.weight)||0};
}
window.openInventory=function(payload){
 invApp.data=payload;keplerComps.clear();const items=[],equipment={};
 for(const [index,item]of (payload.items||[]).entries())if(item&&item.id!=='E')items.push(keplerView(item,'grid-'+index,{type:'item',data:item,itemslot:index}));
 for(const [index,item]of (payload.weapons||[]).entries())if(item&&item.id!=='E')items.push(keplerView(item,'weapon-'+index,{type:'weapon',data:item,weaponslot:index}));
 for(const [slot,item]of Object.entries(payload.clothes||{}))if(item&&item.id!=='E'){const key=keplerSlotNames[slot]||slot;const view=keplerView(item,'equip-'+slot,{type:'clothes',data:item,clothesslot:item.slot});view.type='clothing';view.slot=key;equipment[key]=view;}
 for(const [index,item]of (payload.bagItems||[]).entries())if(item&&item.id!=='E')items.push(keplerView(item,'bag-'+index,{type:'bagItem',data:item,itemslot:index}));
 INVENTORY_UI.update({items,equipment,capacityUnit:'slots',maxWeight:Number(payload.maxSlots)||50,currentWeight:Number(payload.usedSlots)||0,satiety:payload.player&&payload.player.satiety,thirst:payload.player&&payload.player.thirst,mood:payload.player&&payload.player.mood});
};
window.keplerInventoryRefresh=()=>{if(invApp.data.items)openInventory(invApp.data);};
window.keplerInventoryAction=(action,id,requestId)=>{
 const comp=keplerComps.get(id);if(!comp){INVENTORY_UI.ack(requestId,false,'Предмет уже изменился.');return;}
 if(action==='split'){INVENTORY_UI.ack(requestId,false,'Разделение выполняется при переносе в сумку или склад.');return;}
 if(action==='use'){
  if(keplerDecode(comp.data.raw))mp.trigger('kepler:legacy:use:client',comp.data.raw);
  else invPerformItemUse(comp,false);
 }else if(action==='drop'){
  if(comp.type==='clothes'){INVENTORY_UI.ack(requestId,false,'Сначала снимите одежду.');return;}
  if(window.inventoryWarehouseMode&&comp.type==='bagItem')whWithdrawFromItem(comp.data.raw,comp.data.count);
  else invPerformInstantDrop(comp);
 }
 INVENTORY_UI.ack(requestId,true,'');
};
window.applyInventoryCenterSetting=on=>{document.body.dataset.centerInventory=String(!!on);};
new MutationObserver(()=>{if(document.body.classList.contains('inventory-ui-open'))INVENTORY_UI.show(1);else INVENTORY_UI.hide();}).observe(document.body,{attributes:true,attributeFilter:['class']});
