'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let tick,packet='',driver=99;const vehicle={getPedInSeat:seat=>{assert.equal(seat,-1);return driver;},position:{x:0,y:0,z:0},gear:2,rpm:.6,getVariable:()=>undefined,getSpeed:()=>30,getIsEngineRunning:()=>true,getDoorLockStatus:()=>1,getEngineHealth:()=>{throw Error('unavailable on this streamed vehicle');}};
const p={handle:10,vehicle,seat:1,getVariable:()=>true};const ctx={global:{isPlayerSpawned:true,chatr:{execute:s=>packet=s}},WeakMap,Date,Math,Number,JSON,String,console,setInterval:fn=>tick=fn,mp:{players:{local:p},browsers:{exists:()=>true},game:{ui:{isPauseMenuActive:()=>false},controls:{isControlPressed:()=>false}}}};
vm.runInNewContext(fs.readFileSync('client_packages/legacy/speedometer.js','utf8'),ctx);tick();assert(packet.includes('setVehicle(null)'));driver=10;tick();assert(packet.includes('"speed":108'));assert(packet.includes('"health":1000'));assert(packet.includes('setVehicle'));
driver=99;tick();assert(packet.includes('setVehicle(null)'));p.vehicle=null;tick();assert(packet.includes('setVehicle(null)'));
console.log('PASS: passengers never see the gauge; only the actual driver sees speed, including optional streamed status fallbacks; seat change/exit hides it.');
