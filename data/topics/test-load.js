/* Testing: Load & Performance Testing. */
Atlas.topics.push({
  id: 'load-performance-testing',
  category: 'testing',
  title: 'Load & Performance Testing',
  source: {
    description: 'See how the system behaves under heavy traffic.',
    steps: ['Define traffic', 'Ramp users', 'Watch latency and errors', 'Find the breaking point'],
  },
  estMinutes: 10,
  prereqs: ['testing', 'metrics'],
  related: ['metrics', 'scalability', 'performance-optimization', 'rate-limiting'],
  tags: ['k6', 'Locust', 'throughput', 'p99', 'soak test', 'stress test', 'saturation', 'coordinated omission'],
  visual: {
    type: 'chart',
    config: {
      kind: 'line', xLabel: 'virtual users', yLabel: 'p95 latency', unit: 'ms', yMax: 2000,
      x: ['50', '100', '200', '400', '600', '800'],
      series: [
        { id: 'lat', label: 'p95 latency', tone: 'bad', values: [80, 90, 110, 180, 700, 1900] },
        { id: 'err', label: 'Errors (x10)', tone: 'warn', values: [0, 0, 0, 10, 120, 600] },
      ],
    },
  },
  steps: [
    {
      label: 'Define traffic',
      caption: {
        beginner: 'Decide what a typical busy day looks like, so the test copies real behaviour.',
        intermediate: 'Model realistic user journeys, think times and data, using production traffic ratios and a target such as peak requests per second.',
        expert: 'Use an open model (fixed arrival rate) for internet-facing systems. A closed model (fixed users) slows its own load when the system slows, hiding problems.',
      },
      state: { series: { lat: [80, null, null, null, null, null], err: [0, null, null, null, null, null] }, mark: 0 },
      hood: 'Open vs closed workload models; avoid coordinated omission.',
    },
    {
      label: 'Ramp users',
      caption: {
        beginner: 'Add more and more pretend users, a few at a time.',
        intermediate: 'Increase load in stages and hold each step long enough for metrics to stabilise, including warm-up for caches and JIT.',
        expert: 'Run from machines that are not themselves the bottleneck, and monitor the load generator\'s CPU and network.',
      },
      state: { series: { lat: [80, 90, 110, null, null, null], err: [0, 0, 0, null, null, null] }, mark: 2 },
      hood: 'A saturated generator reports false latencies.',
    },
    {
      label: 'Watch latency and errors',
      caption: {
        beginner: 'Watch how long replies take and whether any fail.',
        intermediate: 'Track p50, p95, p99 latency, throughput, error rate and resource usage (CPU, memory, connections, DB).',
        expert: 'Latency rises sharply as utilization approaches 100% because queues grow nonlinearly. Find the saturated resource using the USE method.',
      },
      state: { series: { lat: [80, 90, 110, 180, 700, null], err: [0, 0, 0, 10, 120, null] }, mark: 4 },
      hood: 'Queueing theory: waiting time explodes near saturation.',
    },
    {
      label: 'Find the breaking point',
      caption: {
        beginner: 'Keep adding users until the system struggles, so you know its limit.',
        intermediate: 'Identify the knee where latency climbs and errors begin, and the bottleneck behind it, such as the connection pool or the database.',
        expert: 'Capacity is the load at which your SLO still holds, not the point of collapse. Test graceful degradation with load shedding and rate limits too.',
      },
      state: { series: { lat: [80, 90, 110, 180, 700, 1900], err: [0, 0, 0, 10, 120, 600] }, mark: 5 },
      hood: 'Plan capacity with headroom below the knee.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Testing a bridge by driving heavier and heavier trucks onto it while watching for strain. You learn the safe weight before a real traffic jam finds the limit for you.',
      explanation: 'Load testing simulates many users at once to see how fast the system stays and when it starts failing, so you can fix weak spots before real users hit them.',
      keyTerms: [
        { term: 'Load test', meaning: 'Test with expected heavy traffic.' },
        { term: 'Stress test', meaning: 'Push beyond limits to see how it fails.' },
        { term: 'Throughput', meaning: 'Requests handled per second.' },
        { term: 'Latency percentile', meaning: 'p95 is the time under which 95% of requests finish.' },
        { term: 'Bottleneck', meaning: 'The slowest part that limits the system.' },
      ],
    },
    intermediate: {
      explanation: 'Performance testing comes in types: load (expected peak), stress (beyond limits), spike (sudden surge), soak (long duration for leaks) and capacity. Define pass criteria as SLOs, ramp load, and correlate results with server metrics to find the bottleneck.',
      howItWorks: [
        'Define goals and SLO-based pass criteria.',
        'Model realistic journeys and data.',
        'Run in a production-like environment.',
        'Ramp load in stages while recording percentiles and errors.',
        'Watch server metrics to find the saturated resource.',
        'Fix, rerun and keep a baseline to catch regressions.',
      ],
      tradeoffs: {
        use: [
          'Use before launches, big campaigns and major architecture changes.',
          'Use soak tests to find memory and connection leaks.',
          'Use regular baselines in CI for critical endpoints.',
        ],
        avoid: [
          'Avoid testing on a tiny environment and extrapolating.',
          'Avoid load testing production without safeguards.',
          'Avoid using only averages as the result.',
        ],
      },
      pitfalls: [
        'Unrealistic traffic such as hitting one cached URL.',
        'A load generator that is itself the bottleneck.',
        'Testing with an empty or tiny database.',
        'Ignoring warm-up, caches and connection pools.',
        'Reporting average latency only.',
      ],
    },
    expert: {
      internals: [
        'Little\'s law links concurrency, throughput and latency: L = lambda x W, which helps size pools and predict saturation.',
        'Utilization near 100% makes queueing delay grow sharply, so the latency knee appears well before maximum throughput.',
        'Coordinated omission: a closed-loop tool that pauses while waiting for a slow response under-records the delay that real users would have experienced; tools such as wrk2 and k6 arrival-rate executors address it.',
        'Distributed generators and fixed-rate scenarios keep the offered load constant.',
      ],
      failureModes: [
        'Retry storms and thundering herds amplifying load during degradation.',
        'Connection pool exhaustion or DB lock contention capping throughput.',
        'GC pauses and noisy neighbours causing tail spikes.',
        'Auto-scaling reacting too slowly for spikes.',
      ],
      scalingNotes: [
        'Find the bottleneck, fix it, then find the next; capacity is a moving target.',
        'Combine with rate limiting and load shedding so overload degrades gracefully.',
        'Rerun after dependency, schema or traffic mix changes.',
      ],
      realSystems: [
        'k6, Locust, Gatling, JMeter, wrk2, Vegeta, Artillery.',
        'Chaos and game-day tools alongside load tests; Grafana for results.',
        'Cloud load testing services such as AWS Distributed Load Testing.',
      ],
      numbersToKnow: [
        'Little\'s law: concurrency = throughput x average latency; for example 1000 req/s at 50 ms needs about 50 concurrent requests in flight.',
        'A common SLO-based target is p99 under a few hundred ms for interactive APIs. // VERIFY',
        'Latency commonly rises sharply once a resource passes roughly 70% to 80% utilization. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Locust load test',
      code: [
        'from locust import HttpUser, task, between',
        '',
        'class Shopper(HttpUser):',
        '    wait_time = between(1, 3)',
        '',
        '    @task(5)',
        '    def browse(self):',
        '        self.client.get("/products")',
        '',
        '    @task(1)',
        '    def buy(self):',
        '        self.client.post("/orders", json={"sku": "A1", "qty": 1})',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'Think time between actions mimics real users.' },
        { line: 6, text: 'A weight of 5 versus 1 sets a realistic browse to buy ratio.' },
        { line: 12, text: 'Write paths matter too, since they hit the database harder.' },
      ],
    },
    {
      lang: 'javascript',
      title: 'k6 with thresholds and a fixed arrival rate',
      code: [
        "import http from 'k6/http';",
        'export const options = {',
        '  scenarios: { peak: { executor: "constant-arrival-rate", rate: 200, timeUnit: "1s",',
        '    duration: "5m", preAllocatedVUs: 100 } },',
        '  thresholds: { http_req_duration: ["p(95)<300"], http_req_failed: ["rate<0.01"] },',
        '};',
        'export default function () { http.get("https://staging.example.com/products"); }',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'A constant arrival rate is an open model and avoids coordinated omission.' },
        { line: 5, text: 'Thresholds turn the test into a pass or fail gate.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is load testing?', answer: 'Sending many simulated requests to see how the system performs under expected heavy traffic.', followUps: ['What do you measure?'] },
    { level: 'beginner', q: 'Why look at p95 or p99 instead of the average?', answer: 'The average hides slow requests. Percentiles show what slow users experience.', followUps: ['What is p50?'] },
    { level: 'intermediate', q: 'Load vs stress vs soak vs spike tests?', answer: 'Load is expected peak traffic, stress goes beyond limits to see failure behaviour, soak runs long to find leaks, and spike applies a sudden surge.', followUps: ['Which finds a memory leak?'] },
    { level: 'intermediate', q: 'The system slows at 400 users. How do you find the bottleneck?', answer: 'Correlate latency with server metrics: CPU, memory, connection pool usage, DB locks and slow queries, thread counts and queue depth. Use traces to find the slow span, then fix and retest.', followUps: ['What does USE stand for?'] },
    { level: 'expert', q: 'What is coordinated omission?', answer: 'Closed-loop load tools wait for a response before sending the next request, so when the server stalls they send fewer requests and under-record the delay users would see. Use fixed-rate generators or correct the recorded latencies.', followUps: ['Which tools avoid it?'] },
    { level: 'expert', q: 'How do you use Little\'s law in capacity planning?', answer: 'Concurrency equals throughput times latency. It tells you how many in-flight requests, connections or threads you need at a target rate, so you can size pools and see how rising latency inflates concurrency until a pool saturates.', followUps: ['What happens to concurrency when latency doubles?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A load test shows...', options: ['Behaviour under heavy traffic', 'Spelling errors', 'Git history', 'Screen colours'], answerIndex: 0, why: 'It simulates many users.' },
    { level: 'intermediate', q: 'A soak test mainly finds...', options: ['Leaks over long runs', 'Typos', 'CSS bugs', 'DNS TTLs'], answerIndex: 0, why: 'Long duration exposes memory and connection leaks.' },
    { level: 'intermediate', q: 'Which result view is best?', options: ['Percentiles such as p95 and p99', 'Average only', 'Max only', 'File size'], answerIndex: 0, why: 'They show the tail experience.' },
    { level: 'expert', q: 'By Little\'s law, 1000 req/s at 50 ms needs about...', options: ['50 concurrent requests', '5 requests', '5000 requests', '1 request'], answerIndex: 0, why: '1000 x 0.05 = 50.' },
  ],
});
