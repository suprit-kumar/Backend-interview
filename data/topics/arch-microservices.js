/* Architecture: microservices */
Atlas.topics.push({
  id: 'microservices',
  category: 'architecture',
  title: 'Microservices',
  source: {
    description: 'Small services, each owning its data and deploy cycle.',
    steps: ['Split by domain', 'Own database each', 'Talk over APIs or events', 'Deploy independently'],
  },
  estMinutes: 14,
  prereqs: [],
  related: ['monolith-vs-microservices', 'service-to-service-communication', 'api-gateway', 'saga-pattern'],
  tags: ['microservices', 'bounded context', 'database per service', 'DDD', 'deployment'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'gw', label: 'Gateway', kind: 'lb', x: 10, y: 50 },
        { id: 'orders', label: 'Orders', kind: 'service', x: 48, y: 20 },
        { id: 'users', label: 'Users', kind: 'service', x: 48, y: 80 },
        { id: 'odb', label: 'Orders DB', kind: 'db', x: 88, y: 20 },
        { id: 'udb', label: 'Users DB', kind: 'db', x: 88, y: 80 },
      ],
      edges: [{ from: 'gw', to: 'orders' }, { from: 'gw', to: 'users' }, { from: 'orders', to: 'odb' }, { from: 'users', to: 'udb' }, { from: 'orders', to: 'users' }],
    },
  },
  steps: [
    {
      label: 'Split by domain',
      caption: {
        beginner: 'The big app is cut into small apps, each about one business job such as orders or users.',
        intermediate: 'Services follow bounded contexts from domain-driven design, so each owns one cohesive capability.',
        expert: 'Wrong boundaries cause chatty calls and coordinated releases (a distributed monolith). Align boundaries with team ownership and data change patterns, not with technical layers.',
      },
      state: { active: ['orders', 'users'], changed: 'Two domain services exist.' },
      hood: 'Conway\'s law: service boundaries tend to mirror team boundaries.',
    },
    {
      label: 'Own database each',
      caption: {
        beginner: 'Each small app keeps its own notebook of data that others cannot scribble in.',
        intermediate: 'Each service owns its schema; others access data only through its API, which allows independent schema changes.',
        expert: 'No cross-service joins or transactions: use API composition, replicated read models and sagas instead. Shared databases quietly re-couple services.',
      },
      state: { active: ['odb', 'udb'], badges: { odb: 'private', udb: 'private' }, changed: 'Data is private per service.' },
      hood: 'Cross-service consistency needs sagas or outbox, not distributed joins.',
    },
    {
      label: 'Talk over APIs or events',
      caption: {
        beginner: 'Apps ask each other for things by sending messages over the network.',
        intermediate: 'Services call each other with REST or gRPC, or publish events. Each network call can be slow or fail.',
        expert: 'Every call needs timeouts, retries with backoff, circuit breakers and idempotency. Latency and failure probability multiply along a call chain.',
      },
      state: { packets: [{ from: 'gw', to: 'orders', tone: 'ok', label: 'GET /orders' }, { from: 'orders', to: 'users', tone: 'ok', label: 'GET /users/7' }], active: ['orders', 'users'], changed: 'Requests hop across services.' },
      hood: 'Availability of a chain = product of each hop\'s availability.',
    },
    {
      label: 'Deploy independently',
      caption: {
        beginner: 'One small app can be updated without touching the others.',
        intermediate: 'Each service has its own pipeline and release cadence, enabling small, frequent, low-risk deploys.',
        expert: 'Requires backward-compatible APIs, contract tests, versioned events, observability and automated rollbacks. Without these, independence is an illusion.',
      },
      state: { failed: ['users'], packets: [{ from: 'gw', to: 'orders', tone: 'ok', label: 'still works' }], active: ['orders'], changed: 'Users redeploys while Orders keeps serving.' },
      hood: 'Consumer-driven contract tests (Pact) catch breaking API changes before deploy.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A food court instead of one big restaurant. Each stall cooks one kind of food with its own kitchen and staff. A stall can change its menu or close for repairs without shutting the whole court, but diners must now walk between stalls.',
      explanation: 'Microservices split one large application into many small ones that each do one job and keep their own data. Teams can work and release separately, but the parts must talk over a network, which adds delay, failures and complexity.',
      keyTerms: [
        { term: 'Service', meaning: 'A small separately running application with one responsibility.' },
        { term: 'Bounded context', meaning: 'The business area a service owns.' },
        { term: 'Database per service', meaning: 'Each service keeps its own private data store.' },
        { term: 'Independent deployment', meaning: 'Releasing one service without releasing the rest.' },
      ],
    },
    intermediate: {
      explanation: 'Microservices trade in-process simplicity for team autonomy and independent scaling. They need strong automation, observability and failure handling, and they make data consistency harder.',
      howItWorks: [
        'Identify bounded contexts and assign each to a team.',
        'Give each service a private datastore and a public API or event contract.',
        'Services communicate via sync calls or async events.',
        'A gateway exposes a single entry point to clients.',
        'Each service builds, tests, deploys and scales on its own.',
        'Tracing, metrics and centralized logs make the system debuggable.',
      ],
      tradeoffs: {
        use: [
          'Use when many teams need to ship independently.',
          'Use when parts have very different scaling or technology needs.',
          'Use when fault isolation between domains is valuable.',
        ],
        avoid: [
          'Avoid for small teams or early products where a modular monolith is faster.',
          'Avoid when you lack CI/CD, monitoring and on-call maturity.',
          'Avoid splitting along technical layers or sharing one database.',
        ],
      },
      pitfalls: [
        'Distributed monolith: services must deploy together.',
        'Chatty services making many calls per request.',
        'Shared database coupling services.',
        'No tracing, so failures cannot be located.',
        'Breaking API changes without versioning.',
      ],
    },
    expert: {
      internals: [
        'Data ownership forces eventual consistency across services; sagas and the transactional outbox replace distributed ACID transactions.',
        'Service discovery and load balancing happen via DNS, a registry, or a sidecar mesh such as Istio or Linkerd.',
        'Resilience patterns (timeouts, retries, bulkheads, circuit breakers) are mandatory at each hop.',
        'API compatibility rules: add fields, never repurpose or remove them without a deprecation window.',
      ],
      failureModes: [
        'Cascading failures when one slow service exhausts callers\' threads or pools.',
        'Retry storms amplifying a partial outage.',
        'Version skew between producers and consumers during rollouts.',
        'Orphaned data and inconsistent state after partial saga failure.',
      ],
      scalingNotes: [
        'Scale hot services independently; cache and denormalize read models to avoid fan-out.',
        'Limit synchronous call depth; prefer events for non-critical paths.',
        'Platform teams provide paved roads (templates, pipelines, observability) to keep the operational cost bounded.',
      ],
      realSystems: [
        'Netflix, Amazon and Uber are well-known microservice adopters.',
        'Kubernetes for orchestration, Envoy/Istio for mesh, OpenTelemetry for tracing.',
        'Python: FastAPI services, gRPC, Celery or Kafka for events.',
      ],
      numbersToKnow: [
        'Ten services at 99.9% availability each in a synchronous chain give about 99.0% overall.',
        'An in-process call takes nanoseconds; a same-datacenter network call is typically around a millisecond or more. // VERIFY',
        'Common guidance: a team of roughly 5-9 people owns a few services. // VERIFY heuristic',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Orders service calling Users with timeout',
      code: [
        'import httpx',
        'from fastapi import FastAPI, HTTPException',
        '',
        'app = FastAPI()',
        '',
        '@app.get("/orders/{oid}")',
        'async def get_order(oid: int):',
        '    order = await repo.get(oid)',
        '    try:',
        '        async with httpx.AsyncClient(timeout=1.0) as c:',
        '            user = (await c.get(f"http://users/users/{order.user_id}")).json()',
        '    except httpx.HTTPError:',
        '        user = {"id": order.user_id}',
        '    return {**order.dict(), "user": user}',
      ].join('\n'),
      annotations: [
        { line: 8, text: 'The Orders service reads only its own database.' },
        { line: 10, text: 'A short timeout stops a slow Users service from hanging this request.' },
        { line: 13, text: 'Graceful degradation: return partial data instead of failing completely.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a microservice?', answer: 'A small independently deployable service that owns one business capability and its own data, communicating with others over a network.', followUps: ['How small is small?'] },
    { level: 'beginner', q: 'Name one benefit and one cost of microservices.', answer: 'Benefit: teams deploy and scale parts independently. Cost: network calls add latency, failures and operational complexity.', followUps: ['Which cost surprises teams most?'] },
    { level: 'intermediate', q: 'Why should each service own its database?', answer: 'A shared database couples services through the schema so changes need coordination. Private data lets each service evolve and scale on its own, accessed only via APIs.', followUps: ['How do you do reporting across services?'] },
    { level: 'intermediate', q: 'What is a distributed monolith?', answer: 'Services that must be deployed together or fail together because of tight coupling, giving the downsides of both styles.', followUps: ['How do you avoid it?'] },
    { level: 'expert', q: 'How do you keep data consistent across services?', answer: 'Use sagas with compensating actions and the transactional outbox for reliable events, design for eventual consistency, and make handlers idempotent. Avoid distributed transactions.', followUps: ['When might 2PC still fit?'] },
    { level: 'expert', q: 'A request spans six services and p99 is high. What do you do?', answer: 'Use distributed traces to find the critical path, cut call depth, parallelize independent calls, add timeouts and caching, and move non-essential work to async events.', followUps: ['How do hedged requests help?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Microservices usually have...', options: ['One shared database', 'A database per service', 'No network calls', 'One deploy for all'], answerIndex: 1, why: 'Private data enables independent evolution.' },
    { level: 'beginner', q: 'Main cost of microservices?', options: ['Network and operational complexity', 'Slower typing', 'No testing', 'No logging'], answerIndex: 0, why: 'Calls become remote and the system is distributed.' },
    { level: 'intermediate', q: 'What replaces cross-service ACID transactions?', options: ['Sagas', 'Bigger servers', 'Cookies', 'Shared tables'], answerIndex: 0, why: 'Sagas use local transactions plus compensation.' },
    { level: 'expert', q: 'Which signals a distributed monolith?', options: ['Services must release together', 'Teams ship independently', 'Private databases', 'Versioned APIs'], answerIndex: 0, why: 'Coupled releases defeat the main benefit.' },
  ],
});
