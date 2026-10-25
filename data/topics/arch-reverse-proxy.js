/* Architecture: reverse-proxy */
Atlas.topics.push({
  id: 'reverse-proxy',
  category: 'architecture',
  title: 'Reverse Proxy',
  source: {
    description: 'Sits in front of servers to terminate TLS, cache and route.',
    steps: ['Client', 'Proxy (Nginx)', 'Pick backend', 'Return response'],
  },
  estMinutes: 10,
  prereqs: ['networking-fundamentals'],
  related: ['api-gateway', 'load-balancing', 'dns', 'caching'],
  tags: ['nginx', 'tls termination', 'proxy', 'upstream', 'caching', 'haproxy'],
  visual: {
    type: 'topology',
    config: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'client', x: 8, y: 50 },
        { id: 'proxy', label: 'Nginx', kind: 'lb', x: 38, y: 50 },
        { id: 'app1', label: 'App 1', kind: 'service', x: 82, y: 25 },
        { id: 'app2', label: 'App 2', kind: 'service', x: 82, y: 75 },
      ],
      edges: [{ from: 'client', to: 'proxy' }, { from: 'proxy', to: 'app1' }, { from: 'proxy', to: 'app2' }],
    },
  },
  steps: [
    {
      label: 'Client',
      caption: {
        beginner: 'The browser connects to the proxy, not directly to the app.',
        intermediate: 'Clients see only the proxy\'s address; backend servers stay hidden on a private network.',
        expert: 'Hiding origins reduces attack surface and lets you swap, drain or scale backends without DNS changes.',
      },
      state: { packets: [{ from: 'client', to: 'proxy', tone: 'ok', label: 'HTTPS' }], active: ['client'], changed: 'Traffic arrives at the proxy.' },
      hood: 'The proxy owns the public IP; backends use private addresses.',
    },
    {
      label: 'Proxy (Nginx)',
      caption: {
        beginner: 'The proxy handles the secure connection and may answer common requests itself.',
        intermediate: 'It terminates TLS, can serve cached or static content, compress responses and enforce basic limits.',
        expert: 'TLS termination moves handshake CPU off the app; use HTTP/2 or 3 to clients and keep-alive upstream. Buffering protects slow-client situations (slowloris) from tying up app workers.',
      },
      state: { active: ['proxy'], badges: { proxy: 'TLS + cache' }, changed: 'TLS ends here; cache is checked.' },
      hood: 'Request buffering protects app workers from slow clients.',
    },
    {
      label: 'Pick backend',
      caption: {
        beginner: 'It chooses which app server will do the work.',
        intermediate: 'Routing rules (host, path) and a balancing policy select an upstream server, skipping failed ones.',
        expert: 'Set upstream keepalive, timeouts, max_fails and retry rules carefully; retrying non-idempotent requests can duplicate side effects.',
      },
      state: { packets: [{ from: 'proxy', to: 'app1', tone: 'ok', label: 'proxy_pass' }], active: ['app1'], changed: 'App 1 is chosen.' },
      hood: 'proxy_next_upstream should not retry non-idempotent requests by default.',
    },
    {
      label: 'Return response',
      caption: {
        beginner: 'The answer goes back through the proxy to the client.',
        intermediate: 'The proxy relays the response, adds headers, and may cache it for the next client.',
        expert: 'Forward the real client IP via X-Forwarded-For or PROXY protocol and trust it only from known proxies, or IP-based limits and logs become spoofable.',
      },
      state: { packets: [{ from: 'app1', to: 'proxy', tone: 'ok', label: '200' }, { from: 'proxy', to: 'client', tone: 'ok', label: '200 (cached next time)' }], active: ['proxy'], changed: 'Response returns, possibly cached.' },
      hood: 'Trust X-Forwarded-For only from your own proxies.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A hotel front desk. Guests never go straight to the kitchen; the desk takes the request, may answer simple questions itself, and passes the rest to the right staff. The guests do not need to know how the hotel is organized.',
      explanation: 'A reverse proxy sits in front of your servers. Users talk to it, and it forwards requests to the real servers. It can handle security certificates, remember common answers and spread work around.',
      keyTerms: [
        { term: 'Reverse proxy', meaning: 'A server that forwards client requests to backend servers.' },
        { term: 'TLS termination', meaning: 'Ending the encrypted connection at the proxy.' },
        { term: 'Upstream', meaning: 'The backend servers behind the proxy.' },
        { term: 'Cache', meaning: 'A stored copy of a response reused for later requests.' },
      ],
    },
    intermediate: {
      explanation: 'A reverse proxy such as Nginx, HAProxy or Envoy fronts applications to terminate TLS, serve static content, cache, compress, route and balance. It differs from a forward proxy, which sits in front of clients.',
      howItWorks: [
        'Client connects to the proxy and completes the TLS handshake.',
        'The proxy matches a server block or route to an upstream group.',
        'It serves a cached or static response if possible.',
        'Otherwise it forwards to a healthy upstream server.',
        'It streams the response back and may store it in cache.',
        'Access logs and metrics record the exchange.',
      ],
      tradeoffs: {
        use: [
          'Use to terminate TLS and offload static assets.',
          'Use to route several apps under one domain.',
          'Use to add caching, compression and basic protection.',
        ],
        avoid: [
          'Avoid stuffing business logic into proxy config.',
          'Avoid running a single proxy instance without redundancy.',
          'Avoid caching personalized responses without correct Vary or cache keys.',
        ],
      },
      pitfalls: [
        'Trusting client-supplied X-Forwarded-For.',
        'Timeouts shorter than the slowest legitimate request, causing 504 errors.',
        'Caching authenticated responses and leaking data.',
        'Not forwarding Host and protocol headers, breaking redirects.',
        'Missing upstream keepalive, causing connection churn.',
      ],
    },
    expert: {
      internals: [
        'Nginx uses an event-driven worker model (epoll) so a few workers handle many thousands of connections.',
        'Upstream keepalive reuses backend connections; without it each request pays TCP setup.',
        'The PROXY protocol conveys the original client address at L4 without HTTP headers.',
        'Cache keys, Vary headers and Cache-Control determine safe reuse; micro-caching of a second or two can absorb spikes on dynamic pages.',
      ],
      failureModes: [
        'Worker or file descriptor limits reached under a connection surge.',
        'Stale DNS for upstream hostnames after backend changes.',
        'Cache stampede on expiry of a hot key.',
        'Config reload errors dropping connections if mishandled.',
      ],
      scalingNotes: [
        'Run several proxies behind DNS or a cloud load balancer.',
        'Tune worker_connections, keepalive and buffers to traffic.',
        'Push cacheable content to a CDN.',
      ],
      realSystems: [
        'Nginx, HAProxy, Envoy, Traefik, Caddy, Apache httpd.',
        'Cloud layers: AWS ALB, Google Cloud Load Balancing, Cloudflare.',
        'Python apps typically run behind Nginx with gunicorn or uvicorn.',
      ],
      numbersToKnow: [
        'A single Nginx instance can handle tens of thousands of concurrent connections on modest hardware. // VERIFY',
        'Common default proxy_read_timeout in Nginx is 60 seconds.',
        'TLS handshakes cost extra round trips; session resumption and TLS 1.3 reduce them.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'bash',
      title: 'Nginx reverse proxy to two app servers',
      code: [
        'upstream app {',
        '    server 10.0.0.11:8000 max_fails=3 fail_timeout=10s;',
        '    server 10.0.0.12:8000 max_fails=3 fail_timeout=10s;',
        '    keepalive 32;',
        '}',
        'server {',
        '    listen 443 ssl http2;',
        '    location / {',
        '        proxy_pass http://app;',
        '        proxy_set_header Host $host;',
        '        proxy_set_header X-Forwarded-For $remote_addr;',
        '        proxy_read_timeout 30s;',
        '    }',
        '}',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Servers failing repeatedly are skipped for a cool-down period.' },
        { line: 4, text: 'Keepalive reuses upstream connections to avoid repeated TCP setup.' },
        { line: 11, text: 'Set (do not append) the client address so spoofed headers are not trusted.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a reverse proxy?', answer: 'A server in front of backend servers that receives client requests and forwards them, hiding the backends and handling shared tasks like TLS.', followUps: ['How is it different from a forward proxy?'] },
    { level: 'beginner', q: 'What is TLS termination?', answer: 'The proxy decrypts HTTPS so backends can receive plain HTTP on a private network, or re-encrypts if needed.', followUps: ['What are the security trade-offs?'] },
    { level: 'intermediate', q: 'Reverse proxy vs load balancer?', answer: 'A load balancer distributes traffic across servers; a reverse proxy forwards and can add TLS, caching and routing. Many tools (Nginx, HAProxy, Envoy) do both.', followUps: ['L4 versus L7?'] },
    { level: 'intermediate', q: 'Why do you get 502 or 504 errors from Nginx?', answer: '502 means the upstream returned an invalid response or is unreachable; 504 means it timed out. Check backend health, timeouts and worker capacity.', followUps: ['How would you debug it?'] },
    { level: 'expert', q: 'How do you preserve the real client IP safely?', answer: 'Use PROXY protocol or X-Forwarded-For set by your own proxy, and configure the app to trust it only from known proxy addresses. Otherwise clients can spoof it and bypass IP limits.', followUps: ['What about multiple proxy layers?'] },
    { level: 'expert', q: 'How would micro-caching help a spiky dynamic endpoint?', answer: 'Caching a response for 1-2 seconds collapses many identical requests into one backend hit, with request coalescing (proxy_cache_lock) preventing a stampede, at the cost of brief staleness.', followUps: ['Which endpoints must never be cached?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A reverse proxy sits in front of...', options: ['Servers', 'Browsers only', 'CPUs', 'Disks'], answerIndex: 0, why: 'It fronts backend servers.' },
    { level: 'beginner', q: 'TLS termination means...', options: ['Ending the encrypted connection at the proxy', 'Deleting certificates', 'Blocking HTTPS', 'Compressing data'], answerIndex: 0, why: 'The proxy handles decryption.' },
    { level: 'intermediate', q: 'A 504 from the proxy usually means...', options: ['Upstream timed out', 'Page not found', 'Unauthorized', 'Too many redirects'], answerIndex: 0, why: 'Gateway timeout.' },
    { level: 'expert', q: 'Why not trust any X-Forwarded-For header?', options: ['Clients can spoof it', 'It is encrypted', 'It is too long', 'HTTP/2 removes it'], answerIndex: 0, why: 'Only trust it from your own proxies.' },
  ],
});
