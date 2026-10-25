/* Distributed Systems: Sharding & Partitioning. */
Atlas.topics.push({
  id: 'database-sharding-partitioning',
  category: 'distributed-systems',
  title: 'Database Sharding & Partitioning',
  source: {
    description: 'Split data across nodes by a shard key.',
    steps: ['Pick shard key', 'Hash key', 'Route to shard', 'Query only that shard'],
  },
  estMinutes: 12,
  prereqs: ['database-replication'],
  related: ['database-replication', 'scalability', 'indexing', 'consistency-models'],
  tags: ['shard key', 'hash', 'range', 'hot spot', 'consistent hashing', 'resharding'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'ring',
      nodes: [{ id: 's1', label: 'Shard 1', pos: 10 }, { id: 's2', label: 'Shard 2', pos: 35 }, { id: 's3', label: 'Shard 3', pos: 60 }, { id: 's4', label: 'Shard 4', pos: 85 }],
    },
  },
  steps: [
    {
      label: 'Pick shard key',
      caption: {
        beginner: 'Decide which piece of data decides where a record lives, such as the user id.',
        intermediate: 'The shard key determines placement. It should be high-cardinality and match the main access pattern.',
        expert: 'A poor key (timestamp, country) creates hot spots. The key also constrains transactions and joins to one shard.',
      },
      state: { keys: [{ label: 'user 42', pos: 20 }], changed: 'user_id chosen as key.' },
      hood: 'High cardinality + even spread + matches queries.',
    },
    {
      label: 'Hash key',
      caption: {
        beginner: 'A formula turns the id into a number that points to a place.',
        intermediate: 'Hash sharding applies a hash function so keys spread evenly. Range sharding keeps ranges together, which helps range scans but risks hot ranges.',
        expert: 'Consistent hashing with virtual nodes limits data moved when shards are added or removed.',
      },
      state: { keys: [{ label: 'hash(42)', pos: 52 }], changed: 'Key hashed onto the ring.' },
      hood: 'Virtual nodes smooth distribution and rebalancing.',
    },
    {
      label: 'Route to shard',
      caption: {
        beginner: 'The request is sent to the right machine.',
        intermediate: 'A router, proxy or client library maps the key to a shard using a lookup or the hash ring.',
        expert: 'Routing metadata must be consistent during resharding. Stale routing causes misdirected requests that need forwarding or retry.',
      },
      state: { keys: [{ label: 'hash(42)', pos: 52 }], active: ['s3'], changed: 'Routed to Shard 3.' },
      hood: 'Router state (shard map) is critical metadata.',
    },
    {
      label: 'Query only that shard',
      caption: {
        beginner: 'Only one machine has to search, so it is fast.',
        intermediate: 'Queries with the shard key hit one shard. Queries without it must fan out to all shards and merge results.',
        expert: 'Scatter-gather latency is bounded by the slowest shard. Cross-shard joins and transactions need 2PC or sagas, so design to avoid them.',
      },
      state: { keys: [{ label: 'hash(42)', pos: 52 }], active: ['s3'], failed: [], changed: 'Single-shard query.' },
      hood: 'Scatter-gather tail latency = slowest shard.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A huge library split into several buildings by the first letter of the author\'s name. To find a book you only walk to one building. If everyone wants authors starting with "S", that building gets crowded.',
      explanation: 'Sharding splits one big database into smaller parts spread over many machines. A rule based on a key decides which part holds each record, so each machine handles less data and less traffic.',
      keyTerms: [
        { term: 'Shard', meaning: 'One slice of the data on one node.' },
        { term: 'Shard key', meaning: 'The field that decides placement.' },
        { term: 'Hot spot', meaning: 'A shard getting far more traffic.' },
        { term: 'Partitioning', meaning: 'Splitting a table into parts.' },
        { term: 'Resharding', meaning: 'Moving data when shards change.' },
      ],
    },
    intermediate: {
      explanation: 'Partitioning splits a table (often within one database); sharding spreads partitions across servers. It scales writes and storage but makes joins, transactions and rebalancing harder.',
      howItWorks: [
        'Choose a shard key from the dominant query pattern.',
        'Choose a scheme: hash, range or directory lookup.',
        'Map keys to shards via a router.',
        'Run single-shard queries directly.',
        'Fan out for queries without the key.',
        'Rebalance by moving ranges or virtual nodes.',
      ],
      tradeoffs: {
        use: [
          'Use when one node cannot handle data size or write load.',
          'Use hash sharding for even load.',
          'Use range sharding when range scans matter.',
        ],
        avoid: [
          'Avoid before exhausting indexes, caching, replicas and vertical scaling.',
          'Avoid shard keys with low cardinality or skew.',
          'Avoid designs that need frequent cross-shard transactions.',
        ],
      },
      pitfalls: [
        'Monotonic keys (timestamps, auto-increment) sending all writes to one shard.',
        'Celebrity or tenant skew creating hot shards.',
        'Cross-shard joins and unique constraints.',
        'Plain modulo hashing remapping almost every key when the shard count changes.',
        'Hard-to-change shard key after launch.',
      ],
    },
    expert: {
      internals: [
        'Consistent hashing places nodes and keys on a ring so adding a node moves only about 1/N of keys; virtual nodes balance load.',
        'Postgres declarative partitioning supports range, list and hash with partition pruning; Citus distributes across nodes.',
        'MongoDB uses chunks with a balancer and config servers; Vitess uses VSchema and vindexes; Cassandra and DynamoDB hash partition keys.',
        'Global secondary indexes need their own partitioning: local (scatter reads) or global (cross-shard writes).',
      ],
      failureModes: [
        'Hot partition throttling in DynamoDB-like systems.',
        'Resharding under load causing latency and double writes.',
        'Shard map inconsistency routing writes to the wrong shard.',
        'One slow shard dominating scatter-gather p99.',
      ],
      scalingNotes: [
        'Pre-split into more logical shards than nodes to ease later moves.',
        'Combine sharding with replication per shard for availability.',
        'Use tenant-aware placement for multi-tenant SaaS and move large tenants.',
      ],
      realSystems: [
        'Vitess (YouTube, Slack); Citus; MongoDB sharded clusters; Cassandra; DynamoDB; CockroachDB and Spanner automatic range splitting.',
        'Redis Cluster uses 16384 hash slots.',
        'Instagram-style logical shards mapped onto few physical servers.',
      ],
      numbersToKnow: [
        'Redis Cluster has 16384 slots.',
        'Modulo hashing with N to N+1 shards moves roughly N/(N+1) of keys; consistent hashing moves about 1/(N+1).',
        'DynamoDB partitions have per-partition throughput limits. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Hash router with virtual nodes',
      code: [
        'import bisect, hashlib',
        '',
        'class Ring:',
        '    def __init__(self, shards, vnodes=100):',
        '        self.ring = sorted((self._h(f"{s}#{i}"), s) for s in shards for i in range(vnodes))',
        '        self.keys = [h for h, _ in self.ring]',
        '',
        '    def _h(self, v):',
        '        return int(hashlib.md5(v.encode()).hexdigest(), 16)',
        '',
        '    def shard_for(self, key):',
        '        i = bisect.bisect(self.keys, self._h(str(key))) % len(self.ring)',
        '        return self.ring[i][1]',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'Each shard appears many times on the ring (virtual nodes) to smooth load.' },
        { line: 13, text: 'The first ring position clockwise from the key hash owns the key.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is sharding?', answer: 'Splitting a large database across several machines using a key, so each holds and serves a part of the data.', followUps: ['Why do it?'] },
    { level: 'beginner', q: 'What is a shard key?', answer: 'The field used to decide which shard stores a record, such as user id.', followUps: ['What makes a good one?'] },
    { level: 'intermediate', q: 'Hash vs range sharding?', answer: 'Hash spreads load evenly but breaks range scans. Range keeps neighbors together for scans but can create hot ranges, especially with increasing keys.', followUps: ['Which for time series?'] },
    { level: 'intermediate', q: 'Why is modulo hashing a bad routing scheme?', answer: 'Changing the shard count remaps almost all keys, forcing a massive data move. Consistent hashing or fixed logical shards avoid this.', followUps: ['What are virtual nodes?'] },
    { level: 'expert', q: 'How would you reshard a live system?', answer: 'Create target shards, copy data with change capture, dual-write or replay changes, verify, switch routing atomically using versioned shard map, then clean up. Throttle to protect production.', followUps: ['How do you verify correctness?'] },
    { level: 'expert', q: 'How do you handle queries not including the shard key?', answer: 'Scatter-gather with limits, maintain secondary index tables or a search index, denormalize, or choose a different key. Accept tail latency of the slowest shard.', followUps: ['Local vs global secondary index?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Sharding spreads data...', options: ['Across multiple nodes', 'Inside one cell', 'Only in RAM', 'Into the browser'], answerIndex: 0, why: 'Each shard holds part of the data.' },
    { level: 'beginner', q: 'A bad shard key causes...', options: ['Hot spots', 'Free storage', 'Faster DNS', 'Encryption'], answerIndex: 0, why: 'Skewed load on one shard.' },
    { level: 'intermediate', q: 'Consistent hashing helps by...', options: ['Moving few keys when shards change', 'Removing hashing', 'Encrypting keys', 'Sorting rows'], answerIndex: 0, why: 'About 1/N of keys move.' },
    { level: 'expert', q: 'A query without the shard key typically...', options: ['Fans out to all shards', 'Fails always', 'Uses one shard', 'Is cached forever'], answerIndex: 0, why: 'Scatter-gather.' },
  ],
});
