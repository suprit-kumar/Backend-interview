/* Observer pattern: a subject notifies every subscriber. Synchronous notification means one slow subscriber delays everyone. */
(function (A) {
  const SUBJ = { x: 90, y: 100 };
  const MAX = 5;
  const OBS = Array.from({ length: MAX }, (_, i) => ({ x: 400, y: 24 + i * 38 }));
  const FAST = 10;
  const SLOW = 300;
  const SAY = {
    intro: {
      beginner: 'A newsletter: the publisher does not know who reads it. Readers sign up, and everyone signed up gets each issue.',
      intermediate: 'The subject keeps a list of observers and calls each one when something happens. Publisher and subscribers stay loosely coupled.',
      expert: 'Plain observers are synchronous: a slow or failing subscriber blocks or breaks the publisher. Production systems add a queue or event bus, per-subscriber error isolation, and delivery guarantees. Event buses (Kafka, Redis Pub/Sub) are this pattern across processes.',
    },
    fast: {
      beginner: 'Everyone got the news, one after another.',
      intermediate: 'Total time is the sum of every subscriber, because notifications run one at a time in the caller.',
      expert: 'The publisher\'s latency now depends on its slowest subscriber and grows with subscriber count. Dispatch asynchronously when that matters.',
    },
    slow: {
      beginner: 'One subscriber took a long time, and everyone after it had to wait.',
      intermediate: 'A slow subscriber blocks the publisher and delays the rest. Fix it by notifying through a queue or worker, or with timeouts.',
      expert: 'This is head-of-line blocking. Beyond async dispatch, isolate exceptions per observer so one bad subscriber cannot stop the others, and bound the queue.',
    },
  };

  function draw(ctx) {
    const n = ctx.param('subs');
    ctx.s.boxes.forEach((g, i) => {
      A.simviz.setBox(g, 'Observer ' + (i + 1), i === 0 && ctx.param('slow') ? 'slow (' + SLOW + ' ms)' : FAST + ' ms');
      g.toggleClass('is-dim', i >= n);
      A.simviz.tone(g, '', false);
    });
    ctx.s.links.forEach((l, i) => l.toggleClass('is-live', i < n).toggleClass('is-off', i >= n));
    ctx.metric('subs', n);
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 200, 'Subject and observers');
    const links = OBS.map(o => S.link($svg, SUBJ, o, 'is-live'));
    S.box($svg, SUBJ.x, SUBJ.y, 110, 50, 'Subject', 'publish()', 'is-active');
    const boxes = OBS.map(o => S.box($svg, o.x, o.y, 130, 32, '', '', ''));
    ctx.s = { boxes, links, $svg };
    draw(ctx);
  }

  A.sims.register('observer', {
    title: 'Observer pattern: publish to subscribers',
    note: 'Notifications run one after another, as in a plain observer. Make Observer 1 slow to see the cost.',
    intro: SAY.intro,
    controls: [
      { id: 'subs', label: 'Subscribers', type: 'range', min: 0, max: MAX, value: 3 },
      { id: 'slow', label: 'Observer 1 is slow', type: 'toggle', value: false },
    ],
    actions: [{ id: 'pub', label: 'Publish event', icon: 'megaphone', primary: true }],
    metrics: [{ id: 'subs', label: 'Subscribers' }, { id: 'time', label: 'Publisher blocked for' }],
    init: setup,
    onParam(ctx) { draw(ctx); },
    step(ctx) {
      const n = ctx.param('subs');
      const slow = ctx.param('slow');
      let total = 0;
      draw(ctx);
      if (!n) { ctx.log('No subscribers: nobody is told', 'dim'); ctx.metric('time', '0 ms'); return; }
      for (let i = 0; i < n; i += 1) {
        const cost = i === 0 && slow ? SLOW : FAST;
        total += cost;
        ctx.after(ctx.reduced ? 0 : i * 250, () => {
          A.simviz.tone(ctx.s.boxes[i], i === 0 && slow ? 'warn' : 'ok', true);
          ctx.log('Observer ' + (i + 1) + ' notified (' + cost + ' ms)', i === 0 && slow ? 'warn' : 'good');
          if (!ctx.reduced) A.simviz.fly(ctx.anim(), ctx.s.$svg, SUBJ, OBS[i], 'ok', 220);
        });
      }
      ctx.metric('time', total + ' ms', slow ? 'warn' : 'ok');
      ctx.say(slow ? SAY.slow : SAY.fast);
    },
  });
})(window.Atlas);
