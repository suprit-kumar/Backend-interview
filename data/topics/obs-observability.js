/* Observability: Observability. */
Atlas.topics.push({
  id: 'observability',
  category: 'observability',
  title: 'Observability',
  source: {
    description: 'Ask new questions about the system from its outputs.',
    steps: ['Logs', 'Metrics', 'Traces', 'Find the root cause'],
  },
  estMinutes: 9,
  prereqs: ['logging', 'metrics', 'distributed-tracing'],
  related: ['monitoring', 'logging', 'metrics', 'distributed-tracing'],
  tags: ['three pillars', 'OpenTelemetry', 'high cardinality', 'unknown unknowns', 'SLO', 'debugging'],
  visual: {
    type: 'pipeline',
    config: { stages: [{ id: 'alert', label: 'Symptom', sub: 'p99 spike' }, { id: 'met', label: 'Metrics', sub: 'where / when' }, { id: 'tr', label: 'Traces', sub: 'which hop' }, { id: 'log', label: 'Logs', sub: 'why' }, { id: 'rc', label: 'Root cause', sub: 'fix' }] },
  },
  steps: [
    {
      label: 'Logs',
      caption: {
        beginner: 'Notes written by the app say what happened.',
        intermediate: 'Logs give detailed event context, such as the exact error and the inputs involved.',
        expert: 'Wide structured events with many fields (user, build, region, flag) allow slicing by any dimension, which is the core of the observability approach.',
      },
      state: { active: ['log'], payload: { log: 'timeout calling card-db' } },
      hood: 'High-cardinality, high-dimensionality events.',
    },
    {
      label: 'Metrics',
      caption: {
        beginner: 'Numbers show that something is wrong and roughly when it started.',
        intermediate: 'Metrics reveal the symptom and its scope: which route, which region, since which deploy.',
        expert: 'Aggregates are cheap and alert-friendly but discard the detail needed to explain the outlier.',
      },
      state: { active: ['alert', 'met'], payload: { alert: 'p99 600ms', met: 'only /checkout, since 14:05' } },
      hood: 'Start from SLO burn, then narrow.',
    },
    {
      label: 'Traces',
      caption: {
        beginner: 'A map shows which service in the chain was slow.',
        intermediate: 'Traces localise latency to one service or query inside a request path.',
        expert: 'Exemplars link a slow metric bucket to a concrete trace, jumping from symptom to evidence in one click.',
      },
      state: { active: ['met', 'tr'], payload: { met: 'only /checkout, since 14:05', tr: 'payments -> card-db 210ms' } },
      hood: 'Metric exemplar -> trace -> logs by trace id.',
    },
    {
      label: 'Find the root cause',
      caption: {
        beginner: 'Putting the clues together shows the real problem and how to fix it.',
        intermediate: 'Combine signals: the 14:05 deploy dropped an index, the slow query shows in the trace and the log confirms a sequential scan.',
        expert: 'Correlate with change events (deploys, flags, config). Hypothesis-driven querying over raw events beats pre-built dashboards for unknown unknowns.',
      },
      state: { active: ['log', 'rc'], payload: { log: 'seq scan on cards', rc: 'restore index, add migration check' } },
      hood: 'Annotate dashboards with deploys and flag changes.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A detective with three kinds of evidence: witness statements (logs), a timeline of numbers like camera counts (metrics), and a map of the suspect\'s route (traces). Together they let the detective solve cases nobody planned for.',
      explanation: 'Observability means you can understand what is happening inside a system just by looking at what it outputs, including problems you did not predict.',
      keyTerms: [
        { term: 'Logs', meaning: 'Detailed records of events.' },
        { term: 'Metrics', meaning: 'Numbers over time.' },
        { term: 'Traces', meaning: 'The path of one request.' },
        { term: 'Root cause', meaning: 'The real reason something failed.' },
        { term: 'Telemetry', meaning: 'All the data a system emits about itself.' },
      ],
    },
    intermediate: {
      explanation: 'Monitoring answers known questions with dashboards and alerts. Observability lets you ask new questions, using correlated logs, metrics and traces with shared ids and rich context.',
      howItWorks: [
        'Instrument with OpenTelemetry for all three signals.',
        'Use shared ids and consistent resource attributes.',
        'Alert on SLO symptoms.',
        'Pivot from metric to trace to logs.',
        'Slice by dimensions to isolate the cause.',
        'Feed findings into new tests and alerts.',
      ],
      tradeoffs: {
        use: [
          'Use it for complex distributed systems where failures are novel.',
          'Use correlated signals to cut time to diagnose.',
          'Use OpenTelemetry to avoid vendor lock-in.',
        ],
        avoid: [
          'Avoid collecting everything without a cost plan.',
          'Avoid separate tools with no shared identifiers.',
          'Avoid treating dashboards as a substitute for queryable data.',
        ],
      },
      pitfalls: [
        'Three disconnected tools with no correlation id.',
        'Telemetry cost growing faster than the product.',
        'No consistent naming of services and attributes.',
        'Only instrumenting what is easy, not what is critical.',
        'Ignoring deploy and config change events.',
      ],
    },
    expert: {
      internals: [
        'OpenTelemetry provides APIs, SDKs, the OTLP protocol and a Collector that receives, processes (batch, tail sampling, redaction) and exports telemetry.',
        'Resource attributes (service.name, version, environment) identify the emitter and enable cross-signal joins.',
        'Columnar event stores such as those behind Honeycomb or ClickHouse allow ad hoc group-by on high-cardinality fields.',
        'Exemplars and trace ids in logs connect signals.',
      ],
      failureModes: [
        'Telemetry pipeline fails during the outage it should explain.',
        'Cost blowouts from unbounded cardinality or log volume.',
        'Sampling hides the rare event under investigation.',
        'Sensitive data leaking into telemetry.',
      ],
      scalingNotes: [
        'Put a Collector tier between apps and backends for batching, sampling and routing.',
        'Budget telemetry per service and sample by value.',
        'Keep raw data short-lived and derived metrics longer.',
      ],
      realSystems: [
        'OpenTelemetry with Grafana (Loki, Tempo, Mimir), Honeycomb, Datadog, New Relic, Elastic APM.',
        'Prometheus, Jaeger, ClickHouse-based stores such as SigNoz.',
        'AWS CloudWatch with X-Ray.',
      ],
      numbersToKnow: [
        'Telemetry often costs a notable fraction of infrastructure spend, so budget it explicitly. // VERIFY',
        'Common trace sampling rates are 1% to 10% with tail rules for errors.',
        'Traces typically retain days; metrics weeks to years.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'OpenTelemetry Collector pipeline',
      code: [
        'receivers:',
        '  otlp: { protocols: { grpc: {}, http: {} } }',
        'processors:',
        '  batch: {}',
        '  attributes/redact:',
        '    actions: [{ key: user.email, action: delete }]',
        'exporters:',
        '  otlphttp: { endpoint: https://tempo.example.com }',
        'service:',
        '  pipelines:',
        '    traces: { receivers: [otlp], processors: [attributes/redact, batch], exporters: [otlphttp] }',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Apps send all signals to the collector via OTLP.' },
        { line: 6, text: 'Redact sensitive attributes centrally.' },
        { line: 4, text: 'Batching reduces export overhead.' },
        { line: 11, text: 'A pipeline wires receivers, processors and exporters.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What are the three pillars of observability?', answer: 'Logs, metrics and traces.', followUps: ['What does each answer?'] },
    { level: 'beginner', q: 'Monitoring vs observability?', answer: 'Monitoring checks known conditions and alerts. Observability lets you explore the system\'s outputs to explain unexpected behaviour.', followUps: ['Can you have one without the other?'] },
    { level: 'intermediate', q: 'How do you debug a latency spike across services?', answer: 'Start from the metric to scope route and time, use exemplars or traces to find the slow span, then read logs for that trace id, and check recent deploys.', followUps: ['What if the trace was sampled out?'] },
    { level: 'intermediate', q: 'Why use OpenTelemetry?', answer: 'It is a vendor-neutral standard for APIs, SDKs and the wire protocol, so you can switch backends without re-instrumenting.', followUps: ['What does the Collector add?'] },
    { level: 'expert', q: 'What are unknown unknowns and how does observability address them?', answer: 'Failures you did not predict, so no dashboard exists. Rich, high-cardinality events let you slice and filter arbitrarily to form and test hypotheses.', followUps: ['What does this cost?'] },
    { level: 'expert', q: 'Telemetry spend doubled. What do you do?', answer: 'Find top contributors by service and signal, cut unbounded labels, sample traces, rate-limit noisy logs, shorten retention for raw data, convert logs to metrics where suitable, and set per-team budgets.', followUps: ['What must you not cut?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'The three pillars are...', options: ['Logs, metrics, traces', 'CPU, RAM, disk', 'Build, test, deploy', 'GET, POST, PUT'], answerIndex: 0, why: 'The classic telemetry signals.' },
    { level: 'intermediate', q: 'Observability helps most with...', options: ['Unexpected failures', 'Writing CSS', 'Choosing colours', 'Naming branches'], answerIndex: 0, why: 'You can explore data to explain novel issues.' },
    { level: 'intermediate', q: 'OpenTelemetry is...', options: ['A vendor-neutral telemetry standard', 'A database', 'A web server', 'A test runner'], answerIndex: 0, why: 'APIs, SDKs and OTLP.' },
    { level: 'expert', q: 'An exemplar links a...', options: ['Metric bucket to a trace', 'Log to a disk', 'User to a role', 'Pod to a node'], answerIndex: 0, why: 'It jumps from symptom to evidence.' },
  ],
});
