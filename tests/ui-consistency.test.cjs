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


test('Mobile 11 release keeps dashboard rings and flattens profile/nav on mobile', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /11\.0\.0/);
    assert.match(html, /id="ring-kcal"/);
    assert.match(html, /id="macro-p"/);
    assert.match(html, /id="macro-f"/);
    assert.match(html, /id="macro-c"/);
    assert.match(css, /ACHILLES MOBILE 11 — PREVIEW 2/);
    assert.match(css, /#tab-profile \.settings-card[\s\S]*border-bottom:1px solid var\(--surface-border\)!important/);
    assert.match(css, /#main-app-window \.nav-bar[\s\S]*border-radius:22px!important/);
    assert.match(css, /#tab-dashboard \.nutrition-macro-cards[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
});


test('11.0.1 protects iOS top safe area and profile fields from floating actions', () => {
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(css, /padding-top:max\(calc\(env\(safe-area-inset-top, 0px\) \+ 10px\), 54px\)!important/);
    assert.match(css, /#tab-profile \.profile-actions[\s\S]*position:static!important/);
    assert.match(css, /#tab-profile \.profile-actions[\s\S]*bottom:auto!important/);
});


test('11.1.0 stable mobile header keeps greeting spacing, both date arrows and readable macros', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /class="greeting-prefix">Привіт,<\/span><span class="gradient-text" id="display-username"/);
    assert.match(html, /id="btn-next-date"/);
    assert.match(css, /grid-template-columns:34px minmax\(76px,1fr\) 34px!important/);
    assert.match(css, /#tab-dashboard \.date-arrow:disabled[\s\S]*opacity:\.28!important/);
    assert.match(css, /#tab-dashboard \.nutrition-macro-value-line[\s\S]*white-space:nowrap!important/);
    assert.match(css, /#tab-dashboard \.nutrition-macro-card[\s\S]*grid-template-columns:24px minmax\(0,1fr\)!important/);
});


test('11.1.1 numeric input audit prevents iOS caret/flex glitches', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /class="numeric-input-row custom-food-macros"/);
    assert.match(html, /id="cf-p"[^>]*step="0\.1"/);
    assert.match(css, /\.numeric-input-row > input[\s\S]*width:0!important[\s\S]*min-width:0!important/);
    assert.match(css, /input\[type="number"\][\s\S]*text-indent:0!important[\s\S]*text-align:left!important/);
    assert.match(css, /#custom-food-overlay input:focus[\s\S]*padding-left:14px!important/);
});


test('11.2 avatar progression and durable custom-food backup are wired', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    const sync = fs.readFileSync(path.join(__dirname, '../firebase-sync.js'), 'utf8');
    const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
    assert.match(html, /id="avatar-progression-grid"/);
    assert.match(html, /avatar-system\.js\?v=11\.2\.0/);
    assert.match(css, /achilles-avatar-atlas\.webp\?v=11\.2\.0/);
    assert.match(sync, /"backups", "customFoods"/);
    assert.match(sync, /avatarState:/);
    assert.match(sync, /syncCustomFoodsBackup/);
    assert.match(sw, /avatar-system\.js/);
    assert.match(sw, /achilles-avatar-atlas\.webp/);
});


test('11.2 progression keeps nutrition completion and immediately backs up custom foods', () => {
    const runtime = fs.readFileSync(path.join(__dirname, '../app-runtime.js'), 'utf8');
    const reliability = fs.readFileSync(path.join(__dirname, '../nutrition-reliability.js'), 'utf8');
    const core = fs.readFileSync(path.join(__dirname, '../core-data.js'), 'utf8');
    const avatar = fs.readFileSync(path.join(__dirname, '../avatar-system.js'), 'utf8');
    assert.match(runtime, /syncCustomFoodsBackup\?\.\(\)/);
    assert.match(reliability, /syncCustomFoodsBackup\?\.\(\)/);
    assert.match(core, /nutritionComplete: d\.nutritionComplete === true/);
    assert.match(avatar, /safeJson\('achilles_all_days',\{\}\)/);
});


test('11.2.2 avatar changes from clickable profile avatar and picker overlay', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const avatar = fs.readFileSync(path.join(__dirname, '../avatar-system.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');
    assert.match(html, /id="profile-avatar-trigger"[^>]*Achilles\.avatars\.openPicker/);
    assert.match(html, /id="avatar-picker-overlay" hidden/);
    assert.match(html, /id="avatar-progression-grid"/);
    assert.doesNotMatch(html, /class="avatar-progression-card premium-surface"/);
    assert.match(avatar, /function openPicker\(/);
    assert.match(avatar, /function closePicker\(/);
    assert.match(avatar, /closePicker\(\);/);
    assert.match(css, /\.avatar-picker-overlay\.open/);
    assert.match(css, /\.profile-avatar-edit-badge/);
});


test('11.2.3 keeps unapproved avatar artwork disabled in production', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
    assert.match(html, /<div class="profile-avatar-large"><\/div>/);
    assert.doesNotMatch(html, /id="avatar-picker-overlay"/);
    assert.doesNotMatch(html, /data-achilles-module="avatar-system\.js"/);
    assert.doesNotMatch(sw, /avatar-system\.js/);
    assert.doesNotMatch(sw, /achilles-avatar-atlas\.webp/);
});
