/* Connection pool playground: N requests each need a database connection for 100 ms. A pool caps concurrency and queues the rest;
   without a pool every request pays a 50 ms connect and opens its own connection. Deterministic. */
(function (A) {
  const MODES = ['Pooled', 'New connection per request'];
  const DB_LIMIT = 10;
  const SAY = {
    intro: {
      beginner: 'Opening a database connection is slow, like starting a car for every short trip. A pool keeps a few cars running and shares them.',
      intermediate: 'A pool reuses a fixed set of open connections. Extra requests wait in a queue instead of opening new connections.',
      expert: 'Pool size should match what the database can run in parallel, not the number of app threads. Too many connections cause context switching and memory use on the server.',
    },
    pooled: {
      beginner: 'Requests took turns using a few connections. Some waited, but the database stayed calm.',
      intermediate: 'Latency of the last request is waves x query time, where waves = ceil(requests / pool size). A bigger pool helps only until the database is saturated.',
      expert: 'Little\'s law: connections needed ≈ throughput x query time. Beyond the database\'s useful parallelism, a larger pool only moves the queue inside the database. Use a pooler such as PgBouncer to share connections across app instances.',
    },
    raw: {
      beginner: 'Every request opened its own connection. That is slow, and too many at once can overwhelm the database.',
      intermediate: 'Each request pays connection setup (TCP, TLS, auth) and the number of open connections grows with traffic until the server refuses new ones.',
      expert: 'Servers enforce max_connections (PostgreSQL default 100). Each PostgreSQL connection is a process with real memory cost, so thousands of direct connections degrade the whole database. // VERIFY defaults',
    },
  };

  function draw(ctx, active, queued) {
    const S = A.simviz;
    ctx.s.slots.forEach((g, i) => {
      S.tone(g, i < active ? 'ok' : '', i < active);
      g.toggleClass('is-dim', i >= ctx.param('pool'));
    });
    S.setBox(ctx.s.q, 'queue', queued + ' waiting');
    S.tone(ctx.s.q, queued ? 'warn' : '', queued > 0);
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 170, 'Connection pool slots and wait queue');
    ctx.s = { q: S.box($svg, 70, 85, 100, 60, 'queue', '0 waiting'), slots: Array.from({ length: 10 }, (_, i) => S.box($svg, 200 + (i % 5) * 62, 55 + Math.floor(i / 5) * 62, 52, 48, 'c' + (i + 1))) };
    draw(ctx, 0, 0);
    ['total', 'conns', 'waiting'].forEach(k => ctx.metric(k, '-'));
  }

  A.sims.register('conn-pool', {
    title: 'Connection pool: wait in line or overload the database',
    note: 'Each request holds a connection for 100 ms. Pool slots beyond the chosen size are greyed out.',
    intro: SAY.intro,
    controls: [
      { id: 'mode', label: 'Strategy', type: 'select', value: MODES[0], options: MODES },
      { id: 'pool', label: 'Pool size', type: 'range', min: 1, max: 10, value: 3, unit: '' },
      { id: 'req', label: 'Concurrent requests', type: 'range', min: 1, max: 20, value: 8, unit: '' },
    ],
    actions: [{ id: 'run', label: 'Send requests', icon: 'send', primary: true }],
    metrics: [{ id: 'total', label: 'Time for all' }, { id: 'conns', label: 'DB connections' }, { id: 'waiting', label: 'Queued at start' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const n = ctx.param('req');
      const pool = ctx.param('pool');
      if (ctx.param('mode') === MODES[0]) {
        const waves = Math.ceil(n / pool);
        draw(ctx, Math.min(n, pool), Math.max(0, n - pool));
        ctx.log(n + ' requests on ' + pool + ' connections: ' + waves + ' wave(s) of 100 ms', waves > 2 ? 'warn' : 'good');
        ctx.metric('total', waves * 100 + ' ms', waves > 2 ? 'warn' : 'ok');
        ctx.metric('conns', Math.min(n, pool), 'ok');
        ctx.metric('waiting', Math.max(0, n - pool), n > pool ? 'warn' : 'ok');
        ctx.say(SAY.pooled);
      } else {
        draw(ctx, 0, 0);
        ctx.log(n + ' requests each open a new connection (50 ms) and run (100 ms)', n > DB_LIMIT ? 'bad' : 'warn');
        ctx.metric('total', '150 ms', 'warn');
        ctx.metric('conns', n, n > DB_LIMIT ? 'bad' : 'warn');
        ctx.metric('waiting', 0, 'ok');
        if (n > DB_LIMIT) ctx.log('Illustrative database limit of ' + DB_LIMIT + ' connections exceeded: extra connects are refused', 'bad');
        ctx.say(SAY.raw);
      }
    },
  });
})(window.Atlas);
