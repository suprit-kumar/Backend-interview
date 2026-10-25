/* Architecture: pagination */
Atlas.topics.push({
  id: 'pagination',
  category: 'architecture',
  title: 'Pagination',
  source: {
    description: 'Return big result sets in pages.',
    steps: ['Request page 1', 'Server returns items and cursor', 'Client sends cursor', 'Next page'],
  },
  estMinutes: 11,
  prereqs: ['sql'],
  related: ['indexing', 'database-query-optimization', 'api-gateway', 'sql'],
  tags: ['offset', 'keyset', 'cursor', 'limit', 'seek method', 'pagination'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'table',
      columns: ['id', 'title'],
      rows: [[1, 'Post A'], [2, 'Post B'], [3, 'Post C'], [4, 'Post D'], [5, 'Post E'], [6, 'Post F']],
    },
  },
  steps: [
    {
      label: 'Request page 1',
      caption: {
        beginner: 'The client asks for the first few items instead of everything.',
        intermediate: 'The request sets a page size limit, such as GET /posts?limit=2, so responses stay small and fast.',
        expert: 'Always cap the maximum limit server-side; unbounded page sizes let one request scan and serialize an entire table.',
      },
      state: { rows: [0, 1], changed: 'Page 1 covers the first two rows.' },
      hood: 'Enforce a maximum page size server-side.',
    },
    {
      label: 'Server returns items and cursor',
      caption: {
        beginner: 'The server sends the items and a bookmark saying where it stopped.',
        intermediate: 'Along with items it returns a cursor, usually the last seen sort key, so the next call can continue from there.',
        expert: 'Use an opaque cursor (encoded last key plus a tie-breaker such as id) so clients cannot depend on its structure and you can change it later.',
      },
      state: { rows: [0, 1], cells: [[1, 0]], changed: 'The last item (id 2) becomes the cursor.' },
      hood: 'Cursor = last (sort_key, id) encoded; treat it as opaque.',
    },
    {
      label: 'Client sends cursor',
      caption: {
        beginner: 'The client shows the bookmark and asks for what comes after it.',
        intermediate: 'The server queries WHERE (sort_key, id) > cursor ORDER BY sort_key, id LIMIT n, which uses an index to jump straight to the spot.',
        expert: 'Keyset (seek) pagination is O(log n) per page with an index, while OFFSET must read and discard all skipped rows, so deep pages get slower and can skip or repeat rows when data changes.',
      },
      state: { rows: [2, 3], dim: [0, 1], changed: 'The query seeks past id 2 using the index.' },
      hood: 'WHERE id > :last ORDER BY id LIMIT :n uses the index; OFFSET scans and discards.',
    },
    {
      label: 'Next page',
      caption: {
        beginner: 'The next items arrive, and the process repeats until there are no more.',
        intermediate: 'The response includes a new cursor, or none when the end is reached. Fetch one extra row to know whether another page exists.',
        expert: 'Cursor pagination is stable under inserts and deletes but cannot jump to page N or give an exact total cheaply. Offer counts separately or approximate them.',
      },
      state: { rows: [4, 5], dim: [0, 1, 2, 3], changed: 'Page 3 returned; the end is near.' },
      hood: 'Fetch limit+1 rows to detect has_more without a COUNT(*).',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Reading a long book with a bookmark. You read a few pages, place the bookmark and continue from it next time. You never need to carry the whole library, and you never re-read from page one.',
      explanation: 'Pagination returns a big list in small chunks. The client asks for the first chunk, receives a bookmark and uses it to get the next chunk. This keeps responses fast and cheap.',
      keyTerms: [
        { term: 'Page size (limit)', meaning: 'How many items one response returns.' },
        { term: 'Offset', meaning: 'Skip a number of rows, then return the next ones.' },
        { term: 'Cursor', meaning: 'A bookmark pointing to where the last page ended.' },
        { term: 'Keyset pagination', meaning: 'Continuing after the last seen sort key using an index.' },
      ],
    },
    intermediate: {
      explanation: 'OFFSET/LIMIT is simple and supports jumping to page N, but it slows on deep pages and shifts when rows change. Keyset (cursor) pagination stays fast and stable but supports only next and previous navigation.',
      howItWorks: [
        'The client sends a limit and optionally a cursor.',
        'The server orders by a stable, unique key (for example created_at plus id).',
        'With a cursor it filters rows after that key; with offset it skips rows.',
        'It fetches limit+1 rows to detect more pages.',
        'It returns items and the next cursor.',
        'The client repeats until no cursor is returned.',
      ],
      tradeoffs: {
        use: [
          'Use keyset pagination for large, frequently changing tables and infinite scroll.',
          'Use offset for small datasets or admin screens needing page numbers.',
          'Use opaque, signed or encoded cursors.',
        ],
        avoid: [
          'Avoid OFFSET on deep pages of big tables.',
          'Avoid ordering by a non-unique column without a tie-breaker.',
          'Avoid COUNT(*) on every page request for huge tables.',
        ],
      },
      pitfalls: [
        'Duplicate or skipped items when rows are inserted between OFFSET pages.',
        'Sorting on a non-unique key, causing unstable page boundaries.',
        'No maximum limit, letting clients request a million rows.',
        'Missing index on the sort key, making every page a scan.',
        'Exposing raw database ids in a guessable cursor format.',
      ],
    },
    expert: {
      internals: [
        'OFFSET n LIMIT m reads n+m rows and discards n; cost grows linearly with depth.',
        'Keyset on (created_at, id) uses a composite index and row-value comparison WHERE (created_at, id) < (:ts, :id), giving a stable index range scan.',
        'Cursors should encode all sort keys and direction, and may be signed to prevent tampering.',
        'Total counts are expensive in MVCC databases like PostgreSQL; use estimates (pg_class.reltuples), cached counts or omit them.',
      ],
      failureModes: [
        'Deep offset queries overloading the database (often hit by scrapers).',
        'Cursor invalidation when the sort order or schema changes.',
        'Skipped rows when ties on the sort key are not broken by a unique column.',
        'Inconsistent pages across replicas with lag.',
      ],
      scalingNotes: [
        'Index the sort columns; put the tie-breaker in the composite index.',
        'For search results, use search-engine cursors (search_after in Elasticsearch) instead of from/size beyond a limit.',
        'Cache first pages; rate limit deep traversal.',
      ],
      realSystems: [
        'GitHub, Stripe and Slack APIs use cursor-based pagination.',
        'Elasticsearch search_after and scroll; DynamoDB LastEvaluatedKey.',
        'Django REST framework CursorPagination, SQLAlchemy keyset helpers such as sqlakeyset.',
      ],
      numbersToKnow: [
        'Elasticsearch default max_result_window is 10,000 for from+size. // VERIFY',
        'OFFSET 1,000,000 forces the database to read about a million rows before returning any.',
        'Typical API page sizes are 20-100 items with a hard server cap.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'sql',
      title: 'Offset vs keyset',
      code: [
        '-- Offset: reads and discards 100000 rows',
        'SELECT id, title FROM posts ORDER BY id LIMIT 20 OFFSET 100000;',
        '',
        '-- Keyset: seeks via the index',
        'SELECT id, title FROM posts WHERE id > 100020 ORDER BY id LIMIT 21;',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Cost grows with the offset because skipped rows are still read.' },
        { line: 5, text: 'The index jumps to id 100020; LIMIT 21 fetches one extra to detect another page.' },
      ],
    },
    {
      lang: 'python',
      title: 'Cursor endpoint with opaque cursor',
      code: [
        'import base64, json',
        '',
        '@app.get("/posts")',
        'def posts(cursor: str | None = None, limit: int = Query(20, le=100), db=Depends(get_db)):',
        '    q = select(Post).order_by(Post.id).limit(limit + 1)',
        '    if cursor:',
        '        last = json.loads(base64.urlsafe_b64decode(cursor))["id"]',
        '        q = q.where(Post.id > last)',
        '    rows = db.scalars(q).all()',
        '    more = len(rows) > limit',
        '    rows = rows[:limit]',
        '    nxt = base64.urlsafe_b64encode(json.dumps({"id": rows[-1].id}).encode()).decode() if more else None',
        '    return {"items": rows, "next": nxt}',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'le=100 caps the page size server-side.' },
        { line: 8, text: 'Resume strictly after the last id using the primary key index.' },
        { line: 12, text: 'The cursor is opaque to clients and absent on the last page.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why paginate?', answer: 'Returning everything is slow, memory heavy and wasteful. Pages keep responses small and the system responsive.', followUps: ['What is a sensible default page size?'] },
    { level: 'beginner', q: 'What is a cursor?', answer: 'A bookmark, usually encoding the last item\'s sort key, that tells the server where to continue.', followUps: ['Why make it opaque?'] },
    { level: 'intermediate', q: 'Offset vs keyset pagination?', answer: 'Offset supports random page jumps but gets slower with depth and can skip or duplicate rows as data changes. Keyset uses the last key and an index for constant-ish speed and stable results but cannot jump to arbitrary pages.', followUps: ['Which for infinite scroll?'] },
    { level: 'intermediate', q: 'How do you paginate by a non-unique column like created_at?', answer: 'Add a unique tie-breaker such as id: order by (created_at, id) and compare rows as tuples. Otherwise rows with equal timestamps can be skipped or repeated.', followUps: ['What index supports it?'] },
    { level: 'expert', q: 'A scraper pages through deep OFFSETs and hurts the database. Fix?', answer: 'Switch to keyset pagination, cap deep traversal, rate limit by client, require filters and cache early pages. Index the sort key so each page is an index range scan.', followUps: ['How do you migrate existing clients?'] },
    { level: 'expert', q: 'How do you show a total count on huge tables?', answer: 'Avoid exact COUNT(*) per request. Use cached or approximate counts (statistics, estimated rows), cap displayed counts (for example 10,000+), or maintain counters, accepting slight staleness.', followUps: ['Why is COUNT(*) slow in PostgreSQL?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Pagination returns...', options: ['Data in chunks', 'All data at once', 'Only counts', 'Nothing'], answerIndex: 0, why: 'Chunks keep responses small.' },
    { level: 'beginner', q: 'A cursor is...', options: ['A bookmark for the next page', 'A SQL index', 'A password', 'A cache'], answerIndex: 0, why: 'It marks where the last page ended.' },
    { level: 'intermediate', q: 'Why is deep OFFSET slow?', options: ['Skipped rows are still read', 'Indexes break', 'HTTP slows down', 'JSON grows'], answerIndex: 0, why: 'The database scans and discards them.' },
    { level: 'expert', q: 'Ordering by created_at needs...', options: ['A unique tie-breaker like id', 'No index', 'OFFSET', 'COUNT(*)'], answerIndex: 0, why: 'Ties otherwise cause skipped or repeated rows.' },
  ],
});
