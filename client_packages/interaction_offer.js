/**
 * Входящие предложения (обмен / деньги / кости / семья): ответ по клавишам Y / N.
 * Показываем стилизованную капсулу-окно (browsers/offer_prompt) с заголовком и текстом.
 */
(function () {
    let interactionActive = false;
    let offerBrowser = null;

    function ensureOfferBrowser() {
        if (offerBrowser) return offerBrowser;
        try {
            offerBrowser = mp.browsers.new('package://browsers/offer_prompt/index.html');
            offerBrowser.active = true;
        } catch (_e) {}
        return offerBrowser;
    }

    function showOffer(title, text) {
        const br = ensureOfferBrowser();
        if (!br) return;
        const safeT = String(title || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeB = String(text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        try { br.execute(`show('${safeT}','${safeB}')`); } catch (_e) {}
    }

    function hideOffer() {
        if (!offerBrowser) return;
        try { offerBrowser.execute('hide()'); } catch (_e) {}
    }

    /** Сервер шлёт это с (title?, text?). Старые вызовы без аргументов тоже поддержаны. */
    mp.events.add('interactionOfferStart', (title, text) => {
        interactionActive = true;
        if (title || text) showOffer(title, text);
    });

    mp.events.add('interactionOfferClear', () => {
        interactionActive = false;
        hideOffer();
    });

    /** Семейные приглашения тоже вешаем на тот же UI: показ при getVariable('inv'). */
    function hasFamilyInvite() {
        try {
            const inv = mp.players.local.getVariable('inv');
            return inv != null && inv !== '' && inv !== false;
        } catch (_e) {
            return false;
        }
    }

    function canRespond() {
        return (
            (interactionActive || hasFamilyInvite()) &&
            !mp.players.local.isTypingInTextChat &&
            !mp.game.ui.isPauseMenuActive() &&
            mp.players.local.getVariable('auth')
        );
    }

    /** Y */
    global.bindGameplayKey(0x59, true, () => {
        if (!canRespond()) return;
        if (hasFamilyInvite()) {
            interactionActive = false;
            hideOffer();
            mp.events.callRemote('otvetfam:server', 'yes');
            return;
        }
        interactionActive = false;
        hideOffer();
        mp.events.callRemote('interaction:respond:s', 1);
    });

    /** N */
    global.bindGameplayKey(0x4e, true, () => {
        if (!canRespond()) return;
        if (hasFamilyInvite()) {
            interactionActive = false;
            hideOffer();
            mp.events.callRemote('otvetfam:server', 'no');
            return;
        }
        interactionActive = false;
        hideOffer();
        mp.events.callRemote('interaction:respond:s', 0);
    });
})();
