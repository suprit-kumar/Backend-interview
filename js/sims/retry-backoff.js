/* Retry with exponential backoff and jitter: a timeline of attempts, waits and jitter over a fixed 0-30 s axis. */
(function (A) {
  const W = 520;
  const H = 150;
  const X0 = 20;
  const SPAN = 30;
  const MAX = 5;
  const px = t => X0 + (t / SPAN) * (W - 2 * X0);
  const SAY = {
    intro: {
      beginner: 'When a call fails, try again, but wait a bit longer each time so you do not hammer a struggling service.',
      intermediate: 'Backoff doubles the wait (1s, 2s, 4s, 8s). Jitter adds a random amount so many clients do not retry at the same instant.',
      expert: 'Without jitter, clients that failed together retry together (a thundering herd). Cap the delay and the attempt count, retry only idempotent or safely repeatable calls, and respect Retry-After.',
    },
    done: {
      beginner: 'Each blue bar is a wait that gets longer. The orange bar is a small random extra.',
      intermediate: 'Delays double each attempt: 1, 2, 4, 8s. Jitter spreads retries out so clients do not synchronise.',
      expert: 'Total time can grow quickly. Add an overall deadline, and consider retry budgets so retries cannot multiply load across several layers.',
    },
  };

  function run(ctx) {
    ctx.clear();
    ctx.clearLog();
    const V = A.visuals;
    const $svg = A.simviz.stage(ctx.$viz, W, H, 'Retry timeline');
    V.svg('line', { x1: X0, y1: 90, x2: W - X0, y2: 90, class: 'sx-link' }, $svg);
    [0, 10, 20, 30].forEach(t => V.text($svg, px(t), 118, t + 's', 'sx-cap', 'middle'));
    const rate = ctx.param('rate');
    const jitterOn = ctx.param('jitter');
    const events = [];
    let t = 0;
    let d = 1;
    let ok = false;
    for (let a = 1; a <= MAX; a += 1) {
      const failed = ctx.rand() * 100 < rate;
      events.push({ at: t, text: 'Attempt ' + a + ': ' + (failed ? '❌ failed' : '✅ success'), tone: failed ? 'bad' : 'good', a, failed });
      if (!failed) { ok = true; break; }
      if (a < MAX) {
        const j = +(ctx.rand() * d).toFixed(1);
        const used = jitterOn ? j : 0;
        events.push({ text: 'wait ' + d + 's plus ' + used + 's jitter', tone: 'dim', wait: d, jitter: used, from: t });
        t += d + used;
        d *= 2;
      } else events.push({ text: 'Gave up after 5 attempts', tone: 'bad' });
    }
    ctx.stagger(events, 350, e => {
      ctx.log(e.text, e.tone, true);
      if (e.a) {
        V.svg('circle', { cx: px(e.at), cy: 90, r: 8, class: 'sx-dot' + (e.failed ? ' is-busy' : '') }, $svg);
        V.text($svg, px(e.at), 70, '#' + e.a + (e.failed ? ' ✗' : ' ✓'), 'sx-cap', 'middle');
      } else if (e.wait) {
        V.svg('rect', { x: px(e.from), y: 98, width: Math.max(2, px(e.wait) - px(0)), height: 6, class: 'sx-bar' }, $svg);
        if (e.jitter) V.svg('rect', { x: px(e.from + e.wait), y: 98, width: Math.max(2, px(e.jitter) - px(0)), height: 6, class: 'sx-bar is-jitter' }, $svg);
      }
    });
    ctx.metric('attempts', events.filter(e => e.a).length);
    ctx.metric('result', ok ? 'Success' : 'Gave up', ok ? 'ok' : 'bad');
    ctx.metric('time', t.toFixed(1) + 's');
    ctx.say(SAY.done);
  }

  A.sims.register('retry-backoff', {
    title: 'Retry with exponential backoff and jitter',
    note: 'Up to 5 attempts. The wait doubles each time; jitter adds a random extra.',
    random: true,
    intro: SAY.intro,
    controls: [
      { id: 'rate', label: 'Failure rate', type: 'range', min: 0, max: 100, value: 70, unit: '%' },
      { id: 'jitter', label: 'Add jitter', type: 'toggle', value: true },
    ],
    actions: [{ id: 'call', label: 'Call API', icon: 'send', primary: true }],
    metrics: [{ id: 'attempts', label: 'Attempts' }, { id: 'result', label: 'Result' }, { id: 'time', label: 'Total wait' }],
    init(ctx) { A.simviz.stage(ctx.$viz, W, 40, 'Retry timeline').parent().append('<p class="sim-note">Press Call API to draw the timeline.</p>'); },
    step(ctx) { run(ctx); },
  });
})(window.Atlas);
