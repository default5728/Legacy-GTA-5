(function(){
 const style=document.createElement('style');
 style.textContent=`.game-hints{position:fixed;left:50%;bottom:5.5vh;transform:translateX(-50%);width:min(92vw,1100px);display:flex;flex-direction:column;align-items:center;gap:16px;pointer-events:none;z-index:120}.game-hint{font-family:'Bahnschrift','Segoe UI',sans-serif;font-size:16px;font-weight:400;font-stretch:semi-condensed;letter-spacing:.045em;line-height:1.55;text-align:center;white-space:pre-line;color:rgb(255,255,255);text-shadow:0 1px 5px rgba(0,0,0,.85)}.game-hint.gold{color:rgb(255,216,130)}.game-hint.casino{margin-bottom:4vh}@media(max-width:1300px){.game-hint{font-size:14px}}`;
 document.head.appendChild(style);
 const host=document.createElement('div');host.className='game-hints';document.body.appendChild(host);
 const elements=new Map();
 window.HUD_UI.setHints=data=>{
   if(!data||typeof data!=='object')return;
   for(const [id,el]of elements)if(!data[id]){el.remove();elements.delete(id);}
   for(const id of ['casino','engine','flight',...Object.keys(data).filter(k=>!['casino','engine','flight'].includes(k))]){
     const hint=data[id];if(!hint||typeof hint.text!=='string')continue;
     let el=elements.get(id);if(!el){el=document.createElement('div');elements.set(id,el);host.appendChild(el);}el.className='game-hint '+(id==='casino'?'casino ':'')+(hint.tone==='gold'?'gold':'');if(el.textContent!==hint.text)el.textContent=hint.text;
   }
 };
 if(typeof mp!=='undefined')mp.trigger('client:hints:ready');
}());
