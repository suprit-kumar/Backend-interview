/* data-structure kinds: table and tree.
   table  config: { columns: [], rows: [[...]] }. state: { rows: [index], cells: [[row, col]], dim: [index] }
   tree   config: { query, tree: { id, label, sub, kind, children: [...] } }. state: { active: [id], path: [id], badges: { id: 'text' } }
          The optional query becomes a pill above the root; ids are matched on node.id. */
(function (A, $) {
  const V = A.visuals;
  const esc = A.util.esc;

  V.ds.table = (topic, $body) => {
    const cfg = topic.visual.config;
    $body.html('<div class="ds-table-wrap"><table class="ds-table"><thead><tr>' + cfg.columns.map(c => '<th scope="col">' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      cfg.rows.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
    const $tr = $body.find('tbody tr');
    return {
      update(i) {
        const st = topic.steps[i].state || {};
        $tr.each(function (k) {
          $(this).toggleClass('is-active', (st.rows || []).indexOf(k) !== -1).toggleClass('is-dim', (st.dim || []).indexOf(k) !== -1);
          $(this).find('td').each(function (c) { $(this).toggleClass('is-cell', (st.cells || []).some(p => p[0] === k && p[1] === c)); });
        });
      },
      names: {},
      legend: [{ tone: 'active', label: 'Row being read' }],
    };
  };

  V.ds.tree = (topic, $body) => {
    const cfg = topic.visual.config;
    const NW = 100;
    const NH = 44;
    const GAPX = 14;
    const LV = 78;
    const root = cfg.query ? { id: 'query', label: cfg.query, kind: 'query', children: [cfg.tree] } : cfg.tree;
    let leaves = 0;
    let depth = 0;
    const flat = [];
    (function lay(n, d) {
      depth = Math.max(depth, d);
      if (!n.children || !n.children.length) { n.cx = leaves * (NW + GAPX) + NW / 2; leaves += 1; } else {
        n.children.forEach(c => lay(c, d + 1));
        n.cx = (n.children[0].cx + n.children[n.children.length - 1].cx) / 2;
      }
      n.cy = 30 + d * LV;
      flat.push(n);
    }(root, 0));
    const W = Math.max(640, leaves * (NW + GAPX) + 20);
    const H = 30 + depth * LV + NH + 24;
    const off = (W - (leaves * (NW + GAPX) - GAPX)) / 2;
    const $svg = V.root($body, W, H, 'Tree with ' + flat.length + ' nodes');
    flat.forEach(n => (n.children || []).forEach(c => {
      const p0 = V.edgePoint(n.cx + off, n.cy, NW / 2, NH / 2, c.cx + off, c.cy, 0);
      const p1 = V.edgePoint(c.cx + off, c.cy, NW / 2, NH / 2, n.cx + off, n.cy, 0);
      c.$edge = V.svg('line', { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, class: 'viz-edge' }, $svg);
    }));
    flat.forEach(n => {
      n.$g = V.svg('g', { class: 'sv-node kind-' + (n.kind || 'page') }, $svg);
      V.svg('rect', { x: n.cx + off - NW / 2, y: n.cy - NH / 2, width: NW, height: NH, rx: 9 }, n.$g);
      if (n.sub) { V.text(n.$g, n.cx + off, n.cy - 3, n.label, 'sv-label'); V.text(n.$g, n.cx + off, n.cy + 13, n.sub, 'sv-sub min-int'); } else V.text(n.$g, n.cx + off, n.cy + 5, n.label, 'sv-label');
    });
    const $badges = V.svg('g', null, $svg);

    function update(i) {
      const st = topic.steps[i].state || {};
      flat.forEach(n => {
        const on = (st.active || []).indexOf(n.id) !== -1;
        const seen = (st.path || []).indexOf(n.id) !== -1;
        n.$g.toggleClass('is-active', on).toggleClass('is-done', seen && !on).toggleClass('is-dim', !on && !seen && !!((st.active || []).length));
        if (n.$edge) n.$edge.toggleClass('is-live', on || seen);
      });
      $badges.empty();
      Object.keys(st.badges || {}).forEach(id => {
        const n = flat.find(x => x.id === id);
        if (n) V.text($badges, n.cx + off, n.cy + NH / 2 + 15, st.badges[id], 'sv-sub min-exp');
      });
    }
    return { update, names: flat.reduce((m, n) => { m[n.id] = n.label; return m; }, {}), legend: [{ tone: 'active', label: 'Visited now' }, { tone: 'done', label: 'Already visited' }, { tone: 'dim', label: 'Skipped' }] };
  };
})(window.Atlas, jQuery);
