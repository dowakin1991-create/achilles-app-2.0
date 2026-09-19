const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const engine=require('../coach-engine.js');
const today='2026-09-15';
const food=(name,kcal,extra={})=>({type:'food',foodName:name,kcal,p:20,weightG:100,...extra});
const run=(log=[],extra={})=>engine.analyze({today,selectedDate:today,days:{[today]:{log}},profile:{age:28,goal:'lose'},targets:{p:100},baseKcal:2000,...extra});
const insight=(result,id)=>result.insights.find(i=>i.id===id);
test('dessert calories are reported by portion without calling a day within target a failure',()=>{
    const result=run([food('Торт',500),food('Куряче філе',1300)]);
    assert.equal(result.metrics.sweetKcal,500);
    assert.equal(result.metrics.share,28);
    assert.ok(insight(result,'sweets'));
    assert.equal(insight(result,'energy'),undefined);
    assert.equal(insight(result,'free-sugar'),undefined);
});
test('fruit, milk, mixed meals and sugar-free cola are not indiscriminately labeled sweets',()=>{
    for(const name of ['Банан','Яблуко (свіже)','Молоко','Йогурт з полуницею','Вівсянка з шоколадом','Кола zero','Кола без цукру']) {
        assert.equal(run([food(name,500)]).metrics.sweetKcal,0,name);
    }
    assert.equal(engine.classify({name:'Банан'}).group,'fruit');
    assert.equal(engine.classify({name:'Йогурт з полуницею'}).group,'unknown');
    assert.equal(engine.classify({name:'Сік яблучний'}).group,'sweet-drink');
});
test('unknown nutrients are not zero and total sugar is never treated as free sugar',()=>{
    const snapshot=engine.snapshot({name:'Йогурт',sugarG:60},200);
    assert.equal(snapshot.fiberG,null);
    assert.equal(snapshot.freeSugarG,null);
    assert.equal(snapshot.sugarG,120);
    const result=run([food('Йогурт',500,{nutritionQuality:snapshot})]);
    assert.equal(result.metrics.fiber,null);
    assert.equal(insight(result,'fiber'),undefined);
    assert.equal(insight(result,'free-sugar'),undefined);
    assert.ok(result.limitations.some(s=>s.includes('вільних цукрів')));
});
test('known portion nutrients scale correctly and retain their saved values after catalog changes',()=>{
    const snapshot=engine.snapshot({name:'Сироп',fiber:0,freeSugarG:60},100);
    const result=run([food('Сироп',250,{foodId:'syrup',nutritionQuality:snapshot})],{catalog:[{id:'syrup',name:'Сироп',freeSugarG:0}]});
    assert.equal(result.metrics.freeSugar,60);
    assert.match(insight(result,'free-sugar').evidence,/щонайменше 60/);
    assert.equal(engine.snapshot({name:'Бобові',fiber:8},150).fiberG,12);
});
test('partial day does not trigger a calorie deficit claim or automatically change targets',()=>{
    const result=run([food('Яйце',100)]);
    assert.equal(insight(result,'energy'),undefined);
    assert.ok(result.limitations.some(s=>s.includes('повнота дня не підтверджена')));
    assert.equal(result.metrics.weightDelta,null);
});
test('selected historical day is analyzed instead of mixing it with today',()=>{
    const result=run([],{selectedDate:'2026-09-14',days:{'2026-09-14':{log:[food('Торт',500)]},[today]:{log:[food('Яйце',100)]}}});
    assert.equal(result.metrics.sweetKcal,500);
    assert.match(result.summary,/2026-09-14/);
});
test('weight trend needs three distinct dates in both weeks and ignores future weights',()=>{
    const weights=[{date:'2026-09-02',weight:80},{date:'2026-09-04',weight:80},{date:'2026-09-07',weight:80},
        {date:'2026-09-10',weight:79.5},{date:'2026-09-12',weight:79.5},{date:'2026-09-15',weight:79.5},{date:'2026-09-16',weight:1}];
    assert.equal(run([],{weights}).metrics.weightDelta,-.5);
    const duplicate=Array(5).fill({date:'2026-09-15',weight:70});
    assert.equal(run([],{weights:weights.slice(0,3).concat(duplicate)}).metrics.weightDelta,null);
    assert.ok(insight(run([],{weights:weights.map(w=>({...w,weight:w.date>='2026-09-10'?78:w.weight}))}),'fast-loss'));
});
const session=(date,reps=10,weightKg=12)=>({date,exerciseId:'curl',exerciseName:'Згинання',createdAt:Date.parse(date),metrics:{sets:[{reps,weightKg}]}});
test('several exercises on one date count as one active day',()=>{
    assert.equal(run([],{sessions:[session(today),session(today),session('2026-09-12')]}).metrics.workoutDays,2);
});
test('training comparison requires matching weights and enough elapsed days',()=>{
    const sessions=[session('2026-09-15'),session('2026-09-10'),session('2026-09-03')];
    assert.ok(insight(run([],{sessions}),'training-review'));
    sessions[0]=session('2026-09-15',10,15);
    assert.equal(insight(run([],{sessions}),'training-review'),undefined);
    assert.equal(insight(run([],{sessions:[session('2026-09-15'),session('2026-09-14'),session('2026-09-13')]}),'training-review'),undefined);
});
test('analysis does not mutate logs or snapshots',()=>{
    const input={today,days:{[today]:{log:[food('Торт',300)]}},weights:[],sessions:[],catalog:[]};
    const before=JSON.stringify(input);
    engine.analyze(input);
    assert.equal(JSON.stringify(input),before);
});
test('progression retains different weights and cannot jump every set to the maximum plus 2.5kg',()=>{
    const runtime=fs.readFileSync(path.join(__dirname,'../app-runtime.js'),'utf8');
    const start=runtime.indexOf('    function detailedSuggestion('),end=runtime.indexOf('\n    }',start)+6;
    const sets=[{reps:12,weightKg:20},{reps:12,weightKg:12}];
    const A={training:{types:{STRENGTH_WEIGHTED:'weighted'},model:{byId:()=>({type:'weighted'})},history:{last:()=>({})}}};
    const context={A,sessionSets:()=>sets};
    vm.runInNewContext(runtime.slice(start,end),context);
    const next=vm.runInNewContext("detailedSuggestion('curl')",context);
    assert.deepEqual(Array.from(next.nextSets,s=>s.weightKg),[20,12]);
    assert.deepEqual(sets,[{reps:12,weightKg:20},{reps:12,weightKg:12}]);
});
test('coach preferences filter disabled topics and use the configured sweets threshold',()=>{
    const log=[food('Торт',350),food('Куряче філе',1000)];
    const strict=run(log,{state:{preferences:{sweetsThreshold:20,maxInsights:6}}});
    assert.ok(insight(strict,'sweets'));
    const hidden=run(log,{state:{preferences:{sweets:false,nutrition:false,weight:false,training:false,maxInsights:2}}});
    assert.equal(insight(hidden,'sweets'),undefined);
    assert.equal(insight(hidden,'protein'),undefined);
    const relaxed=run(log,{state:{preferences:{sweetsThreshold:35,maxInsights:6}}});
    assert.match(insight(relaxed,'sweets').advice,/Сам факт десерту/);
});


test('Coach questions include practical multi-select logging barriers and expanded responses',()=>{
    const input={today,selectedDate:today,days:{
        '2026-09-14':{log:[food('Яйце',200)]},
        '2026-09-15':{log:[food('Йогурт',200)]}
    },profile:{age:28},targets:{p:100},baseKcal:2000,state:{answers:{}},weights:[],sessions:[],catalog:[]};
    const result=engine.analyze(input);
    assert.equal(result.question?.id,'logging-barrier');
    assert.equal(result.question?.type,'multi');
    const response=engine.responseFor('logging-barrier',['time','database']);
    assert.match(response,/кілька секунд/);
    assert.match(response,/локальна UA-база/);
});
test('Coach insights expose interpretation and confidence instead of bare advice',()=>{
    const result=run([food('Яйце',100)]);
    assert.ok(result.insights.length);
    assert.ok(result.insights[0].interpretation);
    assert.ok(result.insights[0].confidence?.level);
    assert.ok(result.insights[0].confidence?.reason);
});
