'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const policy=require('../packages/server/legacy/staff-policy');
assert.equal(policy.has(7,'player.level'),false);
assert.equal(policy.has(8,'player.level'),true);
assert.equal(policy.has(10,'player.level'),true);

async function fixture(options={}) {
    let row={charlevel:7,charexp:12},audit=[],messages=[],syncs=0,checks=0,queries=[];
    const player={static:2,accountId:5,characterId:42,charlevel:7,charexp:12};
    const actor={accountId:3,characterId:41};
    const access={assertPlayer:p=>({accountId:p.accountId,characterId:p.characterId})};
    const store={
        async transaction(work){
            const before={...row},oldAudit=audit.length;
            try{return await work({async query(sql,args){
                queries.push({sql,args});
                if(sql.startsWith('SELECT'))return {rows:options.missing?[]:[{...row}]};
                assert.deepEqual(Array.from(args),[55,42,5]);
                if(options.dbFailure)throw Error('database unavailable');
                row={charlevel:args[0],charexp:0};return {affectedRows:1};
            }});}catch(e){row=before;audit.length=oldAudit;throw e;}
        },
        async audit(tx,by,to,action,detail){
            assert.equal(by,3);assert.equal(to,5);assert.equal(action,'player.level');
            audit.push(detail);
            if(options.sessionChange)player.characterId=99;
            if(options.auditFailure)throw Error('audit failed');
        }
    };
    const ctx={module:{exports:{}},require:n=>({'./access':access,'./staff-state':store}[n]),console,pmSyncCharProgress:()=>syncs++};ctx.global=ctx;
    vm.runInNewContext(fs.readFileSync('packages/server/legacy/character-level.js','utf8'),ctx);
    const handler=ctx.module.exports({
        target:(ctx,id)=>{if(id!=='2')throw Error('not found');return player;},
        check:()=>{checks++;if(player.characterId!==42)throw Error('session changed');},
        need:(p,permission)=>{assert.equal(permission,'player.level');if(options.denied)throw Error('permission denied');},
        tell:(p,text)=>messages.push({p,text})
    });
    return {run:args=>handler({actor,identity:access.assertPlayer(actor)},args),player,
        state:()=>({row,audit,messages,syncs,checks,queries})};
}
(async()=>{
    const ok=await fixture();await ok.run(['2','55']);
    assert.equal(ok.player.charlevel,55);assert.equal(ok.player.charexp,0);
    assert.deepEqual(ok.state().row,{charlevel:55,charexp:0});
    assert.equal(ok.state().audit.length,1);assert.equal(ok.state().syncs,1);
    for(const args of [['2','0'],['2','1001'],['2','NaN'],['2','2.5'],['2','-1'],['2','1e2'],['2'],['2','55','extra']]){
        const f=await fixture();await assert.rejects(f.run(args));assert.equal(f.state().queries.length,0);
    }
    for(const options of [{denied:true},{missing:true},{dbFailure:true},{auditFailure:true},{sessionChange:true}]){
        const f=await fixture(options);await assert.rejects(f.run(['2','55']));
        assert.equal(f.player.charlevel,7);assert.equal(f.player.charexp,12);
        assert.deepEqual(f.state().row,{charlevel:7,charexp:12});
        assert.equal(f.state().audit.length,0);assert.equal(f.state().syncs,0);assert.equal(f.state().messages.length,0);
    }
    console.log('PASS: character level permissions, persistence, audit, UI sync, invalid input and transaction/session failures.');
})().catch(e=>{console.error(e);process.exitCode=1;});
