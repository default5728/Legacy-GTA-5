'use strict';
const c=require('./connection');
module.exports={ready:new Promise(resolve=>global.whenDbReady(resolve)),characters:{async getById(id){return (await c.query('SELECT kepler_character_id AS id,kepler_account_id AS account_id,charlevel AS level FROM accounts WHERE kepler_character_id=?',[id])).rows[0];}}};
