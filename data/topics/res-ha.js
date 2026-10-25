/* Resilience: High Availability. */
Atlas.topics.push({
  id: 'high-availability',
  category: 'resilience',
  title: 'High Availability',
  source: {
    description: 'Remove single points of failure to stay up.',
    steps: ['Run 2+ nodes', 'Spread across zones', 'Detect failure', 'Auto failover'],
  },
  estMinutes: 12,
  prereqs: ['fault-tolerance'],
  related: ['fault-tolerance', 'database-replication', 'health-checks', 'cloud-fundamentals'],
  tags: ['SLA', 'nines', 'multi-AZ', 'failover', 'RTO', 'RPO', 'active-active'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'dns', label: 'DNS / LB', kind: 'lb', x: 10, y: 50 },
        { id: 'a1', label: 'Zone A app', kind: 'service', x: 50, y: 22 },
        { id: 'b1', label: 'Zone B app', kind: 'service', x: 50, y: 78 },
        { id: 'dbp', label: 'DB primary', kind: 'db', x: 88, y: 22 },
        { id: 'dbs', label: 'DB standby', kind: 'db', x: 88, y: 78 },
      ],
      edges: [{ from: 'dns', to: 'a1' }, { from: 'dns', to: 'b1' }, { from: 'a1', to: 'dbp' }, { from: 'b1', to: 'dbp' }, { from: 'dbp', to: 'dbs' }],
    },
  },
  steps: [
    {
      label: 'Run 2+ nodes',
      caption: {
        beginner: 'Never rely on one machine; always have at least two.',
        intermediate: 'Every layer (web, app, data) has at least two instances so one can fail without an outage.',
        expert: 'Count hidden singletons: the load balancer, DNS, the database primary, a shared queue, a certificate or a config service.',
      },
      state: { active: ['a1', 'b1'], packets: [{ from: 'dns', to: 'a1', tone: 'ok', label: 'req' }, { from: 'dns', to: 'b1', tone: 'ok', label: 'req' }], changed: 'Two app nodes serve traffic.' },
      hood: 'Audit every layer for hidden single points of failure.',
    },
    {
      label: 'Spread across zones',
      caption: {
        beginner: 'The machines sit in different buildings, so one power cut cannot take both.',
        intermediate: 'Placing nodes in different availability zones protects against data center level failures.',
        expert: 'Cross-zone traffic costs latency and money, and quorum systems need an odd number of zones or nodes (3 zones) to survive one failing.',
      },
      state: { active: ['a1', 'b1', 'dbp', 'dbs'], badges: { a1: 'AZ-1', b1: 'AZ-2', dbp: 'AZ-1', dbs: 'AZ-2' }, changed: 'Components span two zones.' },
      hood: 'Three zones let a quorum survive the loss of one.',
    },
    {
      label: 'Detect failure',
      caption: {
        beginner: 'The system notices that the main database has stopped.',
        intermediate: 'Heartbeats and health checks detect that the primary is unreachable.',
        expert: 'Wait long enough to avoid false failovers on a network blip, but short enough to meet RTO. Use a quorum or witness to decide, so a partition does not create two primaries.',
      },
      state: { failed: ['dbp'], active: ['dbs'], badges: { dbp: 'down' }, changed: 'The primary is detected as failed.' },
      hood: 'A witness/quorum decides who is primary to avoid split brain.',
    },
    {
      label: 'Auto failover',
      caption: {
        beginner: 'The spare takes over automatically, with little or no downtime.',
        intermediate: 'The standby is promoted and apps reconnect. Recovery time (RTO) and possible data loss (RPO) depend on replication mode.',
        expert: 'Synchronous replication gives RPO near zero at a latency cost; asynchronous replication risks losing the last transactions. Applications must retry and reconnect, and the old primary must be fenced.',
      },
      state: { failed: ['dbp'], packets: [{ from: 'a1', to: 'dbs', tone: 'ok', label: 'writes' }, { from: 'b1', to: 'dbs', tone: 'ok', label: 'writes' }], active: ['dbs'], badges: { dbs: 'new primary' }, changed: 'The standby is the new primary.' },
      hood: 'RTO = how long to recover; RPO = how much data you can lose.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A hospital with backup generators, two power lines and on-call staff in separate wings. If one fails, the other takes over so patients never notice.',
      explanation: 'High availability means the service stays up almost all the time. You get it by running duplicates in separate places and switching to the spare automatically when something breaks.',
      keyTerms: [
        { term: 'Availability', meaning: 'The share of time a service works.' },
        { term: 'Nines', meaning: 'Availability like 99.9% ("three nines").' },
        { term: 'Availability zone', meaning: 'An isolated data center area within a region.' },
        { term: 'RTO', meaning: 'Recovery Time Objective: how fast you recover.' },
        { term: 'RPO', meaning: 'Recovery Point Objective: how much data you can lose.' },
      ],
    },
    intermediate: {
      explanation: 'HA = redundancy + failure detection + automatic failover, across failure domains. Targets are expressed as SLOs; each extra nine costs substantially more.',
      howItWorks: [
        'Deploy stateless tiers across multiple zones behind a balancer.',
        'Replicate data (synchronously or asynchronously) to a standby.',
        'Monitor with health checks and heartbeats.',
        'Promote the standby when the primary fails.',
        'Clients reconnect with retries.',
        'Test failover regularly.',
      ],
      tradeoffs: {
        use: [
          'Use multi-zone deployment for production services.',
          'Use managed databases with automatic failover for most teams.',
          'Use active-active only when you can resolve conflicts and need it.',
        ],
        avoid: [
          'Avoid chasing extra nines without business need; cost and complexity rise steeply.',
          'Avoid untested failover.',
          'Avoid shared dependencies that undermine redundancy.',
        ],
      },
      pitfalls: [
        'Hidden single points of failure (DNS, a single NAT, a config store).',
        'Failover that was never tested.',
        'Asynchronous replication losing recent writes on failover.',
        'Split brain after a network partition.',
        'Clients caching the old IP or not retrying.',
      ],
    },
    expert: {
      internals: [
        'Availability = MTBF / (MTBF + MTTR); reducing recovery time is often cheaper than preventing every failure.',
        'Serial dependencies multiply availability; parallel redundancy improves it: 1 - (1 - a)^n assuming independence.',
        'Patroni (with etcd) or managed services use a distributed lock with a TTL for leader election; fencing prevents the old primary writing.',
        'Active-active across regions needs conflict handling (CRDTs, last-write-wins, or partitioned ownership) and accepts higher complexity.',
      ],
      failureModes: [
        'Correlated failure: a bad deploy or shared dependency takes down all zones.',
        'Failover storms and cascading load on survivors.',
        'Split brain causing divergent data.',
        'Region-wide outages that multi-AZ cannot cover.',
      ],
      scalingNotes: [
        'Match architecture to the SLO: single region multi-AZ is usually enough for 99.9-99.95%. // VERIFY',
        'Use canary deploys and feature flags to reduce correlated change risk.',
        'Run game days and chaos tests; measure real RTO and RPO.',
      ],
      realSystems: [
        'AWS RDS Multi-AZ and Aurora; Google Cloud SQL HA; Azure zone-redundant services.',
        'Patroni, Pacemaker, Redis Sentinel and Redis Cluster; Kafka with RF 3 across racks.',
        'Route 53 and Cloudflare health-checked failover.',
      ],
      numbersToKnow: [
        '99.9% allows about 8.8 hours of downtime a year; 99.99% about 53 minutes; 99.999% about 5 minutes.',
        'Two 99.9% services in a serial chain give about 99.8%.',
        'RDS Multi-AZ failover is typically one to a few minutes. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Client that survives a failover (SQLAlchemy)',
      code: [
        'from sqlalchemy import create_engine',
        'from tenacity import retry, stop_after_delay, wait_exponential_jitter',
        'from sqlalchemy.exc import OperationalError',
        '',
        'engine = create_engine("postgresql+psycopg://app@db-cluster.example/shop", pool_pre_ping=True)',
        '',
        '@retry(stop=stop_after_delay(60), wait=wait_exponential_jitter(initial=0.5, max=5),',
        '       retry=lambda s: isinstance(s.outcome.exception(), OperationalError))',
        'def save(order):',
        '    with engine.begin() as conn:',
        '        conn.execute(insert_order, order)',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'Connect to the cluster endpoint, not a fixed node, and validate connections before use.' },
        { line: 7, text: 'Retry for up to a minute, which covers a typical failover window.' },
        { line: 9, text: 'Writes must be idempotent or keyed so a retry after failover does not duplicate.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does 99.9% availability mean?', answer: 'The service is up 99.9% of the time, which allows about 8.8 hours of downtime per year.', followUps: ['How much is 99.99%?'] },
    { level: 'beginner', q: 'How do you avoid a single point of failure?', answer: 'Run redundant components in separate failure domains and make sure every layer, including load balancers and databases, has a spare.', followUps: ['Name a hidden single point of failure.'] },
    { level: 'intermediate', q: 'RTO vs RPO?', answer: 'RTO is how long recovery may take; RPO is how much recent data you can afford to lose. Synchronous replication lowers RPO at a latency cost.', followUps: ['Which does async replication hurt?'] },
    { level: 'intermediate', q: 'Active-passive vs active-active?', answer: 'Active-passive keeps a standby that takes over on failure; simpler but wastes capacity and has failover time. Active-active serves from several nodes or regions at once, needing conflict handling and more complexity.', followUps: ['When is active-active worth it?'] },
    { level: 'expert', q: 'How do you prevent split brain on failover?', answer: 'Use a quorum or consensus-based leader election with leases, and fence the old primary (STONITH, revoking storage or network access, fencing tokens) before promoting a new one.', followUps: ['What is a fencing token?'] },
    { level: 'expert', q: 'Your multi-AZ service still had an outage. Why?', answer: 'Likely correlated failures: a bad deploy, shared control plane or dependency, config error, capacity exhaustion after failover, or a region-level event. Improve change safety (canaries, rollbacks), isolate dependencies and add cross-region recovery where the SLO needs it.', followUps: ['How do you measure real availability?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'HA is achieved mainly by...', options: ['Redundancy and failover', 'Bigger fonts', 'More logs', 'Fewer users'], answerIndex: 0, why: 'Spares take over automatically.' },
    { level: 'beginner', q: '99.99% downtime per year is about...', options: ['53 minutes', '8.8 hours', '5 seconds', '3 days'], answerIndex: 0, why: 'Four nines is about 52.6 minutes.' },
    { level: 'intermediate', q: 'RPO is...', options: ['How much data you can lose', 'How fast to recover', 'A port number', 'A cache size'], answerIndex: 0, why: 'Recovery Point Objective.' },
    { level: 'expert', q: 'Fencing prevents...', options: ['A stale primary writing after failover', 'Slow queries', 'DNS caching', 'TLS errors'], answerIndex: 0, why: 'It stops split brain.' },
  ],
});
