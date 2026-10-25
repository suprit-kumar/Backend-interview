/* Thread race playground: T threads each do 5 increments of a shared counter. Without a lock we model the worst-case interleaving
   (every thread reads the same value before any writes), so each round adds only 1. With a lock every increment counts. Deterministic. */
(function (A) {
  const MODES = ['No lock (race)', 'With lock (mutex)'];
  const ROUNDS = 5;
  const SAY = {
    intro: {
      beginner: 'Several workers add 1 to the same tally. If they all read it before anyone writes, their additions overwrite each other.',
      intermediate: 'counter += 1 is read, add, write. Threads can interleave between those steps, so updates are lost.',
      expert: 'This is a data race on a read-modify-write. The result depends on scheduling, so bugs appear rarely and are hard to reproduce. This sim shows the worst-case interleaving for clarity.',
    },
    race: {
      beginner: 'The final tally is far lower than it should be because workers overwrote each other.',
      intermediate: 'Every round, all threads read the same old value and write old+1, so the counter grows by 1 instead of by the thread count.',
      expert: 'Real runs lose a variable number of updates. In CPython the GIL does not make counter += 1 atomic, because it spans several bytecodes. Use a lock, atomics or a queue.',
    },
    lock: {
      beginner: 'Workers took turns, so every addition counted. The price is waiting.',
      intermediate: 'The mutex makes the read-add-write one indivisible step, so the result is exact, but threads serialize on the lock.',
      expert: 'Locks add contention, and misuse causes deadlock. Prefer message passing, thread-confined state or atomic operations where possible; keep critical sections tiny.',
    },
  };

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 150, 'Threads updating one shared counter');
    ctx.s = { c: S.box($svg, 390, 75, 190, 64, 'counter', '0'), t: S.box($svg, 110, 75, 150, 64, 'threads', ctx.param('t') + ' threads') };
    S.link($svg, { x: 185, y: 75 }, { x: 295, y: 75 }, 'is-live');
    ['expected', 'actual', 'lost'].forEach(k => ctx.metric(k, '-'));
  }

  A.sims.register('thread-race', {
    title: 'Race condition on a shared counter',
    note: 'Each thread increments the counter 5 times. Compare the result with and without a lock.',
    intro: SAY.intro,
    controls: [
      { id: 'mode', label: 'Strategy', type: 'select', value: MODES[0], options: MODES },
      { id: 't', label: 'Threads', type: 'range', min: 2, max: 8, value: 4, unit: '' },
    ],
    actions: [{ id: 'run', label: 'Run threads', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'expected', label: 'Expected' }, { id: 'actual', label: 'Actual' }, { id: 'lost', label: 'Lost updates' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const S = A.simviz;
      const t = ctx.param('t');
      const expected = t * ROUNDS;
      const race = ctx.param('mode') === MODES[0];
      const actual = race ? ROUNDS : expected;
      setup(ctx);
      ctx.log(race ? 'All ' + t + ' threads read the same value, then each wrote value+1 (x' + ROUNDS + ' rounds)' : 'Each thread held the lock for its read-add-write (x' + expected + ')', race ? 'warn' : 'good');
      S.setBox(ctx.s.c, 'counter', String(actual));
      S.tone(ctx.s.c, race ? 'bad' : 'ok', true);
      ctx.metric('expected', expected);
      ctx.metric('actual', actual, race ? 'bad' : 'ok');
      ctx.metric('lost', expected - actual, race ? 'bad' : 'ok');
      ctx.say(race ? SAY.race : SAY.lock);
    },
  });
})(window.Atlas);
