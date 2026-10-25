/* Isolation levels: two transactions, stepped one click at a time. The chosen level decides which anomalies show up. */
(function (A) {
  const W = 520;
  const H = 190;
  const LANE = { A: 60, B: 120 };
  const COL = i => 50 + i * 85;
  const SAY = {
    intro: {
      beginner: 'Two people use the same bank balance at the same time. Isolation decides how much of each other\'s unfinished work they can see.',
      intermediate: 'Step through the same script at different levels. READ UNCOMMITTED allows dirty reads, READ COMMITTED allows non-repeatable reads, REPEATABLE READ and SERIALIZABLE do not.',
      expert: 'Exact behaviour differs by engine: PostgreSQL treats READ UNCOMMITTED as READ COMMITTED and uses snapshots for REPEATABLE READ; MySQL InnoDB uses next-key locks. Phantoms and write skew need SERIALIZABLE or explicit locking. // VERIFY per engine',
    },
    dirty: {
      beginner: 'Tx A saw a number that Tx B had not saved yet. If B cancels, A used a value that never existed.',
      intermediate: 'Dirty read: reading uncommitted data. Only READ UNCOMMITTED allows it.',
      expert: 'Dirty reads need the engine to expose uncommitted versions. Most production engines never do, even if you ask for this level.',
    },
    nonrep: {
      beginner: 'Tx A read the same row twice and got two different answers, because B saved in between.',
      intermediate: 'Non-repeatable read: a committed change appears between two reads in one transaction. REPEATABLE READ and SERIALIZABLE prevent it.',
      expert: 'Snapshot isolation prevents it by reading from a fixed snapshot, at the cost of keeping old row versions around until old transactions finish.',
    },
    safe: {
      beginner: 'At this level Tx A keeps seeing a steady value, so the numbers make sense.',
      intermediate: 'No anomaly at this step: the level hides the other transaction\'s change from A.',
      expert: 'Safety here costs something: either snapshots (storage, long-running transaction bloat) or locks (blocking and deadlock risk).',
    },
  };

  const steps = lvl => [
    { who: 'AB', t: 'Tx A and Tx B both BEGIN. balance = 100', short: 'BEGIN' },
    { who: 'A', t: 'Tx A: SELECT balance → 100', short: 'read 100' },
    { who: 'B', t: 'Tx B: UPDATE balance = 200 (not committed yet)', short: 'set 200' },
    { who: 'A', t: 'Tx A: SELECT balance → ' + (lvl === 0 ? '200 ⚠ dirty read: B has not committed' : '100 ✅'), short: lvl === 0 ? 'read 200!' : 'read 100', bad: lvl === 0, say: lvl === 0 ? 'dirty' : 'safe' },
    { who: 'B', t: 'Tx B: COMMIT', short: 'COMMIT', commit: true },
    { who: 'A', t: 'Tx A: SELECT balance again → ' + (lvl < 2 ? '200 ⚠ non-repeatable read: value changed inside one transaction' : '100 ✅ same snapshot as before'), short: lvl < 2 ? 'read 200!' : 'read 100', bad: lvl < 2, say: lvl < 2 ? 'nonrep' : 'safe' },
  ];

  function setup(ctx) {
    const V = A.visuals;
    const $svg = A.simviz.stage(ctx.$viz, W, H, 'Two transactions over time');
    ['A', 'B'].forEach(k => {
      V.svg('rect', { x: 10, y: LANE[k] - 26, width: W - 20, height: 52, rx: 10, class: 'sx-lane' }, $svg);
      V.text($svg, 20, LANE[k] - 32, 'Tx ' + k, 'sx-lane-label', 'start');
    });
    const committed = V.text($svg, W / 2, 175, 'Committed balance: 100', 'sx-txt', 'middle');
    ctx.s = { k: 0, $svg, committed };
  }

  function next(ctx) {
    const s = ctx.s;
    const list = steps(ctx.$el.find('.js-ctl[data-id="level"]')[0].selectedIndex);
    if (s.k >= list.length) { ctx.log('Done. Change the level and press Reset to compare.', '', true); return; }
    const st = list[s.k];
    ctx.log(st.t, st.bad ? 'bad' : '', true);
    st.who.split('').forEach(w => {
      const cell = A.visuals.svg('rect', { x: COL(s.k) - 38, y: LANE[w] - 16, width: 76, height: 32, rx: 8, class: 'sx-cell ' + (st.bad ? 'tone-bad' : 'is-on') }, s.$svg);
      A.visuals.text(s.$svg, COL(s.k), LANE[w] + 4, st.short, 'sx-txt', 'middle');
      return cell;
    });
    if (st.commit) s.committed.text('Committed balance: 200');
    ctx.say(SAY[st.say] || SAY.intro);
    ctx.metric('step', (s.k + 1) + ' / ' + list.length);
    s.k += 1;
  }

  A.sims.register('isolation-levels', {
    title: 'Isolation levels: dirty read and non-repeatable read',
    note: 'Pick a level, then press Next step six times. Change the level and press Reset to compare.',
    intro: SAY.intro,
    controls: [{ id: 'level', label: 'Isolation level', type: 'select', value: 'READ COMMITTED', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'] }],
    actions: [{ id: 'next', label: 'Next step', icon: 'skip-forward', primary: true }],
    metrics: [{ id: 'step', label: 'Step' }],
    init: setup,
    step(ctx) { next(ctx); },
  });
})(window.Atlas);
