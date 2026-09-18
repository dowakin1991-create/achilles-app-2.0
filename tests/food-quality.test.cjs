const {test} = require('node:test');
const assert = require('node:assert/strict');
const search = require('../food-search.js');

test('food quality distinguishes unknown fiber from real zero', () => {
    const zero = search.qualityOf({name:'Куряче філе сире', kcal:110, p:23, f:1.2, c:0, fiber:0, source:'USDA'});
    const unknown = search.qualityOf({name:'Куряче філе сире', kcal:110, p:23, f:1.2, c:0, fiber:null, source:'USDA'});
    assert.equal(zero.fiberKnown, true);
    assert.equal(unknown.fiberKnown, false);
    assert.ok(zero.score > unknown.score);
});

test('food state is normalized without merging raw and cooked profiles', () => {
    assert.equal(search.deriveState({name:'Куряче філе (сире)'}), 'raw');
    assert.equal(search.deriveState({name:'Гречка варена'}), 'boiled');
    assert.equal(search.deriveState({name:'Картопля смажена'}), 'fried');
    assert.equal(search.deriveState({name:'Лосось'}), 'unspecified');
});

test('brand becomes searchable when it is stored separately', () => {
    const engine = search.create([
        {id:'oats-1', canonicalId:'oats-1', name:'Вівсяні пластівці', brand:'Розумний вибір', kcal:370, p:13, f:7, c:62, fiber:10}
    ], []);
    const result = engine.search('розумний вибір', 5);
    assert.equal(result.length, 1);
    assert.equal(result[0].canonicalId, 'oats-1');
    assert.equal(result[0].quality.brandKnown, true);
});
