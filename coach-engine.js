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
    function analyze(input) {
        const {today,days={},profile={},targets={},weights=[],sessions=[],catalog=[]}=input;
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
            add('sweets',sweetKcal>=goal*.2 && goal>0?85:35,'Солодке в раціоні',
                `${dateLabel}: ${sweets.map(f=>`${f.name}: ${Math.round(f.kcal)} ккал`).join('; ')}. Разом ${Math.round(sweetKcal)} ккал — ${share}% внесеного раціону.`,
                sweetKcal>=goal*.2 && goal>0 ? 'Це помітна частка калорій. Якщо десерт витісняє основну їжу, зменш його порцію або заміни солодкий напій водою. Не компенсуй його голодуванням чи додатковим тренуванням.' : 'Сам факт десерту не означає зрив. Враховуй порцію в загальному раціоні; залишай місце для звичайної їжі.');
        }
        if (freeSugar>0 && goal>0 && freeSugar*4>=goal*.1) {
            add('free-sugar',90,'Вільні цукри',`У відомих даних щонайменше ${round(freeSugar)} г вільних цукрів. Орієнтир 10% від цілі ${Math.round(goal)} ккал — ${round(goal*.1/4)} г.`, 'Переглянь порції солодких напоїв, меду, сиропів і десертів. Загальні вуглеводи або всі цукри продукту не дорівнюють вільним цукрам.','tab-food',WHO);
        }
        if (foods.length) {
            if (knownFiber.length===items.length && fiber<25) add('fiber',50,'Клітковина',`У внесених продуктах ${round(fiber)} г клітковини. Загальний орієнтир для дорослих — від 25 г на день.`, `${day.nutritionComplete?'День підтверджено. На наступний день заплануй':'Якщо це весь раціон дня, додай'} бобові, цільнозернові продукти або овочі відповідно до переносимості. Збільшуй клітковину поступово.`,'tab-food',WHO);
            if (produce<400) add('produce',40,'Овочі та цілі фрукти',`За назвами розпізнано приблизно ${Math.round(produce)} г овочів і цілих фруктів; склад змішаних страв невідомий.`, 'Якщо вони ще не враховані в інших стравах, додай їх до основного прийому їжі. Загальний орієнтир — від 400 г на день; сік не зараховується тут як цілий фрукт.','tab-food',WHO);
            const protein=sum(foods.map(f=>number(f.p)||0));
            if (number(targets.p)>0 && protein<targets.p*.9) add('protein',55,'Білок у записах',`Внесено ${round(protein)} г із заданої в профілі цілі ${round(targets.p)} г.`, day.nutritionComplete?'У підтвердженому дні білок нижчий за задану ціль. Плануючи наступний день, включи джерело білка в основний прийом їжі.':'Якщо плануєш ще прийом їжі, включи джерело білка: яйця, рибу, кисломолочний продукт або бобові. Неповний журнал не доводить нестачу білка.');
            if (goal>0 && kcal>goal*1.1) add('energy',80,'Калорії понад поточну ціль',`Внесено ${Math.round(kcal)} ккал за цілі ${Math.round(goal)} ккал.`, 'Перевір порції та дублікати записів. Один день не визначає прогрес; повернись до звичного плану без покарання голодом.');
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
        insights.sort((a,b)=>b.priority-a.priority);
        return {insights:insights.slice(0,4),summary:`${dateLabel}: ${foods.length} записів їжі. За 14 днів: ${workoutDays} днів із тренуваннями.`,limitations,metrics:{sweetKcal,share,fiber:knownFiber.length===items.length?fiber:null,freeSugar,produce,weightDelta:delta,workoutDays}};
    }
    return {analyze,classify,snapshot};
});
