/* Networking: Fundamentals. */
Atlas.topics.push({
  id: 'networking-fundamentals',
  category: 'networking',
  title: 'Networking Fundamentals',
  source: {
    description: 'Layers move data from app to wire and back.',
    steps: ['App data', 'Transport segments', 'IP packets', 'Link frames'],
  },
  estMinutes: 11,
  prereqs: [],
  related: ['tcp-ip', 'dns', 'http-https', 'websockets'],
  tags: ['OSI', 'TCP/IP model', 'encapsulation', 'IP', 'port', 'MTU', 'latency'],
  visual: {
    type: 'layers',
    config: {
      payload: 'GET /orders',
      layers: [
        { id: 'app', label: 'Application', unit: 'message', header: 'HTTP', detail: 'GET /orders' },
        { id: 'tr', label: 'Transport', unit: 'segment', header: 'TCP :443', detail: 'ports, ordering' },
        { id: 'ip', label: 'Internet', unit: 'packet', header: 'IP 203.0.113.5', detail: 'addressing, routing' },
        { id: 'link', label: 'Link', unit: 'frame', header: 'Ethernet MAC', detail: 'next hop on the wire' },
      ],
    },
  },
  steps: [
    {
      label: 'App data',
      caption: {
        beginner: 'Your program creates a message, such as a web request.',
        intermediate: 'The application layer (HTTP, DNS, gRPC) produces data meant for another program.',
        expert: 'The app talks to the OS through the socket API, which hands bytes to the kernel network stack.',
      },
      state: { active: ['app'], wrapped: [] },
      hood: 'Sockets are the boundary between app and kernel.',
    },
    {
      label: 'Transport segments',
      caption: {
        beginner: 'The message is cut into numbered pieces and labelled with a port.',
        intermediate: 'TCP or UDP adds source and destination ports. TCP also adds sequence numbers for reliable ordered delivery.',
        expert: 'Segment size is bounded by MSS (derived from MTU). TCP adds flow control, congestion control and retransmission.',
      },
      state: { active: ['tr'], wrapped: ['app'] },
      hood: 'Ports identify the process; TCP adds reliability.',
    },
    {
      label: 'IP packets',
      caption: {
        beginner: 'Each piece gets the destination address, like a street address.',
        intermediate: 'IP adds source and destination addresses. Routers read them to forward packets hop by hop.',
        expert: 'Routing uses longest-prefix match. Packets can be dropped, reordered or duplicated; IP gives best effort only. TTL prevents loops.',
      },
      state: { active: ['ip'], wrapped: ['app', 'tr'] },
      hood: 'Best-effort delivery; TTL decrements per hop.',
    },
    {
      label: 'Link frames',
      caption: {
        beginner: 'Finally the data is turned into signals on the cable or Wi-Fi.',
        intermediate: 'The link layer wraps the packet in a frame with MAC addresses for the next hop and sends it on the physical medium.',
        expert: 'ARP resolves the next hop\'s MAC. Frames larger than the MTU (commonly 1500 bytes on Ethernet) are fragmented or avoided via path MTU discovery.',
      },
      state: { active: ['link'], wrapped: ['app', 'tr', 'ip', 'link'] },
      hood: 'Each hop rewrites the frame; the IP packet stays.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Posting a parcel. You write a letter (app data), put it in an envelope with a flat number (port), the post office adds the street address (IP), and the courier van loads it with a delivery slip for the next depot (frame). At the destination each wrapper is removed in reverse order.',
      explanation: 'Networks work in layers. Each layer adds its own label to your data on the way out, and the receiving computer removes the labels in reverse. Each layer does one job.',
      keyTerms: [
        { term: 'IP address', meaning: 'A machine\'s network address.' },
        { term: 'Port', meaning: 'Which program on that machine.' },
        { term: 'Packet', meaning: 'A small chunk of data with addresses.' },
        { term: 'Router', meaning: 'Forwards packets toward their destination.' },
        { term: 'Latency', meaning: 'The delay for data to travel.' },
      ],
    },
    intermediate: {
      explanation: 'Know the four-layer TCP/IP model (application, transport, internet, link) and the OSI seven layers as vocabulary. Most backend debugging is about addresses, ports, DNS, TCP behavior, TLS and latency.',
      howItWorks: [
        'The app writes data to a socket.',
        'TCP or UDP adds ports (and reliability for TCP).',
        'IP adds addresses and routes the packet.',
        'The link layer frames it for the next hop.',
        'Routers forward hop by hop.',
        'The receiver unwraps layers in reverse.',
      ],
      tradeoffs: {
        use: [
          'Use TCP for reliable ordered streams such as HTTP and databases.',
          'Use UDP for low-latency or loss-tolerant traffic such as DNS and media.',
          'Use private subnets and security groups to restrict exposure.',
        ],
        avoid: [
          'Avoid assuming the network is reliable or has zero latency.',
          'Avoid chatty cross-region calls.',
          'Avoid exposing internal services on public IPs.',
        ],
      },
      pitfalls: [
        'Confusing a connection refused (nothing listening) with a timeout (dropped or unreachable).',
        'Ignoring DNS as a failure source.',
        'MTU mismatches causing mysterious stalls.',
        'Not setting timeouts on client calls.',
        'Forgetting NAT and firewalls when diagnosing connectivity.',
      ],
    },
    expert: {
      internals: [
        'The kernel stack processes packets through the NIC driver, IP routing, netfilter (iptables/nftables), then TCP/UDP socket buffers.',
        'Longest-prefix match routing; CIDR notation like 10.0.0.0/16; NAT rewrites addresses and ports and keeps a connection tracking table.',
        'Path MTU discovery uses ICMP; blocked ICMP creates black holes.',
        'IPv6 removes NAT needs with larger addresses and mandatory ICMPv6 for neighbor discovery.',
      ],
      failureModes: [
        'conntrack table exhaustion dropping new connections.',
        'Ephemeral port exhaustion on busy clients.',
        'Packet loss amplifying TCP retransmit latency.',
        'Asymmetric routing and firewall state mismatches.',
      ],
      scalingNotes: [
        'Terminate TLS at load balancers; use keep-alive and connection pooling to avoid handshake costs.',
        'Use tcpdump, Wireshark, ss, mtr and traceroute to diagnose.',
        'Place services close to users; consider anycast and CDNs.',
      ],
      realSystems: [
        'Linux netfilter, eBPF (Cilium); AWS VPC, security groups and NACLs.',
        'Envoy, HAProxy, Nginx at layers 4 and 7.',
        'BGP for routing between networks.',
      ],
      numbersToKnow: [
        'Ethernet MTU is commonly 1500 bytes.',
        'Light in fiber covers roughly 200 km per millisecond, so cross-continent round trips are tens of ms or more. // VERIFY',
        'Ports 0-1023 are well known; ephemeral range on Linux is typically 32768-60999. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'bash',
      title: 'Diagnose connectivity',
      code: [
        'dig +short api.example.com',
        'nc -zv api.example.com 443',
        'curl -sv --max-time 5 https://api.example.com/health -o /dev/null',
        'mtr -rwc 10 api.example.com',
        'ss -tan state established | wc -l',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Is DNS returning the expected address?' },
        { line: 2, text: 'Can a TCP connection be opened on the port?' },
        { line: 3, text: 'Always set a timeout; -v shows TLS and HTTP details.' },
        { line: 4, text: 'Per-hop loss and latency along the path.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What happens to data as it goes down the layers?', answer: 'Each layer wraps it with its own header (encapsulation): ports at transport, addresses at IP, MAC addresses at link. The receiver removes them in reverse.', followUps: ['What is a packet?'] },
    { level: 'beginner', q: 'IP address vs port?', answer: 'The IP address identifies the machine; the port identifies the program on it.', followUps: ['Which port does HTTPS use?'] },
    { level: 'intermediate', q: 'TCP vs UDP?', answer: 'TCP is connection-oriented, reliable and ordered with congestion control. UDP is connectionless and unreliable but has lower overhead and latency, good for DNS and real-time media.', followUps: ['What is QUIC?'] },
    { level: 'intermediate', q: 'Connection refused vs timeout?', answer: 'Refused means the host answered with a reset: nothing is listening on that port. A timeout means no answer: packets dropped by a firewall, routing issue or host down.', followUps: ['How would you tell a firewall drop?'] },
    { level: 'expert', q: 'Requests intermittently hang for large payloads only. What could it be?', answer: 'A path MTU black hole: ICMP fragmentation-needed messages are blocked, so large packets are dropped. Check with ping and DF set, fix by allowing ICMP or clamping MSS.', followUps: ['What is MSS clamping?'] },
    { level: 'expert', q: 'A client service hits connection errors under high load. What do you check?', answer: 'Ephemeral port exhaustion and TIME_WAIT buildup, conntrack table limits, file descriptor limits and lack of connection pooling. Reuse connections, widen ranges and fix pooling.', followUps: ['What does TIME_WAIT do?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A port identifies...', options: ['A program on a host', 'A router', 'A cable', 'A user'], answerIndex: 0, why: 'IP finds the machine, port finds the app.' },
    { level: 'beginner', q: 'Routers forward based on...', options: ['IP addresses', 'Fonts', 'File names', 'Passwords'], answerIndex: 0, why: 'The IP layer handles routing.' },
    { level: 'intermediate', q: 'Connection refused means...', options: ['Nothing listens on that port', 'Packets silently dropped', 'DNS failed', 'TLS expired'], answerIndex: 0, why: 'The host sent a reset.' },
    { level: 'expert', q: 'Typical Ethernet MTU...', options: ['1500 bytes', '64 bytes', '1 MB', '9 bytes'], answerIndex: 0, why: 'Standard Ethernet payload limit.' },
  ],
});
