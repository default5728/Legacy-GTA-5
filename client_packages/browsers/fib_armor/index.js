(function () {
    const V4_PRICE_DP = 500;
    const VARIANTS = [
        { idx: 0, name: 'Вариант 1', free: true, cls: 'cs-card--v1' },
        { idx: 1, name: 'Вариант 2', free: true, cls: 'cs-card--v2' },
        { idx: 2, name: 'Вариант 3', free: true, cls: 'cs-card--v3' },
        { idx: 3, name: 'Вариант 4', free: false, cls: 'cs-card--v4', priceDp: V4_PRICE_DP }
    ];

    const root = document.getElementById('root');
    const grid = document.getElementById('grid');
    const payBar = document.getElementById('payBar');
    const btnClose = document.getElementById('btnClose');
    const btnAction = document.getElementById('btnAction');
    const confirmV4 = document.getElementById('confirmV4');
    const confirmPrice = document.getElementById('confirmPrice');
    const btnConfirmCancel = document.getElementById('btnConfirmCancel');
    const btnConfirmBuy = document.getElementById('btnConfirmBuy');

    let selectedIdx = 0;
    let v4Unlocked = false;

    function formatDp(value) {
        return String(Number(value) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DP';
    }

    function selectedVariant() {
        for (let i = 0; i < VARIANTS.length; i++) {
            if (VARIANTS[i].idx === selectedIdx) return VARIANTS[i];
        }
        return null;
    }

    function needsPurchase(variant) {
        return !!(variant && variant.idx === 3 && !v4Unlocked);
    }

    function updateActionButton() {
        if (!payBar || !btnAction) return;
        const variant = selectedVariant();
        if (!variant) {
            payBar.hidden = true;
            return;
        }
        payBar.hidden = false;
        btnAction.classList.remove('green', 'purple');
        if (needsPurchase(variant)) {
            btnAction.classList.add('purple');
            btnAction.textContent = 'Купить';
        } else {
            btnAction.classList.add('green');
            btnAction.textContent = 'Выбрать';
        }
    }

    function renderGrid() {
        grid.innerHTML = VARIANTS.map(function (variant) {
            const activeClass = variant.idx === selectedIdx ? ' active' : '';
            const priceLabel = variant.idx !== 3 || v4Unlocked
                ? 'Бесплатно'
                : formatDp(variant.priceDp || V4_PRICE_DP);
            const priceClass = variant.idx !== 3 || v4Unlocked ? 'is-free' : 'is-dp';
            return (
                '<div class="cs-card ' + variant.cls + activeClass + '" data-idx="' + variant.idx + '">' +
                    '<div class="cs-card__badge yk-text w-7 s-12">' + (variant.idx + 1) + '</div>' +
                    '<div class="cs-card__img-wrap">' +
                        '<img class="cs-card__img" src="package://browsers/inventory/img/armor.svg" alt="' + variant.name + '">' +
                    '</div>' +
                    '<div class="cs-card__name yk-text w-7 s-14">' + variant.name + '</div>' +
                    '<div class="cs-card__price-wrap">' +
                        '<button type="button" class="cs-card__price-btn ' + priceClass + '" tabindex="-1">' + priceLabel + '</button>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        grid.querySelectorAll('.cs-card').forEach(function (card) {
            card.addEventListener('click', function () {
                selectedIdx = Number(card.dataset.idx);
                grid.querySelectorAll('.cs-card').forEach(function (item) {
                    item.classList.toggle('active', Number(item.dataset.idx) === selectedIdx);
                });
                updateActionButton();
            });
        });

        updateActionButton();
    }

    function closeConfirm() {
        if (confirmV4) confirmV4.hidden = true;
    }

    function pickVariant(idx) {
        try {
            if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('fibArmorPick', idx);
        } catch (_e) {}
    }

    function hideUiOnly() {
        closeConfirm();
        if (root) root.classList.remove('open');
    }

    function hide() {
        hideUiOnly();
        try {
            if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('fibArmorClose');
        } catch (_e) {}
    }

    function onActionClick() {
        const variant = selectedVariant();
        if (!variant) return;
        if (needsPurchase(variant)) {
            if (confirmPrice) confirmPrice.textContent = formatDp(V4_PRICE_DP);
            if (confirmV4) confirmV4.hidden = false;
            return;
        }
        pickVariant(variant.idx);
    }

    if (!root || !grid) return;

    window.fibArmorSetV4Unlocked = function (unlocked) {
        v4Unlocked = !!unlocked;
        renderGrid();
    };

    window.show = function () {
        renderGrid();
        root.classList.add('open');
    };

    window.hideUiOnly = hideUiOnly;
    window.hide = hide;

    if (btnClose) btnClose.addEventListener('click', hide);
    if (btnAction) btnAction.addEventListener('click', onActionClick);
    if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', closeConfirm);
    if (btnConfirmBuy) {
        btnConfirmBuy.addEventListener('click', function () {
            closeConfirm();
            pickVariant(3);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (!root.classList.contains('open')) return;
        if (e.key !== 'Escape') return;
        if (confirmV4 && !confirmV4.hidden) {
            closeConfirm();
            return;
        }
        hide();
    });

    renderGrid();
})();
