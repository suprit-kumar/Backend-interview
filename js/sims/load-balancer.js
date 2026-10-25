/* Load balancer: requests fly client -> LB -> server. Round robin ignores load; least connections picks the emptiest server. */
(function (A) {
  const CLIENT = { x: 60, y: 100 };
  const LB = { x: 210, y: 100 };
  const SERVERS = [{ x: 440, y: 40 }, { x: 440, y: 100 }, { x: 440, y: 160 }];
  const SAY = {
    intro: {
      beginner: 'A load balancer is a receptionist who sends each visitor to one of several identical desks.',
      intermediate: 'Round robin takes turns. Least connections sends the next request to the server with the fewest active requests.',
      expert: 'Round robin assumes equal, short requests. With long or uneven requests, least connections (or least response time) balances better, at the cost of tracking state and health checks.',
    },
    rr: {
      beginner: 'Round robin simply goes 1, 2, 3, 1, 2, 3. Fair turns, even if one desk is still busy.',
      intermediate: 'Round robin rotates through servers regardless of their current load.',
      expert: 'Round robin can overload one server if its requests happen to be the slow ones. Weighted variants help when servers differ in capacity.',
    },
    lc: {
      beginner: 'Least connections looks at which desk is least busy and sends the visitor there.',
      intermediate: 'Least connections picks the server with the fewest active requests, so slow requests do not pile up on one server.',
      expert: 'It needs live connection counts and works best with health checks. Ties are broken by order here, so identical servers still fill in sequence.',
    },
  };

  function draw(ctx) {
    ctx.s.boxes.forEach((g, i) => {
      const n = ctx.s.n[i];
      A.simviz.setBox(g, 'Server ' + (i + 1), n + ' active');
      A.simviz.tone(g, n > 2 ? 'warn' : '', n > 0);
    });
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 200, 'Load balancer');
    SERVERS.forEach(sv => S.link($svg, LB, sv, 'is-live'));
    S.link($svg, CLIENT, LB, 'is-live');
    S.box($svg, CLIENT.x, CLIENT.y, 80, 44, 'Client', '', '');
    S.box($svg, LB.x, LB.y, 90, 50, 'Load balancer', '', 'is-active');
    const boxes = SERVERS.map((sv, i) => S.box($svg, sv.x, sv.y, 100, 48, 'Server ' + (i + 1), '0 active', ''));
    ctx.s = { n: [0, 0, 0], rr: 0, boxes, $svg, sent: 0 };
    draw(ctx);
    ctx.metric('sent', 0);
  }

  function send(ctx) {
    const s = ctx.s;
    const rr = ctx.param('algo') === 'Round robin';
    const i = rr ? s.rr++ % 3 : s.n.indexOf(Math.min(...s.n));
    s.n[i] += 1;
    s.sent += 1;
    ctx.metric('sent', s.sent);
    ctx.say(rr ? SAY.rr : SAY.lc);
    ctx.log('Request ' + s.sent + ' → Server ' + (i + 1) + ' (' + s.n.join(' / ') + ' active)', 'dim');
    draw(ctx);
    if (!ctx.reduced) {
      A.simviz.fly(ctx.anim(), s.$svg, CLIENT, LB, 'ok', 250, () => A.simviz.fly(ctx.anim(), s.$svg, LB, SERVERS[i], 'ok', 350));
    }
    ctx.after(ctx.param('hold') * 1000, () => { s.n[i] -= 1; draw(ctx); });
  }

  A.sims.register('load-balancer', {
    title: 'Load balancing: round robin vs least connections',
    note: 'Each request is held on its server for the hold time, then released.',
    intro: SAY.intro,
    controls: [
      { id: 'algo', label: 'Algorithm', type: 'select', value: 'Round robin', options: ['Round robin', 'Least connections'] },
      { id: 'hold', label: 'Hold time', type: 'range', min: 1, max: 10, value: 4, unit: 's' },
    ],
    actions: [{ id: 'send', label: 'Send request', icon: 'send', primary: true }, { id: 'burst', label: 'Burst x6', icon: 'lightning-charge' }],
    autoMs: 600,
    metrics: [{ id: 'sent', label: 'Requests sent' }],
    init: setup,
    step(ctx, act) {
      if (act === 'burst') ctx.stagger([0, 1, 2, 3, 4, 5], 150, () => send(ctx)); else send(ctx);
    },
  });
})(window.Atlas);
