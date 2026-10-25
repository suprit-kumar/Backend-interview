/* chart: SVG line or bar chart whose values tween when a step changes them (latency vs load, Big-O curves, throughput).
   config: { kind: line|bar, xLabel, yLabel, unit, x: [labels], yMax, series: [{id, label, tone, values}] }.
   state: { series: { id: [values] }, hide: [id], mark: xIndex } overrides the config values for that step. */
(function (A, $) {
  const V = A.visuals;
  const W = 640;
  const H = 320;
  const M = { l: 58, r: 20, t: 20, b: 52 };
  const TONES = ['primary', 'accent', 'ok', 'warn', 'bad'];

  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
    return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= v) || v;
  }

  V.register('chart', (topic, $body) => {
    const cfg = topic.visual.config;
    const bar = cfg.kind === 'bar';
    const n = cfg.x.length;
    const series = cfg.series.map((s, i) => ({ s, tone: s.tone || TONES[i % TONES.length], now: s.values.slice() }));
    let top = cfg.yMax || 0;
    cfg.series.forEach(s => s.values.forEach(v => { top = Math.max(top, v); }));
    topic.steps.forEach(st => Object.keys((st.state || {}).series || {}).forEach(id => st.state.series[id].forEach(v => { top = Math.max(top, v); })));
    const yMax = niceMax(top);
    const px = i => M.l + (bar ? (i + 0.5) : i / Math.max(1, n - 1)) * (W - M.l - M.r) / (bar ? n : 1);
    const py = v => H - M.b - v / yMax * (H - M.t - M.b);
    const $svg = V.root($body, W, H, (bar ? 'Bar' : 'Line') + ' chart: ' + (cfg.yLabel || ''));
    const anim = V.anim();

    for (let k = 0; k <= 4; k += 1) {
      const v = yMax * k / 4;
      V.svg('line', { x1: M.l, x2: W - M.r, y1: py(v), y2: py(v), class: 'sw-grid' }, $svg);
      V.text($svg, M.l - 8, py(v) + 4, Math.round(v * 100) / 100 + (cfg.unit || ''), 'sv-sub', 'end');
    }
    cfg.x.forEach((lab, i) => V.text($svg, px(i), H - M.b + 18, lab, 'sv-sub'));
    V.text($svg, (M.l + W - M.r) / 2, H - 8, cfg.xLabel || '', 'sv-sub-strong');
    V.text($svg, 14, H / 2, cfg.yLabel || '', 'sv-sub-strong').attr('transform', 'rotate(-90 14 ' + H / 2 + ')');
    const $mark = V.svg('line', { y1: M.t, y2: H - M.b, class: 'ch-mark', visibility: 'hidden' }, $svg);
    const $plot = V.svg('g', null, $svg);
    const $dots = V.svg('g', null, $svg);

    function paint() {
      $plot.empty();
      $dots.empty();
      const live = series.filter(o => !o.hide);
      live.forEach((o, si) => {
        if (bar) {
          const bw = (W - M.l - M.r) / n / (live.length + 1);
          o.now.forEach((v, i) => V.svg('rect', { x: px(i) - bw * live.length / 2 + si * bw, y: py(v), width: bw - 3, height: Math.max(0, H - M.b - py(v)), rx: 3, class: 'ch-bar tone-' + o.tone }, $plot));
        } else {
          V.svg('path', { d: o.now.map((v, i) => (i ? 'L' : 'M') + px(i) + ' ' + py(v)).join(' '), class: 'ch-line tone-' + o.tone, fill: 'none' }, $plot);
          o.now.forEach((v, i) => V.svg('circle', { cx: px(i), cy: py(v), r: 3.5, class: 'ch-dot tone-' + o.tone }, $dots));
        }
      });
    }

    function update(i) {
      const st = topic.steps[i].state || {};
      const from = series.map(o => o.now.slice());
      const to = series.map(o => ((st.series || {})[o.s.id] || o.s.values));
      series.forEach(o => { o.hide = (st.hide || []).indexOf(o.s.id) !== -1; });
      $mark.attr('visibility', st.mark === undefined ? 'hidden' : 'visible').attr({ x1: px(st.mark || 0), x2: px(st.mark || 0) });
      anim.run(700, t => { series.forEach((o, k) => { o.now = to[k].map((v, j) => V.lerp(from[k][j] === undefined ? v : from[k][j], v, t)); }); paint(); });
    }
    return { update, names: {}, legend: series.map(o => ({ tone: o.tone, label: o.s.label })) };
  });
})(window.Atlas, jQuery);
