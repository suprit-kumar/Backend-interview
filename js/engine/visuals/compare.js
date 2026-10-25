/* compare: two columns, "Without" and "With", that build up in sync step by step, with a marker where the two paths diverge.
   config: { left: {title}, right: {title} }. state: { without: [line], with: [line], diverge: true, verdict: {without, with} }
   A line is a string or { text, tone: bad|good|dim|plain }. Lines accumulate from step 0 to the current step. */
(function (A, $) {
  const V = A.visuals;
  const esc = A.util.esc;
  const norm = l => (typeof l === 'string' ? { text: l, tone: 'plain' } : l);

  V.register('compare', (topic, $body) => {
    const cfg = topic.visual.config;
    const side = (k, title, cls) => '<section class="cmp-col ' + cls + '" aria-label="' + esc(title) + '"><h3>' + esc(title) + '</h3><ol class="cmp-lines js-' + k + '"></ol><p class="cmp-verdict js-v-' + k + '"></p></section>';
    $body.html('<div class="cmp">' + side('without', (cfg.left || {}).title || 'Without the fix', 'is-without') +
      '<div class="cmp-mid" aria-hidden="true"><span class="cmp-badge js-div" hidden>Paths diverge</span></div>' +
      side('with', (cfg.right || {}).title || 'With the fix', 'is-with') + '</div>');

    function update(i) {
      let diverged = false;
      ['without', 'with'].forEach(k => {
        const rows = [];
        topic.steps.slice(0, i + 1).forEach((s, si) => {
          const st = s.state || {};
          if (st.diverge && k === 'without') diverged = true;
          [].concat(st[k] || []).map(norm).forEach(l => rows.push({ l, fresh: si === i }));
          if (st.diverge && si <= i) rows.push({ l: { text: '', tone: 'split' }, fresh: si === i });
        });
        $body.find('.js-' + k).html(rows.map(r => r.l.tone === 'split' ? '<li class="cmp-split" aria-hidden="true"></li>'
          : '<li class="tone-' + esc(r.l.tone || 'plain') + (r.fresh ? ' is-new' : '') + '">' + esc(r.l.text) + '</li>').join(''));
        const v = (topic.steps[i].state.verdict || {})[k];
        $body.find('.js-v-' + k).text(v || '').prop('hidden', !v);
      });
      $body.find('.js-div').prop('hidden', !diverged);
    }
    return { update, names: {}, legend: [{ tone: 'bad', label: 'Problem' }, { tone: 'good', label: 'Fixed behaviour' }] };
  });
})(window.Atlas, jQuery);
