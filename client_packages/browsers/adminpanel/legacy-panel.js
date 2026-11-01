'use strict';
(() => {
 const $=id=>document.getElementById(id);
 let state={commands:[],prices:[],roles:[]},selectedCid=null;
 const labels={'flow.panel':'Доступ к панели','reports.read':'Просмотр репортов','reports.reply':'Ответы на репорты','player.revive':'Воскрешение','player.heal':'Лечение','player.teleport':'Телепорт игроков','player.freeze':'Заморозка','player.spectate':'Наблюдение','noclip':'Полёт','waypoint':'Телепорт на метку','vehicle.spawn':'Создание транспорта','vehicle.repair':'Ремонт','money.manage':'Управление деньгами (ранг 8+)','chat.mute':'Мут','chat.warn':'Предупреждения','player.kick':'Кик','player.jail':'Деморган','player.ban.temporary':'Временный бан','player.ban.permanent':'Постоянный бан'};
 const action=data=>{if(window.mp&&mp.trigger)mp.trigger('legacy:panel:action',JSON.stringify(data));};
 const option=(value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;return el;};
 let toastTimer;
 function notice(text,error=false){$('toolResults').textContent=($('toolResults').textContent+'\n'+text).trim().split('\n').slice(-20).join('\n');$('toolResults').classList.toggle('error',error);let toast=$('legacyToast');if(!toast){toast=document.createElement('div');toast.id='legacyToast';toast.setAttribute('role','status');document.querySelector('.container').append(toast);}toast.textContent=text;toast.hidden=false;toast.classList.toggle('error',error);clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,4000);}
 function renderTools(){
  const current=$('toolCommand').value,query=$('toolSearch').value.toLowerCase();
  $('toolCommand').replaceChildren(...state.commands.filter(c=>(c.name+' '+c.description).toLowerCase().includes(query)).map(c=>option(c.name,c.name+' — '+c.description)));
  if([...$('toolCommand').options].some(o=>o.value===current))$('toolCommand').value=current;
  describe();
 }
 function describe(){$('toolDescription').textContent=state.commands.find(c=>c.name===$('toolCommand').value)?.description||'Нет доступных действий.';}
 function renderPrices(){
  const query=$('businessSearch').value.toLowerCase();$('pricesGrid').replaceChildren();
  for(const row of state.prices.filter(r=>(r.business+' '+r.name).toLowerCase().includes(query))){
   const card=document.createElement('div');card.className='price-row';
   const label=document.createElement('label');label.textContent=({autosalon:'Автосалон',clothing:'Одежда',shop:'24/7',services:'Услуги',drinks:'Напитки'}[row.business]||row.business)+' · '+row.name+' · '+row.currency;
   const input=document.createElement('input');input.type='number';input.min='0';input.max='10000000000';input.step='1';input.value=row.price;
   const button=document.createElement('button');button.className='btn';button.textContent='Сохранить';button.onclick=()=>{if(input.reportValidity())action({action:'price',business:row.business,key:row.key,price:Number(input.value)});};
   card.append(label,input,button);$('pricesGrid').append(card);
  }
 }
 function update(data){
  if(typeof data==='string'){try{data=JSON.parse(data);}catch(_){return;}}
  if(data.type==='prices'){state.prices=data.rows;renderPrices();return;}
  if(data.type==='reportHistory'){const list=$('reportHistory');list.hidden=false;list.replaceChildren();for(const row of data.rows){const details=document.createElement('details');details.className='price-row';const summary=document.createElement('summary');summary.textContent='CID '+row.cid+' · '+row.login+' · '+row.status+' · '+new Date(Number(row.updated_at)).toLocaleString('ru-RU');const body=document.createElement('div');for(const msg of row.thread.messages||[]){const p=document.createElement('p');p.textContent=(msg.author||msg.role)+': '+msg.text;body.append(p);}details.append(summary,body);list.append(details);}if(!data.rows.length)list.textContent='За последние 24 часа обращений нет.';return;}
  if(data.type==='rankPermissions'){const selected=$('rankRightsLevel').value;state.rankPermissions=data.rows;$('rankRightsLevel').replaceChildren(...data.rows.map(r=>option(r.level,r.level+' · '+r.name)));if(selected)$('rankRightsLevel').value=selected;renderRankRights();return;}
  if(data.type==='overview'){
   state=data;$('legacyLogin').hidden=!data.locked;if($('panelLogout'))$('panelLogout').hidden=!data.gated||data.locked;
   document.querySelector('[data-tab="rankrights"]').hidden=!data.canStaff||data.level<9;
   for(const tab of ['staff','business'])document.querySelector('[data-tab="'+tab+'"]').hidden=!(tab==='staff'?data.canStaff:data.canPrices);
   $('staffRank').replaceChildren(...data.roles.filter(r=>r.level<data.level&&r.level<=9).map(r=>option(r.level,r.level+' · '+r.name)));
   renderTools();renderPrices();
   if(window.__adminPanelSetCmdHints)window.__adminPanelSetCmdHints(JSON.stringify(data.commands.map(c=>({cmd:'/'+c.name,desc:c.description}))));
   return;
  }
  if(data.type==='staff'){
   selectedCid=data.cid;$('staffCid').value=data.cid;$('staffRank').value=data.level;$('staffProfile').textContent=data.name+' · CID '+data.cid+' · ранг '+data.level;
   $('permissionsGrid').replaceChildren();
   for(const item of data.permissions){
    const label=document.createElement('label');label.textContent=labels[item.permission]||item.permission;
    const select=document.createElement('select');select.append(option('default','По рангу · '+(item.inherited?'разрешено':'запрещено')),option('allow','Разрешить'),option('deny','Запретить'));select.value=item.value;
    select.onchange=()=>action({action:'permission',cid:selectedCid,permission:item.permission,value:select.value});label.append(select);$('permissionsGrid').append(label);
   }
   return;
  }
  if(data.type==='notice'||data.type==='error')notice(data.text,data.type==='error');
 }
 function renderRankRights(){const row=state.rankPermissions?.find(r=>r.level===Number($('rankRightsLevel').value));$('rankRightsGrid').replaceChildren();if(!row)return;for(const item of row.permissions){const label=document.createElement('label');label.className='permission-row';label.textContent=labels[item.permission]||item.permission;const input=document.createElement('input');input.type='checkbox';input.checked=item.enabled;input.disabled=item.locked;input.onchange=()=>{input.disabled=true;action({action:'rankPermission',level:row.level,permission:item.permission,enabled:input.checked});};label.append(input);$('rankRightsGrid').append(label);}}
 $('rankRightsLevel').onchange=renderRankRights;
 window.LegacyAdmin={history:()=>action({action:'reportHistory'}),loadRankRights:()=>action({action:'rankPermissionsLoad'}),logout:()=>action({action:'logout'}),update,renderTools,renderPrices,loadStaff:()=>action({action:'staffLoad',cid:$('staffCid').value}),saveRank:()=>action({action:'rank',cid:$('staffCid').value,level:Number($('staffRank').value)}),login:()=>{action({action:'login',password:$('panelPassword').value});$('panelPassword').value='';},execute:()=>{if(!$('toolCommand').value)return;mp.trigger('adminPanel:execCommand',$('toolCommand').value+' '+$('toolArgs').value);},takeReport:()=>{const report=typeof getActiveReport==='function'&&getActiveReport();if(report)action({action:'reportTake',cid:report.static});}};
 $('toolCommand').addEventListener('change',describe);
 $('panelPassword').addEventListener('keydown',e=>{if(e.key==='Enter')LegacyAdmin.login();});
 setInterval(()=>{if(document.getElementById('business-tab')?.classList.contains('active')&&!document.activeElement?.matches('#pricesGrid input'))action({action:'pricesRefresh'});},10000);
 if(window.mp)action({action:'load'});
})();
