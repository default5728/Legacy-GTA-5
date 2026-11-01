'use strict';
mp.events.add('client:admin:clearChat',()=>{if(global.chatr)global.chatr.execute('window.chatAPI&&window.chatAPI.clear();');});
mp.events.add('legacy:checkModel',name=>{
 if(!/^[a-zA-Z0-9_]{1,64}$/.test(name))return;
 const hash=mp.game.joaat(name),registered=mp.game.streaming.isModelInCdimage(hash),valid=mp.game.streaming.isModelValid(hash);
 mp.events.call('client:chat:message',`[MODEL] ${name}: зарегистрирована ${registered?'ДА':'НЕТ'}, валидна ${valid?'ДА':'НЕТ'}`);
});
mp.events.add('legacy:checkInterior',()=>{
 const p=mp.players.local,pos=p.position,id=mp.game.interior.getInteriorAtCoords(pos.x,pos.y,pos.z);
 mp.events.call('client:chat:message',`[PD] Интерьер в текущей точке: ${id} | READY ${id&&mp.game.interior.isInteriorReady(id)?'ДА':'НЕТ'}`);
});
global.bindGameplayKey(0x1b,true,()=>{if(global.isAdminSpectating)mp.events.callRemote('server:admin:spectateStop');});
mp.events.add('playerReady',()=>mp.events.callRemote('legacy:boot:phase','player-ready'));
mp.events.add('browserDomReady',browser=>{if(browser===global.chatr)mp.events.callRemote('legacy:hud:request');});
