'use strict';
const mysql=require('mysql');
const pool=mysql.createPool({host:process.env.KEPLER_DB_HOST||'127.0.0.1',user:process.env.KEPLER_DB_USER,password:process.env.KEPLER_DB_PASSWORD,database:process.env.KEPLER_DB_NAME,connectionLimit:2,connectTimeout:60000,acquireTimeout:60000,charset:'utf8mb4'});
const tables=['admin_roles','admin_audit','admin_sanctions','admin_reports','admin_requests','admin_membership','admin_settings','weapon_access','economy_ledger'];
function translate(sql){
 if(sql==='SELECT id FROM accounts WHERE id=?')return 'SELECT kepler_account_id AS id FROM accounts WHERE kepler_account_id=?';
 if(sql.startsWith('SELECT c.account_id FROM character_cids'))return 'SELECT kepler_account_id AS account_id FROM accounts WHERE static=? AND char_created=1';
 return sql.replace(/\b(admin_roles|admin_audit|admin_sanctions|admin_reports|admin_requests|admin_membership|admin_settings|weapon_access|economy_ledger)\b/g,name=>'legacy_'+name);
}
function execute(db,sql,params=[]){return new Promise((resolve,reject)=>db.query(translate(sql),params,(error,result)=>error?reject(error):resolve({rows:Array.isArray(result)?result:[],insertId:result.insertId,affectedRows:result.affectedRows})));}
function query(sql,params){return execute(pool,sql,params);}
async function transaction(work){
 const db=await new Promise((resolve,reject)=>pool.getConnection((e,c)=>e?reject(e):resolve(c)));
 try{await execute(db,'START TRANSACTION');const result=await work({query:(sql,params)=>execute(db,sql,params)});await execute(db,'COMMIT');return result;}
 catch(error){try{await execute(db,'ROLLBACK');}catch(_){}throw error;}finally{db.release();}
}
async function importArchivedAdministration(){
 await query('CREATE TABLE IF NOT EXISTS legacy_admin_imports (name VARCHAR(64) PRIMARY KEY,completed_at BIGINT NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS economy_ledger (id BIGINT AUTO_INCREMENT PRIMARY KEY,character_id BIGINT,account_id BIGINT,cash_delta BIGINT,bank_delta BIGINT,chips_delta BIGINT,reason TEXT,created_at VARCHAR(40))');
 for(const name of tables){
  if(name==='admin_roles'||(await query('SELECT name FROM legacy_admin_imports WHERE name=?',[name])).rows.length)continue;
  const records=(await query('SELECT data_json FROM kepler_legacy_rows WHERE source_table=? ORDER BY source_ordinal',[name])).rows;
  await transaction(async tx=>{
   for(const record of records){const row=JSON.parse(record.data_json),columns=Object.keys(row);if(!columns.every(c=>/^[a-z_]+$/.test(c)))throw Error('Unexpected legacy column');
    const key=({admin_membership:'character_id',admin_settings:'name',weapon_access:'account_id'})[name]||'id';
    await tx.query('INSERT INTO '+name+' ('+columns.map(c=>'`'+c+'`').join(',')+') VALUES ('+columns.map(()=>'?').join(',')+') ON DUPLICATE KEY UPDATE `'+key+'`=`'+key+'`',columns.map(c=>row[c]));
   }
   await tx.query('INSERT INTO legacy_admin_imports(name,completed_at) VALUES (?,?)',[name,Date.now()]);
  });
 }
}
module.exports={query,transaction,translate,importArchivedAdministration};
