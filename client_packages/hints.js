// Shared, change-only interface for gameplay hints. New systems reuse the same typography.
const hints={};
global.HINTS={
 set(id,text,tone='neutral'){
   if(!/^[a-z][a-z0-9_]{0,30}$/.test(id))return;
   const next=text?{text:String(text),tone:tone==='gold'?'gold':'neutral'}:null;
   const old=hints[id];if((!old&&!next)||(old&&next&&old.text===next.text&&old.tone===next.tone))return;
   if(next)hints[id]=next;else delete hints[id];
   mp.events.call('client:hints:changed',JSON.stringify(hints));
 },
 snapshot:()=>JSON.stringify(hints),
 clear(){for(const id of Object.keys(hints))delete hints[id];mp.events.call('client:hints:changed','{}');}
};
for(const event of ['client:auth:show','client:charselect:show','client:charcreator:open'])mp.events.add(event,()=>global.HINTS.clear());
