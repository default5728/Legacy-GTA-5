'use strict';
const access=require('./access'),last=new WeakMap();
mp.events.add('legacy:clothing:identity',(p,raw)=>{
 try{
  const id=access.assertPlayer(p);
  if(typeof raw!=='string'||raw.length>40000)return;
  const data=JSON.parse(raw);
  const expected=data.schema===2?[...Array.from([1,3,4,5,6,7,8,9,10,11],slot=>['components',slot]),...Array.from([0,1,2,6,7],slot=>['props',slot])]:[4,6,11].map(slot=>['components',slot]);
  if(data.model!==(p.model>>>0)||!['enhanced','legacy'].includes(data.edition)||!Array.isArray(data.slots)||data.slots.length!==expected.length)return;
  if(!Number.isSafeInteger(data.handle)||data.handle<1)return;
  const key=id.characterId+':'+data.model+':'+(data.schema||1);if(last.get(p)===key){p.call('legacy:clothing:identity:ack',[data.handle,data.model]);return;}
  for(let i=0;i<expected.length;i++){
   const s=data.slots[i],prop=expected[i][0]==='props';if(!s||s.slot!==expected[i][1]||(data.schema===2&&s.kind!==expected[i][0])||!Array.isArray(s.textures)||s.textures.length<(prop?0:1)||s.textures.length>1600||s.textures.some(n=>!Number.isInteger(n)||n<0||n>256))return;
   if(!Array.isArray(s.current)||s.current.length!==2||!s.current.every(Number.isInteger)||s.current[0]<(prop?-1:0)||s.current[0]>=s.textures.length||s.current[1]<0||s.current[1]>255)return;
  }
  last.set(p,key);p._legacyClothingIdentity=data;
  p.call('legacy:clothing:identity:ack',[data.handle,data.model]);
  console.log('[CLOTHING IDENTITY]',JSON.stringify({cid:p.static,...data}));
 }catch(_){}
});
