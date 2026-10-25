/* Architecture: api-gateway */
Atlas.topics.push({
  id: 'api-gateway',
  category: 'architecture',
  title: 'API Gateway',
  source: {
    description: 'A single front door for routing, auth and limits.',
    steps: ['Client', 'Gateway (auth, limit)', 'Route to service', 'Aggregate response'],
  },
  estMinutes: 11,
  prereqs: ['microservices'],
  related: ['reverse-proxy', 'rate-limiting', 'microservices', 'security-best-practices'],
  tags: ['gateway', 'BFF', 'auth', 'routing', 'aggregation', 'Kong', 'rate limit'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'client', x: 8, y: 50 },
        { id: 'gw', label: 'API Gateway', kind: 'lb', x: 38, y: 50 },
        { id: 'orders', label: 'Orders', kind: 'service', x: 82, y: 20 },
        { id: 'users', label: 'Users', kind: 'service', x: 82, y: 80 },
      ],
      edges: [{ from: 'client', to: 'gw' }, { from: 'gw', to: 'orders' }, { from: 'gw', to: 'users' }],
    },
  },
  steps: [
    {
      label: 'Client',
      caption: {
        beginner: 'The app talks to one address instead of many.',
        intermediate: 'Clients call a single public endpoint, so they do not need to know how many services exist or where they live.',
        expert: 'A stable public contract lets you reshape internal services freely. Version the public API at the gateway, not in every service.',
      },
      state: { packets: [{ from: 'client', to: 'gw', tone: 'ok', label: 'GET /orders/7' }], active: ['client'], changed: 'One entry point is used.' },
      hood: 'Public API versioning lives at the edge.',
    },
    {
      label: 'Gateway (auth, limit)',
      caption: {
        beginner: 'A guard checks who you are and how often you knock.',
        intermediate: 'The gateway verifies tokens, applies rate limits, and rejects bad requests before they reach services.',
        expert: 'Centralize authentication (JWT validation, mTLS) and coarse limits at the edge, but keep authorization checks in services. Cache JWKS and keep the gateway stateless.',
      },
      state: { active: ['gw'], badges: { gw: 'auth + limit' }, changed: 'Auth and limits are applied once.' },
      hood: 'Authentication at the edge, authorization in each service.',
    },
    {
      label: 'Route to service',
      caption: {
        beginner: 'The guard sends you to the right desk.',
        intermediate: 'Path or host rules route the request to the right backend, with load balancing and timeouts.',
        expert: 'Add retries only for idempotent requests, timeouts per route, circuit breaking, and header propagation for tracing (traceparent).',
      },
      state: { packets: [{ from: 'gw', to: 'orders', tone: 'ok', label: '/orders' }], active: ['orders'], changed: 'The request reaches Orders.' },
      hood: 'Propagate trace headers and set per-route timeouts.',
    },
    {
      label: 'Aggregate response',
      caption: {
        beginner: 'Answers from several desks are bundled into one reply.',
        intermediate: 'The gateway can call several services and combine results so the client makes one request.',
        expert: 'Aggregation logic belongs in a focused BFF or composition layer; a smart gateway turns into a bottleneck and a deployment choke point. Handle partial failure explicitly.',
      },
      state: { packets: [{ from: 'gw', to: 'users', tone: 'ok', label: '/users/7' }, { from: 'orders', to: 'gw', tone: 'ok', label: 'order' }], active: ['gw', 'users'], changed: 'Results from two services are combined.' },
      hood: 'Keep business logic out of the gateway; use a BFF for composition.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'The reception desk of a large office building. Visitors announce who they are, get checked, and are directed to the right floor. They never wander the whole building.',
      explanation: 'An API gateway is the one public door into a system of many services. It checks identity, limits abuse, forwards each request to the right service and can combine several answers into one.',
      keyTerms: [
        { term: 'Gateway', meaning: 'The single entry point for client requests.' },
        { term: 'Routing', meaning: 'Choosing which service handles a request.' },
        { term: 'Authentication', meaning: 'Checking who the caller is.' },
        { term: 'Aggregation', meaning: 'Combining several service responses into one.' },
      ],
    },
    intermediate: {
      explanation: 'A gateway handles cross-cutting edge concerns: TLS, authentication, rate limiting, routing, logging and simple transformations. It simplifies clients and services but is a critical shared component.',
      howItWorks: [
        'Client sends a request to the gateway domain.',
        'Gateway terminates TLS and validates the token.',
        'Rate limits and request validation are applied.',
        'The route table maps the path to a backend service.',
        'The request is proxied with timeouts and trace headers.',
        'The response is returned, optionally aggregated or transformed.',
      ],
      tradeoffs: {
        use: [
          'Use when clients should see one stable API over many services.',
          'Use to enforce auth, quotas and logging in one place.',
          'Use a BFF per client type (web, mobile) for tailored responses.',
        ],
        avoid: [
          'Avoid putting business logic in the gateway.',
          'Avoid it for a single-service app where a reverse proxy suffices.',
          'Avoid making it a single point of failure; run several instances.',
        ],
      },
      pitfalls: [
        'Gateway becomes a bottleneck or a god service.',
        'Skipping authorization in services because the gateway checks tokens.',
        'No timeouts, so slow backends hold gateway connections.',
        'Misconfigured CORS or open admin routes.',
        'Single instance with no redundancy.',
      ],
    },
    expert: {
      internals: [
        'Gateways such as Kong, Envoy, NGINX, AWS API Gateway and Traefik are proxies with plugin or filter chains for auth, limits and transforms.',
        'JWT validation is local (signature and claims) using cached public keys; token introspection adds a network hop.',
        'Distributed rate limiting typically stores counters in Redis or uses local approximations with sync.',
        'Gateway-to-service traffic should be authenticated (mTLS or signed headers) so services are not directly reachable.',
      ],
      failureModes: [
        'Gateway outage takes down all APIs without redundancy.',
        'Expired or rotated signing keys rejecting valid tokens.',
        'Slow plugin or aggregation adding latency to every request.',
        'Misrouted traffic after a bad config push.',
      ],
      scalingNotes: [
        'Scale gateways horizontally and keep them stateless.',
        'Roll out config with canaries and validation.',
        'Offload static and cacheable content to a CDN.',
      ],
      realSystems: [
        'Kong, Envoy/Istio ingress, NGINX, Traefik, AWS API Gateway, Apigee, Azure API Management.',
        'GraphQL gateways (Apollo Router) for aggregation.',
        'Python BFFs built with FastAPI.',
      ],
      numbersToKnow: [
        'A well-tuned proxy adds typically sub-millisecond to a few milliseconds per hop. // VERIFY',
        'AWS API Gateway has default integration timeout limits (about 29 seconds for REST). // VERIFY current limit',
        'Gateways should be sized for peak with N+1 redundancy.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'Kong declarative route with auth and rate limit',
      code: [
        'services:',
        '  - name: orders',
        '    url: http://orders.internal:8000',
        '    routes:',
        '      - name: orders-route',
        '        paths: [/orders]',
        '    plugins:',
        '      - name: jwt',
        '      - name: rate-limiting',
        '        config: { minute: 60, policy: redis }',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'The internal address stays hidden from clients.' },
        { line: 8, text: 'JWT plugin verifies tokens before the request reaches the service.' },
        { line: 10, text: 'Shared Redis counters make the limit consistent across gateway instances.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does an API gateway do?', answer: 'It is the single entry point that authenticates, rate-limits and routes client requests to backend services.', followUps: ['Why not call services directly?'] },
    { level: 'beginner', q: 'Name two jobs a gateway commonly handles.', answer: 'Authentication and rate limiting, plus routing, TLS termination, logging and response aggregation.', followUps: ['Which jobs should stay in services?'] },
    { level: 'intermediate', q: 'API gateway vs reverse proxy?', answer: 'A reverse proxy forwards and balances traffic; a gateway is a reverse proxy plus API-level features like auth, quotas, transformation and developer management.', followUps: ['Can one tool be both?'] },
    { level: 'intermediate', q: 'What is the BFF pattern?', answer: 'A Backend for Frontend: a gateway tailored per client type (web, mobile) that aggregates and shapes data for that client.', followUps: ['What is the risk of one giant gateway?'] },
    { level: 'expert', q: 'Is validating a JWT at the gateway enough?', answer: 'No. Services still need authorization, and must not be reachable bypassing the gateway. Use mTLS or network policy and check scopes and resource ownership in the service.', followUps: ['How do you handle key rotation?'] },
    { level: 'expert', q: 'The gateway adds latency and became a bottleneck. What now?', answer: 'Scale it horizontally, remove heavy plugins and aggregation from the hot path, cache JWKS and responses, move composition to BFFs and use a CDN for cacheable content.', followUps: ['How do you test config changes safely?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A gateway is...', options: ['The single public entry to services', 'A database', 'A cache key', 'A CPU'], answerIndex: 0, why: 'It fronts all backend services.' },
    { level: 'beginner', q: 'Which job fits a gateway?', options: ['Rate limiting', 'Storing orders', 'Index tuning', 'Compiling code'], answerIndex: 0, why: 'Cross-cutting edge control.' },
    { level: 'intermediate', q: 'BFF stands for...', options: ['Backend for Frontend', 'Big Fast Function', 'Binary File Format', 'Broker For Failures'], answerIndex: 0, why: 'A client-specific gateway layer.' },
    { level: 'expert', q: 'Why still check authorization inside services?', options: ['The gateway only authenticates; services know resource rules', 'Gateways cannot read tokens', 'It is faster', 'HTTP forbids it'], answerIndex: 0, why: 'Defense in depth and fine-grained rules.' },
  ],
});
