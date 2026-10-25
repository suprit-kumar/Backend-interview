/* pipeline: stages in a row, a token that travels to the active stage, payload text under each stage.
   config: { stages: [{id, label, sub}] } (defaults to the step labels). state: { active: [ref], payload: { ref: 'text' } } */
(function (A, $) {
  const V = A.visuals;

  V.register('pipeline', (topic, $body) => {
    const cfg = topic.visual.config || {};
    const stages = cfg.stages && cfg.stages.length ? cfg.stages : topic.steps.map((s, i) => ({ id: 's' + i, label: s.label }));
    const n = stages.length;
    const gap = 30;
    const W = Math.max(640, n * 128);
    const w = (W - 40 - (n - 1) * gap) / n;
    const H = 190;
    const $svg = V.root($body, W, H, 'Pipeline with ' + n + ' stages');
    const arrow = V.arrow($svg);
    const cx = i => 20 + i * (w + gap) + w / 2;
    const $nodes = [];
    const $payload = [];
    const anim = V.anim();
    let tokenAt = cx(0);

    stages.forEach((s, i) => {
      if (i < n - 1) V.svg('line', { x1: cx(i) + w / 2 + 3, x2: cx(i + 1) - w / 2 - 3, y1: 70, y2: 70, class: 'viz-edge', 'marker-end': 'url(#' + arrow + ')' }, $svg);
      const $g = V.svg('g', { class: 'sv-node' }, $svg);
      V.svg('rect', { x: cx(i) - w / 2, y: 42, width: w, height: 56, rx: 12 }, $g);
      const rows = V.lines($g, cx(i), s.sub ? 66 : 74, s.label, Math.floor(w / 7.5), 'sv-label');
      if (s.sub) V.text($g, cx(i), 66 + rows * 15, s.sub, 'sv-sub min-int');
      $nodes.push($g);
      $payload.push(V.svg('g', { class: 'sv-payload min-int' }, $svg));
    });
    const $token = V.svg('circle', { r: 9, cx: tokenAt, cy: 24, class: 'viz-token' }, $svg);

    function update(i) {
      const st = topic.steps[i].state || {};
      const act = (st.active || []).map(r => V.ref(stages, r)).filter(k => k >= 0);
      const head = act.length ? Math.min.apply(null, act) : -1;
      $nodes.forEach(($g, k) => $g.toggleClass('is-active', act.indexOf(k) !== -1).toggleClass('is-done', act.indexOf(k) === -1 && k < head));
      $payload.forEach(($p, k) => {
        $p.empty();
        const pay = st.payload || {};
        const txt = pay[stages[k].id] !== undefined ? pay[stages[k].id] : pay[k];
        if (txt) V.lines($p, cx(k), 120, txt, Math.floor(w / 6.5), 'sv-pay');
      });
      if (head >= 0) {
        const from = tokenAt;
        const to = cx(head);
        anim.run(650, t => { tokenAt = V.lerp(from, to, t); $token.attr('cx', tokenAt); });
      }
    }
    return { update, names: stages.reduce((m, s, k) => { m[s.id] = s.label; m[k] = s.label; return m; }, {}) };
  }, [{ tone: 'active', label: 'Current stage' }, { tone: 'done', label: 'Already passed' }, { tone: 'token', label: 'Data moving through' }]);
})(window.Atlas, jQuery);
