/* ===== achilles-v10-3-food-reliability ===== */

(function(root){
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    if (!A.nutritionRepo) return;

    const repo = A.nutritionRepo;
    const RECENT_KEY = A.storage?.keys?.foodRecent || 'achilles_food_recent_v1';
    const MIN_ONLINE_INTERVAL = 6500; // OFF search limit is 10 requests/min/IP
    let lastOnlineRequestAt = 0;
    let activeController = null;
    let cardSeq = 0;

    const esc = value => String(value ?? '')
        .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
        .replaceAll('"','&quot;').replaceAll("'",'&#039;');
    const strip = value => String(value || '').replace(/^[^\p{L}\p{N}]+/u,'').trim();
    const qnorm = value => String(value || '').trim().toLocaleLowerCase('uk-UA').replace(/\s+/g,' ');

    repo.isCustom = function(item){
        const key = this.key(item);
        return this.custom().some(x => this.key(x) === key);
    };

    repo.deleteCustom = function(item){
        const normalized = this.normalize(item);
        if (!normalized) return false;
        const key = this.key(normalized);
        const before = this.custom();
        const next = before.filter(x => this.key(x) !== key);
        if (next.length === before.length) return false;

        this.setCustom(next);
        this.setFavorites(this.favorites().filter(x => this.key(x) !== key));
        try {
            const recents = this.recent().filter(x => this.key(x) !== key);
            A.storage?.setJSON?.(RECENT_KEY, recents);
        } catch (_) {}
        A.sync?.push?.('custom-food-delete');
        root.syncCustomFoodsBackup?.().catch?.(error => console.warn('[Achilles] immediate custom food delete backup', error));
        return true;
    };

    function register(item){
        const normalized = repo.normalize(item);
        if (!normalized) return null;
        const key = `food-v103-${Date.now().toString(36)}-${++cardSeq}`;
        A.foodCardRegistry = A.foodCardRegistry || new Map();
        A.foodCardRegistry.set(key, normalized);
        while (A.foodCardRegistry.size > 220) {
            A.foodCardRegistry.delete(A.foodCardRegistry.keys().next().value);
        }
        return key;
    }

    function fromKey(key){
        return repo.normalize(A.foodCardRegistry?.get(String(key || '')));
    }

    root.generateFoodCardHtml = function(item, index){
        const normalized = repo.normalize(item);
        if (!normalized) return '';
        const custom = repo.isCustom(normalized);
        if (custom) normalized.source = 'custom';
        const favorite = repo.isFavorite(normalized);
        const cardKey = register(normalized);
        if (!cardKey) return '';
        const inputId = `food-input-${cardKey}`;
        const source = String(normalized.source || 'local');
        const online = /open food facts/i.test(source) || source === 'cache';
        const sourceLabel = custom ? 'Свій продукт'
            : source === 'ua-market' ? (normalized.store === 'silpo' ? 'Сільпо · локальна БД' : normalized.store === 'auchan' ? 'Ашан · локальна БД' : 'UA Market · локальна БД')
            : source === 'usda' || normalized.ndb ? 'USDA · локальна БД'
            : source === 'cache' ? 'Кеш'
            : online ? 'Open Food Facts'
            : 'Локальна БД';

        return `
            <div class="list-item" style="${online ? 'border-left:3px solid var(--primary);' : ''}">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:flex-start;margin-bottom:12px;gap:12px;">
                    <div style="min-width:0;">
                        <strong style="font-size:18px;overflow-wrap:anywhere;">${esc(normalized.name)}</strong><br>
                        <span style="font-size:13px;opacity:.8;color:var(--text-muted);">${Math.round(normalized.kcal)} ккал | Б:${Number(normalized.p.toFixed(1))} Ж:${Number(normalized.f.toFixed(1))} В:${Number(normalized.c.toFixed(1))} (на 100г)</span><br>
                        <span class="food-source-badge">${esc(sourceLabel)}</span>
                    </div>
                    <div class="food-card-actions">
                        ${custom ? `<button class="food-delete-btn" type="button" onclick="deleteCustomFoodByKey('${cardKey}')" aria-label="Видалити власний продукт"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                        <i class="fa-${favorite ? 'solid' : 'regular'} fa-heart fav-btn ${favorite ? 'active' : ''}" onclick="toggleFavFoodByKey('${cardKey}', event)"></i>
                    </div>
                </div>
                <div style="display:flex;width:100%;gap:10px;">
                    <input type="number" inputmode="decimal" min="1" step="1" id="${inputId}" placeholder="Вага (г)" style="margin:0;padding:14px;flex:1;">
                    <button class="add-btn primary-btn gradient-bg" onclick="addFoodByKey('${cardKey}', '${inputId}')" style="margin:0;padding:0 25px;border-radius:16px;">+</button>
                </div>
            </div>`;
    };

    root.deleteCustomFoodByKey = function(cardKey){
        const item = fromKey(cardKey);
        if (!item || !repo.isCustom(item)) {
            A.toast?.('Це не власний продукт', 'fa-circle-info');
            return false;
        }
        const cleanName = strip(item.name);
        if (!root.confirm(`Видалити власний продукт «${cleanName}»?`)) return false;
        const deleted = repo.deleteCustom(item);
        if (!deleted) return false;
        A.foodCardRegistry?.delete?.(cardKey);
        A.haptics?.light?.();
        A.toast?.(`Видалено: ${cleanName}`, 'fa-trash-can', 1800);
        refreshCurrentFoodView();
        return true;
    };

    function render(items){
        const box = document.getElementById('food-results');
        if (!box) return;
        const list = repo.dedupe(items || []);
        box.innerHTML = list.map((item,i) => root.generateFoodCardHtml(item, `v103-${i}`)).join('');
    }

    function renderRecent(){
        const recent = repo.recent();
        if (recent.length) {
            render(recent);
            root.setFoodApiStatus?.(navigator.onLine ? 'cache' : 'offline', navigator.onLine
                ? 'Нещодавні продукти · введи назву або натисни «Знайти»'
                : 'Офлайн · нещодавні продукти доступні');
        } else {
            const browse = repo.browse?.(18) || [];
            render(browse);
            const meta = root.ACHILLES_FOOD_CORE_META || {};
            const total = Number(meta.canonicalProfiles || root.ACHILLES_FOOD_CORE_CANONICAL?.length || 0);
            const ua = Number(meta.uaMarketProfiles || root.ACHILLES_FOOD_CORE_CANONICAL?.filter?.(x=>x?.source==='ua-market')?.length || 0);
            root.setFoodApiStatus?.(navigator.onLine ? 'ready' : 'offline',
                (ua ? `Локальна БД: ${total} профілів · ${ua} товарів українського ритейлу · підбірка нижче`
                    : `Локальна БД: ${total} профілів · введи назву для пошуку`));
        }
    }

    function refreshCurrentFoodView(){
        if (root.currentFoodFilter === 'fav') { root.renderFavFoods?.(); return; }
        const q = qnorm(document.getElementById('food-search')?.value || '');
        if (q.length < 2) { renderRecent(); return; }
        const local = repo.localSearch(q);
        const cached = repo.cached(q, { allowStale:true }).map(x => ({...x, source:'cache'}));
        render([...local, ...cached]);
    }

    // Important: local/cache search is live, but network search is explicit.
    // This avoids Open Food Facts' 10-search-requests/minute rate limit.
    root.onSearchInput = function(){
        activeController?.abort();
        const q = qnorm(document.getElementById('food-search')?.value || '');
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'none';
        if (q.length < 2) { renderRecent(); return; }

        const local = repo.localSearch(q);
        const cached = repo.cached(q, { allowStale:true }).map(x => ({...x, source:'cache'}));
        render([...local, ...cached]);
        root.setFoodApiStatus?.(cached.length ? 'cache' : 'ready', cached.length
            ? 'Є кешований результат · «Знайти» оновить онлайн'
            : 'Локальні результати готові · натисни «Знайти» для онлайн-бази');
    };

    function busy(on){
        const btn = document.getElementById('food-online-search-btn');
        if (!btn) return;
        btn.disabled = !!on;
        btn.innerHTML = on
            ? '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Пошук</span>'
            : '<i class="fa-solid fa-cloud-arrow-down"></i><span>Знайти</span>';
    }

    function errKind(error){
        const msg = String(error?.message || error || '');
        if (/429/.test(msg)) return 'rate';
        if (/503|502|504/.test(msg)) return 'server';
        if (error?.name === 'AbortError') return 'abort';
        return 'network';
    }

    async function callWithTimeout(fn, query, timeoutMs=8000){
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
        try { return await fn(query, controller.signal); }
        finally { clearTimeout(timer); if (activeController === controller) activeController = null; }
    }

    async function doOnline(q){
        const now = Date.now();
        const wait = MIN_ONLINE_INTERVAL - (now - lastOnlineRequestAt);
        if (wait > 0) {
            const sec = Math.max(1, Math.ceil(wait/1000));
            root.setFoodApiStatus?.('cache', `Захищаю API від ліміту · повтори через ${sec} с`);
            const cached = repo.cached(q, {allowStale:true});
            render([...repo.localSearch(q), ...cached.map(x=>({...x,source:'cache'}))]);
            return [];
        }
        lastOnlineRequestAt = now;
        busy(true);
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'block';
        root.setFoodApiStatus?.('loading', 'Шукаю в Open Food Facts…');

        let raw = [];
        let source = 'Open Food Facts Search';
        try {
            try {
                raw = await callWithTimeout(root.fetchSearchALicious, q, 7500);
            } catch (primaryError) {
                const kind = errKind(primaryError);
                if (kind === 'abort') throw primaryError;
                if (kind === 'rate') throw primaryError;
                source = 'Open Food Facts fallback';
                raw = await callWithTimeout(root.fetchLegacyOFF, q, 9000);
            }

            const online = repo.dedupe((raw || [])
                .map((x,i) => root.normalizeOnlineFood?.(x,i,source))
                .filter(Boolean)
                .map(x => repo.normalize(x,{source})))
                .slice(0,12);

            if (online.length) repo.cache(q, online);
            const combined = repo.dedupe([...repo.localSearch(q), ...online]);
            render(combined);
            root.setFoodApiStatus?.(online.length ? 'online' : 'empty', online.length
                ? `Open Food Facts · ${online.length} результатів`
                : (combined.length ? 'Онлайн-збігів немає · показано локальні' : 'Збігів не знайдено'));
            return online;
        } catch(error) {
            if (errKind(error) === 'abort') return [];
            console.warn('[Achilles V10.3] OFF search failed', error);
            const cached = repo.cached(q,{allowStale:true});
            render([...repo.localSearch(q), ...cached.map(x=>({...x,source:'cache'}))]);
            const kind = errKind(error);
            root.setFoodApiStatus?.(cached.length ? 'cache' : 'error', cached.length
                ? 'Open Food Facts не відповідає · показано кеш'
                : kind === 'rate'
                    ? 'Ліміт Open Food Facts · зачекай кілька секунд і повтори'
                    : kind === 'server'
                        ? 'Open Food Facts перевантажений · локальна база працює'
                        : 'Немає відповіді від Open Food Facts · локальна база працює');
            return [];
        } finally {
            if (spinner) spinner.style.display = 'none';
            busy(false);
        }
    }

    root.runOnlineFoodSearch = function(){
        const q = qnorm(document.getElementById('food-search')?.value || '');
        if (q.length < 2) {
            A.toast?.('Введи хоча б 2 символи', 'fa-magnifying-glass');
            return Promise.resolve([]);
        }
        return doOnline(q);
    };

    // Keep compatibility with old code, but do not silently trigger it from typing.
    root.searchOnlineFood = q => doOnline(qnorm(q));
    root.searchOpenFoodFacts = root.searchOnlineFood;

    // Re-render favorites with delete controls for custom products.
    root.renderFavFoods = function(){
        const box = document.getElementById('food-results');
        if (!box) return;
        const favorites = repo.favorites();
        box.innerHTML = favorites.length
            ? favorites.map((item,i) => root.generateFoodCardHtml(item,`fav-v103-${i}`)).join('')
            : '<div class="list-item" style="color:var(--text-muted);text-align:center;padding:20px;border:none;">Улюблених продуктів поки немає</div>';
    };

    // Refresh stale status left from a previous failed API call.
    function resetStatus(){
        if (root.currentFoodFilter !== 'fav' && !(document.getElementById('food-search')?.value || '').trim()) renderRecent();
    }
    root.addEventListener('online', resetStatus);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resetStatus, {once:true});
    else setTimeout(resetStatus, 0);
})(window);


/* ===== achilles-v10-4-food-hotfix ===== */

(function(root){
    'use strict';
    const A = root.Achilles = root.Achilles || {};
    const repo = A.nutritionRepo;
    if (!repo) return;

    const CUSTOM_KEY = A.storage?.keys?.customFoods || 'achilles_custom_foods';
    const FAV_KEY = A.storage?.keys?.favFoods || 'achilles_fav_foods';
    const RECENT_KEY = A.storage?.keys?.foodRecent || 'achilles_food_recent_v1';
    let seq = 0;

    const esc = value => String(value ?? '')
        .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
        .replaceAll('"','&quot;').replaceAll("'",'&#039;');

    const stripMarker = value => String(value || '')
        .replace(/^\s*🛠️\s*/u,'')
        .replace(/^[^\p{L}\p{N}]+/u,'')
        .trim();

    const canon = value => stripMarker(value)
        .toLocaleLowerCase('uk-UA')
        .replace(/\\+/g,'\\')
        .replace(/\s+/g,' ')
        .trim();

    const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

    function fingerprint(item){
        const n = repo.normalize(item);
        if (!n) return '';
        return [canon(n.name), Math.round(num(n.kcal)*10)/10, Math.round(num(n.p)*10)/10,
            Math.round(num(n.f)*10)/10, Math.round(num(n.c)*10)/10].join('|');
    }

    function hasCustomMarker(item){
        return /^\s*🛠️/u.test(String(item?.name || '')) || item?.source === 'custom';
    }

    function customMatch(a,b){
        if (!a || !b) return false;
        try { if (repo.key(a) === repo.key(b)) return true; } catch(_) {}
        if (fingerprint(a) === fingerprint(b)) return true;
        return canon(a.name) === canon(b.name) && Math.round(num(a.kcal)) === Math.round(num(b.kcal));
    }

    // Legacy favorites often lost source:'custom'. The hammer marker is part of the old
    // Achilles custom-food format, so treat it as authoritative too.
    repo.isCustom = function(item){
        const n = this.normalize(item);
        if (!n) return false;
        if (hasCustomMarker(n)) return true;
        return this.custom().some(x => customMatch(x,n));
    };

    repo.deleteCustom = function(item){
        const n = this.normalize(item);
        if (!n) return false;
        let changed = false;

        const customBefore = this.custom();
        const customNext = customBefore.filter(x => !customMatch(x,n));
        if (customNext.length !== customBefore.length) {
            this.setCustom(customNext);
            changed = true;
        }

        const favBefore = this.favorites();
        const favNext = favBefore.filter(x => !customMatch(x,n));
        if (favNext.length !== favBefore.length) {
            this.setFavorites(favNext);
            changed = true;
        }

        try {
            const recentBefore = this.recent();
            const recentNext = recentBefore.filter(x => !customMatch(x,n));
            if (recentNext.length !== recentBefore.length) {
                A.storage?.setJSON?.(RECENT_KEY,recentNext);
                changed = true;
            }
        } catch(_) {}

        // Also clean raw legacy arrays in case old cloud data did not have V9 metadata.
        try {
            const rawCustom = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
            const next = Array.isArray(rawCustom) ? rawCustom.filter(x => !customMatch(x,n)) : [];
            if (next.length !== rawCustom.length) { localStorage.setItem(CUSTOM_KEY,JSON.stringify(next)); changed = true; }
        } catch(_) {}
        try {
            const rawFav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
            const next = Array.isArray(rawFav) ? rawFav.filter(x => !customMatch(x,n)) : [];
            if (next.length !== rawFav.length) { localStorage.setItem(FAV_KEY,JSON.stringify(next)); changed = true; }
        } catch(_) {}

        if (changed) A.sync?.push?.('custom-food-delete');
        return changed;
    };

    A.foodCardRegistry = A.foodCardRegistry || new Map();
    function register(item){
        const n = repo.normalize(item);
        if (!n) return null;
        const key = `food-v104-${Date.now().toString(36)}-${++seq}`;
        A.foodCardRegistry.set(key,n);
        while (A.foodCardRegistry.size > 260) A.foodCardRegistry.delete(A.foodCardRegistry.keys().next().value);
        return key;
    }
    function byKey(key){
        return repo.normalize(A.foodCardRegistry?.get(String(key || '')));
    }

    function decodeLegacyPayload(payload){
        if (payload && typeof payload === 'object') return repo.normalize(payload);
        let raw = String(payload ?? '').replace(/&quot;/g,'"').replace(/&#039;/g,"'");
        try { return repo.normalize(JSON.parse(raw)); } catch(_) {}
        // Old inline onclick collapsed JSON's \\ into \, making names such as "к\\м"
        // invalid JSON. Escape only invalid JSON backslash sequences and retry.
        try {
            raw = raw.replace(/\\(?!["\\/bfnrtu])/g,'\\\\');
            return repo.normalize(JSON.parse(raw));
        } catch(error) {
            console.warn('[Achilles V10.4] legacy food payload unreadable', error, raw);
            return null;
        }
    }

    function persistDay(){
        try {
            if (A.daily?.save) { A.daily.save({sync:true,touch:true}); return true; }
            root.saveDailyData?.();
            return true;
        } catch(error) {
            console.warn('[Achilles V10.4] normal daily save failed, using fallback', error);
            try {
                const date = root.currentViewDate || root.todayDate || new Date().toISOString().slice(0,10);
                const all = root.allDaysData && typeof root.allDaysData === 'object' ? root.allDaysData : {};
                all[date] = {
                    consumedCalories:num(root.consumedCalories), workoutBonus:num(root.workoutBonus),
                    macros:{p:num(root.macros?.p),f:num(root.macros?.f),c:num(root.macros?.c)},
                    log:Array.isArray(root.dailyLog) ? root.dailyLog : [], updatedAt:Date.now()
                };
                root.allDaysData = all;
                localStorage.setItem('achilles_all_days',JSON.stringify(all));
                A.sync?.push?.('food-add-fallback');
                return true;
            } catch(fallbackError) {
                console.error('[Achilles V10.4] fallback save failed', fallbackError);
                return false;
            }
        }
    }

    function safeAdd(item, weightId){
        const n = repo.normalize(item);
        if (!n) {
            A.toast?.('Не вдалося прочитати продукт','fa-triangle-exclamation',2600);
            return false;
        }
        const input = document.getElementById(weightId);
        let weight = Number(String(input?.value ?? '').replace(',','.'));
        if (!Number.isFinite(weight) || weight <= 0) weight = 100;

        const ratio = weight / 100;
        const kcal = Math.round(num(n.kcal)*ratio);
        const p = Math.round(num(n.p)*ratio*10)/10;
        const f = Math.round(num(n.f)*ratio*10)/10;
        const c = Math.round(num(n.c)*ratio*10)/10;
        const previous = {
            kcal:num(root.consumedCalories),
            p:num(root.macros?.p), f:num(root.macros?.f), c:num(root.macros?.c),
            logLength:Array.isArray(root.dailyLog) ? root.dailyLog.length : 0
        };

        root.consumedCalories = previous.kcal + kcal;
        root.macros = root.macros || {p:0,f:0,c:0};
        root.macros.p = previous.p + p;
        root.macros.f = previous.f + f;
        root.macros.c = previous.c + c;
        root.dailyLog = Array.isArray(root.dailyLog) ? root.dailyLog : [];

        const now = Date.now();
        root.dailyLog.push({
            id:`food-${now}-${Math.random().toString(36).slice(2,7)}`,
            createdAt:now,type:'food',foodId:n.id || repo.key(n),foodSource:n.source || 'local',
            barcode:n.barcode || '',weightG:weight,kcal,p,f,c,
            html:`<i class="fa-solid fa-utensils diary-entry-icon diary-food-icon" aria-hidden="true"></i> <strong style="color:var(--text-main);">${esc(n.name)} (${weight}г)</strong><br>`+
                 `<span style="font-size:14px;opacity:.8;" class="gradient-text">${kcal} ккал</span> `+
                 `<span style="font-size:12px;opacity:.6;color:var(--text-main);">| Б:${p} Ж:${f} В:${c}</span>`
        });

        if (!persistDay()) {
            root.consumedCalories = previous.kcal;
            root.macros.p = previous.p; root.macros.f = previous.f; root.macros.c = previous.c;
            root.dailyLog.splice(previous.logLength);
            A.toast?.('Не вдалося зберегти продукт','fa-triangle-exclamation',3000);
            return false;
        }

        try { repo.touchRecent(n); } catch(_) {}
        try { root.updateGoalDisplay?.(); } catch(_) {}
        try { root.renderDiary?.(); } catch(_) {}
        if (input) input.value = '';
        A.haptics?.success?.();
        A.toast?.(`Додано: ${stripMarker(n.name)} · ${weight} г`,'fa-check',1800);

        const search = document.getElementById('food-search');
        if (search) search.value = '';
        if (root.currentFoodFilter === 'fav') root.renderFavFoods?.();
        else {
            const results = document.getElementById('food-results');
            if (results) results.innerHTML = '';
        }
        document.querySelector('.nav-item[data-target="tab-dashboard"]')?.click();
        return true;
    }

    root.addFoodByKey = function(cardKey,weightId){
        const item = byKey(cardKey);
        if (!item) {
            A.toast?.('Картка застаріла — оновлюю список','fa-arrows-rotate',2000);
            forceRefresh();
            return false;
        }
        return safeAdd(item,weightId);
    };
    root.addFood = function(payload,weightId){
        return safeAdd(decodeLegacyPayload(payload),weightId);
    };

    root.toggleFavFoodByKey = function(cardKey,event){
        const item = byKey(cardKey);
        if (!item) { forceRefresh(); return false; }
        const active = repo.toggleFavorite(item);
        if (event?.target) {
            event.target.classList.toggle('fa-solid',active);
            event.target.classList.toggle('fa-regular',!active);
            event.target.classList.toggle('active',active);
        }
        if (root.currentFoodFilter === 'fav') root.renderFavFoods?.();
        return active;
    };
    root.toggleFavFood = function(payload,event){
        const item = decodeLegacyPayload(payload);
        if (!item) return false;
        const active = repo.toggleFavorite(item);
        if (event?.target) {
            event.target.classList.toggle('fa-solid',active);
            event.target.classList.toggle('fa-regular',!active);
            event.target.classList.toggle('active',active);
        }
        if (root.currentFoodFilter === 'fav') root.renderFavFoods?.();
        return active;
    };

    root.generateFoodCardHtml = function(item,index){
        const n = repo.normalize(item);
        if (!n) return '';
        const custom = repo.isCustom(n);
        if (custom) n.source = 'custom';
        const favorite = repo.isFavorite(n);
        const key = register(n);
        if (!key) return '';
        const inputId = `food-input-${key}`;
        const online = n.source && !['local','built-in','custom'].includes(n.source);
        const sourceLabel = custom ? 'Свій продукт' : (n.nutrientSource || (n.source === 'cache' ? 'Кеш' : (online ? 'Open Food Facts' : 'Локально')));
        return `<div class="list-item" data-food-key="${key}" style="${online ? 'border-left:3px solid var(--primary);' : ''}">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:flex-start;margin-bottom:12px;gap:12px;">
                <div style="min-width:0;">
                    <strong style="font-size:18px;overflow-wrap:anywhere;">${esc(n.name)}</strong><br>
                    <span style="font-size:13px;opacity:.8;color:var(--text-muted);">${Math.round(num(n.kcal))} ккал | Б:${Math.round(num(n.p)*10)/10} Ж:${Math.round(num(n.f)*10)/10} В:${Math.round(num(n.c)*10)/10} (на 100г)</span><br>
                    <span class="food-source-badge">${esc(sourceLabel)}</span>
                </div>
                <div class="food-card-actions-v104">
                    ${custom ? `<button class="food-delete-btn-v104" type="button" onclick="deleteCustomFoodByKey('${key}')" aria-label="Видалити власний продукт"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    <i class="fa-${favorite ? 'solid' : 'regular'} fa-heart fav-btn ${favorite ? 'active' : ''}" onclick="toggleFavFoodByKey('${key}',event)"></i>
                </div>
            </div>
            <div style="display:flex;width:100%;gap:10px;">
                <input type="number" inputmode="decimal" min="1" step="1" id="${inputId}" placeholder="Вага (г)" style="margin:0;padding:14px;flex:1;">
                <button class="add-btn primary-btn gradient-bg" type="button" onclick="addFoodByKey('${key}','${inputId}')" style="margin:0;padding:0 25px;border-radius:16px;">+</button>
            </div>
        </div>`;
    };

    root.deleteCustomFoodByKey = function(cardKey){
        const item = byKey(cardKey);
        if (!item || !repo.isCustom(item)) {
            A.toast?.('Це не власний продукт','fa-circle-info');
            return false;
        }
        const clean = stripMarker(item.name);
        if (!root.confirm(`Видалити власний продукт «${clean}»?`)) return false;
        if (!repo.deleteCustom(item)) {
            A.toast?.('Продукт уже видалений','fa-circle-info');
            forceRefresh();
            return false;
        }
        A.foodCardRegistry?.delete?.(cardKey);
        A.haptics?.light?.();
        A.toast?.(`Видалено: ${clean}`,'fa-trash-can',1800);
        forceRefresh();
        return true;
    };

    root.renderFavFoods = function(){
        const box = document.getElementById('food-results');
        if (!box) return;
        const favorites = repo.favorites();
        box.innerHTML = favorites.length
            ? favorites.map((item,i)=>root.generateFoodCardHtml(item,`fav-v104-${i}`)).join('')
            : '<div class="list-item" style="color:var(--text-muted);text-align:center;padding:20px;border:none;">Улюблених продуктів поки немає</div>';
    };

    function forceRefresh(){
        if (root.currentFoodFilter === 'fav') { root.renderFavFoods?.(); return; }
        root.onSearchInput?.();
    }

    // Rebuild cards after all scripts are installed. This is the piece that old V10.3
    // missed: already-rendered legacy cards kept their old inline JSON handlers.
    const scheduleRefresh = () => {
        requestAnimationFrame(forceRefresh);
        setTimeout(forceRefresh,350);
        setTimeout(forceRefresh,1400);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleRefresh,{once:true});
    else scheduleRefresh();
    root.addEventListener('pageshow',()=>setTimeout(forceRefresh,80));

    console.info('[Achilles OS] V10.4 food compatibility hotfix active');
})(window);
