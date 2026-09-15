const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('an offline versioned catalog request uses the current precached shell', async () => {
    const handlers = new Map();
    const waits = [];
    let requestedCache, matched, response;
    const catalog = new Response('local catalog');
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), {
        URL, Response, Request, console,
        self: {
            location: {origin: 'https://example.test', href: 'https://example.test/achilles/sw.js'},
            addEventListener: (type, handler) => handlers.set(type, handler)
        },
        caches: {open: async name => {
            requestedCache = name;
            return {match: async (request, options) => {
                matched = {url: request.url, ignoreSearch: options.ignoreSearch};
                return options.ignoreSearch ? catalog : undefined;
            }};
        }},
        fetch: async () => {throw new Error('offline');}
    });
    handlers.get('fetch')({
        request: new Request('https://example.test/achilles/foods_ua_10000.js?v=10.15.2'),
        respondWith: promise => {response = promise;},
        waitUntil: promise => waits.push(promise)
    });
    assert.equal(await (await response).text(), 'local catalog');
    assert.equal(requestedCache, 'achilles-os-v10-15-2');
    assert.equal(matched.ignoreSearch, true);
    await Promise.all(waits);
});
