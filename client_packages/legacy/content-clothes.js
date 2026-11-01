'use strict';
let last='',pendingKey='',pendingAt=0;
mp.events.add('legacy:content:clothes:ready',(model,tops,feet)=>{const p=mp.players.local;if((p.model>>>0)===(model>>>0))last=[p.handle,p.model,tops,feet].join(':');});
setInterval(()=>{
 try{
  const p=mp.players.local;if(!global.isPlayerSpawned||p.getVariable('auth')!==true)return;
  const api=mp.game.ped,tops=api.getNumberOfDrawableVariations(p.handle,11),feet=api.getNumberOfDrawableVariations(p.handle,6);
  const key=[p.handle,p.model,tops,feet].join(':');if(key===last||tops<1||feet<1)return;
  const tt=api.getNumberOfTextureVariations(p.handle,11,tops-1),st=api.getNumberOfTextureVariations(p.handle,6,feet-1);
  if(tt!==15||st!==2)return;
  if(key===pendingKey&&Date.now()-pendingAt<2000)return;pendingKey=key;pendingAt=Date.now();mp.events.callRemote('legacy:content:clothes',p.model,tops,feet,tt,st);
 }catch(_){}
},500);
