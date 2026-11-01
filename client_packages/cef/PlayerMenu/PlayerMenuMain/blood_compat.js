/*
 * blood_compat.js — мост PlayerMenuMain (Vue) ↔ Blood DM (menu.js / server).
 */
(function () {
    if (typeof window.mp === 'undefined') return;
    if (window.__bloodCompat) return;
    window.__bloodCompat = true;

    var __settings = {};
    var __reportMessages = [];
    var __reportOpen = false;
    var __reportPendingUntil = 0;
    var BLOOD_LEVEL_MAX = 100;
    /* Совпадает с packages/server/playermenu.js: pmExpNeededForLevel / shooting progressMax */
    var BLOOD_SKILL_PER_LEVEL = 100;
    var BLOOD_SKILL_INCREMENT = 0;
    var BLOOD_SKILL_MAX_LEVEL = 10;

    function bloodSkillPointsNeed(skillLevel, skillPerLevel) {
        var sl = Number(skillLevel) || 0;
        if (sl >= BLOOD_SKILL_MAX_LEVEL) return 0;
        var per = Number(skillPerLevel);
        if (Number.isFinite(per) && per > 0) return per;
        return BLOOD_SKILL_PER_LEVEL + sl * BLOOD_SKILL_INCREMENT;
    }

    function bloodLevelExpNeedFallback(level) {
        var lvl = Math.max(1, Number(level) || 1);
        if (lvl >= BLOOD_LEVEL_MAX) return 0;
        return lvl * 4;
    }

    /* PayDay каждый час в :00 МСК (UTC+3), как packages/server/payday.js */
    var BLOOD_MSK_OFFSET = 3;
    function bloodPaydayMinutesLeft() {
        var now = new Date();
        var totalMinUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
        var mskMinOfDay = ((totalMinUtc + BLOOD_MSK_OFFSET * 60) % 1440 + 1440) % 1440;
        var mskMinute = mskMinOfDay % 60;
        var left = (60 - mskMinute) % 60;
        if (left === 0) left = 60;
        return left;
    }
    function bloodPaydayMinutesWord(n) {
        var n10 = n % 10;
        var n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return 'МИНУТУ';
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'МИНУТЫ';
        return 'МИНУТ';
    }

    function bloodNormalizeSkillsArray(raw) {
        var empty = [0, 0, BLOOD_SKILL_PER_LEVEL, BLOOD_SKILL_MAX_LEVEL];
        var out = [
            [0, 0, 100, 10],
            empty.slice(),
            [1, 0, 100, 10],
            [1, 0, 100, 10],
            [0, 0, 100, 10]
        ];
        if (!Array.isArray(raw) || !raw.length) return out;
        if (raw.length === 1 && Array.isArray(raw[0]) && raw[0].length >= 4) {
            out[1] = [
                Number(raw[0][0]) || 0,
                Number(raw[0][1]) || 0,
                Number(raw[0][2]) > 0 ? Number(raw[0][2]) : BLOOD_SKILL_PER_LEVEL,
                Number(raw[0][3]) > 0 ? Number(raw[0][3]) : BLOOD_SKILL_MAX_LEVEL
            ];
            return out;
        }
        for (var i = 0; i < Math.min(5, raw.length); i++) {
            if (Array.isArray(raw[i]) && raw[i].length >= 4) {
                out[i] = [
                    Number(raw[i][0]) || 0,
                    Number(raw[i][1]) || 0,
                    Number(raw[i][2]) > 0 ? Number(raw[i][2]) : BLOOD_SKILL_PER_LEVEL,
                    Number(raw[i][3]) > 0 ? Number(raw[i][3]) : BLOOD_SKILL_MAX_LEVEL
                ];
            }
        }
        /* если стрельба лежит в [0], а [1] пустой — переносим */
        if ((!raw[1] || !Array.isArray(raw[1])) && Array.isArray(raw[0]) && raw[0].length >= 4) {
            out[1] = [
                Number(raw[0][0]) || 0,
                Number(raw[0][1]) || 0,
                Number(raw[0][2]) > 0 ? Number(raw[0][2]) : BLOOD_SKILL_PER_LEVEL,
                Number(raw[0][3]) > 0 ? Number(raw[0][3]) : BLOOD_SKILL_MAX_LEVEL
            ];
        }
        return out;
    }

    function defaultShootingSkillTuple() {
        return [1, 0, BLOOD_SKILL_PER_LEVEL, BLOOD_SKILL_MAX_LEVEL];
    }

    function trig() {
        try { return window.mp.trigger.apply(window.mp, arguments); } catch (e) {}
    }

    function menuMgr() {
        return typeof window.palyerMainMenuMenu !== 'undefined' ? window.palyerMainMenuMenu : null;
    }
    function vue() {
        var m = menuMgr();
        return m && m.vue ? m.vue : null;
    }

    function parseJson(x) {
        if (x == null) return null;
        if (typeof x === 'object') return x;
        try { return JSON.parse(x); } catch (e) { return null; }
    }

    function defaultPlayerData() {
        return {
            name: '',
            cash: 0,
            bank: 0,
            donatePoint: 0,
            bp: 0,
            exp: 0,
            expMax: 2,
            level: 1,
            mood: 100,
            satiety: 100,
            hasVIP: false,
            vipLevel: 0,
            vipName: 'Нет VIP',
            vipTime: '',
            donateBonus: [[100, 1.05], [500, 1.1], [1000, 1.2]],
            donatePrice: 1000,
            accountEmail: '',
            minutesPlayed: 0,
            mutedFirstLevel: false,
            mutedNews: false,
            house: null,
            apartment: null,
            mansion: null,
            businessList: [],
            vehList: [],
            questList: [],
            skills: [
                [0, 0, 100, 10],
                [0, 0, BLOOD_SKILL_PER_LEVEL, BLOOD_SKILL_MAX_LEVEL],
                [1, 0, 100, 10],
                [1, 0, 100, 10],
                [0, 0, 100, 10]
            ],
            openTab: 0
        };
    }

    function patchVue(key, val) {
        var v = vue();
        if (!v) return;
        try {
            if (v.$set) v.$set(v, key, val);
            else v[key] = val;
        } catch (e) {}
    }

    function patchPlayerData(patch) {
        var v = vue();
        if (!v) return;
        if (!v.playerData) patchVue('playerData', defaultPlayerData());
        var pd = v.playerData;
        for (var k in patch) {
            if (!patch.hasOwnProperty(k)) continue;
            try {
                if (v.$set) v.$set(pd, k, patch[k]);
                else pd[k] = patch[k];
            } catch (e) {}
        }
    }

    function bloodFormatDp(n) {
        n = parseInt(n, 10) || 0;
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    window.bloodSyncDonatePoints = function () {
        var v = vue();
        if (!v) return;
        var dp = 0;
        if (window.__bloodHeaderDp != null) {
            dp = parseInt(window.__bloodHeaderDp, 10) || 0;
        } else if (v.playerData && v.playerData.donatePoint != null) {
            dp = parseInt(v.playerData.donatePoint, 10) || 0;
        }
        patchPlayerData({ donatePoint: dp });
    };

    window.bloodApplyDonatePoints = function (n) {
        n = parseInt(String(n).replace(/[.\s]/g, ''), 10) || 0;
        window.__bloodHeaderDp = n;
        patchPlayerData({ donatePoint: n });
        try {
            if (window.LRoulette && typeof window.LRoulette.refreshBal === 'function') window.LRoulette.refreshBal();
        } catch (_eBal) {}
    };

    window.bloodPatchPlayerSkills = function (skillLevel, skillPoints, skillPerLevel, skillMaxLevel) {
        var v = vue();
        if (!v) return;
        if (!v.playerData) patchVue('playerData', defaultPlayerData());
        var sl = Number(skillLevel);
        if (!Number.isFinite(sl)) sl = Number(window.__bloodSkillLevel) || 0;
        var sp = Number(skillPoints);
        if (!Number.isFinite(sp)) sp = Number(window.__bloodSkillPoints) || 0;
        var per = bloodSkillPointsNeed(sl, skillPerLevel);
        var max = Number(skillMaxLevel) || BLOOD_SKILL_MAX_LEVEL;
        window.__bloodSkillLevel = sl;
        window.__bloodSkillPoints = sp;
        var base = (v.playerData.skills && v.playerData.skills.length) ? v.playerData.skills : defaultPlayerData().skills;
        var skills = [];
        for (var i = 0; i < base.length; i++) {
            skills[i] = base[i] ? base[i].slice() : [0, 0, 100, 10];
        }
        while (skills.length < 5) skills.push([0, 0, 100, 10]);
        skills[1] = [sl, sp, per, max];
        if (v.$set) {
            v.$set(v.playerData, 'skills', skills);
        } else {
            v.playerData.skills = skills;
        }
    };

    window.bloodSyncShootingSkillFromClient = function (skillLevel, skillPoints, perLevel, maxLevel) {
        bloodPatchPlayerSkills(skillLevel, skillPoints, perLevel, maxLevel);
    };

    function parseVipDateClient(raw) {
        if (raw == null || raw === '') return null;
        if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
        if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
            var msNum = raw < 1e12 ? raw * 1000 : raw;
            var dn = new Date(msNum);
            return isNaN(dn.getTime()) ? null : dn;
        }
        var s = String(raw).trim();
        if (!s) return null;
        var ru = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (ru) {
            var dr = new Date(parseInt(ru[3], 10), parseInt(ru[2], 10) - 1, parseInt(ru[1], 10), 23, 59, 59, 999);
            if (!isNaN(dr.getTime())) return dr;
        }
        var mysql = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (mysql) {
            var dr2 = new Date(
                parseInt(mysql[1], 10),
                parseInt(mysql[2], 10) - 1,
                parseInt(mysql[3], 10),
                mysql[4] != null ? parseInt(mysql[4], 10) : 23,
                mysql[5] != null ? parseInt(mysql[5], 10) : 59,
                mysql[6] != null ? parseInt(mysql[6], 10) : 59,
                999
            );
            if (!isNaN(dr2.getTime())) return dr2;
        }
        var d = new Date(s.indexOf(' ') >= 0 ? s.replace(' ', 'T') : s);
        if (!isNaN(d.getTime())) return d;
        d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function formatDaysWord(days) {
        days = Math.max(0, parseInt(days, 10) || 0);
        if (days <= 0) return '';
        var w = days % 10;
        var w2 = days % 100;
        var word = 'дней';
        if (w2 < 11 || w2 > 14) {
            if (w === 1) word = 'день';
            else if (w >= 2 && w <= 4) word = 'дня';
        }
        return days + ' ' + word;
    }

    function bloodNormalizeVipTimeText(text) {
        text = String(text || '').trim();
        if (!text) return '';
        var legacy = text.match(/^(\d+)\s*д\.?$/i);
        if (legacy) return formatDaysWord(parseInt(legacy[1], 10));
        return text;
    }

    function formatVipTimeLeft(vipdateRaw, tier) {
        var lvl = parseInt(String(tier || '0'), 10) || 0;
        if (lvl <= 0) return '';
        if (!vipdateRaw) return '';
        var vd = parseVipDateClient(vipdateRaw);
        if (!vd) return '';
        var ms = vd.getTime() - Date.now();
        if (ms <= 0) return 'истёк';
        var days = Math.floor(ms / 86400000);
        if (days >= 1) return formatDaysWord(days);
        var hrs = Math.max(1, Math.ceil(ms / 3600000));
        var hw = hrs % 10;
        var hw2 = hrs % 100;
        var hword = 'часов';
        if (hw2 < 11 || hw2 > 14) {
            if (hw === 1) hword = 'час';
            else if (hw >= 2 && hw <= 4) hword = 'часа';
        }
        return hrs + ' ' + hword;
    }

    function bloodResolveVipTimeText(j, tier) {
        if (!j) return '';
        tier = Number(tier) || bloodExtractVipTier(j) || 0;
        if (tier <= 0) return '';
        var rawDate = j.vipdate || (j.vip && (j.vip.untilMs || j.vip.until)) || null;
        if (rawDate != null) {
            var fromDate = formatVipTimeLeft(rawDate, tier);
            if (fromDate) return fromDate;
        }
        var text = bloodNormalizeVipTimeText(j.vipTimeText || '');
        if (!text && typeof j.vipTime === 'string') text = bloodNormalizeVipTimeText(j.vipTime);
        if (text) return text;
        if (j.vipLine) {
            var vm = String(j.vipLine).match(/(?:осталось|действует)\s+(.+)$/i);
            if (vm) return vm[1].replace(/\.$/, '');
        }
        return '';
    }

    function bloodExtractVipTier(j) {
        if (!j) return 0;
        var tier = 0;
        if (j.vip && j.vip.tier != null) tier = Number(j.vip.tier) || 0;
        if (tier <= 0 && j.viplvl != null) tier = Number(j.viplvl) || 0;
        if (tier <= 0 && j.vipLevel != null) tier = Number(j.vipLevel) || 0;
        return tier;
    }

    function bloodVipNameFromTier(tier, customName) {
        tier = Number(tier) || 0;
        /* Имя всегда вычисляется из тиера — это источник правды.
           customName может быть закэширован с предыдущего тиера (напр. «Standard VIP»
           после апгрейда на Gold), поэтому игнорируем его для стандартных тиеров. */
        if (tier === 2) return 'GOLD VIP';
        if (tier >= 3) return 'PLATINUM VIP';
        if (tier === 1) return 'STANDARD VIP';
        /* Для неизвестного/нулевого тиера — используем customName, если он осмысленный. */
        var name = String(customName || '').trim();
        if (name && name !== 'Нет VIP' && name !== 'Standard VIP' && name !== 'STANDARD VIP') {
            return name.toUpperCase();
        }
        return 'Нет VIP';
    }

    function bloodIsVipActive(tier, vipTime) {
        tier = Number(tier) || 0;
        if (tier <= 0) return false;
        if (String(vipTime || '').toLowerCase() === 'истёк') return false;
        return true;
    }

    function bloodResolveVipActive(j, tier, vipTime) {
        tier = Number(tier) || 0;
        if (j && j.hasVIP === true) return tier > 0 || bloodIsVipActive(tier, vipTime);
        if (bloodIsVipActive(tier, vipTime)) return true;
        if (j && j.vipLine) {
            var line = String(j.vipLine).toLowerCase();
            if (line.indexOf('нет vip') >= 0) return false;
            if (line.indexOf('истёк') >= 0 || line.indexOf('истек') >= 0) return false;
            if (line.indexOf('vip') >= 0 || line.indexOf('осталось') >= 0 || line.indexOf('действует') >= 0) return true;
        }
        if (j && j.hasVIP === false) return false;
        return false;
    }

    function bloodProfileToPlayerData(p) {
        if (!p) return {};
        var money = Number(p.bank || p.money || p.cash || 0);
        var tier = bloodExtractVipTier(p);
        var vipName = (p.vip && p.vip.name) ? String(p.vip.name) : (p.vipName ? String(p.vipName) : '');
        var vipTime = bloodResolveVipTimeText(p, tier);
        var active = bloodResolveVipActive(p, tier, vipTime);
        if (active && tier <= 0) tier = 1;
        var out = {
            name: String(p.login || p.name || '').replace(/_/g, ' '),
            cash: money,
            bank: money,
            donatePoint: Number(p.dp || p.donatePoint || 0),
            hasVIP: active,
            vipLevel: active ? tier : 0,
            vipName: active ? bloodVipNameFromTier(tier, vipName) : 'Нет VIP',
            vipTime: active ? vipTime : ''
        };
        /* level/exp только если реально пришли — иначе не затираем прогресс */
        var hasLevel = p.level != null || p.lvl != null || p.charlevel != null;
        var hasExp = p.exp != null || p.level_exp != null || p.charexp != null;
        if (hasLevel) {
            out.level = Number(p.level != null ? p.level : (p.lvl != null ? p.lvl : p.charlevel)) || 1;
        }
        if (hasExp) {
            out.exp = Number(p.exp != null ? p.exp : (p.level_exp != null ? p.level_exp : p.charexp)) || 0;
        }
        if (p.expMax != null && Number(p.expMax) > 0) {
            out.expMax = Number(p.expMax);
        } else if (hasLevel) {
            out.expMax = bloodLevelExpNeedFallback(out.level);
        }
        if (Array.isArray(p.skills) && p.skills.length) {
            out.skills = bloodNormalizeSkillsArray(p.skills);
        } else if (p.skill_level != null || p.skill_points != null) {
            var skillLevel = Number(p.skill_level || 0);
            var skillPoints = Number(p.skill_points || 0);
            var skillPerLevel = bloodSkillPointsNeed(skillLevel, p.skill_per_level);
            var skillMaxLevel = Number(p.skill_max_level || BLOOD_SKILL_MAX_LEVEL);
            out.skills = bloodNormalizeSkillsArray([[skillLevel, skillPoints, skillPerLevel, skillMaxLevel]]);
        }
        if (p.stats) {
            out.kills = Number(p.stats.kills || 0);
            out.deaths = Number(p.stats.deaths || 0);
            out.minutesPlayed = Number(p.stats.minutes || p.stats.hours * 60 || 0);
        }
        if (Array.isArray(p.vehList)) out.vehList = p.vehList.slice();
        if (p.mansion) out.mansion = p.mansion;
        if (p.businessList) out.businessList = p.businessList;
        if (p.house != null) out.house = p.house;
        if (p.apartment != null) out.apartment = p.apartment;
        return out;
    }

    function transformReportMessages(msgs) {
        if (!Array.isArray(msgs)) return [];
        return msgs.map(function (m) {
            if (!m || typeof m !== 'object') return { name: '—', text: String(m || '') };
            var role = String(m.role || '').toLowerCase();
            var name = m.name || m.author;
            if (!name) {
                if (role === 'admin') name = 'Администратор';
                else if (role === 'user') name = (vue() && vue().playerData && vue().playerData.name) || 'Вы';
                else name = '—';
            }
            return { name: String(name), text: String(m.text || ''), isAdmin: role === 'admin' };
        });
    }

    function bloodOptimisticReportPush(text) {
        text = String(text || '').replace(/[\r\n]+/g, ' ').trim();
        if (!text) return;
        __reportOpen = true;
        var vRep = vue();
        var playerName = (vRep && vRep.playerData && vRep.playerData.name) || 'Вы';
        var list = __reportMessages.slice();
        list.push({ name: String(playerName), text: text, isAdmin: false });
        __reportMessages = list;
        if (vRep) {
            try {
                if (vRep.$set) vRep.$set(vRep, 'reportMessages', list);
                else vRep.reportMessages = list;
            } catch (eRep) {}
        }
    }

    function bloodClearReportForm(v) {
        v = v || vue();
        if (!v) return;
        if (v.$set) v.$set(v, 'reportMessageForm', '');
        else v.reportMessageForm = '';
    }

    function bloodParseDp(raw) {
        return parseInt(String(raw == null ? '' : raw).replace(/\D/g, ''), 10) || 0;
    }

    function bloodGetPlayerDp(v) {
        try { window.bloodSyncDonatePoints(); } catch (e0) {}
        v = v || vue();
        if (window.__bloodHeaderDp != null) return bloodParseDp(window.__bloodHeaderDp);
        if (v && v.playerData) return bloodParseDp(v.playerData.donatePoint);
        return 0;
    }

    function bloodLevelExpNeed(level, expMax) {
        var lvl = Number(level) || 1;
        if (lvl >= BLOOD_LEVEL_MAX) return 0;
        var max = Number(expMax);
        if (Number.isFinite(max) && max > 0) return max;
        return bloodLevelExpNeedFallback(lvl);
    }

    function bloodPatchVipFromProfile(j) {
        if (!j) return;
        var tier = bloodExtractVipTier(j);
        var vipTime = bloodResolveVipTimeText(j, tier);
        var vipName = (j.vip && j.vip.name) ? String(j.vip.name) : (j.vipName ? String(j.vipName) : '');
        var active = bloodResolveVipActive(j, tier, vipTime);
        if (active && tier <= 0) tier = Number(j.vipLevel || j.viplvl || 1) || 1;
        patchPlayerData({
            hasVIP: active,
            vipLevel: active ? tier : 0,
            vipName: active ? bloodVipNameFromTier(tier, vipName) : 'Нет VIP',
            vipTime: active ? vipTime : ''
        });
    }

    function bloodPatchEstateFromProfile(j) {
        if (!j || typeof j !== 'object') return;
        var patch = {};
        var v = vue();
        var cur = v && v.playerData;
        if (Array.isArray(j.vehList)) {
            patch.vehList = j.vehList.slice();
        }
        if (j.mansion && typeof j.mansion === 'object') {
            patch.mansion = j.mansion;
        } else if (j.mansion === null && Object.prototype.hasOwnProperty.call(j, 'mansion')) {
            if (!cur || !cur.mansion) patch.mansion = null;
        }
        if (Object.keys(patch).length) patchPlayerData(patch);
    }

    window.bloodApplyEstatePayload = function (payload) {
        payload = parseJson(payload) || payload;
        if (!payload || typeof payload !== 'object') return;
        var prof = window.__lastMenuAccountProfile;
        if (!prof || typeof prof !== 'object') prof = {};
        if (Array.isArray(payload.vehList)) prof.vehList = payload.vehList.slice();
        if (payload.mansion) prof.mansion = payload.mansion;
        else if (payload.mansion === null) prof.mansion = null;
        window.__lastMenuAccountProfile = prof;
        bloodPatchEstateFromProfile(prof);
    };

    window.bloodPatchVipFromProfile = bloodPatchVipFromProfile;
    window.bloodPatchEstateFromProfile = bloodPatchEstateFromProfile;

    window.bloodPatchVipFromClient = function (viplvl) {
        var tier = Number(viplvl) || 0;
        var prof = window.__lastMenuAccountProfile;
        if (prof && typeof prof === 'object') {
            var dbTier = bloodExtractVipTier(prof);
            if (tier <= 0 && dbTier > 0) tier = dbTier;
            if (!prof.vip || typeof prof.vip !== 'object') prof.vip = {};
            if (tier > 0) {
                prof.vip.tier = tier;
                prof.viplvl = tier;
                prof.hasVIP = true;
                /* Всегда пересчитываем имя из тиера — иначе после апгрейда
                   останется закэшированное «Standard VIP». */
                prof.vip.name = bloodVipNameFromTier(tier);
                var recalc = bloodResolveVipTimeText(prof, tier);
                if (recalc) {
                    prof.vipTimeText = recalc;
                } else if (!prof.vipTimeText && prof.vipdate) {
                    recalc = formatVipTimeLeft(prof.vipdate, tier);
                    if (recalc) prof.vipTimeText = recalc;
                }
            } else if (dbTier <= 0) {
                prof.vip.tier = 0;
                prof.viplvl = 0;
                prof.hasVIP = false;
                prof.vip.name = 'Нет VIP';
                prof.vipTimeText = '';
                prof.vipdate = null;
            }
            bloodPatchVipFromProfile(prof);
            return;
        }
        if (tier > 0) {
            bloodPatchVipFromProfile({
                viplvl: tier,
                vipLevel: tier,
                hasVIP: true,
                vip: { tier: tier, name: bloodVipNameFromTier(tier) }
            });
        }
    };

    window.bloodPatchVipTimeFromClient = function (vipTimeRaw, vipdateRaw) {
        var prof = window.__lastMenuAccountProfile;
        if (!prof || typeof prof !== 'object') prof = {};
        if (vipdateRaw) {
            prof.vipdate = String(vipdateRaw);
            if (!prof.vip || typeof prof.vip !== 'object') prof.vip = {};
            var vd = parseVipDateClient(vipdateRaw);
            if (vd) prof.vip.untilMs = vd.getTime();
        }
        var tier = bloodExtractVipTier(prof);
        if (tier <= 0) {
            var v0 = vue();
            tier = v0 && v0.playerData ? Number(v0.playerData.vipLevel) || 0 : 0;
            if (tier > 0) {
                prof.viplvl = tier;
                prof.hasVIP = true;
                if (!prof.vip) prof.vip = { tier: tier };
                else prof.vip.tier = tier;
            }
        }
        var vipTime = bloodResolveVipTimeText(prof, tier);
        if (!vipTime && vipTimeRaw) vipTime = bloodNormalizeVipTimeText(vipTimeRaw);
        if (vipTime) prof.vipTimeText = vipTime;
        window.__lastMenuAccountProfile = prof;
        if (tier > 0) {
            bloodPatchVipFromProfile(prof);
        } else if (vipTimeRaw === '' || vipTimeRaw === '0' || String(vipTimeRaw).toLowerCase() === 'истёк') {
            bloodPatchVipFromProfile({ hasVIP: false, viplvl: 0, vipTimeText: '', vip: { tier: 0, name: 'Нет VIP' } });
        }
    };

    function reportHasActiveThread() {
        return __reportOpen || (__reportMessages && __reportMessages.length > 0);
    }

    function bloodScheduleReportSyncPull() {
        [400, 900, 1800].forEach(function (ms) {
            setTimeout(function () {
                try { trig('report:ui:requestState'); } catch (_eRs) {}
            }, ms);
        });
    }

    function bloodSendReportMessage(v, text, faq) {
        v = v || vue();
        text = String(text == null ? '' : text).replace(/[\r\n]+/g, ' ').trim();
        if (!text) {
            serverAPI.notifyError('Введите сообщение.');
            return Promise.reject('Введите сообщение.');
        }
        if (text.length < 6) {
            serverAPI.notifyError('Сообщение слишком короткое.');
            return Promise.reject('Сообщение слишком короткое.');
        }
        if (text.length > 600) {
            serverAPI.notifyError('Сообщение слишком длинное (макс. 600).');
            return Promise.reject('Сообщение слишком длинное (макс. 600).');
        }
        var msgs = (v && v.reportMessages) || __reportMessages || [];
        bloodMarkReportPending();
        if (!reportHasActiveThread()) {
            trig('bloodMenuReportCreate', text);
        } else {
            trig('bloodMenuReportSend', text);
        }
        bloodOptimisticReportPush(text);
        bloodClearReportForm(v);
        bloodScheduleReportSyncPull();
        try { serverAPI.notifySuccess('Сообщение отправлено.'); } catch (_eOk) {}
        return Promise.resolve(true);
    }

    function syncReportToVue(msgs) {
        var list = transformReportMessages(msgs);
        __reportMessages = list.slice();
        var v = vue();
        if (!v) return;
        try {
            if (v.$set) v.$set(v, 'reportMessages', list);
            else v.reportMessages = list;
        } catch (e) {}
    }

    var TAB_HREF = {
        0: '#account',
        5: '#settings',
        7: '#menu-report',
        10: '#menu-minigame'
    };
    var HREF_TAB = {
        '#play': 0,
        '#account': 0,
        '#shop': 0,
        '#shop-armor': 0,
        '#menu-report': 7,
        '#menu-minigame': 10,
        '#boxes': 0,
        '#setting': 5,
        '#setting-game': 5,
        '#settings': 5
    };

    window.bloodMenuShowTab = function (href) {
        var h = String(href || '#account');
        var tab = HREF_TAB.hasOwnProperty(h) ? HREF_TAB[h] : 0;
        var v = vue();
        if (!v) return;
        try {
            if (h === '#boxes' || h === '#shop' || h === '#shop-armor') {
                if (typeof v.openTab === 'function') v.openTab(0);
                else v.currentTab = 0;
                return;
            }
            if (typeof v.openTab === 'function') v.openTab(tab);
            else v.currentTab = tab;
        } catch (e) {}
        try { trig('menuMainTabChange', h); } catch (e2) {}
    };

    window.bloodPatchLevelProgress = function (level, exp, expMax) {
        var lvl = Number(level) || 1;
        var ex = Number(exp) || 0;
        var max = Number(expMax);
        if (!Number.isFinite(max) || (max <= 0 && lvl < BLOOD_LEVEL_MAX)) {
            max = bloodLevelExpNeed(lvl, expMax);
        }
        patchPlayerData({ level: lvl, exp: ex, expMax: max });
    };

    window.bloodMenuOpen = function () {
        var m = menuMgr();
        if (!m) return;
        var v = vue();
        if (v && !v.loaded) {
            if (window.__lastMenuAccountProfile) {
                try { window.setMenuAccountProfile(window.__lastMenuAccountProfile); } catch (eProf) {}
            } else {
                try { m.load(defaultPlayerData()); } catch (e) {}
            }
        } else if (v) {
            try { v.loaded = true; } catch (e2) {}
        }
        bloodApplySettingsToVueFromStorage();
        applySettingsToVue(__settings);
        try { bloodHydrateInterfaceFromStorage(); } catch (_eHyd) {}
        try { window.bloodyF2SyncHeader(); } catch (eHdr) {}
        var profOpen = window.__lastMenuAccountProfile;
        var slOpen = window.__bloodSkillLevel;
        var spOpen = window.__bloodSkillPoints;
        if (slOpen != null || spOpen != null) {
            bloodPatchPlayerSkills(slOpen, spOpen, bloodSkillPointsNeed(slOpen, profOpen && profOpen.skill_per_level), BLOOD_SKILL_MAX_LEVEL);
        } else if (profOpen && Array.isArray(profOpen.skills) && profOpen.skills.length) {
            var skOpen = bloodNormalizeSkillsArray(profOpen.skills)[1];
            bloodPatchPlayerSkills(skOpen[0], skOpen[1], skOpen[2], skOpen[3]);
        }
        if (window.__lastMenuAccountProfile) {
            try { bloodPatchVipFromProfile(window.__lastMenuAccountProfile); } catch (_eVip) {}
            try { bloodPatchEstateFromProfile(window.__lastMenuAccountProfile); } catch (_eEst) {}
        } else if (window.__bloodClientViplvl != null) {
            try { bloodPatchVipFromClient(window.__bloodClientViplvl); } catch (_eVip2) {}
        }
        window.bloodMenuShowTab('#account');
    };

    function bloodMarkReportPending() {
        __reportPendingUntil = Date.now() + 8000;
    }

    window.bloodReportSync = function (payloadStr) {
        var o = parseJson(payloadStr) || {};
        var pending = Date.now() < __reportPendingUntil;
        if (Array.isArray(o.messages)) {
            if (o.messages.length > 0) {
                syncReportToVue(o.messages);
                __reportOpen = true;
                __reportPendingUntil = 0;
            } else if (!o.open && !pending) {
                syncReportToVue([]);
                __reportOpen = false;
            } else if (o.open) {
                __reportOpen = true;
            }
        } else if (o.open) {
            __reportOpen = true;
        } else if (!o.open && !pending) {
            syncReportToVue([]);
            __reportOpen = false;
        }
        var v = vue();
        if (v && typeof Vue !== 'undefined' && Vue.nextTick) {
            Vue.nextTick(function () {
                var ref = v.$refs.reportChat;
                if (ref && ref.scrollTop != null) ref.scrollTop = ref.scrollHeight + 9999;
            });
        }
    };

    window.bloodReportClosed = function (reason) {
        reason = String(reason || '');
        __reportOpen = false;
        if (reason === 'player') {
            __reportMessages = [];
            syncReportToVue([]);
        }
        bloodClearReportForm(vue());
    };

    window.bloodPromoResult = function (ok, msg) {
        msg = String(msg || '').trim();
        if (!msg) msg = ok ? 'Промокод активирован.' : 'Не удалось активировать промокод.';
        if (typeof serverAPI !== 'undefined') {
            if (ok && typeof serverAPI.notifySuccess === 'function') {
                serverAPI.notifySuccess(msg);
            } else if (!ok && typeof serverAPI.notifyError === 'function') {
                serverAPI.notifyError(msg);
            }
        }
        if (ok) {
            var vOk = vue();
            if (vOk) {
                try {
                    if (vOk.settingPromoForm != null) vOk.settingPromoForm = '';
                } catch (e0) {}
            }
        }
    };

    window.bloodSetVehicles = function (payloadStr) {
        var raw = parseJson(payloadStr);
        if (!Array.isArray(raw)) return;
        var srcLabel = { dp: 'Donate', case: 'Кейс', cash: 'Автосалон', legacy: 'Гараж', admin: 'Гараж', bonus: 'Бонус' };
        var list = raw.map(function (e) {
            if (!e || !(e.m || e.model || e.n)) return null;
            var modelKey = String(e.m || e.model || '');
            var display = String(e.n || e.name || e.model || modelKey || 'Транспорт');
            return {
                model: display,
                class: srcLabel[e.s] || e.class || 'Гараж',
                price: Number(e.p != null ? e.p : e.price) || 0,
                mileage: Number(e.mileage || 0)
            };
        }).filter(Boolean);
        if (window.__lastMenuAccountProfile && typeof window.__lastMenuAccountProfile === 'object') {
            window.__lastMenuAccountProfile.vehList = list;
        }
        patchPlayerData({ vehList: list });
    };

    window.bloodyF2Cleanup = function () {
        var m = menuMgr();
        if (m && m.vue && typeof m.vue.close === 'function') {
            try { m.vue.close(); } catch (e) {}
        }
    };

    function setVueSettingField(v, cs, key, val) {
        if (!cs) return;
        if (v && v.$set) v.$set(cs, key, val);
        else cs[key] = val;
    }

    function applySettingsToVue(s) {
        var v = vue();
        if (!v || !v.currentSetting || !s) return;
        try {
            var cs = v.currentSetting;
            if (s.hud_hints !== undefined) setVueSettingField(v, cs, 'enableHelpBox', !!s.hud_hints);
            else if (s.help !== undefined) setVueSettingField(v, cs, 'enableHelpBox', !!s.help);
            if (s.hud !== undefined) setVueSettingField(v, cs, 'showUI', !!s.hud);
            if (s.names !== undefined) setVueSettingField(v, cs, 'enableNametags', !!s.names);
            if (s.hitmarker !== undefined) setVueSettingField(v, cs, 'hitMarker', !!s.hitmarker);
            if (s.voice !== undefined) setVueSettingField(v, cs, 'enableVoiceChat', !!s.voice);
            if (s.chat !== undefined) setVueSettingField(v, cs, 'hideChat', !s.chat);
            if (s.disconnect_marker !== undefined) setVueSettingField(v, cs, 'hideDisconnectMarker', !s.disconnect_marker);
            else setVueSettingField(v, cs, 'hideDisconnectMarker', true);
            if (s.map !== undefined) setVueSettingField(v, cs, 'hideMinimap', !s.map);
            if (s.quests !== undefined) setVueSettingField(v, cs, 'enableQuestBox', !!s.quests);
            if (s.target_hint !== undefined) setVueSettingField(v, cs, 'enableTargetMenuRender', !!s.target_hint);
        } catch (e) {}
    }

    window.setSettings = function (s) {
        s = parseJson(s) || s;
        if (!s || typeof s !== 'object') return;
        __settings = Object.assign({}, __settings || {}, s);
        try { syncSettingsFromUiPack(s); } catch (_eSyncSet) {}
        applySettingsToVue(__settings);
        try { bloodApplySettingsToVueFromStorage(); } catch (_eApply) {}
    };

    window.setMenuAccountProfile = function (j) {
        j = parseJson(j) || j;
        if (!j) return;
        var prev = window.__lastMenuAccountProfile;
        if (prev && Array.isArray(prev.vehList) && prev.vehList.length
            && !Object.prototype.hasOwnProperty.call(j, 'vehList')) {
            j.vehList = prev.vehList;
        }
        if (prev && prev.mansion && !j.mansion) {
            j.mansion = prev.mansion;
        }
        var tierForTime = bloodExtractVipTier(j);
        if (tierForTime > 0) {
            var timeFresh = bloodResolveVipTimeText(j, tierForTime);
            if (timeFresh) j.vipTimeText = timeFresh;
        }
        window.__lastMenuAccountProfile = j;
        var mapped = bloodProfileToPlayerData(j);
        var data = Object.assign({}, mapped, { openTab: 0 });
        if (Array.isArray(j.vehList)) data.vehList = j.vehList.slice();
        if (j.mansion && typeof j.mansion === 'object') data.mansion = j.mansion;

        var hasLevel = j.level != null || j.lvl != null || j.charlevel != null || mapped.level != null;
        var hasExp = j.exp != null || j.level_exp != null || j.charexp != null || mapped.exp != null;
        if (hasLevel) {
            data.level = Number(j.level != null ? j.level : (j.lvl != null ? j.lvl : (j.charlevel != null ? j.charlevel : mapped.level))) || 1;
            data.expMax = Number(j.expMax) > 0 ? Number(j.expMax) : bloodLevelExpNeedFallback(data.level);
        }
        if (hasExp) {
            data.exp = Number(j.exp != null ? j.exp : (j.level_exp != null ? j.level_exp : (j.charexp != null ? j.charexp : mapped.exp))) || 0;
        }
        if (Array.isArray(j.skills) && j.skills.length) {
            data.skills = bloodNormalizeSkillsArray(j.skills);
        }

        var m = menuMgr();
        if (!m) return;
        try {
            if (m.vue && m.vue.loaded) {
                /* не затираем level/exp/skills если профиль их не прислал */
                var patch = Object.assign({}, data);
                if (!hasLevel) {
                    delete patch.level;
                    delete patch.expMax;
                }
                if (!hasExp) delete patch.exp;
                if (!Array.isArray(j.skills) || !j.skills.length) {
                    if (j.skill_level == null && j.skill_points == null) delete patch.skills;
                }
                patchPlayerData(patch);
            } else {
                m.load(Object.assign(defaultPlayerData(), data));
            }
            bloodSyncDonatePoints();
            if (Array.isArray(j.skills) && j.skills.length) {
                var sk = bloodNormalizeSkillsArray(j.skills)[1];
                bloodPatchPlayerSkills(sk[0], sk[1], sk[2], sk[3]);
            } else if (j.skill_level != null || j.skill_points != null) {
                bloodPatchPlayerSkills(
                    j.skill_level,
                    j.skill_points,
                    bloodSkillPointsNeed(j.skill_level, j.skill_per_level),
                    j.skill_max_level != null ? j.skill_max_level : BLOOD_SKILL_MAX_LEVEL
                );
            }
            bloodPatchVipFromProfile(j);
            bloodPatchEstateFromProfile(j);
        } catch (e) {
            try { m.load(Object.assign(defaultPlayerData(), data)); } catch (e2) {}
            bloodPatchVipFromProfile(j);
            bloodPatchEstateFromProfile(j);
        }
    };

    window.setKillsStats = function (k, d, h) {
        patchPlayerData({
            kills: Number(k || 0),
            deaths: Number(d || 0),
            heads: Number(h || 0)
        });
    };

    window.bloodyF2SyncHeader = function () {
        var v = vue();
        if (!v || !v.playerData) return;
        try {
            if (window.__bloodHeaderLogin) {
                patchPlayerData({ name: String(window.__bloodHeaderLogin).replace(/_/g, ' ') });
            }
            if (window.__bloodHeaderBank != null) {
                var bank = Number(window.__bloodHeaderBank) || 0;
                patchPlayerData({ cash: bank, bank: bank });
            } else if (window.__bloodHeaderBankDisplay != null) {
                var raw = String(window.__bloodHeaderBankDisplay).replace(/[^\d]/g, '');
                var num = parseInt(raw, 10) || 0;
                patchPlayerData({ cash: num, bank: num });
            }
            if (window.__bloodHeaderDp != null) {
                patchPlayerData({ donatePoint: Number(window.__bloodHeaderDp) || 0 });
            }
        } catch (e) {}
    };

    window.bloodyF2UpdateFreeCases = function (n, armor) {
        patchPlayerData({ freeCases: Number(n || 0), freeArmorCases: Number(armor || 0) });
    };

    window.bloodyF2SetFraction = function () {};

    window.syncCaseCatalogFromServer = function () {};

    window.bmCrosshairSetEnabled = function () {};

    window.setKeybindButtonLabel = function () {};

    function ensureDonateRouletteReady(v) {
        if (!v) return;
        try {
            // Vue-методы → самостоятельная рулетка (libertyRoulette.js)
            v.bloodSelectShopItem = function (item, index) {
                this.selectedBonusShopItem = item || null;
                this.selectedBonusShopItemIndex = index == null ? -1 : index;
                this.bonusPointFormSubIndex = 0;
            };
            v.bloodOpenRoulette = function () {
                try {
                    if (window.LRoulette && typeof window.LRoulette.open === 'function') window.LRoulette.open();
                } catch (_eOpen) {}
            };
            v.openDonateRoulette = v.bloodOpenRoulette;
            v.openPlayerDonateRoulette = v.bloodOpenRoulette;
            v.setPointTo = function (x, y) {
                try {
                    if (typeof mp !== 'undefined' && mp.trigger) {
                        mp.trigger('clientFunc_setWaypoint', Number(x), Number(y));
                    }
                } catch (_eWp) {}
            };
            v.closeDonateRoulette = function () {
                try {
                    if (window.LRoulette && typeof window.LRoulette.close === 'function') window.LRoulette.close();
                } catch (_eClose) {}
            };
        } catch (_eDr) {}
    }

    window.casesDoRoll = function (casename, fast, item, prizeName, prizeMetaJson) {
        var meta = null;
        try {
            if (prizeMetaJson && typeof prizeMetaJson === 'string') meta = JSON.parse(prizeMetaJson);
            else if (prizeMetaJson && typeof prizeMetaJson === 'object') meta = prizeMetaJson;
        } catch (eMeta) {}
        var label = (meta && meta.label) ? String(meta.label) : String(prizeName || item || 'Приз');
        var uiType = 'item';
        if (meta && meta.type) {
            if (meta.type === 'money') uiType = 'money';
            else if (meta.type === 'vehicle') uiType = 'vehicle';
            else if (meta.type === 'weapon') uiType = 'weapon';
            else if (meta.type === 'armor_stack' || meta.type === 'armor') uiType = 'armor';
            else if (meta.type === 'vip') uiType = 'vip';
            else if (meta.type === 'admin') uiType = 'admin';
            else if (meta.type === 'skateboard') uiType = 'skateboard';
            else if (meta.uiType) uiType = String(meta.uiType);
        } else if (meta && meta.uiType) {
            uiType = String(meta.uiType);
        } else if (/\$|₽|руб/i.test(label)) {
            uiType = 'money';
        }
        if (String(casename || '') === 'ArmorCase') uiType = 'armor';
        var sellDp = meta && meta.sellDp != null ? Number(meta.sellDp) : null;
        var prize = {
            type: uiType,
            label: label,
            name: label,
            caseName: String(casename || ''),
            prizeId: Date.now(),
            sellPrice: sellDp != null && sellDp > 0 ? sellDp : null,
            sellDp: sellDp != null && sellDp > 0 ? sellDp : null,
            tier: meta && meta.tier ? String(meta.tier) : '',
            vehicleModel: meta && meta.vehicleModel ? String(meta.vehicleModel) : '',
            weaponId: meta && meta.weaponId ? String(meta.weaponId) : '',
            color: meta && (meta.color || meta.rarity) ? String(meta.color || meta.rarity) : null,
            rarity: meta && (meta.rarity || meta.color) ? String(meta.rarity || meta.color) : null,
            textOnly: uiType === 'vip' || uiType === 'admin'
        };
        if (uiType === 'money' && meta && meta.amount) prize.amount = meta.amount;
        if (uiType === 'weapon' && !prize.weaponId) prize.weaponId = 'weapon_specialcarbine';
        if (uiType === 'vehicle' && prize.vehicleModel) prize.value = prize.vehicleModel;

        var finish = function () {
            if (window.__roulettePendingResolve) {
                try { window.__roulettePendingResolve(prize); } catch (e) {}
                window.__roulettePendingResolve = null;
            }
            var v = vue();
            if (v && v.donateRouletteOpen) {
                try {
                    v.donateRouletteResult = prize;
                    v.donateRouletteScreen = 'result';
                    v.donateRouletteWait = false;
                    if (typeof window.bloodSyncDonatePoints === 'function') window.bloodSyncDonatePoints();
                } catch (e2) {}
            }
        };

        try { trig('opencaseUiReady'); } catch (eReady) {}

        var libertyCases = {
            FreeCase: 1,
            SilverCase: 1,
            GoldCase: 1,
            ArmorCase: 1,
            VehiclesCase: 1,
            AdminCase: 1
        };
        if (window.LRoulette && LRoulette.isOpen() && libertyCases[casename]) {
            try { if (typeof window.bloodSyncDonatePoints === 'function') window.bloodSyncDonatePoints(); } catch (eDp) {}
            LRoulette.onPrize(casename, !!(fast === true || fast === 1 || fast === 'true'), prize);
            return;
        }

        finish();
    };

    function normalizePromoCode(raw) {
        return String(raw || '').trim().toLowerCase();
    }

    function buildBloodBinderGroups(v) {
        var data = (v && v.binderData) || [];
        if (!data.length) return [];
        var byAction = {};
        for (var i = 0; i < data.length; i++) {
            if (!data[i] || !data[i].action) continue;
            // index обязателен для bloodSelectBinder(b.index)
            if (data[i].index == null) data[i].index = i;
            byAction[data[i].action] = data[i];
        }
        var out = [];
        for (var gi = 0; gi < BLOOD_BINDER_GROUPS.length; gi++) {
            var g = BLOOD_BINDER_GROUPS[gi];
            var items = [];
            for (var ai = 0; ai < g.actions.length; ai++) {
                var row = byAction[g.actions[ai]];
                if (row) items.push(row);
            }
            if (items.length) out.push({ title: g.title, items: items });
        }
        return out;
    }

    function bloodSyncBinderGroups(v) {
        if (!v) return [];
        var groups = buildBloodBinderGroups(v);
        try {
            if (v.$set) v.$set(v, 'binderDataGroups', groups);
            else v.binderDataGroups = groups;
        } catch (_eSet) {
            try { v.binderDataGroups = groups; } catch (_e2) {}
        }
        return groups;
    }
    window.bloodSyncBinderGroups = bloodSyncBinderGroups;

    function setClientBinderCapture(active, escSuppress) {
        try {
            // Клиент слушает flowMenuBinderCapture* (playermenu.js)
            if (active) {
                trig('flowMenuBinderCaptureStart');
                trig('bloodMenuBinderCaptureStart');
            } else {
                trig('flowMenuBinderCaptureEnd');
                trig('bloodMenuBinderCaptureEnd');
            }
            if (escSuppress) {
                __bloodSuppressMenuEscUntil = Date.now() + 1500;
                trig('flowMenuBinderCaptureEsc');
                trig('bloodMenuBinderCaptureEsc');
            }
        } catch (e0) {}
    }

    function isBinderCaptureActive() {
        var v = vue();
        return !!(v && v.binderSelectKey != null && v.binderSelectKey >= 0);
    }

    function cancelBinderCaptureFromEsc() {
        if (!isBinderCaptureActive()) return false;
        window.__pmEscCancelUntil = Date.now() + 500;
        __bloodBinderEscCancelAt = Date.now();
        __bloodSuppressMenuEscUntil = Date.now() + 500;
        try {
            if (window.flowEscClearBinderCapture) window.flowEscClearBinderCapture();
            else if (window.bloodEscClearBinderCapture) window.bloodEscClearBinderCapture();
        } catch (_eClr) {}
        try { trig('flowMenuBinderCaptureEsc'); } catch (_e1) {}
        try { trig('bloodMenuBinderCaptureEsc'); } catch (_e2) {}
        return true;
    }

    window.bloodMenuEscShouldClose = function () {
        if (window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil) return false;
        if (__bloodBinderEscCancelAt && (Date.now() - __bloodBinderEscCancelAt) < 500) return false;
        if (__bloodSuppressMenuEscUntil && Date.now() < __bloodSuppressMenuEscUntil) return false;
        var v = vue();
        if (v && v.binderSelectKey != null && v.binderSelectKey >= 0) return false;
        if (window.LRoulette && typeof LRoulette.isOpen === 'function' && LRoulette.isOpen()) {
            try { LRoulette.close(); } catch (_eLr) {}
            return false;
        }
        if (v && v.selectedBonusShopItem) {
            v.selectedBonusShopItem = null;
            return false;
        }
        return true;
    };

    window.cancelBinderCaptureFromEsc = cancelBinderCaptureFromEsc;

    var __bindCaptureIgnoreUntil = 0;
    var __bloodSuppressMenuEscUntil = 0;
    var __bloodBinderEscCancelAt = 0;

    var BINDER_DEFS = [
        ['MENULIST_OPEN','player_menu_key','Меню игры'],
        ['CURSOR_TOGGLE','cursor_key','Курсор'],
        ['INVENTORY_OPEN', 'inventory_key', 'Инвентарь'],
        ['FAST_ANIM_0', 'lie_key', 'Ползать (лежать)'],
        ['TOGGLE_CROUCH', 'crouch_key', 'Присесть'],
        ['WEAPON_SLOT_0', 'fast_slot_1_key', 'Быстрый слот 1'],
        ['WEAPON_SLOT_1', 'fast_slot_2_key', 'Быстрый слот 2'],
        ['WEAPON_SLOT_2', 'fast_slot_3_key', 'Быстрый слот 3'],
        ['TOGGLE_WHISTLE', 'whistle_key', 'Свист'],
        ['VOICE_CHAT_TOGGLE', 'voice_key', 'Микрофон'],
        ['VOICE_CHAT_RELOAD', 'voice_reload_key', 'Перезагрузка голоса'],
        ['BRAWL_VOICE', 'brawl_voice_key', 'Говорить в Brawl'],
        ['BRAWL_MARKER', 'brawl_marker_key', 'Отметка в Brawl'],
        ['SMARTPHONE_OPEN', 'phone_key', 'Телефон'],
        ['VEHICLE_ENGINE', 'engine_key', 'Двигатель'],
        ['VEHICLE_SEATBELT', 'seatbelt_key', 'Ремень безопасности'],
        ['VEHICLE_LOCK', 'vehicle_lock_key', 'Закрыть / открыть авто'],
        ['FAST_ANIM_1', 'anim_slot_1_key', 'Анимация - слот 1'],
        ['FAST_ANIM_2', 'anim_slot_2_key', 'Анимация - слот 2'],
        ['FAST_ANIM_3', 'anim_slot_3_key', 'Анимация - слот 3'],
        ['FAST_ANIM_4', 'anim_slot_4_key', 'Анимация - слот 4'],
        ['FAST_ANIM_5', 'anim_slot_5_key', 'Анимация - слот 5']
    ];

    var BLOOD_BINDER_GROUPS = [
        { title: 'Персонаж', actions: ['MENULIST_OPEN','CURSOR_TOGGLE','INVENTORY_OPEN', 'FAST_ANIM_0', 'TOGGLE_CROUCH', 'TOGGLE_WHISTLE', 'VOICE_CHAT_TOGGLE', 'VOICE_CHAT_RELOAD'] },
        { title: 'Транспорт', actions: ['VEHICLE_ENGINE', 'VEHICLE_LOCK', 'VEHICLE_SEATBELT'] },
        { title: 'Устройства', actions: ['SMARTPHONE_OPEN'] },
        { title: 'Brawl', actions: ['BRAWL_VOICE', 'BRAWL_MARKER'] },
        { title: 'Оружие', actions: ['WEAPON_SLOT_0', 'WEAPON_SLOT_1', 'WEAPON_SLOT_2'] },
        { title: 'Анимации', actions: ['FAST_ANIM_1', 'FAST_ANIM_2', 'FAST_ANIM_3', 'FAST_ANIM_4', 'FAST_ANIM_5'] }
    ];

    /* Должно совпадать с BINDER_ACTION_MAP в playermenu_rpc.js */
    var BINDER_TO_SETTING = {
        MENULIST_OPEN:'player_menu_key',CURSOR_TOGGLE:'cursor_key',
        INVENTORY_OPEN: 'inventory_key',
        VEHICLE_ENGINE: 'engine_key',
        VEHICLE_LOCK: 'vehicle_lock_key',
        VEHICLE_SEATBELT: 'seatbelt_key',
        VOICE_CHAT_TOGGLE: 'voice_key',
        VOICE_CHAT_RELOAD: 'voice_reload_key',
        TOGGLE_WHISTLE: 'whistle_key',
        TOGGLE_CROUCH: 'crouch_key',
        LIE_DOWN: 'lie_key',
        FAST_ANIM_0: 'lie_key',
        FAST_ANIM_1: 'anim_slot_1_key',
        FAST_ANIM_2: 'anim_slot_2_key',
        FAST_ANIM_3: 'anim_slot_3_key',
        FAST_ANIM_4: 'anim_slot_4_key',
        FAST_ANIM_5: 'anim_slot_5_key',
        SMARTPHONE_OPEN: 'phone_key',
        HELPMENU_OPEN: 'report_key',
        BRAWL_VOICE: 'brawl_voice_key',
        BRAWL_MARKER: 'brawl_marker_key',
        WEAPON_SLOT_0: 'fast_slot_1_key',
        WEAPON_SLOT_1: 'fast_slot_2_key',
        WEAPON_SLOT_2: 'fast_slot_3_key'
    };

    var VK_NAMES = {
        1: 'ЛКМ', 2: 'ПКМ', 4: 'СКМ', 5: 'M4', 6: 'M5',
        8: 'BACKSPACE', 9: 'TAB', 13: 'ENTER', 16: 'SHIFT', 17: 'CTRL', 18: 'ALT', 19: 'PAUSE',
        20: 'CAPS LOCK', 27: 'ESC', 32: 'SPACE', 33: 'PAGE UP', 34: 'PAGE DOWN', 35: 'END', 36: 'HOME',
        37: '\u2190', 38: '\u2191', 39: '\u2192', 40: '\u2193', 45: 'INSERT', 46: 'DELETE',
        48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
        65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
        75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
        85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
        96: 'NUM0', 97: 'NUM1', 98: 'NUM2', 99: 'NUM3', 100: 'NUM4',
        101: 'NUM5', 102: 'NUM6', 103: 'NUM7', 104: 'NUM8', 105: 'NUM9',
        106: 'NUM*', 107: 'NUM+', 109: 'NUM-', 110: 'NUM.', 111: 'NUM/',
        112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6', 118: 'F7', 119: 'F8',
        120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
        144: 'NUM LOCK', 145: 'SCROLL LOCK',
        160: 'LSHIFT', 161: 'RSHIFT', 162: 'LCTRL', 163: 'RCTRL', 164: 'LALT', 165: 'RALT',
        186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '\u0401',
        219: '[', 220: '\\', 221: ']', 222: "'"
    };

    function bloodFormatVkLabel(vk) {
        vk = parseInt(vk, 10) || 0;
        if (!vk) return '-';
        var label = null;
        if (VK_NAMES[vk]) label = VK_NAMES[vk];
        else if (typeof binder_getKeyNameByVK === 'function') {
            var bk = binder_getKeyNameByVK(vk);
            if (bk) label = bk;
        }
        if (!label) {
            if (vk >= 0x41 && vk <= 0x5a) label = String.fromCharCode(vk);
            else if (vk >= 0x30 && vk <= 0x39) label = String.fromCharCode(vk);
            else if (vk >= 0x60 && vk <= 0x69) label = 'NUM' + (vk - 0x60);
            else if (vk >= 0x70 && vk <= 0x87) label = 'F' + (vk - 0x6f);
            else label = 'VK' + vk;
        }
        /* Стрелки/символы оставляем, буквы — CAPS */
        if (label === '\u2190' || label === '\u2191' || label === '\u2192' || label === '\u2193') return label;
        return String(label).toUpperCase();
    }

    function refreshBinderKeyLabels(v) {
        if (!v || !v.binderData || !v.binderData.length) return;
        for (var i = 0; i < v.binderData.length; i++) {
            var row = v.binderData[i];
            if (!row) continue;
            if (row.readOnly && row.keyName && row.key < 1) continue;
            if (row.action === 'HELPMENU_OPEN') continue;
            row.keyName = bloodFormatVkLabel(row.key);
            if (v.$set) v.$set(v.binderData, i, row);
        }
        bloodSyncBinderGroups(v);
    }
    window.refreshBinderKeyLabels = refreshBinderKeyLabels;

    function bloodApplySettings(cs) {
        if (!cs) return;
        trig('saveSettings', 'hud_hints', !!cs.enableHelpBox);
        trig('saveSettings', 'hud', !!cs.showUI);
        trig('saveSettings', 'names', !!cs.enableNametags);
        trig('saveSettings', 'hitmarker', !!cs.hitMarker);
        trig('saveSettings', 'voice', !!cs.enableVoiceChat);
        trig('saveSettings', 'chat', !cs.hideChat);
        trig('saveSettings', 'disconnect_marker', !cs.hideDisconnectMarker);
        trig('saveSettings', 'map', !cs.hideMinimap);
        trig('saveSettings', 'quests', !!cs.enableQuestBox);
        trig('saveSettings', 'target_hint', !!cs.enableTargetMenuRender);
        __settings.hud_hints = !!cs.enableHelpBox;
        __settings.hud = !!cs.showUI;
        __settings.names = !!cs.enableNametags;
        __settings.hitmarker = !!cs.hitMarker;
        __settings.voice = !!cs.enableVoiceChat;
        __settings.chat = !cs.hideChat;
        __settings.disconnect_marker = !cs.hideDisconnectMarker;
        __settings.map = !cs.hideMinimap;
        __settings.quests = !!cs.enableQuestBox;
        __settings.target_hint = !!cs.enableTargetMenuRender;
    }

    function bloodApplySettingsToVueFromStorage() {
        var v = vue();
        if (!v || !v.currentSetting) return;
        var cs = v.currentSetting;
        var s = __settings || {};
        cs.enableHelpBox = s.hud_hints !== false;
        if (s.hud_hints === undefined) cs.enableHelpBox = s.help !== false;
        cs.enableQuestBox = s.quests !== false;
        cs.enableNametags = s.names !== false;
        cs.showUI = s.hud !== false;
        cs.hitMarker = s.hitmarker !== false;
        cs.enableVoiceChat = s.voice !== false;
        cs.hideChat = s.chat === false;
        cs.hideDisconnectMarker = s.disconnect_marker !== true;
        cs.hideMinimap = s.map === false;
        cs.enableTargetMenuRender = s.target_hint !== false;
    }

    window.bloodSettingChange = function () {
        var v = vue();
        if (v && v.currentSetting) bloodApplySettings(v.currentSetting);
    };

    window.bloodSendReport = function (forceSend) {
        var v = vue();
        if (!v) return Promise.resolve();
        var faq = forceSend === false ? false : ((v.reportMessages || []).length === 0);
        return bloodSendReportMessage(v, v.reportMessageForm, faq);
    };

    window.bloodSendReportMessage = bloodSendReportMessage;

    /* --- mp.trigger: PlayerMenu → Blood --- */
    var _origTrigger = window.mp.trigger.bind(window.mp);

    window.mp.trigger = function (eventName) {
        var args = Array.prototype.slice.call(arguments, 1);
        switch (eventName) {
            case '__client_menu_playerMenu_uiUpdate':
                trig('saveSettings', 'help', !!args[0]);
                trig('saveSettings', 'hud', !!args[1]);
                return;
            case '__client_menu_playerMenu_binderUpdate':
                var sk = BINDER_TO_SETTING[args[0]];
                if (sk && args[1] != null) {
                    var vk = parseInt(args[1], 10) || 0;
                    trig('saveSettings', sk, vk);
                    __settings[sk] = vk;
                    var vB = vue();
                    if (vB && vB.binderData) {
                        for (var bi = 0; bi < vB.binderData.length; bi++) {
                            if (vB.binderData[bi] && vB.binderData[bi].action === args[0]) {
                                vB.binderData[bi].key = vk;
                                vB.binderData[bi].keyName = bloodFormatVkLabel(vk);
                                break;
                            }
                        }
                    }
                }
                return;
            case '__client_menu_playerMenu_startDonate':
                trig('popolnenie');
                return;
            case '__client_menu_playerMenu_report':
                return _origTrigger.apply(window.mp, arguments);
            case 'closemenu':
                if (cancelBinderCaptureFromEsc()) return;
                return _origTrigger.apply(window.mp, arguments);
            case 'client_menuManager_taskClose':
                if (String(args[0]) === 'playerMainMenu') {
                    if (cancelBinderCaptureFromEsc()) return;
                    // F10 close (X) — must hit playermenu close, not F2 closemenu
                    try { trig('playermenu:cef:esc'); } catch (_eEsc) {}
                    try { trig('client.playermenu.close'); } catch (_eClose) {}
                    return;
                }
                break;
            case 'client_hud_reticle_set_test':
            case 'client_hud_reticle_set_bridge':
            case 'playermenu:reticle:save':
                return _origTrigger.apply(window.mp, arguments);
            case 'client_voice_reload':
                return _origTrigger.apply(window.mp, arguments);
            case 'report:ui:create':
            case 'report:ui:send':
            case 'report:ui:close':
            case 'report:ui:requestState':
            case 'reportEmbedPull':
            case 'DonateBuyItem':
            case 'DonateCaseDoOpen':
            case 'DonateCaseBuy':
            case 'donateCaseStockPull':
            case 'obmendpm':
            case 'PlayerChangeLoginDonate':
            case 'armorCosmeticShopPull':
            case 'armorCosmeticEquip':
            case 'armorCosmeticGiftWrap':
            case 'bloodMenuReportCreate':
            case 'bloodMenuReportSend':
            case 'bloodMenuDonateBuy':
            case 'menuAccountProfileRequest':
            case 'PlayerPromocodeEnter':
            case 'bloodMenuPromoEnter':
            case 'menuKeepCursor':
            case 'saveSettings':
            case 'hitmarkerSettingsRequest':
            case 'hitmarkerSettingsSet':
            case 'hitmarkerSettingsFlush':
                return _origTrigger.apply(window.mp, arguments);
        }
        return _origTrigger.apply(window.mp, arguments);
    };

    var BINDER_DEFAULT_VK = {
        MENULIST_OPEN:121,CURSOR_TOGGLE:113,
        INVENTORY_OPEN: 0x49,
        VEHICLE_ENGINE: 0x32,
        VEHICLE_LOCK: 0x4c,
        VEHICLE_SEATBELT: 0x4a,
        VOICE_CHAT_TOGGLE: 0x42,
        VOICE_CHAT_RELOAD: 0x77,
        TOGGLE_WHISTLE: 0x58,
        TOGGLE_CROUCH: 0x11,
        LIE_DOWN: 0x09,
        FAST_ANIM_0: 0x09,
        SMARTPHONE_OPEN: 0x26,
        BRAWL_VOICE: 0x48,
        BRAWL_MARKER: 0x04,
        WEAPON_SLOT_0: 0x31,
        WEAPON_SLOT_1: 0x32,
        WEAPON_SLOT_2: 0x33,
        FAST_ANIM_1: 0,
        FAST_ANIM_2: 0,
        FAST_ANIM_3: 0,
        FAST_ANIM_4: 0,
        FAST_ANIM_5: 0
    };

    function syncSettingsFromUiPack(ui) {
        if (!ui || typeof ui !== 'object') return;
        if (ui.enableHelpBox !== undefined) __settings.hud_hints = !!ui.enableHelpBox;
        else if (ui.hud_hints !== undefined) __settings.hud_hints = !!ui.hud_hints;
        if (ui.enableQuestBox !== undefined) __settings.quests = !!ui.enableQuestBox;
        else if (ui.quests !== undefined) __settings.quests = !!ui.quests;
        if (ui.enableNametags !== undefined) __settings.names = !!ui.enableNametags;
        else if (ui.names !== undefined) __settings.names = !!ui.names;
        if (ui.showUI !== undefined) __settings.hud = !!ui.showUI;
        else if (ui.hud !== undefined) __settings.hud = !!ui.hud;
        if (ui.hitMarker !== undefined) __settings.hitmarker = !!ui.hitMarker;
        else if (ui.hitmarker !== undefined) __settings.hitmarker = !!ui.hitmarker;
        if (ui.enableVoiceChat !== undefined) __settings.voice = !!ui.enableVoiceChat;
        else if (ui.voice !== undefined) __settings.voice = !!ui.voice;
        if (ui.hideChat !== undefined) __settings.chat = !ui.hideChat;
        else if (ui.chat !== undefined) __settings.chat = !!ui.chat;
        if (ui.hideDisconnectMarker !== undefined) __settings.disconnect_marker = !ui.hideDisconnectMarker;
        else if (ui.disconnect_marker !== undefined) __settings.disconnect_marker = !!ui.disconnect_marker;
        if (ui.hideMinimap !== undefined) __settings.map = !ui.hideMinimap;
        else if (ui.map !== undefined) __settings.map = !!ui.map;
        if (ui.enableTargetMenuRender !== undefined) __settings.target_hint = !!ui.enableTargetMenuRender;
        else if (ui.target_hint !== undefined) __settings.target_hint = !!ui.target_hint;
    }

    function bloodHydrateInterfaceFromStorage() {
        var v = vue();
        if (!v || !v.currentSetting) return Promise.resolve();
        if (typeof rpc === 'undefined' || typeof rpc.callClient !== 'function') {
            bloodApplySettingsToVueFromStorage();
            applySettingsToVue(__settings);
            return Promise.resolve();
        }
        return rpc.callClient('client_global_storage_get').then(function (pack) {
            pack = pack || {};
            var ui = pack.settings || {};
            syncSettingsFromUiPack(ui);
            applySettingsToVue(__settings);
            bloodApplySettingsToVueFromStorage();
            /* UI-поля из пака (enable*) — приоритетнее дефолтов */
            try {
                var cs = v.currentSetting;
                if (ui.enableHelpBox !== undefined) setVueSettingField(v, cs, 'enableHelpBox', !!ui.enableHelpBox);
                if (ui.enableQuestBox !== undefined) setVueSettingField(v, cs, 'enableQuestBox', !!ui.enableQuestBox);
                if (ui.enableNametags !== undefined) setVueSettingField(v, cs, 'enableNametags', !!ui.enableNametags);
                if (ui.showUI !== undefined) setVueSettingField(v, cs, 'showUI', !!ui.showUI);
                if (ui.enableVoiceChat !== undefined) setVueSettingField(v, cs, 'enableVoiceChat', !!ui.enableVoiceChat);
                if (ui.hideChat !== undefined) setVueSettingField(v, cs, 'hideChat', !!ui.hideChat);
                if (ui.hideDisconnectMarker !== undefined) setVueSettingField(v, cs, 'hideDisconnectMarker', !!ui.hideDisconnectMarker);
                if (ui.hideMinimap !== undefined) setVueSettingField(v, cs, 'hideMinimap', !!ui.hideMinimap);
                if (ui.enableTargetMenuRender !== undefined) setVueSettingField(v, cs, 'enableTargetMenuRender', !!ui.enableTargetMenuRender);
            } catch (_eUi) {}
        }).catch(function () {
            bloodApplySettingsToVueFromStorage();
            applySettingsToVue(__settings);
        });
    }

    window.bloodHydrateInterfaceFromStorage = bloodHydrateInterfaceFromStorage;

    function buildStoragePack() {
        var s = __settings || {};
        var v = vue();
        var cs = (v && v.currentSetting) || {};
        return {
            settings: {
                enableHelpBox: s.hud_hints !== false,
                enableQuestBox: s.quests !== false,
                enableTimerBox: cs.enableTimerBox !== false,
                enableNametags: s.names !== false,
                enableLocalName: !!cs.enableLocalName,
                enableCenterInventory: !!cs.enableCenterInventory,
                disableScreenEffect: !!cs.disableScreenEffect,
                disableDocumentPhoto: !!cs.disableDocumentPhoto,
                enableSpeedometer: cs.enableSpeedometer !== false,
                maxVolume3dSound: cs.maxVolume3dSound != null ? cs.maxVolume3dSound : 100,
                speedometerColor: cs.speedometerColor || [255, 255, 255, 1],
                speedometerBackgroundColor: cs.speedometerBackgroundColor || [0, 0, 0, 0.5],
                hitMarker: s.hitmarker !== false,
                showUI: s.hud !== false,
                enableVoiceChat: s.voice !== false,
                hideChat: s.chat === false,
                hideDisconnectMarker: s.disconnect_marker !== true,
                hideMinimap: s.map === false,
                enableTargetMenuRender: s.target_hint !== false
            },
            chat: {
                height: cs.chatHeight != null ? cs.chatHeight : 195,
                lineHeight: cs.chatLineHeight != null ? cs.chatLineHeight : 24,
                fontSize: cs.chatFontSize != null ? cs.chatFontSize : 14,
                shadow: cs.chatShadow !== false,
                timestamp: cs.chatTimestamp !== false
            }
        };
    }

    function buildBinderData() {
        return BINDER_DEFS.map(function (d, idx) {
            var action = d[0];
            var sk = d[1];
            var vk = 0;
            if (sk && __settings[sk] != null) {
                vk = parseInt(__settings[sk], 10) || 0;
            } else if (BINDER_DEFAULT_VK[action] != null) {
                vk = BINDER_DEFAULT_VK[action];
            }
            return {
                action: action,
                key: vk > 0 ? vk : -1,
                keyName: vk > 0 ? bloodFormatVkLabel(vk) : '-',
                comb: { shift: false, ctrl: false, alt: false },
                desc: d[2],
                index: idx
            };
        });
    }

    function bloodDefaultReticleColor() {
        return { rgba: { r: 255, g: 255, b: 255, a: 1 } };
    }

    function bloodDefaultReticleTypes() {
        var c = bloodDefaultReticleColor;
        return [
            {
                type: 'point2',
                name: 'Точка',
                params: [
                    { name: 'Размер', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Цвет', type: 'color', value: c() },
                    { name: 'Цвет при наведении на противника', type: 'color', value: c() }
                ]
            },
            {
                type: 'cross2',
                name: 'Перекрестие',
                params: [
                    { name: 'Длина', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Ширина', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Расстояние', type: 'progress', min: 1, max: 100, value: 10 },
                    { name: 'Цвет', type: 'color', value: c() },
                    { name: 'Цвет при наведении на противника', type: 'color', value: c() }
                ]
            }
        ];
    }

    function bloodEnsureReticleTypeList(list) {
        var filtered = (Array.isArray(list) ? list : []).filter(function (item) {
            return item && item.type !== '4tr2';
        });
        return filtered.length ? filtered : bloodDefaultReticleTypes();
    }

    function stubRpc() {
        if (typeof window.rpc === 'undefined') return;
        if (window.rpc.__bloodRpcStubbed) return;
        window.rpc.__bloodRpcStubbed = true;
        var origCC = rpc.callClient ? rpc.callClient.bind(rpc) : null;
        var origTC = rpc.triggerClient ? rpc.triggerClient.bind(rpc) : null;
        rpc.callClient = function (name) {
            var a = Array.prototype.slice.call(arguments, 1);
            /* storage get/flush — только реальный клиентский RPC (mp.storage), без stub */
            if (name === 'client_global_storage_get') {
                if (origCC) {
                    return origCC.apply(rpc, arguments).then(function (pack) {
                        try {
                            if (pack && pack.settings) {
                                syncSettingsFromUiPack(pack.settings);
                            }
                        } catch (_eSync) {}
                        return pack || buildStoragePack();
                    }).catch(function () {
                        return buildStoragePack();
                    });
                }
                return Promise.resolve(buildStoragePack());
            }
            if (name === 'client_global_storage_flush') {
                if (origCC) {
                    return origCC.apply(rpc, arguments).then(function (ok) {
                        try {
                            var vFlush = vue();
                            if (vFlush && vFlush.currentSetting) {
                                /* держим __settings в синхроне после flush */
                                bloodApplySettingsToVueFromStorage();
                            }
                        } catch (_eFlush) {}
                        return ok !== false;
                    }).catch(function () {
                        var vFlush2 = vue();
                        if (vFlush2 && vFlush2.currentSetting) bloodApplySettings(vFlush2.currentSetting);
                        return true;
                    });
                }
                var vFlush3 = vue();
                if (vFlush3 && vFlush3.currentSetting) bloodApplySettings(vFlush3.currentSetting);
                return Promise.resolve(true);
            }
            if (name === 'client_getGlobalValue') {
                var key = a[0];
                if (key === 'uiVisible') return Promise.resolve(__settings.hud !== false);
                if (key === 'enable3dSound') return Promise.resolve(true);
                if (key === 'enableCompass') return Promise.resolve(__settings.map !== false);
                if (key === 'hideMinimap') return Promise.resolve(__settings.map === false);
                if (key === 'targetMenuRender') return Promise.resolve(__settings.target_hint !== false);
                return Promise.resolve(true);
            }
            if (name === '__client_voiceChat_getBlockList') return Promise.resolve('');
            if (name === 'client_hud_reticle_getList' || name === 'api.client_hud_reticle_getList') {
                if (origCC) {
                    return origCC.apply(rpc, arguments).then(function (res) {
                        if (res && typeof res === 'object' && !Array.isArray(res)) {
                            if (res.error) return res;
                            if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && Array.isArray(res.data.list)) {
                                return res;
                            }
                            if (Array.isArray(res.list) && res.list.length) return res;
                            if (Array.isArray(res.data) && res.data.length) return res;
                        }
                        if (Array.isArray(res) && res.length) return res;
                        return { error: false, data: { list: bloodDefaultReticleTypes(), currentType: '' } };
                    }).catch(function () {
                        return { error: false, data: { list: bloodDefaultReticleTypes(), currentType: '' } };
                    });
                }
                return Promise.resolve({ error: false, data: { list: bloodDefaultReticleTypes(), currentType: '' } });
            }
            if (name === 'client_hud_reticle_set' || name === 'api.client_hud_reticle_set') {
                if (origCC) return origCC.apply(rpc, arguments);
                try { trig('client_hud_reticle_set_bridge', JSON.stringify(a[0])); } catch (_eSetRpc) {}
                return Promise.resolve({ error: false, data: true });
            }
            if (name === 'client_menu_playerMainMenu_getBinderData') {
                if (origCC) {
                    return origCC.apply(rpc, arguments).then(function (a) {
                        if (a && a.length) return a;
                        return buildBinderData();
                    }).catch(function () {
                        return buildBinderData();
                    });
                }
                return Promise.resolve(buildBinderData());
            }
            if (origCC) return origCC.apply(rpc, arguments);
            return Promise.resolve(null);
        };
        rpc.triggerClient = function (name) {
            var a = Array.prototype.slice.call(arguments, 1);
            if (name === 'client_setGlobalValue') {
                var pair = a[0];
                if (Array.isArray(pair)) {
                    if (pair[0] === 'targetMenuRender') {
                        trig('saveSettings', 'target_hint', !!pair[1]);
                        __settings.target_hint = !!pair[1];
                    } else if (pair[0] === 'enableCompass') {
                        trig('saveSettings', 'map', !!pair[1]);
                        __settings.map = !!pair[1];
                    } else if (pair[0] === 'hideMinimap') {
                        trig('saveSettings', 'map', !pair[1]);
                        __settings.map = !pair[1];
                    }
                }
                return Promise.resolve(true);
            }
            if (origTC) return origTC.apply(rpc, arguments);
            return Promise.resolve(true);
        };
    }

    function stubServerAPI() {
        if (typeof window.serverAPI === 'undefined') return;
        if (window.serverAPI.__bloodStubbed) return;
        if (typeof window.serverAPI.currencyFormatSpace !== 'function') {
            window.serverAPI.currencyFormatSpace = function (n) {
                n = Number(n) || 0;
                return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            };
        }
        window.serverAPI.__bloodStubbed = true;
        if (typeof window.serverAPI.notifyError !== 'function') {
            window.serverAPI.notifyError = function (msg) {
                try { trig('notify:client', 2, 'top-mid', String(msg || 'Ошибка'), 3000); } catch (e) {}
            };
        }
        if (typeof window.serverAPI.notifySuccess !== 'function') {
            window.serverAPI.notifySuccess = function (msg) {
                try { trig('notify:client', 3, 'top-mid', String(msg || 'Готово'), 3000); } catch (e) {}
            };
        }
        window.serverAPI.getAsync = function (name, arg) {
            if (name === 'server_reportSystem_getMessages') return Promise.resolve(__reportMessages.slice());
            if (name === 'server_reportSystem_sendMessage') {
                return bloodSendReportMessage(vue(), arg, false);
            }
            if (name === 'server_reportSystem_deleteChat') {
                trig('report:ui:close');
                return Promise.resolve(true);
            }
            if (name === 'server_player_enterPromo') {
                var code = normalizePromoCode(arg);
                if (!code) {
                    serverAPI.notifyError('Введите промокод.');
                    return Promise.resolve(false);
                }
                if (!/^[a-z0-9]{3,15}$/.test(code)) {
                    serverAPI.notifyError('Некорректный промокод (3–15 символов, a-z и 0-9).');
                    return Promise.resolve(false);
                }
                trig('bloodMenuPromoEnter', code);
                try { serverAPI.notifySuccess('Проверяем промокод…'); } catch (eProm0) {}
                return Promise.resolve(true);
            }
            if (name === 'server_player_buyDonateFunc') {
                var code = String(arg || '');
                if (code === 'BUY_VIP1') trig('bloodMenuDonateBuy', 'Privilege', 'BronzeVIP', '');
                else if (code === 'BUY_VIP2') trig('bloodMenuDonateBuy', 'Privilege', 'SilverVIP', '');
                else if (code === 'BUY_VIP3') trig('bloodMenuDonateBuy', 'Privilege', 'PlatinumVIP', '');
                else trig('bloodMenuDonateBuy', 'Shop', code, code);
                [800, 1800, 3500].forEach(function (ms) {
                    setTimeout(function () { try { trig('menuAccountProfileRequest'); } catch (e) {} }, ms);
                });
                return Promise.resolve(true);
            }
            if (name === 'server_bonusShop_buy') {
                var payload = arg && typeof arg === 'object' ? arg : {};
                var itemId = String(payload.id || '');
                var catalog = window.BLOOD_SHOP_CATALOG || [];
                var shopItem = null;
                for (var si = 0; si < catalog.length; si++) {
                    if (catalog[si].id === itemId) { shopItem = catalog[si]; break; }
                }
                if (shopItem && typeof window.bloodShopBuyItem === 'function') {
                    window.bloodShopBuyItem(shopItem, {
                        prefix: payload.prefix,
                        login: payload.login,
                        exchangeDp: payload.exchangeDp
                    });
                }
                return Promise.resolve(true);
            }
            if (name === 'server_donateRoulette_open') {
                return new Promise(function (resolve, reject) {
                    window.__roulettePendingResolve = resolve;
                    var caseId = String(arg || 'gold').toLowerCase();
                    var map = {
                        silver: 'SilverCase',
                        gold: 'GoldCase',
                        armor: 'ArmorCase',
                        gun: 'GunCase'
                    };
                    trig('DonateCaseDoOpen', map[caseId] || caseId, false, 'dp');
                    setTimeout(function () {
                        if (window.__roulettePendingResolve) {
                            window.__roulettePendingResolve = null;
                            reject('timeout');
                        }
                    }, 45000);
                });
            }
            if (name === 'server_donateRoulette_claim') {
                trig('collectPrize');
                return Promise.resolve(true);
            }
            if (name === 'server_donateRoulette_sell') {
                trig('sellPrize');
                return Promise.resolve(true);
            }
            if (name === 'server_player_mainMenu_getAchievemnt') return Promise.resolve([0, []]);
            if (name === 'server_player_mainMenu_getGifts') return Promise.resolve([]);
            return Promise.resolve(null);
        };
        window.serverAPI.send = function (name, arg) {
            return window.serverAPI.getAsync(name, arg);
        };
        var origGetApiAsync = typeof window.serverAPI.getApiAsync === 'function'
            ? window.serverAPI.getApiAsync.bind(window.serverAPI)
            : null;
        window.serverAPI.getApiAsync = function (name, arg) {
            if (origGetApiAsync) {
                return origGetApiAsync(name, arg).then(function (data) {
                    return data;
                }).catch(function (err) {
                    if (name === 'client_hud_reticle_getList') {
                        return { list: bloodDefaultReticleTypes(), currentType: '' };
                    }
                    if (name === 'client_hud_reticle_set') {
                        try { trig('client_hud_reticle_set_bridge', JSON.stringify(arg)); } catch (_eSave) {}
                        return true;
                    }
                    return Promise.reject(err);
                });
            }
            if (name === 'client_hud_reticle_getList') {
                return Promise.resolve({ list: bloodDefaultReticleTypes(), currentType: '' });
            }
            if (name === 'client_hud_reticle_set') {
                try { trig('client_hud_reticle_set_bridge', JSON.stringify(arg)); } catch (_eSave2) {}
                return Promise.resolve(true);
            }
            return Promise.resolve(null);
        };
    }

    var CODE_TO_VK = {
        Escape: 27, Backspace: 8, Tab: 9, Enter: 13, Space: 32,
        ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17, ControlRight: 17,
        AltLeft: 18, AltRight: 18, Pause: 19, CapsLock: 20,
        PageUp: 33, PageDown: 34, End: 35, Home: 36,
        ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
        Insert: 45, Delete: 46,
        Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52,
        Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57,
        KeyA: 65, KeyB: 66, KeyC: 67, KeyD: 68, KeyE: 69, KeyF: 70,
        KeyG: 71, KeyH: 72, KeyI: 73, KeyJ: 74, KeyK: 75, KeyL: 76,
        KeyM: 77, KeyN: 78, KeyO: 79, KeyP: 80, KeyQ: 81, KeyR: 82,
        KeyS: 83, KeyT: 84, KeyU: 85, KeyV: 86, KeyW: 87, KeyX: 88,
        KeyY: 89, KeyZ: 90,
        Numpad0: 96, Numpad1: 97, Numpad2: 98, Numpad3: 99, Numpad4: 100,
        Numpad5: 101, Numpad6: 102, Numpad7: 103, Numpad8: 104, Numpad9: 105,
        NumpadMultiply: 106, NumpadAdd: 107, NumpadSubtract: 109, NumpadDecimal: 110, NumpadDivide: 111,
        F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119,
        F9: 120, F10: 121, F11: 122, F12: 123,
        Semicolon: 186, Equal: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191, Backquote: 192,
        BracketLeft: 219, Backslash: 220, BracketRight: 221, Quote: 222
    };

    function domCodeToVk(code) {
        if (!code) return 0;
        if (CODE_TO_VK.hasOwnProperty(code)) return CODE_TO_VK[code];
        return 0;
    }

    function captureEventToVk(ev) {
        if (!ev) return 0;
        var vk = domCodeToVk(ev.code);
        if (vk > 0) return vk;
        var js = ev.keyCode || ev.which || 0;
        if (typeof binder_getKeyByJS === 'function') {
            var info = binder_getKeyByJS(js);
            if (info && info.vk > 0) return info.vk;
        }
        var key = ev.key != null ? String(ev.key) : '';
        if (key === 'ё' || key === 'Ё' || key === '`' || key === '~') return 192;
        if (key === 'Shift') return 16;
        if (key === 'Control') return 17;
        if (key === 'Alt') return 18;
        if (js >= 48 && js <= 57) return js;
        if (js >= 65 && js <= 90) return js;
        if (js >= 96 && js <= 111) return js;
        if (js >= 112 && js <= 123) return js;
        if (js >= 160 && js <= 165) return js;
        if (js >= 186 && js <= 192) return js;
        if (js >= 219 && js <= 222) return js;
        if (js > 0 && js <= 255) return js;
        return 0;
    }

    function ensureBinderHelpers() {
        if (typeof window.binder_getKeyNameByVK !== 'function') {
            window.binder_getKeyNameByVK = function (vk) {
                vk = parseInt(vk, 10);
                if (!isFinite(vk) || vk <= 0) return null;
                if (VK_NAMES[vk]) return VK_NAMES[vk];
                return 'VK' + vk;
            };
        } else {
            var _origBinderVkName = window.binder_getKeyNameByVK;
            window.binder_getKeyNameByVK = function (vk) {
                vk = parseInt(vk, 10);
                if (VK_NAMES[vk]) return VK_NAMES[vk];
                return _origBinderVkName(vk);
            };
        }
        if (typeof window.binder_getKeyByJS !== 'function') {
            window.binder_getKeyByJS = function (js) {
                js = parseInt(js, 10);
                if (!isFinite(js)) return null;
                if (js >= 112 && js <= 123) return { vk: js, key: 'F' + (js - 111) };
                if (js >= 48 && js <= 57) return { vk: js, key: String.fromCharCode(js) };
                if (js >= 65 && js <= 90) return { vk: js, key: String.fromCharCode(js) };
                if (js > 0 && js <= 255) return { vk: js, key: 'VK' + js };
                return null;
            };
        } else {
            var _origBinderGetByJs = window.binder_getKeyByJS;
            window.binder_getKeyByJS = function (js) {
                js = parseInt(js, 10);
                var info = _origBinderGetByJs(js);
                if (info && info.vk > 0) return info;
                if (!isFinite(js)) return null;
                if (js >= 112 && js <= 123) return { vk: js, key: 'F' + (js - 111) };
                if (js >= 48 && js <= 57) return { vk: js, key: String.fromCharCode(js) };
                if (js >= 65 && js <= 90) return { vk: js, key: String.fromCharCode(js) };
                if (js > 0 && js <= 255) return { vk: js, key: 'VK' + js };
                return null;
            };
        }
    }

    function formatBinderKeySafe(v, keyName, comb) {
        if (v && typeof v.formatBinderKey === 'function') {
            return v.formatBinderKey(keyName || '', comb || {});
        }
        comb = comb || {};
        return (comb.shift ? 'SHIFT+' : '') + (comb.ctrl ? 'CTRL+' : '') + (comb.alt ? 'ALT+' : '') + (keyName || '');
    }

    var __bindCaptureArmAt = 0;

    function armBinderCapture() {
        __bindCaptureIgnoreUntil = Date.now() + 350;
        __bindCaptureArmAt = 0;
    }

    function binderCaptureArmed() {
        return Date.now() >= __bindCaptureIgnoreUntil;
    }

    function cancelBinderCapture(v, notify) {
        if (!v) return;
        v.binderSelectKey = -1;
        setClientBinderCapture(false, true);
        if (notify) {
            try { trig('notify:client', 3, 'top-mid', 'Назначение отменено.', 2500); } catch (eN) {}
        }
    }

    function applyBinderKey(v, rowIdx, vk, skipClientCapture) {
        if (!v || rowIdx == null || rowIdx < 0) return;
        var row = v.binderData && v.binderData[rowIdx];
        if (!row || !row.action) return;
        if (row.readOnly || row.action === 'HELPMENU_OPEN') {
            v.binderSelectKey = -1;
            if (!skipClientCapture) setClientBinderCapture(false, true);
            try { trig('notify:client', 2, 'top-mid', 'Это действие нельзя переназначить.', 2500); } catch (e0) {}
            return;
        }
        var sk = BINDER_TO_SETTING[row.action];
        if (!sk) {
            v.binderSelectKey = -1;
            if (!skipClientCapture) setClientBinderCapture(false);
            try { trig('notify:client', 2, 'top-mid', 'Это действие нельзя переназначить.', 2500); } catch (e0) {}
            return;
        }
        vk = parseInt(vk, 10) || 0;
        /* Только binderUpdate → saveBinderKey (единый источник правды). Без параллельного saveSettings. */
        try { trig('__client_menu_playerMenu_binderUpdate', row.action, vk, JSON.stringify(row.comb || {})); } catch (_eUpd) {}
        __settings[sk] = vk;
        v.binderSelectKey = -1;
        if (!skipClientCapture) setClientBinderCapture(false, vk === 0);
        /* UI обновит pushBinderDataToCef с клиента; локальный optimistic только если список ещё не пришёл */
        if (row) {
            row.key = vk > 0 ? vk : -1;
            row.keyName = vk > 0 ? bloodFormatVkLabel(vk) : '-';
            if (v.$set) v.$set(v.binderData, rowIdx, row);
            else v.binderData[rowIdx] = row;
        }
    }

    window.bloodEscClearBinderCapture = function () {
        var v = vue();
        if (!v || v.binderSelectKey == null || v.binderSelectKey < 0) return;
        /* ESC только отменяет захват — НЕ снимает бинд (не пишем 0) */
        cancelBinderCapture(v, false);
        __bloodSuppressMenuEscUntil = Date.now() + 1500;
    };

    function domPointerToVk(ev) {
        if (!ev) return 0;
        var btn = ev.button;
        if (btn === 0) return 0x01;
        if (btn === 1) return 0x04;
        if (btn === 2) return 0x02;
        if (btn === 3) return 0x05;
        if (btn === 4) return 0x06;
        return 0;
    }

    window.bloodCefMouseBindCapture = function (vk, label) {
        try {
            var v = vue();
            if (!v) return;
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return;
            if (v.currentTab !== 5) return;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return;
            applyBinderKey(v, v.binderSelectKey, vk);
        } catch (_e) {}
    };

    function isMenuTextInput(el) {
        if (!el || !el.tagName) return false;
        var tag = String(el.tagName).toLowerCase();
        return tag === 'input' || tag === 'textarea' || !!el.isContentEditable;
    }

    function installBinderKeyCapture(v) {
        if (!v || v.__bloodBinderCaptureInstalled) return;
        v.__bloodBinderCaptureInstalled = true;

        function tryCapture(ev, vk) {
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return false;
            if (v.currentTab !== 5) return false;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return false;
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            applyBinderKey(v, v.binderSelectKey, vk);
            return true;
        }

        document.addEventListener('keydown', function (ev) {
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return;
            if (isMenuTextInput(ev.target)) return;
            if (v.currentTab !== 5) return;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return;
            if (ev.keyCode === 27 || ev.code === 'Escape') {
                if (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                }
                cancelBinderCaptureFromEsc();
                return;
            }
            if (!binderCaptureArmed()) return;
            var vk = captureEventToVk(ev);
            if (!vk) return;
            tryCapture(ev, vk);
        }, true);

        document.addEventListener('mousedown', function (ev) {
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return;
            if (v.currentTab !== 5) return;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return;
            if (!binderCaptureArmed()) return;
            var vk = domPointerToVk(ev);
            if (!vk) return;
            tryCapture(ev, vk);
        }, true);

        document.addEventListener('mouseup', function (ev) {
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return;
            if (v.currentTab !== 5) return;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return;
            if (!binderCaptureArmed()) return;
            var vk = domPointerToVk(ev);
            if (vk !== 0x05 && vk !== 0x06) return;
            tryCapture(ev, vk);
        }, true);

        document.addEventListener('auxclick', function (ev) {
            if (v.binderSelectKey == null || v.binderSelectKey < 0) return;
            if (v.currentTab !== 5) return;
            if (v.currentSettingTab !== 0 && v.currentSettingTab !== 1) return;
            if (!binderCaptureArmed()) return;
            var vk = domPointerToVk(ev);
            if (!vk) return;
            tryCapture(ev, vk);
        }, true);

        document.addEventListener('keyup', function (ev) {
            if (ev.keyCode !== 27 && ev.which !== 27 && ev.code !== 'Escape') return;
            if ((window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil) ||
                (__bloodSuppressMenuEscUntil && Date.now() < __bloodSuppressMenuEscUntil) ||
                isBinderCaptureActive()) {
                ev.preventDefault();
                if (ev.stopPropagation) ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                if (isBinderCaptureActive()) cancelBinderCaptureFromEsc();
                return;
            }
        }, true);

        if (typeof v.onKeyUp === 'function' && !v.__bloodKeyUpPatched) {
            v.__bloodKeyUpPatched = true;
            var origMethod = (v.$options && v.$options.methods && v.$options.methods.onKeyUp) || null;
            try { if (origMethod) document.removeEventListener('keyup', origMethod); } catch (_eRm1) {}
            var origUp = v.onKeyUp.bind(v);
            v.onKeyUp = function (e) {
                if (e && (e.which === 27 || e.keyCode === 27 || (e.code && e.code === 'Escape'))) {
                    if (window.__pmEscCancelUntil && Date.now() < window.__pmEscCancelUntil) return;
                    if (Date.now() < __bloodSuppressMenuEscUntil) return;
                    if (v.binderSelectKey != null && v.binderSelectKey >= 0) {
                        cancelBinderCaptureFromEsc();
                        return;
                    }
                }
                if (e && e.which === 27 && isMenuTextInput(e.target)) return;
                return origUp(e);
            };
            try { document.addEventListener('keyup', function (e) { return v.onKeyUp(e); }); } catch (_eAdd) {}
        }

        if (typeof v.onKeyDown === 'function' && !v.__bloodKeyDownPatched) {
            v.__bloodKeyDownPatched = true;
            var origDown = v.onKeyDown.bind(v);
            v.onKeyDown = function (e) {
                if (v.binderSelectKey != null && v.binderSelectKey >= 0) {
                    if (e) { e.preventDefault(); e.stopPropagation(); }
                    if (e && (e.which === 27 || e.keyCode === 27 || e.code === 'Escape')) {
                        return;
                    }
                    if (!binderCaptureArmed()) return;
                    var vk = captureEventToVk(e);
                    if (vk > 0) {
                        applyBinderKey(v, v.binderSelectKey, vk);
                    }
                    return;
                }
                return origDown(e);
            };
        }

        document.addEventListener('focusin', function (ev) {
            if (!isMenuTextInput(ev.target)) return;
            v.binderSelectKey = -1;
            setClientBinderCapture(false);
            try { trig('menuKeepCursor'); } catch (_eFc) {}
        }, true);

        document.addEventListener('mousedown', function (ev) {
            if (!isMenuTextInput(ev.target)) return;
            try { trig('menuKeepCursor'); } catch (_eMd) {}
        }, true);
    }

    function bloodLoadSettings(v) {
        if (!v) return Promise.resolve();
        if (v.currentSetting) {
            bloodApplySettingsToVueFromStorage();
            applySettingsToVue(__settings);
            try { bloodHydrateInterfaceFromStorage(); } catch (_eHydLs) {}
        }
        return rpc.callClient('client_menu_playerMainMenu_getBinderData').then(function (a) {
            if (!a || !a.length) a = buildBinderData();
            for (var i = 0; i < a.length; i++) {
                if (a[i] && a[i].index == null) a[i].index = i;
            }
            bloodApplySettingsToVueFromStorage();
            if (v.$set) v.$set(v, 'binderData', a);
            else v.binderData = a;
            refreshBinderKeyLabels(v);
            bloodSyncBinderGroups(v);
            installBinderKeyCapture(v);
            v.binderSelectKey = -1;
        }).catch(function () {
            bloodApplySettingsToVueFromStorage();
            var fallback = buildBinderData();
            for (var j = 0; j < fallback.length; j++) {
                if (fallback[j] && fallback[j].index == null) fallback[j].index = j;
            }
            if (v.$set) v.$set(v, 'binderData', fallback);
            else v.binderData = fallback;
            refreshBinderKeyLabels(v);
            bloodSyncBinderGroups(v);
            installBinderKeyCapture(v);
            v.binderSelectKey = -1;
        });
    }
    window.bloodLoadSettings = bloodLoadSettings;

    function bloodClearHitmarkerSettingsPanel() {
        try {
            if (typeof window.bloodHitmarkerSettingsClose === 'function') {
                window.bloodHitmarkerSettingsClose();
                return;
            }
            var hostHm = document.getElementById('bloodHitmarkerSettingsPanel');
            if (hostHm) hostHm.innerHTML = '';
        } catch (_eHm) {}
    }

    function bloodClearChatSettingsPanel() {
        try {
            if (typeof window.bloodChatSettingsClose === 'function') {
                window.bloodChatSettingsClose();
                return;
            }
            var host = document.getElementById('bloodChatSettingsPanel');
            if (host) host.innerHTML = '';
        } catch (_e) {}
    }

    function bloodResetSettingsSubTab(v) {
        if (!v) return;
        try {
            // 3 = чат, 5 = хит-маркет (убраны). 4 = прицел — не трогаем.
            var st = parseInt(v.currentSettingTab, 10);
            if (st === 3 || st === 5) {
                if (v.$set) v.$set(v, 'currentSettingTab', 0);
                else v.currentSettingTab = 0;
            }
        } catch (_e2) {}
    }

    function bloodClearAllSettingsPanels(v) {
        bloodClearChatSettingsPanel();
        bloodClearReticleSettingsPanel(v);
        bloodClearHitmarkerSettingsPanel();
    }

    function bloodClearReticleSettingsPanel(_v) {
        /* Не сбрасываем выбранный тип — иначе Save уходит пустым и пишет «Прицел сброшен». */
    }

    function bloodLeaveSettingsSubTab(v, fromTab) {
        fromTab = parseInt(fromTab, 10);
        if (fromTab === 3) bloodClearChatSettingsPanel();
        if (fromTab === 5) bloodClearHitmarkerSettingsPanel();
    }

    function bloodOpenReticleTab(v) {
        if (!v) return;
        if (typeof v.openReticleSetting !== 'function') {
            if (v.$set) {
                v.$set(v, 'currentSettingTab', 4);
                v.$set(v, 'settingReticleTypeList', bloodDefaultReticleTypes());
                /* не трогаем settingReticleCurrent — иначе Save уходит пустым */
            } else {
                v.currentSettingTab = 4;
                v.settingReticleTypeList = bloodDefaultReticleTypes();
            }
            return;
        }

        var done = function () {
            if (v.$set) {
                v.$set(v, 'currentSettingTab', 4);
                v.$set(v, 'settingReticleTypeList', bloodEnsureReticleTypeList(v.settingReticleTypeList));
            } else {
                v.currentSettingTab = 4;
                v.settingReticleTypeList = bloodEnsureReticleTypeList(v.settingReticleTypeList);
            }
        };

        try {
            var p = v.openReticleSetting();
            if (p && typeof p.then === 'function') p.then(done).catch(done);
            else done();
        } catch (_eOpen) {
            done();
        }
    }

    window.bloodOpenReticleSetting = function () {
        window.bloodSettingSubTab(4);
    };

    window.bloodSettingSubTab = function (tab) {
        tab = parseInt(tab, 10);
        if (isNaN(tab)) tab = 0;
        // Чат (3) и Хит-маркет (5) убраны из F10
        if (tab === 3 || tab === 5) tab = 0;
        if (typeof window.flowSettingSubTab === 'function' && window.flowSettingSubTab !== window.bloodSettingSubTab) {
            try { return window.flowSettingSubTab(tab); } catch (_eFlow) {}
        }
        var v = vue();
        if (!v) return;

        var prevTab = parseInt(v.currentSettingTab, 10);
        if (isNaN(prevTab)) prevTab = 0;

        if (prevTab !== tab) {
            bloodLeaveSettingsSubTab(v, prevTab);
        }

        v.currentTab = 5;
        v.binderSelectKey = -1;
        setClientBinderCapture(false);

        if (tab === 4) {
            bloodOpenReticleTab(v);
            return;
        }

        v.currentSettingTab = tab;

        if (tab === 0 || tab === 1) {
            bloodLoadSettings(v);
        }
    };

    window.bloodSelectBinder = function (idx) {
        var v = vue();
        if (!v) return;
        idx = parseInt(idx, 10);
        if (isNaN(idx) || idx < 0) return;
        var row = v.binderData && v.binderData[idx];
        if (!row) return;
        if (row.readOnly || row.action === 'HELPMENU_OPEN') {
            try { trig('notify:client', 2, 'top-mid', 'Это действие нельзя переназначить.', 3000); } catch (_eRo) {}
            return;
        }
        if (typeof v.flowSelectBinder === 'function') {
            try { return v.flowSelectBinder(idx); } catch (_eFlow) {}
        }
        v.currentTab = 5;
        if (v.currentSettingTab !== 1) {
            if (v.$set) v.$set(v, 'currentSettingTab', 1);
            else v.currentSettingTab = 1;
        }
        v.binderSelectKey = idx;
        setClientBinderCapture(true);
        armBinderCapture();
        try { trig('notify:client', 3, 'top-mid', 'Нажмите любую клавишу.', 3500); } catch (e0) {}
    };

    function bloodLoadReports(v) {
        if (!v) return Promise.resolve();
        if (v.$set) v.$set(v, 'reportFindAns', []);
        else v.reportFindAns = [];
        try { trig('menuMainTabChange', '#menu-report'); } catch (e1) {}
        try { trig('report:ui:requestState'); } catch (eRs) {}
        return serverAPI.getAsync('server_reportSystem_getMessages').then(function () {
            if (typeof Vue !== 'undefined' && Vue.nextTick) {
                Vue.nextTick(function () {
                    var ref = v.$refs.reportChat;
                    if (ref && ref.scrollTop != null) ref.scrollTop = ref.scrollHeight + 9999;
                    var input = v.$refs.reportInput;
                    if (input && input.focus) input.focus();
                });
            }
        }).catch(function () {});
    }

    function bloodMatchReportFaq(text) {
        if (typeof ReportTextChecker === 'undefined' || typeof reportAnswerList === 'undefined') return [];
        var checker = new ReportTextChecker(text);
        var matches = [];
        for (var i = 0; i < reportAnswerList.length; i++) {
            var entry = reportAnswerList[i];
            if (!entry || !entry.questionList) continue;
            for (var j = 0; j < entry.questionList.length; j++) {
                var q = entry.questionList[j];
                if (!q || typeof q.compare !== 'function') continue;
                var score = q.compare(checker);
                if (score > 0.35) {
                    matches.push([score, entry]);
                    break;
                }
            }
        }
        if (!matches.length) return [];
        matches.sort(function (a, b) { return b[0] - a[0]; });
        return matches.map(function (m) { return m[1]; });
    }

    function bloodClearArmorFromShop() {
        try {
            var grid = document.querySelector('.playerMenu-shop-grid');
            if (grid) {
                var leak = grid.querySelector('.shop-armor-grid__items, .shop-armor-grid__head, .shop-armor-card');
                if (leak) {
                    grid.querySelectorAll('.shop-armor-grid__items, .shop-armor-grid__head, .shop-armor-card, .shop-armor-empty').forEach(function (n) {
                        if (n.parentNode) n.parentNode.removeChild(n);
                    });
                }
            }
        } catch (e) {}
    }

    function postOpenTabHook(v, tab) {
        try {
            if (tab !== 5) {
                bloodClearAllSettingsPanels(v);
                bloodResetSettingsSubTab(v);
            }
            var href = TAB_HREF[tab];
            if (href) trig('menuMainTabChange', href);
        } catch (e) {}
    }

    function patchVueMethods(v) {
        if (!v || v.__bloodMethodsPatched) return;
        v.__bloodMethodsPatched = true;

        if (!v.__bloodSettingPatched) {
            v.__bloodSettingPatched = true;
        }
        var prevSettingChange = typeof v.settingChange === 'function' ? v.settingChange.bind(v) : null;
        v.settingChange = function () {
            bloodApplySettings(this.currentSetting);
            if (prevSettingChange) {
                try {
                    var ret = prevSettingChange();
                    if (ret && typeof ret.then === 'function') return ret;
                } catch (_ePrev) {}
            }
            return Promise.resolve(true);
        };
        v.bloodSettingChange = function () {
            return this.settingChange();
        };

        v.__bloodEnterPromoPatched = true;
        v.enterPromo = function (rawCode) {
            var code = normalizePromoCode(rawCode != null ? rawCode : this.settingPromoForm);
            if (!code) {
                serverAPI.notifyError('Введите промокод.');
                return Promise.resolve(false);
            }
            if (!/^[a-z0-9]{3,15}$/.test(code)) {
                serverAPI.notifyError('Некорректный промокод (3–15 символов, a-z и 0-9).');
                return Promise.resolve(false);
            }
            try { trig('bloodMenuPromoEnter', code); } catch (_eP) {}
            return Promise.resolve(true);
        };

        if (!v.__bloodSendReportPatched) {
            v.__bloodSendReportPatched = true;
            // Не затираем flow-патч из playermenu-boot (FAQ + rpc)
            if (typeof v.sendReportMessage !== 'function') {
                v.sendReportMessage = function (text, faq) {
                    return bloodSendReportMessage(this, text, faq);
                };
            }
            if (typeof v.deleteReport !== 'function') {
                v.deleteReport = function () {
                    try { trig('report:ui:close'); } catch (_eDel) {}
                    __reportOpen = false;
                    return Promise.resolve(true);
                };
            }
            if (typeof v.bloodSendReport !== 'function') {
                v.bloodSendReport = function (forceSend) {
                    var faq = forceSend === false ? false : ((this.reportMessages || []).length === 0);
                    return this.sendReportMessage
                        ? this.sendReportMessage(this.reportMessageForm, faq)
                        : bloodSendReportMessage(this, this.reportMessageForm, faq);
                };
            }
            if (typeof v.bloodClearReportForm !== 'function') {
                v.bloodClearReportForm = function () {
                    bloodClearReportForm(this);
                };
            }
        }

        v.settingReticleSave = function () {
            if (typeof window.__flowReticleSaveNow === 'function') return window.__flowReticleSaveNow(this);
            return false;
        };
        v.flowReticleSave = function () {
            if (typeof window.__flowReticleSaveNow === 'function') return window.__flowReticleSaveNow(this);
            return false;
        };

        v.bloodOpenSettings = function () {
            try { this.binderSelectKey = -1; } catch (_e) {}
            this.currentSettingTab = 0;
            this.currentTab = 5;
        };
        v.bloodCloseMenu = function () { trig('playermenu:cef:esc'); };
        v.bloodOpenHelp = function () {
            try { trig('chat:forceCloseInput'); } catch (_eChat) {}
            bloodClearAllSettingsPanels(this);
            bloodResetSettingsSubTab(this);
            this.currentTab = 3;
            this.currentHelpTabIndex = 0;
            this.binderSelectKey = -1;
            setClientBinderCapture(false);
            try { trig('menuMainTabChange', '#help'); } catch (_e2) {}
        };
        v.bloodOpenReport = function () {
            this.currentTab = 7;
            bloodLoadReports(this);
        };

        v.buyDonateFunc = function (price, code) {
            var self = this;
            if (self.waitDonate) return Promise.resolve();
            code = String(code || '');
            price = Number(price) || 0;
            if (!code) return Promise.resolve();
            self.waitDonate = true;
            self.shopItemForBuy = null;
            var category = 'Shop';
            var item = code;
            var trigger = code;
            if (code === 'BUY_VIP1') {
                category = 'Privilege';
                item = 'BronzeVIP';
                trigger = '';
            } else if (code === 'BUY_VIP2') {
                category = 'Privilege';
                item = 'SilverVIP';
                trigger = '';
            } else if (code === 'BUY_VIP3') {
                category = 'Privilege';
                item = 'PlatinumVIP';
                trigger = '';
            }
            try {
                trig('bloodMenuDonateBuy', category, item, trigger);
            } catch (eBuy0) {}
            if (String(code).indexOf('BUY_VIP') === 0) {
                try { serverAPI.notifySuccess('Покупка VIP…'); } catch (eN) {}
            }
            [800, 1800, 3500].forEach(function (ms) {
                setTimeout(function () { try { trig('menuAccountProfileRequest'); } catch (e) {} }, ms);
            });
            self.waitDonate = false;
            return Promise.resolve(true);
        };
        v.bloodSelectVoiceReloadBind = function () {
            /* В интерфейсе это кнопка перезапуска войса, не выбор бинда */
            try { trig('client_voice_reload'); } catch (_e) {}
        };
        v.settingReloadVoice = function () {
            try { trig('client_voice_reload'); } catch (_e) {}
        };
        v.bloodGetVoiceReloadKeyName = function () {
            var label = 'F8';
            for (var i = 0; i < (this.binderData || []).length; i++) {
                var row = this.binderData[i];
                if (row && row.action === 'VOICE_CHAT_RELOAD') {
                    label = row.keyName || label;
                    break;
                }
            }
            if (label === '\u2014' || label === 'Нажмите') label = 'F8';
            return '\u041f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c [' + label + ']';
        };
        v.flowGetVoiceReloadKeyName = v.bloodGetVoiceReloadKeyName;
        v.bloodSelectBinder = function (idx) {
            window.bloodSelectBinder(idx);
        };
        v.bloodSettingSubTab = function (tab) {
            window.bloodSettingSubTab(tab);
        };
        v.bloodOpenReticleSetting = function () {
            window.bloodSettingSubTab(4);
        };
        v.bloodGetDonatePointDisplay = function () {
            window.bloodSyncDonatePoints();
            var dp = (this.playerData && this.playerData.donatePoint) || 0;
            return bloodFormatDp(dp);
        };
        ensureDonateRouletteReady(v);
        v.bloodLevelExpNeed = function () {
            var pd = this.playerData || {};
            return bloodLevelExpNeed(pd.level, pd.expMax);
        };
        v.bloodLevelExpBarWidth = function () {
            var pd = this.playerData || {};
            var lvl = Number(pd.level) || 1;
            if (lvl >= BLOOD_LEVEL_MAX) return 100;
            var need = bloodLevelExpNeed(pd.level, pd.expMax);
            if (!need) return 0;
            return Math.min(100, (Number(pd.exp) || 0) / need * 100);
        };
        v.bloodLevelExpLabel = function () {
            var pd = this.playerData || {};
            var lvl = Number(pd.level) || 1;
            if (lvl >= BLOOD_LEVEL_MAX) return 'MAX';
            var need = bloodLevelExpNeed(pd.level, pd.expMax);
            var cur = Math.max(0, Number(pd.exp) || 0);
            if (need > 0 && cur > need) cur = need;
            return cur + ' из ' + need + ' EXP';
        };
        v.bloodPaydayLabel = function () {
            void this.paydayTick;
            var mins = bloodPaydayMinutesLeft();
            return 'PAYDAY ЧЕРЕЗ ' + mins + ' ' + bloodPaydayMinutesWord(mins);
        };
        if (v.paydayTick == null) {
            try {
                if (v.$set) v.$set(v, 'paydayTick', Date.now());
                else v.paydayTick = Date.now();
            } catch (_eTick0) {
                v.paydayTick = Date.now();
            }
        }
        if (!v.__paydayTickIv) {
            v.__paydayTickIv = setInterval(function () {
                try {
                    if (v.$set) v.$set(v, 'paydayTick', Date.now());
                    else v.paydayTick = Date.now();
                } catch (_eTick) {}
            }, 5000);
        }
        v.bloodVipGradientId = function () {
            var pd = this.playerData || {};
            if (!pd.hasVIP) return 'vipColorGradient1';
            var lvl = Number(pd.vipLevel) || 0;
            if (lvl === 2) return 'vipColorGradient2';
            if (lvl >= 3) return 'vipColorGradient3';
            return 'vipColorGradient1';
        };
        v.bloodVipTitle = function () {
            var pd = this.playerData || {};
            if (!pd.hasVIP) return 'Нет VIP';
            return bloodVipNameFromTier(pd.vipLevel, pd.vipName);
        };
        v.bloodVipSubtitle = function () {
            var pd = this.playerData || {};
            if (!pd.hasVIP) return '';
            var prof = window.__lastMenuAccountProfile || {};
            var tier = Number(pd.vipLevel) || bloodExtractVipTier(prof) || 0;
            var t = bloodResolveVipTimeText(prof, tier);
            if (!t) {
                var ptt = String(pd.vipTime || '').trim();
                if (ptt && ptt.toLowerCase() !== 'истёк' && ptt.indexOf('около часа') < 0) t = ptt;
            }
            if (!t && prof.vipTimeText) t = bloodNormalizeVipTimeText(prof.vipTimeText);
            if (!t && prof.vip && prof.vip.untilMs > 0) {
                t = formatVipTimeLeft(prof.vip.untilMs, tier);
            }
            if (!t && prof.vipdate) {
                t = formatVipTimeLeft(prof.vipdate, tier);
            }
            if (!t || t.toLowerCase() === 'истёк') return '';
            if (/^действует\b/i.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
            return 'Действует ' + t;
        };
        if (!v.__bloodVueLoadPatched && typeof v.load === 'function') {
            v.__bloodVueLoadPatched = true;
            var origVueLoad = v.load;
            v.load = function (data) {
                if (data && typeof data === 'object') {
                    try {
                        if (Array.isArray(data.skills)) {
                            data.skills = bloodNormalizeSkillsArray(data.skills);
                        }
                        var lvl = Number(data.level) || 1;
                        if (!(Number(data.expMax) > 0)) {
                            data.expMax = bloodLevelExpNeedFallback(lvl);
                        }
                    } catch (_eNorm) {}
                }
                var ret = origVueLoad.apply(this, arguments);
                var prof = window.__lastMenuAccountProfile;
                if (prof && typeof prof === 'object') bloodPatchVipFromProfile(prof);
                else if (data && typeof data === 'object') bloodPatchVipFromProfile(data);
                if (data && Array.isArray(data.skills) && data.skills[1]) {
                    try {
                        bloodPatchPlayerSkills(data.skills[1][0], data.skills[1][1], data.skills[1][2], data.skills[1][3]);
                    } catch (_eSk) {}
                }
                return ret;
            };
            if (v.$options && v.$options.methods) v.$options.methods.load = v.load;
        }
        v.bloodHasEstate = function () {
            var pd = this.playerData || {};
            return !!(pd.vehList && pd.vehList.length);
        };
        if (!Array.isArray(v.binderData) || !v.binderData.length) {
            var seed = buildBinderData();
            if (v.$set) v.$set(v, 'binderData', seed);
            else v.binderData = seed;
        }
        bloodSyncBinderGroups(v);
        if (!v.__bloodShootingSkillPatched) {
            v.__bloodShootingSkillPatched = true;
            Object.defineProperty(v, 'bloodShootingSkill', {
                configurable: true,
                get: function () {
                    var arr = this.playerData && this.playerData.skills;
                    if (!arr || !arr.length) return defaultShootingSkillTuple();
                    var s = arr[1];
                    if ((!s || s.length < 4) && arr[0] && arr[0].length >= 4) s = arr[0];
                    return (s && s.length >= 4) ? s : defaultShootingSkillTuple();
                }
            });
        }
        if (!v.__bloodPortSkillPatched) {
            v.__bloodPortSkillPatched = true;
            Object.defineProperty(v, 'bloodPortSkill', {
                configurable: true,
                get: function () {
                    var arr = this.playerData && this.playerData.skills;
                    var s = arr && arr[2];
                    return (s && s.length >= 4) ? s : [1, 0, 100, 10];
                }
            });
        }
        if (!v.__bloodConstructionSkillPatched) {
            v.__bloodConstructionSkillPatched = true;
            Object.defineProperty(v, 'bloodConstructionSkill', {
                configurable: true,
                get: function () {
                    var arr = this.playerData && this.playerData.skills;
                    var s = arr && arr[3];
                    return (s && s.length >= 4) ? s : [1, 0, 100, 10];
                }
            });
        }
        if (v.reportMessages == null) {
            if (v.$set) v.$set(v, 'reportMessages', []);
            else v.reportMessages = [];
        }
        if (v.reportMessageForm == null) {
            if (v.$set) v.$set(v, 'reportMessageForm', '');
            else v.reportMessageForm = '';
        }
        if (v.reportFindAns == null) {
            if (v.$set) v.$set(v, 'reportFindAns', []);
            else v.reportFindAns = [];
        }
        if (!v.__bloodReportCanSendPatched) {
            v.__bloodReportCanSendPatched = true;
            Object.defineProperty(v, 'bloodReportCanSend', {
                configurable: true,
                get: function () {
                    return String(this.reportMessageForm || '').trim().length > 2;
                }
            });
        }
        Object.defineProperty(v, 'bloodVoiceReloadBindActive', {
            get: function () {
                if (this.binderSelectKey < 0) return false;
                var row = this.binderData && this.binderData[this.binderSelectKey];
                return !!(row && row.action === 'VOICE_CHAT_RELOAD');
            }
        });
    }

    function hookMenuLoad() {
        var m = menuMgr();
        if (!m || m.__bloodLoadHook) return;
        m.__bloodLoadHook = true;
        var orig = m.load;
        if (typeof orig !== 'function') return;
        m.load = function (data) {
            var preserve = {};
            if (data && typeof data === 'object') {
                if (data.exp != null) preserve.exp = Number(data.exp) || 0;
                if (data.expMax != null) preserve.expMax = Number(data.expMax);
                if (data.level != null) preserve.level = Number(data.level) || 1;
                if (Array.isArray(data.vehList) && data.vehList.length) preserve.vehList = data.vehList.slice();
                if (data.mansion) preserve.mansion = data.mansion;
            }
            var prof = window.__lastMenuAccountProfile;
            if (prof && typeof prof === 'object') {
                if ((!preserve.vehList || !preserve.vehList.length) && Array.isArray(prof.vehList) && prof.vehList.length) {
                    preserve.vehList = prof.vehList.slice();
                }
                if (!preserve.mansion && prof.mansion) preserve.mansion = prof.mansion;
            }
            var ret = orig.apply(this, arguments);
            if (Object.keys(preserve).length) patchPlayerData(preserve);
            if (data && typeof data === 'object' && data.skills) {
                patchPlayerData({ skills: data.skills });
            }
            var sl = data && data.skill_level;
            var sp = data && data.skill_points;
            if (data && data.skills && data.skills[1]) {
                if (sl == null) sl = data.skills[1][0];
                if (sp == null) sp = data.skills[1][1];
            }
            bloodPatchPlayerSkills(
                sl,
                sp,
                bloodSkillPointsNeed(sl, (data && data.skill_per_level != null) ? data.skill_per_level : (prof && prof.skill_per_level)),
                (data && data.skill_max_level != null) ? data.skill_max_level : BLOOD_SKILL_MAX_LEVEL
            );
            bloodPatchVipFromProfile(window.__lastMenuAccountProfile || data);
            bloodPatchEstateFromProfile(window.__lastMenuAccountProfile || data);
            var vLoaded = vue();
            if (vLoaded) {
                patchVueMethods(vLoaded);
                installBinderKeyCapture(vLoaded);
                ensureDonateRouletteReady(vLoaded);
            }
            return ret;
        };
    }

    function hookOpenTab() {
        var m = menuMgr();
        if (!m || !m.vue || m.vue.__bloodTabHook) return;
        m.vue.__bloodTabHook = true;
        patchVueMethods(m.vue);
        var orig = m.vue.openTab;
        m.vue.openTab = function (tab) {
            var self = this;
            try { trig('chat:forceCloseInput'); } catch (_eChat) {}
            tab = parseInt(tab, 10);
            if (tab === 2) {
                return self.openTab(0);
            }
            if (tab === 3) {
                bloodClearAllSettingsPanels(self);
                self.currentTab = 3;
                self.currentHelpTabIndex = 0;
                self.binderSelectKey = -1;
                setClientBinderCapture(false);
                try { trig('menuMainTabChange', '#help'); } catch (_eHelp) {}
                return;
            }
            if (tab === 5) {
                self.currentSettingTab = 0;
                self.currentTab = 5;
                self.binderSelectKey = -1;
                try { setClientBinderCapture(false); } catch (_eCap) {}
                try { bloodLoadSettings(self); } catch (_eLoad) {}
                try { postOpenTabHook(self, 5); } catch (_ePost) {}
                return;
            }
            if (tab === 7) {
                bloodClearAllSettingsPanels(self);
                self.currentTab = 7;
                bloodLoadReports(self);
                postOpenTabHook(self, 7);
                return;
            }
            if (self.currentTab === tab) self.currentTab = -1;
            var ret;
            try {
                ret = orig.apply(self, arguments);
            } catch (e) {
                self.currentTab = tab;
                postOpenTabHook(self, tab);
                return undefined;
            }
            if (ret && typeof ret.then === 'function') {
                ret.then(function () {
                    self.currentTab = tab;
                    postOpenTabHook(self, tab);
                }).catch(function () {
                    self.currentTab = tab;
                    postOpenTabHook(self, tab);
                });
            } else {
                self.currentTab = tab;
                postOpenTabHook(self, tab);
            }
            return ret;
        };
    }

    window.bloodOpenSettings = function () {
        var v = vue();
        if (!v) return;
        try { v.binderSelectKey = -1; } catch (_e) {}
        v.currentSettingTab = 0;
        v.currentTab = 5;
        try { trig('chat:forceCloseInput'); } catch (_eChat) {}
        try { setClientBinderCapture(false); } catch (_eCap) {}
        try { bloodLoadSettings(v); } catch (_eLoad) {}
        try { trig('menuMainTabChange', '#settings'); } catch (e) {}
    };

    function bootBloodCompat() {
        stubRpc();
        stubServerAPI();
        var m = menuMgr();
        if (!m || !m.vue) return false;
        ensureBinderHelpers();
        hookMenuLoad();
        hookOpenTab();
        patchVueMethods(m.vue);
        installBinderKeyCapture(m.vue);
        ensureDonateRouletteReady(m.vue);
        return true;
    }

    bootBloodCompat();
    var tries = 0;
    var bootIv = setInterval(function () {
        tries++;
        if (bootBloodCompat() || tries > 120) clearInterval(bootIv);
    }, 100);
})();
