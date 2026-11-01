const db = require('./database');
const access = require('./access');
const economy = require('./economy');
module.exports = function registerStaffCommands(sendChat, spawnVehicle) {
    function targetPlayer(actor, query) {
        if (query === 'self' || query === 'me') return actor;
        const normalized = query.replace(/_/g, ' ').trim().toLowerCase();
        const matches = mp.players.toArray().filter(p => /^\d+$/.test(query) ? Number(p.static) === Number(query) : typeof p.name==='string'&&p.name.replace(/_/g, ' ').toLowerCase() === normalized);
        if (matches.length !== 1) throw new Error('Игрок не найден. Укажите CID или полное имя.');
        return matches[0];
    }
    async function money(player, text) {
        if (!access.hasPermission(player,'money.manage')) return;
        try {
            const actorIdentity=access.assertPlayer(player);
            // /money +500; /money 12 -500; /money Sontana Terrokilla +500
            const parts = String(text || '').trim().split(/\s+/);
            const amountText = parts.pop();
            if (!/^[+-]?\d+$/.test(amountText)) throw new Error('Использование: /money [self | ID | Полное_Имя] [+сумма | -сумма]');
            const amount = economy.integer(Number(amountText));
            if (!amount) throw new Error('Сумма не должна быть нулевой.');
            if(Math.abs(amount)>1000000000)throw Error('Максимум за одну команду: 1 000 000 000$.');
            const target = targetPlayer(player, parts.join(' ') || 'self');
            const identity = access.assertPlayer(target);
            await db.ready;
            if (!access.hasPermission(player,'money.manage')) return;
            const actorNow=access.assertPlayer(player),targetNow=access.assertPlayer(target);
            if(actorNow.accountId!==actorIdentity.accountId||actorNow.characterId!==actorIdentity.characterId||targetNow.accountId!==identity.accountId||targetNow.characterId!==identity.characterId)return;
            const balance = await economy.change(identity.characterId, identity.accountId, { cash:amount }, 'staff:'+access.role(player)+':account:'+actorIdentity.accountId+':character:'+actorIdentity.characterId);
            economy.sync(target, identity, balance);
            sendChat(player, `Баланс ${target.name}: $${balance.cash} (${amount > 0 ? '+' : ''}${amount}).`);
        } catch (err) { sendChat(player, err.message); }
    }
    function vehicle(player, text) {
        if (!access.hasPermission(player,'vehicle.spawn') || !player.characterId) return;
        const model = String(text || '').trim().toLowerCase();
        if (!/^[a-z0-9_]{1,64}$/.test(model)) return sendChat(player, 'Использование: /veh название_модели');
        spawnVehicle(player, model);
    }
    function active(player){access.assertPlayer(player);if(player.health<=0||(player.getVariable('isDead')===true||player.getVariable('dead')===true))throw Error('Персонаж погиб. Используйте /revive.');}
    function movable(player){active(player);if(player.vehicle||player.getVariable('casinoSeat')||player.alpha===0)throw Error('Сначала выйдите из транспорта, из-за стола или из свободной камеры.');}
    function teleport(actor,text,bring){
        if(!access.hasPermission(actor,'player.teleport'))return;
        try{
            const query=String(text||'').trim();if(!query)throw Error('Использование: /'+(bring?'tp':'goto')+' [CID | Полное_Имя]');
            const target=targetPlayer(actor,query);if(target===actor)throw Error('Выберите другого игрока.');
            movable(actor);movable(target);const moving=bring?target:actor,destination=bring?actor:target,p=destination.position;
            if(!p||![p.x,p.y,p.z].every(Number.isFinite)||!Number.isSafeInteger(destination.dimension))throw Error('Точка игрока недоступна.');
            if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(moving,p.x,p.y,p.z+.15,{dimension:destination.dimension,heading:Number(destination.heading)||0,reason:'admin-legacy-teleport'});
            else{moving.dimension=destination.dimension;moving.position=new mp.Vector3(p.x,p.y,p.z+.15);moving.heading=Number(destination.heading)||0;}
            moving.call('legacy:admin:teleported');
            sendChat(actor,bring?'Игрок '+target.name+' перемещён к вам.':'Вы перемещены к '+target.name+'.');
            if(bring)sendChat(target,'Администратор переместил вас к себе.');
        }catch(e){sendChat(actor,e.message);}
    }
    function heal(actor,text){
        if(!access.hasPermission(actor,'player.heal'))return;
        try{active(actor);const target=targetPlayer(actor,String(text||'').trim()||'self');active(target);target.health=100;sendChat(actor,'Здоровье '+target.name+' восстановлено.');}catch(e){sendChat(actor,e.message);}
    }
    function repair(actor){
        if(!access.hasPermission(actor,'vehicle.repair'))return;
        try{active(actor);const vehicle=actor.vehicle;if(!vehicle||!mp.vehicles.exists(vehicle))throw Error('Сядьте в машину для ремонта.');const running=vehicle.getVariable('engineOn')===true;vehicle.repair();vehicle.engine=running;sendChat(actor,'Транспорт отремонтирован.');}catch(e){sendChat(actor,e.message);}
    }
    const waypoint=require('./waypoint')();
    const commands = { tpwp:waypoint, gotowp:waypoint, money, veh:vehicle, v:vehicle, vehforce:vehicle, goto:(p,t)=>teleport(p,t,false), tp:(p,t)=>teleport(p,t,true), heal, fix:repair, repair };
    for (const name of Object.keys(commands)) mp.events.addCommand(name, (player, fullText) => commands[name](player, fullText));
    return function dispatch(player, name, text) {
        if (!Object.prototype.hasOwnProperty.call(commands, name)) return false;
        commands[name](player, text);
        return true;
    };
};
