/* data-structure kinds: stack-heap, log, ring.
   stack-heap config: { stackTitle, heapTitle }. state: { stack: [{label, ref}], heap: [{id, label}], active: [id] } (ref points at a heap id)
   log        config: { }. state: { logs: [{name, records: [text], marks: { 'consumer A': offset }}], active: [[logIndex, offset]] }
   ring       config: { nodes: [{id, label, pos}] } pos 0-100 around the circle. state: { keys: [{label, pos}], failed: [id], active: [id] }
              A key belongs to the first node clockwise from its position. */
(function (A, $) {
  const V = A.visuals;
  const esc = A.util.esc;

  V.ds['stack-heap'] = (topic, $body) => {
    const cfg = topic.visual.config;
    $body.html('<div class="ds-mem"><section aria-label="Stack"><h3>' + esc(cfg.stackTitle || 'Stack') + '</h3><ol class="ds-boxes js-stack"></ol></section>' +
      '<section aria-label="Heap"><h3>' + esc(cfg.heapTitle || 'Heap') + '</h3><ul class="ds-boxes js-heap"></ul></section></div>');
    return {
      update(i) {
        const st = topic.steps[i].state || {};
        const on = id => (st.active || []).indexOf(id) !== -1;
        $body.find('.js-stack').html((st.stack || []).map(s => '<li class="' + (on(s.label) ? 'is-active' : '') + '"><b>' + esc(s.label) + '</b>' +
          (s.ref ? '<span class="min-int">&rarr; ' + esc(s.ref) + '</span>' : '') + '</li>').join('')).toggleClass('is-empty', !(st.stack || []).length);
        $body.find('.js-heap').html((st.heap || []).map(h => '<li class="' + (on(h.id) ? 'is-active' : '') + '"><b>' + esc(h.label) + '</b><span class="min-int">' + esc(h.id) + '</span></li>').join(''));
      },
      names: {},
      legend: [{ tone: 'active', label: 'Changed or in use' }],
    };
  };

  V.ds.log = (topic, $body) => {
    $body.html('<div class="ds-logs"></div>');
    return {
      update(i) {
        const st = topic.steps[i].state || {};
        const act = st.active || [];
        $body.find('.ds-logs').html((st.logs || []).map((lg, li) => '<div class="ds-log"><h3>' + esc(lg.name) + '</h3><ol>' +
          lg.records.map((r, off) => {
            const marks = Object.keys(lg.marks || {}).filter(k => lg.marks[k] === off);
            return '<li class="' + (act.some(p => p[0] === li && p[1] === off) ? 'is-active' : '') + '"><span class="off">' + off + '</span><span>' + esc(r) + '</span>' +
              (marks.length ? '<em class="min-int">' + marks.map(esc).join(', ') + '</em>' : '') + '</li>';
          }).join('') + '</ol></div>').join(''));
      },
      names: {},
      legend: [{ tone: 'active', label: 'Record just written or read' }],
    };
  };

  V.ds.ring = (topic, $body) => {
    const cfg = topic.visual.config;
    const S = 300;
    const R = 105;
    const pt = (pos, r) => ({ x: S / 2 + (r || R) * Math.sin(pos / 100 * 2 * Math.PI), y: S / 2 - (r || R) * Math.cos(pos / 100 * 2 * Math.PI) });
    const $svg = V.root($body, S, S, 'Hash ring with ' + cfg.nodes.length + ' nodes');
    V.svg('circle', { cx: S / 2, cy: S / 2, r: R, class: 'rg-ring', fill: 'none' }, $svg);
    const sorted = cfg.nodes.slice().sort((a, b) => a.pos - b.pos);
    const $n = cfg.nodes.map(n => {
      const p = pt(n.pos);
      const $g = V.svg('g', { class: 'sv-node' }, $svg);
      V.svg('circle', { cx: p.x, cy: p.y, r: 20 }, $g);
      V.text($g, p.x, p.y + 4, n.label, 'sv-label');
      return $g;
    });
    const $keys = V.svg('g', null, $svg);
    const owner = pos => sorted.find(n => n.pos >= pos) || sorted[0];

    function update(i) {
      const st = topic.steps[i].state || {};
      cfg.nodes.forEach((n, k) => $n[k].toggleClass('is-active', (st.active || []).indexOf(n.id) !== -1).toggleClass('is-failed', (st.failed || []).indexOf(n.id) !== -1));
      $keys.empty();
      (st.keys || []).forEach(key => {
        const live = sorted.filter(n => (st.failed || []).indexOf(n.id) === -1);
        const o = live.find(n => n.pos >= key.pos) || live[0];
        const a = pt(key.pos, R);
        const b = pt(key.pos, R + 36);
        V.svg('circle', { cx: a.x, cy: a.y, r: 5, class: 'rg-key' }, $keys);
        V.text($keys, b.x, b.y + 4, key.label, 'sv-sub');
        if (o) { const t = pt(o.pos, R); V.svg('line', { x1: a.x, y1: a.y, x2: t.x, y2: t.y, class: 'rg-link min-int' }, $keys); }
      });
    }
    return { update, names: cfg.nodes.reduce((m, n) => { m[n.id] = n.label; return m; }, {}), legend: [{ tone: 'active', label: 'Node serving a key' }, { tone: 'bad', label: 'Failed node' }] };
  };
})(window.Atlas, jQuery);
