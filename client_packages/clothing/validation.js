const unavailable=new Set(require('./clothing/unavailable.json').hashes);
function itemHash(ped,kind,row) {
    const files=mp.game.files, fn=files&&(kind==='props'?files.getHashNameForProp:files.getHashNameForComponent);
    if(typeof fn!=='function')throw Error('Недоступна проверка совместимости одежды.');
    return fn.call(files,ped.handle,row[0],row[1],row[2])>>>0;
}
function validate(ped,kind,row) {
    if(!ped || !ped.handle || !Array.isArray(row) || !row.every(Number.isInteger)) return 'Некорректные параметры.';
    const [slot,drawable,texture,palette]=row;
    if(slot<0||slot>(kind==='props'?7:11)||drawable<0||texture<0||(kind!=='props'&&(palette<0||palette>3)))return 'Неверный слот, модель, текстура или палитра.';
    const api=mp.game.ped;
    if(kind==='props') {
        const count=api.getNumberOfPropDrawableVariations(ped.handle,slot);
        if(!Number.isInteger(count)||count<1||drawable>=count)return 'ID аксессуара вне диапазона 0–'+(count-1)+'.';
        const textures=api.getNumberOfPropTextureVariations(ped.handle,slot,drawable);
        if(!Number.isInteger(textures)||textures<1||texture>=textures)return 'У аксессуара нет текстуры '+texture+'. Доступно: '+textures+'.';
    } else {
        const count=api.getNumberOfDrawableVariations(ped.handle,slot);
        if(!Number.isInteger(count)||count<1||drawable>=count)return 'ID одежды вне диапазона 0–'+(count-1)+'.';
        const textures=api.getNumberOfTextureVariations(ped.handle,slot,drawable);
        if(!Number.isInteger(textures)||textures<1||texture>=textures)return 'У модели '+drawable+' нет текстуры '+texture+'. Доступно: '+textures+'.';
        if(!api.isComponentVariationValid(ped.handle,slot,drawable,texture))return 'Движок считает вариант '+slot+'/'+drawable+'/'+texture+' недопустимым.';
    }
    if(unavailable.has(itemHash(ped,kind,row)))return 'Для этой позиции в Legacy находится заглушка вместо нормальной модели. Выберите вещь через /clothlist '+slot+'.';
    return null;
}
const bodyFit=require('./clothing/body-fit').create({validate,itemHash});
mp.events.add('client:clothing:validate',(token,kind,json,model)=>{
    if(typeof token!=='string'||token.length!==32||!['components','props'].includes(kind)||typeof json!=='string'||json.length>2000)return;
    try {
        const ped=mp.players.local; let rows=JSON.parse(json);
        if((ped.model>>>0)!==(model>>>0))throw Error('Модель персонажа изменилась.');
        if(!Array.isArray(rows)||!rows.length||rows.length>12)throw Error('Некорректный список одежды.');
        for(const row of rows){if(!Array.isArray(row)||row.length!==(kind==='props'?3:4))throw Error('Некорректные параметры.');const error=validate(ped,kind,row);if(error)throw Error(error);}
        const fitted=kind==='components'?bodyFit.resolve(ped,rows):{rows,source:null};
        rows=fitted.rows;
        for(const row of rows){const error=validate(ped,kind,row);if(error)throw Error(error);}
        mp.events.callRemote('server:clothing:validated',token,true,JSON.stringify({rows,hashes:rows.map(row=>itemHash(ped,kind,row)),fit:fitted.source}));
    } catch(e) {mp.events.callRemote('server:clothing:validated',token,false,String(e.message).slice(0,240));}
});
let auditBusy=false;
mp.events.add('client:clothing:audit',token=>{
    if(auditBusy||typeof token!=='string'||token.length!==32)return;
    auditBusy=true;
    const ped=mp.players.local,handle=ped.handle,model=ped.model,slots=[];
    let slot=0;
    const timer=setInterval(()=>{
        try {
            if(mp.players.local.handle!==handle||mp.players.local.model!==model)throw Error('Ped changed during audit');
            const api=mp.game.ped,count=api.getNumberOfDrawableVariations(handle,slot);
            if(!Number.isInteger(count)||count<0||count>4096)throw Error('Unexpected drawable count');
            const invalid=[],empty=[],invalidTextures=[],excluded=[];let invalidCount=0,invalidTextureCount=0,checkedTextures=0,excludedTextures=0;
            for(let d=0;d<count;d++){
                const textures=api.getNumberOfTextureVariations(handle,slot,d);
                if(textures<=0){if(empty.length<100)empty.push(d);}
                if(!api.isComponentVariationValid(handle,slot,d,0)){invalidCount++;if(invalid.length<100)invalid.push(d);}
                if(!Number.isInteger(textures)||textures<0||textures>256)throw Error('Unexpected texture count');
                let available=false;
                for(let t=0;t<textures;t++){checkedTextures++;if(!api.isComponentVariationValid(handle,slot,d,t)){invalidTextureCount++;if(invalidTextures.length<100)invalidTextures.push([d,t]);}else if(unavailable.has(itemHash(ped,'components',[slot,d,t,0])))excludedTextures++;else available=true;}
                if(textures>0&&!available&&excluded.length<300)excluded.push(d);
            }
            const row={slot,count,invalidCount,invalid,empty,checkedTextures,invalidTextureCount,invalidTextures,excluded,excludedTextures};
            if(slot===11){row.samples=[500,610,687,688,689].map(drawable=>{
                const r={drawable,textures:drawable<count?api.getNumberOfTextureVariations(handle,slot,drawable):0,valid:drawable<count&&api.isComponentVariationValid(handle,slot,drawable,0)};
                try{r.hash=itemHash(ped,'components',[slot,drawable,0,0]);r.unavailable=unavailable.has(r.hash);}catch(_){}
                return r;
            });}
            if(slot===11){
                const coverage={checked:0,methods:{},fallback:[],fallbackDetails:[],failures:[]};
                for(let d=0;d<count;d++){
                    if(validate(ped,'components',[11,d,0,0]))continue;
                    try{const fitted=bodyFit.resolve(ped,[[11,d,0,0]]);coverage.checked++;const method=fitted.source.method;coverage.methods[method]=(coverage.methods[method]||0)+1;if(method==='body-fallback'&&coverage.fallback.length<100){coverage.fallback.push(d);coverage.fallbackDetails.push([d,itemHash(ped,'components',[11,d,0,0]),fitted.torso[1]]);}}
                    catch(e){if(coverage.failures.length<100)coverage.failures.push([d,String(e.message)]);}
                }
                row.fitCoverage=coverage;
                row.fitSamples=[0,111,365,629,636,658,661,662,687,688,689].map(d=>{try{const fitted=bodyFit.resolve(ped,[[11,d,0,0]]);return {drawable:d,torso:fitted.torso,undershirt:fitted.undershirt,source:fitted.source};}catch(e){return {drawable:d,error:String(e.message)};}});
            }
            if([4,6].includes(slot)){row.catalog=[];for(let d=0;d<count;d++)if(!validate(ped,'components',[slot,d,0,0]))row.catalog.push([d,itemHash(ped,'components',[slot,d,0,0])]);}
            slots.push(row);slot++;
            if(slot===12){clearInterval(timer);auditBusy=false;mp.events.callRemote('server:clothing:audit:result',token,JSON.stringify({edition:mp.game.gameplay.isGen9===true?'enhanced':'legacy',current:[3,4,6,8,9,10,11].map(s=>[s,ped.getDrawableVariation(s),ped.getTextureVariation(s),ped.getPaletteVariation(s)]),slots}));}
        }catch(e){clearInterval(timer);auditBusy=false;mp.events.callRemote('server:clothing:audit:result',token,JSON.stringify({slots,error:String(e.message)}));}
    },75);
});
let requested=false;
const readyTimer=setInterval(()=>{if(!requested&&global.isPlayerSpawned){requested=true;clearInterval(readyTimer);mp.events.callRemote('server:clothing:audit:ready');}},1500);
exports.validate=validate;
exports.itemHash=itemHash;
mp.events.add('client:clothing:list',(slot,page)=>{
    if(!Number.isInteger(slot)||slot<0||slot>11||!Number.isInteger(page)||page<1||page>1000)return;
    try{
        const ped=mp.players.local,count=mp.game.ped.getNumberOfDrawableVariations(ped.handle,slot),rows=[];
        if(!Number.isInteger(count)||count<0||count>4096)throw Error('Не удалось прочитать каталог одежды.');
        for(let d=0;d<count;d++){
            const textures=mp.game.ped.getNumberOfTextureVariations(ped.handle,slot,d);
            if(!Number.isInteger(textures)||textures<0||textures>256)continue;
            for(let t=0;t<textures;t++){if(!validate(ped,'components',[slot,d,t,0])){rows.push([d,t]);break;}}
        }
        const pages=Math.max(1,Math.ceil(rows.length/12)),selected=Math.min(page,pages);
        mp.events.call('client:chat:message','Одежда: слот '+slot+', страница '+selected+'/'+pages+'. Заглушки исключены.');
        for(const row of rows.slice((selected-1)*12,selected*12))mp.events.call('client:chat:message','/cloth '+slot+' '+row[0]+' '+row[1]);
        if(selected<pages)mp.events.call('client:chat:message','Следующая страница: /clothlist '+slot+' '+(selected+1));
    }catch(e){mp.events.call('client:chat:message',String(e.message));}
});

exports.resolve=(ped,list)=>bodyFit.resolve(ped,list);
