'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
let sourceLine=26;const all={peds:[],objects:[],colshapes:[]};
function pool(kind){return {exists:e=>all[kind].includes(e),new:(model,position,opts={})=>{const entity={model,position:{...position},dimension:opts.dimension||0,heading:opts.heading||0};all[kind].push(entity);return entity;},newSphere(x,y,z){const entity={position:{x,y,z},dimension:0};all[kind].push(entity);return entity;}};}
const mp={joaat:()=>42,peds:pool('peds'),objects:pool('objects'),colshapes:pool('colshapes'),Vector3:function(x,y,z){Object.assign(this,{x,y,z});}};
const ctx={mp,require:name=>name.includes('world-locations')?require('../client_packages/shared/world-locations.json'):require(name),module:{exports:{}},global:{},__dirname:path.resolve('packages/server/legacy/creator'),Error:function(){this.stack='Error\n at caller ('+path.resolve('packages/server/port_job.js')+':'+sourceLine+':5)';}};
vm.runInNewContext(fs.readFileSync('packages/server/legacy/creator/source-registry.js','utf8'),ctx);const registry=ctx.module.exports;
const vector={x:10,y:20,z:30};const ped=ctx.global.creatorPedsNew(mp.joaat('s_m_y_airworker'),vector,{heading:12});sourceLine=72;const shape=ctx.global.creatorShapeSphere(10,20,30,2);
const rows=registry.list();assert(rows.length>=2);assert(rows[0].actions.includes('port:joinWork'));assert(rows[0].name.includes('Прораб'));assert.equal(rows[0].model,'s_m_y_airworker');
assert(registry.apply(rows[0].sourceKey,{enabled:true,position:{x:100,y:200,z:300,dimension:0},rotation:{x:0,y:0,z:90}}));assert.equal(ped.position.x,100);assert.equal(vector.x,100);assert.equal(shape.position.x,100);assert.equal(shape.position.y,200);assert.equal(ped.heading,90);
registry.apply(rows[0].sourceKey,{enabled:false,position:{x:100,y:200,z:300,dimension:0},rotation:{x:0,y:0,z:90}});assert.equal(ped.dimension,1999999);assert.equal(shape.dimension,1999999);
console.log('PASS: source registry captures existing NPC/zone, discovers module event metadata and moves original NPC/reference/linked zone without replacing scenario entities.');
