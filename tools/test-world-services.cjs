'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const locations=require('../client_packages/shared/world-locations.json');
const handlers={},timers=[],messages=[];
let state={cash:3000000,bank:5000,houses:{},inventory:[],ledger:[],licenses:[]},now=100000;
const p={position:{x:0,y:0,z:0},dimension:0,health:100,heading:0,inventory:Array(50).fill(null),_legacyAccountId:1,_legacyCharacterId:1,variables:{auth:true},calls:[],getVariable(k){return this.variables[k];},setVariable(k,v){this.variables[k]=v;},call(...a){this.calls.push(a);},putIntoVehicle(v,seat){this.vehicle=v;this.seat=seat;}};
async function query(sql,args=[],s=state){
 if(sql.startsWith('CREATE'))return {rows:[]};
 if(sql.startsWith('INSERT IGNORE INTO legacy_world_houses')){s.houses[args[0]]||={owner_character:null,price:args[1]};return {rows:[]};}
 if(sql.startsWith('SELECT id,owner_character'))return {rows:Object.entries(s.houses).filter(([,r])=>r.owner_character!==null).map(([id,r])=>({id,...r}))};
 if(sql.startsWith('SELECT character_id'))return {rows:s.licenses.includes(args[0])?[{}]:[]};
 if(sql.startsWith('SELECT money,bank'))return {rows:[{money:s.cash,bank:s.bank}]};
 if(sql.startsWith('UPDATE accounts SET money=')){s.cash=args[0];s.bank=args[1];return {rows:[]};}
 if(sql.startsWith('UPDATE accounts SET inventory=')){s.inventory=JSON.parse(args[0]);return {rows:[]};}
 if(sql.startsWith('INSERT INTO economy_ledger')){s.ledger.push(args);return {rows:[]};}
 if(sql.startsWith('SELECT owner_character'))return {rows:[s.houses[args[0]]]};
 if(sql.startsWith('SELECT COUNT'))return {rows:[{n:Object.values(s.houses).filter(r=>r.owner_account===args[0]).length}]};
 if(sql.startsWith('UPDATE legacy_world_houses')){Object.assign(s.houses[args[3]],{owner_account:args[0],owner_character:args[1]});return {rows:[]};}
 if(sql.startsWith('INSERT IGNORE INTO legacy_world_licenses')){s.licenses.push(args[0]);return {rows:[]};}
 throw Error('Unexpected SQL '+sql);
}
const db={query,transaction:async fn=>{const next=structuredClone(state);const result=await fn({query:(sql,args)=>query(sql,args,next)});state=next;return result;}};
const vehicles=new Set();
const sandbox={module:{exports:{}},console,Date:{now:()=>now},setTimeout:fn=>fn(),setInterval:fn=>{timers.push(fn);return {unref(){}};},global:{whenDbReady:fn=>fn(),metaAcTeleport:(player,x,y,z,o)=>{player.position={x,y,z};player.dimension=o.dimension;}},mp:{Vector3:function(x,y,z){Object.assign(this,{x,y,z});},joaat:x=>x,events:{add:(key,fn)=>handlers[key]=fn},players:{exists:player=>player===p,toArray:()=>[p]},vehicles:{exists:v=>vehicles.has(v),new:(_,pos)=>{const v={position:pos,velocity:{x:0,y:0,z:0},setVariable(){},destroy(){vehicles.delete(v);}};vehicles.add(v);return v;}}},require:name=>{
 if(name==='./connection')return db;
 if(name==='./access')return {assertPlayer:player=>{if(player!==p||!p.variables.auth)throw Error('Not authenticated');return {accountId:p._legacyAccountId,characterId:p._legacyCharacterId};}};
 if(name==='./economy')return {sync:(player,id,b)=>{assert.equal(id.characterId,p._legacyCharacterId);player.money=b.cash;player.variables.bank=b.bank;}};
 if(name==='../kepler-legacy-items')return {encode:x=>JSON.stringify(x)};
 if(name.includes('world-locations'))return locations;
 if(name.includes('world-interiors'))return require('../client_packages/shared/world-interiors.json');
 return require(name);
}};
vm.runInNewContext(fs.readFileSync('packages/server/legacy/world-services.js','utf8'),sandbox);
const api=sandbox.module.exports((player,message)=>messages.push(message));
function at(type){const row=locations.find(r=>r.type===type);p.position={x:row.pos[0],y:row.pos[1],z:row.pos[2]};p.dimension=0;return row;}
async function open(row){await handlers['legacy:world:open'](p,row.id);}
async function action(row,key,value={payment:'cash'}){now+=1000;await handlers['legacy:world:action'](p,row.id,key,JSON.stringify(value));}
(async()=>{
 await api.ready;assert.equal(Object.keys(state.houses).length,55);
 const shop=at('shop');await open(shop);const balance=state.cash;
 await action(shop,'buy',{item:'water',payment:'cash'});assert.equal(state.cash,balance-120);assert.equal(JSON.parse(p.inventory[0]).type,'water');assert.equal(state.ledger.length,1);
 const snapshot=structuredClone(state);await action(shop,'buy',{item:'__proto__',payment:'cash'});assert.equal(JSON.stringify(state),JSON.stringify(snapshot));
 p.position.x+=100;await action(shop,'buy',{item:'water',payment:'cash'});assert.equal(JSON.stringify(state),JSON.stringify(snapshot));
 const bank=at('bank');await open(bank);await action(bank,'bank',{mode:'deposit',amount:1000});assert.equal(state.cash,balance-1120);assert.equal(state.bank,6000);
 const deposited=structuredClone(state);await action(bank,'bank',{mode:'withdraw',amount:7000});assert.equal(JSON.stringify(state),JSON.stringify(deposited));
 await action(bank,'bank',{mode:'withdraw',amount:500});assert.equal(state.bank,5500);
 const house=at('house');await open(house);await action(house,'houseBuy');assert.equal(api.owners.get(house.id),1);assert.equal(state.houses[house.id].owner_character,1);
 const bought=structuredClone(state);await action(house,'houseBuy');assert.equal(JSON.stringify(state),JSON.stringify(bought));
 await action(house,'houseEnter');handlers['legacy:world:houseReady'](p);assert(p.dimension>=1100000);handlers['legacy:world:houseExit'](p);assert.equal(p.dimension,0);
 p._legacyCharacterId=2;await open(house);await action(house,'houseEnter');assert.equal(p.dimension,0);p._legacyCharacterId=1;
 const school=at('school');await open(school);handlers['legacy:world:roomReady'](p);assert.equal(p.dimension,1200002);
 await action(school,'schoolStart');assert.equal(p.dimension,0);assert.equal(vehicles.size,1);assert.equal(p.seat,0);
 const route=[[218,-1399,30.5],[270,-1412,29.4],[346,-1374,32.5],[299,-1288,29.5],[208,-1324,29.4],[218,-1399,30.5]];
 for(const point of route){now+=6000;p.position={x:point[0],y:point[1],z:point[2]};timers[0]();}
 await new Promise(resolve=>setImmediate(resolve));assert.equal(p.variables.drivingLicense,true);assert.deepEqual(state.licenses,[1]);assert.equal(vehicles.size,0);
 assert(p.calls.some(m=>m[0]==='notify:client'&&String(m[1][2]).includes('Недостаточно')));assert(!messages.some(m=>m.startsWith('Куплено:')));assert(p.calls.some(m=>m[0]==='legacy:world:toast'&&m[1][0]==='success')); console.log('PASS: world proximity/session checks, shop inventory/payment, bank limits/rollback, exclusive house purchase/entry and paid driving exam persistence.');
})().catch(e=>{console.error(e);process.exitCode=1;});
