/**

 * Standalone Discord: донат + сброс пароля + Platega webhook (без HTML-сайтов).

 * node packages/server/discord_donate_standalone.js

 */

'use strict';



const path = require('path');

const express = require('express');

const mysql = require('mysql');

const fs = require('fs');



const ROOT = path.join(__dirname);

const ENV_PATH = path.join(ROOT, 'discord_env.json');



let env = {};

try {

    env = JSON.parse(fs.readFileSync(ENV_PATH, 'utf8')) || {};

} catch (_e) {}



Object.keys(env).forEach(function (k) {

    if (process.env[k] == null || process.env[k] === '') {

        const v = env[k];

        process.env[k] = typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v);

    }

});

process.env.DISCORD_DONATE_SKIP_AUTO_PANEL = '1';

process.env.DISCORD_RECOVERY_SKIP_AUTO_PANEL = '1';



const DB_CONFIG = {

    host: '127.0.0.1',

    user: 'root',

    password: process.env.KEPLER_DB_PASSWORD || "",

    database: 'flowdm',

    connectionLimit: 5

};



const pool = mysql.createPool(DB_CONFIG);

global.DB = {

    query: function (sql, params, cb) {

        if (typeof params === 'function') {

            cb = params;

            params = [];

        }

        pool.query(sql, params, cb);

    }

};

global.DB_READY = true;

global.whenDbReady = function (fn) {

    if (typeof fn === 'function') setImmediate(fn);

};



global.mp = {

    players: {

        exists: function () {

            return false;

        },

        forEach: function () {}

    }

};



require('./donate_credit.js');

const donate = require('./discord_donate.js');

const recovery = require('./discord_recovery.js');

const startGateway = require('./discord_gateway_keepalive.js');

const { getDiscordToken } = require('./discord_api.js');



const app = express();

app.use(express.json({ limit: '64kb' }));

app.post('/api/donate/platega/callback', function (req, res) {

    donate.handlePlategaCallback(req, res);

});

app.get('/health', function (_req, res) {

    res.json({ ok: true });

});



const PORT = parseInt(process.env.DONATE_CALLBACK_PORT || process.env.DONATE_PORT || '8790', 10) || 8790;

const server = app.listen(PORT, '0.0.0.0', function () {

    console.log('[donate_standalone] webhook http://0.0.0.0:' + PORT + '/api/donate/platega/callback');



    const token = getDiscordToken();

    if (!token) {

        console.error('[donate_standalone] нет DISCORD_BOT_TOKEN');

        process.exit(1);

    }



    startGateway({

        getToken: function () {

            return token;

        },

        getServerOnline: function () {

            return 0;

        },

        guildId: String(env.DISCORD_GUILD_ID || ''),

        channelIdsForGuild: []

    });



    setTimeout(function () {

        donate
            .publishDonatePanel()
            .then(function () {

                console.log('[donate_standalone] donate panel ok');

            })

            .catch(function (e) {
                console.error('[donate_standalone] donate panel:', e.message || e);
            });
        donate
            .publishSupportPanel()
            .then(function () {
                console.log('[donate_standalone] support panel ok');
            })
            .catch(function (e) {
                console.error('[donate_standalone] support panel:', e.message || e);
            });
        recovery

            .publishRecoveryPanel()

            .then(function () {

                console.log('[donate_standalone] recovery panel ok');

            })

            .catch(function (e) {

                console.error('[donate_standalone] recovery panel:', e.message || e);

            });

    }, 3000);



    console.log('[donate_standalone] Discord bots (donate + recovery) started');

});

server.on('error', function (err) {

    if (err && err.code === 'EADDRINUSE') {

        // Порт занят => RAGE уже запускает donate+recovery+gateway.

        // Если продолжить, standalone откроет второй gateway и будет дважды

        // отвечать на один и тот же interaction («already acknowledged»).

        // Выходим только если мы запущены как самостоятельный процесс

        // (внутри RAGE этот файл грузится через require — там exit не нужен).

        console.log('[donate_standalone] порт ' + PORT + ' занят — donate уже работает в RAGE, standalone останавливается');

        if (require.main === module) process.exit(0);

        return;

    }

    console.error('[donate_standalone] http:', err.message || err);

});

