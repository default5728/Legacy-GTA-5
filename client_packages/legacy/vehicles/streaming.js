// Generated from mounted vehicles.meta and TXD relationships; no nested require.
const MODEL_TEXTURES = {};
const OWN_TEXTURES={"2021ladaraven":"2021ladaraven","i8":"i8","chiron17":"chiron17","5rp_skate":"5rp_skate","2019m5":"2019m5","2020rs7":"2020rs7","2022c63":"2022c63","812superfast":"812superfast","918spyder":"918spyder","agerars":"agerars","alphard":"alphard","amgone1":"amgone1","astondb11":"astondb11","audiq8":"audiq8","audisport":"audisport","avtr":"avtr","battista":"battista","bmwe70":"bmwe70","bmwix":"bmwix","bmwm5f90lci":"bmwm5f90lci","bmwm760":"bmwm760","bmwxm":"bmwxm","divo":"divo","exp100":"exp100","f12":"f12","fera458":"fera458","gemera":"gemera","ktm125":"ktm125","ktm390":"ktm390","ktm450":"ktm450","ktm690":"ktm690","panigale":"panigale","temerario":"temerario","tourbillon":"tourbillon","transit":"transit","urus":"urus","urus24":"urus24","urus6x6":"urus6x6","valkyriespider":"valkyriespider","lada2107":"lada2107","rmodsian":"rmodsian","btype3":"btype3","shahed136":"shahed136","98clk":"98clk","2108320":"2108320","2109320":"2109320","2109920":"2109920","21134":"21134","21144":"21144","21154":"21154","2347":"2347","21093099ip":"21093099ip","211415p":"211415p","tesroad20":"tesroad20"};
const modelRefs = new Map(),textureRefs = new Map(),entities = new Map();
let pending=null,warmLease=null,warmTimer=null;
function releaseWarm(){if(warmTimer!==null){clearTimeout(warmTimer);warmTimer=null;}if(warmLease){release(warmLease);warmLease=null;}}
mp.events.add('client:vehicles:warm',json=>{
 if(!global.isPlayerSpawned||warmLease||typeof json!=='string'||json.length>2000)return;
 let textures;try{textures=JSON.parse(json);}catch(_){return;}
 if(!Array.isArray(textures)||textures.length>16||textures.some(t=>typeof t!=='string'||!/^[a-z0-9_]+$/.test(t)))return;
 textures=[...new Set(['vehshare',...textures])];
 for(const txd of textures){const count=textureRefs.get(txd)||0;textureRefs.set(txd,count+1);if(!count)mp.game.graphics.requestStreamedTextureDict(txd,false);}
 warmLease={hash:null,textures};// Keep the small shared material set resident while this character is active.
 warmTimer=null;
});
// Keep the stock plate/font resident along with custom texture dictionaries. A valid hash alone does not initialize plate materials.
const plateDonor=mp.game.joaat('adder');let plateDonorLoaded=false;
function isVehicleModel(hash) {
    if(typeof mp.game.streaming.isModelAVehicle==='function')return mp.game.streaming.isModelAVehicle(hash);
    return !!mp.game.invoke('0x19AAC8F07BFEC53E',hash);
}
function acquire(hash,textures) {
    textures=[...new Set(['vehshare',...textures])];
    let modelCount=0;if(hash!==null){hash=hash>>>0;modelCount=modelRefs.get(hash)||0;modelRefs.set(hash,modelCount+1);}
    for(const txd of textures){const count=textureRefs.get(txd)||0;textureRefs.set(txd,count+1);if(!count)mp.game.graphics.requestStreamedTextureDict(txd,false);}
    if(hash!==null&&!modelCount)mp.game.streaming.requestModel(hash);
    return {hash,textures};
}
function release(lease) {
    if(lease.hash!==null){const count=(modelRefs.get(lease.hash)||1)-1;
    if(count>0)modelRefs.set(lease.hash,count);else{modelRefs.delete(lease.hash);mp.game.streaming.setModelAsNoLongerNeeded(lease.hash);}}
    for(const txd of lease.textures){const refs=(textureRefs.get(txd)||1)-1;if(refs>0)textureRefs.set(txd,refs);else{textureRefs.delete(txd);mp.game.graphics.setStreamedTextureDictAsNoLongerNeeded(txd);}}
}
function finish(token) {
    if(!pending||pending.token!==token)return;
    const current=pending;pending=null;clearInterval(current.timer);
    // Let the newly replicated entity acquire its own lease first.
    if(current.lease)setTimeout(()=>release(current.lease),3000);
}
mp.events.add('client:vehicles:prepare',(token,name,dependencies)=>{
    if(!global.isPlayerSpawned||typeof token!=='string'||typeof name!=='string')return;
    try {
    if(pending)finish(pending.token);
    const hash=mp.game.joaat(name)>>>0;
    if(!mp.game.streaming.isModelValid(hash)||!isVehicleModel(hash)){
        mp.events.callRemote('server:vehicles:prepared',token,'invalid');return;
    }
    let textures;try{textures=JSON.parse(dependencies);}catch(_){return;}
    if(!Array.isArray(textures)||textures.length>32||textures.some(t=>typeof t!=='string'||!/^[a-z0-9_+]+$/i.test(t)))return;
    if(OWN_TEXTURES[name])textures=[...new Set([...textures,OWN_TEXTURES[name]])];
    const state={token,start:Date.now(),lease:acquire(null,textures),phase:'textures',sent:false,modelMs:null,texturesMs:null,donorMs:null,stableSince:0};pending=state;
    textures=state.lease.textures;
    const needsDonor=!['918s','720s','e63s'].includes(name);
    const phase=value=>mp.events.callRemote('server:vehicles:phase',token,value);
    phase('textures-loading');
    function queueModel(){state.phase='model-request';phase('model-request');}
    function tick(){
        if(pending!==state)return;
        const elapsed=Date.now()-state.start;
        if(state.sent){if(elapsed>=25000)finish(token);return;}
        if(elapsed>=20000){state.sent=true;mp.events.callRemote('server:vehicles:prepared',token,state.phase==='textures'?'textures':'timeout');finish(token);return;}
        if(state.phase==='textures'){
            if(!textures.every(t=>mp.game.graphics.hasStreamedTextureDictLoaded(t)))return;
            state.texturesMs=elapsed;state.stableSince=Date.now();state.phase='settle';phase('textures-ready');return;
        }
        if(state.phase==='settle'){
            if(Date.now()-state.stableSince<80)return;
            if(needsDonor){state.phase='donor';phase('donor-loading');mp.game.streaming.requestModel(plateDonor);}else{state.donorMs=0;queueModel();}return;
        }
        if(state.phase==='donor'){
            if(!mp.game.streaming.hasModelLoaded(plateDonor))return;
            state.donorMs=elapsed;queueModel();return;
        }
        if(state.phase==='model-request'){
            const refs=modelRefs.get(hash)||0;modelRefs.set(hash,refs+1);state.lease.hash=hash;state.phase='model';
            if(!refs)mp.game.streaming.requestModel(hash);return;
        }
        if(!mp.game.streaming.hasModelLoaded(hash))return;
        state.modelMs=elapsed;state.sent=true;phase('model-resident');
        mp.events.callRemote('server:vehicles:prepared',token,'loaded',JSON.stringify({modelMs:state.modelMs,texturesMs:state.texturesMs,donorMs:state.donorMs,totalMs:elapsed}));
    }
    function guardedTick(){try{tick();}catch(error){mp.events.callRemote('server:vehicles:prepared',token,'error');finish(token);}}
    state.timer=setInterval(guardedTick,40);guardedTick();
    } catch(error){mp.events.callRemote('server:vehicles:prepared',token,'error');if(pending)finish(pending.token);}
});
mp.events.add('client:vehicles:finish',finish);
mp.events.add('client:vehicles:audit',(token,json)=>{
    if(!global.isPlayerSpawned||typeof json!=='string'||json.length>50000)return;
    let names;try{names=JSON.parse(json);}catch(_){return;}
    if(!Array.isArray(names)||names.length>2000||names.some(n=>typeof n!=='string'||!/^[a-z0-9_]{1,64}$/.test(n)))return;
    const invalid=names.filter(name=>{const hash=mp.game.joaat(name)>>>0;return !mp.game.streaming.isModelValid(hash)||!isVehicleModel(hash);});
    mp.events.callRemote('server:vehicles:audit',token,JSON.stringify(invalid));
});
mp.events.add('entityStreamIn',entity=>{
    if(entity.type!=='vehicle'||entities.has(entity))return;
    const hash=entity.model>>>0;
    if(!mp.game.streaming.isModelValid(hash))return;
    entities.set(entity,acquire(hash,MODEL_TEXTURES[hash]||[]));
});
mp.events.add('entityStreamOut',entity=>{const lease=entities.get(entity);if(lease){entities.delete(entity);release(lease);}});
function reset(){releaseWarm();if(pending)finish(pending.token);for(const lease of entities.values())release(lease);entities.clear();}
mp.events.add('client:auth:show',reset);mp.events.add('client:charselect:show',reset);

const reportedSpawns=new WeakMap();
function confirmSpawn(entity){
 if(!entity||entity.type!=='vehicle'||!entity.handle)return;const token=entity.getVariable('spawnToken');
 if(typeof token!=='string'||reportedSpawns.get(entity)===token||!pending||pending.token!==token)return;
 reportedSpawns.set(entity,token);mp.events.callRemote('server:vehicles:streamed',token,entity.remoteId);
}
mp.events.add('entityStreamIn',confirmSpawn);mp.events.addDataHandler('spawnToken',confirmSpawn);
setInterval(()=>{if(pending&&pending.sent)mp.vehicles.forEachInStreamRange(confirmSpawn);},50);
