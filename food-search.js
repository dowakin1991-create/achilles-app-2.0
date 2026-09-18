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

    function deriveState(item) {
        if (item && item.state) return String(item.state);
        const name = normalize(item && item.name);
        const states = [
            [/(^| )(сирий|сира|сире|сирі|raw)( |$)/u, 'raw'],
            [/(^| )(варений|варена|варене|варені|boiled|cooked)( |$)/u, 'boiled'],
            [/(^| )(смажений|смажена|смажене|смажені|fried)( |$)/u, 'fried'],
            [/(^| )(запечений|запечена|запечене|запечені|baked|roasted)( |$)/u, 'baked'],
            [/(^| )(сушений|сушена|сушене|сушені|dry|dried|сухий|суха|сухе)( |$)/u, 'dry'],
            [/(^| )(консервований|консервована|консервоване|canned)( |$)/u, 'canned'],
            [/(^| )(заморожений|заморожена|заморожене|frozen)( |$)/u, 'frozen']
        ];
        for (const [pattern, state] of states) if (pattern.test(name)) return state;
        return 'unspecified';
    }

    function qualityOf(item) {
        const numbers = ['kcal', 'p', 'f', 'c'];
        const nutritionComplete = numbers.every(key => Number.isFinite(Number(item && item[key])));
        const fiberKnown = item && item.fiber !== null && item.fiber !== undefined &&
            item.fiber !== '' && Number.isFinite(Number(item.fiber));
        const trustedSource = Boolean(item && (item.source || item.sourceId || item.ndb || item.barcode));
        const stateKnown = deriveState(item) !== 'unspecified';
        const brandKnown = Boolean(item && item.brand);
        const score = (nutritionComplete ? 45 : 0) + (fiberKnown ? 20 : 0) +
            (trustedSource ? 20 : 0) + (stateKnown ? 10 : 0) + (brandKnown ? 5 : 0);
        return {nutritionComplete, fiberKnown, trustedSource, stateKnown, brandKnown, score};
    }

    function enrichFood(item) {
        return {...item, state: deriveState(item), quality: qualityOf(item)};
    }

    function create(canonical, index) {
        canonical = (canonical || []).map(enrichFood);
        const byId = new Map(canonical.map(item => [String(item.canonicalId || item.id), item]));
        const entries = new Map();
        // Canonical names remain searchable even if an imported index is incomplete.
        for (const rec of [...canonical.flatMap(item => [
            item.name,
            ...(item.aliases || []),
            item.brand && !normalize(item.name).includes(normalize(item.brand)) ? `${item.brand} ${item.name}` : null
        ].filter(Boolean).map(q => ({q, id: item.canonicalId || item.id, boost: 260}))), ...(index || [])]) {
            const text = normalize(rec.q), id = String(rec.id);
            if (!text || !byId.has(id)) continue;
            const key = id + '\0' + text;
            const boost = Math.max(0, Math.min(300, Number(rec.boost) || 0));
            if (!entries.has(key) || entries.get(key).boost < boost)
                entries.set(key, {id, text, words: text.split(' '), boost, term: rec.q,
                    percentages: normalize(byId.get(id).name).match(/\d+(?:\.\d+)?%/g) || []});
        }
        const prepared = [...entries.values()];
        const cache = new Map();
        const cacheKey = (query, limit) => `${query}\0${limit}`;
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
                const key = cacheKey(query, limit);
                if (cache.has(key)) return cache.get(key).map(item => ({...item}));
                const terms = query.split(' ');
                let best = collect(query, terms, false);
                // Typos are a fallback; never mix approximate foods into exact results.
                if (!best.size) best = collect(query, terms, true);
                const result = [...best].sort((a, b) => b[1].score - a[1].score ||
                    Number(byId.get(b[0])?.quality?.score || 0) - Number(byId.get(a[0])?.quality?.score || 0) ||
                    byId.get(a[0]).name.localeCompare(byId.get(b[0]).name, 'uk'))
                    .slice(0, limit).map(([id, match]) => ({...byId.get(id),
                        source: 'built-in', matchTerm: match.term}));
                cache.set(key, result);
                if (cache.size > 80) cache.delete(cache.keys().next().value);
                return result.map(item => ({...item}));
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
    return {normalize, deriveState, qualityOf, enrichFood, create};
});
