/* sequence: actors with lifelines, numbered messages that draw and travel between them.
   config: { actors: [{id, label}] }. state: { messages: [{from, to, label, tone, back, detail}] } (messages added at this step; earlier ones stay). */
(function (A, $) {
  const V = A.visuals;
  const ROW = 46;
  const TOP = 78;

  V.register('sequence', (topic, $body) => {
    const actors = topic.visual.config.actors;
    const n = actors.length;
    const all = [];
    topic.steps.forEach((s, si) => ((s.state || {}).messages || []).forEach(m => all.push({ m, si })));
    const W = Math.max(640, n * 150);
    const H = TOP + Math.max(1, all.length) * ROW + 24;
    const x = a => 40 + (V.ref(actors, a) + 0.5) * ((W - 80) / n);
    const $svg = V.root($body, W, H, 'Sequence diagram with ' + n + ' actors');
    const arrow = V.arrow($svg);
    const $heads = [];
    const $layer = V.svg('g', null, $svg);
    const anim = V.anim();

    actors.forEach((a, i) => {
      V.svg('line', { x1: x(i), x2: x(i), y1: 48, y2: H - 10, class: 'sv-lifeline' }, $svg);
      const $g = V.svg('g', { class: 'sv-node' }, $svg);
      V.svg('rect', { x: x(i) - 56, y: 10, width: 112, height: 38, rx: 10 }, $g);
      V.text($g, x(i), 34, a.label, 'sv-label');
      $heads.push($g);
    });

    function draw(m, row, cur, p) {
      const y = TOP + row * ROW;
      const $g = V.svg('g', { class: 'sv-msg' + (cur ? ' is-active' : ' is-past') + (m.tone ? ' tone-' + m.tone : '') + (m.back ? ' is-back' : '') }, $layer);
      const x1 = x(m.from);
      const x2 = x(m.to);
      if (x1 === x2) {
        V.svg('path', { d: 'M' + x1 + ' ' + (y - 12) + ' h34 v24 h-34', class: 'viz-edge', 'marker-end': 'url(#' + arrow + ')', fill: 'none' }, $g);
        V.text($g, x1 + 42, y + 4, m.label, 'sv-edge-label', 'start');
      } else {
        const xe = V.lerp(x1, x2, p);
        const line = V.svg('line', { x1, y1: y, x2: xe, y2: y, class: 'viz-edge' }, $g);
        if (p >= 1) line.attr('marker-end', 'url(#' + arrow + ')');
        V.text($g, (x1 + x2) / 2, y - 8, m.label, 'sv-edge-label');
        if (cur && p < 1) V.svg('circle', { cx: xe, cy: y, r: 6, class: 'viz-token' }, $g);
        if (m.detail) V.text($g, (x1 + x2) / 2, y + 15, m.detail, 'sv-sub min-exp');
      }
      V.text($g, x1 + (x2 >= x1 ? -14 : 14), y + 4, String(row + 1), 'sv-num');
    }

    function update(i) {
      const shown = all.filter(a => a.si <= i);
      const fresh = shown.filter(a => a.si === i);
      const live = {};
      fresh.forEach(a => { live[a.m.from] = 1; live[a.m.to] = 1; });
      ((topic.steps[i].state || {}).active || []).forEach(k => { live[k] = 1; });
      $heads.forEach(($h, k) => $h.toggleClass('is-active', !!live[actors[k].id]));
      const paint = p => {
        $layer.empty();
        shown.forEach((a, row) => {
          const cur = a.si === i;
          draw(a.m, row, cur, cur ? Math.max(0, Math.min(1, p * fresh.length - fresh.indexOf(a))) : 1);
        });
      };
      if (fresh.length) anim.run(550 * fresh.length, paint); else { anim.stop(); paint(1); }
    }
    return { update, names: actors.reduce((m, a) => { m[a.id] = a.label; return m; }, {}) };
  }, [{ tone: 'active', label: 'Current message' }, { tone: 'done', label: 'Earlier message' }, { tone: 'bad', label: 'Failure' }]);
})(window.Atlas, jQuery);
