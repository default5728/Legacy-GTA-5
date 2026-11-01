'use strict';
const assert=require('node:assert/strict');
const {create}=require('../packages/server/legacy/panel-money');
const policy=require('../packages/server/legacy/staff-policy');
function setup(level=8,{session=true,targetLevel=level,other=false,offline=false,revoke=false}={}){
 const actor={static:400,adminlvl:level,_legacyAccountId:40,_legacyCharacterId:140,_adminSession:session,money:100};
 const row={static:other?401:400,kepler_account_id:other?41:40,kepler_character_id:other?141:140,adminlvl:targetLevel,money:100,bank:20};
 const messages=[],state={queries:0,ledger:0,sync:0};
 const run=create({policy,ready:Promise.resolve(),access:{assertPlayer:p=>({accountId:p._legacyAccountId,characterId:p._legacyCharacterId}),hasPermission:(p,permission)=>policy.has(p.adminlvl,permission)},connection:{query:async()=>{state.queries++;if(revoke)actor.adminlvl=0;return {rows:[row]};}},economy:{change:async(character,account,deltas,reason,guard)=>{assert.equal(character,row.kepler_character_id);assert.equal(account,row.kepler_account_id);assert(reason.startsWith('flow-panel:account:'));await guard(row);const next=row.money+deltas.cash;if(next<0)throw Error('Недостаточно наличных.');row.money=next;state.ledger++;return {cash:next,bank:row.bank};},sync:(p,i,b)=>{state.sync++;p.money=b.cash;}},players:()=>offline?[]:[actor],send:(p,message)=>messages.push(message),sessionGated:p=>p.adminlvl>=1&&p.adminlvl<=7});
 return {actor,row,messages,state,run};
}
(async()=>{
 for(const level of [8,9,10]){const t=setup(level);assert.equal(await t.run(t.actor,'400','50'),true);assert.equal(t.row.money,150);assert.equal(t.actor.money,150);assert.equal(t.row.bank,20);assert.equal(t.state.ledger,1);}
 {const t=setup(9);assert.equal(await t.run(t.actor,'400','1000000001'),true);assert.equal(t.row.money,1000000101);}
 for(const level of [0,1,2,3,4,5,6,7]){const t=setup(level);assert.equal(await t.run(t.actor,'400','50'),false);assert.equal(t.state.queries,0);assert.equal(t.row.money,100);}
 {const t=setup(8,{session:false});assert.equal(await t.run(t.actor,'400','50'),true);}
 {const t=setup(9,{revoke:true});assert.equal(await t.run(t.actor,'400','50'),false);assert.equal(t.state.ledger,0);}
 {const t=setup(9,{other:true,targetLevel:9});assert.equal(await t.run(t.actor,'401','50'),false);assert.equal(t.row.money,100);}
 {const t=setup(10,{other:true,targetLevel:10});assert.equal(await t.run(t.actor,'401','50'),true);}
 {const t=setup(9,{offline:true});assert.equal(await t.run(t.actor,'400','50'),true);assert.equal(t.row.money,150);assert.equal(t.state.sync,0);}
 {const t=setup(8);assert.equal(await t.run(t.actor,'400','101',true),false);assert.equal(t.row.money,100);assert.equal(t.state.ledger,0);}
 for(const subtract of [false,true]){
  const t=setup(8);t.row.money=20_000_000_000;assert.equal(await t.run(t.actor,'400','10000000000',subtract),true);assert.equal(t.row.money,subtract?10_000_000_000:30_000_000_000);
  const rejected=setup(10);assert.equal(await rejected.run(rejected.actor,'400','10000000001',subtract),false);assert.equal(rejected.state.queries,0);assert.equal(rejected.state.ledger,0);
 }
 for(const value of ['0','-1','1.5','9007199254740992']){const t=setup(8);assert.equal(await t.run(t.actor,'400',value),false);assert.equal(t.state.queries,0);}
 {
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),queries=[];
  const connection={transaction:async fn=>fn({query:async(sql,args)=>{queries.push([sql,args]);return {rows:sql.startsWith('SELECT')?[{money:100,bank:20,adminlvl:6}]:[]};}})};
  const sandbox={require:()=>connection,module:{exports:{}},global:{},mp:{players:{exists:()=>false}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../packages/server/legacy/economy.js'),'utf8'),sandbox);
  await assert.rejects(sandbox.module.exports.change(140,40,{cash:50},'test',()=>{throw Error('revoked');}));
  assert.equal(queries.length,1);assert(queries[0][0].includes('FOR UPDATE'));
  queries.length=0;const balance=await sandbox.module.exports.change(140,40,{cash:50},'test',row=>assert.equal(row.adminlvl,6));
  assert.equal(balance.cash,150);assert.equal(balance.bank,20);assert(queries.some(q=>q[0].startsWith('INSERT INTO economy_ledger')));
 }
 console.log('PASS: ranks8–10 can grant themselves cash; ranks0–7, revoked permissions, unsafe amounts and protected targets reject without balance changes; offline updates and bank preservation verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
