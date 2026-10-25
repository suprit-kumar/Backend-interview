/* Distributed Systems: CAP Theorem. */
Atlas.topics.push({
  id: 'cap-theorem',
  category: 'distributed-systems',
  title: 'CAP Theorem',
  source: {
    description: 'During a network partition, pick consistency or availability.',
    steps: ['Partition happens', 'Choose C: refuse requests', 'Or choose A: serve stale data', 'Heal'],
  },
  estMinutes: 10,
  prereqs: ['distributed-systems-fundamentals'],
  related: ['consistency-models', 'database-replication', 'distributed-systems-fundamentals', 'nosql-databases'],
  tags: ['CAP', 'partition', 'CP', 'AP', 'PACELC', 'availability'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'c', label: 'Client', kind: 'client', x: 8, y: 50 },
        { id: 'n1', label: 'Node 1', kind: 'db', x: 50, y: 20 },
        { id: 'n2', label: 'Node 2', kind: 'db', x: 50, y: 80 },
        { id: 'n3', label: 'Node 3', kind: 'db', x: 90, y: 50 },
      ],
      edges: [{ from: 'c', to: 'n1' }, { from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }, { from: 'n2', to: 'n3' }],
    },
  },
  steps: [
    {
      label: 'Partition happens',
      caption: {
        beginner: 'The connection between machines breaks, so they cannot talk.',
        intermediate: 'A network partition splits the nodes into groups that cannot reach each other, though each may still be running.',
        expert: 'Partitions are a fact of networks, not a choice. The real decision is how to behave when one occurs.',
      },
      state: { failed: ['n3'], badges: { n3: 'cut off' }, changed: 'Node 3 is isolated.' },
      hood: 'P is not optional in a distributed system.',
    },
    {
      label: 'Choose C: refuse requests',
      caption: {
        beginner: 'To stay correct, the isolated machine says "sorry, try later".',
        intermediate: 'A CP system rejects or blocks requests on the minority side so no one reads or writes diverging data.',
        expert: 'Quorum systems (etcd, ZooKeeper) keep serving on the majority side only; minority nodes refuse.',
      },
      state: { failed: ['n3'], packets: [{ from: 'c', to: 'n3', tone: 'bad', label: 'refused' }], changed: 'Isolated node refuses requests.' },
      hood: 'CP: the minority partition loses availability.',
    },
    {
      label: 'Or choose A: serve stale data',
      caption: {
        beginner: 'Or the machine keeps answering, even if its info is slightly old.',
        intermediate: 'An AP system keeps answering on both sides, so nodes can diverge and must reconcile later.',
        expert: 'Dynamo-style stores accept writes everywhere and merge later with version vectors, last-write-wins or CRDTs.',
      },
      state: { failed: ['n3'], packets: [{ from: 'c', to: 'n3', tone: 'ok', label: 'stale value' }], changed: 'Isolated node answers with stale data.' },
      hood: 'AP: both sides stay up and may diverge.',
    },
    {
      label: 'Heal',
      caption: {
        beginner: 'When the connection returns, the machines sync up.',
        intermediate: 'After healing, nodes reconcile. CP systems resume normally; AP systems merge diverged updates.',
        expert: 'Reconciliation (read repair, anti-entropy, Merkle trees) can surface conflicts the application must resolve.',
      },
      state: { active: ['n1', 'n2', 'n3'], packets: [{ from: 'n1', to: 'n3', tone: 'ok', label: 'sync' }], changed: 'Nodes reconcile.' },
      hood: 'Anti-entropy uses Merkle trees to find differences.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Two bank branches whose phone line goes down. Either both refuse to give out cash until they can compare records (safe but unavailable), or both keep serving customers and sort out any mistakes later (available but possibly inconsistent).',
      explanation: 'When a network breaks between computers, a system must choose: stay perfectly correct and refuse some requests, or keep answering and risk showing old data. It cannot guarantee both during the break.',
      keyTerms: [
        { term: 'Consistency', meaning: 'Every read sees the latest write.' },
        { term: 'Availability', meaning: 'Every request gets a response.' },
        { term: 'Partition', meaning: 'A break in network communication.' },
        { term: 'CP', meaning: 'Chooses consistency in a partition.' },
        { term: 'AP', meaning: 'Chooses availability in a partition.' },
      ],
    },
    intermediate: {
      explanation: 'CAP applies only during a partition. Many systems are tunable per request. Without a partition you can have both; PACELC adds that even then there is a latency vs consistency trade-off.',
      howItWorks: [
        'Nodes replicate data and talk over the network.',
        'A partition cuts communication between groups.',
        'CP: the side without quorum refuses requests.',
        'AP: all sides serve, possibly stale or conflicting data.',
        'When healed, nodes reconcile or merge.',
        'Applications decide which operations need which guarantee.',
      ],
      tradeoffs: {
        use: [
          'Choose CP for money, locks, leader election and metadata.',
          'Choose AP for carts, feeds, sessions and telemetry.',
          'Choose tunable consistency to decide per operation.',
        ],
        avoid: [
          'Avoid labeling a whole database simply "CP" or "AP"; it often depends on settings.',
          'Avoid ignoring conflict resolution in AP designs.',
          'Avoid treating CAP as a three-way menu of any two.',
        ],
      },
      pitfalls: [
        'Believing you can drop partition tolerance in a distributed system.',
        'Thinking CAP availability means "mostly up" rather than every request answered.',
        'Ignoring the latency trade-off when there is no partition.',
        'No plan for merging diverged writes.',
        'Using a single CAP label for a product with tunable modes.',
      ],
    },
    expert: {
      internals: [
        'Gilbert and Lynch proved the theorem using atomic (linearizable) consistency and total availability.',
        'PACELC: if Partition, choose A or C; Else, choose Latency or Consistency.',
        'Raft/Paxos: only the partition holding a majority can commit, giving CP behavior.',
        'Dynamo-style: sloppy quorums and hinted handoff favor availability.',
      ],
      failureModes: [
        'Split brain in poorly fenced failover.',
        'Minority-side reads that appear consistent but are stale.',
        'Conflict explosions after long partitions.',
        'Gray failures that are partial partitions, harder than clean splits.',
      ],
      scalingNotes: [
        'Geo-distribution makes the latency side of PACELC dominate daily behavior.',
        'Use CRDTs for merge-friendly data (counters, sets).',
        'Test partitions with tools like Jepsen and network fault injection.',
      ],
      realSystems: [
        'etcd, ZooKeeper, Consul: CP via consensus.',
        'Cassandra, DynamoDB, Riak: AP-leaning with tunable consistency.',
        'Spanner: strong consistency with high availability via infrastructure, but still CP in theory.',
      ],
      numbersToKnow: [
        'A majority quorum needs floor(N/2)+1 nodes: 2 of 3, 3 of 5.',
        'A 5-node cluster tolerates 2 failures; a 3-node cluster tolerates 1.',
        'Jepsen has found consistency bugs in many databases.',
      ],
    },
  },
  sim: 'cap',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Tunable consistency (Cassandra driver)',
      code: [
        'from cassandra import ConsistencyLevel',
        'from cassandra.query import SimpleStatement',
        '',
        'write = SimpleStatement("INSERT INTO carts (id, items) VALUES (%s, %s)",',
        '                        consistency_level=ConsistencyLevel.ONE)',
        'read = SimpleStatement("SELECT * FROM balances WHERE id = %s",',
        '                       consistency_level=ConsistencyLevel.QUORUM)',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'ONE favors availability and speed for low-risk data.' },
        { line: 7, text: 'QUORUM trades availability for fresher reads of important data.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'State the CAP theorem.', answer: 'In a distributed system, during a network partition you must choose between consistency and availability.', followUps: ['What is a partition?'] },
    { level: 'beginner', q: 'Give an example of CP and AP choices.', answer: 'A bank balance prefers CP: refuse rather than show wrong data. A social feed prefers AP: show slightly old posts rather than an error.', followUps: ['Which for a shopping cart?'] },
    { level: 'intermediate', q: 'Why is "CA" not a real option?', answer: 'Partitions happen in any networked system, so you cannot give them up. A CA system is effectively a single node or one that fails during partitions.', followUps: ['Where does CA apply?'] },
    { level: 'intermediate', q: 'What does PACELC add?', answer: 'Even without a partition there is a trade-off between latency and consistency, which describes everyday behavior better.', followUps: ['Classify DynamoDB.'] },
    { level: 'expert', q: 'How does a Raft cluster behave in a partition?', answer: 'The side with a majority elects or keeps a leader and continues; the minority cannot commit and rejects writes, so it is CP. Reads from minority may be stale unless they check leadership.', followUps: ['What are leader leases?'] },
    { level: 'expert', q: 'How would you design a shopping cart for AP?', answer: 'Accept writes on any replica, model the cart as a mergeable set (CRDT or add/remove with tombstones), reconcile on read, and make checkout the strongly consistent step.', followUps: ['What about removed items reappearing?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'CAP trade-off applies...', options: ['During a partition', 'Always never', 'Only to caches', 'Only in SQL'], answerIndex: 0, why: 'Choice matters when the network splits.' },
    { level: 'beginner', q: 'A CP system during a partition...', options: ['May refuse requests', 'Serves stale data', 'Deletes data', 'Shuts down forever'], answerIndex: 0, why: 'It protects consistency.' },
    { level: 'intermediate', q: 'PACELC else-case trade-off is...', options: ['Latency vs consistency', 'CPU vs RAM', 'Cost vs color', 'TCP vs UDP'], answerIndex: 0, why: 'Even without partitions.' },
    { level: 'expert', q: 'Quorum in a 5-node cluster is...', options: ['3', '2', '5', '4'], answerIndex: 0, why: 'floor(5/2)+1 = 3.' },
  ],
});
