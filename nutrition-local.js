/* ===== achilles-v10-5-food-dom-hotfix ===== */

(function(root){
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const repo = A.nutritionRepo || null;
    const CUSTOM_KEY = A.storage?.keys?.customFoods || 'achilles_custom_foods';
    const FAV_KEY = A.storage?.keys?.favFoods || 'achilles_fav_foods';
    const RECENT_KEY = A.storage?.keys?.foodRecent || 'achilles_food_recent_v1';

    const num = v => {
        const n = Number(String(v ?? '').replace(',','.'));
        return Number.isFinite(n) ? n : 0;
    };

    const cleanName = value => String(value || '')
        .replace(/^\s*🛠️\s*/u,'')
        .replace(/^[^\p{L}\p{N}]+/u,'')
        .trim();

    const canon = value => cleanName(value)
        .toLocaleLowerCase('uk-UA')
        .replace(/[\\/_–—-]+/g,' ')
        .replace(/[^\p{L}\p{N}%]+/gu,' ')
        .replace(/\s+/g,' ')
        .trim();

    function read(key){
        try {
            const v = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(v) ? v : [];
        } catch(_) { return []; }
    }

    function write(key, value){
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch(_) { return false; }
    }

    function norm(item){
        if (!item || typeof item !== 'object') return null;
        if (repo?.normalize) {
            const n = repo.normalize(item);
            if (n) return n;
        }
        const name = String(item.name || '').trim();
        if (!name) return null;
        return {
            ...item,
            name,
            kcal:num(item.kcal),p:num(item.p),f:num(item.f),c:num(item.c),
            source:item.source || 'local'
        };
    }

    function sameFood(a,b){
        const x=norm(a), y=norm(b);
        if (!x || !y) return false;
        if (canon(x.name) !== canon(y.name)) return false;
        const dk=Math.abs(num(x.kcal)-num(y.kcal));
        return dk < 1.1;
    }

    function parseCard(card){
        if (!card) return null;
        // Keep the original per-100g values and identity, not rounded display text.
        const registered = A.foodCardRegistry?.get(card.dataset.foodKey);
        if (registered) return norm(registered);
        const title = card.querySelector('strong');
        const name = cleanName(title?.textContent || '');
        if (!name) return null;

        const meta = [...card.querySelectorAll('span')]
            .map(x=>String(x.textContent || '').trim())
            .find(t=>/ккал/i.test(t) && /Б\s*:/i.test(t) && /Ж\s*:/i.test(t) && /В\s*:/i.test(t)) || '';

        const m = meta.match(/([\d.,]+)\s*ккал[\s\S]*?Б\s*:\s*([\d.,]+)[\s\S]*?Ж\s*:\s*([\d.,]+)[\s\S]*?В\s*:\s*([\d.,]+)/i);
        const parsed = {
            name,
            kcal:m ? num(m[1]) : 0,
            p:m ? num(m[2]) : 0,
            f:m ? num(m[3]) : 0,
            c:m ? num(m[4]) : 0,
            source:/^\s*🛠️/u.test(title?.textContent || '') ? 'custom' : 'local'
        };

        const candidates = [
            ...read(CUSTOM_KEY),
            ...read(FAV_KEY),
            ...read(RECENT_KEY),
            ...(Array.isArray(root.foodDB) ? root.foodDB : [])
        ].map(norm).filter(Boolean);

        let match = candidates.find(x => sameFood(x, parsed));
        if (!match) {
            match = candidates.find(x => canon(x.name) === canon(parsed.name));
        }
        return norm(match || parsed);
    }

    function isCustomItem(item, card){
        if (!item) return false;
        const custom = read(CUSTOM_KEY);
        if (custom.some(x=>sameFood(x,item))) return true;
        if (repo?.isCustom) {
            try { if (repo.isCustom(item)) return true; } catch(_) {}
        }
        const title = card?.querySelector('strong')?.textContent || '';
        return /^\s*🛠️/u.test(title) || item.source === 'custom';
    }

    function saveCurrentDay(){
        try {
            if (A.daily?.save) {
                A.daily.save({sync:true,touch:true});
                return true;
            }
            if (typeof root.saveDailyData === 'function') {
                root.saveDailyData();
                return true;
            }
        } catch(error) {
            console.warn('[Achilles V10.5] daily save failed', error);
        }

        try {
            const date = root.currentViewDate || root.todayDate || new Date().toISOString().slice(0,10);
            const all = root.allDaysData && typeof root.allDaysData === 'object'
                ? root.allDaysData
                : JSON.parse(localStorage.getItem('achilles_all_days') || '{}');
            all[date] = {
                consumedCalories:num(root.consumedCalories),
                workoutBonus:num(root.workoutBonus),
                macros:{p:num(root.macros?.p),f:num(root.macros?.f),c:num(root.macros?.c)},
                log:Array.isArray(root.dailyLog) ? root.dailyLog : [],
                updatedAt:Date.now()
            };
            root.allDaysData = all;
            localStorage.setItem('achilles_all_days', JSON.stringify(all));
            try { root.syncToCloud?.(); } catch(_) {}
            return true;
        } catch(error) {
            console.error('[Achilles V10.5] fallback save failed', error);
            return false;
        }
    }

    function addFromCard(card, button){
        const item = parseCard(card);
        if (!item) {
            A.toast?.('Не вдалося прочитати продукт','fa-triangle-exclamation',2600);
            return false;
        }

        const input = card.querySelector('input[type="number"]');
        let weight = num(input?.value);
        if (!(weight > 0)) weight = 100;

        const ratio = weight/100;
        const kcal = Math.round(num(item.kcal)*ratio);
        const p = Math.round(num(item.p)*ratio*10)/10;
        const f = Math.round(num(item.f)*ratio*10)/10;
        const c = Math.round(num(item.c)*ratio*10)/10;

        const prev = {
            kcal:num(root.consumedCalories),
            p:num(root.macros?.p),f:num(root.macros?.f),c:num(root.macros?.c),
            len:Array.isArray(root.dailyLog) ? root.dailyLog.length : 0
        };

        root.consumedCalories = prev.kcal + kcal;
        root.macros = root.macros || {p:0,f:0,c:0};
        root.macros.p = prev.p + p;
        root.macros.f = prev.f + f;
        root.macros.c = prev.c + c;
        root.dailyLog = Array.isArray(root.dailyLog) ? root.dailyLog : [];

        const now = Date.now();
        root.dailyLog.push({
            id:`food-v105-${now}-${Math.random().toString(36).slice(2,7)}`,
            createdAt:now,
            type:'food',
            foodId:item.id || `name:${canon(item.name)}|${num(item.kcal)}`,
            foodSource:item.source || 'local',
            barcode:item.barcode || '',
            weightG:weight,kcal,p,f,c,
            html:`<i class="fa-solid fa-utensils diary-entry-icon diary-food-icon" aria-hidden="true"></i> <strong style="color:var(--text-main);">${cleanName(item.name)} (${weight}г)</strong><br>`+
                 `<span style="font-size:14px;opacity:.8;" class="gradient-text">${kcal} ккал</span> `+
                 `<span style="font-size:12px;opacity:.6;color:var(--text-main);">| Б:${p} Ж:${f} В:${c}</span>`
        });

        if (!saveCurrentDay()) {
            root.consumedCalories = prev.kcal;
            root.macros.p = prev.p; root.macros.f = prev.f; root.macros.c = prev.c;
            root.dailyLog.splice(prev.len);
            A.toast?.('Не вдалося зберегти продукт','fa-triangle-exclamation',3000);
            return false;
        }

        try { repo?.touchRecent?.(item); } catch(_) {}
        try { root.updateGoalDisplay?.(); } catch(_) {}
        try { root.renderDiary?.(); } catch(_) {}
        if (input) input.value = '';

        A.haptics?.success?.();
        A.toast?.(`Додано: ${cleanName(item.name)} · ${weight} г`,'fa-check',1800);

        setTimeout(()=>{
            document.querySelector('.nav-item[data-target="tab-journal"]')?.click();
        },40);
        return true;
    }

    function deleteFromCard(card){
        const item = parseCard(card);
        if (!item || !isCustomItem(item,card)) {
            A.toast?.('Це не власний продукт','fa-circle-info',1800);
            return false;
        }

        const name = cleanName(item.name);
        if (!root.confirm(`Видалити власний продукт «${name}»?`)) return false;

        const removeMatching = (key) => {
            const before = read(key);
            const after = before.filter(x => !sameFood(x,item));
            if (after.length !== before.length) write(key, after);
            return after.length !== before.length;
        };

        let changed = false;
        changed = removeMatching(CUSTOM_KEY) || changed;
        changed = removeMatching(FAV_KEY) || changed;
        changed = removeMatching(RECENT_KEY) || changed;

        try {
            if (repo?.setCustom) {
                repo.setCustom(repo.custom().filter(x=>!sameFood(x,item)));
                changed = true;
            }
            if (repo?.setFavorites) {
                repo.setFavorites(repo.favorites().filter(x=>!sameFood(x,item)));
            }
        } catch(_) {}

        if (!changed) {
            A.toast?.('Не знайшов продукт у власній базі','fa-circle-info',2200);
            return false;
        }

        card.remove();
        try { A.sync?.push?.('custom-food-delete-v105'); } catch(_) {}
        try { root.syncToCloud?.(); } catch(_) {}
        A.haptics?.light?.();
        A.toast?.(`Видалено: ${name}`,'fa-trash-can',1800);
        return true;
    }

    function decorate(){
        const box=document.getElementById('food-results');
        if (!box) return;
        box.querySelectorAll('.list-item').forEach(card=>{
            if (card.dataset.v105Decorated === '1') return;
            card.dataset.v105Decorated='1';
            const item=parseCard(card);
            if (!isCustomItem(item,card)) return;

            const fav=card.querySelector('.fav-btn');
            // Current cards already contain a delete control from the renderer.
            // Keep this decorator only as a fallback for legacy cards; otherwise
            // it creates a second trash button on custom products.
            if (!fav || card.querySelector('.food-delete-live-v105, .food-delete-btn, .food-delete-btn-v104')) return;

            const btn=document.createElement('button');
            btn.type='button';
            btn.className='food-delete-live-v105';
            btn.setAttribute('aria-label','Видалити власний продукт');
            btn.innerHTML='<i class="fa-solid fa-trash-can"></i>';
            fav.parentElement?.insertBefore(btn,fav);
        });
    }

    document.addEventListener('click',function(event){
        const deleteBtn=event.target.closest?.('.food-delete-live-v105');
        if (deleteBtn) {
            const card=deleteBtn.closest('.list-item');
            if (!card || !card.closest('#food-results')) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            deleteFromCard(card);
            return;
        }

        const addBtn=event.target.closest?.('#food-results .add-btn');
        if (addBtn) {
            const card=addBtn.closest('.list-item');
            if (!card) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            addFromCard(card,addBtn);
        }
    },true);

    const boot=()=>{
        decorate();
        const box=document.getElementById('food-results');
        if (box && !box.__v105Observer) {
            const observer=new MutationObserver(()=>requestAnimationFrame(decorate));
            observer.observe(box,{childList:true,subtree:true});
            box.__v105Observer=observer;
        }
        setTimeout(decorate,200);
        setTimeout(decorate,800);
        setTimeout(decorate,1800);

        try {
            if (sessionStorage.getItem('achilles_v105_seen') !== '1') {
                sessionStorage.setItem('achilles_v105_seen','1');
                A.toast?.('V10.5 Food Fix активний','fa-wrench',1800);
            }
        } catch(_) {}
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded',boot,{once:true});
    } else {
        boot();
    }
    root.addEventListener('pageshow',()=>setTimeout(boot,60));

    console.info('[Achilles OS] V10.5 DOM food hotfix active');
})(window);


/* ===== achilles-v1011-food-core ===== */

(function(root){
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const canonical = Array.isArray(root.ACHILLES_FOOD_CORE_CANONICAL) ? root.ACHILLES_FOOD_CORE_CANONICAL : [];
    const index = Array.isArray(root.ACHILLES_FOOD_SEARCH_INDEX) ? root.ACHILLES_FOOD_SEARCH_INDEX : [];
    const meta = root.ACHILLES_FOOD_CORE_META || {searchRecords:index.length, canonicalProfiles:canonical.length};
    const search = root.AchillesFoodSearch.create(canonical, index);
    const norm = root.AchillesFoodSearch.normalize;
    const productCount = canonical.length;
    const aliasCount = index.length;

    if (canonical.length) root.foodDB = canonical;

    function searchCustom(query) {
        return search.searchCustom(A.nutritionRepo?.custom?.() || [], query);
    }

    function searchCore(query, limit = 48) {
        return search.search(query, limit);
    }

    function dedupeCanonical(items){
        const seen=new Set();
        const out=[];
        for(const item of items||[]){
            if(!item) continue;
            const key=String(item.canonicalId || item.id || `${norm(item.name)}|${Number(item.kcal||0)}`);
            if(seen.has(key)) continue;
            seen.add(key); out.push(item);
        }
        return out;
    }

    function render(items){
        const box=document.getElementById('food-results');
        if(!box) return;
        const list=dedupeCanonical(items).slice(0,48);
        if(!list.length){
            box.innerHTML='<div class="list-item food-core-empty"><strong>Нічого не знайшов</strong><span>Спробуй коротшу назву або створи свій продукт.</span></div>';
            return;
        }
        box.innerHTML=list.map((item,i)=>root.generateFoodCardHtml?.(item,`core-v1011-${i}`)||'').join('');
    }

    function setStatus(text){
        const el=document.getElementById('food-api-status');
        if(!el) return;
        el.dataset.state='local';
        const span=el.querySelector('span:last-child');
        if(span) span.textContent=text;
    }

    function renderRecentLocal(){
        const recent=(A.nutritionRepo?.recent?.()||[]).filter(x=>x && x.name);
        if(recent.length){
            render(recent);
            setStatus(`Нещодавні · ${productCount} продуктів · без інтернету`);
        } else {
            const box = document.getElementById('food-results');
            if (box) box.innerHTML = '<div class="list-item food-core-empty"><strong>Знайди продукт</strong><span>Введи назву, наприклад «гречка варена» або «сир 9%».</span></div>';
            setStatus(`${productCount} продуктів · ${aliasCount.toLocaleString('uk-UA')} пошукових назв · офлайн`);
        }
    }

    const repo=A.nutritionRepo;
    if(repo){
        repo.localSearch=function(query){
            const q=norm(query);
            if(!q) return dedupeCanonical([...(this.custom?.()||[]),...canonical]);
            return dedupeCanonical([...searchCustom(q),...searchCore(q,60)]);
        };
        // Old Open Food Facts cache is no longer part of nutrition search.
        repo.cached=function(){ return []; };
        repo.cache=function(){ return false; };
    }

    root.onSearchInput=function(){
        const input=document.getElementById('food-search');
        const q=norm(input?.value||'');
        if(root.currentFoodFilter==='fav'){
            root.renderFavFoods?.();
            return;
        }
        if(!q){ renderRecentLocal(); return; }
        const custom=searchCustom(q);
        const core=searchCore(q,48);
        const combined=dedupeCanonical([...custom,...core]);
        render(combined);
        setStatus(combined.length
            ? `${combined.length} збігів · ${productCount} продуктів`
            : `Збігів немає · ${productCount} продуктів`);
    };

    // Compatibility: all old online-search entry points are now strictly local.
    root.runOnlineFoodSearch=function(){ root.onSearchInput(); return Promise.resolve([]); };
    root.searchOnlineFood=function(){ root.onSearchInput(); return Promise.resolve([]); };
    root.searchOpenFoodFacts=root.searchOnlineFood;
    root.fetchSearchALicious=async function(){ return []; };
    root.fetchLegacyOFF=async function(){ return []; };

    function installUi(){
        const btn=document.getElementById('food-online-search-btn');
        if(btn) btn.remove();
        const spinner=document.getElementById('loading-spinner');
        if(spinner) spinner.remove();
        const input=document.getElementById('food-search');
        if(input){
            input.placeholder='Напр. гречка, сир 9%, куряче філе...';
            input.onkeydown=function(event){ if(event.key==='Enter'){event.preventDefault();root.onSearchInput();} };
        }
        const chip=document.querySelector('#tab-food .workspace-header-chip span');
        if(chip) { chip.textContent=`${productCount} продуктів`; chip.title=`${aliasCount.toLocaleString('uk-UA')} пошукових назв та синонімів`; }
        const chipIcon=document.querySelector('#tab-food .workspace-header-chip i');
        if(chipIcon){ chipIcon.className='fa-solid fa-hard-drive'; }
        setStatus(`${productCount} продуктів · без API · працює офлайн`);
        try{ localStorage.removeItem('achilles_food_cache_v2'); }catch(_){}
        if(root.currentFoodFilter!=='fav') root.onSearchInput();
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installUi,0),{once:true});
    else setTimeout(installUi,0);
    root.addEventListener('pageshow',()=>setTimeout(installUi,80));
    root.addEventListener('online',()=>setTimeout(()=>setStatus(`${productCount} продуктів · інтернет для пошуку не потрібен`),20));
    root.addEventListener('offline',()=>setTimeout(()=>setStatus(`${productCount} продуктів · офлайн режим активний`),20));

    root.ACHILLES_BUILD='10.15.6';
    console.info('[Achilles OS] V10.15.6 local food catalog active', meta);
})(window);
