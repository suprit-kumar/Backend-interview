/* Concurrency & Messaging: Message Queues. Playground: js/sims/queue-backlog.js. */
Atlas.topics.push({
  id: 'message-queues',
  category: 'concurrency-messaging',
  title: 'Message Queues',
  source: {
    description: 'Producers and consumers are decoupled by a buffer.',
    steps: ['Producer', 'Queue', 'Consumer pulls', 'Ack and delete'],
  },
  estMinutes: 13,
  prereqs: ['asynchronous-programming'],
  related: ['kafka-rabbitmq', 'event-driven-architecture', 'idempotency', 'retry-strategies-exponential-backoff'],
  tags: ['queue', 'producer', 'consumer', 'ack', 'dead letter', 'at-least-once', 'backpressure'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'prod', label: 'Producer', kind: 'service', x: 10, y: 50 },
        { id: 'q', label: 'Queue', kind: 'queue', x: 48, y: 50 },
        { id: 'cons', label: 'Consumer', kind: 'service', x: 88, y: 50 },
      ],
      edges: [{ from: 'prod', to: 'q' }, { from: 'q', to: 'cons' }],
    },
  },
  steps: [
    {
      label: 'Producer',
      caption: {
        beginner: 'A sender drops a message into a mailbox and goes back to work without waiting.',
        intermediate: 'The producer publishes a message and returns immediately, so the caller does not wait for the slow work.',
        expert: 'Publishing should be durable: persistent messages and publisher confirms ensure the broker has accepted it. Without confirms a crash can silently lose a message.',
      },
      state: { packets: [{ from: 'prod', to: 'q', tone: 'ok', label: 'msg' }], active: ['prod'], badges: { q: 'depth 1' }, changed: 'A message enters the queue.' },
      hood: 'Use publisher confirms and persistent delivery for must-not-lose messages.',
    },
    {
      label: 'Queue',
      caption: {
        beginner: 'The mailbox holds messages safely until someone is ready to handle them.',
        intermediate: 'The queue buffers bursts, absorbing traffic spikes so consumers process at their own pace.',
        expert: 'A queue converts a latency problem into a backlog problem. Unbounded growth means consumers are slower than producers; watch depth and age of the oldest message, and apply backpressure or scaling.',
      },
      state: { active: ['q'], badges: { q: 'depth 40' }, changed: 'Messages wait in the buffer.' },
      hood: 'Alert on queue depth and oldest-message age, not just depth.',
    },
    {
      label: 'Consumer pulls',
      caption: {
        beginner: 'A worker takes the next message and starts working on it.',
        intermediate: 'The consumer receives a message, which becomes invisible or unacknowledged to others while it is processed.',
        expert: 'Prefetch limits how many unacknowledged messages a consumer holds; too high starves other consumers, too low hurts throughput. Competing consumers give horizontal scaling.',
      },
      state: { packets: [{ from: 'q', to: 'cons', tone: 'ok', label: 'msg' }], active: ['cons'], badges: { q: 'depth 39' }, changed: 'The consumer processes one message.' },
      hood: 'Tune prefetch (RabbitMQ) or visibility timeout (SQS) to the processing time.',
    },
    {
      label: 'Ack and delete',
      caption: {
        beginner: 'When the job is done, the worker says "done" and the message is thrown away.',
        intermediate: 'The consumer acknowledges after successful processing; the broker then removes the message. If no ack arrives, it is redelivered.',
        expert: 'Ack-after-processing gives at-least-once delivery, so duplicates happen and consumers must be idempotent. Repeated failures should go to a dead-letter queue after bounded retries.',
      },
      state: { packets: [{ from: 'cons', to: 'q', tone: 'ok', label: 'ack' }], active: ['q'], badges: { q: 'depth 39' }, changed: 'The message is removed after ack.' },
      hood: 'At-least-once + idempotent consumers; dead-letter queue for poison messages.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A restaurant order rail. Waiters clip order slips on the rail and keep serving tables. Cooks take slips one at a time when free. Neither side waits for the other, and a busy rush just means more slips on the rail.',
      explanation: 'A message queue sits between the part of a system that creates work and the part that does it. The sender adds a message and moves on. Workers pick messages up later, which smooths out rushes and keeps slow jobs from blocking users.',
      keyTerms: [
        { term: 'Producer', meaning: 'The part that sends messages.' },
        { term: 'Consumer', meaning: 'The part that receives and handles messages.' },
        { term: 'Queue', meaning: 'The buffer that holds messages in order.' },
        { term: 'Acknowledgement (ack)', meaning: 'A reply saying the message was handled.' },
        { term: 'Dead-letter queue', meaning: 'A holding place for messages that keep failing.' },
      ],
    },
    intermediate: {
      explanation: 'Queues decouple producers from consumers in time and rate. They enable background jobs, load smoothing and independent scaling, at the cost of eventual results, duplicate handling and operational monitoring.',
      howItWorks: [
        'Producer serializes a message and publishes it to the broker.',
        'The broker stores it, usually on disk for durability.',
        'A consumer receives it; it is hidden from others while in flight.',
        'On success the consumer acks and the message is deleted.',
        'On failure or timeout the message is redelivered, possibly after a delay.',
        'After N failures it is moved to a dead-letter queue for inspection.',
      ],
      tradeoffs: {
        use: [
          'Use queues for slow or non-urgent work such as emails, reports and image processing.',
          'Use them to absorb traffic bursts and protect a database.',
          'Use them to decouple services so one can be down briefly without data loss.',
        ],
        avoid: [
          'Avoid queues when the caller needs the result immediately; use a direct call.',
          'Avoid them for tiny systems where a synchronous call is simpler.',
          'Avoid assuming exactly-once delivery; design for duplicates.',
        ],
      },
      pitfalls: [
        'Non-idempotent consumers causing double side effects on redelivery.',
        'Poison messages blocking progress without a dead-letter queue.',
        'No monitoring of depth and age, so backlog grows silently.',
        'Visibility timeout shorter than processing time, causing duplicate work.',
        'Assuming strict global ordering when multiple consumers compete.',
      ],
    },
    expert: {
      internals: [
        'Delivery guarantees: at-most-once (ack before processing), at-least-once (ack after) and "exactly-once" which in practice means at-least-once plus idempotent or transactional processing.',
        'RabbitMQ uses AMQP with exchanges, bindings, publisher confirms, consumer acks and prefetch (QoS); SQS uses visibility timeouts and standard versus FIFO queues.',
        'Ordering holds per queue with a single consumer; competing consumers and retries reorder messages unless partitioned by key.',
        'The transactional outbox pattern writes the message in the same database transaction as the state change, then a relay publishes it, avoiding dual-write inconsistency.',
        'Backpressure options: bounded queues, producer throttling, load shedding or autoscaling consumers on lag.',
      ],
      failureModes: [
        'Dual write: database commit succeeds but the publish fails (or the reverse), losing or inventing events.',
        'Retry storms where failed messages are immediately redelivered and amplify load.',
        'Broker disk or memory alarms blocking publishers.',
        'Consumer crash after side effect but before ack, causing duplicates.',
      ],
      scalingNotes: [
        'Scale consumers horizontally until the downstream resource (database, API) becomes the limit.',
        'Use exponential backoff with delay queues or retry topics for transient errors.',
        'Partition or shard by key when ordering per entity matters.',
      ],
      realSystems: [
        'RabbitMQ, Amazon SQS, Google Pub/Sub, Azure Service Bus, ActiveMQ; Celery and RQ for Python background jobs.',
        'Redis lists or streams as lightweight queues; Kafka for log-based messaging.',
        'Outbox with Debezium change data capture as a relay.',
      ],
      numbersToKnow: [
        'SQS standard queues offer at-least-once delivery with best-effort ordering; FIFO queues add ordering and deduplication with lower throughput. // VERIFY current limits',
        'SQS default visibility timeout is 30 seconds. // VERIFY',
        'A single RabbitMQ queue is processed by one Erlang process, so very hot queues benefit from sharding. // VERIFY',
      ],
    },
  },
  sim: 'queue-backlog',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Idempotent consumer with Celery',
      code: [
        'from celery import Celery',
        '',
        'app = Celery("shop", broker="amqp://guest@rabbit//")',
        '',
        '@app.task(bind=True, acks_late=True, max_retries=5)',
        'def send_receipt(self, order_id):',
        '    if already_sent(order_id):',
        '        return',
        '    try:',
        '        mail(order_id)',
        '        mark_sent(order_id)',
        '    except TransientError as exc:',
        '        raise self.retry(exc=exc, countdown=2 ** self.request.retries)',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'acks_late acknowledges after the task finishes, so a crash causes redelivery rather than loss.' },
        { line: 7, text: 'Duplicate delivery is expected, so the task checks whether work was already done.' },
        { line: 13, text: 'Retry with exponential backoff for transient errors and a bounded retry count.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why use a message queue?', answer: 'To decouple the sender from slow work, smooth traffic spikes and let workers scale independently. The user request returns quickly while the work happens in the background.', followUps: ['Give an example of work you would queue.'] },
    { level: 'beginner', q: 'What is an acknowledgement?', answer: 'A signal from the consumer that a message was handled. Until it arrives the broker may redeliver the message.', followUps: ['What if the consumer crashes before acking?'] },
    { level: 'intermediate', q: 'Why must consumers be idempotent?', answer: 'Brokers typically guarantee at-least-once delivery, so a message can arrive twice after a timeout or crash. An idempotent consumer produces the same result when it handles a message more than once.', followUps: ['How do you implement idempotency?'] },
    { level: 'intermediate', q: 'What is a dead-letter queue?', answer: 'A queue where messages go after exceeding retry limits or being rejected. It stops poison messages blocking others and lets you inspect and replay them.', followUps: ['How do you monitor it?'] },
    { level: 'expert', q: 'How do you avoid losing events when updating a database and publishing a message?', answer: 'Use the transactional outbox: write the event to an outbox table in the same transaction, then a relay (polling or CDC) publishes it with retries. Consumers dedupe by event id.', followUps: ['What are the downsides?'] },
    { level: 'expert', q: 'The queue backlog is growing. What do you do?', answer: 'Check whether the cause is slow consumers, a downstream bottleneck, retry storms or a producer surge. Scale consumers only if downstream can take it, add backpressure or shedding, fix slow handlers, and alert on oldest message age.', followUps: ['When does adding consumers make it worse?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What does a queue do between producer and consumer?', options: ['Buffers messages', 'Encrypts the database', 'Replaces the API', 'Sorts tables'], answerIndex: 0, why: 'It holds messages so each side works at its own pace.' },
    { level: 'beginner', q: 'When is a message removed from the queue?', options: ['When sent', 'After the consumer acknowledges it', 'After one hour always', 'Never'], answerIndex: 1, why: 'Ack tells the broker processing succeeded.' },
    { level: 'intermediate', q: 'Why do duplicates happen with at-least-once delivery?', options: ['Redelivery after a missing ack', 'Bad indexes', 'DNS errors', 'Compression'], answerIndex: 0, why: 'If processing succeeded but the ack was lost, the broker resends.' },
    { level: 'expert', q: 'What problem does the outbox pattern solve?', options: ['Dual-write inconsistency between database and broker', 'Slow SELECTs', 'TLS handshakes', 'Cache misses'], answerIndex: 0, why: 'State and event are written atomically, then published reliably.' },
  ],
});
