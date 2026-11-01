// ─── Landing (выбор тату / макияж) ───────────────────────────────────────────
let EmsLanding = new Vue({
    el: '#EmsLanding',
    data: { Active: 1 },
    methods: {
        go: function(screen) {
            this.Active = 0;
            if (screen === 'tattoo') {
                EMSTattoo.Active = 1;
                mp.trigger('ems:tattoo:open:c');
            } else {
                EMSMakeup.Active = 1;
                mp.trigger('ems:makeup:open:c');
            }
        },
        close: function() { mp.trigger('ems:close'); }
    }
});

// ─── Tattoo screen ────────────────────────────────────────────────────────────
let EMSTattoo = new Vue({
    el: '#TattooClearAlert',
    data: { Active: 0, tattoos: [] },
    methods: {
        back: function() {
            this.Active = 0;
            EmsLanding.Active = 1;
        },
        removeOne: function(i) { mp.trigger('ems:tattoo:removeOne:c', i); },
        removeAll: function()  { mp.trigger('ems:tattoo:accept:c'); }
    }
});

window.__emsTattoosUpdate = function(tattoos) {
    if (!EMSTattoo || !Array.isArray(tattoos)) return;
    EMSTattoo.tattoos = tattoos;
};

// ─── Makeup screen ────────────────────────────────────────────────────────────
let EMSMakeup = new Vue({
    el: '#MakeupClearAlert',
    data: { Active: 0, makeups: [] },
    methods: {
        back: function() {
            this.Active = 0;
            EmsLanding.Active = 1;
        },
        removeOne: function(i) { mp.trigger('ems:makeup:removeOne:c', i); },
        closePanel: function() { mp.trigger('ems:close'); }
    }
});

window.__emsMakeupUpdate = function(makeups) {
    if (!EMSMakeup || !Array.isArray(makeups)) return;
    EMSMakeup.makeups = makeups;
};

// ─── RNK ─────────────────────────────────────────────────────────────────────
let unRNK = new Vue({
    el: '#unRNK',
    data: { Active: 0, RNKAddiction: 0 },
    methods: {
        cancel: function()       { mp.trigger('EMSCancelUnRNK'); },
        startClearRNK: function(){ mp.trigger('EMSstartClearRNK'); }
    }
});
