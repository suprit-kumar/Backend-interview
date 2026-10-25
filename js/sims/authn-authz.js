/* AuthN vs AuthZ: 401 means "who are you?", 403 means "I know you, but no". */
(function (A) {
  const C = { x: 80, y: 60 };
  const SV = { x: 440, y: 60 };
  const ROLES = ['Anonymous', 'User (id 7)', 'Admin'];
  const RES = {
    'GET /health (public)': { need: null },
    'GET /orders/7 (an order of user 7)': { need: 'owner' },
    'GET /orders/9 (an order of user 9)': { need: 'owner9' },
    'DELETE /admin/users/3': { need: 'admin' },
  };
  const SAY = {
    intro: {
      beginner: 'First the guard asks who you are (authentication). Then they check if your pass opens this particular door (authorization).',
      intermediate: 'No valid identity returns 401 Unauthorized. A known identity without permission returns 403 Forbidden. Checks happen on the server for every request.',
      expert: 'Enforce authorization at the object level, not just the route: user 7 reading order 9 is broken object level authorization (the top item in the OWASP API Security list). Return 404 instead of 403 when even revealing existence is sensitive.',
    },
    ok: {
      beginner: 'Identity known and allowed, so the door opens.',
      intermediate: 'Authentication and the permission rule both passed, so the handler runs.',
      expert: 'Keep the decision in one policy function (RBAC, ABAC or a policy engine) so rules are testable and consistent.',
    },
    no401: {
      beginner: 'The guard does not know who you are, so you are asked to identify yourself.',
      intermediate: '401: missing or invalid credentials. The client should authenticate and try again.',
      expert: 'Send a WWW-Authenticate header, and do not leak whether the account exists.',
    },
    no403: {
      beginner: 'The guard knows you, but your pass does not open this door.',
      intermediate: '403: identity is fine, permission is missing. Logging in again will not help.',
      expert: 'Log denials for auditing and alerting. Repeated 403s from one identity can indicate probing.',
    },
  };

  function decide(role, need) {
    if (!need) return { code: 200, why: 'public endpoint' };
    if (role === 0) return { code: 401, why: 'no identity' };
    if (need === 'owner') return { code: 200, why: 'user owns the order' };
    if (need === 'owner9') return role === 2 ? { code: 200, why: 'admin may read any order' } : { code: 403, why: 'order belongs to user 9' };
    return role === 2 ? { code: 200, why: 'admin role' } : { code: 403, why: 'requires admin role' };
  }

  A.sims.register('authn-authz', {
    title: 'Authentication vs authorization: 401 or 403?',
    note: 'Pick who is calling and what they ask for. Watch the two separate checks.',
    intro: SAY.intro,
    controls: [
      { id: 'role', label: 'Caller', type: 'select', options: ROLES, value: ROLES[1] },
      { id: 'res', label: 'Request', type: 'select', options: Object.keys(RES), value: 'GET /orders/9 (an order of user 9)' },
    ],
    actions: [{ id: 'go', label: 'Send request', icon: 'send', primary: true }],
    metrics: [{ id: 'authn', label: 'Authenticated?' }, { id: 'code', label: 'Status' }],
    init(ctx) {
      const S = A.simviz;
      const $svg = S.stage(ctx.$viz, 520, 130, 'Caller, authentication check and authorization check');
      ctx.s = { $svg, c: S.box($svg, C.x, C.y, 120, 44, 'Caller', '', 'is-active'), a: S.box($svg, 230, C.y, 110, 44, 'AuthN', 'who?', ''), z: S.box($svg, 360, C.y, 110, 44, 'AuthZ', 'allowed?', '') };
    },
    onParam(ctx) { ['a', 'z'].forEach(k => A.simviz.tone(ctx.s[k], '', false)); },
    step(ctx) {
      const role = ROLES.indexOf(ctx.param('role'));
      const need = RES[ctx.param('res')].need;
      const d = decide(role, need);
      const authed = role > 0;
      ctx.after(0, () => {
        A.simviz.setBox(ctx.s.c, 'Caller', ROLES[role]);
        if (!ctx.reduced) A.simviz.fly(ctx.anim(), ctx.s.$svg, C, { x: 230, y: C.y }, 'ok', 200);
        const authnNeeded = need !== null;
        A.simviz.tone(ctx.s.a, !authnNeeded ? '' : authed ? 'ok' : 'bad', authnNeeded);
        A.simviz.setBox(ctx.s.a, 'AuthN', !authnNeeded ? 'skipped' : authed ? 'known user' : 'unknown');
        ctx.log('AuthN: ' + (!authnNeeded ? 'not required' : authed ? 'identity verified' : 'no valid identity'), authed || !authnNeeded ? 'good' : 'bad');
        ctx.metric('authn', authed ? 'yes' : 'no', authed ? 'ok' : 'warn');
      });
      ctx.after(ctx.reduced ? 0 : 400, () => {
        const reached = d.code !== 401;
        A.simviz.tone(ctx.s.z, !reached ? '' : d.code === 200 ? 'ok' : 'bad', reached);
        A.simviz.setBox(ctx.s.z, 'AuthZ', !reached ? 'not reached' : d.code === 200 ? 'allowed' : 'denied');
        ctx.log('Result ' + d.code + ': ' + d.why, d.code === 200 ? 'good' : 'bad');
        ctx.metric('code', d.code, d.code === 200 ? 'ok' : 'bad');
        ctx.say(d.code === 200 ? SAY.ok : d.code === 401 ? SAY.no401 : SAY.no403);
      });
    },
  });
})(window.Atlas);
