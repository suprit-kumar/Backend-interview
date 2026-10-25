/* Async vs blocking playground: N I/O calls of 200 ms each (5 ms of CPU per call). Sequential code waits for each in turn;
   async code overlaps the waits on one thread. Deterministic. */
(function (A) {
  const MODES = ['Sequential (blocking)', 'Concurrent (async/await)'];
  const IO = 200;
  const CPU = 5;
  const SAY = {
    intro: {
      beginner: 'Cooking: you can stand watching the kettle, or put the kettle on and chop vegetables while it heats.',
      intermediate: 'Blocking code waits for each network call before starting the next. Async code starts them all and resumes as each finishes.',
      expert: 'Async helps with I/O waits, not CPU work. One event loop thread interleaves tasks at await points, so a CPU-heavy task blocks everything else.',
    },
    seq: {
      beginner: 'Each call waited for the one before it, so the total is the sum of all the waits.',
      intermediate: 'Total time is about N x (I/O + CPU). The thread sits idle during every wait.',
      expert: 'Blocking a thread per request limits concurrency to the thread count. That is why synchronous servers use big thread pools and why they hit memory limits.',
    },
    conc: {
      beginner: 'All the calls waited at the same time, so the total is about one wait.',
      intermediate: 'Total time is about one I/O wait plus N small CPU slices, because the waits overlap.',
      expert: 'asyncio.gather schedules coroutines on one event loop. Add a semaphore to bound concurrency, and use timeouts so one slow call cannot hold the group forever.',
    },
  };

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 200, 'Timeline of I/O calls');
    ctx.s = { rows: Array.from({ length: 6 }, (_, i) => S.box($svg, 260, 22 + i * 32, 440, 24, 'call ' + (i + 1), '')) };
    ctx.s.rows.forEach((g, i) => g.toggleClass('is-dim', i >= ctx.param('n')));
    ['total', 'idle'].forEach(k => ctx.metric(k, '-'));
  }

  A.sims.register('async-timeline', {
    title: 'Blocking vs async: where the time goes',
    note: 'Each call waits 200 ms for I/O and uses 5 ms of CPU. Compare total time for sequential and concurrent code.',
    intro: SAY.intro,
    controls: [
      { id: 'mode', label: 'Strategy', type: 'select', value: MODES[0], options: MODES },
      { id: 'n', label: 'I/O calls', type: 'range', min: 1, max: 6, value: 4, unit: '' },
    ],
    actions: [{ id: 'run', label: 'Run calls', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'total', label: 'Total time' }, { id: 'idle', label: 'Thread idle' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const S = A.simviz;
      const n = ctx.param('n');
      const seq = ctx.param('mode') === MODES[0];
      setup(ctx);
      ctx.s.rows.forEach((g, i) => {
        if (i >= n) return;
        const start = seq ? i * (IO + CPU) : i * CPU;
        S.setBox(g, 'call ' + (i + 1), start + ' to ' + (start + IO + CPU) + ' ms');
        S.tone(g, seq ? 'warn' : 'ok', true);
      });
      const total = seq ? n * (IO + CPU) : IO + n * CPU;
      ctx.log((seq ? 'Waited one call at a time: ' : 'Started all calls, waited together: ') + total + ' ms', seq ? 'warn' : 'good');
      ctx.metric('total', total + ' ms', seq ? 'warn' : 'ok');
      ctx.metric('idle', (seq ? n * IO : IO) + ' ms', seq ? 'warn' : 'ok');
      ctx.say(seq ? SAY.seq : SAY.conc);
    },
  });
})(window.Atlas);
