/* Atlas.verify(): acceptance checks. Phase 1 covers structure and the topics written so far; later phases tighten the rules. */
(function (A, $) {
  const BASELINE = Object.keys(window);
  const ALLOWED = ['Atlas', '$', 'jQuery', 'hljs', 'bootstrap'];
  const KIND = ['pipeline', 'sequence', 'state-machine', 'topology', 'timeline-swimlane', 'data-structure', 'layers', 'compare', 'chart', 'waterfall'];

  function topicProblems(t, e) {
    const p = [];
    const need = ['id', 'category', 'title', 'source', 'estMinutes', 'prereqs', 'related', 'tags', 'visual', 'steps', 'levels', 'code', 'interview', 'quiz'];
    need.forEach(k => { if (t[k] === undefined) p.push('missing ' + k); });
    if (p.length) return p;
    if (t.category !== e.c) p.push('category differs from index');
    if (t.source.description !== e.d || JSON.stringify(t.source.steps) !== JSON.stringify(e.s)) p.push('source differs from reference');
    if (KIND.indexOf(t.visual.type) === -1) p.push('bad visual type');
    if (t.steps.length < t.source.steps.length) p.push('fewer steps than source');
    t.steps.forEach((s, i) => { if (!s.label || !s.state || !s.caption || !s.caption.beginner || !s.caption.intermediate || !s.caption.expert) p.push('step ' + (i + 1) + ' incomplete'); });
    ['beginner', 'intermediate', 'expert'].forEach(l => { if (!t.levels[l]) p.push('missing level ' + l); });
    if (t.levels.beginner && (!t.levels.beginner.keyTerms || t.levels.beginner.keyTerms.length < 3)) p.push('needs 3+ key terms');
    ['beginner', 'intermediate', 'expert'].forEach(l => { if (t.interview.filter(q => q.level === l).length < 2) p.push('needs 2+ ' + l + ' interview questions'); });
    if (t.quiz.length !== 4) p.push('quiz must have 4 questions');
    t.quiz.forEach((q, i) => { if (q.answerIndex < 0 || q.answerIndex >= q.options.length || !q.why) p.push('quiz ' + (i + 1) + ' invalid'); });
    if (!t.code.length) p.push('no code');
    t.code.forEach(c => (c.annotations || []).forEach(a => { if (a.line < 1 || a.line > c.code.split('\n').length) p.push('annotation line out of range in ' + c.title); }));
    (t.prereqs || []).concat(t.related || []).forEach(id => { if (!A.catalog.entry(id) || id === t.id) p.push('bad link ' + id); });
    if (t.sim && !A.sims.has(t.sim)) p.push('sim not registered: ' + t.sim);
    if (e.sim && t.sim !== e.sim) p.push('reference sim ' + e.sim + ' not attached');
    if (e.w && !A.catalog.worked(t.id)) p.push('reference worked example not ported');
    return p;
  }

  A.verify = function () {
    const rows = [];
    const failures = [];
    const add = (name, ok, detail) => { rows.push({ check: name, result: ok ? 'PASS' : 'FAIL', detail }); if (!ok) failures.push(name + ': ' + detail); };
    const ex = A.meta.expected;

    add('Topics in index', A.index.length === ex.topics && new Set(A.index.map(e => e.id)).size === ex.topics, A.index.length + '/' + ex.topics);
    add('Categories', A.meta.categories.length === ex.categories && A.meta.categories.every(c => A.catalog.inCat(c.slug).length > 0), A.meta.categories.length + '/' + ex.categories);
    add('Reference sims flagged', A.index.filter(e => e.sim).length === ex.sims, A.index.filter(e => e.sim).length + '/' + ex.sims);
    add('Reference worked flagged', A.index.filter(e => e.w).length === ex.worked, A.index.filter(e => e.w).length + '/' + ex.worked);
    add('Visual types valid', A.index.every(e => KIND.indexOf(e.v) !== -1), A.index.length + '/' + A.index.length);
    add('Every topic routes', A.index.every(e => A.catalog.resolve(e.id) === e.id), A.index.length + '/' + A.index.length);
    add('Search finds every title', A.index.every(e => A.search.query(e.t, 5).some(r => r.entry.id === e.id)), 'title lookup');

    const loaded = A.topics.map(t => ({ t, p: topicProblems(t, A.catalog.entry(t.id) || {}) }));
    const ok = loaded.filter(x => !x.p.length).length;
    add('Full topics valid', ok === loaded.length, ok + '/' + A.topics.length + ' written (target ' + ex.topics + ')');
    loaded.filter(x => x.p.length).forEach(x => failures.push('  ' + x.t.id + ': ' + x.p.join('; ')));
    add('No duplicate topic data', new Set(A.topics.map(t => t.id)).size === A.topics.length, 'ids unique');
    add('Registered sims have a topic', A.sims.ids().every(id => A.index.some(e => e.sim === id) || A.topics.some(t => t.sim === id)), A.sims.ids().length + ' registered');

    const simIds = A.index.filter(e => e.sim).map(e => e.sim);
    add('All reference sims ported', simIds.length === ex.sims && simIds.every(id => A.sims.has(id)), simIds.filter(id => A.sims.has(id)).length + '/' + ex.sims);
    const wIds = A.index.filter(e => e.w).map(e => e.id);
    const wOk = wIds.filter(id => { const w = A.catalog.worked(id); return w && w.problem && w.without.length && w.with.length && w.takeaway; });
    add('All reference worked examples ported', wOk.length === ex.worked, wOk.length + '/' + ex.worked);
    const smoke = simIds.filter(id => {
      try {
        const run = () => {
          const $d = $('<div></div>');
          const m = A.sims.mount(id, $d, 'beginner');
          const first = A.sims.get(id).actions;
          A.sims.get(id).step(m.ctx, first ? first[0].id : 'step');
          const out = A.sims.get(id).random ? [m.ctx.rand(), m.ctx.rand(), m.ctx.rand()].join() : $d.find('.js-log').text();
          m.destroy();
          return out;
        };
        const a = run();
        const b = run();
        return A.sims.get(id).random ? a === b && a.length > 0 : true;
      } catch (err) { console.error(id, err); return false; }
    });
    add('Sims mount, run and reproduce with Seed on', smoke.length === simIds.length, smoke.length + '/' + simIds.length);

    add('No inline style attributes', $('#view [style], #sidebar [style], #topbar [style]').length === 0, $('[style]').length + ' elements with style');
    add('No inline event handlers', $('body *').filter(function () { return Array.from(this.attributes).some(a => /^on/i.test(a.name)); }).length === 0, 'on* attributes');
    const stray = Object.keys(window).filter(k => BASELINE.indexOf(k) === -1 && ALLOWED.indexOf(k) === -1);
    add('No stray globals', stray.length === 0, stray.length ? stray.join(', ') : 'only Atlas and libraries');
    add('Theme persisted', ['light', 'dark'].indexOf(A.store.get('theme', A.theme.get())) !== -1, 'theme=' + A.theme.get());
    add('Reduced-motion honoured by player', typeof A.util.reduced === 'function', 'matchMedia hook present');
    add('Renderer for every visual type', KIND.every(k => A.visuals.hasRenderer(k)), KIND.filter(k => A.visuals.hasRenderer(k)).length + '/' + KIND.length);

    const pass = rows.filter(r => r.result === 'PASS').length;
    console.table(rows);
    if (failures.length) console.warn('Atlas.verify failures:\n' + failures.join('\n'));
    console.log('Atlas.verify: ' + pass + '/' + rows.length + ' checks passed. Topics written: ' + A.topics.length + '/' + ex.topics + '.');
    return { pass, total: rows.length, written: A.topics.length, failures };
  };
})(window.Atlas, jQuery);
