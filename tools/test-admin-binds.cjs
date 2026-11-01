'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let flushes=0;const bindings=new Map(),events={},raw={};const global={bindGameplayKey:(key,down,handler)=>bindings.set(key+':'+down,handler),unbindGameplayKey:(key,down)=>bindings.delete(key+':'+down),adminPanelExec(){},isVkUsedByAnyGameplayKeybind:()=>false};const ctx={global,mp:{storage:{data:raw,flush:()=>flushes++},events:{add:(k,f)=>events[k]=f,call(){}},keys:{isDown:()=>false}},console,Number,Set,Date,JSON,parseInt};
vm.runInNewContext(fs.readFileSync('client_packages/admin_binds.js','utf8'),ctx);assert(bindings.has('117:true'));global.applyAdminBindsFromJson(JSON.stringify({menuKey:5,espKey:123}));assert(bindings.has('117:true'));assert(bindings.has('5:true'));assert.equal(raw.bloodyAdminBinds.menuKey,5);global.applyAdminBindsFromJson(JSON.stringify({menuKey:118,espKey:121}));assert(!bindings.has('5:true'));assert(bindings.has('118:true'));assert(!bindings.has('123:false'));assert(bindings.has('121:false'));global.applyAdminBindsFromJson(JSON.stringify({menuKey:0,espKey:123}));assert(bindings.has('117:true'));assert(!bindings.has('118:true'));assert(flushes>=3);console.log('PASS: admin keybind changes unbind old menu/ESP keys, bind side mouse with F6 recovery and custom key, flush storage and reset to F6.');

// Legacy Mouse5 bindings must open once per press even when native bind events are missing.
let down=false,toggles=0,typing=false;
const renders=[];const mouseGlobal={bindGameplayKey(){},unbindGameplayKey(){},toggleAdminPanel(){toggles++},isTypingInAnyTextField:()=>typing};
const mouseMp={players:{local:{getVariable:()=>0}},storage:{data:{bloodyAdminBinds:{menuKey:6,espKey:123}},flush(){}},events:{add:(name,fn)=>{if(name==='render')renders.push(fn)},call(){}},keys:{isDown:key=>key===6&&down}};
vm.runInNewContext(fs.readFileSync('client_packages/admin_binds.js','utf8'),{global:mouseGlobal,mp:mouseMp,console,Number,Set,Date,JSON,parseInt});
down=true;renders.forEach(fn=>fn());renders.forEach(fn=>fn());assert.equal(toggles,1);
down=false;renders.forEach(fn=>fn());typing=true;down=true;renders.forEach(fn=>fn());assert.equal(toggles,1);
console.log('PASS: stored Mouse5 polls on press only and respects typing focus.');
