/* topology: nodes and edges with packets that travel along them. Failed nodes turn red; packet colour shows success or failure.
   config: { nodes: [{id, label, kind: client|lb|service|db|cache|queue, x, y}], edges: [{from, to}] } (x, y are 0-100).
   state: { packets: [{from, to, tone: ok|bad, label}], failed: [id], active: [id], badges: { id: 'text' } } (badges show at Expert) */
(function (A, $) {
  const V = A.visuals;
  const W = 640;
  const HW = 54;
  const HH = 23;
  const TAG = { client: 'CLIENT', lb: 'LB', service: 'SERVICE', db: 'DB', cache: 'CACHE', queue: 'QUEUE' };

  V.register('topology', (topic, $body) => {
    const cfg = topic.visual.config;
    const nodes = cfg.nodes;
    const H = cfg.height || 300;
    const pos = nodes.map((nd, i) => (nd.x !== undefined ? { x: nd.x / 100 * W, y: nd.y / 100 * H } : { x: W * (i + 0.5) / nodes.length, y: H / 2 }));
    const at = id => pos[V.ref(nodes, id)];
    const $svg = V.root($body, W, H, 'Topology with ' + nodes.length + ' nodes');
    const arrow = V.arrow($svg);
    (cfg.edges || []).forEach(e => {
      const a = at(e.from);
      const b = at(e.to);
      const p0 = V.edgePoint(a.x, a.y, HW, HH, b.x, b.y, 3);
      const p1 = V.edgePoint(b.x, b.y, HW, HH, a.x, a.y, 3);
      V.svg('line', { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, class: 'viz-edge', 'marker-end': e.directed ? 'url(#' + arrow + ')' : null }, $svg);
    });
    const $nodes = nodes.map((nd, i) => {
      const $g = V.svg('g', { class: 'sv-node kind-' + (nd.kind || 'service') }, $svg);
      V.svg('rect', { x: pos[i].x - HW, y: pos[i].y - HH, width: HW * 2, height: HH * 2, rx: 10 }, $g);
      V.text($g, pos[i].x, pos[i].y - 4, TAG[nd.kind] || '', 'sv-tag min-int');
      V.text($g, pos[i].x, pos[i].y + 12, nd.label, 'sv-label');
      return $g;
    });
    const $badges = V.svg('g', null, $svg);
    const $packets = V.svg('g', null, $svg);
    const anim = V.anim();

    function update(i) {
      const st = topic.steps[i].state || {};
      $nodes.forEach(($g, k) => $g.toggleClass('is-active', (st.active || []).indexOf(nodes[k].id) !== -1).toggleClass('is-failed', (st.failed || []).indexOf(nodes[k].id) !== -1));
      $badges.empty();
      Object.keys(st.badges || {}).forEach(id => { const p = at(id); V.text($badges, p.x, p.y + HH + 16, st.badges[id], 'sv-sub min-exp'); });
      $packets.empty();
      const pk = (st.packets || []).map(p => {
        const a = at(p.from);
        const b = at(p.to);
        const $g = V.svg('g', { class: 'sv-packet tone-' + (p.tone || 'ok') }, $packets);
        const $c = V.svg('circle', { r: 8, cx: a.x, cy: a.y }, $g);
        const $t = p.label ? V.text($g, a.x, a.y - 14, p.label, 'sv-sub') : null;
        return { a, b, $c, $t };
      });
      if (!pk.length) { anim.stop(); return; }
      anim.run(900, t => pk.forEach((p, k) => {
        const q = Math.max(0, Math.min(1, t * (1 + 0.3 * k) - 0.1 * k));
        const x = V.lerp(p.a.x, p.b.x, q);
        const y = V.lerp(p.a.y, p.b.y, q);
        p.$c.attr({ cx: x, cy: y });
        if (p.$t) p.$t.attr({ x, y: y - 14 });
      }));
    }
    return { update, names: nodes.reduce((m, nd) => { m[nd.id] = nd.label; return m; }, {}) };
  }, [{ tone: 'ok', label: 'Successful request' }, { tone: 'bad', label: 'Failed request or node' }, { tone: 'active', label: 'Busy node' }]);
})(window.Atlas, jQuery);
