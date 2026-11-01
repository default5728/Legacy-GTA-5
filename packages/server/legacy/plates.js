'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),access=require('./access'),db=require('./connection'),items=require('../kepler-legacy-items');
module.exports=function(send){
 const file=path.resolve(__dirname,'../../../data/legacy-plates.json');
 let data={version:1,owners:{},assignments:{}};
 if(fs.existsSync(file)){data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!data.owners||!data.assignments)throw Error('Invalid legacy plates data');}
 const prices={'01':1500,'50':2000,'77':6000,'97':4500};
 const sessions=new Map(),cooldown=new WeakMap(),regions=['01','50','77','97'];
 const textureReports=new WeakMap();
 mp.events.add('legacy:plates:textureError',(p,message)=>{try{access.assertPlayer(p);const now=Date.now();if(now-(textureReports.get(p)||0)<30000)return;textureReports.set(p,now);console.warn('[PLATE TEXTURE] CID '+p.static+' '+String(message).replace(/[\r\n]/g,' ').slice(0,160));}catch(_){}});
 const flush=()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);};
 const identify=p=>{const id=access.assertPlayer(p);if(p.health<=0||p.getVariable('dead')===true||p.getVariable('isDead')===true)throw Error('Действие недоступно в состоянии смерти.');return id.characterId;};
 function near(p){return mp.peds.toArray().some(n=>n.dimension===p.dimension&&n.getVariable('legacyService')==='plates'&&!String(n.getVariable('objectPlacer')||'').includes('"editing":true')&&Math.hypot(n.position.x-p.position.x,n.position.y-p.position.y,n.position.z-p.position.z)<3);}
 function vehicle(p,id){const v=mp.vehicles.at(Number(id));if(!v||!mp.vehicles.exists(v)||v.dimension!==p.dimension||Math.hypot(v.position.x-p.position.x,v.position.y-p.position.y,v.position.z-p.position.z)>5)throw Error('Подойдите к автомобилю.');
  if(v.getVariable('rent')||v.getVariable('fractioncar')||v.getVariable('familyGarage')||Number(v.getVariable('owner'))!==Number(p.static))throw Error('Установка доступна владельцу личного автомобиля.');return v;}
 const key=v=>String(v.getVariable('owner'))+':'+String(v.getVariable('carId')||v.getVariable('carModel')||v.model);
 const native=plate=>plate.replace(/[АВЕКМНОРСТУХ]/g,c=>({'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','У':'Y','Х':'X'})[c]);
 function tokenItem(plate){return items.encode({id:'plate:'+plate,type:'license_plate',name:'Номерной знак '+plate,plate,count:1,weight:.1});}
 function importInventory(p,cid){
  if(!Array.isArray(p.inventory)||p._loadingInventory||p._bagInstDeferLoadPending)return false;
  const clean=data.consumedMigration||(data.consumedMigration={});if(!clean[cid]){const installed=Object.entries(data.assignments).filter(([k])=>k.startsWith(String(p.static)+':')).map(([,v])=>v);let removed=false;p.inventory=p.inventory.map(raw=>{const item=items.decode(raw);if(item&&item.type==='license_plate'&&installed.includes(item.plate)){removed=true;return null;}return raw;});if(removed)global.saveInventory(p);clean[cid]=true;flush();}
  const markers=data.inventoryImported||(data.inventoryImported={}),done=markers[cid]||(markers[cid]=[]);let changed=false;
  for(const plate of data.owners[cid]||[]){if(done.includes(plate))continue;
   const has=p.inventory.some(raw=>{const item=items.decode(raw);return item&&item.type==='license_plate'&&item.plate===plate;});
   if(!has&&!(typeof global.invGridTryPush==='function'&&global.invGridTryPush(p,tokenItem(plate))))continue;
   done.push(plate);changed=true;
  }
  if(changed){global.saveInventory(p);flush();if(global.emitPlayerInventory)global.emitPlayerInventory(p);}return true;
 }
 function payload(p,s,responseTo,error=''){return{session:s.token,revision:s.revision,plate:(!s.digitsRolled&&!s.lettersRolled)?'':s.plate.slice(0,6).split('').map((c,i)=>(i>0&&i<4?s.digitsRolled:s.lettersRolled)?c:' ').join(''),region:s.region,regions:regions.map(id=>({id,label:id,cost:prices[id]})),cost:prices[s.region],cash:Number(p.money)||0,bank:Number(p.getVariable('bank'))||0,canSave:s.rolled,responseTo,error};}
 function reply(p,s,request,error){p.call('client:plates:data',[JSON.stringify(payload(p,s,request,error))]);}
 async function charge(p,s,payment){
  if(!['cash','bank'].includes(payment))throw Error('Выберите наличные или карту.');
  const id=access.assertPlayer(p),cost=prices[s.region];
  const balance=await db.transaction(async tx=>{
   const row=(await tx.query('SELECT money,bank FROM accounts WHERE kepler_character_id=? AND kepler_account_id=? FOR UPDATE',[id.characterId,id.accountId])).rows[0];if(!row)throw Error('Персонаж недоступен.');
   const cash=Number(row.money)||0,bank=Number(row.bank)||0;if(!Number.isSafeInteger(cash)||!Number.isSafeInteger(bank))throw Error('Ошибка баланса.');
   if((payment==='cash'?cash:bank)<cost)throw Error(payment==='cash'?'Недостаточно наличных.':'Недостаточно денег на карте.');
   const next={cash:cash-(payment==='cash'?cost:0),bank:bank-(payment==='bank'?cost:0)};
   await tx.query('UPDATE accounts SET money=?,bank=? WHERE kepler_character_id=? AND kepler_account_id=?',[next.cash,next.bank,id.characterId,id.accountId]);
   await tx.query('INSERT INTO economy_ledger(character_id,account_id,cash_delta,bank_delta,chips_delta,reason,created_at) VALUES(?,?,?,?,?,?,?)',[id.characterId,id.accountId,next.cash-cash,next.bank-bank,0,'plates:roll:'+s.region,Date.now()]);
   if(sessions.get(p)!==s||identify(p)!==s.cid||!near(p)||p.vehicle)throw Error('Взаимодействие прервано.');return next;
  });
  if(mp.players.exists(p)&&p._legacyCharacterId===id.characterId)require('./economy').sync(p,id,balance);
 }
 mp.events.add('server:plates:open',p=>{try{const cid=identify(p);importInventory(p,cid);if(p.vehicle||p.health<=0||!near(p))return;const s={cid,token:crypto.randomBytes(16).toString('hex'),region:'77',plate:'      77',revision:0,rolled:false,digitsRolled:false,lettersRolled:false,at:0};sessions.set(p,s);p.call('client:plates:open',[JSON.stringify(payload(p,s))]);}catch(e){send(p,e.message);}});
 mp.events.add('server:plates:action',async(p,token,request,action,payment,revision,region)=>{let locked=null;try{
  const cid=identify(p),s=sessions.get(p);if(!s||s.cid!==cid||token!==s.token||!near(p)||p.vehicle||p.health<=0)return;
  if(s.busy)return;
  if(typeof request!=='string'||request.length>100||revision!==s.revision)return reply(p,s,request,'Данные обновились. Повторите действие.');
  if(Date.now()-s.at<350)return reply(p,s,request,'Подождите перед следующим действием.');s.at=Date.now();s.busy=true;locked=s;
  if(action==='region'){if(!regions.includes(region))return;s.region=region;s.plate=s.plate.slice(0,6)+region;s.rolled=false;s.digitsRolled=false;s.lettersRolled=false;}
  else if(action==='save'){
   if(!s.rolled)return reply(p,s,request,'Сначала прокрутите буквы и цифры.');const owned=data.owners[cid]||(data.owners[cid]=[]);if(owned.length>=100)return reply(p,s,request,'Лимит: 100 номеров.');
   if(Object.values(data.owners).some(list=>list.includes(s.plate)))return reply(p,s,request,'Этот номер уже выдан. Прокрутите ещё раз.');
   if(p._loadingInventory||p._bagInstDeferLoadPending||!Array.isArray(p.inventory))return reply(p,s,request,'Дождитесь загрузки инвентаря.');
   const raw=tokenItem(s.plate);if(!global.invGridTryPush(p,raw))return reply(p,s,request,'Освободите место в инвентаре.');
   owned.push(s.plate);try{flush();global.saveInventory(p);(data.inventoryImported||(data.inventoryImported={}))[cid]=[...new Set([...(data.inventoryImported[cid]||[]),s.plate])];flush();if(global.emitPlayerInventory)global.emitPlayerInventory(p);}catch(e){owned.pop();const i=p.inventory.indexOf(raw);if(i>=0)p.inventory[i]=null;throw e;}sessions.delete(p);p.call('client:plates:saved',[s.plate]);return;
  }else if(action==='digits'||action==='letters'){
   const alphabet='АВЕКМНОРСТУХ';let plate;
   do{const letters=Array.from({length:3},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');plate=action==='digits'?s.plate[0]+String(crypto.randomInt(100,1000))+s.plate.slice(4,6)+s.region:letters[0]+s.plate.slice(1,4)+letters.slice(1)+s.region;}while(plate===s.plate||['АМР','СКР','ЕКХ','ФСО'].includes(plate[0]+plate.slice(4,6)));
   await charge(p,s,payment);s.plate=plate;if(action==='digits')s.digitsRolled=true;else s.lettersRolled=true;s.rolled=s.digitsRolled&&s.lettersRolled;
  }else return;
  s.revision++;reply(p,s,request);
 }catch(e){const s=sessions.get(p);if(s)reply(p,s,request,e.message);else send(p,e.message);}finally{if(locked)locked.busy=false;}});
 mp.events.add('server:plates:refresh',(p,token,request)=>{const s=sessions.get(p);if(s&&s.token===token&&near(p))reply(p,s,request);});
 mp.events.add('server:plates:choose',(p,id)=>{try{const cid=identify(p);importInventory(p,cid);if(Date.now()-(cooldown.get(p)||0)<500)return;cooldown.set(p,Date.now());vehicle(p,id);const plates=(p.inventory||[]).map(items.decode).filter(item=>item&&item.type==='license_plate'&&(data.owners[cid]||[]).includes(item.plate)).map(item=>item.plate);const installed=data.assignments[key(vehicle(p,id))]||null;if(!plates.length&&!installed)return send(p,'Сначала получите номер у NPC генератора.');p.call('legacy:plates:choose',[Number(id),JSON.stringify({plates,installed})]);}catch(e){send(p,e.message);}});
 function transfer(p,id,plate,remove=false){try{
  const cid=identify(p),v=vehicle(p,id),k=key(v),old=data.assignments[k];if(!Array.isArray(p.inventory)||p._loadingInventory)throw Error('Дождитесь инвентаря.');
  const before=p.inventory.slice();
  if(remove){if(!old)throw Error('На машине нет установленного номера.');if(!global.invGridTryPush(p,tokenItem(old)))throw Error('Освободите место в инвентаре.');data.assignments[k]='';}
  else{
   const index=p.inventory.findIndex(raw=>{const item=items.decode(raw);return item&&item.type==='license_plate'&&item.plate===plate;});
   if(index<0||!(data.owners[cid]||[]).includes(plate))throw Error('У вас нет этого номера.');
   if(Object.entries(data.assignments).some(([a,b])=>a!==k&&b===plate))throw Error('Номер уже установлен на другой машине.');
   p.inventory[index]=old?tokenItem(old):null;data.assignments[k]=plate;
  }
  try{flush();global.saveInventory(p);}catch(e){p.inventory=before;if(old!==undefined)data.assignments[k]=old;else delete data.assignments[k];throw e;}
  if(global.emitPlayerInventory)global.emitPlayerInventory(p);v.numberPlate=remove?' ':native(plate);v.setVariable('legacyPlateVisual',remove?'':plate);send(p,remove?'Номер снят и возвращён в инвентарь.':'Установлен номер '+plate+'.');
 }catch(e){send(p,e.message);}}
 mp.events.add('server:plates:install',(p,id,plate)=>transfer(p,id,plate));
 mp.events.add('server:plates:remove',(p,id)=>transfer(p,id,null,true));
 // Personal garages identify cars by carId, falling back to owner/model as in vehicle_trunk.
 const timer=setInterval(()=>{for(const p of mp.players.toArray()){try{const cid=identify(p);importInventory(p,cid);}catch(_){}}for(const v of mp.vehicles.toArray()){const plate=data.assignments[key(v)];if(typeof plate==='string'&&Number(v.getVariable('owner'))>0&&!v.getVariable('rent')&&!v.getVariable('fractioncar')&&!v.getVariable('familyGarage')){const text=plate?native(plate):' ';if(v.numberPlate!==text)v.numberPlate=text;if(v.getVariable('legacyPlateVisual')!==plate)v.setVariable('legacyPlateVisual',plate);}}},2000);if(timer.unref)timer.unref();
 for(const event of ['playerQuit','playerDeath','server:plates:close'])mp.events.add(event,p=>sessions.delete(p));
};
