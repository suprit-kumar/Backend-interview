/* state-machine: states as nodes, labelled transition arrows, pulsing current state, travelling dot on the live transition, history trail.
   config: { nodes: [{id, label, sub, tone, x, y}], edges: [{from, to, label}] } (x, y optional, 0-100). state: { active: [id], edge: index } */
(function (A, $) {
  const V = A.visuals;
  const W = 640;
  const H = 300;
  const HW = 66;
  const HH = 30;

  V.register('state-machine', (topic, $body) => {
    const cfg = topic.visual.config;
    const nodes = cfg.nodes;
    const n = nodes.length;
    const pos = nodes.map((nd, i) => {
      if (nd.x !== undefined) return { x: nd.x / 100 * W, y: nd.y / 100 * H };
      if (n <= 2) return { x: W * (i + 1) / (n + 1), y: H / 2 };
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return { x: W / 2 + 210 * Math.cos(a), y: H / 2 + 98 * Math.sin(a) };
    });
    const $svg = V.root($body, W, H, 'State machine with ' + n + ' states');
    const arrow = V.arrow($svg);
    const $trail = $('<ol class="viz-trail" aria-label="History of states"></ol>').appendTo($body);
    const anim = V.anim();

    const edges = (cfg.edges || []).map(e => {
      const a = pos[V.ref(nodes, e.from)];
      const b = pos[V.ref(nodes, e.to)];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const c = { x: mx - (b.y - a.y) / len * 46, y: my + (b.x - a.x) / len * 46 };
      const p0 = V.edgePoint(a.x, a.y, HW, HH, c.x, c.y, 4);
      const p2 = V.edgePoint(b.x, b.y, HW, HH, c.x, c.y, 6);
      const $g = V.svg('g', { class: 'sv-edge' }, $svg);
      V.svg('path', { d: 'M' + p0.x + ' ' + p0.y + ' Q' + c.x + ' ' + c.y + ' ' + p2.x + ' ' + p2.y, class: 'viz-edge', fill: 'none', 'marker-end': 'url(#' + arrow + ')' }, $g);
      V.text($g, 0.25 * p0.x + 0.5 * c.x + 0.25 * p2.x, 0.25 * p0.y + 0.5 * c.y + 0.25 * p2.y, e.label || '', 'sv-edge-label min-int');
      return { e, p0, c, p2, $g };
    });

    const $nodes = nodes.map((nd, i) => {
      const $g = V.svg('g', { class: 'sv-node tone-' + (nd.tone || 'none') }, $svg);
      V.svg('rect', { x: pos[i].x - HW, y: pos[i].y - HH, width: HW * 2, height: HH * 2, rx: 14 }, $g);
      V.text($g, pos[i].x, pos[i].y + (nd.sub ? -3 : 5), nd.label, 'sv-label');
      if (nd.sub) V.text($g, pos[i].x, pos[i].y + 14, nd.sub, 'sv-sub min-int');
      return $g;
    });
    const $dot = V.svg('circle', { r: 7, class: 'viz-token', cx: -20, cy: -20 }, $svg);
    const stateOf = i => V.ref(nodes, ((topic.steps[i].state || {}).active || [])[0]);

    function update(i) {
      const cur = stateOf(i);
      const prev = i > 0 ? stateOf(i - 1) : -1;
      $nodes.forEach(($g, k) => $g.toggleClass('is-active', k === cur));
      let live = (topic.steps[i].state || {}).edge;
      if (live === undefined) live = edges.findIndex(ed => V.ref(nodes, ed.e.from) === prev && V.ref(nodes, ed.e.to) === cur);
      edges.forEach((ed, k) => ed.$g.toggleClass('is-live', k === live));
      $dot.attr({ cx: -20, cy: -20 });
      if (live >= 0) {
        const { p0, c, p2 } = edges[live];
        anim.run(700, t => {
          const u = 1 - t;
          $dot.attr({ cx: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, cy: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y });
        }, () => $dot.attr({ cx: -20, cy: -20 }));
      } else anim.stop();
      const trail = [];
      for (let k = 0; k <= i; k += 1) {
        const s = stateOf(k);
        if (s >= 0 && s !== trail[trail.length - 1]) trail.push(s);
      }
      $trail.html(trail.map((s, k) => '<li' + (k === trail.length - 1 ? ' class="is-now" aria-current="true"' : '') + '>' + A.util.esc(nodes[s].label) + '</li>').join(''));
    }
    return { update, names: nodes.reduce((m, nd) => { m[nd.id] = nd.label; return m; }, {}) };
  }, [{ tone: 'active', label: 'Current state' }, { tone: 'live', label: 'Transition just taken' }]);
})(window.Atlas, jQuery);
