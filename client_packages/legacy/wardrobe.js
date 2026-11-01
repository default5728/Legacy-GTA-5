"use strict";
let readyAt=0,last='';
mp.events.add('legacy:wardrobe:ready',()=>{readyAt=Date.now()+2500;last='';});
for(const event of ['client:auth:show','client:charselect:show'])mp.events.add(event,()=>{readyAt=0;last='';});
setInterval(()=>{
 if(!readyAt||Date.now()<readyAt||!global.isPlayerSpawned)return;
 const p=mp.players.local;if(!p||!p.handle||Number(p.getVariable('adminlvl'))<7)return;
 try{
  const components=[1,3,4,5,6,7,8,9,10,11].map(s=>[s,p.getDrawableVariation(s),p.getTextureVariation(s),p.getPaletteVariation(s)]);
  const props=[0,1,2,6,7].map(s=>[s,p.getPropIndex(s),p.getPropTextureIndex(s)]).map(r=>[r[0],r[1],Math.max(0,r[2])]);
  const value=JSON.stringify({components,props});if(value===last)return;last=value;
  mp.events.callRemote('legacy:wardrobe:changed',value);
 }catch(e){mp.console.logError('[WARDROBE CAPTURE] '+e.message);}
},2000);
