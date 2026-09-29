const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_10000.js'), 'utf8'), {window});
const before = JSON.stringify(window.ACHILLES_FOOD_CORE_CANONICAL);
vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_extra.js'), 'utf8'), {window});
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'data/usda-sr28-source-extract.json')));
const fieldIds = {kcal: '208', p: '203', f: '204', c: '205', fiber: '291'};

test('new USDA profiles match the retained source values and descriptions', () => {
    const extra = window.ACHILLES_FOOD_CORE_CANONICAL.slice(479);
    assert.equal(extra.length, 521);
    for (const food of extra) {
        assert.equal(food.nameOriginal, evidence.descriptions[food.sourceRecordId]);
        assert.equal(food.per, '100g');
        assert.ok(food.nutrientSource.includes('USDA SR28'));
        for (const [field, id] of Object.entries(fieldIds)) {
            const raw = evidence.nutrients.find(x => x.ndb === food.sourceRecordId && x.nutrient === id);
            assert.ok(raw, `${food.name}: ${field}`);
            assert.equal(food[field], Number(raw.amount), `${food.name}: ${field}`);
        }
    }
    assert.equal(JSON.stringify(window.ACHILLES_FOOD_CORE_CANONICAL.slice(0,479)), before);
});

test('supplement is idempotent and incomplete source records are excluded', () => {
    const size = window.ACHILLES_FOOD_SEARCH_INDEX.length;
    vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_extra.js'), 'utf8'), {window});
    assert.equal(window.ACHILLES_FOOD_CORE_CANONICAL.length, 1000);
    assert.equal(window.ACHILLES_FOOD_SEARCH_INDEX.length, size);
    assert.ok(!window.ACHILLES_FOOD_CORE_CANONICAL.some(x => x.id === 'usda-sr28-09138'));
});
