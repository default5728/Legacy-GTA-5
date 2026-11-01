'use strict';
const rules=require('./shared/vehicle-dynamics'),states=new Map();let lastWarning=0;
const fields=['fInitialDriveMaxFlatVel','fInitialDragCoeff','fSteeringLock','fTractionCurveMax','fTractionCurveMin','fSuspensionRaise','fAntiRollBarForce'];
function apply(v,provided){
 if(!v||v.type!=='vehicle'||!v.handle||!mp.vehicles.exists(v))return;
 if(typeof v.getHandling!=='function'||typeof v.setHandling!=='function')throw Error('Клиент RAGE MP не предоставил API управления физикой.');
 const cls=v.getClass();if(![0,1,2,3,4,5,6,7,9,10,11,12,17,18,19,20,22].includes(cls))return;
 let state=states.get(v);if(!state||state.handle!==v.handle){const base={};for(const field of fields){const n=Number(v.getHandling(field));if(Number.isFinite(n))base[field]=n;}state={handle:v.handle,base,signature:''};states.set(v,state);}
 let settings;try{settings=rules.normalize(provided||v.getVariable('legacyVehicleTuning')||rules.defaults);}catch(_){settings=rules.defaults;}
 const signature=JSON.stringify(settings);if(signature===state.signature)return;
 for(const [field,value]of Object.entries(rules.fields(state.base,settings)))v.setHandling(field,value);
 mp.game.vehicle.setMaxSpeed(v.handle,rules.MAX_KMH/3.6);
 state.signature=signature;
}
global.applyLegacyVehicleDynamics=(v,settings)=>apply(v,settings);
mp.events.add('entityStreamIn',v=>{try{apply(v);}catch(e){console.warn('[VEHICLE DYNAMICS]',e.message);}});
mp.events.addDataHandler('legacyVehicleTuning',v=>{const state=states.get(v);if(state)state.signature='';});
mp.events.add('entityStreamOut',v=>states.delete(v));
setInterval(()=>{mp.vehicles.forEachInStreamRange(v=>{try{apply(v);}catch(e){if(Date.now()-lastWarning>30000){lastWarning=Date.now();console.warn('[VEHICLE DYNAMICS]',e.message);}}});},500);
