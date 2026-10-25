/* Data: Database Isolation Levels. Playground: js/sims/isolation-levels.js (ported from the reference). */
Atlas.topics.push({
  id: 'database-isolation-levels',
  category: 'data',
  title: 'Database Isolation Levels',
  source: {
    description: 'How much concurrent transactions may see of each other.',
    steps: ['Read uncommitted', 'Read committed', 'Repeatable read', 'Serializable'],
  },
  estMinutes: 16,
  prereqs: ['transactions-acid'],
  related: ['database-locking', 'optimistic-pessimistic-concurrency-control', 'transactions-acid', 'indexing'],
  tags: ['isolation', 'dirty read', 'non-repeatable read', 'phantom read', 'mvcc', 'snapshot', 'serializable'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 't1', label: 'Transaction 1' }, { id: 't2', label: 'Transaction 2' }],
      total: 10,
      unit: '',
      windows: [{ start: 3, end: 6, label: 'T2 changes the row' }],
      blocks: [
        { lane: 't1', start: 0, end: 3, label: 'T1 reads 100', kind: 'run' },
        { lane: 't2', start: 3, end: 5, label: 'T2 sets 50', kind: 'lock' },
        { lane: 't2', start: 5, end: 6, label: 'T2 commits', kind: 'run' },
        { lane: 't1', start: 6, end: 10, label: 'T1 reads again', kind: 'race' },
      ],
    },
  },
  steps: [
    {
      label: 'Read uncommitted',
      caption: {
        beginner: 'T1 can peek at T2\'s unfinished draft. If T2 then cancels, T1 acted on something that never existed.',
        intermediate: 'Dirty reads are allowed: T1 may see T2\'s uncommitted write. Almost never used in practice.',
        expert: 'PostgreSQL does not implement it (READ UNCOMMITTED behaves as READ COMMITTED). In MySQL InnoDB it reads the latest version regardless of commit state.',
      },
      state: { now: 4, changed: 'T2 has written 50 but not committed; T1 could see it.' },
      hood: 'Dirty read: seeing another transaction\'s uncommitted change.',
    },
    {
      label: 'Read committed',
      caption: {
        beginner: 'T1 only sees finished work from others. But if T1 looks twice, the answer can change in between.',
        intermediate: 'No dirty reads. Each statement sees data committed before it started, so repeated reads can differ (non-repeatable read).',
        expert: 'The default in PostgreSQL, Oracle and SQL Server. Each statement takes a fresh snapshot, so a lost update is still possible for read-modify-write unless you lock or use atomic UPDATEs.',
      },
      state: { now: 6, changed: 'T2 committed 50; T1\'s next read will differ from its first.' },
      hood: 'Per-statement snapshot in PostgreSQL READ COMMITTED.',
    },
    {
      label: 'Repeatable read',
      caption: {
        beginner: 'T1 sees the same picture every time it looks, even if others change things meanwhile.',
        intermediate: 'T1 keeps one snapshot for the whole transaction, so repeated reads match. Phantom rows may still appear in the standard definition.',
        expert: 'MySQL InnoDB default. PostgreSQL REPEATABLE READ is snapshot isolation, which also blocks phantoms but allows write skew. InnoDB adds gap and next-key locks for locking reads.',
      },
      state: { now: 8, changed: 'T1 keeps its snapshot and still reads 100.' },
      hood: 'Snapshot isolation: one snapshot per transaction. Write skew is still possible.',
    },
    {
      label: 'Serializable',
      caption: {
        beginner: 'The database behaves as if transactions ran one after another. It is the safest, and sometimes slower or retried.',
        intermediate: 'Results match some serial order. Conflicting transactions may be aborted, so the application must retry.',
        expert: 'PostgreSQL uses Serializable Snapshot Isolation, tracking read-write dependencies and aborting dangerous ones with serialization failures. Other engines use more locking. Expect retries under contention.',
      },
      state: { now: 10, changed: 'The outcome equals some one-at-a-time order.' },
      hood: 'SSI detects dangerous structures and aborts a transaction with SQLSTATE 40001.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Two people editing a shared recipe card. Should one see the other\'s scribbles before they finish, or only the final card, or a photocopy taken at the start? Isolation levels pick which one you get.',
      explanation: 'Many users change the same data at once. Isolation levels say how much of each other\'s work they may see in the middle. Stricter levels give more predictable results but allow less parallel work and may force retries.',
      keyTerms: [
        { term: 'Dirty read', meaning: 'Seeing another transaction\'s uncommitted change.' },
        { term: 'Non-repeatable read', meaning: 'Reading the same row twice and getting different values.' },
        { term: 'Phantom read', meaning: 'A repeated query returns new rows that appeared in between.' },
        { term: 'Snapshot', meaning: 'A frozen view of the data used by a transaction.' },
        { term: 'Isolation level', meaning: 'The rule for how much concurrent transactions can see of each other.' },
      ],
    },
    intermediate: {
      explanation: 'The SQL standard defines four levels by the anomalies they allow: Read Uncommitted (dirty reads), Read Committed (non-repeatable reads), Repeatable Read (phantoms in the standard) and Serializable (none). Real engines differ, so learn your database\'s behaviour.',
      howItWorks: [
        'READ UNCOMMITTED: reads the latest data, even if uncommitted.',
        'READ COMMITTED: each statement sees only committed data at that statement\'s start.',
        'REPEATABLE READ: the transaction keeps one snapshot, so re-reads match.',
        'SERIALIZABLE: the outcome is equivalent to some serial order, achieved with locks or conflict detection.',
        'Higher levels need more locking or abort and retry conflicting transactions.',
      ],
      tradeoffs: {
        use: [
          'Use READ COMMITTED as a sensible default for most OLTP code, with explicit locking where needed.',
          'Use REPEATABLE READ for reports that need a consistent view across several queries.',
          'Use SERIALIZABLE when invariants span multiple rows and you can retry on failure.',
        ],
        avoid: [
          'Avoid READ UNCOMMITTED; dirty reads are rarely worth the saved overhead.',
          'Avoid SERIALIZABLE without retry logic; it will throw serialization errors under contention.',
          'Avoid assuming the same level name behaves identically across engines.',
        ],
      },
      pitfalls: [
        'Believing READ COMMITTED prevents lost updates; a read-modify-write can still overwrite another transaction.',
        'Ignoring write skew under snapshot isolation (two doctors both go off call).',
        'Not retrying serialization failures and deadlocks.',
        'Using long REPEATABLE READ or SERIALIZABLE transactions that keep old versions alive.',
        'Testing only with one connection so concurrency anomalies never appear.',
      ],
    },
    expert: {
      internals: [
        'PostgreSQL MVCC: every row version has xmin and xmax; a snapshot decides visibility. READ COMMITTED takes a snapshot per statement, REPEATABLE READ per transaction.',
        'PostgreSQL SERIALIZABLE uses SSI: it tracks rw-conflicts with predicate locks and aborts a transaction in a dangerous structure.',
        'InnoDB REPEATABLE READ uses consistent snapshot reads plus next-key (record plus gap) locks on locking reads to prevent phantoms.',
        'SQL Server offers lock-based READ COMMITTED by default, with optional READ_COMMITTED_SNAPSHOT and SNAPSHOT isolation.',
        'Snapshot isolation allows write skew, so it is weaker than true serializability.',
      ],
      failureModes: [
        'Write skew breaking an invariant that spans rows, such as minimum on-call staff.',
        'Serialization failures (SQLSTATE 40001) or deadlocks when the application does not retry.',
        'Table bloat and held-back vacuum from old snapshots in long transactions.',
        'Gap locks in InnoDB causing unexpected blocking of inserts.',
      ],
      scalingNotes: [
        'Higher isolation raises abort and wait rates as concurrency grows; keep transactions short and touch fewer rows.',
        'Where possible, encode invariants as constraints or atomic UPDATEs so a lower level suffices.',
        'Use read replicas for reporting to avoid holding snapshots on the primary.',
      ],
      realSystems: [
        'PostgreSQL (SSI), MySQL InnoDB (next-key locks), Oracle (snapshot style read consistency), SQL Server (lock-based plus snapshot options).',
        'CockroachDB provides serializable by default; Spanner offers external consistency.',
        'Jepsen analyses document real isolation anomalies in many databases.',
      ],
      numbersToKnow: [
        'Defaults: PostgreSQL, Oracle and SQL Server use READ COMMITTED; MySQL InnoDB uses REPEATABLE READ.',
        'PostgreSQL reports serialization failure as SQLSTATE 40001 and deadlock as 40P01.',
        'Under high contention serializable workloads can see substantial retry rates, so measure before adopting. // VERIFY workload dependent',
      ],
    },
  },
  sim: 'isolation-levels',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Choose a level and retry (SQLAlchemy)',
      code: [
        'from sqlalchemy.exc import OperationalError',
        '',
        'def run_serializable(engine, work, retries=3):',
        '    for attempt in range(retries):',
        '        try:',
        '            with engine.connect().execution_options(isolation_level="SERIALIZABLE") as conn:',
        '                with conn.begin():',
        '                    return work(conn)',
        '        except OperationalError:',
        '            if attempt == retries - 1:',
        '                raise',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'The isolation level is set per connection for this unit of work.' },
        { line: 8, text: 'The whole transaction runs again on retry, never half of it.' },
        { line: 9, text: 'Serialization failures and deadlocks surface as errors the caller must retry. // VERIFY driver exception type' },
      ],
    },
    {
      lang: 'sql',
      title: 'Show the anomaly in two sessions',
      code: [
        '-- Session 1',
        'BEGIN ISOLATION LEVEL READ COMMITTED;',
        'SELECT balance FROM accounts WHERE id = 1;  -- 100',
        '-- Session 2 commits: UPDATE accounts SET balance = 50 WHERE id = 1;',
        'SELECT balance FROM accounts WHERE id = 1;  -- 50, non-repeatable read',
        'COMMIT;',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Change this to REPEATABLE READ and the second SELECT still returns 100.' },
        { line: 5, text: 'Two reads in one transaction gave different answers: a non-repeatable read.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a dirty read?', answer: 'Reading data another transaction has changed but not yet committed. If that transaction rolls back, you acted on data that never existed.', followUps: ['Which isolation level allows it?'] },
    { level: 'beginner', q: 'Why not always use the strictest isolation level?', answer: 'It reduces concurrency and can cause waits or aborted transactions that need retrying, so you pay in speed for safety you may not need.', followUps: ['When is it worth it?'] },
    { level: 'intermediate', q: 'Explain non-repeatable reads versus phantom reads.', answer: 'A non-repeatable read returns different values for the same row on a second read. A phantom read returns a different set of rows for the same predicate because rows were inserted or deleted.', followUps: ['Which level fixes each?'] },
    { level: 'intermediate', q: 'Does READ COMMITTED prevent lost updates?', answer: 'No. Two transactions can read the same value and both write back, so one update is lost. Use an atomic UPDATE, SELECT FOR UPDATE, a version column or a higher level.', followUps: ['Show an atomic UPDATE that avoids it.'] },
    { level: 'expert', q: 'What is write skew and which levels allow it?', answer: 'Two transactions read overlapping data, make disjoint writes based on it, and together break an invariant, for example two on-call doctors both going off call. Snapshot isolation (PostgreSQL REPEATABLE READ) allows it; true SERIALIZABLE or explicit locking prevents it.', followUps: ['How would you fix it without SERIALIZABLE?'] },
    { level: 'expert', q: 'How do PostgreSQL and MySQL InnoDB differ at REPEATABLE READ?', answer: 'PostgreSQL uses a transaction-wide snapshot (snapshot isolation) and may raise a serialization failure on conflicting updates. InnoDB uses a consistent snapshot for plain reads and next-key locks for locking reads, with different behaviour for updates to rows newer than the snapshot.', followUps: ['Why does that matter when porting code?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Which anomaly is prevented by READ COMMITTED?', options: ['Dirty read', 'Write skew', 'Non-repeatable read', 'Phantom read'], answerIndex: 0, why: 'READ COMMITTED only exposes committed data, so dirty reads are gone; the others can remain.' },
    { level: 'beginner', q: 'Reading the same row twice returns different values. What is this?', options: ['Dirty read', 'Non-repeatable read', 'Deadlock', 'Rollback'], answerIndex: 1, why: 'Another transaction committed a change between the two reads.' },
    { level: 'intermediate', q: 'What must your code do on a serialization failure?', options: ['Ignore it', 'Retry the whole transaction', 'Lower the level silently', 'Restart the database'], answerIndex: 1, why: 'The database aborted the transaction to protect correctness; running it again usually succeeds.' },
    { level: 'expert', q: 'Which anomaly can snapshot isolation still allow?', options: ['Dirty read', 'Non-repeatable read', 'Write skew', 'Lost commit'], answerIndex: 2, why: 'Snapshot isolation allows write skew; only serializable isolation (or explicit locks) prevents it.' },
  ],
});
