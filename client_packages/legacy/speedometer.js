'use strict';
let lastVehicle='',lastSentAt=0,lastErrorAt=0;const trips=new WeakMap();let lastDriven=null;
setInterval(()=>{try{
 const p=mp.players.local,v=p.vehicle;let state=null;
 if(global.isPlayerSpawned&&p.getVariable('auth')===true&&v&&typeof v.getPedInSeat==='function'&&v.getPedInSeat(-1)===p.handle&&!mp.game.ui.isPauseMenuActive()){
  const read=(method,fallback,...args)=>{try{return typeof v[method]==='function'?v[method](...args):fallback;}catch(_){return fallback;}};
  const lights=read('getLightsState',{},1,1)||{},position=v.position;let trip=trips.get(v);
  if(!trip){trip={km:0,position:null};trips.set(v,trip);}
  if(lastDriven===v&&trip.position){const d=Math.hypot(position.x-trip.position.x,position.y-trip.position.y,position.z-trip.position.z);if(d<75)trip.km+=d/1000;}
  trip.position={x:position.x,y:position.y,z:position.z};lastDriven=v;
  state={speed:read('getSpeed',0)*3.6,gear:Number(v.gear)||0,rpm:v.rpm||0,engine:read('getIsEngineRunning',v.getVariable('engineState')===true),locked:read('getDoorLockStatus',0)>1,lights:!!(lights.lightsOn||lights.highbeamsOn),fuel:Number(v.getVariable('fuel')??65),health:read('getEngineHealth',1000),belt:global.seatbeltStatus===true,reverse:v.gear===0&&read('getSpeed',0)>1,handbrake:mp.game.controls.isControlPressed(0,76),distance:trip.km};
 }
 if(!state)lastDriven=null;
 const raw=JSON.stringify(state);if(raw===lastVehicle&&Date.now()-lastSentAt<1000)return;
 if(global.chatr&&mp.browsers.exists(global.chatr)){global.chatr.execute('window.HUD_UI&&HUD_UI.setVehicle('+raw+');');lastVehicle=raw;lastSentAt=Date.now();}
}catch(e){if(Date.now()-lastErrorAt>30000){lastErrorAt=Date.now();console.warn('[VEHICLE HUD]',e.message);}}},80);
