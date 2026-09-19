/* ===== achilles-v10-pwa ===== */

(function(){
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js?v=10.18.5', { scope: './', updateViaCache: 'none' });
            reg.addEventListener('updatefound', () => {
                const worker = reg.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.Achilles?.toast?.('Оновлення Achilles готове — відкрий додаток ще раз', 'fa-arrows-rotate', 3600);
                    }
                });
            });
        } catch (error) {
            console.info('[Achilles PWA] service worker unavailable', error);
        }
    }, { once:true });
})();

