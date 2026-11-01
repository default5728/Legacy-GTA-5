'use strict';

module.exports = {
    SERVER_ID: process.env.SERVER_ID || 'bloody-dm-1',
    BETTING_MS: 30000,
    DRAWING_MS: 5000,
    FINISHED_MS: 5000,
    WAITING_MS: 3000,
    SNAPSHOT_INTERVAL_MS: 30000,
    MIN_PARTICIPANTS_TO_DRAW: 2,
    TOP_PARTICIPANTS_UI: 12,
    BET_RATE_LIMIT_MS: 800,
    DAILY_BET_LIMIT: 50000,
    DAILY_RESET_HOUR_MSK: 7,
    LOCK_NAME_ROUND: 'global_casino_round_lock',
    LOCK_NAME_FINISH: 'global_casino_finish_lock'
};
