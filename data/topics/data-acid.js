/* Data: Transactions & ACID. The worked example lives in data/worked/worked.js. */
Atlas.topics.push({
  id: 'transactions-acid',
  category: 'data',
  title: 'Transactions & ACID',
  source: {
    description: 'All-or-nothing changes that keep data valid.',
    steps: ['BEGIN', 'Make changes', 'COMMIT or ROLLBACK', 'Flushed to disk (durable)'],
  },
  estMinutes: 15,
  prereqs: ['sql'],
  related: ['database-isolation-levels', 'database-locking', 'saga-pattern', 'idempotency'],
  tags: ['transaction', 'acid', 'commit', 'rollback', 'wal', 'durability', 'atomicity'],
  visual: {
    type: 'state-machine',
    config: {
      nodes: [
        { id: 'idle', label: 'No transaction', x: 10, y: 50 },
        { id: 'active', label: 'Active', sub: 'BEGIN', x: 32, y: 50 },
        { id: 'changed', label: 'Changes made', sub: 'uncommitted', x: 56, y: 22 },
        { id: 'committed', label: 'Committed', sub: 'durable', tone: 'ok', x: 88, y: 22 },
        { id: 'rolled', label: 'Rolled back', sub: 'as if never ran', tone: 'bad', x: 72, y: 80 },
      ],
      edges: [
        { from: 'idle', to: 'active', label: 'BEGIN' },
        { from: 'active', to: 'changed', label: 'UPDATE / INSERT' },
        { from: 'changed', to: 'committed', label: 'COMMIT + WAL flush' },
        { from: 'changed', to: 'rolled', label: 'ROLLBACK / error' },
      ],
    },
  },
  steps: [
    {
      label: 'BEGIN',
      caption: {
        beginner: 'You tell the database "treat the next steps as one package". Nothing is final yet.',
        intermediate: 'BEGIN opens a transaction. Until COMMIT, your changes are private to you and can be undone.',
        expert: 'The engine assigns a transaction id and, under MVCC, takes a snapshot of which versions you can see. PostgreSQL assigns the xid lazily on the first write.',
      },
      state: { active: ['active'], changed: 'A transaction scope opens.' },
      hood: 'MVCC snapshot is taken here (at BEGIN or at the first statement, depending on isolation level).',
    },
    {
      label: 'Make changes',
      caption: {
        beginner: 'Moving money: take 50 from Ana and add 50 to Raj. Both edits are written down, but only as a draft.',
        intermediate: 'Writes create new row versions or undo records and take locks. Other sessions do not see them until commit.',
        expert: 'Each change is first appended to the write-ahead log, then applied to pages in the buffer cache. Old versions are kept for readers (PostgreSQL heap versions, InnoDB undo log).',
      },
      state: { active: ['changed'], changed: 'Uncommitted changes exist.' },
      hood: 'WAL record first, then the in-memory page. Dirty pages reach disk later via checkpoint.',
    },
    {
      label: 'COMMIT or ROLLBACK',
      caption: {
        beginner: 'COMMIT makes both edits real together. ROLLBACK throws the draft away, and it is as if nothing happened.',
        intermediate: 'Atomicity means all changes apply or none do. An error or ROLLBACK discards the draft; COMMIT publishes it at once.',
        expert: 'Commit appends a commit record to the WAL; the transaction is committed once that record is durable. Rollback marks the transaction aborted (PostgreSQL) or applies undo (InnoDB).',
      },
      state: { active: ['committed'], edge: 2, changed: 'The transaction ends in commit.' },
      hood: 'The commit record in the WAL is the point of no return.',
    },
    {
      label: 'Flushed to disk (durable)',
      caption: {
        beginner: 'Once the database says "committed", the result survives a power cut.',
        intermediate: 'Durability: committed data is on stable storage via the log, so a crash cannot lose it.',
        expert: 'The WAL is fsynced at commit (unless synchronous_commit is off, which trades a small loss window for latency). After a crash, recovery replays the log (redo) and undoes unfinished transactions.',
      },
      state: { active: ['committed'], changed: 'Durable on disk via the log.' },
      hood: 'fsync of the WAL costs roughly a disk or SSD flush; group commit batches many transactions into one flush.',
    },
    {
      label: 'Rollback path (error)',
      caption: {
        beginner: 'If anything fails midway, such as the second step, the first step is undone too.',
        intermediate: 'The failed transaction is rolled back so the data stays valid: no money disappears.',
        expert: 'Constraint violations, deadlock victims and serialization failures abort the transaction. Your application must be ready to retry the whole transaction.',
      },
      state: { active: ['rolled'], edge: 3, changed: 'The transaction ends in rollback.' },
      hood: 'Retry the whole transaction on serialization failure or deadlock.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Handing over cash at a shop counter: either you pay and receive the goods, or the whole exchange is cancelled. You never leave having paid with nothing in return.',
      explanation: 'A transaction bundles several database steps into one unit. Either every step succeeds and is saved together, or none of them take effect. ACID names four promises: Atomic (all or nothing), Consistent (rules stay true), Isolated (parallel users do not interfere) and Durable (saved results survive crashes).',
      keyTerms: [
        { term: 'Transaction', meaning: 'A group of steps treated as one unit.' },
        { term: 'COMMIT', meaning: 'Make all changes permanent together.' },
        { term: 'ROLLBACK', meaning: 'Undo all changes in the transaction.' },
        { term: 'Atomicity', meaning: 'All steps happen or none do.' },
        { term: 'Durability', meaning: 'Committed data survives a crash.' },
      ],
    },
    intermediate: {
      explanation: 'ACID: Atomicity, Consistency (constraints hold before and after), Isolation (concurrent transactions behave as if separated, to a configurable degree) and Durability. Keep transactions short, wrap related writes together and be ready to retry on conflicts.',
      howItWorks: [
        'BEGIN starts a transaction and a snapshot of visible data.',
        'Each statement changes data and is recorded in a write-ahead log.',
        'Locks or row versions stop other transactions seeing or overwriting uncommitted work.',
        'COMMIT writes a commit record and flushes the log to disk.',
        'ROLLBACK or an error discards the changes.',
        'After a crash, recovery replays committed work and undoes unfinished work.',
      ],
      tradeoffs: {
        use: [
          'Use a transaction whenever several writes must succeed or fail together, such as a transfer between accounts.',
          'Use transactions to keep invariants like "total balance is constant" true.',
          'Use them around read-modify-write sequences with a suitable isolation level or locking.',
        ],
        avoid: [
          'Avoid long transactions that hold locks and keep old versions alive.',
          'Avoid holding a transaction open across a network call or user input.',
          'Avoid one giant transaction for a bulk job; batch it so failures and locks stay small.',
        ],
      },
      pitfalls: [
        'Forgetting to commit or roll back, leaving a connection stuck in an open transaction.',
        'Catching an exception inside a transaction and continuing as if it were fine.',
        'Assuming the default isolation level prevents every anomaly.',
        'Doing external side effects (email, payment API) inside a transaction that may roll back.',
        'Not retrying after deadlock or serialization failure.',
      ],
    },
    expert: {
      internals: [
        'Durability uses a write-ahead log: log records reach stable storage before the commit is acknowledged, and data pages are flushed lazily at checkpoints.',
        'Recovery (ARIES style) analyses, redoes and undoes from the log so committed work survives and uncommitted work disappears.',
        'PostgreSQL uses MVCC with row versions in the heap and vacuum to reclaim them; InnoDB keeps old versions in the undo log.',
        'Group commit lets many transactions share one fsync, which is why throughput scales better than one flush per commit.',
        'Consistency in ACID is mostly the application\'s invariants plus database constraints; the engine enforces what you declare.',
      ],
      failureModes: [
        'Long idle-in-transaction sessions blocking vacuum and bloating tables.',
        'Lost durability from synchronous_commit=off, fsync disabled or a disk cache that lies about flushes.',
        'Deadlocks and serialization failures under contention requiring retries.',
        'A commit that succeeds on the server but whose acknowledgement is lost, leaving the client unsure; make writes idempotent.',
      ],
      scalingNotes: [
        'Single-node ACID is cheap; distributed transactions across services need two-phase commit or sagas, with real cost in latency and availability.',
        'Reduce contention by shortening transactions, ordering lock acquisition and avoiding hot rows.',
        'Use replicas for reads, but remember replicas lag behind the primary.',
      ],
      realSystems: [
        'PostgreSQL WAL with MVCC and synchronous_commit; MySQL InnoDB redo and undo logs.',
        'Google Spanner and CockroachDB offer distributed ACID transactions.',
        'Sagas and outbox patterns for cross-service workflows without distributed transactions.',
      ],
      numbersToKnow: [
        'An fsync on an SSD commonly takes on the order of a millisecond or less; on spinning disks several milliseconds. // VERIFY hardware dependent',
        'A single-node database can commit thousands to tens of thousands of small transactions per second with group commit. // VERIFY workload dependent',
        'Cross-datacenter commit latency is bounded below by network round trips between replicas.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Atomic transfer with SQLAlchemy',
      code: [
        'from sqlalchemy import update',
        '',
        'def transfer(session, src, dst, amount):',
        '    with session.begin():',
        '        session.execute(update(Account).where(Account.id == src).values(balance=Account.balance - amount))',
        '        session.execute(update(Account).where(Account.id == dst).values(balance=Account.balance + amount))',
        '    # commit happens on leaving the block, rollback on any exception',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'session.begin() opens a transaction and commits on success or rolls back on error.' },
        { line: 5, text: 'balance - amount is computed inside the database, avoiding a lost update.' },
        { line: 7, text: 'If the second UPDATE fails, the first is undone too: atomicity.' },
      ],
    },
    {
      lang: 'sql',
      title: 'Explicit transaction',
      code: [
        'BEGIN;',
        'UPDATE accounts SET balance = balance - 50 WHERE id = 1;',
        'UPDATE accounts SET balance = balance + 50 WHERE id = 2;',
        'COMMIT;',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'BEGIN groups the next statements into one transaction.' },
        { line: 4, text: 'COMMIT publishes both updates at once; ROLLBACK here would discard both.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does ACID stand for?', answer: 'Atomicity (all or nothing), Consistency (rules remain valid), Isolation (concurrent transactions do not corrupt each other) and Durability (committed data survives crashes).', followUps: ['Which letter does the write-ahead log mainly provide?'] },
    { level: 'beginner', q: 'What happens if the server crashes halfway through a transaction?', answer: 'On restart the database recovers: unfinished transactions are rolled back, and committed ones are kept, so no half-finished state remains.', followUps: ['How does it know which is which?'] },
    { level: 'intermediate', q: 'Why keep transactions short?', answer: 'Long transactions hold locks, keep old row versions alive, block vacuum or purge and increase conflict and deadlock chances, hurting everyone else\'s latency.', followUps: ['What is idle in transaction and why is it harmful?'] },
    { level: 'intermediate', q: 'Is "Consistency" in ACID the same as consistency in CAP?', answer: 'No. ACID consistency means data satisfies the declared invariants and constraints after a transaction. CAP consistency means all nodes see the same data (linearizability).', followUps: ['Which one does a single-node database mainly offer?'] },
    { level: 'expert', q: 'How does a database guarantee durability?', answer: 'It appends changes to a write-ahead log and flushes the commit record to stable storage before acknowledging the commit. After a crash, recovery redoes committed work from the log and undoes unfinished work. Group commit amortizes the flush cost.', followUps: ['What are the risks of synchronous_commit=off?'] },
    { level: 'expert', q: 'You need a transaction across two microservices. What are your options?', answer: 'Avoid it if possible by redesigning boundaries. Otherwise use a saga with compensating actions plus an outbox for reliable events, accepting eventual consistency, or two-phase commit when all participants support it, accepting blocking and availability costs.', followUps: ['How do you make each step idempotent?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Money moves from A to B and the second update fails. What should happen?', options: ['A stays debited', 'Both changes are undone', 'Only B is credited', 'The database deletes both accounts'], answerIndex: 1, why: 'Atomicity means the whole transaction is rolled back so no money disappears.' },
    { level: 'beginner', q: 'Which property keeps committed data after a power cut?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answerIndex: 3, why: 'Durability is provided by flushing the write-ahead log at commit.' },
    { level: 'intermediate', q: 'What is a risk of calling a payment API inside an open database transaction?', options: ['SQL becomes invalid', 'The payment may happen even if the transaction later rolls back', 'Transactions cannot contain network calls in SQL', 'It makes commits faster'], answerIndex: 1, why: 'External side effects are not undone by a database rollback.' },
    { level: 'expert', q: 'Why does group commit improve throughput?', options: ['It skips the log', 'Many transactions share one fsync', 'It disables locking', 'It compresses data'], answerIndex: 1, why: 'The log flush is the expensive step; batching commits shares its cost.' },
  ],
});
