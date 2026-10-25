/* Architecture: idempotency */
Atlas.topics.push({
  id: 'idempotency',
  category: 'architecture',
  title: 'Idempotency',
  source: {
    description: 'Repeating a request gives the same result as doing it once.',
    steps: ['Client sends Idempotency-Key', 'Server stores result', 'Retry arrives', 'Return stored result'],
  },
  estMinutes: 11,
  prereqs: [],
  related: ['retry-strategies-exponential-backoff', 'message-queues', 'saga-pattern', 'service-to-service-communication'],
  tags: ['idempotency key', 'retry', 'exactly-once', 'deduplication', 'POST', 'payments'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'c', label: 'Client' }, { id: 's', label: 'Server' }, { id: 'db', label: 'Key store' }] },
  },
  steps: [
    {
      label: 'Client sends Idempotency-Key',
      caption: {
        beginner: 'The client attaches a unique ticket number to its request.',
        intermediate: 'The client generates a unique key (such as a UUID) per logical operation and sends it in a header.',
        expert: 'Generate the key once per user intent and reuse it on every retry. Scope keys per client or account and bind them to a request fingerprint.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'POST /pay  Key: k-123', tone: 'ok' }] },
      hood: 'One key per intent; reuse it for all retries of that intent.',
    },
    {
      label: 'Server stores result',
      caption: {
        beginner: 'The server does the job and writes down the result next to the ticket number.',
        intermediate: 'The server atomically records the key and the outcome with the side effect, using a unique constraint on the key.',
        expert: 'Insert the key first (status in-progress) with a unique constraint, do the work, then save the response. In the same transaction as the side effect where possible. Expire keys after a window such as 24 hours.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'POST /pay  Key: k-123', tone: 'ok' }, { from: 's', to: 'db', label: 'store k-123 -> result', tone: 'ok' }] },
      hood: 'Unique constraint on the key makes concurrent duplicates fail fast.',
    },
    {
      label: 'Retry arrives',
      caption: {
        beginner: 'The reply got lost, so the client asks again with the same ticket number.',
        intermediate: 'A timeout or network error makes the client retry with the same key.',
        expert: 'If the first attempt is still in progress, return 409 or wait; if the payload differs for the same key, reject with 422 instead of guessing.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'retry  Key: k-123', tone: 'bad' }, { from: 's', to: 'db', label: 'lookup k-123', tone: 'plain' }] },
      hood: 'Same key + different body should be rejected.',
    },
    {
      label: 'Return stored result',
      caption: {
        beginner: 'The server sees the ticket, skips the work and repeats the saved answer. No double charge.',
        intermediate: 'The server returns the saved response instead of running the operation again.',
        expert: 'Return the original status and body, including for original failures that were deterministic. This turns at-least-once delivery into effectively-once processing.',
      },
      state: { messages: [{ from: 'db', to: 's', label: 'found: result', tone: 'good', back: true }, { from: 's', to: 'c', label: '200 same result', tone: 'good', back: true }] },
      hood: 'At-least-once delivery + idempotent handler = effectively-once.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A lift button. Pressing "call lift" five times still brings one lift. Likewise, a cheque with a number can be cashed only once; showing the same cheque again does not pay twice.',
      explanation: 'An idempotent operation gives the same result no matter how many times you repeat it. Networks fail and clients retry, so APIs that change money or stock need a way to recognize repeats and not do the work twice.',
      keyTerms: [
        { term: 'Idempotent', meaning: 'Repeating it has no extra effect.' },
        { term: 'Idempotency key', meaning: 'A unique id sent with a request to detect repeats.' },
        { term: 'Retry', meaning: 'Sending the same request again after a failure.' },
        { term: 'Duplicate', meaning: 'The same request processed more than once.' },
      ],
    },
    intermediate: {
      explanation: 'GET, PUT and DELETE are idempotent by definition; POST is not. For POST, use an idempotency key stored with the result. Message consumers need the same protection because brokers deliver at least once.',
      howItWorks: [
        'Client creates a unique key and sends it with the request.',
        'Server tries to insert the key in a table with a unique constraint.',
        'If new, it performs the operation and stores the response.',
        'If the key exists and finished, it returns the stored response.',
        'If it exists and is in progress, it returns a conflict or waits.',
        'Keys expire after a retention window.',
      ],
      tradeoffs: {
        use: [
          'Use for payments, orders and any non-idempotent POST that clients may retry.',
          'Use in queue consumers to survive redelivery.',
          'Use natural idempotency (upsert, set state) when possible.',
        ],
        avoid: [
          'Avoid keys generated per retry; they defeat the purpose.',
          'Avoid storing results without the side effect transaction, leaving gaps.',
          'Avoid unbounded key retention.',
        ],
      },
      pitfalls: [
        'Check-then-act without a unique constraint, leaving a race.',
        'Key reused with a different payload being silently accepted.',
        'Recording the key but crashing before recording the result.',
        'Treating idempotent as "returns an error the second time".',
        'No expiry, so the table grows forever.',
      ],
    },
    expert: {
      internals: [
        'Implement with INSERT ... ON CONFLICT DO NOTHING on a key table plus a status (in_progress, done) and a stored response; do it in the same transaction as the side effect when both live in one database.',
        'When the side effect is external (a payment provider), pass the key through to the provider so it deduplicates too (Stripe supports Idempotency-Key).',
        'Naturally idempotent designs: upserts by a business key, state-set operations, and conditional updates with version checks.',
        'Exactly-once processing is achieved as at-least-once delivery plus idempotent processing, not by magic.',
      ],
      failureModes: [
        'Crash between side effect and recording the key, causing a duplicate on retry.',
        'Concurrent duplicates both passing a non-atomic check.',
        'Key store becoming a hot spot or being lost, reopening the duplicate window.',
        'Clock-based expiry shorter than the client retry horizon.',
      ],
      scalingNotes: [
        'Partition key tables by key hash and expire with TTL.',
        'Use Redis SET NX for short windows, but a database for durable financial records.',
        'Keep the retention window longer than the maximum retry horizon.',
      ],
      realSystems: [
        'Stripe Idempotency-Key header and PayPal request ids.',
        'Kafka idempotent producer and transactions; SQS FIFO deduplication id.',
        'Python: unique-constrained tables with SQLAlchemy, Redis SET NX.',
      ],
      numbersToKnow: [
        'Stripe keeps idempotency keys for at least 24 hours. // VERIFY',
        'SQS FIFO deduplication interval is 5 minutes. // VERIFY',
        'Keys are typically UUIDv4 (122 random bits), making collisions negligible.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Idempotent payment endpoint (FastAPI + SQLAlchemy)',
      code: [
        'from sqlalchemy.exc import IntegrityError',
        '',
        '@app.post("/pay")',
        'def pay(body: Pay, key: str = Header(alias="Idempotency-Key"), db=Depends(get_db)):',
        '    try:',
        '        db.add(IdemKey(key=key, status="in_progress"))',
        '        db.flush()',
        '    except IntegrityError:',
        '        db.rollback()',
        '        row = db.get(IdemKey, key)',
        '        if row.status == "done":',
        '            return row.response',
        '        raise HTTPException(409, "request in progress")',
        '    result = charge(body)',
        '    db.merge(IdemKey(key=key, status="done", response=result))',
        '    db.commit()',
        '    return result',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'The primary key on the key column makes concurrent duplicates fail atomically.' },
        { line: 11, text: 'A repeat after completion returns the saved response.' },
        { line: 13, text: 'A repeat during processing gets a conflict so the client retries later.' },
        { line: 15, text: 'The result is stored with the key so later retries are free.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does idempotent mean?', answer: 'An operation that has the same effect whether you do it once or many times, such as setting a value or deleting a record.', followUps: ['Is POST idempotent?'] },
    { level: 'beginner', q: 'Why do APIs need idempotency?', answer: 'Clients retry after timeouts, and the first attempt may have succeeded. Without idempotency a retry could charge a customer twice.', followUps: ['How do you implement it?'] },
    { level: 'intermediate', q: 'How does an idempotency key work?', answer: 'The client sends a unique key per operation. The server stores it with the result under a unique constraint; repeats return the stored result without redoing the work.', followUps: ['What if the payload differs?'] },
    { level: 'intermediate', q: 'Which HTTP methods are idempotent?', answer: 'GET, HEAD, PUT, DELETE and OPTIONS by definition. POST and PATCH are not necessarily, so they need keys or conditional logic.', followUps: ['Is DELETE idempotent if the second call returns 404?'] },
    { level: 'expert', q: 'How do you handle a crash between charging and recording the key?', answer: 'Pass the key to the payment provider so it deduplicates, store the key before the call with an in-progress status, and run a reconciliation job that resolves stuck keys by querying the provider. Where both live in one database, do it in a single transaction.', followUps: ['What about two concurrent requests with the same key?'] },
    { level: 'expert', q: 'Is exactly-once delivery possible?', answer: 'Not at the network level. You get effectively-once by combining at-least-once delivery with idempotent or transactional processing, as with Kafka idempotent producers plus transactions, or consumers that dedupe by id.', followUps: ['What are Kafka transactions limited to?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Idempotent means...', options: ['Repeats have no extra effect', 'Always fails twice', 'Is very fast', 'Needs a cache'], answerIndex: 0, why: 'Same result however many times it runs.' },
    { level: 'beginner', q: 'Which is naturally idempotent?', options: ['PUT /users/1', 'POST /charge', 'Append to a list', 'Increment a counter'], answerIndex: 0, why: 'PUT sets state to a value.' },
    { level: 'intermediate', q: 'What makes duplicate key handling race-free?', options: ['A unique constraint', 'A longer timeout', 'A cache', 'Sorting'], answerIndex: 0, why: 'The database rejects the second insert atomically.' },
    { level: 'expert', q: 'How is exactly-once processing usually achieved?', options: ['At-least-once delivery plus idempotent handling', 'Disabling retries', 'Faster networks', 'Compression'], answerIndex: 0, why: 'Duplicates are tolerated and neutralized.' },
  ],
});
