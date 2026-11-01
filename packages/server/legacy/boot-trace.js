'use strict';
const allowed=new Set(['scripts-start','modules-ready','player-ready']);
mp.events.add('legacy:boot:phase',(p,phase)=>{if(!allowed.has(phase)||!mp.players.exists(p))return;const state=p._legacyBoot||(p._legacyBoot={start:Date.now(),phases:new Set()});if(state.phases.has(phase))return;state.phases.add(phase);console.log('[LEGACY BOOT]',p.id,phase,Date.now()-state.start);});
mp.events.add('playerJoin',p=>{p._legacyBoot={start:Date.now(),phases:new Set()};setTimeout(()=>{if(mp.players.exists(p)&&!p._legacyBoot.phases.has('player-ready'))console.warn('[LEGACY BOOT TIMEOUT]',p.id,[...p._legacyBoot.phases].join(','));},90000);});
mp.events.add('playerReady',p=>console.log('[LEGACY SERVER READY]',p.id));
mp.events.add('playerQuit',p=>console.log('[LEGACY QUIT]',p.id,p._legacyBoot?[...p._legacyBoot.phases].join(','):''));
