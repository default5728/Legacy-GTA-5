'use strict';
const SPEED_RATIO=540/380,MAX_KMH=540;
const defaults=Object.freeze({steering:100,grip:100,height:0,roll:100});
const limits=Object.freeze({steering:[70,140],grip:[80,160],height:[-8,8],roll:[40,160]});
function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!Object.prototype.hasOwnProperty.call(limits,k)))throw Error('Некорректные настройки.');
 const out={};for(const [key,[min,max]]of Object.entries(limits)){const n=raw[key];if(!Number.isInteger(n)||n<min||n>max)throw Error('Недопустимое значение: '+key);out[key]=n;}return out;
}
function fields(base,settings){
 const s=normalize(settings),out={};
 const scale=(key,factor)=>{if(Number.isFinite(base[key])&&base[key]>0)out[key]=base[key]*factor;};
 scale('fInitialDriveMaxFlatVel',SPEED_RATIO);
 scale('fInitialDragCoeff',1/(SPEED_RATIO*SPEED_RATIO));
 scale('fSteeringLock',s.steering/100);
 scale('fTractionCurveMax',s.grip/100);scale('fTractionCurveMin',s.grip/100);
 scale('fAntiRollBarForce',100/s.roll);
 if(Number.isFinite(base.fSuspensionRaise))out.fSuspensionRaise=base.fSuspensionRaise+s.height/100;
 return out;
}
Object.assign(exports,{SPEED_RATIO,MAX_KMH,defaults,limits,normalize,fields,scaleSpeed:n=>Math.min(MAX_KMH,Math.round(Number(n)*SPEED_RATIO))});
