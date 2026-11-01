global.dmSpawns = [
    { pos: new mp.Vector3(189.5246124267578, -949.4083251953125, 30.09191131591797), heading: 159.8683319091797 },
    { pos: new mp.Vector3(163.99403381347656, -955.37646484375, 30.0919132232666), heading: -129.18380737304688 },
    { pos: new mp.Vector3(164.476318359375, -983.8917236328125, 30.091909408569336), heading: -54.11039352416992 },
    { pos: new mp.Vector3(197.3856658935547, -981.873291015625, 30.0919132232666), heading: 50.1986198425293 },
];

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('testdriveone') || player.getVariable('testdrivetwo')) return;

        if (player.getVariable('inMbaArena') === true) {
            player.call('offdefaultdeath');
            try {
                player.setVariable('dead', true);
                player.setVariable('mbaDead', true);
            } catch (_e) {}
            return;
        }

        if (global.normalizePlayerDeathArgs) {
            const n = global.normalizePlayerDeathArgs(reason, killer);
            killer = n.killer;
        }
        killer = global.resolveDeathKiller(player, killer);
        if (
            killer &&
            mp.players.exists(killer) &&
            typeof global.shouldBlockFibMatsSupplyDamage === 'function' &&
            global.shouldBlockFibMatsSupplyDamage(player, killer, reason)
        ) {
            // Запрет убийства участников поставки / FIB в машине у точек — без килла.
            killer = null;
        }
        const killerAuthGate = killer && mp.players.exists(killer) && killer.getVariable('auth');
        const pvpMurderGate = !!(killerAuthGate && player.login !== killer.login);
        let deathKillerId = 0;
        if (killer && mp.players.exists(killer) && killer !== player) {
            const killerLogin = killer.getVariable('login') || killer.login;
            if (killerLogin && player.login !== killerLogin) {
                deathKillerId = killer.id;
            }
        }
        if (
            pvpMurderGate &&
            typeof global.pvpDeathShouldProcessRewards === 'function' &&
            !global.pvpDeathShouldProcessRewards(player, killer)
        ) {
            return;
        }

        player.call('offdefaultdeath');

        if (typeof global.clearReviveSpawnShield === 'function') {
            global.clearReviveSpawnShield(player);
        } else {
            try { player.setVariable('reviveShield', false); } catch (_eSh) {}
        }

        if (player.getVariable('mp') === true) {
            player.dimension = 0;
            player.setVariable('mp', false);
            player.setVariable('mpp', false);
        }

        if (player.getVariable('afklobby')) {
            player.setVariable('dead', false);
            player.spawn(new mp.Vector3(-524.013916015625, -240.3728790283203, 36.07898712158203));
            player.heading = -148.56764221191406;
            player.health = 100;
            player.armour = 0;
            player.setVariable('mp', false);
            player.setVariable('mpp', false);
            return;
        }

        if (player.getVariable('revolverdm') || player.getVariable('carabinedm') || player.getVariable('heavydm')) {
            const randomSpawn = dmSpawns[Math.floor(Math.random() * dmSpawns.length)];
            player.spawn(randomSpawn.pos);
            player.heading = randomSpawn.heading;

            if (player.getVariable('revolverdm')) {
                player.call('givegun', [String(mp.joaat('weapon_revolver'))]);
            } else if (player.getVariable('carabinedm')) {
                player.call('givegun', [String(mp.joaat('weapon_carbinerifle'))]);
            } else if (player.getVariable('heavydm')) {
                player.call('givegun', [String(mp.joaat('weapon_heavysniper_mk2'))]);
            }

            player.health = 100;
            player.armour = 0;

            player.setVariable('dead', false);
            return;
        }

        const kill = player.getVariable('login');
        const kills = player.getVariable('static');

        if (killer && mp.players.exists(killer) && killer.getVariable('auth')) {
            if (player.login === killer.login) {

                global.sendDiscordLog(`Смерть (суицид).\n\nУмер - ${kill} (#${kills})`, '1249759771213434911');

                insertLogSkillSuicide(player);
    
                newdeaths = parseInt(player.deaths) + parseInt(1);
                player.deaths = newdeaths;
                global.DB.query('UPDATE accounts SET deaths = ? WHERE static = ?', [newdeaths, player.static], function (err, resluts) {
                    if (err) return console.log(err);
                });

                if (player.getVariable('jail') === true) {
                    player.health = 100;
                    player.armour = 0;
                    player.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
                    player.spawn(player.position);
                    player.setVariable('dead', false);
                } else {
                    try { player.setVariable('deathKillerSessionId', 0); } catch (_eK0) {}
                    const blockSpot0 =
                        typeof global.isFibMatsEventParticipant === 'function' &&
                        global.isFibMatsEventParticipant(player)
                            ? 1
                            : 0;
                    player.call('deathHandler', [0, blockSpot0]);
                }
                return
            };
            const killerLogin = killer.getVariable('login');
            const killerStatic = killer.getVariable('static');

            global.sendDiscordLog(`Смерть (убийство).\n\nУбийца - ${killerLogin} (#${killerStatic})\nУмер - ${kill} (#${kills})`, '1249759771213434911');

            global.DB.query(`INSERT INTO logskills (static1, static2, static1ip, static2ip, reason, time) VALUES ('${player.static}', '${killer.static}', '${player.ip}', '${killer.ip}', 'убийство', NOW())`, (err, result) => {
                if (err) return console.log(err);
            });            

            const vip = Math.min(3, Math.max(0, Number(killer.viplvl) || 0));
            const KILL_REWARD_BY_VIP = { 0: 2500, 1: 2750, 2: 3500, 3: 5500 };
            let sumkill = KILL_REWARD_BY_VIP[vip] ?? 2500;
            if (typeof global.applyShootingSkillKillBonus === 'function') {
                sumkill = global.applyShootingSkillKillBonus(sumkill, killer.kills);
            }

            if (typeof global.applyServerX2Amount === 'function') {
                sumkill = global.applyServerX2Amount(sumkill);
            }

            newMoney = parseInt(killer.money) + parseInt(sumkill)
            killer.money = newMoney;
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, killerStatic], function (err, resluts) {
                if (err) return console.log(err);
            })
            killer.call('updateMoney', [global.formatnum1(newMoney)]);

            if (typeof global.pushSystemChatLine === 'function') {
                global.pushSystemChatLine(
                    killer,
                    `За убийство ${kill}: +`,
                    `${global.formatnum1(sumkill)}$`,
                    ''
                );
            }
            if (typeof global.pushChatBox === 'function') {
                global.pushChatBox(player, `Вы мертвы. Вас убил ${killerLogin} | #${killerStatic}!`);
            } else {
                player.outputChatBox(`Вы мертвы. Вас убил ${killerLogin} | #${killerStatic}!`);
            }

            const killGain = typeof global.pmGetKillSkillGain === 'function' ? global.pmGetKillSkillGain(killer) : 1;
            newkills = parseInt(killer.kills, 10) + killGain;
            killer.kills = newkills;
            global.DB.query('UPDATE accounts SET kills = ? WHERE static = ?', [newkills, killerStatic], function (err, resluts) {
                if (err) return console.log(err);
            });
            if (typeof global.notifyShootingSkillOnKill === 'function') {
                global.notifyShootingSkillOnKill(killer, newkills, killGain);
            }
            player.call('setKillsStats', [killer.kills, killer.deaths, Number(killer.onlineHours) || 0]);
            if (typeof global.onPlayerKillForQuests === 'function') global.onPlayerKillForQuests(killer);

            newdeaths = parseInt(player.deaths) + parseInt(1);
            player.deaths = newdeaths
            global.DB.query('UPDATE accounts SET deaths = ? WHERE static = ?', [newdeaths, player.static], function (err, resluts) {
                if (err) return console.log(err);
            });
            player.call('setKillsStats', [player.kills, player.deaths, Number(player.onlineHours) || 0]);

        } else {
            global.sendDiscordLog(`Смерть (суицид).\n\nУмер - ${kill} (#${kills})`, '1249759771213434911');

            insertLogSkillSuicide(player);

            newdeaths = parseInt(player.deaths) + parseInt(1);
            player.deaths = newdeaths;
            global.DB.query('UPDATE accounts SET deaths = ? WHERE static = ?', [newdeaths, player.static], function (err, resluts) {
                if (err) return console.log(err);
            });
        }
        if (player.getVariable('jail') === true) {
            player.health = 100;
            player.armour = 0;
            player.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
            player.spawn(player.position);
            player.setVariable('dead', false);
        } else {
            try { player.setVariable('deathKillerSessionId', deathKillerId); } catch (_eK1) {}
            const blockSpot =
                typeof global.isFibMatsEventParticipant === 'function' &&
                global.isFibMatsEventParticipant(player)
                    ? 1
                    : 0;
            player.call('deathHandler', [deathKillerId, blockSpot]);
        }        
    } catch (error) {
        console.log(error);
    }
});

global.spawnslist = {
    1: { pos: new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875), heading: 84.31329345703125 },
    2: { pos: new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168), heading: 20.358104705810547 },
    3: { pos: new mp.Vector3(924.6547241210938, -1559.1331787109375, 30.755172729492188), heading: 91.25193786621094 },
    4: { pos: new mp.Vector3(840.6149291992188, -2335.831298828125, 30.334321975708008), heading: -89.44387817382812 },
    5: { pos: new mp.Vector3(1379.235107421875, -2079.55322265625, 51.998565673828125), heading: 36.1340446472168 },
    6: { pos: new mp.Vector3(442.406982421875, -982.6343994140625, 30.689603805541992), heading: 84.05252838134766 }
};

function getReviveSpawnForPlayer(player) {
    const fraction = parseInt(player.getVariable('fraction'), 10) || 0;
    const fromList = global.spawnslist && global.spawnslist[fraction];
    if (fromList && fromList.pos) return fromList;
    const hub = global.FACTIONLESS_HUB_SPAWN || {
        x: -169.429931640625,
        y: -813.7645874023438,
        z: 31.305158615112305,
        h: 173.6284942626953
    };
    return {
        pos: new mp.Vector3(hub.x, hub.y, hub.z),
        heading: Number.isFinite(hub.h) ? hub.h : 0
    };
}

function insertLogSkillSuicide(player) {
    if (!player || player.static == null) return;
    const ip = String(player.ip || '-').replace(/'/g, "''");
    global.DB.query(
        `INSERT INTO logskills (static1, static2, static1ip, static2ip, reason, time) VALUES ('${player.static}', '0', '${ip}', '-', 'суицид', NOW())`,
        (err) => {
            if (err) console.log(err);
        }
    );
}

mp.events.add('revive', (player, type) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('inMbaArena') === true) return;
        if (!player.getVariable('auth')) {
            player.position = player.position;
            player.spawn(player.position);
            player.setVariable('dead', false);
            player.call('reviveCancel');
            return;
        }

        if (player.getVariable('dead') !== true) return;

        const reviveType = String(type || '').trim();
        if (reviveType !== 'SPOT' && typeof global.clearConsumableResists === 'function') {
            global.clearConsumableResists(player);
        }

        if (reviveType === 'SPOT' && Number(player.viplvl) < 3) return;
        if (
            reviveType === 'SPOT' &&
            typeof global.isFibMatsEventParticipant === 'function' &&
            global.isFibMatsEventParticipant(player)
        ) {
            if (typeof global.isNotify === 'function') {
                global.isNotify(player, 2, 'top-mid', 'Самореан на поставке FIB запрещён.', 4000);
            }
            return;
        }

        // Самореан (SPOT): остаёмся в том же измерении (Аркадиус/офис/особняк и т.д.).
        // EMS / фракция / хаб: из офиса семьи выходим в мир 0.
        const deathDim = Number(player.dimension);
        const deathPos = player.position
            ? new mp.Vector3(player.position.x, player.position.y, player.position.z)
            : null;
        const deathHeading = Number(player.heading) || 0;
        const inOfficeFam = player.getVariable('office_fam') === true;

        if (inOfficeFam && reviveType !== 'SPOT') {
            player.dimension = 0;
            try {
                player.setVariable('office_fam', false);
            } catch (_eOf) {}
        }

        if (player.getVariable('jail') === true) {
            player.health = 100;
            player.armour = 0;
            player.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
            player.spawn(player.position);
            player.setVariable('dead', false);
            player.call('reviveCancel');
        } else {
            player.health = 100;

            if (reviveType === 'SPOT') {
                if (player.viplvl >= 3) {
                    const spawnPos = deathPos || player.position;
                    player.spawn(spawnPos);
                    player.heading = deathHeading;
                    // spawn в RAGE часто сбрасывает dimension — вернуть измерение смерти
                    if (Number.isFinite(deathDim)) {
                        player.dimension = deathDim;
                        setTimeout(function () {
                            try {
                                if (!mp.players.exists(player)) return;
                                if (player.getVariable('dead') === true) return;
                                player.dimension = deathDim;
                            } catch (_eDim) {}
                        }, 50);
                    }
                } else {
                    return;
                }
            } else if (reviveType === 'EMS') {
                const emsSpawns = [
                    { pos: new mp.Vector3(332.7427, -1404.4457, 37.9112), heading: 142.3690 }
                ];
                const randomSpawn = emsSpawns[Math.floor(Math.random() * emsSpawns.length)];
                player.spawn(randomSpawn.pos);
                player.heading = randomSpawn.heading;
                player.dimension = 0;
            } else {
                const spawns = getReviveSpawnForPlayer(player);
                player.spawn(spawns.pos);
                player.heading = spawns.heading;
                player.dimension = 0;
            }

            player.setVariable('dead', false);
            try { player.setVariable('deathKillerSessionId', 0); } catch (_eK2) {}
            if (typeof global.applyReviveSpawnShield === 'function') {
                global.applyReviveSpawnShield(player);
            }
            player.call('reviveCancel');
            if (reviveType === 'SPOT' && typeof global.syncConsumableResistsToClient === 'function') {
                global.syncConsumableResistsToClient(player);
            }
        }
    } catch (error) {
        console.log(error);
    }
});