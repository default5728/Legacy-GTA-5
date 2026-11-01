const EMS_TATTOO_REMOVE_ONE = 10000;
const EMS_APPEARANCE_COST_MONEY = 100000;
const EMS_APPEARANCE_COST_DP = 150;

function parseTattoosFromRow(raw) {
    if (!raw) return [];
    try {
        const tattoos = JSON.parse(raw);
        return Array.isArray(tattoos) ? tattoos : [];
    } catch (_e) {
        return [];
    }
}

function sendEmsTattooList(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log(err);
                return;
            }
            const tattoos =
                results.length > 0 ? parseTattoosFromRow(results[0].tatto) : [];
            player.call('ems:tattoo:data', [JSON.stringify(tattoos)]);
        });
    } catch (e) {
        console.log(e);
    }
}

mp.events.add('ems:tattoo:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        sendEmsTattooList(player);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('ems:tattoo:removeOne:s', (player, idxRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000)
            return;
        player.clicked = new Date().getTime();

        const idx = parseInt(idxRaw, 10);
        if (Number.isNaN(idx) || idx < 0) return;

        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log(err);
                return;
            }
            const tattoos =
                results.length > 0 ? parseTattoosFromRow(results[0].tatto) : [];
            if (tattoos.length === 0) {
                return;
            }
            if (idx >= tattoos.length) {
                return;
            }
            if (EMS_TATTOO_REMOVE_ONE > Number(player.money)) {
                return;
            }

            const newTattoos = tattoos.slice(0, idx).concat(tattoos.slice(idx + 1));
            const newMoney = parseInt(Number(player.money), 10) - EMS_TATTOO_REMOVE_ONE;

            global.DB.query(
                'UPDATE accounts SET money = ?, tatto = ? WHERE static = ?',
                [newMoney, JSON.stringify(newTattoos), player.static],
                (errUp) => {
                    if (errUp) {
                        console.log(errUp);
                        return;
                    }
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    player.money = newMoney;
                    player.clearDecorations();
                    global.setTatto(player);
                    player.call('sound:client', [3]);
                    sendEmsTattooList(player);
                }
            );
        });
    } catch (e) {
        console.log(e);
    }
});

// ── Makeup removal ─────────────────────────────────────────────────────────────

function sendEmsMakeupList(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.DB.query(
            'SELECT id, style_id, opacity FROM player_makeup WHERE static = ? ORDER BY id',
            [player.static],
            (err, rows) => {
                if (err) { console.log(err); return; }
                player.call('ems:makeup:data', [JSON.stringify(rows || [])]);
            }
        );
    } catch (e) { console.log(e); }
}

mp.events.add('ems:makeup:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        sendEmsMakeupList(player);
    } catch (e) { console.log(e); }
});

mp.events.add('ems:makeup:removeOne:s', (player, idxRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000)
            return;
        player.clicked = new Date().getTime();

        const idx = parseInt(idxRaw, 10);
        if (Number.isNaN(idx) || idx < 0) return;

        global.DB.query(
            'SELECT id FROM player_makeup WHERE static = ? ORDER BY id',
            [player.static],
            (err, rows) => {
                if (err) { console.log(err); return; }
                if (!rows || rows.length === 0)
                    return;
                if (idx >= rows.length)
                    return;
                if (EMS_TATTOO_REMOVE_ONE > Number(player.money))
                    return;

                const rowId = rows[idx].id;
                const newMoney = parseInt(Number(player.money), 10) - EMS_TATTOO_REMOVE_ONE;

                global.DB.query('DELETE FROM player_makeup WHERE id = ?', [rowId], (errDel) => {
                    if (errDel) { console.log(errDel); return; }
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (errUp) => {
                        if (errUp) console.log(errUp);
                    });
                    player.money = newMoney;
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    if (typeof global.setMakeup === 'function') global.setMakeup(player);
                    player.call('sound:client', [3]);
                    sendEmsMakeupList(player);
                });
            }
        );
    } catch (e) { console.log(e); }
});

// ── Appearance change (full character editor) ─────────────────────────────────

mp.events.add('ems:appearance:pay:s', (player, methodRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000)
            return;
        player.clicked = new Date().getTime();

        if (player.getVariable('charCreating') === true) return;
        if (player._appearanceEdit === true) return;
        if (player.vehicle) return;
        if (player.getVariable('dead')) return;

        const method = String(methodRaw || '');
        const cost = method === 'dp' ? EMS_APPEARANCE_COST_DP : EMS_APPEARANCE_COST_MONEY;
        if (method !== 'dp' && method !== 'money') return;

        const hasFunds =
            method === 'dp'
                ? Number(player.dp) >= cost
                : Number(player.money) >= cost;
        if (!hasFunds) {
            return;
        }

        player._appearanceEditPay = { method, cost };
        if (typeof global.openAppearanceEditorForPlayer === 'function') {
            global.openAppearanceEditorForPlayer(player);
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('ems:makeup:accept:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000)
            return;
        player.clicked = new Date().getTime();

        global.DB.query(
            'SELECT id FROM player_makeup WHERE static = ? ORDER BY id',
            [player.static],
            (err, rows) => {
                if (err) { console.log(err); return; }
                if (!rows || rows.length === 0)
                    return;
                const totalCost = rows.length * EMS_TATTOO_REMOVE_ONE;
                if (totalCost > Number(player.money))
                    return;

                const newMoney = parseInt(Number(player.money), 10) - totalCost;

                global.DB.query(
                    'DELETE FROM player_makeup WHERE static = ?',
                    [player.static],
                    (errDel) => {
                        if (errDel) { console.log(errDel); return; }
                        global.DB.query(
                            'UPDATE accounts SET money = ? WHERE static = ?',
                            [newMoney, player.static],
                            (errUp) => { if (errUp) console.log(errUp); }
                        );
                        player.money = newMoney;
                        player.call('updateMoney', [global.formatnum1(newMoney)]);
                        if (typeof global.setMakeup === 'function') global.setMakeup(player);
                        player.call('sound:client', [3]);
                        sendEmsMakeupList(player);
                    }
                );
            }
        );
    } catch (e) { console.log(e); }
});

// ──────────────────────────────────────────────────────────────────────────────

mp.events.add('ems:tattoo:accept:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - player.clicked < 1000)
            return;
        player.clicked = new Date().getTime();

        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log(err);
                return;
            }
            const tattoos =
                results.length > 0 ? parseTattoosFromRow(results[0].tatto) : [];
            if (tattoos.length === 0) {
                return;
            }
            const totalCost = tattoos.length * EMS_TATTOO_REMOVE_ONE;
            if (totalCost > Number(player.money)) {
                return;
            }

            const newMoney = parseInt(Number(player.money), 10) - totalCost;

            global.DB.query(
                'UPDATE accounts SET money = ?, tatto = ? WHERE static = ?',
                [newMoney, JSON.stringify([]), player.static],
                (errUp) => {
                    if (errUp) {
                        console.log(errUp);
                        return;
                    }
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    player.money = newMoney;
                    player.clearDecorations();
                    global.setTatto(player);
                    player.call('sound:client', [3]);
                    sendEmsTattooList(player);
                }
            );
        });
    } catch (e) {
        console.log(e);
    }
});
