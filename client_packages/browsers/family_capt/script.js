let hudVisible = false;
function $(id) { return document.getElementById(id); }
function showHUD() { const el = $('capt-hud'); if (el) { el.style.display = 'block'; } }
function hideHUD() { const el = $('capt-hud'); if (el) { el.style.display = 'none'; } hudVisible = false; }
function updateText(id, text) { const el = $(id); if (el) el.textContent = String(text); }
function updateColor(id, color) { const el = $(id); if (el) el.style.color = color; }

function updateHUD(attackerName, defenderName, attackerCount, defenderCount, timeRemaining, isPrep) {
    if (!hudVisible) { showHUD(); hudVisible = true; }
    updateText('attacker-name', attackerName);
    updateText('defender-name', defenderName);
    updateText('attacker-count', attackerCount);
    updateText('defender-count', defenderCount);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    updateText('capt-timer', timeStr);
    if (isPrep) {
        updateText('timer-label', 'ПОДГОТОВКА');
        updateColor('capt-timer', '#ffd700');
    } else {
        updateText('timer-label', 'ДО КОНЦА');
        updateColor('capt-timer', '#ffffff');
    }
}
