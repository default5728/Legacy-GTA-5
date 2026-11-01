"use strict";
const cache=new Map(),applied=new Map();let lastWarning=0;
const valid=plate=>typeof plate==='string'&&(plate===''||/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(plate));
function detach(v){const plate=applied.get(v);applied.delete(v);const entry=cache.get(plate);if(entry){entry.users.delete(v);entry.handles.delete(v);}}
mp.events.add('legacy:plateTexture:ready',plate=>{const entry=cache.get(plate);if(entry){entry.ready=true;entry.handles.clear();}});
mp.events.add('browserDomReady',browser=>{for(const [plate,entry]of cache)if(entry.browser===browser){browser.active=true;browser.execute('window.renderPlate&&window.renderPlate('+JSON.stringify(plate)+');');}});
mp.events.addDataHandler('legacyPlateVisual',v=>{const entry=cache.get(applied.get(v));if(entry)entry.handles.delete(v);});
mp.events.add('entityStreamOut',detach);
setInterval(()=>{
 try{
  if(typeof mp.browsers.newHeadless!=='function')throw Error('newHeadless is unavailable');
  const p=mp.players.local.position,candidates=[];
  mp.vehicles.forEachInStreamRange(v=>{const plate=v.getVariable('legacyPlateVisual');if(!v.handle||!valid(plate))return;const x=v.position,d=Math.hypot(x.x-p.x,x.y-p.y,x.z-p.z);if(d<55)candidates.push({v,plate,d});});
  const wanted=candidates.sort((a,b)=>a.d-b.d).slice(0,4),live=new Set(wanted.map(x=>x.v));
  for(const v of applied.keys())if(!live.has(v)||!mp.vehicles.exists(v))detach(v);
  for(const {v,plate}of wanted){
   if(typeof v.setNumberPlateTexture!=='function')throw Error('setNumberPlateTexture is unavailable');
   if(applied.get(v)!==plate){detach(v);applied.set(v,plate);}
   let entry=cache.get(plate);
   if(!entry){const browser=mp.browsers.newHeadless('http://package/plates/texture.html#'+encodeURIComponent(plate),512,128,false);browser.active=true;entry={browser,ready:false,users:new Set(),handles:new Map(),created:Date.now()};cache.set(plate,entry);}
   entry.users.add(v);
   const dict=entry.browser.headlessTextureDict,name=entry.browser.headlessTextureName,old=entry.handles.get(v);
   if(entry.ready&&dict&&name&&(!old||old.handle!==v.handle||Date.now()-old.at>10000)){
    // A space prevents GTA from generating replacement native characters.
    mp.game.graphics.requestStreamedTextureDict('vehshare',false);
    v.setNumberPlateText(' ');v.setNumberPlateTextIndex(0);
    v.setNumberPlateTexture(dict,name,'vehshare','plate01_n');
    entry.handles.set(v,{handle:v.handle,at:Date.now()});
   }
   if(!entry.ready&&Date.now()-entry.created>5000){entry.browser.execute('window.renderPlate&&window.renderPlate('+JSON.stringify(plate)+');');entry.created=Date.now();}
  }
  for(const [plate,entry]of cache)if(!entry.users.size){entry.browser.destroy();cache.delete(plate);}
 }catch(e){if(Date.now()-lastWarning>30000){lastWarning=Date.now();console.warn('[PLATE TEXTURE]',e.message);mp.events.callRemote('legacy:plates:textureError',String(e.message).slice(0,160));}}
},500);
