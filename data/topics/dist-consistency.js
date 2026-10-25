/* Distributed Systems: Consistency Models. */
Atlas.topics.push({
  id: 'consistency-models',
  category: 'distributed-systems',
  title: 'Consistency Models',
  source: {
    description: 'Rules for what readers see after a write.',
    steps: ['Write', 'Replicate', 'Strong: read sees it now', 'Eventual: read sees it later'],
  },
  estMinutes: 11,
  prereqs: ['cap-theorem'],
  related: ['cap-theorem', 'database-replication', 'distributed-systems-fundamentals', 'nosql-databases'],
  tags: ['strong', 'eventual', 'causal', 'linearizable', 'read-your-writes', 'staleness'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 'w', label: 'Writer' }, { id: 'r1', label: 'Replica 1' }, { id: 'r2', label: 'Replica 2' }, { id: 'rd', label: 'Reader' }],
      total: 10, unit: 'ms',
      windows: [{ start: 3, end: 8, label: 'stale window' }],
      blocks: [
        { lane: 'w', start: 0, end: 2, label: 'write x=2', kind: 'run' },
        { lane: 'r1', start: 2, end: 3, label: 'apply', kind: 'run' },
        { lane: 'r2', start: 2, end: 8, label: 'lagging', kind: 'wait' },
        { lane: 'rd', start: 4, end: 5, label: 'reads x=1?', kind: 'race' },
        { lane: 'rd', start: 8, end: 9, label: 'reads x=2', kind: 'run' },
      ],
    },
  },
  steps: [
    {
      label: 'Write',
      caption: {
        beginner: 'Someone changes a value, such as a profile name.',
        intermediate: 'A client writes to one node, which acknowledges it.',
        expert: 'The acknowledgement point (leader only, quorum, all replicas) defines durability and what later reads can guarantee.',
      },
      state: { now: 2 },
      hood: 'Ack policy: leader, quorum (W) or all.',
    },
    {
      label: 'Replicate',
      caption: {
        beginner: 'The change travels to the other copies, which takes a little time.',
        intermediate: 'Replication to other nodes is not instant; for a short window they hold different values.',
        expert: 'Replication lag depends on network, load and apply speed, and can grow to seconds or more under pressure.',
      },
      state: { now: 4 },
      hood: 'Lag is a distribution with a long tail, not a constant.',
    },
    {
      label: 'Strong: read sees it now',
      caption: {
        beginner: 'With strong rules, everyone always sees the newest value.',
        intermediate: 'Linearizable reads behave as if there were one copy: once a write completes, all later reads see it. Costs extra latency and coordination.',
        expert: 'Achieved by reading from the leader, using quorum reads with R + W > N, or consensus. It reduces availability during partitions.',
      },
      state: { now: 5 },
      hood: 'Quorum: R + W > N overlaps at least one up-to-date node.',
    },
    {
      label: 'Eventual: read sees it later',
      caption: {
        beginner: 'With relaxed rules, you may briefly see the old value, then the new one.',
        intermediate: 'Eventual consistency lets reads hit any replica, which is fast and available, but can return stale data until copies converge.',
        expert: 'Middle options exist: read-your-writes, monotonic reads and causal consistency give useful guarantees without full linearizability.',
      },
      state: { now: 9 },
      hood: 'Causal and session guarantees sit between strong and eventual.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A group chat where messages reach each phone at slightly different moments. Strong consistency is a loudspeaker everyone hears at once. Eventual consistency is passing the news by word of mouth: everyone learns it soon, but not at exactly the same time.',
      explanation: 'When data is copied to several places, a consistency model says what a reader is allowed to see right after a write. Stricter models are simpler to reason about but slower; looser models are faster but can show old data.',
      keyTerms: [
        { term: 'Strong consistency', meaning: 'Reads always see the latest write.' },
        { term: 'Eventual consistency', meaning: 'Copies agree after some time.' },
        { term: 'Stale read', meaning: 'Reading an old value.' },
        { term: 'Replica', meaning: 'A copy of the data.' },
        { term: 'Read-your-writes', meaning: 'You always see your own updates.' },
      ],
    },
    intermediate: {
      explanation: 'Choose the weakest model that keeps the feature correct. Money and inventory usually need strong guarantees; feeds, counters and recommendations tolerate staleness.',
      howItWorks: [
        'A write is applied on a primary or a quorum.',
        'It is replicated asynchronously or synchronously.',
        'Reads are routed to the leader, a quorum or any replica.',
        'Session guarantees pin a client to fresh enough data.',
        'Conflicts are resolved by version, timestamp or merge.',
        'Anti-entropy and repair converge replicas.',
      ],
      tradeoffs: {
        use: [
          'Use strong consistency for balances, inventory and uniqueness.',
          'Use eventual consistency for feeds, analytics and caches.',
          'Use read-your-writes for user-facing profile edits.',
        ],
        avoid: [
          'Avoid strong consistency across regions unless required; latency is high.',
          'Avoid eventual consistency where stale reads cause harm.',
          'Avoid mixing models without documenting them.',
        ],
      },
      pitfalls: [
        'User edits a profile and sees the old one from a lagging replica.',
        'Reading after writing through a different replica.',
        'Assuming replication lag is tiny always.',
        'Last-write-wins silently dropping concurrent updates.',
        'Confusing ACID consistency with distributed consistency.',
      ],
    },
    expert: {
      internals: [
        'Linearizability: operations appear atomic at some point between invocation and response, respecting real-time order.',
        'Sequential, causal, session and eventual models form a hierarchy of weaker guarantees with better availability.',
        'Dynamo-style stores use quorum R/W with vector clocks or timestamps, hinted handoff and read repair.',
        'Raft/Paxos give linearizable writes by a replicated log; linearizable reads need leader leases or read-index.',
      ],
      failureModes: [
        'Clock skew corrupting last-write-wins ordering.',
        'Split brain accepting conflicting writes.',
        'Read repair or anti-entropy overload.',
        'Stale leader serving reads after losing leadership.',
      ],
      scalingNotes: [
        'Per-operation tunable consistency (Cassandra, DynamoDB) lets hot paths trade strength for speed.',
        'Use CRDTs for conflict-free merge in multi-writer designs.',
        'Monitor replication lag and alert on SLO breaches.',
      ],
      realSystems: [
        'DynamoDB eventually consistent vs strongly consistent reads; Cassandra QUORUM and ONE.',
        'etcd and ZooKeeper (linearizable writes); Spanner (external consistency with TrueTime).',
        'PostgreSQL async vs synchronous replication; MongoDB read and write concerns.',
      ],
      numbersToKnow: [
        'With N=3, W=2, R=2: R + W = 4 > 3, so reads overlap the latest write.',
        'Cross-region round trips are tens to hundreds of milliseconds.',
        'Replica lag is often milliseconds, but can reach seconds under load. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Read-your-writes via primary read (Django)',
      code: [
        'def update_profile(request):',
        '    user = User.objects.using("primary").get(pk=request.user.pk)',
        '    user.name = request.POST["name"]',
        '    user.save(using="primary")',
        '    request.session["read_primary_until"] = time.time() + 5',
        '',
        'def get_profile(request):',
        '    use_primary = request.session.get("read_primary_until", 0) > time.time()',
        '    db = "primary" if use_primary else "replica"',
        '    return User.objects.using(db).get(pk=request.user.pk)',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'Remember that this user just wrote, for a window longer than typical lag.' },
        { line: 9, text: 'Route this user to the primary briefly; others read replicas.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is eventual consistency?', answer: 'If no new writes occur, all copies eventually hold the same value, but reads may be stale meanwhile.', followUps: ['Give an everyday example.'] },
    { level: 'beginner', q: 'Why not always use strong consistency?', answer: 'It needs more coordination, so it is slower and less available during failures.', followUps: ['When must you use it?'] },
    { level: 'intermediate', q: 'A user updates their name and sees the old one. Why and how to fix?', answer: 'The read hit a lagging replica. Use read-your-writes: read from the primary for a short time after a write or track a version/LSN.', followUps: ['What are the costs?'] },
    { level: 'intermediate', q: 'Explain quorum reads and writes.', answer: 'With N replicas, writing to W and reading from R where R + W > N guarantees a read overlaps at least one node with the latest write.', followUps: ['What if a node is down?'] },
    { level: 'expert', q: 'Why is last-write-wins dangerous?', answer: 'It depends on clocks, which skew, and silently discards concurrent updates. Use version vectors, CRDTs or application merge for important data.', followUps: ['What does TrueTime solve?'] },
    { level: 'expert', q: 'Linearizability vs serializability?', answer: 'Linearizability is a single-object real-time ordering guarantee. Serializability is about multi-object transactions behaving as some serial order, without real-time constraint. Strict serializability combines both.', followUps: ['Which does Spanner give?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Eventual consistency may return...', options: ['Stale data briefly', 'No data ever', 'Encrypted data', 'Duplicate tables'], answerIndex: 0, why: 'Replicas catch up later.' },
    { level: 'beginner', q: 'Strong consistency costs...', options: ['Extra latency and coordination', 'Nothing', 'Disk space only', 'Fonts'], answerIndex: 0, why: 'Nodes must agree first.' },
    { level: 'intermediate', q: 'N=3, which gives overlap?', options: ['R=2, W=2', 'R=1, W=1', 'R=1, W=2 only with N=5', 'R=0, W=3'], answerIndex: 0, why: '2 + 2 = 4 > 3.' },
    { level: 'expert', q: 'Last-write-wins relies on...', options: ['Timestamps and clocks', 'Locks', 'Indexes', 'DNS'], answerIndex: 0, why: 'Clock skew can pick the wrong winner.' },
  ],
});
