'use strict';
let camera=null,watch=null,frozen=false,saved=null,wasInvincible=false;
function stop(){
 const had=!!watch;watch=null;
 if(camera){camera.destroy();camera=null;if(!global.isDead)mp.game.cam.renderScriptCams(false,false,0,true,false);}
 if(had){const p=mp.players.local;try{p.setCollision(true,true);p.setInvincible(wasInvincible);if(saved!==null)p.setAlpha(saved);p.freezePosition(frozen);}catch(_){}saved=null;}
 global.isAdminSpectating=false;
}
mp.events.add('client:admin:freeze',enabled=>{frozen=enabled===true;mp.players.local.freezePosition(frozen||!!watch);});
mp.events.add('client:admin:spectate',(id,alpha)=>{
 stop();if(id<0)return;
 const target=mp.players.atRemoteId(id);if(!target||!target.handle){mp.events.callRemote('server:admin:spectateStop');return;}
 wasInvincible=typeof mp.game.player.getInvincible==='function'?mp.game.player.getInvincible():false;watch=target;saved=Number.isFinite(alpha)?alpha:255;global.isAdminSpectating=true;
 const p=mp.players.local,v=target.position;p.freezePosition(true);p.setCollision(false,false);p.setInvincible(true);p.setAlpha(0);
 camera=mp.cameras.new('default',new mp.Vector3(v.x+3,v.y-4,v.z+2),new mp.Vector3(0,0,0),60);camera.pointAtCoord(v.x,v.y,v.z+.5);camera.setActive(true);mp.game.cam.renderScriptCams(true,false,0,true,false);
});
mp.events.add('render',()=>{if(!watch)return;if(!mp.players.exists(watch)||!watch.handle||global.isDead){stop();mp.events.callRemote('server:admin:spectateStop');return;}const v=watch.position;camera.setCoord(v.x+3,v.y-4,v.z+2);camera.pointAtCoord(v.x,v.y,v.z+.5);mp.game.controls.disableAllControlActions(0);});
for(const name of ['client:auth:show','client:charselect:show'])mp.events.add(name,()=>{frozen=false;stop();});
