/* Blood ↔ 5RP family MenuManager — thin bridge, original UI untouched */
(function () {
    var BLOOD_TO_5RP = [
        { blood: 'canInvite', code: 'INV' },
        { blood: 'canKick', code: 'UNINV' },
        { blood: 'withdrawMoney', code: 'BANK' },
        { blood: 'familyWarehouse', code: 'STORAGE_O', aliases: ['warehouseAccess'] },
        { blood: 'familyWarehouseClosed', code: 'STORAGE_C' },
        { blood: 'familyWarehouseToggle', code: 'STORAGE_T' },
        { blood: 'changeRank', code: 'CHANGE_GROUP' },
        { blood: 'captParticipate', code: 'CAPT', aliases: ['bizwar', 'TAKE_CONTRACT'] },
        { blood: 'canLogs', code: 'LOGS' }
    ];

    /** Рабочие права Blood для настройки рангов семьи. */
    var BLOOD_PERMISSIONS = [
        ['INV', 'Приглашение', 'Можно приглашать игроков в семью', false],
        ['UNINV', 'Увольнение', 'Можно исключать участников из семьи', false],
        ['BANK', 'Финансы', 'Можно снимать деньги с баланса семьи', false],
        ['STORAGE_O', 'Склад (открытый)', 'Доступ к складу, когда он открыт', false],
        ['STORAGE_C', 'Склад (закрытый)', 'Доступ к складу, даже когда он закрыт', false],
        ['STORAGE_T', 'Управление складом', 'Можно открывать и закрывать склад', false],
        ['CHANGE_GROUP', 'Смена рангов', 'Можно менять ранги другим участникам', false],
        ['CAPT', 'Войны семей', 'Можно участвовать и начинать капты', false],
        ['LOGS', 'Логи', 'Можно смотреть логи семьи', false]
    ];

    var _biz = { zoneId: 0, isJoin: false, count: 3, selectedCalibers: [], allowArmor: false, allowSpunk: true, allowAlco: true };
    var _bloodState = { membersRaw: [], ranks: [], fleet: [], fleetPlate: 'FAMILY', familyName: '', playerRank: 1, playerStatic: null, isLeader: false };
    var _apiPatched = false;
    var _logsStore = [];
    var _ratingStore = [];
    var _zonesStore = {};
    var _zoneBattle = {};

    function trigger() {
        try {
            if (typeof mp !== 'undefined' && mp.trigger) {
                mp.trigger.apply(mp, arguments);
            }
        } catch (_e) {}
    }

    function notify(msg, isError) {
        try {
            if (typeof serverAPI !== 'undefined') {
                if (isError && serverAPI.notifyError) return serverAPI.notifyError(String(msg || ''));
                if (!isError && serverAPI.notifySuccess) return serverAPI.notifySuccess(String(msg || ''));
            }
        } catch (_e) {}
        try { console.log('[FamApp]', isError ? 'ERR' : 'OK', msg); } catch (_e2) {}
    }

    function unsupported(action) {
        try { console.log('[FamApp] unsupported 5RP action:', action); } catch (_e) {}
        notify('Недоступно на этом сервере', true);
    }

    function getVue() {
        try {
            if (typeof playerFamilyMainMenu !== 'undefined' && playerFamilyMainMenu) {
                return playerFamilyMainMenu.vue || null;
            }
        } catch (_e) {}
        return null;
    }

    function rankHasFlag(r, key) {
        if (!r) return false;
        if (r[key]) return true;
        for (var i = 0; i < BLOOD_TO_5RP.length; i++) {
            var m = BLOOD_TO_5RP[i];
            if (m.blood !== key) continue;
            if (m.aliases) {
                for (var j = 0; j < m.aliases.length; j++) {
                    if (r[m.aliases[j]]) return true;
                }
            }
        }
        return false;
    }

    function bloodFlagsToPerms(rankRow) {
        var perms = [];
        var seen = {};
        BLOOD_TO_5RP.forEach(function (m) {
            var on = !!rankRow[m.blood];
            if (!on && m.aliases) {
                for (var i = 0; i < m.aliases.length; i++) {
                    if (rankRow[m.aliases[i]]) { on = true; break; }
                }
            }
            if (on && !seen[m.code]) {
                seen[m.code] = true;
                perms.push(m.code);
            }
        });
        return perms;
    }

    function permsToBloodFlags(perms) {
        var set = {};
        (perms || []).forEach(function (c) { set[c] = true; });
        var captOn = !!(set.CAPT || set.TAKE_CONTRACT);
        return {
            canInvite: !!set.INV,
            canKick: !!set.UNINV,
            withdrawMoney: !!set.BANK,
            familyWarehouse: !!(set.STORAGE_O || set.STORAGE),
            warehouseAccess: !!(set.STORAGE_O || set.STORAGE),
            familyWarehouseClosed: !!set.STORAGE_C,
            familyWarehouseToggle: !!(set.STORAGE_T || set.O_STORAGE_H),
            fleetEvac: !!set.CARRESPAWN,
            fleetSummon: !!set.CARRESPAWN,
            changeRank: !!set.CHANGE_GROUP,
            captParticipate: captOn,
            bizwar: captOn,
            canLogs: !!set.LOGS
        };
    }

    function patchPermissionsList(v) {
        if (!v) return;
        v.PERMISSION = BLOOD_PERMISSIONS.map(function (row) {
            return [row[0], row[1], row[2], !!row[3]];
        });
    }

    function mapRanksToGroups(ranks) {
        var groups = [];
        for (var i = 1; i <= 9; i++) {
            var r = (ranks || []).find(function (x) { return parseInt(x.rank, 10) === i; }) || {};
            var name = String(r.name || ('Ранг ' + i));
            groups.push([i, name, i, Number(r.salary) || 0, bloodFlagsToPerms(r)]);
        }
        return groups;
    }

    function groupsToBloodRanks(groups) {
        var ranks = [];
        for (var i = 1; i <= 9; i++) {
            var g = (groups || []).find(function (x) {
                return (x && (x.id === i || x.rank === i || (Array.isArray(x) && x[0] === i)));
            });
            var name, perms;
            if (Array.isArray(g)) {
                name = g[1];
                perms = g[4] || [];
            } else if (g) {
                name = g.name;
                perms = g.permissions || [];
            } else {
                name = 'Ранг ' + i;
                perms = [];
            }
            var flags = permsToBloodFlags(perms);
            ranks.push(Object.assign({
                rank: i,
                name: String(name || ('Ранг ' + i))
            }, flags));
        }
        return ranks;
    }

    function mapBloodMembers(members) {
        return (members || []).map(function (m) {
            var rank = Number(m.rank) || 0;
            var groupIds = [];
            if (Array.isArray(m.rankIds)) {
                groupIds = m.rankIds
                    .map(function (x) { return Number(x) || 0; })
                    .filter(function (n) { return n >= 1 && n <= 9; });
            } else if (Array.isArray(m.ranks)) {
                groupIds = m.ranks
                    .map(function (x) { return Number(x) || 0; })
                    .filter(function (n) { return n >= 1 && n <= 9; });
            } else if (rank >= 1 && rank <= 9) {
                groupIds = [rank];
            } else if (rank === 10) {
                groupIds = [];
            }
            // unique, max 4 (для лидера — только доп., до 3)
            var seen = {};
            var maxIds = rank === 10 ? 3 : 4;
            groupIds = groupIds.filter(function (n) {
                if (seen[n]) return false;
                seen[n] = true;
                return true;
            }).slice(0, maxIds);

            var lastEnter = parseInt(m.lastLogin != null ? m.lastLogin : (m.lastEnter != null ? m.lastEnter : 0), 10) || 0;
            if (lastEnter <= 0 && (m.online || m.isOnline)) lastEnter = Math.floor(Date.now() / 1000);
            var id = m.static != null ? Number(m.static) : (m.id != null ? Number(m.id) : 0);
            // [static, name, lastEnter, groupIds, online, mainRank]
            return [
                id,
                String(m.name || 'Unknown'),
                lastEnter,
                groupIds,
                !!(m.online || m.isOnline),
                rank
            ];
        });
    }

    function buildVueMembersFromMapped(mapped, groups) {
        var pad = function (a) { return 10 > a ? '0' + a : '' + a; };
        return (mapped || []).map(function (a) {
            var ids = (a[3] || []).map(function (n) { return Number(n); });
            var c = (groups || []).filter(function (b) {
                return ids.indexOf(Number(b.id)) !== -1 || ids.indexOf(Number(b.rank)) !== -1;
            });
            var mainRank = Number(a[5]) || 0;
            var d = new Date(1e3 * (Number(a[2]) || 0));
            var groupNames = c.map(function (x) { return x.name; });
            if (mainRank === 10) {
                groupNames = ['Лидер'].concat(groupNames);
            }
            var maxRank = mainRank === 10
                ? 10
                : (c.length ? Math.max.apply(null, c.map(function (x) { return Number(x.rank) || 0; })) : (mainRank || 0));
            if (!Number.isFinite(maxRank) || maxRank < 0) maxRank = mainRank || 0;
            return {
                id: a[0],
                name: String(a[1]).replace(/_/g, ' '),
                lastEnterTime: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + (d.getFullYear() - 2000) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
                groups: groupNames,
                online: !!a[4],
                maxRank: maxRank,
                mainRank: mainRank
            };
        }).sort(function (c, a) { return a.maxRank - c.maxRank; });
    }

    function formatMemberGroupsLabel(names) {
        var s = (names || []).join(', ');
        if (s.length > 14) return s.slice(0, 14) + '...';
        return s;
    }

    function patchFamilySettingsUi(v) {
        if (!v || v._famSettingsPatched) return;
        v._famSettingsPatched = true;
        v.selectNewName = function () {
            this.renameInput = String(this.familyName || '');
            this.menuType = 5;
        };
        v.selectFamilyPrefix = function () {
            try {
                if (typeof serverAPI !== 'undefined' && serverAPI.notifyError) {
                    serverAPI.notifyError('Префикс отключён');
                }
            } catch (_e) {}
        };
        v.buyMemberLimit = function () {
            trigger('fam:expand');
        };
        v.deleteFamily = function () {
            this.menuType = 6;
        };
        var allowedPerm = {};
        BLOOD_PERMISSIONS.forEach(function (p) { allowedPerm[p[0]] = true; });
        var origStartEdit = v.startEditGroup;
        v.startEditGroup = function (g) {
            if (typeof origStartEdit === 'function') origStartEdit.call(this, g);
            else {
                this.menuType = 1;
                this.formGroupEdit.group = g;
                this.formGroupEdit.name = g.name;
                this.formGroupEdit.rank = g.rank;
                this.formGroupEdit.salary = g.salary;
            }
            var raw = (g && Array.isArray(g.permissions) ? g.permissions : []).slice();
            var norm = [];
            var seen = {};
            raw.forEach(function (code) {
                var c = code === 'TAKE_CONTRACT' ? 'CAPT' : code;
                if (c === 'STORAGE') c = 'STORAGE_O';
                if (c === 'O_STORAGE_H') c = 'STORAGE_T';
                if (!allowedPerm[c] || seen[c]) return;
                seen[c] = true;
                norm.push(c);
            });
            this.formGroupEdit.permissions = norm;
        };
    }

    function patchMemberGroupUi(v) {
        if (!v || v._famMultiRankPatched) return;
        v._famMultiRankPatched = true;
        v.formatMemberGroups = formatMemberGroupsLabel;
        var origStart = v.startEditMember;
        v.startEditMember = function (m) {
            if (m && _bloodState.playerStatic != null && String(m.id) === String(_bloodState.playerStatic)) {
                try {
                    if (typeof serverAPI !== 'undefined' && serverAPI.notifyError) {
                        serverAPI.notifyError('Вы не можете изменять ранг самому себе.');
                    }
                } catch (_e) {}
                return;
            }
            if (typeof origStart === 'function') origStart.call(this, m);
            else {
                this.menuType = 2;
                this.formMemberEdit.member = m;
            }
            // Сопоставляем по id ранга из raw, а не только по имени (имена могут совпадать)
            var raw = findMemberRawById(m && m.id);
            var ids = [];
            if (raw && Array.isArray(raw.rankIds)) {
                ids = raw.rankIds.map(function (x) { return Number(x) || 0; }).filter(function (n) { return n >= 1 && n <= 9; });
            } else if (m && Array.isArray(m.groups)) {
                // fallback: по именам, без «Лидер»
                var names = m.groups.filter(function (n) { return n !== 'Лидер'; });
                ids = (this.groups || []).filter(function (g) {
                    return names.indexOf(g.name) !== -1;
                }).map(function (g) { return Number(g.id) || Number(g.rank) || 0; });
            }
            var seen = {};
            ids = ids.filter(function (n) {
                if (!n || seen[n]) return false;
                seen[n] = true;
                return true;
            });
            this.formMemberEdit.groups = (this.groups || []).filter(function (g) {
                var gid = Number(g.id) || Number(g.rank) || 0;
                return ids.indexOf(gid) !== -1;
            });
        };
        var origToggle = v.editMemberGroupToggle;
        v.editMemberGroupToggle = function (g) {
            var list = this.formMemberEdit && this.formMemberEdit.groups;
            if (!Array.isArray(list)) {
                if (typeof origToggle === 'function') return origToggle.call(this, g);
                return;
            }
            var mem = this.formMemberEdit && this.formMemberEdit.member;
            var raw = mem ? findMemberRawById(mem.id) : null;
            var isLeaderTarget = raw && Number(raw.rank) === 10;
            var isSelfLeader = !!(this.isOwner && _bloodState.playerStatic != null && mem &&
                String(mem.id) === String(_bloodState.playerStatic));
            var maxGroups = (isLeaderTarget || isSelfLeader) ? 3 : 4;
            var idx = list.indexOf(g);
            if (idx === -1) {
                if (list.length >= maxGroups) {
                    try {
                        if (typeof serverAPI !== 'undefined' && serverAPI.notifyError) {
                            serverAPI.notifyError('Можно выдать максимум ' + maxGroups + ' ранга');
                        }
                    } catch (_e) {}
                    return;
                }
                list.push(g);
            } else {
                list.splice(idx, 1);
            }
        };
    }

    function parseFleetRankIds(raw) {
        try {
            var arr = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
            if (!Array.isArray(arr)) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            return arr.map(function (n) { return Number(n) || 0; }).filter(function (n) { return n >= 1 && n <= 10; });
        } catch (_e) {
            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        }
    }

    function mapFleetToVehicles(fleet) {
        var plate = String(_bloodState.fleetPlate || 'FAMILY');
        return (fleet || []).map(function (v, idx) {
            var slot = v.slot != null ? v.slot : idx;
            var driveIds = parseFleetRankIds(v.driveRanks != null ? v.driveRanks : v.drive_ranks);
            return {
                id: slot,
                model: String(v.displayName || v.name || v.model || ('Слот ' + slot)),
                modelKey: String(v.model || ''),
                numberPlate: String(v.numberPlate || v.plate || plate),
                price: v.price != null && v.price !== '' ? v.price : 0,
                pos: v.pos && typeof v.pos === 'object' ? v.pos : { x: 0, y: 0 },
                _slot: slot,
                driveRankIds: driveIds,
                evacAllowed: v.evacAllowed !== false,
                summonAllowed: v.summonAllowed !== false
            };
        });
    }

    function patchVehicleFleetUi(v) {
        if (!v || v._famFleetUiPatched) return;
        v._famFleetUiPatched = true;
        v.findVeh = function (veh) {
            var slot = veh && (veh._slot != null ? veh._slot : veh.id);
            trigger('fam:fleet:summon', slot);
        };
        v.respawnVehicle = function (veh) {
            var slot = veh && (veh._slot != null ? veh._slot : veh.id);
            trigger('fam:fleet:evac', slot);
            return Promise.resolve(null);
        };
        var origStart = v.startChangeVehicle;
        v.startChangeVehicle = function (veh) {
            if (typeof origStart === 'function') origStart.call(this, veh);
            else {
                this.formVehicleEdit.vehicle = veh;
                this.formVehicleEdit.groups = [];
                this.menuType = 3;
            }
            var ids = (veh && Array.isArray(veh.driveRankIds)) ? veh.driveRankIds.slice() : [];
            this.formVehicleEdit.groups = (this.groups || []).filter(function (g) {
                return ids.indexOf(Number(g.id)) !== -1 || ids.indexOf(Number(g.rank)) !== -1;
            });
        };
    }

    function mapBloodToLoad(payload) {
        payload = payload || {};
        var ranks = Array.isArray(payload.ranks) ? payload.ranks : [];
        var members = Array.isArray(payload.members) ? payload.members : [];
        var stats = payload.stats || {};
        var isLeader = !!(payload.isLeader || Number(payload.playerRank) === 10);
        var canInvite = !!(payload.canInvite || isLeader);
        var canKick = !!(payload.canKickMember || isLeader);
        var canViewLogs = !!(payload.canLogs || isLeader);
        var canWithdrawMoney = !!(payload.canWithdrawMoney || isLeader);
        var warehouseOpen = payload.warehouseOpen !== false && payload.warehouseOpen !== 0;
        var house = {
            warehouse: warehouseOpen,
            closed: payload.mansionDoorOpen === false || payload.mansionDoorOpen === 0
        };
        var vehicles = [];
        if (Array.isArray(payload.fleet)) vehicles = mapFleetToVehicles(payload.fleet);
        else if (Array.isArray(payload.vehicles)) vehicles = payload.vehicles;

        return {
            id: Number(payload.familyId) || Number(payload.id) || 0,
            familyName: String(payload.familyName || 'Семья'),
            familyTypeName: '',
            myName: String(payload.myName || payload.playerName || payload.login || ''),
            bank: Number(stats.balance) || 0,
            reputation: Number(stats.ratingPoints) || 0,
            office: null,
            house: house,
            vehicles: vehicles,
            canInvite: canInvite,
            canUninvite: canKick,
            canViewLogs: canViewLogs,
            canWithdrawMoney: canWithdrawMoney,
            bankSum: '',
            logsList: [],
            logsSearch: '',
            isOwner: isLeader,
            groups: mapRanksToGroups(ranks),
            membersCount: members.length,
            membersMaxCount: Number(payload.membersMaxCount) || 20,
            nameChanges: Number(payload.nameChanges) || 0,
            renameCost: payload.renameCost == null ? 0 : Number(payload.renameCost),
            renameLeft: payload.renameLeft != null ? Number(payload.renameLeft) : Math.max(0, 3 - (Number(payload.nameChanges) || 0)),
            expandNext: payload.expandNext || null,
            renameInput: String(payload.familyName || ''),
            members: mapBloodMembers(members)
        };
    }

    function setVisible(on) {
        var f = document.getElementById('playerFamily_mainMenu');
        var b = document.getElementById('familyBackdrop');
        if (f) {
            if (on) {
                f.classList.add('blood-open');
                f.style.setProperty('display', 'block', 'important');
                f.style.setProperty('opacity', '1', 'important');
                f.style.setProperty('visibility', 'visible', 'important');
                f.style.setProperty('pointer-events', 'auto', 'important');
                f.style.setProperty('z-index', '10050', 'important');
            } else {
                f.classList.remove('blood-open');
                f.style.removeProperty('display');
                f.style.removeProperty('opacity');
                f.style.removeProperty('visibility');
                f.style.removeProperty('pointer-events');
            }
        }
        if (b) {
            b.classList.remove('blood-open');
            b.classList.remove('open');
            b.style.setProperty('display', 'none', 'important');
            b.style.setProperty('opacity', '0', 'important');
            b.style.setProperty('visibility', 'hidden', 'important');
            b.style.setProperty('pointer-events', 'none', 'important');
            b.style.setProperty('background', 'transparent', 'important');
        }
    }

    function closeMenu(silent) {
        try {
            var v = getVue();
            if (v) v.loaded = false;
        } catch (_e) {}
        setVisible(false);
        if (!silent) trigger('fam:close');
    }

    function findMemberRawById(id) {
        var raw = _bloodState.membersRaw || [];
        for (var i = 0; i < raw.length; i++) {
            if (String(raw[i].static) === String(id) || String(raw[i].id) === String(id)) return raw[i];
        }
        return null;
    }

    function saveAllRanksFromVue() {
        var v = getVue();
        if (!v) return;
        var ranks = groupsToBloodRanks(v.groups || []);
        _bloodState.ranks = ranks;
        trigger('fam:rankconfig:save', JSON.stringify(ranks));
    }

    function handleFamilyRpc(name, data) {
        var v = getVue();

        if (name === 'server_playerFamily_inviteMember') {
            var sid = String(data == null ? '' : data).trim().replace(/[^\d]/g, '');
            if (!sid || parseInt(sid, 10) < 1) {
                throw 'Введите статик.';
            }
            trigger('fam:invite', sid);
            return null;
        }
        if (name === 'server_playerFamily_unInviteMember') {
            var mid = data;
            var found = findMemberRawById(mid);
            var staticId = found && found.static != null ? found.static : mid;
            trigger('fam:kick', staticId);
            return null;
        }
        if (name === 'server_playerFamily_leave') {
            trigger('fam:leave');
            return null;
        }
        if (name === 'server_playerFamily_editMemberGroups') {
            var memberId = data && data[0];
            var groupIds = (data && data[1]) || [];
            var ids = [];
            var seen = {};
            (groupIds || []).forEach(function (x) {
                var n = Number(x);
                if (!Number.isFinite(n) && x && typeof x === 'object') {
                    n = Number(x.id != null ? x.id : x.rank);
                }
                n = parseInt(n, 10);
                if (!Number.isFinite(n) || n < 1 || n > 9 || seen[n]) return;
                seen[n] = true;
                ids.push(n);
            });
            ids.sort(function (a, b) { return b - a; });

            var mem = findMemberRawById(memberId);
            var st = mem && mem.static != null ? Number(mem.static) : Number(memberId);
            var selfStatic = _bloodState && _bloodState.playerStatic != null ? Number(_bloodState.playerStatic) : null;
            var isSelf = selfStatic != null && Number.isFinite(st) && st === selfStatic;
            var isLeader = !!(v && (v.isOwner || Number(_bloodState.playerRank) === 10));
            var targetIsLeader = !!(mem && Number(mem.rank) === 10);

            var targetRank;
            var extras;
            if (isSelf) {
                throw 'Вы не можете изменять ранг самому себе.';
            }
            if (targetIsLeader) {
                throw 'Нельзя изменить ранг лидера.';
            }
            if (!ids.length) {
                throw 'Выберите хотя бы один ранг.';
            }
            if (ids.length > 4) ids = ids.slice(0, 4);
            var actorRank = Number(_bloodState.playerRank) || 0;
            if (!isLeader) {
                if (mem && Number(mem.rank) >= actorRank) {
                    throw 'Нельзя изменять ранг игрока вашего ранга или выше.';
                }
                ids = ids.filter(function (n) { return n < actorRank; });
                if (!ids.length) {
                    throw 'Можно назначать только ранги ниже своего.';
                }
            }
            targetRank = ids[0];
            extras = ids.filter(function (n) { return n !== targetRank; }).slice(0, 3);
            trigger('fam:rank:set', st, targetRank, 'Смена группы', JSON.stringify(extras));
            return null;
        }
        if (name === 'server_playerFamily_editGroup') {
            // [id, name, rank, salary, permissions]
            if (v && Array.isArray(data) && data[0] != null) {
                var gid = data[0];
                var g = (v.groups || []).find(function (x) { return x.id === gid; });
                if (g) {
                    g.name = data[1];
                    g.rank = data[2];
                    g.salary = data[3];
                    g.permissions = (data[4] || []).slice();
                }
            }
            saveAllRanksFromVue();
            return null;
        }
        if (name === 'server_playerFamily_createNewGroup') {
            unsupported('createNewGroup');
            throw 'Создание групп недоступно (фиксированные ранги 1–9)';
        }
        if (name === 'server_playerFamily_deleteGroup') {
            unsupported('deleteGroup');
            throw 'Удаление групп недоступно (фиксированные ранги 1–9)';
        }
        if (name === 'server_playerFamily_house_toggleWarehouse' || name === 'server_playerFamily_office_toggleWarehouse') {
            var open = !!data;
            if (v && v.house) v.house.warehouse = open;
            trigger('fam:warehouse:toggle', open ? 1 : 0);
            return null;
        }
        if (name === 'server_playerFamily_vehicleRespawn') {
            var vid = data;
            trigger('fam:fleet:summon', vid);
            return null;
        }
        if (name === 'server_playerFamily_changeVehicleSpawn') {
            unsupported('changeVehicleSpawn');
            throw 'Смена спавна недоступна';
        }
        if (name === 'server_playerFamily_vehicleSell') {
            unsupported('vehicleSell');
            throw 'Продажа транспорта недоступна';
        }
        if (name === 'server_playerFamily_changeData') {
            var payload = data || {};
            var slotId = payload.id;
            var groupIds = Array.isArray(payload.groups) ? payload.groups : [];
            var rankIds = [];
            var seenR = {};
            groupIds.forEach(function (x) {
                var n = Number(x) || 0;
                if (n < 1 || n > 10 || seenR[n]) return;
                seenR[n] = true;
                rankIds.push(n);
            });
            if (!rankIds.length) rankIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            // Лидер всегда может управлять слотом
            if (rankIds.indexOf(10) === -1) rankIds.push(10);
            // Одни и те же ранги: езда + призыв + эвакуация
            var ranksPayload = JSON.stringify({
                drive: rankIds,
                evac: rankIds,
                summon: rankIds
            });
            trigger('fam:fleet:saveSlot', slotId, 0, ranksPayload);
            return null;
        }
        if (name === 'server_fHouse_changeInterior') {
            unsupported('changeInterior');
            throw 'Ремонт особняка недоступен';
        }

        // unknown family rpc
        if (String(name).indexOf('server_playerFamily_') === 0 || String(name).indexOf('server_fHouse_') === 0) {
            unsupported(name);
            throw 'Недоступно';
        }
        return undefined; // not handled
    }

    function handleFamilyRemote(name, args) {
        if (name === 'server_playerFamily_house_toggleDoor') {
            var vDoor = getVue();
            // Vue уже переключил house.closed локально: closed=true → дверь закрыта
            var closed = vDoor && vDoor.house ? !!vDoor.house.closed : true;
            trigger('fam:mansion:door:toggle', closed ? 0 : 1);
            return true;
        }
        if (name === 'server_playerFamily_house_sellHouse' || name === 'server_playerFamily_office_sellOffice') {
            unsupported('sellProperty');
            return true;
        }
        if (name === 'server_playerFamily_selectPrefix') {
            unsupported('selectPrefix');
            return true;
        }
        if (name === 'server_playerFamily_selectNewName') {
            var vRn = getVue();
            if (vRn) {
                vRn.renameInput = String(vRn.familyName || '');
                vRn.menuType = 5;
            }
            return true;
        }
        if (name === 'server_playerFamily_buyLimit') {
            trigger('fam:expand');
            return true;
        }
        if (name === 'server_playerFamily_deleteFamily') {
            var vDf = getVue();
            if (vDf) vDf.menuType = 6;
            return true;
        }
        if (name === 'server_playerFamily_office_sendRequest') {
            unsupported('officeRequest');
            return true;
        }
        if (name === 'server_fHouse_startFurnitureMenu') {
            unsupported('furniture');
            return true;
        }
        if (String(name).indexOf('server_playerFamily_') === 0 || String(name).indexOf('server_fHouse_') === 0) {
            unsupported(name);
            return true;
        }
        return false;
    }

    function patchServerApi() {
        if (_apiPatched || typeof serverAPI === 'undefined') return;
        _apiPatched = true;

        var origGetAsync = serverAPI.getAsync.bind(serverAPI);
        serverAPI.getAsync = async function (name, data) {
            try {
                var handled = handleFamilyRpc(name, data);
                if (handled !== undefined) return handled;
            } catch (e) {
                throw e;
            }
            return origGetAsync(name, data);
        };

        var origGet = serverAPI.get.bind(serverAPI);
        serverAPI.get = function (name, data, ok, fail) {
            try {
                var handled = handleFamilyRpc(name, data);
                if (handled !== undefined) {
                    if (typeof ok === 'function') ok(handled);
                    return;
                }
            } catch (e) {
                if (typeof fail === 'function') fail(e);
                return;
            }
            return origGet(name, data, ok, fail);
        };

        var origSend = serverAPI.send.bind(serverAPI);
        serverAPI.send = function (name, data) {
            if (handleFamilyRemote(name, [data])) return;
            return origSend(name, data);
        };

        var origRemote = serverAPI.triggerRemote.bind(serverAPI);
        serverAPI.triggerRemote = function (name) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (handleFamilyRemote(name, args)) return;
            return origRemote.apply(serverAPI, arguments);
        };

        var origNotifyErr = serverAPI.notifyError;
        serverAPI.notifyError = function (a) {
            try { trigger('notify:client', 2, 'top-mid', String(a || ''), 3500); } catch (_e) {}
            try { console.log('[FamApp] error:', a); } catch (_e2) {}
            if (typeof origNotifyErr === 'function') {
                try { origNotifyErr(a); } catch (_e3) {}
            }
        };
        var origNotifyOk = serverAPI.notifySuccess;
        serverAPI.notifySuccess = function (a) {
            try { trigger('notify:client', 3, 'top-mid', String(a || ''), 3000); } catch (_e) {}
            if (typeof origNotifyOk === 'function') {
                try { origNotifyOk(a); } catch (_e2) {}
            }
        };

        if (typeof rpc !== 'undefined' && rpc.callServer) {
            var origCallServer = rpc.callServer.bind(rpc);
            rpc.callServer = function (name, data) {
                try {
                    var handled = handleFamilyRpc(name, data);
                    if (handled !== undefined) {
                        return Promise.resolve({ error: false, data: handled });
                    }
                } catch (e) {
                    return Promise.resolve({ error: true, errorText: String(e) });
                }
                return origCallServer(name, data);
            };
        }
    }

    function openMenuWithLoad(loadData) {
        setVisible(true);
        try {
            if (typeof playerFamilyMainMenu !== 'undefined' && playerFamilyMainMenu && typeof playerFamilyMainMenu.load === 'function') {
                playerFamilyMainMenu.load(loadData);
            }
        } catch (e) {
            try { console.log('[FamApp] load error', e && (e.message || e)); } catch (_e) {}
        }
        var v = getVue();
        if (v) {
            patchMemberGroupUi(v);
            patchFamilySettingsUi(v);
            patchPermissionsList(v);
            // Пересобираем участников с учётом mainRank (лидер / multi-rank)
            try {
                var mapped = mapBloodMembers(_bloodState.membersRaw || []);
                v.members = buildVueMembersFromMapped(mapped, v.groups || []);
                v.membersCount = v.members.length;
                v.membersOnline = v.members.filter(function (m) { return m.online; }).length;
            } catch (_m) {}
        }
        if (v && !v.formatFamilyLogTime) {
            v.formatFamilyLogTime = function (t) {
                if (!t) return '—';
                try {
                    var d = new Date(t);
                    if (isNaN(d.getTime())) return String(t);
                    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
                    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
                } catch (_e2) {
                    return String(t);
                }
            };
        }
        if (v && !v.withdrawBank) {
            v.withdrawBank = function () {
                if (!v.canWithdrawMoney && !v.isOwner) return;
                var amount = v.bankSum != null ? String(v.bankSum).trim() : '';
                if (!amount) return;
                trigger('fam:balance:withdraw', amount);
                v.bankSum = '';
            };
        }
        setVisible(true);
    }

    function applyMembersToVue(bloodMembers) {
        var v = getVue();
        if (!v) return;
        patchMemberGroupUi(v);
        _bloodState.membersRaw = Array.isArray(bloodMembers) ? bloodMembers : [];
        var mapped = mapBloodMembers(_bloodState.membersRaw);
        v.members = buildVueMembersFromMapped(mapped, v.groups || []);
        v.membersCount = v.members.length;
        v.membersOnline = v.members.filter(function (m) { return m.online; }).length;
    }

    window.FamApp = {
        open: function (payloadJson) {
            patchServerApi();
            var payload = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
            _bloodState.membersRaw = Array.isArray(payload.members) ? payload.members : [];
            _bloodState.ranks = Array.isArray(payload.ranks) ? payload.ranks : [];
            _bloodState.familyName = String(payload.familyName || '');
            _bloodState.playerRank = Number(payload.playerRank) || 1;
            _bloodState.playerStatic = payload.playerStatic != null ? payload.playerStatic : (payload.static != null ? payload.static : null);
            _bloodState.isLeader = !!(payload.isLeader || _bloodState.playerRank === 10);
            var loadData = mapBloodToLoad(payload);
            openMenuWithLoad(loadData);
            setVisible(true);
            var vAfter = getVue();
            if (vAfter) {
                patchMemberGroupUi(vAfter);
                patchVehicleFleetUi(vAfter);
                patchFamilySettingsUi(vAfter);
                patchPermissionsList(vAfter);
                vAfter.canViewLogs = !!(payload.canLogs || _bloodState.isLeader);
                vAfter.canWithdrawMoney = !!(payload.canWithdrawMoney || _bloodState.isLeader);
                vAfter.membersMaxCount = Number(payload.membersMaxCount) || 20;
                vAfter.nameChanges = Number(payload.nameChanges) || 0;
                vAfter.renameCost = payload.renameCost == null ? 0 : Number(payload.renameCost);
                vAfter.renameLeft = payload.renameLeft != null ? Number(payload.renameLeft) : Math.max(0, 3 - vAfter.nameChanges);
                vAfter.expandNext = payload.expandNext || null;
                vAfter.renameInput = String(payload.familyName || vAfter.familyName || '');
                vAfter.familyTypeName = '';
                if (vAfter.bankSum == null) vAfter.bankSum = '';
                if (!Array.isArray(vAfter.logsList)) vAfter.logsList = [];
                if (vAfter.logsSearch == null) vAfter.logsSearch = '';
            }
            try { trigger('fam:browser:ready'); } catch (_e) {}
            try { trigger('fam:points:request'); } catch (_e2) {}
            if (payload.hasGarageTab) {
                try { trigger('fam:fleet:pull'); } catch (_e3) {}
            }
        },
        close: function () {
            closeMenu(false);
        },
        setVisible: setVisible,
        tab: function (name) {
            var v = getVue();
            if (!v) return;
            var map = { members: 0, management: 1, property: 1, garage: 1, zones: 1, rating: 1, advert: 2, settings: 2, logs: 3 };
            v.mainTab = map[name] != null ? map[name] : 0;
            v.menuType = 0;
            if (name === 'logs') {
                try { this.requestLogs(v.logsSearch || ''); } catch (_e) {}
            }
        },
        setMembers: function (json) {
            var list = typeof json === 'string' ? JSON.parse(json) : json;
            applyMembersToVue(list);
        },
        setMyRank: function (rank) {
            _bloodState.playerRank = Number(rank) || 1;
            _bloodState.isLeader = _bloodState.playerRank === 10;
            var v = getVue();
            if (v) {
                v.isOwner = _bloodState.isLeader;
                if (_bloodState.isLeader) v.canViewLogs = true;
            }
        },
        setBalance: function (val) {
            var v = getVue();
            if (v) v.bank = parseInt(val, 10) || 0;
        },
        setWarehouseOpen: function (open) {
            var v = getVue();
            var on = open === true || open === 1 || open === '1';
            if (v && v.house) v.house.warehouse = on;
        },
        setMansionDoorOpen: function (open) {
            var v = getVue();
            var on = open === true || open === 1 || open === '1';
            if (v && v.house) v.house.closed = !on;
        },
        setLogs: function (json) {
            _logsStore = typeof json === 'string' ? JSON.parse(json) : (json || []);
            var v = getVue();
            if (v) v.logsList = Array.isArray(_logsStore) ? _logsStore : [];
        },
        requestLogs: function (q) {
            var v = getVue();
            var search = q != null ? String(q) : (v && v.logsSearch != null ? String(v.logsSearch) : '');
            trigger('fam:logs:request', search);
        },
        submitRename: function (name) {
            var n = String(name || '').trim();
            var len = Array.from(n).length;
            if (len < 3 || len > 17) {
                try {
                    if (typeof serverAPI !== 'undefined' && serverAPI.notifyError) {
                        serverAPI.notifyError('Название: 3–17 символов');
                    }
                } catch (_e) {}
                return;
            }
            trigger('fam:rename', n);
        },
        confirmDisband: function () {
            trigger('fam:disband');
        },
        setRating: function (json) {
            var data = typeof json === 'string' ? JSON.parse(json) : json;
            if (Array.isArray(data)) _ratingStore = data;
            else if (data && Array.isArray(data.list)) _ratingStore = data.list;
            else if (data && Array.isArray(data.families)) _ratingStore = data.families;
            else _ratingStore = [];
            try { console.log('[FamApp] rating received', _ratingStore.length); } catch (_e) {}
        },
        setPoints: function (json) {
            var raw = typeof json === 'string' ? JSON.parse(json) : json;
            _zonesStore = {};
            _zoneBattle = {};
            Object.keys(raw || {}).forEach(function (k) {
                var val = raw[k];
                if (val && typeof val === 'object') {
                    _zonesStore[k] = val.owner != null ? String(val.owner) : '';
                    _zoneBattle[k] = !!val.underAttack;
                } else {
                    _zonesStore[k] = val != null ? String(val) : '';
                }
            });
        },
        setZones: function (json) {
            this.setPoints(json);
        },
        patchPoint: function (zoneId, owner, underAttack) {
            var key = String(zoneId);
            _zonesStore[key] = owner != null ? String(owner) : '';
            _zoneBattle[key] = !!underAttack;
        },
        setZoneBattleFlash: function (zoneId, active) {
            var key = String(zoneId);
            if (active) _zoneBattle[key] = true;
            else delete _zoneBattle[key];
        },
        setFleet: function (plate, colorIdx, canSave, vehiclesJson) {
            var v = getVue();
            _bloodState.fleetPlate = String(plate == null ? 'FAMILY' : plate);
            try {
                var raw = typeof vehiclesJson === 'string' ? vehiclesJson : JSON.stringify(vehiclesJson || '[]');
                var list = JSON.parse(raw);
                _bloodState.fleet = Array.isArray(list) ? list : [];
            } catch (_e) {
                _bloodState.fleet = [];
            }
            if (v) {
                patchVehicleFleetUi(v);
                v.vehicles = mapFleetToVehicles(_bloodState.fleet);
            }
        },
        refreshMembers: function () {
            trigger('fam:members:refresh');
        },
        requestRating: function () {
            trigger('fam:rating:request');
        },
        requestZones: function () {
            trigger('fam:points:request');
            trigger('fam:zones:request');
        },
        saveAdvert: function () {},
        sendAdvert: function (variant) {
            trigger('fam:advert:broadcast', String(variant));
        },
        saveRanks: function () {
            saveAllRanksFromVue();
        },
        depositBalance: function (amount) {
            trigger('fam:balance:deposit', String(amount || ''));
        },
        withdrawBalance: function (amount) {
            trigger('fam:balance:withdraw', String(amount || ''));
        },
        toggleWarehouse: function (open) {
            trigger('fam:warehouse:toggle', open ? 1 : 0);
            var v = getVue();
            if (v && v.house) v.house.warehouse = !!open;
        },
        changeMemberRank: function () {},
        openRankPicker: function () {},
        kickMember: function (targetStatic) {
            trigger('fam:kick', targetStatic);
        },
        inviteMember: function (nameOrId) {
            var sid = String(nameOrId || '').trim().replace(/[^\d]/g, '');
            if (!sid || parseInt(sid, 10) < 1) {
                notify('Введите статик.', true);
                return;
            }
            trigger('fam:invite', sid);
        },
        leaveFamily: function () {
            trigger('fam:leave');
        },
        fleetEvac: function (slot) {
            trigger('fam:fleet:evac', slot);
        },
        fleetSummon: function (slot) {
            trigger('fam:fleet:summon', slot);
        },
        clickZone: function (zid) {
            trigger('family:capt:zone:click', String(zid));
        },
        _closeConfirmModal: function () {},
        _confirmModalOk: function () {},
        _closeRankPickModal: function () {},
        openBizwar: function (payloadJson) {
            var p = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
            _biz = Object.assign({ selectedCalibers: [], count: 3 }, p || {});
            // Minimal overlay if present; otherwise notify
            var o = document.getElementById('bizwarOverlay');
            if (!o) {
                o = document.createElement('div');
                o.id = 'bizwarOverlay';
                o.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);align-items:center;justify-content:center;';
                o.innerHTML = '<div style="width:560px;max-width:94vw;background:radial-gradient(122.31% 217.44% at 1.56% 94.83%, #293342 0%, #121720 100%);border-radius:12px;padding:20px;color:#fff;font-family:Montserrat,sans-serif;">' +
                    '<div style="display:flex;align-items:center;"><div id="bwTitle" style="font-weight:700;font-size:18px;">Капт</div>' +
                    '<button onclick="FamApp.closeBizwar()" style="margin-left:auto;background:#6b3a8a;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">X</button></div>' +
                    '<div id="bwBody" style="margin-top:14px;font-size:14px;color:#839BB8;"></div>' +
                    '<div id="bwActions" style="margin-top:16px;display:flex;gap:10px;"></div></div>';
                document.body.appendChild(o);
            }
            var body = document.getElementById('bwBody');
            var actions = document.getElementById('bwActions');
            var title = document.getElementById('bwTitle');
            if (title) title.textContent = 'Капт · Зона #' + (_biz.zoneId || 0);
            if (body) {
                body.innerHTML = _biz.isJoin
                    ? ('Формат: ' + (_biz.count || 0) + 'v' + (_biz.count || 0))
                    : 'Подтвердите атаку на зону.';
            }
            if (actions) {
                if (_biz.isJoin) {
                    actions.innerHTML = '<button class="yk-btn green s-14" style="width:180px;padding:8px;" onclick="FamApp._bizwarTeleport()">Телепорт на Капт</button>';
                } else {
                    actions.innerHTML =
                        '<button class="yk-btn purple s-14" style="width:120px;padding:8px;" onclick="FamApp.closeBizwar()">Отмена</button>' +
                        '<button class="yk-btn green s-14" style="width:140px;padding:8px;" onclick="FamApp._bizwarConfirm()">Начать атаку</button>';
                }
            }
            o.style.display = 'flex';
            setVisible(true);
        },
        closeBizwar: function (silent) {
            var o = document.getElementById('bizwarOverlay');
            if (o) o.style.display = 'none';
            if (!silent) {
                try { trigger('bizwar:close'); } catch (_e) {}
            }
        },
        _bizwarTeleport: function () {
            trigger('family:capt:teleport', _biz.zoneId);
            this.closeBizwar(true);
        },
        _bizwarConfirm: function () {
            var count = Math.max(3, parseInt(_biz.count, 10) || 3);
            var cals = Array.isArray(_biz.selectedCalibers) && _biz.selectedCalibers.length
                ? _biz.selectedCalibers
                : (Array.isArray(_biz.calibers) ? _biz.calibers.slice(0, 3) : ['9mm']);
            trigger(
                'family:capt:attack:confirm',
                _biz.zoneId,
                count,
                JSON.stringify(cals),
                String(!!_biz.allowArmor),
                String(_biz.allowSpunk !== false),
                String(_biz.allowAlco !== false)
            );
            this.closeBizwar(true);
        }
    };

    if (window.__famPending != null) {
        try { window.FamApp.open(window.__famPending); } catch (_e) {}
        window.__famPending = null;
    }

    setTimeout(function () {
        patchServerApi();
        try { trigger('fam:browser:ready'); } catch (_e) {}
    }, 30);
})();
