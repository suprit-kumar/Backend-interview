/* LRU cache of size 3: a hit moves the key to the front, a miss loads from the database and evicts the least recently used key. */
(function (A) {
  const SIZE = 3;
  const SAY = {
    intro: {
      beginner: 'The cache is a small shelf for things you ask for often. Ask for a key and see if it is already on the shelf.',
      intermediate: 'LRU keeps the most recently used keys. A hit refreshes the key; a miss reads the database and evicts the least recently used key when full.',
      expert: 'Hit rate is the number to watch. Real caches add a TTL, and LRU can be fooled by one large scan that evicts the whole hot set, which is why variants like LFU or segmented LRU exist.',
    },
    hit: {
      beginner: 'Found on the shelf, so no trip to the slow database was needed.',
      intermediate: 'HIT: served from memory and moved to the most-recent slot.',
      expert: 'A hit costs microseconds against milliseconds for a database read. It also refreshes recency, which protects hot keys from eviction.',
    },
    miss: {
      beginner: 'Not on the shelf, so we fetched it from the database and put it on the shelf.',
      intermediate: 'MISS: read from the database and insert at the front. If the cache was full, the least recently used key is evicted.',
      expert: 'Many simultaneous misses for the same key cause a stampede. Coalesce them with a lock or a single-flight call so the database is hit once.',
    },
  };

  function draw(ctx, hitKey) {
    const s = ctx.s;
    s.boxes.forEach((g, i) => {
      const k = s.c[i];
      A.simviz.setBox(g, k || 'empty', i === 0 ? 'most recent' : (i === SIZE - 1 ? 'next to evict' : ''));
      A.simviz.tone(g, k && k === hitKey ? 'ok' : '', !!k);
      g.toggleClass('is-dim', !k);
    });
    const total = s.h + s.m;
    ctx.metric('hits', s.h, 'ok');
    ctx.metric('misses', s.m, s.m ? 'warn' : '');
    ctx.metric('rate', total ? Math.round((s.h / total) * 100) + '%' : '-');
  }

  function setup(ctx) {
    const $svg = A.simviz.stage(ctx.$viz, 520, 150, 'LRU cache');
    const S = A.simviz;
    const boxes = [0, 1, 2].map(i => S.box($svg, 120 + i * 100, 60, 84, 56, 'empty', '', 'is-dim'));
    A.visuals.text($svg, 220, 20, 'Cache (most recent to least recent)', 'sx-cap', 'middle');
    const db = S.box($svg, 450, 60, 90, 56, 'Database', 'slow', '');
    ctx.s = { c: [], h: 0, m: 0, boxes, db };
    draw(ctx);
    ctx.log('Cache is empty', 'dim');
  }

  function request(ctx, k) {
    const s = ctx.s;
    let x;
    if (s.c.includes(k)) {
      s.h += 1;
      s.c = s.c.filter(z => z !== k);
      x = 'HIT: ' + k + ' served from cache';
      ctx.say(SAY.hit);
      A.simviz.tone(s.db, '', false);
    } else {
      s.m += 1;
      x = 'MISS: read ' + k + ' from the database';
      if (s.c.length === SIZE) x += ', evicted ' + s.c.pop();
      ctx.say(SAY.miss);
      A.simviz.tone(s.db, 'warn', true);
    }
    s.c.unshift(k);
    ctx.log(x + ' | hits ' + s.h + ', misses ' + s.m, x.startsWith('HIT') ? 'good' : 'warn');
    draw(ctx, k);
  }

  A.sims.register('lru-cache', {
    title: 'LRU cache, size 3',
    note: 'Request a key. Most recent key sits on the left, the next one to be evicted on the right.',
    intro: SAY.intro,
    actions: ['A', 'B', 'C', 'D', 'E'].map(k => ({ id: k, label: 'Get ' + k, primary: false })),
    metrics: [{ id: 'hits', label: 'Hits' }, { id: 'misses', label: 'Misses' }, { id: 'rate', label: 'Hit rate' }],
    init: setup,
    step(ctx, k) { request(ctx, k); },
  });
})(window.Atlas);
