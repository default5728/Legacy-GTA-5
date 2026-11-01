'use strict';
const db=require('./connection'),access=require('./access'),economy=require('./economy'),items=require('../kepler-legacy-items');
const rooms=require('../../../client_packages/shared/world-interiors.json');
const locations=require('../../../client_packages/shared/world-locations.json'),byId=new Map(locations.map(r=>[r.id,r]));
const goods={burger:{name:'Бургер',price:250,weight:.3},water:{name:'Вода',price:120,weight:.5},chocolate:{name:'Шоколад',price:150,weight:.1},medkit:{name:'Аптечка',price:1500,weight:.8},repair:{name:'Ремонтный набор',price:2500,weight:2}};
const apartment={x:-786.8663,y:315.7642,z:217.6385},route=[[218,-1399,30.5],[270,-1412,29.4],[346,-1374,32.5],[299,-1288,29.5],[208,-1324,29.4],[218,-1399,30.5]];
module.exports=function(send){
 const beforeEntries=global.legacyPriceEntries;global.legacyPriceEntries=()=>[...(beforeEntries?.()||[]),...Object.entries(goods).map(([key,r])=>({business:'shop',key,name:r.name,price:r.price,currency:'$'})),...['repair','school'].map(key=>({business:'services',key,name:key==='repair'?'Ремонт':'Экзамен',price:1500,currency:'$'}))];
 global.syncLegacyWorldLocations=()=>{for(const p of mp.players.toArray())if(p.getVariable('auth')===true)p.call('legacy:world:locations',[JSON.stringify(locations)]);};
 global.registerLegacyCreatorService=(key,row)=>{const old=locations.findIndex(r=>r.id===key);if(old>=0)locations.splice(old,1);byId.delete(key);if(row){locations.push(row);byId.set(key,row);}};
 const owners=new Map(),busy=new WeakSet(),cooldown=new WeakMap(),sessions=new WeakMap(),inside=new Map(),exams=new Map(),publicRooms=new Map();
 const ready=new Promise(resolve=>global.whenDbReady(resolve)).then(async()=>{
  await db.query('CREATE TABLE IF NOT EXISTS legacy_world_houses (id VARCHAR(40) PRIMARY KEY,owner_account BIGINT NULL,owner_character BIGINT NULL,price BIGINT NOT NULL,purchased_at BIGINT NULL)');
  await db.query('CREATE TABLE IF NOT EXISTS legacy_world_licenses (character_id BIGINT PRIMARY KEY,issued_at BIGINT NOT NULL)');
  for(const r of locations.filter(r=>r.type==='house'))await db.query('INSERT IGNORE INTO legacy_world_houses(id,price) VALUES(?,?)',[r.id,r.price]);
  for(const r of (await db.query('SELECT id,owner_character FROM legacy_world_houses WHERE owner_character IS NOT NULL')).rows)owners.set(r.id,Number(r.owner_character));
  console.log('[WORLD SERVICES] '+locations.length+' locations, houses and driving licenses ready');
 });ready.catch(e=>console.error('[WORLD SERVICES INIT]',e.message));
 function same(p,id){const now=access.assertPlayer(p);if(now.accountId!==id.accountId||now.characterId!==id.characterId)throw Error('Сессия изменилась.');}
 function near(p,row,radius=4){access.assertPlayer(p);const session=publicRooms.get(p),room=session&&rooms[session.row.type];if(row&&session&&session.phase==='inside'&&session.row.id===row.id&&p.dimension===room.dimension&&Math.hypot(p.position.x-room.pos[0],p.position.y-room.pos[1],p.position.z-room.pos[2])<25)return true;return !!row&&row.enabled!==false&&p.dimension===0&&Math.hypot(p.position.x-row.pos[0],p.position.y-row.pos[1],p.position.z-row.pos[2])<radius;}
 function active(p,row){const id=access.assertPlayer(p);if(p.health<=0||p.getVariable('dead')===true||!near(p,row))throw Error('Подойдите к месту взаимодействия.');return id;}
 global.legacyWorldNear=(p,type)=>{const row=locations.find(r=>r.type===type&&near(p,r));if(!row)return false;if(!p._legacyWorldReturn)p._legacyWorldReturn={...p.position,h:p.heading,type};return true;};
 global.legacyWorldExit=p=>{const v=p._legacyWorldReturn;if(v){delete p._legacyWorldReturn;move(p,v,0);}return !!v;};
 function move(p,v,dimension){if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(p,v.x,v.y,v.z,{dimension,heading:v.h||0,reason:'world-service'});else{if(global.acAllowMovement)global.acAllowMovement(p,10000,'world-service');p.dimension=dimension;p.position=new mp.Vector3(v.x,v.y,v.z);p.heading=v.h||0;}}
 function sync(p){p.call('legacy:world:locations',[JSON.stringify(locations)]);p.call('legacy:world:owners',[JSON.stringify({owners:Object.fromEntries(Array.from(owners,([key])=>[key,true])),mine:Array.from(owners).filter(([,cid])=>cid===p._legacyCharacterId).map(([key])=>key)})]);}
 function panel(p,row){const id=active(p,row);sessions.set(p,{id:row.id,identity:id});p.call('legacy:world:panel',[JSON.stringify({id:row.id,type:row.type,name:row.type==='house'?'Дом №'+row.id.split('-')[1]:row.name,price:row.price,owned:owners.has(row.id),mine:owners.get(row.id)===id.characterId,goods:Object.entries(goods).map(([key,r])=>({key,...r,price:global.legacyPrice?global.legacyPrice('shop',key,r.price):r.price})),cash:Number(p.money)||0,bank:Number(p.getVariable('bank'))||0})]);}
 async function wallet(p,id,cost,payment,reason,extra){
  if(!['cash','bank'].includes(payment)||!Number.isSafeInteger(cost)||cost<0)throw Error('Неверная оплата.');
  const result=await db.transaction(async tx=>{
   const row=(await tx.query('SELECT money,bank FROM accounts WHERE kepler_character_id=? AND kepler_account_id=? FOR UPDATE',[id.characterId,id.accountId])).rows[0];
   if(!row)throw Error('Персонаж не найден.');same(p,id);
   const cash=Number(row.money),bank=Number(row.bank);if(![cash,bank].every(Number.isSafeInteger))throw Error('Некорректный баланс.');
   if((payment==='cash'?cash:bank)<cost)throw Error('Недостаточно средств.');
   const next={cash:cash-(payment==='cash'?cost:0),bank:bank-(payment==='bank'?cost:0)};
   if(extra)await extra(tx);same(p,id);
   await tx.query('UPDATE accounts SET money=?,bank=? WHERE kepler_character_id=? AND kepler_account_id=?',[next.cash,next.bank,id.characterId,id.accountId]);
   await tx.query('INSERT INTO economy_ledger(character_id,account_id,cash_delta,bank_delta,chips_delta,reason,created_at) VALUES(?,?,?,?,?,?,?)',[id.characterId,id.accountId,next.cash-cash,next.bank-bank,0,reason,Date.now()]);return next;
  });same(p,id);economy.sync(p,id,result);return result;
 }
 mp.events.add('legacy:world:request',async p=>{try{await ready;const id=access.assertPlayer(p);sync(p);const license=(await db.query('SELECT character_id FROM legacy_world_licenses WHERE character_id=?',[id.characterId])).rows.length;same(p,id);p.setVariable('drivingLicense',!!license);for(const key of ['satiety','thirst','mood'])if(typeof p.getVariable(key)!=='number')p.setVariable(key,100);}catch(e){console.warn('[WORLD REQUEST]',e.message);}});
 mp.events.add('legacy:world:open',async(p,key)=>{try{await ready;const row=byId.get(String(key));active(p,row);
  const pendingRoom=publicRooms.get(p);if(pendingRoom&&pendingRoom.phase==='loading'){if(pendingRoom.until>Date.now())return;publicRooms.delete(p);}
  if(rooms[row.type]&&!publicRooms.has(p)){if(p.vehicle)throw Error('Выйдите из автомобиля.');publicRooms.set(p,{row,id:access.assertPlayer(p),phase:'loading',until:Date.now()+20000});p.call('legacy:world:roomPrepare',[row.type]);return;}
  if(['barber','tattoo','clothing','dealership','post'].includes(row.type)){if(row.type!=='post')p._legacyWorldReturn={...p.position,h:p.heading,type:row.type};p.call('legacy:world:business',[row.type]);return;}
  panel(p,row);
 }catch(e){send(p,e.message);}});
 mp.events.add('legacy:world:action',async(p,key,action,raw)=>{
  if(busy.has(p))return;busy.add(p);
  try{await ready;const row=byId.get(String(key)),id=active(p,row),session=sessions.get(p);if(!session||session.id!==row.id||session.identity.characterId!==id.characterId)throw Error('Откройте меню заново.');
   const now=Date.now();if(now-(cooldown.get(p)||0)<600){const e=Error('Подождите немного.');e.retryMs=600-(now-(cooldown.get(p)||0));throw e;}cooldown.set(p,now);
   if(typeof raw!=='string'||raw.length>300)throw Error('Некорректный запрос.');const payload=JSON.parse(raw);
   if(action==='buy'&&row.type==='shop'){
    const good=Object.prototype.hasOwnProperty.call(goods,payload.item)?goods[payload.item]:null;if(!good)throw Error('Товар не найден.');if(p._loadingInventory||!Array.isArray(p.inventory))throw Error('Инвентарь загружается.');
    const snapshot=JSON.stringify(p.inventory),inventory=p.inventory.slice(),slot=inventory.findIndex(x=>!x);if(slot<0)throw Error('Инвентарь заполнен.');
    inventory[slot]=items.encode({id:'world:'+require('crypto').randomBytes(8).toString('hex'),type:payload.item,name:good.name,weight:good.weight,count:1});
    await wallet(p,id,global.legacyPrice?global.legacyPrice('shop',payload.item,good.price):good.price,payload.payment,'world:shop:'+row.id+':'+payload.item,async tx=>{if(JSON.stringify(p.inventory)!==snapshot)throw Error('Инвентарь изменился, повторите покупку.');await tx.query('UPDATE accounts SET inventory=? WHERE kepler_character_id=? AND kepler_account_id=?',[JSON.stringify(inventory),id.characterId,id.accountId]);});
    p.inventory=inventory;if(global.emitPlayerInventory)global.emitPlayerInventory(p);p.call('legacy:world:toast',['success',0]);panel(p,row);return;
   }
   if(action==='houseBuy'&&row.type==='house'){
    await wallet(p,id,row.price,payload.payment,'world:house:'+row.id,async tx=>{
     const house=(await tx.query('SELECT owner_character FROM legacy_world_houses WHERE id=? FOR UPDATE',[row.id])).rows[0];if(!house||house.owner_character!==null)throw Error('Дом уже куплен.');
     const count=(await tx.query('SELECT COUNT(*) AS n FROM legacy_world_houses WHERE owner_account=?',[id.accountId])).rows[0];if(Number(count.n)>=3)throw Error('Максимум три дома на аккаунт.');
     await tx.query('UPDATE legacy_world_houses SET owner_account=?,owner_character=?,purchased_at=? WHERE id=?',[id.accountId,id.characterId,Date.now(),row.id]);
    });owners.set(row.id,id.characterId);for(const other of mp.players.toArray())if(other.getVariable('auth')===true)sync(other);send(p,'Дом куплен.');panel(p,row);return;
   }
   if(action==='houseEnter'&&row.type==='house'){
    if(owners.get(row.id)!==id.characterId||p.vehicle)throw Error('Вход доступен владельцу пешком.');inside.set(p,{row,id,phase:'loading',until:now+20000});p.call('legacy:world:housePrepare');return;
   }
   if(action==='bank'&&['bank','atm'].includes(row.type)){
    const amount=Number(payload.amount);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000||!['deposit','withdraw'].includes(payload.mode))throw Error('Сумма: 1–1 000 000 000.');
    const result=await db.transaction(async tx=>{const r=(await tx.query('SELECT money,bank FROM accounts WHERE kepler_character_id=? AND kepler_account_id=? FOR UPDATE',[id.characterId,id.accountId])).rows[0];if(!r)throw Error('Персонаж не найден.');same(p,id);const sign=payload.mode==='deposit'?1:-1,cash=Number(r.money)-sign*amount,bank=Number(r.bank)+sign*amount;if(![cash,bank].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Недостаточно средств.');await tx.query('UPDATE accounts SET money=?,bank=? WHERE kepler_character_id=? AND kepler_account_id=?',[cash,bank,id.characterId,id.accountId]);await tx.query('INSERT INTO economy_ledger(character_id,account_id,cash_delta,bank_delta,chips_delta,reason,created_at) VALUES(?,?,?,?,?,?,?)',[id.characterId,id.accountId,-sign*amount,sign*amount,0,'world:bank:'+payload.mode,Date.now()]);return{cash,bank};});same(p,id);economy.sync(p,id,result);panel(p,row);return;
   }
   if(action==='repair'&&row.type==='service'){
    const v=p.vehicle;if(!v||p.seat!==0)throw Error('Подъедьте к мастеру на автомобиле.');await wallet(p,id,global.legacyPrice?global.legacyPrice('services','repair',1500):1500,payload.payment,'world:repair:'+row.id);if(p.vehicle===v&&mp.vehicles.exists(v))v.repair();send(p,'Автомобиль отремонтирован.');panel(p,row);return;
   }
   if(action==='schoolStart'&&row.type==='school'){
    if(exams.has(p)||p.vehicle)throw Error('Завершите предыдущий экзамен и выйдите из транспорта.');if(p.getVariable('drivingLicense')===true)throw Error('У вас уже есть водительское удостоверение.');
    const roomSession=publicRooms.get(p);if(roomSession){move(p,{x:row.pos[0],y:row.pos[1],z:row.pos[2],h:row.heading},0);publicRooms.delete(p);p.call('legacy:world:roomInside',['']);}
    const v=mp.vehicles.new(mp.joaat('blista'),new mp.Vector3(221.2,-1397.2,30.5),{heading:140,numberPlate:'LEARN',dimension:0,engine:true});if(!v)throw Error('Не удалось создать учебный автомобиль.');try{await wallet(p,id,global.legacyPrice?global.legacyPrice('services','school',1500):1500,payload.payment,'world:driving-exam');}catch(e){if(mp.vehicles.exists(v))v.destroy();throw e;}v.setVariable('legacySchoolCar',true);exams.set(p,{id,v,next:0,started:Date.now(),strikes:0,lastStrike:0,finishing:false});p.call('legacy:world:close');setTimeout(()=>{if(mp.players.exists(p)&&mp.vehicles.exists(v))p.putIntoVehicle(v,0);},300);p.call('legacy:world:exam',[JSON.stringify({point:route[0],index:1,total:route.length})]);return;
   }
   throw Error('Действие недоступно.');
  }catch(e){if(mp.players.exists(p)){if(e.retryMs){p.call('legacy:world:toast',['cooldown',e.retryMs]);p.call('legacy:world:notice',['']);}else{p.call('notify:client',[2,'top-mid',e.message,3000]);p.call('legacy:world:notice',[e.message]);}}}finally{busy.delete(p);}
 });
 mp.events.add('legacy:world:roomReady',p=>{try{const session=publicRooms.get(p);if(!session||session.phase!=='loading'||session.until<Date.now()||!near(p,session.row))throw Error('Вход отменён.');same(p,session.id);const room=rooms[session.row.type];session.phase='inside';move(p,{x:room.pos[0],y:room.pos[1],z:room.pos[2]},room.dimension);p.call('legacy:world:roomInside',[session.row.id]);if(session.row.type==='post')p.call('legacy:world:business',['post']);else panel(p,session.row);}catch(e){publicRooms.delete(p);send(p,e.message);}});
 mp.events.add('legacy:world:roomExit',p=>{try{const session=publicRooms.get(p);if(!session||session.phase!=='inside')return;same(p,session.id);const row=session.row;move(p,{x:row.pos[0],y:row.pos[1],z:row.pos[2],h:row.heading},0);publicRooms.delete(p);p.call('legacy:world:close');p.call('legacy:world:roomInside',['']);}catch(e){send(p,e.message);}});
 mp.events.add('legacy:world:houseReady',p=>{try{const s=inside.get(p);if(!s||s.phase!=='loading'||s.until<Date.now()||!near(p,s.row)||owners.get(s.row.id)!==s.id.characterId)throw Error('Вход отменён.');same(p,s.id);s.phase='inside';move(p,apartment,1100000+Number(s.row.id.split('-')[1]));p.call('legacy:world:close');p.call('legacy:world:houseInside',[true]);}catch(e){inside.delete(p);send(p,e.message);}});
 mp.events.add('legacy:world:houseExit',p=>{try{const s=inside.get(p);if(!s||s.phase!=='inside')return;same(p,s.id);move(p,{x:s.row.pos[0],y:s.row.pos[1],z:s.row.pos[2],h:s.row.heading},0);inside.delete(p);p.call('legacy:world:houseInside',[false]);}catch(e){send(p,e.message);}});
 function endExam(p,text){const exam=exams.get(p);exams.delete(p);if(exam&&mp.vehicles.exists(exam.v))exam.v.destroy();if(mp.players.exists(p)){p.call('legacy:world:exam',[JSON.stringify({done:true})]);send(p,text);}}
 const timer=setInterval(()=>{for(const [p,e]of exams){try{
  same(p,e.id);if(e.finishing)continue;if(!mp.vehicles.exists(e.v)||p.health<=0||Date.now()-e.started>600000){endExam(p,'Экзамен завершён без зачёта.');continue;}
  if(p.vehicle!==e.v||p.seat!==0)continue;const v=e.v.velocity||{x:0,y:0,z:0};if(Math.hypot(v.x,v.y,v.z)>28&&Date.now()-e.lastStrike>5000){e.strikes++;e.lastStrike=Date.now();send(p,'Превышение скорости. Ошибки: '+e.strikes+'/3');}if(e.strikes>=3){endExam(p,'Экзамен не сдан: превышение скорости.');continue;}
  const target=route[e.next];if(Math.hypot(p.position.x-target[0],p.position.y-target[1],p.position.z-target[2])>12)continue;
  e.next++;if(e.next<route.length){p.call('legacy:world:exam',[JSON.stringify({point:route[e.next],index:e.next+1,total:route.length})]);continue;}
  if(Date.now()-e.started<20000){endExam(p,'Экзамен не сдан: маршрут пройден некорректно.');continue;}e.finishing=true;db.query('INSERT IGNORE INTO legacy_world_licenses(character_id,issued_at) VALUES(?,?)',[e.id.characterId,Date.now()]).then(()=>{same(p,e.id);p.setVariable('drivingLicense',true);endExam(p,'Экзамен сдан. Водительское удостоверение сохранено.');}).catch(err=>{console.error('[DRIVING EXAM]',err.message);endExam(p,'Не удалось сохранить результат экзамена. Обратитесь в поддержку.');});
 }catch(_){endExam(p,'Экзамен прерван.');}}},1000);if(timer.unref)timer.unref();
 mp.events.add('playerQuit',p=>{publicRooms.delete(p);inside.delete(p);endExam(p,'Экзамен прерван.');});
 mp.events.add('playerDeath',p=>{publicRooms.delete(p);p.call('legacy:world:roomInside',['']);inside.delete(p);p.call('legacy:world:houseInside',[false]);if(exams.has(p))endExam(p,'Экзамен прерван.');});
 return {ready,near,owners,goods,locations};
};
