'use strict';
const access=require('./access'),store=require('./staff-state'),policy=require('./staff-policy'),db=require('./database'),conn=require('./connection');
const rankPermissions=require('./rank-permissions');
const overrides=new Map(),prices=new Map(),cooldown=new WeakMap();
const commandPermissions={revive:'player.revive',res:'player.revive',heal:'player.heal',tp:'player.teleport',goto:'player.teleport',gethere:'player.teleport',tpwp:'waypoint',gotowp:'waypoint',veh:'vehicle.spawn',v:'vehicle.spawn',vehforce:'vehicle.spawn',findveh:'vehicle.spawn',vehcheck:'vehicle.spawn',delveh:'vehicle.spawn',noclip:'noclip',fly:'noclip',fix:'vehicle.repair',repair:'vehicle.repair',givemoney:'money.manage',takemoney:'money.manage',money:'money.manage',freeze:'player.freeze',unfreeze:'player.freeze',recon:'player.spectate',spec:'player.spectate',setadmin:'staff.manage',deladmin:'staff.manage',mute:'chat.mute',unmute:'chat.mute',reply:'reports.reply',reports:'reports.read'};
const editable=['flow.panel','reports.read','reports.reply','player.revive','player.heal','player.teleport','player.freeze','player.spectate','noclip','waypoint','vehicle.spawn','vehicle.repair','money.manage','chat.mute','chat.warn','player.kick','player.jail','player.ban.temporary','player.ban.permanent'];
global.legacyStaffPermission=(p,permission,base)=>{if(permission==='money.manage'&&Number(p.adminlvl)<8)return false;if(p._legacyAccountId===3||Number(p.adminlvl)>=9)return base;if(typeof global.legacyRankPermission==='function')base=global.legacyRankPermission(Number(p.adminlvl),permission,base);const value=overrides.get(p._legacyAccountId+':'+permission);return value===undefined||Number(p.adminlvl)<1?base:value;};
global.legacyCommandPermission=name=>commandPermissions[name]||global.legacyAdministration?.commandPermissions?.[name];
global.legacyPanelOnlyCommand=name=>!!global.legacyCommandPermission(name)||['arank','aranks','ahelp','kill','killaccess'].includes(name);
const observedPrices=new Map();const priorEntries=global.legacyPriceEntries;global.legacyPriceEntries=()=>[...(priorEntries?.()||[]),...observedPrices.values()];
global.legacyPrice=(kind,key,fallback)=>{const value=prices.get(kind+':'+key)??fallback;if(Number.isSafeInteger(Number(value))&&Number(value)>=0)observedPrices.set(kind+':'+key,{business:kind,key:String(key),name:String(key),price:Number(value),currency:'$'});return value;};
global.legacyPriceRevision=0;
const ready=db.ready.then(async()=>{
 await conn.query('CREATE TABLE IF NOT EXISTS legacy_staff_permissions (account_id BIGINT NOT NULL,permission VARCHAR(80) NOT NULL,enabled TINYINT NOT NULL,updated_by BIGINT NOT NULL,PRIMARY KEY(account_id,permission))');
 await conn.query('CREATE TABLE IF NOT EXISTS legacy_business_prices (business VARCHAR(40) NOT NULL,item VARCHAR(80) NOT NULL,price BIGINT NOT NULL,updated_by BIGINT NOT NULL,PRIMARY KEY(business,item))');
 for(const r of (await conn.query('SELECT * FROM legacy_staff_permissions')).rows)overrides.set(Number(r.account_id)+':'+r.permission,!!Number(r.enabled));
 for(const r of (await conn.query('SELECT * FROM legacy_business_prices')).rows){prices.set(r.business+':'+r.item,Number(r.price));if(r.business==='autosalon'&&global.AUTOSALON_CATALOG&&r.item in global.AUTOSALON_CATALOG)global.AUTOSALON_CATALOG[r.item]=Number(r.price);}
 console.log('[LEGACY PANEL] Permissions and business prices ready');
});ready.catch(e=>console.error('[LEGACY PANEL]',e.message));
function send(p,data){if(mp.players.exists(p))p.call('legacy:panel:state',[JSON.stringify(data)]);}
function valid(p,permission){const id=access.assertPlayer(p);if(Number(p.adminlvl)<1)throw Error('Нет административного доступа.');if(permission&&!access.hasPermission(p,permission))throw Error('Недостаточно прав: '+permission);if(global.adminSessionIsGated(p)&&!p._adminSession)throw Error('Войдите в админ-сессию.');return id;}
function cid(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw Error('Укажите CID.');return n;}
function account(value){return conn.query('SELECT static,kepler_account_id,kepler_display_name,login,adminlvl FROM accounts WHERE static=? AND char_created=1 LIMIT 1',[cid(value)]).then(r=>{if(!r.rows[0])throw Error('Игрок не найден.');return r.rows[0];});}
function checkIdentity(p,id){const now=access.assertPlayer(p);if(now.accountId!==id.accountId||now.characterId!==id.characterId)throw Error('Сессия изменилась.');}
function commands(p){
 const lv=Number(p.adminlvl)||0,out=new Map(),registry=global._registeredChatCommands;
 for(const row of global.ADMIN_CMD_HINTS_LIST||[]){const name=String(row.cmd||'').replace(/^\//,'');if(!name||!registry?.has(name)||(Number(row.minLvl)||1)>lv||(['logadmin','exitadmin','arep','makeadmin','setadmin','deladmin'].includes(name)||(name==='killaccess'&&p._legacyAccountId!==3)))continue;if(row.allowedStatics?.length&&!row.allowedStatics.includes(Number(p.static)))continue;const permission=global.legacyCommandPermission(name);if(permission&&!access.hasPermission(p,permission))continue;out.set(name,{name,description:row.desc});}
 for(const [name,permission]of Object.entries(commandPermissions))if(!['setadmin','deladmin'].includes(name)&&registry?.has(name)&&access.hasPermission(p,permission)&&!out.has(name))out.set(name,{name,description:name});
 for(const row of global.legacyAdministration?.catalogue?.(p)||[])if(!['setadmin','deladmin'].includes(row.name)&&registry?.has(row.name))out.set(row.name,row);
 for(const [name,description]of Object.entries({kill:'Убить игрока: ID (нужен личный доступ)',killaccess:'Доступ к kill: CID on|off'}))if(registry?.has(name)&&(name==='kill'||p._legacyAccountId===3))out.set(name,{name,description});
 return [...out.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function priceRows(){const rows=[];for(const entry of global.legacyPriceEntries?.()||[])rows.push(entry);for(const [key,price]of Object.entries(global.AUTOSALON_CATALOG||{}))rows.push({business:'autosalon',key,name:key,price,currency:global.LEGACY_AUTOSALON_DP_MODELS?.has(key)?'DP':'$'});const base=require('../config/clothing_economy').REGULAR_CASH_BY_CLOTH_ID;const names={0:'Прочее',1:'Головные уборы',2:'Маски',3:'Верх',4:'Брюки',5:'Обувь',6:'Аксессуары',7:'Очки',8:'Рюкзаки',12:'Серьги',13:'Часы',14:'Браслеты',15:'Перчатки'};for(const [key,price]of Object.entries(base))rows.push({business:'clothing',key,name:names[key]||key,price:global.legacyPrice('clothing',key,price),currency:'$'});for(const [combined,price]of prices){const split=combined.indexOf(':');rows.push({business:combined.slice(0,split),key:combined.slice(split+1),name:combined.slice(split+1),price,currency:'$'});}const unique=new Map();for(const row of rows)unique.set(row.business+':'+row.key,{...row,price:global.legacyPrice(row.business,String(row.key),row.price)});return [...unique.values()];}
function syncPrices(p){p.call('legacy:prices:sync',[JSON.stringify({autosalon:global.AUTOSALON_CATALOG||{}})]);}
function snapshot(p){const locked=global.adminSessionIsGated(p)&&!p._adminSession;send(p,{type:'overview',locked,gated:global.adminSessionIsGated(p),level:Number(p.adminlvl),roles:policy.roles.map(r=>({level:r.level,name:r.name})),commands:locked?[]:commands(p),prices:!locked&&access.hasPermission(p,'settings.manage')?priceRows():[],canStaff:!locked&&access.hasPermission(p,'staff.manage'),canPrices:!locked&&access.hasPermission(p,'settings.manage')});if(!locked&&access.hasPermission(p,'reports.read'))for(const [key,th]of Object.entries(global.reportThreads||{}))p.call('adminPanel:addReportPayload',[global.buildAdminReportPayload(Number(key),th.login,th.messages?.slice(-1)[0]?.text||'',false)]);}
global.refreshLegacyPanelState=p=>{if(p.getVariable('amenu')===true)snapshot(p);};
mp.events.add('legacy:prices:request',async p=>{try{await ready;access.assertPlayer(p);syncPrices(p);}catch(_){}});
async function panelAction(p,raw,fromChat=false){
 const reply=data=>{send(p,data);if(fromChat&&data.text){if(typeof global.pushChatLineToPlayer==='function')global.pushChatLineToPlayer(p,String(data.text));else p.call('client:chat:message',[String(data.text)]);}};
 try{
  await ready;const id=access.assertPlayer(p);if(Number(p.adminlvl)<1)throw Error('Нет административного доступа.');
  if(typeof raw!=='string'||raw.length>4000)return;const data=JSON.parse(raw),action=data.action;
  if(action==='load'){if(!global.adminSessionIsGated(p)||p._adminSession)valid(p,'flow.panel');p.setVariable('amenu',true);snapshot(p);return;}
  if(action==='login'){
   const now=Date.now();if(now-(cooldown.get(p)||0)<2000)throw Error('Повторите через 2 секунды.');cooldown.set(p,now);
   if(typeof data.password!=='string'||data.password.length<6||data.password.length>128)throw Error('Пароль: 6–128 символов.');
   if(!global.adminSessionIsGated(p))throw Error('Сессия уже активна.');global.legacyPanelPasswordLogin(p,data.password);return;
  }
  if(!fromChat&&p.getVariable('amenu')!==true)throw Error('Откройте админ-панель.');valid(p,'flow.panel');
  if(action==='pricesRefresh'){valid(p,'settings.manage');reply({type:'prices',rows:priceRows()});return;}
  if(action==='reportHistory'){reply({type:'reportHistory',rows:await require('./report-history').list(p)});return;}
  if(action==='rankPermissionsLoad'){await rankPermissions.ready;reply({type:'rankPermissions',rows:rankPermissions.snapshot(p)});return;}
  if(action==='rankPermission'){await rankPermissions.change(p,Number(data.level),data.permission,data.enabled);reply({type:'rankPermissions',rows:rankPermissions.snapshot(p)});return;}
  if(action==='logout'){if(global.adminSessionIsGated(p)){p._adminSession=false;global.syncAdminSessionClient(p);}return;}
  if(action==='staffLoad'||action==='rank'||action==='permission'){
   valid(p,'staff.manage');const row=await account(data.cid);checkIdentity(p,id);valid(p,'staff.manage');
   if(action!=='staffLoad'&&(Number(row.adminlvl)>=Number(p.adminlvl)||Number(row.kepler_account_id)===id.accountId))throw Error('Нельзя менять себя или равного/старшего администратора.');
   if(action==='rank'){const level=Number(data.level);if(!Number.isInteger(level)||level<0||level>9||level>=Number(p.adminlvl))throw Error('Недоступный ранг.');await store.setRank(id.accountId,Number(row.kepler_account_id),level);row.adminlvl=level;}
   if(action==='permission'){
    if(!editable.includes(data.permission)||!['allow','deny','default'].includes(data.value))throw Error('Неверное разрешение.');
    if(data.value==='allow'&&(!access.hasPermission(p,data.permission)||(data.permission==='money.manage'&&Number(row.adminlvl)<8)))throw Error('Нельзя передать это право по текущим рангам.');
    await conn.transaction(async tx=>{checkIdentity(p,id);valid(p,'staff.manage');const locked=(await tx.query('SELECT adminlvl FROM accounts WHERE kepler_account_id=? FOR UPDATE',[row.kepler_account_id])).rows[0];if(!locked||Number(locked.adminlvl)>=Number(p.adminlvl))throw Error('Ранг цели изменился.');await tx.query('DELETE FROM legacy_staff_permissions WHERE account_id=? AND permission=?',[row.kepler_account_id,data.permission]);if(data.value!=='default')await tx.query('INSERT INTO legacy_staff_permissions VALUES(?,?,?,?)',[row.kepler_account_id,data.permission,data.value==='allow'?1:0,id.accountId]);await store.audit(tx,id.accountId,row.kepler_account_id,'staff.permission',{permission:data.permission,value:data.value});});
    const key=Number(row.kepler_account_id)+':'+data.permission;if(data.value==='default')overrides.delete(key);else overrides.set(key,data.value==='allow');
   }
   for(const target of mp.players.toArray())if(target._legacyAccountId===Number(row.kepler_account_id)){global.syncAdminSessionClient(target);if(global.legacyAdministration)global.legacyAdministration.refresh(target);}
   const permissions=editable.map(permission=>({permission,inherited:policy.has(Number(row.adminlvl),permission),value:overrides.has(Number(row.kepler_account_id)+':'+permission)?overrides.get(Number(row.kepler_account_id)+':'+permission)?'allow':'deny':'default'}));
   reply({type:'staff',cid:row.static,name:row.kepler_display_name||row.login,level:Number(row.adminlvl),permissions});return;
  }
  if(action==='price'){
   valid(p,'settings.manage');const entry=priceRows().find(r=>r.business===data.business&&String(r.key)===String(data.key));const price=Number(data.price);if(!entry||!Number.isSafeInteger(price)||price<0||price>10000000000)throw Error('Цена: 0–10 000 000 000.');
   await conn.transaction(async tx=>{checkIdentity(p,id);valid(p,'settings.manage');await tx.query('INSERT INTO legacy_business_prices VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE price=VALUES(price),updated_by=VALUES(updated_by)',[entry.business,String(entry.key),price,id.accountId]);await store.audit(tx,id.accountId,null,'business.price',{...entry,price});});
   prices.set(entry.business+':'+entry.key,price);if(entry.business==='autosalon')global.AUTOSALON_CATALOG[entry.key]=price;global.legacyPriceRevision++;
   for(const target of mp.players.toArray())if(target.getVariable('auth')){syncPrices(target);if(target._clothesShopSession==='regular')global.openFlowClothesShopUi(target,'regular');}
   snapshot(p);reply({type:'notice',text:'Цена сохранена.'});return;
  }
  if(action==='reportTake'){
   valid(p,'reports.reply');const th=global.reportThreads?.[cid(data.cid)];if(!th)throw Error('Репорт уже закрыт.');if(th.assigned&&th.assigned!==id.accountId)throw Error('Репорт уже взят другим администратором.');th.assigned=id.accountId;th.assignedName=p.login||p.name;reply({type:'notice',text:'Репорт принят: CID '+data.cid});return;
  }
 }catch(e){reply({type:'error',text:String(e.message||e)});}
}
mp.events.add('legacy:panel:action',(p,raw)=>panelAction(p,raw));
mp.events.addCommand('adminaction',(p,text)=>panelAction(p,String(text||''),true));
mp.events.addCommand('setprice',(p,text)=>{const [business,key,value]=String(text||'').trim().split(/\s+/);return panelAction(p,JSON.stringify({action:'price',business,key,price:Number(value)}),true);});
mp.events.add('legacy:panel:execute',async(p,line)=>{
 try{await ready;valid(p,'flow.panel');if(p.getVariable('amenu')!==true||typeof line!=='string'||line.length>600)return;const parts=line.trim().replace(/^\//,'').split(/\s+/),name=parts.shift().toLowerCase();if(!commands(p).some(c=>c.name===name))throw Error('Действие недоступно по вашим правам.');const fn=global._registeredChatCommands?.get(name);if(!fn)throw Error('Действие не зарегистрировано.');p._legacyPanelDispatch=true;let task;try{task=fn(p,parts.join(' '),...parts);}finally{p._legacyPanelDispatch=false;}await task;send(p,{type:'notice',text:'Действие отправлено: '+name});}catch(e){send(p,{type:'error',text:e.message});}
});

mp.events.addCommand('rankpermission',async(p,text)=>{try{const [level,permission,mode]=String(text||'').trim().split(/\s+/);if(!['on','off'].includes(mode))throw Error('/rankpermission ранг право on|off');await rankPermissions.change(p,Number(level),permission,mode==='on');send(p,{type:'notice',text:'Право ранга сохранено.'});}catch(e){send(p,{type:'error',text:e.message});}});
