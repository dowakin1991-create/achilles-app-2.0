/* Local food search; shared by the browser and Node regression tests. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.AchillesFoodSearch = api;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';

    function normalize(value) {
        return String(value || '').normalize('NFKC').toLocaleLowerCase('uk-UA')
            .replace(/(\d)[,.](?=\d)/g, '$1.')
            .replace(/['’`ʼ]/g, '')
            .replace(/ё/g, 'е').replace(/ы/g, 'и').replace(/э/g, 'е')
            .replace(/[\\/_–—-]+/g, ' ')
            .replace(/[^\p{L}\p{N}.%]+/gu, ' ')
            .replace(/\s*%/g, '%').replace(/\s+/g, ' ').trim();
    }

    function distance(a, b, limit) {
        if (Math.abs(a.length - b.length) > limit) return limit + 1;
        let previous = Array.from({length: b.length + 1}, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            const current = [i];
            for (let j = 1; j <= b.length; j++) {
                current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
                    previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            if (Math.min(...current) > limit) return limit + 1;
            previous = current;
        }
        return previous[b.length];
    }

    function score(text, words, query, terms, fuzzy) {
        // Numeric qualifiers must match whole tokens: 5 must not match 15 or 2.5.
        if (terms.some(term => /\d/.test(term) && !words.some(word =>
            word.replace(/%$/, '') === term.replace(/%$/, '')))) return -Infinity;
        if (text === query) return 100000;
        if (text.startsWith(query)) return 90000 - Math.min(1000, text.length);
        if (text.includes(query)) return 80000 - Math.min(1000, text.indexOf(query));
        let total = 0;
        for (const term of terms) {
            let best = -Infinity;
            for (const word of words) {
                if (word === term) best = Math.max(best, 100);
                else if (!/\d/.test(term) && word.startsWith(term)) best = Math.max(best, 80);
                else if (!/\d/.test(term) && term.length >= 4 && word.includes(term)) best = Math.max(best, 60);
                else if (fuzzy && !/\d/.test(term) && term.length >= 5) {
                    const limit = term.length >= 8 ? 2 : 1;
                    const d = distance(word, term, limit);
                    if (d <= limit) best = Math.max(best, 40 - d * 10);
                }
            }
            if (!Number.isFinite(best)) return -Infinity;
            total += best;
        }
        return 50000 + Math.min(10000, total);
    }

    function create(canonical, index) {
        const byId = new Map(canonical.map(item => [String(item.canonicalId || item.id), item]));
        const entries = new Map();
        // Canonical names remain searchable even if an imported index is incomplete.
        for (const rec of [...canonical.flatMap(item => [item.name, ...(item.aliases || [])]
            .map(q => ({q, id: item.canonicalId || item.id, boost: 260}))), ...index]) {
            const text = normalize(rec.q), id = String(rec.id);
            if (!text || !byId.has(id)) continue;
            const key = id + '\0' + text;
            const boost = Math.max(0, Math.min(300, Number(rec.boost) || 0));
            if (!entries.has(key) || entries.get(key).boost < boost)
                entries.set(key, {id, text, words: text.split(' '), boost, term: rec.q,
                    percentages: normalize(byId.get(id).name).match(/\d+(?:\.\d+)?%/g) || []});
        }
        const prepared = [...entries.values()];
        function collect(query, terms, fuzzy) {
            const best = new Map();
            for (const rec of prepared) {
                // Older aliases split decimals into words ("2 5%"). The canonical
                // percentage is authoritative; those aliases must not match "5%".
                if (rec.percentages.length && terms.some(term => /^\d+(?:\.\d+)?%?$/.test(term) &&
                    !rec.percentages.some(value => Number(value.slice(0, -1)) === Number(term.replace(/%$/, ''))))) continue;
                const value = score(rec.text, rec.words, query, terms, fuzzy) + rec.boost;
                if (Number.isFinite(value) && (!best.has(rec.id) || best.get(rec.id).score < value))
                    best.set(rec.id, {score: value, term: rec.term});
            }
            return best;
        }
        return {
            search(value, limit = 48) {
                const query = normalize(value);
                if (!query) return [];
                const terms = query.split(' ');
                let best = collect(query, terms, false);
                // Typos are a fallback; never mix approximate foods into exact results.
                if (!best.size) best = collect(query, terms, true);
                return [...best].sort((a, b) => b[1].score - a[1].score ||
                    byId.get(a[0]).name.localeCompare(byId.get(b[0]).name, 'uk'))
                    .slice(0, limit).map(([id, match]) => ({...byId.get(id),
                        source: 'built-in', matchTerm: match.term}));
            },
            searchCustom(items, value) {
                const query = normalize(value), terms = query.split(' ');
                if (!query) return items;
                return items.map(item => {
                    const text = normalize(item.name);
                    return {item, score: score(text, text.split(' '), query, terms, true)};
                }).filter(x => Number.isFinite(x.score)).sort((a,b) => b.score-a.score).map(x => x.item);
            }
        };
    }
    return {normalize, create};
});
