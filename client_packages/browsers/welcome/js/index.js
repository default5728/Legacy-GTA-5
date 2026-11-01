(function () {
    var LOADER_MS = 3000;
    var FLY_MS = 3000;
    var started = false;

    function triggerClient(eventName, arg) {
        try {
            if (typeof mp !== 'undefined' && typeof mp.trigger === 'function') {
                if (arguments.length > 1) mp.trigger(eventName, arg);
                else mp.trigger(eventName);
            }
        } catch (e0) {}
    }

    function finishToAuth() {
        document.body.classList.add('fade-out-exit');
        setTimeout(function () {
            triggerClient('welcomeIntro_auth');
        }, 480);
    }

    function startFlyPhase() {
        var loader = document.getElementById('loader');
        if (loader) {
            loader.classList.remove('visible');
            loader.classList.add('hidden');
            loader.style.display = 'none';
        }
        var fly = document.getElementById('phaseFly');
        if (fly) {
            fly.setAttribute('aria-hidden', 'false');
            fly.classList.add('phase-fly--active');
        }
        triggerClient('welcomeIntro_cameraFly');
        setTimeout(finishToAuth, FLY_MS);
    }

    function runLoader() {
        var loader = document.getElementById('loader');
        var barFill = document.getElementById('barFill');
        var pctLabel = document.getElementById('pctLabel');
        if (!loader || !barFill || !pctLabel) {
            startFlyPhase();
            return;
        }
        loader.classList.remove('hidden');
        loader.style.display = 'block';
        requestAnimationFrame(function () {
            loader.classList.add('visible');
        });

        var t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

        function tick(now) {
            var t = (typeof performance !== 'undefined' ? now : Date.now()) - t0;
            var u = Math.min(1, t / LOADER_MS);
            var p = Math.round(u * 100);
            barFill.style.width = p + '%';
            pctLabel.textContent = p + '%';
            if (u < 1) requestAnimationFrame(tick);
            else {
                barFill.style.width = '100%';
                pctLabel.textContent = '100%';
                setTimeout(startFlyPhase, 140);
            }
        }
        requestAnimationFrame(tick);
    }

    function onStart() {
        if (started) return;
        started = true;
        var intro = document.getElementById('intro');
        if (intro) intro.classList.add('fade-out');
        setTimeout(runLoader, 300);
    }

    document.addEventListener('keydown', onStart);
    document.addEventListener('mousedown', onStart);
})();
