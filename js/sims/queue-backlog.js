/* Message queue backlog playground: producers publish at a chosen rate, consumers each handle 2 messages per second.
   Over 10 seconds the backlog is max(0, produced - consumed). Deterministic. */
(function (A) {
  const PER_CONSUMER = 2;
  const SECONDS = 10;
  const SAY = {
    intro: {
      beginner: 'A queue is a waiting line between the sender and the workers. If workers are slower than senders, the line grows.',
      intermediate: 'Backlog grows when the publish rate exceeds total consume rate. Adding consumers raises the drain rate.',
      expert: 'Queue depth and consumer lag are the key signals. A queue absorbs bursts but hides sustained overload until memory, disk or message TTL runs out.',
    },
    grow: {
      beginner: 'Messages arrive faster than workers can handle them, so the line keeps growing.',
      intermediate: 'Backlog = (publish rate - consume rate) x time. Add consumers, make handlers faster, or apply backpressure to producers.',
      expert: 'Unbounded backlog means rising latency and eventual loss. Bound queues, shed or reject load, scale consumers on lag, and use dead-letter queues for poison messages.',
    },
    ok: {
      beginner: 'Workers keep up, so the line stays empty.',
      intermediate: 'Consume rate is at least the publish rate, so the queue drains as fast as it fills.',
      expert: 'Leave headroom: bursts and retries raise the effective publish rate. Target consumer utilisation well below 100% so queues stay short.',
    },
  };

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 150, 'Producers, queue and consumers');
    ctx.s = { p: S.box($svg, 70, 75, 100, 60, 'producers', ''), q: S.box($svg, 260, 75, 120, 60, 'queue', '0'), c: S.box($svg, 450, 75, 110, 60, 'consumers', '') };
    S.link($svg, { x: 120, y: 75 }, { x: 200, y: 75 }, 'is-live');
    S.link($svg, { x: 320, y: 75 }, { x: 395, y: 75 }, 'is-live');
    A.simviz.setBox(ctx.s.p, 'producers', ctx.param('rate') + ' msg/s');
    A.simviz.setBox(ctx.s.c, 'consumers', ctx.param('cons') + ' x ' + PER_CONSUMER + ' msg/s');
    ['backlog', 'drain'].forEach(k => ctx.metric(k, '-'));
  }

  A.sims.register('queue-backlog', {
    title: 'Queue backlog: producers vs consumers',
    note: 'Each consumer handles 2 messages per second. Run 10 seconds and read the backlog.',
    intro: SAY.intro,
    controls: [
      { id: 'rate', label: 'Publish rate', type: 'range', min: 1, max: 20, value: 8, unit: ' msg/s' },
      { id: 'cons', label: 'Consumers', type: 'range', min: 1, max: 8, value: 3, unit: '' },
    ],
    actions: [{ id: 'run', label: 'Run 10 seconds', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'backlog', label: 'Backlog after 10 s' }, { id: 'drain', label: 'Time to drain' }],
    init: setup,
    reset: setup,
    onParam: setup,
    step(ctx) {
      const S = A.simviz;
      setup(ctx);
      const rate = ctx.param('rate');
      const cap = ctx.param('cons') * PER_CONSUMER;
      const backlog = Math.max(0, rate - cap) * SECONDS;
      S.setBox(ctx.s.q, 'queue', backlog + ' msgs');
      S.tone(ctx.s.q, backlog ? 'bad' : 'ok', true);
      ctx.log('Published ' + rate * SECONDS + ', consumed ' + Math.min(rate, cap) * SECONDS + ', backlog ' + backlog, backlog ? 'warn' : 'good');
      ctx.metric('backlog', backlog, backlog ? 'bad' : 'ok');
      ctx.metric('drain', backlog ? (rate > 0 ? Math.ceil(backlog / cap) + ' s once producers stop' : '-') : 'none', backlog ? 'warn' : 'ok');
      ctx.say(backlog ? SAY.grow : SAY.ok);
    },
  });
})(window.Atlas);
