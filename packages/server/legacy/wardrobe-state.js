"use strict";
const parse=value=>{try{return JSON.parse(value||'{}');}catch(_){return {};}};
const ready=new Promise(resolve=>global.whenDbReady(resolve)).then(()=>global.querydb('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS legacy_wardrobe_json LONGTEXT NULL DEFAULT NULL'));
const queues=new WeakMap();
function enqueue(p,change){
 const task=(queues.get(p)||Promise.resolve()).catch(()=>{}).then(async()=>{
  await ready;const next=change(JSON.parse(JSON.stringify(p._legacyWardrobe||{})));
  if(!next||JSON.stringify(next)===JSON.stringify(p._legacyWardrobe||{}))return;
  await global.querydb('UPDATE accounts SET legacy_wardrobe_json=? WHERE static=?',[JSON.stringify(next),p.static]);p._legacyWardrobe=next;
  console.log('[WARDROBE SAVED] CID='+p.static);
  if(mp.players.exists(p)&&typeof global.emitPlayerInventory==='function')global.emitPlayerInventory(p);
 });queues.set(p,task);return task;
}
function load(p,row){p._legacyWardrobe=parse(row.legacy_wardrobe_json);for(const r of Object.values(p._legacyWardrobe.props||{}))if([255,65535,4294967295].includes(r[1])){r[1]=-1;r[2]=0;}p._legacyWardrobeReady=false;}
function save(p,kind,rows){return enqueue(p,next=>{
 if((next.model>>>0)!==(p.model>>>0)){next={model:p.model,components:{},props:{}};}
 next.model=p.model;next[kind]=next[kind]||{};for(const row of rows)next[kind][row[0]]=row.slice();return next;
});}
async function restore(p,clothes){
 const state=p._legacyWardrobe;let success=true;
 try{
  if(state&&(state.model>>>0)===(p.model>>>0)){
   const rows=Object.values(state.components||{});
   if(rows.length&&await clothes.request(p,'components',rows,{quiet:true,restore:true})===false)success=false;
   for(const row of Object.values(state.props||{})){
    if(row[1]===-1){p.setProp(row[0],-1,0);continue;}
    if(await clothes.request(p,'props',[row],{quiet:true,restore:true})===false){p.setProp(row[0],-1,0);console.warn('[WARDROBE PROP SKIPPED] CID='+p.static+' slot='+row[0]);}
   }
  }
 }catch(e){success=false;throw e;}finally{p._legacyWardrobeReady=success;p._legacyWardrobeAfter=Date.now()+2000;if(!success)console.warn('[WARDROBE RESTORE FAILED] CID='+p.static);else if(mp.players.exists(p))p.call('legacy:wardrobe:ready');}
}
function clearComponents(p,rows){return enqueue(p,next=>{for(const r of rows)if(next.components)delete next.components[r[0]];return next;});}
function snapshot(p){
 if(!p._legacyWardrobeReady||p.getVariable('auth')!==true||!p._legacySpawned||p.getVariable('charCreating')||p.getVariable('shopc')||Date.now()<(p._legacyWardrobeAfter||0))return null;
 if(![mp.joaat('mp_m_freemode_01')>>>0,mp.joaat('mp_f_freemode_01')>>>0].includes(p.model>>>0)||typeof p.getClothes!=='function')return null;
 const next={model:p.model,components:{},props:{}};
 for(const slot of [1,3,4,5,6,7,8,9,10,11]){
  const c=p.getClothes(slot);if(!c)return null;const row=[slot,c.drawable,c.texture,c.palette||0];
  if(!row.every(Number.isSafeInteger)||row[1]<0||row[1]>4095||row[2]<0||row[2]>255)return null;next.components[slot]=row;
 }
 if(typeof p.getProp==='function')for(const slot of [0,1,2,6,7]){
  const c=p.getProp(slot);if(!c)continue;const drawable=[255,65535,4294967295].includes(c.drawable)?-1:c.drawable,row=[slot,drawable,c.texture<0?0:c.texture];
  if(row.every(Number.isSafeInteger)&&drawable>=-1&&drawable<=4095&&row[2]>=0&&row[2]<=255)next.props[slot]=row;
 }
 return next;
}
function capture(p){const next=snapshot(p);if(next)return enqueue(p,()=>next);return Promise.resolve();}
const timer=setInterval(()=>{mp.players.forEach(p=>{try{capture(p).catch(e=>console.error('[WARDROBE AUTO]',e.message));}catch(e){console.error('[WARDROBE AUTO]',e.message);}});},2000);if(timer.unref)timer.unref();
mp.events.add('playerQuit',p=>{try{capture(p).catch(e=>console.error('[WARDROBE QUIT]',e.message));}catch(_){}});
module.exports={load,save,restore,clearComponents,capture,snapshot,ready};

const clientSaving=new WeakSet(),clientAt=new WeakMap();
mp.events.add('legacy:wardrobe:changed',async(p,json)=>{
 if(!mp.players.exists(p)||!p._legacyWardrobeReady||!p._legacySpawned||p.getVariable('auth')!==true||Number(p.adminlvl)<7||clientSaving.has(p)||typeof json!=='string'||json.length>6000||Date.now()-(clientAt.get(p)||0)<1500)return;
 clientAt.set(p,Date.now());clientSaving.add(p);
 try{
  const data=JSON.parse(json),clothes=require('./clothing-validation').current();
  if(!clothes||!data||!Array.isArray(data.components)||data.components.length!==10||!Array.isArray(data.props)||data.props.length>5)return;
  const slots=[1,3,4,5,6,7,8,9,10,11];
  if(data.components.some((r,i)=>!Array.isArray(r)||r[0]!==slots[i])||data.props.some(r=>!Array.isArray(r)||![0,1,2,6,7].includes(r[0])))return;
  if(!await clothes.request(p,'components',data.components,{quiet:true}))return;
  const props=data.props.filter(r=>r.length===3&&r.every(Number.isSafeInteger)&&r[1]>=0);
  if(props.length)await clothes.request(p,'props',props,{quiet:true});
  for(const r of data.props)if(r.length===3&&r.every(Number.isSafeInteger)&&r[1]===-1){await save(p,'props',[r]);if(mp.players.exists(p))p.setProp(r[0],-1,0);}
 }catch(e){console.warn('[WARDROBE CLIENT]',e.message);}finally{clientSaving.delete(p);}
});
