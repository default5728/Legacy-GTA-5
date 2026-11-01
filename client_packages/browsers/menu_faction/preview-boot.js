(function () {
    if (typeof mp === 'undefined') {
        window.mp = { trigger: function () {} };
    }

    var isPreview = /(?:\?|&)preview=1(?:&|$)/.test(String(location.search || ''));
    if (!isPreview) return;

    window.__FACTION_PREVIEW = true;

    function paintBg() {
        document.documentElement.style.background = '#0b1220';
        document.body.style.background = '#0b1220';
        document.body.style.minHeight = '100vh';
    }

    document.addEventListener('DOMContentLoaded', paintBg);

    var now = Math.floor(Date.now() / 1000);
    var DEMO = {
        permissions: {
            isLeader: true,
            changeRank: true,
            unInvite: true,
            warehouseAccess: true
        },
        news: [
            { title: 'Сбор на капт', text: 'Сегодня в 21:00 сбор у базы. Форма обязательна.', date: '15.08.2026 21:00' },
            { title: 'Склад', text: 'Не таскать лишние патроны. Наборы выдаём по рангу.', date: '14.08.2026 18:30' }
        ],
        notify: { text: 'Не флудить в /f. Нарушения — выговор.', leader: 'Absolute' },
        members: [
            ['Absolute_(#1)', true, 10, now - 120],
            ['Vesper_(#14)', true, 8, now - 3600],
            ['Riko_(#22)', true, 5, now - 7200],
            ['Ghost_(#31)', false, 3, now - 86400],
            ['Nova_(#44)', false, 1, now - 172800]
        ],
        vehList: [
            { id: 1, number: 'LCN 001', rank: 5, rankName: 'Солдат', pos: [100, 200] },
            { id: 2, number: 'LCN 002', rank: 8, rankName: 'Капо', pos: [110, 210] }
        ],
        warehouseCloseStatus: false,
        bank: 2450000,
        rankPermissions: [
            [],
            [],
            ['warehouseAccess'],
            ['warehouseAccess'],
            ['warehouseAccess', 'canInvite'],
            ['warehouseAccess', 'canInvite', 'canDismiss'],
            ['warehouseAccess', 'canInvite', 'canDismiss', 'bizwar'],
            ['warehouseAccess', 'canInvite', 'canDismiss', 'bizwar', 'changeRank'],
            ['warehouseAccess', 'canInvite', 'canDismiss', 'bizwar', 'changeRank', 'withdrawMoney'],
            ['changeRank', 'warehouseAccess', 'bizwar', 'withdrawMoney', 'craftAccess', 'canInvite', 'canDismiss']
        ],
        rankAllPermissions: [
            { code: 'changeRank', name: 'Изменять ранги' },
            { code: 'warehouseAccess', name: 'Доступ к складу' },
            { code: 'bizwar', name: 'Бизвары' },
            { code: 'withdrawMoney', name: 'Снимать деньги' },
            { code: 'craftAccess', name: 'Крафт оружия' },
            { code: 'canInvite', name: 'Приглашать' },
            { code: 'canDismiss', name: 'Увольнять' }
        ],
        rankNameList: [
            'Новичок', 'Проверенный', 'Боец', 'Солдат', 'Старший',
            'Офицер', 'Капо', 'Заместитель', 'Правая рука', 'Лидер'
        ],
        acrList: [
            [1, 'Заявка на вступление', 'Хочу в семью, играю 3 месяца.', 'Riko', '15.08.2026']
        ],
        weaponSetList: [
            { name: 'Лёгкий', rank: 3, timeout: 10, weaponList: [{ hash: 1, ammoCount: 60 }] },
            { name: 'Штурмовой', rank: 6, timeout: 15, weaponList: [{ hash: 2, ammoCount: 120 }] }
        ],
        weaponForSetList: [
            { name: 'Pistol', hash: 1, ammoCount: 12 },
            { name: 'SMG', hash: 2, ammoCount: 30 },
            { name: 'Carbine Rifle', hash: 3, ammoCount: 30 }
        ],
        weaponSetEnable: true
    };

    window.addEventListener('load', function () {
        paintBg();
        try {
            if (typeof rpc !== 'undefined' && rpc) {
                rpc.callServer = function (name) {
                    if (name === 'server_faction_manage_members_unInvite') return Promise.resolve({ error: 0 });
                    if (name === 'server_faction_manage_rank_setPermission') return Promise.resolve({ error: 0, data: true });
                    return Promise.resolve('ok');
                };
            }
            if (typeof serverAPI !== 'undefined' && serverAPI) {
                serverAPI.getAsync = function () { return Promise.resolve('ok'); };
                serverAPI.notifyError = function (m) { console.warn('[preview]', m); };
                serverAPI.notifySuccess = function (m) { console.log('[preview]', m); };
            }
        } catch (_e) {}
        try {
            if (typeof factionMenuOpen === 'function') factionMenuOpen(DEMO);
        } catch (e) {
            console.error('[preview] factionMenuOpen', e);
        }
    });
})();
