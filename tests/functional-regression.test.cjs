const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/dom.cjs');
const profile={name:'AUDIT',password:'synthetic',gender:'male',age:28,height:170,weight:77,activityWork:1.725,activityRest:1.2,workDays:2,restDays:2,goal:'lose',diet:'standard',updatedAt:100};
const seed={achilles_user:'AUDIT',achilles_profile:profile,achilles_base_kcal:'2000',achilles_macros:{p:154,f:77,c:173}};
async function setup(t,extra={},transport){const env=await boot({...seed,...extra},transport);t.after(()=>env.dom.window.close());assert.deepEqual(env.errors,[]);return env;}
const plain=x=>JSON.parse(JSON.stringify(x));
test('real HTML load order retains 500 market products and all local script references load',async t=>{
    const {w}=await setup(t);assert.equal(w.foodDB.length,1500);
    const market=w.foodDB.filter(x=>x.source==='ua-market');assert.equal(market.length,500);
    assert.equal(market.filter(x=>x.store==='silpo').length,253);assert.equal(market.filter(x=>x.store==='auchan').length,247);
});
test('food addition scales nutrients, preserves fiber, rejects negative/zero input and deletes durably',async t=>{
    const{w}=await setup(t),d=w.document;
    const food={id:'test',name:'Тест',kcal:100,p:10,f:4,c:6,fiber:3};
    const add=weight=>{d.getElementById('food-results').innerHTML=w.generateFoodCardHtml(food,'test');const host=d.getElementById('food-results');host.querySelector('input').value=weight;host.querySelector('.add-btn').click();};
    add('200');assert.equal(w.consumedCalories,200);assert.equal(w.dailyLog.length,1);assert.equal(w.dailyLog[0].nutritionQuality.fiberG,6);
    add('-50');add('0');assert.equal(w.dailyLog.length,1);
    const id=w.dailyLog[0].id;w.deleteLogEntryByIndex(0,null,true);assert.equal(w.consumedCalories,0);
    const day=JSON.parse(w.localStorage.getItem('achilles_all_days'))[w.currentViewDate];assert.ok(day.deletedEntries[id]);assert.equal(day.log.length,0);
    w.changeDate(-1);w.changeDate(1);assert.ok(w.Achilles.storage.getDay(w.currentViewDate).deletedEntries[id]);
});
test('custom products distinguish unknown fiber, explicit zero and positive fiber',async t=>{
    const{w}=await setup(t),d=w.document;
    for(const [name,fiber]of [['Невідомо',''],['Нуль','0'],['Вівсянка','10']]){
        for(const[id,value]of Object.entries({'cf-name':name,'cf-kcal':'370','cf-p':'13','cf-f':'7','cf-c':'62','cf-fiber':fiber}))d.getElementById(id).value=value;
        w.saveCustomFood();
    }
    const items=w.Achilles.nutritionRepo.custom();
    for(const[name,value]of [['Невідомо',null],['Нуль',0],['Вівсянка',10]])assert.equal(items.find(x=>x.name.includes(name)).fiber,value);
    assert.equal(w.Achilles.nutritionRepo.normalize({name:'Старий',source:'custom',fiber:0}).fiber,null);
});
test('fractional weight is valid and invalid profile values are rejected before registration',async t=>{
    const{w}=await setup(t),d=w.document;
    const fields={'reg-name':'AUDIT','reg-password':'synthetic','reg-gender':'male','reg-age':'28','reg-height':'170','reg-weight':'77.5','reg-work-days':'0','reg-rest-days':'7','reg-activity-work':'1.725','reg-activity-rest':'1.2','reg-goal':'lose','reg-app-mode':'pro','reg-diet':'standard'};
    for(const[id,v]of Object.entries(fields))d.getElementById(id).value=v;
    assert.equal(d.getElementById('reg-weight').validity.stepMismatch,false);assert.equal(w.validateProfileFields('reg'),true);
    d.getElementById('reg-age').value='-28';assert.equal(w.validateProfileFields('reg'),false);
    const old=w.localStorage.getItem('achilles_profile');await w.completeRegistration();assert.equal(w.localStorage.getItem('achilles_profile'),old);
    d.getElementById('reg-age').value='28';d.getElementById('reg-rest-days').value='0';assert.equal(w.validateProfileFields('reg'),false);
});
test('zero workdays are honored when calculating and displaying profile schedule',async t=>{
    const{w}=await setup(t,{achilles_profile:{...profile,workDays:0,restDays:7}});
    assert.equal(w.document.getElementById('edit-work-days').value,'0');
    assert.equal(Number(w.localStorage.getItem('achilles_base_kcal')),1630);
});
test('avatar nutrition uses confirmed signatures and counts training days once',async t=>{
    const{w}=await setup(t);const C=w.AchillesCoachCycle,state=C.empty(),days={};
    for(let i=1;i<=7;i++){const date=`2026-09-0${i}`;days[date]={log:[{id:i,type:'food',kcal:100,p:10}]};state.completions[date]={signature:C.signature(days[date].log),updatedAt:100};}
    w.localStorage.setItem('achilles_all_days',JSON.stringify(days));w.localStorage.setItem('achilles_coach_workflow:AUDIT',JSON.stringify(state));
    assert.equal(w.Achilles.avatars.evaluate({sync:false}).metrics.nutritionDays,7);assert.equal(w.Achilles.avatars.select(15),false);
    days['2026-09-01'].log.push({id:'extra',type:'food',kcal:100});w.localStorage.setItem('achilles_all_days',JSON.stringify(days));assert.equal(w.Achilles.avatars.evaluate({sync:false}).metrics.nutritionDays,6);
    const ex=w.workoutDB[0];days['2026-09-01'].log=Array.from({length:4},(_,i)=>({id:i,type:'workout',exercise:ex.name,exerciseId:ex.id,sets:[{reps:10}]}));w.localStorage.setItem('achilles_all_days',JSON.stringify(days));
    assert.equal(w.Achilles.avatars.evaluate({sync:false}).metrics.trainingSessions,1);
});
test('logout archives pending work and activation isolates and restores accounts',async t=>{
    const{w}=await setup(t);w.localStorage.setItem('achilles_all_days','{"2026-09-01":{"log":[]}}');w.localStorage.setItem('achilles_sync_queue_v1','[{"id":"pending"}]');
    w.logout();assert.equal(w.localStorage.getItem('achilles_user'),null);
    assert.equal(w.AchillesLocalAccounts.read('AUDIT').achilles_sync_queue_v1,'[{"id":"pending"}]');
    w.AchillesLocalAccounts.activate('OTHER');assert.equal(w.localStorage.getItem('achilles_all_days'),null);
    w.AchillesLocalAccounts.activate('AUDIT');assert.ok(w.localStorage.getItem('achilles_all_days').includes('2026-09-01'));assert.ok(w.Achilles.syncQueue.read().length);
});
test('midnight rollover preserves yesterday and keeps deliberate historical views',async t=>{
    const{w}=await setup(t);const NativeDate=w.Date;const old=w.todayDate;const tomorrow=new NativeDate(old+'T12:00:00').getTime()+86400000;
    w.dailyLog=[{id:'before',type:'food',kcal:100,p:1,f:1,c:1}];w.consumedCalories=100;w.saveDailyData();
    w.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[tomorrow]));}static now(){return tomorrow;}};
    w.dispatchEvent(new w.Event('focus'));assert.notEqual(w.todayDate,old);assert.equal(w.currentViewDate,w.todayDate);assert.equal(w.dailyLog.length,0);assert.equal(w.Achilles.storage.getDay(old).log.length,1);
    w.changeDate(-1);const historical=w.currentViewDate;w.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[tomorrow+86400000]));}static now(){return tomorrow+86400000;}};
    w.refreshToday();assert.equal(w.currentViewDate,historical);
});
test('journal tabs and calculated dish survive save and reload',async t=>{
    const{w}=await setup(t),d=w.document;
    for(const[id,v]of Object.entries({'dish-name':'Страва','dish-kcal':'450','dish-p':'30','dish-f':'10','dish-c':'60'}))d.getElementById(id).value=v;
    w.saveCalculatedDish();assert.equal(w.consumedCalories,450);
    d.querySelector('[data-journal-mode-target="workout"]').click();assert.equal(d.getElementById('journal-food-panel').hidden,true);
    d.querySelector('[data-journal-mode-target="food"]').click();assert.equal(d.getElementById('journal-workout-panel').hidden,true);
    const saved=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));const next=await boot(saved);t.after(()=>next.dom.window.close());assert.equal(next.w.consumedCalories,450);assert.equal(next.w.dailyLog.length,1);
});
test('queue retains an edit made while an earlier snapshot is uploading',async t=>{
    const{w}=await setup(t),queue=w.Achilles.syncQueue;let resolve;
    queue.transport=()=>new Promise(r=>{resolve=r;});await queue.enqueue('first');clearTimeout(queue.timer);
    const flushing=queue.flush();await queue.enqueue('second');clearTimeout(queue.timer);resolve(true);await flushing;
    assert.equal(queue.read().length,1);assert.equal(queue.read()[0].reason,'second');clearTimeout(queue.timer);
});
test('actual cloud reads preserve newer local profile and union independent day entries',async t=>{
    let cloud={profile:{...profile,weight:77,updatedAt:100},allDaysData:{'2026-09-29':{log:[{id:'remote',type:'food',kcal:100}],updatedAt:100}},favWorkouts:['A']};
    const transport={db:{},doc:(_db,...parts)=>parts.join('/'),getDoc:async ref=>({exists:()=>!ref.includes('backups'),data:()=>cloud}),onSnapshot:()=>()=>{},setDoc:async()=>{},runTransaction:async()=>{}};
    const{w}=await setup(t,{},transport);
    w.localStorage.setItem('achilles_profile',JSON.stringify({...profile,weight:75,updatedAt:200}));w.localStorage.setItem('achilles_all_days',JSON.stringify({'2026-09-29':{log:[{id:'local',type:'food',kcal:200}],updatedAt:200}}));w.localStorage.setItem('achilles_fav_workouts','["B"]');
    await w.loadFromCloud('AUDIT');assert.equal(w.Achilles.storage.profile().weight,75);assert.equal(w.Achilles.storage.getDay('2026-09-29').log.length,2);
    assert.deepEqual(JSON.parse(w.localStorage.getItem('achilles_fav_workouts')),['A','B']);
});
test('actual cloud upload uses a transaction and does not overwrite remote-only entries',async t=>{
    let writes=[],cloud={profile,allDaysData:{'2026-09-29':{log:[{id:'remote',type:'food',kcal:100}]}}};
    const transport={db:{},doc:(_db,...parts)=>parts.join('/'),getDoc:async()=>({exists:()=>false}),onSnapshot:()=>()=>{},setDoc:async()=>{throw Error('Non-atomic write');},runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>!ref.includes('backups'),data:()=>cloud}),set:(ref,data)=>writes.push({ref,data})})};
    const{w}=await setup(t,{},transport);
    w.localStorage.setItem('achilles_all_days',JSON.stringify({'2026-09-29':{log:[{id:'local',type:'food',kcal:200}]}}));await w.Achilles.syncQueue.transport();
    const result=writes.find(x=>x.ref==='users/AUDIT').data;assert.equal(result.allDaysData['2026-09-29'].log.length,2);assert.equal(result.allDaysData['2026-09-29'].consumedCalories,300);
});

test('cloud refresh preserves the selected historical day and saves dinner to that day',async t=>{
    const{w}=await setup(t);w.changeDate(-1);const yesterday=w.currentViewDate;
    w.loadFromCloud=async()=>true;w.syncToCloud=async()=>true;
    await w.refreshFromCloud(true);
    assert.equal(w.currentViewDate,yesterday);
    for(const[id,value]of Object.entries({'dish-name':'Вечеря вчора','dish-kcal':'520','dish-p':'35','dish-f':'20','dish-c':'50'}))w.document.getElementById(id).value=value;
    w.openCalculatedDish();w.saveCalculatedDish();w.loadDailyData();
    assert.equal(w.currentViewDate,yesterday);
    assert.ok(w.Achilles.storage.getDay(yesterday).log.some(e=>e.html?.includes('Вечеря вчора')));
    assert.equal(w.Achilles.storage.getDay(w.todayDate).log.length,0);
});
