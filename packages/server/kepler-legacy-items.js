'use strict';
const PREFIX='kpl.';
const fields={1:'masks',3:'tors',4:'bottom',5:'bags',6:'shoes',7:'accessories',8:'undershirt',9:'armor',10:'decals',11:'top'};
const eqNames={top:'top',pants:'pants',shoes:'shoes',hat:'headwear',mask:'mask',glasses:'glasses',vest:'armor',backpack:'bag',accessory:'holster',gloves:'gloves',watch:'watch',bracelet:'bracelet',earrings:'ears'};
const titles={burger:'Бургер',water:'Бутылка воды',chocolate:'Шоколад',medkit:'Аптечка',repair:'Ремонтный набор'};
function decode(raw){try{if(typeof raw!=='string'||!raw.startsWith(PREFIX)||raw.length>32768)return null;const item=JSON.parse(Buffer.from(raw.slice(4),'base64').toString('utf8'));return item&&typeof item.id==='string'&&Number.isInteger(item.count)&&item.count>0&&item.count<=10000?item:null;}catch(_){return null;}}
const encode=item=>PREFIX+Buffer.from(JSON.stringify(item),'utf8').toString('base64');
const validComponent=c=>Array.isArray(c)&&c.length>=3&&c.slice(0,3).every(Number.isInteger)&&fields[c[0]]&&c[1]>=0&&c[1]<2000&&c[2]>=0&&c[2]<256;
function save(p){global.saveInventory(p);global.DB.query('UPDATE accounts SET kepler_equipment_json=? WHERE static=?',[JSON.stringify(p._keplerEquipment||{}),p.static],e=>{if(e)console.error('[KEPLER ITEMS] save',e.code);});if(global.emitPlayerInventory)global.emitPlayerInventory(p);}
function wear(p,item){
 for(const c of item.components||[])if(validComponent(c)){p.setClothes(c[0],c[1],c[2],Number(c[3])||0);const field=fields[c[0]],value=c[1]+':'+c[2];p._clothesRowCache=p._clothesRowCache||{};p._clothesRowCache[field]=value;global.updateOrInsertClothes(p.static,0,field,value,()=>{});}
}
function install(){
 global.decodeKeplerLegacyItem=decode;
 const formatOriginal=global.formweap;
 global.formweap=raw=>{const item=decode(raw);return item?(item.type==='clothing'?'Одежда':titles[item.type]||item.name||'Предмет'):formatOriginal(raw);};
 global.applyKeplerLegacyEquipment=p=>{for(const token of Object.values(p._keplerEquipment||{})){const item=decode(token);if(item&&item.type==='clothing')wear(p,item);}};
 const snap=global.buildEquipSnapshotAsync;
 global.buildEquipSnapshotAsync=(p,cb)=>snap(p,s=>{
  if(s&&s.slots){
   for(const [slot,token]of Object.entries(p._keplerEquipment||{})){
    const item=decode(token),key=eqNames[slot];if(!item||!key)continue;
    const relevant=(item.components||[]).filter(r=>![3,8,10].includes(r[0]));
    const matches=relevant.every(r=>{const c=p.getClothes(r[0]);return c&&c.drawable===r[1]&&c.texture===r[2];});
    if(matches)s.slots[key]={filled:true,name:item.name||'Одежда',equipToken:token};
    else s.slots[key]=null;
   }
   for(const [key,component,name]of [['top',11,'Верх'],['pants',4,'Брюки'],['shoes',6,'Обувь']]){
    if(s.slots[key]&&s.slots[key].filled)continue;
    const c=p.getClothes(component);if(!c||!Number.isSafeInteger(c.drawable)||c.drawable<0)continue;
    s.slots[key]={filled:true,name:name+' · '+c.drawable,readOnly:true,drawable:c.drawable,texture:c.texture};
   }
  }
  if(s)s.bandolier=Array.isArray(p.bandolier)?p.bandolier.slice(0,6):[];
  cb(s);
 });
 mp.events.add('kepler:legacy:use',(p,raw)=>{
  if(!mp.players.exists(p)||!p.getVariable('auth')||p.getVariable('dead')||!Array.isArray(p.inventory))return;
  const now=Date.now();if(now-(p._keplerLegacyUsedAt||0)<500)return;p._keplerLegacyUsedAt=now;
  const item=decode(raw);if(!item)return;
  const index=p.inventory.indexOf(raw),equipment=p._keplerEquipment||(p._keplerEquipment={});
  if(item.type==='clothing'){
   if(!eqNames[item.slot]||!(item.components||[]).length||!item.components.every(validComponent))return;
   if(equipment[item.slot]===raw){
    const free=p.inventory.findIndex(x=>x==null||x==='');if(free<0)return isNotify(p,2,'top-mid','Освободите место в инвентаре.',3000);
    p.inventory[free]=raw;delete equipment[item.slot];
    const female=p.model===mp.joaat('mp_f_freemode_01');const resets={top:[[11,15,0,0],[3,15,0,0],[8,female?14:15,0,0]],pants:[[4,female?15:21,0,0]],shoes:[[6,female?35:34,0,0]]};
    const resetRows=resets[item.slot]||item.components.map(c=>[c[0],0,0,0]);require('./legacy/wardrobe-state').clearComponents(p,resetRows).catch(e=>console.error('[WARDROBE SAVE]',e.message));wear(p,{components:resetRows});save(p);return;
   }
   if(index<0)return;const previous=equipment[item.slot];p.inventory[index]=previous||null;equipment[item.slot]=raw;require('./legacy/wardrobe-state').clearComponents(p,item.components).catch(e=>console.error('[WARDROBE SAVE]',e.message));wear(p,item);save(p);return;
  }
  if(index<0)return;
  if(item.type==='license_plate')return isNotify(p,0,'top-mid','Номер: '+String(item.plate||item.name||''),4000);
  if(!titles[item.type])return isNotify(p,2,'top-mid','Предмет сохранён. Для него пока нет действия.',3000);
  if(item.type==='medkit'&&p.health>=100)return isNotify(p,2,'top-mid','Здоровье уже восстановлено.',3000);
  if(item.type==='repair'){
   let vehicle=p.vehicle;mp.vehicles.forEachInRange(p.position,4,v=>{if(!vehicle&&v.dimension===p.dimension)vehicle=v;});if(!vehicle)return isNotify(p,2,'top-mid','Рядом нет транспорта.',3000);vehicle.repair();
  }else if(item.type==='medkit')p.health=Math.min(100,p.health+50);
  else{p.setVariable(item.type==='water'?'thirst':'satiety',Math.min(100,(Number(p.getVariable(item.type==='water'?'thirst':'satiety'))||70)+(item.type==='water'?30:item.type==='burger'?25:5)));}
  item.count--;p.inventory[index]=item.count?encode(item):null;save(p);isNotify(p,0,'top-mid',titles[item.type]+' использовано.',2200);
 });
 global.whenDbReady(()=>global.DB.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS kepler_equipment_json LONGTEXT NULL DEFAULT NULL',e=>{if(e)console.error('[KEPLER ITEMS] schema',e.code);}));
}
module.exports={install,encode,decode,validComponent};
