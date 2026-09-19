/* Explainable, offline coaching. Unknown nutrients remain unknown. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.AchillesCoachEngine = api;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    const WHO = 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet';
    const CDC = 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html';
    const number = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
    const sum = values => values.reduce((a,b) => a+b, 0);
    const mean = values => values.length ? sum(values)/values.length : null;
    const round = n => Math.round(n*10)/10;
    const dayNumber = date => /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? Date.parse(`${date}T12:00:00Z`)/86400000 : NaN;
    const clean = name => String(name || '').replace(/<[^>]*>/g,'').replace(/^[^\p{L}\p{N}]+/u,'').trim();
    function classify(food) {
        if (['dessert','sweet-drink','fruit','vegetable','other'].includes(food.foodGroup)) return {group:food.foodGroup,basis:'explicit'};
        const n=clean(food.name).toLocaleLowerCase('uk-UA');
        // Only clear product names; mixed meals are deliberately not classified as whole fruit.
        if (/^(сік|нектар|лимонад|кола|кока.?кола|пепсі|солодкий напій|juice|cola|lemonade)(?:\s|$)/u.test(n)) {
            if (/без цукру|zero|sugar.free|дієтич/u.test(n)) return {group:'other',basis:'name'};
            return {group:'sweet-drink',basis:'name'};
        }
        if (/^(шоколад|цукер|печиво|торт|тістеч|морозиво|вафл|пончик|круасан|зефір|мармелад|халва|пахлава|мед(?:\s|$)|цукор(?:\s|$)|джем|варення|сироп|пудинг|десерт|chocolate|cookie|cake|candy|ice cream)/u.test(n)) return {group:'dessert',basis:'name'};
        if (/^(яблук|банан|груш|апельсин|мандарин|грейпфрут|ківі|персик|нектарин|абрикос|слив|полуниц|малина|чорниц|лохин|ожин|вишн|черешн|виноград|кавун|диня|ананас|манго)(?:[\p{L}\s()-]*)$/u.test(n) && !/суш|сироп|цук|сік|пюре/u.test(n)) return {group:'fruit',basis:'name'};
        if (/^(помідор|огір|броколі|капуст|моркв|буряк|кабач|баклажан|перець|шпинат|редис|гарбуз|цибул|петруш|кріп)/u.test(n) && !/салат|соус|фаршир|олії|олія/u.test(n)) return {group:'vegetable',basis:'name'};
        return {group:'unknown',basis:'unknown'};
    }
    function snapshot(food, weightG) {
        const grams=number(weightG);
        const portion=key => grams !== null && number(food[key]) !== null ? round(number(food[key])*grams/100) : null;
        return {version:1,name:clean(food.name),...classify(food),fiberG:portion('fiber'),freeSugarG:portion('freeSugarG'),sugarG:portion('sugarG')};
    }
    function foodDetails(entry, catalog) {
        if (entry.nutritionQuality?.version === 1) return entry.nutritionQuality;
        const match=String(entry.html||'').match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
        const name=entry.foodName || clean(match?.[1]).replace(/\s*\([\d.,]+\s*г\)\s*$/u,'');
        const food=catalog.get(entry.foodId);
        if (food) return snapshot(food, entry.weightG);
        return {name,...classify({name}),fiberG:null,freeSugarG:null,sugarG:null};
    }

    function completedDays(days,todayN,fromAgo=13,toAgo=0) {
        return Object.entries(days).filter(([date,d])=>{
            const n=dayNumber(date);
            return Number.isFinite(n) && n>=todayN-fromAgo && n<=todayN-toAgo && d?.nutritionComplete && (d.log||[]).some(e=>e?.type==='food');
        });
    }
    function dataQuality(input,byId) {
        const todayN=dayNumber(input.today), days=input.days||{};
        const logged=Object.entries(days).filter(([date,d])=>dayNumber(date)>=todayN-13&&dayNumber(date)<=todayN&&(d.log||[]).some(e=>e?.type==='food'));
        const complete=logged.filter(([,d])=>d.nutritionComplete);
        const foods=logged.flatMap(([,d])=>(d.log||[]).filter(e=>e?.type==='food'));
        const knownFiber=foods.filter(e=>number(foodDetails(e,byId).fiberG)!==null).length;
        const weights=new Set((input.weights||[]).filter(w=>number(w.weight)>0&&dayNumber(w.date)>=todayN-13&&dayNumber(w.date)<=todayN).map(w=>w.date));
        const sessions=(input.sessions||[]).filter(s=>dayNumber(s.date)>=todayN-13&&dayNumber(s.date)<=todayN);
        const signals={completeDays:complete.length,loggedDays:logged.length,fiberCoverage:foods.length?knownFiber/foods.length:0,weightDays:weights.size,trainingDays:new Set(sessions.map(s=>s.date)).size};
        let score=0;score+=Math.min(40,complete.length/7*40);score+=Math.min(20,logged.length/7*20);score+=Math.min(15,signals.fiberCoverage*15);score+=Math.min(15,weights.size/6*15);score+=Math.min(10,signals.trainingDays/3*10);score=Math.round(score);
        const level=score>=75?'high':score>=45?'medium':'low';
        const reasons=[];
        if(complete.length<3)reasons.push('менше 3 підтверджених днів харчування');
        if(weights.size<3)reasons.push('мало зважувань для надійного тренду');
        if(signals.trainingDays<2)reasons.push('мало тренувальних днів для порівняння');
        if(foods.length&&signals.fiberCoverage<.7)reasons.push('клітковина відома не для всіх продуктів');
        return {score,level,...signals,reasons};
    }
    function answerFor(state,id){return state?.answers?.[id]?.value ?? null;}
    function answerFresh(state,id,maxAgeDays) {
        const answer=state?.answers?.[id];
        if(!answer) return false;
        const updated=Number(answer.updatedAt||0);
        return updated>0 && Date.now()-updated < maxAgeDays*86400000;
    }
    function answeredAfterLastSession(input,id) {
        const answer=input.state?.answers?.[id];
        if(!answer) return false;
        const latest=(input.sessions||[]).map(s=>dayNumber(s.date)).filter(Number.isFinite).sort((a,b)=>b-a)[0];
        if(!Number.isFinite(latest)) return answerFresh(input.state,id,7);
        return Number(answer.updatedAt||0) >= latest*86400000;
    }
    function questionFor(input,analysis) {
        const q=analysis.dataQuality||{};
        const has=id=>analysis.insights.some(i=>i.id===id);
        if(has('protein-week')&&!answerFresh(input.state,'protein-barrier',30)) return {id:'protein-barrier',type:'single',title:'Що найбільше заважає добирати білок?',prompt:'Це допоможе Coach дати практичнішу пораду замість загального «їж більше білка».',options:[{value:'time',label:'Не вистачає часу'},{value:'appetite',label:'Не хочеться / важко зʼїсти'},{value:'planning',label:'Не планую наперед'},{value:'cost',label:'Дорого'},{value:'unknown',label:'Не знаю, чим добрати'}]};
        if((q.trainingDays<2||has('training-review'))&&!answerFresh(input.state,'training-barrier',21)) return {id:'training-barrier',type:'multi',title:'Що найчастіше заважає тренуватись?',prompt:'Можна обрати кілька причин.',options:[{value:'time',label:'Немає часу'},{value:'fatigue',label:'Втома після роботи'},{value:'pain',label:'Біль / дискомфорт'},{value:'motivation',label:'Немає бажання'},{value:'schedule',label:'Незручний графік'}]};
        if(q.weightDays<3&&!answerFresh(input.state,'weighing-routine',30)) return {id:'weighing-routine',type:'single',title:'Коли тобі реально найзручніше зважуватись?',prompt:'Coach підлаштує рекомендацію під реальний режим, а не під «ідеальну» схему.',options:[{value:'morning',label:'Вранці'},{value:'after-work',label:'Після роботи'},{value:'days-off',label:'У вихідні'},{value:'irregular',label:'Коли вийде'}]};
        if(q.trainingDays>=1&&!answeredAfterLastSession(input,'last-workout-effort')) return {id:'last-workout-effort',type:'scale',title:'Наскільки важким було останнє тренування?',prompt:'1 — дуже легке, 5 — майже на межі.',min:1,max:5,labels:['Дуже легко','Легко','Нормально','Важко','На межі']};
        if(q.completeDays>=3&&!answerFresh(input.state,'weekly-focus',7)) return {id:'weekly-focus',type:'text',title:'Що ти хочеш покращити цього тижня?',prompt:'Напиши коротко: наприклад «добирати білок», «не пропускати тренування» або «краще контролювати порції».',maxLength:140};
        return null;
    }
    function responseFor(answerId,value) {
        const values=Array.isArray(value)?value:[value];
        if(answerId==='protein-barrier'){const map={time:'Тоді не ускладнюємо: Coach шукатиме варіанти, які додаються за 1–2 хвилини — яйця, кисломолочний сир, йогурт, тунець або готова порція мʼяса.',appetite:'Тоді краще розподіляти білок між прийомами їжі, а не намагатися добрати велику порцію ввечері.',planning:'Зробимо акцент на одному заздалегідь вибраному білковому продукті на день.',cost:'Coach віддаватиме перевагу доступнішим джерелам: яйця, кисломолочний сир, курятина, бобові.',unknown:'Coach показуватиме конкретний орієнтир у грамах і кілька простих джерел білка.'};return map[value]||'Врахую це в наступних порадах.';}
        if(answerId==='training-barrier'){const parts=[];if(values.includes('time'))parts.push('коротші тренування');if(values.includes('fatigue'))parts.push('менше навантаження після робочих днів');if(values.includes('pain'))parts.push('обережніший підбір вправ без автоматичного збільшення навантаження');if(values.includes('motivation'))parts.push('мінімальний план із дуже низьким порогом входу');if(values.includes('schedule'))parts.push('привʼязку до реального циклу роботи/відпочинку');return parts.length?'Врахую: '+parts.join(', ')+'.':'Врахую це в плані.';}
        if(answerId==='weighing-routine'){const map={morning:'Добре. Для тренду Coach орієнтуватиметься насамперед на ранкові вимірювання за схожих умов.','after-work':'Після роботи вага сильніше залежить від їжі та рідини, тому Coach дивитиметься на середню тенденцію, а не на окреме число.','days-off':'Тоді краще мати 2–3 стабільні вимірювання на тиждень у схожих умовах, навіть якщо це лише вихідні.',irregular:'Тоді не буду робити сильних висновків з окремих вимірювань — лише з довшої тенденції.'};return map[value]||'Врахую це при аналізі ваги.';}
        if(answerId==='last-workout-effort'){const n=Number(value);if(n<=2)return 'Останнє тренування відчувалось легким. Якщо техніка стабільна й повтори виконані впевнено, наступного разу можна розглядати невеликий прогрес.';if(n===3)return 'Нормальна складність. Найкращий варіант — повторити або трохи покращити один параметр, а не різко додавати вагу.';return 'Тренування було важким. Coach не радитиме автоматично підвищувати вагу; спершу варто повторити навантаження або покращити відновлення.';}
        if(answerId==='weekly-focus')return 'Фокус збережено: «'+String(value).slice(0,140)+'». Я використаю його як контекст, але не буду підміняти ним фактичні дані журналу.';
        return 'Відповідь збережено й буде врахована в наступному аналізі.';
    }

    function analyze(input) {
        const {today,days={},profile={},targets={},weights=[],sessions=[],catalog=[]}=input;
        const preferences={nutrition:true,sweets:true,weight:true,training:true,maxInsights:4,sweetsThreshold:20,...(input.state?.preferences||input.preferences||{})};
        const todayN=dayNumber(today);
        const selected=input.selectedDate && dayNumber(input.selectedDate)<=todayN ? input.selectedDate : today;
        const day=days[selected] || {};
        const foods=(day.log||[]).filter(e=>e?.type==='food');
        const byId=new Map(catalog.map(f=>[f.id,f]));
        const items=foods.map(e=>({...foodDetails(e,byId),kcal:number(e.kcal)||0,grams:number(e.weightG)}));
        const kcal=sum(items.map(f=>f.kcal));
        const base=number(input.baseKcal)||0;
        const goal=base+(input.mode==='pro'?(number(day.workoutBonus)||0):0);
        const sweets=items.filter(f=>['dessert','sweet-drink'].includes(f.group));
        const sweetKcal=sum(sweets.map(f=>f.kcal));
        const share=kcal>0?Math.round(sweetKcal/kcal*100):0;
        const knownFiber=items.filter(f=>number(f.fiberG)!==null);
        const fiber=sum(knownFiber.map(f=>f.fiberG));
        const freeSugar=sum(items.map(f=>number(f.freeSugarG)||0));
        const produce=sum(items.filter(f=>['fruit','vegetable'].includes(f.group)).map(f=>f.grams||0));
        const history=Object.entries(days).filter(([date,d])=>dayNumber(date)<todayN && dayNumber(date)>=todayN-14 && (d.log||[]).some(e=>e.type==='food'));
        const insights=[];
        const add=(id,priority,title,evidence,advice,target='tab-food',source=null)=>insights.push({id,priority,title,evidence,advice,target,source});
        const dateLabel=selected===today?'Сьогодні':selected;
        if (profile.age && Number(profile.age)<18) {
            add('age',100,'Поради для дорослих обмежено','У профілі вказано вік до 18 років.','Не застосовуй дорослі схеми дефіциту й прогресії без індивідуального супроводу.','tab-profile');
            return {insights,summary:'Доступні журнал і фактичні показники.',metrics:{},limitations:[]};
        }
        // Product calories are NOT sugar grams. This is a review prompt, not a sugar limit.
        if (sweets.length) {
            add('sweets',sweetKcal>=goal*(Math.max(5,Math.min(40,Number(preferences.sweetsThreshold)||20))/100) && goal>0?85:35,'Солодке в раціоні',
                `${dateLabel}: ${sweets.map(f=>`${f.name}: ${Math.round(f.kcal)} ккал`).join('; ')}. Разом ${Math.round(sweetKcal)} ккал — ${share}% внесеного раціону.`,
                sweetKcal>=goal*(Math.max(5,Math.min(40,Number(preferences.sweetsThreshold)||20))/100) && goal>0 ? 'Це помітна частка калорій. Якщо десерт витісняє основну їжу, зменш його порцію або заміни солодкий напій водою. Не компенсуй його голодуванням чи додатковим тренуванням.' : 'Сам факт десерту не означає зрив. Враховуй порцію в загальному раціоні; залишай місце для звичайної їжі.');
        }
        if (freeSugar>0 && goal>0 && freeSugar*4>=goal*.1) {
            add('free-sugar',90,'Вільні цукри',`У відомих даних щонайменше ${round(freeSugar)} г вільних цукрів. Орієнтир 10% від цілі ${Math.round(goal)} ккал — ${round(goal*.1/4)} г.`, 'Переглянь порції солодких напоїв, меду, сиропів і десертів. Загальні вуглеводи або всі цукри продукту не дорівнюють вільним цукрам.','tab-food',WHO);
        }
        if (foods.length) {
            if (produce<400) add('produce',40,'Овочі та цілі фрукти',`За назвами розпізнано приблизно ${Math.round(produce)} г овочів і цілих фруктів; склад змішаних страв невідомий.`, 'Якщо вони ще не враховані в інших стравах, додай їх до основного прийому їжі. Загальний орієнтир — від 400 г на день; сік не зараховується тут як цілий фрукт.','tab-food',WHO);
            const protein=sum(foods.map(f=>number(f.p)||0));
            if (number(targets.p)>0 && protein<targets.p*.9) add('protein',55,'Білок у записах',`Внесено ${round(protein)} г із заданої в профілі цілі ${round(targets.p)} г.`, day.nutritionComplete?'У підтвердженому дні білок нижчий за задану ціль. Плануючи наступний день, включи джерело білка в основний прийом їжі.':'Якщо плануєш ще прийом їжі, включи джерело білка: яйця, рибу, кисломолочний продукт або бобові. Неповний журнал не доводить нестачу білка.');
            if (goal>0 && kcal>goal*1.1) add('energy',80,'Калорії понад поточну ціль',`Внесено ${Math.round(kcal)} ккал за цілі ${Math.round(goal)} ккал.`, 'Перевір порції та дублікати записів. Один день не визначає прогрес; повернись до звичного плану без покарання голодом.');
        }
        // Repeated patterns require completed days; missing days are never zero intake.
        const completeWeek=history.filter(([date,d])=>dayNumber(date)>=todayN-7 && d.nutritionComplete);
        if (completeWeek.length>=3 && preferences.nutrition!==false) {
            const proteinValues=completeWeek.map(([,d])=>sum((d.log||[]).filter(e=>e?.type==='food').map(e=>number(e.p)||0)));
            const avgProtein=mean(proteinValues), targetProtein=number(targets.p), proteinHitDays=targetProtein?proteinValues.filter(v=>v>=targetProtein*.9).length:0;
            if(targetProtein && avgProtein<targetProtein*.9) {
                const answer=answerFor(input.state,'protein-barrier'); let tailored='Спробуй додати одне передбачуване джерело білка до першої половини дня — так менше шансів «доганяти» ввечері.';
                if(answer==='time')tailored='Обери 1–2 швидкі варіанти без готування або з мінімальною підготовкою й повторюй їх у робочі дні.';
                if(answer==='appetite')tailored='Розподіли білок на менші порції між 2–3 прийомами їжі замість великої порції наприкінці дня.';
                if(answer==='cost')tailored='Почни з доступніших джерел: яйця, кисломолочний сир, курятина або бобові.';
                add('protein-week',78,'Білок системно нижче цілі','За '+completeWeek.length+' підтверджених днів середнє — '+round(avgProtein)+' г при цілі '+round(targetProtein)+' г; ≥90% цілі було у '+proteinHitDays+'/'+completeWeek.length+' днів.',tailored,'tab-food');
            }
            const kcalValues=completeWeek.map(([,d])=>sum((d.log||[]).filter(e=>e?.type==='food').map(e=>number(e.kcal)||0))), avgKcal=mean(kcalValues);
            if(goal>0 && avgKcal!==null){const deviation=Math.round((avgKcal-goal)/goal*100);if(Math.abs(deviation)<=10)add('energy-stable',18,'Калорійність стабільна','За '+completeWeek.length+' підтверджених днів середнє — '+Math.round(avgKcal)+' ккал при орієнтирі '+Math.round(goal)+' ккал ('+(deviation>=0?'+':'')+deviation+'%).','Поточний ритм виглядає стабільно. Не змінюй калорії через один окремий день.','tab-journal');}
        }

        if (completeWeek.length>=3) {
            const threshold=Math.max(5,Math.min(40,Number(preferences.sweetsThreshold)||20))/100;
            const highSweetDays=completeWeek.filter(([,d])=>{
                const rows=(d.log||[]).filter(e=>e.type==='food');
                const total=sum(rows.map(e=>number(e.kcal)||0));
                const sweet=sum(rows.filter(e=>['dessert','sweet-drink'].includes(foodDetails(e,byId).group)).map(e=>number(e.kcal)||0));
                return total>0 && sweet/total>=threshold;
            }).length;
            if(highSweetDays>=3 && preferences.sweets!==false) add('sweets-pattern',86,'Солодке повторюється протягом тижня',`${highSweetDays} із ${completeWeek.length} підтверджених днів: десерти та солодкі напої становили щонайменше ${Math.round(threshold*100)}% внесених калорій.`, 'Обери одну повторювану порцію або напій і спробуй менший розмір протягом тижня. Порівняємо повні дні; за одним десертом висновків не робимо.','tab-journal');
        }
        // One weight per date and >=3 dates in EACH seven-day window.
        const uniqueWeights=new Map();
        weights.forEach(w=>{if(number(w.weight)>0 && dayNumber(w.date)<=todayN) uniqueWeights.set(w.date,Number(w.weight));});
        const windowValues=(lo,hi)=>[...uniqueWeights].filter(([d])=>dayNumber(d)>=todayN-lo && dayNumber(d)<=todayN-hi).map(([,w])=>w);
        const latest=windowValues(6,0),previous=windowValues(13,7);
        const delta=latest.length>=3&&previous.length>=3?mean(latest)-mean(previous):null;
        if (delta!==null) {
            if(profile.goal==='lose' && delta<-.9) add('fast-loss',100,'Швидке зниження середньої ваги',`Середні за два тижні: ${round(mean(previous))} → ${round(mean(latest))} кг (${round(delta)} кг).`, 'Не посилюй дефіцит. Перевір повноту харчування та умови зважування; якщо такий темп зберігається або є слабкість, обговори його з фахівцем.','tab-dashboard',CDC);
            else if(profile.goal==='lose' && delta>=-.1) add('weight-review',70,'Перевір тренд, перш ніж змінювати план',`Різниця двох тижневих середніх: ${round(delta)} кг; записів харчування за 14 минулих днів — ${history.length}.`, 'Двох тижнів недостатньо, щоб визначити причину. Перевір регулярність зважувань, порції та повноту журналу. Не зменшуй калорії автоматично.','tab-dashboard');
            else add('weight-trend',30,'Динаміка ваги',`Тижневі середні: ${round(mean(previous))} → ${round(mean(latest))} кг.`, 'Оцінюй наступні тижні за тих самих умов зважування. Ця зміна не показує окремо жир, м’язи та воду.','tab-dashboard');
        }
        const recentSessions=sessions.filter(s=>dayNumber(s.date)>=todayN-13&&dayNumber(s.date)<=todayN);
        const workoutDays=new Set(recentSessions.map(s=>s.date)).size;
        // Compare only the same exercise with the same set count and load pattern.
        const groups=new Map();
        recentSessions.forEach(s=>{if(!groups.has(s.exerciseId))groups.set(s.exerciseId,[]);groups.get(s.exerciseId).push(s);});
        for (const list of groups.values()) {
            const unique=new Map();
            [...list].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(s=>{if(!unique.has(s.date))unique.set(s.date,s);});
            const three=[...unique.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
            if(three.length<3 || dayNumber(three[0].date)-dayNumber(three[2].date)<7)continue;
            const sets=three.map(s=>s.metrics?.sets||[]);
            if(!sets[0].length || !sets.every(x=>x.length===sets[0].length))continue;
            const signature=x=>JSON.stringify(x.map(s=>[s.weightKg??0,s.addedWeightKg??0]));
            if(!sets.every(x=>signature(x)===signature(sets[0])))continue;
            const totals=sets.map(x=>sum(x.map(s=>number(s.reps)||0)));
            if(totals.some(n=>n<=0))continue;
            if(totals[0]<=totals[1] && totals[1]<=totals[2]) add('training-review',65,'Повтори не зростають у порівнюваних записах',`${three[0].exerciseName}: ${totals[2]} → ${totals[1]} → ${totals[0]} повторів за однакових записаних ваг і кількості підходів.`, 'Перевір відпочинок між підходами, сон і техніку. Даних про зусилля та біль немає, тому збільшення ваги автоматично не рекомендую.','tab-journal');
            else if(totals[0]>totals[2]) add('training-progress',25,'Більше повторів за тієї самої ваги',`${three[0].exerciseName}: ${totals[2]} → ${totals[0]} повторів у порівнюваних записах.`, 'Це позитивна зміна, якщо техніка й зусилля були порівнюваними. Різко підвищувати навантаження не потрібно.','tab-journal');
            if(insights.some(i=>i.id.startsWith('training-')))break;
        }
        const limitations=[`${dateLabel}: оцінено лише внесені записи, ${day.nutritionComplete?'повноту дня підтверджено':'повнота дня не підтверджена'}.`];
        if(items.some(f=>f.basis==='name'))limitations.push('Групи продуктів визначені за назвою, тому можливі помилки.');
        if(items.some(f=>f.basis==='unknown'))limitations.push('Частину продуктів і змішані страви не вдалося класифікувати.');
        if(knownFiber.length<items.length)limitations.push(`Клітковина відома для ${knownFiber.length}/${items.length} записів; дефіцит не визначаю.`);
        if(items.some(f=>number(f.freeSugarG)===null))limitations.push('Повної кількості вільних цукрів немає. Калорії десертів не є кількістю цукру.');
        if(delta===null)limitations.push('Для тренду ваги потрібно хоча б по 3 зважування в кожному з двох тижнів.');
        if(!insights.length)add('data',0,'Почнімо з даних','Поки немає достатньої основи для персональної поради.','Додай харчування з порціями та регулярні зважування.','tab-journal');
        const focus={sweets:['sweets','free-sugar'],nutrition:['fiber','produce','protein','energy','data'],weight:['fast-loss','weight-review','weight-trend'],training:['training-review','training-progress']};
        const allowed=id=>Object.entries(focus).every(([group,ids])=>!ids.includes(id)||preferences[group]!==false);
        insights.sort((a,b)=>b.priority-a.priority);
        const filtered=insights.filter(i=>allowed(i.id)).slice(0,[2,4,6].includes(Number(preferences.maxInsights))?Number(preferences.maxInsights):4);
        const quality=dataQuality(input,byId), positives=[];
        if(completeWeek.length>=3)positives.push({id:'logging',title:'Є база для аналізу',text:completeWeek.length+' підтверджених днів за останній тиждень.'});
        if(goal>0&&kcal>0&&Math.abs(kcal-goal)/goal<=.1)positives.push({id:'calories',title:'Калорійність близько до цілі',text:Math.round(kcal)+' із '+Math.round(goal)+' ккал сьогодні.'});
        if(number(targets.p)>0&&sum(foods.map(f=>number(f.p)||0))>=Number(targets.p)*.9)positives.push({id:'protein',title:'Білок близько до цілі',text:round(sum(foods.map(f=>number(f.p)||0)))+' г із '+round(targets.p)+' г.'});
        if(workoutDays>=2)positives.push({id:'training',title:'Тренування є в ритмі',text:workoutDays+' тренувальних днів за 14 днів.'});
        const result={insights:filtered,summary:dateLabel+': '+foods.length+' записів їжі. За 14 днів: '+workoutDays+' днів із тренуваннями.',limitations,metrics:{sweetKcal,share,fiber:knownFiber.length===items.length?fiber:null,freeSugar,produce,weightDelta:delta,workoutDays},dataQuality:quality,positives};
        result.question=questionFor(input,result);result.lastAnswerResponse=input.state?.lastAnswer?.response||null;return result;
    }
    return {analyze,classify,snapshot,dataQuality,questionFor,responseFor};
});
