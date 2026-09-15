// Generate a visual regression fixture from the production renderer and CSS.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
const start = source.indexOf('window.renderWeightChart = function()');
const end = source.indexOf('\n        };', start) + '\n        };'.length;
const renderer = source.slice(start, end);
const escape = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const frames = [];
for (const width of [390, 900]) {
    for (const count of [1, 7]) {
        const container = {innerHTML: ''};
        const history = Array.from({length: count}, (_,i) => ({date:`2026-09-${String(11+i).padStart(2,'0')}`,weight:80-i*.1}));
        const window = {formatWeightDate: d => d.slice(5), renderProgressInsights() {}};
        vm.runInNewContext(renderer, {window, document:{getElementById:()=>container},localStorage:{getItem:()=>JSON.stringify(history)}});
        window.renderWeightChart();
        const html = `<html lang="uk" data-color="sky" data-theme="dark"><head><link rel="stylesheet" href="../app.css"></head><body style="display:block;padding:18px;margin:0"><main><section class="premium-section body-section"><div class="weight-premium-card premium-surface"><div class="weight-entry-row"><div class="weight-entry-copy"><strong>Нове зважування</strong><span>Дивимось на тренд, а не на випадковий стрибок.</span></div><div class="weight-entry-controls"><input placeholder="Вага (кг)"><button class="gradient-bg primary-btn">Записати</button></div></div><div class="chart-container premium-weight-chart" id="weight-chart-container">${container.innerHTML}</div></div></section><section class="premium-section journal-shortcut-section"><div class="premium-surface journal-shortcut-card"><div><span class="eyebrow">ЖУРНАЛ</span><h2>Усі записи винесені в окрему вкладку</h2><p>Так журнал не засмічує статус.</p></div></div></section></main></body></html>`;
        frames.push(`<section><h2>${width}px · ${count} record(s)</h2><iframe title="${width}px ${count} records" width="${width}" height="950" srcdoc="${escape(html)}"></iframe></section>`);
    }
}
fs.writeFileSync(path.join(root,'tests/weight-layout.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Weight layout regression fixture</title></head><body style="background:#111;color:#ddd;font-family:sans-serif">${frames.join('\n')}</body></html>`);
