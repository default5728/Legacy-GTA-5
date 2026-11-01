/* Blood: stubs before MenuManager so scripts never crash on missing rpc */
(function () {
    if (typeof window.rpc === 'undefined') window.rpc = {};
    var r = window.rpc;
    if (typeof r.register !== 'function') r.register = function () { return Promise.resolve('ok'); };
    if (typeof r.callServer !== 'function') r.callServer = function () { return Promise.resolve('ok'); };
    if (typeof r.callClient !== 'function') r.callClient = function () { return Promise.resolve('ok'); };
    if (typeof r.callBrowsers !== 'function') r.callBrowsers = function () { return Promise.resolve('ok'); };
    if (typeof r.on !== 'function') r.on = function () {};
    if (typeof r.off !== 'function') r.off = function () {};
    if (typeof r.trigger !== 'function') r.trigger = function () {};

    window.__famPending = null;
    window.FamApp = window.FamApp || {
        open: function (payload) {
            window.__famPending = payload;
        },
        close: function () {},
        tab: function () {},
        setMembers: function () {},
        setMyRank: function () {},
        setPoints: function () {},
        setZones: function () {},
        setRating: function () {},
        setLogs: function () {},
        setBalance: function () {},
        setWarehouseOpen: function () {},
        setFleet: function () {},
        openBizwar: function () {},
        closeBizwar: function () {},
        patchPoint: function () {},
        setZoneBattleFlash: function () {},
        refreshMembers: function () {},
        requestLogs: function () {},
        requestRating: function () {},
        requestZones: function () {},
        saveAdvert: function () {},
        sendAdvert: function () {},
        saveRanks: function () {},
        depositBalance: function () {},
        withdrawBalance: function () {},
        toggleWarehouse: function () {},
        openRankPicker: function () {},
        kickMember: function () {},
        inviteMember: function () {},
        leaveFamily: function () {},
        fleetEvac: function () {},
        fleetSummon: function () {},
        clickZone: function () {},
        _closeConfirmModal: function () {},
        _closeRankPickModal: function () {}
    };
})();
