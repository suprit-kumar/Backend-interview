/* Saga: local transactions in sequence; if one fails, earlier steps are undone by compensating actions. */
(function (A) {
  const W = 520;
  const H = 170;
  const SAY = {
    intro: {
      beginner: 'Placing an order takes several steps in different services. If one step fails, the earlier steps must be undone.',
      intermediate: 'A saga runs local transactions in order. When one fails, compensating transactions undo the earlier ones, so there is no distributed lock.',
      expert: 'Sagas give eventual consistency, not isolation: other requests can see intermediate states. Compensations must be idempotent and retryable, and the orchestrator or event log must survive crashes.',
    },
    ok: {
      beginner: 'Every step worked, so the order is complete.',
      intermediate: 'Happy path: reserve stock, charge the card, create the shipment.',
      expert: 'Each step commits locally and publishes an event or command. Use an outbox so the state change and the message cannot diverge.',
    },
    fail: {
      beginner: 'Payment failed, so the reserved stock was handed back. Nothing is left half-done.',
      intermediate: 'Charge failed, so the saga runs the compensation for the completed step: release the reserved stock.',
      expert: 'Compensation is a new business action, not a rollback. Steps that cannot be undone (such as sending an email) belong last or need a semantic workaround.',
    },
  };
  const POS = [{ x: 70, y: 60 }, { x: 200, y: 60 }, { x: 330, y: 60 }, { x: 455, y: 60 }];

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, W, H, 'Order saga');
    const names = [['Reserve stock', 'step 1'], ['Charge card', 'step 2'], ['Create shipment', 'step 3'], ['Order complete', 'done']];
    for (let i = 0; i < 3; i += 1) S.link($svg, POS[i], POS[i + 1], '');
    const boxes = POS.map((p, i) => S.box($svg, p.x, p.y, 110, 50, names[i][0], names[i][1], 'is-dim'));
    const comp = S.box($svg, 135, 135, 150, 40, 'Release stock', 'compensation', 'is-dim');
    ctx.s = { boxes, comp };
  }

  function run(ctx) {
    ctx.clear();
    ctx.clearLog();
    setup(ctx);
    const S = A.simviz;
    const b = ctx.s.boxes;
    const fail = ctx.param('fail');
    const script = [
      { t: '📦 Reserve stock ✅', f: () => S.tone(b[0], 'ok', true) },
      fail ? { t: '💳 Charge card ❌ payment failed', f: () => S.tone(b[1], 'bad', true) } : { t: '💳 Charge card ✅', f: () => S.tone(b[1], 'ok', true) },
    ].concat(fail
      ? [{ t: '↩ Compensate: release reserved stock ✅', f: () => { S.tone(ctx.s.comp, 'warn', true); S.tone(b[0], 'warn', false); } },
        { t: '🛑 Order cancelled, data consistent again', f: () => S.tone(b[3], 'bad', true) }]
      : [{ t: '🚚 Create shipment ✅', f: () => S.tone(b[2], 'ok', true) }, { t: '🎉 Order complete', f: () => S.tone(b[3], 'ok', true) }]);
    ctx.stagger(script, 700, e => { ctx.log(e.t, '', true); e.f(); });
    ctx.say(fail ? SAY.fail : SAY.ok);
    ctx.metric('outcome', fail ? 'Cancelled' : 'Complete', fail ? 'bad' : 'ok');
  }

  A.sims.register('saga', {
    title: 'Order saga: success and compensating failure',
    note: 'Reserve stock, charge the card, create the shipment. Tick the box to make payment fail.',
    intro: SAY.intro,
    controls: [{ id: 'fail', label: 'Make payment fail', type: 'toggle', value: false }],
    actions: [{ id: 'run', label: 'Run saga', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'outcome', label: 'Outcome' }],
    init: setup,
    step(ctx) { run(ctx); },
  });
})(window.Atlas);
