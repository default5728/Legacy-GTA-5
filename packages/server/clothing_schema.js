'use strict';

global.clothingSchemaReady = false;
global.clothingSchemaError = null;

async function query(sql, params) {
    return global.querydb(sql, params || []);
}

async function columnExists(table, column) {
    const rows = await query(
        `SELECT 1
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
          LIMIT 1`,
        [table, column]
    );
    return Array.isArray(rows) && rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
    if (await columnExists(table, column)) return;
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[clothing-schema] added ${table}.${column}`);
}

async function indexExists(table, indexName) {
    const rows = await query(
        `SELECT 1
           FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND INDEX_NAME = ?
          LIMIT 1`,
        [table, indexName]
    );
    return Array.isArray(rows) && rows.length > 0;
}

async function migrateClothingSchema() {
    await query(`
        CREATE TABLE IF NOT EXISTS donate_bag_instances (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            account_static INT NOT NULL,
            item_id INT NOT NULL,
            frac INT NOT NULL DEFAULT 1,
            drawable INT NOT NULL DEFAULT 0,
            texture INT NOT NULL DEFAULT 0,
            item_name VARCHAR(384) NULL,
            item_img VARCHAR(512) NULL,
            contents LONGTEXT NULL,
            charms TINYINT UNSIGNED NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_bag_account (account_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const bagColumns = [
        ['account_static', 'INT NOT NULL DEFAULT 0'],
        ['item_id', 'INT NOT NULL DEFAULT 0'],
        ['frac', 'INT NOT NULL DEFAULT 1'],
        ['drawable', 'INT NOT NULL DEFAULT 0'],
        ['texture', 'INT NOT NULL DEFAULT 0'],
        ['item_name', 'VARCHAR(384) NULL'],
        ['item_img', 'VARCHAR(512) NULL'],
        ['contents', 'LONGTEXT NULL'],
        ['charms', 'TINYINT UNSIGNED NOT NULL DEFAULT 0']
    ];
    for (const [column, definition] of bagColumns) {
        await addColumnIfMissing('donate_bag_instances', column, definition);
    }

    await addColumnIfMissing('clothes', 'bags_equip_ic1', 'LONGTEXT NULL');
    await addColumnIfMissing('accounts', 'donate_bag_state', 'LONGTEXT NULL');

    if (!(await indexExists('donate_bag_instances', 'idx_bag_account'))) {
        await query('ALTER TABLE donate_bag_instances ADD INDEX idx_bag_account (account_static)');
    }
    global.clothingSchemaReady = true;
    global.clothingSchemaError = null;
    console.log('[clothing-schema] ready');
}

if (typeof global.whenDbReady === 'function') {
    global.whenDbReady(() => {
        migrateClothingSchema().catch((err) => {
            global.clothingSchemaReady = false;
            global.clothingSchemaError = err || new Error('unknown clothing schema error');
            console.error(
                '[clothing-schema] FATAL: bag purchases are disabled:',
                (err && (err.sqlMessage || err.message)) || err
            );
        });
    });
}
