/* Distributed Systems: Distributed Transactions. */
Atlas.topics.push({
  id: 'distributed-transactions',
  category: 'distributed-systems',
  title: 'Distributed Transactions',
  source: {
    description: 'One business action spanning several services or databases.',
    steps: ['Start action', 'Update service A', 'Update service B', 'All succeed or undo'],
  },
  estMinutes: 11,
  prereqs: ['transactions-acid'],
  related: ['saga-pattern', 'two-phase-commit-2pc', 'idempotency', 'microservices'],
  tags: ['atomicity', 'XA', 'saga', '2PC', 'outbox', 'consistency'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'c', label: 'Order flow' }, { id: 'a', label: 'Payment svc' }, { id: 'b', label: 'Stock svc' }] },
  },
  steps: [
    {
      label: 'Start action',
      caption: {
        beginner: 'A customer places an order that needs several teams to act.',
        intermediate: 'One business action touches multiple services, each with its own database, so one local transaction cannot cover it.',
        expert: 'There is no shared transaction log across services. Atomicity must be built with protocols (2PC) or compensation (sagas).',
      },
      state: { messages: [{ from: 'c', to: 'a', label: 'begin order', tone: 'plain' }] },
      hood: 'No single commit point spans separate databases.',
    },
    {
      label: 'Update service A',
      caption: {
        beginner: 'The payment is taken.',
        intermediate: 'Service A commits its local transaction. Its change is now visible and durable.',
        expert: 'If A commits before B is known to succeed, a later failure needs a compensating action, because A cannot roll back.',
      },
      state: { messages: [{ from: 'c', to: 'a', label: 'charge card', tone: 'plain' }, { from: 'a', to: 'c', label: 'charged', tone: 'good', back: true }] },
      hood: 'A local commit is irreversible except by a new compensating write.',
    },
    {
      label: 'Update service B',
      caption: {
        beginner: 'The stock is reserved, but this step fails.',
        intermediate: 'Service B is unavailable or rejects the request, leaving A and B inconsistent.',
        expert: 'A timeout is ambiguous: B may have applied the change. Use idempotency keys so retries are safe.',
      },
      state: { messages: [{ from: 'c', to: 'a', label: 'charge card', tone: 'plain' }, { from: 'a', to: 'c', label: 'charged', tone: 'good', back: true }, { from: 'c', to: 'b', label: 'reserve stock', tone: 'bad' }, { from: 'b', to: 'c', label: 'error/timeout', tone: 'bad', back: true }] },
      hood: 'Timeouts mean "unknown", not "failed".',
    },
    {
      label: 'All succeed or undo',
      caption: {
        beginner: 'Either everything is finished, or the payment is returned.',
        intermediate: 'Either all services agree (2PC) or completed steps are undone with compensations (saga).',
        expert: 'Pick per case: 2PC gives atomicity but blocks and couples availability; sagas give availability with eventual consistency and need semantic undo.',
      },
      state: { messages: [{ from: 'c', to: 'a', label: 'refund (compensate)', tone: 'bad' }, { from: 'a', to: 'c', label: 'refunded', tone: 'good', back: true }] },
      hood: 'Trade-off: atomic and blocking vs available and eventually consistent.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Planning a wedding with a caterer, a hall and a band, each booked separately. If the band cancels after you paid the hall, you must get the hall refunded, because no one person can cancel everything at once.',
      explanation: 'A distributed transaction is one business action that needs several separate systems to change data. Because each system keeps its own records, you need a plan so that either everything happens or the finished parts are undone.',
      keyTerms: [
        { term: 'Atomicity', meaning: 'All parts happen or none do.' },
        { term: 'Compensation', meaning: 'A new action that undoes an earlier one.' },
        { term: 'Two-phase commit', meaning: 'Everyone votes, then everyone commits.' },
        { term: 'Saga', meaning: 'A chain of steps with undo steps.' },
        { term: 'Idempotent', meaning: 'Safe to repeat without double effects.' },
      ],
    },
    intermediate: {
      explanation: 'Options: avoid the problem by keeping related data in one service, use 2PC/XA for strong atomicity inside a trusted environment, or use sagas and the outbox pattern for cross-service workflows with eventual consistency.',
      howItWorks: [
        'Identify the steps and which service owns each.',
        'Make each step a local ACID transaction.',
        'Coordinate by orchestration (central) or choreography (events).',
        'Define a compensation for every step that can be undone.',
        'Use idempotency keys and the outbox pattern for reliable messaging.',
        'Monitor stuck workflows and reconcile.',
      ],
      tradeoffs: {
        use: [
          'Use sagas for long-running business flows across services.',
          'Use 2PC when few resources, low latency and strict atomicity are needed.',
          'Use the outbox pattern to publish events atomically with a DB write.',
        ],
        avoid: [
          'Avoid splitting services so that every operation needs a distributed transaction.',
          'Avoid 2PC across unreliable or third-party systems.',
          'Avoid assuming compensation always restores the exact prior state.',
        ],
      },
      pitfalls: [
        'Dual writes to a database and a broker without an outbox.',
        'Missing idempotency on retried steps.',
        'Compensations that can themselves fail with no retry.',
        'Users seeing intermediate states.',
        'No visibility into half-finished workflows.',
      ],
    },
    expert: {
      internals: [
        'XA protocol: a transaction manager drives prepare then commit across resource managers, persisting a decision log.',
        'The outbox pattern writes the event row in the same local transaction as the business row; a relay (polling or CDC such as Debezium) publishes it at-least-once.',
        'Consumers deduplicate by message id, giving effectively-once processing.',
        'Spanner and CockroachDB provide distributed ACID using consensus (Paxos/Raft) plus 2PC across ranges.',
      ],
      failureModes: [
        'Coordinator crash after prepare leaves participants blocked holding locks.',
        'Partial failures leaving orphaned reservations.',
        'Duplicate message delivery causing double charges.',
        'Compensation after the world changed (for example item already shipped).',
      ],
      scalingNotes: [
        'Distributed locks and 2PC reduce throughput as participants grow.',
        'Prefer designing aggregates so most operations are single-service.',
        'Use timeouts and reservation expiry to release resources.',
      ],
      realSystems: [
        'Temporal, Camunda and AWS Step Functions for orchestrated sagas.',
        'Debezium and Kafka Connect for outbox relays; Atomikos and Narayana for XA.',
        'Google Spanner, CockroachDB, YugabyteDB for distributed SQL.',
      ],
      numbersToKnow: [
        'Each extra synchronous participant adds at least one network round trip.',
        'At-least-once delivery plus idempotent consumers is the usual practical target.',
        '2PC needs 2 phases and about 3N messages for N participants. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Transactional outbox (SQLAlchemy)',
      code: [
        'def place_order(session, data):',
        '    with session.begin():',
        '        order = Order(**data)',
        '        session.add(order)',
        '        session.add(Outbox(topic="order.created", payload=order.to_json(), id=uuid4()))',
        '',
        'def relay(session, producer):',
        '    for row in session.query(Outbox).filter_by(sent=False).limit(100):',
        '        producer.send(row.topic, row.payload, key=str(row.id))',
        '        row.sent = True',
        '    session.commit()',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'The event is stored in the same transaction as the order, so they commit together.' },
        { line: 9, text: 'The relay may send twice after a crash, so consumers must deduplicate by id.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why are distributed transactions hard?', answer: 'Each service has its own database, so no single commit can cover all of them, and networks or services can fail halfway.', followUps: ['What is the usual workaround?'] },
    { level: 'beginner', q: 'What is compensation?', answer: 'A follow-up action that reverses a finished step, such as refunding a payment.', followUps: ['Is it always a perfect undo?'] },
    { level: 'intermediate', q: '2PC vs saga?', answer: '2PC locks resources until all agree, giving atomicity but blocking and coupling availability. Sagas commit locally and compensate on failure, giving availability with eventual consistency.', followUps: ['Which suits microservices?'] },
    { level: 'intermediate', q: 'What problem does the outbox pattern solve?', answer: 'The dual write of a DB change and a message. Writing both in one local transaction and relaying later guarantees neither is lost.', followUps: ['How is the relay built?'] },
    { level: 'expert', q: 'A payment timeout: was it charged? How do you design for it?', answer: 'Treat it as unknown. Use an idempotency key so a retry is safe, query the provider for status, reconcile periodically and make downstream consumers deduplicate.', followUps: ['What if the provider has no idempotency?'] },
    { level: 'expert', q: 'When would you still choose 2PC?', answer: 'Few trusted resources in one environment, short transactions and a need for strict atomicity, accepting blocking if the coordinator fails. Often within a distributed SQL database rather than across services.', followUps: ['What is the blocking problem?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Compensation means...', options: ['Undoing a step with a new action', 'Paying staff', 'Caching data', 'Compressing logs'], answerIndex: 0, why: 'Completed steps are reversed by new actions.' },
    { level: 'beginner', q: 'Why no single rollback across services?', options: ['Separate databases', 'Too few CPUs', 'HTTP forbids it', 'JSON limits'], answerIndex: 0, why: 'Each service commits locally.' },
    { level: 'intermediate', q: 'The outbox pattern fixes...', options: ['Dual writes', 'Slow queries', 'CSS bugs', 'TLS expiry'], answerIndex: 0, why: 'Event and data commit atomically.' },
    { level: 'expert', q: 'A timeout means the operation...', options: ['May or may not have happened', 'Definitely failed', 'Definitely succeeded', 'Was rolled back'], answerIndex: 0, why: 'Outcome is unknown, so use idempotency.' },
  ],
});
