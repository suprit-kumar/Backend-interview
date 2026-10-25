/* Pure HTML builders for the topic page sections. No DOM access, so they can be re-run on level change. */
(function (A) {
  const esc = A.util.esc;
  const md = A.util.md;
  const li = items => (items || []).map(x => '<li>' + md(x) + '</li>').join('');
  const list = (title, items) => (items && items.length ? '<h3>' + title + '</h3><ul>' + li(items) + '</ul>' : '');

  A.sections = {
    concept(topic, level) {
      const L = topic.levels[level];
      if (level === 'beginner') {
        return '<div class="prose"><div class="analogy"><strong>Analogy.</strong> ' + md(L.analogy) + '</div><p>' + md(L.explanation) + '</p>' +
          '<h3>Key terms</h3><dl class="terms">' + L.keyTerms.map(k => '<div><dt>' + esc(k.term) + '</dt><dd>' + md(k.meaning) + '</dd></div>').join('') + '</dl></div>';
      }
      if (level === 'intermediate') {
        return '<div class="prose"><p>' + md(L.explanation) + '</p>' + list('How it works', L.howItWorks).replace('<ul>', '<ol>').replace('</ul>', '</ol>') + '</div>';
      }
      return '<div class="prose">' + list('Internals', L.internals) + list('Scaling notes', L.scalingNotes) +
        list('Real systems', L.realSystems) + list('Numbers to know', L.numbersToKnow) + '</div>';
    },

    tradeoffs(topic) {
      const t = topic.levels.intermediate.tradeoffs;
      return '<div class="two-col"><div class="trade trade-use"><h3>' + A.util.icon('check-circle-fill') + 'Use it when</h3><ul>' + li(t.use) + '</ul></div>' +
        '<div class="trade trade-avoid"><h3>' + A.util.icon('x-circle-fill') + 'Avoid it when</h3><ul>' + li(t.avoid) + '</ul></div></div>';
    },

    mistakes(topic, level) {
      const items = (topic.levels.intermediate.pitfalls || []).concat(level === 'expert' ? topic.levels.expert.failureModes || [] : []);
      return '<ul class="pitfalls">' + items.map(x => '<li>' + A.util.icon('exclamation-triangle-fill') + '<span>' + md(x) + '</span></li>').join('') + '</ul>';
    },

    interview(topic, level, all) {
      const qs = topic.interview.filter(q => all || q.level === level);
      return qs.map(q =>
        '<details class="qa"><summary><span class="lvl-badge lvl-' + esc(q.level) + '">' + esc(q.level) + '</span><span>' + md(q.q) + '</span></summary>' +
        '<div class="qa-body"><p class="qa-label">Model answer</p><p>' + md(q.answer) + '</p>' +
        (q.followUps && q.followUps.length ? '<p class="qa-label">Follow-up questions</p><ul>' + li(q.followUps) + '</ul>' : '') + '</div></details>').join('');
    },

    chips(ids, prefix) {
      return ids.map(A.catalog.entry).filter(Boolean).map(e =>
        '<a class="chip" href="#/topic/' + esc(e.id) + '">' + (prefix || '') + esc(e.t) + '</a>').join('');
    },

    relatedCards(ids) {
      return ids.map(A.catalog.entry).filter(Boolean).map(e => {
        const cat = A.catalog.cat(e.c);
        return '<a class="topic-card cat-' + e.c + '" href="#/topic/' + esc(e.id) + '"><div class="tc-top"><span class="chip chip-cat">' + esc(cat.name) + '</span></div>' +
          '<h3>' + esc(e.t) + '</h3><p class="mb-0">' + esc(e.d) + '</p></a>';
      }).join('');
    },

    pager(id) {
      const p = A.catalog.prev(id);
      const n = A.catalog.next(id);
      return '<nav class="pager" aria-label="Previous and next topic">' +
        (p ? '<a class="prev" href="#/topic/' + esc(p.id) + '" rel="prev"><small>&larr; Previous</small>' + esc(p.t) + '</a>' : '<span></span>') +
        (n ? '<a class="next" href="#/topic/' + esc(n.id) + '" rel="next"><small>Next &rarr;</small>' + esc(n.t) + '</a>' : '') + '</nav>';
    },
  };
})(window.Atlas);
