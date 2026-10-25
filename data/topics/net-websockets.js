/* Networking: WebSockets. */
Atlas.topics.push({
  id: 'websockets',
  category: 'networking',
  title: 'WebSockets',
  source: {
    description: 'One persistent two-way connection for live updates.',
    steps: ['HTTP upgrade request', '101 Switching Protocols', 'Open socket', 'Both sides push messages'],
  },
  estMinutes: 10,
  prereqs: ['tcp-ip'],
  related: ['http-https', 'tcp-ip', 'event-driven-architecture', 'load-balancing'],
  tags: ['upgrade', 'realtime', 'ping/pong', 'SSE', 'long polling', 'backpressure'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'c', label: 'Browser' }, { id: 's', label: 'Server' }] },
  },
  steps: [
    {
      label: 'HTTP upgrade request',
      caption: {
        beginner: 'The browser asks the server to switch to a live two-way channel.',
        intermediate: 'A normal HTTP GET with Upgrade: websocket and a Sec-WebSocket-Key header.',
        expert: 'Authenticate here: cookies or a short-lived token in the first request, and validate the Origin header to prevent cross-site hijacking.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'GET /ws Upgrade: websocket', tone: 'plain' }] },
      hood: 'Check Origin and auth during the handshake.',
    },
    {
      label: '101 Switching Protocols',
      caption: {
        beginner: 'The server agrees.',
        intermediate: 'The server replies 101 with Sec-WebSocket-Accept, derived from the client key, proving it understands the protocol.',
        expert: 'After 101 the same TCP connection carries WebSocket frames, not HTTP. Proxies must be configured to pass Upgrade headers.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'Upgrade request', tone: 'plain' }, { from: 's', to: 'c', label: '101 Switching Protocols', tone: 'good', back: true }] },
      hood: 'Accept = base64(SHA1(key + GUID)).',
    },
    {
      label: 'Open socket',
      caption: {
        beginner: 'The line stays open, like a phone call.',
        intermediate: 'The connection remains open. Ping and pong frames keep it alive and detect dead peers.',
        expert: 'Each connection consumes memory and a file descriptor on a specific server, so capacity is measured in concurrent connections.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'ping', tone: 'plain' }, { from: 's', to: 'c', label: 'pong', tone: 'ok', back: true }] },
      hood: 'Idle timeouts at proxies require heartbeats.',
    },
    {
      label: 'Both sides push messages',
      caption: {
        beginner: 'Either side can send news at any time.',
        intermediate: 'Server and client send frames independently with no new request per message.',
        expert: 'Handle backpressure with bounded queues, drop or coalesce slow consumers and add reconnect with backoff and message resume ids on the client.',
      },
      state: { messages: [{ from: 's', to: 'c', label: 'price: 101.2', tone: 'good' }, { from: 'c', to: 's', label: 'subscribe BTC', tone: 'plain' }, { from: 's', to: 'c', label: 'price: 101.5', tone: 'good' }] },
      hood: 'Slow clients need bounded buffers.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Ordinary web requests are like sending letters: each question needs a new letter and a reply. A WebSocket is a phone call: once connected, either side can speak whenever they have something to say.',
      explanation: 'WebSockets keep one connection open so the server can push updates instantly, as in chat, live scores and dashboards, without the browser repeatedly asking.',
      keyTerms: [
        { term: 'Upgrade', meaning: 'Switching from HTTP to WebSocket.' },
        { term: 'Persistent connection', meaning: 'One connection kept open.' },
        { term: 'Frame', meaning: 'A message unit on the socket.' },
        { term: 'Ping/pong', meaning: 'Heartbeat to check the link.' },
        { term: 'Full duplex', meaning: 'Both sides can send at once.' },
      ],
    },
    intermediate: {
      explanation: 'Use WebSockets for low-latency, bidirectional, frequent messages. For one-way server pushes, Server-Sent Events are simpler. Plan for authentication, reconnection, scaling across servers and proxy timeouts.',
      howItWorks: [
        'Client sends an HTTP request with Upgrade headers.',
        'Server answers 101 and keeps the TCP connection.',
        'Both sides exchange frames.',
        'Heartbeats keep the connection alive.',
        'Either side sends a close frame to end it.',
        'Clients reconnect and resubscribe after drops.',
      ],
      tradeoffs: {
        use: [
          'Use for chat, collaboration, live dashboards and games.',
          'Use SSE for simple one-way streams over plain HTTP.',
          'Use a pub/sub backend (Redis, NATS) to fan out across servers.',
        ],
        avoid: [
          'Avoid when plain request/response or polling is enough.',
          'Avoid sticky state tied to one server without a shared bus.',
          'Avoid unauthenticated sockets.',
        ],
      },
      pitfalls: [
        'Proxies or load balancers closing idle connections.',
        'No reconnect logic or message resume.',
        'Checking auth only once and never revoking it.',
        'Unbounded send buffers for slow clients.',
        'Cross-site WebSocket hijacking from missing Origin checks.',
      ],
    },
    expert: {
      internals: [
        'RFC 6455 frames have opcode, mask bit and payload length; client-to-server frames are masked; messages can be fragmented.',
        'Compression (permessage-deflate) saves bandwidth at CPU and memory cost per connection.',
        'Servers use event loops (asyncio, epoll, Netty) to hold tens or hundreds of thousands of connections per node. // VERIFY',
        'Scaling out needs a broker for fan-out and a way to route a message to the node holding the user connection.',
      ],
      failureModes: [
        'Thundering reconnect storm after a deploy or outage.',
        'File descriptor and memory exhaustion.',
        'Half-open connections without heartbeats.',
        'Message loss on reconnect without sequence ids.',
      ],
      scalingNotes: [
        'Drain connections gradually on deploy and add jittered client backoff.',
        'Use least-connections balancing and limit per-user connections.',
        'Shard topics and use a pub/sub layer; measure per-connection memory.',
      ],
      realSystems: [
        'Socket.IO, FastAPI/Starlette WebSockets, Django Channels, Phoenix Channels.',
        'Redis Pub/Sub, NATS, Kafka as backplane; AWS API Gateway WebSocket APIs.',
        'Slack and Discord gateways use long-lived sockets with heartbeats.',
      ],
      numbersToKnow: [
        'Per-connection overhead is typically in the range of tens of KB. // VERIFY',
        'Common proxy idle timeouts are 60 seconds; send pings more often.',
        'Typical heartbeat intervals are 20-30 seconds.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'FastAPI WebSocket with auth and heartbeat',
      code: [
        '@app.websocket("/ws")',
        'async def ws(websocket: WebSocket, token: str):',
        '    user = verify_token(token)',
        '    if not user:',
        '        await websocket.close(code=1008)',
        '        return',
        '    await websocket.accept()',
        '    try:',
        '        while True:',
        '            msg = await asyncio.wait_for(websocket.receive_json(), timeout=60)',
        '            await websocket.send_json({"echo": msg})',
        '    except (WebSocketDisconnect, asyncio.TimeoutError):',
        '        pass',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Authenticate before accepting the connection.' },
        { line: 5, text: 'Close code 1008 signals a policy violation.' },
        { line: 10, text: 'A receive timeout drops silent or dead clients.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why use WebSockets instead of polling?', answer: 'The server can push updates immediately over one open connection, avoiding repeated requests and delay.', followUps: ['Name a use case.'] },
    { level: 'beginner', q: 'How does a WebSocket start?', answer: 'With an HTTP request asking to upgrade; the server responds 101 Switching Protocols and the connection then speaks WebSocket.', followUps: ['Which header asks for it?'] },
    { level: 'intermediate', q: 'WebSockets vs SSE vs long polling?', answer: 'WebSockets are bidirectional and binary-capable. SSE is one-way server push over HTTP with auto reconnect. Long polling holds requests open and is the most compatible but least efficient.', followUps: ['When choose SSE?'] },
    { level: 'intermediate', q: 'How do you scale WebSocket servers?', answer: 'Run many instances behind an L4 or L7 balancer that supports upgrades, and use a shared pub/sub backplane so a message reaches the node holding each recipient. Monitor connection counts and drain gracefully on deploys.', followUps: ['Do you need sticky sessions?'] },
    { level: 'expert', q: 'After a deploy, all clients reconnect at once and the service falls over. Fix?', answer: 'Drain gradually, make clients reconnect with exponential backoff and jitter, rate-limit handshakes, keep capacity headroom and use resumable subscriptions so reconnects are cheap.', followUps: ['What is a connection storm?'] },
    { level: 'expert', q: 'How do you secure WebSockets?', answer: 'Use wss (TLS), validate Origin, authenticate in the handshake with short-lived tokens, authorize every subscription, limit message sizes and rates, and handle token expiry on long-lived connections.', followUps: ['Why not put tokens in the URL?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A successful upgrade returns...', options: ['101', '200', '404', '500'], answerIndex: 0, why: '101 Switching Protocols.' },
    { level: 'beginner', q: 'WebSockets are good for...', options: ['Live two-way updates', 'Static pages', 'Database indexes', 'Compiling code'], answerIndex: 0, why: 'Low-latency pushes.' },
    { level: 'intermediate', q: 'For a one-way server stream, simpler is...', options: ['SSE', 'FTP', 'SMTP', 'SSH'], answerIndex: 0, why: 'Server-Sent Events.' },
    { level: 'expert', q: 'Reconnect storms are reduced by...', options: ['Backoff with jitter', 'Fixed 0s retry', 'More logs', 'Bigger MTU'], answerIndex: 0, why: 'Spreads reconnects over time.' },
  ],
});
