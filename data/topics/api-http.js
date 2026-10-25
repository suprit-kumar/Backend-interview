/* API & Web: HTTP / HTTPS. */
Atlas.topics.push({
  id: 'http-https',
  category: 'api-web',
  title: 'HTTP / HTTPS',
  source: {
    description: 'A request/response protocol; HTTPS wraps it in TLS.',
    steps: ['TCP connect', 'TLS handshake', 'Request', 'Response'],
  },
  estMinutes: 14,
  prereqs: ['networking-fundamentals'],
  related: ['rest-apis', 'tcp-ip', 'dns', 'reverse-proxy', 'security-best-practices'],
  tags: ['http', 'https', 'tls', 'headers', 'keep-alive', 'http/2', 'http/3', 'cookies', 'caching', 'certificates'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'browser', label: 'Browser' }, { id: 'server', label: 'Server' }] },
  },
  steps: [
    {
      label: 'TCP connect',
      caption: {
        beginner: 'Before talking, the browser and server shake hands to agree they can hear each other, like a phone call being picked up.',
        intermediate: 'After DNS gives the IP address, the client opens a TCP connection with SYN, SYN-ACK, ACK. That costs one round trip before any data flows.',
        expert: 'Connection setup latency is one RTT for TCP, plus TLS. Keep-alive and connection pooling amortise it. HTTP/3 uses QUIC over UDP, merging transport and TLS handshakes and avoiding TCP head-of-line blocking.',
      },
      state: { messages: [{ from: 'browser', to: 'server', label: 'SYN', tone: 'primary' }, { from: 'server', to: 'browser', label: 'SYN-ACK', tone: 'primary', back: true }, { from: 'browser', to: 'server', label: 'ACK', tone: 'primary' }] },
    },
    {
      label: 'TLS handshake',
      caption: {
        beginner: 'They agree on a secret code so nobody listening on the wire can read the conversation, and the server proves it really is who it claims to be.',
        intermediate: 'In HTTPS the client sends supported ciphers, the server replies with its certificate, the client verifies it against trusted authorities and the hostname, and both derive shared session keys.',
        expert: 'TLS 1.3 completes in one round trip (zero with resumption, with replay caveats) and uses ephemeral key exchange for forward secrecy. Certificates are validated by chain, expiry, hostname (SAN) and revocation status.',
      },
      state: { messages: [{ from: 'browser', to: 'server', label: 'ClientHello (ciphers, SNI)', tone: 'accent' }, { from: 'server', to: 'browser', label: 'ServerHello + certificate', tone: 'accent', back: true }, { from: 'browser', to: 'server', label: 'key exchange, Finished', tone: 'ok' }] },
      hood: 'SNI lets one IP host many certificates; the client verifies the chain to a trusted root.',
    },
    {
      label: 'Request',
      caption: {
        beginner: 'Now, safely, the browser asks for what it wants: "GET /index.html please".',
        intermediate: 'A request has a start line (method, path, version), headers (Host, Accept, Cookie, Authorization) and an optional body. Everything is encrypted when using HTTPS.',
        expert: 'HTTP/1.1 sends one request at a time per connection (browsers open several), HTTP/2 multiplexes streams with header compression (HPACK), HTTP/3 does so over QUIC. Headers like Host, Content-Length and Transfer-Encoding drive request framing, and framing bugs cause request smuggling.',
      },
      state: { messages: [{ from: 'browser', to: 'server', label: 'GET /index.html HTTP/1.1  Host: example.com', tone: 'accent' }] },
    },
    {
      label: 'Response',
      caption: {
        beginner: 'The server sends back the page and a status number. The browser can keep the line open for the next question.',
        intermediate: 'A response has a status line, headers (Content-Type, Cache-Control, Set-Cookie) and a body. Keep-alive reuses the connection for the next request.',
        expert: 'Cache-Control, ETag and Vary decide what intermediaries may reuse. Set security headers (Strict-Transport-Security, Content-Security-Policy, Secure and HttpOnly cookies). Compress text bodies and stream large ones.',
      },
      state: { messages: [{ from: 'server', to: 'browser', label: '200 OK  Content-Type: text/html', tone: 'ok', back: true }, { from: 'browser', to: 'server', label: 'next request, same connection', tone: 'primary' }] },
    },
  ],
  levels: {
    beginner: {
      analogy: 'Sending a letter by courier. First you confirm the courier is at the door (connect). For HTTPS you also check their ID and agree on a sealed envelope that only the recipient can open (encryption). Then you hand over your request, and they bring back a reply with a note saying whether it worked.',
      explanation: 'HTTP is the language browsers and servers use to ask for things and answer. The browser sends a request, such as "give me this page", and the server sends a response with the content and a status code. HTTPS is the same conversation inside an encrypted tunnel (TLS), so others on the network cannot read or change it, and you know you are talking to the right website.',
      keyTerms: [
        { term: 'Request / response', meaning: 'The browser asks, the server answers.' },
        { term: 'Header', meaning: 'Extra labelled information sent with a request or response.' },
        { term: 'Status code', meaning: 'A number telling how the request went (200 OK, 404 Not Found).' },
        { term: 'TLS', meaning: 'The encryption layer that makes HTTP into HTTPS.' },
        { term: 'Certificate', meaning: 'A digital ID that proves a website is who it claims to be.' },
      ],
    },
    intermediate: {
      explanation: 'HTTP is a stateless, text-based (in 1.x) application protocol on top of TCP. HTTPS adds TLS between TCP and HTTP. A full cold request costs DNS lookup, TCP handshake, TLS handshake and then the request round trip, so reuse of connections, caching and CDNs matter for speed.',
      howItWorks: [
        'DNS resolves the hostname to an IP address.',
        'TCP three-way handshake opens a reliable connection (one round trip).',
        'TLS handshake authenticates the server by certificate and derives symmetric session keys.',
        'The client sends a request: method, path, headers and optional body.',
        'The server responds with a status code, headers and body, and may keep the connection alive for reuse.',
        'Methods describe intent; headers control caching, content type, cookies and authentication.',
      ],
      tradeoffs: {
        use: [
          'Use HTTPS for everything, including internal APIs when they cross networks you do not fully trust.',
          'Use HTTP/2 or HTTP/3 for many small requests to the same host (multiplexing, header compression).',
          'Use keep-alive and connection pools for service-to-service calls to avoid repeated handshakes.',
        ],
        avoid: [
          'Avoid plain HTTP on public traffic; credentials and cookies can be read or modified in transit.',
          'Avoid putting secrets in URLs; they land in logs, history and referrer headers.',
          'Avoid long-lived requests through proxies with short idle timeouts; use async patterns or streaming.',
        ],
      },
      pitfalls: [
        'Disabling certificate verification "to make it work" in client code.',
        'Forgetting that headers and URLs are logged, leaking tokens.',
        'Treating GET as safe for actions (unsubscribe links triggered by link prefetchers).',
        'Mixed content: an HTTPS page loading HTTP resources.',
        'No timeouts on outbound HTTP calls, which can exhaust worker threads when a dependency hangs.',
      ],
    },
    expert: {
      internals: [
        'HTTP/1.1 uses persistent connections and optional pipelining (rarely used) and suffers head-of-line blocking per connection. HTTP/2 multiplexes frames in streams on one TCP connection but TCP loss still stalls all streams. HTTP/3 runs on QUIC (UDP) with per-stream loss recovery.',
        'TLS 1.3 handshake: ClientHello with key share, ServerHello with key share, certificate and Finished; the session keys come from ECDHE, giving forward secrecy. Resumption with 0-RTT data is replayable, so only use it for idempotent requests.',
        'Certificate validation: chain to a trusted root, validity period, hostname match in SAN, and revocation (OCSP stapling, CRLs). mTLS adds client certificates for service identity.',
        'Message framing uses Content-Length or chunked transfer encoding; disagreements between proxies and servers cause request smuggling.',
        'HSTS tells browsers to use HTTPS only for a period, preventing downgrade attacks.',
      ],
      failureModes: [
        'Expired certificates causing hard outages; automate renewal (ACME, Let\'s Encrypt) and monitor expiry.',
        'Slowloris-style slow requests holding connections open; mitigate with header and body timeouts at the proxy.',
        'Idle timeout mismatches between load balancer and server causing sporadic 502 or reset errors on reused connections.',
        'Cache poisoning or leaking personalised responses through a missing Vary or Cache-Control: private.',
        'Retrying non-idempotent requests after connection resets.',
      ],
      scalingNotes: [
        'Terminate TLS at a load balancer or reverse proxy (hardware acceleration, session resumption) and re-encrypt internally where required.',
        'Use CDNs and HTTP caching to avoid origin round trips; HTTP/2 or 3 reduces connection counts.',
        'Tune connection pools, keep-alive timeouts and maximum concurrent streams; set client timeouts for connect, read and total.',
      ],
      realSystems: [
        'nginx, Envoy, HAProxy and cloud load balancers terminating TLS and speaking HTTP/2.',
        'Let\'s Encrypt with ACME for automated certificates; cert-manager in Kubernetes.',
        'Cloudflare, Fastly and other CDNs serving HTTP/3.',
      ],
      numbersToKnow: [
        'A cold HTTPS request needs roughly DNS + 1 RTT (TCP) + 1 RTT (TLS 1.3) + 1 RTT (request); TLS 1.2 needed 2 RTTs for its handshake.',
        'Default ports: HTTP 80, HTTPS 443.',
        'Let\'s Encrypt certificates last 90 days. // VERIFY current policy, lifetimes are being shortened across the industry',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'requests: timeouts, a pooled session and certificate verification',
      code: [
        'import requests',
        'from requests.adapters import HTTPAdapter',
        '',
        'session = requests.Session()           # reuses TCP/TLS connections',
        'session.mount("https://", HTTPAdapter(pool_connections=10, pool_maxsize=20))',
        '',
        'resp = session.get(',
        '    "https://api.example.com/users/1",',
        '    headers={"Accept": "application/json"},',
        '    timeout=(3.05, 10),                # (connect, read) seconds',
        ')',
        'resp.raise_for_status()',
        'print(resp.status_code, resp.headers["Content-Type"])',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'A Session keeps connections alive, saving the TCP and TLS handshakes on later calls.' },
        { line: 10, text: 'Always set timeouts; requests has none by default and a hung server can block your worker forever.' },
        { line: 12, text: 'raise_for_status turns 4xx and 5xx into exceptions instead of silent failures. Certificates are verified by default; never pass verify=False in production.' },
      ],
    },
    {
      lang: 'bash',
      title: 'curl: see DNS, TCP, TLS and request timing',
      code: [
        'curl -sS -o /dev/null -w "dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\\n" https://example.com/',
        'curl -vI https://example.com/ 2>&1 | grep -E "TLS|subject|expire|HTTP/"',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Each time_* value is cumulative; subtract the previous one to see the phase cost.' },
        { line: 2, text: 'Shows the negotiated TLS version, certificate subject and expiry, and HTTP version.' },
      ],
    },
  ],
  interview: [
    {
      level: 'beginner',
      q: 'What is the difference between HTTP and HTTPS?',
      answer: 'HTTPS is HTTP carried inside TLS encryption. It keeps data private, prevents tampering in transit and lets the browser verify the server\'s identity with a certificate. HTTP alone sends everything in readable form.',
      followUps: ['What does the padlock icon tell you?', 'Does HTTPS hide which site you visit?'],
    },
    {
      level: 'beginner',
      q: 'What happens when you type a URL and press Enter?',
      answer: 'The browser resolves the domain with DNS, opens a TCP connection, for HTTPS performs the TLS handshake, sends an HTTP request, receives the response, and then renders the page, fetching more resources the same way.',
      followUps: ['Which steps can be skipped for a repeat visit?', 'Where does caching happen?'],
    },
    {
      level: 'intermediate',
      q: 'Compare HTTP/1.1, HTTP/2 and HTTP/3.',
      answer: 'HTTP/1.1 handles one request at a time per connection, so browsers open several. HTTP/2 multiplexes many streams over one TCP connection with header compression, but one lost packet stalls all streams. HTTP/3 uses QUIC over UDP, with per-stream loss recovery and faster connection setup.',
      followUps: ['Why is TCP head-of-line blocking a problem?', 'Does HTTP/2 help a service-to-service call?'],
    },
    {
      level: 'intermediate',
      q: 'How does a client decide whether to trust a server certificate?',
      answer: 'It builds a chain from the server certificate up to a root CA in its trust store, checks signatures and validity dates, confirms the hostname appears in the certificate\'s SAN, and may check revocation. If any step fails the connection is rejected.',
      followUps: ['What is certificate pinning?', 'What is mutual TLS?'],
    },
    {
      level: 'expert',
      q: 'Users see sporadic 502 errors behind a load balancer even though the app is healthy. What do you check?',
      answer: 'Compare idle timeouts: if the server closes keep-alive connections before the load balancer\'s idle timeout, the LB may reuse a connection the server already closed and get a reset. Set the server keep-alive timeout longer than the LB idle timeout, check graceful shutdown and deregistration delay during deploys, health checks, and upstream timeouts. Confirm with LB and server logs and packet captures.',
      followUps: ['How do graceful shutdowns avoid 502s?', 'What metrics would reveal this?'],
    },
    {
      level: 'expert',
      q: 'How would you reduce latency for users far from your servers?',
      answer: 'Terminate TLS close to the user at CDN or edge locations, cache static and cacheable API responses, use HTTP/2 or HTTP/3 with persistent connections to the origin, enable TLS 1.3 and session resumption, compress responses, and consider regional deployments with data replication for dynamic content. Measure with real-user monitoring and per-phase timing.',
      followUps: ['What are the risks of 0-RTT resumption?', 'How do you keep caches from serving personalised data?'],
    },
  ],
  quiz: [
    {
      level: 'beginner',
      q: 'What does HTTPS add on top of HTTP?',
      options: ['Faster servers', 'Encryption and server authentication via TLS', 'A database', 'Larger pages'],
      answerIndex: 1,
      why: 'HTTPS is HTTP over TLS: private, tamper-resistant and authenticated to the server identity.',
    },
    {
      level: 'intermediate',
      q: 'Which is the correct order for a first HTTPS request?',
      options: ['TLS, TCP, DNS, request', 'DNS, TCP, TLS, request', 'Request, DNS, TCP, TLS', 'TCP, DNS, request, TLS'],
      answerIndex: 1,
      why: 'The name is resolved first, then a TCP connection is opened, TLS is negotiated, and only then is the encrypted request sent.',
    },
    {
      level: 'intermediate',
      q: 'Why should outbound HTTP calls always have a timeout?',
      options: ['To make the response bigger', 'So a hung dependency cannot block your worker indefinitely', 'Because HTTP requires it', 'To disable TLS'],
      answerIndex: 1,
      why: 'Without timeouts, slow or dead dependencies tie up threads or connections and cascade into your own outage.',
    },
    {
      level: 'expert',
      q: 'Why is TLS 0-RTT early data risky?',
      options: ['It disables encryption', 'It can be replayed by an attacker', 'It only works on HTTP/1.0', 'It makes certificates expire'],
      answerIndex: 1,
      why: 'Early data is not protected against replay, so it should only carry idempotent requests.',
    },
  ],
});
