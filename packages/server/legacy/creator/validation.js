'use strict';
// Validation is shared by SQL mutations and restored data. No executable event names are accepted.
const tables={objects:'custom_game_elements',peds:'custom_peds',teleports:'custom_teleports',prices:'custom_prices_config'};
const services=['none','shop','clothing','barber','tattoo','bank','post','dealership','school','service'];
function number(v,min,max){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Значение вне диапазона '+min+'…'+max);return n;}
function integer(v,min,max){const n=number(v,min,max);if(!Number.isSafeInteger(n))throw Error('Нужно целое число.');return n;}
function text(v,max=80){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Некорректный текст.');return v.trim();}
function point(v){if(!v||typeof v!=='object')throw Error('Укажите координаты.');return {x:number(v.x,-16000,16000),y:number(v.y,-16000,16000),z:number(v.z,-500,3000),dimension:integer(v.dimension,0,2000000)};}
function validate(kind,input){if(!tables[kind]||!input||typeof input!=='object')throw Error('Неверный тип элемента.');const r={name:text(input.name),enabled:input.enabled!==false};
 if(kind==='prices'){r.category=text(input.category,40);r.key=text(input.key,80);if(!/^[a-z0-9_.:-]+$/i.test(r.category+r.key))throw Error('Ключ: латиница, цифры, . _ : -');if(!input.remove&&input.parameters&&(typeof input.parameters!=='object'||Array.isArray(input.parameters)))throw Error('Параметры должны быть JSON-объектом.');r.price=integer(input.price,0,10000000000);r.parameters=input.parameters||{};}
 else{r.position=point(input.position);if(kind==='teleports'){r.destination=point(input.destination);r.mode=text(input.mode);if(!['teleport_only','interaction_only','combined'].includes(r.mode))throw Error('Неверный режим.');r.radius=number(input.radius,1,10);r.service=services.includes(input.service)?input.service:'none';if(r.mode!=='interaction_only'&&r.position.dimension===r.destination.dimension&&Math.hypot(r.position.x-r.destination.x,r.position.y-r.destination.y,r.position.z-r.destination.z)<r.radius*2+2)throw Error('Точки перехода слишком близко.');}
 else{r.model=text(input.model);if(!/^[a-z0-9_]+$/i.test(r.model))throw Error('Некорректная модель.');r.rotation={x:number(input.rotation?.x||0,-360,360),y:number(input.rotation?.y||0,-360,360),z:number(input.rotation?.z||0,-360,360)};if(kind==='peds')r.service=services.includes(input.service)?input.service:'none';}}
 if(JSON.stringify(r).length>8000)throw Error('Слишком большой элемент.');return r;
}
module.exports={tables,services,validate,integer};
