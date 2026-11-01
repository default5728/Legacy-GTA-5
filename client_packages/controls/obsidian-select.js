/* Mouse-only dropdowns preserve native values, option metadata and change listeners. */
(() => {
    'use strict';
    const controls = new Map();
    let opened = null;
    function close() {
        if (!opened) return;
        opened.button.setAttribute('aria-expanded', 'false');
        opened.menu.remove();
        opened = null;
    }
    function refresh(select, button) {
        if (button.tagName === 'INPUT') {
            if (select.selectedOptions.length) button.value = select.selectedOptions[0].value;
            return;
        }
        button.textContent = select.selectedOptions.length ? select.selectedOptions[0].textContent : 'Выберите значение';
        button.disabled = select.disabled || !select.options.length;
    }
    function open(select, button) {
        const wasOpen = opened && opened.button === button;
        close();
        if (wasOpen || button.disabled) return;
        const menu = document.createElement('div');
        menu.className = 'obsidian-options';
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', button.getAttribute('aria-label'));
        let lastGroup = null;
        Array.from(select.options).forEach(option => {
            if (option.hidden) return;
            const group = option.parentElement.tagName === 'OPTGROUP' ? option.parentElement : null;
            if (group && group !== lastGroup) {
                const heading = document.createElement('div');
                heading.className = 'obsidian-option-group';
                heading.textContent = group.label;
                menu.append(heading);
            }
            lastGroup = group;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'obsidian-option';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(option.selected));
            item.textContent = option.textContent;
            item.disabled = option.disabled || Boolean(group && group.disabled);
            item.addEventListener('click', event => {
                if (event.button !== 0 || item.disabled) return;
                select.selectedIndex = option.index;
                close();
                refresh(select, button);
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.append(item);
        });
        document.body.append(menu);
        const rect = button.getBoundingClientRect();
        // Keep a downward opening list inside the viewport, including short screens.
        const top = Math.min(rect.bottom + 6, window.innerHeight - 72);
        Object.assign(menu.style, {
            top: top + 'px', left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)) + 'px',
            width: Math.min(rect.width, window.innerWidth - 16) + 'px',
            maxHeight: Math.max(48, Math.min(320, window.innerHeight - top - 12)) + 'px'
        });
        opened = { select, button, menu };
        button.setAttribute('aria-expanded', 'true');
    }
    function enhance() {
        if (opened && !opened.button.isConnected) close();
        controls.forEach((button, select) => {
            if (!select.isConnected) { if (opened && opened.select === select) close(); button.remove(); controls.delete(select); }
        });
        // Editable model fields retain free entry, but suggestions use the same mouse-only list.
        document.querySelectorAll('input[list]').forEach(input => {
            const libraryId = input.getAttribute('list');
            input.removeAttribute('list');
            input.dataset.obsidianModel = libraryId;
            const wrap = document.createElement('div');
            wrap.className = 'obsidian-model-field';
            input.before(wrap);
            wrap.append(input);
            const arrow = document.createElement('button');
            arrow.type = 'button';
            arrow.className = 'obsidian-model-toggle';
            arrow.textContent = '\u2304';
            arrow.setAttribute('aria-label', '\u041c\u043e\u0434\u0435\u043b\u0438');
            arrow.disabled = input.disabled;
            wrap.append(arrow);
            const suggest = filter => {
                if (input.disabled) return;
                const library = document.getElementById(libraryId);
                if (!library) return;
                const proxy = document.createElement('select');
                const term = filter ? input.value.toLowerCase() : '';
                Array.from(library.options).filter(o => o.value.toLowerCase().includes(term)).forEach(o => proxy.add(new Option(o.value, o.value)));
                proxy.value = input.value;
                proxy.addEventListener('change', () => {
                    input.dispatchEvent(new Event('input', { bubbles:true }));
                    input.dispatchEvent(new Event('change', { bubbles:true }));
                });
                close();
                open(proxy, input);
            };
            arrow.addEventListener('click', () => suggest(false));
            input.addEventListener('click', () => suggest(false));
            input.addEventListener('input', event => { if (event.isTrusted) suggest(true); });
        });
        document.querySelectorAll('select:not([multiple])').forEach(select => {
            if (controls.has(select)) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'obsidian-choice';
            button.setAttribute('aria-haspopup', 'listbox');
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', select.getAttribute('aria-label') || select.closest('label')?.childNodes[0]?.textContent.trim() || 'Выбор');
            select.dataset.obsidianSelect = 'true';
            select.tabIndex = -1;
            select.after(button);
            controls.set(select, button);
            refresh(select, button);
            button.addEventListener('click', event => { if (event.button === 0) open(select, button); });
            select.addEventListener('change', () => refresh(select, button));
            new MutationObserver(() => { refresh(select, button); if (opened && opened.select === select) close(); }).observe(select, { childList:true, subtree:true, attributes:true, characterData:true });
        });
    }
    document.addEventListener('pointerdown', event => {
        if (opened && !opened.menu.contains(event.target) && !opened.button.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        const choice = event.target.closest('.obsidian-choice,.obsidian-options,select[data-obsidian-select],input[data-obsidian-model]');
        if (choice && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Enter',' '].includes(event.key)) {
            event.preventDefault(); event.stopImmediatePropagation();
        }
        if (opened && event.key === 'Escape') { close(); event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    // Consume wheel input in the nearest scrollable region, even at its boundaries.
    // A short RAF interpolation replaces wheel chaining and smooths high-resolution mice.
    const motion = new WeakMap();
    document.addEventListener('wheel', event => {
        let node = event.target.nodeType === 1 ? event.target : event.target.parentElement;
        while (node && node !== document.body) {
            const style = getComputedStyle(node);
            if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) break;
            node = node.parentElement;
        }
        if (!node || node === document.body) return;
        event.preventDefault(); event.stopPropagation();
        let state = motion.get(node);
        if (!state) { state = { target:node.scrollTop, frame:0 }; motion.set(node,state); }
        const delta = event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? node.clientHeight : 1);
        if (!state.frame) state.target = node.scrollTop;
        state.target = Math.max(0, Math.min(node.scrollHeight - node.clientHeight, state.target + delta));
        if (state.frame) return;
        const step = () => {
            const distance = state.target - node.scrollTop;
            if (!node.isConnected || Math.abs(distance) < 1) { node.scrollTop = state.target; state.frame = 0; return; }
            const before = node.scrollTop;
            node.scrollTop += distance * .35;
            if (node.scrollTop === before) { state.frame = 0; return; }
            state.frame = requestAnimationFrame(step);
        };
        state.frame = requestAnimationFrame(step);
    }, { passive:false });
    document.addEventListener('scroll', event => { if (opened && !opened.menu.contains(event.target)) close(); }, true);
    window.addEventListener('resize', close);
    new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
    enhance();
    // Programmatic .value assignments do not generate DOM mutations.
    setInterval(() => controls.forEach((button, select) => refresh(select, button)), 300);
})();
