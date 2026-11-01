'use strict';

let deathTimerSpot = null;
let deathTimerFaction = null;
let deathTimerHospital = null;

function stopDeathTimers() {
    if (deathTimerSpot != null) {
        clearInterval(deathTimerSpot);
        deathTimerSpot = null;
    }
    if (deathTimerFaction != null) {
        clearInterval(deathTimerFaction);
        deathTimerFaction = null;
    }
    if (deathTimerHospital != null) {
        clearInterval(deathTimerHospital);
        deathTimerHospital = null;
    }

    const spotWrap = document.getElementById('spotWrap');
    if (spotWrap) spotWrap.style.display = 'none';
}

window.stopDeathTimers = stopDeathTimers;

function setBtnState(btn, disabled) {
    if (!btn) return;
    btn.disabled = !!disabled;
}

function setHint(el, seconds) {
    if (!el) return;
    el.textContent = seconds > 0
        ? 'До активации ' + seconds + ' секунд'
        : 'Доступно для активации';
}

function handleKeyDown(e) {
    // Автореспавн в EMS по ESC отключён. Респавн — только кликом по кнопке меню смерти.
}

function setDeathKiller(killerLabel) {
    const el = document.getElementById('deathKillerLine');
    if (!el) return;
    const label = killerLabel != null ? String(killerLabel).trim() : '';
    if (label) {
        el.style.display = '';
        el.textContent = 'Вас атаковал ' + label;
    } else {
        el.style.display = '';
        el.textContent = 'Вы совершили самоубийство';
    }
}

window.setDeathKiller = setDeathKiller;

function start(vipLvl, killerLabel, blockSpotRevive) {
    stopDeathTimers();
    setDeathKiller(killerLabel);

    const btnFrac = document.getElementById('btnFrac');
    const btnLose = document.getElementById('btnLose');
    const btnSpot = document.getElementById('btnSpot');
    const spotWrap = document.getElementById('spotWrap');
    const fracHint = document.getElementById('fracHint');
    const loseHint = document.getElementById('loseHint');
    const spotHint = document.getElementById('spotHint');

    if (btnFrac) btnFrac.onclick = null;
    if (btnLose) btnLose.onclick = null;
    if (btnSpot) btnSpot.onclick = null;

    let reviveTime = 20;
    let hospitalTime = 5;

    if (vipLvl === 1) {
        reviveTime = 15;
        hospitalTime = 3;
    } else if (vipLvl === 2) {
        reviveTime = 10;
        hospitalTime = 3;
    } else if (vipLvl >= 3) {
        reviveTime = 5;
        hospitalTime = 1;
    }

    const allowSpot = vipLvl >= 3 && !blockSpotRevive;
    if (allowSpot && btnSpot && spotWrap) {
        spotWrap.style.display = 'flex';
        let spotCountdown = 15;
        setBtnState(btnSpot, true);
        setHint(spotHint, spotCountdown);

        deathTimerSpot = setInterval(function () {
            spotCountdown--;
            if (spotCountdown > 0) {
                setHint(spotHint, spotCountdown);
            } else {
                clearInterval(deathTimerSpot);
                deathTimerSpot = null;
                setBtnState(btnSpot, false);
                setHint(spotHint, 0);
                btnSpot.onclick = function () {
                    if (typeof mp !== 'undefined') mp.trigger('revive', 'SPOT');
                };
            }
        }, 1000);
    } else if (spotWrap) {
        spotWrap.style.display = 'none';
        if (blockSpotRevive && spotHint) {
            spotHint.textContent = 'Самореан на поставке запрещён';
        }
    }

    let factionCountdown = reviveTime;
    setBtnState(btnFrac, true);
    setHint(fracHint, factionCountdown);

    deathTimerFaction = setInterval(function () {
        factionCountdown--;
        if (factionCountdown > 0) {
            setHint(fracHint, factionCountdown);
        } else {
            clearInterval(deathTimerFaction);
            deathTimerFaction = null;
            setBtnState(btnFrac, false);
            setHint(fracHint, 0);
            btnFrac.onclick = function () {
                if (typeof mp !== 'undefined') mp.trigger('revive', 'frac');
            };
        }
    }, 1000);

    let hospitalCountdown = hospitalTime;
    setBtnState(btnLose, true);
    setHint(loseHint, hospitalCountdown);

    deathTimerHospital = setInterval(function () {
        hospitalCountdown--;
        if (hospitalCountdown > 0) {
            setHint(loseHint, hospitalCountdown);
        } else {
            clearInterval(deathTimerHospital);
            deathTimerHospital = null;
            setBtnState(btnLose, false);
            setHint(loseHint, 0);
            btnLose.onclick = function () {
                if (typeof mp !== 'undefined') mp.trigger('revive', 'EMS');
            };
        }
    }, 1000);
}

window.start = start;
window.addEventListener('keydown', handleKeyDown);
