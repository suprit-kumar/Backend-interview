/* Distributed Systems: Two-Phase Commit. */
Atlas.topics.push({
  id: 'two-phase-commit-2pc',
  category: 'distributed-systems',
  title: 'Two-Phase Commit (2PC)',
  source: {
    description: 'A coordinator gets every node to agree before commit.',
    steps: ['Prepare: ask all', 'All vote yes', 'Commit: tell all', 'Any no: abort'],
  },
  estMinutes: 10,
  prereqs: ['distributed-transactions'],
  related: ['distributed-transactions', 'saga-pattern', 'consistency-models', 'transactions-acid'],
  tags: ['coordinator', 'prepare', 'commit', 'abort', 'blocking', 'XA'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'co', label: 'Coordinator' }, { id: 'p1', label: 'Node 1' }, { id: 'p2', label: 'Node 2' }] },
  },
  steps: [
    {
      label: 'Prepare: ask all',
      caption: {
        beginner: 'The organiser asks everyone: "can you do your part?"',
        intermediate: 'Phase 1: the coordinator sends PREPARE. Each node writes its changes durably and takes locks without committing.',
        expert: 'A node that votes yes promises it can commit later even after a crash, so it must force its prepare record to its log first.',
      },
      state: { messages: [{ from: 'co', to: 'p1', label: 'PREPARE', tone: 'plain' }, { from: 'co', to: 'p2', label: 'PREPARE', tone: 'plain' }] },
      hood: 'A yes vote is a durable promise.',
    },
    {
      label: 'All vote yes',
      caption: {
        beginner: 'Everyone answers "yes, ready".',
        intermediate: 'Every participant replies YES. The coordinator can now decide to commit.',
        expert: 'The coordinator logs the decision before telling anyone. That log is the single source of truth after a crash.',
      },
      state: { messages: [{ from: 'p1', to: 'co', label: 'YES', tone: 'good', back: true }, { from: 'p2', to: 'co', label: 'YES', tone: 'good', back: true }] },
      hood: 'The decision is logged before it is sent.',
    },
    {
      label: 'Commit: tell all',
      caption: {
        beginner: 'The organiser says "go", and everyone finishes.',
        intermediate: 'Phase 2: COMMIT is sent, and nodes commit and release locks.',
        expert: 'Participants in the prepared state cannot decide alone. If the coordinator is gone they block, holding locks.',
      },
      state: { messages: [{ from: 'co', to: 'p1', label: 'COMMIT', tone: 'good' }, { from: 'co', to: 'p2', label: 'COMMIT', tone: 'good' }, { from: 'p1', to: 'co', label: 'ACK', tone: 'good', back: true }] },
      hood: 'Prepared participants block if the coordinator crashes.',
    },
    {
      label: 'Any no: abort',
      caption: {
        beginner: 'If even one says "no", everyone cancels.',
        intermediate: 'A single NO (or a timeout) makes the coordinator send ABORT to all, and they roll back.',
        expert: 'Presumed-abort optimization lets the coordinator skip logging aborts. A participant that never voted may abort unilaterally.',
      },
      state: { messages: [{ from: 'p1', to: 'co', label: 'YES', tone: 'good', back: true }, { from: 'p2', to: 'co', label: 'NO', tone: 'bad', back: true }, { from: 'co', to: 'p1', label: 'ABORT', tone: 'bad' }, { from: 'co', to: 'p2', label: 'ABORT', tone: 'bad' }] },
      hood: 'Presumed abort reduces logging.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A group of friends booking a trip together. The organiser asks each if they can go, and only when all say yes does the organiser say "book it". If one says no, the trip is cancelled for everyone.',
      explanation: 'Two-phase commit makes several systems change data together. First everyone confirms they are ready, then everyone completes. If anyone is not ready, everyone cancels.',
      keyTerms: [
        { term: 'Coordinator', meaning: 'The node that runs the protocol.' },
        { term: 'Participant', meaning: 'A node that does part of the work.' },
        { term: 'Prepare', meaning: 'Phase 1: get ready and vote.' },
        { term: 'Commit', meaning: 'Phase 2: make the change permanent.' },
        { term: 'Abort', meaning: 'Cancel and roll back.' },
      ],
    },
    intermediate: {
      explanation: '2PC gives atomic commit across resources, but it is blocking: participants hold locks from prepare until they hear the decision. It suits a small number of reliable nodes with low latency.',
      howItWorks: [
        'Coordinator sends PREPARE to all participants.',
        'Each participant persists its work and replies YES or NO.',
        'If all YES, the coordinator logs COMMIT and sends it.',
        'If any NO or timeout, it logs ABORT and sends it.',
        'Participants apply the decision and release locks.',
        'Recovery reads logs to finish in-doubt transactions.',
      ],
      tradeoffs: {
        use: [
          'Use it for strict atomicity across a few trusted databases.',
          'Use it inside a distributed database that manages it for you.',
          'Use it when transactions are short.',
        ],
        avoid: [
          'Avoid it across many or slow services.',
          'Avoid it over the public internet or with third parties.',
          'Avoid it where availability matters more than strict atomicity.',
        ],
      },
      pitfalls: [
        'Coordinator failure leaving in-doubt transactions and held locks.',
        'Long transactions amplifying lock contention.',
        'Assuming it tolerates partitions; it does not.',
        'Heuristic decisions by operators causing inconsistency.',
        'Treating a timeout as abort after a participant already committed.',
      ],
    },
    expert: {
      internals: [
        'Participants log PREPARED with enough data to commit after a restart; locks persist across crashes.',
        'The coordinator log records the decision; recovery re-sends it until all acknowledge.',
        'Three-phase commit reduces blocking but assumes bounded delays and is rarely used; consensus (Paxos/Raft) replicates the coordinator instead.',
        'PostgreSQL PREPARE TRANSACTION and MySQL XA implement participant side.',
      ],
      failureModes: [
        'Blocking: coordinator down after prepare.',
        'Orphaned prepared transactions holding locks and blocking vacuum in Postgres.',
        'Network partition between coordinator and some participants.',
        'Slow participant dragging all transactions to its latency.',
      ],
      scalingNotes: [
        'Latency is at least two round trips plus forced log writes.',
        'Spanner replicates the coordinator state with Paxos to avoid single-point blocking.',
        'Monitor and alert on long-running prepared transactions.',
      ],
      realSystems: [
        'XA with Atomikos or Narayana; PostgreSQL prepared transactions.',
        'Google Spanner and CockroachDB use 2PC across ranges with consensus groups.',
        'Kafka transactions use a coordinator with a two-phase style commit marker.',
      ],
      numbersToKnow: [
        'Minimum 2 network round trips and 2+ forced disk writes per transaction.',
        'Postgres prepared transactions are off by default (max_prepared_transactions = 0).',
        'Lock hold time includes the full coordinator decision latency.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'sql',
      title: 'PostgreSQL prepared transaction',
      code: [
        'BEGIN;',
        "UPDATE accounts SET balance = balance - 100 WHERE id = 1;",
        "PREPARE TRANSACTION 'tx-42';",
        '-- coordinator decides, possibly from another session',
        "COMMIT PREPARED 'tx-42';",
        "-- or: ROLLBACK PREPARED 'tx-42';",
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Phase 1: the work is persisted and locks are held, but not committed.' },
        { line: 5, text: 'Phase 2: the coordinator commits the prepared transaction by name.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What are the two phases?', answer: 'Prepare, where each node votes if it can commit, and commit or abort, where the decision is applied everywhere.', followUps: ['What if one votes no?'] },
    { level: 'beginner', q: 'Why is it called blocking?', answer: 'After voting yes, nodes must wait for the coordinator and keep their locks, so a coordinator failure stalls them.', followUps: ['What are locks used for?'] },
    { level: 'intermediate', q: 'Why use sagas instead of 2PC in microservices?', answer: 'Sagas avoid cross-service locking and coupled availability. They accept eventual consistency and need compensations.', followUps: ['What do you lose?'] },
    { level: 'intermediate', q: 'What happens if the coordinator crashes after prepare?', answer: 'Participants are in doubt and block with locks until the coordinator recovers and re-sends its logged decision.', followUps: ['How can you reduce the risk?'] },
    { level: 'expert', q: 'How do modern distributed databases avoid 2PC blocking?', answer: 'They replicate the coordinator and participant state with consensus (Paxos or Raft), so a failed leader is replaced and the decision survives.', followUps: ['What latency does that add?'] },
    { level: 'expert', q: 'Why does 2PC not solve the CAP trade-off?', answer: 'During a partition it cannot commit without all participants, so it sacrifices availability to keep consistency.', followUps: ['What does 3PC change?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'If one node votes NO, the result is...', options: ['Abort for all', 'Commit anyway', 'Only that node aborts', 'Restart'], answerIndex: 0, why: 'All must agree to commit.' },
    { level: 'beginner', q: 'Phase 1 is called...', options: ['Prepare', 'Index', 'Merge', 'Seed'], answerIndex: 0, why: 'Nodes prepare and vote.' },
    { level: 'intermediate', q: 'The main weakness of 2PC is...', options: ['Blocking on coordinator failure', 'No atomicity', 'No durability', 'Too few messages'], answerIndex: 0, why: 'Prepared nodes wait holding locks.' },
    { level: 'expert', q: 'In a partition, 2PC favors...', options: ['Consistency over availability', 'Availability over consistency', 'Neither', 'Both fully'], answerIndex: 0, why: 'It cannot commit without all votes.' },
  ],
});
