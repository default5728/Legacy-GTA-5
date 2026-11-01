'use strict';
// Multiplayer port of the supplied rocket-jump controls; runs only for Tesla Roadster drivers.
const MODEL=mp.game.joaat('tesroad20')>>>0,fx=new Map();let last=Date.now(),flying=null,transmitting=false;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function stopEffects(v){const handles=fx.get(v);if(!handles)return;fx.delete(v);for(const h of handles)try{mp.game.graphics.stopParticleFxLooped(h,false);}catch(_){} }
function setThrust(on){if(transmitting===on)return;transmitting=on;mp.events.callRemote('legacy:tesla:thrust',on);}
function available(){return !global.__chatInputOpen&&!global.__cefTextInputOpen&&!global.isMenuOpen&&!global.isInventoryOpen&&!mp.gui.cursor.visible&&!mp.game.ui.isPauseMenuActive()&&!(typeof global.isTypingInAnyTextField==='function'&&global.isTypingInAnyTextField());}
mp.events.add('render',()=>{
 const now=Date.now(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 try{
  const p=mp.players.local,v=p.vehicle;
  if(p.getVariable('auth')!==true||!v||(v.model>>>0)!==MODEL||v.getPedInSeat(-1)!==p.handle||p.getVariable('dead')===true||!available()){setThrust(false);flying=null;return;}
  const held=key=>global.isGameplayKeyDown(key),lift=held(0x20);
  if(!lift&&!flying){setThrust(false);return;}
  if(lift)flying=v;
  if(flying!==v){setThrust(false);flying=null;return;}
  if(!lift&&!v.isInAir()){setThrust(false);flying=null;return;}
  mp.game.controls.disableControlAction(0,76,true);
  const vel=v.getVelocity(),rot=v.getRotation(2),turn=Number(held(0x41))-Number(held(0x44)),roll=Number(held(0x51))-Number(held(0x45));
  const heading=rot.z+turn*55*dt,radians=heading*Math.PI/180,forward=Number(held(0x57))-Number(held(0x53));
  const next={x:vel.x-Math.sin(radians)*forward*12*dt,y:vel.y+Math.cos(radians)*forward*12*dt,z:vel.z};
  if(lift)next.z+=(8-next.z)*(1-Math.exp(-dt*5));
  const speed=Math.hypot(next.x,next.y);if(speed>55){next.x*=55/speed;next.y*=55/speed;}
  v.setVelocity(next.x,next.y,clamp(next.z,-35,10));
  v.setRotation(rot.x,clamp(rot.y+roll*55*dt,-55,55),heading,2,true);
  setThrust(lift||forward!==0||turn!==0||roll!==0);
 }catch(_){setThrust(false);flying=null;}
});
// Each streamed client owns its local effects; synchronized vehicle state prevents duplicate network FX.
setInterval(()=>{
 try{
  const wanted=new Set();mp.vehicles.forEachInStreamRange(v=>{if((v.model>>>0)===MODEL&&v.getVariable('legacyTeslaThrust')===true)wanted.add(v);});
  for(const v of fx.keys())if(!wanted.has(v)||!mp.vehicles.exists(v))stopEffects(v);
  if(!wanted.size)return;
  mp.game.streaming.requestNamedPtfxAsset('core');if(!mp.game.streaming.hasNamedPtfxAssetLoaded('core'))return;
  for(const v of wanted){if(fx.has(v)||fx.size>=8)continue;const handles=[];
   for(const [x,y]of [[-.65,1.45],[.65,1.45],[-.65,-1.45],[.65,-1.45],[-.72,0],[.72,0]]){
    mp.game.graphics.setPtfxAssetNextCall('core');const h=mp.game.graphics.startParticleFxLoopedOnEntity('ent_amb_steam',v.handle,x,y,-.35,0,0,0,.18,false,false,false);
    if(h){handles.push(h);mp.game.graphics.setParticleFxLoopedColour(h,.85,.9,1,false);mp.game.graphics.setParticleFxLoopedAlpha(h,.45);}
   }fx.set(v,handles);
  }
 }catch(_){}
},250);
mp.events.add('entityStreamOut',entity=>stopEffects(entity));
mp.events.add('playerLeaveVehicle',()=>{setThrust(false);flying=null;});

mp.events.add('render',()=>{for(const v of fx.keys())try{if(!mp.vehicles.exists(v))continue;const p=v.getOffsetFromInWorldCoords(0,0,-.55);mp.game.graphics.drawLightWithRange(p.x,p.y,p.z,150,175,210,2.3,.6);}catch(_){}});
