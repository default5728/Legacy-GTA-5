'use strict';
const crypto=require('crypto'),access=require('./access'),connection=require('./connection');
const catalog={burger:{name:'Бургер',weight:.3},water:{name:'Вода',weight:.5},chocolate:{name:'Шоколад',weight:.1},medkit:{name:'Аптечка',weight:.2},repair:{name:'Ремонтный набор',weight:.8}};
async function grant(actor,target,args,replace){
 if(!access.hasPermission(actor,'inventory.grant'))throw Error('Недостаточно прав.');
 const before=access.assertPlayer(target),type=args[replace?2:1],count=Number(args[replace?3:2]||1);
 if(!catalog[type]||!Number.isSafeInteger(count)||count<1||count>100)throw Error('Типы: '+Object.keys(catalog).join(', ')+'. Количество 1–100.');
 if(target!==actor&&Number(target.adminlvl)>=Number(actor.adminlvl))throw Error('Недостаточно ранга.');
 const codec=require('../kepler-legacy-items'),items=Array.isArray(target.inventory)?target.inventory.slice():[];
 if(replace){const index=items.findIndex(raw=>{try{return codec.decode(raw)?.id===args[1];}catch(_){return false;}});if(index<0)throw Error('Предмет не найден или экипирован.');items[index]=null;}
 const token=codec.encode({id:crypto.randomBytes(12).toString('hex'),type,name:catalog[type].name,weight:catalog[type].weight,count});
 let index=items.findIndex(v=>!v);if(index<0){if(items.length>=50)throw Error('Инвентарь заполнен.');index=items.length;}
 items[index]=token;
 await connection.transaction(async tx=>{
  if(access.assertPlayer(target).accountId!==before.accountId)throw Error('Сессия изменилась.');
  await tx.query('UPDATE accounts SET inventory=? WHERE static=?',[JSON.stringify(items),target.static]);
  await tx.query('INSERT INTO admin_audit(id,actor_account,target_account,action,detail,created_at) VALUES(?,?,?,?,?,?)',[crypto.randomBytes(12).toString('hex'),access.assertPlayer(actor).accountId,before.accountId,replace?'inventory.replace':'inventory.grant',JSON.stringify({type,count}),Date.now()]);
 });
 if(!mp.players.exists(target)||access.assertPlayer(target).accountId!==before.accountId)return;
 target.inventory=items;global.emitPlayerInventory(target);actor.outputChatBox('Выдано '+catalog[type].name+' x'+count);target.outputChatBox('Администратор выдал '+catalog[type].name+' x'+count);
}
module.exports={grant,catalog};
