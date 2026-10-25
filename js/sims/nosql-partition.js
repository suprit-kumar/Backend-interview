/* NoSQL partitioning: 12 writes are routed to 4 shards by the chosen partition key. A good key spreads load; a skewed or monotonic key makes a hot shard. Deterministic. */
(function (A) {
  const KEYS = {
    'user_id (high cardinality)': [3, 3, 3, 3],
    'country (few, skewed values)': [7, 3, 1, 1],
    'created_at (always increasing)': [12, 0, 0, 0],
  };
  const NAMES = Object.keys(KEYS);
  const SAY = {
    intro: {
      beginner: 'A big filing room is split into 4 cabinets. The label you file by decides which cabinet fills up.',
      intermediate: 'The partition key is hashed (or range-mapped) to a shard. Writes spread only if the key values are spread.',
      expert: 'Throughput scales with the number of shards only if keys are evenly distributed. A hot partition is capped by one node regardless of cluster size.',
    },
    even: {
      beginner: 'Every cabinet got the same amount of work, so all four helped.',
      intermediate: 'A high-cardinality key hashes evenly, so each shard takes about a quarter of the writes.',
      expert: 'Even spread is the goal, but access patterns also matter: a popular user can still be a hot key. Add a salt or split the key if so.',
    },
    skew: {
      beginner: 'Most files went to one cabinet, so that one is overloaded while the others sit idle.',
      intermediate: 'Few or unevenly used values (like country) concentrate writes on a few shards, which become the bottleneck.',
      expert: 'DynamoDB and Cassandra both throttle or slow a hot partition. Mitigate with a composite key or by adding a random suffix and reading all suffixes.',
    },
    mono: {
      beginner: 'Every new file goes to the newest cabinet, so only one ever works.',
      intermediate: 'A monotonic key under range partitioning sends every insert to the last range: a classic hot shard.',
      expert: 'Hash partitioning fixes insert hotspots but loses efficient range scans. Time-bucketed composite keys (bucket + hash) balance both. // VERIFY per database',
    },
  };

  function draw(ctx) {
    const counts = KEYS[ctx.param('key')];
    const max = Math.max(...counts);
    counts.forEach((c, i) => {
      A.simviz.setBox(ctx.s.shards[i], 'Shard ' + (i + 1), c + ' writes');
      A.simviz.tone(ctx.s.shards[i], c === max && max > 3 ? 'bad' : (c === 0 ? '' : 'ok'), c > 0);
      ctx.s.shards[i].toggleClass('is-dim', c === 0);
    });
    ctx.metric('hot', max + ' of 12', max > 3 ? 'bad' : 'ok');
    ctx.metric('idle', counts.filter(c => c === 0).length + ' shards', counts.some(c => c === 0) ? 'warn' : 'ok');
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 190, 'Four shards receiving writes');
    ctx.s = { shards: [0, 1, 2, 3].map(i => S.box($svg, 70 + i * 127, 95, 100, 70, 'Shard ' + (i + 1), '0 writes')) };
    ctx.metric('hot', '-');
    ctx.metric('idle', '-');
  }

  A.sims.register('nosql-partition', {
    title: 'Partition key: even spread or hot shard',
    note: 'Twelve writes arrive. The partition key decides which of 4 shards takes each one.',
    intro: SAY.intro,
    controls: [{ id: 'key', label: 'Partition key', type: 'select', value: NAMES[0], options: NAMES }],
    actions: [{ id: 'write', label: 'Send 12 writes', icon: 'send', primary: true }],
    metrics: [{ id: 'hot', label: 'Busiest shard' }, { id: 'idle', label: 'Idle shards' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const i = NAMES.indexOf(ctx.param('key'));
      draw(ctx);
      ctx.log('Partition by ' + NAMES[i] + ': ' + KEYS[NAMES[i]].join(' / ') + ' writes per shard', i ? 'warn' : 'good');
      ctx.say([SAY.even, SAY.skew, SAY.mono][i]);
    },
  });
})(window.Atlas);
