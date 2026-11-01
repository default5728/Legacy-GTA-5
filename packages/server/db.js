const mysql = require('mysql');

const DB_CONFIG = {
    host: process.env.KEPLER_DB_HOST || '127.0.0.1',
    user: process.env.KEPLER_DB_USER,
    password: process.env.KEPLER_DB_PASSWORD,
    database: process.env.KEPLER_DB_NAME,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0
};

const CONNECT_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

let pool = null;
const dbReadyQueue = [];
const pendingQueries = [];

global.DB_READY = false;

function isTransientDbError(err) {
    const code = err && err.code;
    return (
        code === 'PROTOCOL_CONNECTION_LOST' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNREFUSED' ||
        code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
        code === 'PROTOCOL_SEQUENCE_TIMEOUT'
    );
}

global.isTransientDbError = isTransientDbError;

function queryWithDeadlockRetry(sql, params, cb, attempt) {
    pool.query(sql, params, (err, results, fields) => {
        if (err && err.code === 'ER_LOCK_DEADLOCK' && attempt < 3) {
            setTimeout(() => queryWithDeadlockRetry(sql, params, cb, attempt + 1), 40 + attempt * 40);
            return;
        }
        if (typeof cb === 'function') cb(err, results, fields);
    });
}

/** Всегда определён: до bd true запросы в очередь, после — в pool. */
global.DB = {
    query(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = [];
        }
        if (global.DB_READY && pool) {
            return queryWithDeadlockRetry(sql, params, cb, 0);
        }
        pendingQueries.push({ sql, params, cb });
    }
};

function flushPendingQueries() {
    if (!global.DB_READY || !pool) return;
    while (pendingQueries.length) {
        const q = pendingQueries.shift();
        try {
            pool.query(q.sql, q.params, q.cb);
        } catch (e) {
            if (typeof q.cb === 'function') q.cb(e);
        }
    }
}

global.whenDbReady = function whenDbReady(fn) {
    if (typeof fn !== 'function') return;
    if (global.DB_READY) {
        setImmediate(fn);
        return;
    }
    dbReadyQueue.push(fn);
};

function drainDbReadyQueue() {
    const queue = dbReadyQueue.splice(0);
    queue.forEach((fn) => {
        try {
            fn();
        } catch (e) {
            console.log('[db] whenDbReady callback:', e);
        }
    });
}

function destroyPool() {
    if (!pool) return;
    try {
        pool.end();
    } catch (_e) {}
    pool = null;
    global.DB_READY = false;
}

function connectMysql(attempt) {
    try {
        destroyPool();
        pool = mysql.createPool(DB_CONFIG);
        pool.on('error', (err) => {
            console.log('[db] pool error:', err.code || err.message);
        });

        pool.getConnection((err, conn) => {
            if (err) {
                console.log(`[db] MySQL попытка ${attempt}/${CONNECT_ATTEMPTS}:`, err.code || err.message);
                destroyPool();
                if (attempt >= CONNECT_ATTEMPTS) {
                    console.log('[db] Не удалось подключиться. Запусти MySQL, создай БД flowdm (как в db.js), проверь логин/пароль.');
                    process.exit(1);
                    return;
                }
                setTimeout(() => connectMysql(attempt + 1), RETRY_DELAY_MS);
                return;
            }

            conn.release();
            global.DB_READY = true;
            console.log('[db] MySQL connected');

            // Добавляем колонку last_login, если её нет
            try {
                pool.query('ALTER TABLE accounts ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL AFTER `last_pos_dim`', (altErr) => {
                    if (altErr && altErr.code !== 'ER_DUP_FIELDNAME' && altErr.code !== 'ER_DUP_COLUMNNAME') {
                        console.log('[db] ALTER TABLE last_login:', altErr.message);
                    }
                });
            } catch (_ea) {}

            flushPendingQueries();
            drainDbReadyQueue();

            try {
                setImmediate(() => {
                    if (typeof global.fractionOnDatabaseReady === 'function') global.fractionOnDatabaseReady();
                });
            } catch (_e) {}
        });
    } catch (error) {
        console.log('[db]', error);
        destroyPool();
        if (attempt >= CONNECT_ATTEMPTS) {
            process.exit(1);
            return;
        }
        setTimeout(() => connectMysql(attempt + 1), RETRY_DELAY_MS);
    }
}

mp.events.add('packagesLoaded', () => {
    // Небольшая пауза: после рестарта RAGE прошлый пул ещё рвёт сокеты (ECONNRESET).
    setTimeout(() => connectMysql(1), 500);
});

global.querydb = function querydb(sql, params = [], attempt = 0) {
    return new Promise((resolve, reject) => {
        if (!global.DB_READY || !pool) {
            return reject(new Error('MySQL ещё не подключён'));
        }
        pool.query(sql, params, (err, result) => {
            if (err) {
                if (attempt < 2 && isTransientDbError(err)) {
                    return setTimeout(() => {
                        querydb(sql, params, attempt + 1).then(resolve).catch(reject);
                    }, 400);
                }
                return reject(err);
            }
            resolve(result);
        });
    });
};
