/* Session vs signed token: what logging out or revoking does in each model. */
(function (A) {
  const CL = { x: 80, y: 50 };
  const SV = { x: 300, y: 50 };
  const ST = { x: 470, y: 50 };
  const SERVER = 'Server session (cookie ID)';
  const TOKEN = 'Signed token (JWT, 15 min)';
  const SAY = {
    intro: {
      beginner: 'A session is a coat-check ticket: the server keeps your coat. A signed token is a wristband the guard can check without calling anyone.',
      intermediate: 'Server sessions store state in a shared store and look it up on every request, so deleting the entry logs the user out instantly. Signed tokens are verified without a lookup, so they stay valid until they expire.',
      expert: 'Sessions cost a store read per request and need sticky or shared storage (Redis). Tokens scale statelessly but cannot be revoked early without a denylist, short lifetimes plus refresh tokens, or a version counter. Cookies should be HttpOnly, Secure and SameSite.',
    },
    session: {
      beginner: 'The server threw away your ticket, so the next visit is refused straight away.',
      intermediate: 'Revoking deletes the session record, so the next request fails the lookup immediately.',
      expert: 'Immediate revocation is the main reason to keep sessions: password change, account ban and "log out everywhere" all work at once.',
    },
    token: {
      beginner: 'The wristband still looks valid, so the guard lets you in until it runs out.',
      intermediate: 'Nothing on the server changed, so the token still verifies until its expiry. That window is the cost of statelessness.',
      expert: 'Mitigate with short access tokens, rotating refresh tokens that the server can revoke, or a small denylist of token ids checked on sensitive routes.',
    },
  };

  function paint(ctx) {
    const s = ctx.s;
    const mode = ctx.param('mode');
    A.simviz.setBox(s.store, mode === SERVER ? 'Session store' : 'No store', mode === SERVER ? (s.hasSession ? '1 session' : 'empty') : 'not needed');
    A.simviz.tone(s.store, mode === SERVER && s.hasSession ? 'ok' : '', mode === SERVER && s.hasSession);
    A.simviz.setBox(s.client, 'Client', s.loggedIn ? (mode === SERVER ? 'cookie sid=abc' : 'token held') : 'no credentials');
    ctx.metric('lookups', s.lookups);
  }

  function request(ctx) {
    const s = ctx.s;
    const server = ctx.param('mode') === SERVER;
    if (!s.loggedIn) { ctx.log('No credentials: 401', 'bad'); return; }
    if (!ctx.reduced) A.simviz.fly(ctx.anim(), s.$svg, CL, SV, 'ok', 250);
    if (server) {
      s.lookups += 1;
      const ok = s.hasSession;
      ctx.log('Request: session lookup ' + (ok ? 'found -> 200 OK' : 'missing -> 401'), ok ? 'good' : 'bad');
      ctx.metric('result', ok ? '200 OK' : '401', ok ? 'ok' : 'bad');
    } else {
      ctx.log('Request: signature and expiry verified locally -> 200 OK', 'good');
      ctx.metric('result', '200 OK', 'ok');
    }
    paint(ctx);
  }

  A.sims.register('session-vs-token', {
    title: 'Sessions vs signed tokens: logging out and revoking',
    note: 'Log in, make a request, then revoke the user on the server and call again. Compare the two models.',
    intro: SAY.intro,
    controls: [{ id: 'mode', label: 'Model', type: 'select', options: [SERVER, TOKEN], value: SERVER }],
    actions: [
      { id: 'login', label: 'Log in', icon: 'box-arrow-in-right', primary: true },
      { id: 'call', label: 'Make request', icon: 'send', primary: false },
      { id: 'revoke', label: 'Revoke on server, then request', icon: 'x-octagon', primary: false },
    ],
    metrics: [{ id: 'result', label: 'Last result' }, { id: 'lookups', label: 'Store lookups' }],
    init(ctx) {
      const S = A.simviz;
      const $svg = S.stage(ctx.$viz, 560, 120, 'Client, server and session store');
      ctx.s = { $svg, loggedIn: false, hasSession: false, lookups: 0 };
      ctx.s.client = S.box($svg, CL.x, CL.y, 130, 46, 'Client', '', 'is-active');
      S.box($svg, SV.x, SV.y, 110, 46, 'Server', 'API', '');
      ctx.s.store = S.box($svg, ST.x, ST.y, 120, 46, '', '', '');
      paint(ctx);
    },
    onParam(ctx) { ctx.s.loggedIn = false; ctx.s.hasSession = false; ctx.metric('result', '-'); paint(ctx); },
    step(ctx, act) {
      const s = ctx.s;
      const server = ctx.param('mode') === SERVER;
      if (act === 'login') {
        s.loggedIn = true;
        s.hasSession = server;
        ctx.log(server ? 'Logged in: server stored a session and sent a cookie' : 'Logged in: server signed a token and stored nothing', 'good');
        paint(ctx);
        ctx.say(SAY.intro);
      } else if (act === 'revoke') {
        s.hasSession = false;
        ctx.log('Server revokes the user (ban or "log out everywhere")', 'warn');
        request(ctx);
        ctx.say(server ? SAY.session : SAY.token);
      } else request(ctx);
    },
  });
})(window.Atlas);
