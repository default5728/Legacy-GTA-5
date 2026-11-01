var preventSelection = true;
var enablePreventSelection = true;

function addHandler(element, event, handler) {

    if (element.attachEvent) {

        element.attachEvent('on' + event, handler);
    } else if (element.addEventListener) {

        element.addEventListener(event, handler, false);
    }
};

function removeSelection() {

    if (!enablePreventSelection) return;

    if (window.getSelection) {

        window.getSelection().removeAllRanges(); 
    }
    else if (document.selection && document.selection.clear) document.selection.clear();
};

function killCtrlA(event) {

    if (!enablePreventSelection) return;

    var event = event || window.event;
    var sender = event.target || event.srcElement;

    if (sender.tagName.match(/INPUT|TEXTAREA/i)) return;

    var key = event.keyCode || event.which;
    if (event.ctrlKey && key == 'A'.charCodeAt(0)) {

        removeSelection();

        if (event.preventDefault) event.preventDefault();
        else event.returnValue = false;
    }
};

addHandler(document, 'mousemove', function() {

    if(preventSelection) removeSelection();
});
  
addHandler(document, 'mousedown', function(event) {

    var event = event || window.event;
    var sender = event.target || event.srcElement;

    preventSelection = !sender.tagName.match(/INPUT|TEXTAREA/i);
});

addHandler(document, 'mouseup', function() {

    if (preventSelection) removeSelection();

    preventSelection = false;
});

addHandler(document, 'keydown', killCtrlA);
addHandler(document, 'keyup', killCtrlA);