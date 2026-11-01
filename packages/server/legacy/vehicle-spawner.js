const crypto = require('crypto');
const access = require('./access');
const registry = require('./vehicle-registry.json');
module.exports = function initializeVehicleSpawner(sendChat) {
    function trace(state,phase){const data={build:'materials-first-20261028',time:new Date().toISOString(),model:state.model,pack:state.pack,phase,client:state.timing||null};try{require('fs').writeFileSync(require('path').resolve(__dirname,'../../vehicle-last-attempt.json'),JSON.stringify(data,null,2));require('fs').appendFileSync(require('path').resolve(__dirname,'../../vehicle-attempts.jsonl'),JSON.stringify(data)+'\n');}catch(e){console.error('[VEHICLE TRACE]',e.message);}console.log('[VEHICLE STAGE]',JSON.stringify(data));}
    console.log('[VEHICLE SPAWNER] spawn-trace-20261028',__filename);
    const pending = new Map(), audits = new WeakMap(), auditedSessions = new WeakSet(), warmedSessions = new WeakSet();
    function cancel(player) {
        const request=pending.get(player);if(!request)return;
        clearTimeout(request.timer);pending.delete(player);if(request.vehicle&&!request.confirmed&&mp.vehicles.exists(request.vehicle))request.vehicle.destroy();
        if(mp.players.exists(player))player.call('client:vehicles:finish',[request.token]);
    }
    function request(player,input,checkOnly=false) {
        if(!access.hasPermission(player,'vehicle.spawn')||!player.characterId)return;
        if(typeof input!=='string'||!/^[a-z0-9_]{1,64}$/i.test(input))return sendChat(player,'Использование: /veh модель или /vehcheck модель');
        if(pending.has(player))return sendChat(player,'Дождитесь загрузки предыдущей модели.');
        let model=input.toLowerCase();model=Object.prototype.hasOwnProperty.call(registry.aliases,model)?registry.aliases[model]:model;
        const record=Object.prototype.hasOwnProperty.call(registry.models,model)?registry.models[model]:null;
        const state={phase:'loading',model,pack:record?record.pack:'GTA V',startedAt:Date.now(),token:crypto.randomBytes(16).toString('hex'),checkOnly,characterId:player.characterId,dimension:player.dimension};
        state.timer=setTimeout(()=>{if(pending.get(player)===state){cancel(player);sendChat(player,'Клиент не подтвердил создание '+model+'. Незавершённый транспорт удалён.');}},25000);
        pending.set(player,state);trace(state,'prepare-sent');
        try{require('fs').writeFileSync(require('path').resolve(__dirname,'../../vehicle-last-attempt.json'),JSON.stringify({time:new Date().toISOString(),model,pack:state.pack,phase:'requesting-client-model'},null,2));}catch(_){}

        player.call('client:vehicles:prepare',[state.token,model,JSON.stringify(record?record.dependencies:[])]);
    }
    mp.events.add('server:vehicles:phase',(player,token,phase)=>{
        const state=pending.get(player);if(!state||state.token!==token||state.phase!=='loading'||player.characterId!==state.characterId||!access.hasPermission(player,'vehicle.spawn'))return;
        if(!['textures-loading','textures-ready','donor-loading','model-request','model-resident'].includes(phase)||state.lastClientPhase===phase)return;
        state.lastClientPhase=phase;trace(state,'client-'+phase);
    });
    mp.events.add('server:vehicles:prepared',(player,token,result,timingJson)=>{
        const state=pending.get(player);
        if(!state||state.token!==token||state.phase!=='loading')return;
        if(!access.hasPermission(player,'vehicle.spawn')||player.characterId!==state.characterId||player.dimension!==state.dimension){cancel(player);return;}
        if(result!=='loaded'){
            const reason=result==='invalid'?'DLC не зарегистрирован клиентом (invalid model)':result==='textures'?'не загрузились общие текстуры':result==='error'?'ошибка клиентского API при загрузке':'истекло время загрузки модели';
            console.warn('[VEHICLE LOAD]',state.model,state.pack,result);
            if(result==='invalid')audit(player,true);
            cancel(player);return sendChat(player,`${state.model}: ${reason}. Пак: ${state.pack}. Выполните полный перезапуск RAGE MP после обновления ресурсов.`);
        }
        if(typeof timingJson==='string'&&timingJson.length<1000){try{const t=JSON.parse(timingJson);if(['modelMs','texturesMs','donorMs','totalMs'].every(k=>Number.isFinite(t[k])&&t[k]>=0&&t[k]<=25000))state.timing=t;}catch(_){}}
        try{require('fs').writeFileSync(require('path').resolve(__dirname,'../../vehicle-last-attempt.json'),JSON.stringify({time:new Date().toISOString(),model:state.model,pack:state.pack,phase:'model-loaded',client:state.timing},null,2));}catch(_){}
        trace(state,'model-loaded');if(state.checkOnly){cancel(player);return sendChat(player,`${state.model}: модель и текстуры загружены. Пак: ${state.pack}.`);}
        try {
            const position=player.position,h=player.heading,r=h*Math.PI/180;
            // Initialize replicated plate properties outside every player's dimension.
            // Use an explicit empty startup plate while custom model materials become resident.
            trace(state,'before-create');const vehicle=mp.vehicles.new(mp.joaat(state.model),new mp.Vector3(position.x-Math.sin(r)*5,position.y+Math.cos(r)*5,position.z+.2),
                {numberPlate:'',heading:h,dimension:2147480000+(player.id||0),engine:false});
            vehicle.setVariable('owner',player.static);vehicle.setVariable('adminveh',true);state.vehicle=vehicle;state.phase='publishing';trace(state,'created-private');
            vehicle.ownerCharacterId=state.characterId;vehicle.setVariable('ownerCharacterId',state.characterId);
            vehicle.setVariable('modelName',state.model);vehicle.setVariable('fuel',95);vehicle.setVariable('engineOn',false);vehicle.setVariable('spawnToken',state.token);
            setTimeout(()=>{
                if(pending.get(player)!==state||!mp.players.exists(player)||player.characterId!==state.characterId||player.dimension!==state.dimension){cancel(player);return;}
                if(!mp.vehicles.exists(vehicle)){cancel(player);return;}
                state.phase='streaming';trace(state,'before-publish');vehicle.dimension=state.dimension;trace(state,'published');
                console.log('[VEHICLE CREATE]',state.model,'id='+vehicle.id,'awaiting client handle');
            },0);
        } catch(err){console.error('[VEHICLE SPAWN]',state.model,err.message);sendChat(player,'Не удалось создать '+state.model+': '+err.message);cancel(player);}
    });
    mp.events.add('server:vehicles:streamed',(player,token,id)=>{
        const state=pending.get(player);if(!state||state.token!==token||state.phase!=='streaming'||!state.vehicle||state.vehicle.id!==id||!mp.vehicles.exists(state.vehicle)||player.characterId!==state.characterId)return;
        const diagnostic={time:new Date().toISOString(),model:state.model,serverTotalMs:Date.now()-state.startedAt,client:state.timing||null};
        try{require('fs').writeFileSync(require('path').resolve(__dirname,'../../vehicle-spawn-timing.json'),JSON.stringify(diagnostic,null,2));}catch(_){}
        trace(state,'client-confirmed');state.confirmed=true;console.log('[VEHICLE STREAMED]',state.model,'id='+id);sendChat(player,'Транспорт '+state.model+' создан.');cancel(player);
    });
    mp.events.add('playerQuit',player=>{cancel(player);});
    mp.events.addCommand('vehcheck',(player,text)=>request(player,String(text||'').trim(),true));
    function audit(player,quiet=false) {
        if(!access.hasPermission(player,'vehicle.spawn')||!player.characterId)return;
        const current=audits.get(player);if(current&&Date.now()-current.time<10000)return;
        const token=crypto.randomBytes(16).toString('hex');
        audits.set(player,{token,time:Date.now(),quiet});
        player.call('client:vehicles:audit',[token,JSON.stringify(Object.keys(registry.models))]);
    }
    mp.events.addCommand('vehcheckall',player=>audit(player));
    // /vehcheckall remains available; avoid bulk diagnostics on every reconnect.
    mp.events.add('server:vehicles:audit',(player,token,json)=>{
        const state=audits.get(player);if(!access.hasPermission(player,'vehicle.spawn')||!state||state.token!==token||Date.now()-state.time>30000||typeof json!=='string'||json.length>50000)return;
        let invalid;try{invalid=JSON.parse(json);}catch(_){return;}
        if(!Array.isArray(invalid)||invalid.length>Object.keys(registry.models).length||invalid.some(name=>!Object.prototype.hasOwnProperty.call(registry.models,name)))return;
        audits.delete(player);
        const report={time:new Date().toISOString(),checked:Object.keys(registry.models).length,invalid:[...new Set(invalid)]};
        try{require('fs').writeFileSync(require('path').resolve(__dirname,'../../vehicle-diagnostics.json'),JSON.stringify(report,null,2));}catch(err){console.error('[VEHICLE AUDIT]',err.message);}
        if(!state.quiet)sendChat(player,`Проверено моделей: ${report.checked}. Не зарегистрированы: ${report.invalid.length}. ${report.invalid.slice(0,15).join(', ')}`);
        console.log('[VEHICLE AUDIT]',JSON.stringify(report));
    });
    request.audit=audit;
    return request;
};
