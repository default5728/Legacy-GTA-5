const handlers=new Map(),lastError=new Map();
function validTable(t){return !!t&&typeof t==='object'&&!!t.game;}
function invoke(handler,t){
 if(t!==undefined&&!validTable(t))return false;
 if(typeof handler!=='function')return false;
 return handler(t)===true;
}
global.INTERACTIONS={register(id,handler,t){if(typeof id!=='string'||typeof handler!=='function'||t!==undefined&&!validTable(t))return false;handlers.set(id,{handler,t});return true;}};
global.CONTROLS.on('interact',()=>{
 if(global.isInteractionOpen||global.isCasinoTableOpen||global.isWaypointTeleporting||!global.isPlayerSpawned||global.isDead||global.isMenuOpen||global.isInventoryOpen||global.isChatInputActive)return;
 for(const [id,entry] of handlers){
   try{if(invoke(entry.handler,entry.t))return;}catch(error){const now=Date.now();if(!lastError.has(id)||now-lastError.get(id)>10000){lastError.set(id,now);console.error('[INTERACTION '+id+'] '+String(error&&error.message||error));}}
 }
});
