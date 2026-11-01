let flying=false,previousInvincible=false,previousAlpha=255,lastFrame=Date.now();
let camera=null,cameraPosition=null,cameraRotation=null;
const engineStates=new WeakMap();let engineVehicle=null,engineOn=false,flightHint='',engineHint='';
function refreshLabels(){const c=global.CONTROLS;engineHint='['+c.label('engine')+'] — завести двигатель';flightHint=`Свободная камера | ${c.label('flyForward')}/${c.label('flyBack')}/${c.label('flyLeft')}/${c.label('flyRight')} — движение | ${c.label('flyUp')}/${c.label('flyDown')} — высота | ${c.label('flyFast')} — быстрее | ${c.label('noclip')} — выключить`;}
refreshLabels();mp.events.add('client:controls:changed',refreshLabels);
function canUse(){return global.isPlayerSpawned&&!global.isDead&&!global.isPlatesOpen&&!global.isCasinoTableOpen&&!global.isWaypointTeleporting&&!global.isChatInputActive&&!global.isMenuOpen&&!global.isInventoryOpen&&!global.isBindingCaptureActive&&!mp.gui.cursor.visible;}
function position(){const p=mp.players.local.position;return JSON.stringify([p.x,p.y,p.z]);}
function stop(keepFrozen=false){
 if(!flying&&!camera)return;
 flying=false;global.isNoclipActive=false;
 if(camera){camera.setActive(false);camera.destroy();camera=null;}
 mp.game.cam.renderScriptCams(false,false,0,true,false);
 const player=mp.players.local;
 player.setVisible(true,false);player.setAlpha(previousAlpha);player.setCollision(true,true);player.setInvincible(previousInvincible);
 if(!keepFrozen)player.freezePosition(false);
 cameraPosition=null;cameraRotation=null;
}
global.CONTROLS.on('noclip',()=>{if(canUse())mp.events.callRemote('server:noclip:toggle',flying?position():'');});
global.CONTROLS.on('engine',()=>{if(canUse()&&mp.players.local.vehicle)mp.events.callRemote('server:engine:toggle');});
mp.events.add('client:noclip:state',(enabled,originalAlpha)=>{
 if(enabled!==true){stop();return;}
 if(!global.isPlayerSpawned||mp.players.local.vehicle){mp.events.callRemote('server:noclip:stop');return;}
 if(flying)return;
 const player=mp.players.local,p=player.position,rot=mp.game.cam.getGameplayCamRot(2);
 previousInvincible=typeof mp.game.player.getInvincible==='function'?mp.game.player.getInvincible():false;
 previousAlpha=Number.isFinite(originalAlpha)?originalAlpha:(typeof player.getAlpha==='function'?player.getAlpha():255);
 flying=true;global.isNoclipActive=true;lastFrame=Date.now();
 try{
   cameraPosition={x:p.x,y:p.y,z:p.z+.8};cameraRotation={x:rot.x,z:rot.z};
   camera=mp.cameras.new('default',new mp.Vector3(cameraPosition.x,cameraPosition.y,cameraPosition.z),new mp.Vector3(rot.x,0,rot.z),70);
   camera.setActive(true);mp.game.cam.renderScriptCams(true,false,0,true,false);
   player.setInvincible(true);player.setVisible(false,false);player.setAlpha(0);player.setCollision(false,false);player.freezePosition(true);
 }catch(error){stop();mp.events.callRemote('server:noclip:stop');console.error('[FREECAM]',error.message);}
});
for(const event of ['client:auth:show','client:charselect:show','client:charcreator:open'])mp.events.add(event,()=>stop(true));
mp.events.add('render',()=>{
 if(flying||!canUse()||!mp.players.local.vehicle)global.HINTS.set('engine',null);
 if(!flying||!canUse())global.HINTS.set('flight',null);
 const now=Date.now(),dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(flying){
   const player=mp.players.local;
   if(!global.isPlayerSpawned||player.health<=0||player.vehicle){stop();mp.events.callRemote('server:noclip:stop');return;}
   for(const control of [1,2,21,22,23,24,25,30,31,36,37,44,75,140,141,142,157,158])mp.game.controls.disableControlAction(0,control,true);
   if(canUse()){
     cameraRotation.z-=mp.game.controls.getDisabledControlNormal(0,1)*8;
     cameraRotation.x=Math.max(-89,Math.min(89,cameraRotation.x-mp.game.controls.getDisabledControlNormal(0,2)*8));
     const yaw=cameraRotation.z*Math.PI/180,pitch=cameraRotation.x*Math.PI/180;
     const forward={x:-Math.sin(yaw)*Math.cos(pitch),y:Math.cos(yaw)*Math.cos(pitch),z:Math.sin(pitch)},right={x:Math.cos(yaw),y:Math.sin(yaw)};
     const down=id=>global.CONTROLS.down(id)?1:0;
     const f=down('flyForward')-down('flyBack'),r=down('flyRight')-down('flyLeft'),u=down('flyUp')-down('flyDown');
     let dx=forward.x*f+right.x*r,dy=forward.y*f+right.y*r,dz=forward.z*f+u;
     const length=Math.hypot(dx,dy,dz);if(length>1){dx/=length;dy/=length;dz/=length;}
     const speed=down('flyFast')?80:20;
     cameraPosition.x+=dx*speed*dt;cameraPosition.y+=dy*speed*dt;cameraPosition.z+=dz*speed*dt;
     camera.setCoord(cameraPosition.x,cameraPosition.y,cameraPosition.z);camera.setRot(cameraRotation.x,0,cameraRotation.z,2);
     // Invisible body follows the camera so multiplayer entities and world streaming stay nearby.
     player.position=new mp.Vector3(cameraPosition.x,cameraPosition.y,cameraPosition.z-.8);player.setVelocity(0,0,0);player.setVisible(false,false);
     const c=global.CONTROLS;
     global.HINTS.set('flight',flightHint);
   }
   return;
 }
 if(engineVehicle&&!engineOn&&mp.players.local.vehicle===engineVehicle){mp.game.controls.disableControlAction(0,71,true);mp.game.controls.disableControlAction(0,72,true);}
});
function updateEngine(){
 if(!global.isPlayerSpawned||flying){engineVehicle=null;global.HINTS.set('engine',null);return;}
 const player=mp.players.local,vehicle=player.vehicle;
 if(!vehicle||!mp.vehicles.exists(vehicle)||vehicle.getPedInSeat(-1)!==player.handle){engineVehicle=null;global.HINTS.set('engine',null);return;}
 engineVehicle=vehicle;
 const on=vehicle.getVariable('engineOn')===true;engineOn=on;
 if(on)global.HINTS.set('engine',null);
 // Engine/audio state is applied by vehicles/ignition before entry and on sync changes.

 if(!on&&canUse())global.HINTS.set('engine',engineHint,'gold');
 else global.HINTS.set('engine',null);

}
setInterval(updateEngine,150);
