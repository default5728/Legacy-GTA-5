'use strict';
const policy=require('./staff-policy');
function createStore(){
 let connection,loaded=false;const ranks=new Map(),sanctions=new Map(),weaponGrants=new Set();
 const level=id=>ranks.get(Number(id))||0;
 const active=(id,type,now=Date.now())=>[...(sanctions.get(Number(id))||[])].filter(s=>s.active&&s.kind===type&&(s.expires_at===null||Number(s.expires_at)>now));
 async function initialize(db){
  if(loaded)return;connection=db;const q=db.query;
  for(const sql of [
   'CREATE TABLE IF NOT EXISTS admin_roles (account_id INTEGER PRIMARY KEY,level INTEGER NOT NULL,updated_by INTEGER NOT NULL,updated_at BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_audit (id VARCHAR(40) PRIMARY KEY,actor_account INTEGER NOT NULL,target_account INTEGER,action VARCHAR(60) NOT NULL,detail TEXT NOT NULL,created_at BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_sanctions (id VARCHAR(40) PRIMARY KEY,account_id INTEGER NOT NULL,kind VARCHAR(20) NOT NULL,reason VARCHAR(500) NOT NULL,actor_account INTEGER NOT NULL,created_at BIGINT NOT NULL,expires_at BIGINT,active INTEGER NOT NULL,data TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_reports (id VARCHAR(40) PRIMARY KEY,account_id INTEGER NOT NULL,character_id INTEGER NOT NULL,message VARCHAR(1500) NOT NULL,status VARCHAR(20) NOT NULL,reply TEXT,handled_by INTEGER,created_at BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_requests (id VARCHAR(40) PRIMARY KEY,actor_account INTEGER NOT NULL,target_account INTEGER NOT NULL,action VARCHAR(20) NOT NULL,minutes INTEGER NOT NULL,reason VARCHAR(500) NOT NULL,status VARCHAR(20) NOT NULL,handled_by INTEGER,created_at BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_membership (character_id INTEGER PRIMARY KEY,faction VARCHAR(80) NOT NULL,updated_by INTEGER NOT NULL)',
   'CREATE TABLE IF NOT EXISTS admin_settings (name VARCHAR(50) PRIMARY KEY,value TEXT NOT NULL,updated_by INTEGER NOT NULL)'
  ])await q(sql);
  await q('CREATE TABLE IF NOT EXISTS weapon_access (account_id INTEGER PRIMARY KEY,updated_by INTEGER NOT NULL,updated_at BIGINT NOT NULL)');
  await require('./connection').importArchivedAdministration();
  for(const row of (await q('SELECT account_id FROM weapon_access')).rows)weaponGrants.add(Number(row.account_id));
  await q('INSERT INTO admin_roles(account_id,level,updated_by,updated_at) SELECT COALESCE(kepler_account_id,static),COALESCE(adminlvl,0),0,0 FROM accounts ON DUPLICATE KEY UPDATE level=VALUES(level)');
  const saved=await q('SELECT account_id,level FROM admin_roles');for(const row of saved.rows)if(policy.valid(Number(row.level)))ranks.set(Number(row.account_id),Number(row.level));
  const rows=(await q('SELECT * FROM admin_sanctions WHERE active=1')).rows;for(const row of rows){row.active=!!row.active;const n=Number(row.account_id);if(!sanctions.has(n))sanctions.set(n,[]);sanctions.get(n).push(row);}loaded=true;
 }
 async function audit(tx,actor,target,action,detail){const id=require('crypto').randomBytes(12).toString('hex');await tx.query('INSERT INTO admin_audit (id,actor_account,target_account,action,detail,created_at) VALUES (?,?,?,?,?,?)',[id,actor,target,action,JSON.stringify(detail),Date.now()]);return id;}
 async function setRank(actor,target,next){
  await connection.transaction(async tx=>{if(!policy.canAssign(level(actor),level(target),next)||actor===target)throw Error('Нельзя изменить этот ранг.');if(!(await tx.query('SELECT id FROM accounts WHERE id=?',[target])).rows.length)throw Error('Аккаунт не найден.');await tx.query('DELETE FROM admin_roles WHERE account_id=?',[target]);await tx.query('INSERT INTO admin_roles (account_id,level,updated_by,updated_at) VALUES (?,?,?,?)',[target,next,actor,Date.now()]);await audit(tx,actor,target,'staff.rank',{before:level(target),after:next});});ranks.set(Number(target),next);await connection.query('UPDATE accounts SET adminlvl=? WHERE kepler_account_id=?',[next,target]);mp.players.forEach(p=>{if(Number(p._legacyAccountId)===Number(target)){p.adminlvl=next;p.adminTrueLvl=next;if(global.syncAdminSessionClient)global.syncAdminSessionClient(p);}});
 }
 async function punish(actor,target,kind,reason,expires,data={}){
  const id=require('crypto').randomBytes(8).toString('hex'),row={id,account_id:target,kind,reason,actor_account:actor,created_at:Date.now(),expires_at:expires,active:true,data:JSON.stringify(data)};
  await connection.transaction(async tx=>{if(!policy.canTarget(level(actor),level(target)))throw Error('Недостаточно ранга.');if(kind!=='warn'){await tx.query('UPDATE admin_sanctions SET active=0 WHERE account_id=? AND kind=? AND active=1',[target,kind]);}await tx.query('INSERT INTO admin_sanctions (id,account_id,kind,reason,actor_account,created_at,expires_at,active,data) VALUES (?,?,?,?,?,?,?,?,?)',[id,target,kind,reason,actor,row.created_at,expires,1,row.data]);await audit(tx,actor,target,'punishment.'+kind,{id,reason,expires,data});});remember(row);return row;
 }
 async function revoke(actor,target,kind,reason){await connection.transaction(async tx=>{await tx.query('UPDATE admin_sanctions SET active=0 WHERE account_id=? AND kind=? AND active=1',[target,kind]);await audit(tx,actor,target,'punishment.remove.'+kind,{reason});});for(const row of sanctions.get(target)||[])if(row.kind===kind)row.active=false;}
 function remember(row){const n=Number(row.account_id);if(!sanctions.has(n))sanctions.set(n,[]);if(row.kind!=='warn')for(const old of sanctions.get(n))if(old.kind===row.kind)old.active=false;sanctions.get(n).push({...row,account_id:n,active:true});}
 async function setWeaponAccess(actor,target,enabled){
  await connection.transaction(async tx=>{if(level(actor)!==10)throw Error('Только Основатель может менять доступ к оружию.');if(level(target)===10)throw Error('Доступ Основателя нельзя изменить.');if(!(await tx.query('SELECT id FROM accounts WHERE id=?',[target])).rows.length)throw Error('Аккаунт не найден.');await tx.query('DELETE FROM weapon_access WHERE account_id=?',[target]);if(enabled)await tx.query('INSERT INTO weapon_access(account_id,updated_by,updated_at) VALUES(?,?,?)',[target,actor,Date.now()]);await audit(tx,actor,target,'weapon.access',{enabled});});if(enabled)weaponGrants.add(Number(target));else weaponGrants.delete(Number(target));
 }
 function blocked(id){return active(id,'blacklist')[0]||active(id,'ban')[0];}
 return {setWeaponAccess,hasWeaponAccess:id=>weaponGrants.has(Number(id)),initialize,level,active,blocked,setRank,punish,revoke,audit,remember,clearRank:id=>ranks.set(Number(id),0),isLoaded:()=>loaded,query:(...a)=>connection.query(...a),transaction:work=>connection.transaction(work)};
}
const store=createStore();module.exports={...store,createStore};
