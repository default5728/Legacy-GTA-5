'use strict';
const c=require('./connection');
function integer(value){if(!Number.isSafeInteger(value))throw Error('Сумма должна быть целым числом.');return value;}
async function change(character,account,deltas,reason,authorize){return c.transaction(async tx=>{
 const row=(await tx.query('SELECT money,bank,adminlvl FROM accounts WHERE kepler_character_id=? AND kepler_account_id=? FOR UPDATE',[character,account])).rows[0];if(!row)throw Error('Персонаж не найден.');
 if(authorize)await authorize(row);
 const cash=integer(Number(row.money)+integer(deltas.cash||0)),bank=Number(row.bank)||0;if(cash<0)throw Error('Недостаточно наличных.');
 await tx.query('UPDATE accounts SET money=? WHERE kepler_character_id=? AND kepler_account_id=?',[cash,character,account]);
 await tx.query('INSERT INTO economy_ledger(character_id,account_id,cash_delta,bank_delta,chips_delta,reason,created_at) VALUES(?,?,?,?,?,?,?)',[character,account,deltas.cash||0,0,0,reason,Date.now()]);
 return {cash,bank};
});}
function sync(p,identity,b){if(!mp.players.exists(p)||p._legacyAccountId!==identity.accountId)return;p.money=b.cash;p.setVariable('cash',b.cash);p.setVariable('bank',b.bank);p.call('updateMoney',[String(b.cash)]);if(global.syncLegacyHud)global.syncLegacyHud();}
module.exports={integer,change,sync};
