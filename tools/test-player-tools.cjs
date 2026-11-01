const assert=require('node:assert/strict'),{create}=require('../packages/server/legacy/player-tools');
const make=(id,cid,account,level)=>({id,static:cid,adminlvl:level,_legacyAccountId:account,_legacyCharacterId:account+100,_adminSession:true,health:100,position:{x:1,y:2,z:3},dimension:9,heading:25,vars:{auth:true,dead:false},getVariable(k){return this.vars[k];},setVariable(k,v){this.vars[k]=v;},call(){},spawn(p){this.didSpawn=true;this.position=p;}});
(async()=>{
 const owner=make(7,1,3,10),other=make(2,2,5,10),victim=make(0,4,7,9),players=[owner,other,victim],grants=new Set(),messages=[],logs=[];
 const query=async(sql,params=[])=>{if(sql.startsWith('SELECT account_id FROM legacy_kill_access'))return {rows:grants.has(params[0])?[{account_id:params[0]}]:[]};if(sql.startsWith('SELECT kepler_account_id'))return {rows:players.filter(p=>p.static===params[0]).map(p=>({account_id:p._legacyAccountId}))};if(sql.startsWith('DELETE'))grants.delete(params[0]);if(sql.startsWith('INSERT'))grants.add(params[0]);return {rows:[]};};
 const access={assertPlayer:p=>({accountId:p._legacyAccountId,characterId:p._legacyCharacterId}),hasPermission:p=>p.adminlvl>=4};
 const ctrl=create({access,connection:{query,transaction:fn=>fn({query})},ready:Promise.resolve(),players:()=>players,exists:p=>players.includes(p),send:(p,s)=>messages.push(s),audit:async(...args)=>logs.push(args),sessionGated:p=>p.adminlvl<=7});
 assert.equal(await ctrl.kill(other,'0'),false);assert.equal(victim.health,100);
 assert.equal(await ctrl.kill(owner,'0'),true);assert.equal(victim.health,0);assert.equal(logs.at(-1)[2],'player.kill');
 victim.health=100;assert.equal(await ctrl.grant(other,'2 on'),false);assert.equal(await ctrl.grant(owner,'2 on'),true);assert.equal(await ctrl.kill(other,'0'),true);
 victim.health=100;assert.equal(await ctrl.grant(owner,'2 off'),true);assert.equal(await ctrl.kill(other,'0'),false);assert.equal(victim.health,100);
 assert.equal(await ctrl.kill(owner,'999'),false);
 for(const level of [5,6,7,8,9]){other.adminlvl=level;victim.health=0;victim.vars.dead=true;assert.equal(await ctrl.revive(other,'4'),true);assert.equal(victim.health,100);assert.equal(victim.vars.dead,false);assert.equal(victim.dimension,9);assert.equal(victim.heading,25);assert(victim.didSpawn);}
 other.adminlvl=5;other._adminSession=false;assert.equal(await ctrl.revive(other,'4'),false);other._adminSession=true;other.adminlvl=0;assert.equal(await ctrl.revive(other,'4'),false);
 console.log('PASS: only owner initially kills; runtime ID0 supported, persistent grant/revoke, rank10 alone denied; ranks5–9 revive higher-rank targets without losing dimension.');
})().catch(e=>{console.error(e);process.exitCode=1;});
