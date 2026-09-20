/* ===== achilles-v8-core ===== */

(function(){
    'use strict';

    const A = window.Achilles = window.Achilles || {};

    /* ------------------------------ CORE ------------------------------ */
    A.core = {
        version: '8.0',
        clamp(value,min=0,max=1){ return Math.max(min,Math.min(max,Number(value)||0)); },
        frame(fn){ return requestAnimationFrame(fn); },
        twoFrames(fn){ return requestAnimationFrame(()=>requestAnimationFrame(fn)); }
    };

    /* ----------------------------- STATE ------------------------------ */
    A.state = {
        activeTab: document.querySelector('.tab-content.active')?.id || 'tab-dashboard',
        previousTab: null,
        booted: false,
        navigating: false
    };

    /* ---------------------------- STORAGE ----------------------------- */
    A.storage = {
        get(key,fallback=null){ const raw=localStorage.getItem(key); return raw===null?fallback:raw; },
        set(key,value){ localStorage.setItem(key,String(value)); return value; },
        json(key,fallback){
            try { const raw=localStorage.getItem(key); return raw===null?fallback:JSON.parse(raw); }
            catch(error){ console.warn('[Achilles.storage]',key,error); return fallback; }
        },
        setJSON(key,value){ localStorage.setItem(key,JSON.stringify(value)); return value; }
    };

    /* ------------------------------ SYNC ------------------------------ */
    A.sync = {
        push(){ return typeof window.syncToCloud==='function' ? window.syncToCloud() : Promise.resolve(false); },
        pull(user){ return typeof window.loadFromCloud==='function' ? window.loadFromCloud(user) : Promise.resolve(false); }
    };

    /* ----------------------------- MOTION ----------------------------- */
    A.motion = {
        circle(el,percent,animate=false,duration=1150){
            if(!el) return;
            const radius=Number(el.getAttribute('r'))||1;
            const circumference=2*Math.PI*radius;
            const pct=A.core.clamp(percent);
            const target=circumference*(1-pct);
            el.style.strokeDasharray=String(circumference);
            el.style.opacity=pct>0?'1':'.42';

            if(!animate || matchMedia('(prefers-reduced-motion: reduce)').matches){
                el.style.transition='none';
                el.style.strokeDashoffset=String(target);
                return;
            }

            el.style.transition='none';
            el.style.strokeDashoffset=String(circumference);
            el.getBoundingClientRect();
            requestAnimationFrame(()=>{
                el.style.transition=`stroke-dashoffset ${duration}ms cubic-bezier(.22,1,.36,1), opacity 220ms ease`;
                el.style.strokeDashoffset=String(target);
            });
        }
    };

    /* --------------------------- NUTRITION ---------------------------- */
    function positionNutritionArrow(arrowId, ratio, radius){
        const arrow=document.getElementById(arrowId);
        if(!arrow) return;
        const p=Math.max(0,Math.min(Number(ratio)||0,0.995));
        if(p<=0.01){ arrow.style.opacity='0'; return; }
        const angle=-Math.PI/2 + p*Math.PI*2;
        const x=120 + radius*Math.cos(angle);
        const y=120 + radius*Math.sin(angle);
        const deg=p*360;
        arrow.style.opacity='1';
        arrow.setAttribute('transform', 'translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+deg.toFixed(2)+')');
    }

    A.nutrition = {
        injectGradient(){
            const svg=document.querySelector('.nutrition-rings-svg');
            if(!svg || svg.querySelector('#achillesRingGradient')) return;
            const ns='http://www.w3.org/2000/svg';
            const defs=document.createElementNS(ns,'defs');
            const gradient=document.createElementNS(ns,'linearGradient');
            gradient.id='achillesRingGradient';
            gradient.setAttribute('x1','0%'); gradient.setAttribute('y1','0%');
            gradient.setAttribute('x2','100%'); gradient.setAttribute('y2','100%');
            [['0%','var(--accent-1)'],['52%','var(--accent-2)'],['100%','var(--accent-3)']].forEach(([offset,color])=>{
                const stop=document.createElementNS(ns,'stop');
                stop.setAttribute('offset',offset);
                stop.style.stopColor=color;
                gradient.appendChild(stop);
            });
            defs.appendChild(gradient);
            svg.prepend(defs);
        },
        targets(){
            const parse=(id)=>{
                const raw = document.getElementById(id)?.textContent || '';
                const match = raw.match(/[0-9]+(?:[.,][0-9]+)?/);
                return match ? Number(match[0].replace(',', '.')) : 0;
            };
            return {
                kcal: parse('calories-goal'),
                p: parse('target-p'),
                f: parse('target-f'),
                c: parse('target-c')
            };
        },
        renderRings(animate=false){
            this.injectGradient();
            const target=this.targets();
            const macros=window.macros||{p:0,f:0,c:0};
            const kcalRatio=target.kcal?Number(window.consumedCalories||0)/target.kcal:0;
            const pRatio=target.p?Number(macros.p||0)/target.p:0;
            const fRatio=target.f?Number(macros.f||0)/target.f:0;
            const cRatio=target.c?Number(macros.c||0)/target.c:0;
            A.motion.circle(document.getElementById('ring-kcal'),kcalRatio,animate,1180);
            A.motion.circle(document.getElementById('ring-protein'),pRatio,animate,1080);
            A.motion.circle(document.getElementById('ring-fat'),fRatio,animate,980);
            A.motion.circle(document.getElementById('ring-carb'),cRatio,animate,900);
            positionNutritionArrow('ring-arrow-kcal',kcalRatio,92);
            positionNutritionArrow('ring-arrow-protein',pRatio,72);
            positionNutritionArrow('ring-arrow-fat',fRatio,54);
            positionNutritionArrow('ring-arrow-carb',cRatio,38);
        },
        search(){ return typeof window.onSearchInput==='function' ? window.onSearchInput() : null; },
        favorites(){ return A.storage.json('achilles_fav_foods',[]); }
    };
    /* Backward compatibility for code that still calls the old global API. */
    window.renderNutritionRings=(animate=false)=>A.nutrition.renderRings(animate);

    /* ---------------------------- TRAINING ---------------------------- */
    A.training = {
        search(){ return typeof window.searchWorkout==='function' ? window.searchWorkout() : null; },
        favorites(){ return A.storage.json('achilles_fav_workouts',[]); },
        prs(){ return A.storage.json('achilles_prs',{}); },
        byId(id){ return typeof window.getWorkoutById==='function' ? window.getWorkoutById(id) : null; }
    };

    /* --------------------------- ANALYTICS ---------------------------- */
    A.analytics = {
        weekSnapshot(){
            const daysData=window.allDaysData||A.storage.json('achilles_all_days',{});
            const dates=typeof window.getLastNDates==='function'?window.getLastNDates(7):[];
            const targets=A.storage.json('achilles_macros',{p:0,f:0,c:0});
            const baseKcal=Number(A.storage.get('achilles_base_kcal',2000))||2000;
            const appMode=A.storage.get('achilles_app_mode','pro');
            let loggedDays=0,kcalTotal=0,proteinHit=0,calorieHit=0,workouts=0;
            const rows=dates.map(date=>{
                const d=daysData?.[date]||null;
                const consumed=Number(d?.consumedCalories||0);
                const goal=baseKcal+(appMode==='pro'?Number(d?.workoutBonus||0):0);
                const protein=Number(d?.macros?.p||0);
                const log=d?.log||[];
                const hasNutrition=consumed>0||log.some(e=>e.type==='food');
                const pHit=hasNutrition&&Number(targets.p||0)>0&&protein>=Number(targets.p)*.9;
                const kcalHit=hasNutrition&&goal>0&&Math.abs(consumed-goal)/goal<=.10;
                const dayWorkouts=log.filter(e=>e.type==='workout').length;
                if(hasNutrition){ loggedDays++; kcalTotal+=consumed; if(pHit) proteinHit++; if(kcalHit) calorieHit++; }
                workouts+=dayWorkouts;
                return {date,consumed,goal,pHit,kcalHit,workouts:dayWorkouts,hasNutrition};
            });
            const proteinRate=loggedDays?proteinHit/loggedDays:0;
            const calorieRate=loggedDays?calorieHit/loggedDays:0;
            const score=A.core.clamp(
                Math.round(Math.min(loggedDays/7,1)*20)+
                Math.round(proteinRate*30)+
                Math.round(calorieRate*30)+
                Math.round(Math.min(workouts/3,1)*20),0,100
            );
            return {rows,loggedDays,kcalTotal,avgKcal:loggedDays?Math.round(kcalTotal/loggedDays):0,proteinHit,proteinRate,calorieHit,calorieRate,workouts,score};
        }
    };

    /* ----------------------------- WEEKLY ----------------------------- */
    A.weekly = {
        render(animate=false){
            const snap=A.analytics.weekSnapshot();
            A.motion.circle(document.getElementById('week-score-progress'),snap.score/100,animate,1250);

            const scoreValue=document.getElementById('week-score-value');
            if(scoreValue) scoreValue.textContent=String(snap.score);
            const badge=document.getElementById('progress-score-badge');
            if(badge) badge.textContent=`${snap.score} / 100`;
            const avg=document.getElementById('stat-avg-kcal');
            if(avg) avg.textContent=snap.loggedDays?String(snap.avgKcal):'—';
            const protein=document.getElementById('stat-protein-hit');
            if(protein) protein.textContent=snap.loggedDays?`${snap.proteinHit}/${snap.loggedDays}`:'—';
            const work=document.getElementById('stat-workouts');
            if(work) work.textContent=String(snap.workouts);

            const title=document.getElementById('week-score-title');
            if(title) title.textContent=snap.loggedDays<3?'Збираємо дані':snap.score>=85?'Сильний тиждень':snap.score>=65?'Хороший ритм':snap.score>=45?'Є запас':'Потрібна стабільність';
            const caption=document.getElementById('week-score-caption');
            if(caption) caption.textContent=snap.loggedDays<3?`Дані є за ${snap.loggedDays} із 7 днів.`:`Білок ${Math.round(snap.proteinRate*100)}% · коридор ккал ${Math.round(snap.calorieRate*100)}% · тренувань ${snap.workouts}.`;

            const bars=document.getElementById('week-bars');
            if(bars){
                const fmt=new Intl.DateTimeFormat('uk-UA',{weekday:'short'});
                bars.innerHTML=snap.rows.map(row=>{
                    const raw=row.goal>0?row.consumed/row.goal:0;
                    const visual=row.hasNutrition?Math.max(.05,Math.min(raw/1.25,1)):.035;
                    const kcal=row.hasNutrition?Math.round(row.consumed):'—';
                    const label=fmt.format(new Date(`${row.date}T12:00:00`)).replace('.','');
                    return `<div class="week-day ${row.pHit?'is-protein-hit':''} ${row.hasNutrition?'':'empty'}"><span class="week-day-value">${kcal}</span><div class="week-bar-track"><span class="week-bar-target"></span><span class="week-bar-fill" style="--bar-scale:${visual}"></span></div><span class="week-day-label">${label}</span></div>`;
                }).join('');
                requestAnimationFrame(()=>{
                    bars.querySelectorAll('.week-bar-fill').forEach((el,index)=>{
                        const scale=el.style.getPropertyValue('--bar-scale')||'0';
                        if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
                            el.style.transition='none'; el.style.transform='scaleY(0)'; el.getBoundingClientRect();
                            requestAnimationFrame(()=>{ el.style.transition=`transform ${780+index*45}ms cubic-bezier(.22,1,.36,1)`; el.style.transform=`scaleY(${scale})`; });
                        } else { el.style.transition='none'; el.style.transform=`scaleY(${scale})`; }
                    });
                });
            }

            const setKpi=(id,pct)=>{ const el=document.getElementById(id); if(el) el.style.setProperty('--kpi-pct',`${Math.round(A.core.clamp(pct)*360)}deg`); };
            setKpi('kpi-calories',snap.loggedDays/7);
            setKpi('kpi-protein',snap.proteinRate);
            setKpi('kpi-workouts',Math.min(snap.workouts/3,1));
            const wt=typeof window.getWeightTrend==='function'?window.getWeightTrend():null;
            setKpi('kpi-weight',wt===null?0:Math.min(Math.abs(wt)/1.2,1));
        }
    };

    /* --------------------------- DASHBOARD ---------------------------- */
    A.dashboard = {
        refresh({animate=false}={}){
            A.nutrition.renderRings(animate);
            A.weekly.render(animate);
        },
        enterFromAnotherTab(){
            /* The dashboard itself remains fully visible; only data visualisations animate. */
            requestAnimationFrame(()=>this.refresh({animate:true}));
        }
    };

    /* ------------------------------ UI -------------------------------- */
    A.ui = {
        pulseNav(item){
            if(!item) return;
            item.classList.add('nav-press-v8');
            setTimeout(()=>item.classList.remove('nav-press-v8'),180);
        },
        enterTab(tabId){
            const tab=document.getElementById(tabId);
            if(!tab) return;
            tab.classList.remove('tab-enter-v8');
            if(tabId!=='tab-dashboard'){
                void tab.offsetWidth;
                tab.classList.add('tab-enter-v8');
            }
        }
    };

    /* ----------------------------- ROUTER ----------------------------- */
    A.router = {
        current(){ return A.state.activeTab || document.querySelector('.tab-content.active')?.id || 'tab-dashboard'; },
        go(targetId,{source=null}={}){
            if(!targetId) return false;
            const target=document.getElementById(targetId);
            if(!target) return false;
            const currentId=this.current();

            /* Critical rule: tapping the already active Status tab does NOTHING. */
            if(targetId===currentId){
                A.ui.pulseNav(source);
                return false;
            }

            A.state.previousTab=currentId;
            A.state.activeTab=targetId;

            document.querySelectorAll('.nav-item[data-target]').forEach(item=>item.classList.toggle('active',item.dataset.target===targetId));
            const current=document.getElementById(currentId);
            if(current) current.classList.remove('active','tab-enter-v8');
            target.classList.add('active');
            A.ui.enterTab(targetId);

            const scroller=document.querySelector('#main-app-window .main-content');
            if(scroller) scroller.scrollTop=0;
            A.ui.pulseNav(source);

            if(targetId==='tab-dashboard') A.dashboard.enterFromAnotherTab();
            else if(targetId==='tab-food') setTimeout(()=>A.nutrition.search(),40);
            else if(targetId==='tab-workout') setTimeout(()=>A.training.search(),40);
            else if(targetId==='tab-journal') setTimeout(()=>window.renderDiary?.(),20);

            return true;
        },
        install(){
            if(this.installed) return;
            document.querySelectorAll('.nav-item[data-target]').forEach(item=>{
                item.addEventListener('click',(event)=>{
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.go(item.dataset.target,{source:item});
                },{capture:true});
            });
            this.installed=true;
        }
    };

    /* ----------------------------- HOOKS ------------------------------ */
    A.hooks = {
        install(){
            if(this.installed) return;

            if(typeof window.updateGoalDisplay==='function'){
                const original=window.updateGoalDisplay;
                window.updateGoalDisplay=function(){
                    const result=original.apply(this,arguments);
                    /* Data updates never replay the entry animation. */
                    requestAnimationFrame(()=>{
                        A.nutrition.renderRings(false);
                        A.weekly.render(false);
                    });
                    return result;
                };
            }

            if(typeof window.renderProgressInsights==='function'){
                const original=window.renderProgressInsights;
                window.renderProgressInsights=function(){
                    const result=original.apply(this,arguments);
                    requestAnimationFrame(()=>A.weekly.render(false));
                    return result;
                };
            }

            if(typeof window.applyTheme==='function'){
                const original=window.applyTheme;
                window.applyTheme=function(){
                    const result=original.apply(this,arguments);
                    requestAnimationFrame(()=>{
                        A.nutrition.injectGradient();
                        A.dashboard.refresh({animate:false});
                    });
                    return result;
                };
            }

            this.installed=true;
        }
    };

    /* --------------------------- BOOTSTRAP ---------------------------- */
    A.bootstrap = {
        start(){
            A.router.install();
            A.hooks.install();
            A.nutrition.injectGradient();

            const score=document.getElementById('week-score-progress');
            if(score){
                const radius=Number(score.getAttribute('r'))||1;
                const circumference=2*Math.PI*radius;
                score.style.strokeDasharray=String(circumference);
            }

            /* Initial Status view is rendered at its real values with NO entry animation. */
            requestAnimationFrame(()=>A.dashboard.refresh({animate:false}));
            A.state.activeTab=document.querySelector('.tab-content.active')?.id||'tab-dashboard';
            A.state.booted=true;
        }
    };

    document.addEventListener('DOMContentLoaded',()=>A.bootstrap.start(),{once:true});
})();


/* ===== achilles-v8-2-ring-refresh ===== */

(function () {
    function refreshRings() {
        if (window.Achilles?.nutrition?.renderRings) {
            window.Achilles.nutrition.renderRings(false);
        }
    }

    const ids = ['calories-goal', 'target-p', 'target-f', 'target-c'];
    const observer = new MutationObserver(() => {
        requestAnimationFrame(refreshRings);
    });

    document.addEventListener('DOMContentLoaded', () => {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
        });
        requestAnimationFrame(refreshRings);
    }, { once: true });
})();

