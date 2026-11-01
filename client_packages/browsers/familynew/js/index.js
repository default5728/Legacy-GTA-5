/** 10 пресетов цвета гаража — соответствуют GTA ID на сервере (как на машине). */
var FLEET_COLOR_PRESETS_UI = [
	{ idx: 0, css: '#f2f2f2', label: 'Белый' },
	{ idx: 1, css: '#1a1a1a', label: 'Чёрный' },
	{ idx: 2, css: '#dc2626', label: 'Красный' },
	{ idx: 3, css: '#2563eb', label: 'Синий' },
	{ idx: 4, css: '#eab308', label: 'Жёлтый' },
	{ idx: 5, css: '#16a34a', label: 'Зелёный' },
	{ idx: 6, css: '#ea580c', label: 'Оранжевый' },
	{ idx: 7, css: '#cbd5e1', label: 'Серебро' },
	{ idx: 8, css: '#64748b', label: 'Серый' },
	{ idx: 9, css: '#78350f', label: 'Коричневый' }
];

/** Как в F3 / menunew — превью для гаража семьи при отсутствии картинки модели. */
var FLEET_PREVIEW_FALLBACK_IMG = 'package://browsers/phone/img/cars/oppressor2.png';

let FamilyMenu = new Vue({
	el: "#family-menu",
	data: {
		PlayerRank: 0,
		Active: 1,
		FamilyName: null,
		CreateData: null,
		Users: [],
		Location: null,
		Interrior: 1,
		Materials: 0,
		RankPoints: 0,
		changeRankActive: 0,
		RankChangeTarget: null,
		rankChangeMainInput: 1,
		rankExtraPick: [],
		CurrentRankChange: 1,
		RankSystem: [{
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 0,
			ChangeRank: 0,
			CanKick: 0,
			withdrawMoney: 0,
			familyWarehouse: 0,
			captParticipate: 0,
			fleetEvac: 0,
			fleetSummon: 0,
			rankName: ''
		}, {
			CanInvite: 1,
			ChangeRank: 1,
			CanKick: 1,
			withdrawMoney: 1,
			familyWarehouse: 1,
			captParticipate: 1,
			fleetEvac: 1,
			fleetSummon: 1,
			rankName: ''
		}],
		CurrentAnnouncement: 1,
		CaptLevel: 0,
		CaptName: 'Новички',
		CaptPoints: 0,
		CurrentLevelPoints: 0,
		NextLevelPoints: 100,
		TotalKills: 0,
		TotalDeaths: 0,
		Territories: 0,
		RatingList: [],
		CaptPlayerCountInput: '',
		CaptAttackerOnline: 0,
		CaptDefenderOnline: 0,
		CaptFormatMax: 0,
		CaptHasDefenderOnPoint: false,
		CaptLimitsLoading: false,
		SelectedWeapon: 'carbine',
		SelectedWeapon2: '',
		SelectedWeapon3: '',
		captWeaponOptions: [
			{ key: '', label: 'Пусто' },
			{ key: 'carbine', label: 'Carbine' },
			{ key: 'revolver', label: 'Revolver' },
			{ key: 'specialcarbine', label: 'Special Carbine' },
			{ key: 'minismg', label: 'Mini SMG' }
		],
		CaptAllowSpank: false,
		CaptAllowAlco: false,
		CaptAllowArmor: false,
		ServerPoints: [],
		hoveredPoint: null,
		selectedPoint: null,
		
		CaptsAttacks: 0,
		CaptsDefenses: 0,
		CaptsTimeAllowed: true,

		fleetPlateInput: 'FAMILY',
		fleetColorIdx: 0,
		fleetCanSave: false,
		fleetVehicles: [],
		fleetPaletteOpen: false,
		fleetPaletteSlot: null,
		fleetPaletteTempIdx: 0,
		fleetRanksOpen: {},
		fleetRanksSel: {},
		fleetEvacRanksOpen: {},
		fleetEvacRanksSel: {},
		fleetSummonRanksOpen: {},
		fleetSummonRanksSel: {},
		fleetGtaColorCount: 10,
		fleetPreviewFallbackImg: FLEET_PREVIEW_FALLBACK_IMG,
	},
	computed: {
		fleetGtaPalette: function() {
			return FLEET_COLOR_PRESETS_UI;
		},
		ProgressPercent: function() {
			if (this.NextLevelPoints === this.CurrentLevelPoints) return 100;
			const current = this.CaptPoints - this.CurrentLevelPoints;
			const max = this.NextLevelPoints - this.CurrentLevelPoints;
			return Math.min(Math.round((current / max) * 100), 100);
		},
		KDRatio: function() {
			if (this.TotalDeaths === 0) return this.TotalKills.toFixed(2);
			return (this.TotalKills / this.TotalDeaths).toFixed(2);
		},
		FamilyIncomeFRP: function() {
			return this.Territories * 10;
		},
		captParsedPlayerCount: function() {
			var max = this.CaptFormatMax;
            if (max < 3) return null;
			var raw = String(this.CaptPlayerCountInput || '').trim();
			if (raw === '') return null;
			var n = parseInt(raw, 10);
			if (isNaN(n)) return null;
            if (n < 3 || n > max) return null;
			return n;
		}
	},
	methods: {
		applyFleetUi: function(plate, idx, canSave, vehiclesStr) {
			var p = String(plate == null ? '' : plate).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
			if (!p) p = 'FAMILY';
			this.fleetPlateInput = p;
			var n = parseInt(idx, 10);
			if (!isFinite(n) || n < 0) n = 0;
			if (n > this.fleetGtaColorCount - 1) n = this.fleetGtaColorCount - 1;
			this.fleetColorIdx = n;
			this.fleetCanSave = !!canSave;
			this.fleetVehicles = [];
			try {
				var raw = vehiclesStr != null ? String(vehiclesStr) : '[]';
				var arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
				if (Array.isArray(arr)) this.fleetVehicles = arr;
			} catch (_e) {
				this.fleetVehicles = [];
			}
			this.fleetRanksOpen = {};
			this.fleetRanksSel = {};
			this.fleetEvacRanksOpen = {};
			this.fleetEvacRanksSel = {};
			this.fleetSummonRanksOpen = {};
			this.fleetSummonRanksSel = {};
			var vm = this;
			this.fleetVehicles.forEach(function(row) {
				var slot = parseInt(row.slot, 10);
				if (!isFinite(slot)) return;
				var c = row.colorIdx != null && row.colorIdx !== '' ? parseInt(row.colorIdx, 10) : n;
				if (!isFinite(c) || c < 0) c = 0;
				if (c > vm.fleetGtaColorCount - 1) c = vm.fleetGtaColorCount - 1;
				vm.$set(vm.fleetRanksSel, slot, vm.parseDriveRanksArr(row.driveRanks));
				vm.$set(vm.fleetEvacRanksSel, slot, vm.parseDriveRanksArr(row.evacRanks));
				vm.$set(vm.fleetSummonRanksSel, slot, vm.parseDriveRanksArr(row.summonRanks));
			});
		},
		fleetSlotRanksPayload: function(slot) {
			var d = this.fleetRanksSel[slot] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			var e = this.fleetEvacRanksSel[slot] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			var s = this.fleetSummonRanksSel[slot] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			return JSON.stringify({ drive: d, evac: e, summon: s });
		},
		parseDriveRanksArr: function(dr) {
			try {
				var a = typeof dr === 'string' ? JSON.parse(dr) : dr;
				if (Array.isArray(a) && a.length) {
					return a.map(function(x) { return parseInt(x, 10); }).filter(function(x) { return x >= 1 && x <= 10; });
				}
			} catch (_e2) {}
			return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		},
		vehPreview: function(model) {
			var m = String(model || '').trim();
			if (!m) return FLEET_PREVIEW_FALLBACK_IMG;
			return 'package://browsers/vehicle_previews/' + m + '.png';
		},
		slotColorIdx: function(row) {
			var n = this.fleetColorIdx;
			if (row && row.colorIdx != null && row.colorIdx !== '') {
				var c = parseInt(row.colorIdx, 10);
				if (isFinite(c) && c >= 0 && c < this.fleetGtaColorCount) n = c;
			}
			return n;
		},
		fleetSlotCardAccentStyle: function() {
			var p = this.fleetGtaPalette;
			var g = p && p[this.fleetColorIdx];
			var c = g ? g.css : 'rgba(220,38,38,0.55)';
			return { boxShadow: 'inset 3px 0 0 0 ' + c };
		},
		fleetSlotColorBtnStyle: function(row) {
			var p = this.fleetGtaPalette;
			var slotCss = '#444';
			var si = this.slotColorIdx(row);
			if (p && p[si]) slotCss = p[si].css;
			var g = p && p[this.fleetColorIdx];
			var ring = g ? g.css : 'rgba(220,38,38,0.75)';
			return {
				background: slotCss,
				boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5), 0 0 0 2px rgba(10,10,10,0.92), 0 0 0 3px ' + ring
			};
		},
		openFleetPalette: function(slot, row) {
			if (!this.fleetCanSave) return;
			this.fleetPaletteSlot = slot;
			this.fleetPaletteTempIdx = this.slotColorIdx(row);
			this.fleetPaletteOpen = true;
		},
		closeFleetPalette: function() {
			this.fleetPaletteOpen = false;
			this.fleetPaletteSlot = null;
		},
		applyFleetPalettePick: function(idx) {
			this.fleetPaletteTempIdx = parseInt(idx, 10);
		},
		confirmFleetPalette: function() {
			if (!this.fleetCanSave || this.fleetPaletteSlot == null) return;
			var slot = this.fleetPaletteSlot;
			mp.trigger('family:fleet:ui:saveSlot', String(slot), String(this.fleetPaletteTempIdx), this.fleetSlotRanksPayload(slot));
			this.closeFleetPalette();
		},
		toggleFleetRankOpen: function(slot) {
			this.$set(this.fleetRanksOpen, slot, !this.fleetRanksOpen[slot]);
		},
		toggleFleetRankPick: function(slot, r) {
			var arr = (this.fleetRanksSel[slot] || []).slice();
			var i = arr.indexOf(r);
			if (i >= 0) arr.splice(i, 1);
			else arr.push(r);
			arr.sort(function(a, b) { return a - b; });
			if (!arr.length) arr = [1];
			this.$set(this.fleetRanksSel, slot, arr);
		},
		fleetRankSelected: function(slot, r) {
			var arr = this.fleetRanksSel[slot] || [];
			return arr.indexOf(r) >= 0;
		},
		toggleFleetEvacRankOpen: function(slot) {
			this.$set(this.fleetEvacRanksOpen, slot, !this.fleetEvacRanksOpen[slot]);
		},
		toggleFleetEvacRankPick: function(slot, r) {
			var arr = (this.fleetEvacRanksSel[slot] || []).slice();
			var i = arr.indexOf(r);
			if (i >= 0) arr.splice(i, 1);
			else arr.push(r);
			arr.sort(function(a, b) { return a - b; });
			if (!arr.length) arr = [1];
			this.$set(this.fleetEvacRanksSel, slot, arr);
		},
		fleetEvacRankSelected: function(slot, r) {
			var arr = this.fleetEvacRanksSel[slot] || [];
			return arr.indexOf(r) >= 0;
		},
		toggleFleetSummonRankOpen: function(slot) {
			this.$set(this.fleetSummonRanksOpen, slot, !this.fleetSummonRanksOpen[slot]);
		},
		toggleFleetSummonRankPick: function(slot, r) {
			var arr = (this.fleetSummonRanksSel[slot] || []).slice();
			var i = arr.indexOf(r);
			if (i >= 0) arr.splice(i, 1);
			else arr.push(r);
			arr.sort(function(a, b) { return a - b; });
			if (!arr.length) arr = [1];
			this.$set(this.fleetSummonRanksSel, slot, arr);
		},
		fleetSummonRankSelected: function(slot, r) {
			var arr = this.fleetSummonRanksSel[slot] || [];
			return arr.indexOf(r) >= 0;
		},
		saveFleetSlotMeta: function(slot) {
			if (!this.fleetCanSave) return;
			var row = this.fleetVehicles.find(function(x) { return parseInt(x.slot, 10) === slot; });
			var c = this.slotColorIdx(row);
			mp.trigger('family:fleet:ui:saveSlot', String(slot), String(c), this.fleetSlotRanksPayload(slot));
		},
		fleetEvacAction: function(slot) {
			mp.trigger('family:fleet:ui:evac', String(slot));
		},
		fleetSummonAction: function(slot) {
			mp.trigger('family:fleet:ui:summon', String(slot));
		},
		selectFleetColorGlobal: function(i) {
			if (!this.fleetCanSave) return;
			var n = parseInt(i, 10);
			if (!isFinite(n) || n < 0 || n >= this.fleetGtaColorCount) return;
			this.fleetColorIdx = n;
		},
		sanitizeFleetPlateInput: function() {
			var p = String(this.fleetPlateInput == null ? '' : this.fleetPlateInput)
				.replace(/[^a-zA-Z0-9]/g, '')
				.toUpperCase()
				.slice(0, 6);
			if (this.fleetPlateInput !== p) this.fleetPlateInput = p;
		},
		saveFamilyFleet: function() {
			if (!this.fleetCanSave) return;
			this.sanitizeFleetPlateInput();
			var p = String(this.fleetPlateInput || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
			if (!p) p = 'FAMILY';
			this.fleetPlateInput = p;
			mp.trigger('family:fleet:ui:save', p, String(this.fleetColorIdx));
		},
		setRank: function(rank) {
			this.PlayerRank = rank;
		},
		clearUsersList: function() {
			this.Users = [];
		},
		clear: function() {
			this.Users = []
			this.FamilyName = null;
			this.CreateData = null;
			this.PlayerRank = 0;
			this.fleetPlateInput = 'FAMILY';
			this.fleetColorIdx = 0;
			this.fleetCanSave = false;
			this.fleetVehicles = [];
			this.fleetPaletteOpen = false;
			this.fleetEvacRanksOpen = {};
			this.fleetEvacRanksSel = {};
			this.fleetSummonRanksOpen = {};
			this.fleetSummonRanksSel = {};
			this.rankExtraPick = [];
		},
		setInfo: function(name, date) {
			this.FamilyName = name;
			this.CreateData = date;
		},
		saveRankManagement: function() {
			mp.trigger("family:rank:save:c", JSON.stringify(this.RankSystem[this.CurrentRankChange]), this.CurrentRankChange);
		},
		setRankManagement: function(_0x14857) {
			let arr = JSON.parse(_0x14857);
			if (Array.isArray(arr)) {
				for (let i = 0; i < arr.length; i++) {
					if (!arr[i] || typeof arr[i] !== 'object') arr[i] = {};
					if (arr[i].familyWarehouse === undefined) arr[i].familyWarehouse = i === 10 ? 1 : 0;
					if (arr[i].captParticipate === undefined) arr[i].captParticipate = i === 10 ? 1 : 0;
					if (arr[i].rankName === undefined) arr[i].rankName = '';
					if (arr[i].fleetEvac === undefined) arr[i].fleetEvac = i === 10 ? 1 : 0;
					if (arr[i].fleetSummon === undefined) arr[i].fleetSummon = i === 10 ? 1 : 0;
				}
			}
			this.RankSystem = arr;
		},
		addUser: function(staticID, login, rank, leader, tag, rankLabel, rankExtrasJson) {
			var sid = parseInt(staticID, 10);
			var rl = rankLabel != null && String(rankLabel).trim() !== '' ? String(rankLabel).trim() : 'Ранг ' + parseInt(rank, 10);
			var rex = rankExtrasJson != null ? String(rankExtrasJson) : '[]';
			var idx = this.Users.findIndex(function(x) {
				return parseInt(x.staticID, 10) === sid;
			});
			var row = {
				staticID: staticID,
				login: login,
				rank: parseInt(rank, 10),
				leader: parseInt(leader, 10),
				tag: tag,
				rankLabel: rl,
				rankExtrasJson: rex
			};
			if (idx >= 0) {
				this.$set(this.Users, idx, row);
			} else {
				this.Users.push(row);
			}
			this.Users.sort((a, _0x148BF) => {
				if (a.rank < _0x148BF.rank) {
					return 1;
				} else {
					return -1;
				}
			});
		},
		closeFamilyMenu: function() {
			mp.trigger("family:close");
		},
		opnModalFamily: function(rank, staticId) {
			this.changeRankActive = 1;
			this.RankChangeTarget = parseInt(staticId, 10);
			this.rankChangeMainInput = parseInt(rank, 10) || 1;
			this.rankExtraPick = [];
			var u = this.Users.find(function(x) { return parseInt(x.staticID, 10) === parseInt(staticId, 10); });
			if (u && u.rankExtrasJson) {
				try {
					var j = JSON.parse(String(u.rankExtrasJson));
					var main = this.rankChangeMainInput;
					if (Array.isArray(j)) {
						this.rankExtraPick = j
							.map(function(n) { return parseInt(n, 10); })
							.filter(function(n) { return n >= 1 && n <= 9 && n !== main; });
					}
				} catch (_e) {}
			}
		},
		closeModalFamily: function() {
			this.changeRankActive = 0;
			this.RankChangeTarget = null;
			this.rankExtraPick = [];
		},
		saveChangeRank: function() {
			this.changeRankActive = 0;
			var main = parseInt(this.rankChangeMainInput, 10);
			if (!isFinite(main) || main < 1 || main > 9) {
				mp.trigger('notify:client', 2, 'top-mid', 'Укажите основной ранг от 1 до 9.', 3000);
				return;
			}
			var extras = (this.rankExtraPick || []).filter(function(n) { return n >= 1 && n <= 9 && n !== main; });
			mp.trigger('family:changerank:c', this.RankChangeTarget, main, JSON.stringify(extras));
		},
		kickTargetFromFamily: function(static) {
			mp.trigger("family:kick:c", static);
		},
		FamilySetTargetNewRank: function(staticId, newRank) {
			let u = this.Users.find(function(x) { return parseInt(x.staticID, 10) === parseInt(staticId, 10); });
			if (!u) return;
			u.rank = parseInt(newRank, 10);
			u.rankLabel = 'Ранг ' + u.rank;
			this.Users.sort((a, b) => {
				if (a.rank < b.rank) return 1;
				return -1;
			});
		},
		FamilyKickTarget: function(_0x14927) {
			let _0x14823 = this.Users.findIndex(_0x1495B => {
				return parseInt(_0x1495B.staticID) == parseInt(_0x14927);
			});
			this.Users.splice(parseInt(_0x14823), 1);
			this.Users.sort((a, _0x148BF) => {
				if (a.rank < _0x148BF.rank) {
					return 1;
				} else {
					return -1;
				}
			});
		},
		buyAnnouncement: function() {
			mp.trigger("family:adv:buy:c", this.CurrentAnnouncement);
		},
		setCaptsInfo: function(level, name, points, currentPoints, nextPoints, kills, deaths, territories) {
			this.CaptLevel = parseInt(level);
			this.CaptName = name;
			this.CaptPoints = parseInt(points);
			this.RankPoints = parseInt(points) || 0;
			this.CurrentLevelPoints = parseInt(currentPoints);
			this.NextLevelPoints = parseInt(nextPoints);
			this.TotalKills = parseInt(kills);
			this.TotalDeaths = parseInt(deaths);
			this.Territories = parseInt(territories) || 0;
		},
		setCaptsLimits: function(attacks, defenses, timeAllowed) {
			this.CaptsAttacks = parseInt(attacks) || 0;
			this.CaptsDefenses = parseInt(defenses) || 0;
			this.CaptsTimeAllowed = !!timeAllowed;
		},
		setCaptFormatLimits: function(jsonStr) {
			try {
				var d = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
				this.CaptLimitsLoading = false;
				this.CaptAttackerOnline = parseInt(d.attackerOnline, 10) || 0;
				this.CaptDefenderOnline = parseInt(d.defenderOnline, 10) || 0;
				this.CaptFormatMax = Math.max(0, Math.min(30, parseInt(d.maxN, 10) || 0));
				this.CaptHasDefenderOnPoint = !!d.hasDefender;
                if (this.CaptFormatMax >= 3) {
                    var cur = parseInt(String(this.CaptPlayerCountInput || '').trim(), 10);
                    if (isNaN(cur) || cur < 3) this.CaptPlayerCountInput = '3';
					else if (cur > this.CaptFormatMax) this.CaptPlayerCountInput = String(this.CaptFormatMax);
				}
			} catch (e) {
				this.CaptLimitsLoading = false;
			}
		},
		setRatingList: function(dataJson) {
			this.RatingList = JSON.parse(dataJson);
		},
		calculateKD: function(kills, deaths) {
			if (deaths === 0) return kills.toFixed(2);
			return (kills / deaths).toFixed(2);
		},
		attackTerritory: function() {
			if (this.CaptLimitsLoading || this.CaptFormatMax < 1) {
				mp.trigger('notify:client', 2, 'top-mid', 'Дождитесь лимитов или выберите допустимый формат (недостаточно игроков в сети).', 4500);
				return;
			}
			var n = this.captParsedPlayerCount;
			if (n === null) {
                mp.trigger('notify:client', 2, 'top-mid', 'Введите целое число от 3 до ' + this.CaptFormatMax + '.', 4500);
				return;
			}
			var fmt = n + 'x' + n;
			var captKeys = ['carbine', 'revolver', 'specialcarbine', 'minismg'];
			var slots = [this.SelectedWeapon, this.SelectedWeapon2, this.SelectedWeapon3];
			var hasWeapon = slots.some(function (s) { return captKeys.indexOf(s) >= 0; });
			if (!hasWeapon) {
				mp.trigger('notify:client', 2, 'top-mid', 'Выберите хотя бы одно оружие в слотах.', 3500);
				return;
			}
			let defenderFamilyName = null;
			if (this.selectedPoint && this.selectedPoint.owner) {
				defenderFamilyName = this.selectedPoint.owner;
			} else if (this.hoveredPoint && this.hoveredPoint.owner) {
				defenderFamilyName = this.hoveredPoint.owner;
			}
			const opts = JSON.stringify({
				weapon2: this.SelectedWeapon2,
				weapon3: this.SelectedWeapon3,
				allowSpank: !!this.CaptAllowSpank,
				allowAlco: !!this.CaptAllowAlco,
				allowArmor: !!this.CaptAllowArmor
			});
			if (this.selectedPoint) {
				mp.trigger('family:attack:territory', fmt, this.SelectedWeapon, this.selectedPoint.id, defenderFamilyName, opts);
				this.selectedPoint = null;
			} else {
				mp.trigger('family:attack:territory', fmt, this.SelectedWeapon, 0, defenderFamilyName, opts);
			}
		},
		selectPoint: function(point) {
			var next = this.selectedPoint && point && this.selectedPoint.id === point.id ? null : (point || null);
			this.selectedPoint = next;
			if (this.selectedPoint) {
				this.CaptLimitsLoading = true;
				this.CaptFormatMax = 0;
				mp.trigger('family:capt:formatLimits:request', this.selectedPoint.id);
			}
		},
		closeCaptPopup: function() {
			this.selectedPoint = null;
			this.CaptLimitsLoading = false;
		},
		selectedWeaponForSlot: function(slotN) {
			if (slotN === 1) return this.SelectedWeapon;
			if (slotN === 2) return this.SelectedWeapon2;
			return this.SelectedWeapon3;
		},
		selectCaptWeaponSlot: function(slotN, key) {
			var arr = [this.SelectedWeapon, this.SelectedWeapon2, this.SelectedWeapon3];
			var idx = slotN - 1;
			if (key === '' || key === null || key === undefined) {
				arr[idx] = '';
			} else {
				var prev = arr[idx];
				arr[idx] = key;
				var conflict = arr.findIndex(function (k, i) { return i !== idx && k === key; });
				if (conflict >= 0) arr[conflict] = prev;
			}
			this.SelectedWeapon = arr[0];
			this.SelectedWeapon2 = arr[1];
			this.SelectedWeapon3 = arr[2];
		},
		setServerPoints: function(pointsJson) {
			let raw;
			try {
				raw = typeof pointsJson === 'string' ? JSON.parse(pointsJson) : pointsJson;
			} catch (e) {
				return;
			}
			if (!Array.isArray(raw)) return;
			const normalized = raw
				.map(function (p) {
					const id = parseInt(p.id, 10);
					if (!id || id < 1) return null;
					const o = p.owner;
					const owner = o != null && String(o).trim() !== '' ? String(o) : null;
					return {
						id: id,
						owner: owner,
						underAttack: !!p.underAttack,
						capturedAt: p.capturedAt != null && String(p.capturedAt).trim() !== '' ? p.capturedAt : null
					};
				})
				.filter(function (p) { return p != null; })
				.sort(function (a, b) { return a.id - b.id; });
			var selId = this.selectedPoint ? this.selectedPoint.id : null;
			var hovId = this.hoveredPoint ? this.hoveredPoint.id : null;
			this.ServerPoints = normalized;
			if (selId != null) {
				this.selectedPoint = normalized.find(function (p) { return p.id === selId; }) || null;
			}
			if (hovId != null) {
				this.hoveredPoint = normalized.find(function (p) { return p.id === hovId; }) || null;
			}
		},
		formatCapturedAt: function(iso) {
			if (!iso) return '—';
			try {
				const d = new Date(iso);
				if (isNaN(d.getTime())) return String(iso);
				return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
			} catch (e) {
				return '—';
			}
		},
		updatePoint: function(pointId, owner, underAttack, capturedAt) {
			var id = parseInt(pointId, 10);
			if (!id || id < 1) return;
			var own = owner != null && String(owner).trim() !== '' ? String(owner) : null;
			var point = this.ServerPoints.find(function (p) { return p.id === id; });
			if (!point) {
				var cap0 = arguments.length >= 4 && arguments[3] !== undefined
					? (capturedAt === null || capturedAt === undefined ? null : capturedAt)
					: null;
				point = { id: id, owner: own, underAttack: !!underAttack, capturedAt: cap0 };
				this.ServerPoints.push(point);
				this.ServerPoints.sort(function (a, b) { return a.id - b.id; });
			} else {
				this.$set(point, 'owner', own);
				this.$set(point, 'underAttack', !!underAttack);
				if (arguments.length >= 4 && arguments[3] !== undefined) {
					this.$set(point, 'capturedAt', capturedAt === null || capturedAt === undefined ? null : capturedAt);
				}
			}
			if (this.selectedPoint && this.selectedPoint.id === id) {
				this.selectedPoint = point;
			}
			if (this.hoveredPoint && this.hoveredPoint.id === id) {
				this.hoveredPoint = point;
			}
		}
	}
});
