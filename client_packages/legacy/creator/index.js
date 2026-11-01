'use strict';
let browser=null,opened=false,pending=null,target=null,shapes=[],lastSync=0,transition=false;
function active(){return global.isPlayerSpawned&&mp.players.local.getVariable('auth')===true;}
function close(){opened=false;global.isCreatorOpen=false;if(browser)browser.active=false;mp.gui.cursor.show(false,false);}
function show(){if(browser&&pending)browser.execute('window.Creator&&Creator.load('+JSON.stringify(pending)+')');}
mp.events.add('legacy:creator:state',raw=>{pending=JSON.parse(raw);show();});
mp.events.add('legacy:creator:open',()=>{if(!browser)browser=mp.browsers.new('package://legacy/creator/index.html');opened=true;global.isCreatorOpen=true;browser.active=true;mp.gui.cursor.show(true,true);show();});
mp.events.add('browserDomReady',b=>{if(b===browser)show();});
mp.events.add('legacy:creator:close',close);
mp.events.add('legacy:creator:save:c',raw=>{if(!opened)return;try{const input=JSON.parse(raw);if(!input.remove&&['objects','peds'].includes(input.kind)){const hash=mp.game.joaat(input.data.model);if(!mp.game.streaming.isModelInCdimage(hash)||!mp.game.streaming.isModelValid(hash)||input.kind==='peds'&&!mp.game.streaming.isModelAPed(hash))throw Error('Модель не найдена или не соответствует NPC.');}mp.events.callRemote('legacy:creator:save',raw);}catch(e){mp.events.call('legacy:creator:notice',e.message);}});
mp.events.add('legacy:creator:notice',text=>{if(browser)browser.execute('window.Creator&&Creator.notice('+JSON.stringify(String(text))+')');});
mp.events.add('legacy:creator:position:c',()=>{if(!opened)return;const p=mp.players.local;browser.execute('window.Creator&&Creator.position('+JSON.stringify({x:p.position.x,y:p.position.y,z:p.position.z,dimension:p.dimension,heading:p.getHeading()})+')');});
function clear(){for(const s of shapes)s.shape.destroy();shapes=[];target=null;}
mp.events.add('legacy:creator:world',raw=>{try{const rows=JSON.parse(raw),wanted=new Map();for(const row of rows){if(!['peds','teleports'].includes(row.kind))continue;const points=row.kind==='teleports'&&row.data.mode!=='interaction_only'?[row.data.position,row.data.destination]:[row.data.position];points.forEach((point,side)=>{const key=row.kind+':'+row.id+':'+side,radius=row.kind==='peds'?2.5:row.data.radius,signature=JSON.stringify([point,radius]);wanted.set(key,{key,row,side,point,radius,signature});});}const next=[];for(const old of shapes){const current=wanted.get(old.key);if(current&&current.signature===old.signature){next.push({...current,shape:old.shape});wanted.delete(old.key);}else try{old.shape.destroy();}catch(_){}}for(const current of wanted.values()){const p=current.point;current.shape=mp.colshapes.newSphere(p.x,p.y,p.z,current.radius,p.dimension);next.push(current);}shapes=next;target=null;}catch(e){console.warn('[CREATOR SYNC]',e.message);}});

function blocked(){return !active()||opened||mp.gui.cursor.visible||global.isTypingInAnyTextField?.()||mp.players.local.vehicle||mp.players.local.getVariable('dead');}
global.bindGameplayKey(0x45,true,()=>{if(!blocked()&&target&&target.row.data.mode!=='teleport_only')mp.events.callRemote('legacy:creator:interact',target.row.kind+':'+target.row.id,target.side);});
mp.events.add('playerEnterColshape',shape=>{const hit=shapes.find(s=>s.shape===shape);if(hit&&hit.row.kind==='teleports'&&hit.row.data.mode==='teleport_only'&&!blocked())mp.events.callRemote('legacy:creator:interact','teleports:'+hit.row.id,hit.side);});
mp.events.add('render',()=>{if(blocked()||!target)return;if(target.row.data.mode==='teleport_only')return;mp.game.graphics.drawText(target.row.data.name+'\n[E] Взаимодействие',[.5,.8],{font:4,scale:[.35,.35],color:[235,235,240,235],outline:true,centre:true});});
setInterval(()=>{if(!active()){if(opened)close();clear();lastSync=0;return;}if(Date.now()-lastSync>30000){lastSync=Date.now();mp.events.callRemote('legacy:creator:request');}const p=mp.players.local;target=shapes.find(s=>s.point.dimension===p.dimension&&Math.hypot(p.position.x-s.point.x,p.position.y-s.point.y,p.position.z-s.point.z)<=s.radius)||null;},250);
mp.events.add('legacy:creator:fade',()=>{if(transition)return;transition=true;mp.game.cam.doScreenFadeOut(250);setTimeout(()=>mp.events.callRemote('legacy:creator:faded'),300);setTimeout(()=>{if(transition){transition=false;mp.game.cam.doScreenFadeIn(250);}},6000);});
mp.events.add('legacy:creator:arrived',()=>{const p=mp.players.local;mp.game.streaming.requestCollisionAtCoord(p.position.x,p.position.y,p.position.z);setTimeout(()=>{transition=false;mp.game.cam.doScreenFadeIn(250);},500);});
mp.events.add('entityStreamIn',e=>{try{if(e.type==='ped'&&e.getVariable('legacyCreatorId')){e.freezePosition(true);e.setInvincible(true);e.setBlockingOfNonTemporaryEvents(true);e.taskStandStill(-1);}}catch(_){}});

mp.events.add('legacy:creator:sourceSave:c',raw=>{if(opened)mp.events.callRemote('legacy:creator:sourceSave',raw);});

let stateBatch=null;mp.events.add('legacy:creator:statePart',(id,index,total,text)=>{if(!Number.isInteger(total)||total<1||total>2000||index<0||index>=total||typeof text!=='string')return;if(!stateBatch||stateBatch.id!==id)stateBatch={id,parts:new Array(total),received:0};if(stateBatch.parts[index]===undefined){stateBatch.parts[index]=text;stateBatch.received++;}if(stateBatch.received===total){const raw=stateBatch.parts.join('');stateBatch=null;mp.events.call('legacy:creator:state',raw);}});
