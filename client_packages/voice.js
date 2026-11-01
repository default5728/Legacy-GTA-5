const Use3d = true;
const UseAutoVolume = false;

const MaxRange = 20.0;

let voiceDeviceBrowser = null;
let voiceReloadInProgress = false;
let voiceDeviceReloadTimer = null;
let voiceReloadSeq = 0;

function localVoiceEnabled() {
	try {
		return mp.players.local.getVariable('auth') === true
			&& mp.players.local.getVariable('voicee') !== false;
	} catch (_e) {
		return false;
	}
}

function voiceLog(message) {
	try { mp.console.logInfo('[voice] ' + message); } catch (_l) {}
}

function safeVoiceCleanup() {
	try {
		mp.voiceChat.cleanupAndReload(true, true, true);
		return true;
	} catch (e) {
		voiceLog('cleanupAndReload: ' + (e && e.message ? e.message : e));
		return false;
	}
}

function restoreVoiceMuteState(wasMuted) {
	try {
		mp.voiceChat.muted = wasMuted;
	} catch (_e) {}
}

function resyncVoiceListeners() {
	try {
		if (g_voiceMgr && typeof g_voiceMgr.resyncAll === 'function') {
			g_voiceMgr.resyncAll();
		}
	} catch (e) {
		voiceLog('resync listeners: ' + (e && e.message ? e.message : e));
	}
	try {
		mp.events.callRemote('voice:clientReloaded:s');
	} catch (_rs) {}
}

/** Перезагрузка движка голоса + повторная привязка слушателей (после смены наушников/устройства вывода). */
function reloadVoiceChat(showNotify, reason) {
	if (voiceReloadInProgress && showNotify) {
		mp.events.call('notify:client', 3, 'top-mid', 'Голосовой чат уже перезагружается.', 2000);
		return;
	}
	if (voiceReloadInProgress) return;
	if (!localVoiceEnabled()) return;
	if (mp.players.local.getVariable('anticheat') === true) return;

	voiceReloadInProgress = true;
	const seq = ++voiceReloadSeq;
	try {
		const wasMuted = mp.voiceChat.muted !== false;
		const attempts = [0, 900, 2400, 5200];
		for (let i = 0; i < attempts.length; i++) {
			setTimeout(() => {
				if (seq !== voiceReloadSeq || !localVoiceEnabled()) return;
				safeVoiceCleanup();
				restoreVoiceMuteState(wasMuted);
				setTimeout(() => {
					if (seq !== voiceReloadSeq || !localVoiceEnabled()) return;
					resyncVoiceListeners();
					restoreVoiceMuteState(wasMuted);
				}, 250);
			}, attempts[i]);
		}
		if (showNotify) {
			mp.events.call('notify:client', 3, 'top-mid', 'Голосовой чат перезагружен.', 3000);
		}
	} catch (e) {
		voiceLog('reloadVoiceChat' + (reason ? ' (' + reason + ')' : '') + ': ' + (e && e.message ? e.message : e));
	}
	setTimeout(() => {
		if (seq !== voiceReloadSeq) return;
		voiceReloadInProgress = false;
	}, 6200);
}

function scheduleVoiceDeviceReload() {
	if (!localVoiceEnabled()) return;
	if (voiceDeviceReloadTimer) clearTimeout(voiceDeviceReloadTimer);
	voiceDeviceReloadTimer = setTimeout(() => {
		voiceDeviceReloadTimer = null;
		reloadVoiceChat(false, 'deviceChanged');
	}, 1200);
}

function ensureVoiceDeviceMonitor() {
	if (voiceDeviceBrowser && mp.browsers.exists(voiceDeviceBrowser)) return;
	try {
		voiceDeviceBrowser = mp.browsers.new('package://browsers/voice_device/index.html');
	} catch (e) {
		voiceLog('device monitor: ' + (e && e.message ? e.message : e));
	}
}

function tryManualVoiceReload() {
	if (mp.game.ui.isPauseMenuActive()) return;
	if (mp.players.local.getVariable('anticheat') === true) return;
	if (mp.players.local.getVariable('voicee') === false) {
		return mp.events.call('notify:client', 2, 'top-mid', 'У вас выключен голосовой чат.', 3000);
	}
	if (mp.players.local.getVariable('jail') === true) {
		return mp.events.call('notify:client', 2, 'top-mid', 'Вы не можете использовать голосовой чат находясь в деморгане.', 3000);
	}
	reloadVoiceChat(true, 'manual');
}

if (typeof global !== 'undefined') {
	global.reloadVoiceChat = reloadVoiceChat;
	global.tryManualVoiceReload = tryManualVoiceReload;
}

/* PTT микрофона и перезагрузка голоса — keybinds.js (B и F8 по умолчанию) */

mp.events.add('client_voice_reload', () => {
	tryManualVoiceReload();
});

mp.events.add('voice:deviceChanged', () => {
	scheduleVoiceDeviceReload();
});

mp.events.add('playerReady', () => {
	setTimeout(ensureVoiceDeviceMonitor, 2500);
});

mp.events.addDataHandler('auth', (entity, value) => {
	try {
		if (entity !== mp.players.local || value !== true) return;
		setTimeout(ensureVoiceDeviceMonitor, 1500);
	} catch (_e) {}
});

mp.events.addDataHandler('voicee', (entity, value) => {
	try {
		if (entity !== mp.players.local || value === false) return;
		setTimeout(ensureVoiceDeviceMonitor, 500);
		if (value === true) scheduleVoiceDeviceReload();
	} catch (_e) {}
});

mp.events.add('startVoicehard', () => {
	mp.events.callRemote('setvariablevoice', true);
	mp.voiceChat.muted = false;
	setTimeout(() => reloadVoiceChat(false, 'startVoicehard'), 250);
});

mp.events.add('stopVoice', () => {
	mp.voiceChat.muted = true;
	mp.events.callRemote('voice:anim', false);
	mp.events.callRemote('setvariablevoice', false);
});

mp.events.add('voice:anim', (syncpl, status) => {
    try  {
        if (status === true) {
            syncpl.playFacialAnim('mic_chatter', 'mp_facial');
        } else if (status === false) {
            syncpl.playFacialAnim('mood_normal_1', 'facials@gen_male@variations@normal');
        }
    } catch (error) {
        console.log(error);
    }
});

let g_voiceMgr =
{
	listeners: [],
	
	add: function(player)
	{
		this.listeners.push(player);
		
		player.isListening = true;		
		mp.events.callRemote("add_voice_listener", player);
		
		if(UseAutoVolume)
		{
			player.voiceAutoVolume = true;
		}
		else
		{
			player.voiceVolume = 1.0;
		}
		
		const b1 = mp.players.local.getVariable('brawlCh');
		const b2 = player.getVariable('brawlCh');
		if (b1 && b2 && String(b1) === String(b2)) {
			player.voice3d = false;
		} else if (Use3d) {
			player.voice3d = true;
		}
	},
	
	remove: function(player, notify)
	{
		let idx = this.listeners.indexOf(player);
			
		if(idx !== -1)
			this.listeners.splice(idx, 1);
			
		player.isListening = false;		
		
		if(notify)
		{
			mp.events.callRemote("remove_voice_listener", player);
		}
	},

	/** После cleanupAndReload — заново enableVoiceTo на сервере для всех активных слушателей. */
	resyncAll: function ()
	{
		const snapshot = this.listeners.slice();
		for (let i = 0; i < snapshot.length; i++) {
			const p = snapshot[i];
			if (!p || !mp.players.exists(p)) continue;
			this.remove(p, true);
		}
		for (let i = 0; i < snapshot.length; i++) {
			const p = snapshot[i];
			if (!p || !mp.players.exists(p) || p.handle === 0) continue;
			if (!p.getVariable('voicee')) continue;
			this.add(p);
		}
	}
};

mp.events.add("playerQuit", (player) =>
{
	if(player.isListening)
	{
		g_voiceMgr.remove(player, false);
	}
});

setInterval(() =>
{
	let localPlayer = mp.players.local;
	
    if (!localPlayer.getVariable('voicee')) {
        g_voiceMgr.listeners.forEach((player) => {
            g_voiceMgr.remove(player, true);
        });
        return;
    }
    
    let localPos = localPlayer.position;
	const inBrawl = !!localPlayer.getVariable('brawlCh');
	const brawlWideOutgoing =
		typeof global !== 'undefined' && global.__voiceBrawlOutgoing === true;
	const addLoop = inBrawl
		? (cb) => {
				mp.players.forEach(cb);
		  }
		: (cb) => {
				mp.players.forEachInStreamRange(cb);
		  };

	addLoop((player) => {
		if (player === localPlayer) return;
		if (!player || !mp.players.exists(player)) return;
		if (player.isListening) return;
		if (!player.getVariable('voicee')) return;

		const b1 = localPlayer.getVariable('brawlCh');
		const b2 = player.getVariable('brawlCh');
		/* Полный канал Brawl только при отдельном brawl PTT; обычный голос — как proximity даже в том же канале. */
		if (b1 && b2 && String(b1) === String(b2)) {
			if (brawlWideOutgoing) {
				g_voiceMgr.add(player);
				return;
			}
		}

		const playerPos = player.position;
		let dist = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, localPos.x, localPos.y, localPos.z);

		if (dist <= MaxRange) {
			g_voiceMgr.add(player);
		}
	});
	
	const brawlWideOutgoingCleanup =
		typeof global !== 'undefined' && global.__voiceBrawlOutgoing === true;

	g_voiceMgr.listeners.forEach((player) =>
	{
		if(player.handle !== 0)
		{
			const b1 = localPlayer.getVariable('brawlCh');
			const b2 = player.getVariable('brawlCh');
			if (b1 && b2 && String(b1) === String(b2)) {
			 if (!player.getVariable('voicee')) {
					g_voiceMgr.remove(player, true);
					return;
				}
				if (brawlWideOutgoingCleanup) {
					/* Громкость задаётся в brawl_client.js (applyBrawlVoiceVolumes). */
					return;
				}
			}

			const playerPos = player.position;		
			let dist = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, localPos.x, localPos.y, localPos.z);
			
			if(dist > MaxRange || !player.getVariable('voicee'))
			{
				g_voiceMgr.remove(player, true);
			}
			else if(!UseAutoVolume)
			{
				player.voiceVolume = 1 - (dist / MaxRange);
			}
		}
		else
		{
			g_voiceMgr.remove(player, true);
		}
	});
}, 500);
