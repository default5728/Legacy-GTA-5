/**
 * Новый свист GTA5RP — логика 1:1 из Desktop/index.js
 * Старый свист (taskPlayAnim) остаётся в consumables_anim.js
 */

const DICT = 'rcmnigel1c';
const ANIM = 'hailing_whistle_waive_a';

let localLoading = false;
let localNextAt = 0;

async function playGta5rpWhistleOn(player, isLocal) {
    if (!player || !player.handle) return false;
    if (isLocal) {
        if (localLoading || Date.now() < localNextAt) return false;
        localLoading = true;
    }

    try {
        mp.game.streaming.requestAnimDict(DICT);
        const deadline = Date.now() + 5000;
        while (!mp.game.streaming.hasAnimDictLoaded(DICT)) {
            if (Date.now() >= deadline) {
                throw new Error('Animation dictionary loading timed out');
            }
            await mp.game.waitAsync(0);
        }

        if (!player.handle) return false;
        const blend = { f_17: 0.125, f_18: 0.125 };
        player.taskScriptedAnimation({
            dict: DICT,
            anim: ANIM,
            boneMaskHash: mp.game.joaat('BONEMASK_HEAD_NECK_AND_L_ARM') >> 0,
            animationFlags: 48,
            f_17: 2.7,
            f_18: 2.7,
        }, blend, blend, 0.5, 0.5);
        if (isLocal) localNextAt = Date.now() + 3500;
        return true;
    } catch (error) {
        if (isLocal) {
            try { mp.gui.chat.push('[whistle] ' + (error && error.message ? error.message : error)); } catch (_e) {}
        }
        return false;
    } finally {
        if (isLocal) localLoading = false;
    }
}

async function playGta5rpWhistleLocal() {
    return playGta5rpWhistleOn(mp.players.local, true);
}

if (typeof global !== 'undefined') {
    global.playGta5rpWhistleLocal = playGta5rpWhistleLocal;
    global.playGta5rpWhistleOn = playGta5rpWhistleOn;
}

mp.events.add('playWhistleGta5rpRemote', (playerId) => {
    const p = mp.players.atRemoteId(playerId);
    if (!p || !mp.players.exists(p) || p === mp.players.local) return;
    playGta5rpWhistleOn(p, false);
});
