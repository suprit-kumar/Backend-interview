/* Data: Indexing (sample topic for Phase 1). */
Atlas.topics.push({
  id: 'indexing',
  category: 'data',
  title: 'Indexing',
  source: {
    description: 'A B-tree finds rows without scanning the whole table.',
    steps: ['Query WHERE id=42', 'Walk B-tree (3-4 hops)', 'Get row pointer', 'Fetch row'],
  },
  estMinutes: 14,
  prereqs: ['sql', 'data-structures-algorithms'],
  related: ['database-query-optimization', 'database-design-normalization', 'pagination', 'sql'],
  tags: ['b-tree', 'index', 'query plan', 'explain', 'composite index', 'covering index', 'performance'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'tree',
      query: 'WHERE id = 42',
      tree: {
        id: 'root', label: 'Root page', sub: '30 | 60',
        children: [
          { id: 'int-a', label: '< 30', sub: 'internal' },
          {
            id: 'int-b', label: '30 to 59', sub: 'internal',
            children: [
              { id: 'leaf-b1', label: '30 to 39', sub: 'leaf' },
              { id: 'leaf-b2', label: '40 to 49', sub: 'leaf', children: [{ id: 'row', label: 'Row id 42', kind: 'row' }] },
              { id: 'leaf-b3', label: '50 to 59', sub: 'leaf' },
            ],
          },
          { id: 'int-c', label: '>= 60', sub: 'internal' },
        ],
      },
    },
  },
  steps: [
    {
      label: 'Query WHERE id=42',
      caption: {
        beginner: 'You ask the database for the row whose id is 42. Without an index it would have to read every row to find it.',
        intermediate: 'The planner sees a predicate on an indexed column and chooses an index lookup over a sequential scan, because the index narrows the search to a few pages.',
        expert: 'The planner compares estimated costs using table statistics. For a highly selective predicate on an indexed column an index scan wins; for a predicate matching a large share of the table a sequential scan can be cheaper.',
      },
      state: { active: ['query'], note: 'Looking for id = 42', changed: 'The query arrives with an indexed predicate.' },
      hood: 'The planner reads table statistics (row count, value distribution) to estimate cost. A selective predicate on an indexed column favours an index scan.',
    },
    {
      label: 'Walk B-tree (3-4 hops)',
      caption: {
        beginner: 'The index is like a book index with several levels. Each hop narrows the search, so a few hops are enough even for millions of rows.',
        intermediate: 'Starting at the root, each page holds sorted key ranges that point to child pages. A tree with a wide fan-out stays very shallow, so a lookup touches only a handful of pages.',
        expert: 'Pages are typically 8 KB and hold hundreds of keys, so the fan-out is large and the height for even very large tables stays small (commonly 3 to 4 levels). Upper levels are almost always cached in memory, so the real cost is often a single page read.',
      },
      state: {
        active: ['root', 'int-b', 'leaf-b2'], path: ['query'], badges: { root: 'cached', 'int-b': 'cached', 'leaf-b2': '1 page read' }, // VERIFY illustrative
        note: 'Root, then internal, then leaf', changed: 'Three pages visited; sibling subtrees are skipped entirely.',
      },
      hood: 'Each page holds sorted keys and child pointers. Upper levels are usually in the buffer cache, so typically only the leaf costs a real read. Badges here are illustrative.',
    },
    {
      label: 'Get row pointer',
      caption: {
        beginner: 'The last index page contains the id 42 together with the location of its row.',
        intermediate: 'Leaf entries store the key plus a pointer to the table row (a physical location, or the primary key in clustered designs such as InnoDB secondary indexes).',
        expert: 'In PostgreSQL the leaf holds a tuple id (page, offset) into the heap; in InnoDB a secondary index stores the primary key, so a secondary lookup is followed by a primary-key lookup. A covering index avoids that second step.',
      },
      state: { active: ['leaf-b2'], path: ['query', 'root', 'int-b'], badges: { 'leaf-b2': 'key 42 + row pointer' }, note: 'Pointer found', changed: 'The leaf entry for 42 gives the row location.' },
      hood: 'PostgreSQL leaf entries hold a tuple id (page, offset); InnoDB secondary indexes store the primary key instead, which costs a second lookup.',
    },
    {
      label: 'Fetch row',
      caption: {
        beginner: 'Using the pointer, the database reads the row and returns it. Done, without reading the whole table.',
        intermediate: 'One more read fetches the row from the table. If the query only needs indexed columns, an index-only scan can skip this step.',
        expert: 'Heap fetches can be random I/O; visibility checks may force heap access even for index-only scans in MVCC systems until the visibility map is up to date. Many rows per query turn this into the main cost, which is when a plain scan can win.',
      },
      state: { active: ['row'], path: ['query', 'root', 'int-b', 'leaf-b2'], badges: { row: 'heap fetch' }, note: 'Row returned', changed: 'The row is read from the table and returned.' },
      hood: 'The heap fetch can be random I/O, and MVCC visibility checks may force it even for index-only scans. Many rows per query make this the dominant cost.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'An index is like the index at the back of a textbook. Instead of reading every page to find a topic, you look it up in the alphabetical list and jump straight to the right page.',
      explanation: 'A database table is stored in no particular order, so finding one row normally means checking every row. An index is a separate, sorted structure (usually a B-tree) that lets the database jump to the right place in a few steps. The price: the index takes space and must be updated every time you insert, update or delete.',
      keyTerms: [
        { term: 'Index', meaning: 'A sorted lookup structure kept next to the table to find rows quickly.' },
        { term: 'B-tree', meaning: 'A balanced tree that stays shallow, so lookups take only a few steps.' },
        { term: 'Full table scan', meaning: 'Reading every row to find matches. Slow on big tables.' },
        { term: 'Primary key', meaning: 'The column that uniquely identifies each row. It is indexed automatically.' },
        { term: 'Composite index', meaning: 'One index over several columns, such as (city, email).' },
      ],
    },
    intermediate: {
      explanation: 'Most relational indexes are B-trees (strictly B+ trees in most engines) with sorted leaf pages. They speed up equality, range, ORDER BY and some JOIN access, at the cost of extra storage and slower writes, because each write must maintain every index on the table.',
      howItWorks: [
        'The index stores keys in sorted order across pages arranged as a tree: root, internal pages, leaf pages.',
        'A lookup walks from the root down, choosing the child whose key range contains the target.',
        'The leaf gives a pointer to the row (or the primary key in clustered storage).',
        'The engine fetches the row. If the index already holds every column the query needs, it can skip this step (a covering or index-only scan).',
        'Composite indexes follow the leftmost-prefix rule: an index on (city, email) helps queries on city, or on city and email, but not on email alone.',
      ],
      tradeoffs: {
        use: [
          'Columns used often in WHERE, JOIN, ORDER BY or GROUP BY on tables large enough that scans hurt.',
          'Highly selective columns, where a filter keeps a small share of the rows.',
          'Foreign key columns, so joins and deletes on the parent table stay fast.',
        ],
        avoid: [
          'Tiny tables, where a scan is already cheap.',
          'Low-selectivity columns such as a boolean flag, unless combined with other columns or used in a partial index.',
          'Write-heavy tables where every extra index slows each insert and update.',
        ],
      },
      pitfalls: [
        'Wrapping the column in a function, such as `WHERE lower(email) = ...`, so the plain index cannot be used. Create an expression index instead.',
        'A leading wildcard like `LIKE \'%smith\'`, which cannot use a normal B-tree index.',
        'Getting the column order of a composite index wrong for the queries you actually run.',
        'Adding indexes without checking the query plan, then paying the write cost for indexes nothing uses.',
        'Comparing a column with a value of a different type, which can force an implicit cast and a scan.',
      ],
    },
    expert: {
      internals: [
        'Pages are fixed-size (commonly 8 KB in PostgreSQL, 16 KB in InnoDB) and hold many keys, giving a high fan-out and a very low tree height.',
        'Inserts that overflow a page cause page splits. Random keys such as UUIDv4 split pages throughout the tree and bloat it; roughly sequential keys append to the right edge and pack tighter.',
        'PostgreSQL indexes point into an unordered heap and rely on a visibility map for index-only scans; InnoDB stores the table itself as a B-tree on the primary key and secondary indexes carry the primary key.',
        'Other index types exist for other access patterns: hash for equality only, GIN for full text and arrays, GiST and BRIN for geometry and large ordered data.',
      ],
      failureModes: [
        'A stale statistics problem: the planner picks a scan or a poor index because row estimates are wrong. Run ANALYZE and check the plan.',
        'Index bloat after heavy updates and deletes: lookups slow down and storage grows until the index is rebuilt (REINDEX).',
        'Locking during index creation on a large live table. Use the online variant (for example `CREATE INDEX CONCURRENTLY` in PostgreSQL).',
        'Too many indexes: write throughput drops and the working set no longer fits in memory.',
      ],
      scalingNotes: [
        'Keep hot index pages in memory: index size relative to RAM matters more than raw table size.',
        'Partial indexes (WHERE active) and covering indexes (INCLUDE) keep indexes small and avoid heap fetches.',
        'Partitioning and sharding reduce per-index size; each partition has its own index.',
      ],
      realSystems: ['PostgreSQL (B-tree, GIN, GiST, BRIN)', 'MySQL InnoDB (clustered primary key)', 'SQLite (B-tree for tables and indexes)'],
      numbersToKnow: [
        'A B-tree with a fan-out of a few hundred keys per page typically needs only about 3 to 4 levels for tens or hundreds of millions of rows. // VERIFY exact heights depend on key size and page size',
        'Index lookup cost grows roughly with the logarithm of the table size, a full scan grows linearly with it.',
        'A scan can beat an index when the query returns a large share of the table, often a double-digit percentage, because sequential I/O is cheap. // VERIFY the crossover is workload-specific',
      ],
    },
  },
  sim: 'index-lookup',
  worked: null,
  code: [
    {
      lang: 'sql',
      title: 'SQL: create and check',
      code: [
        'CREATE TABLE users (',
        '    id         BIGSERIAL PRIMARY KEY,',
        '    email      TEXT NOT NULL,',
        '    city       TEXT,',
        '    created_at TIMESTAMPTZ NOT NULL DEFAULT now()',
        ');',
        '',
        'CREATE INDEX idx_users_email ON users (email);',
        '',
        'EXPLAIN ANALYZE',
        "SELECT * FROM users WHERE email = 'asha@example.com';",
        '-- Expect: Index Scan using idx_users_email on users',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'The primary key already has an index, so `WHERE id = 42` is fast with no extra work.' },
        { line: 8, text: 'A B-tree on `email`. Every insert, update and delete on the table now also maintains it.' },
        { line: 10, text: '`EXPLAIN ANALYZE` runs the query and shows the plan the engine really used and its timing.' },
        { line: 12, text: 'If you see a sequential scan here instead, check statistics and the column type.' },
      ],
    },
    {
      lang: 'python',
      title: 'SQLAlchemy: declare indexes',
      code: [
        'from sqlalchemy import Index, String',
        'from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column',
        '',
        'class Base(DeclarativeBase):',
        '    pass',
        '',
        'class User(Base):',
        '    __tablename__ = "users"',
        '',
        '    id: Mapped[int] = mapped_column(primary_key=True)',
        '    email: Mapped[str] = mapped_column(String(255))',
        '    city: Mapped[str | None] = mapped_column(String(80))',
        '',
        '    __table_args__ = (',
        '        Index("idx_users_email", "email", unique=True),',
        '        Index("idx_users_city_email", "city", "email"),',
        '    )',
      ].join('\n'),
      annotations: [
        { line: 15, text: 'A unique index both speeds lookups and enforces that no two users share an email.' },
        { line: 16, text: 'Composite index. Column order matters: it serves `city` and `city + email`, not `email` alone.' },
      ],
    },
  ],
  interview: [
    {
      level: 'beginner',
      q: 'What is a database index and why use one?',
      answer: 'An index is a separate sorted structure, usually a B-tree, that lets the database find rows without scanning the whole table. It makes reads on the indexed columns much faster, at the cost of extra storage and slower writes.',
      followUps: ['Which column is indexed automatically?', 'What is a full table scan?'],
    },
    {
      level: 'beginner',
      q: 'Why does adding an index make writes slower?',
      answer: 'Every insert, update or delete must also update each index on the table, to keep it sorted and consistent with the data. More indexes mean more work per write.',
      followUps: ['How would you decide how many indexes a table needs?'],
    },
    {
      level: 'intermediate',
      q: 'Explain the leftmost-prefix rule for composite indexes.',
      answer: 'An index on (a, b, c) is sorted by a, then b within a, then c within b. So it can serve queries filtering on a, on a and b, or on a, b and c. It generally cannot serve a query that filters only on b or c, because those values are not sorted on their own.',
      followUps: ['How would you order the columns for a query with an equality on city and a range on created_at?', 'When is a covering index useful?'],
    },
    {
      level: 'intermediate',
      q: 'You added an index but the query still does a sequential scan. What could be the cause?',
      answer: 'Common reasons: the predicate wraps the column in a function or cast, a leading wildcard in LIKE, a type mismatch, stale statistics, or the filter returns so many rows that a scan is genuinely cheaper. Check the plan with EXPLAIN, refresh statistics, and consider an expression or partial index.',
      followUps: ['What is selectivity?', 'How do you check whether an index is ever used?'],
    },
    {
      level: 'expert',
      q: 'Why can UUIDv4 primary keys hurt insert performance, and what are the alternatives?',
      answer: 'Random keys land all over the B-tree, so inserts touch many different pages, causing page splits, poor cache locality and larger, bloated indexes. Roughly time-ordered keys (UUIDv7, ULID, or a bigint sequence) append near the right edge and keep hot pages in memory. The trade-off is that sequential ids can leak ordering and create a hot spot in some distributed stores.',
      followUps: ['How does clustered storage in InnoDB make this worse for secondary indexes?', 'What changes in a sharded database?'],
    },
    {
      level: 'expert',
      q: 'How would you add an index to a large table in production without causing an outage?',
      answer: 'Use the online or concurrent build option (for example CREATE INDEX CONCURRENTLY in PostgreSQL) so writes are not blocked, run it off-peak, monitor replication lag and I/O, and verify the new index with EXPLAIN before relying on it. Be ready for the build to fail and leave an invalid index that must be dropped and retried.',
      followUps: ['What happens to replicas during the build?', 'How do you drop an unused index safely?'],
    },
  ],
  quiz: [
    {
      level: 'beginner',
      q: 'What is the main benefit of an index on a column you often filter by?',
      options: ['It makes inserts faster', 'It lets the database find matching rows without scanning the whole table', 'It reduces the size of the table', 'It removes the need for a primary key'],
      answerIndex: 1,
      why: 'Indexes speed up reads by narrowing the search. They cost extra storage and slow down writes.',
    },
    {
      level: 'intermediate',
      q: 'You have an index on (city, email). Which query can use it efficiently?',
      options: ['WHERE email = \'a@b.com\'', 'WHERE city = \'Pune\'', 'WHERE lower(city) = \'pune\'', 'WHERE email LIKE \'%@b.com\''],
      answerIndex: 1,
      why: 'The index is sorted by city first. Filtering only on email skips the leftmost column, a function on the column hides it, and a leading wildcard cannot use a B-tree.',
    },
    {
      level: 'intermediate',
      q: 'When can a full table scan be faster than using an index?',
      options: ['When the query matches a large share of the rows', 'Never', 'Only on empty tables', 'Only when the index is composite'],
      answerIndex: 0,
      why: 'If most rows qualify, reading the table sequentially is cheaper than many random index-plus-heap lookups. The planner decides using statistics.',
    },
    {
      level: 'expert',
      q: 'Roughly how many B-tree levels does a lookup need in a table with hundreds of millions of rows?',
      options: ['Hundreds', 'Around 30', 'Only a few, commonly 3 to 4', 'Exactly one'],
      answerIndex: 2,
      why: 'Each page holds hundreds of keys, so the tree is very wide and shallow. The exact height depends on key and page size.',
    },
  ],
});
