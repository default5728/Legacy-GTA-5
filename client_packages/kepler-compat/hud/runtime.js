(()=>{'use strict';
 const frame=document.createElement('iframe');frame.title='Игровые события';frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:0;';
 frame.srcdoc=window.KEPLER_SOURCE_HUD;document.body.prepend(frame);
 const backlog=[],state={cash:0,bank:0,authoritative:false};let ready=false;
 const native=()=>frame.contentWindow&&frame.contentWindow.hudMain;
 function delegate(method,args){const target=native();if(target&&typeof target[method]==='function')return target[method].apply(target,args);if(!ready){backlog.push([method,args]);if(backlog.length>512)backlog.shift();}}
 const numeric=value=>Number(String(value==null?'0':value).replace(/[^0-9.-]/g,''))||0;
 let minimapLayout=null;
 function syncMinimapLayout(){
  if(!minimapLayout)return;
  const [right,bottom,top,left]=minimapLayout;
  HUD_UI.setRadarBounds(left*innerWidth/100,(1-bottom)*innerHeight,(right-left)*innerWidth/100,(bottom-top)*innerHeight);
 }
 window.addEventListener('resize',syncMinimapLayout);
 const ammo=document.createElement('aside');ammo.id='legacyAmmo';ammo.style.cssText='position:fixed;display:none;padding:12px;border:1px solid #ffffff12;border-radius:8px;background:rgba(17,17,19,.52);color:#eee;font:600 15px Segoe UI,sans-serif;pointer-events:none;z-index:91';document.body.append(ammo);
 let ammoOn=false,hudOn=false;
 function placeAmmo(){const location=document.getElementById('hudLocation'),r=location.getBoundingClientRect();ammo.style.display=ammoOn&&hudOn&&r.width?'block':'none';ammo.style.left=(r.right+12)+'px';ammo.style.bottom=(innerHeight-r.bottom)+'px';}
 new ResizeObserver(placeAmmo).observe(document.getElementById('hudLocation'));window.addEventListener('resize',placeAmmo);
 const overrides={
  setMinimapLayout(right,bottom,top,left){if(![right,bottom,top,left].every(Number.isFinite)||right<=left||bottom<=top)return;minimapLayout=[right,bottom,top,left];syncMinimapLayout();},
  updateAmmo(clip,total){ammo.textContent=String(clip)+' / '+String(total);},
  isActiveAmmo(value){ammoOn=!!value;placeAmmo();},
  updateMicro(value){HUD_UI.setMic(value===true||value===1);},
  updateLocation(street,area){HUD_UI.setLocation(street,area);},
  isActiveHud(value){hudOn=!!value;HUD_UI.setHudVisibility(!!value);placeAmmo();},
  updateMoney(value){if(!state.authoritative){state.cash=numeric(value);HUD_UI.updateMoney(state.cash,state.bank);}},
  updateOnline(value){HUD_UI.updateOnline(numeric(value));},
  updatePlayerId(id,staticId,login){HUD_UI.updateCid(numeric(staticId));if(login)HUD_UI.updatePlayerName(String(login));},
  keplerMeta(json){const p=typeof json==='string'?JSON.parse(json):json;if(p.cash!==undefined&&p.bank!==undefined){state.authoritative=true;state.cash=numeric(p.cash);state.bank=numeric(p.bank);}else if(!state.authoritative&&p.bank!==undefined){state.bank=numeric(p.bank);}HUD_UI.updateMoney(state.cash,state.bank);HUD_UI.updatePlayerId(numeric(p.id));HUD_UI.updatePlayerName(String(p.name||''));HUD_UI.updateCid(numeric(p.cid));},
  updateWorldTime(value){const el=document.getElementById('worldTime');if(el)el.textContent=String(value);},
  updateWorldDate(value){const el=document.getElementById('worldDate');if(el)el.textContent=String(value);}
 };
 window.hudMain=new Proxy({}, {get(_,method){return (...args)=>{if(overrides[method])overrides[method](...args);if(method==='updateAmmo'||method==='isActiveAmmo')return;return delegate(method,args);};}});
 const timer=setInterval(()=>{if(!native())return;ready=true;clearInterval(timer);for(const [m,a]of backlog.splice(0))delegate(m,a);},40);
 const show=value=>{document.getElementById('hudChat').style.display=value?'':'none';};
 const resetChat=()=>document.getElementById('chatMessages').replaceChildren();
 window.chatAPI={push:line=>HUD_UI.addChatMessage(line),reset:resetChat,clear:resetChat,activate:value=>{document.body.dataset.nativeChatEnabled=String(value!==false);},show:value=>{if(value)show(true);}};
 window.showChat=()=>show(true);window.hideChat=()=>{HUD_UI.closeChat();show(false);};
 window.chatOpen=()=>{if(!window.__chatBlockOpenCompose){show(true);HUD_UI.openChat();}};
 window.chatOpenWithMode=mode=>{window.keplerChatChannel=Number(mode)===1?'fraction':Number(mode)===7?'family':'all';window.chatOpen();};
 window.__chatForceCloseCompose=()=>HUD_UI.closeChat();window.__chatReleaseFocus=()=>HUD_UI.closeChat();
 window.__chatSetChannels=channels=>{window.keplerAvailableChannels=typeof channels==='string'?JSON.parse(channels):channels;};
 window.__setAdminCmdHints=hints=>{window.keplerCommandHints=typeof hints==='string'?JSON.parse(hints):hints;};
 window.__setAdminSuggestActive=value=>{document.getElementById('chatInput').setAttribute('aria-autocomplete',value?'list':'none');};
 window.setToggleTimestamp=value=>document.getElementById('chatMessages').classList.toggle('hide-timestamps',!value);
 window.setToggleChat=value=>show(!!value);
 window.applyChatSettings=settings=>{const chat=document.getElementById('hudChat');chat.style.width=Math.min(90,Math.max(18,Number(settings.width)||40))+'vw';const lines=document.getElementById('chatMessages');lines.style.maxHeight=Math.min(400,Math.max(80,Number(settings.height)||195))+'px';lines.style.fontSize=Math.min(18,Math.max(12,Number(settings.fontSize)||14))+'px';};
 document.querySelectorAll('.chat-tab').forEach(tab=>tab.addEventListener('click',()=>{window.keplerChatChannel={faction:'fraction',group:'family',department:'department',all:'all'}[tab.dataset.channel];}));
 HUD_UI.setHudVisibility(false);
})();
