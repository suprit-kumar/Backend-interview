/* Observability: Distributed Tracing. */
Atlas.topics.push({
  id: 'distributed-tracing',
  category: 'observability',
  title: 'Distributed Tracing',
  source: {
    description: 'Follow one request across many services.',
    steps: ['Create trace ID', 'Pass in headers', 'Each service adds a span', 'View waterfall'],
  },
  estMinutes: 10,
  prereqs: ['logging', 'service-to-service-communication'],
  related: ['observability', 'metrics', 'microservices', 'api-gateway'],
  tags: ['trace id', 'span', 'traceparent', 'OpenTelemetry', 'Jaeger', 'sampling', 'context propagation'],
  visual: {
    type: 'waterfall',
    config: {
      total: 400, unit: 'ms',
      spans: [
        { id: 'gw', service: 'gateway', label: 'POST /checkout', start: 0, end: 400, depth: 0, tone: 'ok', note: 'root span, trace a1f' },
        { id: 'ord', service: 'orders', label: 'create_order', start: 20, end: 380, depth: 1, tone: 'ok', note: 'parent: gw' },
        { id: 'inv', service: 'inventory', label: 'reserve', start: 40, end: 120, depth: 2, tone: 'ok', note: 'fast' },
        { id: 'pay', service: 'payments', label: 'charge', start: 130, end: 340, depth: 2, tone: 'bad', note: 'slow: 210ms' },
        { id: 'db', service: 'payments', label: 'SELECT card', start: 150, end: 320, depth: 3, tone: 'warn', note: 'missing index?' },
      ],
    },
  },
  steps: [
    {
      label: 'Create trace ID',
      caption: {
        beginner: 'When a request arrives, it gets a unique ticket number so we can follow it everywhere.',
        intermediate: 'The first service (often the gateway) creates a trace id and a root span, unless the caller already sent one.',
        expert: 'A W3C trace id is 128 bits; the sampling decision is made at the root (head-based) and carried to all downstream services.',
      },
      state: { upto: 40 },
      hood: 'Head sampling decides early; tail sampling decides after seeing the whole trace.',
    },
    {
      label: 'Pass in headers',
      caption: {
        beginner: 'Each service hands the ticket number to the next one.',
        intermediate: 'The trace context travels in headers such as traceparent on every outgoing HTTP or gRPC call, or in message metadata.',
        expert: 'Propagation breaks at async boundaries, thread pools and queues unless context is explicitly carried. Gaps look like orphan traces.',
      },
      state: { upto: 130 },
      hood: 'traceparent: version-traceid-parentspanid-flags',
    },
    {
      label: 'Each service adds a span',
      caption: {
        beginner: 'Every service writes down how long its part took.',
        intermediate: 'Each unit of work records a span with a start time, duration, parent id and attributes, then exports it to a collector.',
        expert: 'Spans are exported asynchronously in batches. Instrument client and server sides, and add attributes such as db.statement (sanitised) and http.route.',
      },
      state: { upto: 320 },
      hood: 'BatchSpanProcessor buffers and drops under pressure.',
    },
    {
      label: 'View waterfall',
      caption: {
        beginner: 'A chart shows the whole journey, and the longest bar is where the time went.',
        intermediate: 'The waterfall shows nesting and timing. Here the payments call dominates, and a slow database query sits inside it.',
        expert: 'Read the critical path, not the sum of spans: parallel children overlap. Gaps between a parent and its children indicate time spent in the parent itself or in the network.',
      },
      state: { upto: 400 },
      hood: 'Critical path analysis finds what to optimise.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A parcel tracking number. A parcel passes through a sorting centre, a truck, a depot and a courier, and each stop scans it with a time. Afterwards you can see exactly where it waited.',
      explanation: 'In a system of many services, one user click touches several of them. A trace follows that single request through all of them and shows how long each step took.',
      keyTerms: [
        { term: 'Trace', meaning: 'The full journey of one request.' },
        { term: 'Span', meaning: 'One timed step inside the trace.' },
        { term: 'Trace id', meaning: 'The unique id shared by all spans of a trace.' },
        { term: 'Parent span', meaning: 'The span that caused another span.' },
        { term: 'Sampling', meaning: 'Keeping only some traces to save cost.' },
      ],
    },
    intermediate: {
      explanation: 'Tracing records timed spans linked by parent ids and a shared trace id. Context is propagated in headers, spans are exported to a backend, and the waterfall view locates latency and errors across services.',
      howItWorks: [
        'The entry point creates a trace id and root span.',
        'Outgoing calls inject trace context into headers.',
        'Each service extracts it and starts child spans.',
        'Spans are batched and exported to a collector.',
        'The backend assembles spans into a trace.',
        'Engineers inspect the waterfall for slow or failed spans.',
      ],
      tradeoffs: {
        use: [
          'Use tracing when one request spans several services and latency is hard to attribute.',
          'Use it to find the slowest dependency and the critical path.',
          'Use trace ids in logs to jump between logs and traces.',
        ],
        avoid: [
          'Avoid 100% sampling at high traffic without budget.',
          'Avoid putting personal data in span attributes.',
          'Avoid relying on tracing alone; combine it with metrics and logs.',
        ],
      },
      pitfalls: [
        'Context lost across queues or thread pools.',
        'Different services using incompatible header formats.',
        'Sampling away the rare slow or failed traces you most need.',
        'Too many tiny spans adding overhead and noise.',
        'Clock skew between hosts distorting the waterfall.',
      ],
    },
    expert: {
      internals: [
        'W3C Trace Context defines traceparent and tracestate; OpenTelemetry SDKs inject and extract it through propagators.',
        'Head-based sampling decides at the root with a probability; tail-based sampling in a collector buffers whole traces and keeps errors and slow ones.',
        'Span links connect causally related traces, such as a batch job triggered by many messages.',
        'Baggage carries key-value data across services but increases header size and leakage risk.',
      ],
      failureModes: [
        'Broken propagation yields disconnected partial traces.',
        'Collector overload drops spans, giving incomplete traces.',
        'Tail sampling memory growth from buffering long traces.',
        'Clock skew makes children appear to start before parents.',
      ],
      scalingNotes: [
        'Use probabilistic head sampling plus tail rules for errors and latency.',
        'Run collectors as a scaled tier with load-balanced, trace-id-consistent routing for tail sampling.',
        'Store traces with short retention; keep derived span metrics longer.',
      ],
      realSystems: [
        'OpenTelemetry, Jaeger, Zipkin, Grafana Tempo, AWS X-Ray, Datadog APM, Honeycomb.',
        'Google Dapper is the original design; B3 headers are the older Zipkin format.',
        'Service meshes such as Istio can generate spans but still need app propagation.',
      ],
      numbersToKnow: [
        'A trace id is 128 bits (32 hex chars) and a span id is 64 bits in W3C Trace Context.',
        'Production sampling rates of 1% to 10% are common for high-volume services. // VERIFY',
        'Instrumentation overhead is typically small per span but grows with span count.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'OpenTelemetry in FastAPI',
      code: [
        'from opentelemetry import trace',
        'from opentelemetry.sdk.trace import TracerProvider',
        'from opentelemetry.sdk.trace.export import BatchSpanProcessor',
        'from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter',
        'from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor',
        '',
        'provider = TracerProvider()',
        'provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))',
        'trace.set_tracer_provider(provider)',
        'FastAPIInstrumentor.instrument_app(app)',
        '',
        'tracer = trace.get_tracer("payments")',
        'with tracer.start_as_current_span("charge") as span:',
        '    span.set_attribute("order.id", order_id)',
      ].join('\n'),
      annotations: [
        { line: 8, text: 'Batch export keeps tracing off the request path.' },
        { line: 10, text: 'Auto-instrumentation extracts incoming traceparent and creates server spans.' },
        { line: 13, text: 'A manual child span around business work.' },
        { line: 14, text: 'Attributes make spans searchable; avoid personal data.' },
      ],
    },
    {
      lang: 'bash',
      title: 'Trace context header',
      code: [
        'curl -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \\',
        '     https://api.example.com/checkout',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Format: version-traceid-parentspanid-flags; the 01 flag means sampled.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a trace?', answer: 'The record of one request\'s path through all the services it touched, made of timed spans.', followUps: ['What is a span?'] },
    { level: 'beginner', q: 'Why do we need tracing in microservices?', answer: 'One slow request may be caused by any of many services. A trace shows which one and how long it took.', followUps: ['What else helps here?'] },
    { level: 'intermediate', q: 'How does a trace id travel between services?', answer: 'It is injected into request headers (traceparent) or message metadata by the caller and extracted by the callee, which starts child spans.', followUps: ['What about message queues?'] },
    { level: 'intermediate', q: 'Why sample traces?', answer: 'Collecting every trace is costly at scale. Sampling keeps a representative or interesting subset to control overhead and storage.', followUps: ['Head vs tail sampling?'] },
    { level: 'expert', q: 'Head vs tail sampling trade-offs?', answer: 'Head sampling is cheap and simple but decides before knowing the outcome, so it can miss errors. Tail sampling sees the whole trace and keeps errors and slow ones, but needs buffering and trace-affinity routing in collectors.', followUps: ['How do you route spans of one trace to one collector?'] },
    { level: 'expert', q: 'Traces look broken with orphan spans. How do you debug?', answer: 'Check header propagation at every hop, async boundaries and queues, thread-pool context loss, gateways stripping headers, mismatched propagator formats and dropped spans at the collector.', followUps: ['How do you verify propagation in a test?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A span is...', options: ['One timed step in a trace', 'A database table', 'A server', 'A password'], answerIndex: 0, why: 'A trace is made of spans.' },
    { level: 'intermediate', q: 'Trace context is passed via...', options: ['Request headers such as traceparent', 'The DNS record', 'A cron job', 'The CSS file'], answerIndex: 0, why: 'Headers carry the ids to the next service.' },
    { level: 'intermediate', q: 'Why sample?', options: ['Reduce overhead and storage', 'Make requests faster to type', 'Encrypt data', 'Avoid headers'], answerIndex: 0, why: 'Full tracing is costly at scale.' },
    { level: 'expert', q: 'Tail-based sampling can keep...', options: ['All errored or slow traces', 'Only the first span', 'No traces', 'Only logs'], answerIndex: 0, why: 'It decides after the trace is complete.' },
  ],
});
