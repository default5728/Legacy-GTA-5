const data=require('./clothing/body-fit-data.json');
const profiles=require('./clothing/profiles');
exports.create=function createBodyFit(checks){
    const hashIndexes=new Map(),zeroName=()=>mp.game.joaat('0')>>>0;
    function rule(hash){
        const stored=data.rules[String(hash)],files=mp.game.files;
        const fallback={forced:stored?stored[0]:[],variants:stored?stored[1]:[],source:stored?'stock-metadata':'none'};
        if(!hash||!files||typeof files.getShopPedApparelForcedComponentCount!=='function'||typeof files.getForcedComponent!=='function')return fallback;
        try{
            const count=files.getShopPedApparelForcedComponentCount(hash);
            if(!Number.isInteger(count)||count<0||count>64)return fallback;
            if(!count)return fallback;
            const forced=[];
            for(let i=0;i<count;i++){
                const row=files.getForcedComponent(hash,i);
                const slot=Array.isArray(row)?row[2]:row&&(row.componentType===undefined?row.anchorPoint:row.componentType);
                const name=Array.isArray(row)?row[0]:row&&row.nameHash,value=Array.isArray(row)?row[1]:row&&row.enumValue;
                if(!Number.isInteger(slot)||!Number.isInteger(value)||!Number.isFinite(name))return fallback;
                if([3,4,6,8,9,10].includes(slot))forced.push([slot,name>>>0,value]);
            }
            return {forced,variants:fallback.variants,source:'engine-forced-components'};
        }catch(_){return fallback;}
    }
    function findHash(ped,slot,target){
        const count=mp.game.ped.getNumberOfDrawableVariations(ped.handle,slot);
        const key=(ped.model>>>0)+':'+slot+':'+count;
        let index=hashIndexes.get(key);
        if(!index){
            if(!Number.isInteger(count)||count<0||count>4096)throw Error('Не удалось прочитать зависимую часть одежды.');
            index=new Map();
            for(let d=0;d<count;d++){
                const textures=mp.game.ped.getNumberOfTextureVariations(ped.handle,slot,d);
                if(!Number.isInteger(textures)||textures<0||textures>256)continue;
                for(let t=0;t<textures;t++){
                    const tuple=[slot,d,t,0];
                    const h=checks.itemHash(ped,'components',tuple);
                    if(h&&!index.has(h)&&!checks.validate(ped,'components',tuple))index.set(h,tuple);
                }
            }
            hashIndexes.set(key,index);
        }
        return index.get(target)||null;
    }
    function resolve(ped,list){
        if(!Array.isArray(list)||!list.length||list.length>12)throw Error('Некорректный комплект одежды.');
        const api=mp.game.ped,female=(ped.model>>>0)===(mp.game.joaat('mp_f_freemode_01')>>>0);
        const freemode=female||(ped.model>>>0)===(mp.game.joaat('mp_m_freemode_01')>>>0);
        const requested=new Map(),context=new Map(),result=new Map();
        for(const input of list){
            if(!Array.isArray(input)||input.length!==4)throw Error('Некорректные параметры одежды.');
            const row=input.slice(),error=checks.validate(ped,'components',row);if(error)throw Error(error);
            requested.set(row[0],row);result.set(row[0],row);
        }
        if(!freemode)return {rows:Array.from(result.values()),source:'non-freemode'};
        for(const slot of [3,4,6,8,9,10,11])context.set(slot,requested.get(slot)||[slot,ped.getDrawableVariation(slot),ped.getTextureVariation(slot),ped.getPaletteVariation(slot)]);
        const emptyUnder=female?14:15,top=context.get(11),topHash=checks.itemHash(ped,'components',top);
        let topRules=rule(topHash);
        if(!topRules.forced.some(row=>row[0]===3)&&top[1]!==15){
            const textures=api.getNumberOfTextureVariations(ped.handle,11,top[1]);
            if(Number.isInteger(textures)&&textures>0&&textures<=256)for(let t=0;t<textures;t++){
                if(t===top[2])continue;
                const alternate=rule(checks.itemHash(ped,'components',[11,top[1],t,top[3]]));
                const arms=alternate.forced.find(row=>row[0]===3);
                if(arms){topRules={forced:[...topRules.forced,arms],variants:topRules.variants,source:'stock-same-geometry'};break;}
            }
        }
        if(!topRules.forced.some(row=>row[0]===3)){
            const outfit=data.outfitRules[String(topHash)];
            if(outfit){topRules={forced:[...topRules.forced,...outfit.filter(r=>!topRules.forced.some(existing=>existing[0]===r[0]))],variants:topRules.variants,source:'stock-outfit-profile'};}
        }
        const source={top:top[1],texture:top[2],hash:topHash,method:topRules.source};
        function put(row){
            if(!row)return;
            const error=checks.validate(ped,'components',row);if(error)throw Error('Зависимая часть: '+error);
            const primary=requested.get(row[0]);
            if(primary&&![3,8,10].includes(row[0])&&primary.some((v,i)=>v!==row[i]))throw Error('Несовместимый комплект: для выбранной одежды требуется слот '+row[0]+', модель '+row[1]+', текстура '+row[2]+'.');
            context.set(row[0],row);result.set(row[0],row);
        }
        function dependent(row){
            const [slot,name,value]=row;
            if(name&&name!==zeroName())return findHash(ped,slot,name);
            if(value===240)return slot===8?[8,emptyUnder,0,0]:null;
            if(value<0)return null;
            const tuple=[slot,value,0,0];return checks.validate(ped,'components',tuple)?null:tuple;
        }
        const count=api.getNumberOfDrawableVariations(ped.handle,11),base=data.customMaleBaseline;
        let torso=null;
        if(female&&top[1]===count-1&&api.getNumberOfTextureVariations(ped.handle,11,top[1])===15){torso=[3,0,0,0];source.method='legacy26-basic-top';}
        if(!female&&!topHash&&top[1]>=base&&top[1]<count){
            const index=top[1]-base;torso=[3,data.customMaleTopArms[index],0,0];source.method='dlc-'+data.customMaleTopSources[index];
        }else{
            for(const row of topRules.forced)if(row[0]===3){torso=dependent(row);if(!torso)throw Error('Не найдена совместимая модель торса для верха '+top[1]+'.');break;}
        }
        const baseArms=female?data.baseFemaleTopArms:data.baseMaleTopArms;
        if(!torso&&top[1]<baseArms.length){torso=[3,baseArms[top[1]],0,0];source.method='base-mesh-profile';}
        if(!torso&&Object.prototype.hasOwnProperty.call(data.reviewedTopArms,String(topHash))){torso=[3,data.reviewedTopArms[String(topHash)],0,0];source.method='stock-offline-mesh-review';}
        if(top[1]===15){torso=[3,15,0,0];source.method='bare-body';}
        if(!torso){
            const profile=(female?profiles.wardrobe.female:profiles.wardrobe.male).tops.find(p=>p.drawable===top[1]);
            torso=[3,profile?profile.torso:(female?14:0),0,0];source.method=profile?'base-profile':'body-fallback';
        }
        put(torso);
        const variants=topRules.variants.filter(row=>row[0]===8).map(dependent).filter(Boolean);
        let under=null;
        for(const row of topRules.forced)if(row[0]===8){
            if(row[2]===240&&!row[1]&&variants.length){
                const current=context.get(8);under=variants.find(v=>v[1]===current[1]&&v[2]===current[2])||variants[0];
            }else under=dependent(row);
            if(under)break;
        }
        if(!under&&variants.length){const current=context.get(8);under=variants.find(v=>v[1]===current[1]&&v[2]===current[2])||variants[0];}
        if(!under)under=[8,emptyUnder,0,0];
        put(under);
        if(requested.has(11)||requested.has(10))put(requested.get(10)||[10,0,0,0]);
        for(const row of topRules.forced)if([4,6,9,10].includes(row[0])){const resolved=dependent(row);if(resolved)put(resolved);}
        let stable=false;
        for(let pass=0;pass<4;pass++){
            const before=JSON.stringify([context.get(4),context.get(6)]);
            for(const [slot,dependentSlot] of [[4,6],[6,4]]){
                const partRules=rule(checks.itemHash(ped,'components',context.get(slot)));
                for(const row of partRules.forced)if(row[0]===dependentSlot){const resolved=dependent(row);if(!resolved)throw Error('Не найдена совместимая часть ног/обуви.');put(resolved);}
            }
            if(before===JSON.stringify([context.get(4),context.get(6)])){stable=true;break;}
        }
        if(!stable)throw Error('Несовместимые требования брюк и обуви.');
        const order=[4,6,8,9,10,11,3];
        const rows=Array.from(result.values()).sort((a,b)=>{const ai=order.indexOf(a[0]),bi=order.indexOf(b[0]);return (ai<0?-20+a[0]:ai)-(bi<0?-20+b[0]:bi);});
        return {rows,source,torso:context.get(3),undershirt:context.get(8),legs:context.get(4),shoes:context.get(6)};
    }
    return {resolve};
};
