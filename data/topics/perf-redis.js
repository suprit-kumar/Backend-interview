/* Performance & Caching: Redis. */
Atlas.topics.push({
  id: 'redis',
  category: 'performance-caching',
  title: 'Redis',
  source: {
    description: 'An in-memory store with rich data types and TTLs.',
    steps: ['App', 'GET key', 'Found in RAM', 'Return in under 1 ms'],
  },
  estMinutes: 14,
  prereqs: ['caching'],
  related: ['caching', 'rate-limiting', 'session-management', 'message-queues'],
  tags: ['redis', 'in-memory', 'ttl', 'data types', 'persistence', 'pub/sub', 'single-threaded'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'table',
      columns: ['key', 'type', 'value', 'ttl'],
      rows: [
        ['session:ab12', 'string', '{"user":7}', '1800 s'],
        ['leaderboard', 'sorted set', 'ana 90, raj 75', 'none'],
        ['jobs', 'list', '[job9, job10]', 'none'],
        ['user:7:cart', 'hash', 'pen=2, book=1', '3600 s'],
      ],
    },
  },
  steps: [
    {
      label: 'App',
      caption: {
        beginner: 'Your app needs a piece of data quickly, such as a logged-in user\'s session.',
        intermediate: 'The app talks to Redis over a TCP connection using a client library, ideally through a connection pool.',
        expert: 'Redis speaks RESP over TCP. Pipelining sends many commands in one round trip, and most latency in practice is network time, not Redis work.',
      },
      state: { dim: [1, 2, 3], note: 'Redis holds several data types.', changed: 'Four keys of different types live in memory.' },
      hood: 'RESP protocol; pipelining and connection reuse reduce round trips.',
    },
    {
      label: 'GET key',
      caption: {
        beginner: 'The app asks for one item by its name.',
        intermediate: 'GET session:ab12 looks the key up in a hash table, an O(1) operation on average.',
        expert: 'The keyspace is a hash table. Commands on collections have their own complexity: LRANGE and SMEMBERS on huge collections are O(n) and block the single command thread.',
      },
      state: { rows: [0], cells: [[0, 0]], note: 'Looking up session:ab12', changed: 'The key is located by hash lookup.' },
      hood: 'Avoid O(n) commands (KEYS, SMEMBERS on large sets); use SCAN and SSCAN instead.',
    },
    {
      label: 'Found in RAM',
      caption: {
        beginner: 'The answer is already in memory, so there is no slow disk read.',
        intermediate: 'Data lives in RAM. Optional persistence (RDB snapshots or the AOF log) lets it survive restarts, but the working set must fit in memory.',
        expert: 'Redis executes commands on one main thread, so each command is atomic and there are no data-structure locks. Memory is limited by RAM; maxmemory plus an eviction policy (such as allkeys-lru) bounds it.',
      },
      state: { rows: [0], cells: [[0, 2]], note: 'Value read from memory', changed: 'The value is read straight from RAM.' },
      hood: 'Single-threaded command execution makes each command atomic. Persistence: RDB snapshots and AOF.',
    },
    {
      label: 'Return in under 1 ms',
      caption: {
        beginner: 'The answer comes back almost instantly.',
        intermediate: 'A simple command usually completes in well under a millisecond on the server, and the client sees mostly network latency.',
        expert: 'A single instance can serve on the order of 100,000 simple operations per second. // VERIFY hardware and pipelining dependent. Beyond one core, scale with Redis Cluster sharding by hash slot.',
      },
      state: { rows: [0], dim: [1, 2, 3], note: 'Response sent', changed: 'The reply is returned to the app.' },
      hood: 'Redis Cluster shards the keyspace into 16384 hash slots across nodes.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A whiteboard in an office. Anyone can write or read a note instantly, but the board is small and a cleaner might wipe it. For anything permanent you also keep records in a filing cabinet.',
      explanation: 'Redis is a very fast database that keeps data in memory. It is not just plain values: it has lists, sets, sorted sets and more. Items can expire automatically. People use it for caches, sessions, counters and queues.',
      keyTerms: [
        { term: 'In-memory', meaning: 'Data is stored in RAM, which is much faster than disk.' },
        { term: 'Key', meaning: 'The unique name used to find a value.' },
        { term: 'TTL', meaning: 'A timer after which the key is deleted automatically.' },
        { term: 'Data type', meaning: 'The shape of a value, such as string, list, hash or sorted set.' },
        { term: 'Persistence', meaning: 'Saving data to disk so it survives a restart.' },
      ],
    },
    intermediate: {
      explanation: 'Redis offers strings, hashes, lists, sets, sorted sets, streams and more, with atomic operations like INCR. Use it as a cache, session store, rate limiter, leaderboard or lightweight queue. Choose persistence, eviction and replication settings deliberately.',
      howItWorks: [
        'Clients connect over TCP and send commands.',
        'The server executes each command on its main thread, so each command is atomic.',
        'Data lives in memory, with optional RDB snapshots and an AOF append-only log for persistence.',
        'EXPIRE and TTLs remove keys automatically.',
        'Replicas copy data asynchronously from a primary; Sentinel or Cluster handles failover and sharding.',
        'maxmemory and an eviction policy decide what to drop when memory is full.',
      ],
      tradeoffs: {
        use: [
          'Use Redis for caches, sessions, rate limits and counters needing sub-millisecond access.',
          'Use sorted sets for leaderboards and priority ordering, and streams or lists for simple queues.',
          'Use atomic commands and Lua scripts when several operations must happen together.',
        ],
        avoid: [
          'Avoid it as the only home for data you cannot lose, because persistence and async replication can lose recent writes.',
          'Avoid datasets far larger than affordable RAM.',
          'Avoid O(n) commands on huge keys in production paths.',
        ],
      },
      pitfalls: [
        'Running KEYS * in production, which blocks the server.',
        'Big keys (huge lists or hashes) causing latency spikes.',
        'Forgetting TTLs so memory grows until eviction or out-of-memory.',
        'Assuming replicas are always current.',
        'Using one shared Redis for cache and critical data with an eviction policy that can drop the critical data.',
      ],
    },
    expert: {
      internals: [
        'Command execution is single-threaded; Redis 6 and later can use I/O threads for network reads and writes, but commands still run serially.',
        'Compact encodings (listpack, intset) are used for small collections and convert to hash tables or skip lists when they grow.',
        'Expiry combines lazy deletion (on access) with periodic active sampling of keys with TTLs.',
        'Persistence trade-offs: RDB is compact and fast to restore but loses data since the last snapshot; AOF with fsync everysec loses at most about a second; always gives the strongest guarantee at higher cost. // VERIFY configuration defaults',
        'Replication is asynchronous by default; WAIT can require replica acknowledgement but does not make Redis strongly consistent.',
      ],
      failureModes: [
        'Slow commands or big keys blocking every client because execution is serial.',
        'Out-of-memory or eviction dropping needed keys when maxmemory is reached.',
        'Failover losing acknowledged writes that had not reached a replica.',
        'Fork-based snapshots causing latency spikes and memory doubling under heavy writes.',
      ],
      scalingNotes: [
        'Scale reads with replicas and writes with Redis Cluster, which spreads 16384 hash slots over primaries.',
        'Use hash tags so related keys land in the same slot when you need multi-key operations.',
        'Watch latency percentiles and the slow log rather than average latency.',
      ],
      realSystems: [
        'Managed offerings: AWS ElastiCache, Azure Cache for Redis, Redis Cloud.',
        'Libraries built on Redis: Celery and RQ (queues), redis-py, Sidekiq in Ruby.',
        'Alternatives with a similar model: Memcached (simple cache) and Valkey (a Redis-compatible fork).',
      ],
      numbersToKnow: [
        'A single instance can reach on the order of 100,000 simple operations per second. // VERIFY hardware dependent',
        'Redis Cluster has 16384 hash slots.',
        'Strings are limited to 512 MB per value.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Counter with expiry and a leaderboard (redis-py)',
      code: [
        'import redis',
        '',
        'r = redis.Redis(decode_responses=True)',
        '',
        'hits = r.incr("page:home:hits")',
        'r.expire("page:home:hits", 3600)',
        '',
        'r.zadd("leaderboard", {"ana": 90, "raj": 75})',
        'top = r.zrevrange("leaderboard", 0, 2, withscores=True)',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'INCR is atomic, so concurrent clients never lose an increment.' },
        { line: 6, text: 'EXPIRE bounds memory by deleting the key after an hour.' },
        { line: 8, text: 'A sorted set keeps members ordered by score for ranking queries.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why is Redis fast?', answer: 'It keeps data in memory, uses efficient data structures and executes commands on a single thread without lock overhead.', followUps: ['What is the downside of keeping data in memory?'] },
    { level: 'beginner', q: 'What would you use Redis for?', answer: 'Caching, sessions, counters, rate limiting, leaderboards and simple queues or pub/sub.', followUps: ['Which data type suits a leaderboard?'] },
    { level: 'intermediate', q: 'How does Redis persist data?', answer: 'RDB writes periodic snapshots; AOF logs every write and can fsync every second or on every write. They can be combined. Persistence is for restart recovery, not for guaranteeing no loss.', followUps: ['What can you lose with AOF everysec?'] },
    { level: 'intermediate', q: 'Why avoid the KEYS command?', answer: 'It scans the whole keyspace in one blocking command, stalling all other clients. Use SCAN, which iterates incrementally.', followUps: ['What other commands are risky on big collections?'] },
    { level: 'expert', q: 'How would you build a safe distributed lock with Redis, and what are its limits?', answer: 'SET key value NX PX with a unique token, release with a Lua script that checks the token, and use fencing tokens for correctness-critical work. Locks on a single node are not safe across failover, and clock or pause issues can break mutual exclusion, so use a consensus-based system when correctness matters.', followUps: ['What is Redlock and why is it debated?'] },
    { level: 'expert', q: 'Latency spikes appear on a Redis primary. What do you check?', answer: 'The slow log for O(n) commands or big keys, fork time during RDB or AOF rewrite, swapping or memory pressure, network and client-side queuing, expiry storms from many keys with the same TTL, and the latency monitor.', followUps: ['How do you prevent expiry storms?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Where does Redis keep its working data?', options: ['On disk only', 'In memory', 'In the browser', 'In a CDN'], answerIndex: 1, why: 'Redis is an in-memory store, which is why access is so fast.' },
    { level: 'beginner', q: 'What does EXPIRE do?', options: ['Locks a key', 'Deletes the key after a time', 'Copies a key', 'Renames a key'], answerIndex: 1, why: 'It sets a TTL after which the key is removed.' },
    { level: 'intermediate', q: 'Which command is unsafe on a large production keyspace?', options: ['GET', 'INCR', 'KEYS *', 'EXPIRE'], answerIndex: 2, why: 'KEYS scans every key in one blocking command; SCAN is the incremental alternative.' },
    { level: 'expert', q: 'Why are commands atomic in Redis?', options: ['Every key has a lock', 'A single main thread executes commands one at a time', 'Disk writes are synchronous', 'Clients coordinate'], answerIndex: 1, why: 'Serial execution on one thread means one command cannot interleave with another.' },
  ],
});
