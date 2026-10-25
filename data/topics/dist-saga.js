/* Distributed Systems: Saga Pattern. */
Atlas.topics.push({
  id: 'saga-pattern',
  category: 'distributed-systems',
  title: 'Saga Pattern',
  source: {
    description: 'A chain of local transactions with compensating undo steps.',
    steps: ['Reserve stock', 'Charge card', 'Fails: refund', 'Release stock'],
  },
  estMinutes: 11,
  prereqs: ['distributed-transactions'],
  related: ['distributed-transactions', 'two-phase-commit-2pc', 'idempotency', 'event-driven-architecture'],
  tags: ['compensation', 'orchestration', 'choreography', 'workflow', 'eventual consistency'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 'st', label: 'Stock svc' }, { id: 'pay', label: 'Payment svc' }, { id: 'or', label: 'Orchestrator' }],
      total: 10, unit: 'step',
      windows: [{ start: 5, end: 9, label: 'compensation' }],
      blocks: [
        { lane: 'or', start: 0, end: 10, label: 'saga running', kind: 'run' },
        { lane: 'st', start: 1, end: 3, label: 'reserve', kind: 'run' },
        { lane: 'pay', start: 3, end: 5, label: 'charge fails', kind: 'race' },
        { lane: 'pay', start: 5, end: 7, label: 'refund', kind: 'wait' },
        { lane: 'st', start: 7, end: 9, label: 'release', kind: 'wait' },
      ],
    },
  },
  steps: [
    {
      label: 'Reserve stock',
      caption: {
        beginner: 'First, set the item aside for the customer.',
        intermediate: 'Step 1 is a local transaction in the stock service that commits right away.',
        expert: 'The reservation should be time-limited and idempotent, so a crashed saga does not hold stock forever.',
      },
      state: { now: 2 },
      hood: 'Use reservation expiry as a safety net.',
    },
    {
      label: 'Charge card',
      caption: {
        beginner: 'Next, take the payment.',
        intermediate: 'Step 2 runs in the payment service as its own local transaction.',
        expert: 'Send an idempotency key to the payment provider so retries never double charge.',
      },
      state: { now: 4 },
      hood: 'Idempotency key per saga step.',
    },
    {
      label: 'Fails: refund',
      caption: {
        beginner: 'If the payment goes wrong, money already taken must be given back.',
        intermediate: 'On failure, the saga runs compensations in reverse order for completed steps.',
        expert: 'Compensations must be idempotent, retryable and commutative with late-arriving messages. Some actions (sent email) cannot be undone, only countered.',
      },
      state: { now: 6 },
      hood: 'Compensate in reverse order; retry until success.',
    },
    {
      label: 'Release stock',
      caption: {
        beginner: 'Finally, the reserved item goes back on the shelf.',
        intermediate: 'The stock reservation is released, ending in a consistent state without a global lock.',
        expert: 'The system was inconsistent in between (no isolation). Use semantic locks, versioning or commutative updates to limit anomalies.',
      },
      state: { now: 9 },
      hood: 'Sagas lack isolation (the I in ACID).',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Booking a holiday package: flight, hotel, car. If the hotel booking fails, you cancel the flight you already bought, which gives back some or all of your money. You undo with new actions rather than rewinding time.',
      explanation: 'A saga splits a big action into small steps. Each step completes on its own. If a later step fails, earlier steps are cancelled by running opposite actions.',
      keyTerms: [
        { term: 'Saga', meaning: 'A sequence of local steps.' },
        { term: 'Compensation', meaning: 'The undo action for a step.' },
        { term: 'Orchestrator', meaning: 'A central controller of the steps.' },
        { term: 'Choreography', meaning: 'Services react to each other\'s events.' },
        { term: 'Eventual consistency', meaning: 'Consistent after the flow finishes.' },
      ],
    },
    intermediate: {
      explanation: 'A saga replaces one distributed ACID transaction with a series of local ones plus compensations. Orchestration gives clear control and visibility; choreography reduces central coupling but is harder to follow.',
      howItWorks: [
        'Define ordered steps and a compensation for each.',
        'Run step 1 as a local transaction and emit an event or reply.',
        'Run the next step, and so on.',
        'On failure, execute compensations for completed steps in reverse.',
        'Persist saga state so it survives crashes.',
        'Retry failed steps; alert on stuck sagas.',
      ],
      tradeoffs: {
        use: [
          'Use for long-running flows across services such as orders and bookings.',
          'Use orchestration when flows are complex and need visibility.',
          'Use choreography for simple flows with few services.',
        ],
        avoid: [
          'Avoid when you need strict isolation and instant atomicity.',
          'Avoid when steps cannot be compensated sensibly.',
          'Avoid choreography for many-step flows; it becomes untraceable.',
        ],
      },
      pitfalls: [
        'Non-idempotent steps or compensations.',
        'Missing persisted state, so crashes lose progress.',
        'Compensation that depends on data which changed since.',
        'Users reading intermediate states.',
        'No timeout or dead-letter handling for stuck sagas.',
      ],
    },
    expert: {
      internals: [
        'Saga state is stored durably (event log or workflow history) and each transition is made atomic with the message send via the outbox.',
        'Temporal and Step Functions replay deterministic workflow code from history to resume after crashes.',
        'Countermeasures to missing isolation: semantic lock flags, commutative updates, pessimistic view ordering, re-reading values.',
        'Pivot transaction: the step after which the saga must complete forward, because later steps are retryable and cannot be compensated.',
      ],
      failureModes: [
        'Compensation failing repeatedly, needing manual intervention.',
        'Out-of-order or duplicate events in choreography.',
        'Lost update anomalies between concurrent sagas.',
        'Poison messages stalling the flow.',
      ],
      scalingNotes: [
        'Orchestrators must be horizontally scalable; shard by saga id.',
        'Keep steps short and idempotent, and emit metrics per saga state.',
        'Expire reservations to bound resource holding.',
      ],
      realSystems: [
        'Temporal, Camunda, Netflix Conductor, AWS Step Functions, Azure Durable Functions.',
        'Axon Framework and MassTransit sagas; Kafka with the outbox pattern.',
        'Python: Celery chains with compensation tasks, or Temporal Python SDK.',
      ],
      numbersToKnow: [
        'Each step adds a network hop and a persisted state write.',
        'Typical saga durations range from milliseconds to days or longer.',
        'At-least-once delivery means every handler must tolerate duplicates.',
      ],
    },
  },
  sim: 'saga',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Orchestrated saga with compensations',
      code: [
        'async def place_order(order):',
        '    done = []',
        '    steps = [(reserve_stock, release_stock), (charge_card, refund_card), (create_shipment, cancel_shipment)]',
        '    try:',
        '        for action, undo in steps:',
        '            await action(order, key=f"{order.id}:{action.__name__}")',
        '            done.append(undo)',
        '    except Exception:',
        '        for undo in reversed(done):',
        '            await retry(undo, order)',
        '        raise',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Each step is paired with its compensation.' },
        { line: 6, text: 'An idempotency key makes retries safe.' },
        { line: 9, text: 'Undo completed steps in reverse order, retrying until success.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a saga?', answer: 'A way to do a multi-service action as a series of local steps, undoing earlier steps with compensating actions if a later one fails.', followUps: ['What is a compensating action?'] },
    { level: 'beginner', q: 'Why not one big database transaction?', answer: 'Services own separate databases, so a single transaction cannot span them without heavy protocols like 2PC.', followUps: ['What does 2PC cost?'] },
    { level: 'intermediate', q: 'Orchestration vs choreography?', answer: 'Orchestration uses a central coordinator that tells services what to do, giving visibility. Choreography has services react to events with no central brain, which is decoupled but harder to trace.', followUps: ['Which for 8 steps?'] },
    { level: 'intermediate', q: 'What if a compensation fails?', answer: 'Retry with backoff since compensations must be idempotent, then alert and route to manual handling if it keeps failing.', followUps: ['How do you detect stuck sagas?'] },
    { level: 'expert', q: 'Sagas lack isolation. What anomalies result and how do you mitigate?', answer: 'Dirty reads of uncommitted saga effects and lost updates between concurrent sagas. Use semantic locks (pending states), commutative updates, versioning and re-reads, and design states so intermediate values are safe to show.', followUps: ['Give a pending-state example.'] },
    { level: 'expert', q: 'What is a pivot transaction?', answer: 'The step after which the saga can no longer be compensated and must roll forward. Steps before it are compensatable; steps after are retryable until they succeed.', followUps: ['Where is charging a card?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'On failure a saga...', options: ['Runs compensations', 'Drops the database', 'Ignores it', 'Restarts the OS'], answerIndex: 0, why: 'Earlier steps are undone by new actions.' },
    { level: 'beginner', q: 'Each saga step is...', options: ['A local transaction', 'A global lock', 'A DNS record', 'A cache key'], answerIndex: 0, why: 'It commits within one service.' },
    { level: 'intermediate', q: 'A central controller is called...', options: ['Orchestrator', 'Choreographer', 'Replica', 'Proxy'], answerIndex: 0, why: 'It directs the steps.' },
    { level: 'expert', q: 'Sagas lack which ACID property?', options: ['Isolation', 'Durability of steps', 'Local atomicity', 'Naming'], answerIndex: 0, why: 'Intermediate states are visible.' },
  ],
});
