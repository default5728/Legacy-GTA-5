'use strict';

function create({access,policy,economy,connection,ready,players,send,sessionGated,log=()=>{}}){
 function identity(actor,expected){
  const current=access.assertPlayer(actor);
  if(expected&&(current.accountId!==expected.accountId||current.characterId!==expected.characterId))throw Error('Сессия изменилась. Повторите команду.');
  if(Number(actor.adminlvl)<8||!access.hasPermission(actor,'money.manage'))throw Error('Выдача и снятие денег доступны с 8-го ранга.');
  if(sessionGated(actor)&&actor._adminSession!==true)throw Error('Сначала войдите в админ-сессию: /logadmin.');
  return current;
 }
 return async function changeMoney(actor,cidText,amountText,subtract=false){
  try{
   await ready;
   const actorId=identity(actor),cidString=String(cidText||'').trim(),amountString=String(amountText||'').replace(/\s+/g,'');
   if(!/^\d+$/.test(cidString)||!Number.isSafeInteger(Number(cidString))||Number(cidString)<1)throw Error('Укажите CID игрока.');
   if(!/^\d+$/.test(amountString)||!Number.isSafeInteger(Number(amountString))||Number(amountString)<1)throw Error('Сумма должна быть положительным целым числом без потери точности.');
   const cid=Number(cidString),amount=Number(amountString),delta=subtract?-amount:amount;
   if(amount>10_000_000_000)throw Error('Максимальная сумма за одну операцию — 10 000 000 000.');
   const row=(await connection.query('SELECT static,kepler_account_id,kepler_character_id FROM accounts WHERE static=? AND char_created=1 LIMIT 1',[cid])).rows[0];
   if(!row||!Number.isSafeInteger(Number(row.kepler_account_id))||Number(row.kepler_account_id)<1||!Number.isSafeInteger(Number(row.kepler_character_id))||Number(row.kepler_character_id)<1)throw Error('Персонаж с таким CID не найден.');
   const target={accountId:Number(row.kepler_account_id),characterId:Number(row.kepler_character_id)};
   const balance=await economy.change(target.characterId,target.accountId,{cash:delta},'flow-panel:account:'+actorId.accountId,locked=>{
    identity(actor,actorId);
    if(target.accountId!==actorId.accountId&&Number(actor.adminlvl)<10&&!policy.canTarget(Number(actor.adminlvl),Number(locked.adminlvl)||0))throw Error('Нельзя менять баланс администратора равного или старшего ранга.');
   });
   for(const player of players())if(player._legacyAccountId===target.accountId&&player._legacyCharacterId===target.characterId)economy.sync(player,target,balance);
   send(actor,'Баланс CID '+cid+': $'+balance.cash+'. '+(subtract?'Снято':'Выдано')+' $'+amount+'.');
   log('[FLOW MONEY] actorCID='+actor.static+' targetCID='+cid+' delta='+delta);
   return true;
  }catch(error){send(actor,String(error.message||error));return false;}
 };
}

let controller;
function run(actor,cid,amount,subtract){
 if(!controller)controller=create({
  access:require('./access'),policy:require('./staff-policy'),economy:require('./economy'),connection:require('./connection'),ready:require('./database').ready,
  players:()=>mp.players.toArray(),sessionGated:p=>typeof global.adminSessionIsGated==='function'&&global.adminSessionIsGated(p),
  send:(p,text)=>{if(!mp.players.exists(p))return;if(typeof global.pushChatLineToPlayer==='function')global.pushChatLineToPlayer(p,text);else p.call('client:chat:message',[text]);},
  log:message=>console.log(message)
 });
 return controller(actor,cid,amount,subtract);
}
module.exports={create,run};
