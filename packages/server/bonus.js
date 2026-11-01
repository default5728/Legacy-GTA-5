global.givemoney = function(player, amount) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.economyAddMoney === 'function') {
            global.economyAddMoney(player, amount);
            return;
        }
        global.DB.query('SELECT money FROM accounts WHERE static = ?', [player.static], function(err, result) {
            if (err) return console.log(err);

            if (result.length > 0) {
                let newMoney = parseInt(result[0].money) + parseInt(amount);
                player.money = newMoney;
                player.call('updateMoney', [global.formatnum1(newMoney)]);

                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static]);
            }
        });
    } catch (error) {
        console.log(error);
    }
};

global.givedp = function(player, amount) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.economyAddDp === 'function') {
            global.economyAddDp(player, amount);
            return;
        }
        global.DB.query('SELECT dp FROM accounts WHERE static = ?', [player.static], function(err, result) {
            if (err) return console.log(err);

            if (result.length > 0) {
                let newdp = parseInt(result[0].dp) + parseInt(amount);
                player.dp = newdp;
                player.call('updatedp', [newdp]);

                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, player.static]);
            }
        });
    } catch (error) {
        console.log(error);
    }
};

global.givevip = function (player, vipLevel, days) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        global.DB.query('SELECT viplvl, vipdate FROM accounts WHERE static = ?', [player.static], (err, result) => {
            if (err) return console.log(err);

            let now = moment();
            let vipEndDate;

            if (result.length > 0 && result[0].viplvl && result[0].vipdate) {
                let currentVipEnd = moment(result[0].vipdate, 'YYYY-MM-DD HH:mm:ss');
                vipEndDate = currentVipEnd.isAfter(now) ? currentVipEnd.add(days, 'days') : now.add(days, 'days');
            } else {
                vipEndDate = now.add(days, 'days');
            }

            let formattedVipEndDate = vipEndDate.format('YYYY-MM-DD HH:mm:ss');

            global.DB.query('UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?', [vipLevel, formattedVipEndDate, player.static], (err) => {
                if (err) return console.log(err);

                player.viplvl = vipLevel;
                player.setVariable('viplvl', vipLevel);
                player.call('updateviplvl', [vipLevel]);

                const daysLeft = vipEndDate.diff(now, 'days');
                player.call('updatevipdate', [`${daysLeft}д.`]);
            });
        });
    } catch (error) {
        console.log(error);
    }
};

global.giveweapon = function (player, weaponName, amount) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (weaponName === undefined || weaponName === null || !amount || amount <= 0) return;

        if (typeof weaponName === 'number' && weaponName === 1) {
            weaponName = 'weapon_revolver';
        }
        weaponName = String(weaponName);

        if (!Array.isArray(player.inventory)) player.inventory = [];
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];

        if (weaponName === 'weapon_revolver') {
            if (player.inventory.includes('weapon_revolver')) return;
        }

        for (let i = 0; i < amount; i++) {
            player.inventory.push(weaponName);
        }

        global.saveInventory(player);
        player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (error) {
        console.log(error);
    }
};
