/* Big-O comparison: operations needed to find one item among n, by data structure and algorithm. */
(function (A) {
  const W = 520;
  const ROWS = [
    { id: 'linear', label: 'List scan  O(n)', tone: 'bad', ops: n => n },
    { id: 'binary', label: 'Binary search (sorted)  O(log n)', tone: 'ok', ops: n => Math.ceil(Math.log2(n + 1)) },
    { id: 'hash', label: 'Hash lookup (average)  O(1)', tone: 'ok', ops: () => 1 },
    { id: 'sort', label: 'Sort first, then search  O(n log n)', tone: 'warn', ops: n => Math.round(n * Math.log2(n)) },
  ];
  const SAY = {
    intro: {
      beginner: 'Finding a name in a list of 10 names is easy. In a list of a million, the way you search matters a lot.',
      intermediate: 'Big-O says how work grows with n. Scanning grows linearly, binary search grows with log n, a hash lookup stays about constant on average.',
      expert: 'Big-O hides constants and cache effects: for small n a linear scan over a contiguous array often beats a hash table. Hash tables are O(n) worst case under heavy collisions, and sorting only pays off if you search many times.',
    },
    run: {
      beginner: 'The bars use a log scale so the small ones stay visible. Notice how the red bar explodes as n grows.',
      intermediate: 'At this n the linear scan does n steps, binary search about log2(n), a hash lookup one. Sorting first costs n log n, so it only pays off for repeated searches.',
      expert: 'Choose by the dominant operation: many lookups favour a hash map, ordered range queries favour a sorted array or B-tree, and one-off lookups on small data favour a plain scan.',
    },
  };

  function draw(ctx) {
    const n = ctx.param('n');
    const V = A.visuals;
    const $svg = A.simviz.stage(ctx.$viz, W, 40 + ROWS.length * 42, 'Operations by method, log scale');
    ROWS.forEach((r, i) => {
      const ops = r.ops(n);
      const w = Math.max(4, (Math.log10(ops + 1) / Math.log10(1e5)) * 300);
      const y = 20 + i * 42;
      V.text($svg, 10, y, r.label, 'sx-cap', 'start');
      V.svg('rect', { x: 10, y: y + 6, width: w, height: 14, rx: 4, class: 'sx-bar tone-' + r.tone }, $svg);
      V.text($svg, 18 + w, y + 18, ops.toLocaleString() + ' ops', 'sx-txt', 'start');
      ctx.metric(r.id, ops.toLocaleString(), r.tone === 'bad' ? 'bad' : '');
    });
  }

  A.sims.register('big-o', {
    title: 'Big-O in practice: finding one item among n',
    note: 'Bars use a log scale. Slide n up and watch which methods stay flat.',
    intro: SAY.intro,
    controls: [{ id: 'n', label: 'Items (n)', type: 'range', min: 10, max: 100000, step: 10, value: 1000 }],
    actions: [{ id: 'run', label: 'Compare methods', icon: 'bar-chart-line', primary: true }],
    metrics: ROWS.map(r => ({ id: r.id, label: r.label.split('  ')[0] })),
    init: draw,
    onParam(ctx) { draw(ctx); },
    step(ctx) {
      draw(ctx);
      ctx.log('n = ' + ctx.param('n').toLocaleString() + ': scan ' + ROWS[0].ops(ctx.param('n')).toLocaleString() + ' vs hash 1', 'dim');
      ctx.say(SAY.run);
    },
  });
})(window.Atlas);
