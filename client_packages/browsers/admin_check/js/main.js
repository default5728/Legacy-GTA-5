(function () {
    'use strict';

    document.addEventListener('selectstart', function (e) {
        e.preventDefault();
    }, true);

    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
    }, true);

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
        }
    }, true);

    const menu = document.getElementById('admin-alert');
    const discordName = document.getElementById('discord-name');
    const discordBlock = document.querySelector('.proverka-discord');

    function parsePayload(jsonStr) {
        if (jsonStr == null || jsonStr === '') return {};
        try {
            if (typeof jsonStr === 'object') return jsonStr;
            const once = JSON.parse(String(jsonStr));
            if (typeof once === 'string') {
                try {
                    return JSON.parse(once);
                } catch (_e) {
                    return { discordTag: once };
                }
            }
            return once || {};
        } catch (_e) {
            return {};
        }
    }

    function copyDiscord(text) {
        const value = String(text || '').trim();
        if (!value) return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value);
                return;
            }
        } catch (_e) {}
        try {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (_e2) {}
    }

    if (discordBlock) {
        discordBlock.addEventListener('click', function () {
            copyDiscord(discordName ? discordName.textContent : '');
        });
    }

    window.adminCheckOpen = function (jsonStr) {
        const data = parsePayload(jsonStr);
        if (discordName) {
            discordName.textContent = data.discordTag || data.discord || '—';
        }
        if (menu) menu.style.display = 'flex';
    };

    window.adminCheckClose = function () {
        if (menu) menu.style.display = 'none';
    };

    window.addEventListener('load', function () {
        if (menu) menu.style.display = 'none';
    });
})();
