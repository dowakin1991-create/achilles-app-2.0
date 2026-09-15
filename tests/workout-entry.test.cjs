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
