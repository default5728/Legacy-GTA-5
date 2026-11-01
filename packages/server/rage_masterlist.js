'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const MASTERLIST_URL = 'https://cdn.rage.mp/master/';
const CACHE_MS = 30000;
const DEFAULT_HOST = 'play.flowdm.fun:22005';

let cache = {
    fetchedAt: 0,
    map: null
};

function getServerHost() {
    return process.env.RAGE_MASTERLIST_HOST || DEFAULT_HOST;
}

function fetchMasterlistMap() {
    const now = Date.now();
    if (cache.map && now - cache.fetchedAt < CACHE_MS) {
        return Promise.resolve(cache.map);
    }

    return new Promise(function (resolve, reject) {
        const req = https.get(
            MASTERLIST_URL,
            {
                headers: {
                    'User-Agent': 'FlowDM-Site/1.0',
                    Accept: 'application/json'
                },
                timeout: 8000
            },
            function (res) {
                let body = '';
                res.on('data', function (chunk) {
                    body += chunk;
                    if (body.length > 8 * 1024 * 1024) {
                        req.destroy(new Error('masterlist_too_large'));
                    }
                });
                res.on('end', function () {
                    if (res.statusCode !== 200) {
                        return reject(new Error('masterlist_http_' + res.statusCode));
                    }
                    try {
                        const parsed = JSON.parse(body);
                        cache.map = parsed && typeof parsed === 'object' ? parsed : {};
                        cache.fetchedAt = now;
                        resolve(cache.map);
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        req.on('error', reject);
        req.on('timeout', function () {
            req.destroy(new Error('masterlist_timeout'));
        });
    });
}

function pickServerEntry(map, host) {
    if (!map || typeof map !== 'object') return null;

    const wanted = String(host || DEFAULT_HOST).trim().toLowerCase();
    if (map[wanted]) {
        return { key: wanted, info: map[wanted] };
    }

    for (const key of Object.keys(map)) {
        if (String(key).toLowerCase() === wanted) {
            return { key: key, info: map[key] };
        }
    }

    for (const key of Object.keys(map)) {
        const info = map[key];
        if (!info || typeof info !== 'object') continue;
        const url = String(info.url || '').toLowerCase();
        const name = String(info.name || '');
        if (url.indexOf('flowdm.fun') !== -1 && /flow\s*dm/i.test(name)) {
            return { key: key, info: info };
        }
    }

    return null;
}

function normalizeServerInfo(entry) {
    if (!entry || !entry.info) return null;
    const info = entry.info;
    return {
        address: entry.key,
        name: String(info.name || '').trim(),
        gamemode: String(info.gamemode || '').trim(),
        lang: String(info.lang || '').trim(),
        url: String(info.url || '').trim(),
        online: Math.max(0, parseInt(info.players, 10) || 0),
        max: Math.max(0, parseInt(info.maxplayers, 10) || 0),
        peak: Math.max(0, parseInt(info.peak, 10) || 0)
    };
}

function getLocalOnlineFallback() {
    let online = 0;
    let max = 100;
    try {
        if (typeof mp !== 'undefined' && mp.players) {
            mp.players.forEach(function (p) {
                if (!p || !mp.players.exists(p)) return;
                if (p.getVariable && p.getVariable('auth')) online++;
            });
            if (!online && mp.players.length) online = mp.players.length;
        }
    } catch (_e) {}
    try {
        const confPath = path.join(__dirname, '../../conf.json');
        const cfg = JSON.parse(fs.readFileSync(confPath, 'utf8'));
        if (cfg && cfg.maxplayers) max = parseInt(cfg.maxplayers, 10) || max;
        return {
            address: getServerHost(),
            name: cfg && cfg.name ? String(cfg.name) : 'FLOW DM',
            gamemode: cfg && cfg.gamemode ? String(cfg.gamemode) : 'deathmatch',
            online: online,
            max: max,
            peak: online,
            source: 'local'
        };
    } catch (_e2) {
        return {
            address: getServerHost(),
            name: 'FLOW DM',
            gamemode: 'deathmatch',
            online: online,
            max: max,
            peak: online,
            source: 'local'
        };
    }
}

function getMasterlistServerStatus(cb) {
    const host = getServerHost();
    fetchMasterlistMap()
        .then(function (map) {
            const picked = pickServerEntry(map, host);
            const normalized = normalizeServerInfo(picked);
            if (!normalized) {
                const fallback = getLocalOnlineFallback();
                fallback.source = 'local';
                return cb(null, fallback);
            }
            normalized.source = 'masterlist';
            cb(null, normalized);
        })
        .catch(function (err) {
            const fallback = getLocalOnlineFallback();
            fallback.source = 'local';
            fallback.masterlistError = err && err.message ? err.message : String(err);
            cb(null, fallback);
        });
}

module.exports = {
    getMasterlistServerStatus,
    fetchMasterlistMap,
    getServerHost
};
