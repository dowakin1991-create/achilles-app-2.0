(function(root){
    'use strict';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function init(){
        const W=root.Achilles?.coachWorkflow,T=root.AchillesCoachTraining;
        const host=document.getElementById('coach-training-checkin');if(!W||!T||!host)return;
        const select=(id,title,options)=>`<label>${title}<select id="${id}"><option value="">Не вказано</option>${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
        host.innerHTML='<h3>Самопочуття сьогодні</h3>'+select('readiness-sleep','Як спав?',[['good','Добре'],['poor','Погано']])+select('readiness-fatigue','Втома',[['normal','Звична'],['high','Сильна']])+select('readiness-pain','Є біль під час руху?',[['no','Ні'],['yes','Так']])+'<button type="button" id="save-readiness">Зберегти самопочуття</button><h3>Оціни записану вправу</h3><label>Тренування<select id="effort-session"></select></label>'+select('effort-rir','Скільки повторів залишалось у найважчому підході?',[['0','0 — межа'],['1-2','1–2'],['3+','3 або більше']])+select('effort-technique','Техніка',[['stable','Стабільна'],['unstable','Погіршувалась']])+select('effort-pain','Був біль у цій вправі?',[['no','Ні'],['yes','Так']])+'<button type="button" id="save-effort">Зберегти оцінку вправи</button><p id="training-checkin-status" role="status"></p><div id="training-next-step"></div>';
        const el=id=>document.getElementById(id);
        let sessions=[];
        function chosen(){return sessions.find(s=>T.sessionKey(s)===el('effort-session').value);}
        function show(){const input=W.context(),s=chosen();const enabled=root.Achilles.coach?.isEnabled?.()!==false&&input.state.preferences?.training!==false;host.hidden=!enabled;const next=s&&enabled?T.suggest(s,input.state,input.today):null;el('training-next-step').innerHTML=next?`<h4>${esc(next.label)}</h4><p>${esc(next.reason)}</p><p>${next.nextSets.map((set,i)=>`${i+1}: ${esc(set.reps)} повт. · ${esc(set.weightKg??set.addedWeightKg??0)} кг`).join('<br>')}</p>`:'';}
        function hydrate(){const input=W.context(),r=input.state.readiness?.[input.today]||{};for(const k of ['sleep','fatigue','pain'])el('readiness-'+k).value=r[k]||'';const old=el('effort-session').value;sessions=input.sessions.filter(s=>s.date<=input.today&&s.metrics?.sets?.length).sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0)).slice(0,50);el('effort-session').innerHTML='<option value="">Обери запис вправи</option>'+sessions.map(s=>`<option value="${esc(T.sessionKey(s))}">${esc(s.date)} · ${esc(s.exerciseName||s.exerciseId)} · ${s.metrics.sets.length} підх.</option>`).join('');el('effort-session').value=old;show();}
        el('effort-session').addEventListener('change',()=>{const s=chosen(),e=s?W.read().effort?.[T.sessionKey(s)]:null;for(const k of ['rir','technique','pain'])el('effort-'+k).value=e?.[k]||'';show();});
        function save(bucket,keys,prefix,key){const input=W.context();const values=Object.fromEntries(keys.map(k=>[k,el(prefix+k).value]));if(!key||Object.values(values).some(v=>!v)){el('training-checkin-status').textContent='Заповни всі поля цього блоку.';return;}input.state[bucket]=input.state[bucket]||{};input.state[bucket][key]={...values,updatedAt:Date.now()};if(W.save(input.state)){el('training-checkin-status').textContent='Збережено. Наступний крок оновлено.';show();}}
        el('save-readiness').addEventListener('click',()=>save('readiness',['sleep','fatigue','pain'],'readiness-',W.context().today));
        el('save-effort').addEventListener('click',()=>save('effort',['rir','technique','pain'],'effort-',chosen()?T.sessionKey(chosen()):null));
        document.querySelector('[data-target="tab-coach"]')?.addEventListener('click',()=>setTimeout(hydrate,0));
        root.addEventListener('achilles:coach-changed',show);
        root.addEventListener('achilles:coach-workflow-changed',show);
        hydrate();
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
