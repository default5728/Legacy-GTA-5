'use strict';
const model=mp.joaat('tesroad20')>>>0,last=new WeakMap(),vehicles=new WeakMap();
function clear(p){const old=vehicles.get(p);vehicles.delete(p);if(old&&mp.vehicles.exists(old))old.setVariable('legacyTeslaThrust',false);}
mp.events.add('legacy:tesla:thrust',(p,on)=>{
 if(on!==true&&on!==false)return;
 if(!on){clear(p);return;}
 const v=p.vehicle;if(p.getVariable('auth')!==true||p.getVariable('dead')===true||!v||(v.model>>>0)!==model||p.seat!==0)return;
 if(vehicles.get(p)===v)return;last.set(p,Date.now());
 clear(p);vehicles.set(p,v);v.setVariable('legacyTeslaThrust',true);
});
for(const event of ['playerExitVehicle','playerQuit','playerDeath'])mp.events.add(event,p=>clear(p));
