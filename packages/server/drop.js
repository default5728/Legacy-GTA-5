let dropColshape = null;
let dropObject = null;
let textLabel = null;
let dropBlip = null;
let dropCollectible = false;
let collectingPlayers = {};
global.dropActive = false;

const dropLocations = [
    { x: 58.8617, y: -1757.3021, z: 47.6953 - 1.12 },
    { x: 333.6299, y: -1641.4086, z: 98.4960 - 1.12 },
    { x: 529.4432983398438, y: -1687.8330078125, z: 29.503408432006836 - 1.12 }
];

/** Очередь индексов без повторов, пока не пройдут все точки; новый круг не начинается с той же, что закончился прошлый. */
let dropIndexBag = [];
let dropBagCursor = 0;
let dropLastPickedIndex = -1;

function shuffleDropIndices(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

function refillDropIndexBag() {
    const n = dropLocations.length;
    if (n <= 0) {
        dropIndexBag = [];
        return;
    }
    if (n === 1) {
        dropIndexBag = [0];
        dropBagCursor = 0;
        return;
    }
    const base = [];
    for (let i = 0; i < n; i++) base.push(i);
    let bag;
    let guard = 0;
    do {
        bag = shuffleDropIndices(base);
        guard++;
    } while (guard < 80 && dropLastPickedIndex >= 0 && bag[0] === dropLastPickedIndex);
    dropIndexBag = bag;
    dropBagCursor = 0;
}

function pickDropLocationIndex() {
    const n = dropLocations.length;
    if (n <= 1) {
        dropLastPickedIndex = 0;
        return 0;
    }
    if (!dropIndexBag.length || dropBagCursor >= dropIndexBag.length) {
        refillDropIndexBag();
    }
    const idx = dropIndexBag[dropBagCursor++];
    dropLastPickedIndex = idx;
    return idx;
}

const { getFactionEventMatsReward, getFactionEventMoneyReward } = require('./config/faction_event_rewards.js');

const AIRDROP_MIN_PLAYERS = 5;

function getAirdropMoneyReward() {
    return getFactionEventMoneyReward();
}

function getAirdropMatsReward() {
    return getFactionEventMatsReward();
}

function playerHasFaction(player) {
    const fid = parseInt(player.getVariable('fraction'), 10) || 0;
    return fid >= 1 && fid <= 6;
}

function countPlayersForAirdrop() {
    if (typeof global.countAuthPlayersOnline === 'function') {
        return global.countAuthPlayersOnline();
    }
    return mp.players.length;
}

global.startDrop = function(checkplayers = true) {
    if (global.dropActive) return;

    if (checkplayers === true && countPlayersForAirdrop() < AIRDROP_MIN_PLAYERS) {
        mp.players.broadcast(`!{red}AirDrop !{yellow}не может начаться — нужно минимум ${AIRDROP_MIN_PLAYERS} игроков онлайн.`);
        return;
    }

    global.sendDiscordLog(`**AirDrop выпал!** Откроется через 3 минуты. Забравший получит **${global.formatnum1(getAirdropMoneyReward())}$** и **${global.formatnum1(getAirdropMatsReward())} мат.** на склад фракции.`, '1274413578665066719');
    global.dropActive = true;

    const randomIndex = pickDropLocationIndex();
    const endPosition = dropLocations[randomIndex];

    mp.players.call('startFlareEffect', [endPosition.x, endPosition.y, endPosition.z]);

    mp.players.broadcast(`!{red}Война за AirDrop! !{yellow}Откроется через 3 минуты. Забравший получит ${global.formatnum1(getAirdropMoneyReward())}$ и ${global.formatnum1(getAirdropMatsReward())} мат. на склад фракции.`);

    dropObject = global.creatorObjectsNew(mp.joaat('prop_box_ammo03a'), endPosition, {
        rotation: new mp.Vector3(0, 0, 0),
        dimension: 0
    });

    dropBlip = mp.blips.new(94, endPosition, {
        name: 'Дроп',
        color: 18,
        scale: 1.0,
        drawDistance: 100
    });

    dropColshape = global.creatorShapeSphere(endPosition.x, endPosition.y, endPosition.z, 2.0);

    let countdown = 180;
    textLabel = global.creatorLabelsNew(`${countdown} секунд до открытия дропа`, new mp.Vector3(endPosition.x, endPosition.y, endPosition.z + 1), {
        los: true,
        font: 4,
        drawDistance: 10,
        dimension: 0
    });

    let updateInterval = setInterval(() => {
        countdown -= 1;
        if (countdown > 0) {
            if (textLabel && mp.labels.exists(textLabel)) {
                textLabel.text = `${countdown} секунд до открытия дропа`;
            }
        } else {
            if (textLabel && mp.labels.exists(textLabel)) {
                textLabel.text = 'Нажмите ~g~E~s~, чтобы забрать дроп';
            }
            dropCollectible = true;
            clearInterval(updateInterval);
            mp.players.broadcast('!{red}AirDrop !{yellow}можно открыть!');
            mp.players.call('changeFlareEffect', [endPosition.x, endPosition.y, endPosition.z]);
        }
    }, 1000);
};

function scheduleDrop() {
    setInterval(() => {
        let now = new Date();
        if (now.getUTCMinutes() === 59) {
            global.startDrop();
        }
    }, 60000);
}

scheduleDrop();

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (colshape === dropColshape && dropCollectible) {
            if (!mp.players.exists(player)) return;
            if (!player.getVariable('auth')) return;
            if (!playerHasFaction(player)) return;
            if (!player.vehicle) {
                player.call('updateE', [true, 'начать забирать дроп']);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (colshape === dropColshape) {
            if (!mp.players.exists(player)) return;
            if (!player.getVariable('auth')) return;
            player.call('updateE', [false, 'начать забирать дроп']);
            if (collectingPlayers[player.id]) {
                clearTimeout(collectingPlayers[player.id]);
                delete collectingPlayers[player.id];
                if (global._airdropCollecting && dropColshape && dropObject && dropCollectible) {
                    global._airdropCollecting = false;
                    global.dropActive = true;
                }
                isNotify(player, 1, 'top-mid', 'Вы вышли из зоны дропа, сбор отменён.', 3000);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player, reason) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth') || player.getVariable('testdriveone') || player.getVariable('testdrivetwo')) return;

        if (collectingPlayers[player.id]) {
            player.call('updateE', [false, 'начать забирать дроп']);
            clearTimeout(collectingPlayers[player.id]);
            delete collectingPlayers[player.id];
            if (global._airdropCollecting && dropColshape && dropObject && dropCollectible) {
                global._airdropCollecting = false;
                global.dropActive = true;
            }
            isNotify(player, 1, 'top-mid', 'Вы были убиты, сбор дропа отменён.', 3000);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('collectDrop', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (dropColshape && dropObject && dropCollectible) {
            if (collectingPlayers[player.id]) {
                return;
            }

            if (!playerHasFaction(player)) {
                return isNotify(player, 2, 'bottom-mid', 'Забрать AirDrop могут только игроки с фракцией.', 3500);
            }

            const playerPos = player.position;
            const dropPos = dropObject.position;
            const distance = Math.sqrt(
                Math.pow(playerPos.x - dropPos.x, 2) +
                Math.pow(playerPos.y - dropPos.y, 2) +
                Math.pow(playerPos.z - dropPos.z, 2)
            );

            if (distance <= 2.0) {
                const adml = Number(player.adminlvl) || Number(player.getVariable('adminlvl')) || 0;
                if (adml >= 1 && adml < 8) {
                    return isNotify(player, 2, 'bottom-mid', 'Залутать дроп будучи администратором нельзя (доступно с 8 уровня админки).', 3000);
                }
                if (global._airdropCollecting) {
                    return isNotify(player, 2, 'bottom-mid', 'Дроп уже забирает другой игрок.', 3000);
                }
                global._airdropCollecting = true;
                global.dropActive = false;
                collectingPlayers[player.id] = setTimeout(() => {
                    if (player && mp.players.exists(player)) {
                        if (!player || !mp.players.exists(player)) return;

                        if (!global.dropActive && !dropColshape && !dropObject && !dropCollectible) {
                            delete collectingPlayers[player.id];
                            global._airdropCollecting = false;
                            return;
                        }

                        global.dropActive = false;
                        if (dropColshape && mp.colshapes.exists(dropColshape)) {
                            dropColshape.destroy();
                        }
                        if (dropObject && mp.objects.exists(dropObject)) {
                            dropObject.destroy();
                        }
                        if (dropBlip && mp.blips.exists(dropBlip)) {
                            dropBlip.destroy();
                        }
                        if (textLabel && mp.labels.exists(textLabel)) {
                            textLabel.destroy();
                        }

                        if (dropCollectible) {
                            dropCollectible = false;
                        }

                        mp.players.call('stopFlareEffect');

                        delete collectingPlayers[player.id];

                        const nick = player.login || player.name || 'Игрок';
                        const fid = parseInt(player.getVariable('fraction'), 10) || 0;
                        const fracName = (global.fractionsData && global.fractionsData[fid])
                            ? global.fractionsData[fid].name
                            : (fid ? `Фракция #${fid}` : 'без фракции');

                        const moneyReward = getAirdropMoneyReward();
                        const matsReward = getAirdropMatsReward();

                        const finishDropReward = () => {
                            mp.players.broadcast(
                                `!{#ef4444}[AirDrop] !{#fbbf24}${nick} !{#e5e5e5}забрал airdrop: !{#22c55e}+${global.formatnum1(moneyReward)}$ !{#e5e5e5}и !{#22c55e}+${global.formatnum1(matsReward)} мат. !{#e5e5e5}(${fracName})`
                            );
                            isNotify(player, 3, 'bottom-mid',
                                `Вы забрали AirDrop! +${global.formatnum1(moneyReward)}$ и +${global.formatnum1(matsReward)} мат. на склад фракции`,
                                5000);
                            player.call('sound:client', [3]);
                            mp.players.forEach(p => {
                                if (!p.getVariable('auth')) return;
                                if (p.dimension !== 0) return;
                                p.call('updateE', [false, 'начать забирать дроп']);
                            });
                            global.sendDiscordLog(
                                `Игрок **${nick}** забрал AirDrop (+${global.formatnum1(moneyReward)}$, +${global.formatnum1(matsReward)} мат. → ${fracName})`,
                                '1274413578665066719'
                            );
                        };

                        const grantMoney = () => {
                            global._airdropCollecting = false;
                            if (typeof global.economyAddMoney === 'function') {
                                global.economyAddMoney(player, moneyReward, (err) => {
                                    if (err) console.log('[AirDrop] money DB:', err.message || err);
                                    if (typeof global.addFactionMaterials === 'function') {
                                        global.addFactionMaterials(fid, matsReward, () => finishDropReward());
                                    } else {
                                        finishDropReward();
                                    }
                                });
                                return;
                            }
                            const newMoney = (parseInt(player.money, 10) || 0) + moneyReward;
                            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (err) => {
                                if (err) console.log('[AirDrop] money DB:', err.message || err);
                                player.money = newMoney;
                                player.call('updateMoney', [global.formatnum1(newMoney)]);
                                if (typeof global.addFactionMaterials === 'function') {
                                    global.addFactionMaterials(fid, matsReward, () => finishDropReward());
                                } else {
                                    finishDropReward();
                                }
                            });
                        };

                        grantMoney();
                    }
                }, 5000);
                isNotify(player, 1, 'top-mid', 'Начался сбор дропа, оставайтесь в зоне 5 секунд.', 5000);
            }
        }
    } catch (error) {
        console.log(error);
    }
});
