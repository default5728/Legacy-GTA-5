'use strict';

/** Пока курсор в CEF input/textarea — не открывать анимации, чат и прочие бинды. */
global.__cefTextInputOpen = false;

global.isTypingInAnyTextField = function isTypingInAnyTextField() {
    try {
        if (global.__chatInputOpen === true || global.isChatInputActive === true) return true;
        if (global.__cefTextInputOpen === true) return true;
        if (global.isCreatorOpen === true) return true;
        if (global.isWorldServiceOpen === true) return true;
        if (mp.players.local && mp.players.local.isTypingInTextChat) return true;
        if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) return true;
    } catch (_e) {}
    return false;
};

mp.events.add('cef:textInput', (on) => {
    global.__cefTextInputOpen = on === true || on === 1 || on === '1';
});

// Keep the RAGE native API untouched: its methods may be read-only.
const nativeBind=mp.keys.bind.bind(mp.keys),nativeUnbind=mp.keys.unbind.bind(mp.keys),nativeIsDown=mp.keys.isDown.bind(mp.keys);
const bindings=new Map();let escapeBlockedUntil=0;
function bindingGroup(key,down){const id=String(key)+':'+String(!!down);if(!bindings.has(id))bindings.set(id,new Map());return bindings.get(id);}
global.bindGameplayKey=function(key,down,handler){
 if(typeof handler!=='function')return nativeBind(key,down,handler);
 const group=bindingGroup(key,down),previous=group.get(handler);
 if(previous)nativeUnbind(key,down,previous);
 const wrapped=function(){
  if(down){
   if(Number(key)===0x1b&&Date.now()<escapeBlockedUntil)return;
   if(global.isTypingInAnyTextField()){
    if(Number(key)===0x1b&&global.__chatInputOpen){escapeBlockedUntil=Date.now()+200;if(typeof global.tryCloseChatEsc==='function')global.tryCloseChatEsc();}
    return;
   }
  }
  return handler.apply(this,arguments);
 };
 group.set(handler,wrapped);return nativeBind(key,down,wrapped);
};
global.unbindGameplayKey=function(key,down,handler){
 const id=String(key)+':'+String(!!down),group=bindings.get(id);
 if(typeof handler==='function'){const wrapped=group&&group.get(handler);if(group)group.delete(handler);return nativeUnbind(key,down,wrapped||handler);}
 bindings.delete(id);return nativeUnbind(key,down);
};
global.isGameplayKeyDown=function(key){
 if(global.isTypingInAnyTextField()&&![0x1b,0x10,0x11,0x12].includes(Number(key)))return false;
 return nativeIsDown(key);
};
