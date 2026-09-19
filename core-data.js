/* ===== js-core-storage ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const LEGACY = A.storage || {};

    const KEYS = Object.freeze({
        schemaVersion: 'achilles_schema_version',
        user: 'achilles_user',
        profile: 'achilles_profile',
        allDays: 'achilles_all_days',
        legacyDaily: 'achilles_daily_data',
        macros: 'achilles_macros',
        baseKcal: 'achilles_base_kcal',
        appMode: 'achilles_app_mode',
        themeColor: 'achilles_theme_color',
        themeMode: 'achilles_theme_mode',
        weightHistory: 'achilles_weight_history',
        favFoods: 'achilles_fav_foods',
        customFoods: 'achilles_custom_foods',
        foodCache: 'achilles_food_cache_v2',
        foodRecent: 'achilles_food_recent_v1',
        syncQueue: 'achilles_sync_queue_v1',
        favWorkouts: 'achilles_fav_workouts',
        prs: 'achilles_prs',
        lastPR: 'achilles_last_pr'
    });

    function clone(value) {
        if (value === undefined) return undefined;
        try { return structuredClone(value); }
        catch (_) { return JSON.parse(JSON.stringify(value)); }
    }

    function safeJSON(raw, fallback) {
        if (raw === null || raw === undefined || raw === '') return clone(fallback);
        try { return JSON.parse(raw); }
        catch (error) {
            console.warn('[Achilles.storage] invalid JSON', error);
            return clone(fallback);
        }
    }

    function normalizeMacros(value) {
        const m = value && typeof value === 'object' ? value : {};
        return {
            p: Number(m.p || 0),
            f: Number(m.f || 0),
            c: Number(m.c || 0)
        };
    }

    function normalizeDay(value) {
        const d = value && typeof value === 'object' ? value : {};
        return {
            consumedCalories: Number(d.consumedCalories || 0),
            workoutBonus: Number(d.workoutBonus || 0),
            macros: normalizeMacros(d.macros),
            log: Array.isArray(d.log) ? d.log : [],
            nutritionComplete: d.nutritionComplete === true,
            updatedAt: Number(d.updatedAt || 0)
        };
    }

    A.storage = {
        ...LEGACY,
        version: '9.2',
        schemaVersion: 4,
        keys: KEYS,

        get(key, fallback = null) {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : raw;
        },

        set(key, value) {
            localStorage.setItem(key, String(value));
            return value;
        },

        json(key, fallback = null) {
            return safeJSON(localStorage.getItem(key), fallback);
        },

        setJSON(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
            return value;
        },

        remove(key) {
            localStorage.removeItem(key);
        },

        transaction(key, fallback, updater) {
            const current = this.json(key, fallback);
            const next = updater(clone(current));
            this.setJSON(key, next);
            return next;
        },

        profile() {
            return this.json(KEYS.profile, {});
        },

        macroTargets() {
            return normalizeMacros(this.json(KEYS.macros, { p: 0, f: 0, c: 0 }));
        },

        days() {
            const raw = this.json(KEYS.allDays, {});
            const result = {};
            Object.entries(raw || {}).forEach(([date, day]) => { result[date] = normalizeDay(day); });
            return result;
        },

        setDays(days) {
            const result = {};
            Object.entries(days || {}).forEach(([date, day]) => { result[date] = normalizeDay(day); });
            this.setJSON(KEYS.allDays, result);
            return result;
        },

        getDay(date) {
            return normalizeDay(this.days()[date]);
        },

        putDay(date, day) {
            return this.transaction(KEYS.allDays, {}, days => {
                days[date] = normalizeDay(day);
                return days;
            })[date];
        },

        migrate() {
            const currentVersion = Number(this.get(KEYS.schemaVersion, 0)) || 0;
            let days = this.days();

            const oldDaily = this.json(KEYS.legacyDaily, null);
            if (oldDaily && oldDaily.date && !days[oldDaily.date]) {
                days[oldDaily.date] = normalizeDay(oldDaily);
                this.remove(KEYS.legacyDaily);
            }

            days = this.setDays(days);
            this.set(KEYS.schemaVersion, this.schemaVersion);

            return {
                from: currentVersion,
                to: this.schemaVersion,
                migrated: currentVersion !== this.schemaVersion,
                days: Object.keys(days).length
            };
        }
    };
})(window);

    

/* ===== js-core-state ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const existing = A.state || {};
    const listeners = new Map();

    const runtime = {
        selectedDate: root.currentViewDate || root.todayDate || null,
        nutrition: {
            consumedCalories: Number(root.consumedCalories || 0),
            workoutBonus: Number(root.workoutBonus || 0),
            macros: { ...(root.macros || { p: 0, f: 0, c: 0 }) },
            targets: { ...(root.targetMacros || { p: 0, f: 0, c: 0 }) }
        },
        dailyLog: Array.isArray(root.dailyLog) ? [...root.dailyLog] : [],
        profile: A.storage?.profile?.() || {},
        settings: {
            appMode: A.storage?.get?.('achilles_app_mode', 'pro') || 'pro',
            themeColor: A.storage?.get?.('achilles_theme_color', 'gold') || 'gold',
            themeMode: A.storage?.get?.('achilles_theme_mode', 'auto') || 'auto'
        },
        sync: { status: 'idle', lastAt: 0, error: null }
    };

    function emit(topic, payload) {
        const direct = listeners.get(topic) || [];
        const any = listeners.get('*') || [];
        [...direct, ...any].forEach(fn => {
            try { fn(payload, topic); } catch (error) { console.error('[Achilles.state listener]', error); }
        });
    }

    A.state = {
        ...existing,
        runtime,

        snapshot() {
            try { return structuredClone(runtime); }
            catch (_) { return JSON.parse(JSON.stringify(runtime)); }
        },

        hydrateFromLegacy() {
            runtime.selectedDate = root.currentViewDate || root.todayDate || runtime.selectedDate;
            runtime.nutrition.consumedCalories = Number(root.consumedCalories || 0);
            runtime.nutrition.workoutBonus = Number(root.workoutBonus || 0);
            runtime.nutrition.macros = { ...(root.macros || { p: 0, f: 0, c: 0 }) };
            runtime.nutrition.targets = { ...(root.targetMacros || A.storage.macroTargets()) };
            runtime.dailyLog = Array.isArray(root.dailyLog) ? [...root.dailyLog] : [];
            runtime.profile = A.storage.profile();
            runtime.settings.appMode = A.storage.get('achilles_app_mode', 'pro');
            runtime.settings.themeColor = A.storage.get('achilles_theme_color', 'gold');
            runtime.settings.themeMode = A.storage.get('achilles_theme_mode', 'auto');
            emit('hydrate', this.snapshot());
            return runtime;
        },

        setNutrition(patch, options = {}) {
            runtime.nutrition = {
                ...runtime.nutrition,
                ...patch,
                macros: patch.macros ? { ...patch.macros } : runtime.nutrition.macros,
                targets: patch.targets ? { ...patch.targets } : runtime.nutrition.targets
            };
            if (options.syncLegacy !== false) {
                root.consumedCalories = runtime.nutrition.consumedCalories;
                root.workoutBonus = runtime.nutrition.workoutBonus;
                root.macros = runtime.nutrition.macros;
                root.targetMacros = runtime.nutrition.targets;
            }
            emit('nutrition', { ...runtime.nutrition });
            return runtime.nutrition;
        },

        setDailyLog(log, options = {}) {
            runtime.dailyLog = Array.isArray(log) ? [...log] : [];
            if (options.syncLegacy !== false) root.dailyLog = runtime.dailyLog;
            emit('dailyLog', [...runtime.dailyLog]);
            return runtime.dailyLog;
        },

        setSelectedDate(date) {
            runtime.selectedDate = date;
            root.currentViewDate = date;
            emit('date', date);
            return date;
        },

        setSync(status, extra = {}) {
            runtime.sync = { ...runtime.sync, status, ...extra };
            emit('sync', { ...runtime.sync });
        },

        subscribe(topic, fn) {
            if (!listeners.has(topic)) listeners.set(topic, []);
            listeners.get(topic).push(fn);
            return () => {
                const list = listeners.get(topic) || [];
                listeners.set(topic, list.filter(x => x !== fn));
            };
        }
    };
})(window);

    

/* ===== js-core-daily ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};

    function emptyDay() {
        return { consumedCalories: 0, workoutBonus: 0, macros: { p: 0, f: 0, c: 0 }, log: [], updatedAt: 0 };
    }

    function dateLabel(date) {
        if (date === root.todayDate) return 'Сьогодні';
        const d = new Date(`${date}T12:00:00`);
        return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    }

    function applyDay(date, day, { render = true } = {}) {
        const safe = { ...emptyDay(), ...(day || {}), macros: { ...emptyDay().macros, ...(day?.macros || {}) }, log: Array.isArray(day?.log) ? day.log : [] };
        root.allDaysData = A.storage.days();
        root.currentViewDate = date;
        root.consumedCalories = Number(safe.consumedCalories || 0);
        root.workoutBonus = Number(safe.workoutBonus || 0);
        root.macros = { ...safe.macros };
        root.dailyLog = [...safe.log];

        A.state.setSelectedDate(date);
        A.state.setNutrition({
            consumedCalories: root.consumedCalories,
            workoutBonus: root.workoutBonus,
            macros: root.macros,
            targets: root.targetMacros || A.storage.macroTargets()
        }, { syncLegacy: false });
        A.state.setDailyLog(root.dailyLog, { syncLegacy: false });

        const label = document.getElementById('display-date');
        if (label) label.textContent = dateLabel(date);
        const next = document.getElementById('btn-next-date');
        if (next) next.disabled = date >= root.todayDate;

        if (render) {
            root.updateGoalDisplay?.();
            root.renderDiary?.();
            root.renderProgressInsights?.();
        }
        return safe;
    }

    A.daily = {
        empty: emptyDay,

        currentSnapshot() {
            return {
                consumedCalories: Number(root.consumedCalories || 0),
                workoutBonus: Number(root.workoutBonus || 0),
                macros: { ...(root.macros || { p: 0, f: 0, c: 0 }) },
                log: Array.isArray(root.dailyLog) ? [...root.dailyLog] : [],
                updatedAt: Date.now()
            };
        },

        load(date = root.todayDate) {
            const days = A.storage.days();
            root.allDaysData = days;
            const day = days[date] || emptyDay();
            return applyDay(date, day, { render: true });
        },

        save({ sync = true, touch = true } = {}) {
            const date = root.currentViewDate || root.todayDate;
            const previous = A.storage.getDay(date);
            const snapshot = this.currentSnapshot();
            if (!touch) snapshot.updatedAt = previous.updatedAt || 0;
            A.storage.putDay(date, snapshot);
            root.allDaysData = A.storage.days();
            A.state.hydrateFromLegacy();
            root.renderProgressInsights?.();
            if (sync) A.sync?.push?.();
            return snapshot;
        },

        switch(offsetDays) {
            this.save({ sync: false, touch: false });
            const current = new Date(`${root.currentViewDate || root.todayDate}T12:00:00`);
            current.setDate(current.getDate() + Number(offsetDays || 0));
            const date = current.toISOString().slice(0, 10);
            if (date > root.todayDate) return false;
            this.load(date);
            return true;
        },

        installLegacyAPI() {
            root.loadDailyData = () => this.load(root.todayDate);
            root.saveDailyData = () => this.save({ sync: true, touch: true });
            root.changeDate = offset => this.switch(offset);
        }
    };

    A.daily.installLegacyAPI();
})(window);

    
