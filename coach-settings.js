// Loaded in the head so disabled coaching never flashes during startup.
(function (root) {
    'use strict';
    const key = 'achilles_coach_enabled';
    let enabled = true;
    try { enabled = localStorage.getItem(key) !== 'false'; } catch (_) {}

    function apply() {
        document.documentElement.setAttribute('data-coach-enabled', String(enabled));
        const toggle = document.getElementById('coach-enabled-toggle');
        if (toggle) toggle.checked = enabled;
        const status = document.getElementById('coach-settings-status');
        if (status) status.textContent = enabled ? 'Увімкнено' : 'Вимкнено';
    }

    root.Achilles = root.Achilles || {};
    root.Achilles.coach = {
        isEnabled: () => enabled,
        setEnabled(value) {
            const next = Boolean(value);
            try { localStorage.setItem(key, String(next)); }
            catch (_) {
                apply();
                const status = document.getElementById('coach-settings-status');
                if (status) status.textContent = 'Не вдалося зберегти налаштування. Спробуй ще раз.';
                return false;
            }
            enabled = next;
            apply();
            root.dispatchEvent(new CustomEvent('achilles:coach-changed', { detail: { enabled } }));
            return true;
        }
    };
    apply();
    document.addEventListener('DOMContentLoaded', apply, { once: true });
    root.addEventListener('storage', event => {
        if (event.key !== key && event.key !== null) return;
        try { enabled = localStorage.getItem(key) !== 'false'; } catch (_) { return; }
        apply();
        root.dispatchEvent(new CustomEvent('achilles:coach-changed', { detail: { enabled } }));
    });
})(window);
