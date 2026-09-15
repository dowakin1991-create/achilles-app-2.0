const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('the live card click saves original nutrition and product identity once', () => {
    const handlers = new Map();
    const item = {id: 'custom-precision', name: 'Мій продукт', source: 'custom',
        kcal: 53.25, p: 3.21, f: 2.55, c: 4.55};
    let saved = 0, recent;
    const input = {value: '200'};
    const card = {dataset: {foodKey: 'card-1'}, querySelector: () => input};
    const button = {closest: () => card};
    const window = {
        AchillesFoodSearch: require('../food-search.js'),
        Achilles: {
            foodCardRegistry: new Map([['card-1', item]]),
            nutritionRepo: {normalize: x => x, custom: () => [], touchRecent: x => {recent = x;}},
            daily: {save: () => {saved++;}}
        },
        consumedCalories: 10, macros: {p: 1, f: 2, c: 3}, dailyLog: [],
        addEventListener() {}
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../nutrition-local.js'), 'utf8'), {
        window, console: {info() {}, warn() {}, error() {}},
        localStorage: {getItem: () => null}, setTimeout() {},
        document: {readyState: 'loading', querySelector: () => null,
            addEventListener: (type, callback) => handlers.set(type, callback)}
    });
    handlers.get('click')({target: {closest: selector => selector === '#food-results .add-btn' ? button : null},
        preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}});
    assert.equal(saved, 1);
    assert.equal(window.dailyLog.length, 1);
    assert.equal(window.dailyLog[0].foodId, 'custom-precision');
    assert.equal(window.dailyLog[0].foodSource, 'custom');
    assert.equal(window.dailyLog[0].weightG, 200);
    assert.equal(window.dailyLog[0].kcal, 107);
    assert.equal(window.dailyLog[0].p, 6.4);
    assert.equal(window.dailyLog[0].f, 5.1);
    assert.equal(window.consumedCalories, 117);
    assert.equal(recent.id, item.id);
    assert.equal(input.value, '');
});
