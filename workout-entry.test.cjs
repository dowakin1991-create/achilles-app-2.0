const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../firebase-sync.js'), 'utf8');
function load(name, context) {
    const start = source.indexOf(`window.${name} = function`);
    const end = source.indexOf('\n        };', start) + 11;
    assert.ok(start >= 0 && end > start);
    vm.runInNewContext(source.slice(start, end), context);
}
function setup() {
    const fields = Object.fromEntries(['reps','weight'].map(id => [id, {
        value: '', focus() { this.focused = true; },
        setSelectionRange(a,b) { this.selection = [a,b]; }
    }]));
    const window = {
        getWorkoutById: () => ({name:'Жим', kind:'strength_weighted', factor:0.3}),
        evaluateStrengthPR: () => ({isPR:false}),
        logWorkoutEntry: (...args) => { window.saved = args; }
    };
    const context = {window, document:{getElementById: id => fields[id]}, alert: message => {throw Error(message);}};
    for (const name of ['workoutInputTemplate','insertSetSeparator','parseSetValues','logStrengthExercise']) load(name, context);
    return {window, fields};
}
test('both rendered separators target their respective fields', () => {
    const {window} = setup();
    const html = window.workoutInputTemplate({id:'press',kind:'strength_weighted'},0);
    const targets = [...html.matchAll(/onclick="insertSetSeparator\('([^']+)'\)"/g)].map(m=>m[1]);
    assert.deepEqual(targets,['wx-press-0-reps','wx-press-0-weight']);
});
test('decimal weights entered with separator retain their matching repetitions when saved', () => {
    const {window,fields} = setup();
    fields.reps.value='20'; window.insertSetSeparator('reps'); fields.reps.value+='17';
    fields.weight.value='12,5'; window.insertSetSeparator('weight'); fields.weight.value+='10';
    window.logStrengthExercise('press','reps','weight');
    assert.deepEqual(JSON.parse(JSON.stringify(window.saved[3].sets)),[{reps:20,weight:12.5},{reps:17,weight:10}]);
    assert.equal(window.saved[3].volume,420);
    assert.equal(fields.weight.value,'');
    assert.equal(fields.reps.value,'');
});
test('one weight still applies to every set and repeated separator taps do not create empty sets', () => {
    const {window,fields} = setup();
    fields.reps.value='20'; window.insertSetSeparator('reps'); window.insertSetSeparator('reps');
    assert.equal(fields.reps.value,'20;');
    fields.reps.value+='17'; fields.weight.value='6';
    window.logStrengthExercise('press','reps','weight');
    assert.deepEqual(JSON.parse(JSON.stringify(window.saved[3].sets)),[{reps:20,weight:6},{reps:17,weight:6}]);
});
test('clearing either search refreshes results through its input handler and restores focus', () => {
    const source = fs.readFileSync(path.join(__dirname, '../system-ui.js'),'utf8');
    for (const id of ['food-search','workout-search']) {
        let refreshed = false, focused = false;
        const input = {value:'Жим',dispatchEvent(event){assert.equal(event.type,'input'); assert.equal(this.value,''); refreshed=true;},focus(){focused=true;}};
        const window = {};
        vm.runInNewContext(source.slice(source.indexOf('window.clearSearchField =')), {window, Event, document:{getElementById:key=>key===id?input:null}});
        window.clearSearchField(id);
        assert.ok(refreshed && focused);
    }
});

test('journal opens history for current and legacy exercises while keeping food and deletion separate', () => {
    const fields = Object.fromEntries(['food-list','workout-list','journal-count'].map(id => [id, {}]));
    const exercise = {id:'press',name:'Жим'};
    const opened = [];
    const window = {
        Achilles:{training:{model:{byId:id=>id==='press'?exercise:null,byName:name=>name==='Жим'?exercise:null}}},
        dailyLog:[
            {type:'food',html:'Їжа'},
            {type:'workout',exerciseId:'press',html:'Жим сьогодні'},
            {type:'workout',exercise:'Жим',html:'Старий запис'},
            {type:'workout',exercise:'Apple Watch',html:'Годинник'}
        ],
        openExerciseHistory:id=>opened.push(id)
    };
    const context = {window,document:{getElementById:id=>fields[id]}};
    for (const name of ['journalExercise','openJournalExerciseHistory','renderDiary']) load(name,context);
    window.renderDiary();
    assert.doesNotMatch(fields['food-list'].innerHTML,/openJournalExerciseHistory/);
    const targets = [...fields['workout-list'].innerHTML.matchAll(/onclick="openJournalExerciseHistory\((\d+)\)"/g)].map(m=>Number(m[1]));
    assert.deepEqual(targets,[1,2]);
    targets.forEach(index=>window.openJournalExerciseHistory(index));
    window.openJournalExerciseHistory(0);
    window.openJournalExerciseHistory(99);
    assert.deepEqual(opened,['press','press']);
    assert.equal((fields['workout-list'].innerHTML.match(/data-log-index=/g)||[]).length,3);
    assert.equal(window.dailyLog.length,4);
});

test('repeating from the journal reveals the exercise and fills matching sets after navigation refresh', () => {
    const runtime = fs.readFileSync(path.join(__dirname,'../app-runtime.js'),'utf8');
    const start = runtime.indexOf('    function prepareExerciseEntry(');
    const end = runtime.indexOf('    root.applyExerciseProgression',start);
    const search = {value:'Інша вправа'};
    const tasks = [];
    let active = 'tab-journal', filter = 'fav', payload;
    const root = {setWorkoutFilter:value=>{filter=value;}};
    const A = {
        router:{go(tab){active=tab; tasks.push(()=>{payload=null;});}},
        training:{model:{byId:()=>({name:'Жим'})},history:{last:()=>({metrics:{sets:[{reps:12,weightKg:20},{reps:10,weightKg:15}]}})}},
        toast(){}
    };
    vm.runInNewContext(runtime.slice(start,end),{
        root,A,document:{getElementById:()=>search},setTimeout:fn=>tasks.push(fn),
        sessionSets:entry=>entry.metrics.sets,
        fillCard(id,data){assert.equal(active,'tab-workout');assert.equal(filter,'all');assert.equal(search.value,'Жим');payload=data;return true;}
    });
    root.repeatLastExercise('press');
    tasks.forEach(fn=>fn());
    assert.deepEqual(payload.sets,[{reps:12,weightKg:20},{reps:10,weightKg:15}]);
});

test('journal history index includes older exercises once and clicking a row opens the right history', () => {
    const runtime = fs.readFileSync(path.join(__dirname,'../app-runtime.js'),'utf8');
    const start = runtime.indexOf('    function renderExerciseHistoryIndex()');
    const end = runtime.indexOf('    /* -------------------- Analytics V2',start);
    let section;
    const opened=[];
    const root={openExerciseHistory:id=>opened.push(id)};
    const journal={appendChild:node=>{section=node;}};
    const document={getElementById:id=>id==='tab-journal'?journal:section,createElement:()=>({
        querySelectorAll(){
            this.buttons=[...this.innerHTML.matchAll(/data-exercise-id="([^"]+)"/g)].map(m=>({dataset:{exerciseId:m[1]},addEventListener(event,fn){this.click=fn;}}));
            return this.buttons;
        }
    })};
    const sessions=[{exerciseId:'press',exerciseName:'Жим',date:'2026-09-15'}, {exerciseId:'curl',exerciseName:'Згинання',date:'2026-08-01'}, {exerciseId:'press',exerciseName:'Жим',date:'2026-07-01'}];
    const A={training:{history:{all:()=>sessions,format:()=>''},model:{byId:id=>({id})}}};
    vm.runInNewContext(runtime.slice(start,end),{root,A,document,esc:String,fmtDate:String});
    root.renderExerciseHistoryIndex();
    assert.equal(section.hidden,false);
    assert.equal(section.buttons.length,2);
    section.buttons.forEach(button=>button.click());
    assert.deepEqual(opened,['press','curl']);
    sessions.length=0;
    root.renderExerciseHistoryIndex();
    assert.equal(section.hidden,true);
});
