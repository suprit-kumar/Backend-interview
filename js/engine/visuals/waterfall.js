/* waterfall: horizontal span bars for distributed tracing. config: { total, unit, spans: [{id, label, service, start, end, depth, tone, note}] }.
   state: { upto } reveals the trace up to that time; spans grow as time passes. note shows at Expert. */
(function (A, $) {
  const V = A.visuals;
  const ROW = 34;
  const GUT = 190;

  V.register('waterfall', (topic, $body) => {
    const cfg = topic.visual.config;
    const W = 720;
    const H = 30 + cfg.spans.length * ROW + 30;
    const X = t => GUT + t / cfg.total * (W - GUT - 70);
    const $svg = V.root($body, W, H, 'Trace waterfall with ' + cfg.spans.length + ' spans');
    const anim = V.anim();
    for (let t = 0; t <= cfg.total; t += cfg.total / 5) {
      V.svg('line', { x1: X(t), x2: X(t), y1: 18, y2: H - 24, class: 'sw-grid' }, $svg);
      V.text($svg, X(t), H - 8, Math.round(t) + (cfg.unit || 'ms'), 'sv-sub');
    }
    const rows = cfg.spans.map((s, i) => {
      const y = 30 + i * ROW;
      const $g = V.svg('g', { class: 'wf-span tone-' + (s.tone || 'ok') }, $svg);
      V.text($g, 10 + (s.depth || 0) * 14, y + 17, (s.service ? s.service + ': ' : '') + s.label, 'wf-label', 'start');
      const $bar = V.svg('rect', { x: X(s.start), y: y + 4, width: 0, height: 20, rx: 5 }, $g);
      const $dur = V.text($g, X(s.end) + 6, y + 19, s.end - s.start + (cfg.unit || 'ms'), 'sv-sub min-int', 'start');
      const $note = s.note ? V.text($g, X(s.start) + 6, y + 19, s.note, 'wf-note min-exp', 'start') : null;
      return { s, $g, $bar, $dur, $note };
    });

    function paint(t) {
      rows.forEach(({ s, $g, $bar, $dur }) => {
        const w = Math.max(0, Math.min(s.end, t) - s.start);
        $bar.attr('width', Math.max(0, X(s.start + w) - X(s.start)));
        $g.toggleClass('is-hidden', t < s.start).toggleClass('is-active', t >= s.start && t < s.end);
        $dur.attr('visibility', t >= s.end ? 'visible' : 'hidden');
      });
    }
    let shown = 0;
    function update(i) {
      const to = (topic.steps[i].state || {}).upto || 0;
      const from = shown;
      anim.run(800, p => { shown = V.lerp(from, to, p); paint(shown); });
    }
    return { update, names: {}, legend: [{ tone: 'ok', label: 'Normal span' }, { tone: 'warn', label: 'Slow span' }, { tone: 'bad', label: 'Error span' }] };
  });
})(window.Atlas, jQuery);
