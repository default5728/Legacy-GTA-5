/**
 * Админ-слежка за игроком (аналог Calamity /sp): /spec [статик], /unspec, [ ] — цикл.
 */

function getPlayerRemoteId(p) {
    if (!p || !mp.players.exists(p)) return -1;
    return typeof p.remoteId === 'number' ? p.remoteId : p.id;
}

function findTargetByStatic(static_id) {
    if (static_id == null || static_id === '') return null;
    const s = String(static_id).trim();
    return mp.players.toArray().find((p) => mp.players.exists(p) && String(p.static) === s) || null;
}

function listAuthPlayersSorted() {
    return mp.players
        .toArray()
        .filter((p) => mp.players.exists(p) && p.getVariable('auth'))
        .sort((a, b) => getPlayerRemoteId(a) - getPlayerRemoteId(b));
}

/**
 * После слежки: ноклип не восстанавливаем — иначе alpha=0 при выключенном клиентском fly.
 * Сбрасываем fly на сервере и делаем игрока видимым; позицию/dimension задаёт вызывающий код.
 */
function spectateClearFlyAndVisible(player) {
    if (!mp.players.exists(player)) return;
    try {
        player.setVariable('fly', false);
    } catch (_e) {}
    const al = Number(player.adminlvl) || 0;
    if (
        typeof global.applyAdminDutyGroundMode === 'function' &&
        al >= 1 &&
        al <= 7 &&
        player.getVariable('adminSession') === true
    ) {
        global.applyAdminDutyGroundMode(player, true);
    }
    if (typeof global.adminNoclipFlyWeaponVisualEnd === 'function') {
        global.adminNoclipFlyWeaponVisualEnd(player);
    }
    player.alpha = 255;
    try {
        player.setVariable('invisible', 255);
    } catch (_e2) {}
}

function adminSpectateApply(player, targetPlayer) {
    if (!mp.players.exists(player) || !mp.players.exists(targetPlayer)) return;
    const wasActive = !!player.spSpectateActive;
    const isSwitch = wasActive === true;

    if (!wasActive) {
        const pos = player.position;
        player.spSpectateSavedPos = new mp.Vector3(pos.x, pos.y, pos.z);
        player.spSpectateSavedDim = player.dimension;
    }

    const sendClientSpec = () => {
        if (!mp.players.exists(player) || !mp.players.exists(targetPlayer)) return;
        player.call('admin:spmode', [getPlayerRemoteId(targetPlayer), true]);
    };

    const apply = () => {
        if (!mp.players.exists(player) || !mp.players.exists(targetPlayer)) return;
        const tp = targetPlayer.position;
        if(typeof global.metaAcTeleport==='function')global.metaAcTeleport(player,tp.x,tp.y,tp.z-10,{dimension:targetPlayer.dimension,reason:'admin-spectate'});else{player.position=new mp.Vector3(tp.x,tp.y,tp.z-10);player.dimension=targetPlayer.dimension;}
        player.alpha = 0;
        try {
            player.setVariable('invisible', 0);
        } catch (_e) {}
        player.spSpectateActive = true;
        player.spSpectateTargetStatic = targetPlayer.static;
        sendClientSpec();

        const brief = isSwitch;
        const msg = brief
            ? `Слежка: ${targetPlayer.login} [#${targetPlayer.static}] · /unspec · [ ]`
            : `Слежка: ${targetPlayer.login} [#${targetPlayer.static}, id ${getPlayerRemoteId(
                  targetPlayer
              )}]. /unspec — выход, [ ] — сменить цель, ESC — выход.`;
        isNotify(player, 3, 'top-mid', msg, brief ? 3200 : 6000);

        if (!isSwitch) {
            global.sendDiscordLog(
                `Админ-слежка\n\nАдминистратор: ${player.login} (#${player.static})\nЦель: ${targetPlayer.login} (#${targetPlayer.static})`,
                '1266445805355532368'
            );
        }
    };

    /** Повторный client apply — камера/attach в RAGE часто цепляются со второго раза. */
    const scheduleClientSpecRefresh = () => {
        setTimeout(() => {
            if (!mp.players.exists(player) || !player.spSpectateActive) return;
            sendClientSpec();
        }, 220);
    };

    if (wasActive) {
        setTimeout(() => {
            apply();
            scheduleClientSpecRefresh();
        }, 60);
    } else {
        apply();
        scheduleClientSpecRefresh();
    }
}

function adminSpectateStop(player, notifyText) {
    if (!mp.players.exists(player) || !player.spSpectateActive) return;

    player.spSpectateActive = false;
    player.spSpectateTargetStatic = null;
    player.call('admin:spmode', [null, false]);

    const savedPos = player.spSpectateSavedPos;
    const savedDim = player.spSpectateSavedDim;
    player.spSpectateSavedPos = null;

    setTimeout(() => {
        if (!mp.players.exists(player)) return;
        if (savedPos) player.position = savedPos;
        if (savedDim !== undefined && savedDim !== null) player.dimension = savedDim;
        spectateClearFlyAndVisible(player);
        if (notifyText) isNotify(player, 1, 'top-mid', notifyText, 4000);
    }, 400);
}

/** Клиент при смерти уже снял камеру — только вернуть позицию и сбросить fly/видимость на сервере. */
function adminSpectateAbortServer(player) {
    if (!mp.players.exists(player) || !player.spSpectateActive) return;

    const savedPos = player.spSpectateSavedPos;
    const savedDim = player.spSpectateSavedDim;
    player.spSpectateActive = false;
    player.spSpectateTargetStatic = null;
    player.spSpectateSavedPos = null;

    if (savedPos) player.position = savedPos;
    if (savedDim !== undefined && savedDim !== null) player.dimension = savedDim;
    spectateClearFlyAndVisible(player);
}

mp.events.add('admin:spectate:unspec', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (Number(player.adminlvl) < 1) return;
        adminSpectateStop(player, 'Режим наблюдателя выключен.');
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('admin:spectate:abort', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        adminSpectateAbortServer(player);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('admin:spectate:cycle', (player, forward) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : Number(player.adminlvl) < 1) return;
        if (!player.spSpectateActive || player.spSpectateTargetStatic == null) return;

        const now = Date.now();
        if (player.spSpectateCycleAt && now - player.spSpectateCycleAt < 400) return;
        player.spSpectateCycleAt = now;

        if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
            return isNotify(player, 2, 'top-mid', 'На капте админ-функции недоступны.', 3000);
        }

        const list = listAuthPlayersSorted().filter((p) => p !== player);
        if (list.length < 1) return;

        let idx = list.findIndex((p) => String(p.static) === String(player.spSpectateTargetStatic));
        if (idx < 0) idx = 0;

        const dir = forward === true || forward === 1 || forward === 'true' ? 1 : -1;
        let next = idx + dir;
        if (next >= list.length) next = 0;
        if (next < 0) next = list.length - 1;

        let cand = list[next];
        let guard = 0;
        while (cand === player && guard < list.length) {
            next += dir;
            if (next >= list.length) next = 0;
            if (next < 0) next = list.length - 1;
            cand = list[next];
            guard++;
        }
        if (!cand || cand === player) return;

        adminSpectateApply(player, cand);
    } catch (e) {
        console.log(e);
    }
});

function adminSpectateStartByStatic(player, staticRaw) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (typeof global.requireAdminDuty === 'function' ? !global.requireAdminDuty(player, 1) : Number(player.adminlvl) < 1) {
        player.outputChatBox('!{#FF6347}Недостаточно прав.');
        return false;
    }
    if (global.isAdminRestrictedOnCapt && global.isAdminRestrictedOnCapt(player)) {
        isNotify(player, 2, 'top-mid', 'На капте админ-функции недоступны.', 3000);
        return false;
    }
    const static_id = staticRaw != null ? String(staticRaw).trim() : '';
    if (!static_id) {
        if (player.spSpectateActive) {
            adminSpectateStop(player, 'Режим наблюдателя выключен.');
            return true;
        }
        player.outputChatBox(
            '!{#e8e8e8}/spec [статик] — следить · !{#dc2626}/spec !{#e8e8e8}без аргументов — выйти из слежки'
        );
        return false;
    }
    const target = findTargetByStatic(static_id);
    if (!target) {
        isNotify(player, 2, 'top-mid', 'Игрок с таким статиком не в сети.', 4000);
        return false;
    }
    if (target === player) {
        isNotify(player, 2, 'top-mid', 'Нельзя следить за собой.', 3000);
        return false;
    }
    if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, target, 'spec')) return false;
    if (target.getVariable('dead') === true) {
        isNotify(player, 2, 'top-mid', 'Игрок в состоянии смерти — выберите другого.', 3500);
        return false;
    }
    adminSpectateApply(player, target);
    return true;
}

mp.events.add('admin:spectate:byStatic:s', (player, staticRaw) => {
    try {
        adminSpectateStartByStatic(player, staticRaw);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('spec', (player, _, static_id) => {
    try {
        adminSpectateStartByStatic(player, static_id);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('unspec', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (Number(player.adminlvl) < 1) {
            return player.outputChatBox('!{#FF6347}Недостаточно прав.');
        }
        if (!player.spSpectateActive) {
            return isNotify(player, 2, 'top-mid', 'Вы не в режиме слежки.', 2500);
        }
        adminSpectateStop(player, 'Режим наблюдателя выключен.');
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerQuit', (quitting) => {
    try {
        if (!quitting || quitting.static == null) return;
        const qs = String(quitting.static);
        mp.players.forEach((admin) => {
            if (!mp.players.exists(admin)) return;
            if (
                admin.spSpectateActive &&
                admin.spSpectateTargetStatic != null &&
                String(admin.spSpectateTargetStatic) === qs
            ) {
                adminSpectateStop(admin, 'Игрок вышел — слежка отключена.');
            }
        });
    } catch (e) {
        console.log(e);
    }
});
