'use strict';
const access = require('./access'), store = require('./staff-state');

module.exports = function createSetLevel({ target, check, need, tell }) {
    return async function setLevel(ctx, args) {
        if (args.length !== 2 || !/^[1-9]\d{0,3}$/.test(args[1]) || Number(args[1]) > 1000) {
            throw Error('Использование: /setlevel CID уровень (1–1000).');
        }
        const player = target(ctx, args[0]), identity = access.assertPlayer(player);
        const next = Number(args[1]);
        await store.transaction(async tx => {
            check(ctx);
            need(ctx.actor, 'player.level');
            const row = (await tx.query(
                'SELECT charlevel,charexp FROM accounts WHERE kepler_character_id=? AND kepler_account_id=? AND char_created=1 FOR UPDATE',
                [identity.characterId, identity.accountId]
            )).rows[0];
            if (!row) throw Error('Персонаж не найден в базе.');
            check(ctx);
            need(ctx.actor, 'player.level');
            await tx.query(
                'UPDATE accounts SET charlevel=?,charexp=0 WHERE kepler_character_id=? AND kepler_account_id=? AND char_created=1',
                [next, identity.characterId, identity.accountId]
            );
            await store.audit(tx, ctx.identity.accountId, identity.accountId, 'player.level', {
                characterId: identity.characterId, cid: Number(player.static),
                previous: Number(row.charlevel), previousExp: Number(row.charexp), level: next, exp: 0
            });
            check(ctx);
            need(ctx.actor, 'player.level');
        });
        // A disconnected/replaced session must never receive another character's progress.
        let current;
        try { current = access.assertPlayer(player); } catch (_) {}
        if (current && current.characterId === identity.characterId && current.accountId === identity.accountId) {
            player.charlevel = next;
            player.charexp = 0;
            if (typeof global.pmSyncCharProgress === 'function') {
                try { global.pmSyncCharProgress(player); } catch (e) { console.warn('[LEVEL UI]', e.message); }
            }
            tell(player, 'Ваш игровой уровень изменён на '+next+'. Опыт: 0/'+(next*4)+'.');
        }
        tell(ctx.actor, 'CID '+player.static+': игровой уровень '+next+' сохранён.');
    };
};
