// Single registry for custom server controls. New actions automatically appear in F2 settings.
const definitions = [
 {id:'menu',label:'Меню игры',key:0x71}, {id:'inventory',label:'Инвентарь',key:0x49},
 {id:'interact',label:'Магазины / вход и выход',key:0x45}, {id:'entityMenu',label:'Взаимодействие с игроком / транспортом',key:0x47}, {id:'engine',label:'Двигатель',key:0x32},
 {id:'noclip',label:'Свободная камера',key:0x31,restricted:true},
 {id:'chat',label:'Открыть чат',key:0x54,release:true}, {id:'voice',label:'Голосовой чат — удерживать',key:0x42,hold:true},
 {id:'cursor',label:'Курсор',key:0xC0,poll:true}, {id:'cursorAlt',label:'Курсор — дополнительная клавиша',key:0x72,poll:true},
 {id:'flyForward',label:'Noclip: вперёд',key:0x57,hold:true,restricted:true},
 {id:'flyBack',label:'Noclip: назад',key:0x53,hold:true,restricted:true},
 {id:'flyLeft',label:'Noclip: влево',key:0x41,hold:true,restricted:true},
 {id:'flyRight',label:'Noclip: вправо',key:0x44,hold:true,restricted:true},
 {id:'flyUp',label:'Noclip: вверх',key:0x20,hold:true,restricted:true},
 {id:'flyDown',label:'Noclip: вниз',key:0xA2,hold:true,restricted:true},
 {id:'flyFast',label:'Noclip: ускорение',key:0xA0,hold:true,restricted:true}
];
const handlers=new Map(), bound=new Map(), polled=new Map(), cefKeys=new Set();
let noclipAllowed=false,bindings={},suppressUntil=0;
let saved={};try{saved=mp.storage.data.salvatoreControlsV1||{};}catch(_){}
const names={9:'Tab',16:'Shift',17:'Ctrl',18:'Alt',32:'Space',37:'←',38:'↑',39:'→',40:'↓',160:'LShift',161:'RShift',162:'LCtrl',163:'RCtrl',164:'LAlt',165:'RAlt',186:';',187:'=',188:',',189:'-',190:'.',191:'/',192:'Ё / ~',219:'[',220:'\\',221:']',222:"'"};
function keyName(key){if(key>=112&&key<=123)return 'F'+(key-111);if(key>=48&&key<=90)return String.fromCharCode(key);if(key>=96&&key<=105)return 'Num '+(key-96);return names[key]||'Клавиша '+key;}
function validKey(key){return Number.isInteger(key)&&((key>=48&&key<=57)||(key>=65&&key<=90)||(key>=96&&key<=105)||(key>=112&&key<=123)||Object.prototype.hasOwnProperty.call(names,key));}
function definition(id){return definitions.find(d=>d.id===id);}
function active(){return !!global.isPlayerSpawned&&!global.isBindingCaptureActive&&!global.isObjectPlacerActive;}
function dispatch(id,key){
 const def=definition(id);if(!active()||Date.now()<suppressUntil||global.isChatInputActive||bindings[id]!==key||(def.restricted&&!noclipAllowed))return;
 if((global.isPlatesOpen||global.isCasinoTableOpen||global.isWaypointTeleporting))return;
 if(global.isDead&&id!=='chat')return;
 if(global.isInteractionOpen&&id!=='entityMenu')return;
 const handler=handlers.get(id);if(handler)handler();
}
function bind(id){
 const def=definition(id);if(def.hold)return;
 if(def.poll){
   const old=bound.get(id);if(old&&typeof mp.keys.unbind==='function')global.unbindGameplayKey(old.key,true,old.handler);
   const key=bindings[id];polled.set(id,{key,down:global.isGameplayKeyDown(key),lastPress:-Infinity});
   const handler=()=>{const state=polled.get(id);if(state&&state.key===key){state.down=true;pressCursor(id,state);}};
   bound.set(id,{key,handler});global.bindGameplayKey(key,true,handler);return;
 }
 const old=bound.get(id);if(old&&typeof mp.keys.unbind==='function')global.unbindGameplayKey(old.key,!def.release,old.handler);
 const key=bindings[id],handler=()=>dispatch(id,key);bound.set(id,{key,handler});global.bindGameplayKey(key,!def.release,handler);
}
function snapshot(error=''){return {error,actions:definitions.filter(d=>!d.restricted||noclipAllowed).map(d=>({id:d.id,label:d.label,key:bindings[d.id],keyName:keyName(bindings[d.id]),defaultKey:d.key,allowed:!d.restricted||noclipAllowed}))};}
function publish(error=''){mp.events.call('client:controls:changed',JSON.stringify(snapshot(error)));}
function change(id,key){
 const def=definition(id);if(!def||!validKey(key))return publish('Эту клавишу нельзя назначить.');
 if(def.restricted&&!noclipAllowed)return publish('Этот режим доступен администрации.');
 const duplicate=definitions.find(d=>d.id!==id&&bindings[d.id]===key);
 if(duplicate)return publish(duplicate.restricted&&!noclipAllowed?'Эта клавиша зарезервирована.':'Клавиша уже назначена: '+duplicate.label+'.');
 const candidate={...bindings,[id]:key};
 try{mp.storage.data.salvatoreControlsV1=candidate;mp.storage.flush();}catch(_){return publish('Не удалось сохранить управление.');}
 bindings=candidate;suppressUntil=Date.now()+350;if(handlers.has(id))bind(id);publish();
}
// Preserve only a consistent set of saved keys. Defaults always provide a usable recovery.
for(const d of definitions)bindings[d.id]=d.key;
if(definitions.every(d=>!Object.prototype.hasOwnProperty.call(saved,d.id)||validKey(saved[d.id]))){
 const candidate=Object.fromEntries(definitions.map(d=>[d.id,saved[d.id]===undefined?d.key:saved[d.id]]));
 if(new Set(Object.values(candidate)).size===definitions.length)bindings=candidate;
}
global.isBindingCaptureActive=false;
global.CONTROLS={
 on(id,handler){if(!definition(id))throw Error('Unknown action: '+id);handlers.set(id,handler);bind(id);},
 down(id){const d=definition(id);return !!d&&!global.isDead&&!(global.isPlatesOpen||global.isCasinoTableOpen||global.isWaypointTeleporting)&&active()&&(!d.restricted||noclipAllowed)&&global.isGameplayKeyDown(bindings[id]);},
 label:id=>keyName(bindings[id]), snapshot,
 register(def,handler){
   if(!def||!/^[a-zA-Z][a-zA-Z0-9_]{1,40}$/.test(def.id)||definition(def.id)||!validKey(def.key)||definitions.some(d=>bindings[d.id]===def.key))throw Error('Invalid or conflicting control registration');
   definitions.push({...def});bindings[def.id]=def.key;if(handler)this.on(def.id,handler);publish();
 }
};
mp.events.add('client:controls:get',()=>publish());
mp.events.add('client:controls:set',change);
mp.events.add('client:controls:reset',id=>{const d=definition(id);if(d)change(id,d.key);});
mp.events.add('client:controls:resetAll',()=>{
 const candidate=Object.fromEntries(definitions.map(d=>[d.id,d.key]));
 try{mp.storage.data.salvatoreControlsV1=candidate;mp.storage.flush();}catch(_){return publish('Не удалось сохранить управление.');}
 bindings=candidate;suppressUntil=Date.now()+350;for(const id of handlers.keys())bind(id);publish();
});
mp.events.add('client:controls:capture',value=>{global.isBindingCaptureActive=value===true;});
mp.events.add('client:controls:capabilities',allowed=>{noclipAllowed=allowed===true;publish();});
mp.events.add('client:charselect:spawned',()=>mp.events.callRemote('server:controls:ready'));
for(const event of ['client:auth:show','client:charselect:show','client:charcreator:open'])mp.events.add(event,()=>{noclipAllowed=false;global.isBindingCaptureActive=false;});


// Merge native callbacks, sampled key state and focused CEF input into one action.
function pressCursor(id,state){
 const now=Date.now();if(now-state.lastPress<180)return;
 state.lastPress=now;dispatch(id,state.key);
}
function sampleCursor(){
 for(const [id,state] of polled){
   const down=global.isGameplayKeyDown(state.key)||cefKeys.has(state.key);
   const pressed=down&&!state.down;state.down=down;
   if(pressed)pressCursor(id,state);
 }
}
mp.events.add('client:controls:cefKey',(value,isDown)=>{
 const key=Number(value);if(!Number.isInteger(key)||!Array.from(polled.values()).some(s=>s.key===key))return;
 if(isDown===true)cefKeys.add(key);else cefKeys.delete(key);
 sampleCursor();
});
mp.events.add('client:controls:cefBlur',()=>{cefKeys.clear();sampleCursor();});
mp.events.add('render',sampleCursor);
