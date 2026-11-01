'use strict';
const fleet=new Map(),IDLE_MS=10*60*1000;
function find(owner,model){for(const [v,row]of fleet){if(!mp.vehicles.exists(v)){fleet.delete(v);continue;}if(row.owner===Number(owner)&&row.model===String(model).toLowerCase())return v;}return null;}
function register(v,owner,model){fleet.set(v,{owner:Number(owner),model:String(model).toLowerCase(),emptySince:Date.now()});v.setVariable('legacyPersonalVehicle',true);}
const timer=setInterval(()=>{
 const occupied=new Set(mp.players.toArray().map(p=>p.vehicle).filter(Boolean)),now=Date.now();
 for(const [v,row]of fleet){if(!mp.vehicles.exists(v)){fleet.delete(v);continue;}if(occupied.has(v)){row.emptySince=now;continue;}if(now-row.emptySince>=IDLE_MS){fleet.delete(v);if(typeof global.deleteVeh==='function')global.deleteVeh(v);else v.destroy();}}
},10000);if(timer.unref)timer.unref();
mp.events.add('playerEnterVehicle',(p,v)=>{const row=fleet.get(v);if(row)row.emptySince=Date.now();});
mp.events.add('playerExitVehicle',(p,v)=>{const row=fleet.get(v);if(row)row.emptySince=Date.now();});
function spawnPosition(origin,heading,dimension){for(const offset of [4,8,12,16]){const radians=heading*Math.PI/180,pos=new mp.Vector3(origin.x-Math.sin(radians)*offset,origin.y+Math.cos(radians)*offset,origin.z);if(!mp.vehicles.toArray().some(v=>mp.vehicles.exists(v)&&v.dimension===dimension&&Math.hypot(v.position.x-pos.x,v.position.y-pos.y,v.position.z-pos.z)<3))return pos;}return origin;}
module.exports={find,register,IDLE_MS,spawnPosition};
