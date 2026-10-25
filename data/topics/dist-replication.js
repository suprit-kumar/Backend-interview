/* Distributed Systems: Database Replication. */
Atlas.topics.push({
  id: 'database-replication',
  category: 'distributed-systems',
  title: 'Database Replication',
  source: {
    description: 'Copy data to other nodes for reads and failover.',
    steps: ['Write to primary', 'Ship log', 'Replicas apply', 'Reads served by replicas'],
  },
  estMinutes: 11,
  prereqs: ['sql'],
  related: ['consistency-models', 'high-availability', 'database-sharding-partitioning', 'caching'],
  tags: ['primary', 'replica', 'WAL', 'lag', 'failover', 'read scaling'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'app', label: 'App', kind: 'service', x: 10, y: 50 },
        { id: 'pri', label: 'Primary', kind: 'db', x: 50, y: 50 },
        { id: 'r1', label: 'Replica 1', kind: 'db', x: 88, y: 22 },
        { id: 'r2', label: 'Replica 2', kind: 'db', x: 88, y: 78 },
      ],
      edges: [{ from: 'app', to: 'pri' }, { from: 'pri', to: 'r1' }, { from: 'pri', to: 'r2' }, { from: 'app', to: 'r1' }, { from: 'app', to: 'r2' }],
    },
  },
  steps: [
    {
      label: 'Write to primary',
      caption: {
        beginner: 'All changes go to one main copy.',
        intermediate: 'Writes go to the primary, which records them in its write-ahead log before acknowledging.',
        expert: 'In single-leader replication the primary defines a total order of changes, which makes replicas simple to keep consistent.',
      },
      state: { active: ['pri'], packets: [{ from: 'app', to: 'pri', tone: 'ok', label: 'INSERT' }], changed: 'Primary logs the write.' },
      hood: 'Write-ahead log (WAL/binlog) is the replication stream.',
    },
    {
      label: 'Ship log',
      caption: {
        beginner: 'The main copy sends the list of changes to the others.',
        intermediate: 'The log is streamed to replicas, asynchronously by default or synchronously for a chosen replica.',
        expert: 'Physical replication ships WAL bytes; logical replication ships row changes, allowing different versions or selective tables.',
      },
      state: { active: ['pri'], packets: [{ from: 'pri', to: 'r1', tone: 'ok', label: 'WAL' }, { from: 'pri', to: 'r2', tone: 'ok', label: 'WAL' }], changed: 'Log streams to replicas.' },
      hood: 'Physical = bytes; logical = row changes.',
    },
    {
      label: 'Replicas apply',
      caption: {
        beginner: 'Each copy repeats the changes in the same order.',
        intermediate: 'Replicas replay the log in order. A slow replica falls behind, which is replication lag.',
        expert: 'Single-threaded apply can lag behind a busy primary; parallel apply and long-running replica queries (conflicts) affect lag.',
      },
      state: { active: ['r1', 'r2'], badges: { r1: 'lag 0.1s', r2: 'lag 2s' }, changed: 'Replicas replay; r2 lags.' }, // VERIFY illustrative
      hood: 'Lag = primary position minus replica replay position.',
    },
    {
      label: 'Reads served by replicas',
      caption: {
        beginner: 'Visitors only reading can use the extra copies, and a copy can take over if the main one dies.',
        intermediate: 'Read queries go to replicas to scale reads. On primary failure, a replica is promoted.',
        expert: 'Reads may be stale; route read-your-writes traffic to the primary. Failover can lose unreplicated writes under async replication.',
      },
      state: { failed: ['pri'], active: ['r1'], packets: [{ from: 'app', to: 'r1', tone: 'ok', label: 'SELECT' }, { from: 'app', to: 'r2', tone: 'ok', label: 'SELECT' }], badges: { r1: 'promoted' }, changed: 'Primary fails; r1 promoted.' },
      hood: 'Async failover risks losing the last commits.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A teacher writes notes on the board while students copy them into notebooks. Anyone can read a notebook, but only the teacher edits the master version. If the teacher is absent, a student with the latest notes can step in.',
      explanation: 'Replication keeps copies of a database on other machines. One machine takes the writes and sends changes to the rest. The copies share the reading work and act as backups.',
      keyTerms: [
        { term: 'Primary', meaning: 'The node that accepts writes.' },
        { term: 'Replica', meaning: 'A copy that follows the primary.' },
        { term: 'Replication lag', meaning: 'How far a replica is behind.' },
        { term: 'Failover', meaning: 'Promoting a replica to primary.' },
        { term: 'WAL', meaning: 'The ordered log of changes.' },
      ],
    },
    intermediate: {
      explanation: 'Replication scales reads and improves availability. Asynchronous replication is fast but can lose recent writes on failover and serves stale reads; synchronous replication reduces data loss at the cost of write latency.',
      howItWorks: [
        'The primary appends changes to its log.',
        'The log is streamed to each replica.',
        'Replicas apply changes in order.',
        'Reads are distributed across replicas.',
        'Monitoring tracks lag and health.',
        'On failure, a replica is promoted and clients reconnect.',
      ],
      tradeoffs: {
        use: [
          'Use replicas to scale read-heavy workloads.',
          'Use them for failover and backups without loading the primary.',
          'Use synchronous replication for critical data with low RPO.',
        ],
        avoid: [
          'Avoid reading from replicas where staleness breaks correctness.',
          'Avoid replication as a substitute for backups.',
          'Avoid multi-leader writes unless you can resolve conflicts.',
        ],
      },
      pitfalls: [
        'Replication does not protect against bad deletes, since they replicate too.',
        'Read-after-write anomalies from lagging replicas.',
        'Unbounded lag during large batch jobs.',
        'Failing over to a replica that is far behind.',
        'Schema changes that block replay.',
      ],
    },
    expert: {
      internals: [
        'PostgreSQL streaming replication ships WAL; synchronous_commit and synchronous_standby_names control durability; replication slots retain WAL for replicas.',
        'MySQL replicates binlog (statement, row or mixed); GTIDs simplify failover; semi-sync waits for one replica ack.',
        'Multi-leader and leaderless (Dynamo-style) replication allow multi-writer with conflict resolution.',
        'Logical replication and CDC feed search, caches and analytics.',
      ],
      failureModes: [
        'Split brain with two primaries.',
        'A stuck replication slot filling the primary disk with WAL.',
        'Replica conflict cancelling long read queries.',
        'Promotion of a stale replica losing committed transactions.',
      ],
      scalingNotes: [
        'Read replicas do not scale writes; use sharding for that.',
        'Cascading replication reduces primary fan-out.',
        'Use a connection proxy (PgBouncer, ProxySQL) to route reads and writes.',
      ],
      realSystems: [
        'PostgreSQL with Patroni; MySQL with Group Replication or Orchestrator; Amazon Aurora storage-level replication.',
        'MongoDB replica sets with elections; Redis replication with Sentinel; Kafka partition replication with ISR.',
        'Debezium CDC from the WAL or binlog.',
      ],
      numbersToKnow: [
        'Aurora supports up to 15 read replicas. // VERIFY',
        'Synchronous replication adds at least one network round trip to commit.',
        'Replica lag is usually milliseconds, but can reach minutes during heavy writes. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Read/write routing (Django)',
      code: [
        'class PrimaryReplicaRouter:',
        '    def db_for_read(self, model, **hints):',
        '        return random.choice(["replica1", "replica2"])',
        '',
        '    def db_for_write(self, model, **hints):',
        '        return "default"',
        '',
        '    def allow_relation(self, a, b, **hints):',
        '        return True',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Spread reads across replicas, accepting possible staleness.' },
        { line: 6, text: 'All writes go to the primary.' },
      ],
    },
    {
      lang: 'sql',
      title: 'Check lag on PostgreSQL',
      code: [
        '-- on the primary',
        'SELECT client_addr, state, sync_state,',
        '       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS bytes_behind',
        'FROM pg_stat_replication;',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'The gap between current and replayed WAL position is the lag in bytes.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why replicate a database?', answer: 'For read scaling, failover when the primary dies and safer backups, since copies live on other machines.', followUps: ['Does replication replace backups?'] },
    { level: 'beginner', q: 'What is replication lag?', answer: 'The delay between a write on the primary and its appearance on a replica.', followUps: ['What problems does lag cause?'] },
    { level: 'intermediate', q: 'Sync vs async replication?', answer: 'Sync waits for a replica to confirm before commit, lowering data loss but adding latency and reducing availability. Async commits immediately and risks losing recent writes on failover.', followUps: ['What is semi-sync?'] },
    { level: 'intermediate', q: 'Why is replication not a backup?', answer: 'Mistakes such as dropping a table or corrupting data replicate to all copies. Backups with point-in-time recovery protect against that.', followUps: ['What is PITR?'] },
    { level: 'expert', q: 'Describe a safe failover procedure.', answer: 'Detect failure with a quorum, fence the old primary, choose the most up-to-date replica, promote it, repoint clients and reattach other replicas, then rebuild the old primary as a replica. Test regularly.', followUps: ['What data can be lost?'] },
    { level: 'expert', q: 'How do multi-leader systems handle conflicts?', answer: 'With last-write-wins, version vectors, application merge logic or CRDTs, or by avoiding conflicts by partitioning write ownership. Each has trade-offs in data loss and complexity.', followUps: ['When is multi-leader worth it?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Writes go to...', options: ['The primary', 'Any replica', 'The cache', 'The browser'], answerIndex: 0, why: 'Single-leader replication.' },
    { level: 'beginner', q: 'Replicas mainly help with...', options: ['Reads and failover', 'Faster writes', 'Smaller data', 'CSS'], answerIndex: 0, why: 'They do not scale writes.' },
    { level: 'intermediate', q: 'A DROP TABLE mistake is...', options: ['Replicated too', 'Blocked by replicas', 'Undone automatically', 'Ignored'], answerIndex: 0, why: 'Replication copies all changes.' },
    { level: 'expert', q: 'Async failover risk is...', options: ['Losing recent committed writes', 'Faster commits', 'More disk', 'Stale DNS'], answerIndex: 0, why: 'Unreplicated writes can be lost.' },
  ],
});
