'use strict';

/**
 * Admin Discord bot entry for RAGE.
 * RAGE embeds an old Node that cannot parse discord.js v14 (??=).
 * Spawn system Node.js instead — no .bat, starts with the server.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RUNNER = path.join(__dirname, 'discord_admin_runner.js');
const PID_FILE = path.join(__dirname, 'discord_admin', 'admin_bot.pid');

let child = null;
let stopping = false;

function log(msg) {
    console.log('[discord_admin]', msg);
}

function resolveSystemNode() {
    if (process.env.DISCORD_ADMIN_NODE && fs.existsSync(process.env.DISCORD_ADMIN_NODE)) {
        return process.env.DISCORD_ADMIN_NODE;
    }
    if (process.platform !== 'win32') {
        const unixCandidates = [
            path.join(__dirname, '..', '..', 'node_dist', 'bin', 'node'),
            '/usr/bin/node',
            '/usr/local/bin/node',
            '/usr/bin/nodejs',
            '/usr/local/nodejs/bin/node',
            '/opt/nodejs/bin/node',
            '/root/.nvm/versions/node/current/bin/node',
            '/home/container/.nvm/versions/node/current/bin/node',
            '/home/container/.local/bin/node'
        ];
        for (let i = 0; i < unixCandidates.length; i++) {
            if (unixCandidates[i] && fs.existsSync(unixCandidates[i])) return unixCandidates[i];
        }
        const which = require('child_process').spawnSync('sh', ['-c', 'command -v node || which node'], { encoding: 'utf8' });
        const found = which && which.stdout ? which.stdout.split(/\r?\n/)[0].trim() : '';
        if (found) return found;
        return null;
    }
    const candidates = [
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Program Files (x86)\\nodejs\\node.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe')
    ];
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i] && fs.existsSync(candidates[i])) return candidates[i];
    }
    return 'node';
}

function writePid(pid) {
    try {
        fs.writeFileSync(PID_FILE, String(pid), 'utf8');
    } catch (_e) {}
}

function clearPid() {
    try {
        if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch (_e) {}
}

function stopChild() {
    if (!child || !child.pid) return;
    stopping = true;
    try {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
                windowsHide: true,
                stdio: 'ignore'
            });
        } else {
            child.kill('SIGTERM');
        }
    } catch (e) {
        log('stop: ' + (e.message || e));
    }
}

function startAdminBot() {
    if (!fs.existsSync(RUNNER)) {
        log('runner missing: ' + RUNNER);
        return;
    }
    if (child) {
        log('already running pid=' + child.pid);
        return;
    }

    const nodeBin = resolveSystemNode();
    if (!nodeBin) {
        log('Node.js не найден. Установите Node.js 18+ или задайте DISCORD_ADMIN_NODE=/полный/путь/node. Админ-бот не запущен.');
        return;
    }
    log('starting via ' + nodeBin);

    child = spawn(nodeBin, [RUNNER], {
        cwd: __dirname,
        env: Object.assign({}, process.env, { PYTHONUNBUFFERED: undefined }),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    writePid(child.pid);
    log('spawned pid=' + (child.pid || 'pending'));

    child.stdout.on('data', function (buf) {
        String(buf)
            .split(/\r?\n/)
            .filter(Boolean)
            .forEach(function (line) {
                console.log(line);
            });
    });
    child.stderr.on('data', function (buf) {
        String(buf)
            .split(/\r?\n/)
            .filter(Boolean)
            .forEach(function (line) {
                console.log(line);
            });
    });

    child.on('exit', function (code, signal) {
        log('exited code=' + code + ' signal=' + signal);
        clearPid();
        child = null;
        if (!stopping) setTimeout(startAdminBot, 5000);
        stopping = false;
    });

    child.on('error', function (err) {
        log('spawn error: ' + (err && err.message ? err.message : err));
        clearPid();
        child = null;
    });
}

function killDonateStandalone() {
    // RAGE already runs donate gateway — standalone would double-ack interactions
    try {
        if (process.platform !== 'win32') return;
        const { execSync } = require('child_process');
        execSync(
            'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Where-Object { $_.CommandLine -match \'discord_donate_standalone\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
            { windowsHide: true, stdio: 'ignore', timeout: 8000 }
        );
        log('stopped donate standalone (RAGE owns donate)');
    } catch (_e) {}
}

function hookExit() {
    const shutdown = function () {
        stopChild();
        clearPid();
    };
    process.on('exit', shutdown);
    process.on('SIGINT', function () {
        shutdown();
    });
    process.on('SIGTERM', function () {
        shutdown();
    });
}

killDonateStandalone();
hookExit();
startAdminBot();

module.exports = {
    startAdminBot,
    stopChild
};
