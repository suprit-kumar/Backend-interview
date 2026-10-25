/* Optimistic vs pessimistic concurrency: N writers update one row. Optimistic writers retry when the version changed; pessimistic writers queue on a lock.
   With N writers the optimistic total is N(N+1)/2 attempts (N(N-1)/2 failed); pessimistic is N attempts plus N-1 waits. Deterministic. */
(function (A) {
  const MODES = ['Optimistic (version check)', 'Pessimistic (row lock)'];
  const SAY = {
    intro: {
      beginner: 'Several people edit the same record. Optimistic: everyone edits, and the late ones redo their work. Pessimistic: one at a time.',
      intermediate: 'Optimistic writes UPDATE ... WHERE version = :v and retries on 0 rows. Pessimistic takes a lock first so no one conflicts.',
      expert: 'Optimistic wins when conflicts are rare and holding locks across user think-time is costly. It degrades as contention rises because retries are wasted work.',
    },
    opt: {
      beginner: 'Only one edit succeeds per round; the others had to start over. More writers means much more redoing.',
      intermediate: 'Each round exactly one UPDATE matches the version; the rest affect 0 rows and retry. Failed attempts grow roughly with the square of writers.',
      expert: 'Under a hot row, retries (ideally with jittered backoff) amplify load and can livelock. If the row is truly hot, use a lock, an atomic UPDATE, or shard the counter.',
    },
    pes: {
      beginner: 'Everyone queued politely, so no work was repeated, but people waited.',
      intermediate: 'Each writer takes the row lock, so there are no failed updates, only waiting. Throughput is bounded by the lock hold time.',
      expert: 'Locks held across network calls or user think-time cause convoys and deadlocks. Keep the critical section short and set lock timeouts.',
    },
  };

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 160, 'Writers and one row');
    ctx.s = { row: S.box($svg, 400, 80, 170, 60, 'row', 'version 1'), w: S.box($svg, 110, 80, 150, 60, 'writers', ctx.param('n') + ' concurrent') };
    S.link($svg, { x: 185, y: 80 }, { x: 315, y: 80 }, 'is-live');
    ['attempts', 'conflicts', 'version'].forEach(k => ctx.metric(k, k === 'version' ? 1 : 0));
  }

  A.sims.register('occ-conflict', {
    title: 'Optimistic vs pessimistic under contention',
    note: 'All writers read the same row and update it once. Raise the writer count and compare the wasted work.',
    intro: SAY.intro,
    controls: [
      { id: 'mode', label: 'Strategy', type: 'select', value: MODES[0], options: MODES },
      { id: 'n', label: 'Concurrent writers', type: 'range', min: 2, max: 8, value: 4, unit: '' },
    ],
    actions: [{ id: 'run', label: 'Run', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'attempts', label: 'Attempts' }, { id: 'conflicts', label: 'Failed (0 rows)' }, { id: 'version', label: 'Final version' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const S = A.simviz;
      const n = ctx.param('n');
      const opt = ctx.param('mode') === MODES[0];
      setup(ctx);
      const failed = opt ? n * (n - 1) / 2 : 0;
      for (let round = 1; round <= n; round += 1) {
        const losers = n - round;
        ctx.log(opt ? 'Round ' + round + ': writer ' + round + ' wins' + (losers ? ', ' + losers + ' retry' : '') : 'Writer ' + round + ' locks, updates, unlocks', opt && losers ? 'warn' : 'good');
      }
      S.setBox(ctx.s.row, 'row', 'version ' + (n + 1));
      S.tone(ctx.s.row, failed > n ? 'warn' : 'ok', true);
      ctx.metric('attempts', opt ? n * (n + 1) / 2 : n, failed > n ? 'warn' : 'ok');
      ctx.metric('conflicts', failed, failed ? 'bad' : 'ok');
      ctx.metric('version', n + 1, 'ok');
      ctx.say(opt ? SAY.opt : SAY.pes);
    },
  });
})(window.Atlas);
