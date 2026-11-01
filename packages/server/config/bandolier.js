'use strict';
const items=require('../kepler-legacy-items');
const SIZE=6;
function allowed(raw){
 if(typeof raw!=='string'||raw.length>32768)return false;
 const item=items.decode(raw);
 if(item)return item.type==='ammo'||item.type==='weapon';
 const base=raw.split('(')[0].split('#')[0].trim();
 return /^weapon_[a-z0-9_]+$/.test(base)||/^(?:item_)?ammo(?:_[a-z0-9_.]+)?$/i.test(base);
}
function normalize(raw){let rows=raw;try{if(typeof rows==='string')rows=JSON.parse(rows);}catch(_){rows=[];}return Array.from({length:SIZE},(_,i)=>Array.isArray(rows)&&typeof rows[i]==='string'?rows[i]:'');}
function transfer(player,mode,from,to,expected){
 if(!Array.isArray(player.inventory)||!Array.isArray(player.bandolier))throw Error('Инвентарь ещё загружается.');
 if(!Number.isInteger(from)||!Number.isInteger(to)||typeof expected!=='string')throw Error('Некорректный слот.');
 const belt=player.bandolier,grid=player.inventory;
 if(mode==='put'){
  if(from<0||from>=grid.length||to<0||to>=SIZE||grid[from]!==expected)throw Error('Предмет изменился.');
  if(!allowed(expected))throw Error('В патронташ можно положить только оружие и патроны.');
  const old=belt[to];belt[to]=expected;grid[from]=old||null;
 }else if(mode==='take'){
  if(from<0||from>=SIZE||!belt[from]||belt[from]!==expected)throw Error('Предмет изменился.');
  if(to===-1)to=grid.findIndex(x=>!x);
  if(to<0||to>=grid.length)throw Error('Нет свободного места в инвентаре.');
  const old=grid[to];if(old&&!allowed(old))throw Error('Обмен возможен только с оружием или патронами.');
  grid[to]=belt[from];belt[from]=old||'';
 }else if(mode==='swap'){
  if(from<0||from>=SIZE||to<0||to>=SIZE||belt[from]!==expected)throw Error('Предмет изменился.');
  [belt[from],belt[to]]=[belt[to],belt[from]];
 }else throw Error('Неизвестное действие.');
}
function register(){
 global.legacyBandolierReady=false;
 if(typeof global.whenDbReady==='function')global.whenDbReady(()=>{
  global.DB.query('ALTER TABLE accounts ADD COLUMN legacy_bandolier LONGTEXT NULL',error=>{
   if(error&&error.code!=='ER_DUP_FIELDNAME'){console.error('[BANDOLIER] schema',error.code);return;}
   global.legacyBandolierReady=true;
  });
 });
 mp.events.add('legacy:bandolier:move',(p,mode,from,to,expected)=>{
  try{
   if(!mp.players.exists(p)||p.getVariable('auth')!==true||!p._legacySpawned)return;
   if(!global.legacyBandolierReady||p._loadingInventory||p._bagInstDeferLoadPending)throw Error('Инвентарь ещё загружается.');
   if(p.getVariable('dead')||p.getVariable('inMbaArena')||p.getVariable('jail'))throw Error('Сейчас нельзя менять патронташ.');
   transfer(p,mode,from,to,expected);global.saveInventory(p);global.emitPlayerInventory(p);
  }catch(e){p.call('notify:client',[2,'top-mid',e.message,3000]);}
 });
}
module.exports={allowed,normalize,transfer,register,SIZE};
