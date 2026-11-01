'use strict';
const levels=[
 [0,'player','Игрок',[]],
 [1,'helper','Хелпер / Помощник',['flow.panel','reports.read','reports.reply','helper.goto']],
 [2,'moderator','Старший хелпер / Модератор',['chat.mute','chat.warn','chat.clear','player.freeze']],
 [3,'junior-admin','Младший администратор',['player.kick','player.spectate','punishment.request']],
 [4,'admin','Администратор',['noclip','waypoint','revive.self','player.revive','player.teleport','player.heal','vehicle.repair','player.vanish','player.ban.temporary','player.jail']],
 [5,'senior-admin','Старший администратор',['player.ban.permanent','object.delete','punishment.approve']],
 [6,'technical-admin','Куратор / Технический администратор',['vehicle.spawn','object.manage','inventory.grant','auth.read']],
 [7,'deputy-head','Заместитель главного администратора',['punishment.read','reports.decide','faction.manage','event.manage']],
 [8,'head-admin','Главный администратор',['blacklist.manage','assets.read','money.manage','player.level']],
 [9,'co-owner','Руководитель проекта',['staff.manage','settings.manage','logs.read']],
 [10,'founder','Основатель',['*']]
];
const permissions=new Set();const roles=levels.map(([level,id,name,own])=>{for(const p of own)permissions.add(p);return Object.freeze({level,id,name,permissions:Object.freeze([...permissions])});});
function valid(n){return Number.isInteger(n)&&n>=0&&n<=10;}
function has(level,permission){return valid(level)&&(level===10||roles[level].permissions.includes(permission));}
function canAssign(actor,target,next){return valid(actor)&&valid(target)&&valid(next)&&actor>=9&&target<=9&&next<=9;}
function canTarget(actor,target){return valid(actor)&&valid(target)&&actor>target;}
function minutes(level,type){if(type==='mute')return level>=4?10080:level===3?15:10;if(type==='ban')return level>=5?525600:43200;if(type==='jail')return 180;return 5;}
module.exports={roles:Object.freeze(roles),has,valid,canAssign,canTarget,minutes};
