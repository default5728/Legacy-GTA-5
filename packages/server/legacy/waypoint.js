const crypto=require('crypto'),access=require('./access');
module.exports=function initializeWaypoint(){
 const pending=new Map(),last=new WeakMap();
 function allowed(p){try{access.assertPlayer(p);return access.hasPermission(p,'waypoint')&&p.health>0&&p.getVariable('isDead')!==true&&!p.vehicle;}catch(_){return false;}}
 function clear(p,error=''){const s=pending.get(p);if(!s)return;clearTimeout(s.timer);pending.delete(p);if(mp.players.exists(p))p.call('client:waypoint:finish',[s.token,error]);}
 mp.events.add('server:waypoint:result',(p,token,x,y,z)=>{
   const s=pending.get(p);if(!s||token!==s.token)return;
   if(!allowed(p)||p.characterId!==s.characterId||![x,y,z].every(Number.isFinite)||Math.abs(x)>10000||Math.abs(y)>10000||z< -100||z>1500){clear(p,'Телепорт отменён.');return;}
   p.dimension=0;p.position=new mp.Vector3(x,y,z+.4);clear(p);
 });
 mp.events.add('server:waypoint:cancel',(p,token)=>{const s=pending.get(p);if(s&&s.token===token)clear(p);});
 mp.events.add('playerDeath',p=>clear(p));mp.events.add('playerQuit',p=>{const s=pending.get(p);if(s)clearTimeout(s.timer);pending.delete(p);});
 return p=>{
   if(!allowed(p)||pending.has(p)||Date.now()-(last.get(p)||0)<1500)return;
   last.set(p,Date.now());const s={token:crypto.randomBytes(12).toString('hex'),characterId:p.characterId};pending.set(p,s);
   s.timer=setTimeout(()=>clear(p,'Не удалось загрузить точку метки.'),14000);p.call('client:waypoint:begin',[s.token]);
 };
};
