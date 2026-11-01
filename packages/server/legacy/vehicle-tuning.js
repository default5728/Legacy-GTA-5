'use strict';
const fs=require('fs'),path=require('path'),access=require('./access');
const rules=require('../../../client_packages/shared/vehicle-dynamics');
module.exports=function(send){
 const file=path.resolve(__dirname,'../../../data/legacy-vehicle-tuning.json');
 const saved=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const cooldown=new WeakMap();
 const key=v=>Number(v.getVariable('owner'))>0&&!v.getVariable('rent')&&!v.getVariable('fractioncar')&&!v.getVariable('familyGarage')?v.getVariable('owner')+':'+(v.getVariable('carId')||v.getVariable('carModel')||v.model):null;
 function driver(p,id){access.assertPlayer(p);const v=p.vehicle;if(!v||!mp.vehicles.exists(v)||v.id!==Number(id)||p.seat!==0||p.health<=0||p.getVariable('dead')===true)throw Error('Настройки доступны водителю в автомобиле.');return v;}
 function restore(v){const k=key(v);if(k&&saved[k])v.setVariable('legacyVehicleTuning',rules.normalize(saved[k]));}
 function state(p,v){p.call('legacy:vehicle:tuning:state',[v.id,JSON.stringify(v.getVariable('legacyVehicleTuning')||rules.defaults)]);}
 mp.events.add('legacy:vehicle:tuning:open',(p,id)=>{try{const v=driver(p,id);restore(v);state(p,v);}catch(e){send(p,e.message);}});
 mp.events.add('legacy:vehicle:tuning:save',(p,id,raw)=>{try{
  const v=driver(p,id),now=Date.now();if(now-(cooldown.get(p)||0)<400)return;cooldown.set(p,now);
  if(typeof raw!=='string'||raw.length>300)throw Error('Некорректные настройки.');
  const value=rules.normalize(JSON.parse(raw)),velocity=v.velocity;
  if(velocity&&Math.hypot(velocity.x,velocity.y,velocity.z)>1.5)throw Error('Остановитесь перед настройкой автомобиля.');
  const k=key(v);if(k){if(Number(v.getVariable('owner'))!==Number(p.static))throw Error('Сохранение настроек доступно владельцу.');const next={...saved,[k]:value};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);saved[k]=value;}
  v.setVariable('legacyVehicleTuning',value);state(p,v);send(p,'Настройки автомобиля применены.');
 }catch(e){send(p,e.message);}});
 mp.events.add('playerEnterVehicle',(p,v)=>{try{restore(v);}catch(e){console.warn('[VEHICLE TUNING]',e.message);}});
};
