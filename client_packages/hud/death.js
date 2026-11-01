(function(){
 const style=document.createElement('style');style.textContent=`.death-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:250;background:rgba(7,9,13,.64);font-family:'Bahnschrift','Segoe UI',sans-serif;color:#eee}.death-overlay.open{display:flex}.death-card{width:min(440px,88vw);padding:42px;text-align:center;background:rgba(16,18,23,.88);border:1px solid #ffffff18;border-radius:10px}.death-card h1{font-size:38px;font-weight:500;letter-spacing:.13em;margin:8px 0 16px}.death-card p{color:#aeb2bb;font-size:15px;line-height:1.6}.death-clock{font-variant-numeric:tabular-nums;font-size:30px;letter-spacing:.08em;margin:20px 0;color:#d7dae0}.death-card button{font:inherit;font-size:15px;width:100%;padding:14px;border:1px solid #ffffff30;border-radius:5px;background:#dedfe2;color:#13161b;cursor:pointer}.death-card button:disabled{background:#ffffff09;color:#777d87;border-color:#ffffff14;cursor:default}.death-visible .hud-chat{z-index:350}.death-status{min-height:24px;font-size:13px!important;margin-top:12px}`;document.head.appendChild(style);
 const overlay=document.createElement('section');overlay.className='death-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Смерть персонажа');
 const card=document.createElement('div');card.className='death-card';overlay.appendChild(card);
 const title=document.createElement('h1');title.textContent='ВЫ УМЕРЛИ';card.appendChild(title);
 const note=document.createElement('p');note.textContent='Возрождение станет доступно через минуту.';card.appendChild(note);
 const clock=document.createElement('div');clock.className='death-clock';card.appendChild(clock);
 const button=document.createElement('button');button.type='button';button.textContent='Возродиться';button.disabled=true;card.appendChild(button);
 const status=document.createElement('p');status.className='death-status';status.setAttribute('role','status');card.appendChild(status);
 document.body.appendChild(overlay);
 let state=null,timer=null,requestTimeout=null,lastRemaining=null;
 function tick(){if(!state)return;const remaining=Math.max(0,Math.ceil((state.readyAt-Date.now())/1000));if(lastRemaining!==remaining){lastRemaining=remaining;clock.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');}button.disabled=remaining>0||state.busy;note.textContent=remaining?'Дождитесь окончания отсчёта.':'Вы можете вернуться в игру.';}
 button.addEventListener('click',()=>{if(!state||button.disabled)return;state.busy=true;tick();status.textContent='Возрождение…';if(typeof mp!=='undefined')mp.trigger('client:death:respawn',state.token);requestTimeout=setTimeout(()=>{if(state){state.busy=false;status.textContent='Попробуйте ещё раз.';tick();}},5000);});
 window.HUD_UI.setDeath=data=>{
   clearInterval(timer);clearTimeout(requestTimeout);timer=null;status.textContent='';
   if(!data){state=null;overlay.classList.remove('open');document.body.classList.remove('death-visible');return;}
   lastRemaining=null;state={token:data.token,readyAt:Date.now()+Math.max(0,Number(data.seconds)||0)*1000,busy:false};overlay.classList.add('open');document.body.classList.add('death-visible');tick();timer=setInterval(tick,500);
 };
 if(typeof mp!=='undefined')mp.trigger('client:death:ready');
}());
