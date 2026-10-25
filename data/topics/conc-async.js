/* Concurrency & Messaging: Asynchronous Programming. Playground: js/sims/async-timeline.js. */
Atlas.topics.push({
  id: 'asynchronous-programming',
  category: 'concurrency-messaging',
  title: 'Asynchronous Programming',
  source: {
    description: 'One thread switches tasks while others wait on I/O.',
    steps: ['Start I/O', 'Yield to event loop', 'Run other tasks', 'Resume on completion'],
  },
  estMinutes: 14,
  prereqs: ['multithreading-concurrency'],
  related: ['multithreading-concurrency', 'message-queues', 'websockets', 'event-driven-architecture'],
  tags: ['asyncio', 'event loop', 'await', 'coroutine', 'non-blocking', 'I/O bound'],
  visual: {
    type: 'timeline-swimlane',
    config: {
      lanes: [{ id: 'a', label: 'Task A' }, { id: 'b', label: 'Task B' }, { id: 'loop', label: 'Event loop' }],
      total: 10,
      unit: 't',
      windows: [],
      blocks: [
        { lane: 'a', start: 0, end: 1, label: 'start I/O', kind: 'run' },
        { lane: 'a', start: 1, end: 6, label: 'awaiting network', kind: 'wait' },
        { lane: 'a', start: 6, end: 8, label: 'resume', kind: 'run' },
        { lane: 'b', start: 1, end: 3, label: 'runs', kind: 'run' },
        { lane: 'b', start: 3, end: 5, label: 'awaiting DB', kind: 'wait' },
        { lane: 'b', start: 5, end: 6, label: 'resume', kind: 'run' },
        { lane: 'loop', start: 0, end: 10, label: 'single thread switches tasks', kind: 'run' },
      ],
    },
  },
  steps: [
    {
      label: 'Start I/O',
      caption: {
        beginner: 'A task asks the network for data. Instead of staring at the door, it says "call me when it arrives".',
        intermediate: 'The coroutine starts a non-blocking I/O operation and reaches an await, registering interest with the event loop.',
        expert: 'The loop uses epoll, kqueue or IOCP to watch many sockets in one syscall. The operation is registered with a callback or future; no thread is blocked per request.',
      },
      state: { now: 1, changed: 'Task A starts a network call.' },
      hood: 'epoll (Linux), kqueue (BSD/macOS) and IOCP (Windows) watch many file descriptors cheaply.',
    },
    {
      label: 'Yield to event loop',
      caption: {
        beginner: 'The task steps aside so another task can use the single worker.',
        intermediate: 'await suspends the coroutine and returns control to the event loop, which picks the next ready task.',
        expert: 'Suspension is cooperative: a coroutine only yields at an await. A long CPU loop or a blocking call (time.sleep, requests) between awaits stalls every task on the loop.',
      },
      state: { now: 2, changed: 'Control passes to the event loop.' },
      hood: 'Cooperative scheduling: blocking code between awaits freezes the whole loop.',
    },
    {
      label: 'Run other tasks',
      caption: {
        beginner: 'While A waits, task B does its own work. Nothing sits idle.',
        intermediate: 'Other ready coroutines run in turn. Total time is close to the slowest wait, not the sum of all waits.',
        expert: 'Concurrency is bounded by file descriptors, memory per task and downstream limits, not by thread count. Use semaphores to cap concurrent calls to a dependency.',
      },
      state: { now: 4, changed: 'Task B runs while A waits.' },
      hood: 'asyncio.Semaphore caps concurrent calls to protect downstream services.',
    },
    {
      label: 'Resume on completion',
      caption: {
        beginner: 'When the answer arrives, task A picks up exactly where it left off.',
        intermediate: 'The event loop marks the coroutine ready; it resumes after the await with the result or an exception.',
        expert: 'Exceptions propagate through awaits, cancellation is delivered as CancelledError, and timeouts must be set explicitly (asyncio.timeout, wait_for) or a stuck call waits forever.',
      },
      state: { now: 7, changed: 'Task A resumes with its result.' },
      hood: 'Always set timeouts; handle CancelledError for cleanup.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A single chef who starts the soup, and while it simmers, chops vegetables and preps the salad instead of watching the pot. One chef, many dishes in progress, because waiting time is used for other work.',
      explanation: 'Async lets one thread juggle many tasks. When a task must wait for something slow like a network reply, it pauses and lets another task run. This is great for programs that spend most of their time waiting.',
      keyTerms: [
        { term: 'Async/await', meaning: 'Syntax to pause a task until a result is ready.' },
        { term: 'Event loop', meaning: 'The scheduler that switches between waiting and ready tasks.' },
        { term: 'Coroutine', meaning: 'A function that can pause and resume.' },
        { term: 'Non-blocking I/O', meaning: 'Starting a slow operation without waiting for it to finish.' },
        { term: 'I/O-bound', meaning: 'Work that mostly waits on network or disk.' },
      ],
    },
    intermediate: {
      explanation: 'Async programming multiplexes many I/O-bound tasks on one thread using an event loop. It scales to thousands of concurrent connections cheaply, but only works if code never blocks the loop and every awaited call is truly non-blocking.',
      howItWorks: [
        'A coroutine runs until it hits await on a pending operation.',
        'The loop suspends it and runs another ready coroutine.',
        'The OS notifies the loop when I/O completes.',
        'The loop resumes the waiting coroutine.',
        'asyncio.gather runs several coroutines concurrently and collects results.',
        'CPU-heavy or blocking calls go to executors (threads or processes).',
      ],
      tradeoffs: {
        use: [
          'Use async for many concurrent network calls, websockets and API gateways.',
          'Use it when thread-per-request memory would be too costly.',
          'Use gather with timeouts to fan out to several services in parallel.',
        ],
        avoid: [
          'Avoid async for CPU-bound work; it does not add cores.',
          'Avoid mixing blocking libraries into async code without an executor.',
          'Avoid it for simple scripts where it only adds complexity.',
        ],
      },
      pitfalls: [
        'Calling blocking functions (requests, time.sleep) inside async code.',
        'Forgetting await, so the coroutine never runs.',
        'Unbounded gather creating thousands of simultaneous calls.',
        'No timeouts on awaited calls.',
        'Swallowed exceptions in fire-and-forget tasks.',
      ],
    },
    expert: {
      internals: [
        'asyncio schedules callbacks in a ready queue and uses a selector (epoll, kqueue) to wait for I/O; coroutines are driven by send() until they yield a future.',
        'Each task is a small heap object, so tens of thousands of concurrent tasks cost far less than the same number of OS threads.',
        'Node.js uses libuv with a single JavaScript thread plus a worker pool for filesystem and DNS work; Python async frameworks include FastAPI/Starlette on uvicorn.',
        'Backpressure is not automatic: unbounded task creation or queues convert overload into memory growth.',
        'Structured concurrency (asyncio.TaskGroup, trio nurseries) ties child task lifetimes and errors to a parent scope.',
      ],
      failureModes: [
        'One blocking call freezing all requests on the loop (latency spikes across the service).',
        'Task leaks and unobserved exceptions from fire-and-forget tasks.',
        'Cancellation not handled, leaving connections or locks held.',
        'Thundering herds of concurrent calls overwhelming a downstream service.',
      ],
      scalingNotes: [
        'Run several worker processes (one loop per core) because a loop uses one core for Python code.',
        'Cap concurrency with semaphores and connection pools sized to downstream capacity.',
        'Monitor loop lag (time between scheduled and actual callbacks) to detect blocking code.',
      ],
      realSystems: [
        'Python asyncio, uvicorn, FastAPI, aiohttp, asyncpg; Node.js event loop; Go goroutines (runtime-multiplexed).',
        'Nginx and Redis use event-driven designs to handle many connections per thread.',
        'Java virtual threads and Kotlin coroutines offer alternative models.',
      ],
      numbersToKnow: [
        'Event-loop servers commonly handle tens of thousands of idle connections per process. // VERIFY hardware dependent',
        'A coroutine switch costs on the order of microseconds or less versus heavier OS thread context switches.',
        'Time for N parallel waits of equal length is about one wait, not N.',
      ],
    },
  },
  sim: 'async-timeline',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Concurrent calls with asyncio and a limit',
      code: [
        'import asyncio, httpx',
        '',
        'sem = asyncio.Semaphore(10)',
        '',
        'async def fetch(client, url):',
        '    async with sem:',
        '        r = await client.get(url, timeout=3)',
        '        return r.json()',
        '',
        'async def main(urls):',
        '    async with httpx.AsyncClient() as client:',
        '        return await asyncio.gather(*(fetch(client, u) for u in urls))',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'The semaphore caps in-flight requests so a big list cannot overwhelm the target.' },
        { line: 7, text: 'await yields to the loop while the network call is pending; the timeout prevents waiting forever.' },
        { line: 12, text: 'gather runs all fetches concurrently and returns results in input order.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does await do?', answer: 'It pauses the current coroutine until the awaited operation finishes, letting the event loop run other tasks in the meantime.', followUps: ['What happens if you forget await?'] },
    { level: 'beginner', q: 'When is async a good fit?', answer: 'When the program mostly waits on network or disk, such as web servers calling APIs and databases. It is not a fit for heavy CPU work.', followUps: ['Why not for CPU work?'] },
    { level: 'intermediate', q: 'Async versus threads: how do you choose?', answer: 'Async scales better for very many I/O-bound tasks with lower memory per task but needs async-compatible libraries. Threads work with blocking libraries and are simpler to adopt but cost more per task and share state.', followUps: ['Can you combine them?'] },
    { level: 'intermediate', q: 'What happens if you call time.sleep or requests.get inside an async function?', answer: 'It blocks the whole event loop, so every other task stalls. Use await asyncio.sleep, an async client, or run_in_executor.', followUps: ['How would you detect it?'] },
    { level: 'expert', q: 'An async service has random latency spikes across all endpoints. How do you investigate?', answer: 'Suspect a blocking call or CPU-heavy section on the loop. Measure loop lag, enable asyncio debug mode to flag slow callbacks, profile with py-spy, and move offending work to executors or other processes.', followUps: ['How do you prevent recurrence?'] },
    { level: 'expert', q: 'How do you apply backpressure in an async pipeline?', answer: 'Use bounded queues, semaphores and timeouts so producers slow down or shed load when consumers lag, rather than creating unbounded tasks that exhaust memory.', followUps: ['What do you do when the queue is full?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'What does the event loop do?', options: ['Compiles code', 'Switches between ready and waiting tasks', 'Stores data', 'Encrypts traffic'], answerIndex: 1, why: 'It runs ready tasks and resumes waiting ones when their I/O completes.' },
    { level: 'beginner', q: 'Async helps most with which workload?', options: ['I/O-bound', 'CPU-bound', 'GPU rendering', 'Compression'], answerIndex: 0, why: 'Waiting time is reused for other tasks.' },
    { level: 'intermediate', q: 'What breaks an async server most?', options: ['A blocking call inside a coroutine', 'Using await', 'Using gather', 'Type hints'], answerIndex: 0, why: 'Blocking stops the single thread, freezing all tasks.' },
    { level: 'expert', q: 'How do you cap concurrent downstream calls?', options: ['asyncio.Semaphore', 'Longer timeouts', 'More workers only', 'Disable await'], answerIndex: 0, why: 'A semaphore limits in-flight operations and protects dependencies.' },
  ],
});
