/* gta5rp downtown chat — логика 1:1, мост на Phantom server */
var CHAT_MODE = {
    SAY: 0, FACTION: 1, FACTION_NRP: 2, DEPARTAMENT: 3, SCREAM: 4, WHISPER: 5,
    B: 6, ME: 7, DO: 8, TRY: 9, TODO: 10, REPORT: 11, NEWS: 12, FAMILY: 13,
    MEGAFON: 14, FAMILYB: 15, MEDIA: 16, ADMIN: 17
};

var chat = {
    size: 0,
    container: null,
    input: null,
    enabled: false,
    active: true,
    visible: true,
    chatToggle: true,
    previous: [],
    previousIndex: 0,
    mode: 0,
    hideTimeout: null,
    shadow: true,
    enableTimestamp: false,
    baseOpacity: 1,
    adminSuggestActive: false,
    adminCmdHints: []
};

var chatInputData =
    '<div id="chat_input_box">' +
        '<div id="chat_input_block">' +
            '<div id="chat_mode_text"></div>' +
            '<input id="chat_input" type="text" maxlength="200" autocomplete="off" />' +
            '<img src="Chat/chat-ico.png" class="chat-input-send" alt="" draggable="false" style="margin-right: 10px;" />' +
        '</div>' +
        '<div id="chat_input_buttons_block">' +
            '<button type="button" tabindex="-1" chat-btn-mode="' + CHAT_MODE.SAY + '" class="chat-btn">Общий</button>' +
            '<button type="button" tabindex="-1" chat-btn-mode="' + CHAT_MODE.ADMIN + '" class="chat-btn chat-channel-admin" style="display:none;">Админ</button>' +
            '<button type="button" tabindex="-1" chat-btn-mode="' + CHAT_MODE.FACTION + '" class="chat-btn chat-channel-fraction" style="display:none;">Фракция</button>' +
            '<button type="button" tabindex="-1" chat-btn-mode="' + CHAT_MODE.FAMILY + '" class="chat-btn chat-channel-family" style="display:none;">Организация</button>' +
            '<button type="button" tabindex="-1" chat-btn-mode="' + CHAT_MODE.MEDIA + '" class="chat-btn chat-channel-media" style="display:none;">Media</button>' +
        '</div>' +
        '<div class="admin-cmd-suggest hide" id="adminCmdSuggest"></div>' +
    '</div>';

var shiftMode = false;
var ctrlMode = false;
var chatInputClosing = false;
var CHAT_INPUT_ANIMATION_MS = 160;

var COLOR_NAMES = {
    white: 'ffffff', black: '000000', red: 'ff0000', green: '00ff00', blue: '0000ff',
    yellow: 'ffff00', orange: 'ffa500', purple: 'a855f7', pink: 'ff69b4',
    gray: '808080', grey: '808080', gold: 'ffd700', lime: '84cc16', aqua: '22d3ee', cyan: '22d3ee'
};

function trigger(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    try {
        if (typeof mp !== 'undefined' && mp.trigger) mp.trigger.apply(mp, [name].concat(args));
    } catch (_e) {}
}

function invokeFocus(on) {
    try {
        if (typeof mp !== 'undefined' && mp.invoke) {
            mp.invoke('focus', !!on);
            mp.invoke('setTypingInChatState', !!on);
        }
    } catch (_e) {}
    trigger('chatTypingState', !!on);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function escapeHtmlChat(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function rageColorTokenToCss(token) {
    var raw = String(token || '').trim();
    if (!raw) return null;
    if (/^[0-9A-Fa-f]{6}$/.test(raw) || /^[0-9A-Fa-f]{3}$/.test(raw)) {
        if (raw.length === 3) {
            return '#' + raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
        }
        return '#' + raw.toLowerCase();
    }
    if (raw.charAt(0) === '#') {
        var h = raw.slice(1).replace(/\s/g, '');
        if (/^[0-9A-Fa-f]{3}$/.test(h)) {
            return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        if (/^[0-9A-Fa-f]{6}$/.test(h)) return '#' + h.toLowerCase();
        return null;
    }
    var named = COLOR_NAMES[raw.toLowerCase()];
    return named ? ('#' + named) : null;
}

function isTrustedChatSpanHtml(str) {
    var s = String(str || '');
    if (!/<span/i.test(s)) return false;
    if (/<(video|iframe|script|object|embed|link|svg|form|input|button|meta|base|audio|source|track)/i.test(s)) return false;
    if (/on\w+\s*=/i.test(s)) return false;
    if (/javascript:/i.test(s)) return false;
    var stripped = s.replace(/<\/?span(?:\s+style="color:\s*[^"]*")?\s*>/gi, '');
    return !/<[^>]+>/.test(stripped);
}

function sanitizeTrustedSpanHtml(html) {
    return String(html || '').replace(
        /<span\s+style="([^"]*)"\s*>/gi,
        function (_full, styleRaw) {
            var colorMatch = /(?:^|;|\s)color:\s*([^;]+)/i.exec(String(styleRaw || ''));
            var token = colorMatch ? String(colorMatch[1] || '').trim() : '';
            var css = rageColorTokenToCss(token) || token || '#ffffff';
            return "<font color='" + String(css).replace(/'/g, '') + "'>";
        }
    ).replace(/<\/span>/gi, '</font>');
}

function parseRageColorCodes(s) {
    return String(s || '').replace(/\{!?(#[0-9A-Fa-f]{3,8}|[0-9A-Fa-f]{3,8})\}/g, function (_m, token) {
        var raw = String(token || '').trim();
        var css = rageColorTokenToCss(raw.charAt(0) === '#' ? raw.slice(1) : raw);
        if (css) return "<font color='" + css.replace(/'/g, '') + "'>";
        return '';
    });
}

function replaceBrawlJoinMarkers(html) {
    return String(html || '').replace(/\[\[BRWLJ\]\]([\s\S]*?)\[\[\/BRWLJ\]\]/g, function (_m, g1) {
        var ch = '';
        try { ch = decodeURIComponent(String(g1 || '').trim()); } catch (_e) { ch = String(g1 || '').trim(); }
        if (!ch) return '';
        var escCh = escapeHtmlChat(ch).replace(/"/g, '&quot;');
        return '<span class="chat-brawl-join" data-brawl="' + escCh + '" title="Войти в бравл: ' + escCh + '" style="cursor:pointer;">👪</span>';
    });
}

function copyChatLinkText(str) {
    var text = String(str || '');
    if (!text) return Promise.resolve();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).catch(function () {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-2000px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_e) {}
            document.body.removeChild(ta);
        });
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-2000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_e2) {}
    document.body.removeChild(ta);
    return Promise.resolve();
}

function replaceLinkMarkers(html) {
    return String(html || '').replace(/\[\[LINK\|([^|\]]+)\|([^\]]+)\]\]/g, function (_m, url, label) {
        var u = String(url || '').trim();
        var l = String(label || '').trim();
        if (!/^https?:\/\//i.test(u)) return escapeHtmlChat(l || u);
        var escUrl = escapeHtmlChat(u).replace(/"/g, '&quot;');
        var escLabel = escapeHtmlChat(l || u);
        return '<span class="chat-link" data-url="' + escUrl + '" title="Нажмите, чтобы скопировать ссылку">' + escLabel + '</span>';
    });
}

function parseChatColors(raw) {
    var s = String(raw == null ? '' : raw);
    if (!s) return '';

    if (isTrustedChatSpanHtml(s)) {
        return sanitizeTrustedSpanHtml(s);
    }

    if (/<font[\s>]/i.test(s) && !/<(script|iframe|object|embed)/i.test(s)) {
        return s;
    }

    // сначала !{color} — иначе parseRageColorCodes съедает {#FFF} и оставляет !
    var a = s.replace(/!{([^}]+)}/g, function (_m, token) {
        var css = rageColorTokenToCss(token);
        if (css) return "<font color='" + css + "'>";
        var t = String(token || '').trim();
        if (t.charAt(0) === '#') t = t.slice(1);
        if (/^[0-9A-Fa-f]{3}$/.test(t) || /^[0-9A-Fa-f]{6}$/.test(t)) {
            return "<font color='#" + t.toLowerCase() + "'>";
        }
        var named = COLOR_NAMES[t.toLowerCase()];
        if (named) return "<font color='#" + named + "'>";
        return '';
    });
    a = parseRageColorCodes(a);
    return a;
}

var chatAPI = {
    push: function (a) {
        chat.size++;
        if (chat.size >= 50 && chat.container.children().length) {
            chat.container.children(':first').remove();
        }

        var html = parseChatColors(a);

        if (chat.enableTimestamp) {
            var d = new Date();
            var ts = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
            var m = html.match(/<font(.*?)>/);
            html = (m && m.index === 0)
                ? html.slice(0, m[0].length) + '[' + ts + '] ' + html.slice(m[0].length)
                : '[' + ts + '] ' + html;
        }

        html = html.replace(/\|ph\|(\d+)\|ph\|/g,
            "<span onclick=\"return false;\" class=\"chat-ico-button\"><i class=\"fas fa-phone pe-none\"></i></span>" +
            "<span onclick=\"return false;\" class=\"chat-ico-button\"><i class=\"far fa-envelope pe-none\"></i></span>");
        html = html.replace(/\|v\|([0-9-]+),([0-9-]+),([0-9-]+)\|v\|/g,
            "<span onclick=\"return false;\" class=\"chat-ico-button\"><i class=\"fas fa-map-marker-alt pe-none\"></i></span>");

        html = replaceBrawlJoinMarkers(html);
        html = replaceLinkMarkers(html);

        chat.container.append('<li><span class="chat-msg-text">' + html + '</span></li>');
        chat.container.scrollTop(9999);

        if (chat.shadow && chat.active && chat.input === null) {
            $('#chat').stop(true).animate({ opacity: chat.baseOpacity }, 200);
            if (chat.hideTimeout != null) clearTimeout(chat.hideTimeout);
            chat.hideTimeout = setTimeout(function () {
                $('#chat').animate({ opacity: Math.max(0.15, chat.baseOpacity * 0.3) }, 1000);
            }, 5000);
        }
    },
    clear: function () {
        for (var i = 0; i < 50; i++) this.push('  ');
        chatAPI.push('!{FFA500}Чат был очищен администрацией');
    },
    reset: function () {
        chat.container.empty();
        chat.size = 0;
    },
    activate: function (a) {
        // markAsChat: нативный activate(false) не закрывает кастомный ввод Flow.
        if (a === false) return;
        chat.active = true;
    },
    show: function (a) {
        // markAsChat: show(false) только подавляет stock RAGE chat, не наш CEF.
        if (a) {
            $('#chat').show();
            chat.active = true;
        }
    }
};

function updateChatMode() {
    var labels = {};
    labels[CHAT_MODE.SAY]         = 'Сказать:';
    labels[CHAT_MODE.FACTION]     = 'Фракция:';
    labels[CHAT_MODE.FACTION_NRP] = 'Рация (NRP):';
    labels[CHAT_MODE.DEPARTAMENT] = 'Департамент:';
    labels[CHAT_MODE.SCREAM]      = 'Крикнуть:';
    labels[CHAT_MODE.WHISPER]     = 'Шептать:';
    labels[CHAT_MODE.REPORT]      = 'Репорт ( для жалоб ):';
    labels[CHAT_MODE.NEWS]        = 'Прямой эфир:';
    labels[CHAT_MODE.FAMILY]      = 'Организация:';
    labels[CHAT_MODE.FAMILYB]     = 'Организация (NRP):';
    labels[CHAT_MODE.MEGAFON]     = 'Мегафон:';
    labels[CHAT_MODE.MEDIA]       = 'Media:';
    labels[CHAT_MODE.ADMIN]       = 'Админ:';

    $('#chat_mode_text').text(labels[chat.mode] || '');
    $('[chat-btn-mode]').removeClass('active');
    $('[chat-btn-mode="' + chat.mode + '"]').addClass('active');
}

function parseAdminCmdHints(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    try {
        var parsed = JSON.parse(String(raw));
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
        return [];
    }
}

function renderAdminCmdSuggest() {
    var wrap = $('#adminCmdSuggest');
    if (!wrap.length) return;

    var value = chat.input ? String(chat.input.find('#chat_input').val() || '') : '';
    var query = value.trim().toLowerCase();
    if (!query || query.charAt(0) !== '/' || !chat.adminCmdHints.length) {
        wrap.addClass('hide').empty();
        return;
    }

    var needle = query.slice(1);
    var items = chat.adminCmdHints.filter(function (item) {
        var cmd = String(item && item.cmd || '').replace(/^\/+/, '').toLowerCase();
        return cmd.indexOf(needle) === 0;
    }).slice(0, 10);

    if (!items.length) {
        wrap.addClass('hide').empty();
        return;
    }

    wrap.removeClass('hide').html(items.map(function (item) {
        var cmd = String(item && item.cmd || '').replace(/^\/+/, '');
        var desc = String(item && item.desc || '');
        return '<div class="admin-cmd-suggest__item" role="button">' +
            '<span class="admin-cmd-suggest__cmd">/' + escapeHtmlChat(cmd) + '</span>' +
            '<span class="admin-cmd-suggest__desc">' + escapeHtmlChat(desc) + '</span>' +
        '</div>';
    }).join(''));
}

function releaseChatBrowserFocus() {
    try {
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
    } catch (_e) {}
    if (chat.input === null) invokeFocus(false);
}

window.__chatReleaseFocus = releaseChatBrowserFocus;

function enableChatInput(enable, mode) {
    if (enable) {
        if (chat.input !== null && !chatInputClosing) return;
        if (chat.input !== null && chatInputClosing) {
            chat.input.stop(true, true).remove();
            chat.input = null;
            chatInputClosing = false;
            $('#chat').removeClass('chat-open');
        }
    } else {
        if (chat.input === null || chatInputClosing) return;
    }
    if (!chat.active && enable) return;
    if (!chat.visible && enable) return;

    invokeFocus(!!enable);

    if (enable) {
        $('#chat').addClass('chat-open');
        chat.input = $('#chat').append(chatInputData).children(':last');
        chat.input.hide();
        chat.mode = (mode == null ? CHAT_MODE.SAY : mode);
        applyChatChannelButtons();
        updateChatMode();
        chat.input.stop(true, true).fadeIn(CHAT_INPUT_ANIMATION_MS, function () {
            if (chat.input) chat.input.find('#chat_input').focus();
        });
        chat.input.find('#chat_input').focus();
        trigger('chatRequestCmdHints');

        var c = false;
        chat.input.find('#chat_input').on('keydown', function (e) {
            if ((e.which === 65 || e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                try { this.select(); } catch (_sel) {}
                return false;
            }
        });

        chat.input.find('#chat_input').on('keyup', function (e) {
            var v = $(this).val();
            if (chat.mode !== CHAT_MODE.SAY) {
                if (v === '' && e.which === 8) {
                    if (c) { chat.mode = CHAT_MODE.SAY; updateChatMode(); c = false; return; }
                    c = true;
                } else c = false;
            }
        });

        chat.input.find('#chat_input').on('input', function () {
            var v = $(this).val();
            var prefixes = [
                ['/say ',   CHAT_MODE.SAY],
                ['/r ',     CHAT_MODE.FACTION],
                ['/f ',     CHAT_MODE.FACTION],
                ['/rb ',    CHAT_MODE.FACTION_NRP],
                ['/fb ',    CHAT_MODE.FACTION_NRP],
                ['/d ',     CHAT_MODE.DEPARTAMENT],
                ['/s ',     CHAT_MODE.SCREAM],
                ['/w ',     CHAT_MODE.WHISPER],
                ['/report ',CHAT_MODE.REPORT],
                ['/news ',  CHAT_MODE.NEWS],
                ['/fam ',   CHAT_MODE.FAMILY],
                ['/ff ',    CHAT_MODE.FAMILY],
                ['/famb ',  CHAT_MODE.FAMILYB],
                ['/ffb ',   CHAT_MODE.FAMILYB],
                ['/m ',     CHAT_MODE.MEGAFON],
                ['/media ', CHAT_MODE.MEDIA]
            ];
            for (var i = 0; i < prefixes.length; i++) {
                if (v.startsWith(prefixes[i][0])) {
                    chat.mode = prefixes[i][1];
                    updateChatMode();
                    $(this).val(v.slice(prefixes[i][0].length).replace(/^\s+/, ''));
                    $(this).focus();
                    break;
                }
            }
            renderAdminCmdSuggest();
        });

        $('#chat').stop(true).animate({ opacity: 1 }, 200);
        if (chat.hideTimeout != null) { clearTimeout(chat.hideTimeout); chat.hideTimeout = null; }
    } else {
        if (chat.input) {
            var inp = chat.input;
            chatInputClosing = true;
            inp.stop(true, false).fadeOut(CHAT_INPUT_ANIMATION_MS, function () {
                inp.remove();
                if (chat.input && chat.input[0] === inp[0]) {
                    chat.input = null;
                    chatInputClosing = false;
                    $('#chat').removeClass('chat-open');
                }
            });
        }
        if (chat.shadow) {
            if (chat.hideTimeout != null) clearTimeout(chat.hideTimeout);
            chat.hideTimeout = setTimeout(function () {
                $('#chat').animate({ opacity: Math.max(0.15, chat.baseOpacity * 0.3) }, 1000);
            }, 5000);
        }
        releaseChatBrowserFocus();
    }
}

function sendMessage() {
    if (!chat.input) return;
    var raw = String(chat.input.find('#chat_input').val() || '').trim();

    if (!raw) {
        enableChatInput(false);
        return;
    }

    if (raw === '/alogin13') {
        trigger('chatSendSay', '/alogin13');
        enableChatInput(false);
        return;
    }

    if (raw.length > 0) {
        if (chat.mode === CHAT_MODE.SAY) {
            if (raw.startsWith('/roll')) { trigger('chatExecCommand', raw.slice(1)); enableChatInput(false); return; }
            if (raw.startsWith('/mute')) { trigger('chatExecCommand', raw.slice(1)); enableChatInput(false); return; }
            if (raw.startsWith('/unmute')) { trigger('chatExecCommand', raw.slice(1)); enableChatInput(false); return; }
            if (raw === '/exit') { trigger('chatExecCommand', 'exit'); enableChatInput(false); return; }
            trigger('chatSendSay', raw);
            chat.previous.push('/say ' + raw);
        } else if (chat.mode === CHAT_MODE.ADMIN) {
            trigger('chatSendChannel', 'admin', raw);
            chat.previous.push('/admin ' + raw);
        } else if (chat.mode === CHAT_MODE.FACTION) {
            trigger('chatSendChannel', 'fraction', raw);
            chat.previous.push('/r ' + raw);
        } else if (chat.mode === CHAT_MODE.FACTION_NRP) {
            trigger('chatSendChannel', 'fraction_nrp', raw);
            chat.previous.push('/rb ' + raw);
        } else if (chat.mode === CHAT_MODE.DEPARTAMENT) {
            trigger('chatSendChannel', 'department', raw);
            chat.previous.push('/d ' + raw);
        } else if (chat.mode === CHAT_MODE.SCREAM) {
            trigger('chatExecCommand', 's ' + raw);
            chat.previous.push('/s ' + raw);
        } else if (chat.mode === CHAT_MODE.WHISPER) {
            trigger('chatExecCommand', 'w ' + raw);
            chat.previous.push('/w ' + raw);
        } else if (chat.mode === CHAT_MODE.FAMILY) {
            trigger('chatSendChannel', 'family', raw);
            chat.previous.push('/fam ' + raw);
        } else if (chat.mode === CHAT_MODE.FAMILYB) {
            trigger('chatSendChannel', 'family_nrp', raw);
            chat.previous.push('/famb ' + raw);
        } else if (chat.mode === CHAT_MODE.REPORT) {
            if (raw.length > 35) {
                chatAPI.push('!{FFA500}Ограничение жалобы 35 символов. Используй F10 — Репорт.');
                enableChatInput(false);
                return;
            }
            trigger('chatExecCommand', 'report ' + raw);
            chat.previous.push('/report ' + raw);
        } else if (chat.mode === CHAT_MODE.NEWS) {
            trigger('chatExecCommand', 'news ' + raw);
            chat.previous.push('/news ' + raw);
        } else if (chat.mode === CHAT_MODE.MEGAFON) {
            trigger('chatExecCommand', 'm ' + raw);
            chat.previous.push('/m ' + raw);
        } else if (chat.mode === CHAT_MODE.MEDIA) {
            trigger('chatSendChannel', 'media', raw);
            chat.previous.push('/media ' + raw);
        }

        if (chat.previous.length > 10) chat.previous = chat.previous.slice(1);
        chat.previousIndex = chat.previous.length;
        enableChatInput(false);
        return;
    }
}

window.chatAPI = chatAPI;

window.__chatBlockOpenCompose = false;

window.chatOpen = function () {
    if (window.__chatBlockOpenCompose) return;
    if (!chat.chatToggle) return;
    if (!chat.active) chat.active = true;
    if (!chat.visible) window.showChat();
    if (chat.input !== null) return;
    enableChatInput(true, CHAT_MODE.SAY);
    chat.container.scrollTop(999999);
};

window.chatOpenWithMode = function (mode) {
    if (window.__chatBlockOpenCompose) return;
    if (!chat.chatToggle) return;
    if (!chat.active) chat.active = true;
    if (!chat.visible) window.showChat();
    if (chat.input !== null) return;
    enableChatInput(true, parseInt(mode, 10) || CHAT_MODE.SAY);
    chat.container.scrollTop(999999);
};

window.hideChat = function () {
    chat.visible = false;
    enableChatInput(false);
    $('#chat').addClass('chat-hidden').hide();
};

window.showChat = function () {
    chat.visible = true;
    chat.active = true;
    $('#chat').removeClass('chat-hidden').show();
    $('#chat').stop(true).css('opacity', chat.baseOpacity);
};

window.setToggleTimestamp = function (on) { chat.enableTimestamp = !!on; };

window.setToggleChat = function (on) {
    chat.chatToggle = !!on;
    if (!chat.chatToggle) window.hideChat(); else window.showChat();
};

window.applyChatSettings = function (raw) {
    try {
        var p = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        var rootStyle = document.documentElement.style;

        var h = Number(p.pageSize);
        if (!isFinite(h) || h <= 0) h = 240;
        if (h <= 60) h = Math.round(h * 9);
        h = Math.min(400, Math.max(80, Math.round(h)));
        rootStyle.setProperty('--ui-chat-messages-height', h + 'px');

        var lh = Number(p.lineHeight);
        if (!isFinite(lh) || lh <= 0) lh = 24;
        if (lh <= 3) lh = Math.round(lh * 16);
        lh = Math.min(40, Math.max(14, Math.round(lh)));
        rootStyle.setProperty('--ui-chat-messages-line-height', lh + 'px');

        var fs = Number(p.fontSize);
        if (!isFinite(fs) || fs <= 0) fs = 14;
        if (fs <= 3) fs = Math.round(fs * 16);
        fs = Math.min(18, Math.max(12, Math.round(fs)));
        rootStyle.setProperty('--ui-chat-messages-font-size', fs + 'px');

        var sc = Number(p.scale);
        if (!isFinite(sc) || sc <= 0) sc = 1.2;
        sc = Math.min(1.5, Math.max(1.0, sc));
        rootStyle.setProperty('--ui-chat-scale', sc);

        if (typeof p.chatWidth === 'number' && isFinite(p.chatWidth)) {
            var wPct = Math.min(55, Math.max(28, p.chatWidth));
            $('#chat').css('width', 'min(' + wPct + 'vw, 520px)');
        }
        $('#chat').css({ margin: 0, padding: 0 });
        $('#chat_input_box').css({
            position: 'relative',
            left: 'auto',
            top: 'auto',
            'margin-top': '10px',
            'margin-left': '15px',
            'margin-right': '0',
            width: 'calc(100% - 30px)',
            'max-width': 'calc(100% - 30px)'
        });
        $('#chat ul#chat_messages').css({
            height: 'auto',
            'min-height': '0',
            'max-height': 'var(--ui-chat-messages-height)',
            'margin-left': '15px',
            'margin-right': '0',
            width: 'calc(100% - 30px)',
            'max-width': 'calc(100% - 30px)'
        });

        if (typeof p.opacity === 'number' && isFinite(p.opacity)) {
            chat.baseOpacity = Math.max(0.1, Math.min(1, p.opacity));
            if (chat.input === null) $('#chat').css('opacity', chat.baseOpacity);
        }
        if (typeof p.timeStamp === 'boolean') chat.enableTimestamp = p.timeStamp;
        if (typeof p.chatToggle === 'boolean') chat.chatToggle = !!p.chatToggle;
        chat.shadow = true;
        if (chat.visible) {
            $('#chat').stop(true).animate({ opacity: chat.baseOpacity }, 200);
        } else if (chat.input === null) {
            $('#chat').css('opacity', chat.baseOpacity);
        }
    } catch (_e) {}
};

function applyChatChannelButtons() {
    var channels = chat._channels || {};
    $('.chat-channel-admin').toggle(!!channels.admin);
    $('.chat-channel-fraction').toggle(!!channels.fraction);
    $('.chat-channel-family').toggle(!!channels.family);
    $('.chat-channel-media').toggle(!!channels.media);

    var $block = $('#chat_input_buttons_block');
    if ($block.length) {
        var visibleCount = $block.find('.chat-btn:visible').length;
        $block.toggleClass('chat-buttons--single', visibleCount <= 1);
    }

    if (
        (chat.mode === CHAT_MODE.ADMIN && !channels.admin) ||
        (chat.mode === CHAT_MODE.FACTION && !channels.fraction) ||
        (chat.mode === CHAT_MODE.FAMILY && !channels.family) ||
        (chat.mode === CHAT_MODE.MEDIA && !channels.media)
    ) {
        chat.mode = CHAT_MODE.SAY;
        updateChatMode();
    }
}

window.__chatSetChannels = function (payload) {
    try {
        var p = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
        chat._channels = {
            admin: !!p.admin,
            fraction: !!p.hasFrac,
            family: !!p.hasFam,
            media: !!p.hasMedia
        };
        applyChatChannelButtons();
    } catch (_e) {}
};
window.__setAdminSuggestActive = function () {
    /* Подсказки автоматически показываются при вводе "/" после получения списка. */
    renderAdminCmdSuggest();
};
window.__setAdminCmdHints = function (raw) {
    chat.adminCmdHints = parseAdminCmdHints(raw);
    renderAdminCmdSuggest();
};
window.__chatForceCloseCompose = function () { enableChatInput(false); };
window.chatForceClose = window.__chatForceCloseCompose;

window.__chatWelcome = function () {
    /* Приветствие только с сервера (pushLoginWelcomeChat), без дубля в CEF. */
};

if (typeof mp !== 'undefined' && mp.events) {
    mp.events.add('chat:push', function (text) { try { chatAPI.push(text); } catch (_e) {} });
    mp.events.add('chat:clear', function () { try { chatAPI.clear(); } catch (_e) {} });
}

$(document).ready(function () {
    chat.container = $('#chat ul#chat_messages');
    $('#chat').attr('tabindex', '-1');
    $('.ui_element').show();

    $('body').on('click', '.chat-brawl-join', function () {
        var ch = $(this).attr('data-brawl') || '';
        if (ch) trigger('brawlChatJoin', ch);
    });

    $('body').on('click', '.chat-link', function (e) {
        e.preventDefault();
        var url = $(this).attr('data-url') || '';
        if (!url) return;
        copyChatLinkText(url).then(function () {
            trigger('chatLinkCopied', url);
        });
    });

    $('body').on('mousedown', '.chat-input-send', function (e) {
        e.preventDefault();
    });

    $('body').on('click', '.chat-input-send', function (e) {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    });

    $('body').on('mousedown', '.admin-cmd-suggest__item', function (e) {
        e.preventDefault();
        if (!chat.input) return;
        var cmd = $(this).find('.admin-cmd-suggest__cmd').text().trim();
        chat.input.find('#chat_input').val(cmd + ' ').trigger('input').focus();
    });

    $('body').on('click', '[chat-btn-mode]', function () {
        chat.mode = parseInt($(this).attr('chat-btn-mode'), 10);
        updateChatMode();
        if (chat.input) chat.input.find('#chat_input').focus();
    });

    $('body').keydown(function (e) {
        /** F6 (117) — только админ-панель, чат на эту клавишу не открываем. */
        if (e.which === 117) {
            e.preventDefault();
            e.stopPropagation();
            if (chat.input !== null) enableChatInput(false);
            return false;
        }

        if (e.which === 16) shiftMode = true;
        if (e.which === 17) ctrlMode = true;

        if ((e.which === 65 || e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey || ctrlMode)) {
            e.preventDefault();
            e.stopPropagation();
            if (chat.input !== null) {
                var inp = chat.input.find('#chat_input')[0];
                if (inp) { inp.focus(); try { inp.select(); } catch (_s) {} }
            }
            return false;
        }

        /** Чат открывается только на T (84). Код 117 — это F6, зарезервированная под админ-панель. */
        if (e.which === 84 && chat.input === null && chat.active && chat.visible) {
            if (shiftMode) { enableChatInput(true, CHAT_MODE.FACTION); shiftMode = false; }
            else { enableChatInput(true, CHAT_MODE.SAY); }
            chat.container.scrollTop(999999);
            e.preventDefault();
            return;
        }

        if (e.which === 9) {
            e.preventDefault();
            e.stopPropagation();
            if (chat.input !== null) chat.input.find('#chat_input').focus();
            else releaseChatBrowserFocus();
            return false;
        }

        if (e.which === 13 && chat.input !== null) { sendMessage(); e.preventDefault(); return; }
        if (e.which === 27 && chat.input !== null) {
            enableChatInput(false);
            trigger('chatSuppressPauseAfterEsc');
            e.preventDefault();
            return;
        }
        if (e.which === 38 && chat.input !== null) {
            e.preventDefault();
            if (chat.previousIndex > 0) chat.previousIndex--;
            chat.input.find('#chat_input').val(chat.previous[chat.previousIndex] || '').trigger('input');
            return;
        }
        if (e.which === 40 && chat.input !== null) {
            e.preventDefault();
            if (chat.previousIndex < chat.previous.length) chat.previousIndex++;
            chat.input.find('#chat_input').val(chat.previous[chat.previousIndex] || '').trigger('input');
            return;
        }
        if (e.which === 33) { chat.container.scrollTop(chat.container.scrollTop() - 20); return; }
        if (e.which === 34) { chat.container.scrollTop(chat.container.scrollTop() + 20); return; }
    });

    $('body').keyup(function (e) {
        if (e.which === 16) shiftMode = false;
        if (e.which === 17) ctrlMode = false;
    });
});
