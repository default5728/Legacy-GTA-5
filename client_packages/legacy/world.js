'use strict';
const rooms=require('./shared/world-interiors.json');
const locations=require('./shared/world-locations.json'),peds=new Map(),blips=new Map();
const sprites={shop:52,clothing:73,barber:71,tattoo:75,bank:108,atm:277,post:478,dealership:225,school:498,service:72,house:40};
let mapInitialized=false;
let houseOwners=null,ownHouses=new Set();
const models={shop:'mp_m_shopkeep_01',clothing:'s_f_m_shop_low',barber:'s_f_m_fembarber',tattoo:'u_m_y_tattoo_01',bank:'s_m_m_highsec_01',post:'s_m_m_postal_01',dealership:'s_m_m_autoshop_01',school:'ig_paper',service:'s_m_m_autoshop_01'};
let target=null,browser=null,payload=null,houseInside=false,exam=null,checkpoint=null,routeBlip=null,lastRequest=0,publicRoom=null;
function blocked(){const p=mp.players.local;return !global.isPlayerSpawned||p.getVariable('auth')!==true||p.getVariable('dead')===true||mp.gui.cursor.visible||mp.game.ui.isPauseMenuActive()||global.__chatInputOpen||global.__cefTextInputOpen;}
function close(){if(browser&&mp.browsers.exists(browser))browser.active=false;global.isWorldServiceOpen=false;mp.gui.cursor.show(false,false);payload=null;}
global.closeLegacyWorldService=close;
function display(){if(browser&&payload)browser.execute('window.WorldUI&&WorldUI.show('+JSON.stringify(payload)+');');}
mp.events.add('browserDomReady',b=>{if(b===browser)display();});
mp.events.add('legacy:world:panel',raw=>{try{payload=JSON.parse(raw);if(!browser||!mp.browsers.exists(browser)){browser=mp.browsers.new('package://legacy/world-ui/index.html');browser.orderId=1400;}browser.active=true;global.isWorldServiceOpen=true;mp.gui.cursor.show(true,true);display();}catch(_){close();}});
mp.events.add('legacy:world:notice',message=>{if(browser&&browser.active)browser.execute('window.WorldUI&&WorldUI.notice('+JSON.stringify(String(message))+');');});
mp.events.add('legacy:world:close',close);mp.events.add('legacy:world:close:c',close);
mp.events.add('legacy:world:action:c',(id,action,raw)=>{if(browser&&browser.active&&payload&&payload.id===id)mp.events.callRemote('legacy:world:action',id,action,raw);});
function updateHouseBlips(){if(!houseOwners)return;for(const row of locations){if(row.type!=='house')continue;const mine=ownHouses.has(row.id),visible=!houseOwners[row.id]||mine;let blip=blips.get(row.id);if(!visible){if(blip)blip.destroy();blips.delete(row.id);continue;}if(!blip){blip=mp.blips.new(40,new mp.Vector3(...row.pos),{name:mine?'Ваш дом №'+row.id.split('-')[1]:'Дом №'+row.id.split('-')[1],color:mine?0:2,shortRange:!mine,scale:mine?.8:.45});blips.set(row.id,blip);}blip.color=mine?0:2;}}
mp.events.add('legacy:world:owners',raw=>{try{const state=JSON.parse(raw);const nextMine=new Set(state.mine||[]);for(const row of locations)if(row.type==='house'&&ownHouses.has(row.id)!==nextMine.has(row.id)){const old=blips.get(row.id);if(old)old.destroy();blips.delete(row.id);}houseOwners=state.owners||{};ownHouses=nextMine;updateHouseBlips();}catch(_){}});
mp.events.add('legacy:world:business',type=>{if(type==='post')mp.events.call('moonvito:open:CLIENT');else if(type==='dealership')mp.events.call('legacy:world:dealership');else if(type==='clothing'){if(typeof global.requestFlowClothesShopEntry==='function')global.requestFlowClothesShopEntry('regular');}else mp.events.call('legacy:world:'+type);});
function cleanupExam(){if(checkpoint){checkpoint.destroy();checkpoint=null;}if(routeBlip){routeBlip.destroy();routeBlip=null;}}
mp.events.add('legacy:world:exam',raw=>{cleanupExam();try{exam=JSON.parse(raw);if(exam.done){exam=null;return;}const pos=new mp.Vector3(...exam.point);checkpoint=mp.checkpoints.new(1,pos,8,{direction:pos,color:[235,235,240,150],visible:true,dimension:mp.players.local.dimension});routeBlip=mp.blips.new(1,pos,{name:'Экзамен '+exam.index+'/'+exam.total,color:2,route:true});}catch(_){exam=null;}});
mp.events.add('legacy:world:housePrepare',()=>{
 mp.game.streaming.requestIpl('apa_v_mp_h_01_a');mp.game.streaming.requestCollisionAtCoord(-786.8663,315.7642,217.6385);
 let tries=0;const timer=setInterval(()=>{tries++;mp.game.streaming.requestCollisionAtCoord(-786.8663,315.7642,217.6385);if(mp.game.streaming.isIplActive('apa_v_mp_h_01_a')){clearInterval(timer);mp.events.callRemote('legacy:world:houseReady');}else if(tries>50){clearInterval(timer);mp.events.call('client:chat:message','Интерьер не загрузился. Повторите вход.');}},100);
});
mp.events.add('legacy:world:roomPrepare',type=>{const room=rooms[type];if(!room)return;mp.game.streaming.requestIpl(room.ipl);let attempts=0;const timer=setInterval(()=>{mp.game.streaming.requestCollisionAtCoord(...room.pos);if(mp.game.streaming.isIplActive(room.ipl)){clearInterval(timer);mp.events.callRemote('legacy:world:roomReady');}else if(++attempts>=50){clearInterval(timer);mp.events.call('client:chat:message','Интерьер не загрузился. Повторите вход.');}},100);});
mp.events.add('legacy:world:roomInside',id=>publicRoom=locations.find(row=>row.id===id)||null);
global.bindGameplayKey(0x48,true,()=>{if(publicRoom&&!blocked())mp.events.callRemote('legacy:world:roomExit');});
mp.events.add('legacy:world:houseInside',value=>houseInside=!!value);
global.isWorldNpcNearby=()=>!!target;
global.bindGameplayKey(0x45,true,()=>{if(blocked())return;if(publicRoom){mp.game.graphics.drawText('[E] '+publicRoom.name+'   ·   [H] Выйти',[.5,.85],{font:4,scale:[.35,.35],color:[240,240,244,230],outline:true,centre:true});return;}if(houseInside){mp.events.callRemote('legacy:world:houseExit');return;}if(publicRoom){mp.events.callRemote('legacy:world:open',publicRoom.id);return;}if(!target)return;mp.events.callRemote('legacy:world:open',target.id);});
global.bindGameplayKey(0x1B,true,()=>{if(global.isWorldServiceOpen)close();});
function freeze(ped){if(!ped||!ped.handle)return;try{ped.clearTasksImmediately();ped.setBlockingOfNonTemporaryEvents(true);ped.freezePosition(true);ped.setInvincible(true);ped.taskStandStill(-1);}catch(_){}}
function lookingAt(row){if(row.type==='house'||row.type==='service')return true;try{const camera=mp.game.cam.getGameplayCoord(),rotation=mp.game.cam.getGameplayCamRot(2),yaw=rotation.z*Math.PI/180,pitch=rotation.x*Math.PI/180,dx=row.pos[0]-camera.x,dy=row.pos[1]-camera.y,dz=row.pos[2]+.8-camera.z,length=Math.hypot(dx,dy,dz);return length>0&&(-Math.sin(yaw)*Math.cos(pitch)*dx+Math.cos(yaw)*Math.cos(pitch)*dy+Math.sin(pitch)*dz)/length>.88;}catch(_){return true;}}
setInterval(()=>{
 const p=mp.players.local;if(!global.isPlayerSpawned||p.getVariable('auth')!==true){target=null;publicRoom=null;houseInside=false;for(const entry of peds.values())if(entry.local&&mp.peds.exists(entry.ped))entry.ped.destroy();peds.clear();for(const blip of blips.values())blip.destroy();blips.clear();mapInitialized=false;houseOwners=null;ownHouses.clear();lastRequest=0;return;}
 if(Date.now()-lastRequest>30000){lastRequest=Date.now();mp.events.callRemote('legacy:world:request');}
 if(!mapInitialized){mapInitialized=true;for(const row of locations.filter(row=>row.type!=='house'&&row.enabled!==false))blips.set(row.id,mp.blips.new(sprites[row.type]||1,new mp.Vector3(...row.pos),{name:row.type==='house'?'Дом №'+row.id.split('-')[1]:row.name,color:row.type==='house'?2:row.type==='post'?47:0,shortRange:true,scale:row.type==='house'?.45:.65}));}
 target=null;const near=[];
 if(p.dimension===0)for(const row of locations){if(row.enabled===false)continue;const d=Math.hypot(p.position.x-row.pos[0],p.position.y-row.pos[1],p.position.z-row.pos[2]);if(d<70&&models[row.type])near.push({row,d});if(d<(row.type==='service'?4:3)&&lookingAt(row)&&(!p.vehicle||row.type==='service')&&(!target||d<target.d))target={...row,d};}
 const wanted=near.sort((a,b)=>a.d-b.d).slice(0,12),ids=new Set(wanted.map(r=>r.row.id));
 for(const [id,entry]of peds)if(!ids.has(id)){if(entry.local&&mp.peds.exists(entry.ped))entry.ped.destroy();peds.delete(id);}
 for(const {row}of wanted){if(peds.has(row.id))continue;let existing=null;mp.peds.forEachInStreamRange(n=>{if(n.position&&Math.hypot(n.position.x-row.pos[0],n.position.y-row.pos[1],n.position.z-row.pos[2])<1.3)existing=n;});if(existing){freeze(existing);peds.set(row.id,{ped:existing,local:false});continue;}try{const ped=mp.peds.new(mp.game.joaat(models[row.type]),new mp.Vector3(...row.pos),row.heading,0);freeze(ped);peds.set(row.id,{ped,local:true});}catch(_){}}
},500);
mp.events.add('render',()=>{if(blocked())return;if(publicRoom){mp.game.graphics.drawText('[E] '+publicRoom.name+'   ·   [H] Выйти',[.5,.85],{font:4,scale:[.35,.35],color:[240,240,244,230],outline:true,centre:true});return;}if(houseInside){mp.game.graphics.drawText('[E] Выйти из дома',[.5,.85],{font:4,scale:[.35,.35],color:[240,240,244,230],outline:true,centre:true});return;}if(!target)return;const r=target;mp.game.graphics.drawText((r.type==='house'?'Дом №'+r.id.split('-')[1]:r.name)+'\n[E] Взаимодействие',[r.pos[0],r.pos[1],r.pos[2]+1],{font:4,scale:[.3,.3],color:[240,240,244,235],outline:true,centre:true});});
mp.events.add('playerDeath',()=>{publicRoom=null;houseInside=false;cleanupExam();if(global.isWorldServiceOpen)close();});

mp.events.add('entityStreamIn',entity=>{for(const entry of peds.values())if(entry.ped===entity)freeze(entity);});

mp.events.add('legacy:world:locations',raw=>{try{const values=JSON.parse(raw);let changed=false;for(const row of values){const current=locations.find(r=>r.id===row.id);if(current&&JSON.stringify([current.pos,current.heading,current.enabled])!==JSON.stringify([row.pos,row.heading,row.enabled])){Object.assign(current,row);changed=true;}}if(changed){for(const entry of peds.values())if(entry.local&&mp.peds.exists(entry.ped))entry.ped.destroy();peds.clear();for(const blip of blips.values())blip.destroy();blips.clear();mapInitialized=false;target=null;updateHouseBlips();}}catch(_){}});
