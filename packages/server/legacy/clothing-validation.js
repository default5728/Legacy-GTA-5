const crypto = require('crypto');
const access = require('./access');
const unavailable = new Set(require('../../../client_packages/clothing/unavailable.json').hashes);
let shared;
module.exports = function initialize(sendChat) {
    if(shared)return shared;
    const pending = new Map(), audits = new Map(), audited = new WeakSet();
    function same(player, state) {
        try {
            const id = access.assertPlayer(player);
            return id.accountId === state.identity.accountId && id.characterId === state.identity.characterId && player.model === state.model;
        } catch (_) { return false; }
    }
    function validRows(kind,rows){
        return Array.isArray(rows)&&rows.length>0&&rows.length<=12&&new Set(rows.map(r=>r&&r[0])).size===rows.length&&!rows.some(r=>!Array.isArray(r)||r.length!==(kind==='props'?3:4)||!r.every(Number.isSafeInteger)||r[0]<0||r[0]>(kind==='props'?7:11)||r[1]<0||r[1]>4095||r[2]<0||r[2]>255||(kind==='components'&&(r[3]<0||r[3]>3)));
    }
    function finish(player,state,ok){
        clearTimeout(state.timer);
        if(pending.get(player)===state)pending.delete(player);
        state.complete(ok);
    }
    function request(player,kind,rows,options={}){
        try{
            const identity=access.assertPlayer(player),model=player.model;
            if(!['components','props'].includes(kind)||!validRows(kind,rows))throw Error('Некорректные параметры одежды.');
            const previous=pending.get(player);
            if(previous){
                if(options.quiet)return previous.completion.then(()=>same(player,{identity,model})?request(player,kind,rows,options):false);
                throw Error('Дождитесь проверки предыдущей вещи.');
            }
            const token=crypto.randomBytes(16).toString('hex');
            const state={token,identity,model,kind,rows:rows.map(r=>r.slice()),quiet:options.quiet===true,restore:options.restore===true};
            state.completion=new Promise(resolve=>state.complete=resolve);
            state.timer=setTimeout(()=>{if(pending.get(player)===state){finish(player,state,false);if(!state.quiet&&mp.players.exists(player))sendChat(player,'Клиент не ответил на подбор одежды. Вещь не применена; перезайдите после обновления.');}},15000);
            pending.set(player,state);
            try{player.call('client:clothing:validate',[token,kind,JSON.stringify(rows),model]);}catch(e){finish(player,state,false);throw e;}
            return state.completion;
        }catch(e){if(!options.quiet)sendChat(player,e.message);return Promise.resolve(false);}
    }
    mp.events.add('server:clothing:validated',async (player,token,ok,detail)=>{
        const state=pending.get(player);
        if(!state||state.token!==token||typeof ok!=='boolean')return;
        if(!same(player,state)){finish(player,state,false);return;}
        let success=false;
        try{
            if(!ok)throw Error(typeof detail==='string'?detail.slice(0,240):'Вариант не прошёл проверку.');
            if(typeof detail!=='string'||detail.length>8000)throw Error('Нет отчёта подбора одежды.');
            const metadata=JSON.parse(detail),rows=state.kind==='props'?state.rows:metadata.rows;
            if(!validRows(state.kind,rows))throw Error('Некорректный подобранный комплект.');
            if(state.kind==='components'){
                const resolved=new Map(rows.map(r=>[r[0],r]));
                for(const row of state.rows)if(![3,8,10].includes(row[0])){const actual=resolved.get(row[0]);if(!actual||actual.some((v,i)=>v!==row[i]))throw Error('Подбор изменил выбранную вещь.');}
                for(const row of rows)if(!state.rows.some(r=>r[0]===row[0])&&![3,4,6,8,9,10].includes(row[0]))throw Error('Недопустимая зависимая часть одежды.');
            }
            if(!Array.isArray(metadata.hashes)||metadata.hashes.length!==rows.length||metadata.hashes.some(h=>!Number.isSafeInteger(h)||h<0||h>0xffffffff))throw Error('Некорректный отчёт совместимости одежды.');
            if(metadata.hashes.some(h=>unavailable.has(h)))throw Error('В этой позиции находится заглушка вместо модели, совместимой с Legacy. Выберите вещь через /clothlist.');
            if(!state.restore)await require('./wardrobe-state').save(player,state.kind,rows);
            if(pending.get(player)!==state||!same(player,state))return;
            if(state.kind==='props')for(const row of rows)player.setProp(...row);
            else{
                for(const row of rows)player.setClothes(...row);
                player.call('client:inventory:clothes',[JSON.stringify(rows)]);
            }
            console.log('[CLOTHING FIT]',JSON.stringify({player:player.id,requested:state.rows,rows,source:metadata.fit||null}));
            if(!state.quiet)sendChat(player,'Одежда применена: '+state.rows.filter(r=>![3,8,10].includes(r[0])||state.rows.length===1).map(r=>'слот '+r[0]+', ID '+r[1]+', текстура '+r[2]).join('; '));
            success=true;
        }catch(e){
            console.log('[CLOTHING FIT REJECTED]',JSON.stringify({player:player.id,rows:state.rows,error:e.message}));
            if(!state.quiet)sendChat(player,'Одежда не применена: '+e.message);
        }finally{finish(player,state,success);}
    });
    function audit(player, automatic=false) {
        try {
            const identity=access.assertPlayer(player);
            if (!access.hasPermission(player,'vehicle.spawn') || audits.has(player) || (automatic && audited.has(player))) return;
            const token=crypto.randomBytes(16).toString('hex');
            const state={token,identity,model:player.model};
            state.timer=setTimeout(()=>{if(audits.get(player)===state)audits.delete(player);},30000);
            audits.set(player,state); audited.add(player);
            player.call('client:clothing:audit',[token]);
            if(!automatic)sendChat(player,'Проверяю варианты во всех слотах без надевания вещей…');
        } catch(e) { if(!automatic)sendChat(player,e.message); }
    }
    // Full audits are explicit /clothaudit requests, never part of the login handshake.
    mp.events.add('server:clothing:audit:result',(player,token,json)=>{
        const state=audits.get(player);
        if(!state||state.token!==token||typeof json!=='string'||json.length>65536)return;
        clearTimeout(state.timer);audits.delete(player);
        if(!same(player,state))return;
        try {
            const report=JSON.parse(json);
            if(!Array.isArray(report.slots)||report.slots.length>12)return;
            console.log('[CLOTHING AUDIT]',JSON.stringify({player:player.id,model:state.model,report}));
            const tops=report.slots.find(s=>s.slot===11),pending=tops&&tops.fitCoverage&&tops.fitCoverage.fallback;
            sendChat(player,'[DLC INFO] Проверка каталога завершена. Верх без точного правила подбора: '+(Array.isArray(pending)?pending.length:'не определено')+'. Это не визуальная проверка вещей.');
        } catch(_) {}
    });
    mp.events.add('playerQuit',player=>{
        for(const map of [pending,audits]) {const state=map.get(player);if(state){clearTimeout(state.timer);if(state.complete)state.complete(false);}map.delete(player);}
    });
    shared={request,audit};return shared;
};

module.exports.current=()=>shared;
