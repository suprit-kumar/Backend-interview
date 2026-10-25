/* Catalog: lookups over the 77-topic index (Atlas.index) and any loaded full topics (Atlas.topics). */
(function (A) {
  const order = {};
  A.index.forEach((e, i) => { order[e.id] = i; });
  const catByName = {};
  A.meta.categories.forEach(c => { catByName[c.slug] = c; });

  A.catalog = {
    all: A.index,
    cats: A.meta.categories,
    cat(slug) { return catByName[slug] || null; },
    entry(id) { return order[id] === undefined ? null : A.index[order[id]]; },
    data(id) { return A.topics.find(t => t.id === id) || null; },
    // Worked examples live in Atlas.worked so they exist even for topics whose full lesson is not written yet.
    hasSim(e) { const t = A.topics.find(x => x.id === e.id); return !!(e.sim || (t && t.sim)); },
    hasWorked(e) { return !!(e.w || A.catalog.worked(e.id)); },
    worked(id) { const t = A.topics.find(x => x.id === id); return (t && t.worked) || (A.worked || {})[id] || null; },
    inCat(slug) { return A.index.filter(e => e.c === slug); },
    at(i) { return A.index[i] || null; },
    pos(id) { return order[id]; },
    prev(id) { return A.catalog.at(order[id] - 1); },
    next(id) { return A.catalog.at(order[id] + 1); },

    // Accepts an exact id or a unique "<id>-..." extension, so #/topic/circuit-breaker finds circuit-breaker-pattern.
    resolve(arg) {
      if (order[arg] !== undefined) return arg;
      const hits = A.index.filter(e => e.id.indexOf(arg + '-') === 0);
      return hits.length === 1 ? hits[0].id : null;
    },

    isDone(id) { return A.store.has('done', id); },
    doneCount(slug) {
      const done = A.store.get('done', []);
      return A.index.filter(e => (!slug || e.c === slug) && done.indexOf(e.id) !== -1).length;
    },
    total(slug) { return slug ? A.catalog.inCat(slug).length : A.index.length; },
    random(exceptId) {
      const pool = A.index.filter(e => e.id !== exceptId);
      return pool[Math.floor(Math.random() * pool.length)];
    },

    // Minimal topic for entries whose full content has not been written yet.
    stub(e) {
      return {
        id: e.id, category: e.c, title: e.t, stub: true,
        source: { description: e.d, steps: e.s },
        visual: { type: e.v, config: {} },
        steps: e.s.map((label, i) => ({ label, caption: { beginner: label, intermediate: label, expert: label }, state: { active: [i] } })),
        sim: e.sim, worked: null, related: [], prereqs: [], tags: [],
      };
    },
  };
})(window.Atlas);
