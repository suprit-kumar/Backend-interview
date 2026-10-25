/* JWT verification playground: the API checks signature, expiry and audience before trusting any claim. */
(function (A) {
  const CL = { x: 80, y: 70 };
  const API = { x: 440, y: 70 };
  const CASES = {
    'Valid token': { sig: true, exp: true, aud: true },
    'Expired token': { sig: true, exp: false, aud: true },
    'Payload edited (role=admin)': { sig: false, exp: true, aud: true },
    'Token for another API (wrong aud)': { sig: true, exp: true, aud: false },
  };
  const CHECKS = [['sig', 'Signature matches header.payload'], ['exp', 'exp claim is in the future'], ['aud', 'aud claim is this API']];
  const NAMES = ['Signature', 'Expiry', 'Audience'];
  const SAY = {
    intro: {
      beginner: 'A token is like a stamped ticket. The guard checks the stamp is real, the date is still good, and the ticket is for this venue.',
      intermediate: 'A JWT is header.payload.signature. The payload is only encoded, not secret. The API recomputes the signature with its key; any edit to the payload makes it fail.',
      expert: 'Always pin the accepted algorithms (reject alg none and key-confusion between HS256 and RS256), validate exp, nbf, iss and aud, and allow only a few seconds of clock skew. Verification is stateless, so revocation needs short lifetimes or a denylist.',
    },
    ok: {
      beginner: 'All checks passed, so the API trusts the ticket.',
      intermediate: 'Signature, expiry and audience are all valid, so the claims can be used for authorization.',
      expert: 'Passing verification proves integrity, not that the user is still allowed. Re-check permissions that must be current.',
    },
    bad: {
      beginner: 'One check failed, so the API refuses the ticket.',
      intermediate: 'The first failing check rejects the request with 401. Never act on claims from a token that has not been verified.',
      expert: 'Return a generic 401 to clients but log the precise reason. Do not decode and trust the payload before verifying the signature.',
    },
  };

  function reset(ctx) {
    ctx.s.boxes.forEach((b, i) => A.simviz.setBox(b, NAMES[i], 'not checked'));
    ctx.s.boxes.forEach(b => A.simviz.tone(b, '', false));
    A.simviz.setBox(ctx.s.api, 'API', 'waiting');
    A.simviz.tone(ctx.s.api, '', false);
    ctx.metric('result', '-');
  }

  A.sims.register('jwt-verify', {
    title: 'JWT verification: what the API checks',
    note: 'Choose a token and send it. The API runs the checks in order and stops at the first failure.',
    intro: SAY.intro,
    controls: [{ id: 'case', label: 'Token', type: 'select', options: Object.keys(CASES), value: 'Valid token' }],
    actions: [{ id: 'call', label: 'Call API with token', icon: 'shield-check', primary: true }],
    metrics: [{ id: 'result', label: 'Result' }],
    init(ctx) {
      const S = A.simviz;
      const $svg = S.stage(ctx.$viz, 520, 170, 'Client, API and checks');
      const boxes = [0, 1, 2].map(i => S.box($svg, 260, 22 + i * 52, 120, 40, '', '', ''));
      ctx.s = { $svg, boxes, client: S.box($svg, CL.x, CL.y + 20, 120, 44, 'Client', 'Bearer token', 'is-active'), api: S.box($svg, API.x, API.y + 20, 110, 44, 'API', 'waiting', '') };
      reset(ctx);
    },
    onParam(ctx) { reset(ctx); },
    step(ctx) {
      const c = CASES[ctx.param('case')];
      reset(ctx);
      if (!ctx.reduced) A.simviz.fly(ctx.anim(), ctx.s.$svg, CL, API, 'ok', 300);
      let failed = false;
      CHECKS.forEach((chk, i) => {
        ctx.after(ctx.reduced ? 0 : 350 + i * 350, () => {
          if (failed) return;
          const ok = c[chk[0]];
          A.simviz.setBox(ctx.s.boxes[i], NAMES[i], ok ? 'passed' : 'FAILED');
          A.simviz.tone(ctx.s.boxes[i], ok ? 'ok' : 'bad', true);
          ctx.log((ok ? 'PASS ' : 'FAIL ') + chk[1], ok ? 'good' : 'bad');
          if (!ok) failed = true;
          if (!ok || i === CHECKS.length - 1) {
            A.simviz.setBox(ctx.s.api, 'API', ok ? '200 OK' : '401 Unauthorized');
            A.simviz.tone(ctx.s.api, ok ? 'ok' : 'bad', true);
            ctx.metric('result', ok ? '200 OK' : '401', ok ? 'ok' : 'bad');
            ctx.say(ok ? SAY.ok : SAY.bad);
          }
        });
      });
    },
  });
})(window.Atlas);
