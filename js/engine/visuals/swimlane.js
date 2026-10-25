/* timeline-swimlane: lanes for threads or transactions over a time axis. Blocks fill in as time advances, so blocking, waiting,
   overlapping work and race windows are visible. config: { lanes: [{id, label}], total, unit, blocks: [{lane, start, end, label, kind}],
   windows: [{start, end, label}] }. kind: run | wait | block | lock | race. state: { now } */
(function (A, $) {
  const V = A.visuals;
  const LANE = 54;
  const GUT = 110;
  const TOP = 34;

  V.register('timeline-swimlane', (topic, $body) => {
    const cfg = topic.visual.config;
    const W = 720;
    const H = TOP + cfg.lanes.length * LANE + 34;
    const X = t => GUT + t / cfg.total * (W - GUT - 20);
    const laneY = id => TOP + cfg.lanes.findIndex(l => l.id === id) * LANE;
    const $svg = V.root($body, W, H, 'Timeline with ' + cfg.lanes.length + ' lanes');
    const anim = V.anim();

    cfg.lanes.forEach((l, i) => {
      V.svg('rect', { x: 0, y: TOP + i * LANE, width: W, height: LANE, class: 'sw-lane' + (i % 2 ? ' is-alt' : '') }, $svg);
      V.text($svg, 10, TOP + i * LANE + LANE / 2 + 5, l.label, 'sv-label', 'start');
    });
    for (let t = 0; t <= cfg.total; t += cfg.total / 5) {
      V.svg('line', { x1: X(t), x2: X(t), y1: TOP - 6, y2: H - 28, class: 'sw-grid' }, $svg);
      V.text($svg, X(t), H - 10, Math.round(t) + (cfg.unit || ''), 'sv-sub');
    }
    (cfg.windows || []).forEach(w => {
      const g = V.svg('g', { class: 'sw-window min-int' }, $svg);
      V.svg('rect', { x: X(w.start), y: TOP - 6, width: X(w.end) - X(w.start), height: cfg.lanes.length * LANE + 6 }, g);
      V.text(g, (X(w.start) + X(w.end)) / 2, TOP - 12, w.label, 'sv-sub');
    });

    const blocks = cfg.blocks.map(b => {
      const cid = V.uid('clip');
      const $clip = V.svg('rect', { x: X(b.start), y: laneY(b.lane), height: LANE, width: 0 }, V.svg('clipPath', { id: cid }, V.svg('defs', null, $svg)));
      const $g = V.svg('g', { class: 'sw-block kind-' + (b.kind || 'run'), 'clip-path': 'url(#' + cid + ')' }, $svg);
      V.svg('rect', { x: X(b.start), y: laneY(b.lane) + 10, width: X(b.end) - X(b.start), height: LANE - 20, rx: 8 }, $g);
      V.text($g, (X(b.start) + X(b.end)) / 2, laneY(b.lane) + LANE / 2 + 4, b.label, 'sw-text');
      return { b, $clip, $g };
    });
    const $now = V.svg('line', { x1: X(0), x2: X(0), y1: TOP - 6, y2: H - 28, class: 'sw-now' }, $svg);
    const $nowLabel = V.text($svg, X(0), TOP - 12, 't=0', 'sw-now-label');
    let shown = 0;

    function paint(t) {
      $now.attr({ x1: X(t), x2: X(t) });
      $nowLabel.attr('x', X(t)).text('t=' + Math.round(t) + (cfg.unit || ''));
      blocks.forEach(({ b, $clip, $g }) => {
        const vis = Math.max(0, Math.min(b.end, t) - b.start);
        $clip.attr('width', X(b.start + vis) - X(b.start));
        $g.toggleClass('is-active', t >= b.start && t < b.end);
      });
    }

    function update(i) {
      const to = (topic.steps[i].state || {}).now || 0;
      const from = shown;
      anim.run(900, p => { shown = V.lerp(from, to, p); paint(shown); });
    }
    return { update, names: {}, legend: [{ tone: 'run', label: 'Running' }, { tone: 'wait', label: 'Waiting' }, { tone: 'lock', label: 'Holds a lock' }, { tone: 'race', label: 'Race window' }] };
  });
})(window.Atlas, jQuery);
