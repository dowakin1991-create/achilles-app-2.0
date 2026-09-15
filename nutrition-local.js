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
            html:`🥗 <strong style="color:var(--text-main);">${cleanName(item.name)} (${weight}г)</strong><br>`+
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
            if (!fav || card.querySelector('.food-delete-live-v105')) return;

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
    const byId = new Map(canonical.map(item => [String(item.canonicalId || item.id), item]));

    // Replace the tiny legacy array with the curated local catalog.
    if(canonical.length) root.foodDB = canonical;

    function norm(value){
        return String(value || '')
            .toLocaleLowerCase('uk-UA')
            .replace(/[’`ʼ]/g, "'")
            .replace(/ё/g,'е')
            .replace(/ы/g,'и')
            .replace(/э/g,'е')
            .replace(/[\\/_–—-]+/g,' ')
            .replace(/[^0-9a-zа-яіїєґ%+']+/giu,' ')
            .replace(/\s+/g,' ')
            .trim();
    }

    function tokens(value){ return norm(value).split(' ').filter(Boolean); }

    function editDistanceLimited(a,b,limit=2){
        if(a===b) return 0;
        if(Math.abs(a.length-b.length)>limit) return limit+1;
        const prev=Array.from({length:b.length+1},(_,i)=>i);
        for(let i=1;i<=a.length;i++){
            const cur=[i]; let rowMin=cur[0];
            for(let j=1;j<=b.length;j++){
                const cost=a[i-1]===b[j-1]?0:1;
                cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
                rowMin=Math.min(rowMin,cur[j]);
            }
            if(rowMin>limit) return limit+1;
            for(let j=0;j<cur.length;j++) prev[j]=cur[j];
        }
        return prev[b.length];
    }

    function scoreText(text, query){
        const t=norm(text), q=norm(query);
        if(!q || !t) return -Infinity;
        if(t===q) return 10000;
        if(t.startsWith(q)) return 9000 - Math.min(500,t.length-q.length);
        if(t.includes(q)) return 8000 - Math.min(700,t.indexOf(q)*5);

        const tt=tokens(t), qt=tokens(q);
        let score=0;
        for(const term of qt){
            let best=-Infinity;
            for(let i=0;i<tt.length;i++){
                const word=tt[i];
                if(word===term) best=Math.max(best,1000-i*5);
                else if(word.startsWith(term)) best=Math.max(best,850-i*5-Math.min(100,word.length-term.length));
                else if(term.length>=4 && word.includes(term)) best=Math.max(best,650-i*5);
                else if(term.length>=4){
                    const maxDistance=term.length>=8?2:1;
                    const d=editDistanceLimited(word,term,maxDistance);
                    if(d<=maxDistance) best=Math.max(best,500-d*120-i*5);
                }
            }
            if(best===-Infinity) return -Infinity;
            score+=best;
        }
        return 5000+score;
    }

    function searchCustom(query){
        const custom = A.nutritionRepo?.custom?.() || [];
        return custom
            .map(item=>({item,score:scoreText(item.name,query)}))
            .filter(x=>Number.isFinite(x.score))
            .sort((a,b)=>b.score-a.score)
            .map(x=>x.item);
    }

    function searchCore(query, limit=48){
        const q=norm(query);
        if(!q) return [];
        const bestById=new Map();
        for(const rec of index){
            const s=scoreText(rec.q,q);
            if(!Number.isFinite(s)) continue;
            const id=String(rec.id);
            const old=bestById.get(id);
            if(!old || s>old.score) bestById.set(id,{score:s,term:rec.q});
        }
        return [...bestById.entries()]
            .sort((a,b)=>b[1].score-a[1].score || String(byId.get(a[0])?.name||'').localeCompare(String(byId.get(b[0])?.name||''),'uk'))
            .slice(0,limit)
            .map(([id,match])=>{
                const item=byId.get(id);
                return item ? {...item, source:'built-in', matchTerm:match.term} : null;
            })
            .filter(Boolean);
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
            setStatus(`Нещодавні · Food Core ${meta.searchRecords || 5000} · без інтернету`);
        } else {
            render([]);
            setStatus(`Food Core ${meta.searchRecords || 5000} · введи назву продукту`);
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
            ? `${combined.length} збігів · ${meta.searchRecords || 5000} локальних позицій`
            : `Збігів немає · ${meta.searchRecords || 5000} локальних позицій`);
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
        if(chip) chip.textContent=`Food Core ${meta.searchRecords || 5000}`;
        const chipIcon=document.querySelector('#tab-food .workspace-header-chip i');
        if(chipIcon){ chipIcon.className='fa-solid fa-hard-drive'; }
        setStatus(`${meta.searchRecords || 5000} локальних позицій · без API · працює офлайн`);
        try{ localStorage.removeItem('achilles_food_cache_v2'); }catch(_){}
        if(root.currentFoodFilter!=='fav') root.onSearchInput();
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installUi,0),{once:true});
    else setTimeout(installUi,0);
    root.addEventListener('pageshow',()=>setTimeout(installUi,80));
    root.addEventListener('online',()=>setTimeout(()=>setStatus(`${meta.searchRecords || 5000} локальних позицій · інтернет для пошуку не потрібен`),20));
    root.addEventListener('offline',()=>setTimeout(()=>setStatus(`${meta.searchRecords || 5000} локальних позицій · офлайн режим активний`),20));

    root.ACHILLES_BUILD='10.14.1';
    console.info('[Achilles OS] V10.14.1 modular runtime + Food Core active', meta);
})(window);

