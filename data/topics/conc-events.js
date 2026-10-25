/* Concurrency & Messaging: Event-Driven Architecture. */
Atlas.topics.push({
  id: 'event-driven-architecture',
  category: 'concurrency-messaging',
  title: 'Event-Driven Architecture',
  source: {
    description: 'Services react to facts that happened instead of being called.',
    steps: ['Order placed event', 'Broker', 'Billing and stock react', 'Emit new events'],
  },
  estMinutes: 14,
  prereqs: ['message-queues'],
  related: ['kafka-rabbitmq', 'saga-pattern', 'microservices', 'idempotency'],
  tags: ['events', 'pub/sub', 'choreography', 'event sourcing', 'CQRS', 'outbox', 'eventual consistency'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'orders', label: 'Orders', kind: 'service', x: 10, y: 50 },
        { id: 'broker', label: 'Event broker', kind: 'queue', x: 42, y: 50 },
        { id: 'billing', label: 'Billing', kind: 'service', x: 80, y: 22 },
        { id: 'stock', label: 'Stock', kind: 'service', x: 80, y: 78 },
      ],
      edges: [{ from: 'orders', to: 'broker' }, { from: 'broker', to: 'billing' }, { from: 'broker', to: 'stock' }],
    },
  },
  steps: [
    {
      label: 'Order placed event',
      caption: {
        beginner: 'The order service announces "an order was placed" and does not care who listens.',
        intermediate: 'The service publishes an immutable event describing a fact in the past tense, such as OrderPlaced, instead of calling other services.',
        expert: 'Publish the event atomically with the state change using the transactional outbox. Version the event schema and include an id, timestamp and entity key so consumers can deduplicate and order.',
      },
      state: { packets: [{ from: 'orders', to: 'broker', tone: 'ok', label: 'OrderPlaced' }], active: ['orders'], changed: 'An event is published.' },
      hood: 'Transactional outbox: write state and event in one transaction, relay publishes.',
    },
    {
      label: 'Broker',
      caption: {
        beginner: 'A messenger holds the announcement and passes it to everyone interested.',
        intermediate: 'The broker stores the event and fans it out to each subscriber, so the producer stays unaware of consumers.',
        expert: 'Choose delivery semantics per consumer: durable subscriptions, consumer groups and retention. A schema registry (Avro, Protobuf, JSON Schema) enforces compatible evolution.',
      },
      state: { active: ['broker'], badges: { broker: 'fan-out' }, changed: 'The broker fans the event out.' },
      hood: 'Schema registry enforces backward or forward compatible event evolution.',
    },
    {
      label: 'Billing and stock react',
      caption: {
        beginner: 'Billing charges the customer and Stock reserves items, each on its own, at the same time.',
        intermediate: 'Each subscriber handles the event independently and in parallel. New subscribers can be added without changing the publisher.',
        expert: 'Consumers must be idempotent because delivery is at-least-once. Processing is eventually consistent, so the UI and APIs must tolerate a window where services disagree.',
      },
      state: { packets: [{ from: 'broker', to: 'billing', tone: 'ok', label: 'OrderPlaced' }, { from: 'broker', to: 'stock', tone: 'ok', label: 'OrderPlaced' }], active: ['billing', 'stock'], changed: 'Two services react in parallel.' },
      hood: 'Idempotent handlers + dedupe by event id make redelivery safe.',
    },
    {
      label: 'Emit new events',
      caption: {
        beginner: 'When they finish, they announce their own news, like "payment done", and the chain continues.',
        intermediate: 'Reactions publish further events (PaymentCaptured, StockReserved), forming a choreography where no central controller runs the flow.',
        expert: 'Choreography is loosely coupled but the overall flow is hard to see; use correlation ids, distributed tracing and, for complex flows or compensation, an orchestrated saga with explicit state.',
      },
      state: { packets: [{ from: 'billing', to: 'broker', tone: 'ok', label: 'PaymentCaptured' }, { from: 'stock', to: 'broker', tone: 'ok', label: 'StockReserved' }], active: ['broker'], changed: 'Follow-up events continue the flow.' },
      hood: 'Correlation ids and tracing keep a choreographed flow debuggable.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A town crier or a notice board. When something happens, the crier announces it and anyone interested reacts: the baker bakes more bread, the guard locks the gate. The crier never has to visit each person.',
      explanation: 'In event-driven systems, a service announces what happened as an event. Other services subscribe and react on their own. This makes it easy to add new reactions and keeps services loosely connected, but flows become harder to follow.',
      keyTerms: [
        { term: 'Event', meaning: 'A record that something already happened.' },
        { term: 'Publisher', meaning: 'The service that announces events.' },
        { term: 'Subscriber', meaning: 'A service that reacts to events.' },
        { term: 'Broker', meaning: 'The middleman that delivers events.' },
        { term: 'Eventual consistency', meaning: 'Data across services agrees after a short delay.' },
      ],
    },
    intermediate: {
      explanation: 'Event-driven architecture replaces direct calls with published events. It lowers coupling and enables independent scaling and extension, at the price of eventual consistency, duplicate handling, harder debugging and schema governance.',
      howItWorks: [
        'A service completes a state change and publishes an event.',
        'The broker delivers it to all interested subscribers.',
        'Each subscriber processes it independently, often updating its own data.',
        'Subscribers may publish further events.',
        'Failures are retried and, if persistent, dead-lettered.',
        'Event schemas are versioned so producers and consumers evolve safely.',
      ],
      tradeoffs: {
        use: [
          'Use events when many services need to react to the same fact.',
          'Use them to add features (analytics, notifications) without changing the publisher.',
          'Use them to absorb load and tolerate temporary downstream outages.',
        ],
        avoid: [
          'Avoid events when the caller needs an immediate answer or strong consistency; use a direct call.',
          'Avoid them in small systems where the broker adds more cost than value.',
          'Avoid treating events as commands in disguise, which hides tight coupling.',
        ],
      },
      pitfalls: [
        'Dual write between the database and the broker losing events.',
        'Non-idempotent handlers causing duplicate side effects.',
        'Breaking event schemas and crashing consumers.',
        'Invisible flows nobody can trace end to end.',
        'Event ordering assumptions that do not hold across partitions.',
      ],
    },
    expert: {
      internals: [
        'Event notification carries minimal data; event-carried state transfer includes the data consumers need, trading size and coupling for fewer callbacks.',
        'Event sourcing stores state as an append-only sequence of events and derives current state by replay, often with snapshots; CQRS separates the write model from read models built from events.',
        'The outbox plus CDC (for example Debezium) gives reliable publication without two-phase commit.',
        'Ordering is only guaranteed within a partition or queue, so key events by aggregate id when per-entity order matters.',
        'Consumers track processed event ids (inbox pattern) to deduplicate and make side effects idempotent.',
      ],
      failureModes: [
        'Poison events blocking a partition until moved aside.',
        'Consumer lag causing stale read models and confusing users.',
        'Schema incompatibility after an uncoordinated change.',
        'Cyclic event chains that amplify traffic or loop forever.',
      ],
      scalingNotes: [
        'Partition by aggregate key and scale consumers to the partition count.',
        'Replay from retained logs to rebuild read models or onboard a new service.',
        'Use orchestration (saga) when a business process needs compensation and visible state.',
      ],
      realSystems: [
        'Kafka, RabbitMQ, AWS SNS+SQS and EventBridge, Google Pub/Sub, NATS.',
        'EventStoreDB and Axon for event sourcing; Debezium for CDC outbox relays.',
        'Python: FastStream, Celery, confluent-kafka, boto3 for SNS/SQS.',
      ],
      numbersToKnow: [
        'End-to-end event latency is typically milliseconds to seconds depending on broker and consumer lag.',
        'Replaying a retained topic is bounded by retention (Kafka default 7 days). // VERIFY',
        'A transactional outbox adds one extra table write per event, usually negligible compared with the broker round trip.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Outbox write and an idempotent handler',
      code: [
        'def place_order(db, cart):',
        '    with db.begin():',
        '        order = db.add_order(cart)',
        '        db.add_outbox(topic="orders", key=order.id,',
        '                      payload={"type": "OrderPlaced", "id": order.id})',
        '',
        'def on_order_placed(db, event):',
        '    if db.seen(event["event_id"]):',
        '        return',
        '    reserve_stock(db, event["id"])',
        '    db.mark_seen(event["event_id"])',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'One transaction writes both the order and the outbox row, so they succeed or fail together.' },
        { line: 4, text: 'A separate relay reads the outbox and publishes to the broker, with retries.' },
        { line: 8, text: 'The handler checks a processed-events table so redelivery does not reserve stock twice.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is an event?', answer: 'A record of something that already happened, like OrderPlaced. It is a fact, not an instruction.', followUps: ['How is it different from a command?'] },
    { level: 'beginner', q: 'What is the benefit of event-driven design?', answer: 'Services are loosely coupled: the publisher does not know its subscribers, so new reactions can be added without changing it.', followUps: ['What is the downside?'] },
    { level: 'intermediate', q: 'Choreography versus orchestration?', answer: 'Choreography lets services react to each other\'s events with no central controller, which is loosely coupled but hard to follow. Orchestration uses a coordinator that directs steps and holds state, which is clearer for complex flows and compensation.', followUps: ['When would you choose each?'] },
    { level: 'intermediate', q: 'How do you handle duplicate events?', answer: 'Make handlers idempotent: record processed event ids or use naturally idempotent operations like upserts, so redelivery has no extra effect.', followUps: ['Where do you store the ids?'] },
    { level: 'expert', q: 'How do you publish events reliably with a database change?', answer: 'Use the transactional outbox: persist the event with the state in one transaction and relay it asynchronously (polling or CDC). This avoids the dual-write problem without distributed transactions, at the cost of at-least-once delivery.', followUps: ['Why not just publish after commit?'] },
    { level: 'expert', q: 'When is event sourcing a bad idea?', answer: 'When the domain is simple CRUD, the team lacks experience, or schema evolution, replay time and read-model complexity outweigh the audit and temporal benefits. It also makes ad hoc queries and deletion (privacy) harder.', followUps: ['How do snapshots help?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'An event describes...', options: ['A request for the future', 'Something that already happened', 'A database index', 'A password'], answerIndex: 1, why: 'Events are immutable facts about the past.' },
    { level: 'beginner', q: 'Who must know the subscribers in a pub/sub design?', options: ['The publisher', 'Nobody in the publisher; the broker routes', 'The database', 'The browser'], answerIndex: 1, why: 'The publisher stays decoupled from subscribers.' },
    { level: 'intermediate', q: 'Which pattern avoids losing events when saving state and publishing?', options: ['Transactional outbox', 'Longer timeouts', 'Bigger queues', 'Compression'], answerIndex: 0, why: 'State and event are stored atomically, then relayed.' },
    { level: 'expert', q: 'What is the main cost of event-driven systems?', options: ['Eventual consistency and harder debugging', 'Slower disks', 'No scalability', 'No retries'], answerIndex: 0, why: 'Data converges later and flows span many services, so tracing and idempotency are essential.' },
  ],
});
