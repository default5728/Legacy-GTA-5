'use strict';
const registry=require('./legacy/command-registry'),original=new Map(registry),access=require('./legacy/access'),connection=require('./legacy/connection');
const send=(p,message)=>{if(!mp.players.exists(p))return;if(p.getVariable('amenu')===true){p.call('legacy:panel:state',[JSON.stringify({type:'notice',text:String(message)})]);return;}if(typeof global.pushChatLineToPlayer==='function')global.pushChatLineToPlayer(p,String(message));else p.call('client:chat:message',[String(message)]);};
const source=(name,p,text='')=>{const fn=original.get(name);if(!fn)throw Error('Команда /'+name+' не найдена.');return fn(p,text,...String(text).trim().split(/\s+/).filter(Boolean));};
const db=require('./legacy/database');
const administration=require('./legacy/administration')(send,db);
global.legacyAdministration=administration;
global.legacyAdministrationState=require('./legacy/staff-state');
const spawn=require('./legacy/vehicle-spawner')(send);
require('./legacy/staff-commands')(send,spawn);
const shortVeh=registry.get('veh');
const models=require('./legacy/vehicle-registry.json').models;
function listVehicles(p,query=''){
 if(!access.hasPermission(p,'vehicle.spawn'))return send(p,'Недостаточно прав.');
 const matches=Object.keys(models).filter(name=>name.toLowerCase().includes(query.toLowerCase()));
 send(p,'DLC без Majestic: '+matches.length+' моделей. Обычный транспорт GTA также доступен по spawn-name.');
 for(let i=0;i<matches.length;i+=12)send(p,matches.slice(i,i+12).join(', '));
}
mp.events.addCommand('veh',(p,text)=>{try{const args=String(text||'').trim().split(/\s+/);if(args[0]==='list')return listVehicles(p,args[1]||'');if(args.length>1)return source('veh',p,text);return shortVeh(p,text);}catch(e){send(p,e.message);}});
mp.events.addCommand('findveh',(p,text)=>listVehicles(p,String(text||'').trim()));
mp.events.addCommand('vehlist',p=>listVehicles(p));
for(const name of ['fly','noclip'])mp.events.addCommand(name,p=>{if(access.hasPermission(p,'noclip'))p.call('client_player_toggleFly');else send(p,'Недостаточно прав.');});
for(const name of ['coords','pos'])mp.events.addCommand(name,p=>{try{access.assertPlayer(p);const v=p.position;send(p,`x: ${v.x.toFixed(3)}, y: ${v.y.toFixed(3)}, z: ${v.z.toFixed(3)}, h: ${Number(p.heading).toFixed(2)}, dim: ${p.dimension}`);}catch(e){send(p,e.message);}});
mp.events.addCommand('revive',(p,text)=>{if(!access.hasPermission(p,'player.revive')&&!access.hasPermission(p,'revive.self'))return send(p,'Недостаточно прав.');source('heal',p,String(text||'').trim()||String(p.static));});
mp.events.addCommand('delveh',(p,text)=>{try{if(text)return source('delveh',p,text);if(!access.hasPermission(p,'vehicle.spawn'))throw Error('Недостаточно прав.');if(!p.vehicle)throw Error('Сядьте в машину или укажите /delveh ID_транспорта.');p.vehicle.destroy();send(p,'Машина удалена.');}catch(e){send(p,e.message);}});
mp.events.addCommand('checkmodel',(p,text)=>{if(access.hasPermission(p,'vehicle.spawn'))p.call('legacy:checkModel',[String(text||'').trim()]);});
mp.events.addCommand('pdcheck',p=>{if(access.hasPermission(p,'vehicle.spawn'))p.call('legacy:checkInterior');});
require('./legacy/wardrobe-state');
const clothes=require('./legacy/clothing-validation')(send);
mp.events.addCommand('cloth',(p,text,component,drawable,texture='0',palette='0')=>{
 try{access.assertPlayer(p);const values=[component,drawable,texture,palette];if(values.some(v=>!/^\d+$/.test(v)))throw Error('/cloth слот модель текстура палитра');const rows=values.map(Number);if(rows[0]>11||rows[3]>3)throw Error('Некорректный слот или палитра.');const gender=p.model===mp.joaat('mp_f_freemode_01')?1:0;clothes.request(p,'components',require('../../client_packages/clothing/profiles').normalize(gender,[rows]));}catch(e){send(p,e.message);}
});
mp.events.addCommand('prop',(p,text,slot,drawable,texture='0')=>{
 try{access.assertPlayer(p);const rows=[slot,drawable,texture].map(Number);if(!rows.every(Number.isSafeInteger)||rows[0]<0||rows[0]>7||rows[1]<-1||rows[2]<0)throw Error('/prop слот модель(-1 снять) текстура');if(rows[1]===-1)return require('./legacy/wardrobe-state').save(p,'props',[rows]).then(()=>{if(mp.players.exists(p))p.setProp(rows[0],-1,0);}).catch(e=>send(p,'Не удалось сохранить аксессуар.'));clothes.request(p,'props',[rows]);}catch(e){send(p,e.message);}
});
mp.events.addCommand('checkcloth',(p,text)=>source('scvar',p,text||'11'));
mp.events.addCommand('clothaudit',p=>clothes.audit(p));
mp.events.addCommand('clothlist',(p,text,slot='11',page='1')=>{try{access.assertPlayer(p);const s=Number(slot),n=Number(page);if(!Number.isInteger(s)||s<0||s>11||!Number.isInteger(n)||n<1||n>1000)throw Error('/clothlist слот страница');p.call('client:clothing:list',[s,n]);}catch(e){send(p,e.message);}});
mp.events.addCommand('setfaction',async(p,text,id,name)=>{
 try{if(!access.hasPermission(p,'faction.manage'))throw Error('Недостаточно прав.');const target=mp.players.toArray().find(t=>Number(t.static)===Number(id)&&t.getVariable('auth'));if(!target)throw Error('CID не найден.');const fraction=name==='none'?0:Number(name);if(!Number.isInteger(fraction)||fraction<0||fraction>6)throw Error('/setfaction CID номер_фракции(0–6) | none');if(target!==p&&Number(target.adminlvl)>=Number(p.adminlvl))throw Error('Недостаточно ранга.');await connection.query('UPDATE accounts SET fraction=?,fraction_rank=0 WHERE static=?',[fraction,target.static]);target.fraction=fraction;target.setVariable('fraction',fraction);target.setVariable('fraction_rank',0);send(p,'Фракция обновлена. Игроку нужно перезайти.');}catch(e){send(p,e.message);}
});
mp.events.addCommand('ahelp',(p,text)=>{
 try{access.assertPlayer(p);const rows=administration.help(p),extras=['/veh модель | /veh list | /findveh текст | /vehcheck модель','/tp CID | /goto CID | /tpwp | /gotowp','/revive CID | /heal CID | /money CID сумма','/cloth слот ID текстура | /sc слот ID текстура | /prop слот ID текстура','/noclip | /fly | /fix | /repair | /placer модель'];
 const all=[...rows,...extras],pages=Math.ceil(all.length/8),page=Math.max(1,Math.min(pages,Number.parseInt(text,10)||1));
 send(p,'Старая админ-система: /arank — ваш ранг; /aranks — все ранги.');send(p,'/ahelp '+page+' — страница '+page+'/'+pages);
 for(const line of all.slice((page-1)*8,page*8))send(p,line);
 if(page<pages)send(p,'Далее: /ahelp '+(page+1));
 }catch(e){send(p,e.message);}
});
require('./legacy/object-placer')(send);
administration.ready.then(()=>console.log('[LEGACY COMMANDS] Administration, grants, sanctions and command aliases ready')).catch(e=>console.error('[LEGACY COMMANDS]',e.code||e.message));
module.exports={administration,listVehicles};

// All clothing command entry points share the same validation and persistence pipeline.
for(const [name,kind]of [['sc','components'],['scprop','props']])mp.events.addCommand(name,async(p,text)=>{
 try{
  access.assertPlayer(p);if(Number(p.adminlvl)<7)return;
  const args=String(text||'').trim().split(/\s+/),sub=args[0].toLowerCase(),key=kind==='props'?'scPropPreview':'scDressPreview';
  if(!['next','prev'].includes(sub)&&!/^\d+$/.test(sub))return source(name,p,text);
  let rows;
  if(sub==='next'||sub==='prev'){
   const st=p[key];if(!st)throw Error('Сначала укажите слот, модель и текстуру.');
   rows=[kind==='props'?st.prop:st.cat,Math.max(0,st.dr+(sub==='next'?1:-1)),st.tx];
  }else{
   if(args.length<2||!args.slice(0,3).every(v=>/^-?\d+$/.test(v)))throw Error('/'+name+' слот модель текстура');
   rows=[Number(args[0]),Number(args[1]),Number(args[2]||0)];
  }
  if(!rows.every(Number.isSafeInteger)||rows[0]<0||rows[0]>(kind==='props'?7:11)||rows[1]<(kind==='props'?-1:0)||rows[1]>4095||rows[2]<0||rows[2]>255)throw Error('Некорректный слот, модель или текстура.');
  if(kind==='components')rows.push(0);
  if(kind==='props'&&rows[1]===-1){await require('./legacy/wardrobe-state').save(p,kind,[rows]);p.setProp(rows[0],-1,0);return;}
  const gender=p.model===mp.joaat('mp_f_freemode_01')?1:0;
  if(await clothes.request(p,kind,kind==='components'?require('../../client_packages/clothing/profiles').normalize(gender,[rows]):[rows]))p[key]=kind==='props'?{prop:rows[0],dr:rows[1],tx:rows[2]}:{cat:rows[0],dr:rows[1],tx:rows[2]};
 }catch(e){send(p,e.message);}
});

require('./legacy/player-tools').register(send);

require('./legacy/content-clothes')();
require('./legacy/tesla-flight');

require('./legacy/panel-management');

require('./legacy/clothing-identity');

require('./legacy/plates')(send);

require('./legacy/vehicle-tuning')(send);

require('./legacy/world-services')(send);

require('./legacy/creator')(send);
