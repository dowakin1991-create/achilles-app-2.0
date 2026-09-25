/* ===== Achilles 11.2 avatar progression ===== */
(function(root){
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    const STATE_KEY = 'achilles_avatar_state_v1';
    const AVATAR_VERSION = '11.3.18';

    const CATALOG = Object.freeze([
        {id:1,  name:'Новобранець',        tier:'I',   kind:'base'},
        {id:2,  name:'Початок шляху',      tier:'II',  kind:'nutrition', target:7},
        {id:3,  name:'Дисципліна',          tier:'III', kind:'training',  target:4},
        {id:4,  name:'Перший результат',    tier:'IV',  kind:'weight',    target:1},
        {id:5,  name:'Послідовність',       tier:'V',   kind:'weeks',     target:4},
        {id:6,  name:'Сила звички',         tier:'VI',  kind:'nutrition', target:30},
        {id:7,  name:'Контроль',             tier:'VII', kind:'weight',    target:5},
        {id:8,  name:'Стійкість',            tier:'VIII',kind:'weeks',     target:8},
        {id:9,  name:'Трансформація',        tier:'IX',  kind:'training',  target:50},
        {id:10, name:'Воїн',                 tier:'X',   kind:'weeks',     target:26},
        {id:11, name:'Легенда',              tier:'XI',  kind:'weight',    target:10},
        {id:12, name:'Без компромісів',      tier:'XII', kind:'training',  target:100},
        {id:13, name:'Спартанець',           tier:'XIII',kind:'nutrition', target:180},
        {id:14, name:'Ахіллес',              tier:'XIV', kind:'weeks',     target:52},
        {id:15, name:'Безсмертний',          tier:'XV',  kind:'mastery'}
    ]);

    const safeJson=(key,fallback)=>{
        try { const parsed=JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; }
        catch(_){ return fallback; }
    };

    function readState(){
        const raw=safeJson(STATE_KEY,{});
        return {
            selected:Number(raw.selected||1),
            unlocked:Array.isArray(raw.unlocked)?raw.unlocked.map(Number).filter(Boolean):[1],
            unlockedAt:raw.unlockedAt&&typeof raw.unlockedAt==='object'?raw.unlockedAt:{},
            updatedAt:Number(raw.updatedAt||0)
        };
    }

    function writeState(next,{sync=true}={}){
        const state={
            selected:Number(next.selected||1),
            unlocked:[...new Set([1,...(next.unlocked||[]).map(Number)])].sort((a,b)=>a-b),
            unlockedAt:next.unlockedAt||{},
            updatedAt:Date.now()
        };
        localStorage.setItem(STATE_KEY,JSON.stringify(state));
        if(sync) A.sync?.push?.('avatar-state');
        return state;
    }

    function weekStart(dateLike){
        const d=new Date(String(dateLike).slice(0,10)+'T12:00:00');
        if(Number.isNaN(d.getTime())) return null;
        const day=(d.getDay()+6)%7;
        d.setDate(d.getDate()-day);
        return d.toISOString().slice(0,10);
    }

    function longestWeeklyStreak(sessions){
        const weeks=[...new Set((sessions||[]).map(s=>weekStart(s.date || new Date(Number(s.createdAt||0)).toISOString().slice(0,10))).filter(Boolean))].sort();
        if(!weeks.length) return 0;
        let best=1,current=1;
        for(let i=1;i<weeks.length;i++){
            const prev=new Date(weeks[i-1]+'T12:00:00');
            const now=new Date(weeks[i]+'T12:00:00');
            const diff=Math.round((now-prev)/604800000);
            if(diff===1) current+=1;
            else if(diff>1) current=1;
            best=Math.max(best,current);
        }
        return best;
    }

    function metrics(){
        const profile=A.storage?.profile?.() || safeJson('achilles_profile',{});
        const days=safeJson('achilles_all_days',{});
        const weights=(A.storage?.json?.('achilles_weight_history',[]) || safeJson('achilles_weight_history',[]))
            .filter(x=>x?.date && Number(x.weight)>0)
            .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
        const sessions=A.training?.history?.all?.() || [];

        const nutritionDays=Object.values(days||{}).filter(day=>day?.nutritionComplete===true).length;
        const activeDays=Object.values(days||{}).filter(day=>Array.isArray(day?.log)&&day.log.length>0).length;
        const trainingSessions=sessions.length;
        const weekStreak=longestWeeklyStreak(sessions);

        const startWeight=Number(weights[0]?.weight||0);
        const latestWeight=Number(weights.at(-1)?.weight||0);
        const goal=profile.goal||'maintain';
        let weightProgress=0;
        if(startWeight>0 && weights.length){
            if(goal==='lose'){
                const best=Math.min(...weights.map(x=>Number(x.weight)).filter(x=>x>0));
                weightProgress=Math.max(0,startWeight-best);
            } else if(goal==='gain'){
                const best=Math.max(...weights.map(x=>Number(x.weight)).filter(x=>x>0));
                weightProgress=Math.max(0,best-startWeight);
            }
        }

        return {profile,goal,nutritionDays,activeDays,trainingSessions,weekStreak,startWeight,latestWeight,weightProgress};
    }

    function condition(item,m){
        if(item.kind==='base') return {ok:true,current:1,target:1,label:'Доступний одразу'};
        if(item.kind==='nutrition'){
            return {ok:m.nutritionDays>=item.target,current:m.nutritionDays,target:item.target,label:`${item.target} повністю заповнених днів харчування`};
        }
        if(item.kind==='training'){
            return {ok:m.trainingSessions>=item.target,current:m.trainingSessions,target:item.target,label:`${item.target} тренувань`};
        }
        if(item.kind==='weeks'){
            return {ok:m.weekStreak>=item.target,current:m.weekStreak,target:item.target,label:`Тренування щотижня ${item.target} тиж. поспіль`};
        }
        if(item.kind==='weight'){
            if(m.goal==='lose'||m.goal==='gain'){
                const dir=m.goal==='lose'?'схуднути':'набрати';
                return {ok:m.weightProgress>=item.target,current:m.weightProgress,target:item.target,label:`${dir} на ${item.target} кг від стартової ваги`};
            }
            const fallback={1:14,5:60,10:120}[item.target]||item.target*12;
            return {ok:m.nutritionDays>=fallback,current:m.nutritionDays,target:fallback,label:`${fallback} повністю заповнених днів (для підтримки ваги)`};
        }
        if(item.kind==='mastery'){
            const ok=m.weekStreak>=52 && m.trainingSessions>=200 && m.nutritionDays>=200;
            const score=Math.min(3,(m.weekStreak>=52?1:0)+(m.trainingSessions>=200?1:0)+(m.nutritionDays>=200?1:0));
            return {ok,current:score,target:3,label:'52 тижні системності + 200 тренувань + 200 повних днів раціону'};
        }
        return {ok:false,current:0,target:1,label:'Досягнення'};
    }

    function avatarUrl(id){
        const numericId = Number(id);
        const validId = CATALOG.some(item => item.id === numericId) ? numericId : 1;
        return `./assets/avatars/avatar-${validId}.webp?v=${AVATAR_VERSION}`;
    }

    function setSprite(el,id){
        if(!el) return;
        el.classList.add('achilles-avatar-sprite');
        // Several legacy profile-logo rules use !important. Force the selected
        // avatar portrait at the inline-important level so those rules cannot
        // replace it with the old IMG_9302 app icon.
        el.style.setProperty('background-image', `url("${avatarUrl(id)}")`, 'important');
        el.style.setProperty('background-size', 'cover', 'important');
        el.style.setProperty('background-position', 'center', 'important');
        el.style.setProperty('background-repeat', 'no-repeat', 'important');
    }

    function evaluate({sync=true}={}){
        const m=metrics();
        let state=readState();
        const unlocked=new Set(state.unlocked);
        const unlockedAt={...state.unlockedAt};
        let changed=false;

        CATALOG.forEach(item=>{
            const c=condition(item,m);
            if(c.ok && !unlocked.has(item.id)){
                unlocked.add(item.id);
                unlockedAt[item.id]=Date.now();
                changed=true;
            }
        });
        if(!unlocked.has(state.selected)){ state.selected=1; changed=true; }
        if(changed) state=writeState({...state,unlocked:[...unlocked],unlockedAt},{sync});
        return {state,metrics:m,conditions:Object.fromEntries(CATALOG.map(item=>[item.id,condition(item,m)]))};
    }

    function apply(){
        const {state}=evaluate({sync:false});
        document.querySelectorAll('.profile-avatar-large,.main-avatar').forEach(el=>setSprite(el,state.selected));
        const active=document.getElementById('avatar-current-preview');
        if(active) setSprite(active,state.selected);
        const label=document.getElementById('avatar-current-name');
        const item=CATALOG.find(x=>x.id===state.selected)||CATALOG[0];
        if(label) label.textContent=item.name;
    }

    function progressText(c){
        if(c.ok) return 'Розблоковано';
        const current=Number(c.current||0),target=Number(c.target||1);
        if(target===3) return `${current}/3 умови`;
        const decimals=String(target).includes('.')?1:0;
        return `${Number(current.toFixed?.(decimals)||current)}/${target}`;
    }

    function openPicker(){
        const overlay=document.getElementById('avatar-picker-overlay');
        if(!overlay) return;
        render();
        overlay.hidden=false;
        requestAnimationFrame(()=>overlay.classList.add('open'));
        document.documentElement.classList.add('avatar-picker-open');
        A.haptics?.tap?.();
        setTimeout(()=>overlay.querySelector('.avatar-picker-close')?.focus?.(),120);
    }

    function closePicker(){
        const overlay=document.getElementById('avatar-picker-overlay');
        if(!overlay) return;
        overlay.classList.remove('open');
        document.documentElement.classList.remove('avatar-picker-open');
        setTimeout(()=>{ overlay.hidden=true; },180);
        document.getElementById('profile-avatar-trigger')?.focus?.();
    }

    function render(){
        const host=document.getElementById('avatar-progression-grid');
        if(!host){ apply(); return; }
        const snapshot=evaluate({sync:false});
        const state=snapshot.state;
        host.innerHTML=CATALOG.map(item=>{
            const unlocked=state.unlocked.includes(item.id);
            const selected=state.selected===item.id;
            const c=snapshot.conditions[item.id];
            const pct=Math.max(0,Math.min(100,(Number(c.current||0)/Math.max(1,Number(c.target||1)))*100));
            return `<button type="button" class="avatar-option ${unlocked?'unlocked':'locked'} ${selected?'selected':''}" data-avatar-id="${item.id}" data-locked="${unlocked?'0':'1'}" ${unlocked?'':'disabled aria-disabled="true"'} aria-label="${item.name}: ${c.label}">
                <span class="avatar-option-art achilles-avatar-sprite" data-avatar-sprite="${item.id}"></span>
                <span class="avatar-option-body">
                    <span class="avatar-option-top"><strong>${item.name}</strong><small>${item.tier}</small></span>
                    <span class="avatar-option-rule">${c.label}</span>
                    <span class="avatar-progress"><i style="--avatar-progress:${pct}%"></i></span>
                    <span class="avatar-option-status">${unlocked?'<i class="fa-solid fa-unlock"></i> '+(selected?'Обрано':'Доступний'):'<i class="fa-solid fa-lock"></i> '+progressText(c)}</span>
                </span>
            </button>`;
        }).join('');
        host.querySelectorAll('[data-avatar-sprite]').forEach(el=>setSprite(el,el.dataset.avatarSprite));
        host.querySelectorAll('.avatar-option.unlocked').forEach(btn=>btn.addEventListener('click',()=>{
            const id=Number(btn.dataset.avatarId);
            const current=evaluate({sync:false}).state;
            if(!current.unlocked.includes(id)) return;
            writeState({...current,selected:id},{sync:true});
            apply();
            render();
            A.haptics?.success?.();
            A.toast?.('Аватар змінено','fa-shield-halved',1600);
            closePicker();
        }));

        const m=snapshot.metrics;
        const summary=document.getElementById('avatar-progress-summary');
        if(summary){
            const weightPart=(m.goal==='lose'||m.goal==='gain') && m.startWeight>0
                ? ` · прогрес ваги ${m.weightProgress.toFixed(1)} кг`
                : '';
            summary.textContent=`${state.unlocked.length}/${CATALOG.length} відкрито · ${m.trainingSessions} тренувань · ${m.weekStreak} тиж. серії${weightPart}`;
        }
        apply();
    }

    function mergeRemote(remote){
        if(!remote||typeof remote!=='object') return readState();
        const local=readState();
        const remoteUnlocked=Array.isArray(remote.unlocked)?remote.unlocked.map(Number):[];
        const mergedUnlocked=[...new Set([1,...local.unlocked,...remoteUnlocked])];
        const remoteNewer=Number(remote.updatedAt||0)>Number(local.updatedAt||0);
        const selected=remoteNewer?Number(remote.selected||1):local.selected;
        const merged=writeState({
            selected:mergedUnlocked.includes(selected)?selected:1,
            unlocked:mergedUnlocked,
            unlockedAt:{...(remote.unlockedAt||{}),...(local.unlockedAt||{})}
        },{sync:false});
        return merged;
    }

    A.avatars={
        catalog:CATALOG,
        read:readState,
        evaluate,
        render,
        apply,
        select(id){
            const snap=evaluate({sync:false});
            if(!snap.state.unlocked.includes(Number(id))) return false;
            writeState({...snap.state,selected:Number(id)},{sync:true});
            render();
            return true;
        },
        mergeRemote,
        openPicker,
        closePicker
    };

    root.addEventListener('DOMContentLoaded',()=>{
        setTimeout(render,80);
        document.addEventListener('click',event=>{
            if(event.target.closest('[data-avatar-picker-close]')) closePicker();
        });
        document.addEventListener('keydown',event=>{
            if(event.key==='Escape' && !document.getElementById('avatar-picker-overlay')?.hidden) closePicker();
        });
    },{once:true});
    root.addEventListener('achilles:firebase-ready',()=>setTimeout(apply,80));
    root.addEventListener('achilles:coach-changed',()=>setTimeout(render,80));
    root.addEventListener('achilles:coach-workflow-changed',()=>setTimeout(render,80));
})(window);
