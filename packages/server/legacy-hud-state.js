'use strict';
let pending=false;
function syncBalances(){
 if(pending||!global.DB_READY)return;
 const players=new Map();mp.players.forEach(p=>{if(p.getVariable('auth')===true&&p._legacySpawned&&Number.isSafeInteger(Number(p.static)))players.set(Number(p.static),p);});
 if(!players.size)return;
 pending=true;
 global.DB.query('SELECT static,money,bank FROM accounts WHERE static IN (?)',[[...players.keys()]],(error,rows)=>{
  pending=false;if(error){console.error('[LEGACY HUD]',error.code);return;}
  for(const row of rows){const p=players.get(Number(row.static));if(!p||!mp.players.exists(p)||p.getVariable('auth')!==true||Number(p.static)!==Number(row.static))continue;
   const cash=Number(row.money)||0,bank=Number(row.bank)||0;
   p.setVariable('cash',cash);p.setVariable('bank',bank);
   const payload=JSON.stringify({id:p.id,cid:Number(p.static),name:p.name,cash,bank});
   if(p._legacyHudState!==payload){p._legacyHudState=payload;p.call('legacy:hud:state',[payload]);}
  }
 });
}
setInterval(syncBalances,1000);
mp.events.add('legacy:hud:request',p=>{if(mp.players.exists(p))p._legacyHudState=null;syncBalances();});
module.exports={syncBalances};

mp.events.add('legacy:hud:rendered',(p,cash,bank)=>{
 if(!mp.players.exists(p)||p.getVariable('auth')!==true||!p._legacyHudState||typeof cash!=='string'||typeof bank!=='string'||cash.length>64||bank.length>64)return;
 const expected=JSON.parse(p._legacyHudState),digits=value=>String(value).replace(/[^0-9]/g,'');
 if(digits(cash)===digits(expected.cash)&&digits(bank)===digits(expected.bank)){
  if(!p._legacyHudVerified){p._legacyHudVerified=true;console.log('[LEGACY HUD OK] CID='+p.static+' cash='+expected.cash+' bank='+expected.bank);}
 }else if(Date.now()-(p._legacyHudMismatchAt||0)>5000){p._legacyHudMismatchAt=Date.now();console.warn('[LEGACY HUD MISMATCH] CID='+p.static+' rendered='+digits(cash)+'/'+digits(bank)+' expected='+expected.cash+'/'+expected.bank);}
});
