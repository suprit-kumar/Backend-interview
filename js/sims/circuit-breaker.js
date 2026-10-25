/* Circuit breaker playground: the live state is drawn by the state-machine renderer, with a growing history trail. */
(function (A) {
  const TONE = { CLOSED: 'ok', OPEN: 'bad', 'HALF-OPEN': 'warn' };
  const ID = { CLOSED: 'closed', OPEN: 'open', 'HALF-OPEN': 'half' };
  // Edge indexes follow the config order below.
  const EDGE = { 'CLOSED>OPEN': 0, 'OPEN>HALF-OPEN': 1, 'HALF-OPEN>CLOSED': 2, 'HALF-OPEN>OPEN': 3 };
  const CONFIG = {
    nodes: [
      { id: 'closed', label: 'CLOSED', sub: 'requests flow', tone: 'ok' },
      { id: 'open', label: 'OPEN', sub: 'fail fast', tone: 'bad' },
      { id: 'half', label: 'HALF-OPEN', sub: 'one probe', tone: 'warn' },
    ],
    edges: [
      { from: 'closed', to: 'open', label: 'failures >= threshold' },
      { from: 'open', to: 'half', label: 'wait elapsed' },
      { from: 'half', to: 'closed', label: 'probe ok' },
      { from: 'half', to: 'open', label: 'probe fails' },
    ],
  };
  const SAY = {
    send: {
      beginner: 'Think of a fuse box. Too many failures in a row and the breaker trips, so calls stop hammering a service that is already hurt.',
      intermediate: 'CLOSED counts consecutive failures. At the threshold it goes OPEN and rejects calls instantly, then HALF-OPEN lets one probe decide.',
      expert: 'Rejections cost almost nothing and free the caller threads. Production breakers usually use a failure rate over a sliding window and a minimum call volume, not a plain consecutive count.',
    },
    open: {
      beginner: 'The circuit is open. Requests are turned away at once instead of waiting for a broken service.',
      intermediate: 'OPEN rejects instantly (fail fast). The open wait is the time given to the downstream to recover.',
      expert: 'Failing fast protects thread pools and queues from piling up. Add jitter to the open wait so many instances do not probe at the same moment.',
    },
    half: {
      beginner: 'Time is up, so the next request is a test. If it works, the breaker resets.',
      intermediate: 'HALF-OPEN allows a probe. Success closes the circuit, failure reopens it for another wait.',
      expert: 'Many libraries allow a small number of probes, not just one. Too many probes can re-overload a service that is still recovering.',
    },
  };

  function paint(ctx) {
    const s = ctx.s;
    ctx.badge(s.state + ' (failures: ' + s.failures + ')', TONE[s.state]);
    ctx.metric('state', s.state, TONE[s.state]);
    ctx.metric('failures', s.failures);
    ctx.metric('passed', s.passed);
    ctx.metric('rejected', s.rejected);
  }

  function go(ctx, to) {
    const s = ctx.s;
    const edge = EDGE[s.state + '>' + to];
    s.state = to;
    s.topic.steps.push({ label: to, state: { active: [ID[to]], edge } });
    s.view.update(s.topic.steps.length - 1, ctx.level());
  }

  function setup(ctx) {
    const topic = { visual: { type: 'state-machine', config: CONFIG }, steps: [{ label: 'CLOSED', state: { active: ['closed'] } }] };
    ctx.s = { state: 'CLOSED', failures: 0, passed: 0, rejected: 0, topic };
    ctx.s.view = A.visuals.mount(topic, ctx.$viz);
    ctx.s.view.update(0, ctx.level());
    paint(ctx);
  }

  function send(ctx) {
    const s = ctx.s;
    const p = ctx.params();
    if (s.state === 'OPEN') {
      s.rejected += 1;
      ctx.log('⛔ Rejected instantly: circuit is open', 'dim');
      ctx.say(SAY.open);
    } else if (ctx.rand() * 100 < p.rate) {
      s.failures += 1;
      let msg = '❌ Downstream failed';
      if (s.state === 'HALF-OPEN' || s.failures >= p.threshold) {
        go(ctx, 'OPEN');
        msg += ', circuit opens for ' + p.wait + 's';
        ctx.clear();
        ctx.after(p.wait * 1000, () => { go(ctx, 'HALF-OPEN'); ctx.log('⏳ Half-open: next request is a probe', 'warn'); ctx.say(SAY.half); paint(ctx); });
      }
      ctx.log(msg, 'bad');
      if (s.state !== 'OPEN') ctx.say(SAY.send);
    } else {
      s.failures = 0;
      s.passed += 1;
      let msg = '✅ Success';
      if (s.state === 'HALF-OPEN') { go(ctx, 'CLOSED'); msg += ', circuit closes'; }
      ctx.log(msg, 'good');
      ctx.say(SAY.send);
    }
    paint(ctx);
  }

  A.sims.register('circuit-breaker', {
    title: 'Circuit breaker playground',
    note: 'Opens after N failures in a row, stays open for the wait time, then lets one probe through.',
    random: true,
    intro: SAY.send,
    controls: [
      { id: 'rate', label: 'Downstream failure rate', type: 'range', min: 0, max: 100, value: 100, unit: '%' },
      { id: 'threshold', label: 'Failure threshold', type: 'range', min: 1, max: 10, value: 3 },
      { id: 'wait', label: 'Open wait', type: 'range', min: 1, max: 15, value: 5, unit: 's' },
    ],
    actions: [
      { id: 'send', label: 'Send request', icon: 'send', primary: true },
      { id: 'burst', label: 'Burst x5', icon: 'lightning-charge' },
    ],
    autoMs: 900,
    metrics: [
      { id: 'state', label: 'State' }, { id: 'failures', label: 'Failures in a row' },
      { id: 'passed', label: 'Passed' }, { id: 'rejected', label: 'Rejected fast' },
    ],
    init: setup,
    step(ctx, act) {
      if (act === 'burst') { for (let i = 0; i < 5; i += 1) send(ctx); } else send(ctx);
    },
  });
})(window.Atlas);
