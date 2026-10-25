/* Distributed Systems: Fundamentals. */
Atlas.topics.push({
  id: 'distributed-systems-fundamentals',
  category: 'distributed-systems',
  title: 'Distributed Systems Fundamentals',
  source: {
    description: 'Networks fail, clocks drift, nodes crash.',
    steps: ['Nodes talk over network', 'Messages delay or drop', 'Detect failures', 'Agree on state'],
  },
  estMinutes: 12,
  prereqs: ['networking-fundamentals'],
  related: ['cap-theorem', 'consistency-models', 'high-availability', 'distributed-transactions'],
  tags: ['consensus', 'clocks', 'failure detection', 'partial failure', 'Raft', 'heartbeat'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 'a', label: 'Node A' }, { id: 'b', label: 'Node B' }, { id: 'c', label: 'Node C' }],
      total: 12, unit: 's',
      windows: [{ start: 4, end: 7, label: 'silence: slow or dead?' }],
      blocks: [
        { lane: 'a', start: 0, end: 12, label: 'leader heartbeats', kind: 'run' },
        { lane: 'b', start: 1, end: 4, label: 'ack', kind: 'run' },
        { lane: 'b', start: 4, end: 7, label: 'no reply', kind: 'wait' },
        { lane: 'c', start: 7, end: 9, label: 'suspect B', kind: 'race' },
        { lane: 'c', start: 9, end: 12, label: 'vote: agree', kind: 'lock' },
      ],
    },
  },
  steps: [
    {
      label: 'Nodes talk over network',
      caption: {
        beginner: 'Several computers work together by sending each other messages.',
        intermediate: 'Nodes have no shared memory or shared clock; all coordination is by messages over a network.',
        expert: 'Key assumptions define the model: synchronous vs asynchronous timing, crash vs Byzantine failures, reliable vs lossy links.',
      },
      state: { now: 1 },
      hood: 'System models: timing + failure assumptions.',
    },
    {
      label: 'Messages delay or drop',
      caption: {
        beginner: 'Messages can arrive late, never arrive, or arrive twice.',
        intermediate: 'Networks delay, reorder, duplicate and drop messages, and a sender cannot tell which happened.',
        expert: 'This is the Two Generals problem: you cannot achieve certainty with unreliable links, so design for at-least-once delivery and idempotency.',
      },
      state: { now: 4 },
      hood: 'Exactly-once delivery is not possible; effectively-once is built with idempotency.',
    },
    {
      label: 'Detect failures',
      caption: {
        beginner: 'A machine that stays silent is probably down, but nobody can be sure.',
        intermediate: 'Heartbeats and timeouts suspect failure, but a slow node looks identical to a dead one.',
        expert: 'Failure detectors trade speed against false positives. Phi-accrual detectors (Cassandra, Akka) output a suspicion level, not a boolean.',
      },
      state: { now: 7 },
      hood: 'Timeouts give suspicion, not proof.',
    },
    {
      label: 'Agree on state',
      caption: {
        beginner: 'The remaining machines vote so they all agree on what is true.',
        intermediate: 'Consensus protocols (Raft, Paxos) let a majority agree on a value or a leader despite failures.',
        expert: 'FLP shows consensus cannot be guaranteed in a purely asynchronous system with even one crash; real systems use timeouts and randomization to make progress in practice.',
      },
      state: { now: 11 },
      hood: 'Majority quorums ensure any two decisions overlap.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A team of people in different cities coordinating by letters. Letters can be late, lost or duplicated, everyone\'s watch shows a slightly different time, and someone may fall ill without telling anyone. The team still has to agree on a plan.',
      explanation: 'A distributed system is many computers acting as one. The hard parts are that messages are unreliable, clocks differ and any machine can fail at any time, so the system needs careful rules to stay correct.',
      keyTerms: [
        { term: 'Node', meaning: 'One computer in the system.' },
        { term: 'Partial failure', meaning: 'Some parts fail while others work.' },
        { term: 'Heartbeat', meaning: 'A regular "I am alive" message.' },
        { term: 'Consensus', meaning: 'Nodes agreeing on one value.' },
        { term: 'Quorum', meaning: 'A majority needed to decide.' },
      ],
    },
    intermediate: {
      explanation: 'Design for failure: assume messages fail, nodes crash and clocks drift. Use timeouts, retries with idempotency, replication, quorums and consensus for the few things that need strong agreement.',
      howItWorks: [
        'Nodes communicate over an unreliable network.',
        'Senders use timeouts and retries.',
        'Receivers deduplicate using ids.',
        'Heartbeats detect suspected failures.',
        'Leader election and consensus agree on shared state.',
        'Replication and quorums provide fault tolerance.',
      ],
      tradeoffs: {
        use: [
          'Use distribution when one machine cannot meet scale or availability needs.',
          'Use consensus (etcd, ZooKeeper) for coordination data, not bulk data.',
          'Use idempotent operations to make retries safe.',
        ],
        avoid: [
          'Avoid distributing a system that fits on one reliable machine.',
          'Avoid depending on synchronized wall-clock time for ordering.',
          'Avoid assuming the network is reliable or has zero latency.',
        ],
      },
      pitfalls: [
        'Treating a timeout as proof the other side failed.',
        'Using wall-clock timestamps to order events across machines.',
        'Retries without idempotency creating duplicates.',
        'Cascading failures from unbounded retries.',
        'Split brain with two leaders.',
      ],
    },
    expert: {
      internals: [
        'Logical clocks (Lamport) and vector clocks capture causal order without synchronized time; hybrid logical clocks combine both.',
        'Raft: leader election by randomized timeouts, log replication with majority commit, terms to fence stale leaders.',
        'Paxos and Multi-Paxos solve the same problem; Zab powers ZooKeeper.',
        'Fencing tokens (monotonic) stop a paused old leader from corrupting data after its lease expired.',
      ],
      failureModes: [
        'Long GC or VM pauses looking like crashes and causing split brain.',
        'Clock jumps breaking leases and TTLs.',
        'Gray failure: partial degradation that detectors miss.',
        'Metastable failures where retries sustain overload.',
      ],
      scalingNotes: [
        'Consensus throughput drops with more voters; use 3 or 5, not dozens.',
        'Keep consensus groups small and partition data across many groups.',
        'Use backoff, jitter and load shedding to avoid retry storms.',
      ],
      realSystems: [
        'etcd and Consul (Raft); ZooKeeper (Zab); Google Chubby and Spanner (Paxos).',
        'Kafka KRaft; Cassandra gossip and phi-accrual failure detection.',
        'Jepsen testing for correctness under faults.',
      ],
      numbersToKnow: [
        'Same-datacenter round trip is around 0.5 ms; cross-continent often 100+ ms. // VERIFY',
        'A 3-node Raft cluster tolerates 1 failure; 5 nodes tolerate 2.',
        'Raft election timeouts are commonly hundreds of milliseconds to seconds.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Heartbeat failure detector (simplified)',
      code: [
        'import time',
        '',
        'class FailureDetector:',
        '    def __init__(self, timeout=3.0):',
        '        self.timeout = timeout',
        '        self.last_seen = {}',
        '',
        '    def heartbeat(self, node):',
        '        self.last_seen[node] = time.monotonic()',
        '',
        '    def suspected(self):',
        '        now = time.monotonic()',
        '        return [n for n, t in self.last_seen.items() if now - t > self.timeout]',
      ].join('\n'),
      annotations: [
        { line: 9, text: 'Use a monotonic clock, which never jumps backwards like wall-clock time can.' },
        { line: 13, text: 'These nodes are only suspected: they may be slow, not dead.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why are distributed systems harder than single-machine ones?', answer: 'Parts can fail independently, messages can be lost or delayed and there is no shared clock or memory, so coordination is difficult.', followUps: ['What is partial failure?'] },
    { level: 'beginner', q: 'What is a heartbeat?', answer: 'A periodic message showing a node is alive. Missing heartbeats make others suspect it has failed.', followUps: ['Can it be wrong?'] },
    { level: 'intermediate', q: 'Why can you not rely on timestamps to order events across servers?', answer: 'Clocks drift and can jump, so two servers can disagree on time. Use logical or hybrid clocks, or a single sequencer, for ordering.', followUps: ['What is a Lamport clock?'] },
    { level: 'intermediate', q: 'How do you achieve effectively-once processing?', answer: 'Use at-least-once delivery with idempotent handlers or deduplication keys, since true exactly-once delivery is not possible over unreliable networks.', followUps: ['How long do you keep dedupe keys?'] },
    { level: 'expert', q: 'How do fencing tokens prevent split-brain corruption?', answer: 'Each lock or leadership grant carries an increasing token. The storage rejects writes with a lower token than it has seen, so a paused old leader cannot overwrite newer data.', followUps: ['Why are leases alone not enough?'] },
    { level: 'expert', q: 'What does the FLP result say?', answer: 'In a fully asynchronous system, no deterministic consensus algorithm can guarantee termination if even one process may crash. Practical protocols rely on timeouts, leader election and randomness to make progress.', followUps: ['How does Raft cope?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A silent node is...', options: ['Only suspected failed', 'Proven dead', 'Definitely fine', 'Encrypted'], answerIndex: 0, why: 'It may be slow.' },
    { level: 'beginner', q: 'Consensus means nodes...', options: ['Agree on one value', 'Share a CPU', 'Use one disk', 'Have same IP'], answerIndex: 0, why: 'They agree despite failures.' },
    { level: 'intermediate', q: 'To order events across servers use...', options: ['Logical clocks', 'Local wall clocks', 'File names', 'Random numbers'], answerIndex: 0, why: 'Wall clocks drift.' },
    { level: 'expert', q: 'Fencing tokens block...', options: ['Stale leaders writing', 'TLS', 'Indexes', 'DNS'], answerIndex: 0, why: 'Lower tokens are rejected.' },
  ],
});
