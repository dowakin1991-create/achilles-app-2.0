const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_10000.js'), 'utf8'), {window});
vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_extra.js'), 'utf8'), {window});
vm.runInNewContext(fs.readFileSync(path.join(root, 'foods_ua_market.js'), 'utf8'), {window});
const foods = window.ACHILLES_FOOD_CORE_CANONICAL;
const index = window.ACHILLES_FOOD_SEARCH_INDEX;
const search = require('../food-search.js').create(foods, index);

test('catalog counts are honest and every search record points to valid per-100g data', () => {
    assert.equal(foods.length, window.ACHILLES_FOOD_CORE_META.canonicalProfiles);
    assert.equal(index.length, window.ACHILLES_FOOD_CORE_META.searchRecords);
    const ids = new Set(foods.map(x => x.id));
    assert.equal(ids.size, foods.length);
    for (const record of index) assert.ok(ids.has(record.id), record.q);
    for (const food of foods) {
        assert.equal(food.id, food.canonicalId);
        for (const field of ['kcal', 'p', 'f', 'c'])
            assert.ok(Number.isFinite(food[field]) && food[field] >= 0, food.name + ': ' + field);
        assert.ok(food.fiber === null || (Number.isFinite(food.fiber) && food.fiber >= 0), food.name + ': fiber');
        for (const field of ['p', 'f', 'c']) assert.ok(food[field] <= 100, food.name);
        if (food.fiber !== null) assert.ok(food.fiber <= 100, food.name);
    }
});

test('every canonical name ranks its own profile first', () => {
    for (const food of foods) assert.equal(search.search(food.name)[0]?.id, food.id, food.name);
});

test('fat percentages do not match substrings or malformed decimal aliases', () => {
    for (const query of ['молоко 2,5%', 'молоко 2.5%', 'молоко 2,5 %'])
        assert.equal(search.search(query)[0].name, 'Молоко 2.5%');
    assert.equal(search.search('молоко 5%').length, 0);
    assert.equal(search.search('кефір 1%').length, 1);
    assert.equal(search.search('сир 9%')[0].name, 'Сир кисломолочний 9%');
    assert.equal(search.search('сир к/м 9')[0].name, 'Сир кисломолочний 9%');
});

test('raw and cooked foods remain separate, synonyms deduplicate and typos recover', () => {
    assert.equal(search.search('куряче філе сире')[0].name, 'Куряче філе сире');
    assert.equal(search.search('куряче філе варене')[0].name, 'Куряче філе варене');
    assert.equal(search.search('філе куряче запечене')[0].name, 'Куряче філе запечене');
    assert.equal(search.search('banana')[0].name, 'Банан');
    assert.equal(search.search('кешью')[0].id, search.search('кеш’ю')[0].id);
    assert.ok(search.search('гречкка').some(x => x.name === 'Гречка варена'));
    const results = search.search('гречка');
    assert.equal(new Set(results.map(x => x.id)).size, results.length);
    assert.equal(search.search('продуктякогонемає').length, 0);
    assert.equal(search.search('').length, 0);
});

test('custom products stay searchable without modifying their nutritional values', () => {
    const item = {id: 'custom-1', name: 'Мій йогурт 2.5%', kcal: 53.25, p: 3.21, f: 2.5, c: 4.55};
    assert.equal(search.searchCustom([item], 'мій йогурт 2,5%')[0], item);
    assert.equal(search.searchCustom([item], 'йогурт 5%').length, 0);
});

test('the HTML and offline shell both load the new catalog and search engine', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    for (const file of ['foods_ua_10000.js', 'foods_ua_extra.js', 'foods_ua_market.js', 'food-search.js', 'nutrition-local.js']) {
        assert.ok(html.includes(file));
        assert.ok(worker.includes(file));
    }
    assert.ok(html.indexOf('food-search.js') < html.indexOf('data-achilles-module="nutrition-local.js"'));
    assert.ok(!html.includes('5000 локальних позицій'));
    assert.ok(worker.includes('ignoreSearch: shellAsset'));
});


test('UA market pack adds exactly 500 clean Ukrainian retail profiles', () => {
    assert.equal(window.ACHILLES_FOOD_CORE_META.uaMarketProfiles, 500);
    const market = foods.filter(x => x.source === 'ua-market');
    assert.equal(market.length, 500);
    assert.ok(market.some(x => x.store === 'silpo'));
    assert.ok(market.some(x => x.store === 'auchan'));
    for (const food of market) {
        assert.equal(food.per, '100g');
        assert.equal(food.fiber, null);
        assert.ok(food.nutrientSource.includes('Львів'));
        assert.ok(food.sourceUrl);
    }
});
