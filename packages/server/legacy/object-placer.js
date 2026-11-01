'use strict';
const crypto=require('crypto'),access=require('./access'),hooks=require('./world-editing'),store=require('./placer-store');
module.exports=function initializeObjectPlacer(notify){
 const pool=e=>e&&e.type==='ped'?mp.peds:mp.objects;
 const sessions=new Map(),locks=new Map(),masks=new Map(),maskRequests=new WeakMap();
 const norm=h=>((h%360)+360)%360,token=()=>crypto.randomBytes(16).toString('hex');
 const message=(p,t)=>{if(mp.players.exists(p))notify(p,t);};
 function allowed(p){try{access.assertPlayer(p);return access.hasPermission(p,'object.manage')||access.hasPermission(p,'object.delete');}catch(_){return false;}}
 function active(p,s){return allowed(p)&&(s.pickMode==='delete'?access.hasPermission(p,'object.delete'):access.hasPermission(p,'object.manage'))&&p.characterId===s.characterId&&p.dimension===s.dimension&&!p.vehicle&&p.health>0&&p.getVariable('isDead')!==true;}
 function maskSync(){const json=JSON.stringify([...masks.values()]);for(const p of mp.players.toArray())p.call('client:placer:masks',[json]);}
 mp.events.add('server:placer:world',p=>{const now=Date.now();if(now-(maskRequests.get(p)||0)<1000)return;maskRequests.set(p,now);p.call('client:placer:masks',[JSON.stringify([...masks.values()])]);});
 function setMask(s,source){const id=token(),mask={id,...source,dimension:s.dimension};masks.set(id,mask);s.maskId=id;s.maskCreated=true;maskSync();return id;}
 function publish(s,p,editing){
  if(s.object.type==='ped'){s.object.position=new mp.Vector3(p.x,p.y,p.z);s.object.heading=norm(p.h);s.object.setVariable('objectPlacer',JSON.stringify({...p,h:norm(p.h),editing}));return;} 
  s.object.position=new mp.Vector3(p.x,p.y,p.z);s.object.rotation=new mp.Vector3(p.rx||0,p.ry||0,norm(p.h));
  s.object.setVariable('objectPlacer',JSON.stringify({...p,h:norm(p.h),editing}));
  if(typeof s.object.freezePosition==='function')s.object.freezePosition(true);
 }
 function close(p,reason='',keep=false,deleted=false){
  const s=sessions.get(p);if(!s)return;sessions.delete(p);
  if(s.object){locks.delete(s.object);if(!keep&&pool(s.object).exists(s.object)){
   if(deleted){store.save(s.object,s.initial,true,s.source);if(s.object.type!=='ped')hooks.erase(s.object);s.object.destroy();}
   else if(s.existing&&s.lockGranted){publish(s,s.original,false);if(s.object.type!=='ped')hooks.release(s.object);}
   else s.object.destroy();
  }}
  if(s.maskCreated&&!keep&&!deleted){masks.delete(s.maskId);maskSync();}
  if(mp.players.exists(p))p.call('client:placer:closed',[s.token,reason]);
 }
 function parse(input){
  if(!input||input.length>100)return null;let hash;
  if(/^(?:0x[\da-f]+|-?\d+)$/i.test(input)){hash=Number(input);if(!Number.isSafeInteger(hash)||hash< -2147483648||hash>4294967295)return null;}
  else{if(!/^[a-z\d_]{1,100}$/i.test(input))return null;hash=mp.joaat(input.toLowerCase());}
  return(hash>>>0)?{hash:hash>>>0,name:input}:null;
 }
 function validPose(p){return p&&['x','y','z','h','rx','ry'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.rx)<=360&&Math.abs(p.ry)<=360&&Math.abs(p.x)<=20000&&Math.abs(p.y)<=20000&&p.z>=-2000&&p.z<=5000;}
 function command(p,text){
  if(!allowed(p))return;let input=String(text||'').trim();const service=input.toLowerCase()==='plates';if(service)input='ped s_m_y_cop_01';const spawnPed=/^ped\s+/i.test(input);if(spawnPed)input=input.replace(/^ped\s+/i,'');
  if(input.toLowerCase()==='cancel'){close(p,'Редактирование отменено; исходный объект восстановлен.');return;}
  if(input.toLowerCase()!=='delete'&&!access.hasPermission(p,'object.manage'))return message(p,'Ваш ранг разрешает /placer delete.');
  if(p.vehicle||p.health<=0||p.getVariable('isDead')===true)return message(p,'Выйдите из транспорта и завершите стадию смерти.');
  const picking=!input||['edit','select','delete'].includes(input.toLowerCase()),model=picking?null:parse(input);
  if(!picking&&!model)return message(p,'/placer модель — создать; /placer — выбрать; /placer delete — удалить выбранное.');
  close(p);const v=p.position,r=(Number(p.heading)||0)*Math.PI/180;
  const s={service:service?'plates':null,kind:spawnPed?'ped':'object',token:token(),characterId:p.characterId,dimension:p.dimension,model,phase:picking?'picking':'loading',object:null,existing:false,sequence:0,lastUpdate:0,lastSeen:Date.now(),started:Date.now(),origin:{x:v.x,y:v.y,z:v.z},initial:{x:v.x-Math.sin(r)*3,y:v.y+Math.cos(r)*3,z:v.z,h:norm(Number(p.heading)||0),rx:0,ry:0}};
  sessions.set(p,s);if(picking){s.pickMode=input.toLowerCase()==='delete'?'delete':'edit';p.call('client:placer:pick',[s.token,s.pickMode]);}else p.call('client:placer:prepare',[s.token,model.hash,model.name,s.kind]);
 }
 mp.events.addCommand('placer',command);
 mp.events.addCommand('platenpc',(p,text)=>command(p,String(text||'').trim().toLowerCase()==='move'?'edit':'plates'));
 mp.events.add('server:placer:select',async(p,id,json)=>{
  const s=sessions.get(p);if(!s||s.token!==id||s.phase!=='picking'||!active(p,s)||typeof json!=='string'||json.length>1600)return;
  let target;try{target=JSON.parse(json);}catch(_){return;}s.phase='checking';s.lastSeen=Date.now();
  try{
   if(target.kind==='server'||target.kind==='ped'){
    if(!Number.isInteger(target.id)||target.id<0)throw Error('Некорректный ID объекта.');
    const object=(target.kind==='ped'?mp.peds:mp.objects).at(target.id);if(!object||!pool(object).exists(object)||object.dimension!==p.dimension)throw Error('Объект уже исчез.');
    const v=object.position,r=object.type==='ped'?{x:0,y:0,z:object.heading}:object.rotation,pose={x:v.x,y:v.y,z:v.z,h:r.z,rx:r.x,ry:r.y};
    if(!validPose(pose)||Math.hypot(v.x-p.position.x,v.y-p.position.y,v.z-p.position.z)>35)throw Error('Подойдите ближе к объекту.');
    if(locks.has(object))throw Error('Объект уже редактируется.');locks.set(object,s.token);s.object=object;s.existing=true;s.original=pose;s.initial=pose;s.origin={...v};s.kind=object.type;s.model={hash:object.model>>>0,name:'0x'+(object.model>>>0).toString(16)};
    if(object.type!=='ped')await hooks.begin(object);
    if(sessions.get(p)!==s){hooks.release(object);locks.delete(object);return;}
    s.lockGranted=true;
   }else if(target.kind==='map'||target.kind==='mapPed'){
    s.kind=target.kind==='mapPed'?'ped':'object';
    const source={x:target.x,y:target.y,z:target.z,h:target.h,rx:target.rx,ry:target.ry};
    if(!validPose(source)||!Number.isInteger(target.hash)||target.hash<=0||target.hash>4294967295||Math.hypot(source.x-p.position.x,source.y-p.position.y,source.z-p.position.z)>35)throw Error('Объект маппинга недоступен. Подойдите ближе.');
    s.source={...source,hash:target.hash,kind:s.kind};s.initial=source;s.origin={...source};s.model={hash:target.hash,name:'0x'+target.hash.toString(16)};
   }else throw Error('Выберите именно объект, а не транспорт, игрока или поверхность без отдельной модели.');
   if(!active(p,s)){close(p);return;}
   if(s.pickMode==='delete'||target.delete===true){
    if(!access.hasPermission(p,'object.delete'))throw Error('Нет прав на удаление.');
    if(s.source){store.mask(s.source,s.dimension);setMask(s,s.source);}
    close(p,'Объект удалён.',false,true);return;
   }
   s.phase='loading';s.lastSeen=Date.now();p.call('client:placer:prepare',[s.token,s.model.hash,s.model.name,s.kind||'object']);
  }catch(error){close(p,error.message);}
 });
 mp.events.add('server:placer:ready',(p,id,valid)=>{
  const s=sessions.get(p);if(!s||s.token!==id||s.phase!=='loading')return;
  if(!active(p,s)||valid!==true){close(p,'Модель недоступна. Исходный объект сохранён.');return;}
  try{
   const a=s.initial;if(!s.existing){s.object=s.kind==='ped'?global.creatorPedsNew(s.model.hash,new mp.Vector3(a.x,a.y,a.z),{dynamic:false,frozen:true,invincible:true}):global.creatorObjectsNew(s.model.hash,new mp.Vector3(a.x,a.y,a.z),{rotation:new mp.Vector3(a.rx,a.ry,a.h),dimension:s.dimension,alpha:255});s.object.dimension=s.dimension;if(s.kind==='ped')s.object.heading=a.h;locks.set(s.object,s.token);}
   if(s.service)s.object.setVariable('legacyService',s.service);
   if(s.source){s.object.setVariable('placerMapSource',setMask(s,s.source));}
   s.phase='editing';s.lastSeen=Date.now();publish(s,a,true);
   p.call('client:placer:start',[s.token,s.object.id,a.x,a.y,a.z,a.h,a.rx,a.ry,s.kind||'object']);
  }catch(error){close(p,'Не удалось подготовить объект: '+error.message);}
 });
 function accept(p,id,seq,x,y,z,h,final){
  const s=sessions.get(p);if(!s||s.phase!=='editing'||s.token!==id)return;
  if(!active(p,s)||!pool(s.object).exists(s.object)){close(p);return;}
  const pose={x,y,z,h,rx:s.initial.rx,ry:s.initial.ry};
  if(!Number.isSafeInteger(seq)||seq<=s.sequence||!validPose(pose)||Math.hypot(x-s.origin.x,y-s.origin.y,z-s.origin.z)>100)return;
  const now=Date.now();if(!final&&now-s.lastUpdate<50)return;s.lastUpdate=now;s.lastSeen=now;s.sequence=seq;
  try{
   publish(s,pose,!final);if(!final)return;
   store.save(s.object,pose,false,s.source);

   const game=s.object.type==='ped'?null:hooks.commit(s.object,{x,y,z,h:norm(h)}),line='['+[x,y,z,norm(h)].map(n=>(Math.abs(n)<.0005?0:n).toFixed(3)).join(', ')+']';
   console.log('[PLACER] '+p.name+' | '+s.model.name+' | dimension='+s.dimension+' | '+line);message(p,line);
   close(p,game?'Стол подключён к игре '+game+': дилер и места обновлены.':'Объект сохранён на диск.',true);
  }catch(error){close(p,'Ошибка редактирования: '+error.message);}
 }
 mp.events.add('server:placer:update',(p,id,seq,x,y,z,h)=>accept(p,id,seq,x,y,z,h,false));
 mp.events.add('server:placer:finish',(p,id,seq,x,y,z,h)=>accept(p,id,seq,x,y,z,h,true));
 mp.events.add('server:placer:cancel',(p,id)=>{const s=sessions.get(p);if(s&&s.token===id&&allowed(p))close(p,'Редактирование отменено; исходный объект восстановлен.');});
 mp.events.add('server:placer:delete',(p,id)=>{const s=sessions.get(p);if(s&&s.token===id&&active(p,s)&&s.phase==='editing'&&access.hasPermission(p,'object.delete'))close(p,'Объект удалён.',false,true);});
 mp.events.add('server:placer:pulse',(p,id)=>{const s=sessions.get(p);if(s&&s.token===id&&active(p,s)&&s.phase==='picking')s.lastSeen=Date.now();});
 for(const e of ['playerQuit','playerDeath','playerEnterVehicle'])mp.events.add(e,p=>close(p));
 const timer=setInterval(()=>{const now=Date.now();for(const[p,s]of sessions)if(!active(p,s)||now-s.started>1800000||now-s.lastSeen>(s.phase==='picking'?120000:20000))close(p,'Редактор закрыт по тайм-ауту.');},1000);if(timer.unref)timer.unref();
 store.restore(hooks,masks);
 return command;
};
