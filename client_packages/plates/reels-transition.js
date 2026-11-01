(function(){
 'use strict';const $=id=>document.getElementById(id),trigger=(e,...a)=>{if(typeof mp!=='undefined')mp.trigger(e,...a);};let state=null,job=null,payment='cash',counter=0,signature='';
 const slots=Array.from({length:6},(_,i)=>{const el=document.createElement('div'),strip=document.createElement('div');el.className='slot'+(i>0&&i<4?' digit':'');strip.className='reel-strip';el.appendChild(strip);$('number').appendChild(el);const rows=Array.from({length:2},()=>{const r=document.createElement('span');strip.appendChild(r);return r;});return {el,strip,rows,listener:null};});
 function text(id,s){const e=$(id);if(e.textContent!==s)e.textContent=s;}
 function stop(){for(const s of slots){if(s.listener)s.strip.removeEventListener('transitionend',s.listener);s.listener=null;for(const a of s.strip.getAnimations())a.cancel();s.strip.style.transition='none';s.strip.style.transform='translate3d(0,0,0)';s.strip.style.willChange='auto';}}
 function clear(){if(job){for(const t of job.timers)if(t!==null&&t!==undefined)clearTimeout(t);for(const id of job.frames)cancelAnimationFrame(id);}job=null;stop();}
 function plate(value){stop();slots.forEach((s,i)=>{s.rows[0].textContent=value?value[i]:'';});}
 function lock(){for(const id of ['rollDigits','rollLetters','regionSelect'])$(id).disabled=!!job||!state;$('save').disabled=!!job||!state||!state.canSave;}
 function render(){plate(state&&state.plate);lock();if(!state)return;text('regionValue',state.region);$('regionValue').parentElement.classList.toggle('long',state.region.length===3);const sig=JSON.stringify(state.regions);if(sig!==signature){signature=sig;$('regionSelect').textContent='';for(const r of state.regions){const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' · '+Number(r.cost).toLocaleString('ru-RU')+' $';$('regionSelect').appendChild(o);}}$('regionSelect').value=state.region;const cost=Number(state.cost).toLocaleString('ru-RU')+' $';text('rollDigits','↻ '+cost);text('rollLetters','↻ '+cost);text('cash',Number(state.cash).toLocaleString('ru-RU')+' $');text('bank',Number(state.bank).toLocaleString('ru-RU')+' $');text('priceNote','Регион '+state.region+' · прокрутка '+cost+'. Сохранение бесплатно.');text('error',state.error||'');}
 function complete(data){clear();state=data;render();}
 function action(kind,region){
   if(!state||job)return;const id='plate-'+Date.now().toString(36)+'-'+(++counter),current={id,kind,phase:'waiting',timers:[],frames:[]};job=current;lock();text('error','');
   current.timers.push(setTimeout(()=>{if(job===current)trigger('client:plates:refresh',id);},5000),setTimeout(()=>{if(job!==current)return;clear();render();text('error','Нет ответа. Откройте генератор снова для проверки результата.');},14000));
   if(kind==='letters'||kind==='digits')for(let i=0;i<slots.length;i++){if((kind==='digits')!==(i>0&&i<4))continue;const s=slots[i],alphabet=kind==='digits'?'0123456789':'АВЕКМНОРСТУХ';s.rows[0].textContent=alphabet[(counter+i)%alphabet.length];s.rows[1].textContent=alphabet[(counter+i+1)%alphabet.length];s.strip.animate([{transform:'translateY(0)'},{transform:'translateY(-50%)'}],{duration:85+i*12,iterations:Infinity,easing:'linear'});}
   trigger('client:plates:action',id,kind,payment,state.revision,region||state.region);
 }
 function update(data){
   if(!data||typeof data.plate!=='string'||!Array.isArray(data.regions)||state&&state.session!==data.session||job&&data.responseTo!==job.id)return;
   if(state&&data.region===state.region&&data.revision<state.revision)return;
   if(job&&!data.error&&(job.kind==='letters'||job.kind==='digits')){const current=job;current.timers.push(setTimeout(()=>{if(job!==current)return;complete(data);for(const s of slots)s.el.animate([{opacity:.65,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:120,easing:'ease-out'});},240));}else complete(data);
 }
 for(const b of document.querySelectorAll('[data-pay]'))b.addEventListener('click',()=>{if(job)return;payment=b.dataset.pay;for(const o of document.querySelectorAll('[data-pay]'))o.classList.toggle('active',o===b);});
 $('rollDigits').addEventListener('click',()=>action('digits'));$('rollLetters').addEventListener('click',()=>action('letters'));$('regionSelect').addEventListener('change',()=>action('region',$('regionSelect').value));$('save').addEventListener('click',()=>{if(state&&state.canSave)action('save');});$('close').addEventListener('click',()=>trigger('client:plates:close'));$('rules').addEventListener('click',()=>text('error','Спецсерии недоступны. Результат отображается сразу после подтверждения сервером.'));
 window.addEventListener('keydown',e=>{if(e.key==='Escape')trigger('client:plates:close');});window.addEventListener('pagehide',clear);
 window.PLATES_UI={update,show(data){$('shell').hidden=false;update(data);},loading(){clear();state=null;render();$('shell').hidden=false;text('error','Загрузка…');},hide(){clear();state=null;render();$('shell').hidden=true;},fail(e){clear();render();text('error',String(e));}};trigger('client:plates:ready');
}());
