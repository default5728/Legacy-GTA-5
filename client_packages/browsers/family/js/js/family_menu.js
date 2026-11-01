const playerFamilyMainMenu = new MenuManager("playerFamily_mainMenu", {
    data: {
        id: 0,
        familyName: "",
        familyTypeName: "",
        createDate: "",
        myName: "",
        mainTab: 0,
        menuType: 0,
        settingTab: 0,
        members: [],
        membersCount: 0,
        membersOnline: 0,
        membersSearch: "",
        enableOnlineSort: false,
        canInvite: false,
        canUninvite: false,
        canManageRanks: false,
        canWithdrawMoney: false,
        canWarehouse: false,
        canCapt: false,
        isOwner: false,
        isLeader: false,
        permissions: {
            isLeader: false,
            changeRank: false,
            unInvite: false
        },
        bank: 0,
        bankAmount: "",
        reputation: 0,
        territories: 0,
        captLevel: 0,
        ownedZones: 0,
        totalZones: 0,
        warehouseOpen: true,
        hasMansion: false,
        hasCaptTab: true,
        hasGarageTab: false,
        fleet: [],
        fleetPlate: "FAMILY",
        fleetColorIdx: 0,
        fleetCanSave: false,
        zones: {},
        zoneBattle: {},
        ratingList: [],
        logsList: [],
        logsSearch: "",
        rankNameList: [],
        rankPermissions: [],
        rankAllPermissions: [],
        rankEdit: { rank: "", index: 0, permissions: [] },
        formMemberNew: { name: "" },
        propertySub: 0
    },
    computed: {
        membersList: function () {
            var q = String(this.membersSearch || "").replace(/_/g, " ").toLowerCase();
            var list = (this.members || []).filter(function (m) {
                if (!q.length) return true;
                return String(m.name || "").toLowerCase().indexOf(q) !== -1;
            });
            if (this.enableOnlineSort) {
                list = list.slice().sort(function (a, b) {
                    return (b.isOnline || b.online ? 1 : 0) - (a.isOnline || a.online ? 1 : 0);
                });
            }
            return list;
        },
        zonesList: function () {
            var self = this;
            var keys = Object.keys(this.zones || {}).map(Number).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
            return keys.map(function (id) {
                return {
                    id: id,
                    owner: self.zones[id] || "",
                    underAttack: !!(self.zoneBattle && self.zoneBattle[id])
                };
            });
        }
    },
    methods: {
        changeRank: function () {},
        unInviteMember: function () {},
        sendInvite: function () {},
        leaveFromFamily: function () {},
        depositBalance: function () {},
        withdrawBalance: function () {},
        toggleWarehouse: function () {},
        startRankEdit: function () {},
        saveRankSetting: function () {},
        sendAdvert: function () {},
        requestLogs: function () {},
        requestRating: function () {},
        requestZones: function () {},
        fleetEvac: function () {},
        fleetSummon: function () {},
        clickZone: function () {},
        openCaptZones: function () {
            this.propertySub = 1;
            this.requestZones();
        },
        backToProperty: function () {
            this.propertySub = 0;
        }
    },
    load: function (a) {
        a = a || {};
        this.mainTab = 0;
        this.menuType = 0;
        this.settingTab = 0;
        this.propertySub = 0;
        this.membersSearch = "";
        this.enableOnlineSort = false;
        this.bankAmount = "";
        this.formMemberNew.name = "";
        this.logsSearch = "";

        this.id = a.id != null ? a.id : 0;
        this.familyName = a.familyName || "";
        this.familyTypeName = a.familyTypeName || "";
        this.createDate = a.createDate || "";
        this.myName = a.myName || "";
        this.bank = Number(a.bank) || 0;
        this.reputation = Number(a.reputation) || 0;
        this.territories = Number(a.territories) || 0;
        this.captLevel = Number(a.captLevel) || 0;
        this.ownedZones = Number(a.ownedZones) || 0;
        this.totalZones = Number(a.totalZones) || 0;
        this.warehouseOpen = a.warehouseOpen !== false;
        this.hasMansion = !!a.hasMansion;
        this.hasCaptTab = a.hasCaptTab !== false;
        this.hasGarageTab = !!a.hasGarageTab;
        this.canInvite = !!a.canInvite;
        this.canUninvite = !!a.canUninvite;
        this.canManageRanks = !!a.canManageRanks;
        this.canWithdrawMoney = !!a.canWithdrawMoney;
        this.canWarehouse = !!a.canWarehouse;
        this.canCapt = !!a.canCapt;
        this.isOwner = !!a.isOwner;
        this.isLeader = !!a.isLeader;
        this.permissions = a.permissions || {
            isLeader: this.isLeader,
            changeRank: this.canManageRanks,
            unInvite: this.canUninvite
        };
        this.rankNameList = Array.isArray(a.rankNameList) ? a.rankNameList.slice() : [];
        this.rankPermissions = Array.isArray(a.rankPermissions) ? a.rankPermissions.map(function (p) { return (p || []).slice(); }) : [];
        this.rankAllPermissions = Array.isArray(a.rankAllPermissions) ? a.rankAllPermissions.slice() : [];
        this.members = Array.isArray(a.members) ? a.members.slice() : [];
        this.membersCount = this.members.length;
        this.membersOnline = this.members.filter(function (m) { return m.isOnline || m.online; }).length;
        this.fleet = Array.isArray(a.fleet) ? a.fleet.slice() : [];
        this.fleetPlate = a.fleetPlate || "FAMILY";
        this.fleetColorIdx = Number(a.fleetColorIdx) || 0;
        this.fleetCanSave = !!a.fleetCanSave;
        this.zones = a.zones || {};
        this.zoneBattle = a.zoneBattle || {};
        this.ratingList = Array.isArray(a.ratingList) ? a.ratingList.slice() : [];
        this.logsList = Array.isArray(a.logsList) ? a.logsList.slice() : [];
        this.rankEdit = { rank: "", index: 0, permissions: [] };
    },
    close: function () {},
    mounted: function () {}
});
