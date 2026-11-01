'use strict';

global._torgMarketLock = global._torgMarketLock || false;

function acquireTorgLock(player) {
    if (global._torgMarketLock) {
        if (player && mp.players.exists(player)) {
            isNotify(player, 2, 'top-mid', 'Торговая площадка занята, подождите.', 2000);
        }
        return false;
    }
    global._torgMarketLock = true;
    return true;
}

function releaseTorgLock() {
    global._torgMarketLock = false;
}

function loadTorgData(cb) {
    global.DB.query('SELECT torg FROM systems LIMIT 1', [], (err, results) => {
        if (err) return cb(err);
        let torgData = [];
        try {
            torgData = results && results.length > 0 ? JSON.parse(results[0].torg) : [];
            if (!Array.isArray(torgData)) torgData = [];
        } catch (_e) {
            torgData = [];
        }
        cb(null, torgData);
    });
}

function saveTorgData(torgData, cb) {
    global.DB.query('UPDATE systems SET torg = ? LIMIT 1', [JSON.stringify(torgData)], (err) => {
        if (cb) cb(err);
    });
}

function normalizeTorgItemName(raw) {
    return String(raw == null ? '' : raw).trim();
}

function parseTorgPrice(raw) {
    const p = parseInt(String(raw == null ? 0 : raw).replace(/\D/g, ''), 10);
    return Number.isFinite(p) && p > 0 ? p : 0;
}

global.torgupd = async function () {
    try {
        mp.players.forEach((player) => {
            if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
            player.setVariable('updtorg', true);
        });

        const systemsResult = await global.querydb('SELECT * FROM systems LIMIT 1');
        if (!systemsResult || systemsResult.length === 0) {
            mp.players.forEach((player) => {
                if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
                player.setVariable('updtorg', false);
            });
            return;
        }

        JSON.parse(systemsResult[0].torg);

        mp.players.forEach((player) => {
            if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
            player.setVariable('updtorg', false);
        });
    } catch (error) {
        console.log(error);
        mp.players.forEach((p) => {
            if (p && mp.players.exists(p) && p.getVariable('auth')) p.setVariable('updtorg', false);
        });
    }
};

global.torgupdplayer = async function (player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    } catch (error) {
        console.log(error);
    }
};

mp.events.add('buyPhone:SERVER', (player, index, name) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        if (player.getVariable('updtorg') === true) return isNotify(player, 2, 'top-mid', 'Торговая площадка обновляется, попробуйте позже.', 3000);
        if (!acquireTorgLock(player)) return;
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'torg', 8000)) {
            releaseTorgLock();
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        loadTorgData((err, torgData) => {
            if (err) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return console.log(err);
            }

            const wantId = Number(index);
            const itemIndex = torgData.findIndex((item) => Number(item.indexbd) === wantId);
            if (itemIndex === -1) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return isNotify(player, 2, 'top-mid', 'Товар уже продан или снят с продажи.', 3000);
            }

            const item = torgData[itemIndex];
            const price = parseTorgPrice(item.price);
            const itemName = normalizeTorgItemName(item.name);
            if (!itemName || price < 100000) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return isNotify(player, 2, 'top-mid', 'Некорректное объявление.', 3000);
            }
            if (Number(item.sellerstatic) === Number(player.static)) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return isNotify(player, 2, 'top-mid', 'Вы не можете купить свой товар.', 3000);
            }

            const finishBuy = (notifyText) => {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                if (notifyText) isNotify(player, 3, 'top-mid', notifyText, 3000);
                global.torgupd();
            };

            const rollbackListing = () => {
                loadTorgData((e2, fresh) => {
                    if (e2 || !Array.isArray(fresh)) return;
                    if (fresh.some((x) => Number(x.indexbd) === wantId)) return;
                    fresh.push({ indexbd: wantId, name: itemName, price, sellerstatic: item.sellerstatic });
                    saveTorgData(fresh, () => {});
                });
            };

            const grantItemToBuyer = () => {
                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
                let pushed = false;
                if (typeof global.invGridTryPush === 'function') {
                    pushed = !!global.invGridTryPush(player, itemName);
                } else {
                    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
                    const empty = player.inventory.findIndex((x) => x == null || x === '');
                    if (empty >= 0) {
                        player.inventory[empty] = itemName;
                        pushed = true;
                    }
                }
                if (!pushed) {
                    rollbackListing();
                    if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, price, () => {});
                    return finishBuy('Нет места в инвентаре — покупка отменена, деньги возвращены.');
                }
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            };

            const creditSeller = (sellerLogin) => {
                const sellerStatic = item.sellerstatic;
                const targetPlayer = mp.players.toArray().find((p) => Number(p.static) === Number(sellerStatic));
                const onCredited = () => {
                    global.sendDiscordLog(
                        `Покупка на торговой площадке!\n\nИгрок - [#${player.static}] ${player.login}\nПродавец - [#${sellerStatic}] ${sellerLogin || sellerStatic}\nПредмет - ${global.formweap(itemName)}\nСумма - ${global.formatnum1(price)}$`,
                        '1347374978445611068'
                    );
                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        isNotify(targetPlayer, 3, 'top-mid', `${player.login} купил у вас ${global.formweap(itemName)} за ${global.formatnum1(price)}$`, 3000);
                        targetPlayer.call('sound:client', [3]);
                        targetPlayer.outputChatBox(`!{red}${player.login} !{DodgerBlue}купил у вас !{green}${global.formweap(itemName)} !{DodgerBlue}за !{yellow}${global.formatnum1(price)}$`);
                    }
                    finishBuy(`Вы купили ${global.formweap(itemName)} за ${global.formatnum1(price)}$`);
                };

                if (typeof global.economyAddMoney === 'function') {
                    global.economyAddMoney(sellerStatic, price, (eAdd) => {
                        if (eAdd) {
                            if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, price, () => {});
                            rollbackListing();
                            return finishBuy(null);
                        }
                        onCredited();
                    });
                    return;
                }

                global.DB.query('SELECT login, money FROM accounts WHERE static = ? LIMIT 1', [sellerStatic], (eSel, rows) => {
                    if (eSel || !rows || !rows.length) {
                        if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, price, () => {});
                        rollbackListing();
                        return finishBuy(null);
                    }
                    const sellerLoginDb = rows[0].login;
                    const sellerNewMoney = (parseInt(rows[0].money, 10) || 0) + price;
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [sellerNewMoney, sellerStatic], (eUpd) => {
                        if (eUpd) {
                            if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, price, () => {});
                            rollbackListing();
                            return finishBuy(null);
                        }
                        if (targetPlayer && mp.players.exists(targetPlayer)) {
                            targetPlayer.money = sellerNewMoney;
                            targetPlayer.call('updateMoney', [global.formatnum1(sellerNewMoney)]);
                        }
                        onCredited();
                    });
                });
            };

            const afterListingRemoved = () => {
                grantItemToBuyer();
                global.DB.query('SELECT login FROM accounts WHERE static = ? LIMIT 1', [item.sellerstatic], (eLogin, accRows) => {
                    const sellerLogin = accRows && accRows[0] ? accRows[0].login : null;
                    creditSeller(sellerLogin);
                });
            };

            const spendAndRemove = () => {
                if (typeof global.economySpendMoney !== 'function') {
                    releaseTorgLock();
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                    return isNotify(player, 2, 'top-mid', 'Покупка временно недоступна.', 3000);
                }
                global.economySpendMoney(player, price, (eSpend, okSpend) => {
                    if (eSpend || !okSpend) {
                        releaseTorgLock();
                        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                        return isNotify(player, 2, 'top-mid', 'Недостаточно денег для покупки.', 3000);
                    }

                    torgData.splice(itemIndex, 1);
                    saveTorgData(torgData, (eSave) => {
                        if (eSave) {
                            global.economyAddMoney(player, price, () => {});
                            releaseTorgLock();
                            if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                            return isNotify(player, 2, 'top-mid', 'Ошибка покупки. Средства возвращены.', 3500);
                        }
                        afterListingRemoved();
                    });
                });
            };

            spendAndRemove();
        });
    } catch (error) {
        releaseTorgLock();
        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
        console.log(error);
    }
});

mp.events.add('salePhone:SERVER', (player, index, price, invindex, name) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('updtorg') === true) return isNotify(player, 2, 'top-mid', 'Торговая площадка обновляется, попробуйте позже.', 3000);

        const salePrice = parseTorgPrice(price);
        if (salePrice < 100000) return isNotify(player, 2, 'top-mid', 'Минимальная сумма 100.000$', 3000);
        if (salePrice > 100000000) return isNotify(player, 2, 'top-mid', 'Максимальная сумма 100.000.000$', 3000);

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);

        const slot = parseInt(invindex, 10);
        if (!Array.isArray(player.inventory) || !Number.isInteger(slot) || slot < 0 || slot >= player.inventory.length) {
            return isNotify(player, 2, 'top-mid', 'Неверный слот инвентаря.', 3000);
        }

        const sellItem = normalizeTorgItemName(player.inventory[slot]);
        if (!sellItem) return isNotify(player, 2, 'top-mid', 'Пустой слот инвентаря.', 3000);
        const asked = normalizeTorgItemName(name);
        if (asked) {
            const sellBase = sellItem.split('#')[0].trim();
            const askedBase = asked.split('#')[0].trim();
            if (asked !== sellItem && askedBase !== sellBase) {
                return isNotify(player, 2, 'top-mid', 'Несоответствие предмета.', 3000);
            }
        }

        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, sellItem)) {
            return isNotify(
                player,
                2,
                'top-mid',
                'Снимите предмет с экипировки или из быстрого слота — такие вещи нельзя выставлять на продажу.',
                4500
            );
        }

        if (!acquireTorgLock(player)) return;
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'torg', 8000)) {
            releaseTorgLock();
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        loadTorgData((err, torgData) => {
            if (err) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return console.log(err);
            }

            const lastIndexbd = torgData.length > 0 ? torgData[torgData.length - 1].indexbd : 0;
            const newIndexbd = lastIndexbd + 1;
            const listing = {
                indexbd: newIndexbd,
                name: sellItem,
                price: salePrice,
                sellerstatic: player.static
            };
            torgData.push(listing);

            saveTorgData(torgData, (eSave) => {
                if (eSave) {
                    releaseTorgLock();
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                    return isNotify(player, 2, 'top-mid', 'Не удалось выставить на продажу.', 3000);
                }

                const curItem = normalizeTorgItemName(player.inventory[slot]);
                if (curItem !== sellItem) {
                    loadTorgData((e2, fresh) => {
                        if (!e2 && Array.isArray(fresh)) {
                            const li = fresh.findIndex((x) => x.indexbd === newIndexbd);
                            if (li !== -1) {
                                fresh.splice(li, 1);
                                saveTorgData(fresh, () => global.torgupd());
                            }
                        }
                    });
                    releaseTorgLock();
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                    return isNotify(player, 2, 'top-mid', 'Предмет изменился — продажа отменена.', 3000);
                }

                // Сетка 20 слотов: нельзя splice — только обнуляем ячейку.
                player.inventory[slot] = null;
                if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                global.torgupd();
                if (typeof global.pushMoonvitoState === 'function') global.pushMoonvitoState(player);
                global.sendDiscordLog(
                    `Выставление на торговую площадку!\n\nИгрок - [#${player.static}] ${player.login}\nПредмет - ${global.formweap(sellItem)}\nСумма - ${global.formatnum1(salePrice)}$`,
                    '1347374978445611068'
                );
                isNotify(player, 3, 'top-mid', `Вы выставили ${global.formweap(sellItem)} на продажу за ${global.formatnum1(salePrice)}$`, 3000);
            });
        });
    } catch (error) {
        releaseTorgLock();
        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
        console.log(error);
    }
});

mp.events.add('cancelPhone:SERVER', (player, index, name) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('updtorg') === true) return isNotify(player, 2, 'top-mid', 'Торговая площадка обновляется, попробуйте позже.', 3000);
        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        if (!acquireTorgLock(player)) return;
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'torg', 8000)) {
            releaseTorgLock();
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        loadTorgData((err, torgData) => {
            if (err) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return console.log(err);
            }

            const wantId = Number(index);
            const itemIndex = torgData.findIndex((item) => Number(item.indexbd) === wantId);
            if (itemIndex === -1) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return isNotify(player, 2, 'top-mid', 'Объявление не найдено.', 3000);
            }

            const item = torgData[itemIndex];
            if (Number(item.sellerstatic) !== Number(player.static)) {
                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                return isNotify(player, 2, 'top-mid', 'Это не ваше объявление.', 3000);
            }

            const itemName = normalizeTorgItemName(item.name);
            torgData.splice(itemIndex, 1);

            saveTorgData(torgData, (eSave) => {
                if (eSave) {
                    releaseTorgLock();
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                    return isNotify(player, 2, 'top-mid', 'Не удалось снять с продажи.', 3000);
                }

                if (!Array.isArray(player.inventory)) player.inventory = [];
                if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
                let restored = false;
                if (typeof global.invGridTryPush === 'function') {
                    restored = !!global.invGridTryPush(player, itemName);
                } else {
                    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
                    const empty = player.inventory.findIndex((x) => x == null || x === '');
                    if (empty >= 0) {
                        player.inventory[empty] = itemName;
                        restored = true;
                    }
                }
                if (!restored) {
                    // Вернём лот обратно, если инвентарь забит
                    torgData.push(item);
                    saveTorgData(torgData, () => {});
                    releaseTorgLock();
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                    return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
                }
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

                releaseTorgLock();
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
                global.torgupd();
                if (typeof global.pushMoonvitoState === 'function') global.pushMoonvitoState(player);
                global.sendDiscordLog(
                    `Забирание с торговой площадки!\n\nИгрок - [#${player.static}] ${player.login}\nПредмет - ${global.formweap(itemName)}\nСумма (была) - ${global.formatnum1(item.price)}$`,
                    '1347374978445611068'
                );
                isNotify(player, 3, 'top-mid', `Вы забрали предмет ${global.formweap(itemName)} с маркета.`, 3000);
            });
        });
    } catch (error) {
        releaseTorgLock();
        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'torg');
        console.log(error);
    }
});

/* —— MoonVito marketplace (телефон) —— */

function moonvitoItemCategory(raw) {
    const s = String(raw || '').split('(')[0].trim().toLowerCase();
    if (s.indexOf('weapon_') === 0) return 'weapon';
    if (s.indexOf('ic1.') === 0 || s.indexOf('frdef:') === 0) return 'cloth';
    if (s.indexOf('ivbag:') === 0 || s.indexOf('ivhol:') === 0) return 'bag';
    return 'other';
}

function moonvitoItemLabel(raw) {
    const s = String(raw || '').trim();
    if (!s) return 'Предмет';
    if (typeof global.clothTokenDropLabel === 'function') {
        const cloth = global.clothTokenDropLabel(s);
        if (cloth) return cloth;
    }
    if (s.indexOf('ivhol:') === 0 || s.indexOf('ivbag:') === 0) {
        if (s === 'ivhol:cobura') return 'Чёрная Кобура';
        if (s === 'ivhol:coburaw') return 'Белая Кобура';
        if (s.indexOf('ivbag:') === 0) {
            const k = s.slice(6).split('(')[0].trim();
            const reg = global.DONATE_BAGS_REGISTRY;
            if (reg && reg[k] && reg[k].name) return reg[k].name;
            return 'Сумка';
        }
    }
    return global.formweap ? global.formweap(s) : s;
}

function buildMoonvitoInventory(player) {
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    const out = [];
    for (let i = 0; i < inv.length; i++) {
        const raw = normalizeTorgItemName(inv[i]);
        if (!raw) continue;
        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, raw)) {
            continue;
        }
        out.push({
            invIndex: i,
            name: raw,
            label: moonvitoItemLabel(raw),
            category: moonvitoItemCategory(raw)
        });
    }
    return out;
}

function buildMoonvitoListings(torgData, myStatic) {
    const me = Number(myStatic) || 0;
    if (!Array.isArray(torgData)) return [];
    return torgData.map((item) => {
        const name = normalizeTorgItemName(item && item.name);
        const price = parseTorgPrice(item && item.price);
        const seller = Number(item && item.sellerstatic) || 0;
        return {
            indexbd: item.indexbd,
            name,
            label: moonvitoItemLabel(name),
            price,
            sellerstatic: seller,
            mine: seller === me,
            category: moonvitoItemCategory(name)
        };
    }).filter((x) => x.name && x.price > 0);
}

global.pushMoonvitoState = function (player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        loadTorgData((err, torgData) => {
            if (err || !mp.players.exists(player)) return;
            const payload = {
                listings: buildMoonvitoListings(torgData, player.static),
                inventory: buildMoonvitoInventory(player),
                minPrice: 100000,
                maxPrice: 100000000,
                myStatic: Number(player.static) || 0
            };
            try {
                player.call('phone:moonvito:state:c', [JSON.stringify(payload)]);
            } catch (_e) {}
        });
    } catch (_e) {}
};

mp.events.add('phone:moonvito:open:s', (player) => {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    global.pushMoonvitoState(player);
});

mp.events.add('phone:moonvito:refresh:s', (player) => {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    global.pushMoonvitoState(player);
});

const _torgupdOrig = global.torgupd;
global.torgupd = async function () {
    await _torgupdOrig();
    try {
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            if (!p.getVariable('phone') && !p.getVariable('moonvito')) return;
            global.pushMoonvitoState(p);
        });
    } catch (_e) {}
};

mp.events.add('moonvito:setOpen:s', (player, on) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('moonvito', !!on);
    } catch (_e) {}
});
