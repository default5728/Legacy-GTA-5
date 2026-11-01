'use strict';
let enabled=false;
function stop(){enabled=false;mp.players.local.setInvincible(!!(global.flyStatus||global.isAdminSpectating));}
mp.events.add('client:admin:god',value=>{enabled=value===true;if(enabled)mp.players.local.setInvincible(true);else stop();});
mp.events.add('render',()=>{if(enabled)mp.players.local.setInvincible(true);});
for(const event of ['client:auth:show','client:charselect:show','client:charcreator:open','playerDeath'])mp.events.add(event,stop);
