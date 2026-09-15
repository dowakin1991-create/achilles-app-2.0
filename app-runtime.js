/* ===== js-app-v9 ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    A.core = A.core || {};
    A.core.version = '9.2';

    function trainingSessionFromMetadata(name, metadata) {
        const exercise = A.training.model.byId(metadata.exerciseId) || A.training.model.byName(name);
        if (!exercise) return null;
        return A.training.model.entryFromLegacy({
            id: Date.now(),
            createdAt: Date.now(),
            exercise: name,
            burned: metadata.burned || 0,
            ...metadata
        }, exercise.raw);
    }

    function installWorkoutEntryAdapter() {
        if (typeof root.logWorkoutEntry !== 'function' || root.logWorkoutEntry.__v9Wrapped) return;
        const legacy = root.logWorkoutEntry;
        const wrapped = function (name, burnedKcal, details, metadata = {}) {
            const session = trainingSessionFromMetadata(name, { ...metadata, burned: burnedKcal });
            const enriched = {
                ...metadata,
                exerciseId: session?.exerciseId || metadata.exerciseId || null,
                exerciseType: session?.exerciseType || metadata.kind || null,
                trainingSession: session
            };
            return legacy.call(this, name, burnedKcal, details, enriched);
        };
        wrapped.__v9Wrapped = true;
        root.logWorkoutEntry = wrapped;
    }

    function decorateWorkoutCards() {
        document.querySelectorAll('.exercise-card[data-exercise-id]').forEach(card => {
            card.querySelector('.exercise-v9-history')?.remove();
            const id = card.dataset.exerciseId;
            const last = A.training.history.last(id);
            if (!last) return;

            const progression = A.training.progression.suggest(id);
            const box = document.createElement('div');
            box.className = 'exercise-v9-history';
            const date = new Date(`${last.date}T12:00:00`).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
            box.innerHTML = `
                <div class="exercise-v9-history-row">
                    <span class="exercise-v9-kicker">Останнє · ${date}</span>
                    <strong>${A.training.history.format(last)}</strong>
                </div>
                ${progression ? `<div class="exercise-v9-next"><i class="fa-solid fa-arrow-trend-up"></i><span>${progression.label}</span></div>` : ''}
            `;
            const actions = card.querySelector('.exercise-actions');
            if (actions) card.insertBefore(box, actions);
            else card.appendChild(box);
        });
    }

    function wrapWorkoutRenderer() {
        if (typeof root.renderWorkouts !== 'function' || root.renderWorkouts.__v9Wrapped) return;
        const legacy = root.renderWorkouts;
        const wrapped = function (...args) {
            const result = legacy.apply(this, args);
            requestAnimationFrame(decorateWorkoutCards);
            return result;
        };
        wrapped.__v9Wrapped = true;
        root.renderWorkouts = wrapped;
    }

    function wrapSyncStatus() {
        if (typeof root.syncToCloud !== 'function' || root.syncToCloud.__v9Wrapped) return;
        const legacy = root.syncToCloud;
        const wrapped = async function (...args) {
            A.state.setSync('syncing', { error: null });
            try {
                const result = await legacy.apply(this, args);
                A.state.setSync('synced', { lastAt: Date.now(), error: null });
                return result;
            } catch (error) {
                A.state.setSync('error', { error: String(error?.message || error) });
                throw error;
            }
        };
        wrapped.__v9Wrapped = true;
        root.syncToCloud = wrapped;
        A.sync.push = (...args) => root.syncToCloud(...args);
    }

    A.bootstrapV9 = function () {
        const migration = A.storage.migrate();
        A.state.hydrateFromLegacy();
        installWorkoutEntryAdapter();
        wrapWorkoutRenderer();
        wrapSyncStatus();
        root.searchWorkout?.();
        decorateWorkoutCards();
        console.info('[Achilles OS]', `V${A.core.version}`, migration);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => A.bootstrapV9(), { once: true });
    } else {
        A.bootstrapV9();
    }
})(window);

    

/* ===== js-v9-2-nutrition-sync ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const FOOD_CACHE_KEY = A.storage?.keys?.foodCache || 'achilles_food_cache_v2';
    const FOOD_RECENT_KEY = A.storage?.keys?.foodRecent || 'achilles_food_recent_v1';
    const SYNC_QUEUE_KEY = A.storage?.keys?.syncQueue || 'achilles_sync_queue_v1';
    const CACHE_TTL = 14 * 24 * 60 * 60 * 1000;
    const MAX_CACHE_QUERIES = 40;
    const MAX_RECENT = 12;

    const clone = value => {
        try { return structuredClone(value); }
        catch (_) { return JSON.parse(JSON.stringify(value)); }
    };

    const stripDecorations = value => String(value || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    const foodKey = item => {
        const barcode = String(item?.barcode || '').trim();
        if (barcode) return `barcode:${barcode}`;
        return `name:${stripDecorations(item?.name).toLowerCase()}|${Number(item?.kcal || 0)}`;
    };

    function normalizeFood(item, defaults = {}) {
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name || '').trim();
        if (!name) return null;
        const now = Date.now();
        return {
            ...item,
            ...defaults,
            id: item.id || defaults.id || foodKey(item),
            name,
            kcal: Math.max(0, Number(item.kcal || 0)),
            p: Math.max(0, Number(item.p || 0)),
            f: Math.max(0, Number(item.f || 0)),
            c: Math.max(0, Number(item.c || 0)),
            fiber: Math.max(0, Number(item.fiber || 0)),
            barcode: String(item.barcode || ''),
            source: item.source || defaults.source || 'local',
            createdAt: Number(item.createdAt || defaults.createdAt || now),
            updatedAt: Number(item.updatedAt || defaults.updatedAt || now)
        };
    }

    function dedupeFoods(items) {
        const map = new Map();
        (items || []).forEach(raw => {
            const item = normalizeFood(raw);
            if (!item) return;
            const key = foodKey(item);
            const previous = map.get(key);
            if (!previous || Number(item.updatedAt || 0) >= Number(previous.updatedAt || 0)) map.set(key, item);
        });
        return [...map.values()];
    }

    function normalizedQuery(query) {
        return String(query || '').trim().toLocaleLowerCase('uk-UA').replace(/\s+/g, ' ');
    }

    A.nutritionRepo = {
        normalize: normalizeFood,
        key: foodKey,
        dedupe: dedupeFoods,

        custom() {
            return dedupeFoods(A.storage.json(A.storage.keys.customFoods, []));
        },

        favorites() {
            return dedupeFoods(A.storage.json(A.storage.keys.favFoods, []));
        },

        setCustom(items) {
            return A.storage.setJSON(A.storage.keys.customFoods, dedupeFoods(items));
        },

        setFavorites(items) {
            return A.storage.setJSON(A.storage.keys.favFoods, dedupeFoods(items));
        },

        isFavorite(item) {
            const key = foodKey(item);
            return this.favorites().some(x => foodKey(x) === key);
        },

        toggleFavorite(item) {
            const normalized = normalizeFood(item);
            if (!normalized) return false;
            const key = foodKey(normalized);
            const list = this.favorites();
            const index = list.findIndex(x => foodKey(x) === key);
            let active = false;
            if (index >= 0) list.splice(index, 1);
            else { list.unshift({ ...normalized, updatedAt: Date.now() }); active = true; }
            this.setFavorites(list);
            A.sync?.push?.('favorite-food');
            return active;
        },

        addCustom(item) {
            const normalized = normalizeFood(item, { source: 'custom' });
            if (!normalized) return null;
            const list = this.custom();
            const key = foodKey(normalized);
            const index = list.findIndex(x => foodKey(x) === key);
            if (index >= 0) list[index] = { ...list[index], ...normalized, updatedAt: Date.now() };
            else list.unshift({ ...normalized, createdAt: Date.now(), updatedAt: Date.now() });
            this.setCustom(list);

            const favorites = this.favorites().filter(x => foodKey(x) !== key);
            favorites.unshift({ ...normalized, updatedAt: Date.now() });
            this.setFavorites(favorites);
            A.sync?.push?.('custom-food');
            return normalized;
        },

        recent() {
            return dedupeFoods(A.storage.json(FOOD_RECENT_KEY, [])).slice(0, MAX_RECENT);
        },

        touchRecent(item) {
            const normalized = normalizeFood(item);
            if (!normalized) return;
            const key = foodKey(normalized);
            const next = this.recent().filter(x => foodKey(x) !== key);
            next.unshift({ ...normalized, lastUsedAt: Date.now(), updatedAt: Date.now() });
            A.storage.setJSON(FOOD_RECENT_KEY, next.slice(0, MAX_RECENT));
        },

        cacheState() {
            const raw = A.storage.json(FOOD_CACHE_KEY, { version: 2, queries: {} });
            return raw && typeof raw === 'object' ? { version: 2, queries: raw.queries || {} } : { version: 2, queries: {} };
        },

        cached(query, { allowStale = false } = {}) {
            const q = normalizedQuery(query);
            if (!q) return [];
            const entry = this.cacheState().queries[q];
            if (!entry || !Array.isArray(entry.items)) return [];
            const age = Date.now() - Number(entry.updatedAt || 0);
            if (!allowStale && age > CACHE_TTL) return [];
            return dedupeFoods(entry.items);
        },

        cache(query, items) {
            const q = normalizedQuery(query);
            if (!q || !items?.length) return;
            const state = this.cacheState();
            state.queries[q] = { updatedAt: Date.now(), items: dedupeFoods(items).slice(0, 12) };
            const ordered = Object.entries(state.queries)
                .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
                .slice(0, MAX_CACHE_QUERIES);
            state.queries = Object.fromEntries(ordered);
            try { A.storage.setJSON(FOOD_CACHE_KEY, state); }
            catch (error) {
                console.warn('[Achilles.nutritionRepo] cache quota', error);
                state.queries = Object.fromEntries(ordered.slice(0, 12));
                try { A.storage.setJSON(FOOD_CACHE_KEY, state); } catch (_) {}
            }
        },

        localSearch(query) {
            const q = normalizedQuery(query);
            const local = [
                ...this.custom(),
                ...(root.foodDB || []).map(x => normalizeFood(x, { source: 'built-in' })).filter(Boolean)
            ];
            if (!q) return dedupeFoods(local);
            return dedupeFoods(local.filter(item => stripDecorations(item.name).toLocaleLowerCase('uk-UA').includes(q)));
        },

        sanitize() {
            this.setCustom(this.custom());
            this.setFavorites(this.favorites());
            A.storage.setJSON(FOOD_RECENT_KEY, this.recent());
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    function payloadFor(item) {
        return encodeURIComponent(JSON.stringify(normalizeFood(item) || item));
    }

    function decodePayload(payload) {
        if (typeof payload === 'object') return normalizeFood(payload);
        try { return normalizeFood(JSON.parse(decodeURIComponent(String(payload)))); }
        catch (_) {
            try { return normalizeFood(JSON.parse(String(payload).replace(/&quot;/g, '"'))); }
            catch (error) { console.warn('[Achilles.food] invalid payload', error); return null; }
        }
    }

    // V10.3: food cards no longer pass the whole product JSON through inline onclick.
    // Some legacy/custom product names can contain characters that are awkward inside
    // HTML/JS attributes. Keep the normalized object in memory and pass only a safe key.
    A.foodCardRegistry = A.foodCardRegistry || new Map();
    let foodCardSequence = 0;

    function registerFoodCard(item, index) {
        const normalized = normalizeFood(item);
        if (!normalized) return null;
        const suffix = String(index ?? 'item').replace(/[^a-zA-Z0-9_-]/g, '-');
        const key = `food-${++foodCardSequence}-${suffix}`;
        A.foodCardRegistry.set(key, normalized);
        // Prevent unbounded growth after many searches in one session.
        while (A.foodCardRegistry.size > 180) {
            const first = A.foodCardRegistry.keys().next().value;
            A.foodCardRegistry.delete(first);
        }
        return key;
    }

    function foodFromCardKey(key) {
        const item = A.foodCardRegistry.get(String(key || ''));
        return item ? normalizeFood(item) : null;
    }

    root.generateFoodCardHtml = function (item, index) {
        const normalized = normalizeFood(item);
        if (!normalized) return '';
        const isFav = A.nutritionRepo.isFavorite(normalized);
        const cardKey = registerFoodCard(normalized, index);
        if (!cardKey) return '';
        const uniqueId = `food-input-${cardKey}`;
        const online = normalized.source && !['local', 'built-in', 'custom'].includes(normalized.source);
        const sourceLabel = normalized.source === 'cache' ? 'Кеш' : (online ? 'Open Food Facts' : (normalized.source === 'custom' ? 'Свій продукт' : 'Локально'));
        return `
            <div class="list-item" style="${online ? 'border-left: 3px solid var(--primary);' : ''}">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:flex-start;margin-bottom:12px;gap:12px;">
                    <div style="min-width:0;">
                        <strong style="font-size:18px;overflow-wrap:anywhere;">${escapeHtml(normalized.name)}</strong><br>
                        <span style="font-size:13px;opacity:.8;color:var(--text-muted);">${Math.round(normalized.kcal)} ккал | Б:${Number(normalized.p.toFixed(1))} Ж:${Number(normalized.f.toFixed(1))} В:${Number(normalized.c.toFixed(1))} (на 100г)</span><br>
                        <span class="food-source-badge">${escapeHtml(sourceLabel)}</span>
                    </div>
                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavFoodByKey('${cardKey}', event)"></i>
                </div>
                <div style="display:flex;width:100%;gap:10px;">
                    <input type="number" inputmode="decimal" min="1" step="1" id="${uniqueId}" placeholder="Вага (г)" style="margin:0;padding:14px;flex:1;">
                    <button class="add-btn primary-btn gradient-bg" onclick="addFoodByKey('${cardKey}', '${uniqueId}')" style="margin:0;padding:0 25px;border-radius:16px;">+</button>
                </div>
            </div>`;
    };

    root.toggleFavFoodByKey = function (cardKey, event) {
        const item = foodFromCardKey(cardKey);
        if (!item) {
            console.warn('[Achilles.food] product card expired', cardKey);
            A.toast?.('Онови список продуктів і спробуй ще раз', 'fa-arrows-rotate');
            return;
        }
        const active = A.nutritionRepo.toggleFavorite(item);
        if (event?.target) {
            event.target.classList.toggle('fa-solid', active);
            event.target.classList.toggle('fa-regular', !active);
            event.target.classList.toggle('active', active);
        }
        if (root.currentFoodFilter === 'fav') root.renderFavFoods();
    };

    root.toggleFavFood = function (payload, event) {
        const item = decodePayload(payload);
        if (!item) return;
        const active = A.nutritionRepo.toggleFavorite(item);
        if (event?.target) {
            event.target.classList.toggle('fa-solid', active);
            event.target.classList.toggle('fa-regular', !active);
            event.target.classList.toggle('active', active);
        }
        if (root.currentFoodFilter === 'fav') root.renderFavFoods();
    };

    root.renderFavFoods = function () {
        const box = document.getElementById('food-results');
        if (!box) return;
        const favorites = A.nutritionRepo.favorites();
        box.innerHTML = favorites.length
            ? favorites.map((item, i) => root.generateFoodCardHtml(item, `fav-${i}`)).join('')
            : '<div class="list-item" style="color:var(--text-muted);text-align:center;padding:20px;border:none;">Улюблених продуктів поки немає</div>';
    };

    root.saveCustomFood = function () {
        const name = document.getElementById('cf-name')?.value.trim();
        const kcal = Number(document.getElementById('cf-kcal')?.value);
        const p = Number(document.getElementById('cf-p')?.value || 0);
        const f = Number(document.getElementById('cf-f')?.value || 0);
        const c = Number(document.getElementById('cf-c')?.value || 0);
        if (!name || !Number.isFinite(kcal) || kcal < 0) { alert('Введіть назву та калорійність!'); return; }

        A.nutritionRepo.addCustom({ name: `🛠️ ${name}`, kcal, p, f, c, fiber: 0, source: 'custom' });
        root.closeCustomFood?.();
        ['cf-name','cf-kcal','cf-p','cf-f','cf-c'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        root.setFoodFilter?.('fav');
    };

    function addFoodItem(item, weightId) {
        const normalized = normalizeFood(item);
        if (!normalized) {
            A.toast?.('Не вдалося прочитати продукт', 'fa-triangle-exclamation');
            return false;
        }

        try {
            const input = document.getElementById(weightId);
            let weight = Number(String(input?.value ?? '').replace(',', '.'));
            if (!Number.isFinite(weight) || weight <= 0) weight = 100;

            const ratio = weight / 100;
            const actualKcal = Math.round(normalized.kcal * ratio);
            const actualP = Math.round(normalized.p * ratio * 10) / 10;
            const actualF = Math.round(normalized.f * ratio * 10) / 10;
            const actualC = Math.round(normalized.c * ratio * 10) / 10;

            root.consumedCalories = Number(root.consumedCalories || 0) + actualKcal;
            root.macros = root.macros || { p: 0, f: 0, c: 0 };
            root.macros.p = Number(root.macros.p || 0) + actualP;
            root.macros.f = Number(root.macros.f || 0) + actualF;
            root.macros.c = Number(root.macros.c || 0) + actualC;

            const safeName = escapeHtml(normalized.name);
            const now = Date.now();
            const entry = {
                id: now,
                createdAt: now,
                type: 'food',
                foodId: normalized.id || foodKey(normalized),
                foodSource: normalized.source || 'local',
                barcode: normalized.barcode || '',
                weightG: weight,
                kcal: actualKcal, p: actualP, f: actualF, c: actualC,
                html: `<i class="fa-solid fa-utensils diary-entry-icon diary-food-icon" aria-hidden="true"></i> <strong style="color:var(--text-main);">${safeName} (${weight}г)</strong><br><span style="font-size:14px;opacity:.8;" class="gradient-text">${actualKcal} ккал</span> <span style="font-size:12px;opacity:.6;color:var(--text-main);">| Б:${actualP} Ж:${actualF} В:${actualC}</span>`
            };

            root.dailyLog = Array.isArray(root.dailyLog) ? root.dailyLog : [];
            root.dailyLog.push(entry);

            // Save the meal first. Secondary conveniences such as recent-food history
            // must never be able to cancel the actual add operation.
            root.saveDailyData?.();
            try { A.nutritionRepo.touchRecent(normalized); }
            catch (recentError) { console.warn('[Achilles.food] recent history failed', recentError); }

            root.updateGoalDisplay?.();
            root.renderDiary?.();

            if (input) input.value = '';
            A.haptics?.success?.();
            A.toast?.(`Додано: ${stripDecorations(normalized.name)} · ${weight} г`, 'fa-check', 1800);

            const search = document.getElementById('food-search');
            const results = document.getElementById('food-results');
            if (search) search.value = '';
            if (results) results.innerHTML = '';
            if (root.currentFoodFilter === 'fav') root.renderFavFoods();
            document.querySelector('.nav-item[data-target="tab-dashboard"]')?.click();
            return true;
        } catch (error) {
            console.error('[Achilles.food] add failed', error, normalized);
            A.toast?.('Не вдалося додати продукт. Спробуй ще раз.', 'fa-triangle-exclamation', 3000);
            return false;
        }
    }

    root.addFoodByKey = function (cardKey, weightId) {
        const item = foodFromCardKey(cardKey);
        if (!item) {
            console.warn('[Achilles.food] product card expired', cardKey);
            A.toast?.('Онови список продуктів і спробуй ще раз', 'fa-arrows-rotate');
            return false;
        }
        return addFoodItem(item, weightId);
    };

    // Compatibility path for any older cards still present during a hot update.
    root.addFood = function (payload, weightId) {
        const item = decodePayload(payload);
        return addFoodItem(item, weightId);
    };

    let foodSearchTimer = 0;
    let foodAbortController = null;

    function renderFoodItems(items) {
        const box = document.getElementById('food-results');
        if (!box) return;
        box.innerHTML = dedupeFoods(items).map((item, i) => root.generateFoodCardHtml(item, `v92-${i}`)).join('');
    }

    function renderRecent() {
        const recent = A.nutritionRepo.recent();
        const box = document.getElementById('food-results');
        if (!box) return;
        if (recent.length) {
            renderFoodItems(recent);
            root.setFoodApiStatus?.(navigator.onLine ? 'cache' : 'offline', navigator.onLine ? 'Нещодавні продукти · збережено на пристрої' : 'Офлайн · нещодавні продукти доступні');
        } else {
            box.innerHTML = '';
            root.setFoodApiStatus?.(navigator.onLine ? 'ready' : 'offline', navigator.onLine ? 'Онлайн-база Open Food Facts готова' : 'Офлайн · локальна база працює');
        }
    }

    async function onlineSearch(query, localItems, cachedItems) {
        const spinner = document.getElementById('loading-spinner');
        if (!navigator.onLine) {
            if (spinner) spinner.style.display = 'none';
            renderFoodItems([...localItems, ...cachedItems.map(x => ({ ...x, source: x.source || 'cache' }))]);
            root.setFoodApiStatus?.('offline', cachedItems.length ? 'Офлайн · показано локальні та кешовані результати' : 'Офлайн · показано локальні результати');
            return;
        }

        foodAbortController?.abort();
        foodAbortController = new AbortController();
        const signal = foodAbortController.signal;
        if (spinner) spinner.style.display = 'block';
        root.setFoodApiStatus?.('loading', cachedItems.length ? 'Кеш знайдено · оновлюю онлайн…' : 'Шукаю в онлайн-базі…');

        try {
            let rawResults = [];
            let source = 'Open Food Facts Search';
            try {
                rawResults = await root.fetchSearchALicious(query, signal);
            } catch (primaryError) {
                if (primaryError?.name === 'AbortError') throw primaryError;
                source = 'Open Food Facts fallback';
                rawResults = await root.fetchLegacyOFF(query, signal);
            }
            if (signal.aborted) return;

            const onlineItems = dedupeFoods(rawResults
                .map((raw, index) => root.normalizeOnlineFood(raw, index, source))
                .filter(Boolean)
                .map(item => normalizeFood(item, { source })))
                .slice(0, 12);

            if (onlineItems.length) A.nutritionRepo.cache(query, onlineItems);
            const combined = dedupeFoods([...localItems, ...onlineItems]);
            renderFoodItems(combined);
            root.setFoodApiStatus?.(onlineItems.length ? 'online' : 'empty', onlineItems.length
                ? `Онлайн оновлено · ${onlineItems.length} результатів`
                : (combined.length ? 'Онлайн-збігів немає · показано локальні' : 'Збігів не знайдено'));
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.warn('[Achilles.food] online search unavailable', error);
                renderFoodItems([...localItems, ...cachedItems.map(x => ({ ...x, source: x.source || 'cache' }))]);
                root.setFoodApiStatus?.(cachedItems.length ? 'cache' : 'error', cachedItems.length
                    ? 'Онлайн недоступний · показано кеш'
                    : 'Онлайн-база тимчасово недоступна · локальна база працює');
            }
        } finally {
            if (!signal.aborted && spinner) spinner.style.display = 'none';
        }
    }

    root.onSearchInput = function () {
        if (root.currentFoodFilter === 'fav') return;
        clearTimeout(foodSearchTimer);
        foodAbortController?.abort();
        const query = normalizedQuery(document.getElementById('food-search')?.value || '');
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'none';

        if (query.length < 2) { renderRecent(); return; }

        const local = A.nutritionRepo.localSearch(query);
        const cached = A.nutritionRepo.cached(query, { allowStale: !navigator.onLine });
        renderFoodItems([...local, ...cached.map(x => ({ ...x, source: 'cache' }))]);
        if (cached.length) root.setFoodApiStatus?.('cache', navigator.onLine ? 'Знайдено в кеші · перевіряю оновлення…' : 'Офлайн · показано кеш');
        else root.setFoodApiStatus?.(navigator.onLine ? 'loading' : 'offline', navigator.onLine ? 'Готую онлайн-пошук…' : 'Офлайн · показано локальні результати');

        foodSearchTimer = setTimeout(() => onlineSearch(query, local, cached), 380);
    };

    root.searchOnlineFood = function (query) {
        const q = normalizedQuery(query);
        const local = A.nutritionRepo.localSearch(q);
        const cached = A.nutritionRepo.cached(q, { allowStale: !navigator.onLine });
        return onlineSearch(q, local, cached);
    };
    root.searchOpenFoodFacts = root.searchOnlineFood;

    function syncLabel(state) {
        switch (state) {
            case 'syncing': return ['fa-cloud-arrow-up', 'Синхронізація…'];
            case 'synced': return ['fa-circle-check', 'Синхронізовано'];
            case 'queued': return ['fa-clock', 'Збережено локально · очікує хмари'];
            case 'offline': return ['fa-wifi', 'Офлайн · зміни збережено'];
            case 'error': return ['fa-triangle-exclamation', 'Помилка хмари · дані локально'];
            default: return ['fa-mobile-screen-button', 'Дані збережені локально'];
        }
    }

    function renderSyncStatus(state) {
        const pill = document.getElementById('sync-status-pill');
        if (!pill) return;
        const status = state?.status || state || 'local';
        const [icon, text] = syncLabel(status);
        pill.dataset.state = status;
        pill.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
    }

    A.syncQueue = {
        transport: null,
        timer: 0,
        flushing: null,

        read() {
            const q = A.storage.json(SYNC_QUEUE_KEY, []);
            return Array.isArray(q) ? q : [];
        },

        write(queue) {
            A.storage.setJSON(SYNC_QUEUE_KEY, queue);
            return queue;
        },

        enqueue(reason = 'change') {
            const user = A.storage.get(A.storage.keys.user, '');
            if (!user) {
                A.state?.setSync?.('idle', { error: null });
                return Promise.resolve(false);
            }
            const previous = this.read()[0];
            this.write([{
                id: previous?.id || `snapshot-${Date.now()}`,
                type: 'cloud-snapshot',
                reason,
                createdAt: Number(previous?.createdAt || Date.now()),
                updatedAt: Date.now(),
                attempts: Number(previous?.attempts || 0)
            }]);

            if (!navigator.onLine) {
                A.state?.setSync?.('offline', { error: null });
                return Promise.resolve(true);
            }
            A.state?.setSync?.('queued', { error: null });
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.flush(), 650);
            return Promise.resolve(true);
        },

        async flush() {
            if (this.flushing) return this.flushing;
            if (!this.read().length) {
                if (navigator.onLine) A.state?.setSync?.('synced', { error: null });
                return true;
            }
            if (!navigator.onLine) {
                A.state?.setSync?.('offline', { error: null });
                return false;
            }
            if (typeof this.transport !== 'function') return false;

            this.flushing = (async () => {
                A.state?.setSync?.('syncing', { error: null });
                try {
                    const result = await this.transport();
                    if (result === false) throw new Error('Хмарна синхронізація недоступна');
                    this.write([]);
                    A.state?.setSync?.('synced', { lastAt: Date.now(), error: null });
                    return true;
                } catch (error) {
                    const queue = this.read();
                    if (queue[0]) queue[0].attempts = Number(queue[0].attempts || 0) + 1;
                    this.write(queue);
                    A.state?.setSync?.(navigator.onLine ? 'error' : 'offline', { error: String(error?.message || error) });
                    console.warn('[Achilles.syncQueue]', error);
                    return false;
                } finally {
                    this.flushing = null;
                }
            })();
            return this.flushing;
        },

        install() {
            if (root.syncToCloud?.__v92Queue) return;
            this.transport = root.syncToCloud;
            const queueFn = reason => this.enqueue(typeof reason === 'string' ? reason : 'change');
            queueFn.__v92Queue = true;
            root.syncToCloud = queueFn;
            A.sync.push = queueFn;

            root.addEventListener('online', () => {
                renderSyncStatus({ status: this.read().length ? 'queued' : 'synced' });
                if (this.read().length) this.flush();
                if (root.currentFoodFilter !== 'fav') root.onSearchInput?.();
            });
            root.addEventListener('offline', () => {
                A.state?.setSync?.('offline', { error: null });
                if (root.currentFoodFilter !== 'fav') root.onSearchInput?.();
            });

            if (this.read().length) {
                A.state?.setSync?.(navigator.onLine ? 'queued' : 'offline', { error: null });
                if (navigator.onLine) setTimeout(() => this.flush(), 800);
            } else {
                A.state?.setSync?.(navigator.onLine ? 'synced' : 'offline', { error: null });
            }
        }
    };

    function bootstrapV92() {
        A.core.version = '9.2';
        A.nutritionRepo.sanitize();
        A.state?.subscribe?.('sync', renderSyncStatus);
        A.syncQueue.install();
        renderSyncStatus(A.state?.runtime?.sync || { status: navigator.onLine ? 'synced' : 'offline' });

        // Cloud pull лишається джерелом відновлення, але після нього чистимо дублікати продуктів.
        if (typeof root.loadFromCloud === 'function' && !root.loadFromCloud.__v92Wrapped) {
            const legacyPull = root.loadFromCloud;
            const wrappedPull = async function (...args) {
                const result = await legacyPull.apply(this, args);
                A.nutritionRepo.sanitize();
                return result;
            };
            wrappedPull.__v92Wrapped = true;
            root.loadFromCloud = wrappedPull;
            if (A.sync) A.sync.pull = (...args) => root.loadFromCloud(...args);
        }

        // Початковий екран харчування: корисні останні продукти замість порожньої області.
        if (root.currentFoodFilter !== 'fav' && !(document.getElementById('food-search')?.value || '').trim()) renderRecent();

        // Повторна санітизація після можливого початкового cloud pull.
        setTimeout(() => A.nutritionRepo.sanitize(), 1800);
        console.info('[Achilles OS] V9.2 nutrition repository + offline queue ready');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrapV92, { once: true });
    else bootstrapV92();
})(window);
    

/* ===== achilles-v10-core ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    A.core = A.core || {};
    A.core.version = '10.4';

    const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, Number(n) || 0));
    const round = (n, digits = 0) => {
        const p = 10 ** digits;
        return Math.round((Number(n) || 0) * p) / p;
    };
    const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
    const fmtDate = date => {
        try { return new Date(`${date}T12:00:00`).toLocaleDateString('uk-UA', { day:'numeric', month:'short' }); }
        catch (_) { return date || ''; }
    };

    A.haptics = {
        tap() {
            try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
        },
        success() {
            try { if (navigator.vibrate) navigator.vibrate([12, 35, 18]); } catch (_) {}
        }
    };

    A.toast = function (message, icon = 'fa-bolt', duration = 2300) {
        let host = document.getElementById('v10-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'v10-toast-host';
            host.className = 'v10-toast-host';
            document.body.appendChild(host);
        }
        const item = document.createElement('div');
        item.className = 'v10-toast';
        item.innerHTML = `<i class="fa-solid ${esc(icon)}"></i><span>${esc(message)}</span>`;
        host.appendChild(item);
        requestAnimationFrame(() => item.classList.add('show'));
        setTimeout(() => {
            item.classList.remove('show');
            setTimeout(() => item.remove(), 240);
        }, duration);
    };

    /* -------------------- Training metrics / history -------------------- */
    function sessionSets(session) {
        return Array.isArray(session?.metrics?.sets) ? session.metrics.sets : [];
    }

    function sessionMetric(session) {
        if (!session) return { value: 0, label: '—', higherBetter: true, unit: '' };
        const type = session.exerciseType;
        const m = session.metrics || {};
        const sets = sessionSets(session);

        if (type === A.training?.types?.STRENGTH_WEIGHTED) {
            let e1rm = Number(m.estimated1RMKg || 0);
            if (!e1rm && sets.length) {
                e1rm = Math.max(...sets.map(s => Number(s.weightKg || 0) * (1 + Number(s.reps || 0) / 30)), 0);
            }
            return { value: e1rm, label: `${round(e1rm,1)} кг e1RM`, higherBetter:true, unit:'кг' };
        }

        if (type === A.training?.types?.STRENGTH_BODYWEIGHT_OPTIONAL) {
            const maxAdded = Math.max(...sets.map(s => Number(s.addedWeightKg || 0)), 0);
            const reps = sets.reduce((sum, s) => sum + Number(s.reps || 0), 0);
            if (maxAdded > 0) return { value: maxAdded * 1000 + reps, label: `+${round(maxAdded,1)} кг · ${reps} повт.`, higherBetter:true, unit:'' };
            return { value: reps, label: `${reps} повт.`, higherBetter:true, unit:'повт.' };
        }

        if (type === A.training?.types?.STRENGTH_BODYWEIGHT) {
            const reps = sets.reduce((sum, s) => sum + Number(s.reps || 0), 0);
            return { value: reps, label: `${reps} повт.`, higherBetter:true, unit:'повт.' };
        }

        if (type === A.training?.types?.STATIC_TIME) {
            const sec = Number(m.durationSec || 0);
            return { value: sec, label: `${Math.round(sec)} сек`, higherBetter:true, unit:'сек' };
        }

        if (type === A.training?.types?.CARDIO_TIME_DISTANCE) {
            const sec = Number(m.durationSec || 0);
            const dist = Number(m.distance || 0);
            const unit = m.distanceUnit || '';
            if (sec > 0 && dist > 0 && unit === 'км') {
                const pace = sec / dist;
                const mm = Math.floor(pace / 60);
                const ss = Math.round(pace % 60).toString().padStart(2,'0');
                return { value: pace, label: `${mm}:${ss}/км`, higherBetter:false, unit:'сек/км' };
            }
            if (sec > 0 && dist > 0 && unit === 'м') {
                const pace100 = sec / Math.max(dist / 100, .01);
                const mm = Math.floor(pace100 / 60);
                const ss = Math.round(pace100 % 60).toString().padStart(2,'0');
                return { value: pace100, label: `${mm}:${ss}/100м`, higherBetter:false, unit:'сек/100м' };
            }
            return { value: dist || sec, label: dist ? `${round(dist,2)} ${unit}` : `${round(sec/60,1)} хв`, higherBetter:true, unit };
        }

        if (type === A.training?.types?.CARDIO_TIME) {
            const sec = Number(m.durationSec || 0);
            return { value: sec, label: `${round(sec/60,1)} хв`, higherBetter:true, unit:'сек' };
        }

        return { value: 0, label:'—', higherBetter:true, unit:'' };
    }

    function improvementRatio(current, previous) {
        if (!current || !previous || !Number.isFinite(current.value) || !Number.isFinite(previous.value) || previous.value <= 0) return null;
        return current.higherBetter === false ? previous.value / current.value : current.value / previous.value;
    }

    function historyFor(idOrName) {
        return A.training?.history?.forExercise?.(idOrName) || [];
    }

    function trainingSummary(idOrName) {
        const sessions = historyFor(idOrName);
        const metrics = sessions.map(s => ({ session:s, metric:sessionMetric(s) })).filter(x => x.metric.value > 0);
        const latest = metrics[0] || null;
        const previous = metrics[1] || null;
        const ratio = latest && previous ? improvementRatio(latest.metric, previous.metric) : null;
        let best = null;
        metrics.forEach(item => {
            if (!best) best = item;
            else if (item.metric.higherBetter === false ? item.metric.value < best.metric.value : item.metric.value > best.metric.value) best = item;
        });

        let plateau = false;
        if (metrics.length >= 3) {
            const recent = metrics.slice(0,3).map(x => x.metric.value).filter(v => v > 0);
            if (recent.length === 3) {
                const max = Math.max(...recent);
                const min = Math.min(...recent);
                plateau = min > 0 && (max / min) <= 1.02;
            }
        }

        return { sessions, metrics, latest, previous, ratio, best, plateau };
    }

    A.training = A.training || {};
    A.training.v10 = {
        sessionMetric,
        summary: trainingSummary,
        metricLabel(session) { return sessionMetric(session).label; },
        trendLabel(summary) {
            if (!summary?.ratio) return 'Ще немає тренду';
            const pct = (summary.ratio - 1) * 100;
            if (pct > 1) return `+${round(pct,1)}% до минулої сесії`;
            if (pct < -1) return `${round(pct,1)}% до минулої сесії`;
            return 'Рівень стабільний';
        }
    };

    function detailedSuggestion(idOrName) {
        const exercise = A.training?.model?.byId?.(idOrName) || A.training?.model?.byName?.(idOrName);
        const last = A.training?.history?.last?.(idOrName);
        if (!exercise || !last) return null;
        const sets = sessionSets(last);
        const type = exercise.type;

        if (type === A.training.types.STRENGTH_WEIGHTED && sets.length) {
            const valid = sets.filter(s => Number(s.reps) > 0 && Number(s.weightKg) > 0);
            if (!valid.length) return null;
            const minReps = Math.min(...valid.map(s => Number(s.reps)));
            const topWeight = Math.max(...valid.map(s => Number(s.weightKg)));
            const nextSets = valid.map(s => ({ reps:Number(s.reps), weightKg:Number(s.weightKg) }));
            if (minReps >= 12) {
                const nextWeight = round(topWeight + 2.5, 1);
                nextSets.forEach(s => { s.weightKg = nextWeight; s.reps = Math.min(s.reps, 10); });
                return { label:`${nextWeight} кг · ціль 8–10 повторів`, reason:'усі робочі підходи вже ≥12 повторів', nextSets };
            }
            const weakestIndex = nextSets.reduce((best, s, i, arr) => Number(s.reps) < Number(arr[best].reps) ? i : best, 0);
            nextSets[weakestIndex].reps += 1;
            return { label:`+1 повтор у найслабшому підході`, reason:'зберігаємо робочу вагу й додаємо обсяг', nextSets };
        }

        if ((type === A.training.types.STRENGTH_BODYWEIGHT || type === A.training.types.STRENGTH_BODYWEIGHT_OPTIONAL) && sets.length) {
            const nextSets = sets.map(s => ({ ...s }));
            const weakestIndex = nextSets.reduce((best, s, i, arr) => Number(s.reps) < Number(arr[best].reps) ? i : best, 0);
            nextSets[weakestIndex].reps = Number(nextSets[weakestIndex].reps || 0) + 1;
            return { label:'+1 повтор у найслабшому підході', reason:'м’яка прогресія без різкого стрибка', nextSets };
        }

        if ((type === A.training.types.CARDIO_TIME || type === A.training.types.CARDIO_TIME_DISTANCE) && Number(last.metrics?.durationSec) > 0) {
            return { label:`${round(last.metrics.durationSec/60 + 2, 1)} хв`, reason:'+2 хв до попередньої тривалості', durationSec:Number(last.metrics.durationSec)+120, distance:Number(last.metrics?.distance || 0) };
        }

        if (type === A.training.types.STATIC_TIME && Number(last.metrics?.durationSec) > 0) {
            return { label:`${Math.round(Number(last.metrics.durationSec)+5)} сек`, reason:'+5 секунд до утримання', durationSec:Number(last.metrics.durationSec)+5 };
        }
        return null;
    }

    A.training.progression = A.training.progression || {};
    A.training.progression.suggestDetailed = detailedSuggestion;

    function findExerciseCard(id) {
        return Array.from(document.querySelectorAll('.exercise-card[data-exercise-id]')).find(card => card.dataset.exerciseId === String(id));
    }

    function fillCard(id, payload) {
        const card = findExerciseCard(id);
        if (!card) return false;
        const kind = card.dataset.kind || '';
        const inputs = Array.from(card.querySelectorAll('input'));
        const bySuffix = suffix => inputs.find(input => input.id?.endsWith(suffix));

        if (kind === 'strength_weighted') {
            const sets = payload.nextSets || payload.sets || [];
            const reps = bySuffix('-reps');
            const weight = bySuffix('-weight');
            if (reps) reps.value = sets.map(s => Number(s.reps || 0)).filter(Boolean).join(',');
            if (weight) weight.value = sets.map(s => Number(s.weightKg ?? s.weight ?? 0)).filter(v => v > 0).join(';');
        } else if (kind === 'bodyweight' || kind === 'bodyweight_optional') {
            const sets = payload.nextSets || payload.sets || [];
            const reps = bySuffix('-reps');
            const weight = bySuffix('-weight');
            if (reps) reps.value = sets.map(s => Number(s.reps || 0)).filter(Boolean).join(',');
            const added = Math.max(...sets.map(s => Number(s.addedWeightKg ?? s.weight ?? 0)), 0);
            if (weight && added > 0) { weight.style.display = 'block'; weight.value = String(added); }
        } else if (kind === 'cardio_time' || kind === 'cardio_distance') {
            const time = bySuffix('-time');
            const dist = bySuffix('-distance');
            if (time) time.value = String(round(Number(payload.durationSec || 0) / 60, 1));
            if (dist && Number(payload.distance || 0) > 0) dist.value = String(payload.distance);
        } else if (kind === 'static_time') {
            const seconds = bySuffix('-seconds');
            if (seconds) seconds.value = String(Math.round(Number(payload.durationSec || 0)));
        }

        card.classList.remove('v10-flash');
        void card.offsetWidth;
        card.classList.add('v10-flash');
        card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center' });
        A.haptics.tap();
        return true;
    }

    root.repeatLastExercise = function (id) {
        const last = A.training?.history?.last?.(id);
        if (!last) return A.toast('Ще немає попереднього тренування', 'fa-clock-rotate-left');
        const payload = { sets:sessionSets(last), durationSec:Number(last.metrics?.durationSec || 0), distance:Number(last.metrics?.distance || 0) };
        if (fillCard(id, payload)) A.toast('Минуле тренування підставлено', 'fa-rotate-left');
    };

    root.applyExerciseProgression = function (id) {
        const suggestion = detailedSuggestion(id);
        if (!suggestion) return A.toast('Поки недостатньо даних для прогресії', 'fa-chart-line');
        if (fillCard(id, suggestion)) A.toast(`План: ${suggestion.label}`, 'fa-arrow-trend-up', 2800);
    };

    function sparklinePath(values, width = 560, height = 104) {
        const clean = values.filter(v => Number.isFinite(v));
        if (!clean.length) return { path:'', points:[] };
        const min = Math.min(...clean), max = Math.max(...clean), range = Math.max(max-min, .0001);
        const points = clean.map((v,i) => {
            const x = clean.length === 1 ? width/2 : (i/(clean.length-1))*width;
            const y = height - ((v-min)/range)*(height-18) - 9;
            return [round(x,1), round(y,1)];
        });
        return { path:points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' '), points };
    }

    function ensureHistorySheet() {
        let sheet = document.getElementById('v10-history-sheet');
        if (sheet) return sheet;
        sheet = document.createElement('div');
        sheet.id = 'v10-history-sheet';
        sheet.className = 'v10-sheet';
        sheet.setAttribute('role','dialog');
        sheet.setAttribute('aria-modal','true');
        sheet.innerHTML = `<div class="v10-sheet-panel"><div class="v10-sheet-grabber"></div><div id="v10-history-content"></div></div>`;
        sheet.addEventListener('click', e => { if (e.target === sheet) root.closeExerciseHistory(); });
        document.body.appendChild(sheet);
        return sheet;
    }

    root.closeExerciseHistory = function () {
        const sheet = document.getElementById('v10-history-sheet');
        if (!sheet) return;
        sheet.classList.remove('open');
        setTimeout(() => { sheet.style.display = 'none'; }, 230);
    };

    root.openExerciseHistory = function (id) {
        const exercise = A.training?.model?.byId?.(id);
        if (!exercise) return;
        const summary = trainingSummary(id);
        const sessions = summary.sessions.slice(0, 12);
        const content = ensureHistorySheet().querySelector('#v10-history-content');
        const chronological = [...summary.metrics].reverse().slice(-12);
        const rawValues = chronological.map(x => x.metric.value);
        const higherBetter = chronological[0]?.metric?.higherBetter !== false;
        const plotValues = higherBetter ? rawValues : rawValues.map(v => v > 0 ? 1/v : 0);
        const spark = sparklinePath(plotValues);
        const latestLabel = summary.latest?.metric?.label || '—';
        const bestLabel = summary.best?.metric?.label || '—';
        const trend = A.training.v10.trendLabel(summary);

        content.innerHTML = `
            <div class="v10-sheet-head">
                <div><span class="eyebrow">ІСТОРІЯ ВПРАВИ</span><h2>${esc(exercise.name)}</h2><p>${esc(exercise.description || '')}</p></div>
                <button class="secondary v10-sheet-close" onclick="closeExerciseHistory()" aria-label="Закрити"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="v10-history-stats">
                <div class="v10-history-stat"><span>Сесій</span><strong>${summary.sessions.length}</strong></div>
                <div class="v10-history-stat"><span>Найкраще</span><strong>${esc(bestLabel)}</strong></div>
                <div class="v10-history-stat"><span>Останнє</span><strong>${esc(latestLabel)}</strong></div>
            </div>
            ${spark.path ? `<div class="v10-sparkline"><svg viewBox="0 0 560 104" preserveAspectRatio="none" aria-label="Графік прогресу"><path d="${spark.path}"></path>${spark.points.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3"></circle>`).join('')}</svg></div>` : ''}
            <div class="exercise-v10-summary">
                <span class="exercise-v10-chip ${summary.ratio && summary.ratio>1.01?'positive':''}"><i class="fa-solid fa-chart-line"></i>&nbsp;${esc(trend)}</span>
                ${summary.plateau ? `<span class="exercise-v10-chip plateau"><i class="fa-solid fa-equals"></i>&nbsp;3 сесії без помітного росту</span>` : ''}
            </div>
            <div class="v10-history-list">
                ${sessions.length ? sessions.map(s => `<div class="v10-history-row"><div class="v10-history-row-head"><strong>${esc(fmtDate(s.date))}</strong><span>${esc(sessionMetric(s).label)}</span></div><p>${esc(A.training.history.format(s))}</p></div>`).join('') : `<div class="v10-empty"><i class="fa-solid fa-clock-rotate-left"></i>Історія цієї вправи ще порожня.</div>`}
            </div>
            <div class="v10-history-actions">
                <button class="secondary" onclick="closeExerciseHistory(); repeatLastExercise('${esc(id)}')"><i class="fa-solid fa-rotate-left"></i> Повторити минуле</button>
                <button class="gradient-bg primary-btn" onclick="closeExerciseHistory(); applyExerciseProgression('${esc(id)}')"><i class="fa-solid fa-arrow-trend-up"></i> План прогресії</button>
            </div>`;

        const sheet = ensureHistorySheet();
        sheet.style.display = 'flex';
        requestAnimationFrame(() => sheet.classList.add('open'));
        A.haptics.tap();
    };

    function decorateWorkoutCardsV10() {
        document.querySelectorAll('.exercise-card[data-exercise-id]').forEach(card => {
            card.querySelector('.exercise-v10-tools')?.remove();
            card.querySelector('.exercise-v10-summary')?.remove();
            const id = card.dataset.exerciseId;
            const summary = trainingSummary(id);
            if (!summary.sessions.length) return;
            const suggestion = detailedSuggestion(id);
            const tools = document.createElement('div');
            tools.className = 'exercise-v10-tools';
            tools.innerHTML = `
                <button class="secondary" type="button" onclick="openExerciseHistory('${esc(id)}')"><i class="fa-solid fa-chart-line"></i>Історія</button>
                <button class="secondary" type="button" onclick="repeatLastExercise('${esc(id)}')"><i class="fa-solid fa-rotate-left"></i>Повторити</button>
                <button class="secondary" type="button" onclick="applyExerciseProgression('${esc(id)}')"><i class="fa-solid fa-arrow-trend-up"></i>Прогресія</button>`;
            const summaryRow = document.createElement('div');
            summaryRow.className = 'exercise-v10-summary';
            const trend = A.training.v10.trendLabel(summary);
            summaryRow.innerHTML = `
                <span class="exercise-v10-chip ${summary.ratio && summary.ratio>1.01?'positive':''}">${esc(trend)}</span>
                ${summary.plateau ? `<span class="exercise-v10-chip plateau">Плато ×3</span>` : ''}
                ${suggestion ? `<span class="exercise-v10-chip">Далі: ${esc(suggestion.label)}</span>` : ''}`;
            card.append(summaryRow, tools);
        });
    }

    function wrapWorkoutRendererV10() {
        if (typeof root.renderWorkouts !== 'function' || root.renderWorkouts.__v10Wrapped) return;
        const prev = root.renderWorkouts;
        const wrapped = function (...args) {
            const result = prev.apply(this,args);
            requestAnimationFrame(decorateWorkoutCardsV10);
            requestAnimationFrame(renderTrainingIntelligence);
            return result;
        };
        wrapped.__v10Wrapped = true;
        root.renderWorkouts = wrapped;
    }

    /* -------------------- Training workspace summary -------------------- */
    function insertTrainingIntelligence() {
        if (document.getElementById('training-intel-card')) return;
        const workoutTab = document.getElementById('tab-workout');
        if (!workoutTab) return;
        const blocks = Array.from(workoutTab.querySelectorAll('.workspace-block'));
        const library = blocks.find(block => block.textContent.includes('БІБЛІОТЕКА'));
        if (!library) return;
        const section = document.createElement('section');
        section.className = 'workspace-block premium-section';
        section.id = 'training-intel-section';
        section.innerHTML = `
            <div class="workspace-block-head"><div><span class="eyebrow">30 ДНІВ</span><h2>Прогрес тренувань</h2></div><span class="section-note">історія + PR + тренд</span></div>
            <div class="training-intel-card premium-surface" id="training-intel-card">
                <div class="training-intel-grid">
                    <div class="training-intel-stat"><span>Сесії</span><strong id="v10-train-sessions">0</strong><small>за 30 днів</small></div>
                    <div class="training-intel-stat"><span>Вправи</span><strong id="v10-train-exercises">0</strong><small>різних вправ</small></div>
                    <div class="training-intel-stat"><span>PR</span><strong id="v10-train-prs">0</strong><small>вправ із силовим PR</small></div>
                    <div class="training-intel-stat"><span>Фокус</span><strong id="v10-train-focus">—</strong><small>найчастіша вправа</small></div>
                </div>
                <div class="training-intel-recent" id="v10-training-recent"></div>
            </div>`;
        workoutTab.insertBefore(section, library);
    }

    function renderTrainingIntelligence() {
        insertTrainingIntelligence();
        const history = A.training?.history?.all?.() || [];
        const cutoff = Date.now() - 30*86400000;
        const recent = history.filter(s => Number(s.createdAt || new Date(`${s.date}T12:00:00`).getTime()) >= cutoff);
        const counts = new Map();
        recent.forEach(s => counts.set(s.exerciseName, (counts.get(s.exerciseName)||0)+1));
        const focus = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
        const prs = A.storage?.json?.('achilles_prs', {}) || {};
        const setText = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=String(value); };
        setText('v10-train-sessions', recent.length);
        setText('v10-train-exercises', counts.size);
        setText('v10-train-prs', Object.keys(prs).length);
        setText('v10-train-focus', focus === '—' ? focus : (focus.length > 15 ? `${focus.slice(0,14)}…` : focus));
        const list = document.getElementById('v10-training-recent');
        if (!list) return;
        const unique = [];
        const seen = new Set();
        history.forEach(s => { if (!seen.has(s.exerciseId)) { seen.add(s.exerciseId); unique.push(s); } });
        list.innerHTML = unique.length ? unique.slice(0,3).map(s => {
            const summary = trainingSummary(s.exerciseId);
            return `<div class="training-recent-row"><div><strong>${esc(s.exerciseName)}</strong><span>${esc(fmtDate(s.date))} · ${esc(A.training.history.format(s))}${summary.plateau?' · плато ×3':''}</span></div><button class="secondary" onclick="openExerciseHistory('${esc(s.exerciseId)}')">Історія</button></div>`;
        }).join('') : `<div class="v10-empty"><i class="fa-solid fa-dumbbell"></i>Після першого тренування тут з’явиться прогрес.</div>`;
    }

    /* -------------------- Analytics V2 -------------------- */
    function datesForRange(days) {
        if (typeof root.getLastNDates === 'function') return root.getLastNDates(days);
        const out=[]; const base=new Date();
        for(let i=days-1;i>=0;i--){ const d=new Date(base); d.setDate(base.getDate()-i); out.push(d.toISOString().slice(0,10)); }
        return out;
    }

    function weightTrend(days) {
        const history = (A.storage?.json?.('achilles_weight_history', []) || [])
            .filter(x => x?.date && Number(x?.weight)>0)
            .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1); cutoff.setHours(0,0,0,0);
        const inRange = history.filter(x => new Date(`${x.date}T12:00:00`) >= cutoff);
        if (inRange.length < 2) return null;
        const first=inRange[0], last=inRange[inRange.length-1];
        const span = Math.max(1, (new Date(`${last.date}T12:00:00`) - new Date(`${first.date}T12:00:00`))/86400000);
        const delta = Number(last.weight)-Number(first.weight);
        return { delta:round(delta,1), weekly:round(delta/span*7,2), first:Number(first.weight), last:Number(last.weight), points:inRange.length };
    }

    function strengthMomentum(days) {
        const cutoff = Date.now() - days*86400000;
        const all = (A.training?.history?.all?.() || []).filter(s => Number(s.createdAt||0)>=cutoff && s.exerciseType===A.training?.types?.STRENGTH_WEIGHTED);
        const grouped = new Map();
        all.forEach(s => { if(!grouped.has(s.exerciseId)) grouped.set(s.exerciseId,[]); grouped.get(s.exerciseId).push(s); });
        const ratios=[];
        grouped.forEach(list => {
            if(list.length<2) return;
            const latest=sessionMetric(list[0]), prev=sessionMetric(list[1]);
            const ratio=improvementRatio(latest,prev); if(ratio) ratios.push(ratio);
        });
        if(!ratios.length) return null;
        const avg=ratios.reduce((a,b)=>a+b,0)/ratios.length;
        return { ratio:avg, exercises:ratios.length };
    }

    function rangeSnapshot(days = 7) {
        const dates=datesForRange(days);
        const daysData=A.storage?.days?.() || root.allDaysData || {};
        const targets=A.storage?.macroTargets?.() || {p:0,f:0,c:0};
        const baseKcal=Number(A.storage?.get?.('achilles_base_kcal',2000) || 2000);
        const appMode=A.storage?.get?.('achilles_app_mode','pro') || 'pro';
        const profile=A.storage?.profile?.() || {};
        let loggedDays=0, kcalTotal=0, proteinHit=0, calorieHit=0, workouts=0;
        const rows=[];

        dates.forEach(date => {
            const d=daysData?.[date];
            const log=Array.isArray(d?.log)?d.log:[];
            const consumed=Number(d?.consumedCalories||0);
            const hasNutrition=consumed>0 || log.some(x=>x?.type==='food');
            const goal=baseKcal + (appMode==='pro'?Number(d?.workoutBonus||0):0);
            const p=Number(d?.macros?.p||0);
            const pHit=hasNutrition && Number(targets.p)>0 && p>=Number(targets.p)*.9;
            const kHit=hasNutrition && goal>0 && Math.abs(consumed-goal)/goal<=.10;
            const dayWorkouts=log.filter(x=>x?.type==='workout').length;
            if(hasNutrition){ loggedDays++; kcalTotal+=consumed; if(pHit) proteinHit++; if(kHit) calorieHit++; }
            workouts+=dayWorkouts;
            rows.push({date,consumed,goal,pHit,kHit,workouts:dayWorkouts,hasNutrition});
        });

        const proteinRate=loggedDays?proteinHit/loggedDays:0;
        const calorieRate=loggedDays?calorieHit/loggedDays:0;
        const expectedWorkouts=Math.max(1,Math.round(days/7*3));
        const weight=weightTrend(days);
        const strength=strengthMomentum(days);

        const metrics=[];
        const push=(key,label,max,available,ratio,detail)=>metrics.push({key,label,max,available,points:available?Math.round(clamp(ratio)*max):null,ratio:available?clamp(ratio):null,detail});
        push('calories','Калорії',25,loggedDays>=2,calorieRate,loggedDays?`${calorieHit}/${loggedDays} днів у ±10%`:'немає даних');
        push('protein','Білок',20,loggedDays>=2 && Number(targets.p)>0,proteinRate,loggedDays?`${proteinHit}/${loggedDays} днів ≥90%`:'немає даних');
        push('workouts','Тренування',20,true,workouts/expectedWorkouts,`${workouts}/${expectedWorkouts} цільових сесій`);

        let weightRatio=null, weightDetail='потрібно ≥2 зважувань';
        if(weight){
            const goal=profile.goal||'maintain';
            if(goal==='lose') weightRatio=weight.weekly<-.1?1:weight.weekly<=.1?.65:.2;
            else if(goal==='gain') weightRatio=weight.weekly>.1?1:weight.weekly>=-.1?.65:.2;
            else weightRatio=Math.abs(weight.weekly)<=.5?1:Math.abs(weight.weekly)<=1?.55:.2;
            weightDetail=`${weight.delta>0?'+':''}${weight.delta.toFixed(1)} кг за період`;
        }
        push('weight','Вага',15,!!weight,weightRatio||0,weightDetail);
        push('consistency','Регулярність',10,true,loggedDays/days,`${loggedDays}/${days} днів з харчуванням`);
        push('strength','Силовий прогрес',10,!!strength,strength?clamp(.65 + (strength.ratio-1)*8,0,1):0,strength?`${strength.exercises} вправ із порівнянням`:'потрібно ≥2 силових сесій');

        const available=metrics.filter(m=>m.available);
        const earned=available.reduce((s,m)=>s+Number(m.points||0),0);
        const maxAvailable=available.reduce((s,m)=>s+Number(m.max||0),0);
        const score=maxAvailable?Math.round(earned/maxAvailable*100):0;

        return {days,rows,loggedDays,kcalTotal,avgKcal:loggedDays?Math.round(kcalTotal/loggedDays):0,proteinHit,proteinRate,calorieHit,calorieRate,workouts,expectedWorkouts,weight,strength,metrics,score,coverage:maxAvailable/100};
    }

    A.analytics = A.analytics || {};
    A.analytics.rangeSnapshot = rangeSnapshot;
    A.analytics.weekSnapshot = () => rangeSnapshot(7);

    function insertAnalyticsV2() {
        if (document.getElementById('analytics-v2-shell')) return;
        const coachSection=document.querySelector('#tab-dashboard .coach-section');
        if(!coachSection) return;
        const section=document.createElement('section');
        section.className='premium-section analytics-v2-section';
        section.innerHTML=`
            <div class="section-heading-row"><div><span class="eyebrow">АНАЛІТИКА</span><h2>Що формує Score</h2></div><span class="section-note">прозорий розрахунок</span></div>
            <div class="analytics-v2-shell premium-surface" id="analytics-v2-shell">
                <div class="analytics-v2-head"><div><span class="eyebrow">ACHILLES SCORE V2</span><h3 id="v10-analytics-title">Баланс прогресу</h3></div><div class="analytics-v2-score"><strong class="gradient-text" id="v10-analytics-score">0</strong><span>/ 100</span></div></div>
                <div class="analytics-range-tabs" id="v10-range-tabs">
                    <button class="analytics-range-btn active" data-days="7">7 днів</button>
                    <button class="analytics-range-btn" data-days="30">30 днів</button>
                    <button class="analytics-range-btn" data-days="90">90 днів</button>
                    <button class="analytics-range-btn" data-days="365">365</button>
                </div>
                <div class="analytics-breakdown" id="v10-analytics-breakdown"></div>
                <div class="analytics-v2-note" id="v10-analytics-note">Категорії без достатньої кількості даних не знижують загальний Score.</div>
            </div>`;
        coachSection.parentNode.insertBefore(section, coachSection);
        section.querySelectorAll('.analytics-range-btn').forEach(btn=>btn.addEventListener('click',()=>{
            section.querySelectorAll('.analytics-range-btn').forEach(x=>x.classList.toggle('active',x===btn));
            localStorage.setItem('achilles_analytics_range',btn.dataset.days);
            renderAnalyticsV2(Number(btn.dataset.days));
            A.haptics.tap();
        }));
        const saved=Number(localStorage.getItem('achilles_analytics_range')||7);
        const target=section.querySelector(`.analytics-range-btn[data-days="${saved}"]`);
        if(target){ section.querySelectorAll('.analytics-range-btn').forEach(x=>x.classList.toggle('active',x===target)); }
    }

    function renderAnalyticsV2(days = Number(localStorage.getItem('achilles_analytics_range')||7)) {
        insertAnalyticsV2();
        const snap=rangeSnapshot(days);
        const score=document.getElementById('v10-analytics-score'); if(score) score.textContent=String(snap.score);
        const title=document.getElementById('v10-analytics-title');
        if(title) title.textContent=snap.score>=85?'Сильний баланс':snap.score>=70?'Стабільний прогрес':snap.score>=50?'Є запас для росту':'Потрібно більше стабільності';
        const box=document.getElementById('v10-analytics-breakdown');
        if(box) box.innerHTML=snap.metrics.map(m=>`<div class="analytics-metric ${m.available?'':'pending'}"><div class="analytics-metric-copy"><strong>${esc(m.label)}</strong><span>${esc(m.detail)}</span></div><div class="analytics-meter"><span style="--meter:${m.available?Math.round(m.ratio*100):0}%"></span></div><div class="analytics-metric-value">${m.available?`${m.points}/${m.max}`:`—/${m.max}`}</div></div>`).join('');
        const note=document.getElementById('v10-analytics-note'); if(note) note.textContent=`Період: ${days} днів · покриття оцінки ${Math.round(snap.coverage*100)}%. Категорії без достатніх даних не штрафують Score.`;
        return snap;
    }

    /* -------------------- Coach V2 -------------------- */
    function plateauCandidate() {
        const seen=new Set();
        for(const s of (A.training?.history?.all?.()||[])){
            if(seen.has(s.exerciseId)) continue;
            seen.add(s.exerciseId);
            const sum=trainingSummary(s.exerciseId);
            if(sum.plateau) return {session:s,summary:sum};
        }
        return null;
    }

    function coachPlan() {
        const snap=rangeSnapshot(7);
        const targets=A.storage?.macroTargets?.()||{p:0,f:0,c:0};
        const remainingProtein=Math.max(0,Math.round(Number(targets.p||0)-Number(root.macros?.p||0)));
        const calorieGoal=Number(A.storage?.get?.('achilles_base_kcal',2000)||2000)+(A.storage?.get?.('achilles_app_mode','pro')==='pro'?Number(root.workoutBonus||0):0);
        const plateau=plateauCandidate();
        const coverage=Math.round(snap.coverage*100);
        const confidence=coverage>=80&&snap.loggedDays>=5?'висока':coverage>=55&&snap.loggedDays>=3?'середня':'низька';

        if(snap.loggedDays<3) return {status:'Потрібно більше даних',message:'Заповни харчування хоча б за 3 дні — тоді Coach зможе відрізняти випадковий день від тренду.',sub:`Зараз є ${snap.loggedDays}/7 днів із харчуванням.`,action:'Відкрити раціон',target:'tab-food',confidence};
        if(snap.proteinRate<.6) return {status:'Фокус: білок',message:remainingProtein>0?`Сьогодні добери приблизно ${remainingProtein} г білка до своєї цілі.`:'Наступні кілька днів тримай білок ближче до цілі — це найслабше місце тижня.',sub:`Білок ≥90% виконано у ${snap.proteinHit} з ${snap.loggedDays} днів.`,action:'Додати їжу',target:'tab-food',confidence};
        if(snap.calorieRate<.5) return {status:'Фокус: калорії',message:`Сьогодні орієнтир — близько ${Math.round(calorieGoal)} ккал. Намагайся тримати день у коридорі ±10%.`,sub:`За останні 7 днів у коридор потрапило ${snap.calorieHit} з ${snap.loggedDays} днів.`,action:'Відкрити раціон',target:'tab-food',confidence};
        if(snap.workouts<Math.max(1,Math.ceil(snap.expectedWorkouts*.66))) return {status:'Фокус: тренування',message:'Додай одну якісну сесію замість спроби «наздогнати» весь тиждень одразу.',sub:`Записано ${snap.workouts} тренувань; орієнтир для Score — ${snap.expectedWorkouts}.`,action:'Відкрити зал',target:'tab-workout',confidence};
        if(plateau) return {status:'Фокус: прогресія',message:`${plateau.session.exerciseName}: три останні сесії майже без росту. Спробуй малий крок прогресії, а не різкий стрибок ваги.`,sub:detailedSuggestion(plateau.session.exerciseId)?.reason||'Зміни лише один параметр: повтори, вагу або тривалість.',action:'Показати вправу',target:'tab-workout',exerciseId:plateau.session.exerciseId,confidence};
        return {status:'Система стабільна',message:'Головні показники тижня збалансовані. Зараз найкраща стратегія — повторити цей ритм ще один тиждень.',sub:`Score ${snap.score}/100 · білок ${Math.round(snap.proteinRate*100)}% · калорійний коридор ${Math.round(snap.calorieRate*100)}% · тренувань ${snap.workouts}.`,action:'Переглянути аналітику',target:'tab-dashboard',confidence};
    }

    function renderCoachV2() {
        const plan=coachPlan();
        const status=document.getElementById('coach-status'); if(status) status.textContent=plan.status;
        const msg=document.getElementById('coach-message'); if(msg) msg.textContent=plan.message;
        const sub=document.getElementById('coach-submessage'); if(sub) sub.textContent=plan.sub;
        const card=document.querySelector('.coach-card'); if(!card) return;
        let actions=card.querySelector('.coach-primary-action');
        if(!actions){ actions=document.createElement('div'); actions.className='coach-primary-action'; card.appendChild(actions); }
        actions.innerHTML=`<button class="gradient-bg primary-btn" id="v10-coach-action"><i class="fa-solid fa-bolt"></i> ${esc(plan.action)}</button><span class="coach-confidence"><i class="fa-solid fa-signal"></i> Впевненість: ${esc(plan.confidence)}</span>`;
        actions.querySelector('#v10-coach-action')?.addEventListener('click',()=>{
            if(plan.target && A.router?.go) A.router.go(plan.target,{source:document.querySelector(`.nav-item[data-target="${plan.target}"]`)});
            if(plan.exerciseId) setTimeout(()=>{
                const card=findExerciseCard(plan.exerciseId);
                card?.scrollIntoView({behavior:'smooth',block:'center'});
                card?.classList.add('v10-flash');
            },180);
            A.haptics.tap();
        });
    }

    /* -------------------- Dashboard bridge -------------------- */
    const oldWeeklyRender = A.weekly?.render?.bind(A.weekly);
    if (A.weekly) {
        A.weekly.render = function (animate=false) {
            if (oldWeeklyRender) oldWeeklyRender(animate);
            const snap=rangeSnapshot(7);
            A.motion?.circle?.(document.getElementById('week-score-progress'),snap.score/100,animate,1250);
            const badge=document.getElementById('progress-score-badge'); if(badge) badge.textContent=`${snap.score} / 100`;
            const title=document.getElementById('week-score-title'); if(title) title.textContent=snap.loggedDays<3?'Збираємо дані':snap.score>=85?'Сильний тиждень':snap.score>=70?'Хороший ритм':snap.score>=50?'Є запас':'Потрібна стабільність';
            const caption=document.getElementById('week-score-caption'); if(caption) caption.textContent=snap.loggedDays<3?`Дані є за ${snap.loggedDays} із 7 днів.`:`Score V2 · білок ${Math.round(snap.proteinRate*100)}% · ккал ${Math.round(snap.calorieRate*100)}% · тренувань ${snap.workouts}.`;
            const wt=document.getElementById('stat-weight-trend'); if(wt) wt.textContent=snap.weight?`${snap.weight.delta>0?'+':''}${snap.weight.delta.toFixed(1)} кг`:'—';
            renderAnalyticsV2();
            renderCoachV2();
        };
    }

    /* old global hook still gets called from weight logging and diary updates */
    const legacyProgressInsights = root.renderProgressInsights;
    root.renderProgressInsights = function (...args) {
        let result;
        try { result = typeof legacyProgressInsights==='function' ? legacyProgressInsights.apply(this,args) : undefined; } catch (error) { console.warn('[Achilles V10 legacy insights]',error); }
        requestAnimationFrame(()=>{
            try { A.weekly?.render?.(false); } catch (error) { console.warn('[Achilles V10 weekly]',error); }
            renderTrainingIntelligence();
        });
        return result;
    };

    /* General PRs for non-weighted exercises + refresh after every workout */
    function generalizedPR(name, metadata) {
        const exercise=A.training?.model?.byId?.(metadata.exerciseId) || A.training?.model?.byName?.(name);
        if(!exercise) return null;
        if(metadata.pr?.isPR) return metadata.pr;
        const prior=historyFor(exercise.id);
        if(!prior.length) return null;
        const fake=A.training.model.entryFromLegacy({id:Date.now(),createdAt:Date.now(),exercise:name,...metadata},exercise.raw);
        if(!fake) return null;
        const current=sessionMetric(fake);
        if(!(current.value>0)) return null;
        const bestPrior=prior.map(sessionMetric).filter(x=>x.value>0).sort((a,b)=> current.higherBetter===false ? a.value-b.value : b.value-a.value)[0];
        if(!bestPrior) return null;
        const improved=current.higherBetter===false ? current.value<bestPrior.value*.995 : current.value>bestPrior.value*1.005;
        if(!improved) return null;
        return {isPR:true,label:`Новий PR: ${current.label}`};
    }

    function wrapWorkoutLoggerV10() {
        if(typeof root.logWorkoutEntry!=='function' || root.logWorkoutEntry.__v10Wrapped) return;
        const prev=root.logWorkoutEntry;
        const wrapped=function(name,burned,details,metadata={}){
            const exercise=A.training?.model?.byId?.(metadata.exerciseId) || A.training?.model?.byName?.(name);
            const enriched={...metadata,exerciseId:metadata.exerciseId||exercise?.id||null,exerciseType:metadata.exerciseType||exercise?.type||null};
            if(!enriched.pr?.isPR){ const gpr=generalizedPR(name,enriched); if(gpr) enriched.pr=gpr; }
            const result=prev.call(this,name,burned,details,enriched);
            if(enriched.pr?.isPR){
                localStorage.setItem('achilles_last_pr',JSON.stringify({name,label:enriched.pr.label,date:root.todayDate,updatedAt:Date.now()}));
                A.haptics.success(); A.toast(enriched.pr.label,'fa-trophy',3200);
            } else { A.haptics.tap(); }
            setTimeout(()=>{ renderTrainingIntelligence(); renderAnalyticsV2(); renderCoachV2(); root.searchWorkout?.(); },80);
            return result;
        };
        wrapped.__v10Wrapped=true;
        root.logWorkoutEntry=wrapped;
    }

    function addBuildBadge() {
        const hero=document.querySelector('#tab-profile .profile-hero-copy');
        if(hero && !hero.querySelector('.v10-build-badge')) hero.insertAdjacentHTML('beforeend','<span class="v10-build-badge"><i class="fa-solid fa-code-branch"></i> Achilles OS 10.14 · local-first</span>');
    }

    function installPolish() {
        document.addEventListener('keydown',e=>{ if(e.key==='Escape') root.closeExerciseHistory?.(); });
        document.addEventListener('pointerdown',e=>{
            if(e.target.closest('button,.filter-tab,.nav-item')) A.haptics.tap();
        },{passive:true});
        root.addEventListener('unhandledrejection',e=>console.warn('[Achilles async]',e.reason));
    }

    function bootstrapV10() {
        wrapWorkoutRendererV10();
        wrapWorkoutLoggerV10();
        insertTrainingIntelligence();
        insertAnalyticsV2();
        addBuildBadge();
        installPolish();
        root.searchWorkout?.();
        renderTrainingIntelligence();
        renderAnalyticsV2();
        renderCoachV2();
        if(A.dashboard?.refresh){
            const old=A.dashboard.refresh.bind(A.dashboard);
            A.dashboard.refresh=function(opts={}){ const r=old(opts); requestAnimationFrame(()=>{renderAnalyticsV2();renderCoachV2();}); return r; };
        }
        console.info('[Achilles OS] V10.3 iOS standalone viewport fix ready');
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootstrapV10,{once:true});
    else bootstrapV10();
})(window);

