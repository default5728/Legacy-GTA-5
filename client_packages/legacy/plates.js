'use strict';
let browser=null,ready=false,opened=false,nearest=null,kind='',choice=null,payload=null,openedAt=0,viewId=0,viewAck=false;
function close(notify=true){const wasOpen=opened;opened=false;global.isPlatesOpen=false;if(browser){browser.destroy();browser=null;}ready=false;payload=null;if(notify&&wasOpen)mp.events.callRemote('server:plates:close');if(!global.isDead)mp.gui.cursor.show(false,false);}
global.closePlates=close;
function display(){if(!browser||!opened||!payload)return;const expression=kind==='generator'?'window.PLATES_UI&&window.PLATES_UI.show':'window.showChoices';try{browser.execute('(function(){const fn='+expression+';if(typeof fn!=="function")return;fn('+JSON.stringify(payload)+');mp.trigger("legacy:plates:viewAck",'+viewId+');})();');}catch(_){} }
mp.events.add('legacy:plates:viewAck',id=>{if(id===viewId)viewAck=true;});
setInterval(()=>{if(!opened||viewAck)return;if(Date.now()-openedAt>10000){close();mp.events.call('client:chat:message','Не удалось загрузить окно номеров. Откройте его ещё раз.');return;}display();},250);

function open(type,value){close(false);kind=type;payload=value;openedAt=Date.now();viewId++;viewAck=false;opened=true;global.isPlatesOpen=true;browser=mp.browsers.new('package://plates/'+(type==='generator'?'index.html':'choose.html'));browser.active=true;browser.orderId=1300;mp.gui.cursor.show(true,true);}
mp.events.add('client:plates:open',json=>open('generator',JSON.parse(json)));
mp.events.add('client:plates:ready',()=>{ready=true;display();});
mp.events.add('browserDomReady',b=>{if(b===browser){ready=true;display();}});
mp.events.add('client:plates:data',json=>{if(opened&&kind==='generator'){payload=JSON.parse(json);viewAck=false;display();}});
mp.events.add('client:plates:action',(request,action,payment,revision,region)=>{if(opened&&kind==='generator')mp.events.callRemote('server:plates:action',payload.session,request,action,payment,revision,region);});
mp.events.add('client:plates:refresh',request=>{if(opened&&kind==='generator')mp.events.callRemote('server:plates:refresh',payload.session,request);});
mp.events.add('client:plates:saved',plate=>{close();mp.events.call('client:chat:message','Номер '+plate+' сохранён в инвентарь. У своей машины нажмите G → Номер.');});
mp.events.add('client:plates:close',close);
mp.events.add('legacy:plates:choose',(id,json)=>{choice=id;open('choose',JSON.parse(json));});
mp.events.add('legacy:plates:install',plate=>{if(opened&&kind==='choose'){mp.events.callRemote('server:plates:install',choice,plate);close();}});
global.bindGameplayKey(0x45,true,()=>{if(nearest&&!opened&&!mp.gui.cursor.visible&&!global.isObjectPlacerActive)mp.events.callRemote('server:plates:open');});
global.bindGameplayKey(0x1b,true,()=>{if(opened)close();});
setInterval(()=>{nearest=null;if(!global.isPlayerSpawned||global.isDead||mp.players.local.vehicle)return;
 const p=mp.players.local,pos=p.position;mp.peds.forEachInStreamRange(n=>{if(n.getVariable('legacyService')!=='plates'||n.dimension!==p.dimension)return;const v=n.position;if(Math.hypot(v.x-pos.x,v.y-pos.y,v.z-pos.z)<2.5)nearest=n;});
 if(opened&&kind==='generator'&&!nearest)close();
},150);
mp.events.add('render',()=>{if(opened){mp.game.controls.disableAllControlActions(0);return;}if(nearest&&!mp.gui.cursor.visible&&!global.isObjectPlacerActive){const p=nearest.position;mp.game.graphics.drawText('[E] Генератор номеров',[p.x,p.y,p.z+1.1],{font:4,scale:[.3,.3],colour:[255,255,255,230],outline:true});}});
for(const event of ['client:auth:show','client:charselect:show','client:death:show'])mp.events.add(event,()=>{if(opened)close();});

mp.events.add('legacy:plates:remove',()=>{if(opened&&kind==='choose'){mp.events.callRemote('server:plates:remove',choice);close();}});

const fixedClerks=new Map();
function holdClerk(n){if(!n||n.type!=='ped'||!n.handle||n.getVariable('legacyService')!=='plates')return;let pose;try{pose=JSON.parse(n.getVariable('objectPlacer'));}catch(_){return;}if(pose.editing){fixedClerks.delete(n);return;}if(fixedClerks.get(n)!==n.handle){n.clearTasksImmediately();n.setBlockingOfNonTemporaryEvents(true);n.setInvincible(true);n.freezePosition(true);n.taskStandStill(-1);fixedClerks.set(n,n.handle);}n.freezePosition(true);n.setHeading(pose.h);}
mp.events.add('entityStreamIn',holdClerk);mp.events.addDataHandler('legacyService',holdClerk);mp.events.add('entityStreamOut',n=>fixedClerks.delete(n));setInterval(()=>mp.peds.forEachInStreamRange(holdClerk),1000);
