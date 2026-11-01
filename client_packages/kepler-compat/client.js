'use strict';
global.isPlayerSpawned=false;
const originalPreAuthGate=global.isPreAuthUiBlockingGameplay;
global.isPreAuthUiBlockingGameplay=()=>!global.isPlayerSpawned||(typeof originalPreAuthGate==='function'&&originalPreAuthGate());
mp.events.add('client:auth:login',(login,password)=>mp.events.call('loginAttempt',JSON.stringify({login,password})));
mp.events.add('client:auth:register',(login,email,password)=>mp.events.call('registerAttempt',JSON.stringify({login,email,password})));
mp.events.add('client:auth:success',()=>{if(typeof global.destroyAuthChromeFully==='function')global.destroyAuthChromeFully();});
mp.events.add('client:charselect:show',()=>{global.isPlayerSpawned=false;});
mp.events.add('client:charselect:spawned',()=>{global.isPlayerSpawned=true;mp.players.local.setVisible(true,false);mp.players.local.setAlpha(255);});
mp.events.add('client:hud:chatActive',active=>{
 const typing=!!active,dead=mp.players.local.getVariable('dead')===true;
 mp.events.call('chatTypingState',typing);
 if(global.chatr&&mp.browsers.exists(global.chatr))global.chatr.orderId=typing&&dead?300:100;
 if(dead&&typeof global.setDeathMenuInteractable==='function')global.setDeathMenuInteractable(!typing);
 mp.gui.cursor.show(typing||dead,typing||dead);
});
mp.events.add('client:hud:sendChatMessage',text=>mp.events.call('chatSendSay',text));
mp.events.add('client:chat:message',text=>{if(global.chatr)global.chatr.execute('window.HUD_UI&&HUD_UI.addChatMessage('+JSON.stringify(text)+');');});
mp.events.add('client:inventory:closed',()=>mp.events.call('closeInventory'));
mp.events.add('client:inventory:ready',()=>{if(typeof inventoryBrowserr!=='undefined'&&inventoryBrowserr)inventoryBrowserr.execute('window.keplerInventoryRefresh&&keplerInventoryRefresh();');});
// Source controllers retain all warehouse, weapon, attachment and item validation paths.
mp.events.add('client:inventory:action',(action,itemId,requestId,extra)=>{if(typeof inventoryBrowserr==='undefined'||!inventoryBrowserr)return;inventoryBrowserr.execute('window.keplerInventoryAction&&keplerInventoryAction('+JSON.stringify(action)+','+JSON.stringify(itemId)+','+JSON.stringify(requestId)+','+JSON.stringify(extra)+');');});
mp.events.add('client:charcreator:open',()=>{mp.players.local.freezePosition(true);});

// Inventory leaves the gameplay camera untouched.
mp.events.add('kepler:legacy:use:client',raw=>mp.events.callRemote('kepler:legacy:use',raw));


global.keplerHideInventoryBrowser=()=>{if(typeof inventoryBrowserr==='undefined'||!inventoryBrowserr)return;inventoryBrowserr.execute('window.INVENTORY_UI&&INVENTORY_UI.hide();');setTimeout(()=>{if(typeof invop!=='undefined'&&!invop&&!global.__groundPickupModalOnly&&inventoryBrowserr)inventoryBrowserr.active=false;},360);};

mp.events.add('kepler:ui:error', (file,line)=>mp.events.callRemote('kepler:ui:error:s',String(file||'').slice(0,180),Number(line)||0));

mp.events.add('legacy:hud:state',raw=>{if(global.chatr)global.chatr.execute('if(window.hudMain){hudMain.keplerMeta('+JSON.stringify(raw)+');mp.trigger("legacy:hud:rendered",document.getElementById("cashAmount").textContent,document.getElementById("bankAmount").textContent);}');});
mp.events.add('legacy:hud:rendered',(cash,bank)=>mp.events.callRemote('legacy:hud:rendered',String(cash).slice(0,64),String(bank).slice(0,64)));

mp.events.add('legacy:inventory:drop',(request,slot,index,expected)=>mp.events.callRemote('legacy:inventory:drop',request,slot,index,expected));
mp.events.add('legacy:inventory:ack',(request,ok,message)=>{if(typeof inventoryBrowserr!=='undefined'&&inventoryBrowserr)inventoryBrowserr.execute('window.INVENTORY_UI&&INVENTORY_UI.ack('+JSON.stringify(request)+','+JSON.stringify(ok)+','+JSON.stringify(message)+');');});
