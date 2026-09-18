const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../firebase-sync.js'), 'utf8');

test('cloud reads and writes wait for Firebase transport readiness', () => {
    assert.match(source, /window\.AchillesFirebaseReady\s*=\s*\(async function initFirebaseTransport/);
    assert.match(source, /window\.waitForFirebaseTransport\s*=\s*async function/);
    assert.match(source, /window\.syncToCloud\s*=\s*async function[\s\S]*await window\.waitForFirebaseTransport\(\)/);
    assert.match(source, /window\.loadFromCloud\s*=\s*async function[\s\S]*await window\.waitForFirebaseTransport\(\)/);
    assert.doesNotMatch(source, /if\(!userName \|\| !db\) return;/);
});

test('app refreshes cloud state when it becomes active again', () => {
    assert.match(source, /window\.refreshFromCloud\s*=\s*async function/);
    assert.match(source, /addEventListener\('online'/);
    assert.match(source, /addEventListener\('focus'/);
    assert.match(source, /addEventListener\('pageshow'/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /await window\.syncToCloud\(\)/);
});


test('realtime listener applies remote changes while the app stays open', () => {
    assert.match(source, /onSnapshot\s*=\s*firestore\.onSnapshot/);
    assert.match(source, /window\.startCloudRealtimeSync\s*=\s*async function/);
    assert.match(source, /snapshot\.metadata\?\.hasPendingWrites/);
    assert.match(source, /await window\.loadFromCloud\(wantedUser\)/);
    assert.match(source, /window\.startCloudRealtimeSync\(userName\)/);
    assert.match(source, /window\.stopCloudRealtimeSync/);
});
