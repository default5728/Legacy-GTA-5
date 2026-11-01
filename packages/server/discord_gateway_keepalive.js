/**
 * Discord Gateway — бот онлайн, статус: «Смотрит Онлайн: X на сервере».
 */
var WebSocket;
try {
    WebSocket = require('ws');
} catch (e) {
    WebSocket = null;
}

var REFRESH_MS = 30000;

var gatewayStarted = false;
var gatewayWs = null;
var heartbeatTimer = null;
var lastSeq = null;

var runtime = {
    getToken: function () {
        return '';
    },
    getServerOnline: function () {
        return 0;
    },
    guildId: '',
    channelIdsForGuild: []
};

var statsTimer = null;
var serverPushTimer = null;
var refreshDebounce = null;
var refreshInFlight = false;

function clamp128(text) {
    var s = String(text == null ? '' : text);
    if (s.length <= 128) return s;
    return s.slice(0, 128);
}

function buildPresenceText() {
    var serverOnline = Math.max(0, parseInt(runtime.getServerOnline(), 10) || 0);
    return clamp128('Онлайн: ' + serverOnline + ' на сервере');
}

/** type 3 = Watching («Смотрит»), как у Admin Bots — не Custom Status справа. */
function buildActivity() {
    return {
        name: buildPresenceText(),
        type: 3
    };
}

function pushPresenceOnly() {
    pushPresence();
}

function pushPresence() {
    if (!gatewayWs || !WebSocket || gatewayWs.readyState !== WebSocket.OPEN) return;
    try {
        gatewayWs.send(
            JSON.stringify({
                op: 3,
                d: {
                    status: 'online',
                    since: null,
                    activities: [buildActivity()],
                    afk: false
                }
            })
        );
    } catch (_e) {}
}

function refreshPresence() {
    if (refreshInFlight) return Promise.resolve();
    refreshInFlight = true;
    return Promise.resolve()
        .then(function () {
            pushPresence();
        })
        .finally(function () {
            refreshInFlight = false;
        });
}

function schedulePresenceRefresh(delayMs) {
    if (refreshDebounce) clearTimeout(refreshDebounce);
    refreshDebounce = setTimeout(function () {
        refreshDebounce = null;
        refreshPresence();
    }, delayMs == null ? 1500 : delayMs);
}

function clearHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function connect() {
    if (!WebSocket) return;

    var token = runtime.getToken();
    if (!token) return;

    clearHeartbeat();
    gatewayWs = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    lastSeq = null;

    gatewayWs.on('message', function (raw) {
        var payload;
        try {
            payload = JSON.parse(raw);
        } catch (e) {
            return;
        }
        var op = payload.op;
        var d = payload.d;
        if (payload.s !== null && payload.s !== undefined) {
            lastSeq = payload.s;
        }

        if (op === 10) {
            var interval = d.heartbeat_interval;
            gatewayWs.send(
                JSON.stringify({
                    op: 2,
                    d: {
                        token: token,
                        properties: {
                            os: process.platform || 'linux',
                            browser: 'FlowDM',
                            device: 'FlowDM'
                        },
                        intents: 1,
                        presence: {
                            status: 'online',
                            since: null,
                            activities: [buildActivity()],
                            afk: false
                        }
                    }
                })
            );
            var sendHeartbeat = function () {
                if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
                    gatewayWs.send(JSON.stringify({ op: 1, d: lastSeq }));
                }
            };
            sendHeartbeat();
            heartbeatTimer = setInterval(sendHeartbeat, interval);
            refreshPresence();
            setTimeout(function () {
                refreshPresence();
            }, 5000);
        } else if (op === 0 && payload.t === 'INTERACTION_CREATE' && d) {
            try {
                var handled = false;
                try {
                    handled = !!require('./discord_donate.js').handleDonateInteraction(d);
                } catch (eDonate) {
                    console.log('[discord] donate interaction:', eDonate.message || eDonate);
                }
                if (!handled) {
                    try {
                        handled = !!require('./discord_recovery.js').handleRecoveryInteraction(d);
                    } catch (eRec) {
                        console.log('[discord] recovery interaction:', eRec.message || eRec);
                    }
                }
                if (!handled) {
                    try {
                        var recP = require('./discord_receipts.js').handleReceiptInteraction(d);
                        if (recP && typeof recP.catch === 'function') {
                            recP.catch(function (eRecipt) {
                                console.log('[discord] receipt interaction:', eRecipt.message || eRecipt);
                            });
                        }
                    } catch (eRecipt) {
                        console.log('[discord] receipt interaction:', eRecipt.message || eRecipt);
                    }
                }
            } catch (e) {
                console.log('[discord] interaction:', e.message || e);
            }
        } else if (op === 7 || op === 9) {
            try {
                gatewayWs.close();
            } catch (e) {}
        }
    });

    gatewayWs.on('close', function () {
        clearHeartbeat();
        setTimeout(connect, 5000);
    });

    gatewayWs.on('error', function (err) {
        console.log('[discord] gateway:', err.message || err);
    });
}

function normalizeConfig(getTokenOrConfig, activityName) {
    if (typeof getTokenOrConfig === 'function' && typeof activityName === 'string') {
        return {
            getToken: getTokenOrConfig,
            getServerOnline: runtime.getServerOnline,
            guildId: '',
            channelIdsForGuild: []
        };
    }
    if (typeof getTokenOrConfig === 'string') {
        var token = getTokenOrConfig;
        return {
            getToken: function () {
                return token;
            },
            getServerOnline: runtime.getServerOnline,
            guildId: '',
            channelIdsForGuild: []
        };
    }
    var cfg = getTokenOrConfig || {};
    return {
        getToken:
            typeof cfg.getToken === 'function'
                ? cfg.getToken
                : function () {
                      return String(cfg.getToken || '').trim();
                  },
        getServerOnline:
            typeof cfg.getServerOnline === 'function' ? cfg.getServerOnline : runtime.getServerOnline,
        guildId: cfg.guildId != null ? String(cfg.guildId).trim() : '',
        channelIdsForGuild: Array.isArray(cfg.channelIdsForGuild) ? cfg.channelIdsForGuild : []
    };
}

module.exports = function startDiscordGatewayPresence(getTokenOrConfig, activityName) {
    if (!WebSocket) {
        console.log('[discord] установите ws: npm install ws — иначе бот будет «офлайн»');
        return;
    }

    runtime = normalizeConfig(getTokenOrConfig, activityName);
    if (!runtime.getToken()) return;

    if (gatewayStarted) {
        refreshPresence();
        return;
    }
    gatewayStarted = true;

    if (statsTimer) clearInterval(statsTimer);
    statsTimer = setInterval(function () {
        pushPresenceOnly();
    }, REFRESH_MS);

    if (serverPushTimer) clearInterval(serverPushTimer);
    serverPushTimer = setInterval(function () {
        pushPresenceOnly();
    }, 10000);

    connect();
    console.log('[discord] gateway: статус «Смотрит Онлайн: X на сервере»');
};

module.exports.setDiscordGatewayActivity = function setDiscordGatewayActivity() {
    schedulePresenceRefresh(500);
};

module.exports.refreshDiscordGatewayPresence = function refreshDiscordGatewayPresence() {
    pushPresenceOnly();
    schedulePresenceRefresh(500);
};
