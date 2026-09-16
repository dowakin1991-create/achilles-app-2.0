const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../coach-cycle.js'),E=require('../coach-engine.js');
function boot(storage=new Map([['achilles_user','anton']])){
    const elements={};const listeners={};const document={getElementById:id=>elements[id]||null,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn};
    const callbacks={};
    elements['nutrition-complete']={};elements['nutrition-complete-status']={};
    elements['coach-weekly-action']={innerHTML:'',querySelectorAll(){
        return [...this.innerHTML.matchAll(/data-cycle="([^"]+)"/g)].map(m=>({dataset:{cycle:m[1]},addEventListener:(name,fn)=>callbacks[m[1]]=fn}));
    }};
    let syncs=0;
    const window={AchillesCoachCycle:C,AchillesCoachEngine:E,todayDate:'2026-09-16',currentViewDate:'2026-09-16',dailyLog:[{type:'food',id:1,foodName:'Яйце',kcal:100}],allDaysData:{},
        syncToCloud:()=>{syncs++;},Achilles:{coach:{isEnabled:()=>true},toast(){}},dispatchEvent(){window.Achilles.coachWorkflow.render();},addEventListener(){}};
    const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
    vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../coach-workflow.js'),'utf8'),{window,document,localStorage,CustomEvent:class{},Date,Promise});
    return {window,W:window.Achilles.coachWorkflow,elements,storage,localStorage,callbacks,syncs:()=>syncs};
}
test('complete day, accept step and check in survive reboot without touching diary data',()=>{
    const b=boot(),before=JSON.stringify(b.window.dailyLog);
    b.W.complete(true);assert.equal(b.elements['nutrition-complete'].checked,true);
    b.W.render();b.callbacks.accept();
    const action=C.active(b.W.read());assert.ok(action);assert.equal(action.kind,'data');
    b.callbacks.done();assert.equal(b.W.read().feedback[`${action.id}:2026-09-16`].value,'done');
    const next=boot(b.storage);assert.equal(C.active(next.W.read()).id,action.id);
    next.W.syncCompletion();assert.equal(next.elements['nutrition-complete'].checked,true);
    assert.equal(JSON.stringify(b.window.dailyLog),before);assert.equal(b.syncs(),3);
    next.window.dailyLog.push({type:'food',id:2,kcal:50});next.W.syncCompletion();assert.equal(next.elements['nutrition-complete'].checked,false);
});
test('failed local save does not claim day complete or publish it',()=>{
    const b=boot();b.localStorage.setItem=()=>{throw Error('quota');};
    b.W.complete(true);assert.equal(b.elements['nutrition-complete'].checked,false);assert.equal(b.syncs(),0);
});
test('remote merge preserves the local completion and state is isolated per account',()=>{
    const b=boot();b.W.complete(true);
    const old={completions:{'2026-09-16':{signature:null,updatedAt:1}}};b.W.mergeRemote(old,'anton');
    assert.equal(b.elements['nutrition-complete'].checked,true);
    b.storage.set('achilles_user','other');assert.equal(Object.keys(b.W.read().completions).length,0);
    b.storage.set('achilles_user','anton');assert.equal(Object.keys(b.W.read().completions).length,1);
});
test('disabled coaching preserves active task without creating or changing checkins',()=>{
    const b=boot();b.W.render();b.callbacks.accept();const saved=JSON.stringify(b.W.read());
    b.window.Achilles.coach.isEnabled=()=>false;b.callbacks.done();b.W.render();
    assert.equal(JSON.stringify(b.W.read()),saved);assert.equal(b.elements['coach-weekly-action'].innerHTML,'');
});
