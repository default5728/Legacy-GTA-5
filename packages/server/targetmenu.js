const coburaNames = { cobura: 'Чёрную Кобуру', coburaw: 'Белую Кобуру' };
/** accessories в clothes для слота кобуры: актуально 206:0 / 206:1; legacy 201:0/1, 50:0/50:1, 44:0/45:0. */
const coburaAccessoryClearStrs = {
    cobura: ['206:0', '201:0', '50:0', '44:0'],
    coburaw: ['206:1', '201:1', '50:1', '45:0']
};

function clearClothesRowsForHolster(staticId, coburaId) {
    const vals = coburaAccessoryClearStrs[coburaId];
    if (!vals) return;
    for (const accValue of vals) {
        global.DB.query('UPDATE clothes SET accessories = ? WHERE accessories = ? AND static = ?', [null, accValue, staticId], () => {});
    }
}

/** Расстояние между игроками на сервере (нет mp.game.gameplay) */
function serverPlayersDistance(p1, p2) {
    if (!p1 || !p2 || !p1.position || !p2.position) return 1e9;
    const dx = p1.position.x - p2.position.x;
    const dy = p1.position.y - p2.position.y;
    const dz = p1.position.z - p2.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

mp.events.add('target:open', (player, targetStatic) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const coburaId = player.getVariable('pendingCoburaSell');
        if (coburaId) {
            player.call('target:coburaSellMode', [coburaId, coburaNames[coburaId] || coburaId]);
        }
        const fid = parseInt(player.getVariable('fraction') || 0, 10) || 0;
        let canInvite = 0;
        if (fid >= 1 && fid <= 6 && global.fractionsData && global.fractionsData[fid]) {
            const fracData = global.fractionsData[fid];
            const rank = parseInt(player.fraction_rank, 10) || 0;
            if (rank === 10) {
                canInvite = 1;
            } else {
                const r = Array.isArray(fracData.ranks) ? fracData.ranks.find((x) => x.rank === rank) : null;
                if (r && r.canInvite) canInvite = 1;
            }
        }
        player.call('target:canInviteFraction', [canInvite]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('target:coburaSell:s', (player, targetStatic, coburaId, price) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!coburaId || !['cobura', 'coburaw'].includes(coburaId)) return;

        price = parseInt(String(price).replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, ''), 10);
        if (isNaN(price) || price <= 0) return isNotify(player, 2, "top-mid", "Введите корректную цену.", 3000);
        if (price > 100000000) return isNotify(player, 2, "top-mid", "Максимальная цена - 100.000.000$", 3000);

        const target = mp.players.toArray().find(p => p.static == targetStatic);
        if (!target) return isNotify(player, 2, "top-mid", "Игрок не найден.", 3000);
        if (target === player) return isNotify(player, 2, "top-mid", "Нельзя продать самому себе.", 3000);

        if (serverPlayersDistance(player, target) > 5) return isNotify(player, 2, "top-mid", "Игрок слишком далеко.", 3000);

        if (target.getVariable('coburaSellOffer')) return isNotify(player, 2, "top-mid", "Игрок уже рассматривает другое предложение.", 3000);

        const coburaInvTok = `ivhol:${coburaId}`;
        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, coburaInvTok)) {
            return isNotify(
                player,
                2,
                'top-mid',
                'Снимите кабуру с экипировки или из быстрого слота — такую нельзя продавать игроку.',
                4500
            );
        }

        global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err || results.length === 0) return;
            const toCount = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) || 0);
            if (toCount(results[0][coburaId]) <= 0) {
                player.setVariable('pendingCoburaSell', null);
                return isNotify(player, 2, "top-mid", "У вас нет кабуры.", 3000);
            }
            global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [target.static], (err2, results2) => {
                if (err2 || results2.length === 0) return;
                const r2 = results2[0];
                const tC = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) > 0 ? 1 : 0);
                if (tC(r2[coburaId]) >= 1) {
                    return isNotify(player, 2, "top-mid", "У игрока уже есть эта кабура.", 3000);
                }
                const targetMoney = Number(target.money);
                if (targetMoney < price) return isNotify(player, 2, "top-mid", "У игрока недостаточно средств.", 3000);

                player.call('target:close');
                const offerData = { sellerId: player.id, coburaId, price };
                target.setVariable('coburaSellOffer', JSON.stringify(offerData));
                isNotify(player, 3, "top-mid", `Запрос на продажу отправлен ${target.login}.`, 3000);
                target.call('showCoburaSell', [player.login, coburaNames[coburaId], global.formatnum1(price)]);

                setTimeout(() => {
                    if (mp.players.exists(target)) {
                        const stillPending = target.getVariable('coburaSellOffer');
                        if (stillPending) {
                            target.setVariable('coburaSellOffer', null);
                            target.call('hideCoburaSell');
                            try {
                                const od = JSON.parse(stillPending);
                                const seller = mp.players.at(od.sellerId);
                                if (seller && mp.players.exists(seller)) {
                                    isNotify(seller, 2, "top-mid", "Время ожидания истекло. Предложение отклонено.", 3000);
                                }
                            } catch (e) {}
                        }
                    }
                }, 25000);
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('otvetCoburaSell:server', (player, otvet) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;

        const offerStr = player.getVariable('coburaSellOffer');
        if (!offerStr) return;

        player.setVariable('coburaSellOffer', null);
        player.call('hideCoburaSell');

        let offer;
        try {
            offer = JSON.parse(offerStr);
        } catch (e) {
            return;
        }

        const seller = mp.players.at(offer.sellerId);
        if (!seller || !mp.players.exists(seller)) {
            return isNotify(player, 2, "top-mid", "Игрок вышел с сервера.", 3000);
        }

        const { coburaId, price } = offer;

        if (otvet === 'yes') {
            const toCount = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) || 0);
            global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [player.static], (err, results) => {
                if (err || !results || results.length === 0) return;
                const r = results[0];
                const tC = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) > 0 ? 1 : 0);
                if (tC(r[coburaId]) >= 1) {
                    isNotify(player, 2, "top-mid", "У вас уже есть эта кабура.", 3000);
                    isNotify(seller, 2, "top-mid", "У игрока уже есть эта кабура.", 3000);
                    return;
                }
                const targetMoney = Number(player.money);
                if (targetMoney < price) {
                    isNotify(player, 2, "top-mid", "У вас недостаточно средств.", 3000);
                    isNotify(seller, 2, "top-mid", "У игрока недостаточно средств.", 3000);
                    return;
                }

                global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [seller.static], (err2, results2) => {
                    if (err2 || !results2 || results2.length === 0) return;
                    const sellerCount = toCount(results2[0][coburaId]);
                    if (sellerCount <= 0) {
                        isNotify(player, 2, "top-mid", "У продавца больше нет этой кабуры.", 3000);
                        isNotify(seller, 2, "top-mid", "У вас больше нет этой кабуры.", 3000);
                        return;
                    }

                    const holTokPre = `ivhol:${coburaId}`;
                    if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(seller, holTokPre)) {
                        isNotify(
                            player,
                            2,
                            'top-mid',
                            'У продавца кабура на теле или в быстром слоте — сделка отменена.',
                            4500
                        );
                        isNotify(
                            seller,
                            2,
                            'top-mid',
                            'Снимите кабуру с экипировки или из быстрого слота, затем снова предложите продажу.',
                            4500
                        );
                        return;
                    }

                    clearClothesRowsForHolster(seller.static, coburaId);
                    seller.setClothes(7, 0, 0, 0);
                    const sellerNewVal = sellerCount <= 1 ? 'false' : String(sellerCount - 1);
                    global.DB.query(`UPDATE accounts SET ${coburaId} = ? WHERE static = ?`, [sellerNewVal, seller.static], (err) => {
                        if (err) return console.log(err);
                        global.DB.query(`UPDATE accounts SET ${coburaId} = 'true' WHERE static = ?`, [player.static], (err2) => {
                            if (err2) return console.log(err2);
                            const newTargetMoney = targetMoney - price;
                            player.money = newTargetMoney;
                            player.call('updateMoney', [global.formatnum1(newTargetMoney)]);
                            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newTargetMoney, player.static], () => {});

                            const newPlayerMoney = Number(seller.money) + price;
                            seller.money = newPlayerMoney;
                            seller.call('updateMoney', [global.formatnum1(newPlayerMoney)]);
                            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newPlayerMoney, seller.static], () => {});

                            seller.setVariable('pendingCoburaSell', null);
                            isNotify(seller, 3, "top-mid", `Вы продали ${coburaNames[coburaId]} за ${global.formatnum1(price)}$ игроку ${player.login}.`, 3000);
                            isNotify(player, 3, "top-mid", `Вы купили ${coburaNames[coburaId]} за ${global.formatnum1(price)}$ у игрока ${seller.login}.`, 3000);
                            const _holTok = `ivhol:${coburaId}`;
                            if (global.removeOneInventoryExact) global.removeOneInventoryExact(seller, _holTok);
                            if (global.tryPushInventoryItem) global.tryPushInventoryItem(player, _holTok);
                            if (global.saveInventory) {
                                global.saveInventory(seller);
                                global.saveInventory(player);
                            }
                            if (global.emitPlayerInventory) {
                                global.emitPlayerInventory(seller);
                                global.emitPlayerInventory(player);
                            }
                        });
                    });
                });
            });
        } else {
            if (seller && mp.players.exists(seller)) {
                isNotify(seller, 1, "top-mid", `Игрок ${player.login} отклонил ваше предложение о продаже кобуры.`, 3000);
                seller.setVariable('pendingCoburaSell', null);
            }
            isNotify(player, 1, "top-mid", `Вы отклонили предложение о покупке кобуры.`, 3000);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('target:variable', (player, status) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth') || player.dimension !== 0) return;

        player.setVariable('targetmenu', status);
        if (status === false) {
            player.setVariable('pendingCoburaSell', null);
        }
    } catch (error) {
        console.log(error);
    }
});

/* ——— P2P trade (обмен) ——— */
const tradeSessions = new Map();

function tradeDefaultBagsFlags() {
    const bags = {};
    if (global.IVBAG_LEGACY_SQL_KEYS) {
        for (const k of Object.keys(global.IVBAG_LEGACY_SQL_KEYS)) bags[k] = false;
    } else {
        for (const k of ['bag_antisocial', 'bag_anime', 'bag_grob', 'bag_big_black', 'bag_big_white', 'bag_waist']) {
            bags[k] = false;
        }
    }
    return bags;
}

function tradeLegacyBagKeysOrdered() {
    if (global.IVBAG_LEGACY_SQL_KEYS) return Object.keys(global.IVBAG_LEGACY_SQL_KEYS);
    return ['bag_antisocial', 'bag_anime', 'bag_grob', 'bag_big_black', 'bag_big_white', 'bag_waist'];
}

function defaultDonateSnapshot() {
    return {
        cobura: 0,
        coburaw: 0,
        bags: tradeDefaultBagsFlags(),
        cars: []
    };
}

function holsterCountFromDbValue(raw) {
    if (raw === true || raw === 'true') return 1;
    if (raw === false || raw === 'false') return 0;
    if (raw === null || raw === undefined) return 0;
    const s = String(raw).trim();
    if (s === '' || s === '0') return 0;
    if (s[0] === '[') {
        try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) return Math.min(arr.length, 1);
        } catch (e) {}
    }
    if (s.includes(',')) {
        const items = s.split(',').map((x) => x.trim()).filter((x) => x.length > 0);
        if (items.length > 0) return Math.min(items.length, 1);
    }
    const n = parseInt(s, 10);
    if (isNaN(n) || n < 0) return 0;
    return Math.min(n, 1);
}

function parseDonateToken(s) {
    const str = String(s);
    const mHol = /^trade_donate:holster:(cobura|coburaw):(\d+)$/.exec(str);
    if (mHol) return { type: 'holster', col: mHol[1], idx: parseInt(mHol[2], 10) };
    const mBag = /^trade_donate:bag:([a-zA-Z0-9_]+)$/.exec(str);
    if (mBag && global.IVBAG_LEGACY_SQL_KEYS && global.IVBAG_LEGACY_SQL_KEYS[mBag[1]]) return { type: 'bag', key: mBag[1] };
    const mCar = /^trade_donate:car:(\d+)(?::([a-zA-Z0-9_-]+))?$/.exec(str);
    if (mCar) return { type: 'car', idx: parseInt(mCar[1], 10), model: mCar[2] || null };
    return null;
}

function isDonateTradeToken(s) {
    return !!parseDonateToken(s);
}

function decodeTradeIc1Token(raw) {
    const base = String(raw || '').split('(')[0].trim();
    if (!base.startsWith('ic1.')) return null;
    try {
        return JSON.parse(Buffer.from(base.slice(4), 'base64').toString('utf8'));
    } catch (_e) {
        return null;
    }
}

function tradeBagStorageKeysForToken(player, raw) {
    const base = String(raw || '').replace(/^\uFEFF/, '').trim().split('(')[0].trim();
    const sid = player && player.static != null ? String(player.static) : '0';
    const keys = [];
    if (base.startsWith('trade_donate:bag:')) {
        const d = parseDonateToken(base);
        if (d && d.type === 'bag') keys.push(`ivbag:${d.key}:s${sid}`);
        return keys;
    }
    if (base.startsWith('ivbag:')) {
        const k = base.slice(6);
        if (k) keys.push(`ivbag:${k}:s${sid}`);
        return keys;
    }
    if (base.startsWith('ic1.')) {
        const pl = decodeTradeIc1Token(base);
        if (!pl || Number(pl.cid) !== 8) return keys;
        const inst = pl.bagInst != null ? parseInt(String(pl.bagInst), 10) : NaN;
        if (Number.isFinite(inst) && inst > 0) keys.push(`baginst:${inst}`);
        const iid = Number.isFinite(Number(pl.iid)) ? Number(pl.iid) : 0;
        const d = Number(pl.d);
        const t = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
        if (Number.isFinite(d)) {
            keys.push(`ic1bag:${pl.cid}:${iid}:${d}:${t}:s${sid}`);
            keys.push(`bagped:${d}:${t}:s${sid}`);
        }
    }
    return keys;
}

function tradeBagTokenHasContents(player, raw) {
    if (!player || !mp.players.exists(player)) return false;
    if (typeof raw !== 'string') return false;
    const base = raw.replace(/^\uFEFF/, '').trim().split('(')[0].trim();
    if (!(base.startsWith('ivbag:') || base.startsWith('ic1.') || base.startsWith('trade_donate:bag:'))) return false;
    if (typeof global.syncBagContentsArrayToCapacity === 'function') {
        try {
            global.syncBagContentsArrayToCapacity(player);
        } catch (_e) {}
    }
    const keys = tradeBagStorageKeysForToken(player, raw);
    const store = player._bagStorageByKey && typeof player._bagStorageByKey === 'object' ? player._bagStorageByKey : {};
    for (const k of keys) {
        const arr = store[k];
        if (Array.isArray(arr) && arr.some((c) => c != null && c !== '')) return true;
    }
    const activeKey = typeof global.computeBagInventoryStorageKey === 'function' ? global.computeBagInventoryStorageKey(player) : null;
    if (activeKey && keys.indexOf(activeKey) >= 0 && Array.isArray(player._bagContentsFull)) {
        return player._bagContentsFull.some((c) => c != null && c !== '');
    }
    return false;
}

function loadTradeDonateSnapshot(player, cb) {
    if (!player || player.static == null || player.static === undefined) {
        return cb && cb(defaultDonateSnapshot());
    }
    global.DB.query(
        'SELECT cobura, coburaw, cars FROM accounts WHERE static = ?',
        [player.static],
        (err, results) => {
            if (err || !results || !results.length) return cb && cb(defaultDonateSnapshot());
            const r = global.mergeAccountRowDonateDefaults(results[0]);
            const snap = defaultDonateSnapshot();
            snap.cobura = holsterCountFromDbValue(r.cobura);
            snap.coburaw = holsterCountFromDbValue(r.coburaw);
            for (const k of tradeLegacyBagKeysOrdered()) {
                snap.bags[k] = r[k] === true || r[k] === 'true';
            }
            try {
                snap.cars = global.normalizeCarsArray(JSON.parse(r.cars || '[]'));
            } catch (e) {
                snap.cars = [];
            }
            cb(snap);
        }
    );
}

function getTradeDonateExtraInvTokens(snap) {
    const extras = [];
    if (!snap) return extras;
    for (const col of ['cobura', 'coburaw']) {
        const c = Math.min(snap[col] || 0, 1);
        for (let i = 0; i < c; i++) extras.push(`trade_donate:holster:${col}:${i}`);
    }
    for (const bk of tradeLegacyBagKeysOrdered()) {
        if (snap.bags && snap.bags[bk]) extras.push(`trade_donate:bag:${bk}`);
    }
    /* Транспорт в обмене отключён */
    return extras;
}

/** Колонки кобуры, для которых в обмене уже есть trade_donate:holster — тогда ivhol:* из инвентаря не показываем (один вид «донат»). */
function tradeSnapshotHolsterDonateCols(extras) {
    const set = new Set();
    if (!Array.isArray(extras)) return set;
    for (const t of extras) {
        const m = /^trade_donate:holster:(cobura|coburaw):/.exec(String(t || ''));
        if (m) set.add(m[1]);
    }
    return set;
}

function tradeInvKeepIvholRowForSnapshot(item, donateHolsterCols) {
    if (typeof item !== 'string' || !item) return true;
    const base = String(item.replace(/^\uFEFF/, '').split('(')[0].trim());
    if (!base.startsWith('ivhol:')) return true;
    const col = base.slice(6);
    if (col !== 'cobura' && col !== 'coburaw') return true;
    return !donateHolsterCols.has(col);
}

function getTradeInvSnapshot(player) {
    const extras = getTradeDonateExtraInvTokens(player.tradeDonateSnapshot);
    const holDon = tradeSnapshotHolsterDonateCols(extras);
    const inv = Array.isArray(player.inventory) ? player.inventory.slice().filter((it) => tradeInvKeepIvholRowForSnapshot(it, holDon)) : [];
    const merged = inv.concat(extras);
    return merged.filter((it) => !(typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, it)));
}

function tradeStackOfferable(player) {
    if (typeof global.countStackBaseUnblockedForSale === 'function') {
        return {
            item_spank: global.countStackBaseUnblockedForSale(player, 'item_spank'),
            item_alco: global.countStackBaseUnblockedForSale(player, 'item_alco')
        };
    }
    return {
        item_spank: countStackBase(player, 'item_spank'),
        item_alco: countStackBase(player, 'item_alco')
    };
}

function clearTradeDonateSnapshot(player) {
    if (player && mp.players.exists(player)) player.tradeDonateSnapshot = null;
}

function holsterGiveCount(items) {
    const o = { cobura: 0, coburaw: 0 };
    for (const it of items) {
        const d = parseDonateToken(it);
        if (d && d.type === 'holster') o[d.col]++;
    }
    return o;
}

function validateDonateNet(snap, giveItems, recvItems) {
    if (!snap) return false;
    const h = { cobura: snap.cobura || 0, coburaw: snap.coburaw || 0 };
    const g = holsterGiveCount(giveItems);
    const r = holsterGiveCount(recvItems);
    for (const col of ['cobura', 'coburaw']) {
        const v = h[col] - g[col] + r[col];
        if (v < 0 || v > 1) return false;
    }
    const bags = { ...snap.bags };
    for (const it of giveItems) {
        const d = parseDonateToken(it);
        if (d && d.type === 'bag') {
            if (!bags[d.key]) return false;
            bags[d.key] = false;
        }
    }
    for (const it of recvItems) {
        const d = parseDonateToken(it);
        if (d && d.type === 'bag') {
            if (bags[d.key]) return false;
            bags[d.key] = true;
        }
    }
    return true;
}

function validateCarOfferIndices(player, items) {
    const snap = player.tradeDonateSnapshot;
    if (!snap) return false;
    const cars = snap.cars || [];
    const idxs = [];
    for (const it of items) {
        const d = parseDonateToken(it);
        if (d && d.type === 'car') idxs.push(d.idx);
    }
    const seen = new Set();
    for (const i of idxs.sort((a, b) => a - b)) {
        if (seen.has(i)) return false;
        seen.add(i);
        if (i < 0 || i >= cars.length) return false;
    }
    return true;
}

function validateDonateTradeExchange(pa, pb, itemsA, itemsB) {
    if (!validateDonateNet(pa.tradeDonateSnapshot, itemsA, itemsB)) return false;
    if (!validateDonateNet(pb.tradeDonateSnapshot, itemsB, itemsA)) return false;
    if (!validateCarOfferIndices(pa, itemsA)) return false;
    if (!validateCarOfferIndices(pb, itemsB)) return false;
    return true;
}

function countTradeItemOwned(player, item) {
    const st = parseStackToken(item);
    if (st)
        return typeof global.countStackBaseUnblockedForSale === 'function'
            ? global.countStackBaseUnblockedForSale(player, st.base)
            : countStackBase(player, st.base);
    const d = parseDonateToken(item);
    if (d) {
        const snap = player.tradeDonateSnapshot;
        if (!snap) return 0;
        if (d.type === 'holster') {
            const c = Math.min(snap[d.col] || 0, 1);
            if (!(d.idx >= 0 && d.idx < c)) return 0;
            const pseudoTok = `trade_donate:holster:${d.col}:${d.idx}`;
            if (typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, pseudoTok)) return 0;
            return 1;
        }
        if (d.type === 'bag') {
            if (!(snap.bags && snap.bags[d.key])) return 0;
            const pseudoTok = `trade_donate:bag:${d.key}`;
            if (typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, pseudoTok)) return 0;
            return 1;
        }
        if (d.type === 'car') {
            const cars = snap.cars || [];
            return d.idx >= 0 && d.idx < cars.length ? 1 : 0;
        }
    }
    return countItemInPossession(player, item);
}

/** Снимает кобуры с обоих, затем выдаёт — иначе при обмене «чёрная ↔ белая» кратковременно было бы 2 кобуры у одного. */
function applyHolsterTradeMoves(pa, pb, itemsA, itemsB) {
    const sa = pa && pa.tradeDonateSnapshot;
    const sb = pb && pb.tradeDonateSnapshot;
    if (!sa || !sb) return false;
    const holA = itemsA.map(parseDonateToken).filter((d) => d && d.type === 'holster');
    const holB = itemsB.map(parseDonateToken).filter((d) => d && d.type === 'holster');
    for (const d of holA) {
        if ((sa[d.col] || 0) <= 0) return false;
    }
    for (const d of holB) {
        if ((sb[d.col] || 0) <= 0) return false;
    }
    for (const d of holA) sa[d.col]--;
    for (const d of holB) sb[d.col]--;
    for (const d of holA) {
        if ((sb[d.col] || 0) >= 1) return false;
        sb[d.col]++;
    }
    for (const d of holB) {
        if ((sa[d.col] || 0) >= 1) return false;
        sa[d.col]++;
    }
    return true;
}

function applyDonateMoves(from, to, items, opts) {
    const skipHolster = opts && opts.skipHolster;
    const snapF = from.tradeDonateSnapshot;
    const snapT = to.tradeDonateSnapshot;
    if (!snapF || !snapT) return false;
    const donateItems = items.filter((it) => parseDonateToken(it));
    const carToks = donateItems.filter((t) => parseDonateToken(t).type === 'car').sort((a, b) => parseDonateToken(b).idx - parseDonateToken(a).idx);
    let rest = donateItems.filter((t) => parseDonateToken(t).type !== 'car');
    if (skipHolster) rest = rest.filter((t) => parseDonateToken(t).type !== 'holster');
    for (const t of carToks) {
        const p = parseDonateToken(t);
        const fcars = snapF.cars || [];
        if (p.idx < 0 || p.idx >= fcars.length) return false;
        const entry = fcars.splice(p.idx, 1)[0];
        if (!snapT.cars) snapT.cars = [];
        snapT.cars.push(entry);
    }
    for (const t of rest) {
        const d = parseDonateToken(t);
        if (d.type === 'holster') {
            if ((snapF[d.col] || 0) <= 0) return false;
            if ((snapT[d.col] || 0) >= 1) return false;
            snapF[d.col]--;
            snapT[d.col]++;
        } else if (d.type === 'bag') {
            if (!snapF.bags[d.key]) return false;
            if (snapT.bags[d.key]) return false;
            snapF.bags[d.key] = false;
            snapT.bags[d.key] = true;
        }
    }
    return true;
}

function persistDonateSnapshot(player, done) {
    const snap = player.tradeDonateSnapshot;
    if (!snap || !player.static) {
        if (done) done();
        return;
    }
    const carsJson = global.serializeCarsForDb(snap.cars || []);
    global.DB.query(
        'UPDATE accounts SET cobura = ?, coburaw = ?, bag_antisocial = ?, bag_anime = ?, bag_grob = ?, bag_big_black = ?, bag_big_white = ?, bag_waist = ?, cars = ? WHERE static = ?',
        [
            String(snap.cobura || 0),
            String(snap.coburaw || 0),
            snap.bags.bag_antisocial ? 'true' : 'false',
            snap.bags.bag_anime ? 'true' : 'false',
            snap.bags.bag_grob ? 'true' : 'false',
            snap.bags.bag_big_black ? 'true' : 'false',
            snap.bags.bag_big_white ? 'true' : 'false',
            snap.bags.bag_waist ? 'true' : 'false',
            carsJson,
            player.static
        ],
        () => {
            try {
                player.call('carsLoad:CLIENT', [global.carsPayloadForClient(carsJson)]);
            } catch (e) {}
            for (const col of ['cobura', 'coburaw']) {
                if ((snap[col] || 0) <= 0) {
                    const vals = coburaAccessoryClearStrs[col];
                    if (vals) {
                        for (const accValue of vals) {
                            global.DB.query('UPDATE clothes SET accessories = ? WHERE accessories = ? AND static = ?', [null, accValue, player.static], () => {});
                        }
                    }
                }
            }
            if (done) done();
        }
    );
}

function clearSessionDonateSnapshots(session) {
    if (!session) return;
    const pa = mp.players.toArray().find((p) => String(p.static) === String(session.a));
    const pb = mp.players.toArray().find((p) => String(p.static) === String(session.b));
    clearTradeDonateSnapshot(pa);
    clearTradeDonateSnapshot(pb);
}

function cloneTradeDonateSnapshot(snap) {
    if (!snap) return null;
    try {
        return JSON.parse(JSON.stringify(snap));
    } catch (_e) {
        return null;
    }
}

function restoreTradeDonateSnapshot(player, snap) {
    if (player && mp.players.exists(player) && snap) player.tradeDonateSnapshot = cloneTradeDonateSnapshot(snap);
}

function rollbackTradeDonateSnapshots(pa, pb, backup) {
    if (!backup) return;
    restoreTradeDonateSnapshot(pa, backup.pa);
    restoreTradeDonateSnapshot(pb, backup.pb);
}

function isTradeSessionActive(key, session) {
    return !!session && !session.cancelled && tradeSessions.get(key) === session;
}

function tradeSessionKey(s1, s2) {
    const a = Number(s1);
    const b = Number(s2);
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function findTradeSession(player) {
    const st = String(player.static);
    for (const [k, s] of tradeSessions) {
        if (String(s.a) === st || String(s.b) === st) return { key: k, session: s };
    }
    return null;
}

function getPartnerStatic(session, staticStr) {
    const st = String(staticStr);
    return st === String(session.a) ? String(session.b) : String(session.a);
}

function parseStackToken(s) {
    const m = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(s));
    if (!m) return null;
    const qty = parseInt(m[2], 10);
    if (isNaN(qty) || qty < 1) return null;
    return { base: m[1], qty };
}

function parseTradeFamilyMansionToken(s) {
    const m = /^trade_family:mansion:(\d+)$/.exec(String(s));
    if (!m) return null;
    const id = parseInt(m[1], 10);
    if (!Number.isFinite(id) || id < 1) return null;
    return id;
}

/** @returns {{ ok: boolean, id: number|null }} id=null если в оффере нет особняка; ok=false если два разных id */
function extractSingleMansionIdFromOffer(items) {
    if (!Array.isArray(items)) return { ok: true, id: null };
    let found = null;
    for (const it of items) {
        const mid = parseTradeFamilyMansionToken(it);
        if (mid != null) {
            if (found != null && found !== mid) return { ok: false, id: null };
            found = mid;
        }
    }
    return { ok: true, id: found };
}

function getTradeFamilyDbId(familyName, cb) {
    const n = String(familyName || '').trim();
    if (!n) return cb(new Error('no'));
    global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [n], (err, rows) => {
        if (err || !rows || !rows[0]) return cb(err || new Error('no'));
        cb(null, Number(rows[0].id));
    });
}

function executeTradeMansionTransfers(pa, pb, itemsA, itemsB, done) {
    const aE = extractSingleMansionIdFromOffer(itemsA);
    const bE = extractSingleMansionIdFromOffer(itemsB);
    if (!aE.ok || !bE.ok) return done(new Error('multi'));
    const Ga = aE.id;
    const Gb = bE.id;
    if (Ga == null && Gb == null) return done(null);
    if (Number(pa.famRank) !== 10 || Number(pb.famRank) !== 10) return done(new Error('rank'));
    const fa = String(pa.family || '').trim();
    const fb = String(pb.family || '').trim();
    if (!fa || !fb) return done(new Error('fam'));
    getTradeFamilyDbId(fa, (e1, idA) => {
        if (e1 || !idA) return done(e1 || new Error('db'));
        getTradeFamilyDbId(fb, (e2, idB) => {
            if (e2 || !idB) return done(e2 || new Error('db'));
            global.DB.query(
                'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
                [idA],
                (e3, aRow) => {
                    const aHas = !e3 && aRow && aRow[0] ? Number(aRow[0].mansion_id) : null;
                    global.DB.query(
                        'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
                        [idB],
                        (e4, bRow) => {
                            const bHas = !e4 && bRow && bRow[0] ? Number(bRow[0].mansion_id) : null;
                            if (Ga != null && aHas !== Ga) return done(new Error('own'));
                            if (Gb != null && bHas !== Gb) return done(new Error('own'));
                            let aFinal = aHas;
                            if (Ga != null) {
                                if (aFinal !== Ga) return done(new Error('own'));
                                aFinal = null;
                            }
                            if (Gb != null) {
                                if (aFinal != null) return done(new Error('two'));
                                aFinal = Gb;
                            }
                            let bFinal = bHas;
                            if (Gb != null) {
                                if (bFinal !== Gb) return done(new Error('own'));
                                bFinal = null;
                            }
                            if (Ga != null) {
                                if (bFinal != null) return done(new Error('two'));
                                bFinal = Ga;
                            }
                            global.DB.query(
                                'DELETE FROM family_mansion_ownership WHERE family_id = ? OR family_id = ?',
                                [idA, idB],
                                (e5) => {
                                    if (e5) return done(e5);
                                    const tasks = [];
                                    if (aFinal != null && Number.isFinite(aFinal)) tasks.push([aFinal, idA]);
                                    if (bFinal != null && Number.isFinite(bFinal)) tasks.push([bFinal, idB]);
                                    const afterAll = () => {
                                        try {
                                            if (typeof global.broadcastMansionSyncAllPlayers === 'function') {
                                                global.broadcastMansionSyncAllPlayers();
                                            }
                                        } catch (_eB) {}
                                        done(null);
                                    };
                                    if (tasks.length === 0) return afterAll();
                                    let left = tasks.length;
                                    for (const pair of tasks) {
                                        global.DB.query(
                                            'INSERT INTO family_mansion_ownership (mansion_id, family_id) VALUES (?, ?)',
                                            pair,
                                            () => {
                                                left--;
                                                if (left <= 0) afterAll();
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

function countStackBase(player, base) {
    let sum = 0;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const x of arr) {
            if (!x) continue;
            const xs = String(x);
            if (xs === base) sum += 1;
            else if (xs.startsWith(base + ' (')) {
                const mm = xs.match(/\((\d+)\)/);
                sum += mm ? parseInt(mm[1], 10) : 0;
            }
        }
    };
    scan(player.inventory);
    scan(player.fastSlots);
    return sum;
}

function stackQtyInOffer(list, base) {
    if (!Array.isArray(list)) return 0;
    let q = 0;
    for (const it of list) {
        const st = parseStackToken(it);
        if (st && st.base === base) q += st.qty;
    }
    return q;
}

function removeStackQty(player, base, qty) {
    let left = qty;
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const invItem = player.inventory[i] || '';
        if (invItem === base) {
            player.inventory.splice(i, 1);
            i--;
            left--;
            continue;
        }
        if (invItem.startsWith(base + ' (')) {
            const match = invItem.match(/\((\d+)\)/);
            const count = match ? parseInt(match[1], 10) : 1;
            if (count <= left) {
                player.inventory.splice(i, 1);
                i--;
                left -= count;
            } else {
                player.inventory[i] = `${base} (${count - left})`;
                left = 0;
            }
        }
    }
    return left === 0;
}

function addStackQty(player, base, qty) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    let toAdd = qty;
    for (let i = 0; i < player.inventory.length && toAdd > 0; i++) {
        const invItem = player.inventory[i] || '';
        if (invItem === base || invItem.startsWith(base + ' (')) {
            const match = invItem.match(/\((\d+)\)/);
            const count = match ? parseInt(match[1], 10) : 1;
            const space = 500 - count;
            if (space > 0) {
                const addNow = Math.min(space, toAdd);
                player.inventory[i] = `${base} (${count + addNow})`;
                toAdd -= addNow;
            }
        }
    }
    while (toAdd > 0) {
        const chunk = Math.min(500, toAdd);
        player.inventory.push(`${base} (${chunk})`);
        toAdd -= chunk;
    }
}

function canTakeItemsForTrade(player, list) {
    const weaponNeed = {};
    const stackNeed = {};
    if (!Array.isArray(list)) return true;
    for (const it of list) {
        if (parseTradeFamilyMansionToken(it)) continue;
        const st = parseStackToken(it);
        if (st) {
            stackNeed[st.base] = (stackNeed[st.base] || 0) + st.qty;
        } else {
            weaponNeed[it] = (weaponNeed[it] || 0) + 1;
        }
    }
    for (const k of Object.keys(weaponNeed)) {
        if (countTradeItemOwned(player, k) < weaponNeed[k]) return false;
    }
    for (const b of Object.keys(stackNeed)) {
        const have =
            typeof global.countStackBaseUnblockedForSale === 'function'
                ? global.countStackBaseUnblockedForSale(player, b)
                : countStackBase(player, b);
        if (have < stackNeed[b]) return false;
    }
    return true;
}

function isTradeableItemServer(item) {
    if (!item || typeof item !== 'string') return false;
    if (item.startsWith('kpl.')) return !!(global.decodeKeplerLegacyItem && global.decodeKeplerLegacyItem(item));
    if (parseTradeFamilyMansionToken(item)) return false;
    const donateTok = parseDonateToken(item);
    if (donateTok) return donateTok.type !== 'car';
    if (parseStackToken(item)) return true;
    if (item.startsWith('ic1.')) return true;
    if (item.startsWith('ivhol:') || item.startsWith('ivbag:')) return true;
    if (item === 'weapon_revolver') return false;
    const base = item.split('(')[0].trim();
    if (item === 'Бронежилет' || base === 'Бронежилет') return false;
    if (base === 'item_spank' || base === 'item_alco') return false;
    if (!base.startsWith('weapon_')) return false;
    return true;
}

function countItemInPossession(player, item) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    const hidden = (cell) =>
        typeof global.inventoryItemHiddenFromTransferLists === 'function' && global.inventoryItemHiddenFromTransferLists(player, String(cell || ''));
    if (typeof item === 'string' && (item.startsWith('ivhol:') || item.startsWith('ivbag:'))) {
        if (hidden(item)) return 0;
        if (typeof global.countInventoryDonateNormalized === 'function') {
            return global.countInventoryDonateNormalized(player, item);
        }
    }
    if (typeof item === 'string' && hidden(item)) return 0;
    let n = 0;
    for (const x of player.inventory) if (x === item && !hidden(x)) n++;
    for (const x of player.fastSlots) if (x === item && !hidden(x)) n++;
    return n;
}

function countItemInOfferList(list, item) {
    if (!Array.isArray(list)) return 0;
    let n = 0;
    for (const x of list) if (x === item) n++;
    return n;
}

function removeOneTradeItem(player, item) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    if (typeof item === 'string' && (item.startsWith('ivhol:') || item.startsWith('ivbag:'))) {
        if (typeof global.removeFirstInventoryDonate === 'function' && global.removeFirstInventoryDonate(player, item)) {
            return true;
        }
    }
    if (typeof item === 'string' && item.startsWith('ic1.')) {
        if (typeof global.removeOneInventoryExact === 'function' && global.removeOneInventoryExact(player, item)) {
            if (typeof global.stripDonateBagInstanceLocalStorage === 'function') {
                global.stripDonateBagInstanceLocalStorage(player, item);
            }
            return true;
        }
    }
    const idx = player.inventory.indexOf(item);
    if (idx !== -1) {
        player.inventory.splice(idx, 1);
        return true;
    }
    for (let i = 0; i < player.fastSlots.length; i++) {
        if (player.fastSlots[i] === item) {
            player.fastSlots[i] = '';
            try {
                player.removeAllWeapons();
            } catch (_e) {}
            if (typeof item === 'string' && item.startsWith('ic1.') && typeof global.stripDonateBagInstanceLocalStorage === 'function') {
                global.stripDonateBagInstanceLocalStorage(player, item);
            }
            return true;
        }
    }
    return false;
}

function addTradeItem(player, item) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    player.inventory.push(item);
}

function removeTradeItemFromPlayer(player, item) {
    if (parseTradeFamilyMansionToken(item)) return true;
    const st = parseStackToken(item);
    if (st) return removeStackQty(player, st.base, st.qty);
    if (parseDonateToken(item)) return true;
    return removeOneTradeItem(player, item);
}

function addTradeItemToPlayer(player, item) {
    if (parseTradeFamilyMansionToken(item)) return true;
    const st = parseStackToken(item);
    if (st) {
        addStackQty(player, st.base, st.qty);
        return true;
    }
    if (parseDonateToken(item)) return true;
    if (typeof item === 'string' && (item.startsWith('ic1.') || item.startsWith('ivhol:') || item.startsWith('ivbag:'))) {
        if (global.tryPushInventoryItem) {
            return global.tryPushInventoryItem(player, item);
        }
        addTradeItem(player, item);
        return true;
    }
    addTradeItem(player, item);
    return true;
}

function broadcastTradeSync(session) {
    const sa = String(session.a);
    const sb = String(session.b);
    const pa = mp.players.toArray().find((p) => String(p.static) === sa);
    const pb = mp.players.toArray().find((p) => String(p.static) === sb);
    const sendTo = (p, meStatic) => {
        if (!p || !mp.players.exists(p)) return;
        const partner = String(meStatic) === sa ? sb : sa;
        const payload = {
            myItems: (session.offer[meStatic] && session.offer[meStatic].items) ? session.offer[meStatic].items.slice() : [],
            myMoney: session.offer[meStatic] ? session.offer[meStatic].money : 0,
            partnerItems: (session.offer[partner] && session.offer[partner].items) ? session.offer[partner].items.slice() : [],
            partnerMoney: session.offer[partner] ? session.offer[partner].money : 0,
            myReady: !!session.ready[meStatic],
            partnerReady: !!session.ready[partner],
            invSnapshot: getTradeInvSnapshot(p),
            stackTradeable: tradeStackOfferable(p),
            moneyBalance: Number(p.money) || 0,
            mansionTradeable: false
        };
        p.call('trade:sync', [JSON.stringify(payload)]);
    };
    if (pa && mp.players.exists(pa)) sendTo(pa, sa);
    if (pb && mp.players.exists(pb)) sendTo(pb, sb);
}

function endTradeSession(key, notifyA, notifyB, msgA, msgB) {
    const session = tradeSessions.get(key);
    if (session) clearSessionDonateSnapshots(session);
    tradeSessions.delete(key);
    const sa = session ? String(session.a) : null;
    const sb = session ? String(session.b) : null;
    const pa = sa ? mp.players.toArray().find((p) => String(p.static) === sa) : null;
    const pb = sb ? mp.players.toArray().find((p) => String(p.static) === sb) : null;
    if (notifyA && pa && mp.players.exists(pa)) {
        pa.call('trade:close');
        if (msgA) isNotify(pa, 1, 'top-mid', msgA, 3500);
    }
    if (notifyB && pb && mp.players.exists(pb)) {
        pb.call('trade:close');
        if (msgB) isNotify(pb, 1, 'top-mid', msgB, 3500);
    }
}

function executeTradeMoneyAtomic(pa, pb, moneyA, moneyB, cb) {
    if (typeof global.economySpendMoney !== 'function' || typeof global.economyAddMoney !== 'function') {
        cb(new Error('economy_unavailable'));
        return;
    }
    const refundA = () => { if (moneyA > 0) global.economyAddMoney(pa, moneyA, () => {}); };
    const refundB = () => { if (moneyB > 0) global.economyAddMoney(pb, moneyB, () => {}); };

    const spendA = (next) => {
        if (moneyA <= 0) return next(null);
        global.economySpendMoney(pa, moneyA, (err, ok) => next(err || !ok ? new Error('moneyA') : null));
    };
    const spendB = (next) => {
        if (moneyB <= 0) return next(null);
        global.economySpendMoney(pb, moneyB, (err, ok) => next(err || !ok ? new Error('moneyB') : null));
    };
    const creditA = (next) => {
        if (moneyB <= 0) return next(null);
        global.economyAddMoney(pa, moneyB, (err) => next(err || null));
    };
    const creditB = (next) => {
        if (moneyA <= 0) return next(null);
        global.economyAddMoney(pb, moneyA, (err) => next(err || null));
    };

    spendA((e1) => {
        if (e1) return cb(e1);
        spendB((e2) => {
            if (e2) { refundA(); return cb(e2); }
            creditA((e3) => {
                if (e3) { refundA(); refundB(); return cb(e3); }
                creditB((e4) => {
                    if (e4) {
                        refundA(); refundB();
                        if (moneyB > 0) global.economySpendMoney(pa, moneyB, () => {});
                        return cb(e4);
                    }
                    cb(null);
                });
            });
        });
    });
}

function tryExecuteTrade(session, key) {
    const sa = String(session.a);
    const sb = String(session.b);
    if (!session.ready[sa] || !session.ready[sb]) return;
    if (session.executing === true) return;
    session.executing = true;

    const abortTradeExecute = (resetReady) => {
        session.executing = false;
        if (resetReady) {
            session.ready[sa] = false;
            session.ready[sb] = false;
            broadcastTradeSync(session);
        }
    };

    const pa = mp.players.toArray().find((p) => String(p.static) === sa);
    const pb = mp.players.toArray().find((p) => String(p.static) === sb);
    if (!pa || !mp.players.exists(pa) || !pb || !mp.players.exists(pb)) {
        session.executing = false;
        endTradeSession(key, true, true, 'Обмен отменён.', 'Обмен отменён.');
        return;
    }

    if (serverPlayersDistance(pa, pb) > 5) {
        session.executing = false;
        endTradeSession(key, true, true, 'Игрок слишком далеко. Обмен отменён.', 'Игрок слишком далеко. Обмен отменён.');
        return;
    }

    const oa = session.offer[sa];
    const ob = session.offer[sb];
    const moneyA = Math.max(0, parseInt(oa.money, 10) || 0);
    const moneyB = Math.max(0, parseInt(ob.money, 10) || 0);

    const itemsA = Array.isArray(oa.items) ? oa.items.slice() : [];
    const itemsB = Array.isArray(ob.items) ? ob.items.slice() : [];

    for (const it of itemsA) {
        if (!isTradeableItemServer(it)) {
            isNotify(pa, 2, 'top-mid', 'В обмене есть недопустимый предмет.', 3000);
            isNotify(pb, 2, 'top-mid', 'В обмене есть недопустимый предмет.', 3000);
            session.ready[sa] = false;
            session.ready[sb] = false;
            broadcastTradeSync(session);
            abortTradeExecute(true);
            return;
        }
    }
    for (const it of itemsB) {
        if (!isTradeableItemServer(it)) {
            isNotify(pa, 2, 'top-mid', 'В обмене есть недопустимый предмет.', 3000);
            isNotify(pb, 2, 'top-mid', 'В обмене есть недопустимый предмет.', 3000);
            session.ready[sa] = false;
            session.ready[sb] = false;
            broadcastTradeSync(session);
            abortTradeExecute(true);
            return;
        }
    }

    const wornFastMsg = 'Снимите предмет с экипировки или из быстрого слота — такие вещи нельзя отдавать в обмене.';
    const nonEmptyBagMsg = 'Сначала освободите сумку — сумку с предметами внутри нельзя отдавать в обмене.';
    if (typeof global.inventoryItemIsBlockedForTransfer === 'function') {
        for (const it of itemsA) {
            if (isDonateTradeToken(it)) continue;
            if (parseStackToken(it)) continue;
            if (parseTradeFamilyMansionToken(it)) continue;
            if (global.inventoryItemIsBlockedForTransfer(pa, it)) {
                isNotify(pa, 2, 'top-mid', wornFastMsg, 4500);
                isNotify(pb, 2, 'top-mid', wornFastMsg, 4500);
                session.ready[sa] = false;
                session.ready[sb] = false;
                broadcastTradeSync(session);
                abortTradeExecute(true);
                return;
            }
        }
        for (const it of itemsB) {
            if (isDonateTradeToken(it)) continue;
            if (parseStackToken(it)) continue;
            if (parseTradeFamilyMansionToken(it)) continue;
            if (global.inventoryItemIsBlockedForTransfer(pb, it)) {
                isNotify(pa, 2, 'top-mid', wornFastMsg, 4500);
                isNotify(pb, 2, 'top-mid', wornFastMsg, 4500);
                session.ready[sa] = false;
                session.ready[sb] = false;
                broadcastTradeSync(session);
                abortTradeExecute(true);
                return;
            }
        }
    }
    for (const it of itemsA) {
        if (tradeBagTokenHasContents(pa, it)) {
            isNotify(pa, 2, 'top-mid', nonEmptyBagMsg, 4500);
            isNotify(pb, 2, 'top-mid', nonEmptyBagMsg, 4500);
            session.ready[sa] = false;
            session.ready[sb] = false;
            broadcastTradeSync(session);
            abortTradeExecute(true);
            return;
        }
    }
    for (const it of itemsB) {
        if (tradeBagTokenHasContents(pb, it)) {
            isNotify(pa, 2, 'top-mid', nonEmptyBagMsg, 4500);
            isNotify(pb, 2, 'top-mid', nonEmptyBagMsg, 4500);
            session.ready[sa] = false;
            session.ready[sb] = false;
            broadcastTradeSync(session);
            abortTradeExecute(true);
            return;
        }
    }

    if (!canTakeItemsForTrade(pa, itemsA) || !canTakeItemsForTrade(pb, itemsB)) {
        isNotify(pa, 2, 'top-mid', 'Предметы изменились — обмен отменён.', 3000);
        isNotify(pb, 2, 'top-mid', 'Предметы изменились — обмен отменён.', 3000);
        abortTradeExecute(true);
        return;
    }

    if (!validateDonateTradeExchange(pa, pb, itemsA, itemsB)) {
        isNotify(pa, 2, 'top-mid', 'Условия обмена донат-предметами не выполняются.', 3000);
        isNotify(pb, 2, 'top-mid', 'Условия обмена донат-предметами не выполняются.', 3000);
        abortTradeExecute(true);
        return;
    }

    let balA = Number(pa.money);
    let balB = Number(pb.money);
    if (balA < moneyA || balB < moneyB) {
        isNotify(pa, 2, 'top-mid', 'Недостаточно средств для обмена.', 3000);
        isNotify(pb, 2, 'top-mid', 'Недостаточно средств для обмена.', 3000);
        abortTradeExecute(true);
        return;
    }

    const donateSnapBackup = {
        pa: cloneTradeDonateSnapshot(pa.tradeDonateSnapshot),
        pb: cloneTradeDonateSnapshot(pb.tradeDonateSnapshot)
    };
    session.donateSnapBackup = donateSnapBackup;

    if (!applyDonateMoves(pa, pb, itemsA, { skipHolster: true }) || !applyDonateMoves(pb, pa, itemsB, { skipHolster: true })) {
        rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
        isNotify(pa, 2, 'top-mid', 'Не удалось завершить обмен донатом.', 4000);
        isNotify(pb, 2, 'top-mid', 'Не удалось завершить обмен донатом.', 4000);
        abortTradeExecute(true);
        return;
    }
    if (!applyHolsterTradeMoves(pa, pb, itemsA, itemsB)) {
        rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
        isNotify(pa, 2, 'top-mid', 'Не удалось завершить обмен донатом (кабуры).', 4000);
        isNotify(pb, 2, 'top-mid', 'Не удалось завершить обмен донатом (кабуры).', 4000);
        abortTradeExecute(true);
        return;
    }

    executeTradeMansionTransfers(pa, pb, itemsA, itemsB, (mErr) => {
        if (!isTradeSessionActive(key, session)) {
            rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
            session.executing = false;
            return;
        }
        if (mErr) {
            rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
            isNotify(pa, 2, 'top-mid', 'Обмен особняком не выполнен (лидерство / владение).', 4500);
            isNotify(pb, 2, 'top-mid', 'Обмен особняком не выполнен (лидерство / владение).', 4500);
            abortTradeExecute(true);
            return;
        }
        if (!mp.players.exists(pa) || !mp.players.exists(pb) || !isTradeSessionActive(key, session)) {
            rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
            session.executing = false;
            endTradeSession(key, true, true, 'Обмен отменён.', 'Обмен отменён.');
            return;
        }

        executeTradeMoneyAtomic(pa, pb, moneyA, moneyB, (moneyErr) => {
            if (!isTradeSessionActive(key, session)) {
                rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
                session.executing = false;
                return;
            }
            if (moneyErr) {
                rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
                isNotify(pa, 2, 'top-mid', 'Недостаточно средств для обмена.', 3000);
                isNotify(pb, 2, 'top-mid', 'Недостаточно средств для обмена.', 3000);
                abortTradeExecute(true);
                return;
            }
            if (!mp.players.exists(pa) || !mp.players.exists(pb)) {
                rollbackTradeDonateSnapshots(pa, pb, donateSnapBackup);
                session.executing = false;
                endTradeSession(key, true, true, 'Обмен отменён.', 'Обмен отменён.');
                return;
            }

    for (const it of itemsA) {
        if (!parseDonateToken(it)) removeTradeItemFromPlayer(pa, it);
    }
    for (const it of itemsB) {
        if (!parseDonateToken(it)) removeTradeItemFromPlayer(pb, it);
    }

    for (const it of itemsB) {
        if (!parseDonateToken(it)) addTradeItemToPlayer(pa, it);
    }
    for (const it of itemsA) {
        if (!parseDonateToken(it)) addTradeItemToPlayer(pb, it);
    }

    function runTradeBagOwnershipTransfersThen(cb) {
        const pairs = [];
        for (const it of itemsB) {
            if (!parseDonateToken(it) && typeof it === 'string' && it.startsWith('ic1.')) pairs.push([it, pa.static]);
            if (typeof it === 'string' && /^item_skateboard#\d+/i.test(it.split('(')[0].trim())) pairs.push([it, pa.static]);
        }
        for (const it of itemsA) {
            if (!parseDonateToken(it) && typeof it === 'string' && it.startsWith('ic1.')) pairs.push([it, pb.static]);
            if (typeof it === 'string' && /^item_skateboard#\d+/i.test(it.split('(')[0].trim())) pairs.push([it, pb.static]);
        }
        let i = 0;
        function step() {
            if (i >= pairs.length) return cb();
            const pr = pairs[i++];
            if (typeof pr[0] === 'string' && /^item_skateboard#\d+/i.test(pr[0].split('(')[0].trim())) {
                if (typeof global.transferSkateboardInstanceOwnership === 'function') {
                    global.transferSkateboardInstanceOwnership(pr[0], pr[1], step);
                } else step();
            } else if (typeof global.transferDonateBagInstanceOwnership === 'function') {
                global.transferDonateBagInstanceOwnership(pr[0], pr[1], step);
            } else step();
        }
        step();
    }

    runTradeBagOwnershipTransfersThen(() => {
        persistDonateSnapshot(pa, () => {
            persistDonateSnapshot(pb, () => {
            function finalizeTradeInv() {
                session.executing = false;
                session.donateSnapBackup = null;
                global.saveInventory(pa);
                global.saveInventory(pb);
                pa.call('updateInventory', [JSON.stringify(pa.inventory), JSON.stringify(pa.fastSlots)]);
                pb.call('updateInventory', [JSON.stringify(pb.inventory), JSON.stringify(pb.fastSlots)]);
                clearTradeDonateSnapshot(pa);
                clearTradeDonateSnapshot(pb);
                tradeSessions.delete(key);
                pa.call('trade:close');
                pb.call('trade:close');
                isNotify(pa, 3, 'top-mid', 'Обмен завершон', 3000);
                isNotify(pb, 3, 'top-mid', 'Обмен завершон', 3000);
                global.sendDiscordLog(
                    `Обмен между игроками\n\n${pa.login} (#${pa.static}) <-> ${pb.login} (#${pb.static})\nДеньги: ${moneyA}$ / ${moneyB}$\nПредметы A: ${itemsA.join(', ') || '—'}\nПредметы B: ${itemsB.join(', ') || '—'}`,
                    '1251229887990333471'
                );
            }
            if (typeof global.refreshPlayerDonateBagInstancesFromDb === 'function') {
                global.refreshPlayerDonateBagInstancesFromDb(pa, () => {
                    if (!mp.players.exists(pa) || !mp.players.exists(pb)) return;
                    global.refreshPlayerDonateBagInstancesFromDb(pb, finalizeTradeInv);
                });
            } else {
                finalizeTradeInv();
            }
        });
        });
    });
        });
    });
}


const INTERACTION_OFFER_MS = 26000;
const interactionOffersByTargetStatic = new Map();

function interactionOfferClear(ts) {
    const key = String(ts);
    const row = interactionOffersByTargetStatic.get(key);
    if (row && row.timer) try { clearTimeout(row.timer); } catch (_e) {}
    interactionOffersByTargetStatic.delete(key);
}

function targetHasBusyOfferSlot(receiver) {
    if (!receiver) return false;
    if (interactionOffersByTargetStatic.has(String(receiver.static))) return true;
    try {
        if (receiver.getVariable('inv')) return true;
    } catch (_e) {}
    try {
        const c = receiver.getVariable('coburaSellOffer');
        if (c != null && c !== '') return true;
    } catch (_e) {}
    return false;
}

function proposeP2pInteraction(initiator, receiver, kind, payload) {
    if (!initiator || !receiver || !mp.players.exists(initiator) || !mp.players.exists(receiver)) return false;
    if (receiver === initiator) return false;
    if (initiator.dimension !== 0 || receiver.dimension !== 0) {
        isNotify(initiator, 2, 'top-mid', 'Доступно только в основном измерении.', 3000);
        return false;
    }
    if (serverPlayersDistance(initiator, receiver) > 5) {
        isNotify(initiator, 2, 'top-mid', 'Игрок слишком далеко.', 3000);
        return false;
    }
    if (targetHasBusyOfferSlot(receiver)) {
        isNotify(initiator, 2, 'top-mid', 'Игрок уже рассматривает предложение.', 3000);
        return false;
    }
    const ts = String(receiver.static);
    interactionOfferClear(ts);
    const timer = setTimeout(() => {
        interactionOffersByTargetStatic.delete(ts);
        if (mp.players.exists(initiator)) {
            isNotify(initiator, 1, 'top-mid', 'Время истекло: нет ответа на предложение.', 4000);
        }
        if (mp.players.exists(receiver)) {
            receiver.call('interactionOfferClear');
            isNotify(receiver, 1, 'top-mid', 'Время предложения истекло.', 3000);
        }
    }, INTERACTION_OFFER_MS);

    interactionOffersByTargetStatic.set(ts, {
        initiatorStatic: initiator.static,
        initiatorId: initiator.id,
        kind,
        payload: payload && typeof payload === 'object' ? payload : {},
        timer
    });

    const fromLogin = typeof global.citizenDisplayLogin === 'function'
        ? global.citizenDisplayLogin(receiver, initiator)
        : initiator.login;
    const fromLabel = `${fromLogin || 'Гражданин'} #${initiator.static}`;
    let promptText = '';
    let title = 'ПРЕДЛОЖЕНИЕ';
    if (kind === 'trade') {
        title = 'ОБМЕН';
        promptText = `${fromLabel} предлагает вам обмен предметами.`;
    }
    else if (kind === 'money') {
        title = 'ПЕРЕДАЧА ДЕНЕГ';
        promptText = `${fromLabel} хочет передать вам ${global.formatnum1(payload.amount)}$.`;
    }
    else if (kind === 'dice') {
        title = 'ИГРА В КОСТИ';
        promptText = `${fromLabel} предлагает игру в кости на ${global.formatnum1(payload.amount)}$.`;
    }
    else if (kind === 'pair') {
        const pairLabels = { kiss: 'поцелуй', handhold: 'взять за руку', handshake: 'пожать руку' };
        const titleByKind = { kiss: 'ПОЦЕЛУЙ', handhold: 'ВЗЯТЬ ЗА РУКУ', handshake: 'ПОЖАТЬ РУКУ' };
        const pk = payload && payload.kind ? String(payload.kind) : '';
        title = titleByKind[pk] || 'ПАРНОЕ ДЕЙСТВИЕ';
        promptText = `${fromLabel} предлагает: ${pairLabels[pk] || 'парное действие'}.`;
    } else if (kind === 'fraction_invite') {
        const fn = payload && payload.fname ? String(payload.fname) : 'фракцию';
        title = 'ПРИГЛАШЕНИЕ ВО ФРАКЦИЮ';
        promptText = `${fromLabel} зовёт вас во фракцию «${fn}».`;
    }
    if (!promptText) promptText = `${fromLabel} отправил вам предложение.`;
    receiver.call('interactionOfferStart', [title, promptText]);
    return true;
}
global.proposeP2pInteraction = proposeP2pInteraction;

function executeMoneyTransferP2p(sender, recipient, amount) {
    const MAX_LOGSPAY_AMOUNT = 2147483647; // INT signed — колонка logspay.amount
    const MAX_TRANSFER = 1000000000; // 1 млрд за раз
    amount = Math.floor(Number(amount));
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (amount > MAX_TRANSFER) {
        isNotify(sender, 2, 'top-mid', 'Сумма перевода слишком большая (макс. 1.000.000.000$).', 4000);
        return false;
    }
    if (!sender || !mp.players.exists(sender) || !recipient || !mp.players.exists(recipient)) return false;

    let senderMoney = Math.floor(Number(sender.money) || 0);
    if (senderMoney < 0) senderMoney = 0;
    if (amount > senderMoney) {
        isNotify(sender, 2, 'top-mid', 'Недостаточно средств.', 3000);
        return false;
    }

    const newSender = senderMoney - amount;
    let recMoney = Math.floor(Number(recipient.money) || 0);
    if (recMoney < 0) recMoney = 0;
    // не раздуваем money выше лимита INT в логах/практике
    const newRecRaw = recMoney + amount;
    if (newRecRaw > MAX_LOGSPAY_AMOUNT) {
        isNotify(sender, 2, 'top-mid', 'У получателя переполнение баланса — перевод отменён.', 4000);
        isNotify(recipient, 2, 'top-mid', 'Баланс слишком большой для этого перевода.', 4000);
        return false;
    }
    const newRec = newRecRaw;

    sender.money = newSender;
    sender.call('updateMoney', [global.formatnum1(newSender)]);
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newSender, sender.static], (err) => {
        if (err) console.log(err);
    });
    recipient.money = newRec;
    recipient.call('updateMoney', [global.formatnum1(newRec)]);
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newRec, recipient.static], (err) => {
        if (err) console.log(err);
    });
    global.sendDiscordLog(
        `Передача денег!\n\nПередал - ${sender.login} (#${sender.static})\nПередано - ${recipient.login} (#${recipient.static})\nСумма - ${global.formatnum1(amount)}$`,
        '1251229887990333471'
    );
    const logAmount = Math.min(amount, MAX_LOGSPAY_AMOUNT);
    global.DB.query(
        'INSERT INTO logspay (static1, static2, amount, static1ip, static2ip, time) VALUES (?, ?, ?, ?, ?, NOW())',
        [String(sender.static), String(recipient.static), logAmount, String(sender.ip || ''), String(recipient.ip || '')],
        (err) => {
            if (err) console.log(err);
        }
    );
    isNotify(sender, 3, 'top-mid', `Вы перевели ${global.formatnum1(amount)}$ игроку ${recipient.login}.`, 3000);
    isNotify(recipient, 3, 'top-mid', `Вы получили ${global.formatnum1(amount)}$ от игрока ${sender.login}.`, 3000);
    return true;
}

function beginTradeBetweenPlayers(initiator, targetPlayer) {
    const na = Number(initiator.static);
    const nb = Number(targetPlayer.static);
    const sa = String(Math.min(na, nb));
    const sb = String(Math.max(na, nb));
    const key = tradeSessionKey(sa, sb);
    loadTradeDonateSnapshot(initiator, (snapP) => {
        try {
            if (!initiator || !mp.players.exists(initiator) || !targetPlayer || !mp.players.exists(targetPlayer)) return;
            initiator.tradeDonateSnapshot = snapP;
            loadTradeDonateSnapshot(targetPlayer, (snapT) => {
                try {
                    if (!initiator || !mp.players.exists(initiator) || !targetPlayer || !mp.players.exists(targetPlayer)) return;
                    if (findTradeSession(initiator) || findTradeSession(targetPlayer)) {
                        clearTradeDonateSnapshot(initiator);
                        clearTradeDonateSnapshot(targetPlayer);
                        return isNotify(initiator, 2, 'top-mid', 'Обмен уже активен.', 3000);
                    }
                    if (serverPlayersDistance(initiator, targetPlayer) > 5) {
                        clearTradeDonateSnapshot(initiator);
                        clearTradeDonateSnapshot(targetPlayer);
                        return isNotify(initiator, 2, 'top-mid', 'Игрок слишком далеко.', 3000);
                    }
                    targetPlayer.tradeDonateSnapshot = snapT;

                    const session = {
                        a: sa,
                        b: sb,
                        offer: {},
                        ready: {}
                    };
                    session.offer[session.a] = { items: [], money: 0 };
                    session.offer[session.b] = { items: [], money: 0 };
                    session.ready[session.a] = false;
                    session.ready[session.b] = false;
                    tradeSessions.set(key, session);

                    const invP = JSON.stringify(getTradeInvSnapshot(initiator));
                    const invT = JSON.stringify(getTradeInvSnapshot(targetPlayer));

                    initiator.call('trade:open', [targetPlayer.login, targetPlayer.static, invP]);
                    targetPlayer.call('trade:open', [initiator.login, initiator.static, invT]);

                    broadcastTradeSync(session);
                } catch (e2) {
                    console.log('[beginTrade]', e2);
                    clearTradeDonateSnapshot(initiator);
                    clearTradeDonateSnapshot(targetPlayer);
                }
            });
        } catch (e1) {
            console.log('[beginTrade]', e1);
            clearTradeDonateSnapshot(initiator);
        }
    });
}

mp.events.add('interaction:respond:s', (receiver, acceptRaw) => {
    try {
        if (!receiver || !mp.players.exists(receiver) || !receiver.getVariable('auth')) return;
        if (receiver.dimension !== 0) return;
        if (!receiver.clicked) receiver.clicked = 0;
        if (new Date().getTime() - receiver.clicked < 350) return;
        receiver.clicked = new Date().getTime();

        const accepted =
            acceptRaw === true ||
            acceptRaw === 1 ||
            acceptRaw === '1';

        const ts = String(receiver.static);
        const offer = interactionOffersByTargetStatic.get(ts);
        if (!offer) {
            receiver.call('interactionOfferClear');
            return isNotify(receiver, 2, 'top-mid', 'Нет активного предложения.', 2500);
        }
        interactionOfferClear(ts);
        receiver.call('interactionOfferClear');

        const initiator = mp.players.at(offer.initiatorId) ||
            mp.players.toArray().find((p) => Number(p.static) === Number(offer.initiatorStatic));
        if (!initiator || !mp.players.exists(initiator)) {
            return isNotify(receiver, 2, 'top-mid', 'Инициатор вышел — предложение снято.', 3500);
        }
        if (initiator.dimension !== 0 || receiver.dimension !== 0) {
            isNotify(receiver, 2, 'top-mid', 'Доступно только в основном измерении.', 3500);
            isNotify(initiator, 2, 'top-mid', 'Не удалось подтвердить (измерение).', 3500);
            return;
        }
        if (serverPlayersDistance(receiver, initiator) > 5) {
            isNotify(receiver, 2, 'top-mid', 'Вы слишком далеко.', 3500);
            isNotify(initiator, 2, 'top-mid', 'Игрок слишком далеко — действие отменено.', 3500);
            return;
        }

        if (!accepted) {
            isNotify(initiator, 1, 'top-mid', `${receiver.login} отклонил ваше предложение.`, 4000);
            isNotify(receiver, 1, 'top-mid', 'Вы отклонили предложение.', 3000);
            return;
        }

        if (offer.kind === 'trade') {
            if (findTradeSession(receiver) || findTradeSession(initiator)) {
                return isNotify(receiver, 2, 'top-mid', 'Один из вас уже в обмене.', 3000);
            }
            beginTradeBetweenPlayers(initiator, receiver);
            return;
        }

        if (offer.kind === 'money') {
            const amount = parseInt(String(offer.payload && offer.payload.amount), 10);
            if (isNaN(amount) || amount <= 0) return;
            if (amount > 1000000000) {
                isNotify(initiator, 2, 'top-mid', 'Сумма перевода слишком большая.', 4000);
                isNotify(receiver, 2, 'top-mid', 'Сумма перевода слишком большая — отмена.', 4000);
                return;
            }
            if (!/^[0-9]+$/.test(String(amount))) return;
            if (initiator.getVariable('jail') === true) return isNotify(receiver, 2, 'top-mid', 'Отправитель в деморгане.', 3000);
            if (receiver.getVariable('jail') === true) return isNotify(receiver, 2, 'top-mid', 'Вы в деморгане.', 3000);
            if (initiator.getVariable('mute') === true) return isNotify(receiver, 2, 'top-mid', 'У отправителя мут.', 3000);
            if (receiver.getVariable('mute') === true) return isNotify(receiver, 2, 'top-mid', 'Вы в муте.', 3000);
            let playerMoney = Number(initiator.money);
            if (!Number.isFinite(playerMoney) || playerMoney < 0) playerMoney = 0;
            if (amount > playerMoney) {
                isNotify(initiator, 2, 'top-mid', 'Недостаточно средств.', 4000);
                isNotify(receiver, 2, 'top-mid', 'У отправителя не хватило средств — отмена.', 4000);
                return;
            }
            executeMoneyTransferP2p(initiator, receiver, amount);
            receiver.call('target:close');
            initiator.call('target:close');
            return;
        }

        if (offer.kind === 'pair') {
            const pk = offer.payload && offer.payload.kind ? String(offer.payload.kind) : '';
            if (pk !== 'handshake') {
                return isNotify(receiver, 2, 'top-mid', 'Доступно только «Пожать руку».', 3000);
            }
            if (typeof global.playerInPairSession === 'function' &&
                (global.playerInPairSession(receiver) || global.playerInPairSession(initiator))) {
                return isNotify(receiver, 2, 'top-mid', 'Один из вас уже в парном действии.', 3000);
            }
            if (initiator.vehicle || receiver.vehicle) {
                return isNotify(receiver, 2, 'top-mid', 'Нельзя в транспорте.', 3000);
            }
            if (typeof global.startPairInteraction === 'function') {
                const started = global.startPairInteraction(initiator, receiver, pk);
                if (!started) {
                    isNotify(receiver, 2, 'top-mid', 'Не удалось начать парное действие.', 3500);
                    isNotify(initiator, 2, 'top-mid', 'Не удалось начать парное действие.', 3500);
                }
            } else {
                isNotify(receiver, 2, 'top-mid', 'Парные действия недоступны (модуль сервера).', 3500);
            }
            receiver.call('target:close');
            initiator.call('target:close');
            return;
        }

        if (offer.kind === 'fraction_invite') {
            const fid = parseInt(offer.payload && offer.payload.fid, 10) || 0;
            if (fid < 1 || fid > 6) {
                return isNotify(receiver, 2, 'top-mid', 'Некорректная фракция.', 3000);
            }
            const targetFrac = parseInt(receiver.getVariable('fraction') || 0, 10) || 0;
            if (targetFrac > 0) {
                isNotify(initiator, 2, 'top-mid', 'Игрок уже состоит во фракции.', 3500);
                return isNotify(receiver, 2, 'top-mid', 'Вы уже состоите во фракции.', 3500);
            }
            if (typeof global.joinPlayerToFraction === 'function') {
                global.joinPlayerToFraction(receiver, fid, initiator);
            }
            receiver.call('target:close');
            initiator.call('target:close');
            return;
        }

        if (offer.kind === 'dice') {
            const amount = parseInt(String(offer.payload && offer.payload.amount), 10);
            if (isNaN(amount) || amount <= 0) return;

            if (amount > 1000000000) return isNotify(receiver, 2, 'top-mid', 'Сумма ставки слишком велика.', 3500);

            let iMoney = Number(initiator.money);
            if (amount > iMoney) {
                return isNotify(receiver, 2, 'top-mid', 'У отправителя недостаточно средств — отмена.', 4000);
            }
            let rMoney = Number(receiver.money);
            if (amount > rMoney) {
                return isNotify(receiver, 2, 'top-mid', 'У вас недостаточно средств.', 3500);
            }

            if (initiator.getVariable('kost') !== null) {
                return isNotify(receiver, 2, 'top-mid', 'Отправитель занят другой ставкой.', 3500);
            }
            if (receiver.getVariable('kost') !== null) {
                return isNotify(receiver, 2, 'top-mid', 'Вы заняты другой ставкой.', 3500);
            }

            if (initiator.getVariable('jail') === true || receiver.getVariable('jail') === true) {
                return isNotify(receiver, 2, 'top-mid', 'Игра недоступна в деморгане.', 3500);
            }
            if (initiator.getVariable('mute') === true || receiver.getVariable('mute') === true) {
                return isNotify(receiver, 2, 'top-mid', 'Игра недоступна при мутах.', 3500);
            }

            initiator.call('hidekost');
            receiver.call('hidekost');

            if (typeof global.runKostDiceResolveBetween === 'function') {
                global.runKostDiceResolveBetween(receiver, initiator, amount);
            }
            receiver.call('target:close');
            initiator.call('target:close');
            return;
        }

        isNotify(receiver, 2, 'top-mid', 'Неизвестный тип предложения.', 3000);
    } catch (e) {
        console.log('[interaction:respond]', e);
    }
});

mp.events.add('trade:start:s', (player, targetStatic) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return isNotify(player, 2, 'top-mid', 'Обмен только в основном измерении.', 3000);
        if (new Date().getTime() - player.clicked < 1000) return;
        player.clicked = new Date().getTime();

        if (findTradeSession(player)) return isNotify(player, 2, 'top-mid', 'Вы уже в обмене.', 3000);

        const target = mp.players.toArray().find((p) => Number(p.static) === Number(targetStatic));
        if (!target || !mp.players.exists(target)) return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);
        if (target === player) return;
        if (findTradeSession(target)) return isNotify(player, 2, 'top-mid', 'Игрок уже в обмене.', 3000);

        if (serverPlayersDistance(player, target) > 5) return isNotify(player, 2, 'top-mid', 'Игрок слишком далеко.', 3000);

        if (!proposeP2pInteraction(player, target, 'trade', {})) return;
        isNotify(player, 3, 'top-mid', 'Предложение отправлено.', 3000);
        player.call('target:close');
    } catch (e) {
        console.log('[trade:start:s]', e);
        if (player && mp.players.exists(player)) {
            isNotify(player, 2, 'top-mid', 'Не удалось начать обмен. Попробуйте ещё раз.', 4000);
        }
    }
});

mp.events.add('trade:addItem:s', (player, item) => {
    try {
        if (!player || !mp.players.exists(player) || !item) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        if (!isTradeableItemServer(item)) return;

        const list = session.offer[me].items;
        if (list.length >= 24) return isNotify(player, 2, 'top-mid', 'Максимум 24 предмета в обмене.', 2500);

        if (tradeBagTokenHasContents(player, item)) {
            return isNotify(player, 2, 'top-mid', 'Сначала освободите сумку — сумку с предметами внутри нельзя отдавать в обмене.', 4500);
        }

        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, item)) {
            return isNotify(
                player,
                2,
                'top-mid',
                'Снимите предмет с экипировки или из быстрого слота — такие вещи нельзя отдавать в обмене.',
                4500
            );
        }

        const owned = countTradeItemOwned(player, item);
        const inOffer = countItemInOfferList(list, item);
        if (owned <= inOffer) return;

        list.push(item);
        session.ready[session.a] = false;
        session.ready[session.b] = false;
        broadcastTradeSync(session);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:addStack:s', (player, base, qtyRaw) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const b = String(base || '');
        if (b !== 'item_spank' && b !== 'item_alco') return;
        const qty = parseInt(String(qtyRaw).replace(/\D/g, ''), 10);
        if (isNaN(qty) || qty < 1) return;

        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        const list = session.offer[me].items;
        if (list.length >= 24) return isNotify(player, 2, 'top-mid', 'Максимум 24 предмета в обмене.', 2500);

        const owned =
            typeof global.countStackBaseUnblockedForSale === 'function' ? global.countStackBaseUnblockedForSale(player, b) : countStackBase(player, b);
        const inOffer = stackQtyInOffer(list, b);
        if (owned < inOffer + qty) return;

        if (typeof global.inventoryItemIsBlockedForTransfer === 'function' && global.inventoryItemIsBlockedForTransfer(player, b)) {
            return isNotify(
                player,
                2,
                'top-mid',
                'Снимите предмет с экипировки или из быстрого слота — такие вещи нельзя отдавать в обмене.',
                4500
            );
        }

        list.push(`trade_stack:${b}:${qty}`);
        session.ready[session.a] = false;
        session.ready[session.b] = false;
        broadcastTradeSync(session);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:addFamilyMansion:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (Number(player.famRank) !== 10 || !String(player.family || '').trim()) {
            return isNotify(player, 2, 'top-mid', 'Только лидер семьи может отдавать особняк.', 4000);
        }
        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        const list = session.offer[me].items;
        if (list.length >= 24) return isNotify(player, 2, 'top-mid', 'Максимум 24 предмета в обмене.', 2500);
        let mansionCount = 0;
        for (const it of list) {
            if (parseTradeFamilyMansionToken(it)) mansionCount++;
        }
        if (mansionCount >= 1) return isNotify(player, 2, 'top-mid', 'В обмене уже добавлен особняк.', 3000);

        const fam = String(player.family || '').trim();
        getTradeFamilyDbId(fam, (e1, fid) => {
            if (e1 || !fid) return isNotify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
            global.DB.query(
                'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
                [fid],
                (e2, rows) => {
                    if (!mp.players.exists(player)) return;
                    if (e2 || !rows || !rows[0]) {
                        return isNotify(player, 2, 'top-mid', 'У семьи нет особняка.', 3500);
                    }
                    const mid = Number(rows[0].mansion_id);
                    const tok = `trade_family:mansion:${mid}`;
                    list.push(tok);
                    session.ready[session.a] = false;
                    session.ready[session.b] = false;
                    broadcastTradeSync(session);
                }
            );
        });
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:removeItem:s', (player, idx) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        const list = session.offer[me].items;
        const i = parseInt(idx, 10);
        if (isNaN(i) || i < 0 || i >= list.length) return;
        list.splice(i, 1);
        session.ready[session.a] = false;
        session.ready[session.b] = false;
        broadcastTradeSync(session);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:removeStack:s', (player, base, qtyRaw) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const b = String(base || '');
        if (b !== 'item_spank' && b !== 'item_alco') return;
        let qty = parseInt(String(qtyRaw).replace(/\D/g, ''), 10);
        if (isNaN(qty) || qty < 1) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        const list = session.offer[me].items;
        for (let i = list.length - 1; i >= 0 && qty > 0; i--) {
            const st = parseStackToken(list[i]);
            if (!st || st.base !== b) continue;
            if (st.qty <= qty) {
                qty -= st.qty;
                list.splice(i, 1);
            } else {
                list[i] = `trade_stack:${b}:${st.qty - qty}`;
                qty = 0;
            }
        }
        session.ready[session.a] = false;
        session.ready[session.b] = false;
        broadcastTradeSync(session);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:setMoney:s', (player, amount) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { session } = found;
        const me = String(player.static);
        let m = parseInt(amount, 10);
        if (isNaN(m) || m < 0) m = 0;
        const maxMoney = Math.max(0, parseInt(Number(player.money), 10) || 0);
        if (m > maxMoney) m = maxMoney;
        session.offer[me].money = m;
        session.ready[session.a] = false;
        session.ready[session.b] = false;
        broadcastTradeSync(session);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:ready:s', (player, ready) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { key, session } = found;
        if (session.executing) return;
        const me = String(player.static);
        session.ready[me] = !!ready;
        broadcastTradeSync(session);
        if (session.ready[session.a] && session.ready[session.b]) {
            tryExecuteTrade(session, key);
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:cancel:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { key, session } = found;
        session.cancelled = true;
        session.executing = false;
        const partnerSt = getPartnerStatic(session, player.static);
        const pb = mp.players.toArray().find((p) => String(p.static) === partnerSt);
        clearSessionDonateSnapshots(session);
        tradeSessions.delete(key);
        player.call('trade:close');
        if (pb && mp.players.exists(pb)) {
            pb.call('trade:close');
            isNotify(pb, 1, 'top-mid', `${player.login} отменил обмен.`, 3000);
        }
        isNotify(player, 1, 'top-mid', 'Обмен отменён.', 2500);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('trade:leave:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const found = findTradeSession(player);
        if (!found) return;
        const { key, session } = found;
        session.cancelled = true;
        session.executing = false;
        const partnerSt = getPartnerStatic(session, player.static);
        const pb = mp.players.toArray().find((p) => String(p.static) === partnerSt);
        clearSessionDonateSnapshots(session);
        tradeSessions.delete(key);
        player.call('trade:close');
        if (pb && mp.players.exists(pb)) {
            pb.call('trade:close');
            isNotify(pb, 1, 'top-mid', 'Собеседник закрыл меню — обмен отменён.', 3000);
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || player.static == null) return;

        try {
            if (mp.players.exists(player)) {
                const found = findTradeSession(player);
                if (found) {
                    const { key, session } = found;
                    const partnerSt = getPartnerStatic(session, player.static);
                    const pb = mp.players.toArray().find((p) => String(p.static) === partnerSt);
                    clearSessionDonateSnapshots(session);
                    tradeSessions.delete(key);
                    if (pb && mp.players.exists(pb)) {
                        pb.call('trade:close');
                        isNotify(pb, 1, 'top-mid', 'Игрок вышел — обмен отменён.', 3000);
                    }
                }
            }
        } catch (_eQuitTrade) {}

        try {
            const qs = player.static != null ? String(player.static) : '';
            if (qs) interactionOfferClear(qs);
            for (const [ts, row] of Array.from(interactionOffersByTargetStatic.entries())) {
                if (!row || String(row.initiatorStatic) !== qs) continue;
                interactionOfferClear(ts);
                const recv = mp.players.toArray().find((p) => String(p.static) === ts);
                if (recv && mp.players.exists(recv)) {
                    recv.call('interactionOfferClear');
                    isNotify(recv, 1, 'top-mid', 'Инициатор вышел — предложение снято.', 3500);
                }
            }
        } catch (_eOffer) {}
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('target:pair:s', (player, targetStatic, kindRaw) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return isNotify(player, 2, 'top-mid', 'Доступно только в основном измерении.', 3000);
        if (!player.clicked) player.clicked = 0;
        if (new Date().getTime() - player.clicked < 800) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 2000);
        }
        player.clicked = new Date().getTime();

        const kind = String(kindRaw || '').trim();
        if (kind !== 'handshake') {
            return isNotify(player, 2, 'top-mid', 'Доступно только «Пожать руку».', 3000);
        }

        if (typeof global.playerInPairSession === 'function' && global.playerInPairSession(player)) {
            return isNotify(player, 2, 'top-mid', 'Вы уже в парном действии.', 3000);
        }

        const target = mp.players.toArray().find((p) => Number(p.static) === Number(targetStatic));
        if (!target || !mp.players.exists(target)) return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);
        if (target === player) return isNotify(player, 2, 'top-mid', 'Нельзя с самим собой.', 3000);
        if (target.vehicle || player.vehicle) {
            return isNotify(player, 2, 'top-mid', 'Нельзя в транспорте.', 3000);
        }
        if (serverPlayersDistance(player, target) > 5) return isNotify(player, 2, 'top-mid', 'Игрок слишком далеко.', 3000);

        const pairLabels = { kiss: 'поцелуй', handhold: 'взять за руку', handshake: 'пожать руку' };
        if (!proposeP2pInteraction(player, target, 'pair', { kind })) return;

        isNotify(
            player,
            3,
            'top-mid',
            'Предложение отправлено.',
            3000
        );
        player.call('target:close');
    } catch (e) {
        console.log('[target:pair:s]', e);
    }
});

mp.events.add('target:transfer:s', (player, targetStatic, amount) => {
    try {
        if (!targetStatic || !amount) return;
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;

        amount = parseInt(amount, 10);

        if (isNaN(amount)) return isNotify(player, 2, "top-mid", `Сумма должна быть числом.`, 3000);
        if (amount <= 0) return isNotify(player, 2, "top-mid", `Сумма должна быть больше нуля.`, 3000);
        if (amount > 1000000000) return isNotify(player, 2, "top-mid", `Максимум 1.000.000.000$ за перевод.`, 3000);
        if (!/^\d+$/.test(String(amount))) return isNotify(player, 2, "top-mid", `Введите только цифры без пробелов и знаков.`, 3000);
        const target = mp.players.toArray().find(p => p.static == targetStatic);
        if (!target) return isNotify(player, 2, "top-mid", `Игрок с таким статиком не найден на сервере.`, 3000);
        if (target === player) return isNotify(player, 2, "top-mid", `Вы не можете перевести деньги самому себе.`, 3000);
        let playerMoney = Number(player.money);
        if (amount > playerMoney) return isNotify(player, 2, "top-mid", `У вас недостаточно средств.`, 3000);
        if (player.getVariable('jail') === true) return isNotify(player, 2, "top-mid", `Вы не можете передавать деньги когда вы в деморгане.`, 3000);
        if (target.getVariable('jail') === true) return isNotify(player, 2, "top-mid", `Игрок в деморгане.`, 3000);
        if (player.getVariable('mute') === true) return isNotify(player, 2, "top-mid", `Вы не можете передавать деньги когда вы в муте.`, 3000);
        if (target.getVariable('mute') === true) return isNotify(player, 2, "top-mid", `Игрок в муте.`, 3000);

        const playerPos = player.position;
        const targetPos = target.position;

        const distance = Math.sqrt(
            Math.pow(playerPos.x - targetPos.x, 2) +
            Math.pow(playerPos.y - targetPos.y, 2) +
            Math.pow(playerPos.z - targetPos.z, 2)
        );

        if (distance > 5) {
            return isNotify(player, 2, "top-mid", `Игрок далеко от вас.`, 3000);
        }

        if (!proposeP2pInteraction(player, target, 'money', { amount })) return;

        isNotify(
            player,
            3,
            'top-mid',
            'Предложение отправлено.',
            3000
        );
        player.call('target:close');
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('target:kost:s', (player, targetStatic, amount) => {
    try {
        if (!targetStatic || !amount) return;

        amount = parseInt(amount);
        if (isNaN(amount)) return isNotify(player, 2, "top-mid", `Сумма должна быть числом.`, 3000);
        if (amount <= 0) return isNotify(player, 2, "top-mid", `Сумма должна быть больше нуля.`, 3000);
        if (amount > 1000000000) return isNotify(player, 2, "top-mid", `Максимальная сумма костей - 1.000.000.000$ за раз.`, 3000);

        if (!/^\d+$/.test(String(amount))) return isNotify(player, 2, "top-mid", `Введите только цифры без пробелов и знаков.`, 3000);

        const target = mp.players.toArray().find(p => p.static == targetStatic);
        if (!target) return isNotify(player, 2, "top-mid", `Игрок с таким статиком не найден на сервере.`, 3000);
        if (target === player) return isNotify(player, 2, "top-mid", `Вы не можете играть с самим собой.`, 3000);

        let playerMoney = Number(player.money);
        if (amount > playerMoney) return isNotify(player, 2, "top-mid", `У вас недостаточно средств.`, 3000);

        if (player.getVariable('kost') !== null) return player.call('showNotification', [`Вы уже играете в кости.`]);
        if (target.getVariable('kost') !== null) return player.call('showNotification', [`Игрок ${target.login} уже играет в кости.`]);
        
        let targetMoney = Number(target.money);
        if (targetMoney < amount) return isNotify(player, 2, "top-mid", `У игрока недостаточно средств.`, 3000);

        if (player.getVariable('jail') === true) return isNotify(player, 2, "top-mid", `Вы не можете играть в кости когда вы в деморгане.`, 3000);
        if (target.getVariable('jail') === true) return isNotify(player, 2, "top-mid", `Игрок в деморгане.`, 3000);
        if (player.getVariable('mute') === true) return isNotify(player, 2, "top-mid", `Вы не можете играть в кости пока у вас мут.`, 3000);
        if (target.getVariable('mute') === true) return isNotify(player, 2, "top-mid", `Игрок в муте.`, 3000);

        const playerPos = player.position;
        const targetPos = target.position;

        const distance = Math.sqrt(
            Math.pow(playerPos.x - targetPos.x, 2) +
            Math.pow(playerPos.y - targetPos.y, 2) +
            Math.pow(playerPos.z - targetPos.z, 2)
        );

        if (distance > 5) {
            return isNotify(player, 2, "top-mid", `Игрок далеко от вас.`, 3000);
        }

        if (!proposeP2pInteraction(player, target, 'dice', { amount })) return;

        isNotify(
            player,
            3,
            'top-mid',
            'Предложение отправлено.',
            3000
        );
        player.call('target:close');
    } catch (error) {
        console.log(error);
    }
});

