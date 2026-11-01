'use strict';
let session = null, loader = null, lease = null, leftHeld=false;
const remoteProps = new Map();
const KEYS = { forward: 0x57, back: 0x53, left: 0x41, right: 0x44, up: 0x51, down: 0x45 };
global.isObjectPlacerActive = false;
function hint(text) { if (global.HINTS) global.HINTS.set('object_placer', text); }
function chat(text) { mp.events.call('client:chat:message', text); }
function vector(p) { return new mp.Vector3(p.x, p.y, p.z); }
function validPose(p) { return p && ['x', 'y', 'z', 'h'].every(k => Number.isFinite(p[k])); }
function objectFor(id) { return session&&session.kind==='ped'?mp.peds.atRemoteId(id):mp.objects.atRemoteId(id); }
function apply(entity, p, editing) {
    if (!entity || !entity.handle || !validPose(p)) return;
    entity.freezePosition(true);
    entity.setCollision(!editing, !editing);
    entity.setCoordsNoOffset(p.x, p.y, p.z, false, false, false);
    entity.setRotation(p.rx||0, p.ry||0, p.h, 2, true);
}
function stop(restore = true) {
    const old = session;
    session = null; global.isObjectPlacerActive = false;
    if (loader !== null) { clearInterval(loader); loader = null; }
    if (lease !== null) { mp.game.streaming.setModelAsNoLongerNeeded(lease); lease = null; }
    hint(null);
    if (old && restore && global.isPlayerSpawned && !global.isDead && !global.isAuthCursorRequired)
        mp.players.local.freezePosition(old.wasFrozen);
}
function cancel(restore = true) {
    if (!session) return;
    const token = session.token;
    stop(restore); mp.events.callRemote('server:placer:cancel', token);
}
function blocked() {
    return !global.isPlayerSpawned || global.isDead || global.isNoclipActive || global.isCasinoTableOpen ||
        global.isWaypointTeleporting || global.isAuthCursorRequired || !!mp.players.local.vehicle;
}
function availableModel(hash,kind) {
    if (!mp.game.streaming.isModelValid(hash) || !mp.game.streaming.isModelInCdimage(hash)) return false;
    const vehicle = typeof mp.game.streaming.isModelAVehicle === 'function'
        ? mp.game.streaming.isModelAVehicle(hash) : mp.game.invoke('0x19AAC8F07BFEC53E', hash);
    const ped = typeof mp.game.streaming.isModelAPed === 'function'
        ? mp.game.streaming.isModelAPed(hash) : mp.game.invoke('0x75816577FEA6DAD5', hash);
    return !vehicle && (kind==='ped'?ped:!ped);
}
mp.events.add('client:placer:prepare', (token, hash, name, kind='object') => {
    if (typeof token !== 'string' || token.length !== 32 || !Number.isInteger(hash) || blocked()) {
        if (typeof token === 'string') {
            mp.events.callRemote('server:placer:cancel', token);
            chat('Редактор недоступен в текущем режиме. Отключите свободную камеру и завершите взаимодействие с казино.');
        }
        return;
    }
    const previousFrozen=session&&session.token===token?session.wasFrozen:null;
    if(session){if(session.token===token)stop(false);else cancel();}
    if (global.closeMenu) global.closeMenu();
    if (global.closeInventory) global.closeInventory();
    if (global.closePlates) global.closePlates();
    try {
        if (!availableModel(hash,kind)) { chat('Модель недоступна или не является объектом.'); mp.events.callRemote('server:placer:ready', token, false); return; }
        const player = mp.players.local;
        session = { token, hash, kind, name: String(name).slice(0, 100), phase: 'loading', since: Date.now(),
            wasFrozen: previousFrozen!==null?previousFrozen:(typeof player.isPositionFrozen === 'function' ? player.isPositionFrozen() : player.isPositionFrozen===true),
            sequence: 0, objectId: null, pose: null, lastFrame: Date.now(), lastSend: 0, lastHint: 0, dirty: false, down: {} };
        global.isObjectPlacerActive = true; player.freezePosition(true); mp.gui.cursor.show(false, false);
        lease = hash; mp.game.streaming.requestModel(hash);
        hint('Редактор объектов · загрузка модели… | Backspace / Delete — отмена');
        loader = setInterval(() => {
            if (!session) return;
            try {
                if (Date.now() - session.since > 12000) { cancel(); chat('Редактор: модель или объект не загрузились.'); return; }
                if (session.phase === 'loading' && mp.game.streaming.hasModelLoaded(hash)) {
                    session.phase = 'streaming'; mp.events.callRemote('server:placer:ready', token, true);
                }
                if (session.phase === 'streaming' && session.objectId !== null) {
                    const entity = objectFor(session.objectId);
                    if (entity && entity.handle) {
                        session.phase = 'editing'; session.lastFrame = Date.now(); session.lastSend = 0;
                        apply(entity, session.pose, true); clearInterval(loader); loader = null;
                    }
                }
            } catch (error) { cancel(); chat('Редактор: ' + error.message); }
        }, 50);
    } catch (error) { cancel(); mp.events.callRemote('server:placer:ready', token, false); chat('Редактор: ' + error.message); }
});
mp.events.add('client:placer:start', (token, id, x, y, z, h, rx=0, ry=0, kind='object') => {
    if (!session || session.token !== token || session.phase !== 'streaming' || !Number.isInteger(id)) return;
    const p = { x, y, z, h, rx, ry }; if (!validPose(p)) { cancel(); return; }
    session.kind=kind;session.objectId = id; session.pose = p; session.origin = { x, y, z };
});
mp.events.add('client:placer:closed', (token, reason) => {
    if (!session || session.token !== token) return;
    stop(); if (reason) chat(String(reason));
});
function submit() {
    if (!session || session.phase !== 'editing') return;
    const s = session, p = s.pose; s.phase = 'closing'; s.since = Date.now();
    mp.events.callRemote('server:placer:finish', s.token, ++s.sequence, p.x, p.y, p.z, p.h);
    hint('Редактор объектов · фиксация…');
}
for (const key of [0x0D, 0x20]) global.bindGameplayKey(key, true, submit);
for(const key of [0x08,0x2E])global.bindGameplayKey(key,true,()=>{
 if(!session)return;if(session.phase==='picking'){choose('delete');return;}if(session.phase!=='editing')return;
 session.phase='closing';session.since=Date.now();mp.events.callRemote('server:placer:delete',session.token);
});
global.bindGameplayKey(0x1B,true,()=>{if(session)cancel();});
global.bindGameplayKey(0x01,true,()=>{if(session&&session.phase==='picking')choose(session.pickMode);});
for (const event of ['client:auth:show', 'client:charselect:show', 'client:charcreator:open', 'client:death:show'])
    mp.events.add(event, () => cancel(false));
function register(entity, value) {
    if (!entity || !['object','ped'].includes(entity.type) || !entity.handle) return;
    let p; try { p = JSON.parse(typeof value === 'string' ? value : entity.getVariable('objectPlacer')); } catch (_) { return; }
    if (!validPose(p)) return;
    const previous = remoteProps.get(entity);
    if (p.editing) remoteProps.set(entity, { from: previous ? previous.visual : p, target: p, visual: previous ? previous.visual : p, time: Date.now() });
    else { remoteProps.delete(entity); apply(entity, p, false); }
}
mp.events.add('entityStreamIn', register);
mp.events.addDataHandler('objectPlacer', register);
mp.events.add('entityStreamOut', entity => remoteProps.delete(entity));
function frame() {
    const now = Date.now();
    for (const [entity, r] of remoteProps) {
        if (!(entity.type==='ped'?mp.peds:mp.objects).exists(entity) || !entity.handle) { remoteProps.delete(entity); continue; }
        if (session && session.objectId === entity.remoteId) continue;
        const t = Math.min(1, (now - r.time) / 85), a = r.from, b = r.target;
        const angle = ((b.h - a.h + 540) % 360) - 180;
        r.visual = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, h: a.h + angle * t };
        if (t < 1 || !r.done) { apply(entity, r.visual, true); r.done = t === 1; }
    }
    if (!session) return;
    const s = session;
    if (blocked()) { cancel(); return; }
    mp.game.controls.disableAllControlActions(0);
    const rotating = global.isGameplayKeyDown(0x02);
    if (!rotating) { mp.game.controls.enableControlAction(0, 1, true); mp.game.controls.enableControlAction(0, 2, true); }
    if(s.phase==='checking'&&now-s.since>15000){cancel();chat('Редактор не получил ответ на выбор объекта.');return;}
    if(s.phase==='picking'||s.phase==='checking'){
        mp.game.controls.enableControlAction(0,1,true);mp.game.controls.enableControlAction(0,2,true);
        if(now-(s.lastSend||0)>2000){mp.events.callRemote('server:placer:pulse',s.token);s.lastSend=now;}
        const left=global.isGameplayKeyDown(0x01),nativeClick=mp.game.controls.isDisabledControlJustPressed(0,24);
        if(s.phase==='picking'&&(nativeClick||(left&&!leftHeld))){choose(s.pickMode);if(!session)return;}leftHeld=left;
        if(s.phase==='picking'&&now-(s.lastHint||0)>100){s.candidate=pickObject();s.lastHint=now;hint('Выбор объекта · наведите центр экрана | ЛКМ — '+(s.pickMode==='delete'?'удалить':'редактировать')+' | Delete — удалить | Escape — отмена'+(s.candidate?' · 0x'+s.candidate.hash.toString(16):' · объект не выбран'));}
        mp.game.graphics.drawText('+',[.5,.5],{font:0,scale:[.35,.35],colour:[255,255,255,220],outline:true});return;
    }
    if (s.phase === 'closing') { if (now - s.since > 5000) { cancel(); chat('Редактор: подтверждение не получено, объект отменён.'); } return; }
    if (s.phase !== 'editing') return;
    const entity = objectFor(s.objectId); if (!entity || !entity.handle) { cancel(); return; }
    const dt = Math.max(0, Math.min(.05, (now - s.lastFrame) / 1000)); s.lastFrame = now;
    const rotation = mp.game.cam.getGameplayCamRot(2), yaw = rotation.z * Math.PI / 180;
    const input = {}, fast = global.isGameplayKeyDown(0x10) || global.isGameplayKeyDown(0xA0) || global.isGameplayKeyDown(0xA1);
    let tapped = false;
    for (const [id, key] of Object.entries(KEYS)) { input[id] = global.isGameplayKeyDown(key) ? 1 : 0; if (input[id] && !s.down[id]) tapped = true; s.down[id] = input[id]; }
    const f = input.forward - input.back, r = input.right - input.left, u = input.up - input.down;
    const length = Math.hypot(f, r, u), p = s.pose;
    if (length) {
        const step = (tapped ? .025 : .625 * dt) * (fast ? 5 : 1) / length;
        const next = { x: p.x + (-Math.sin(yaw) * f + Math.cos(yaw) * r) * step,
            y: p.y + (Math.cos(yaw) * f + Math.sin(yaw) * r) * step, z: p.z + u * step };
        if (Math.hypot(next.x - s.origin.x, next.y - s.origin.y, next.z - s.origin.z) < 95) {
            Object.assign(p, next); s.dirty = true;
        }
    }
    if (rotating) {
        const mouse = mp.game.controls.getDisabledControlNormal(0, 1);
        if (Number.isFinite(mouse) && mouse) { p.h = ((p.h - mouse * 8) % 360 + 360) % 360; s.dirty = true; }
    }
    apply(entity, p, true);
    if ((s.dirty && now - s.lastSend >= 85) || now - s.lastSend >= 2000) {
        mp.events.callRemote('server:placer:update', s.token, ++s.sequence, p.x, p.y, p.z, p.h);
        s.lastSend = now; s.dirty = false;
    }
    if (now - s.lastHint >= 200) {
        hint('Редактор · ' + s.name + ' | W/A/S/D — плоскость камеры | Q/E — вверх/вниз | ПКМ + мышь — угол | Shift ×5 | Enter/Space — сохранить | Backspace/Delete — удалить\n[' +
            [p.x, p.y, p.z, p.h].map(n => n.toFixed(3)).join(', ') + ']');
        s.lastHint = now;
    }
}
mp.events.add('render', () => { try { frame(); } catch (error) { if (session) { cancel(); chat('Редактор остановлен: ' + error.message); } } });

function pickObject(){
 const camera=mp.game.cam.getGameplayCoord(),r=mp.game.cam.getGameplayCamRot(2),yaw=r.z*Math.PI/180,pitch=r.x*Math.PI/180;
 const end=new mp.Vector3(camera.x-Math.sin(yaw)*Math.cos(pitch)*25,camera.y+Math.cos(yaw)*Math.cos(pitch)*25,camera.z+Math.sin(pitch)*25);
 const hit=mp.raycasting.testPointToPoint(camera,end,mp.players.local,25);if(!hit||!hit.entity)return null;
 let e=hit.entity,handle=typeof e==='number'?e:e.handle;if(!handle)return null;
 if(typeof e==='number'&&typeof mp.peds.atHandle==='function')e=mp.peds.atHandle(handle)||e;
 if(typeof e==='number'&&typeof mp.objects.atHandle==='function')e=mp.objects.atHandle(handle)||e;
 if(typeof e==='number'){let network=null;mp.objects.forEachInStreamRange(o=>{if(o.handle===handle&&Number.isInteger(o.remoteId)&&o.remoteId!==65535)network=o;});if(network)e=network;}
 if(typeof e==='object'&&e.type==='ped'&&(!Number.isInteger(e.remoteId)||e.remoteId===65535)){const p=e.position,r=e.getRotation(2);return{kind:'mapPed',hash:e.model>>>0,x:p.x,y:p.y,z:p.z,h:r.z,rx:r.x,ry:r.y};}
 if(typeof e==='object'){
  if(!['object','ped'].includes(e.type)||!Number.isInteger(e.remoteId)||e.remoteId<0||e.remoteId===65535)return null;
  return{kind:e.type==='ped'?'ped':'server',id:e.remoteId,hash:e.model>>>0};
 }
 if(!mp.game.entity.isAnObject(handle))return null;
 const p=mp.game.entity.getCoords(handle,false),rot=mp.game.entity.getRotation(handle,2);
 if(!p||!rot)return null;return{kind:'map',hash:mp.game.entity.getModel(handle)>>>0,x:p.x,y:p.y,z:p.z,h:rot.z,rx:rot.x,ry:rot.y};
}
function choose(mode){
 if(!session||session.phase!=='picking')return;
 const target=pickObject();if(!target){chat('Наведите центр экрана на отдельный объект ближе 25 метров.');return;}
 session.phase='checking';session.since=Date.now();if(mode==='delete')target.delete=true;
 mp.events.callRemote('server:placer:select',session.token,JSON.stringify(target));
}
mp.events.add('client:placer:pick',(token,mode)=>{
 if(blocked()){mp.events.callRemote('server:placer:cancel',token);chat('Отключите свободную камеру и завершите взаимодействие с казино.');return;}
 if(session)cancel();for(const k of ['closeMenu','closeInventory','closePlates'])if(global[k])global[k]();
 const player=mp.players.local;session={token,pickMode:mode,phase:'picking',wasFrozen:typeof player.isPositionFrozen==='function'?player.isPositionFrozen():player.isPositionFrozen===true,lastHint:0,lastSend:0};
 global.isObjectPlacerActive=true;player.freezePosition(true);mp.gui.cursor.show(false,false);
});
let mapMasks=[],appliedMasks=new Map(),hiddenPeds=new Map();
function refreshMasks(){
 const pedMasks=mapMasks.filter(m=>m.kind==='ped'&&m.dimension===mp.players.local.dimension);
 for(const[p,alpha]of hiddenPeds){if(!mp.peds.exists(p)||!p.handle){hiddenPeds.delete(p);continue;}if(!pedMasks.some(m=>(p.model>>>0)===m.hash&&Math.hypot(p.position.x-m.x,p.position.y-m.y,p.position.z-m.z)<.3)){p.setAlpha(alpha);p.setCollision(true,true);hiddenPeds.delete(p);}}
 if(pedMasks.length)mp.peds.forEachInStreamRange(p=>{if(Number.isInteger(p.remoteId)&&p.remoteId!==65535||!p.handle)return;if(pedMasks.some(m=>(p.model>>>0)===m.hash&&Math.hypot(p.position.x-m.x,p.position.y-m.y,p.position.z-m.z)<.3)){if(!hiddenPeds.has(p))hiddenPeds.set(p,p.getAlpha());p.setAlpha(0);p.setCollision(false,false);}});

 const wanted=new Map(mapMasks.filter(m=>m.kind!=='ped'&&m.dimension===mp.players.local.dimension).map(m=>[m.id,m]));
 for(const[id,m]of appliedMasks)if(!wanted.has(id)){mp.game.entity.removeModelHide(m.x,m.y,m.z,.15,m.hash,false);appliedMasks.delete(id);}
 for(const[id,m]of wanted)if(!appliedMasks.has(id)){mp.game.entity.createModelHideExcludingScriptObjects(m.x,m.y,m.z,.15,m.hash,true);appliedMasks.set(id,m);}
}
mp.events.add('client:placer:masks',json=>{let list;try{list=JSON.parse(json);}catch(_){return;}if(!Array.isArray(list))return;mapMasks=list.filter(m=>m&&typeof m.id==='string'&&Number.isInteger(m.hash)&&['x','y','z','dimension'].every(k=>Number.isFinite(m[k])));refreshMasks();});
setInterval(()=>{if(mapMasks.length||appliedMasks.size)refreshMasks();},500);
for(const e of ['playerReady','client:charselect:spawned'])mp.events.add(e,()=>{mp.events.callRemote('server:world:layout');mp.events.callRemote('server:placer:world');});
