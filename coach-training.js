(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AchillesCoachTraining=api;})(typeof window==='object'?window:globalThis,function(){
    'use strict';
    const sessionKey=s=>'session-'+encodeURIComponent(JSON.stringify([s.exerciseId,s.date,s.createdAt,s.metrics])).replace(/%/g,'_');
    function suggest(session,state,today){
        const sets=(session.metrics?.sets||[]).map(s=>({...s}));
        const ready=state.readiness?.[today];
        const effort=state.effort?.[sessionKey(session)];
        const hold=reason=>({label:'Без підвищення навантаження',reason,nextSets:sets});
        if(!ready)return hold('Спочатку відзнач сьогоднішнє самопочуття у Coach.');
        if(ready.pain==='yes'||effort?.pain==='yes')return hold('Є запис про біль. Не прогресуй через біль; припини рух, який його викликає.');
        if(ready.fatigue==='high'||ready.sleep==='poor')return hold('Ти відзначив втому або поганий сон. Оціни самопочуття перед тренуванням і не надолужуй навантаження.');
        if(!effort)return hold('Оціни запас повторів і техніку саме цього запису у Coach.');
        if(effort.technique!=='stable'||effort.rir==='0')return hold('Спочатку повтори навантаження зі стабільною технікою та запасом повторів.');
        const elapsed=(Date.parse(today)-Date.parse(session.date))/86400000;
        if(!Number.isFinite(elapsed)||elapsed<1||elapsed>14)return hold('Після перерви або повторного запису цього дня спочатку перевір поточну працездатність.');
        if(!sets.length||!sets.every(s=>Number.isInteger(Number(s.reps))&&Number(s.reps)>0))return hold('Для цієї вправи немає повних силових підходів.');
        const i=sets.reduce((best,s,i)=>Number(s.reps)<Number(sets[best].reps)?i:best,0);
        sets[i].reps=Number(sets[i].reps)+1;
        return {label:`Спробуй +1 повтор у підході ${i+1}`,reason:'Попередня техніка стабільна, був запас повторів, сьогодні не відзначено болю чи сильної втоми. Вага кожного підходу залишається тією самою. Перевір результат після наступного тренування.',nextSets:sets};
    }
    return {sessionKey,suggest};
});
