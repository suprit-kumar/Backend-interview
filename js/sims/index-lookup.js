/* Index lookup playground on the shared sim chrome: full table scan vs binary search (what a B-tree does per node) over 32 sorted ids. */
(function (A) {
  const VALUES = Array.from({ length: 32 }, (_, i) => (i + 1) * 5);

  const SAY = {
    Scan: {
      beginner: 'Without an index the database reads every row from the top until it finds your id, like checking every page of a book.',
      intermediate: 'A full table scan examines rows one by one: O(n). It is fine for tiny tables but slow as the table grows.',
      expert: 'Scans are sometimes the right plan: on small tables or when most rows match, a sequential scan beats random index lookups. The planner decides from statistics.',
    },
    Index: {
      beginner: 'With an index the database jumps around like opening a dictionary in the middle, so it checks far fewer rows.',
      intermediate: 'Binary search halves the range each step: O(log n). A B-tree applies the same idea once per node.',
      expert: 'Real B-trees have a high fanout, so a lookup is usually only a few page reads even for millions of rows. Every index also costs extra writes and storage.',
    },
  };

  function binaryPath(target) {
    const path = [];
    let lo = 0;
    let hi = VALUES.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      path.push(mid);
      if (VALUES[mid] === target) break;
      if (VALUES[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return path;
  }

  function run(ctx, path, ms, label) {
    ctx.clear();
    const $cells = ctx.$viz.find('.cell').removeClass('is-visited is-found');
    const target = ctx.param('target');
    let n = 0;
    const step = () => {
      const j = path[n];
      n += 1;
      $cells.eq(j).addClass(VALUES[j] === target ? 'is-found' : 'is-visited');
      ctx.metric(label === 'Scan' ? 'scan' : 'index', n, label === 'Scan' ? 'bad' : 'ok');
      ctx.s[label] = n;
      if (ctx.s.Scan && ctx.s.Index) ctx.metric('speedup', (ctx.s.Scan / ctx.s.Index).toFixed(1) + 'x');
    };
    ctx.log(label + ' for id ' + target + ' started');
    ctx.say(SAY[label]);
    if (ctx.reduced) { while (n < path.length) step(); } else {
      const t = ctx.every(ms, () => { if (n >= path.length) clearInterval(t); else step(); });
    }
  }

  A.sims.register('index-lookup', {
    title: 'Find a row: scan vs index',
    note: 'Run both on the same id and compare rows examined. Binary search is the idea inside every B-tree node.',
    intro: { beginner: 'Pick a scan or an index lookup and watch how many rows get checked.', intermediate: 'Compare rows examined for O(n) scan vs O(log n) search.', expert: 'Compare the access paths. Remember the planner picks one from statistics, not from habit.' },
    controls: [{ id: 'target', label: 'Find id', type: 'select', value: 80, options: [15, 80, 155] }],
    actions: [
      { id: 'scan', label: 'Full table scan' },
      { id: 'index', label: 'Use index (binary search)', primary: true },
    ],
    metrics: [{ id: 'scan', label: 'Rows examined (scan)' }, { id: 'index', label: 'Rows examined (index)' }, { id: 'speedup', label: 'Speedup' }],
    view: '<div class="cells" aria-label="Table rows">' + VALUES.map(v => '<span class="cell">' + v + '</span>').join('') + '</div>',
    onParam(ctx) { ctx.s = {}; ctx.clear(); ctx.$viz.find('.cell').removeClass('is-visited is-found'); },
    reset(ctx) { ctx.$viz.find('.cell').removeClass('is-visited is-found'); },
    step(ctx, act) {
      const target = ctx.param('target');
      if (act === 'scan') run(ctx, VALUES.slice(0, VALUES.indexOf(target) + 1).map((_, i) => i), 110, 'Scan');
      else run(ctx, binaryPath(target), 500, 'Index');
    },
  });
})(window.Atlas);
