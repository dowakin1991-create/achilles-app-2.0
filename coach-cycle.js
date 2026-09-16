/* Pure coaching workflow: dates, confirmed logs, one-week experiments and merging. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AchillesCoachCycle=api;})(typeof window==='object'?window:globalThis,function(){
    'use strict';
    const stamp=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d))?Date.parse(`${d}T12:00:00Z`):NaN;
    const shift=(d,n)=>new Date(stamp(d)+n*86400000).toISOString().slice(0,10);
    const validDate=d=>Number.isFinite(stamp(d))&&shift(d,0)===d;
    function dates(from,to){const result=[];if(!validDate(from)||!validDate(to))return result;for(let d=from;d<=to&&result.length<370;d=shift(d,1))result.push(d);return result;}
    const empty=()=>({version:2,config:null,preferences:null,completions:{},actions:{},feedback:{}});
    const newer=(a,b)=>{if(!a)return b;if(!b)return a;const delta=Number(b.updatedAt||0)-Number(a.updatedAt||0);return delta>0?b:delta<0?a:JSON.stringify(b)>JSON.stringify(a)?b:a;};
    function merge(a={},b={}){
        const out=empty();out.config=newer(a.config,b.config)||null;out.preferences=newer(a.preferences,b.preferences)||null;
        for(const bucket of ['completions','actions','feedback','readiness','effort']){
            out[bucket]=out[bucket]||{};
            for(const source of [a[bucket],b[bucket]])for(const [key,value] of Object.entries(source||{})){
                if(!/^[\w:.-]+$/.test(key)||!value||typeof value!=='object')continue;
                out[bucket][key]=newer(out[bucket][key],value);
            }
        }
        // If two offline devices accepted a step, retain both records but only one active step.
        const running=Object.values(out.actions).filter(a=>a.status==='active').sort((a,b)=>(b.updatedAt-a.updatedAt)||String(b.id).localeCompare(String(a.id)));
        for(const action of running.slice(1))out.actions[action.id]={...action,status:'superseded',closedDate:running[0].startDate,updatedAt:running[0].updatedAt};
        return out;
    }
    function signature(log=[]){
        const text=JSON.stringify(log.filter(e=>e?.type==='food').map(e=>[e.id,e.foodId,e.foodName,e.weightG,e.kcal,e.p,e.f,e.c,e.html,e.nutritionQuality||null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
        // Compact change detector, not an authentication or cryptographic primitive.
        let a=2166136261,b=5381;
        for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
        return `${text.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;
    }
    function isComplete(date,day,completions={}){return (day?.log||[]).some(e=>e?.type==='food')&&completions[date]?.signature===signature(day.log);}
    function validateConfig(raw,today){
        const c={mode:raw.mode,anchor:raw.anchor,workDays:Number(raw.workDays),restDays:Number(raw.restDays),offMode:raw.offMode,
            weekdays:[...new Set(raw.weekdays||[])].map(Number).sort(),minutes:Number(raw.minutes),equipment:String(raw.equipment||'').trim().slice(0,100),startDate:today};
        if(!['none','cycle','weekly'].includes(c.mode))throw Error('Обери тип графіка.');
        if(!Number.isInteger(c.minutes)||c.minutes<10||c.minutes>180)throw Error('Тривалість: від 10 до 180 хвилин.');
        if(c.mode==='cycle'&&(!validDate(c.anchor)||!Number.isInteger(c.workDays)||!Number.isInteger(c.restDays)||c.workDays<1||c.restDays<1||c.workDays+c.restDays>28||!['first','all'].includes(c.offMode)))throw Error('Вкажи дату першого робочого дня та цикл від 1 до 28 днів із вихідними.');
        if(c.mode==='weekly'&&(!c.weekdays.length||c.weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)))throw Error('Обери хоча б один день тренувань.');
        return c;
    }
    function scheduled(config,date){
        if(!config||!validDate(date)||date<(config.startDate||date))return false;
        if(config.mode==='weekly')return (config.weekdays||[]).includes(new Date(stamp(date)).getUTCDay());
        if(config.mode!=='cycle'||!validDate(config.anchor)||date<config.anchor)return false;
        const length=config.workDays+config.restDays;
        if(!(length>0))return false;
        const offset=Math.round((stamp(date)-stamp(config.anchor))/86400000)%length;
        return config.offMode==='all'?offset>=config.workDays:offset===config.workDays;
    }
    function schedule(config,from,to){return dates(from,to).filter(d=>scheduled(config,d));}
    function active(state){return Object.values(state.actions||{}).filter(a=>a.status==='active').sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null;}
    function stats(input,from,to,engine){
        const rows=[];const training=[];
        for(const date of dates(from,to)){
            const day=input.days[date]||{};
            if((day.log||[]).some(e=>e?.type==='workout'))training.push(date);
            if(!isComplete(date,day,input.state.completions))continue;
            const analysis=engine.analyze({...input,today:input.today,selectedDate:date});
            const food=(day.log||[]).filter(e=>e?.type==='food');
            rows.push({kcal:food.reduce((s,e)=>s+(Number(e.kcal)||0),0),protein:food.reduce((s,e)=>s+(Number(e.p)||0),0),sweets:analysis.metrics.sweetKcal,fiber:analysis.metrics.fiber,produce:analysis.metrics.produce});
        }
        const result={completeDays:rows.length,workoutDays:training.length};
        for(const field of ['kcal','protein','sweets','fiber','produce']){const values=rows.map(r=>r[field]).filter(v=>typeof v==='number'&&Number.isFinite(v));result[field]=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;result[`${field}Days`]=values.length;}
        return result;
    }
    const tasks={
        data:{title:'Підтвердити повні дні харчування',text:'Протягом тижня внеси всі прийоми їжі й напої та підтверджуй день у журналі. Для порівняння потрібно щонайменше 3 повні дні.',metric:'completeDays'},
        sweets:{title:'Спробувати меншу порцію солодкого',text:'Протягом тижня в дні з десертом обери трохи меншу порцію або заміни солодкий напій водою. Записуй фактичну порцію; не пропускай основну їжу заради компенсації.',metric:'sweets'},
        protein:{title:'Додати джерело білка до прийому їжі',text:'Протягом тижня плануй джерело білка в основному прийомі їжі та записуй порцію. Порівняємо записи з минулим тижнем, без автоматичної зміни твоєї цілі.',metric:'protein'},
        produce:{title:'Додати овочі або цілий фрукт',text:'Протягом тижня додавай порцію овочів або цілого фрукта до основного прийому їжі та записуй її вагу.',metric:'produce'},
        energy:{title:'Перевіряти порції та повноту записів',text:'Протягом тижня перевіряй вагу порцій, олію, соуси, напої та дублікати. Не компенсуй окремий день голодуванням.',metric:'kcal'},
        schedule:{title:'Спробувати свій графік тренувань',text:'Виконай доступні заплановані тренування без спроб надолужити пропущені подвійним навантаженням. Записуй вправи; якщо день не підходить, відзнач труднощі.',metric:'workoutDays'},
        'training-review':{title:'Перевірити відновлення між тренуваннями',text:'На наступних тренуваннях звертай увагу на відпочинок між підходами й техніку. Зафіксуй, чи цей крок був зручним. Автоматично збільшувати вагу не потрібно.',metric:'feedback'}
    };
    function proposal(input,analysis,engine){
        if(active(input.state))return null;
        const baseline=stats(input,shift(input.today,-7),shift(input.today,-1),engine);
        const recently=Object.values(input.state.actions||{}).filter(a=>a.status!=='active'&&stamp(input.today)-stamp(a.closedDate||a.startDate)<7*86400000).map(a=>a.kind);
        const candidates=[];
        if(input.state.preferences?.nutrition!==false && baseline.completeDays<3)candidates.push({id:'data',evidence:`За попередні 7 днів підтверджено ${baseline.completeDays} повних днів. Без цього порівняння харчування ненадійне.`});
        candidates.push(...analysis.insights.filter(i=>tasks[i.id]&&i.id!=='data'));
        if(input.state.preferences?.training!==false && schedule(input.state.config,input.today,shift(input.today,6)).length)candidates.push({id:'schedule',evidence:'Використаємо графік, який ти зберіг у Coach.'});
        const selected=candidates.find(i=>!recently.includes(i.id));
        if(!selected)return null;
        return {...tasks[selected.id],kind:selected.id,evidence:selected.evidence,baseline};
    }
    function review(action,input,engine){
        const end=shift(action.startDate,6),due=shift(action.startDate,7);
        const follow=stats(input,action.startDate,input.today<due?shift(input.today,-1):end,engine);
        const feedback=Object.entries(input.state.feedback||{}).filter(([key])=>key.startsWith(`${action.id}:`));
        const done=feedback.filter(([,v])=>v.value==='done').length;
        const hard=feedback.filter(([,v])=>v.value==='hard').length;
        if(input.today<due)return {due,ready:false,text:`Виконання відзначено за ${done} дн.; труднощі — за ${hard} дн. Перевірка результату: ${due}.`};
        const base=action.baseline||{},metric=action.metric;
        if(metric==='completeDays')return {due,ready:true,text:`Підтверджені дні: ${base.completeDays||0} → ${follow.completeDays} за тиждень. Це показник повноти журналу, а не якості харчування.`};
        if(metric==='workoutDays'){
            const planned=schedule(action.configSnapshot,action.startDate,end).length;
            return {due,ready:true,text:`За тиждень записано ${follow.workoutDays} тренувальних днів; у прийнятому графіку було ${planned}. Окремі вправи одного дня не рахуються як окремі тренування.`};
        }
        if(metric==='feedback')return {due,ready:true,text:`Виконання відзначено за ${done} дн.; труднощі — за ${hard} дн. За цими позначками неможливо визначити зміну сили чи відновлення. Оціни зручність кроку.`};
        if(base.completeDays<3||follow.completeDays<3||base[metric]===null||follow[metric]===null||(metric==='fiber'&&(base.fiberDays<3||follow.fiberDays<3)))return {due,ready:true,text:`Даних для порівняння недостатньо: повних днів до — ${base.completeDays||0}, після — ${follow.completeDays}; потрібні також відомі значення показника. Успіх чи невдачу не визначаю.`};
        const label={sweets:'Калорії розпізнаних десертів і напоїв',protein:'Білок, г',fiber:'Відома клітковина, г',produce:'Розпізнані овочі та фрукти, г',kcal:'Калорійність'}[metric];
        return {due,ready:true,text:`${label}: у середньому ${base[metric]} → ${follow[metric]} на підтверджений день. Це спостереження, а не доказ ефекту поради. Для груп продуктів враховуй повноту даних.`};
    }
    return {empty,merge,signature,isComplete,validateConfig,scheduled,schedule,dates,shift,active,stats,proposal,review};
});
