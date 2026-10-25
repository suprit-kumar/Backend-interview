/* Performance & Caching: Caching. Playground: js/sims/lru-cache.js; worked example (stampede) in data/worked/worked.js. */
Atlas.topics.push({
  id: 'caching',
  category: 'performance-caching',
  title: 'Caching',
  source: {
    description: 'Keep hot data close so you skip the slow source.',
    steps: ['Request', 'Check cache', 'Miss: read DB and store', 'Hit: return fast'],
  },
  estMinutes: 15,
  prereqs: ['database-query-optimization'],
  related: ['redis', 'rate-limiting', 'database-replication', 'performance-optimization'],
  tags: ['cache', 'ttl', 'lru', 'cache-aside', 'invalidation', 'stampede', 'hit rate'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'client', x: 8, y: 50 },
        { id: 'api', label: 'API', kind: 'service', x: 36, y: 50 },
        { id: 'cache', label: 'Cache', kind: 'cache', x: 68, y: 18 },
        { id: 'db', label: 'Database', kind: 'db', x: 68, y: 82 },
      ],
      edges: [{ from: 'client', to: 'api' }, { from: 'api', to: 'cache' }, { from: 'api', to: 'db' }],
    },
  },
  steps: [
    {
      label: 'Request',
      caption: {
        beginner: 'A user asks for something, like a product page.',
        intermediate: 'The API receives a read request for data that changes rarely compared with how often it is read.',
        expert: 'Caching pays off when reads greatly outnumber writes and the same keys repeat. Measure the key popularity distribution before adding a cache.',
      },
      state: { packets: [{ from: 'client', to: 'api', tone: 'ok', label: 'GET /p/7' }], active: ['api'], changed: 'A read request arrives.' },
      hood: 'Decide per endpoint: cache only where read-to-write ratio and key reuse justify it.',
    },
    {
      label: 'Check cache',
      caption: {
        beginner: 'Before the slow work, the app looks in a nearby shelf of ready answers.',
        intermediate: 'Cache-aside: the app asks the cache first using a key built from the request.',
        expert: 'Keys must include everything that changes the answer (tenant, locale, version) or users see each other\'s data. A cache lookup in Redis costs a network round trip of well under a millisecond in the same region.',
      },
      state: { packets: [{ from: 'api', to: 'cache', tone: 'ok', label: 'GET key' }], active: ['cache'], badges: { cache: 'miss' }, changed: 'The cache does not have the key.' },
      hood: 'Key design is a security issue: include tenant and permissions in the key where responses differ.',
    },
    {
      label: 'Miss: read DB and store',
      caption: {
        beginner: 'It was not on the shelf, so the app fetches it the slow way and puts a copy on the shelf for next time.',
        intermediate: 'On a miss the app reads the database, stores the result in the cache with a TTL and returns it. The first request pays the full cost.',
        expert: 'When a hot key expires, many requests can miss at once and stampede the database. Mitigate with request coalescing (single flight), early refresh, jittered TTLs or a short lock around the rebuild.',
      },
      state: { packets: [{ from: 'api', to: 'db', tone: 'bad', label: 'SELECT' }], active: ['db'], failed: [], badges: { db: 'slow path', cache: 'store + TTL' }, changed: 'The database serves the miss and the cache is filled.' },
      hood: 'Stampede protection: single-flight, jittered TTL, stale-while-revalidate.',
    },
    {
      label: 'Hit: return fast',
      caption: {
        beginner: 'The next person asking for the same thing gets the answer straight from the shelf, much faster.',
        intermediate: 'On a hit the API returns the cached value without touching the database. Hit rate decides how much load you save.',
        expert: 'Effective latency = hit_rate x t_cache + (1 - hit_rate) x t_source. Going from 90% to 99% hit rate cuts source traffic tenfold. Watch evictions, memory and the cost of invalidation.',
      },
      state: { packets: [{ from: 'cache', to: 'api', tone: 'ok', label: 'hit' }, { from: 'api', to: 'client', tone: 'ok', label: '200' }], active: ['cache', 'api'], badges: { cache: 'hit' }, changed: 'Served from the cache; the database is untouched.' },
      hood: 'Source load scales with the miss rate, so 99% versus 90% hit rate is a tenfold reduction.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A kitchen keeps salt, oil and spices on the counter instead of walking to the pantry each time. The counter is small and fast; the pantry is big and slow. You keep on the counter what you use most.',
      explanation: 'A cache is a small, fast store holding copies of data that is slow to get. The first request does the slow work and saves the result. Later requests reuse the saved copy. The hard part is knowing when the copy is out of date.',
      keyTerms: [
        { term: 'Cache hit', meaning: 'The data was found in the cache.' },
        { term: 'Cache miss', meaning: 'The data was not in the cache, so the slow source is used.' },
        { term: 'TTL', meaning: 'Time to live: how long a cached item stays valid.' },
        { term: 'Eviction', meaning: 'Removing items to make room, such as the least recently used.' },
        { term: 'Invalidation', meaning: 'Removing or updating a copy when the original changes.' },
      ],
    },
    intermediate: {
      explanation: 'Common patterns are cache-aside (app manages the cache), read-through and write-through (cache sits in front), and write-behind. Choose a TTL, an eviction policy such as LRU, and an invalidation strategy. Track hit rate, latency and memory.',
      howItWorks: [
        'Build a cache key from the request parameters.',
        'Look up the key in the cache.',
        'On a hit, return the cached value.',
        'On a miss, read the source, store the result with a TTL and return it.',
        'On a write, update the source and delete or update the cache entry.',
        'When memory is full, evict entries by a policy such as LRU or LFU.',
      ],
      tradeoffs: {
        use: [
          'Use caching for read-heavy data that tolerates being a little stale, such as product pages or profiles.',
          'Use it to protect a slow or costly dependency such as a database or third-party API.',
          'Use short TTLs plus explicit invalidation for data that changes but is read often.',
        ],
        avoid: [
          'Avoid caching data that must always be exactly current, such as account balances at the moment of payment.',
          'Avoid caching per-user data under a shared key.',
          'Avoid caching when keys rarely repeat; you pay memory for no hits.',
        ],
      },
      pitfalls: [
        'Stale data after writes because invalidation is missed.',
        'Cache stampede when a hot key expires and many requests rebuild it together.',
        'Cache penetration: repeated lookups for keys that do not exist, always missing.',
        'Unbounded cache growth with no TTL or size limit.',
        'Treating the cache as the only copy of important data.',
      ],
    },
    expert: {
      internals: [
        'Cache-aside leaves the app in control; read-through and write-through move that logic into the cache layer; write-behind batches writes asynchronously and risks loss on a crash.',
        'LRU evicts the least recently used item; LFU uses frequency; approximations (Redis sampling, TinyLFU in Caffeine) avoid exact bookkeeping cost.',
        'Stampede defences: single-flight per key, probabilistic early expiry, stale-while-revalidate, and jittered TTLs.',
        'Negative caching (storing "not found" briefly) stops penetration; Bloom filters can pre-screen keys.',
        'Multi-level caching combines in-process (nanoseconds), distributed (sub-millisecond) and CDN layers, multiplying invalidation complexity.',
      ],
      failureModes: [
        'Cache outage sending full traffic to the database and cascading into an outage.',
        'Cold start after restart or deploy causing a miss storm.',
        'Inconsistent data from racing writes and invalidations (stale set after delete).',
        'Hot keys overloading a single cache node.',
      ],
      scalingNotes: [
        'Shard a distributed cache by key with consistent hashing; replicate or locally cache extremely hot keys.',
        'Plan capacity so the source can survive at a low hit rate during warm-up.',
        'Prefer expiry plus idempotent rebuilds over complex distributed invalidation where staleness is acceptable.',
      ],
      realSystems: [
        'Redis and Memcached as distributed caches.',
        'Caffeine (JVM) and cachetools or functools.lru_cache in Python as in-process caches.',
        'CDNs such as Cloudflare and Fastly cache HTTP responses near users.',
      ],
      numbersToKnow: [
        'Effective latency = hit_rate x cache_latency + miss_rate x source_latency.',
        'A 99% hit rate leaves one tenth of the source load of a 90% hit rate.',
        'In-memory reads take nanoseconds to microseconds; a Redis call in the same data centre is commonly a fraction of a millisecond; a database query is often milliseconds or more. // VERIFY workload dependent',
      ],
    },
  },
  sim: 'lru-cache',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Cache-aside with Redis and a TTL',
      code: [
        'import json, redis',
        '',
        'r = redis.Redis()',
        '',
        'def get_product(pid: int):',
        '    key = f"product:{pid}"',
        '    cached = r.get(key)',
        '    if cached:',
        '        return json.loads(cached)',
        '    row = db.fetch_product(pid)',
        '    r.set(key, json.dumps(row), ex=300)',
        '    return row',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'The key names the entity; add tenant or locale when responses differ.' },
        { line: 8, text: 'A hit returns immediately without touching the database.' },
        { line: 11, text: 'ex=300 sets a 5 minute TTL so stale data eventually disappears.' },
      ],
    },
    {
      lang: 'python',
      title: 'In-process LRU cache',
      code: [
        'from functools import lru_cache',
        '',
        '@lru_cache(maxsize=1024)',
        'def country_name(code: str) -> str:',
        '    return db.lookup_country(code)',
        '',
        'country_name.cache_info()  # hits, misses, size',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'maxsize bounds memory; the least recently used entry is evicted when full.' },
        { line: 7, text: 'cache_info() exposes the hit rate you should monitor.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a cache and why use one?', answer: 'A small fast store of copies of data that is slow to fetch. It reduces latency and load on the original source.', followUps: ['What is a cache hit versus a miss?'] },
    { level: 'beginner', q: 'What is a TTL?', answer: 'Time to live: how long a cached item is considered valid before it expires and must be fetched again.', followUps: ['What happens if the TTL is too long?'] },
    { level: 'intermediate', q: 'Explain cache-aside versus write-through.', answer: 'In cache-aside the application reads the cache, loads from the source on a miss and writes the result back. In write-through every write goes through the cache to the source, keeping them in step at the cost of write latency.', followUps: ['Which has simpler failure behaviour?'] },
    { level: 'intermediate', q: 'How do you keep a cache consistent with the database?', answer: 'Use TTLs for bounded staleness, delete or update the entry on writes, and accept short inconsistency windows. Delete-after-write plus a TTL is a common, robust pattern.', followUps: ['What race can still leave stale data?'] },
    { level: 'expert', q: 'What is a cache stampede and how do you prevent it?', answer: 'When a popular key expires, many concurrent requests miss and hit the database together. Prevent it with single-flight so one request rebuilds, jittered TTLs, stale-while-revalidate or early probabilistic refresh, and a rate-limited rebuild.', followUps: ['What if the rebuild itself is slow?'] },
    { level: 'expert', q: 'The cache cluster goes down. What happens and how do you design for it?', answer: 'All traffic hits the database and can overload it. Design with timeouts and circuit breakers on the cache client, load shedding, a smaller in-process fallback cache, capacity for a degraded hit rate and a gradual warm-up after recovery.', followUps: ['How would you test it?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What happens on a cache miss?', options: ['The request fails', 'The app reads the slow source and usually stores the result', 'The cache is deleted', 'The TTL doubles'], answerIndex: 1, why: 'A miss falls back to the source and normally fills the cache for later requests.' },
    { level: 'beginner', q: 'What does a TTL do?', options: ['Encrypts data', 'Expires cached items after a set time', 'Counts hits', 'Adds a server'], answerIndex: 1, why: 'TTL limits how long a cached copy can be stale.' },
    { level: 'intermediate', q: 'Which data is a poor cache candidate?', options: ['A product description', 'A country list', 'A balance read just before a payment', 'A static logo'], answerIndex: 2, why: 'Data that must be exactly current cannot tolerate stale cached values.' },
    { level: 'expert', q: 'Raising hit rate from 90% to 99% changes source load by about:', options: ['2x less', '10x less', 'No change', '100x less'], answerIndex: 1, why: 'Miss rate falls from 10% to 1%, a tenfold reduction in source requests.' },
  ],
});
