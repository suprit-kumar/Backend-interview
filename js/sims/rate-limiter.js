/* Token bucket: a bucket of tokens drains per request and refills over time. Defaults match the reference (capacity 5, 1 token/s). */
(function (A) {
  const W = 520;
  const H = 200;
  const SAY = {
    intro: {
      beginner: 'Imagine a bucket of tickets. Each request takes one ticket, and new tickets drop in slowly. No ticket means please wait.',
      intermediate: 'A token bucket allows bursts up to its capacity and a steady average rate equal to the refill rate. Empty bucket means HTTP 429.',
      expert: 'Capacity sets the largest burst and refill sets the sustained rate. Distributed limiters keep the counters in a shared store such as Redis, and the check-and-decrement must be atomic.',
    },
    ok: {
      beginner: 'A ticket was available, so the request got through and the bucket drained a little.',
      intermediate: 'Tokens > 0: the request is allowed and one token is removed. Bursts are fine until the bucket empties.',
      expert: 'Allowed requests are cheap to decide. Return rate-limit headers (limit, remaining, reset) so clients can back off before they hit 429.',
    },
    no: {
      beginner: 'The bucket is empty, so the request is turned away. Wait a moment for tickets to refill.',
      intermediate: 'No tokens: reject with 429 Too Many Requests, ideally with a Retry-After header.',
      expert: 'Rejecting is the protection working. Clients should retry with backoff and jitter, or they turn a limit into a retry storm.',
    },
  };

  function draw(ctx) {
    const s = ctx.s;
    const frac = s.cap ? s.t / s.cap : 0;
    const top = 40;
    const h = 120;
    s.water.attr({ y: top + h * (1 - frac), height: h * frac });
    s.count.text(s.t + ' / ' + s.cap + ' tokens');
    s.fill.attr('width', Math.round(s.prog * 160));
    ctx.metric('tokens', s.t, s.t === 0 ? 'bad' : 'ok');
    ctx.metric('allowed', s.allowed);
    ctx.metric('rejected', s.rejected, s.rejected ? 'bad' : '');
  }

  function startRefill(ctx) {
    ctx.clear();
    const rate = ctx.param('refill');
    const tick = 200;
    ctx.every(tick, () => {
      const s = ctx.s;
      if (s.t >= s.cap) { s.prog = 0; draw(ctx); return; }
      s.prog += (tick / 1000) * rate;
      if (s.prog >= 1) { s.prog = 0; s.t += 1; }
      draw(ctx);
    });
  }

  function setup(ctx) {
    const cap = ctx.param('cap');
    const $svg = A.simviz.stage(ctx.$viz, W, H, 'Token bucket');
    const V = A.visuals;
    V.svg('rect', { x: 180, y: 40, width: 160, height: 120, rx: 10, class: 'sx-bucket' }, $svg);
    const water = V.svg('rect', { x: 182, y: 100, width: 156, height: 0, class: 'sx-water' }, $svg);
    const count = V.text($svg, 260, 30, '', 'sx-txt', 'middle');
    V.svg('rect', { x: 180, y: 176, width: 160, height: 8, rx: 4, class: 'sx-cell' }, $svg);
    const fill = V.svg('rect', { x: 180, y: 176, width: 0, height: 8, rx: 4, class: 'sx-bar' }, $svg);
    V.text($svg, 260, 197, 'next token', 'sx-cap', 'middle');
    ctx.s = { t: cap, cap, allowed: 0, rejected: 0, prog: 0, water, count, fill };
    draw(ctx);
    startRefill(ctx);
  }

  function request(ctx) {
    const s = ctx.s;
    if (s.t > 0) { s.t -= 1; s.allowed += 1; ctx.log('✅ 200 OK', 'good'); ctx.say(SAY.ok); } else { s.rejected += 1; ctx.log('🚫 429 Too Many Requests', 'bad'); ctx.say(SAY.no); }
    draw(ctx);
  }

  A.sims.register('rate-limiter', {
    title: 'Token bucket rate limiter',
    note: 'Capacity 5, refills 1 token per second by default. Each request costs one token.',
    intro: SAY.intro,
    controls: [
      { id: 'cap', label: 'Capacity', type: 'range', min: 1, max: 10, value: 5, unit: ' tokens' },
      { id: 'refill', label: 'Refill', type: 'range', min: 1, max: 5, value: 1, unit: ' /s' },
    ],
    actions: [{ id: 'send', label: 'Send request', icon: 'send', primary: true }, { id: 'burst', label: 'Burst x8', icon: 'lightning-charge' }],
    autoMs: 700,
    metrics: [{ id: 'tokens', label: 'Tokens left' }, { id: 'allowed', label: 'Allowed (200)' }, { id: 'rejected', label: 'Rejected (429)' }],
    init: setup,
    onParam(ctx, k) {
      if (k === 'cap') { ctx.s.cap = ctx.param('cap'); ctx.s.t = ctx.s.cap; draw(ctx); } else startRefill(ctx);
    },
    step(ctx, act) {
      if (act === 'burst') { for (let i = 0; i < 8; i += 1) request(ctx); } else request(ctx);
    },
  });
})(window.Atlas);
