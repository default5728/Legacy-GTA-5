'use strict';
const bcrypt=require('bcryptjs');
const wardrobe=require('../../client_packages/clothing/profiles').wardrobe;
const pending=new WeakMap(), busy=new WeakSet(), loginTimes=new WeakMap();
const q=(sql,params=[])=>global.querydb(sql,params);
const exists=p=>p&&mp.players.exists(p);
const parse=(s,fallback={})=>{try{return typeof s==='string'?JSON.parse(s):s||fallback;}catch(_){return fallback;}};
const fail=(p,event,error)=>{if(exists(p))p.call(event,[String(error.message||error)]);};
const safeName=/^[A-Z][a-z]{1,19}$/;
function toAppearance(c){
 const p=c.parents||{},a=c.appearance||{};
 return {isMale:Number(c.gender)!==1,father:Number(p.father)||0,mother:Number(p.mother)||21,similarity:Number.isFinite(Number(p.similarity))?Number(p.similarity):.5,skin:Number.isFinite(Number(p.skinSimilarity))?Number(p.skinSimilarity):.5,features:Array.isArray(c.features)?c.features.slice(0,20):Array(20).fill(0),hair:{style:Number(c.hair)||0,color:Number(c.hairColor)||0,highlight:Number(c.hairColor)||0},eyeColor:Number(a.eyeColor)||0,beard:{style:Number(a.beard)||0,color:Number(a.beardColor)||0,opacity:1}};
}
function toCustomization(row){
 const a=parse(row.appearance_json),h=a.hair||{};
 return {parents:{father:a.father,mother:a.mother,similarity:a.similarity,skinSimilarity:a.skin},features:a.features||Array(20).fill(0),appearance:{eyeColor:a.eyeColor||0,beard:a.beard&&a.beard.style||0,beardColor:a.beard&&a.beard.color||0},hair:h.style||0,hair_color:h.color||0};
}
function cid(row){return Number(row.kepler_character_id)||Number(row.static);}
// Public IDs may be renumbered; legacy storage keys remain unchanged.
function publicCid(row){return Number(row.static);}
function character(row){
 const name=String(row.kepler_display_name||row.login).replace(/_/g,' ').split(/\s+/);
 return {id:publicCid(row),account_id:Number(row.kepler_account_id)||Number(row.static),first_name:name[0]||'Citizen',last_name:name.slice(1).join(' ')||'Kepler',gender:parse(row.appearance_json).isMale===false?1:0,cash:Number(row.money)||0,bank:Number(row.bank)||0,level:Math.max(1,Number(row.charlevel)||1),admin_level:Number(row.adminlvl)||0};
}
async function ensureIdentity(row){
 if(!row.kepler_account_id){await q('UPDATE accounts SET kepler_account_id=static WHERE static=? AND kepler_account_id IS NULL',[row.static]);row.kepler_account_id=row.static;}
 return row;
}
async function getRow(p,id){
 const state=pending.get(p);if(!exists(p)||!p.getVariable('auth')||!state||Number(id)!==publicCid(state.row))throw Error('Персонаж недоступен в этой сессии.');
 const rows=await q('SELECT * FROM accounts WHERE static=? LIMIT 1',[state.row.static]);if(!rows[0])throw Error('Персонаж не найден.');return rows[0];
}
function guarded(event,errorEvent,fn){mp.events.add(event,async(p,...args)=>{if(!exists(p)||busy.has(p))return;busy.add(p);try{await fn(p,...args);}catch(e){console.error('[KEPLER UI]',event,e.code||e.message);fail(p,errorEvent,e);}finally{busy.delete(p);}});}
async function prepareLogin(p,data){
 if(!data||typeof data.login!=='string'||typeof data.password!=='string'||data.login.length>191||data.password.length>128)throw Error('Неверный логин или пароль.');
 const now=Date.now(), previous=loginTimes.get(p)||0;if(now-previous<1500)throw Error('Повторите вход через пару секунд.');loginTimes.set(p,now);
 const value=data.login.trim(),normal=value.replace(/[_\s]+/g,' ');
 const rows=await q("SELECT * FROM accounts WHERE LOWER(login)=LOWER(?) OR LOWER(email)=LOWER(?) OR LOWER(kepler_display_name)=LOWER(?) ORDER BY static LIMIT 3",[value,value,normal]);
 if(rows.length!==1||!await bcrypt.compare(data.password,String(rows[0].password||'')))throw Error('Неверный логин или пароль.');
 let row=rows[0];if(!exists(p))throw Error('Сессия закрыта.');
 if(global.legacyAdministration){await global.legacyAdministration.ready;const block=global.legacyAdministrationState.blocked(Number(row.kepler_account_id)||Number(row.static));if(block)throw Error('Доступ закрыт: '+block.reason);}
 const duplicates=[];mp.players.forEach(other=>{if(other!==p&&other.getVariable('auth')&&Number(other.static)===Number(row.static))duplicates.push(other);});
 for(const other of duplicates){
  const social=String(p.rgscId||''),hardware=String(p.serial||'');
  if(!social||social==='0'||!hardware||social!==String(other.rgscId||'')||hardware!==String(other.serial||'')||String(p.ip)!==String(other.ip))throw Error('Этот аккаунт уже находится в игре.');
  if(global.flushPlayerStateBeforeKick)global.flushPlayerStateBeforeKick(other);
  other.kick('Сессия заменена подтверждённым повторным входом.');
 }
 if(duplicates.length){for(let n=0;n<40&&duplicates.some(other=>mp.players.exists(other));n++)await new Promise(resolve=>setTimeout(resolve,100));if(duplicates.some(other=>mp.players.exists(other)))throw Error('Предыдущая сессия закрывается. Повторите вход через несколько секунд.');row=(await q('SELECT * FROM accounts WHERE static=? LIMIT 1',[row.static]))[0];if(!row)throw Error('Аккаунт не найден.');}
 p._legacyAccountId=Number(row.kepler_account_id)||Number(row.static);p._legacyCharacterId=Number(row.kepler_character_id)||Number(row.static);p._legacySpawned=false;
 if(row.socialid==null&&row.kepler_account_id){
  const social=String(p.rgscId||'').trim();if(!social||social==='0')throw Error('Не удалось проверить Social Club. Перезапустите RAGE MP.');
  await q('UPDATE accounts SET socialid=? WHERE static=? AND socialid IS NULL',[social,row.static]);
 }
 return {...data,login:row.login};
}
function showCharacter(p,row){
 if(!exists(p))return;pending.set(p,{row});p.dimension=100000+Number(p.id);
 p.call('client:auth:success');p.call('client:charselect:open',[JSON.stringify(Number(row.char_created)?[character(row)]:[])]);
}
async function enterWorld(p,row,choice){
 if(!exists(p))return;
 const faction=Number(row.fraction)||0;
 if(faction&&typeof global.applyFactionEnterWorldSpawn==='function')global.applyFactionEnterWorldSpawn(p,faction,null);
 else global.enterFactionlessHub(p);
 if(choice==='last'&&[row.last_x,row.last_y,row.last_z].every(x=>x!=null&&Number.isFinite(Number(x)))&&Number(row.last_z)>-200&&Number(row.last_z)<2000){p.dimension=Number(row.last_pos_dim)||0;p.position=new mp.Vector3(Number(row.last_x),Number(row.last_y),Number(row.last_z));}
 p._keplerEquipment=parse(row.kepler_equipment_json);require('./legacy/wardrobe-state').load(p,row);
 p.name=String(row.kepler_display_name||row.login).replace(/\s+/g,'_');p.alpha=255;
 p.setVariable('cash',Number(p.money)||0);p.setVariable('bank',Number(row.bank)||0);p.setVariable('cid',publicCid(row));p.setVariable('serverId',p.id);
 p._legacyAccountId=Number(row.kepler_account_id)||Number(row.static);p._legacyCharacterId=Number(row.kepler_character_id)||Number(row.static);p.characterId=p._legacyCharacterId;p._legacySpawned=true;
 p.call('client:charselect:spawned');p.call('lobbySpawnComplete');
 mp.events.call('server:inventory:restore',p);if(global.syncLegacyHud)global.syncLegacyHud();
 if(global.hydrateCharAppearanceFromDb)global.hydrateCharAppearanceFromDb(p);
 if(global.hydratePlayerClothesFromDb)global.hydratePlayerClothesFromDb(p);
 setTimeout(()=>{if(exists(p)&&global.applyKeplerLegacyEquipment){global.applyKeplerLegacyEquipment(p);require('./legacy/wardrobe-state').restore(p,require('./legacy/clothing-validation')((player,message)=>player.outputChatBox(message))).catch(e=>console.error('[WARDROBE RESTORE]',e.message));global.emitPlayerInventory(p);}},550);
 pending.delete(p);
}
function install(){
 global.prepareKeplerLogin=prepareLogin;
 const enterOriginal=global.enterPlayAfterLogin,createOriginal=global.openCharCreatorForPlayer;
 global.enterPlayAfterLogin=(p,row)=>{if(!p._keplerPresentation)return enterOriginal(p,row);ensureIdentity(row).then(r=>showCharacter(p,r)).catch(e=>fail(p,'showAuthError',e));};
 global.openCharCreatorForPlayer=p=>{if(!p._keplerPresentation)return createOriginal(p);q('SELECT * FROM accounts WHERE static=? LIMIT 1',[p.static]).then(rows=>{if(rows[0]){p.setVariable('charCreating',true);showCharacter(p,rows[0]);}}).catch(e=>fail(p,'showAuthError',e));};
 mp.events.add('playerJoin',p=>{p._keplerPresentation=true;});
 mp.events.add('kepler:ui:error:s',(p,file,line)=>{if(!exists(p)||Date.now()-(p._keplerLastUiError||0)<1000)return;p._keplerLastUiError=Date.now();console.error('[KEPLER CEF ERROR]',String(file||'').replace(/[^a-zA-Z0-9_./:-]/g,'').slice(0,180),Number(line)||0);});
 mp.events.add('server_auth_clientReady',p=>{p._keplerPresentation=true;});
 guarded('server:charselect:getPreviewData','client:spawn:error',async(p,id)=>{const r=await getRow(p,id);p.call('client:charselect:applyPreview',[mp.joaat(parse(r.appearance_json).isMale===false?'mp_f_freemode_01':'mp_m_freemode_01'),JSON.stringify(toCustomization(r))]);});
 guarded('server:spawn:options','client:spawn:error',async(p,id)=>{const r=await getRow(p,id),start=global.FACTIONLESS_HUB_SPAWN;const choices=[{id:'start',title:'Начальная точка',label:'Начальная точка',point:{x:start.x,y:start.y,z:start.z,h:start.h||0}}];if([r.last_x,r.last_y,r.last_z].every(v=>v!=null&&Number.isFinite(Number(v))))choices.push({id:'last',title:'Место выхода',label:'Место выхода',point:{x:Number(r.last_x),y:Number(r.last_y),z:Number(r.last_z),h:0}});p.call('client:spawn:options',[JSON.stringify({characterId:publicCid(r),choices})]);});
 guarded('server:charselect:chooseCharacter','client:spawn:error',async(p,id,choice)=>{const r=await getRow(p,id);if(!['start','last'].includes(choice))throw Error('Выберите доступную точку.');await enterWorld(p,r,choice);});
 guarded('server:charselect:deleteCharacter','client:spawn:error',async(p,id)=>{
  const r=await getRow(p,id);await q('INSERT INTO kepler_deleted_characters (account_static,character_id,snapshot_json) VALUES (?,?,?)',[r.static,cid(r),JSON.stringify(r)]);
  await q('UPDATE accounts SET char_created=0,appearance_json=NULL,kepler_character_id=NULL,kepler_display_name=NULL WHERE static=?',[r.static]);r.char_created=0;r.kepler_character_id=null;r.kepler_display_name=null;pending.set(p,{row:r});p.call('client:charselect:refresh',['[]']);
 });
 guarded('server:charcreator:create','client:charcreator:error',async(p,raw)=>{
  const state=pending.get(p),data=parse(raw,null);if(!state||!p.getVariable('auth')||Number(state.row.char_created))throw Error('Создание персонажа недоступно.');
  if(!data||!safeName.test(data.firstName)||!safeName.test(data.lastName)||![0,1].includes(Number(data.gender)))throw Error('Введите имя и фамилию на латинице.');
  const display=data.firstName+' '+data.lastName,taken=await q('SELECT static FROM accounts WHERE LOWER(kepler_display_name)=LOWER(?) AND char_created=1 LIMIT 1',[display]);if(taken.length)throw Error('Это имя персонажа уже занято.');
  const appearance=toAppearance(data),r=state.row,characterId=Number(r.kepler_character_id)||(1000000000+Number(r.static));
  const clothes=data.clothes||data.appearance&&data.appearance.clothes||{},catalog=Number(data.gender)===1?wardrobe.female:wardrobe.male;
  const top=catalog.tops[Number(clothes.top)]||catalog.tops[0],pants=catalog.legs[Number(clothes.legs)]||catalog.legs[0],shoes=catalog.shoes[Number(clothes.shoes)]||catalog.shoes[0];
  const texture=v=>Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<256?Number(v):0;
  const tokens=[{id:'starter-top-'+characterId,type:'clothing',slot:'top',name:top.name,count:1,weight:.5,components:[[11,top.drawable,texture(clothes.topColor),0],[3,top.torso,0,0],[8,top.undershirt,0,0]]},{id:'starter-pants-'+characterId,type:'clothing',slot:'pants',name:pants.name,count:1,weight:.5,components:[[4,pants.drawable,texture(clothes.legsColor),0]]},{id:'starter-shoes-'+characterId,type:'clothing',slot:'shoes',name:shoes.name,count:1,weight:.5,components:[[6,shoes.drawable,texture(clothes.shoesColor),0]]}];
  const equipment=Object.fromEntries(tokens.map(item=>[item.slot,require('./kepler-legacy-items').encode(item)]));
  await q('UPDATE accounts SET appearance_json=?,char_created=1,kepler_character_id=?,kepler_display_name=?,charlevel=GREATEST(charlevel,1) WHERE static=? AND char_created=0',[JSON.stringify(appearance),characterId,display,r.static]);
  await q('UPDATE accounts SET kepler_equipment_json=? WHERE static=?',[JSON.stringify(equipment),r.static]);
  const original={character_id:characterId,parents:data.parents,features:data.features,appearance:data.appearance,hair:data.hair,hair_color:data.hairColor};
  await q('INSERT INTO kepler_character_data (character_id,account_id,character_json,customization_json,inventory_json,position_json) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE customization_json=VALUES(customization_json)',[characterId,r.kepler_account_id||r.static,JSON.stringify({id:characterId,first_name:data.firstName,last_name:data.lastName,gender:Number(data.gender)}),JSON.stringify(original),'{}','{}']);
  p.setVariable('charCreating',false);global.applyCharAppearance(p,appearance);
  const rows=await q('SELECT * FROM accounts WHERE static=? LIMIT 1',[r.static]);await enterWorld(p,rows[0],'start');
 });
 mp.events.add('playerQuit',p=>{pending.delete(p);loginTimes.delete(p);});
 global.whenDbReady(()=>q('CREATE TABLE IF NOT EXISTS kepler_deleted_characters (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, account_static INT UNSIGNED NOT NULL,character_id BIGINT NOT NULL,snapshot_json LONGTEXT NOT NULL,deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)').catch(e=>console.error('[KEPLER UI] schema',e.code)));
 console.log('[KEPLER UI] plov compatibility installed');
}
module.exports={install,toAppearance,toCustomization,character,prepareLogin};
