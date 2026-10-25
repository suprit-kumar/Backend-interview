/* Kafka consumer group: 3 partitions, up to 4 consumers. Each partition goes to exactly one consumer; extra consumers sit idle. */
(function (A) {
  const PR = { x: 50, y: 105 };
  const PART = [{ x: 220, y: 45 }, { x: 220, y: 105 }, { x: 220, y: 165 }];
  const CONS = [0, 1, 2, 3].map(i => ({ x: 450, y: 30 + i * 50 }));
  const SAY = {
    intro: {
      beginner: 'A topic is split into lanes called partitions. Workers in one group share the lanes, and no lane is shared by two workers.',
      intermediate: 'Within a consumer group each partition is read by exactly one consumer. More consumers than partitions leaves the extras idle.',
      expert: 'Partitions are the unit of parallelism and of ordering: order is guaranteed only within a partition. Changing group membership triggers a rebalance, during which consumption can pause (cooperative rebalancing reduces this). RabbitMQ differs: competing consumers share one queue instead.',
    },
    idle: {
      beginner: 'There are more workers than lanes, so one worker has nothing to do.',
      intermediate: 'With 4 consumers and 3 partitions, Consumer 4 sits idle: each partition has at most one consumer per group.',
      expert: 'To scale consumption beyond the partition count you must add partitions, which changes key-to-partition mapping and can break per-key ordering for existing keys.',
    },
    prod: {
      beginner: 'Messages were dropped into lanes one after another, and each lane\'s worker picked its messages up.',
      intermediate: 'Messages are spread across partitions here by a round-robin (i % 3). Real producers usually hash the key, so the same key always lands on the same partition.',
      expert: 'Keyed hashing preserves per-key order but can create hot partitions if keys are skewed. Watch consumer lag per partition.',
    },
  };

  function owner(p, c) { return p % c; }

  function draw(ctx, tween) {
    const s = ctx.s;
    const c = ctx.param('cons');
    s.cons.forEach((g, i) => {
      A.simviz.tone(g, i < c ? '' : 'warn', i < c);
      g.toggleClass('is-dim', i >= c);
      A.simviz.setBox(g, 'Consumer ' + (i + 1), i < c ? 'active' : 'idle');
    });
    s.lines.forEach((l, p) => {
      const to = CONS[owner(p, c)];
      if (tween && !ctx.reduced) {
        const from = { x: +l.attr('x2'), y: +l.attr('y2') };
        ctx.anim().run(400, t => l.attr({ x2: A.visuals.lerp(from.x, to.x - 55, t), y2: A.visuals.lerp(from.y, to.y, t) }));
      } else l.attr({ x2: to.x - 55, y2: to.y });
    });
    ctx.metric('assign', [0, 1, 2].map(p => 'P' + p + '→C' + (owner(p, c) + 1)).join(' '));
    ctx.metric('idle', Math.max(0, c - 3), c > 3 ? 'warn' : '');
  }

  function setup(ctx) {
    const S = A.simviz;
    const V = A.visuals;
    const $svg = S.stage(ctx.$viz, 520, 210, 'Kafka partitions and consumers');
    S.box($svg, PR.x, PR.y, 80, 44, 'Producer', '', '');
    PART.forEach(p => S.link($svg, PR, p, 'is-live'));
    const lines = PART.map(p => S.link($svg, { x: p.x + 60, y: p.y }, { x: 395, y: p.y }, 'is-live'));
    const parts = PART.map((p, i) => S.box($svg, p.x, p.y, 120, 44, 'Partition ' + i, '0 messages', 'is-active'));
    const cons = CONS.map((p, i) => S.box($svg, p.x, p.y, 110, 38, 'Consumer ' + (i + 1), '', ''));
    ctx.s = { lines, parts, cons, $svg, count: [0, 0, 0], sent: 0 };
    draw(ctx, false);
    ctx.badge('');
    return V;
  }

  function produce(ctx) {
    const s = ctx.s;
    const c = ctx.param('cons');
    ctx.stagger([0, 1, 2, 3, 4, 5], 250, i => {
      const p = i % 3;
      s.count[p] += 1;
      A.simviz.setBox(s.parts[p], 'Partition ' + p, s.count[p] + ' messages');
      ctx.log('msg ' + i + ' → partition ' + p + ' → Consumer ' + (owner(p, c) + 1), 'dim');
      if (!ctx.reduced) {
        A.simviz.fly(ctx.anim(), s.$svg, PR, PART[p], 'ok', 200, () => A.simviz.fly(ctx.anim(), s.$svg, { x: PART[p].x + 60, y: PART[p].y }, { x: 395, y: CONS[owner(p, c)].y }, 'ok', 250));
      }
    });
    ctx.say(c > 3 ? SAY.idle : SAY.prod);
  }

  A.sims.register('kafka-partitions', {
    title: 'Kafka consumer group vs partitions',
    note: 'Move the slider to add or remove consumers and watch partitions get reassigned.',
    intro: SAY.intro,
    controls: [{ id: 'cons', label: 'Consumers in group', type: 'range', min: 1, max: 4, value: 1 }],
    actions: [{ id: 'produce', label: 'Produce 6 messages', icon: 'send', primary: true }],
    metrics: [{ id: 'assign', label: 'Assignment' }, { id: 'idle', label: 'Idle consumers' }],
    init: setup,
    onParam(ctx) {
      ctx.badge('Rebalancing', 'warn');
      ctx.after(700, () => ctx.badge(''));
      draw(ctx, true);
      ctx.say(ctx.param('cons') > 3 ? SAY.idle : SAY.intro);
    },
    step(ctx) { produce(ctx); },
  });
})(window.Atlas);
