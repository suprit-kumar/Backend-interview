/* Performance & Caching: Database Query Optimization. The worked example lives in data/worked/worked.js. */
Atlas.topics.push({
  id: 'database-query-optimization',
  category: 'performance-caching',
  title: 'Database Query Optimization',
  source: {
    description: 'Read the plan, then fix scans, joins and missing indexes.',
    steps: ['Run EXPLAIN', 'Spot full scan', 'Add index or rewrite', 'Re-measure'],
  },
  estMinutes: 15,
  prereqs: ['sql', 'indexing'],
  related: ['indexing', 'sql', 'pagination', 'performance-optimization'],
  tags: ['explain', 'query plan', 'index', 'n+1', 'seq scan', 'join', 'slow query'],
  visual: {
    type: 'compare',
    config: { left: { title: 'Before: slow query' }, right: { title: 'After: optimized' } },
  },
  steps: [
    {
      label: 'Run EXPLAIN',
      caption: {
        beginner: 'Ask the database how it plans to answer your question. It shows its route like a satnav.',
        intermediate: 'EXPLAIN shows the plan; EXPLAIN ANALYZE runs the query and adds real timings and row counts so you can compare estimates with reality.',
        expert: 'Use EXPLAIN (ANALYZE, BUFFERS) in PostgreSQL to see timing, actual rows, loops and buffer hits versus reads. Run it on production-sized data; plans on tiny tables mislead.',
      },
      state: { without: ['EXPLAIN SELECT * FROM orders WHERE customer_id = 7'], with: ['Same query, same data'], changed: 'Both start from the same plan request.' },
      hood: 'EXPLAIN (ANALYZE, BUFFERS) in PostgreSQL; EXPLAIN ANALYZE in MySQL 8.',
    },
    {
      label: 'Spot full scan',
      caption: {
        beginner: 'The plan says it reads every row in the table to find a few matches. That is slow on big tables.',
        intermediate: 'A Seq Scan on a large table with a selective filter, a big gap between estimated and actual rows, or a sort spilling to disk are the usual red flags.',
        expert: 'Look at the node with the highest actual time x loops, rows removed by filter, and estimate errors of 10x or more. Estimate errors point to stale statistics or correlated columns.',
      },
      state: { without: [{ text: 'Seq Scan on orders: 2,000,000 rows read, 40 returned', tone: 'bad' }], with: ['Looking for the same problem'], diverge: true, changed: 'The slow path is a full table scan.' },
      hood: 'Rows removed by filter divided by rows returned is a quick selectivity check.',
    },
    {
      label: 'Add index or rewrite',
      caption: {
        beginner: 'Add an index, like a book index, or rewrite the question so the database can use one.',
        intermediate: 'Add an index on the filtered or joined columns, select only needed columns, avoid functions on indexed columns, replace N+1 loops with a join or batch, and use keyset pagination.',
        expert: 'Match index column order to equality-then-range predicates and sort order; consider covering (INCLUDE) and partial indexes. Every index costs write throughput and storage, so remove unused ones.',
      },
      state: { without: [{ text: 'Still scanning every row', tone: 'bad' }], with: [{ text: 'CREATE INDEX ON orders (customer_id)', tone: 'good' }, { text: 'Index Scan: 40 rows read', tone: 'good' }], diverge: true, changed: 'The optimized query reads only matching rows.' },
      hood: 'Composite index: equality columns first, then range or sort. Use INCLUDE for covering reads.',
    },
    {
      label: 'Re-measure',
      caption: {
        beginner: 'Run it again and check that it really got faster. Never assume.',
        intermediate: 'Compare timings before and after on realistic data and watch the effect on writes and on other queries.',
        expert: 'Track p95 and p99 with pg_stat_statements, not one-off timings. Confirm the plan stays stable as data grows, and check that the new index did not slow inserts or bloat memory.',
      },
      state: { without: [{ text: '1,800 ms', tone: 'bad' }], with: [{ text: '2 ms', tone: 'good' }], diverge: true, verdict: { without: 'Slow and growing with table size', with: 'Fast and stable' }, changed: 'Measured improvement confirms the fix. Numbers are illustrative.' }, // VERIFY illustrative numbers
      hood: 'pg_stat_statements aggregates timings per normalized query for real-world tracking.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Finding a name in a phone book. Without the alphabetical order you would read every page; with it you jump straight to the right page. Query optimization is giving the database the order and the shortcuts it needs.',
      explanation: 'A slow query usually makes the database do far more work than needed, like reading every row. You ask the database for its plan, find the expensive step, fix it (often with an index or a smaller question), and measure again.',
      keyTerms: [
        { term: 'EXPLAIN', meaning: 'A command that shows how the database will run a query.' },
        { term: 'Full table scan', meaning: 'Reading every row of a table.' },
        { term: 'Index', meaning: 'A sorted lookup structure that finds rows quickly.' },
        { term: 'Selectivity', meaning: 'How small a share of the table a filter keeps.' },
        { term: 'N+1 queries', meaning: 'Running one query per item in a loop instead of one query for all.' },
      ],
    },
    intermediate: {
      explanation: 'Read the plan, find the node that dominates time, and fix the cause: missing or unusable indexes, too many columns or rows, N+1 patterns, bad join order from poor estimates, or sorts that spill. Verify the improvement and its side effects.',
      howItWorks: [
        'Capture slow queries (slow query log, pg_stat_statements).',
        'Run EXPLAIN ANALYZE and find the most expensive plan node.',
        'Check whether filters and joins can use an index.',
        'Fix: add or adjust indexes, rewrite the query, reduce columns and rows, or batch calls.',
        'Update statistics (ANALYZE) if estimates are far from actual row counts.',
        'Re-measure on realistic data and watch write performance.',
      ],
      tradeoffs: {
        use: [
          'Use indexes on columns used in WHERE, JOIN and ORDER BY for selective queries.',
          'Use covering indexes for hot read paths that need only a few columns.',
          'Use batching, joins or eager loading to remove N+1 queries.',
        ],
        avoid: [
          'Avoid adding an index for every column; each one slows writes and uses memory.',
          'Avoid functions or casts on indexed columns in WHERE (for example WHERE lower(email) = ...) unless you index the expression.',
          'Avoid OFFSET pagination deep into big tables; use keyset pagination.',
        ],
      },
      pitfalls: [
        'Optimizing on a tiny dev database where every plan looks fine.',
        'Selecting * and fetching columns you never use.',
        'N+1 queries hidden inside ORM lazy loading.',
        'Leading wildcard LIKE \'%x\' that cannot use a B-tree index.',
        'Declaring victory without re-measuring or checking write cost.',
      ],
    },
    expert: {
      internals: [
        'The planner picks scan and join methods from cost estimates built on statistics; a sequential scan can legitimately beat an index when a large fraction of the table matches.',
        'PostgreSQL index-only scans need the visibility map to be current, so vacuum matters for covering indexes to pay off.',
        'Composite index column order matters: the index serves leftmost-prefix equality predicates, then one range or the sort.',
        'Partial and expression indexes shrink the index to what queries actually use.',
        'Extended statistics (CREATE STATISTICS) fix estimate errors on correlated columns; parameter-dependent skew can make generic prepared plans bad.',
      ],
      failureModes: [
        'Plan flips after statistics change, turning a fast query slow overnight.',
        'Index bloat or too many indexes slowing inserts and updates.',
        'Locking or long transactions when building an index (use CREATE INDEX CONCURRENTLY).',
        'ORM-generated queries that defeat indexes with casts or implicit conversions.',
      ],
      scalingNotes: [
        'Fix queries before adding hardware; a missing index can cost orders of magnitude more than a bigger server.',
        'Offload reporting to replicas and analytics to a warehouse.',
        'Partition very large tables so queries and maintenance touch fewer pages.',
      ],
      realSystems: [
        'PostgreSQL EXPLAIN (ANALYZE, BUFFERS), pg_stat_statements, auto_explain, pgBadger.',
        'MySQL slow query log, EXPLAIN ANALYZE and the Performance Schema.',
        'ORM tooling: Django Debug Toolbar, SQLAlchemy echo, Hibernate statistics for spotting N+1.',
      ],
      numbersToKnow: [
        'A well-indexed point lookup typically takes well under a millisecond when cached; an unindexed scan grows linearly with table size.',
        'An index lookup on a table with hundreds of millions of rows is typically only a few page reads deep.',
        'Each additional index adds write amplification to every insert and update of the indexed columns.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'sql',
      title: 'Find the problem and fix it',
      code: [
        "EXPLAIN (ANALYZE, BUFFERS)",
        "SELECT id, total FROM orders WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 20;",
        "",
        "CREATE INDEX CONCURRENTLY idx_orders_customer_created",
        "  ON orders (customer_id, created_at DESC);",
      ].join('\n'),
      annotations: [
        { line: 1, text: 'ANALYZE runs the query and reports real timings; BUFFERS shows page hits versus reads.' },
        { line: 2, text: 'Select only needed columns and limit the rows returned.' },
        { line: 4, text: 'CONCURRENTLY builds the index without blocking writes (PostgreSQL).' },
        { line: 5, text: 'Equality column first, then the sort column, so the index also provides the ordering.' },
      ],
    },
    {
      lang: 'python',
      title: 'Remove an N+1 with eager loading (SQLAlchemy)',
      code: [
        'from sqlalchemy.orm import selectinload',
        '',
        '# N+1: one query for orders, then one per order for items',
        'orders = session.scalars(select(Order)).all()',
        '',
        '# Fixed: two queries total',
        'orders = session.scalars(select(Order).options(selectinload(Order.items))).all()',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'Accessing order.items inside a loop triggers a new query each time.' },
        { line: 7, text: 'selectinload fetches all items for the orders in one extra query.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'A query is slow. What is your first step?', answer: 'Run EXPLAIN (ideally EXPLAIN ANALYZE) to see the plan and find the expensive step, instead of guessing.', followUps: ['What would you look for in the output?'] },
    { level: 'beginner', q: 'What is an N+1 query problem?', answer: 'Running one query to get a list and then one extra query per item. Fix it with a join, eager loading or a batched IN query.', followUps: ['How do ORMs cause it?'] },
    { level: 'intermediate', q: 'Why might the database ignore your index?', answer: 'The filter is not selective, a function or cast wraps the column, the column order does not match, statistics say a scan is cheaper, or the types differ so an implicit cast prevents index use.', followUps: ['How would you confirm which?'] },
    { level: 'intermediate', q: 'Why is OFFSET pagination slow on deep pages?', answer: 'The database must still read and discard all skipped rows. Keyset pagination (WHERE id < last_id ORDER BY id DESC LIMIT n) jumps straight to the next page using an index.', followUps: ['What is the downside of keyset pagination?'] },
    { level: 'expert', q: 'A query regressed after a deploy with no code change. How do you investigate?', answer: 'Compare the current plan with a previous one (auto_explain or saved plans), check statistics freshness and data growth or skew, look for a changed generic versus custom plan, and check for index or bloat changes. Fix with ANALYZE, extended statistics, a better index or a hint-like rewrite.', followUps: ['How do you prevent surprises?'] },
    { level: 'expert', q: 'How do you decide between adding an index and denormalizing?', answer: 'Try the index first because it keeps the data model clean. Denormalize or precompute only when the read path stays too slow after indexing, accepting the cost of keeping copies correct and the extra write work.', followUps: ['What is the cost of too many indexes?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What does EXPLAIN show?', options: ['The data in a table', 'How the database will execute a query', 'The server password', 'A backup'], answerIndex: 1, why: 'EXPLAIN reveals the chosen plan, including scans, joins and estimated costs.' },
    { level: 'beginner', q: 'Which is a classic sign of a missing index?', options: ['Index Scan on a small range', 'Seq Scan reading millions of rows for few results', 'LIMIT 10', 'COMMIT'], answerIndex: 1, why: 'Scanning many rows to return a few suggests the filter column is not indexed.' },
    { level: 'intermediate', q: 'Which query pattern usually prevents using a normal index on email?', options: ['WHERE email = \'a@x.com\'', 'WHERE lower(email) = \'a@x.com\'', 'ORDER BY email', 'LIMIT 1'], answerIndex: 1, why: 'The function hides the column; index the expression or avoid the function.' },
    { level: 'expert', q: 'What is the main cost of adding many indexes?', options: ['Slower reads always', 'Slower writes and more storage', 'Broken transactions', 'Smaller tables'], answerIndex: 1, why: 'Every insert and update must maintain each index, increasing write cost and space.' },
  ],
});
