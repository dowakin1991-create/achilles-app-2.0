(function(root){
    'use strict';
    const A=root.Achilles=root.Achilles||{}, C=root.AchillesCoachCycle, E=root.AchillesCoachEngine;
    const key=user=>`achilles_coach_workflow:${user||localStorage.getItem('achilles_user')||'guest'}`;
    const read=user=>{try{return C.merge(C.empty(),JSON.parse(localStorage.getItem(key(user))||'{}'));}catch(_){return C.empty();}};
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const field=id=>document.getElementById(id);
    let proposal=null,dirty=false,hydratedUser=null;
    function context(){
        const now=new Date();
        const localDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const state=read(),today=root.todayDate||localDate;
        const days={...(A.storage?.days?.()||root.allDaysData||{})};
        const selected=root.currentViewDate||today;
        if(Array.isArray(root.dailyLog))days[selected]={...days[selected],log:root.dailyLog,workoutBonus:root.workoutBonus};
        for(const [date,day] of Object.entries(days))days[date]={...day,nutritionComplete:C.isComplete(date,day,state.completions)};
        return {today,selectedDate:today,days,state,profile:A.storage?.profile?.()||{},targets:A.storage?.macroTargets?.()||{},
            baseKcal:A.storage?.get?.('achilles_base_kcal',0),mode:A.storage?.get?.('achilles_app_mode','pro'),
            weights:A.storage?.json?.('achilles_weight_history',[])||[],sessions:A.training?.history?.all?.()||[],catalog:root.ACHILLES_FOOD_CORE_CANONICAL||[]};
    }
    function changed(){syncCompletion();root.dispatchEvent(new CustomEvent('achilles:coach-workflow-changed'));}
    function save(state){
        try{localStorage.setItem(key(),JSON.stringify(state));}catch(_){A.toast?.('Не вдалося зберегти зміни','fa-triangle-exclamation');return false;}
        changed();
        try{Promise.resolve(root.syncToCloud?.()).catch(()=>A.toast?.('Збережено на пристрої. Хмарна синхронізація поки недоступна.','fa-cloud'));}catch(_){}
        return true;
    }
    function syncCompletion(){
        const toggle=field('nutrition-complete'),label=field('nutrition-complete-status');if(!toggle)return;
        const input=context(),date=root.currentViewDate||input.today,day=input.days[date]||{};
        toggle.checked=C.isComplete(date,day,input.state.completions);
        toggle.disabled=date>input.today||!(day.log||[]).some(e=>e?.type==='food');
        if(label){const pretty=new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long'}).format(new Date(`${date}T12:00:00`));label.textContent=toggle.disabled?'Додай хоча б один прийом їжі, щоб підтвердити день.':(toggle.checked?`Підтверджено · ${pretty}`:`Не підтверджено · ${pretty}`);}
    }
    function complete(value){
        const input=context(),date=root.currentViewDate||input.today,day=input.days[date]||{};
        if(date>input.today||!(day.log||[]).some(e=>e?.type==='food'))return syncCompletion();
        input.state.completions[date]={signature:value?C.signature(day.log):null,updatedAt:Date.now()};
        if(!save(input.state))syncCompletion();
    }
    function showMode(){const mode=field('coach-schedule-mode')?.value;for(const type of ['cycle','weekly'])if(field(`coach-${type}-fields`))field(`coach-${type}-fields`).hidden=mode!==type;}
    function defaultPreferences(){return {nutrition:true,sweets:true,weight:true,training:true,maxInsights:4,sweetsThreshold:20};}
    function hydratePreferences(preferences){const value={...defaultPreferences(),...(preferences||{})};document.querySelectorAll('[data-coach-focus]').forEach(box=>box.checked=value[box.dataset.coachFocus]!==false);if(field('coach-max-insights'))field('coach-max-insights').value=String([2,4,6].includes(Number(value.maxInsights))?Number(value.maxInsights):4);if(field('coach-sweets-threshold'))field('coach-sweets-threshold').value=String(Math.max(5,Math.min(40,Number(value.sweetsThreshold)||20)));}
    function savePreferences(){const input=context();const preferences={updatedAt:Date.now(),maxInsights:Number(field('coach-max-insights')?.value)||4,sweetsThreshold:Number(field('coach-sweets-threshold')?.value)||20};document.querySelectorAll('[data-coach-focus]').forEach(box=>preferences[box.dataset.coachFocus]=box.checked);if(save({...input.state,preferences})){const status=field('coach-preferences-status');if(status)status.textContent='Налаштування Coach збережено.';}}
    function hydrate(){
        const user=localStorage.getItem('achilles_user');
        if(user!==hydratedUser){dirty=false;hydratedUser=user;}
        if(dirty||!field('coach-schedule-mode'))return;
        const input=context(),config=input.state.config||{mode:'none',anchor:input.today,workDays:input.profile.workDays||2,restDays:input.profile.restDays||2,offMode:'first',weekdays:[],minutes:30,equipment:''};
        for(const [id,prop] of [['mode','mode'],['anchor','anchor'],['work','workDays'],['rest','restDays'],['off','offMode'],['minutes','minutes'],['equipment','equipment']])field(`coach-schedule-${id}`).value=config[prop]??'';
        document.querySelectorAll('[name="coach-weekday"]').forEach(box=>box.checked=(config.weekdays||[]).includes(Number(box.value)));
        showMode();syncCompletion();hydratePreferences(input.state.preferences);
    }
    function saveConfig(){
        const input=context();
        try{
            const raw={mode:field('coach-schedule-mode').value,anchor:field('coach-schedule-anchor').value,workDays:field('coach-schedule-work').value,restDays:field('coach-schedule-rest').value,offMode:field('coach-schedule-off').value,minutes:field('coach-schedule-minutes').value,equipment:field('coach-schedule-equipment').value,weekdays:Array.from(document.querySelectorAll('[name="coach-weekday"]:checked'),b=>Number(b.value))};
            input.state.config={...C.validateConfig(raw,input.today),updatedAt:Date.now()};
            if(save(input.state)){dirty=false;field('coach-plan-status').textContent='Графік збережено. Нові дати рахуються від сьогодні.';}
        }catch(error){field('coach-plan-status').textContent=error.message;}
    }
    function renderQuestion(analysis){
        const host=field('coach-question-host');if(!host)return;
        const q=analysis?.question;
        const response=analysis?.lastAnswerResponse;
        if(!q){
            host.innerHTML=response?'<div class="coach-answer-response"><span class="eyebrow">COACH ВРАХУВАВ</span><p>'+esc(response)+'</p></div>':'';
            return;
        }
        let control='';
        if(q.type==='single'){
            control='<div class="coach-question-options">'+(q.options||[]).map(o=>'<button type="button" data-coach-answer="'+esc(o.value)+'">'+esc(o.label)+'</button>').join('')+'</div>';
        }else if(q.type==='multi'){
            control='<div class="coach-question-options multi">'+(q.options||[]).map(o=>'<label><input type="checkbox" value="'+esc(o.value)+'" data-coach-multi/><span>'+esc(o.label)+'</span></label>').join('')+'</div><button type="button" class="primary-btn coach-question-submit" data-coach-submit-multi>Врахувати відповідь</button>';
        }else if(q.type==='scale'){
            control='<div class="coach-question-scale">'+Array.from({length:(q.max||5)-(q.min||1)+1},(_,i)=>i+(q.min||1)).map((n,i)=>'<button type="button" data-coach-answer="'+n+'"><strong>'+n+'</strong><span>'+esc(q.labels?.[i]||'')+'</span></button>').join('')+'</div>';
        }else if(q.type==='text'){
            control='<div class="coach-question-text"><textarea id="coach-question-text" maxlength="'+Number(q.maxLength||140)+'" rows="3" placeholder="Напиши коротко"></textarea><button type="button" class="primary-btn" data-coach-submit-text>Зберегти фокус</button></div>';
        }
        host.innerHTML='<article class="coach-question-card"><span class="eyebrow">ПИТАННЯ ВІД COACH</span><h3>'+esc(q.title)+'</h3><p>'+esc(q.prompt||'')+'</p>'+control+'</article>'+(response?'<div class="coach-answer-response"><span class="eyebrow">ОСТАННЯ ВІДПОВІДЬ COACH</span><p>'+esc(response)+'</p></div>':'');
        host.querySelectorAll('[data-coach-answer]').forEach(btn=>btn.addEventListener('click',()=>submitAnswer(q,btn.dataset.coachAnswer)));
        host.querySelector('[data-coach-submit-multi]')?.addEventListener('click',()=>{
            const values=Array.from(host.querySelectorAll('[data-coach-multi]:checked'),x=>x.value);
            if(values.length)submitAnswer(q,values);
        });
        host.querySelector('[data-coach-submit-text]')?.addEventListener('click',()=>{
            const value=field('coach-question-text')?.value?.trim();
            if(value)submitAnswer(q,value);
        });
    }
    function submitAnswer(question,value){
        if(!question?.id)return;
        const input=context(),now=Date.now();
        const answer={value,updatedAt:now};
        const response=E.responseFor?.(question.id,value)||'Відповідь збережено.';
        input.state.answers={...(input.state.answers||{}),[question.id]:answer};
        input.state.lastAnswer={id:question.id,value,response,updatedAt:now};
        save(input.state);
    }
    function render(){
        const host=field('coach-weekly-action');if(!host)return;
        const input=context();if(A.coach?.isEnabled?.()===false){host.innerHTML='';return;}
        const analysis=E.analyze(input),action=C.active(input.state);
        renderQuestion(analysis);
        const config=input.state.config,upcoming=C.schedule(config,input.today,C.shift(input.today,13));
        const scheduleText=config?.mode&&config.mode!=='none'?`Наступне тренування: ${upcoming[0]||'немає у найближчі 14 днів'}. Час: ${config.minutes} хв. Обладнання: ${config.equipment||'не вказано'}.`:'Графік тренувань ще не задано — обов’язкову частоту не припускаю.';
        let html=`<h3>Один крок на тиждень</h3><p>${esc(scheduleText)}</p>`;
        // A safety observation remains visible even during an accepted experiment.
        const urgent=analysis.insights.find(i=>i.id==='fast-loss'||i.id==='age');
        if(urgent)html+=`<p class="coach-priority"><strong>${esc(urgent.title)}</strong><br>${esc(urgent.advice)}</p>`;
        if(action){
            const result=C.review(action,input,E),todayFeedback=input.state.feedback[`${action.id}:${input.today}`]?.value;
            html+=`<article class="coach-insight"><h4>${esc(action.title)}</h4><p>${esc(action.text)}</p><p>${esc(action.evidence)}</p><p>${esc(result.text)}</p>`;
            if(!result.ready)html+=`<div class="coach-action-buttons"><button type="button" data-cycle="done" aria-pressed="${todayFeedback==='done'}">Сьогодні виконав</button><button type="button" data-cycle="hard" aria-pressed="${todayFeedback==='hard'}">Було складно</button></div>`;
            else html+=`<p>Як оціниш цей крок?</p><div class="coach-action-buttons"><button type="button" data-cycle="completed">Було зручно</button><button type="button" data-cycle="difficult">Потрібен інший підхід</button></div>`;
            html+=`<button type="button" class="secondary" data-cycle="skipped">${result.ready?'Завершити без оцінки':'Цей крок не підходить'}</button></article>`;
            proposal=null;
        }else if(!urgent){
            proposal=C.proposal(input,analysis,E);
            if(proposal)html+=`<article class="coach-insight"><h4>${esc(proposal.title)}</h4><p>${esc(proposal.evidence)}</p><p>${esc(proposal.text)}</p><p>Перевірка через 7 днів після початку.</p><button type="button" data-cycle="accept">Спробувати протягом тижня</button></article>`;
            else html+='<p>Зараз немає нового пріоритетного кроку. Нещодавно завершені чи відхилені поради не повторюю протягом тижня.</p>';
        }else proposal=null;
        const history=Object.values(input.state.actions).filter(a=>a.status!=='active').sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5);
        if(history.length)html+=`<details class="coach-limitations"><summary>Попередні кроки (${history.length})</summary>${history.map(a=>`<p><strong>${esc(a.title)}</strong> · ${esc(a.startDate)}<br>${esc({completed:'Було зручно',difficult:'Потрібен інший підхід',skipped:'Завершено без оцінки',superseded:'Замінено кроком з іншого пристрою'}[a.status])}<br>${esc(a.report||'')}</p>`).join('')}</details>`;
        host.innerHTML=html;
        host.querySelectorAll('[data-cycle]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.cycle)));
    }
    function act(kind){
        if(A.coach?.isEnabled?.()===false)return;
        const input=context(),action=C.active(input.state),now=Date.now();
        if(kind==='accept'){
            if(action||!proposal)return;
            const current=C.proposal(input,E.analyze(input),E);if(!current)return;
            const id=`step-${now}-${Math.random().toString(36).slice(2,8)}`;
            input.state.actions[id]={...current,id,startDate:input.today,updatedAt:now,status:'active',configSnapshot:input.state.config};
        }else if(action){
            if(['done','hard'].includes(kind)){
                if(input.today>=C.shift(action.startDate,7))return;
                input.state.feedback[`${action.id}:${input.today}`]={value:kind,updatedAt:now};
            }else if(['completed','difficult','skipped'].includes(kind)){
                const result=C.review(action,input,E);if(!result.ready&&kind!=='skipped')return;
                input.state.actions[action.id]={...action,status:kind,closedDate:input.today,report:result.text,updatedAt:now};
            }else return;
        }else return;
        save(input.state);
    }
    A.coachWorkflow={read,context,complete,syncCompletion,render,hydrate,defaultPreferences,savePreferences,save,submitAnswer,
        mergeRemote(remote,user){const result=C.merge(read(user),remote||{});try{localStorage.setItem(key(user),JSON.stringify(result));}catch(_){return false;}hydrate();changed();return true;}
    };
    document.addEventListener('DOMContentLoaded',()=>{
        field('nutrition-complete')?.addEventListener('change',e=>complete(e.target.checked));
        field('coach-plan-fields')?.addEventListener('input',()=>{dirty=true;showMode();});
        field('coach-plan-save')?.addEventListener('click',saveConfig);
        field('coach-preferences-save')?.addEventListener('click',savePreferences);
        hydrate();
    },{once:true});
    root.addEventListener('storage',event=>{if(event.key===key()){hydrate();changed();}});
})(window);
