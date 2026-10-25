/* Architecture: load-balancing */
Atlas.topics.push({
  id: 'load-balancing',
  category: 'architecture',
  title: 'Load Balancing',
  source: {
    description: 'Spread traffic so no server is overloaded.',
    steps: ['Request', 'Balancer picks server', 'Server handles', 'Unhealthy servers skipped'],
  },
  estMinutes: 12,
  prereqs: ['reverse-proxy'],
  related: ['reverse-proxy', 'health-checks', 'scalability', 'high-availability'],
  tags: ['round robin', 'least connections', 'L4', 'L7', 'health check', 'consistent hashing', 'sticky sessions'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'client', label: 'Clients', kind: 'client', x: 8, y: 50 },
        { id: 'lb', label: 'Load balancer', kind: 'lb', x: 38, y: 50 },
        { id: 's1', label: 'Server 1', kind: 'service', x: 82, y: 15 },
        { id: 's2', label: 'Server 2', kind: 'service', x: 82, y: 50 },
        { id: 's3', label: 'Server 3', kind: 'service', x: 82, y: 85 },
      ],
      edges: [{ from: 'client', to: 'lb' }, { from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }, { from: 'lb', to: 's3' }],
    },
  },
  steps: [
    {
      label: 'Request',
      caption: {
        beginner: 'Many users send requests at once.',
        intermediate: 'All traffic arrives at one virtual address owned by the balancer.',
        expert: 'The VIP can be a cloud load balancer, anycast, or a pair of nodes with VRRP failover so the balancer itself is not a single point of failure.',
      },
      state: { packets: [{ from: 'client', to: 'lb', tone: 'ok', label: 'req' }], active: ['client'], changed: 'Requests reach the balancer.' },
      hood: 'Balancers need their own redundancy (VRRP/keepalived, cloud multi-AZ).',
    },
    {
      label: 'Balancer picks server',
      caption: {
        beginner: 'The balancer sends each request to a server, taking turns so nobody is overloaded.',
        intermediate: 'Policies: round robin (take turns), least connections (pick the least busy), weighted, or hash-based for stickiness.',
        expert: 'Round robin ignores request cost; least-connections and power-of-two-choices adapt better to uneven loads. Consistent hashing keeps cache affinity while servers come and go.',
      },
      state: { packets: [{ from: 'lb', to: 's1', tone: 'ok', label: 'req 1' }, { from: 'lb', to: 's2', tone: 'ok', label: 'req 2' }], active: ['lb'], badges: { lb: 'round robin' }, changed: 'Requests are spread across servers.' },
      hood: 'Power of two choices: sample two servers, pick the less loaded.',
    },
    {
      label: 'Server handles',
      caption: {
        beginner: 'The chosen server answers.',
        intermediate: 'Because any server can answer, state such as sessions must live in a shared store or in the token.',
        expert: 'Stateless services scale linearly behind a balancer. Sticky sessions hide state coupling and cause uneven load and lost sessions on node failure.',
      },
      state: { packets: [{ from: 's1', to: 'lb', tone: 'ok', label: '200' }], active: ['s1', 's2'], badges: { s1: 'busy', s2: 'busy' }, changed: 'Servers share the work.' },
      hood: 'Keep services stateless; store sessions in Redis or signed tokens.',
    },
    {
      label: 'Unhealthy servers skipped',
      caption: {
        beginner: 'If a server is broken, the balancer stops sending it work.',
        intermediate: 'Health checks (active probes or passive error tracking) remove failed servers and add them back when healthy.',
        expert: 'Tune interval, timeout and thresholds to avoid flapping. Use connection draining for deploys and slow start for freshly added servers so they are not flooded.',
      },
      state: { failed: ['s3'], packets: [{ from: 'lb', to: 's1', tone: 'ok', label: 'req' }, { from: 'lb', to: 's2', tone: 'ok', label: 'req' }], active: ['lb'], badges: { s3: 'unhealthy' }, changed: 'Server 3 is skipped.' },
      hood: 'Connection draining and slow start make deploys and recoveries smooth.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A supermarket with several checkout lanes and a staff member at the front pointing each shopper to a lane with a short queue. If a till breaks, the staff member stops sending people to it.',
      explanation: 'A load balancer shares incoming requests among several identical servers so none is overloaded. It also notices broken servers and avoids them, which keeps the site running when one machine fails.',
      keyTerms: [
        { term: 'Load balancer', meaning: 'A component that spreads requests across servers.' },
        { term: 'Round robin', meaning: 'Sending requests to servers in turn.' },
        { term: 'Least connections', meaning: 'Choosing the server with the fewest active requests.' },
        { term: 'Health check', meaning: 'A probe that tests whether a server is working.' },
        { term: 'Sticky session', meaning: 'Sending one user to the same server each time.' },
      ],
    },
    intermediate: {
      explanation: 'Balancers work at layer 4 (TCP, faster, content-blind) or layer 7 (HTTP, can route by path or header). They provide horizontal scaling, availability and rolling deploys, and require stateless backends.',
      howItWorks: [
        'Clients connect to a virtual IP or DNS name.',
        'The balancer selects an upstream by policy.',
        'It forwards the request or connection.',
        'Health checks continuously test each server.',
        'Failed servers are removed from rotation and restored when healthy.',
        'Draining lets in-flight requests finish before removing a server.',
      ],
      tradeoffs: {
        use: [
          'Use to scale stateless services horizontally.',
          'Use health checks to tolerate server failures automatically.',
          'Use L7 balancing for path-based routing and canary releases.',
        ],
        avoid: [
          'Avoid sticky sessions unless required; they skew load.',
          'Avoid round robin when request costs vary widely; use least connections.',
          'Avoid a single balancer instance with no failover.',
        ],
      },
      pitfalls: [
        'Server-local session state breaking when requests move.',
        'Health checks that only test the process, not dependencies, or too aggressive thresholds causing flapping.',
        'Uneven load from long-lived connections such as websockets.',
        'Forgetting that the balancer is itself a failure point.',
        'Retries that overload remaining servers during an outage.',
      ],
    },
    expert: {
      internals: [
        'L4 balancers forward packets using NAT or DSR and connection tracking; L7 balancers terminate HTTP and can inspect requests.',
        'Consistent hashing remaps only a fraction of keys when the server set changes, preserving cache locality (for example for cache clusters).',
        'Global load balancing uses DNS, anycast or geo routing to pick a region, and health-aware failover.',
        'Overload protection: concurrency limits, load shedding and adaptive algorithms such as peak EWMA or power-of-two-choices.',
      ],
      failureModes: [
        'Thundering herd onto remaining servers when one fails.',
        'Health check passing while the app is functionally broken (shallow check).',
        'Hot shard from hash-based routing with skewed keys.',
        'Connection exhaustion on the balancer.',
      ],
      scalingNotes: [
        'Keep capacity headroom so N-1 servers can handle peak.',
        'Autoscale on load signals; use slow start for new instances.',
        'Use multi-AZ balancers and failover across regions for high availability.',
      ],
      realSystems: [
        'HAProxy, Nginx, Envoy, AWS ALB/NLB, Google Cloud LB, Azure Front Door, Maglev, Katran.',
        'Kubernetes Services and Ingress; kube-proxy and service meshes.',
        'DNS-based balancing with Route 53 health checks.',
      ],
      numbersToKnow: [
        'Plan so remaining servers can absorb the failed share: with N servers losing one needs about N/(N-1) capacity headroom.',
        'Typical health check intervals are a few seconds with 2-3 failures to mark unhealthy. // VERIFY',
        'DNS TTL controls how fast DNS-based failover takes effect.',
      ],
    },
  },
  sim: 'load-balancer',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Least-connections and power-of-two-choices',
      code: [
        'import random',
        '',
        'class Server:',
        '    def __init__(self, name):',
        '        self.name, self.active, self.healthy = name, 0, True',
        '',
        'def pick(servers):',
        '    pool = [s for s in servers if s.healthy]',
        '    a, b = random.sample(pool, 2) if len(pool) > 1 else (pool[0], pool[0])',
        '    return a if a.active <= b.active else b',
      ].join('\n'),
      annotations: [
        { line: 8, text: 'Unhealthy servers are excluded before choosing.' },
        { line: 9, text: 'Sample two servers at random instead of scanning all.' },
        { line: 10, text: 'Choosing the less loaded of two gives near-optimal balance cheaply.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does a load balancer do?', answer: 'It spreads incoming requests across several servers so none is overloaded and skips servers that are down.', followUps: ['Why does that improve availability?'] },
    { level: 'beginner', q: 'Round robin vs least connections?', answer: 'Round robin sends requests in turn; least connections sends to the server with the fewest active requests, which handles uneven request costs better.', followUps: ['When is round robin fine?'] },
    { level: 'intermediate', q: 'L4 vs L7 load balancing?', answer: 'L4 balances TCP connections without reading content and is fast. L7 understands HTTP so it can route by path, header or cookie and do TLS termination, at higher cost.', followUps: ['Which for gRPC or websockets?'] },
    { level: 'intermediate', q: 'Why are sticky sessions discouraged?', answer: 'They tie users to a server, causing uneven load and session loss on failure. Prefer stateless services with sessions in a shared store or signed tokens.', followUps: ['When are they acceptable?'] },
    { level: 'expert', q: 'When one of 4 servers fails, the rest also fail. Why?', answer: 'Capacity was not provisioned for N-1: the remaining three take 33% more load, and retries amplify it, causing cascading failure. Keep headroom, use load shedding, circuit breakers and retry budgets.', followUps: ['How do you test it?'] },
    { level: 'expert', q: 'How does consistent hashing help a cache fleet?', answer: 'Keys map to a ring so adding or removing a node moves only about 1/N of keys, avoiding a mass cache miss. Virtual nodes smooth the distribution.', followUps: ['What are hot keys\' effects?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A health check is used to...', options: ['Detect failed servers', 'Compress files', 'Create indexes', 'Sign tokens'], answerIndex: 0, why: 'Unhealthy servers are removed from rotation.' },
    { level: 'beginner', q: 'Round robin means...', options: ['Servers take turns', 'Random user choice', 'Largest first', 'All to one'], answerIndex: 0, why: 'Requests rotate across servers.' },
    { level: 'intermediate', q: 'L7 balancers can...', options: ['Route by URL path', 'Only see IP packets', 'Not terminate TLS', 'Skip health checks'], answerIndex: 0, why: 'They understand HTTP.' },
    { level: 'expert', q: 'Consistent hashing benefit?', options: ['Few keys move when nodes change', 'No hashing needed', 'Faster disks', 'Encrypts keys'], answerIndex: 0, why: 'Only a fraction remap.' },
  ],
});
