function removeweapon(player) {
    try {
        if (player && mp.players.exists(player)) {
            player.call('armorplayern', [player]);
            player.setClothes(9, 0, 0, 0);
            player.setVariable('armor', null);
            try { player.setVariable('armorEquipCooldownUntil', null); } catch (_e) {}
            try { player.call('damageConsumableLockSync', [0, 0, 0]); } catch (_e) {}
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') !== false) player.call('hideAmmo');
        }
    } catch (error) {
        console.log(error);
    }
}

const ARCADIUS_SPAWN = { x: -119.90831756591797, y: -612.6090698242188, z: 35.280757904052734, h: 0 };
const FRACTION_COOLDOWN_MS = 96 * 60 * 60 * 1000;

/** Первый заход без фракции — спавн у аренды транспорта. Координаты в config/other.js → FACTIONLESS_HUB_SPAWN. */
function enterFactionlessHub(player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    removeweapon(player);
    try {
        player.dimension = 0;
        player.alpha = 255;
        player.setVariable('factionlessHub', true);
        player.setVariable('gangwar', true);
        player.setVariable('fraction', 0);
        player.setVariable('afklobby', null);
        player.setVariable('revolverdm', null);
        player.setVariable('carabinedm', null);
        player.setVariable('heavydm', null);
        player.setVariable('mp', false);
        player.setVariable('mpp', false);
        player.position = new mp.Vector3(
            global.FACTIONLESS_HUB_SPAWN.x,
            global.FACTIONLESS_HUB_SPAWN.y,
            global.FACTIONLESS_HUB_SPAWN.z
        );
        player.heading = global.FACTIONLESS_HUB_SPAWN.h;
    } catch (_e) {}
    player.call('closemenu');
    player.call('hideselect');
    player.call('dstatus', ['Играет на FLOW DM', 'NO FACTION (#' + player.static + ')']);
    if (typeof global.syncNewbieQuests === 'function') global.syncNewbieQuests(player);
    setCount();
    player.call('showChatServer');
    player.call('spawnselect:done:c');
    if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
        setTimeout(() => {
            if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
        }, 200);
    }
}
global.enterFactionlessHub = enterFactionlessHub;

/** Перед уходом в AFK/DM — чтобы при возврате в гангвар снова был выбор спавна. */
function markGangwarLeftForSpawnResume(player) {
    if (!mp.players.exists(player)) return;
    if (player.getVariable('gangwar') === true) {
        player._lastWorldModeBeforeLobby = 'gangwar';
    }
}

function playerWasInNonGangwarLobby(player) {
    return (
        player.getVariable('afklobby') === true ||
        player.getVariable('revolverdm') === true ||
        player.getVariable('carabinedm') === true ||
        player.getVariable('heavydm') === true ||
        player._lastWorldModeBeforeLobby === 'gangwar'
    );
}

function playerAlreadyInGangwar(player) {
    return player.getVariable('gangwar') === true
        && !player.getVariable('afklobby')
        && !player.getVariable('revolverdm')
        && !player.getVariable('carabinedm')
        && !player.getVariable('heavydm');
}

function canChangeFractionNow(_player, _lastFractionTime) {
    return { ok: true };
}

function isValidLastSpawnCoords(x, y, z) {
    if (x == null || y == null || z == null) return false;
    const nx = Number(x);
    const ny = Number(y);
    const nz = Number(z);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return false;
    if (nz < -200 || nz > 2000) return false;
    if (typeof global.isAuthLobbySpawnCoords === 'function' && global.isAuthLobbySpawnCoords(nx, ny, nz)) {
        return false;
    }
    return true;
}

/** Как в эталоне: координаты в accounts + last_pos_dim = 0 (открытый мир). */
function rowHasDbLastSpawn(row) {
    if (!row) return false;
    const ldim = parseInt(row.last_pos_dim, 10) || 0;
    if (ldim !== 0) return false;
    return isValidLastSpawnCoords(row.last_x, row.last_y, row.last_z);
}

function enrichSpawnOption(opt, fraction) {
    const key = opt.key;
    let spawnType = opt.spawnType;
    let spawnName = opt.spawnName;
    let warning = opt.warning;

    if (!spawnType) {
        if (key === 'fraction') spawnType = 'faction';
        else if (key === 'lastpos') spawnType = 'last';
        else if (key === 'hub') spawnType = 'def';
        else if (key === 'arcadius') spawnType = 'apt';
        else if (key === 'mansion') spawnType = 'pfHouse';
        else spawnType = 'def';
    }
    if (!spawnName) {
        if (key === 'fraction') {
            const fracLabel = typeof global.getFracName === 'function' ? global.getFracName(fraction) : 'Фракция';
            spawnName = String(fracLabel || 'Фракция').toUpperCase();
        } else if (key === 'lastpos') spawnName = 'ПОСЛЕДНЕЕ МЕСТО';
        else if (key === 'hub') spawnName = 'АРЕНДА Т/С';
        else if (key === 'arcadius') spawnName = 'АРКАДИУС';
        else if (key === 'mansion') spawnName = 'ОСОБНЯК';
        else spawnName = String(opt.label || key).toUpperCase();
    }
    if (warning === undefined) warning = false;
    return Object.assign({}, opt, { spawnType, spawnName, warning });
}

function buildInitialHubSpawnOption(fraction) {
    const hub = global.FACTIONLESS_HUB_SPAWN;
    return enrichSpawnOption({
        key: 'hub',
        label: 'Аренда Т/С',
        wide: true,
        icon: '',
        x: hub.x,
        y: hub.y,
        z: hub.z,
        h: hub.h
    }, fraction);
}

/** С фракцией: аренда Т/С, последнее место (если есть), база текущей фракции. */
function buildSpawnOptions(player, fraction, row, cb) {
    const opts = [];
    opts.push(buildInitialHubSpawnOption(fraction));
    if (row && rowHasDbLastSpawn(row)) {
        opts.push(enrichSpawnOption({
            key: 'lastpos',
            label: 'Выход',
            icon: '',
            x: row.last_x,
            y: row.last_y,
            z: row.last_z,
            h: 0
        }, fraction));
    }
    const sp = global.FRACTION_SPAWN_BY_ID && global.FRACTION_SPAWN_BY_ID[fraction];
    if (sp) {
        opts.push(enrichSpawnOption({ key: 'fraction', label: 'Фракция', icon: '', x: sp.x, y: sp.y, z: sp.z, h: sp.h }, fraction));
    }
    cb(opts);
}

function showGangwarSpawnSelect(player, fraction, row) {
    if (!mp.players.exists(player)) return;

    const openOrSkip = (r) => {
        if (!mp.players.exists(player)) return;
        const forceUi = !!player._forceSpawnSelectOnPlay;
        if (forceUi) player._forceSpawnSelectOnPlay = false;

        buildSpawnOptions(player, fraction, r, (spawnOptions) => {
            if (!mp.players.exists(player)) return;
            if (!spawnOptions || !spawnOptions.length) {
                enterGangwarAtLastPos(player, fraction, r);
                return;
            }
            const hasLast = r && rowHasDbLastSpawn(r);
            if (!forceUi && !hasLast && spawnOptions.length <= 1) {
                enterGangwarAtLastPos(player, fraction, r);
                return;
            }
            player.call('closemenu');
            player._spawnSelectActive = true;
            const clientPayload = buildSpawnSelectClientPayload(fraction, spawnOptions);
            prepPlayerForSpawnSelect(player, clientPayload);
            player.call('spawnselect:show:c', [JSON.stringify(clientPayload)]);
        });
    };

    if (row && (row.last_x !== undefined || row.last_y !== undefined || row.last_z !== undefined)) {
        openOrSkip(row);
        return;
    }

    global.DB.query(
        'SELECT fraction, last_x, last_y, last_z, last_pos_dim FROM accounts WHERE static = ?',
        [player.static],
        (err, results) => {
            if (!mp.players.exists(player)) return;
            openOrSkip(err || !results || !results[0] ? null : results[0]);
        }
    );
}
global.showGangwarSpawnSelect = showGangwarSpawnSelect;

function finishGangwarEnter(player, fraction) {
    if (!mp.players.exists(player)) return;
    player.call('closemenu');
    player.call('hideselect');
    player.call('spawnselect:done:c');
    const fracName = typeof global.getFracName === 'function' ? global.getFracName(fraction) : `Фракция ${fraction}`;
    setCount();
    player.call('dstatus', ['Играет на FLOW DM', 'GANGWAR (#' + player.static + ')']);
    if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
        setTimeout(() => {
            if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
        }, 200);
    }
    if (typeof global.tryCompleteNewbieQuest === 'function') global.tryCompleteNewbieQuest(player, 'join_fraction');
    if (typeof global.scheduleSyncActiveWarsForPlayer === 'function') {
        global.scheduleSyncActiveWarsForPlayer(player, 1500);
    }
}

function applyGangwarEnterSpawn(player, fraction, row, done) {
    if (!mp.players.exists(player)) return;
    const eventName = `playerModelChange${fraction}`;
    mp.events.call(eventName, player);

    const finish = () => {
        if (typeof done === 'function') done();
    };

    const spawnFromPos = (pos) => {
        if (!mp.players.exists(player)) return;
        if (pos && typeof global.applyFactionEnterWorldSpawn === 'function') {
            cleanupPlayerEnterWorld(player);
            global.applyFactionEnterWorldSpawn(player, fraction, pos);
        } else if (pos) {
            cleanupPlayerEnterWorld(player);
            spawnPlayerAtCoords(player, pos.x, pos.y, pos.z, pos.h || 0);
            const eventName = `playerModelChange${fraction}`;
            mp.events.call(eventName, player);
        }
        finish();
    };

    const cached = row ? parseDbLastSpawnPos(row) : null;
    if (cached) {
        spawnFromPos(cached);
        return;
    }

    fetchAccountLastSpawnPos(player.static, spawnFromPos);
}

/** Вход в GANGWAR: сразу на последнее место выхода, без экрана выбора. */
function enterGangwarAtLastPos(player, fraction, row) {
    if (!mp.players.exists(player)) return;
    player._spawnSelectActive = false;
    player.setVariable('afklobby', null);
    player.setVariable('gangwar', true);
    player.setVariable('revolverdm', null);
    player.setVariable('carabinedm', null);
    player.setVariable('heavydm', null);
    player.setVariable('mp', false);
    player.setVariable('mpp', false);
    player.setVariable('factionlessHub', null);
    applyGangwarEnterSpawn(player, fraction, row, () => finishGangwarEnter(player, fraction));
}
global.enterGangwarAtLastPos = enterGangwarAtLastPos;

/** Смена фракции на месте — только переменная, без телепорта и смены одежды/инвентаря. */
global.applyFactionChangeInPlace = function applyFactionChangeInPlace(player, fractionNum) {
    if (!mp.players.exists(player)) return;
    const fr = parseInt(fractionNum, 10) || 0;
    try {
        player.setVariable('fraction', fr);
        player.call('setfraction', [fr]);
    } catch (_e) {}
};

/** Доступна ли валидная сохранённая позиция (= игрок уже играл раньше). */
global.hasValidLastSpawn = function (x, y, z) {
    return isValidLastSpawnCoords(x, y, z);
};
global.rowHasDbLastSpawn = rowHasDbLastSpawn;

/** Без фракции: аренда Т/С + последнее место (если сохранено). */
function buildFactionlessSpawnOptions(row) {
    const opts = [];
    opts.push(buildInitialHubSpawnOption(0));
    if (row && rowHasDbLastSpawn(row)) {
        opts.push(enrichSpawnOption({
            key: 'lastpos',
            label: 'Выход',
            icon: '',
            x: row.last_x,
            y: row.last_y,
            z: row.last_z,
            h: 0
        }, 0));
    }
    return opts;
}

/** Камера при открытии меню всегда начинает с первого пункта — аренды Т/С. */
function resolveSpawnSelectDefaultCamKey(fraction, spawnOptions) {
    const keys = (spawnOptions || []).map((o) => o.key);
    if (keys.includes('hub')) return 'hub';
    return spawnOptions && spawnOptions[0] ? spawnOptions[0].key : null;
}

function buildSpawnSelectClientPayload(fraction, spawnOptions) {
    const defaultCamKey = resolveSpawnSelectDefaultCamKey(fraction, spawnOptions);
    let initialCamCoords = null;
    if (defaultCamKey) {
        const camOpt = (spawnOptions || []).find((o) => o.key === defaultCamKey);
        if (camOpt) {
            initialCamCoords = [Number(camOpt.x), Number(camOpt.y), Number(camOpt.z)];
        }
    }
    return {
        fraction,
        spawnOptions,
        defaultCamKey,
        initialCamCoords,
        camHeight: 1150,
        previewCamHeight: 1150
    };
}

/** Невидимо ставим игрока в точку стартовой камеры — мир под превью грузится корректно. */
function prepPlayerForSpawnSelect(player, payload) {
    if (!mp.players.exists(player) || !payload) return;
    const key = payload.defaultCamKey;
    const opt = key && payload.spawnOptions
        ? payload.spawnOptions.find((o) => o.key === key)
        : null;
    if (!opt) return;
    try {
        player.dimension = 0;
        player.alpha = 0;
        spawnPlayerAtCoords(player, opt.x, opt.y, opt.z, opt.h || 0);
    } catch (_e) {}
}

/** Показать экран выбора спавна вернувшемуся игроку без фракции. */
function showFactionlessSpawnSelect(player, row) {
    if (!mp.players.exists(player)) return;
    const spawnOptions = buildFactionlessSpawnOptions(row || {});
    const clientPayload = buildSpawnSelectClientPayload(0, spawnOptions);
    player.call('closemenu');
    player._spawnSelectActive = true;
    prepPlayerForSpawnSelect(player, clientPayload);
    player.call('spawnselect:show:c', [JSON.stringify(clientPayload)]);
}
global.showFactionlessSpawnSelect = showFactionlessSpawnSelect;

/** Применить спавн без фракции в указанной точке (по выбору на экране спавна). */
function applyFactionlessSpawn(player, pos) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    player._spawnSelectActive = false;
    removeweapon(player);
    try {
        player.dimension = 0;
        player.alpha = 255;
        player.setVariable('factionlessHub', true);
        player.setVariable('gangwar', true);
        player.setVariable('fraction', 0);
        player.setVariable('afklobby', null);
        player.setVariable('revolverdm', null);
        player.setVariable('carabinedm', null);
        player.setVariable('heavydm', null);
        player.setVariable('mp', false);
        player.setVariable('mpp', false);
        const p = pos || global.FACTIONLESS_HUB_SPAWN;
        spawnPlayerAtCoords(player, p.x, p.y, p.z, p.h || 0);
    } catch (_e) {}
    player.call('closemenu');
    player.call('hideselect');
    player.call('dstatus', ['Играет на FLOW DM', 'NO FACTION (#' + player.static + ')']);
    if (typeof global.syncNewbieQuests === 'function') global.syncNewbieQuests(player);
    setCount();
    player.call('showChatServer');
    player.call('spawnselect:done:c');
    if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
        setTimeout(() => {
            if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
        }, 200);
    }
    if (typeof global.scheduleSyncActiveWarsForPlayer === 'function') {
        global.scheduleSyncActiveWarsForPlayer(player, 1500);
    }
}
global.applyFactionlessSpawn = applyFactionlessSpawn;

global.setCount = function() {
    const count1 = mp.players.toArray().filter(player => player.getVariable('gangwar')).length;
    const count2 = mp.players.toArray().filter(player => player.getVariable('afklobby')).length;
    const count3 = mp.players.toArray().filter(player => player.getVariable('aimgames')).length;
    const count4 = mp.players.toArray().filter(player => player.getVariable('revolverdm')).length;
    const count5 = mp.players.toArray().filter(player => player.getVariable('carabinedm')).length;
    const count6 = mp.players.toArray().filter(player => player.getVariable('heavydm')).length;
    mp.players.forEach(p => {
        p.call('setcount:l', ['ghetto', count1]);
        p.call('setcount:l', ['afklobby', count2]);
        p.call('setcount:l', ['aimgames', count3]);
        p.call('setcount:l', ['revolverdm', count4]);
        p.call('setcount:l', ['carabinedm', count5]);
        p.call('setcount:l', ['heavydm', count6]);
    });
}

mp.events.add('PlayGangwar', (player, select) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (player.vehicle) return isNotify(player, 2, "top-mid", "Выйдите с транспортного средства.", 3000);
        if (player.getVariable('ygon')) return isNotify(player, 2, "top-mid", "Вы не можете выбрать сменить, пока у вас активный квест.", 3000);

        global.DB.query('SELECT * FROM jail WHERE static = ?', [player.static], function (err, jailResults) {
            if (err) {
                console.log('[PlayGangwar] jail:', err.message || err);
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных. Попробуйте позже.', 4000);
            }
            if (jailResults.length > 0) {
                
                const admlogin = jailResults[0].admin
                const reason = jailResults[0].reason

                let remainingTime = jailResults[0].seconds
                player.setVariable('jail', true)
                const jailReturnPos = global.parseDemorganReturnFromJailRow(jailResults[0]);
                global.setDemorganReturnPos(player, jailReturnPos);

                const jailDimension = Math.floor(Math.random() * 1000) + 1;
                player.dimension = jailDimension;
                if (global.jailCoords) {
                    player.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
                }
                player.call('chatofff');

                player._spawnSelectActive = false;
                if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
                    setTimeout(() => {
                        if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
                    }, 300);
                }

                if (remainingTime > 0) {
                    player.call('spawnselect:cancel');
                    player.call('hideselect');
                    player.call('closemenu');

                    player.call('jail', [player, true]);
                    player.call('showDemorgan', [reason, admlogin, remainingTime]);

                    setTimeout(() => {
                        if (mp.players.exists(player)) {
                            player.outputChatBox(`!{red}У вас присутствует активный деморган! Администратор: ${admlogin}. Причина: ${reason}.`);
                        }
                    }, 1500);

                    const interval = setInterval(() => {

                        if (!mp.players.exists(player)) {
                            clearInterval(interval);
                            return;
                        }

                        if (player.getVariable('jail') === false) {
                            clearInterval(interval);
                            return;
                        }

                        remainingTime -= 1;
                        global.DB.query('UPDATE jail SET seconds = ? WHERE static = ?', [remainingTime, player.static], (err, updateResults) => {
                            if (err) console.log('[jail] update:', err.message || err);
                        });
                        if (remainingTime <= 0) {
                            clearInterval(interval);
                            global.DB.query('DELETE FROM jail WHERE static = ?', [player.static], (err, deleteResults) => {
                                if (err) console.log('[jail] delete:', err.message || err);
                            });
                            global.releasePlayerFromDemorgan(player, {
                                jailRow: jailResults[0],
                                message: '!{#00FF00}Вы отсидели свой срок в деморгане.',
                                notify: 'Вы отсидели деморган.'
                            });
                        } else {
                            player.call('syncDemorganTime', [remainingTime]);
                        }
                    }, 1000);
                } else {
                    setTimeout(() => {
                        if (mp.players.exists(player)) {
                            player.outputChatBox(`!{red}У вас присутствует активный деморган! Администратор: ${admlogin}. Причина: ${reason}.`);
                        }
                    }, 1500);

                    global.DB.query('DELETE FROM jail WHERE static = ?', [player.static], (err, deleteResults) => {
                        if (err) console.log('[jail] delete:', err.message || err);
                    });
                }
            } else if (select === 'fib') {
                if (playerAlreadyInGangwar(player)) return;

                if (player.getVariable('jail') == true) return isNotify(player, 2, "top-mid", "Вы не можете менять режимы во время деморгана.", 3000);

                global.DB.query('SELECT lastfraction FROM accounts WHERE static = ?', [player.static], (err, rows) => {
                    if (err) return console.log(err);
                    if (!mp.players.exists(player)) return;
                    const cd = canChangeFractionNow(player, rows[0]?.lastfraction);
                    if (!cd.ok) {
                        return isNotify(player, 2, 'top-mid', `Подождите ${cd.hoursLeft} часов перед сменой фракции.`, 3000);
                    }

                    player.setVariable('afklobby', null);
                    player.setVariable('revolverdm', null);
                    player.setVariable('carabinedm', null);
                    player.setVariable('heavydm', null);
                    player.setVariable('gangwar', true);
                    player.setVariable('mp', false);
                    player.setVariable('mpp', false);

                    showGangwarSpawnSelect(player, 6, null);
                });
            } else {
                if (playerAlreadyInGangwar(player)) return;

                const resumeFromLobby = playerWasInNonGangwarLobby(player);
                player._lastWorldModeBeforeLobby = null;

                global.DB.query('SELECT fraction, last_x, last_y, last_z, last_pos_dim FROM accounts WHERE static = ?', [player.static], function (err, results) {                 
                    if (err) return console.log(err);
                    if (!mp.players.exists(player)) return;

                    let fraction = Number(results[0].fraction);
    
                    if (!fraction) {
                        player.call('spawnselect:cancel');
                        return enterFactionlessHub(player);
                    }
                    if (player.getVariable('jail') == true) {
                        player.call('spawnselect:cancel');
                        return isNotify(player, 2, "top-mid", "Вы не можете менять режимы во время деморгана.", 3000);
                    }

                    if (resumeFromLobby) {
                        enterGangwarAtLastPos(player, fraction, results[0]);
                        return;
                    }

                    if (fraction === 6) {
                        showGangwarSpawnSelect(player, 6, results[0]);
                        return;
                    }

                    showGangwarSpawnSelect(player, fraction, results[0]);
                });            
            }
        });
    } catch (error) {
        console.log(error);
    }   
});

mp.events.add('selectfraction', (player, select) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (player.vehicle) return isNotify(player, 2, "top-mid", "Выйдите с транспортного средства.", 3000);
        if (player.getVariable('ygon')) return isNotify(player, 2, "top-mid", "Вы не можете сменить фракцию, пока у вас активный квест.", 3000);

        const newFraction = parseInt(select, 10) || 0;
        if (newFraction < 1 || newFraction > 6) return;

        const curFracId = parseInt(player.getVariable('fraction') || 0, 10) || 0;
        if (curFracId === newFraction) {
            return isNotify(player, 2, "top-mid", "Вы уже состоите в этой фракции.", 3000);
        }

        // Действующий лидер не может вступить в другую фракцию
        {
            const curRank  = parseInt(player.fraction_rank, 10) || 0;
            if (curRank === 10 && curFracId && curFracId !== newFraction) {
                const curName = (global.fractionsData && global.fractionsData[curFracId])
                    ? global.fractionsData[curFracId].name : `Фракция #${curFracId}`;
                return isNotify(player, 2, "top-mid", `Вы являетесь лидером фракции ${curName} и не можете вступить в другую.`, 4000);
            }
        }

        global.DB.query('SELECT lastfraction FROM accounts WHERE static = ?', [player.static], function (err, results) {
            if (err) return console.log(err);

            let lastFractionTime = results[0]?.lastfraction;
            let currentTime = Date.now();

            const timeCooldown = 96 * 60 * 60 * 1000;

            const cd = canChangeFractionNow(player, lastFractionTime);
            if (!cd.ok) {
                return isNotify(player, 2, "top-mid", `Подождите ${cd.hoursLeft} часов перед сменой фракции.`, 3000);
            }

            if (newFraction >= 1 && newFraction <= 6) {
                global.DB.query(
                    'UPDATE accounts SET lastfraction = ?, fraction = ?, fraction_rank = 1, fraction_prefix = NULL WHERE static = ?',
                    [currentTime, newFraction, player.static],
                    function (err) {
                        if (err) return console.log(err);
                        if (!mp.players.exists(player)) return;

                        player.fraction_rank = 1;
                        try { player.fraction_prefix = null; } catch (_pfx) {}
                        removeweapon(player);
                        try {
                            player.setVariable('fraction', newFraction);
                            player.setVariable('factionlessHub', null);
                        } catch (_frE) {}
                        player.call('setfraction', [newFraction]);
                        try { player.call('fraction:rank:updated', [1]); } catch (_rk) {}
                        player.call('hideAmmo');

                        isNotify(player, 3, "top-mid", `Вы выбрали фракцию.`, 3000);
                        player.call('sound:client', [3]);
                        if (typeof global.tryCompleteNewbieQuest === 'function') {
                            global.tryCompleteNewbieQuest(player, 'join_fraction');
                        }
                        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);

                        if (!playerAlreadyInGangwar(player)) return;

                        if (player.getVariable('jail') == true) {
                            return isNotify(player, 2, "top-mid", "Вы не можете менять фракцию во время деморгана.", 3000);
                        }

                        if (newFraction === 6) {
                            player.setVariable('afklobby', null);
                            player.setVariable('revolverdm', null);
                            player.setVariable('carabinedm', null);
                            player.setVariable('heavydm', null);
                            player.setVariable('gangwar', true);
                            player.setVariable('mp', false);
                            player.setVariable('mpp', false);
                            global.applyFactionChangeInPlace(player, 6);
                            player.call('closemenu');
                            player.call('hideselect');
                            player.call('dstatus', ['Играет на FLOW DM', 'GANGWAR (#' + player.static + ')']);
                            setCount();
                            return;
                        }

                        player.setVariable('factionlessHub', null);
                        player.setVariable('gangwar', true);
                        player.call('closemenu');
                        player.call('hideselect');
                        global.applyFactionChangeInPlace(player, newFraction);
                        player.call('dstatus', ['Играет на FLOW DM', 'GANGWAR (#' + player.static + ')']);
                        setCount();
                    });
            }
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('afkdetect', (player) => {
    // Автоматический AFK отключён: бездействие не меняет режим и позицию игрока.
});

mp.events.add('lobby', (player, select) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (select === 'afk' || select === 'revolverdm' || select === 'carabinedm' || select === 'heavydm') {
            return isNotify(player, 2, 'top-mid', 'Этот режим отключён.', 2500);
        }

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (select === 'afk') {
            if (player.getVariable('afklobby')) return isNotify(player, 2, "top-mid", `Вы уже в AFK лобби.`, 3000);

            markGangwarLeftForSpawnResume(player);

            removeweapon(player);

            player.setVariable('gangwar', null);
            player.setVariable('fraction', null);
            player.setVariable('afklobby', true);
            player.setVariable('revolverdm', null);
            player.setVariable('carabinedm', null);
            player.setVariable('heavydm', null);
            player.setVariable('mp', false);
            player.setVariable('mpp', false);

            player.dimension = 123;
            player.position = new mp.Vector3(-524.013916015625, -240.3728790283203, 36.07898712158203);
            player.heading = -148.56764221191406;
            isNotify(player, 3, "top-mid", `Вы зашли в лобби AFK.`, 3000);
            player.call('sound:client', [3]);
            player.call('dstatus', ['Играет на FLOW DM', 'AFK (#' + player.static + ')']);

            player.call('closemenu');
            player.call('hideselect');
            player.call('hideAmmo');
        } else if (select === 'revolverdm') {
            if (player.getVariable('revolverdm')) return isNotify(player, 2, "top-mid", `Вы уже в Revolver DM.`, 3000);

            markGangwarLeftForSpawnResume(player);
            removeweapon(player);

            player.setVariable('gangwar', null);
            player.setVariable('fraction', null);
            player.setVariable('afklobby', null);
            player.setVariable('revolverdm', true);
            player.setVariable('carabinedm', null);
            player.setVariable('heavydm', null);
            player.setVariable('mp', false);
            player.setVariable('mpp', false);

            player.dimension = 333;
            const randomSpawn = dmSpawns[Math.floor(Math.random() * dmSpawns.length)];
            player.spawn(randomSpawn.pos);
            player.heading = randomSpawn.heading;
            
            player.call('givegun', [String(mp.joaat('weapon_revolver'))]);
            player.call('showAmmo');
            
            isNotify(player, 3, "top-mid", `Вы зашли в лобби Revolver DM.`, 3000);
            player.call('sound:client', [3]);
            player.call('dstatus', ['Играет на FLOW DM', 'Revolver DM (#' + player.static + ')']);

            player.call('closemenu');
            player.call('hideselect');
        } else if (select === 'carabinedm') {
            if (player.getVariable('carabinedm')) return isNotify(player, 2, "top-mid", `Вы уже в Carabine DM.`, 3000);

            markGangwarLeftForSpawnResume(player);
            removeweapon(player);

            player.setVariable('gangwar', null);
            player.setVariable('fraction', null);
            player.setVariable('afklobby', null);
            player.setVariable('revolverdm', null);
            player.setVariable('carabinedm', true);
            player.setVariable('heavydm', null);
            player.setVariable('mp', false);
            player.setVariable('mpp', false);

            player.dimension = 444;
            const randomSpawn = dmSpawns[Math.floor(Math.random() * dmSpawns.length)];
            player.spawn(randomSpawn.pos);
            player.heading = randomSpawn.heading;

            player.call('givegun', ['2210333304']);
            player.call('showAmmo');

            isNotify(player, 3, "top-mid", `Вы зашли в лобби Carabine DM.`, 3000);
            player.call('sound:client', [3]);
            player.call('dstatus', ['Играет на FLOW DM', 'Carabine DM (#' + player.static + ')']);

            player.call('closemenu');
            player.call('hideselect');
        } else if (select === 'heavydm') {
            if (player.getVariable('heavydm')) return isNotify(player, 2, "top-mid", `Вы уже в Heavy DM.`, 3000);

            markGangwarLeftForSpawnResume(player);
            removeweapon(player);

            player.setVariable('gangwar', null);
            player.setVariable('fraction', null);
            player.setVariable('afklobby', null);
            player.setVariable('revolverdm', null);
            player.setVariable('carabinedm', null);
            player.setVariable('heavydm', true);
            player.setVariable('mp', false);
            player.setVariable('mpp', false);

            player.dimension = 555;
            const randomSpawn = dmSpawns[Math.floor(Math.random() * dmSpawns.length)];
            player.spawn(randomSpawn.pos);
            player.heading = randomSpawn.heading;

            player.call('givegun', [String(mp.joaat('weapon_heavysniper_mk2'))]);
            player.call('showAmmo');

            isNotify(player, 3, "top-mid", `Вы зашли в лобби Heavy DM.`, 3000);
            player.call('sound:client', [3]);
            player.call('dstatus', ['Играет на FLOW DM', 'Heavy DM (#' + player.static + ')']);

            player.call('closemenu');
            player.call('hideselect');
        }

        setCount();
    } catch (error) {
        console.log(error);
    }
});

// ─── Выбор спауна ─────────────────────────────────────────────────────────────

function cleanupPlayerEnterWorld(player) {
    if (!mp.players.exists(player)) return;
    player.dimension = 0;
}

function spawnPlayerAtCoords(player, x, y, z, h) {
    const nx = Number(x);
    const ny = Number(y);
    const nz = Number(z);
    const nh = Number(h);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return;
    const pos = new mp.Vector3(nx, ny, nz);
    try {
        player.spawn(pos);
    } catch (_e) {
        player.position = pos;
    }
    if (Number.isFinite(nh)) player.heading = nh;
}

/** Парсинг строки accounts → точка «Выход» или null. */
function parseDbLastSpawnPos(row) {
    if (!rowHasDbLastSpawn(row)) return null;
    const x = Number(row.last_x);
    const y = Number(row.last_y);
    const z = Number(row.last_z);
    if (!isValidLastSpawnCoords(x, y, z)) return null;
    return { x, y, z, h: 0 };
}

function fetchAccountLastSpawnPos(staticId, cb) {
    if (!staticId) {
        if (typeof cb === 'function') cb(null);
        return;
    }
    global.DB.query(
        'SELECT last_x, last_y, last_z, last_pos_dim FROM accounts WHERE static=? LIMIT 1',
        [staticId],
        (err, rows) => {
            if (err) {
                console.log('[LOBBY] fetch last spawn:', err.message || err);
                if (typeof cb === 'function') cb(null);
                return;
            }
            if (typeof cb === 'function') cb(parseDbLastSpawnPos(rows && rows[0]));
        }
    );
}

/** Вход в гангвар: модель фракции + одна точка спавна (из БД или база фракции). */
function enterGangwarWithSpawnTarget(player, fraction, targetPos, onDone) {
    if (!mp.players.exists(player)) return;
    cleanupPlayerEnterWorld(player);
    if (typeof global.applyFactionEnterWorldSpawn === 'function') {
        global.applyFactionEnterWorldSpawn(player, fraction, targetPos || null);
    } else {
        const eventName = `playerModelChange${fraction}`;
        mp.events.call(eventName, player);
        if (targetPos) {
            spawnPlayerAtCoords(player, targetPos.x, targetPos.y, targetPos.z, targetPos.h || 0);
        }
    }
    if (typeof onDone === 'function') onDone();
}

function teleportPlayerToArcadiusSpawn(player) {
    if (!mp.players.exists(player)) return;
    cleanupPlayerEnterWorld(player);
    spawnPlayerAtCoords(player, ARCADIUS_SPAWN.x, ARCADIUS_SPAWN.y, ARCADIUS_SPAWN.z, ARCADIUS_SPAWN.h);
}

function teleportPlayerToFamilyMansionSpawn(player) {
    if (!mp.players.exists(player)) return;
    const fam = String(player.family || '').trim();
    if (!fam) {
        teleportPlayerToArcadiusSpawn(player);
        return;
    }
    cleanupPlayerEnterWorld(player);
    global.DB.query(
        'SELECT mo.mansion_id AS mid FROM family_mansion_ownership mo INNER JOIN families f ON f.id=mo.family_id WHERE f.name=? LIMIT 1',
        [fam],
        (e, rows) => {
            if (!mp.players.exists(player)) return;
            const mid = rows && rows[0] ? Number(rows[0].mid) : 0;
            const mc = typeof global.getMansionSpawnCoords === 'function' ? global.getMansionSpawnCoords(mid) : null;
            if (mc) spawnPlayerAtCoords(player, mc.x, mc.y, mc.z, mc.h || 0);
            else teleportPlayerToArcadiusSpawn(player);
        }
    );
}

mp.events.add('spawnselect:confirm:s', (player, keyRaw, fractionRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player._spawnSelectActive) return;

        const key      = String(keyRaw || 'fraction');
        const fraction = parseInt(fractionRaw, 10) || 0;

        if (player.getVariable('jail') == true) {
            player._spawnSelectActive = false;
            isNotify(player, 2, 'top-mid', 'Вы не можете выбрать спавн в деморгане.', 3000);
            player.call('showChatServer');
            player.call('spawnselect:done:c');
            if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
                setTimeout(() => {
                    if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
                }, 200);
            }
            return;
        }

        player._spawnSelectActive = false;

        // Игрок без фракции: начальный спавн или последняя точка выхода.
        if (!fraction) {
            if (key === 'lastpos') {
                fetchAccountLastSpawnPos(player.static, (pos) => {
                    if (!mp.players.exists(player)) return;
                    applyFactionlessSpawn(player, pos);
                });
                return;
            }
            applyFactionlessSpawn(player, null);
            return;
        }

        player.setVariable('afklobby', null);
        player.setVariable('gangwar', true);
        player.setVariable('revolverdm', null);
        player.setVariable('carabinedm', null);
        player.setVariable('heavydm', null);
        player.setVariable('mp', false);
        player.setVariable('mpp', false);
        player.setVariable('factionlessHub', null);

        const fracName = typeof global.getFracName === 'function' ? global.getFracName(fraction) : `Фракция ${fraction}`;

        const finishSpawnSelect = () => {
            if (!mp.players.exists(player)) return;
            player._spawnSelectActive = false;
            try { player.alpha = 255; } catch (_eA) {}
            player.call('closemenu');
            player.call('hideselect');
            player.call('showChatServer');
            player.call('spawnselect:done:c');
            setCount();
            player.call('dstatus', ['Играет на FLOW DM', 'GANGWAR (#' + player.static + ')']);
            if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
                setTimeout(() => {
                    if (mp.players.exists(player)) global.tryDeliverLoginWelcomeChat(player);
                }, 200);
            }
        };

        if (key === 'lastpos') {
            fetchAccountLastSpawnPos(player.static, (pos) => {
                if (!mp.players.exists(player)) return;
                if (!pos) {
                    isNotify(player, 2, 'top-mid', 'Точка выхода не сохранена — спавн у фракции.', 3500);
                    enterGangwarWithSpawnTarget(player, fraction, null, finishSpawnSelect);
                    return;
                }
                enterGangwarWithSpawnTarget(player, fraction, pos, finishSpawnSelect);
            });
            return;
        }

        if (key === 'hub') {
            const hub = global.FACTIONLESS_HUB_SPAWN;
            enterGangwarWithSpawnTarget(
                player,
                fraction,
                { x: hub.x, y: hub.y, z: hub.z, h: hub.h || 0 },
                finishSpawnSelect
            );
            return;
        }

        if (key === 'arcadius') {
            enterGangwarWithSpawnTarget(
                player,
                fraction,
                { x: ARCADIUS_SPAWN.x, y: ARCADIUS_SPAWN.y, z: ARCADIUS_SPAWN.z, h: ARCADIUS_SPAWN.h },
                finishSpawnSelect
            );
            return;
        }

        if (key === 'mansion') {
            const fam = String(player.family || '').trim();
            if (!fam) {
                enterGangwarWithSpawnTarget(
                    player,
                    fraction,
                    { x: ARCADIUS_SPAWN.x, y: ARCADIUS_SPAWN.y, z: ARCADIUS_SPAWN.z, h: ARCADIUS_SPAWN.h },
                    finishSpawnSelect
                );
                return;
            }
            global.DB.query(
                'SELECT mo.mansion_id AS mid FROM family_mansion_ownership mo INNER JOIN families f ON f.id=mo.family_id WHERE f.name=? LIMIT 1',
                [fam],
                (e, rows) => {
                    if (!mp.players.exists(player)) return;
                    const mid = rows && rows[0] ? Number(rows[0].mid) : 0;
                    const mc = mid && typeof global.getMansionSpawnCoords === 'function'
                        ? global.getMansionSpawnCoords(mid)
                        : null;
                    if (mc) {
                        enterGangwarWithSpawnTarget(player, fraction, { x: mc.x, y: mc.y, z: mc.z, h: mc.h || 0 }, finishSpawnSelect);
                    } else {
                        enterGangwarWithSpawnTarget(
                            player,
                            fraction,
                            { x: ARCADIUS_SPAWN.x, y: ARCADIUS_SPAWN.y, z: ARCADIUS_SPAWN.z, h: ARCADIUS_SPAWN.h },
                            finishSpawnSelect
                        );
                    }
                }
            );
            return;
        }

        if (key === 'fraction') {
            const sp = global.FRACTION_SPAWN_BY_ID && global.FRACTION_SPAWN_BY_ID[fraction];
            enterGangwarWithSpawnTarget(player, fraction, sp || null, finishSpawnSelect);
            return;
        }

        enterGangwarWithSpawnTarget(player, fraction, null, finishSpawnSelect);
    } catch (e) { console.log('[LOBBY] spawnselect:', e.message || e); }
});

mp.events.add('aimgames', (player, status) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (status === true) isNotify(player, 2, 'top-mid', 'Этот режим отключён.', 2500);
        player.setVariable('aimgames', null);
    } catch (error) {
        console.log(error);
    }
});
