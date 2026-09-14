/* ===== inline-script-4 ===== */

        /* Viewport controller.
           На iOS Home Screen НЕ фіксуємо висоту через window.innerHeight: WebKit може
           повертати занижену висоту й залишати системну смугу знизу. Для standalone
           використовуємо 100vh; у звичайному браузері лишаємо innerHeight workaround. */
        (function () {
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isStandalone = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

            if (isIOS && isStandalone) {
                document.documentElement.classList.add('ios-standalone');
                document.documentElement.style.setProperty('--app-height', '100vh');
                return;
            }

            let lastHeight = 0;
            let rafId = 0;
            function applyAppHeight() {
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(function () {
                    const h = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
                    if (h > 0 && h !== lastHeight) {
                        lastHeight = h;
                        document.documentElement.style.setProperty('--app-height', h + 'px');
                    }
                });
            }

            applyAppHeight();
            window.addEventListener('resize', applyAppHeight, { passive: true });
            window.addEventListener('orientationchange', function () {
                setTimeout(applyAppHeight, 120);
                setTimeout(applyAppHeight, 420);
            }, { passive: true });
            window.addEventListener('pageshow', applyAppHeight, { passive: true });
        })();
    

/* ===== inline-script-5 ===== */

        /* Легка оптимізація UI під плавніші анімації та перемикання вкладок. */
        (function () {
            document.addEventListener('visibilitychange', function () {
                const root = document.documentElement;
                if (!root) return;
                root.style.setProperty('--theme-speed', document.hidden ? '18s' : '10s');
            }, { passive: true });
        })();
    

/* ===== achilles-premium-boot ===== */

(function () {
    'use strict';

    const body = document.body;
    if (body) body.classList.add('app-booting');

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    async function runSplash() {
        const splash = document.getElementById('splash-screen');
        if (!splash) {
            body?.classList.remove('app-booting');
            body?.classList.add('app-ready', 'boot-finished');
            return;
        }

        splash.style.display = 'grid';
        splash.classList.remove('hidden', 'v1013-finished');
        await nextFrame();

        if (reduceMotion) {
            splash.classList.add('v1013-logo-visible');
            await wait(180);
            body?.classList.add('app-ready');
            splash.classList.add('v1013-finished');
            body?.classList.remove('app-booting');
            body?.classList.add('boot-finished');
            setTimeout(() => { splash.style.display = 'none'; }, 260);
            return;
        }

        // Both strikes are CSS-composited. Browser can render them at the display refresh rate
        // (up to 120 Hz on ProMotion hardware) without a JavaScript animation loop.
        splash.classList.add('v1013-running');
        await wait(330);
        splash.classList.add('v1013-impact');
        try { window.Achilles?.haptics?.tap?.(); } catch (_) {}

        await wait(105);
        splash.classList.add('v1013-logo-visible');
        await wait(330);
        splash.classList.add('v1013-bolts-out');

        // Let the emblem breathe for a moment, then reveal the app under it.
        await wait(300);
        body?.classList.add('app-ready');
        await wait(160);
        splash.classList.add('v1013-finished');
        body?.classList.remove('app-booting');
        body?.classList.add('boot-finished');
        setTimeout(() => { splash.style.display = 'none'; }, 420);
    }

    document.addEventListener('DOMContentLoaded', runSplash, { once: true });
})();

