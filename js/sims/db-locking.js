/* Database locking playground: two transactions update the same account balance (100). Without a lock one update is lost;
   with a row lock the second waits; with opposite lock order a deadlock is detected and one transaction is aborted. Deterministic. */
(function (A) {
  const MODES = ['No lock (lost update)', 'Row lock (FOR UPDATE)', 'Opposite order (deadlock)'];
  const SAY = {
    intro: {
      beginner: 'Two people edit the same bank balance at once. Pick what the database does and press Run.',
      intermediate: 'Both transactions read the balance, subtract an amount and write it back. Locks decide whether they interleave or take turns.',
      expert: 'Real engines lock rows (and sometimes ranges or tables) and keep a wait-for graph to detect deadlocks. Pick a mode and watch which transaction waits or dies.',
    },
    lost: {
      beginner: 'Both read 100, so one withdrawal vanished. The balance should be 20 but is wrong.',
      intermediate: 'Classic lost update: both transactions read the same value and the last write overwrites the first.',
      expert: 'Read Committed does not stop this read-modify-write race. Fix it with SELECT ... FOR UPDATE, an atomic UPDATE balance = balance - x, a version column, or SERIALIZABLE.',
    },
    wait: {
      beginner: 'B had to wait its turn, so both withdrawals counted. Balance is correct: 20.',
      intermediate: 'FOR UPDATE makes B block until A commits, then B reads the fresh value 70. Correct, but B waited.',
      expert: 'Under Read Committed B re-reads the committed row after the lock is released. Lock waits add latency and are bounded by lock_timeout (PostgreSQL) or innodb_lock_wait_timeout (MySQL).',
    },
    dead: {
      beginner: 'Each one holds a lock the other needs, so they would wait forever. The database cancels one.',
      intermediate: 'A holds row 1 and wants row 2; B holds row 2 and wants row 1. The database detects the cycle and aborts one victim, which must retry.',
      expert: 'PostgreSQL checks for cycles after deadlock_timeout (1 s default); InnoDB detects them immediately. Prevent them by always locking rows in a consistent order.',
    },
  };

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 190, 'Two transactions and one account row');
    ctx.s = {
      a: S.box($svg, 90, 50, 130, 50, 'Tx A', 'withdraw 30'),
      b: S.box($svg, 90, 140, 130, 50, 'Tx B', 'withdraw 50'),
      row: S.box($svg, 400, 95, 170, 60, 'balance row', '100'),
    };
    S.link($svg, { x: 155, y: 50 }, { x: 315, y: 85 }, 'is-live');
    S.link($svg, { x: 155, y: 140 }, { x: 315, y: 105 }, 'is-live');
    ctx.metric('bal', '100');
    ctx.metric('waits', 0);
    ctx.metric('result', 'idle');
  }

  function reset(ctx) { setup(ctx); }

  A.sims.register('db-locking', {
    title: 'Locking: lost update, row lock, deadlock',
    note: 'Account balance is 100. A withdraws 30 and B withdraws 50, so the correct final balance is 20.',
    intro: SAY.intro,
    controls: [{ id: 'mode', label: 'Strategy', type: 'select', value: MODES[0], options: MODES }],
    actions: [{ id: 'run', label: 'Run both transactions', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'bal', label: 'Final balance' }, { id: 'waits', label: 'Lock waits' }, { id: 'result', label: 'Outcome' }],
    init: setup,
    reset,
    onParam: reset,
    step(ctx) {
      const S = A.simviz;
      const mode = ctx.param('mode');
      setup(ctx);
      const { a, b, row } = ctx.s;
      if (mode === MODES[0]) {
        ctx.log('A reads 100, B reads 100 (no lock)', 'dim');
        ctx.log('A writes 70, then B writes 50 and overwrites it', 'warn');
        S.setBox(row, 'balance row', '50'); S.tone(row, 'bad', true);
        ctx.metric('bal', '50', 'bad'); ctx.metric('result', 'lost update', 'bad');
        ctx.say(SAY.lost);
      } else if (mode === MODES[1]) {
        ctx.log('A locks the row, reads 100, writes 70, commits', 'good');
        ctx.log('B waited, then read 70, wrote 20, committed', 'good');
        S.setBox(row, 'balance row', '20'); S.tone(row, 'ok', true);
        S.tone(a, 'ok'); S.tone(b, 'warn');
        ctx.metric('bal', '20', 'ok'); ctx.metric('waits', 1, 'warn'); ctx.metric('result', 'correct', 'ok');
        ctx.say(SAY.wait);
      } else {
        ctx.log('A locks row 1, B locks row 2', 'dim');
        ctx.log('A wants row 2 and waits; B wants row 1 and waits', 'warn');
        ctx.log('Deadlock detected: B aborted, A continues', 'bad');
        S.setBox(row, 'rows 1 and 2', 'cycle'); S.tone(row, 'bad', true);
        S.tone(a, 'ok'); S.tone(b, 'bad');
        ctx.metric('bal', 'A commits', 'ok'); ctx.metric('waits', 2, 'warn'); ctx.metric('result', 'B aborted', 'bad');
        ctx.say(SAY.dead);
      }
    },
  });
})(window.Atlas);
