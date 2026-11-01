var preventSelection = true;
var enablePreventSelection = true;

function addHandler(element, event, handler, useCapture) {
    if (element.attachEvent) {
        element.attachEvent('on' + event, handler);
    } else if (element.addEventListener) {
        element.addEventListener(event, handler, !!useCapture);
    }
}

function isTextInput(sender) {
    if (!sender || !sender.tagName) return false;
    if (String(sender.tagName).match(/INPUT|TEXTAREA|SELECT/i)) return true;
    if (sender.isContentEditable) return true;
    return false;
}

function isInsideCasinoMenu(el) {
    var node = el;
    while (node) {
        if (node.id === 'casinoMenu') return true;
        node = node.parentElement;
    }
    return false;
}

function isSelectableText(sender) {
    if (isInsideCasinoMenu(sender)) return false;
    var el = sender;
    while (el) {
        if (el.classList && (
            el.classList.contains('allow-text-select') ||
            el.classList.contains('playerMenu-report-message') ||
            el.classList.contains('yk-input-block') ||
            el.classList.contains('yk-input')
        )) {
            return true;
        }
        if (isTextInput(el)) return true;
        el = el.parentElement;
    }
    return false;
}

function shouldPreventSelection(sender) {
    return enablePreventSelection && !isSelectableText(sender);
}

function removeSelection() {
    if (!enablePreventSelection) return;

    var active = document.activeElement;
    if (active && isTextInput(active)) return;

    if (window.getSelection) {
        var sel = window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } else if (document.selection && document.selection.clear) {
        document.selection.clear();
    }
}

function killCtrlA(event) {
    if (!enablePreventSelection) return;

    var ev = event || window.event;
    var sender = ev.target || ev.srcElement;
    if (isSelectableText(sender)) return;

    var key = ev.keyCode || ev.which;
    if ((ev.ctrlKey || ev.metaKey) && key === 'A'.charCodeAt(0)) {
        removeSelection();
        if (ev.preventDefault) ev.preventDefault();
        else ev.returnValue = false;
    }
}

function onSelectStart(event) {
    if (shouldPreventSelection(event.target || event.srcElement)) {
        event.preventDefault();
        return false;
    }
}

function onDragStart(event) {
    if (shouldPreventSelection(event.target || event.srcElement)) {
        event.preventDefault();
        return false;
    }
}

addHandler(document, 'mousedown', function (event) {
    var sender = event.target || event.srcElement;
    preventSelection = shouldPreventSelection(sender);
    if (preventSelection) removeSelection();
}, true);

addHandler(document, 'mouseup', function (event) {
    var sender = event.target || event.srcElement;
    if (shouldPreventSelection(sender)) removeSelection();
    preventSelection = false;
}, true);

addHandler(document, 'mousemove', function (event) {
    var sender = event.target || event.srcElement;
    if (isSelectableText(sender)) {
        preventSelection = false;
        return;
    }
    if (preventSelection) removeSelection();
});

addHandler(document, 'selectstart', onSelectStart, true);
addHandler(document, 'dragstart', onDragStart, true);
addHandler(document, 'keydown', killCtrlA, true);
addHandler(document, 'keyup', killCtrlA, true);
