'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=path.resolve(__dirname,'../../../data/legacy-placed-world.json');let data={version:1,records:[]};
if(fs.existsSync(file)){data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!Array.isArray(data.records))throw Error('Invalid placed-world.json; refusing to overwrite');}
function flush(){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2));fs.renameSync(temp,file);}
function descriptor(e){let key=e.getVariable('placerPersistentId');if(key)return{key};const npc=e.getVariable('placerNpc');if(npc)return{npc};let w;try{w=JSON.parse(e.getVariable('staticWorld'));}catch(_){}return w?{world:w}:null;}
function save(e,pose,deleted=false,source=null){
 const ref=descriptor(e),key=ref&&ref.key||crypto.randomBytes(12).toString('hex');
 const record={key,service:e.getVariable('legacyService')==='plates'?'plates':null,ref:ref&&!ref.key?ref:null,kind:e.type==='ped'?'ped':'object',hash:e.model>>>0,dimension:e.dimension||0,pose,deleted,source};
 const i=data.records.findIndex(r=>r.key===key);if(i>=0){record.ref=data.records[i].ref;record.source=source||data.records[i].source;data.records[i]=record;}else data.records.push(record);
 flush();e.setVariable('placerPersistentId',key);return record;
}
function point(name,fallback){const r=data.records.find(r=>r.ref&&r.ref.npc===name&&!r.deleted);return r?r.pose:fallback;}
function restore(hooks,masks){for(const r of data.records){
 let e=null;
 if(r.ref&&r.ref.world)e=mp.objects.toArray().find(o=>{try{const w=JSON.parse(o.getVariable('staticWorld'));return w.kind===r.ref.world.kind&&w.id===r.ref.world.id;}catch(_){return false;}});
 if(r.ref&&r.ref.npc)e=mp.peds.toArray().find(p=>p.getVariable('placerNpc')===r.ref.npc);
 if(r.source)masks.set(r.key,{...r.source,id:r.key,dimension:r.dimension});
 if(r.deleted){if(e){if(r.kind==='object')hooks.erase(e);e.destroy();}continue;}
 const p=r.pose;if(!e)e=r.kind==='ped'?global.creatorPedsNew(r.hash,new mp.Vector3(p.x,p.y,p.z),{dynamic:false,frozen:true,invincible:true}):global.creatorObjectsNew(r.hash,new mp.Vector3(p.x,p.y,p.z),{rotation:new mp.Vector3(p.rx||0,p.ry||0,p.h),dimension:r.dimension});e.dimension=r.dimension;
 e.position=new mp.Vector3(p.x,p.y,p.z);if(r.kind==='ped')e.heading=p.h;else e.rotation=new mp.Vector3(p.rx||0,p.ry||0,p.h);
 if(r.service==='plates')e.setVariable('legacyService','plates');
 e.setVariable('placerPersistentId',r.key);e.setVariable('objectPlacer',JSON.stringify({...p,editing:false}));if(typeof e.freezePosition==='function')e.freezePosition(true);
 if(r.kind==='object')hooks.commit(e,p);
 }}
function mask(source,dimension){const key=crypto.randomBytes(12).toString('hex');data.records.push({key,kind:source.kind==='ped'?'ped':'object',hash:source.hash,dimension,pose:source,deleted:true,source});flush();}
module.exports={save,restore,point,mask};
