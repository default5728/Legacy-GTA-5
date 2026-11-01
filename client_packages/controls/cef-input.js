// Forward physical keys when CEF owns focus. Registry decides which keys toggle the cursor.
(function(){
 const held=new Set();
 function send(event,...args){if(typeof mp!=='undefined'&&mp.trigger)mp.trigger(event,...args);}
 function keyCode(event){
   if(event.code==='Backquote'||event.key==='ё'||event.key==='Ё')return 192;
   const modifiers={ShiftLeft:160,ShiftRight:161,ControlLeft:162,ControlRight:163,AltLeft:164,AltRight:165};
   return modifiers[event.code]||event.keyCode||event.which;
 }
 window.addEventListener('keydown',event=>{
   if(event.repeat||event.defaultPrevented)return;
   const target=event.target;
   if(target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))return;
   const key=keyCode(event);if(!key||held.has(key))return;
   held.add(key);send('client:controls:cefKey',key,true);
 });
 window.addEventListener('keyup',event=>{
   const key=keyCode(event);if(!held.delete(key))return;send('client:controls:cefKey',key,false);
 });
 window.addEventListener('blur',()=>{held.clear();send('client:controls:cefBlur');});
}());
