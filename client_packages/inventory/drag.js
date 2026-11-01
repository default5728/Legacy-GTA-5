(function () {
    const panels = [];
    window.enablePanelDrag = function (panel, handle, scaleProvider) {
        let x = 0, y = 0, drag = null;
        const scale = scaleProvider || function () { return 1; };
        handle.style.cursor = 'grab';
        handle.style.touchAction = 'none';
        handle.title = 'Потяните за заголовок, чтобы переместить. Двойной щелчок — вернуть на место.';
        function place() {
            panel.style.setProperty('--drag-x', x + 'px');
            panel.style.setProperty('--drag-y', y + 'px');
        }
        function reset() { x = 0; y = 0; place(); }
        function finish() { drag = null; handle.style.cursor = 'grab'; }
        handle.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 || event.target.closest('button, input, a')) return;
            const bounds = panel.getBoundingClientRect();
            const scroll = panel.parentElement && panel.parentElement.closest('.modal-content-scroll');
            const area = scroll ? scroll.getBoundingClientRect() : {left:0, top:0, right:window.innerWidth, bottom:window.innerHeight};
            drag = {clientX:event.clientX, clientY:event.clientY, x:x, y:y, bounds:bounds, area:area};
            handle.setPointerCapture(event.pointerId);
            handle.style.cursor = 'grabbing';
            event.preventDefault();
        });
        handle.addEventListener('pointermove', function (event) {
            if (!drag) return;
            const dx = Math.max(drag.area.left - drag.bounds.left, Math.min(drag.area.right - drag.bounds.right, event.clientX - drag.clientX));
            const dy = Math.max(drag.area.top - drag.bounds.top, Math.min(drag.area.bottom - drag.bounds.bottom, event.clientY - drag.clientY));
            x = drag.x + dx / scale(); y = drag.y + dy / scale(); place();
        });
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
        handle.addEventListener('dblclick', function(event) {
            if (!event.target.closest('button, input, a')) reset();
        });
        panels.push(reset);
    };
    window.addEventListener('resize', function () { panels.forEach(function (reset) { reset(); }); });
}());
