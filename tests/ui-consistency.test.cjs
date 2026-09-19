const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('status does not duplicate the journal workspace and navigation targets are valid', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /journal-shortcut-section|Усі записи винесені в окрему вкладку/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'duplicate HTML ids');
    const targets = [...html.matchAll(/class="[^"]*\bnav-item\b[^"]*"[^>]*data-target="([^"]+)"/g)].map(m => m[1]);
    for (const target of targets) assert.ok(ids.includes(target), `missing navigation target: ${target}`);
});

test('custom food delete decorator is a legacy fallback and cannot add a second trash button', () => {
    const source = fs.readFileSync(path.join(root, 'nutrition-local.js'), 'utf8');
    assert.match(source, /food-delete-live-v105, \.food-delete-btn, \.food-delete-btn-v104/);
});

test('diary entries use theme-aware icons instead of fixed food and workout emojis', () => {
    for (const file of ['app-runtime.js', 'nutrition-local.js', 'nutrition-reliability.js']) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        assert.doesNotMatch(source, /🥗/);
    }
    const sync = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
    assert.match(sync, /diary-food-icon/);
    assert.match(sync, /diary-workout-icon/);
});

test('calorie calculations use per-100g scaling and Mifflin-St Jeor inputs', () => {
    const app = fs.readFileSync(path.join(root, 'app-runtime.js'), 'utf8');
    const sync = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
    assert.match(app, /const ratio = weight \/ 100/);
    assert.match(app, /normalized\.kcal \* ratio/);
    assert.match(app, /normalized\.p \* ratio/);
    assert.match(sync, /\(10 \* weight\) \+ \(6\.25 \* height\) - \(5 \* age\)/);
    assert.match(sync, /bmr \+= \(gender === 'male'\) \? 5 : -161/);
});

test('strength input offers a visible set separator on mobile keyboards', () => {
    const sync = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
    assert.match(sync, /insertSetSeparator/);
    assert.match(sync, /value \? `\$\{value\};`/);
    assert.match(css, /\.set-separator-btn/);
});


test('Coach V3 keeps other workspaces untouched and uses focused subviews', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const runtime = fs.readFileSync(path.join(__dirname, '../app-runtime.js'), 'utf8');
    assert.match(html, /id="tab-coach"[\s\S]*data-coach-view="today"/);
    assert.match(html, /data-coach-view="analysis"/);
    assert.match(html, /data-coach-view="plan"/);
    assert.match(html, /data-coach-view="settings"/);
    assert.match(html, /id="coach-good-title"/);
    assert.match(html, /id="coach-gap-title"/);
    assert.match(html, /id="coach-focus-title"/);
    assert.match(runtime, /root\.setCoachView\s*=\s*function/);
    assert.match(runtime, /coach-analysis-host/);
    assert.match(runtime, /coach-analysis-insights/);
});


test('10.17.6 cleanup keeps dashboard rings/macros and removes obsolete patch UI', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const runtime = fs.readFileSync(path.join(__dirname, '../app-runtime.js'), 'utf8');
    const nutrition = fs.readFileSync(path.join(__dirname, '../nutrition-local.js'), 'utf8');
    assert.match(html, /id="ring-kcal"/);
    assert.match(html, /id="ring-protein"/);
    assert.match(html, /id="ring-fat"/);
    assert.match(html, /id="ring-carb"/);
    assert.match(html, /id="macro-p"/);
    assert.match(html, /id="macro-f"/);
    assert.match(html, /id="macro-c"/);
    assert.match(html, /<h2>Раціон<\/h2>/);
    assert.match(html, />Тренування<\/span>/);
    assert.doesNotMatch(html, /calorie-summary-note/);
    assert.doesNotMatch(runtime, /Achilles OS 10\.14 · local-first/);
    assert.doesNotMatch(nutrition, /V10\.5 Food Fix активний/);
});


test('10.18 desktop mode is isolated to wide screens and preserves mobile status nutrition', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /class="desktop-nav-brand"/);
    assert.match(css, /@media \(min-width:1180px\)/);
    assert.match(css, /--desktop-sidebar:248px/);
    assert.match(css, /grid-template-areas:[\s\S]*"nutrition weight"/);
    assert.match(css, /#tab-food\.active[\s\S]*grid-template-columns:350px minmax\(0,1fr\)/);
    assert.match(css, /#tab-workout #workout-list-container[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
    assert.match(css, /#tab-profile \.profile-settings-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
    assert.match(html, /id="ring-kcal"/);
    assert.match(html, /id="macro-p"/);
    assert.match(html, /id="macro-f"/);
    assert.match(html, /id="macro-c"/);
});


test('10.18.2 mobile nav cannot render desktop brand or shift six tabs', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /desktop-nav-brand" aria-hidden="true" hidden/);
    assert.match(css, /\.desktop-nav-brand\{display:none!important\}/);
    assert.match(css, /@media \(max-width:1179\.98px\)/);
    assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
    assert.match(css, /#bottom-nav \.desktop-nav-brand[\s\S]*display:none!important/);
    assert.match(css, /@media \(min-width:1180px\)[\s\S]*\.desktop-nav-brand\{[\s\S]*display:flex!important/);
});


test('10.18.4 restores color themes and keeps workspace wrappers structural', () => {
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(css, /html\[data-theme="dark"\]\[data-color="blood"\][\s\S]*--primary:#FF453A/);
    assert.match(css, /html\[data-theme="dark"\]\[data-color="sky"\][\s\S]*--primary:#0A84FF/);
    assert.match(css, /html\[data-theme="light"\]\[data-color="blood"\][\s\S]*--primary:#D70015/);
    assert.match(css, /html\[data-theme="light"\]\[data-color="sky"\][\s\S]*--primary:#007AFF/);
    assert.match(css, /\.premium-workspace > \.workspace-block[\s\S]*background:transparent!important[\s\S]*border:0!important[\s\S]*box-shadow:none!important/);
    assert.match(css, /#tab-food > \.workspace-block\.results-section[\s\S]*border-radius:0!important/);
});


test('10.18.5 cohesive UI fixes Coach contrast and structural sheets', () => {
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(css, /#tab-coach \.coach-v3-tab\.active[\s\S]*background:color-mix/);
    assert.match(css, /html\[data-theme="dark"\] #tab-coach \.coach-v3-tab\.active[\s\S]*color:#fff4d8!important/);
    assert.match(css, /#tab-coach \.coach-v3-signal strong[\s\S]*color:var\(--text-main\)!important/);
    assert.match(css, /#tab-journal > \.workspace-block[\s\S]*background:transparent!important/);
    assert.match(css, /#tab-food \.results-section[\s\S]*background:transparent!important/);
    assert.match(css, /Keep Dashboard nutrition rings\/macros untouched/);
});


test('10.19 Coach 2.0 UI contains contextual question host',()=>{
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'); const css=fs.readFileSync(path.join(__dirname,'../app.css'),'utf8');
    assert.match(html,/id="coach-question-host"/); assert.match(css,/coach-question-options/); assert.match(css,/coach-question-scale/); assert.match(css,/coach-answer-response/);
});


test('10.20 mobile AAA pass simplifies non-dashboard workspaces only',()=>{
    const css=fs.readFileSync(path.join(__dirname,'../app.css'),'utf8');
    assert.match(css,/achilles-v10-20-0-mobile-aaa-pass/);
    assert.match(css,/#tab-food \.workspace-header[\s\S]*background:transparent!important/);
    assert.match(css,/#tab-coach \.coach-v3-signal[\s\S]*border-radius:0!important/);
    assert.match(css,/#tab-profile \.profile-hero[\s\S]*grid-template-columns:68px minmax\(0,1fr\)/);
    const block=css.slice(css.indexOf('achilles-v10-20-0-mobile-aaa-pass'));
    assert.doesNotMatch(block,/#tab-dashboard/);
});


test('Mobile 11 preview is isolated to mobile and Coach has one question host', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.equal((html.match(/id="coach-question-host"/g) || []).length, 1);
    assert.match(css, /ACHILLES MOBILE 11 — PREVIEW 1/);
    assert.match(css, /@media \(max-width:767px\)/);
    assert.match(css, /#tab-food \.results-section > \.workspace-block-head[\s\S]*display:none!important/);
    assert.match(css, /#tab-journal \.journal-panel-head[\s\S]*display:none!important/);
    assert.match(css, /#tab-coach \.coach-v3-signal-grid[\s\S]*border-radius:18px/);
});


test('Mobile 11 preview 2 keeps dashboard rings and flattens profile/nav on mobile', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /11\.0\.0-preview2/);
    assert.match(html, /id="ring-kcal"/);
    assert.match(html, /id="macro-p"/);
    assert.match(html, /id="macro-f"/);
    assert.match(html, /id="macro-c"/);
    assert.match(css, /ACHILLES MOBILE 11 — PREVIEW 2/);
    assert.match(css, /#tab-profile \.settings-card[\s\S]*border-bottom:1px solid var\(--surface-border\)!important/);
    assert.match(css, /#main-app-window \.nav-bar[\s\S]*border-radius:22px!important/);
    assert.match(css, /#tab-dashboard \.nutrition-macro-cards[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
});
