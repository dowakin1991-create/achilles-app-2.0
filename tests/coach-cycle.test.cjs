const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../coach-cycle.js'),E=require('../coach-engine.js');
const food=(kcal=300)=>({id:'meal',type:'food',foodName:'Торт',weightG:100,kcal,p:10,f:10,c:40});
const input=()=>({today:'2026-09-16',days:{},state:C.empty(),catalog:[],baseKcal:2000,targets:{p:100},profile:{age:28,goal:'lose'}});
function full(i,date,kcal=300){i.days[date]={log:[food(kcal)]};i.state.completions[date]={signature:C.signature(i.days[date].log),updatedAt:1};}
test('completion survives serialization, but food edits invalidate it and workouts do not',()=>{
    const i=input();full(i,i.today);
    const state=JSON.parse(JSON.stringify(i.state));
    assert.ok(C.isComplete(i.today,i.days[i.today],state.completions));
    i.days[i.today].log.push({type:'workout',id:'work'});
    assert.ok(C.isComplete(i.today,i.days[i.today],state.completions));
    i.days[i.today].log[0].weightG=150;
    assert.equal(C.isComplete(i.today,i.days[i.today],state.completions),false);
    assert.equal(C.isComplete(i.today,{log:[]},state.completions),false);
});
test('2/2 cycle honors the anchor and first rest day across month boundaries',()=>{
    const config=C.validateConfig({mode:'cycle',anchor:'2026-09-28',workDays:2,restDays:2,offMode:'first',minutes:30},'2026-09-28');
    assert.deepEqual(C.schedule(config,'2026-09-27','2026-10-08'),['2026-09-30','2026-10-04','2026-10-08']);
    assert.equal(C.scheduled(config,'2026-09-27'),false);
    assert.throws(()=>C.validateConfig({...config,anchor:'2026-02-31'},'2026-09-16'));
    assert.throws(()=>C.validateConfig({...config,workDays:0},'2026-09-16'));
});
test('weekly plan accepts selected weekdays and none does not invent a target',()=>{
    const config=C.validateConfig({mode:'weekly',weekdays:[1,4],minutes:25},'2026-09-16');
    assert.deepEqual(C.schedule(config,'2026-09-16','2026-09-23'),['2026-09-17','2026-09-21']);
    assert.deepEqual(C.schedule({mode:'none'},'2026-09-16','2026-09-23'),[]);
    assert.throws(()=>C.validateConfig({mode:'weekly',weekdays:[],minutes:30},'2026-09-16'));
});
test('merge preserves newer local settings, tombstones and independent remote checkins',()=>{
    const a=C.empty(),b=C.empty();a.config={mode:'none',updatedAt:20};b.config={mode:'weekly',updatedAt:10};
    a.completions['2026-09-16']={signature:null,updatedAt:20};b.completions['2026-09-16']={signature:'old',updatedAt:10};
    a.feedback['step1:2026-09-16']={value:'done',updatedAt:20};b.feedback['step1:2026-09-15']={value:'hard',updatedAt:10};
    const merged=C.merge(a,b);assert.equal(merged.config.mode,'none');assert.equal(merged.completions['2026-09-16'].signature,null);assert.equal(Object.keys(merged.feedback).length,2);
    assert.deepEqual(C.merge(a,b),C.merge(b,a));
});
test('offline concurrent acceptance results in one active step and preserves the older record',()=>{
    const a=C.empty(),b=C.empty();
    a.actions.a={id:'a',status:'active',updatedAt:10,startDate:'2026-09-16'};
    b.actions.b={id:'b',status:'active',updatedAt:20,startDate:'2026-09-16'};
    const result=C.merge(a,b);
    assert.equal(C.active(result).id,'b');assert.equal(result.actions.a.status,'superseded');
    assert.equal(a.actions.a.status,'active');
    assert.deepEqual(C.merge(a,b),C.merge(b,a));
});
test('first priority requests full days, accepted step does not get replaced by changing daily advice',()=>{
    const i=input();const p=C.proposal(i,E.analyze(i),E);assert.equal(p.kind,'data');
    i.state.actions.a={...p,id:'a',status:'active',updatedAt:1,startDate:i.today};
    i.days[i.today]={log:[food(1000)]};
    assert.equal(C.proposal(i,E.analyze(i),E),null);
    assert.equal(C.active(JSON.parse(JSON.stringify(i.state))).kind,'data');
});
test('recently rejected recommendation is not repeated the next day',()=>{
    const i=input();i.state.actions.a={kind:'data',status:'skipped',startDate:'2026-09-15',closedDate:'2026-09-15'};
    assert.equal(C.proposal(i,E.analyze(i),E),null);
});
test('review becomes ready after seven calendar days and never calls missing data a success',()=>{
    const i=input();const a={id:'a',startDate:'2026-09-10',metric:'sweets',baseline:{completeDays:0,sweets:null}};
    assert.equal(C.review(a,i,E).ready,false);
    i.today='2026-09-17';const result=C.review(a,i,E);assert.equal(result.ready,true);assert.match(result.text,/недостатньо/);
});
test('review compares confirmed days only, keeping skipped days distinct from zero intake',()=>{
    const i=input();i.today='2026-09-23';for(const d of ['2026-09-16','2026-09-18','2026-09-20'])full(i,d,200);
    i.days['2026-09-17']={log:[food(2000)]}; // incomplete day cannot distort comparison
    const a={id:'a',startDate:'2026-09-16',metric:'sweets',baseline:{completeDays:3,sweets:300}};
    assert.match(C.review(a,i,E).text,/300 → 200/);
    assert.match(C.review(a,i,E).text,/не доказ/);
    i.days['2026-09-20'].log[0].kcal=100; // editing invalidates completeness
    assert.match(C.review(a,i,E).text,/недостатньо/);
});
test('checkins represent unique dates, and cycle review uses the accepted schedule snapshot',()=>{
    const i=input();i.today='2026-09-23';i.days['2026-09-18']={log:[{type:'workout'},{type:'workout'}]};
    const config=C.validateConfig({mode:'cycle',anchor:'2026-09-16',workDays:2,restDays:2,offMode:'first',minutes:30},'2026-09-16');
    const a={id:'a',startDate:'2026-09-16',metric:'workoutDays',configSnapshot:config};
    assert.match(C.review(a,i,E).text,/1 тренувальних днів/);assert.match(C.review(a,i,E).text,/було 2/);
});
