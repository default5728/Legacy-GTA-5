'use strict';
let last='',pending='',sentAt=0;
mp.events.add('legacy:clothing:identity:ack',(handle,model)=>{const p=mp.players.local;if(p.handle===handle&&(p.model>>>0)===(model>>>0))last=p.handle+':'+p.model;});
setInterval(()=>{
 try{
  const p=mp.players.local;
  if(!global.isPlayerSpawned||p.getVariable('auth')!==true){last='';pending='';return;}
  const key=p.handle+':'+p.model;if(key===last)return;
  if(pending===key&&Date.now()-sentAt<6000)return;
  const api=mp.game.ped,slots=[];
  for(const [kind,ids]of [['components',[1,3,4,5,6,7,8,9,10,11]],['props',[0,1,2,6,7]]])for(const slot of ids){
   const prop=kind==='props',count=prop?api.getNumberOfPropDrawableVariations(p.handle,slot):api.getNumberOfDrawableVariations(p.handle,slot);
   if(!Number.isInteger(count)||count<(prop?0:1)||count>1600)return;
   const textures=[];
   for(let i=0;i<count;i++){const n=prop?api.getNumberOfPropTextureVariations(p.handle,slot,i):api.getNumberOfTextureVariations(p.handle,slot,i);if(!Number.isInteger(n)||n<0||n>256)return;textures.push(n);}
   const current=prop?[p.getPropIndex(slot),Math.max(0,p.getPropTextureIndex(slot))]:[p.getDrawableVariation(slot),p.getTextureVariation(slot)];
   if(prop&&[255,65535,4294967295].includes(current[0]))current[0]=-1;
   slots.push({kind,slot,textures,current});
  }
  const data={schema:2,model:p.model>>>0,edition:mp.game.gameplay.isGen9===true?'enhanced':'legacy',slots};
  data.handle=p.handle;mp.events.callRemote('legacy:clothing:identity',JSON.stringify(data));pending=key;sentAt=Date.now();
 }catch(_){}
},3000);
