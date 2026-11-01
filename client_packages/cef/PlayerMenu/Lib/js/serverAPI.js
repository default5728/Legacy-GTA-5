function pmNormalizeRpcResult(c) {
    if (c == null) return c;
    if (typeof c === 'object' && (c.error === 1 || c.error === true)) {
        throw c.errorText || c.message || 'Ошибка';
    }
    if (typeof c === 'object' && Object.prototype.hasOwnProperty.call(c, 'data') &&
        (c.error === 0 || c.error === false || c.error == null)) {
        return c.data;
    }
    return c;
}

const serverAPI = {
    get: function (a, b, c, d) {
        rpc.callServer(a, b).then(function (res) {
            try {
                c(pmNormalizeRpcResult(res));
            } catch (e) {
                d(e);
            }
        }).catch(function (e) {
            d(e);
        });
    },
    getAsync: async function (a, b) {
        try {
            const res = await rpc.callServer(a, b);
            return pmNormalizeRpcResult(res);
        } catch (e) {
            throw `${e}`;
        }
    },
    send: function (a, b) {
        rpc.triggerServer(a, b);
    },
    triggerRemote: function (a, ...b) {
        mp.trigger('__call_remote_event', a, ...b);
    },
    callApiAsync: async function (a, ...b) {
        return await rpc.callClient('api.' + a, b);
    },
    getApiAsync: async function (a, b) {
        try {
            const res = await rpc.callClient(a, b);
            return pmNormalizeRpcResult(res);
        } catch (e) {
            throw `${e}`;
        }
    },
    isChatOpenAsync: async function () {
        return await rpc.callClient('client_getGlobalValue', 'isChatOpen');
    },
    getGlobalValueAsync: async function (a) {
        return await rpc.callClient('client_getGlobalValue', a);
    },
    setGlobalValueAsync: async function (a, b) {
        return rpc.triggerClient('client_setGlobalValue', [a, b]);
    },
    notifyError: function (a) {
        rpc.triggerClient('clientFunc_notifyError', a);
    },
    notifySuccess: function (a) {
        rpc.triggerClient('clientFunc_notifySuccess', a);
    },
    currencyFormat: function (a) {
        function b(a, b) {
            const c = ('string' == typeof a ? a : a.toString()).split('.');
            if (0 >= b) return c[0];
            let d = c[1] || '';
            if (d.length > b) return `${c[0]}.${d.substr(0, b)}`;
            for (; d.length < b;) d += '0';
            return `${c[0]}.${d}`;
        }
        if ('' == a || isNaN(a)) return '0';
        let c = parseInt(a);
        let d = c / 1e6;
        if (2 < d) return b(d, 2) + 'M';
        let e = c / 1e3;
        return 0 < Math.floor(e) ? b(e, 1) + 'K' : c;
    },
    currencyFormatSpace: function (a) {
        return a.toString().split('').reverse().reduce(function (a, b, c) {
            return '-' == b ? a : b + (c && !(c % 3) ? ' ' : '') + a;
        }, '');
    }
};

if (typeof rpc === 'undefined') {
    window.MP_TEST = true;
    window.mp = { invoke() {} };
    window.rpc = {
        on() {},
        triggerServer() {},
        triggerClient() {},
        register() {},
        callServer() {},
        callClient() {}
    };
}
