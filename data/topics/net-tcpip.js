/* Networking: TCP/IP. */
Atlas.topics.push({
  id: 'tcp-ip',
  category: 'networking',
  title: 'TCP/IP',
  source: {
    description: 'Reliable ordered delivery over unreliable packets.',
    steps: ['SYN', 'SYN-ACK', 'ACK', 'Data with acknowledgements'],
  },
  estMinutes: 11,
  prereqs: ['networking-fundamentals'],
  related: ['networking-fundamentals', 'websockets', 'http-https', 'connection-pooling'],
  tags: ['handshake', 'congestion control', 'retransmission', 'TIME_WAIT', 'window', 'keep-alive'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'c', label: 'Client' }, { id: 's', label: 'Server' }] },
  },
  steps: [
    {
      label: 'SYN',
      caption: {
        beginner: 'The client says "hello, can we talk?"',
        intermediate: 'The client sends SYN with an initial sequence number to open a connection.',
        expert: 'The server keeps half-open state in the SYN queue; SYN cookies defend against SYN floods.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'SYN seq=x', tone: 'plain' }] },
      hood: 'Half-open connections live in the SYN backlog.',
    },
    {
      label: 'SYN-ACK',
      caption: {
        beginner: 'The server answers "yes, I hear you".',
        intermediate: 'The server replies with SYN-ACK, acknowledging x+1 and choosing its own sequence number.',
        expert: 'This exchange also negotiates MSS, window scaling, SACK and timestamps via TCP options.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'SYN seq=x', tone: 'plain' }, { from: 's', to: 'c', label: 'SYN-ACK seq=y ack=x+1', tone: 'ok', back: true }] },
      hood: 'Options negotiated: MSS, window scale, SACK.',
    },
    {
      label: 'ACK',
      caption: {
        beginner: 'The client confirms, and the line is open.',
        intermediate: 'The client sends ACK, and the connection is established after one round trip.',
        expert: 'The handshake costs a full RTT before data (TLS adds more). Connection reuse, keep-alive, TCP Fast Open and QUIC reduce this cost.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'SYN', tone: 'plain' }, { from: 's', to: 'c', label: 'SYN-ACK', tone: 'ok', back: true }, { from: 'c', to: 's', label: 'ACK', tone: 'good' }] },
      hood: 'One RTT of setup before the first byte.',
    },
    {
      label: 'Data with acknowledgements',
      caption: {
        beginner: 'Data flows in pieces, and each piece is confirmed. Missing pieces are sent again.',
        intermediate: 'Data segments carry sequence numbers; the receiver ACKs them and lost segments are retransmitted, restoring order.',
        expert: 'Sliding windows provide flow control; congestion control (CUBIC, BBR) adapts the sending rate to loss and delay. Retransmission timeouts back off exponentially.',
      },
      state: { messages: [{ from: 'c', to: 's', label: 'DATA seq=1..1460', tone: 'plain' }, { from: 's', to: 'c', label: 'ACK 1461', tone: 'good', back: true }, { from: 'c', to: 's', label: 'DATA (lost)', tone: 'bad' }, { from: 'c', to: 's', label: 'retransmit', tone: 'ok' }] },
      hood: 'Window = min(receiver window, congestion window).',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A phone call with a bad line. You say hello and wait for the other person to say hello back before talking. As you read out a long address, they repeat each part back, and anything they missed you say again.',
      explanation: 'TCP makes an unreliable network behave reliably. It opens a connection with a three-step greeting, numbers every piece of data, confirms what arrived and resends what is lost, so the receiver gets everything in order.',
      keyTerms: [
        { term: 'Handshake', meaning: 'The three-step start: SYN, SYN-ACK, ACK.' },
        { term: 'Sequence number', meaning: 'Numbers bytes to keep order.' },
        { term: 'ACK', meaning: 'Confirms data was received.' },
        { term: 'Retransmission', meaning: 'Resending lost data.' },
        { term: 'Congestion control', meaning: 'Slowing down when the network is overloaded.' },
      ],
    },
    intermediate: {
      explanation: 'TCP gives a reliable, ordered byte stream with flow and congestion control. The price is handshake latency, head-of-line blocking after loss and per-connection state. Reuse connections to amortize setup.',
      howItWorks: [
        'Three-way handshake opens the connection.',
        'Data is split into segments with sequence numbers.',
        'The receiver ACKs and advertises its window.',
        'Lost segments are retransmitted after timeout or duplicate ACKs.',
        'Congestion control adjusts the rate.',
        'A FIN/ACK exchange closes the connection.',
      ],
      tradeoffs: {
        use: [
          'Use TCP when every byte must arrive in order (HTTP, databases, SSH).',
          'Use keep-alive and pooling to avoid repeated handshakes.',
          'Use UDP-based protocols such as QUIC when head-of-line blocking hurts.',
        ],
        avoid: [
          'Avoid opening a new connection per request.',
          'Avoid unbounded timeouts that hang forever.',
          'Avoid TCP for latency-critical lossy real-time media.',
        ],
      },
      pitfalls: [
        'Not setting connect and read timeouts.',
        'Many short connections leaving sockets in TIME_WAIT.',
        'Nagle\'s algorithm and delayed ACK interacting to add 40 ms latency on small writes.',
        'Assuming one send equals one receive; TCP is a stream with no message boundaries.',
        'Half-open connections after a peer crash undetected without keep-alive.',
      ],
    },
    expert: {
      internals: [
        'Sender tracks cwnd and ssthresh: slow start doubles cwnd per RTT until loss, then congestion avoidance; fast retransmit triggers on 3 duplicate ACKs.',
        'CUBIC is the default on Linux; BBR models bandwidth and RTT instead of reacting to loss.',
        'Close sequence goes FIN_WAIT, TIME_WAIT (2xMSL) to absorb late packets; SO_REUSEADDR and port ranges matter for busy clients.',
        'Kernel buffers (rmem, wmem) and the bandwidth-delay product determine achievable throughput.',
      ],
      failureModes: [
        'SYN flood exhausting backlog.',
        'Retransmission timeouts causing multi-second stalls on loss.',
        'Bufferbloat inflating latency.',
        'Accept queue overflow dropping connections under load.',
      ],
      scalingNotes: [
        'Tune somaxconn and backlog; use SO_REUSEPORT for multi-process accept.',
        'Raise initial congestion window and enable window scaling for long fat networks.',
        'Use TLS session resumption and HTTP/2 or HTTP/3 to cut handshakes.',
      ],
      realSystems: [
        'Linux TCP stack with CUBIC or BBR; Nginx and HAProxy tuned backlogs.',
        'QUIC and HTTP/3 (Google, Cloudflare); TCP Fast Open.',
        'ss -ti, tcpdump and Wireshark for analysis.',
      ],
      numbersToKnow: [
        'Handshake costs 1 RTT; TLS 1.3 adds 1 more (0 with resumption).',
        'TIME_WAIT lasts 60 seconds on Linux. // VERIFY',
        'Initial congestion window is commonly 10 segments (about 14 KB). // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Client socket with timeouts and keep-alive',
      code: [
        'import socket',
        's = socket.create_connection(("api.example.com", 443), timeout=3)',
        's.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)',
        's.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)',
        's.settimeout(5)',
        's.sendall(b"PING\\n")',
        'data = s.recv(4096)',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'The connect timeout bounds the handshake.' },
        { line: 3, text: 'TCP_NODELAY disables Nagle for latency-sensitive small writes.' },
        { line: 4, text: 'Keep-alive detects dead peers on idle connections.' },
        { line: 7, text: 'recv may return partial data: TCP is a stream, so loop until you have a full message.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Describe the TCP three-way handshake.', answer: 'Client sends SYN, server replies SYN-ACK, client sends ACK. Then both sides can send data.', followUps: ['Why three steps?'] },
    { level: 'beginner', q: 'How does TCP ensure reliable delivery?', answer: 'Sequence numbers, acknowledgements and retransmission of lost segments, plus checksums.', followUps: ['What about ordering?'] },
    { level: 'intermediate', q: 'What is TIME_WAIT and why does it matter?', answer: 'After closing, the side that closes first keeps the socket in TIME_WAIT for about 2xMSL to absorb delayed packets. Many short connections can exhaust ephemeral ports; reuse connections or use pooling.', followUps: ['How can you reduce it?'] },
    { level: 'intermediate', q: 'TCP flow control vs congestion control?', answer: 'Flow control protects the receiver using its advertised window. Congestion control protects the network by limiting the congestion window based on loss and delay.', followUps: ['Which is smaller wins?'] },
    { level: 'expert', q: 'Small writes show 40 ms latency. Why?', answer: 'Nagle\'s algorithm holds small segments waiting for an ACK while the peer delays its ACK. Set TCP_NODELAY or batch writes.', followUps: ['When is Nagle useful?'] },
    { level: 'expert', q: 'Why is HTTP/3 over QUIC faster on lossy networks?', answer: 'QUIC runs over UDP with per-stream loss recovery, so a lost packet blocks only its stream instead of all multiplexed streams as in TCP, and it combines transport and TLS handshakes.', followUps: ['What are its costs?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Handshake order is...', options: ['SYN, SYN-ACK, ACK', 'ACK, SYN, FIN', 'FIN, ACK, SYN', 'GET, POST, PUT'], answerIndex: 0, why: 'Three steps open a connection.' },
    { level: 'beginner', q: 'Lost data is...', options: ['Retransmitted', 'Ignored', 'Encrypted', 'Cached forever'], answerIndex: 0, why: 'TCP resends unacknowledged segments.' },
    { level: 'intermediate', q: 'Too many short connections cause...', options: ['TIME_WAIT buildup', 'Faster DNS', 'Smaller MTU', 'Less CPU'], answerIndex: 0, why: 'Ephemeral ports get tied up.' },
    { level: 'expert', q: 'TCP_NODELAY disables...', options: ['Nagle\'s algorithm', 'Checksums', 'ACKs', 'Windowing'], answerIndex: 0, why: 'Small writes are sent immediately.' },
  ],
});
