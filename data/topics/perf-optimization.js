/* Performance & Caching: Performance Optimization. */
Atlas.topics.push({
  id: 'performance-optimization',
  category: 'performance-caching',
  title: 'Performance Optimization',
  source: {
    description: 'Measure first, then fix the biggest bottleneck.',
    steps: ['Profile', 'Find hotspot', 'Fix one thing', 'Measure again'],
  },
  estMinutes: 12,
  prereqs: ['database-query-optimization'],
  related: ['caching', 'load-performance-testing', 'monitoring', 'connection-pooling'],
  tags: ['profiling', 'latency', 'p99', 'bottleneck', 'amdahl', 'flame graph'],
  visual: {
    type: 'chart',
    config: {
      kind: 'bar',
      xLabel: 'Request phase',
      yLabel: 'Time',
      unit: 'ms',
      x: ['Auth', 'DB query', 'Render', 'External API'],
      yMax: 500,
      series: [
        { id: 'time', label: 'Time per phase', tone: 'accent', values: [20, 20, 20, 20] },
      ],
    },
  },
  steps: [
    {
      label: 'Profile',
      caption: {
        beginner: 'Time each part of a slow request instead of guessing which part is slow.',
        intermediate: 'Use a profiler, tracing or timers to break a request into phases under realistic load.',
        expert: 'Use sampling profilers and flame graphs (py-spy, perf) for CPU, and traces for waiting time. Look at p95 and p99 latency, not only the average.',
      },
      state: { series: { time: [20, 20, 20, 20] }, changed: 'Per-phase timings are now visible.' },
      hood: 'py-spy and flame graphs show where CPU time goes; traces show where time is spent waiting.',
    },
    {
      label: 'Find hotspot',
      caption: {
        beginner: 'One part takes much longer than the rest. That is the part worth fixing.',
        intermediate: 'The largest slice of time is the bottleneck. Improving anything else barely changes the total.',
        expert: 'Amdahl\'s law: speeding up a part that is 10% of the time can improve the total by at most about 10%. Rank phases by share of time and by how fixable they are.',
      },
      state: { series: { time: [20, 420, 40, 60] }, mark: 1, changed: 'The DB query dominates the request.' },
      hood: 'Amdahl: max speedup from fixing a fraction f of the time is 1 / (1 - f).',
    },
    {
      label: 'Fix one thing',
      caption: {
        beginner: 'Change only the slow part, one change at a time, so you know what helped.',
        intermediate: 'Apply a single targeted fix such as an index, a cache or a batch call. Changing many things at once hides which one worked.',
        expert: 'Prefer fixes in order of cost: remove unnecessary work, fix algorithmic or query shape, cache, then add parallelism or hardware. Each step adds complexity.',
      },
      state: { series: { time: [20, 30, 40, 60] }, mark: 1, changed: 'An index brings the query down.' }, // VERIFY illustrative numbers
      hood: 'Order: eliminate work, improve algorithm, cache, parallelize, scale hardware.',
    },
    {
      label: 'Measure again',
      caption: {
        beginner: 'Check the new timings. If the total improved, keep the change; if not, undo it.',
        intermediate: 'Re-run the same load test and compare percentiles. A new bottleneck usually appears, so repeat.',
        expert: 'Compare under identical load and data, watch for regressions in other percentiles or resource use, and add a performance budget or alert so the gain is not silently lost.',
      },
      state: { series: { time: [20, 30, 40, 60] }, mark: 3, changed: 'The External API call is now the next bottleneck.' },
      hood: 'Guard the gain with a latency SLO and a regression test in CI.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A restaurant where customers wait too long. You time each stage (ordering, cooking, serving) and find the kitchen takes 20 minutes while the rest takes 5. Hiring more waiters will not help; fixing the kitchen will.',
      explanation: 'Do not guess why something is slow. Measure where time goes, fix the biggest piece, and measure again. Small fixes to the wrong part barely help.',
      keyTerms: [
        { term: 'Latency', meaning: 'How long one request takes.' },
        { term: 'Throughput', meaning: 'How many requests are handled per second.' },
        { term: 'Bottleneck', meaning: 'The slowest part that limits the whole system.' },
        { term: 'Profiler', meaning: 'A tool that shows where a program spends time.' },
        { term: 'Percentile (p99)', meaning: 'The latency that 99% of requests are faster than.' },
      ],
    },
    intermediate: {
      explanation: 'Performance work is a loop: define a target, measure under realistic load, find the bottleneck, change one thing, and measure again. Typical wins are removing redundant work, fixing queries, caching, batching and avoiding blocking calls.',
      howItWorks: [
        'Set a target such as p95 under 200 ms at expected load.',
        'Reproduce with a realistic load test and data size.',
        'Profile and trace to find the dominant phase.',
        'Apply one targeted fix.',
        'Re-measure and compare percentiles, not just averages.',
        'Repeat until the target is met, then stop.',
      ],
      tradeoffs: {
        use: [
          'Use profiling and tracing before any optimization.',
          'Use caching or batching on proven hot paths.',
          'Use performance budgets and alerts to protect gains.',
        ],
        avoid: [
          'Avoid optimizing code that is not on the critical path.',
          'Avoid micro-optimizations that harm readability for tiny gains.',
          'Avoid trusting averages; tail latency is what users feel.',
        ],
      },
      pitfalls: [
        'Premature optimization without measurements.',
        'Benchmarking on unrealistic data or an idle machine.',
        'Changing several things at once and not knowing what worked.',
        'Looking only at averages and missing p99 spikes.',
        'Fixing speed while breaking correctness or consistency.',
      ],
    },
    expert: {
      internals: [
        'Sampling profilers capture stacks at intervals with low overhead; flame graphs show where CPU time accumulates, while off-CPU analysis reveals waiting on locks, I/O or the network.',
        'Latency distributions are heavy-tailed; coordinated omission in naive load tools hides tail latency, so use tools that issue requests on a schedule.',
        'Little\'s law: in-flight requests = throughput x latency, which links concurrency limits to capacity.',
        'Queueing theory: latency rises sharply as utilization nears saturation, so headroom matters more than average load.',
        'Tail at scale: fan-out calls make p99 of the slowest dependency dominate the overall request.',
      ],
      failureModes: [
        'Optimizing a symptom while a lock or pool wait is the real cause.',
        'Cache added without invalidation, trading latency for stale data.',
        'Load tests passing in staging but failing in production due to data skew.',
        'Retries amplifying load once the system is near saturation.',
      ],
      scalingNotes: [
        'Scale out only after removing wasted work; otherwise you multiply inefficiency.',
        'Use hedged requests, timeouts and bulkheads to tame tail latency.',
        'Track SLOs with error budgets so performance work is prioritised against features.',
      ],
      realSystems: [
        'py-spy, cProfile, perf, eBPF tools and flame graphs for profiling.',
        'OpenTelemetry traces with Jaeger or Tempo for phase breakdown.',
        'k6, Locust, wrk2 and Gatling for load generation.',
      ],
      numbersToKnow: [
        'Latency numbers: memory access is nanoseconds, a same-datacenter round trip is around half a millisecond, a disk seek is milliseconds. // VERIFY approximate',
        'Amdahl: fixing a 10% slice can save at most about 10% overall.',
        'Utilization above roughly 70-80% on a single queue often makes latency climb steeply. // VERIFY workload dependent',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Time phases with a simple context manager',
      code: [
        'import time',
        'from contextlib import contextmanager',
        '',
        'timings = {}',
        '',
        '@contextmanager',
        'def phase(name):',
        '    start = time.perf_counter()',
        '    try:',
        '        yield',
        '    finally:',
        '        timings[name] = (time.perf_counter() - start) * 1000',
        '',
        'with phase("db"):',
        '    rows = load_orders()',
      ].join('\n'),
      annotations: [
        { line: 8, text: 'perf_counter is a monotonic high-resolution clock suited to measuring durations.' },
        { line: 11, text: 'finally records the time even if the phase raises.' },
        { line: 14, text: 'Wrap each phase to see which one dominates; in production prefer tracing spans.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why measure before optimizing?', answer: 'Guesses often target the wrong part. Measuring shows the real bottleneck so effort goes where it helps most.', followUps: ['What tools can you use?'] },
    { level: 'beginner', q: 'What is the difference between latency and throughput?', answer: 'Latency is the time for one request; throughput is how many requests finish per second. You can improve one without the other.', followUps: ['Can you give an example where they trade off?'] },
    { level: 'intermediate', q: 'Why look at p99 instead of the average?', answer: 'Averages hide slow outliers. Users and downstream callers experience the tail, and fan-out makes tail latency matter even more.', followUps: ['What causes tail latency?'] },
    { level: 'intermediate', q: 'The API is slow under load but fast alone. What do you check?', answer: 'Contention: connection pool exhaustion, locks, thread or worker limits, CPU saturation, or queueing. Reproduce with a load test and look at traces and resource metrics.', followUps: ['How would Little\'s law help?'] },
    { level: 'expert', q: 'You halved a query time but overall p99 barely moved. Why?', answer: 'Either the query was not on the dominant path, tail latency comes from another dependency or from queueing and GC pauses, or Amdahl limits the gain. Use traces to see the critical path and the slowest percentile separately.', followUps: ['How would you find the tail cause?'] },
    { level: 'expert', q: 'How do you keep a performance gain from regressing?', answer: 'Define SLOs and alerts, add benchmark or load checks in CI on key paths, track per-endpoint percentiles on dashboards, and review latency impact in code review for hot paths.', followUps: ['What is a performance budget?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What is the first step in optimizing a slow request?', options: ['Rewrite everything', 'Measure where time is spent', 'Buy a bigger server', 'Add more caching everywhere'], answerIndex: 1, why: 'Measurement identifies the real bottleneck.' },
    { level: 'beginner', q: 'Why change only one thing at a time?', options: ['It is faster to type', 'So you know which change had the effect', 'To avoid testing', 'Because code reviews require it'], answerIndex: 1, why: 'Isolated changes make cause and effect clear.' },
    { level: 'intermediate', q: 'A phase takes 10% of request time. Best possible total improvement from eliminating it?', options: ['About 10%', '50%', '90%', '100%'], answerIndex: 0, why: 'Amdahl\'s law caps the gain at the share of time you remove.' },
    { level: 'expert', q: 'Why can latency spike sharply as utilization approaches 100%?', options: ['Queues grow quickly when little spare capacity remains', 'CPUs get slower', 'Caches expire', 'DNS fails'], answerIndex: 0, why: 'Queueing delay grows non-linearly near saturation.' },
  ],
});
