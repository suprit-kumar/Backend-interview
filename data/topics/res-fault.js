/* Resilience: Fault Tolerance. */
Atlas.topics.push({
  id: 'fault-tolerance',
  category: 'resilience',
  title: 'Fault Tolerance',
  source: {
    description: 'The system keeps working when parts break.',
    steps: ['Redundant parts', 'Detect failure', 'Fail over', 'Continue serving'],
  },
  estMinutes: 11,
  prereqs: ['load-balancing'],
  related: ['high-availability', 'health-checks', 'circuit-breaker-pattern', 'database-replication'],
  tags: ['redundancy', 'failover', 'bulkhead', 'graceful degradation', 'timeouts', 'chaos'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'client', label: 'Clients', kind: 'client', x: 8, y: 50 },
        { id: 'lb', label: 'Balancer', kind: 'lb', x: 36, y: 50 },
        { id: 'a', label: 'Replica A', kind: 'service', x: 80, y: 25 },
        { id: 'b', label: 'Replica B', kind: 'service', x: 80, y: 75 },
      ],
      edges: [{ from: 'client', to: 'lb' }, { from: 'lb', to: 'a' }, { from: 'lb', to: 'b' }],
    },
  },
  steps: [
    {
      label: 'Redundant parts',
      caption: {
        beginner: 'There is more than one copy of every important part, like a spare tyre.',
        intermediate: 'Critical components run as multiple replicas so one failure does not remove the capability.',
        expert: 'Redundancy only helps if failures are independent. Replicas sharing a rack, zone, config push or dependency fail together (correlated failure).',
      },
      state: { active: ['a', 'b'], packets: [{ from: 'lb', to: 'a', tone: 'ok', label: 'req' }, { from: 'lb', to: 'b', tone: 'ok', label: 'req' }], changed: 'Two replicas share the load.' },
      hood: 'Spread replicas across failure domains: host, rack, zone.',
    },
    {
      label: 'Detect failure',
      caption: {
        beginner: 'The system notices that one part has stopped working.',
        intermediate: 'Health checks, timeouts and error rates reveal a failed replica quickly.',
        expert: 'Failure detection is probabilistic: slow is hard to distinguish from dead. Tune timeouts and thresholds to balance fast detection against false alarms.',
      },
      state: { failed: ['a'], active: ['lb'], badges: { a: 'down' }, changed: 'Replica A has failed.' },
      hood: 'Slow vs dead: choose timeouts from observed latency percentiles.',
    },
    {
      label: 'Fail over',
      caption: {
        beginner: 'Work is sent to the healthy copy instead.',
        intermediate: 'Traffic is routed away from the failed replica; for stateful systems a standby is promoted.',
        expert: 'Stateful failover needs fencing so a stale primary cannot keep writing (split brain). Retried requests must be idempotent.',
      },
      state: { failed: ['a'], packets: [{ from: 'lb', to: 'b', tone: 'ok', label: 'all traffic' }], active: ['b'], changed: 'Traffic shifts to Replica B.' },
      hood: 'Fencing tokens or STONITH prevent split brain on promotion.',
    },
    {
      label: 'Continue serving',
      caption: {
        beginner: 'Users keep getting answers, maybe a bit slower.',
        intermediate: 'The service continues, possibly with reduced capacity or features (graceful degradation).',
        expert: 'The survivor must handle the extra load. Plan N+1 capacity, shed low-priority work and disable optional features so the core path stays up.',
      },
      state: { failed: ['a'], packets: [{ from: 'b', to: 'lb', tone: 'ok', label: '200' }], active: ['b'], badges: { b: 'degraded' }, changed: 'Service continues in degraded mode.' },
      hood: 'Plan N+1; shed optional work first.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A plane with several engines. If one fails, the others keep it flying and it lands safely. Designers assume parts will fail and build the plane so that one failure is not a disaster.',
      explanation: 'Fault tolerance means a system carries on working when some of its parts fail. It uses spare copies, notices failures fast, and switches work to healthy parts, accepting that things will break.',
      keyTerms: [
        { term: 'Redundancy', meaning: 'Having spare copies of components.' },
        { term: 'Failover', meaning: 'Switching work from a failed part to a healthy one.' },
        { term: 'Graceful degradation', meaning: 'Offering reduced service instead of failing completely.' },
        { term: 'Single point of failure', meaning: 'One part whose failure stops everything.' },
      ],
    },
    intermediate: {
      explanation: 'Fault tolerance combines redundancy, failure detection, isolation and recovery. Patterns include replication, timeouts, retries, circuit breakers, bulkheads and fallbacks.',
      howItWorks: [
        'Run multiple replicas across failure domains.',
        'Detect failures via health checks and timeouts.',
        'Route around failures with a balancer or failover.',
        'Isolate faults with bulkheads and circuit breakers.',
        'Degrade gracefully using fallbacks and cached data.',
        'Recover automatically and test with failure injection.',
      ],
      tradeoffs: {
        use: [
          'Use replicas and failover for critical user paths.',
          'Use bulkheads so one failing dependency cannot exhaust shared resources.',
          'Use graceful degradation for non-essential features.',
        ],
        avoid: [
          'Avoid redundancy that shares a hidden single point of failure.',
          'Avoid complex failover paths you never test.',
          'Avoid masking failures forever; surface and fix them.',
        ],
      },
      pitfalls: [
        'Untested failover that fails when needed.',
        'Correlated failures from shared dependencies or bad deploys.',
        'Failover causing overload of survivors.',
        'Split brain with two primaries accepting writes.',
        'Retry storms during partial failure.',
      ],
    },
    expert: {
      internals: [
        'Availability of N independent replicas needed in parallel is 1 - (1 - a)^N, but correlated failures break this arithmetic.',
        'Consensus protocols (Raft, Paxos) let a majority tolerate f failures with 2f+1 nodes.',
        'Fencing tokens and leases ensure only one leader acts after failover.',
        'Bulkheads partition resources (thread pools, connection pools) per dependency so overload stays local.',
      ],
      failureModes: [
        'Gray failures: a node that is slow or partially broken but passes health checks.',
        'Cascading overload after failover.',
        'Split brain after a network partition.',
        'Configuration pushes breaking all replicas at once.',
      ],
      scalingNotes: [
        'Test with chaos engineering: kill instances, add latency, partition networks.',
        'Stagger deploys and use canaries to avoid correlated failure.',
        'Define what can degrade and what must never fail.',
      ],
      realSystems: [
        'Netflix Chaos Monkey and Hystrix lineage; Kubernetes self-healing; etcd and ZooKeeper quorums.',
        'PostgreSQL with Patroni, Redis Sentinel, Kafka replication, multi-AZ cloud services.',
        'Resilience4j and Polly libraries for patterns in code.',
      ],
      numbersToKnow: [
        'Two independent 99% components in parallel give 99.99% availability in theory.',
        'Raft needs a majority: 3 nodes tolerate 1 failure, 5 tolerate 2.',
        'Failover times range from seconds (load balancer) to tens of seconds (database promotion). // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Fallback and bulkhead for an optional dependency',
      code: [
        'import asyncio, httpx',
        '',
        'reco_slots = asyncio.Semaphore(20)',
        '',
        'async def recommendations(user_id, cache):',
        '    try:',
        '        async with reco_slots:',
        '            async with httpx.AsyncClient(timeout=0.3) as c:',
        '                r = await c.get(f"http://reco/users/{user_id}")',
        '                r.raise_for_status()',
        '                return r.json()',
        '    except (httpx.HTTPError, asyncio.TimeoutError):',
        '        return cache.get(f"reco:{user_id}", [])',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'A semaphore limits concurrent calls so a slow dependency cannot consume all workers (bulkhead).' },
        { line: 8, text: 'A tight timeout keeps the page fast even when the dependency struggles.' },
        { line: 13, text: 'Graceful degradation: serve stale or empty recommendations instead of failing the page.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is fault tolerance?', answer: 'The ability of a system to keep working when some components fail, usually through redundancy and failover.', followUps: ['Give a real example.'] },
    { level: 'beginner', q: 'What is a single point of failure?', answer: 'One component whose failure takes the whole system down, such as a single database server or load balancer.', followUps: ['How do you remove one?'] },
    { level: 'intermediate', q: 'What is graceful degradation?', answer: 'Continuing to serve the core function with reduced features when something fails, for example showing cached recommendations or hiding a widget.', followUps: ['How do you decide what degrades?'] },
    { level: 'intermediate', q: 'What is a bulkhead?', answer: 'Isolating resources per dependency (separate pools or queues) so one failing dependency cannot exhaust shared resources and sink everything.', followUps: ['Give an example with thread pools.'] },
    { level: 'expert', q: 'Why does failover sometimes make outages worse?', answer: 'Survivors receive extra load and may overload, health checks may flap, retries multiply, and promoted stateful nodes may split brain. Plan N+1, add load shedding, fencing and backoff, and rehearse failover.', followUps: ['How do you test it safely?'] },
    { level: 'expert', q: 'What is a gray failure?', answer: 'A component that is degraded or intermittently wrong yet passes simple health checks. Detect it with real-request metrics, outlier detection and deep checks rather than process liveness alone.', followUps: ['How does outlier ejection help?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Failover means...', options: ['Switching to a healthy component', 'Deleting data', 'Adding features', 'Slowing down'], answerIndex: 0, why: 'Work moves from a failed part.' },
    { level: 'beginner', q: 'Which removes a single point of failure?', options: ['Redundant replicas', 'One bigger server', 'More logging', 'A cache'], answerIndex: 0, why: 'Spares take over.' },
    { level: 'intermediate', q: 'A bulkhead...', options: ['Isolates resources per dependency', 'Encrypts traffic', 'Indexes rows', 'Compresses logs'], answerIndex: 0, why: 'Faults stay contained.' },
    { level: 'expert', q: 'Raft with 5 nodes tolerates how many failures?', options: ['2', '1', '3', '5'], answerIndex: 0, why: 'A majority (3 of 5) must remain.' },
  ],
});
