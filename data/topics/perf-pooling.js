/* Performance & Caching: Connection Pooling. Playground: js/sims/conn-pool.js. */
Atlas.topics.push({
  id: 'connection-pooling',
  category: 'performance-caching',
  title: 'Connection Pooling',
  source: {
    description: 'Reuse open connections instead of reconnecting each time.',
    steps: ['Borrow connection', 'Run query', 'Return to pool', 'Next request reuses it'],
  },
  estMinutes: 12,
  prereqs: ['sql'],
  related: ['database-query-optimization', 'caching', 'scalability', 'database-locking'],
  tags: ['connection pool', 'pgbouncer', 'sqlalchemy', 'max_connections', 'timeout', 'leak'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'app', label: 'App threads', kind: 'service', x: 10, y: 50 },
        { id: 'pool', label: 'Pool', kind: 'queue', x: 45, y: 50 },
        { id: 'db', label: 'Database', kind: 'db', x: 85, y: 50 },
      ],
      edges: [{ from: 'app', to: 'pool' }, { from: 'pool', to: 'db' }],
    },
  },
  steps: [
    {
      label: 'Borrow connection',
      caption: {
        beginner: 'Instead of opening a new line to the database, the app borrows one that is already open.',
        intermediate: 'The app asks the pool for a connection. If one is idle it is handed over immediately; otherwise the caller waits or a new one is opened up to the limit.',
        expert: 'Opening a connection costs TCP, TLS and authentication round trips, and on PostgreSQL a new backend process. A pool pays that once and amortizes it across many requests.',
      },
      state: { packets: [{ from: 'app', to: 'pool', tone: 'ok', label: 'borrow' }], active: ['pool'], badges: { pool: '3 idle' }, changed: 'A ready connection is handed out.' },
      hood: 'Connection setup = TCP + TLS + auth (and a backend process in PostgreSQL).',
    },
    {
      label: 'Run query',
      caption: {
        beginner: 'The app uses that connection to ask its question.',
        intermediate: 'The query runs on the borrowed connection. While it runs, no one else can use that connection.',
        expert: 'A connection executes one statement at a time. Holding it across slow non-database work (HTTP calls, user waits) starves the pool, so keep the borrow window short.',
      },
      state: { packets: [{ from: 'pool', to: 'db', tone: 'ok', label: 'SELECT' }], active: ['db'], badges: { pool: '2 idle' }, changed: 'The query runs on the borrowed connection.' },
      hood: 'Keep the borrow window tight: do not hold a connection during outbound HTTP calls.',
    },
    {
      label: 'Return to pool',
      caption: {
        beginner: 'When finished, the app hands the connection back instead of closing it.',
        intermediate: 'Closing in application code returns the connection to the pool, which resets session state (rollback, reset) and marks it idle.',
        expert: 'A forgotten return is a connection leak that eventually exhausts the pool. Always release in finally or a context manager, and use pool timeouts and leak detection in production.',
      },
      state: { packets: [{ from: 'app', to: 'pool', tone: 'ok', label: 'release' }], active: ['pool'], badges: { pool: '3 idle' }, changed: 'The connection is idle again.' },
      hood: 'Use context managers; enable pool_pre_ping or validation to drop dead connections.',
    },
    {
      label: 'Next request reuses it',
      caption: {
        beginner: 'The next person borrows the same open connection, so there is no start-up delay.',
        intermediate: 'Reuse skips connection setup, cutting latency and keeping the number of connections on the database bounded.',
        expert: 'Size the pool by database parallelism, not by app thread count. Across many app instances use a server-side pooler (PgBouncer in transaction mode) so total connections stay under max_connections.',
      },
      state: { packets: [{ from: 'app', to: 'pool', tone: 'ok', label: 'borrow (reuse)' }], active: ['pool'], badges: { pool: 'reused' }, changed: 'No connect cost on reuse.' },
      hood: 'Total connections = instances x pool size; PgBouncer multiplexes them onto fewer server connections.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A taxi rank outside a station. Instead of everyone calling a new taxi from far away, a few taxis wait at the rank. A passenger takes one, rides, and the taxi returns to the rank for the next person.',
      explanation: 'Connecting to a database is slow, so apps open a fixed number of connections once and share them. A request borrows one, uses it and returns it. If every connection is busy, new requests wait their turn instead of overloading the database.',
      keyTerms: [
        { term: 'Connection', meaning: 'An open line between the app and the database.' },
        { term: 'Pool', meaning: 'A set of reusable open connections.' },
        { term: 'Pool size', meaning: 'The maximum number of connections the pool holds.' },
        { term: 'Timeout', meaning: 'How long to wait for a free connection before failing.' },
        { term: 'Leak', meaning: 'A borrowed connection that is never returned.' },
      ],
    },
    intermediate: {
      explanation: 'A pool keeps idle connections ready, hands them out on demand and takes them back. Key settings are pool size, overflow, acquire timeout and connection lifetime. Right-size it against database capacity and the number of app instances.',
      howItWorks: [
        'The pool opens a few connections at startup or lazily.',
        'A caller borrows one; if none is idle and the limit is not reached, a new one opens.',
        'If the limit is reached, the caller waits until a connection is returned or a timeout fires.',
        'After use the connection is reset and returned to the idle set.',
        'Idle or old connections are recycled to avoid stale or dead links.',
        'A server-side pooler can multiplex many client connections onto few database connections.',
      ],
      tradeoffs: {
        use: [
          'Use a pool in every service that talks to a database frequently.',
          'Use a server-side pooler such as PgBouncer when many app instances would otherwise exceed max_connections.',
          'Use small, bounded pools so overload becomes queueing instead of database collapse.',
        ],
        avoid: [
          'Avoid very large pools; more connections beyond the database\'s parallelism only add contention.',
          'Avoid holding connections during slow external calls.',
          'Avoid per-request connections except in very low-traffic scripts.',
        ],
      },
      pitfalls: [
        'Leaking connections by not releasing on error paths.',
        'Pool size times instance count exceeding the database connection limit.',
        'Using session state (temporary tables, SET) with transaction-mode poolers.',
        'No acquire timeout, so requests hang forever under load.',
        'Stale connections after a database restart or firewall idle timeout.',
      ],
    },
    expert: {
      internals: [
        'PostgreSQL forks a process per connection, so each costs memory and scheduling; thousands of direct connections degrade performance even when mostly idle.',
        'PgBouncer pool modes: session, transaction and statement. Transaction mode gives the best multiplexing but breaks session-level features such as advisory locks and prepared statements unless supported.',
        'SQLAlchemy QueuePool has pool_size, max_overflow, pool_timeout, pool_recycle and pool_pre_ping; pre-ping validates a connection with a cheap check before use.',
        'Little\'s law: connections in use ≈ query arrival rate x average query time, which helps pick a pool size.',
        'Async drivers (asyncpg) pool connections too, but concurrency per connection is still one statement at a time.',
      ],
      failureModes: [
        'Pool exhaustion: slow queries or leaks leave no free connections and every request times out.',
        'Connection storms after a restart when all instances reconnect at once.',
        'Dead connections after failover causing errors until recycled.',
        'Deadlock where code holds one connection and needs a second from the same exhausted pool.',
      ],
      scalingNotes: [
        'Total database connections = app instances x pool size per instance; plan this against max_connections.',
        'Add PgBouncer or RDS Proxy when instance counts grow or serverless functions open many short-lived connections.',
        'A pool of tens of connections often outperforms hundreds on the same database. // VERIFY workload dependent',
      ],
      realSystems: [
        'PgBouncer and pgcat for PostgreSQL; ProxySQL for MySQL; AWS RDS Proxy.',
        'HikariCP (Java), SQLAlchemy QueuePool, Django persistent connections (CONN_MAX_AGE), asyncpg pools.',
        'HTTP client pools follow the same idea (requests.Session, httpx.Client).',
      ],
      numbersToKnow: [
        'PostgreSQL max_connections defaults to 100. // VERIFY version and distribution',
        'SQLAlchemy defaults: pool_size 5, max_overflow 10, pool_timeout 30 seconds. // VERIFY version',
        'Connection setup is typically several round trips, which can cost milliseconds to tens of milliseconds with TLS.',
      ],
    },
  },
  sim: 'conn-pool',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'SQLAlchemy engine with a bounded pool',
      code: [
        'from sqlalchemy import create_engine',
        '',
        'engine = create_engine(',
        '    "postgresql+psycopg://app@db/shop",',
        '    pool_size=10,',
        '    max_overflow=5,',
        '    pool_timeout=3,',
        '    pool_recycle=1800,',
        '    pool_pre_ping=True,',
        ')',
        '',
        'with engine.connect() as conn:',
        '    conn.execute(text("SELECT 1"))',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'pool_size bounds steady connections; keep it near what the database can run in parallel.' },
        { line: 7, text: 'pool_timeout fails fast instead of hanging when every connection is busy.' },
        { line: 9, text: 'pool_pre_ping checks a connection is alive before handing it out.' },
        { line: 12, text: 'The with block returns the connection to the pool even if an error occurs.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why use a connection pool?', answer: 'Opening a connection is slow and databases can only handle so many at once. A pool reuses a fixed set of open connections, which lowers latency and protects the database.', followUps: ['What happens when all connections are in use?'] },
    { level: 'beginner', q: 'What is a connection leak?', answer: 'Code borrows a connection and never returns it, for example after an error. Eventually the pool runs out and requests hang or fail.', followUps: ['How do you prevent it?'] },
    { level: 'intermediate', q: 'How do you choose a pool size?', answer: 'Start small, near the database\'s useful parallelism (often a few times its core count), then measure. Multiply by the number of app instances and check the total against max_connections. More connections beyond saturation just increase contention.', followUps: ['What does Little\'s law say here?'] },
    { level: 'intermediate', q: 'What does PgBouncer add on top of an app-side pool?', answer: 'It multiplexes many client connections onto fewer server connections, so many app instances or serverless functions do not exhaust PostgreSQL. Transaction mode gives the best sharing but limits session features.', followUps: ['Which features break in transaction mode?'] },
    { level: 'expert', q: 'Every request times out waiting for a connection, yet the database looks idle. Why?', answer: 'Likely a pool problem: leaked connections, connections held across slow external calls, or a deadlock where a request holds one connection while needing another. Check pool metrics, stack traces of holders, and shorten the borrow window.', followUps: ['How would you detect leaks in production?'] },
    { level: 'expert', q: 'How do you size connections for 50 app instances on one PostgreSQL server?', answer: 'Do not give each instance a large pool. Compute the total (instances x pool), keep it under max_connections with headroom, and put PgBouncer in transaction mode in front so thousands of client connections map to a few dozen server connections.', followUps: ['What about long-running reports?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What does a connection pool reuse?', options: ['Queries', 'Open database connections', 'Passwords', 'Tables'], answerIndex: 1, why: 'The pool keeps connections open so each request skips connection setup.' },
    { level: 'beginner', q: 'A request cannot get a connection because all are busy. What should happen?', options: ['The database deletes one', 'It waits briefly, then fails on timeout', 'It opens unlimited connections', 'It uses the previous answer'], answerIndex: 1, why: 'Bounded pools queue callers and time out so overload does not take down the database.' },
    { level: 'intermediate', q: 'What is the safest way to release a connection?', options: ['Hope garbage collection does it', 'Use a context manager or finally block', 'Restart the app', 'Open a second one'], answerIndex: 1, why: 'Guaranteed release on all paths prevents leaks.' },
    { level: 'expert', q: 'Why can a huge pool slow the database down?', options: ['More connections than useful parallelism add contention and memory use', 'Pools disable indexes', 'Large pools block writes', 'It increases TTL'], answerIndex: 0, why: 'The server only has so many cores and I/O capacity, so extra concurrent connections mostly contend.' },
  ],
});
