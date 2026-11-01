/**
 * Универсальная консоль: выполняет ЛЮБУЮ команду сервера (mp.events.addCommand)
 * от лица виртуального «консольного оператора».
 *
 * Реестр команд уже собирается в utils.js → global._registeredChatCommands.
 * Здесь только:
 *  1) патчим mp.players.exists, чтобы виртуальный оператор проходил
 *     requireAdminLvl / mp.players.exists(player);
 *  2) строим Proxy-оператора с безопасными значениями;
 *  3) runServerCommand(commandLine, opts) — запуск хендлера как из чата:
 *     handler(operator, fullText, ...args).
 */
'use strict';

const CONSOLE_SYMBOL = Symbol('discordConsoleOperator');

/** Распознаёт объект консольного оператора. */
global.isConsoleOperator = function isConsoleOperator(p) {
    return !!p && p[CONSOLE_SYMBOL] === true;
};

// Пропускаем виртуального оператора через mp.players.exists.
// Реальные игроки по-прежнему проверяются оригинальной функцией.
// В новых версиях RAGE MP свойство может быть read-only, поэтому
// пробуем несколько способов переопределения (от безопасного к жёсткому).
(function patchPlayersExists() {
    if (!mp || !mp.players || typeof mp.players.exists !== 'function') return;

    const origExists = mp.players.exists;
    const wrapped = function existsInclConsole(entity) {
        if (global.isConsoleOperator(entity)) return true;
        return origExists.call(mp.players, entity);
    };

    const log = (msg) => console.log('[discord_console] ' + msg);

    // 1) обычное присваивание (свойство writable)
    try {
        mp.players.exists = wrapped;
        log('mp.players.exists patched (assignment)');
        return;
    } catch (_e) {}

    // 2) переопределение через defineProperty (read-only, но configurable)
    try {
        Object.defineProperty(mp.players, 'exists', {
            configurable: true,
            writable: true,
            value: wrapped,
        });
        log('mp.players.exists patched (defineProperty)');
        return;
    } catch (_e) {}

    // 3) метод может лежать на прототипе пула
    try {
        const proto = Object.getPrototypeOf(mp.players);
        if (proto && typeof proto.exists === 'function') {
            const pDesc = Object.getOwnPropertyDescriptor(proto, 'exists');
            if (pDesc && pDesc.writable === false) {
                Object.defineProperty(proto, 'exists', {
                    configurable: true,
                    writable: true,
                    value: wrapped,
                });
            } else {
                proto.exists = wrapped;
            }
            log('mp.players.exists patched via pool prototype');
            return;
        }
    } catch (_e) {}

    // 4) пул не удалось пропатчить — хотя бы пропускаем консольного оператора
    //    через requireAdminLvl, чтобы админ-команды проходили проверку уровня.
    if (typeof global.requireAdminLvl === 'function') {
        const origRequire = global.requireAdminLvl;
        global.requireAdminLvl = function requireAdminLvlConsoleAware(player, minLvl, cmdName) {
            if (global.isConsoleOperator(player)) return true;
            return origRequire(player, minLvl, cmdName);
        };
        log('mp.players.exists is read-only, requireAdminLvl bypass installed');
        return;
    }

    log('mp.players.exists is read-only and cannot be overridden');
})();

/**
 * Создаёт виртуального оператора для одного запуска команды.
 * opts: { admin, adminStatic }
 */
function createConsoleOperator(opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    const target = { [CONSOLE_SYMBOL]: true };
    target.__vars = new Map([
        ['auth', true],
        ['inCapt', false],
        ['adminTrueLvl', '10'],
        ['adminlvl', '10'],
        ['fraction', '0'],
        ['mp', false],
        ['mpp', false]
    ]);
    target.__out = [];

    const operator = new Proxy(target, {
        get(t, prop) {
            if (prop === CONSOLE_SYMBOL) return t[CONSOLE_SYMBOL];
            if (typeof prop === 'symbol') {
                if (prop === Symbol.toPrimitive) return () => String(t.__login || 'console');
                return undefined;
            }
            switch (prop) {
                // внутренние поля оператора
                case '__login': return t.__login;
                case '__static': return t.__static;
                case '__adminlvl': return t.__adminlvl;
                case '__vars': return t.__vars;
                case '__out': return t.__out;
                case 'hasOwnProperty': return (k) => k in t;
                // личность
                case 'login': return t.__login;
                case 'static': return t.__static;
                case 'name': return t.__login;
                case 'id': return 0;
                case 'ip': return '127.0.0.1';
                case 'serial': return 'console';
                case 'adminlvl': return Number(t.__adminlvl) || 0;
                case 'money': return 0;
                case 'dp': return 0;
                case 'casetime': return 0;
                // состояние
                case 'position': return null;
                case 'dimension': return 0;
                case 'vehicle': return null;
                case 'weapon': return 0;
                case 'armour': return 0;
                case 'health': return 100;
                case 'fastSlots': return ['', '', ''];
                // методы
                case 'outputChatBox':
                    return (msg) => {
                        t.__out.push(String(msg == null ? '' : msg));
                    };
                case 'call': return () => {};
                case 'kick': return () => {};
                case 'getVariable': return (k) => t.__vars.get(k);
                case 'setVariable': return (k, v) => { t.__vars.set(k, v); };
                case 'notify': return () => {};
                case 'isNotify': return () => {};
                case 'sendNotify': return () => {};
                case 'setArmour': return () => {};
                case 'setHealth': return () => {};
                case 'setFrozen': return () => {};
                case 'giveWeapon': return () => {};
                case 'takeWeapon': return () => {};
                case 'giveWeaponComponent': return () => {};
                case 'spawn': return () => {};
                case 'teleport': return () => {};
                case 'putIntoVehicle': return () => {};
                case 'removeFromVehicle': return () => {};
                // остальное — no-op, чтобы неизвестные вызовы не падали
                default: return () => {};
            }
        },
        set(t, prop, value) {
            if (prop === 'login') t.__login = String(value == null ? '' : value);
            else if (prop === 'static') t.__static = value;
            else if (prop === 'adminlvl') t.__adminlvl = value;
            else if (prop === 'position' || prop === 'dimension' || prop === 'vehicle') { /* no-op */ }
            else t[prop] = value;
            return true;
        }
    });

    // Личность оператора (админ, инициировавший команду из Discord).
    const adminName = String(opts.admin || 'Discord').slice(0, 64);
    const adminStatic = parseInt(String(opts.adminStatic || ''), 10);
    operator.login = adminName;
    operator.static = Number.isFinite(adminStatic) && adminStatic > 0 ? adminStatic : 0;
    operator.adminlvl = 10;

    return operator;
}

/**
 * Запускает команду сервера как из игрового чата.
 * commandLine: строка вида "ban 123 1д читы" (со слэшем или без).
 * opts: { admin, adminStatic }
 * Возвращает Promise<{ ok, error?, output? }>.
 */
function runServerCommand(commandLine, opts) {
    return new Promise((resolve) => {
        let operator = null;
        try {
            const line = String(commandLine || '').trim().replace(/^\/+/, '');
            if (!line) return resolve({ ok: false, error: 'empty command' });

            const parts = line.split(/\s+/);
            const name = String(parts[0] || '').toLowerCase();

            const registry = global._registeredChatCommands;
            const handler = registry && registry.get(name);
            if (typeof handler !== 'function') {
                return resolve({ ok: false, error: 'command not found: ' + name });
            }

            const args = parts.slice(1);
            const fullText = args.join(' ');
            operator = createConsoleOperator(opts);

            try {
                handler(operator, fullText, ...args);
            } catch (e) {
                return resolve({
                    ok: false,
                    error: String((e && e.message) || e),
                    output: operator.__out.slice()
                });
            }

            // Даём асинхронным DB-записям и поздним outputChatBox уложиться.
            setTimeout(() => {
                resolve({ ok: true, output: operator.__out.slice() });
            }, 250);
        } catch (e) {
            resolve({ ok: false, error: String((e && e.message) || e) });
        }
    });
}

global.runServerCommand = runServerCommand;

module.exports = { runServerCommand, createConsoleOperator, isConsoleOperator: global.isConsoleOperator };
