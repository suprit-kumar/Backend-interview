/* Architecture: service-to-service-communication */
Atlas.topics.push({
  id: 'service-to-service-communication',
  category: 'architecture',
  title: 'Service-to-Service Communication',
  source: {
    description: 'Sync calls are simple; async events are loosely coupled.',
    steps: ['Service A', 'REST or gRPC (sync) or broker (async)', 'Service B', 'Reply or event'],
  },
  estMinutes: 13,
  prereqs: ['microservices'],
  related: ['microservices', 'message-queues', 'api-gateway', 'circuit-breaker-pattern'],
  tags: ['REST', 'gRPC', 'sync', 'async', 'events', 'timeouts', 'service mesh'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'a', label: 'Service A' }, { id: 'x', label: 'REST/gRPC or Broker' }, { id: 'b', label: 'Service B' }] },
  },
  steps: [
    {
      label: 'Service A',
      caption: {
        beginner: 'Service A needs something from Service B.',
        intermediate: 'A decides whether it needs an answer now (sync call) or can continue and be told later (async event).',
        expert: 'Sync fits queries and steps needing an immediate result; async fits notifications and workflows. The choice sets coupling, latency and failure behavior.',
      },
      state: { messages: [{ from: 'a', to: 'a', label: 'need data', tone: 'plain' }] },
      hood: 'Ask: does the caller need the answer to continue?',
    },
    {
      label: 'REST or gRPC (sync) or broker (async)',
      caption: {
        beginner: 'A can phone B directly, or leave a message with a messenger.',
        intermediate: 'Sync uses REST (JSON over HTTP) or gRPC (Protobuf over HTTP/2). Async publishes to a broker such as Kafka or RabbitMQ.',
        expert: 'gRPC gives typed contracts, streaming and compact encoding; REST is universal and cacheable. Both need deadlines, retries with backoff and circuit breakers. Brokers need idempotent consumers.',
      },
      state: { messages: [{ from: 'a', to: 'x', label: 'GET /b (sync)', tone: 'ok' }] },
      hood: 'Propagate deadlines across hops so downstream stops work the caller abandoned.',
    },
    {
      label: 'Service B',
      caption: {
        beginner: 'B does the work.',
        intermediate: 'B handles the request; if it is slow or down, a sync caller waits and may fail, while an async sender is unaffected.',
        expert: 'Sync coupling means A\'s availability depends on B\'s. Protect B with rate limits and bulkheads, and protect A with timeouts and fallbacks.',
      },
      state: { messages: [{ from: 'x', to: 'b', label: 'request', tone: 'ok' }] },
      hood: 'Bulkheads isolate resource pools per dependency.',
    },
    {
      label: 'Reply or event',
      caption: {
        beginner: 'B answers directly, or announces later that the work is done.',
        intermediate: 'Sync returns a response on the same connection; async emits a result event that A or others consume later.',
        expert: 'Async replies use correlation ids and reply topics or webhooks; sync responses need status codes that distinguish retryable from permanent errors.',
      },
      state: { messages: [{ from: 'b', to: 'x', label: '200 OK / event', tone: 'ok', back: true }, { from: 'x', to: 'a', label: 'result', tone: 'ok', back: true }] },
      hood: 'Correlation ids tie requests, events and traces together.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Phone call versus letter. A phone call gets an instant answer but both people must be free at once. A letter lets the sender carry on and the receiver reply whenever ready, but the answer is not immediate.',
      explanation: 'Services either call each other and wait (synchronous) or send messages and carry on (asynchronous). Waiting is simple but ties services together; messages keep them independent but make flows harder to follow.',
      keyTerms: [
        { term: 'Synchronous', meaning: 'The caller waits for the reply.' },
        { term: 'Asynchronous', meaning: 'The caller sends and continues without waiting.' },
        { term: 'REST', meaning: 'HTTP-based API style using resources and verbs.' },
        { term: 'gRPC', meaning: 'A fast typed RPC framework over HTTP/2.' },
        { term: 'Broker', meaning: 'A middleman that holds and delivers messages.' },
      ],
    },
    intermediate: {
      explanation: 'Choose by need: sync for immediate answers, async for decoupled workflows. Either way design for failure with timeouts, retries and idempotency.',
      howItWorks: [
        'A sync client sends a request and blocks (or awaits) for the reply.',
        'The server returns a status and body; errors are classified retryable or not.',
        'An async producer publishes an event to a broker and continues.',
        'Consumers process events independently and may emit further events.',
        'Contracts (OpenAPI, Protobuf, event schemas) define the interface.',
        'Timeouts, retries, circuit breakers and idempotency keys control failure behavior.',
      ],
      tradeoffs: {
        use: [
          'Use sync REST or gRPC for queries and when the answer is needed right now.',
          'Use async events for notifications, fan-out and long workflows.',
          'Use gRPC for internal high-volume typed calls.',
        ],
        avoid: [
          'Avoid long sync call chains; failures and latency multiply.',
          'Avoid async when the user needs an immediate definitive result.',
          'Avoid sharing databases as an integration method.',
        ],
      },
      pitfalls: [
        'No timeouts, so one slow service hangs callers.',
        'Retrying non-idempotent calls and duplicating effects.',
        'Breaking contracts without versioning.',
        'Treating async as free of ordering and duplicate issues.',
        'Hard-coded service addresses instead of discovery.',
      ],
    },
    expert: {
      internals: [
        'HTTP/2 multiplexes streams over one connection; gRPC adds deadlines, cancellation and streaming on top, while client-side load balancing requires care with long-lived connections.',
        'A service mesh sidecar (Envoy) adds mTLS, retries, timeouts and telemetry without app code changes, at the cost of latency and complexity.',
        'Retries should use exponential backoff with jitter and a retry budget to avoid storms.',
        'Async delivery is at-least-once, so consumers dedupe by event id.',
      ],
      failureModes: [
        'Cascading failure via blocked threads waiting on a slow dependency.',
        'Retry amplification across layers (each layer retries, multiplying load).',
        'Schema drift between publisher and consumer.',
        'Thundering herd after an outage ends.',
      ],
      scalingNotes: [
        'Cap concurrency per dependency and use deadlines propagated end to end.',
        'Prefer async for fan-out and non-critical side effects.',
        'Use contract tests and schema registries to evolve safely.',
      ],
      realSystems: [
        'gRPC and Protobuf, REST with OpenAPI, GraphQL for client-facing aggregation.',
        'Kafka, RabbitMQ, SQS/SNS for events; Envoy/Istio/Linkerd for meshes.',
        'Python: httpx, grpcio, FastAPI, confluent-kafka.',
      ],
      numbersToKnow: [
        'Protobuf payloads are typically smaller than equivalent JSON. // VERIFY depends on data',
        'A typical default client timeout of "none" is a bug; pick values from the dependency\'s p99.',
        'Retry budgets are often capped around 10% extra load. // VERIFY heuristic',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Sync call with timeout and retry; async event publish',
      code: [
        'import httpx, json',
        'from tenacity import retry, stop_after_attempt, wait_exponential_jitter',
        '',
        '@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=0.2))',
        'def get_stock(sku):',
        '    r = httpx.get(f"http://stock/items/{sku}", timeout=1.0)',
        '    r.raise_for_status()',
        '    return r.json()',
        '',
        'def announce(producer, order):',
        '    producer.produce("orders", key=str(order.id), value=json.dumps({"type": "OrderPlaced", "id": order.id}))',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'Bounded retries with jittered backoff avoid hammering a struggling service.' },
        { line: 6, text: 'Always set a timeout; the default can wait forever.' },
        { line: 11, text: 'Async: publish and continue; consumers react independently.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Sync versus async communication?', answer: 'Sync waits for the reply, which is simple but couples availability. Async sends a message and continues, which decouples services but is harder to trace.', followUps: ['Give an example of each.'] },
    { level: 'beginner', q: 'What is gRPC?', answer: 'A framework for calling remote functions using Protobuf and HTTP/2, giving typed contracts and efficient encoding.', followUps: ['When would you prefer REST?'] },
    { level: 'intermediate', q: 'Why are long synchronous call chains risky?', answer: 'Latency adds up and availability multiplies down, and one slow service can exhaust callers\' resources. Shorten chains, parallelize, cache or use events.', followUps: ['How do deadlines help?'] },
    { level: 'intermediate', q: 'How do you make a retried call safe?', answer: 'Make it idempotent, for example with an Idempotency-Key header, and retry only on transient errors with backoff and jitter.', followUps: ['Which HTTP methods are idempotent by definition?'] },
    { level: 'expert', q: 'Layered retries caused an outage amplification. Explain and fix.', answer: 'If each of three layers retries three times, one failure becomes up to 27 calls. Retry at one layer, use retry budgets, backoff with jitter, circuit breakers and propagate deadlines.', followUps: ['How would you detect it?'] },
    { level: 'expert', q: 'When do you add a service mesh?', answer: 'When many services need uniform mTLS, retries, traffic shaping and telemetry and the platform team can run it. For few services, libraries or a gateway are simpler.', followUps: ['What are its costs?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Which style lets the caller continue without waiting?', options: ['Asynchronous', 'Synchronous', 'Blocking', 'Serial'], answerIndex: 0, why: 'Async sends a message and moves on.' },
    { level: 'beginner', q: 'gRPC commonly uses...', options: ['Protobuf over HTTP/2', 'XML over FTP', 'CSV', 'SMTP'], answerIndex: 0, why: 'It is a typed binary RPC protocol.' },
    { level: 'intermediate', q: 'Safest way to retry a POST?', options: ['Use an idempotency key', 'Retry forever instantly', 'Never set timeouts', 'Retry on 400'], answerIndex: 0, why: 'The server can detect duplicates.' },
    { level: 'expert', q: '3 layers each retry 3 times. Worst-case calls?', options: ['27', '9', '6', '3'], answerIndex: 0, why: 'Retries multiply across layers: 3 x 3 x 3.' },
  ],
});
