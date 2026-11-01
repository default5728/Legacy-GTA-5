'use strict';
// This collection appends one top and one pair of shoes per freemode gender.
module.exports=function registerNewClothes(){
 const access=require('./access');
 mp.events.add('legacy:content:clothes',(player,model,tops,feet,topTextures,shoeTextures)=>{
  try{
   access.assertPlayer(player);if((Number(model)>>>0)!==(player.model>>>0))return;
   if(![tops,feet,topTextures,shoeTextures].every(Number.isInteger)||tops<100||tops>1600||feet<50||feet>600||topTextures!==15||shoeTextures!==2)return;
   player._legacy26Styles={model:player.model,top:tops-1,feet:feet-1};
   player.call('legacy:content:clothes:ready',[model,tops,feet]);
  }catch(_){}
 });
 global.legacyRegularClothesCatalogue=player=>{
  const base=global.ClothesItemsSell||[],data=player&&player._legacy26Styles;
  if(!data||data.model!==player.model)return base;
  const female=player.model===mp.joaat('mp_f_freemode_01'),extra=[];
  for(const [cid,component,drawable,textures,name,itemid,price]of [[3,11,data.top,15,'Базовый унисекс-топ',female?19001:9001,20000],[5,6,data.feet,2,'Balenciaga Track Runner',female?19002:9002,12000]]){
   for(let fraction=1;fraction<=6;fraction++)for(let t=0;t<textures;t++)extra.push({ClothID:cid,ItemID:itemid,ItemName:name,Price:price,Drawable:drawable,ItemImg:'',Textures:null,TopTexture:t,Frac:fraction,Component:component,Torso:cid===3?0:null});
  }
  return base.concat(extra);
 };
};
