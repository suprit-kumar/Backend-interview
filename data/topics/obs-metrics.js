/* Observability: Metrics. */
Atlas.topics.push({
  id: 'metrics',
  category: 'observability',
  title: 'Metrics',
  source: {
    description: 'Numeric time series such as latency and error rate.',
    steps: ['Instrument code', 'Scrape or push', 'Store series', 'Dashboard'],
  },
  estMinutes: 9,
  prereqs: ['logging'],
  related: ['monitoring', 'observability', 'performance-optimization', 'load-performance-testing'],
  tags: ['counter', 'gauge', 'histogram', 'percentile', 'Prometheus', 'cardinality', 'RED', 'USE'],
  visual: {
    type: 'chart',
    config: {
      kind: 'line', xLabel: 'time (min)', yLabel: 'latency', unit: 'ms', yMax: 1000,
      x: ['0', '1', '2', '3', '4', '5'],
      series: [
        { id: 'p50', label: 'p50', tone: 'ok', values: [40, 42, 41, 45, 44, 43] },
        { id: 'p99', label: 'p99', tone: 'bad', values: [120, 150, 400, 900, 700, 300] },
      ],
    },
  },
  steps: [
    {
      label: 'Instrument code',
      caption: {
        beginner: 'The app counts things as it works, such as how many requests it served.',
        intermediate: 'Add counters (requests, errors), gauges (queue size) and histograms (latency) to the code or use a framework middleware.',
        expert: 'Prefer histograms with sensible buckets over averages. Label by low-cardinality dimensions only, such as route template, not raw URL or user id.',
      },
      state: { series: { p50: [40, null, null, null, null, null], p99: [120, null, null, null, null, null] }, mark: 0 },
      hood: 'Each unique label combination creates a new time series.',
    },
    {
      label: 'Scrape or push',
      caption: {
        beginner: 'A collector visits the app every few seconds and copies the numbers.',
        intermediate: 'Prometheus pulls from /metrics on an interval; short-lived jobs push to a gateway or collector.',
        expert: 'Pull makes target health visible (the up metric) and avoids overload from senders; push suits batch jobs and restricted networks.',
      },
      state: { series: { p50: [40, 42, 41, null, null, null], p99: [120, 150, 400, null, null, null] }, mark: 2 },
      hood: 'Scrape interval sets the finest resolution you can see.',
    },
    {
      label: 'Store series',
      caption: {
        beginner: 'The numbers are saved with their time so you can see history.',
        intermediate: 'A time series database stores (timestamp, value) per series, compresses it and downsamples old data.',
        expert: 'Prometheus TSDB uses delta-of-delta and XOR compression, often around 1 to 2 bytes per sample. // VERIFY Cardinality, not volume, is the main cost.',
      },
      state: { series: { p50: [40, 42, 41, 45, 44, null], p99: [120, 150, 400, 900, 700, null] }, mark: 4 },
      hood: 'Head block in memory, then compacted blocks on disk.',
    },
    {
      label: 'Dashboard',
      caption: {
        beginner: 'A chart shows the story: here the slowest requests got much slower.',
        intermediate: 'Query with PromQL, for example histogram_quantile(0.99, ...), and chart rate, errors and latency percentiles.',
        expert: 'p50 stays flat while p99 spikes: the tail is hurting a small share of users. Percentiles cannot be averaged across instances, so aggregate histogram buckets instead.',
      },
      state: { series: { p50: [40, 42, 41, 45, 44, 43], p99: [120, 150, 400, 900, 700, 300] }, mark: 3 },
      hood: 'Never average p99s; sum buckets, then compute the quantile.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A car dashboard. Speed, fuel and engine temperature are just numbers sampled over time, and watching them tells you how the car is doing without opening the engine.',
      explanation: 'Metrics are numbers measured over time, like requests per second or how long requests take. They are small and cheap, so you can watch them all the time.',
      keyTerms: [
        { term: 'Counter', meaning: 'A number that only goes up, such as total requests.' },
        { term: 'Gauge', meaning: 'A number that goes up and down, such as queue length.' },
        { term: 'Histogram', meaning: 'Counts values in ranges, used for latency.' },
        { term: 'Percentile', meaning: 'p99 means 99% of requests were faster than this.' },
        { term: 'Label', meaning: 'A tag that splits a metric, such as by route.' },
      ],
    },
    intermediate: {
      explanation: 'Use RED (rate, errors, duration) for services and USE (utilization, saturation, errors) for resources. Counters are read as rates, and latency is read as percentiles from histograms.',
      howItWorks: [
        'Instrument with a client library or middleware.',
        'Expose /metrics or push to a collector.',
        'Scraper stores samples as time series.',
        'Queries compute rates and quantiles.',
        'Dashboards visualise; alerts evaluate rules.',
        'Old data is downsampled or dropped.',
      ],
      tradeoffs: {
        use: [
          'Use metrics for trends, alerting and capacity planning.',
          'Use histograms for latency so percentiles stay accurate.',
          'Use RED and USE dashboards as a starting set.',
        ],
        avoid: [
          'Avoid user ids or raw URLs as labels.',
          'Avoid averages as the only latency view.',
          'Avoid metrics for per-request debugging detail; use traces or logs.',
        ],
      },
      pitfalls: [
        'High-cardinality labels exploding memory.',
        'Reading a counter value instead of its rate.',
        'Averaging percentiles across instances.',
        'Histogram buckets that do not cover the real range.',
        'Missing metrics on error paths.',
      ],
    },
    expert: {
      internals: [
        'A series is identified by metric name plus label set; each new combination is a new series with its own memory and index cost.',
        'Prometheus rate() handles counter resets and extrapolates over the window; histogram_quantile interpolates inside buckets, so accuracy depends on bucket layout.',
        'Exemplars link a histogram bucket to a trace id, connecting metrics to traces.',
        'OpenTelemetry defines a vendor-neutral metrics API and OTLP protocol.',
      ],
      failureModes: [
        'Cardinality bomb from a new label crashes or slows the TSDB.',
        'Scrape timeouts under load produce gaps exactly when needed.',
        'Wrong bucket boundaries make p99 look flat or jumpy.',
        'Clock skew or counter resets corrupt rates.',
      ],
      scalingNotes: [
        'Limit label values, drop unneeded series at scrape time, and set sample limits.',
        'Use recording rules for expensive queries.',
        'Use Thanos, Mimir or VictoriaMetrics for horizontal scale and long retention.',
      ],
      realSystems: [
        'Prometheus, VictoriaMetrics, Mimir, Thanos, InfluxDB, Datadog, CloudWatch.',
        'OpenTelemetry metrics; StatsD; prometheus_client for Python.',
        'Micrometer in JVM services.',
      ],
      numbersToKnow: [
        'A common scrape interval is 15 to 60 seconds.',
        'One Prometheus server typically handles on the order of a few million active series on adequate hardware. // VERIFY',
        'Default Prometheus retention is 15 days.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Instrument a FastAPI route',
      code: [
        'import time',
        'from prometheus_client import Counter, Histogram, make_asgi_app',
        'from fastapi import FastAPI',
        '',
        'REQS = Counter("http_requests_total", "Requests", ["route", "code"])',
        'LAT = Histogram("http_request_seconds", "Latency", ["route"],',
        '                buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5))',
        'app = FastAPI()',
        'app.mount("/metrics", make_asgi_app())',
        '',
        '@app.get("/orders/{oid}")',
        'def get_order(oid: int):',
        '    start = time.perf_counter()',
        '    try:',
        '        return {"id": oid}',
        '    finally:',
        '        LAT.labels("/orders/{oid}").observe(time.perf_counter() - start)',
        '        REQS.labels("/orders/{oid}", "200").inc()',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'A counter only increases; read it as a rate.' },
        { line: 6, text: 'A histogram with explicit buckets enables percentiles.' },
        { line: 9, text: 'Expose /metrics for the scraper.' },
        { line: 17, text: 'The label is the route template, not the raw URL, to keep cardinality low.' },
      ],
    },
    {
      lang: 'sql',
      title: 'PromQL (shown as SQL-like text)',
      code: [
        'sum(rate(http_requests_total[5m])) by (route)',
        'histogram_quantile(0.99, sum(rate(http_request_seconds_bucket[5m])) by (le))',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Requests per second per route.' },
        { line: 2, text: 'p99 from aggregated buckets, safe across instances.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a metric?', answer: 'A number measured over time, like requests per second or error count.', followUps: ['Give two examples.'] },
    { level: 'beginner', q: 'Why is p99 more useful than average?', answer: 'The average hides slow requests. p99 shows what the slowest 1% of users experience.', followUps: ['What is p50?'] },
    { level: 'intermediate', q: 'Counter vs gauge vs histogram?', answer: 'Counter only increases and is read as a rate; gauge moves up and down; histogram counts observations in buckets so quantiles can be computed.', followUps: ['Which for queue depth?'] },
    { level: 'intermediate', q: 'What are RED and USE?', answer: 'RED for services: rate, errors, duration. USE for resources: utilization, saturation, errors.', followUps: ['Which for a database?'] },
    { level: 'expert', q: 'Prometheus memory is growing fast. What do you check?', answer: 'Series cardinality: find metrics with the most series, find the label with unbounded values like user id or raw path, remove or aggregate it, and set sample or label limits.', followUps: ['How do you find the offender?'] },
    { level: 'expert', q: 'Why can you not average p99 across pods?', answer: 'A percentile of percentiles is not the percentile of the combined data. Aggregate histogram bucket counts across pods, then compute the quantile.', followUps: ['What does bucket choice change?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A metric is...', options: ['A number tracked over time', 'A log line', 'A password', 'A server'], answerIndex: 0, why: 'Time-series numbers.' },
    { level: 'intermediate', q: 'A counter should be read as...', options: ['A rate', 'A gauge', 'An average of p99', 'A boolean'], answerIndex: 0, why: 'The raw total keeps growing; the rate is meaningful.' },
    { level: 'intermediate', q: 'A bad label choice is...', options: ['user_id', 'route template', 'status code class', 'method'], answerIndex: 0, why: 'Unbounded values explode cardinality.' },
    { level: 'expert', q: 'To get a fleet-wide p99 you should...', options: ['Sum histogram buckets, then compute the quantile', 'Average each pod\'s p99', 'Take the max of p50', 'Use a counter'], answerIndex: 0, why: 'Percentiles are not averageable.' },
  ],
});
