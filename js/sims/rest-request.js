/* REST request playground: verb, status code, safety and idempotency, including what happens when a request is sent twice. */
(function (A) {
  const C = { x: 80, y: 70 };
  const SV = { x: 440, y: 70 };
  const REQ = {
    'GET /users/1': { label: 'GET /users/1', first: [200, 'OK'], again: [200, 'OK'], safe: true, idem: true, effect: 'Nothing changes' },
    'POST /users': { label: 'POST /users', first: [201, 'Created'], again: [201, 'Created'], safe: false, idem: false, effect: 'A new user is created each time' },
    'PUT /users/1': { label: 'PUT /users/1', first: [200, 'OK'], again: [200, 'OK'], safe: false, idem: true, effect: 'User 1 ends up the same' },
    'DELETE /users/1': { label: 'DELETE /users/1', first: [204, 'No Content'], again: [404, 'Not Found'], safe: false, idem: true, effect: 'User 1 is gone either way' },
    'GET /users/999': { label: 'GET /users/999', first: [404, 'Not Found'], again: [404, 'Not Found'], safe: true, idem: true, effect: 'Nothing changes' },
  };
  const SAY = {
    intro: {
      beginner: 'Each URL names a thing and the verb says what to do with it. The server answers with a number that says how it went.',
      intermediate: 'Safe methods (GET) do not change state. Idempotent methods (GET, PUT, DELETE) have the same end state if repeated. POST is neither, so retrying it can create duplicates.',
      expert: 'Idempotent means the same server state, not the same response: a repeated DELETE can return 404 yet the state is identical. Make POST retry-safe with an Idempotency-Key header and a stored result.',
    },
    twice: {
      beginner: 'Sending the same request twice can do different things depending on the verb.',
      intermediate: 'Retries after a timeout are only safe for idempotent methods. A retried POST may create a second record.',
      expert: 'Clients and proxies retry on timeouts, so a non-idempotent endpoint needs a dedupe key. The 404 on the second DELETE is fine: the desired state already holds.',
    },
  };

  function draw(ctx, status, tone) {
    const r = REQ[ctx.param('req')];
    A.simviz.setBox(ctx.s.client, 'Client', r.label);
    A.simviz.setBox(ctx.s.server, status ? status[0] + ' ' + status[1] : 'Server', status ? 'response' : 'waiting');
    A.simviz.tone(ctx.s.server, tone || '', !!status);
    ctx.metric('safe', r.safe ? 'yes' : 'no', r.safe ? 'ok' : 'warn');
    ctx.metric('idem', r.idem ? 'yes' : 'no', r.idem ? 'ok' : 'warn');
  }

  function toneOf(code) { return code >= 400 ? 'bad' : 'ok'; }

  A.sims.register('rest-request', {
    title: 'REST requests: status codes, safety and idempotency',
    note: 'Pick a request and send it. Tick "Send twice" to see why retries are only safe for some verbs.',
    intro: SAY.intro,
    controls: [
      { id: 'req', label: 'Request', type: 'select', options: Object.keys(REQ), value: 'GET /users/1' },
      { id: 'twice', label: 'Send twice (retry)', type: 'toggle', value: false },
    ],
    actions: [{ id: 'send', label: 'Send request', icon: 'send', primary: true }],
    metrics: [{ id: 'status', label: 'Last status' }, { id: 'safe', label: 'Safe' }, { id: 'idem', label: 'Idempotent' }, { id: 'effect', label: 'Server effect' }],
    init(ctx) {
      const S = A.simviz;
      const $svg = S.stage(ctx.$viz, 520, 140, 'Client and server');
      ctx.s = { $svg, client: S.box($svg, C.x, C.y, 130, 48, 'Client', '', 'is-active'), server: S.box($svg, SV.x, SV.y, 140, 48, 'Server', 'waiting', ''), link: S.link($svg, C, SV, 'is-live') };
      draw(ctx);
    },
    onParam(ctx) { draw(ctx); },
    step(ctx) {
      const r = REQ[ctx.param('req')];
      const times = ctx.param('twice') ? 2 : 1;
      for (let i = 0; i < times; i += 1) {
        const st = i === 0 ? r.first : r.again;
        ctx.after(ctx.reduced ? 0 : i * 700, () => {
          if (!ctx.reduced) A.simviz.fly(ctx.anim(), ctx.s.$svg, C, SV, 'ok', 300);
          draw(ctx, st, toneOf(st[0]));
          ctx.log((times > 1 ? 'Attempt ' + (i + 1) + ': ' : '') + r.label + ' -> ' + st[0] + ' ' + st[1], toneOf(st[0]) === 'bad' ? 'bad' : 'good');
          ctx.metric('status', st[0], toneOf(st[0]));
        });
      }
      ctx.metric('effect', times > 1 ? r.effect : 'See table', r.idem ? 'ok' : 'warn');
      if (times > 1) {
        ctx.log(r.idem ? 'Safe to retry: ' + r.effect : 'Not safe to retry: ' + r.effect, r.idem ? 'good' : 'bad');
        ctx.say(SAY.twice);
      } else ctx.say(SAY.intro);
    },
  });
})(window.Atlas);
