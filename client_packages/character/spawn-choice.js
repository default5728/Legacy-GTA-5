(function(){
 const style=document.createElement('style');
 style.textContent=`.spawn-panel{display:none;position:fixed;left:50%;bottom:7vh;transform:translateX(-50%);width:min(580px,90vw);padding:28px;background:rgba(17,19,23,.92);border:1px solid #ffffff20;border-radius:12px;font-family:'Bahnschrift','Segoe UI',sans-serif;color:#eee;z-index:1000}.spawn-panel.open{display:block}.spawn-panel h2{font-size:23px;font-weight:400;letter-spacing:.025em;margin-bottom:8px}.spawn-panel p{color:#aaa;font-size:14px;line-height:1.6}.spawn-options{display:flex;gap:12px;margin:20px 0}.spawn-panel button{font:inherit;font-size:14px;cursor:pointer;border:1px solid #ffffff25;border-radius:6px;color:#ddd;background:#ffffff08;padding:13px 16px}.spawn-options button{flex:1}.spawn-options button.selected{border-color:#ddd;background:#ffffff15;color:white}.spawn-panel button:disabled{opacity:.5;cursor:default}.spawn-actions{display:flex;justify-content:space-between;gap:12px}.spawn-panel .spawn-enter{background:#e7e7e7;color:#17191d;min-width:140px}.spawn-error{min-height:22px;color:#dcb7ac!important;margin-bottom:8px}`;
 document.head.appendChild(style);
 const panel=document.createElement('section');panel.className='spawn-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Выбор точки входа');
 const title=document.createElement('h2');title.textContent='Где начнём?';panel.appendChild(title);
 const note=document.createElement('p');note.textContent='Выберите точку входа — камера покажет её перед появлением.';panel.appendChild(note);
 const options=document.createElement('div');options.className='spawn-options';panel.appendChild(options);
 const error=document.createElement('p');error.className='spawn-error';error.setAttribute('role','status');panel.appendChild(error);
 const actions=document.createElement('div');actions.className='spawn-actions';panel.appendChild(actions);
 const back=document.createElement('button');back.type='button';back.textContent='Назад';actions.appendChild(back);
 const enter=document.createElement('button');enter.type='button';enter.className='spawn-enter';enter.textContent='Войти';actions.appendChild(enter);
 document.body.appendChild(panel);
 let data=null,selected=null,busy=false,timeout=null;
 function call(name,...args){if(typeof mp!=='undefined')mp.trigger(name,...args);}
 function lock(value){busy=value;enter.disabled=value;back.disabled=value;for(const button of options.children)button.disabled=value;enter.textContent=value?'Вход…':'Войти';}
 function choose(id){if(busy||!data||!data.choices.some(c=>c.id===id))return;selected=id;for(const button of options.children)button.classList.toggle('selected',button.dataset.choice===id);call('client:spawn:preview',id);}
 back.addEventListener('click',()=>{if(busy)return;panel.classList.remove('open');document.getElementById('selectView').style.display='';data=null;call('client:spawn:cancel');});
 enter.addEventListener('click',()=>{if(busy||!selected)return;error.textContent='';lock(true);call('client:spawn:confirm',selected);timeout=setTimeout(()=>{lock(false);error.textContent='Вход занимает больше времени. Можно повторить попытку.';},10000);});
 window.CHAR_UI.showSpawnOptions=value=>{
   if(!value||!Array.isArray(value.choices)||!value.choices.length)return;
   clearTimeout(timeout);data=value;selected=null;lock(false);error.textContent='';options.textContent='';
   document.getElementById('selectView').style.display='none';panel.classList.add('open');
   for(const choice of data.choices){const button=document.createElement('button');button.type='button';button.dataset.choice=choice.id;button.textContent=choice.label;button.addEventListener('click',()=>choose(choice.id));options.appendChild(button);}
   choose(data.choices[0].id);
 };
 window.CHAR_UI.showSpawnError=message=>{clearTimeout(timeout);lock(false);error.textContent=String(message);};
}());
