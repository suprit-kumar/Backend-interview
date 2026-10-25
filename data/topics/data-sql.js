/* Data: SQL. */
Atlas.topics.push({
  id: 'sql',
  category: 'data',
  title: 'SQL',
  source: {
    description: 'Declarative queries: you say what you want, the engine picks how.',
    steps: ['Parse', 'Plan', 'Execute', 'Return rows'],
  },
  estMinutes: 14,
  prereqs: [],
  related: ['indexing', 'database-design-normalization', 'transactions-acid', 'database-query-optimization'],
  tags: ['sql', 'select', 'join', 'group by', 'explain', 'query plan', 'declarative'],
  visual: {
    type: 'pipeline',
    config: {
      stages: [
        { id: 'parse', label: 'Parse', sub: 'syntax + names' },
        { id: 'plan', label: 'Plan', sub: 'pick cheapest' },
        { id: 'exec', label: 'Execute', sub: 'scan, join, filter' },
        { id: 'rows', label: 'Return rows', sub: 'result set' },
      ],
    },
  },
  steps: [
    {
      label: 'Parse',
      caption: {
        beginner: 'The database reads your sentence-like question and checks it is valid and that the tables and columns exist.',
        intermediate: 'The parser turns the SQL text into a tree and the analyzer resolves table and column names, types and permissions. Errors here never touch data.',
        expert: 'Parsing produces an AST; analysis binds names against the catalog and may rewrite views and rules. Prepared statements skip repeated parsing, and bound parameters keep user input out of the SQL text entirely.',
      },
      state: { active: ['parse'], payload: { parse: 'SELECT name FROM users WHERE age > 30' }, changed: 'Text becomes a validated query tree.' },
      hood: 'Parse, then analyze against the catalog (PostgreSQL pg_catalog, MySQL data dictionary).',
    },
    {
      label: 'Plan',
      caption: {
        beginner: 'You said what you want, not how to get it. The database works out the fastest route, like a satnav choosing a road.',
        intermediate: 'The optimizer considers scan types, join order and join algorithms, and picks the lowest estimated cost using table statistics. EXPLAIN shows the chosen plan.',
        expert: 'Cost-based optimizers estimate row counts from statistics (histograms, distinct counts). Stale statistics or correlated columns cause bad estimates, which is the usual root cause of a sudden slow query. Run ANALYZE and compare EXPLAIN ANALYZE estimates with actuals.',
      },
      state: { active: ['plan'], payload: { plan: 'Index Scan on users(age)' }, changed: 'An execution plan is chosen.' },
      hood: 'Statistics drive cost estimates. EXPLAIN ANALYZE shows estimated versus actual rows.',
    },
    {
      label: 'Execute',
      caption: {
        beginner: 'The database follows the plan: it reads the rows, keeps the ones that match and combines tables if needed.',
        intermediate: 'Plan nodes pull rows from child nodes: scan, filter, join, aggregate, sort, limit. The logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.',
        expert: 'Most engines use a pull-based iterator (volcano) model; some vectorize. Sorts and hash joins spill to disk when they exceed work_mem (PostgreSQL) or the sort buffer, which shows up as a sudden latency jump.',
      },
      state: { active: ['plan', 'exec'], payload: { exec: 'filter age > 30' }, changed: 'Rows flow through the plan nodes.' },
      hood: 'Iterator model: each node asks its child for the next row. Spills to disk are visible in EXPLAIN ANALYZE.',
    },
    {
      label: 'Return rows',
      caption: {
        beginner: 'You get back a table of results containing only the columns you asked for.',
        intermediate: 'Rows stream to the client. Without ORDER BY the order is not guaranteed, and selecting only needed columns saves memory and network.',
        expert: 'Large results should be streamed with a server-side cursor or paged with keyset pagination. SELECT * defeats covering indexes and breaks when columns are added.',
      },
      state: { active: ['rows'], payload: { rows: '2 rows: Ana, Raj' }, changed: 'The result set reaches the client.' },
      hood: 'Use cursors or keyset pagination for large results; avoid SELECT * in application code.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Ordering at a restaurant. You say "a vegetarian pizza with no olives" and the kitchen decides how to make it. You never explain which pan or which order of steps to use.',
      explanation: 'SQL is the language you use to ask a relational database for data. You describe the result you want, such as "names of users older than 30", and the database figures out the fastest way to get it. The same language also inserts, updates and deletes rows.',
      keyTerms: [
        { term: 'Table', meaning: 'A grid of rows and columns holding one kind of thing, like users.' },
        { term: 'Query', meaning: 'A request for data written in SQL.' },
        { term: 'JOIN', meaning: 'Combining rows from two tables using a shared value.' },
        { term: 'WHERE', meaning: 'A filter that keeps only rows that match a condition.' },
        { term: 'Query plan', meaning: 'The steps the database chooses to answer your query.' },
      ],
    },
    intermediate: {
      explanation: 'SQL is declarative: the optimizer chooses scans, join order and algorithms. Your job is correct logic, good schema and indexes, and reading EXPLAIN when something is slow. Know the logical evaluation order, the join types and NULL semantics.',
      howItWorks: [
        'The parser validates syntax and the analyzer resolves names, types and permissions.',
        'The optimizer enumerates plans and picks the cheapest by estimated cost.',
        'The executor runs the plan: scans, filters, joins, aggregates, sorts.',
        'Logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT, which is why a SELECT alias cannot be used in WHERE.',
        'Results stream back to the client in the order the plan produced them unless ORDER BY is given.',
      ],
      tradeoffs: {
        use: [
          'Use SQL when data is relational and you need joins, aggregates and constraints enforced by the database.',
          'Use it when ad hoc questions matter, because the same data can be queried many ways without code changes.',
          'Use it when you need transactions and strong consistency.',
        ],
        avoid: [
          'Avoid pushing heavy business logic into huge SQL when it becomes untestable and hard to maintain.',
          'Avoid ad hoc analytics on your primary OLTP database without limits; use a replica or warehouse.',
          'Avoid SQL for naturally graph or full-text workloads where a purpose-built engine fits better.',
        ],
      },
      pitfalls: [
        'Building SQL with string concatenation, which allows SQL injection. Use bound parameters.',
        'Using = NULL instead of IS NULL; NULL comparisons evaluate to unknown.',
        'SELECT * in application code and the N+1 query pattern from an ORM.',
        'Wrapping an indexed column in a function in WHERE, which prevents index use.',
        'Assuming row order without ORDER BY.',
      ],
    },
    expert: {
      internals: [
        'A cost-based optimizer enumerates join orders (dynamic programming for small joins, heuristics beyond a threshold) and costs each using statistics.',
        'Join algorithms: nested loop (good with an index on the inner side), hash join (equality joins, needs memory), merge join (pre-sorted inputs).',
        'Window functions, CTEs and subqueries may be inlined, materialized or flattened depending on the engine and version. // VERIFY per engine version',
        'Prepared statements can cache plans, but a generic plan can be worse than a custom one for skewed parameters.',
        'The planner trusts statistics; correlated columns and skew break its independence assumptions.',
      ],
      failureModes: [
        'Plan regressions after statistics change or a version upgrade, turning a fast query into a full scan.',
        'Sorts or hash joins spilling to disk under memory pressure.',
        'Long-running queries holding snapshots or locks and blocking maintenance such as vacuum.',
        'Parameter sniffing: a plan cached for one value is slow for another.',
      ],
      scalingNotes: [
        'Scale reads with replicas and the write path by sharding or partitioning once a single primary is saturated.',
        'Partition large tables by time or key so queries and maintenance touch fewer pages.',
        'Move analytical queries to a column store or warehouse instead of scaling the OLTP database.',
      ],
      realSystems: [
        'PostgreSQL planner with EXPLAIN (ANALYZE, BUFFERS) and pg_stat_statements.',
        'MySQL InnoDB with EXPLAIN and the optimizer trace.',
        'SQLite embedded engine; BigQuery and Snowflake as distributed SQL warehouses.',
      ],
      numbersToKnow: [
        'A point lookup on an indexed key typically takes well under a millisecond when pages are cached.',
        'A sequential scan reads data at disk or memory bandwidth, so cost grows linearly with table size.',
        'PostgreSQL default work_mem is 4 MB per sort or hash node. // VERIFY for your version',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'sql',
      title: 'Top customers: join, filter, aggregate',
      code: [
        'SELECT c.name, COUNT(*) AS orders, SUM(o.total) AS revenue',
        'FROM customers c',
        'JOIN orders o ON o.customer_id = c.id',
        "WHERE o.created_at >= DATE '2024-01-01'",
        'GROUP BY c.id, c.name',
        'HAVING SUM(o.total) > 1000',
        'ORDER BY revenue DESC',
        'LIMIT 10;',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'JOIN links each order to its customer through the foreign key.' },
        { line: 4, text: 'WHERE filters rows before grouping, so fewer rows are aggregated.' },
        { line: 6, text: 'HAVING filters groups after aggregation; WHERE cannot use SUM.' },
        { line: 8, text: 'LIMIT keeps the result small; pair it with ORDER BY for a stable top-N.' },
      ],
    },
    {
      lang: 'python',
      title: 'Parameterized query (no injection)',
      code: [
        'from sqlalchemy import text',
        '',
        'def find_users(session, min_age: int):',
        '    stmt = text("SELECT id, name FROM users WHERE age > :min_age")',
        '    return session.execute(stmt, {"min_age": min_age}).all()',
      ].join('\n'),
      annotations: [
        { line: 4, text: ':min_age is a bound parameter, never concatenated into the SQL text.' },
        { line: 5, text: 'The driver sends the value separately, so input cannot change the query structure.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does it mean that SQL is declarative?', answer: 'You describe the result you want, and the database chooses how to compute it. You do not write loops or pick indexes.', followUps: ['What is the tool that shows the chosen plan?'] },
    { level: 'beginner', q: 'What is the difference between WHERE and HAVING?', answer: 'WHERE filters individual rows before grouping. HAVING filters groups after aggregation, so it can use aggregates like SUM.', followUps: ['Can you use a SELECT alias in WHERE?'] },
    { level: 'intermediate', q: 'Explain INNER JOIN versus LEFT JOIN.', answer: 'INNER JOIN keeps only rows with a match in both tables. LEFT JOIN keeps every left row and fills right-side columns with NULL when there is no match.', followUps: ['Why can a WHERE on the right table turn a LEFT JOIN into an inner join?'] },
    { level: 'intermediate', q: 'How do you find out why a query is slow?', answer: 'Run EXPLAIN ANALYZE and compare estimated and actual rows, look for sequential scans on large tables, missing indexes, sorts that spill, and N+1 patterns in the caller.', followUps: ['What would you do if estimates are far off?'] },
    { level: 'expert', q: 'A query was fast yesterday and slow today with no code change. What do you check?', answer: 'Check for plan changes from stale or refreshed statistics, data growth or skew, a missing or bloated index, lock waits, and a generic cached plan. Compare EXPLAIN ANALYZE now against a captured earlier plan, then ANALYZE the table and consider fixing the query or extended statistics.', followUps: ['How do you prevent plan regressions in production?'] },
    { level: 'expert', q: 'When would you choose a hash join over a nested loop join?', answer: 'Hash join suits large equality joins with no useful index, at the cost of memory for the build side. Nested loop wins when the outer side is small and the inner has a selective index. Merge join suits inputs already sorted on the join key.', followUps: ['What happens when the hash table exceeds memory?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Which clause filters groups after aggregation?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answerIndex: 1, why: 'HAVING runs after GROUP BY and can use aggregates. WHERE filters rows before grouping.' },
    { level: 'beginner', q: 'What does the query optimizer do?', options: ['Formats the SQL text', 'Chooses how to execute the query', 'Encrypts the result', 'Creates tables'], answerIndex: 1, why: 'Because SQL is declarative, the optimizer picks scans, join order and algorithms.' },
    { level: 'intermediate', q: 'How do you safely include user input in a query?', options: ['Escape quotes manually', 'Concatenate with f-strings', 'Use bound parameters', 'Lowercase the input'], answerIndex: 2, why: 'Bound parameters keep data separate from the SQL structure, which prevents injection.' },
    { level: 'expert', q: 'The planner picks a bad plan for a query. What is the most common root cause?', options: ['Too many columns selected', 'Wrong row-count estimates from stale or insufficient statistics', 'The query uses uppercase keywords', 'The server clock is wrong'], answerIndex: 1, why: 'Cost-based plans depend on estimated row counts, so poor statistics produce poor plans.' },
  ],
});
