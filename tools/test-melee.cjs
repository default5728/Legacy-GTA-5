const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('client_packages/damage.js','utf8'),context={isVehicleImpact:source=>source&&source.type==='vehicle',ignoreWeapons:{},isUnarmedWeapon:()=>true,isTargetDamageImmune:p=>p.immune,resolveShooter:p=>p,isCaptOrBizwarCombatBlocked:()=>false,isSameTeamInBattle:()=>false,isHeavySniperHash:()=>false,shouldSuppressAssaultShotgunPellet:()=>false,applyVictimHit:(p,s,w,b,d)=>p.hits.push(d)};
vm.runInNewContext(source.slice(source.indexOf('function computePvPDamage('),source.indexOf('function applyVictimHit(')),context);
vm.runInNewContext(source.slice(source.indexOf('function handleIncomingDamage('),source.indexOf('function handleOutgoingDamage(')),context);
const attacker={getVariable:()=>false},victim={type:'player',hits:[],getVariable:()=>false};context.handleIncomingDamage(attacker,attacker,victim,1,0,1000);assert.deepEqual(victim.hits,[15]);
victim.immune=true;context.handleIncomingDamage(attacker,attacker,victim,1,0,1000);assert.deepEqual(victim.hits,[15]);victim.immune=false;attacker.getVariable=k=>k==='greenzones';context.handleIncomingDamage(attacker,attacker,victim,1,0,1000);assert.deepEqual(victim.hits,[15]);
console.log('PASS: fists deal 15 through the actual damage pipeline; immune targets and green-zone attackers remain protected.');

attacker.getVariable=()=>false;context.resolveShooter=(source,player)=>player;assert.equal(context.handleIncomingDamage({type:'vehicle'},attacker,victim,99,0,50),undefined);assert.deepEqual(victim.hits,[15]);victim.immune=true;assert.equal(context.handleIncomingDamage({type:'vehicle'},attacker,victim,99,0,50),true);console.log('PASS: vehicle collisions use native impact damage while immune players remain protected.');
