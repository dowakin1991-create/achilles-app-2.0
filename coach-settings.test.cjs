const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const key = 'achilles_coach_enabled';
function boot(storage = new Map()) {
    const events = [], listeners = {}, attributes = {}, toggle = {}, status = {};
    const window = {addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:event=>events.push(event)};
    const document = {
        documentElement:{setAttribute:(name,value)=>attributes[name]=value},
        getElementById:id=>id==='coach-enabled-toggle'?toggle:status,
        addEventListener:(name,fn)=>listeners[name]=fn
    };
    const localStorage = {getItem:name=>storage.get(name)??null,setItem:(name,value)=>storage.set(name,value)};
    vm.runInNewContext(read('coach-settings.js'),{window,document,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
    return {window,document,localStorage,storage,events,listeners,attributes,toggle,status};
}
test('coach toggles immediately, survives reload and does not change saved training or nutrition', () => {
    const data = new Map([['achilles_all_days','saved workouts'],['achilles_profile','saved profile']]);
    const state = boot(data);
    assert.equal(state.window.Achilles.coach.isEnabled(),true);
    assert.equal(state.window.Achilles.coach.setEnabled(false),true);
    assert.equal(state.attributes['data-coach-enabled'],'false');
    assert.equal(state.toggle.checked,false);
    assert.equal(state.events[0].detail.enabled,false);
    const next = boot(data);
    assert.equal(next.attributes['data-coach-enabled'],'false');
    next.listeners.DOMContentLoaded();
    assert.equal(next.toggle.checked,false);
    next.window.Achilles.coach.setEnabled(true);
    assert.equal(next.attributes['data-coach-enabled'],'true');
    assert.equal(next.events[0].detail.enabled,true);
    assert.equal(boot(data).window.Achilles.coach.isEnabled(),true);
    assert.equal(data.get('achilles_all_days'),'saved workouts');
    assert.equal(data.get('achilles_profile'),'saved profile');
});
test('changes in another tab update coaching, and failed saving rolls back the switch', () => {
    const state=boot();
    state.storage.set(key,'false');
    state.listeners.storage({key});
    assert.equal(state.toggle.checked,false);
    assert.equal(state.window.Achilles.coach.isEnabled(),false);
    state.localStorage.setItem=()=>{throw Error('storage unavailable');};
    state.toggle.checked=true;
    assert.equal(state.window.Achilles.coach.setEnabled(true),false);
    assert.equal(state.toggle.checked,false);
    assert.match(state.status.textContent,/Не вдалося/);
});
test('disabled coaching prevents recommendation calculations and progression actions', () => {
    const runtime=read('app-runtime.js');
    const A={coach:{isEnabled:()=>false}};
    const root={};
    const context={A,root,localStorage:{getItem:()=>null}};
    // No history, analytics or DOM dependencies: disabled entry points must return before using them.
    for (const name of ['detailedSuggestion','coachPlan','renderCoachV2','renderAnalyticsV2']) {
        const start=runtime.indexOf(`    function ${name}(`);
        const end=runtime.indexOf('\n    }',start)+6;
        vm.runInNewContext(runtime.slice(start,end),context);
        vm.runInNewContext(`${name}('press')`,context);
    }
    const start=runtime.indexOf('    root.applyExerciseProgression =');
    const end=runtime.indexOf('\n    };',start)+7;
    vm.runInNewContext(runtime.slice(start,end),context);
    root.applyExerciseProgression('press');
    const window={Achilles:A};
    vm.runInNewContext(read('training.js'),{window});
    assert.equal(A.training.progression.suggest('press'),null);
});
test('coach settings load before application code and are included in offline storage', () => {
    const html=read('index.html');
    assert.ok(html.indexOf('./coach-settings.js')<html.indexOf('./firebase-sync.js'));
    assert.match(read('sw.js'),/"\.\/coach-settings\.js"/);
    assert.match(html,/<section class="premium-section weekly-section" data-coach-feature>/);
    assert.doesNotMatch(html,/Apple Watch|simp-aw|logAppleWatch/);
    assert.match(read('app-runtime.js'),/button data-coach-feature[^>]+applyExerciseProgression/);
});
