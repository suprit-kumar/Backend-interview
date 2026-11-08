/* Observability: Logging. */
Atlas.topics.push({
  id: 'logging',
  category: 'observability',
  title: 'Logging',
  source: {
    description: 'Timestamped records of what happened.',
    steps: ['Event occurs', 'Write structured log', 'Ship to store', 'Search'],
  },
  estMinutes: 9,
  prereqs: ['error-handling'],
  related: ['monitoring', 'metrics', 'distributed-tracing', 'observability'],
  tags: ['structured logging', 'log levels', 'correlation id', 'ELK', 'Loki', 'PII', 'sampling'],
  visual: {
    type: 'pipeline',
    config: { stages: [{ id: 'app', label: 'App event', sub: 'something happens' }, { id: 'fmt', label: 'Structured log', sub: 'JSON line' }, { id: 'ship', label: 'Shipper', sub: 'agent / collector' }, { id: 'store', label: 'Log store', sub: 'indexed' }, { id: 'search', label: 'Search', sub: 'query + alert' }] },
  },
  steps: [
    {
      label: 'Event occurs',
      caption: {
        beginner: 'Something happens in the app: a user logs in, or a payment fails.',
        intermediate: 'Code reaches a log statement at a chosen level (DEBUG, INFO, WARNING, ERROR) for a notable event.',
        expert: 'Level filtering happens in-process, so disabled levels should cost almost nothing. Avoid building expensive messages eagerly.',
      },
      state: { active: ['app'], payload: { app: 'payment failed' } },
      hood: 'Use lazy formatting so DEBUG calls are cheap when disabled.',
    },
    {
      label: 'Write structured log',
      caption: {
        beginner: 'The app writes a neat note with the time, what happened and who it was about.',
        intermediate: 'Emit one JSON object per line with timestamp, level, message, service and a request or trace id, instead of free text.',
        expert: 'Structured fields make logs queryable without regex parsing. Keep field names and types consistent, or indexing will conflict.',
      },
      state: { active: ['fmt'], payload: { app: 'payment failed', fmt: '{"level":"error","req":"a1f"}' } },
      hood: 'Mixed field types for one key break many indexers.',
    },
    {
      label: 'Ship to store',
      caption: {
        beginner: 'A courier collects the notes and carries them to one big archive.',
        intermediate: 'Write to stdout; an agent (Fluent Bit, Vector, Filebeat) tails and forwards logs to a central store.',
        expert: 'Shipping is asynchronous and buffered, so backpressure, disk buffers and drop policy decide whether you lose logs during an outage.',
      },
      state: { active: ['ship'], payload: { fmt: '{"level":"error","req":"a1f"}', ship: 'batch of 500 lines' } },
      hood: 'Never let log shipping block the request path.',
    },
    {
      label: 'Search',
      caption: {
        beginner: 'Later you can look up the note about that failed payment in seconds.',
        intermediate: 'Query by request id, level or service in Kibana, Loki or CloudWatch Logs Insights to reconstruct what happened.',
        expert: 'Index cost drives design: Elasticsearch indexes full text, Loki indexes only labels. Retention tiers and sampling control spend.',
      },
      state: { active: ['store', 'search'], payload: { store: '2.1M lines today', search: 'req=a1f -> 14 lines' } },
      hood: 'High-cardinality labels hurt Loki; unbounded fields hurt Elasticsearch.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A ship captain\'s logbook. Every important event is written down with the time, so after a storm the crew can read exactly what happened and in what order.',
      explanation: 'Logs are written records of events in your program. When something breaks, they are often the first place to look to see what the program was doing.',
      keyTerms: [
        { term: 'Log level', meaning: 'How serious a message is: debug, info, warning, error.' },
        { term: 'Structured log', meaning: 'A log written as fields (like JSON), easy for tools to search.' },
        { term: 'Correlation id', meaning: 'An id that ties together all logs from one request.' },
        { term: 'Log shipper', meaning: 'A tool that moves logs to a central place.' },
        { term: 'Retention', meaning: 'How long logs are kept.' },
      ],
    },
    intermediate: {
      explanation: 'Good logging is structured, leveled, correlated and centralised. Write to stdout, include a request id on every line, and never log secrets or personal data.',
      howItWorks: [
        'Configure a logger with a JSON formatter and a level.',
        'Bind a request id to the logging context at the start of each request.',
        'Write events to stdout.',
        'An agent ships them to a central store.',
        'Engineers query by id, service and level.',
        'Retention and sampling control cost.',
      ],
      tradeoffs: {
        use: [
          'Use logs for discrete events and debugging context that metrics cannot carry.',
          'Use structured JSON so queries do not depend on regexes.',
          'Use a correlation id to follow one request across services.',
        ],
        avoid: [
          'Avoid logs as the only way to track rates or latency; metrics are cheaper.',
          'Avoid logging secrets, tokens or personal data.',
          'Avoid DEBUG logging at full volume in production hot paths.',
        ],
      },
      pitfalls: [
        'Logging passwords, tokens or card numbers.',
        'Free-text messages that cannot be queried.',
        'No request id, so multi-service flows cannot be traced.',
        'Logging the same error at every layer as it propagates.',
        'Synchronous logging to a slow sink blocking requests.',
      ],
    },
    expert: {
      internals: [
        'Python logging uses loggers, handlers, formatters and filters; QueueHandler plus a listener moves I/O off the request thread.',
        'Containers write to stdout; the runtime stores it as files that agents tail with checkpointed offsets.',
        'Elasticsearch builds inverted indexes; Loki stores compressed chunks indexed only by labels, making it cheaper but weaker for full-text search.',
        'Context propagation (contextvars) attaches ids to every line in async code.',
      ],
      failureModes: [
        'Log volume spikes during an incident, overwhelming the pipeline when it is needed most.',
        'Disk full on the node because rotation is misconfigured.',
        'Mapping conflicts in the index dropping documents.',
        'Sensitive data leaking into a store with wider access than the app.',
      ],
      scalingNotes: [
        'Sample or rate-limit noisy logs; keep errors at full fidelity.',
        'Tier retention: hot for days, cold or object storage for months.',
        'Drop or truncate large payloads and cap line size.',
      ],
      realSystems: [
        'Elasticsearch/Logstash/Kibana, OpenSearch, Grafana Loki, Splunk, Datadog Logs, CloudWatch Logs.',
        'Fluent Bit, Vector, Filebeat as shippers; OpenTelemetry Logs for unified signals.',
        'Python structlog and python-json-logger.',
      ],
      numbersToKnow: [
        'Log cost is roughly proportional to volume, so a 10x chattier service costs about 10x to store and index. // VERIFY',
        'Typical retention is 7 to 30 days hot and longer for audit logs.',
        'A single JSON log line is commonly a few hundred bytes to a few KB.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Structured logging with a request id',
      code: [
        'import json, logging, contextvars',
        'request_id = contextvars.ContextVar("request_id", default="-")',
        '',
        'class JsonFormatter(logging.Formatter):',
        '    def format(self, record):',
        '        return json.dumps({',
        '            "ts": self.formatTime(record), "level": record.levelname,',
        '            "msg": record.getMessage(), "req": request_id.get(),',
        '        })',
        '',
        'handler = logging.StreamHandler()',
        'handler.setFormatter(JsonFormatter())',
        'log = logging.getLogger("payments")',
        'log.addHandler(handler); log.setLevel(logging.INFO)',
        'log.error("payment failed")',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'A context variable carries the id through async code.' },
        { line: 6, text: 'One JSON object per line, easy to parse and query.' },
        { line: 8, text: 'Every line includes the request id for correlation.' },
        { line: 15, text: 'Written to stdout; a shipper forwards it.' },
      ],
    },
    {
      lang: 'bash',
      title: 'Query logs',
      code: [
        'kubectl logs deploy/payments --since=10m | jq \'select(.level=="ERROR")\'',
        'logcli query \'{app="payments"} |= "a1f"\' --limit=50',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Filter structured lines by field using jq.' },
        { line: 2, text: 'LogQL selects by label, then filters lines by text.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why do we log?', answer: 'To record what the program did so we can debug problems and audit events after they happen.', followUps: ['What should you never log?'] },
    { level: 'beginner', q: 'What are log levels for?', answer: 'They mark severity (debug, info, warning, error) so you can filter noise and keep production output manageable.', followUps: ['Which level in production by default?'] },
    { level: 'intermediate', q: 'Why use structured logs?', answer: 'Fields can be queried and aggregated directly, with no fragile regex parsing, and consistent names make dashboards and alerts reliable.', followUps: ['What breaks if field types vary?'] },
    { level: 'intermediate', q: 'How do you follow one request across services?', answer: 'Generate or accept a request or trace id at the edge, pass it in headers, and include it in every log line, then search by it.', followUps: ['How does this relate to tracing?'] },
    { level: 'expert', q: 'Log volume explodes during an outage. How do you protect the pipeline?', answer: 'Buffer with bounded queues and a drop policy that preserves errors, sample noisy levels, rate-limit repeated messages, apply backpressure away from the request path, and alert on dropped-log counters.', followUps: ['What is the cost of dropping logs?'] },
    { level: 'expert', q: 'Elasticsearch or Loki for logs?', answer: 'Elasticsearch gives rich full-text search at higher index and storage cost. Loki indexes labels only, so it is cheaper and pairs with Grafana, but ad hoc search scans chunks. Choose by query patterns, volume and budget.', followUps: ['What is a high-cardinality label problem?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A log is...', options: ['A timestamped record of an event', 'A database index', 'A network cable', 'A test case'], answerIndex: 0, why: 'Logs record events as they happen.' },
    { level: 'intermediate', q: 'Which is best practice?', options: ['One JSON object per line with a request id', 'Free text only', 'Logging passwords for debugging', 'Log only at startup'], answerIndex: 0, why: 'Structured, correlated logs are searchable.' },
    { level: 'intermediate', q: 'A correlation id helps to...', options: ['Group all logs of one request', 'Encrypt logs', 'Speed up disks', 'Rotate files'], answerIndex: 0, why: 'It ties lines from many services together.' },
    { level: 'expert', q: 'Loki differs from Elasticsearch because it...', options: ['Indexes only labels, not full text', 'Cannot store logs', 'Requires SQL', 'Is a tracing system'], answerIndex: 0, why: 'Label-only indexing lowers cost but limits ad hoc search speed.' },
  ],
});
