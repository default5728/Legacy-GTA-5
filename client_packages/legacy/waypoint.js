let job=null;
function finish(error){
 if(!job)return;clearInterval(job.timer);job=null;global.isWaypointTeleporting=false;
 mp.game.streaming.clearFocus();mp.game.streaming.newLoadSceneStop();
 if(global.isPlayerSpawned&&!global.isDead&&!global.isNoclipActive)mp.players.local.freezePosition(false);
 mp.game.cam.doScreenFadeIn(250);if(error)mp.events.call('client:chat:message',error);
}
mp.events.add('client:waypoint:begin',token=>{
 if(job)return;
 if(!global.isPlayerSpawned||global.isDead||global.isNoclipActive||mp.players.local.vehicle){mp.events.callRemote('server:waypoint:cancel',token);return;}
 const blip=mp.game.ui.getFirstBlipInfoId(8);
 if(!blip||!mp.game.ui.doesBlipExist(blip)){mp.events.callRemote('server:waypoint:cancel',token);mp.events.call('client:chat:message','Сначала поставьте фиолетовую метку на карте.');return;}
 const point=mp.game.ui.getBlipInfoIdCoord(blip);
 if(typeof global.tryCloseAdminEsc==='function')global.tryCloseAdminEsc();
 if(typeof global.forceCloseChatInput==='function')global.forceCloseChatInput();
 if(typeof global.isLocalInventoryModalOpen==='function'&&global.isLocalInventoryModalOpen()&&typeof global.closeInventory==='function')global.closeInventory();
 global.isWaypointTeleporting=true;mp.players.local.freezePosition(true);mp.game.cam.doScreenFadeOut(200);
 mp.game.streaming.setFocusPosAndVel(point.x,point.y,100,0,0,0);
 mp.game.streaming.newLoadSceneStartSphere(point.x,point.y,100,300,0);
 job={token,start:Date.now(),sent:false,timer:null,ground:null};
 job.timer=setInterval(()=>{
   if(!job)return;
   if(Date.now()-job.start>11000){mp.events.callRemote('server:waypoint:cancel',token);finish('Земля в точке метки не загрузилась. Перемещение отменено.');return;}
   if(job.sent)return;
   mp.game.streaming.requestCollisionAtCoord(point.x,point.y,1000);
   if(Date.now()-job.start<500||!mp.game.streaming.isNewLoadSceneLoaded())return;
   const ground=mp.game.gameplay.getGroundZFor3dCoord(point.x,point.y,1000,false,false);
   // RAGE returns 0 when the ground query fails. Keep the origin instead of guessing a height.
   if(typeof ground!=='number'||!Number.isFinite(ground)||ground===0||ground< -100||ground>1500)return;
   if(job.ground===null){job.ground=ground;mp.game.streaming.newLoadSceneStop();mp.game.streaming.newLoadSceneStartSphere(point.x,point.y,ground,80,0);return;}
   if(Math.abs(job.ground-ground)>1){job.ground=ground;return;}
   mp.game.streaming.requestCollisionAtCoord(point.x,point.y,ground);
   job.sent=true;mp.events.callRemote('server:waypoint:result',token,point.x,point.y,ground);
 },100);
});
mp.events.add('client:waypoint:finish',(token,error)=>{if(job&&job.token===token)setTimeout(()=>{if(job&&job.token===token)finish(error);},250);});
for(const event of ['client:auth:show','client:charselect:show','client:charcreator:open','client:death:show'])mp.events.add(event,()=>finish());
