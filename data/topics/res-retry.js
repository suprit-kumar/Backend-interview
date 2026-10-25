/* Resilience: Retry Strategies & Exponential Backoff. Sim: retry-backoff. Worked: worked.js. */
Atlas.topics.push({
  id: 'retry-strategies-exponential-backoff',
  category: 'resilience',
  title: 'Retry Strategies & Exponential Backoff',
  source: {
    description: 'Wait longer after each failure, with jitter, to avoid retry storms.',
    steps: ['Call fails', 'Wait 1s', 'Wait 2s', 'Wait 4s then give up'],
  },
  estMinutes: 11,
  prereqs: ['idempotency'],
  related: ['circuit-breaker-pattern', 'idempotency', 'error-handling', 'rate-limiting'],
  tags: ['retry', 'backoff', 'jitter', 'retry storm', 'timeout', 'tenacity'],
  visual: {
    type: 'chart',
    config: {
      kind: 'bar', xLabel: 'Attempt', yLabel: 'Wait before retry', unit: 's',
      x: ['1', '2', '3', '4'], yMax: 10,
      series: [{ id: 'wait', label: 'Backoff wait', tone: 'accent', values: [0, 0, 0, 0] }],
    },
  },
  steps: [
    {
      label: 'Call fails',
      caption: {
        beginner: 'A request to another service fails, perhaps just for a moment.',
        intermediate: 'Transient failures (timeouts, 503, connection resets) are worth retrying; permanent ones (400, 404) are not.',
        expert: 'Classify errors first. Retrying a non-idempotent call without an idempotency key can duplicate side effects.',
      },
      state: { series: { wait: [0, 0, 0, 0] }, mark: 0, changed: 'The first attempt failed.' },
      hood: 'Retry only transient, idempotent operations.',
    },
    {
      label: 'Wait 1s',
      caption: {
        beginner: 'The client pauses a short time and tries again.',
        intermediate: 'Wait a base delay (for example 1s) before the first retry to give the service time to recover.',
        expert: 'Add random jitter so thousands of clients that failed together do not retry in lockstep.',
      },
      state: { series: { wait: [1, 0, 0, 0] }, mark: 0, changed: 'First wait: 1s (+ jitter).' },
      hood: 'Full jitter: sleep = random(0, min(cap, base * 2^n)).',
    },
    {
      label: 'Wait 2s',
      caption: {
        beginner: 'Still failing, so it waits twice as long.',
        intermediate: 'Delay doubles each attempt (exponential), easing pressure on a struggling service.',
        expert: 'Cap the maximum delay and the total retry budget so latency stays bounded and retries are a small fraction of traffic.',
      },
      state: { series: { wait: [1, 2, 0, 0] }, mark: 1, changed: 'Second wait: 2s.' },
      hood: 'Cap delay (e.g. 30s) and use a retry budget (~10% extra load).',
    },
    {
      label: 'Wait 4s then give up',
      caption: {
        beginner: 'After a few tries it stops and reports the problem instead of trying forever.',
        intermediate: 'After max attempts, return an error, fall back, or send to a dead-letter queue.',
        expert: 'Retry at one layer only; layered retries multiply load. Combine with a circuit breaker so persistent failure stops retries entirely.',
      },
      state: { series: { wait: [1, 2, 4, 0] }, mark: 2, changed: 'Third wait: 4s, then give up.' },
      hood: 'Retries at N layers multiply: 3 x 3 x 3 = 27 calls.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Calling a busy restaurant to book a table. If the line is engaged you wait a bit, then try again, then wait longer. If a hundred people all redial every second, nobody gets through, so each person waits a slightly different time.',
      explanation: 'Some failures are brief. Retrying can fix them, but retrying instantly and everywhere can overload the service. Exponential backoff waits longer each time and jitter adds randomness so clients spread out.',
      keyTerms: [
        { term: 'Retry', meaning: 'Trying a failed call again.' },
        { term: 'Exponential backoff', meaning: 'Doubling the wait after each failure.' },
        { term: 'Jitter', meaning: 'Random variation added to the wait.' },
        { term: 'Retry storm', meaning: 'Many clients retrying at once and overloading a service.' },
      ],
    },
    intermediate: {
      explanation: 'A good retry policy sets max attempts, base delay, cap, jitter and which errors qualify. It requires idempotent operations and works best with timeouts and a circuit breaker.',
      howItWorks: [
        'Call the dependency with a timeout.',
        'On a retryable error compute delay = min(cap, base * 2^attempt) with jitter.',
        'Sleep, then retry up to the maximum attempts.',
        'Honor Retry-After headers when provided.',
        'After the limit, fail, fall back or dead-letter.',
        'Record retry counts as metrics.',
      ],
      tradeoffs: {
        use: [
          'Use for transient network and 5xx errors on idempotent calls.',
          'Use jitter whenever many clients call the same service.',
          'Use a retry budget to bound extra load.',
        ],
        avoid: [
          'Avoid retrying non-idempotent calls without keys.',
          'Avoid retrying 4xx client errors.',
          'Avoid immediate, unbounded or layered retries.',
        ],
      },
      pitfalls: [
        'No jitter, so retries synchronize into waves.',
        'Retrying at every layer, multiplying load.',
        'No cap on delay or attempts.',
        'Ignoring Retry-After from a rate limiter.',
        'Retrying while the dependency is clearly down instead of tripping a breaker.',
      ],
    },
    expert: {
      internals: [
        'AWS analysis favors full jitter: sleep = random(0, min(cap, base * 2^n)), which gives the lowest total work under contention.',
        'Retry budgets (Envoy, Finagle) cap retries as a percentage of recent requests, so a failing dependency sees at most a small multiple of base load.',
        'Hedged requests send a duplicate after a latency threshold to cut tail latency, only for idempotent reads.',
        'Total latency budget must include all attempts; propagate deadlines so downstream stops when the caller has given up.',
      ],
      failureModes: [
        'Metastable failure: retries keep a recovering service overloaded.',
        'Duplicate side effects from retried non-idempotent calls.',
        'Thundering herd when many timers fire after an outage ends.',
        'Retries hiding a real problem until capacity is exhausted.',
      ],
      scalingNotes: [
        'Centralize policy in a client library or mesh, but avoid duplicating it at several layers.',
        'Pair with load shedding on the server so overload is rejected quickly.',
        'Alert on retry rate, not just final errors.',
      ],
      realSystems: [
        'Python tenacity and urllib3 Retry; AWS SDKs with jittered backoff; gRPC retry policy.',
        'Envoy and Istio retry budgets; Polly (.NET); Resilience4j (Java).',
        'Celery task retries with exponential backoff.',
      ],
      numbersToKnow: [
        'Typical policy: 3-5 attempts, base 100ms-1s, cap 20-60s. // VERIFY tune per service',
        'Layered retries: attempts multiply (3 x 3 x 3 = 27).',
        'Retry budget of about 10% of requests is a common starting point. // VERIFY',
      ],
    },
  },
  sim: 'retry-backoff',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Retry with exponential backoff and jitter (tenacity)',
      code: [
        'import httpx',
        'from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type',
        '',
        '@retry(',
        '    stop=stop_after_attempt(4),',
        '    wait=wait_exponential_jitter(initial=1, max=20),',
        '    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),',
        ')',
        'def fetch(url):',
        '    r = httpx.get(url, timeout=2)',
        '    r.raise_for_status()',
        '    return r.json()',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'Bounded attempts so failure eventually surfaces.' },
        { line: 6, text: 'Exponential growth with jitter, capped at 20 seconds.' },
        { line: 7, text: 'Retry only transient transport errors, not 4xx responses.' },
        { line: 10, text: 'Each attempt has its own timeout.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why not retry immediately in a loop?', answer: 'If the service is overloaded, instant retries add more load and make recovery harder. Waiting gives it time to recover.', followUps: ['How long should you wait?'] },
    { level: 'beginner', q: 'What is jitter?', answer: 'Random variation added to the wait so many clients do not all retry at the same moment.', followUps: ['What happens without it?'] },
    { level: 'intermediate', q: 'Which errors should you retry?', answer: 'Transient ones such as timeouts, connection resets, 503 and 429 (honoring Retry-After), and only for idempotent operations or with idempotency keys. Not 400 or 404.', followUps: ['Why is 500 debatable?'] },
    { level: 'intermediate', q: 'Why combine retries with a circuit breaker?', answer: 'Retries help short blips; if the dependency stays down, the breaker stops calls so retries do not pile load onto it and callers fail fast.', followUps: ['Which wraps which?'] },
    { level: 'expert', q: 'A dependency recovers but stays overloaded. Why?', answer: 'Retry amplification keeps load above capacity (metastable failure). Fix with retry budgets, jitter, backoff caps, load shedding and circuit breakers so load drops below capacity and the system recovers.', followUps: ['How would you test this?'] },
    { level: 'expert', q: 'Where should retries live in a microservice chain?', answer: 'At one layer, usually the edge-most caller with a propagated deadline. Inner layers fail fast, otherwise attempts multiply and latency budgets are blown.', followUps: ['How do hedged requests differ?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Exponential backoff means...', options: ['Waiting longer after each failure', 'Retrying instantly', 'Never retrying', 'Using one thread'], answerIndex: 0, why: 'Delays grow, commonly doubling.' },
    { level: 'beginner', q: 'Jitter prevents...', options: ['Synchronized retry waves', 'Timeouts', 'TLS', 'Indexing'], answerIndex: 0, why: 'Random delays spread clients out.' },
    { level: 'intermediate', q: 'Which should NOT be retried?', options: ['404 Not Found', 'Connection reset', 'Timeout', '503'], answerIndex: 0, why: 'Permanent errors will not change.' },
    { level: 'expert', q: 'Three layers each retry 3x. Worst case calls?', options: ['27', '9', '12', '3'], answerIndex: 0, why: 'Attempts multiply across layers.' },
  ],
});
