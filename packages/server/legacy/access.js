'use strict';
const store=require('./staff-state'),policy=require('./staff-policy');
function assertPlayer(p){
 if(!p||!mp.players.exists(p)||p.getVariable('auth')!==true||!p._legacySpawned||!Number.isSafeInteger(p._legacyAccountId)||!Number.isSafeInteger(p._legacyCharacterId))throw Error('Сначала войдите в персонажа.');
 return {accountId:p._legacyAccountId,characterId:p._legacyCharacterId};
}
function hasPermission(p,permission){try{const i=assertPlayer(p);if(permission==='player.god'&&typeof global.legacyCanGod==='function')return global.legacyCanGod(p);const base=store.isLoaded()&&(policy.has(Number(p.adminlvl)||0,permission)||(permission==='weapon.self'&&store.hasWeaponAccess(i.accountId)));return store.isLoaded()&&(typeof global.legacyStaffPermission==='function'?global.legacyStaffPermission(p,permission,base):base);}catch(_){return false;}}
function role(p){try{assertPlayer(p);return policy.roles[Number(p.adminlvl)||0].id;}catch(_){return 'player';}}
module.exports={assertPlayer,hasPermission,role,accountId:p=>assertPlayer(p).accountId};
