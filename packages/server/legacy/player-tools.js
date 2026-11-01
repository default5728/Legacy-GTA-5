'use strict';
const OWNER_ACCOUNT=3;
function create({access,connection,ready,players,exists,send,audit=async()=>{},sessionGated=()=>false}){
 const initialized=ready.then(()=>connection.query('CREATE TABLE IF NOT EXISTS legacy_kill_access (account_id BIGINT PRIMARY KEY,updated_by BIGINT NOT NULL,updated_at BIGINT NOT NULL)'));
 const identity=p=>access.assertPlayer(p);
 function same(p,id){const current=identity(p);if(current.accountId!==id.accountId||current.characterId!==id.characterId)throw Error('Сессия игрока изменилась. Повторите команду.');}
 function integer(s){if(!/^\d+$/.test(String(s))||!Number.isSafeInteger(Number(s)))throw Error('Укажите ID игрока.');return Number(s);}
 function online(value,byCid){const n=integer(value),p=players().find(p=>Number(byCid?p.static:p.id)===n);if(!p||!exists(p))throw Error('Игрок не найден.');identity(p);return p;}
 async function allowed(p){const id=identity(p);return id.accountId===OWNER_ACCOUNT||(await connection.query('SELECT account_id FROM legacy_kill_access WHERE account_id=?',[id.accountId])).rows.length>0;}
 async function kill(p,text){try{
  await initialized;const actor=identity(p);if(!await allowed(p))throw Error('Нет доступа к /kill.');
  const target=online(String(text||'').trim(),false),victim=identity(target);
  if(victim.accountId===OWNER_ACCOUNT&&actor.accountId!==OWNER_ACCOUNT)throw Error('Нельзя применить команду к владельцу.');
  if(target.getVariable('dead')===true||target.health<=0)throw Error('Игрок уже мёртв.');
  await audit(actor.accountId,victim.accountId,'player.kill',{serverId:target.id,cid:target.static});
  same(p,actor);same(target,victim);if(!await allowed(p))throw Error('Доступ к /kill снят.');same(p,actor);same(target,victim);
  target.armour=0;target.health=0;
  send(p,'Игрок ID '+target.id+' (CID '+target.static+') убит.');send(target,'Администратор применил /kill.');
  return true;
 }catch(e){send(p,e.message);return false;}}
 async function grant(p,text){try{
  await initialized;const actor=identity(p);if(actor.accountId!==OWNER_ACCOUNT)throw Error('Только владелец может менять доступ к /kill.');
  const args=String(text||'').trim().split(/\s+/);if(args.length!==2||!['on','off'].includes(args[1]))throw Error('/killaccess CID on|off');
  const cid=integer(args[0]),row=(await connection.query('SELECT kepler_account_id AS account_id FROM accounts WHERE static=? AND char_created=1 LIMIT 1',[cid])).rows[0];
  if(!row)throw Error('CID не найден.');const target=Number(row.account_id);if(target===OWNER_ACCOUNT)throw Error('Личный доступ владельца изменить нельзя.');
  same(p,actor);await connection.transaction(async tx=>{
   same(p,actor);await tx.query('DELETE FROM legacy_kill_access WHERE account_id=?',[target]);
   if(args[1]==='on')await tx.query('INSERT INTO legacy_kill_access(account_id,updated_by,updated_at) VALUES(?,?,?)',[target,actor.accountId,Date.now()]);
  });
  await audit(actor.accountId,target,'kill.access',{enabled:args[1]==='on'});send(p,'Доступ к /kill для CID '+cid+': '+args[1]+'.');
  return true;
 }catch(e){send(p,e.message);return false;}}
 async function revive(p,text){try{
  await ready;const actor=identity(p);if(!access.hasPermission(p,'player.revive'))throw Error('Недостаточно прав для воскрешения.');
  if(sessionGated(p)&&p._adminSession!==true)throw Error('Сначала войдите в админ-сессию: /logadmin.');
  const query=String(text||'').trim(),target=query?online(query,true):p,victim=identity(target);
  await audit(actor.accountId,victim.accountId,'player.revive',{cid:target.static});same(p,actor);same(target,victim);
  if(!access.hasPermission(p,'player.revive'))throw Error('Права изменились.');
  const position=target.position,dimension=target.dimension,heading=target.heading;
  if(typeof global.clearConsumableResists==='function')global.clearConsumableResists(target);
  if(target.getVariable('dead')===true||target.health<=0){target.spawn(position);target.dimension=dimension;target.heading=heading;}
  target.health=100;target.setVariable('dead',false);target.setVariable('isDead',false);target.call('reviveCancel');
  send(p,'Игрок CID '+target.static+' восстановлен.');if(target!==p)send(target,'Администратор восстановил вас.');return true;
 }catch(e){send(p,e.message);return false;}}
 return {kill,grant,revive,ready:initialized};
}
function register(send){
 const access=require('./access'),connection=require('./connection'),store=require('./staff-state');
 const controller=create({access,connection,ready:require('./database').ready,players:()=>mp.players.toArray(),exists:p=>mp.players.exists(p),send,
  sessionGated:p=>typeof global.adminSessionIsGated==='function'&&global.adminSessionIsGated(p),
  audit:(actor,target,action,data)=>connection.transaction(tx=>store.audit(tx,actor,target,action,data))});
 for(const name of ['revive','res','heal'])mp.events.addCommand(name,(p,text)=>controller.revive(p,text));
 mp.events.addCommand('kill',(p,text)=>controller.kill(p,text));mp.events.addCommand('killaccess',(p,text)=>controller.grant(p,text));
 controller.ready.catch(e=>console.error('[PLAYER TOOLS]',e.message));return controller;
}
module.exports={create,register,OWNER_ACCOUNT};
