'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),handlers={};
const sandbox={global:{ClothesItemsSell:[{ItemID:1,ClothID:3}]},mp:{events:{add:(n,f)=>handlers[n]=f},joaat:()=>2627665880},require:()=>({assertPlayer:()=>({})}),module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'packages/server/legacy/content-clothes.js'),'utf8'),sandbox);sandbox.module.exports();
const p={model:1885233650};handlers['legacy:content:clothes'](p,p.model,691,178,15,2);
let rows=sandbox.global.legacyRegularClothesCatalogue(p);assert.equal(rows.length,1+6*17);assert.equal(sandbox.global.ClothesItemsSell.length,1);assert(rows.some(r=>r.ClothID===3&&r.Drawable===690&&r.TopTexture===14));assert(rows.some(r=>r.ClothID===5&&r.Drawable===177&&r.TopTexture===1));assert(rows.slice(1).every(r=>r.ItemID<10000));
const female={model:2627665880};handlers['legacy:content:clothes'](female,female.model,601,180,15,2);rows=sandbox.global.legacyRegularClothesCatalogue(female);assert(rows.slice(1).every(r=>r.ItemID>=10000));assert(rows.some(r=>r.Drawable===600));
const invalid={model:1885233650};handlers['legacy:content:clothes'](invalid,invalid.model,691,178,0,2);assert.equal(sandbox.global.legacyRegularClothesCatalogue(invalid).length,1);
const fit=JSON.parse(fs.readFileSync(path.join(root,'client_packages/clothing/body-fit-data.json')));assert.equal(691-fit.customMaleTopCount,fit.customMaleBaseline);assert.equal(fit.customMaleTopCount,fit.customMaleTopArms.length);
const server=fs.readFileSync(path.join(root,'packages/server/autosalon.js'),'utf8').match(/const AUTOSALON_CATALOG = (\{[\s\S]*?\});/)[1];
const client=fs.readFileSync(path.join(root,'client_packages/autosalon.js'),'utf8').match(/const AUTOSALON_VEHICLES = (\[[\s\S]*?\]);/)[1];const prices=vm.runInNewContext('('+server+')'),cars=vm.runInNewContext('('+client+')');
const registry=require('../packages/server/legacy/vehicle-registry.json');for(const model of ['98clk','tesroad20','2108320','2109320','2109920','21134','21144','21154','2347','21093099ip','211415p']){assert(registry.models[model]);assert.equal(cars.find(c=>c.model===model).price,prices[model]);}
console.log('PASS: collection-specific shop rows for both genders, unchanged base catalogue, old male body-fit offsets preserved, eleven vehicle sale/spawn entries match.');
