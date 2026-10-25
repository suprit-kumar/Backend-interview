/* Data: Database Locking. Playground: js/sims/db-locking.js. */
Atlas.topics.push({
  id: 'database-locking',
  category: 'data',
  title: 'Database Locking',
  source: {
    description: 'Locks stop two writers from corrupting one row.',
    steps: ['Tx A locks row', 'Tx B waits', 'A commits', 'B proceeds'],
  },
  estMinutes: 15,
  prereqs: ['transactions-acid', 'database-isolation-levels'],
  related: ['optimistic-pessimistic-concurrency-control', 'database-isolation-levels', 'transactions-acid', 'indexing'],
  tags: ['lock', 'row lock', 'for update', 'deadlock', 'shared lock', 'exclusive lock', 'lock wait'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 'a', label: 'Tx A' }, { id: 'b', label: 'Tx B' }],
      total: 8,
      unit: '',
      windows: [{ start: 1, end: 5, label: 'Row is locked by A' }],
      blocks: [
        { lane: 'a', start: 0, end: 4, label: 'A holds the row lock', kind: 'lock' },
        { lane: 'a', start: 4, end: 5, label: 'COMMIT', kind: 'run' },
        { lane: 'b', start: 1, end: 5, label: 'B waits for the lock', kind: 'wait' },
        { lane: 'b', start: 5, end: 8, label: 'B updates the row', kind: 'run' },
      ],
    },
  },
  steps: [
    {
      label: 'Tx A locks row',
      caption: {
        beginner: 'Tx A starts changing a row, so the database puts a "do not touch" sign on it.',
        intermediate: 'An UPDATE or SELECT ... FOR UPDATE takes an exclusive row lock held until the transaction ends.',
        expert: 'In PostgreSQL the row lock is recorded in the tuple header (xmax) rather than a lock table entry. InnoDB takes record locks on index entries and may add gap locks depending on isolation level and the index used.',
      },
      state: { now: 1, changed: 'A holds an exclusive lock on the row.' },
      hood: 'PostgreSQL stores row locks in the tuple (xmax); InnoDB locks index records.',
    },
    {
      label: 'Tx B waits',
      caption: {
        beginner: 'Tx B wants the same row, so it has to queue and wait.',
        intermediate: 'B blocks on A\'s lock. Waiting prevents B from overwriting A\'s uncommitted change but adds latency and can cascade.',
        expert: 'B waits on A\'s transaction id. Waits are bounded by lock_timeout or innodb_lock_wait_timeout. Chains of waiters form convoys; pg_locks and pg_stat_activity (or performance_schema) show who blocks whom.',
      },
      state: { now: 3, changed: 'B is blocked behind A.' },
      hood: 'Inspect blockers with pg_locks / pg_blocking_pids() or performance_schema.data_lock_waits.',
    },
    {
      label: 'A commits',
      caption: {
        beginner: 'Tx A finishes and the sign comes off.',
        intermediate: 'Locks are released at COMMIT or ROLLBACK, never earlier, which keeps the change safe until it is final.',
        expert: 'Strict two-phase locking holds all locks until the end of the transaction. Releasing early would let others read data that might still roll back.',
      },
      state: { now: 5, changed: 'The lock is released.' },
      hood: 'Two-phase locking: grow while running, release at the end.',
    },
    {
      label: 'B proceeds',
      caption: {
        beginner: 'Tx B now gets its turn and sees A\'s finished result, so both changes count.',
        intermediate: 'B acquires the lock, re-reads the committed row and applies its update on top of A\'s result.',
        expert: 'Under READ COMMITTED, PostgreSQL re-evaluates B\'s WHERE clause on the updated row version. Under REPEATABLE READ, B would instead fail with a serialization error because the row changed after its snapshot.',
      },
      state: { now: 8, changed: 'B updates the row after A\'s commit.' },
      hood: 'READ COMMITTED re-checks the row; REPEATABLE READ raises a serialization failure.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A single bathroom with a lock on the door. One person goes in, the door is locked, and the next person waits outside until it opens. No one ever walks in on someone else.',
      explanation: 'When two programs try to change the same data at once, they could overwrite each other. A lock lets the first one finish before the second one starts on that data. The cost is that the second one has to wait.',
      keyTerms: [
        { term: 'Lock', meaning: 'A marker that stops others from changing the same data at once.' },
        { term: 'Shared lock', meaning: 'Allows many readers but no writer.' },
        { term: 'Exclusive lock', meaning: 'Allows only one writer and blocks everyone else.' },
        { term: 'Deadlock', meaning: 'Two transactions each wait for a lock the other holds.' },
        { term: 'Lock timeout', meaning: 'The maximum time to wait before giving up.' },
      ],
    },
    intermediate: {
      explanation: 'Databases use shared and exclusive locks at row, page or table level. Writers take exclusive locks held until commit; MVCC engines let plain reads avoid locks. Deadlocks are resolved by aborting a victim, so code must retry.',
      howItWorks: [
        'A write or SELECT ... FOR UPDATE requests an exclusive lock on the row.',
        'If another transaction holds a conflicting lock, the request waits.',
        'Locks are released at COMMIT or ROLLBACK.',
        'The engine detects cycles of waiting transactions and aborts one.',
        'MVCC means ordinary SELECT does not block writers or get blocked by them.',
        'Lock timeouts stop waits from lasting indefinitely.',
      ],
      tradeoffs: {
        use: [
          'Use SELECT ... FOR UPDATE when you must read then write a row without interference, such as inventory reservation.',
          'Use row-level locks for high-contention rows where retries would be expensive.',
          'Use advisory locks for coordinating work that is not tied to one row.',
        ],
        avoid: [
          'Avoid holding locks during slow work like API calls or user input.',
          'Avoid table-level locks on busy tables; they stall all writers.',
          'Avoid inconsistent lock ordering across code paths, which causes deadlocks.',
        ],
      },
      pitfalls: [
        'Locking rows in different orders in different code paths.',
        'Long transactions holding locks while doing other work.',
        'Forgetting that a missing index can make an UPDATE lock many rows in InnoDB.',
        'Not retrying after a deadlock abort.',
        'Using SELECT ... FOR UPDATE on a wide range, blocking far more than needed.',
      ],
    },
    expert: {
      internals: [
        'PostgreSQL has table-level lock modes (ACCESS SHARE through ACCESS EXCLUSIVE) plus row locks (FOR UPDATE, NO KEY UPDATE, SHARE, KEY SHARE). DDL such as ALTER TABLE takes strong table locks and queues behind long transactions.',
        'InnoDB uses record, gap and next-key locks on index entries; locking reads and writes without a usable index may lock many records.',
        'Deadlock detection uses a wait-for graph: InnoDB checks immediately by default, PostgreSQL after deadlock_timeout (1 s default).',
        'SKIP LOCKED and NOWAIT let workers take available rows without blocking, which is the basis of simple job queues on a table.',
        'Lock escalation (converting many row locks to a table lock) happens in some engines such as SQL Server.',
      ],
      failureModes: [
        'Lock queues: a long transaction holding a strong lock makes every later request wait, even harmless ones.',
        'A pending ALTER TABLE waiting for a lock, which then blocks all new queries behind it.',
        'Deadlocks under load from inconsistent lock ordering.',
        'Hot rows (counters, latest-row inserts) serializing all writers.',
      ],
      scalingNotes: [
        'Reduce contention by shortening transactions, ordering lock acquisition and splitting hot rows (sharded counters).',
        'Use SELECT ... FOR UPDATE SKIP LOCKED to scale worker pools reading a queue table.',
        'Set lock_timeout on migrations so they fail fast instead of stalling production.',
      ],
      realSystems: [
        'PostgreSQL pg_locks and pg_blocking_pids(); MySQL performance_schema.data_locks.',
        'Advisory locks (pg_advisory_lock) and Redis based locks for cross-service coordination.',
        'SQL Server lock escalation; Oracle row-level locking with undo-based reads.',
      ],
      numbersToKnow: [
        'PostgreSQL deadlock_timeout defaults to 1 second; innodb_lock_wait_timeout defaults to 50 seconds. // VERIFY for your version',
        'Row-level lock overhead is small per row; contention, not the lock itself, is the cost.',
        'A single hot row typically limits writers to the rate at which one transaction can commit at a time.',
      ],
    },
  },
  sim: 'db-locking',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Reserve stock with a row lock',
      code: [
        'from sqlalchemy import select',
        '',
        'def reserve(session, product_id, qty):',
        '    with session.begin():',
        '        row = session.execute(',
        '            select(Product).where(Product.id == product_id).with_for_update()',
        '        ).scalar_one()',
        '        if row.stock < qty:',
        '            raise ValueError("out of stock")',
        '        row.stock -= qty',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'with_for_update() issues SELECT ... FOR UPDATE and locks the row until commit.' },
        { line: 8, text: 'The stock check is safe because no other transaction can change the row meanwhile.' },
        { line: 10, text: 'The lock releases when the with block commits or rolls back.' },
      ],
    },
    {
      lang: 'sql',
      title: 'Work queue with SKIP LOCKED',
      code: [
        'BEGIN;',
        'SELECT id FROM jobs',
        "WHERE status = 'pending'",
        'ORDER BY id',
        'LIMIT 1',
        'FOR UPDATE SKIP LOCKED;',
        "UPDATE jobs SET status = 'running' WHERE id = :id;",
        'COMMIT;',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'SKIP LOCKED ignores rows other workers have locked, so workers never block each other.' },
        { line: 7, text: 'The chosen job is marked running inside the same transaction.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why do databases use locks?', answer: 'To stop two transactions from changing the same data at the same time and corrupting it. One waits until the other finishes.', followUps: ['What is the downside of locking?'] },
    { level: 'beginner', q: 'What is a deadlock?', answer: 'Two transactions each hold a lock the other needs, so neither can continue. The database detects it and aborts one of them.', followUps: ['What should the application do next?'] },
    { level: 'intermediate', q: 'How do you prevent deadlocks?', answer: 'Always acquire locks in a consistent order, keep transactions short, lock only the rows you need, and retry the aborted transaction when one still occurs.', followUps: ['How can you find which statements deadlocked?'] },
    { level: 'intermediate', q: 'What does SELECT ... FOR UPDATE do?', answer: 'It reads the row and locks it so other transactions cannot update or lock it until you commit or roll back. It is the core of pessimistic concurrency.', followUps: ['What do NOWAIT and SKIP LOCKED change?'] },
    { level: 'expert', q: 'A deploy adds a column and the whole API stalls. What happened?', answer: 'ALTER TABLE needs a strong lock and queued behind a long-running transaction; every later query then queued behind the ALTER. Prevent it with lock_timeout on migrations, short transactions and online schema change techniques.', followUps: ['How would you detect the blocker?'] },
    { level: 'expert', q: 'How would you build a reliable job queue on PostgreSQL?', answer: 'Use a jobs table, claim rows with FOR UPDATE SKIP LOCKED in a short transaction, mark them running with a lease or heartbeat, and requeue stale ones. It scales well for moderate rates; at very high rates use a dedicated broker.', followUps: ['What happens when a worker crashes after claiming?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Transaction B wants a row A has locked for update. What happens?', options: ['B overwrites it', 'B waits until A finishes', 'The row is deleted', 'B gets a copy forever'], answerIndex: 1, why: 'An exclusive lock blocks conflicting writers until commit or rollback.' },
    { level: 'beginner', q: 'Which situation is a deadlock?', options: ['A waits for B while B waits for A', 'A is slow', 'B commits late', 'The disk is full'], answerIndex: 0, why: 'A cycle of waits can never resolve without the database aborting one transaction.' },
    { level: 'intermediate', q: 'What best prevents many deadlocks?', options: ['Longer transactions', 'Locking rows in a consistent order', 'Disabling commits', 'Using bigger tables'], answerIndex: 1, why: 'Consistent ordering means no two transactions can wait on each other in a cycle.' },
    { level: 'expert', q: 'What does FOR UPDATE SKIP LOCKED enable?', options: ['Faster full scans', 'Workers claim unlocked rows without blocking each other', 'Automatic deadlocks', 'Table locks'], answerIndex: 1, why: 'Locked rows are skipped, so concurrent workers pull different jobs.' },
  ],
});
