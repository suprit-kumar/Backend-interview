/* CAP theorem: three replicas and a breakable link to Node 3. CP refuses to answer during a partition; AP answers and may be stale. */
(function (A) {
  const P = [{ x: 260, y: 40 }, { x: 110, y: 150 }, { x: 410, y: 150 }];
  const SAY = {
    intro: {
      beginner: 'Three copies of the same data. Cut the network to Node 3, then try to write and read. You must choose: stay correct, or stay available.',
      intermediate: 'During a network partition you cannot have both consistency and availability. CP refuses requests it cannot answer correctly; AP answers anyway and may return stale data.',
      expert: 'Partitions are a fact of networks, so the real choice is C or A while partitioned (and latency vs consistency when healthy, as in PACELC). AP systems repair divergence later with read repair, anti-entropy or CRDTs.',
    },
    cp: {
      beginner: 'The system said no rather than risk a wrong answer. Safe, but some users are turned away.',
      intermediate: 'CP: the write or read is rejected because it cannot reach all replicas, which keeps data consistent but loses availability.',
      expert: 'Consensus systems (Raft, Paxos) stay available on the majority side of a partition; the minority side refuses. Quorum size decides who can serve.',
    },
    ap: {
      beginner: 'The system answered, even though Node 3 may be out of date. Everyone gets a reply, maybe an old one.',
      intermediate: 'AP: writes go to reachable nodes and reads come from any node, so data can be stale until the partition heals.',
      expert: 'Conflicting writes on both sides need a merge rule (last-write-wins, vector clocks or CRDTs). Last-write-wins can silently drop updates.',
    },
    ok: {
      beginner: 'The network is healthy, so all three copies agree.',
      intermediate: 'No partition: writes replicate to every node and reads are up to date.',
      expert: 'Even when healthy, synchronous replication adds latency. That trade is why many systems replicate asynchronously.',
    },
  };

  function draw(ctx) {
    const s = ctx.s;
    const part = ctx.param('part');
    s.links.forEach((l, i) => l.toggleClass('is-cut', part && i > 0).toggleClass('is-live', !(part && i > 0)));
    s.boxes.forEach((g, i) => {
      A.simviz.setBox(g, 'Node ' + (i + 1), 'v' + s.v[i]);
      A.simviz.tone(g, i === 2 && part ? 'bad' : (s.v[i] < s.n ? 'warn' : 'ok'), false);
    });
    ctx.badge(part ? 'PARTITION' : 'Healthy', part ? 'bad' : 'ok');
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 200, 'Three replicas');
    const links = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => S.link($svg, P[a], P[b], ''));
    // Cutting Node 3 breaks the two links that touch it (indexes 1 and 2).
    const boxes = P.map((p, i) => S.box($svg, p.x, p.y, 96, 48, 'Node ' + (i + 1), 'v1', ''));
    ctx.s = { v: [1, 1, 1], n: 1, links, boxes, $svg };
    draw(ctx);
  }

  function replicate(ctx, to) {
    if (ctx.reduced) return;
    A.simviz.fly(ctx.anim(), ctx.s.$svg, P[0], P[to], 'ok', 400);
  }

  function write(ctx) {
    const s = ctx.s;
    const part = ctx.param('part');
    const cp = ctx.param('mode') === 'CP (consistent)';
    if (part && cp) { ctx.log('❌ Write rejected: cannot reach all replicas (consistency kept, availability lost)', 'bad'); ctx.say(SAY.cp); return; }
    s.n += 1;
    s.v[0] = s.v[1] = s.n;
    replicate(ctx, 1);
    if (!part) { s.v[2] = s.n; replicate(ctx, 2); }
    ctx.log(part ? '✅ Written to Nodes 1 and 2; Node 3 stays stale until the partition heals' : '✅ Replicated to all nodes', part ? 'warn' : 'good');
    ctx.say(part ? SAY.ap : SAY.ok);
    draw(ctx);
  }

  function read(ctx) {
    const s = ctx.s;
    const part = ctx.param('part');
    const cp = ctx.param('mode') === 'CP (consistent)';
    if (part && cp) { ctx.log('❌ Node 3 refuses to answer: it might be stale', 'bad'); ctx.say(SAY.cp); return; }
    const stale = s.v[2] < s.n;
    ctx.log('✅ Node 3 returns v' + s.v[2] + (stale ? ' ⚠ stale' : ' (up to date)'), stale ? 'warn' : 'good');
    ctx.say(part ? SAY.ap : SAY.ok);
  }

  A.sims.register('cap', {
    title: 'CAP theorem: CP vs AP during a partition',
    note: 'Cut Node 3 off, then write on Node 1 and read from Node 3 in each mode.',
    intro: SAY.intro,
    controls: [
      { id: 'mode', label: 'Mode', type: 'select', value: 'CP (consistent)', options: ['CP (consistent)', 'AP (available)'] },
      { id: 'part', label: 'Network partition (Node 3 cut off)', type: 'toggle', value: false },
    ],
    actions: [{ id: 'w', label: 'Write new value on Node 1', icon: 'pencil', primary: true }, { id: 'r', label: 'Read from Node 3', icon: 'eye', primary: false }],
    metrics: [{ id: 'latest', label: 'Latest value' }],
    init: setup,
    onParam(ctx, k) {
      if (k === 'part' && !ctx.param('part')) ctx.s.v[2] = ctx.s.v[0];
      draw(ctx);
      ctx.say(ctx.param('part') ? (ctx.param('mode') === 'CP (consistent)' ? SAY.cp : SAY.ap) : SAY.ok);
    },
    step(ctx, act) {
      if (act === 'w') write(ctx); else read(ctx);
      ctx.metric('latest', 'v' + ctx.s.n);
    },
  });
})(window.Atlas);
