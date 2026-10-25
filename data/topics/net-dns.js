/* Networking: DNS. */
Atlas.topics.push({
  id: 'dns',
  category: 'networking',
  title: 'DNS',
  source: {
    description: 'Turns names into IP addresses.',
    steps: ['Browser asks resolver', 'Root', 'TLD', 'Authoritative returns IP'],
  },
  estMinutes: 9,
  prereqs: ['networking-fundamentals'],
  related: ['networking-fundamentals', 'load-balancing', 'high-availability', 'http-https'],
  tags: ['resolver', 'TTL', 'A record', 'CNAME', 'authoritative', 'cache', 'propagation'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'b', label: 'Browser' }, { id: 'r', label: 'Resolver' }, { id: 'root', label: 'Root / TLD' }, { id: 'auth', label: 'Authoritative' }] },
  },
  steps: [
    {
      label: 'Browser asks resolver',
      caption: {
        beginner: 'Your browser asks a helper: "what is the address of shop.example.com?"',
        intermediate: 'The OS or browser checks its cache, then asks the recursive resolver (ISP, 1.1.1.1, 8.8.8.8, or a VPC resolver).',
        expert: 'A cache hit returns immediately, respecting the record TTL. Negative answers (NXDOMAIN) are cached too.',
      },
      state: { messages: [{ from: 'b', to: 'r', label: 'shop.example.com?', tone: 'plain' }] },
      hood: 'Stub resolver in the OS; recursive resolver does the work.',
    },
    {
      label: 'Root',
      caption: {
        beginner: 'The helper asks the top of the directory, which points to the ".com" office.',
        intermediate: 'On a miss, the resolver asks a root server, which refers it to the servers for the TLD (.com).',
        expert: 'Roots only return referrals (NS records with glue). Resolvers cache them for long periods so roots are rarely queried.',
      },
      state: { messages: [{ from: 'b', to: 'r', label: 'shop.example.com?', tone: 'plain' }, { from: 'r', to: 'root', label: 'who has .com?', tone: 'plain' }, { from: 'root', to: 'r', label: 'ask .com servers', tone: 'ok', back: true }] },
      hood: 'Referral, not answer.',
    },
    {
      label: 'TLD',
      caption: {
        beginner: 'The ".com" office points to the company\'s own directory.',
        intermediate: 'The TLD servers refer the resolver to the authoritative name servers for example.com.',
        expert: 'Delegation is by NS records; DNSSEC adds a chain of signatures (DS records) so answers can be validated.',
      },
      state: { messages: [{ from: 'r', to: 'root', label: 'example.com NS?', tone: 'plain' }, { from: 'root', to: 'r', label: 'ns1.example.com', tone: 'ok', back: true }] },
      hood: 'DS/DNSKEY chain validates delegation.',
    },
    {
      label: 'Authoritative returns IP',
      caption: {
        beginner: 'The company\'s directory gives the real address, and your browser connects.',
        intermediate: 'The authoritative server returns the record (such as an A record with an IP and a TTL), which the resolver caches and passes back.',
        expert: 'Low TTLs help failover but raise query load and latency. Many resolvers ignore very low TTLs. Use CNAME, ALIAS or weighted, latency or geo records for traffic steering.',
      },
      state: { messages: [{ from: 'r', to: 'auth', label: 'A shop.example.com?', tone: 'plain' }, { from: 'auth', to: 'r', label: '203.0.113.5 TTL 300', tone: 'good', back: true }, { from: 'r', to: 'b', label: '203.0.113.5', tone: 'good', back: true }] },
      hood: 'TTL controls how long caches may keep the answer.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A phone book with a chain of offices. You ask a receptionist for a company\'s number. If she does not know, she asks the national directory, which points to the regional one, which points to the company\'s own office, where the number is found. She then remembers it for a while.',
      explanation: 'DNS converts a website name that people can remember into the numeric address computers use. Answers are cached so most lookups are instant.',
      keyTerms: [
        { term: 'Resolver', meaning: 'The helper that looks names up for you.' },
        { term: 'A record', meaning: 'Maps a name to an IPv4 address.' },
        { term: 'TTL', meaning: 'How long an answer may be cached.' },
        { term: 'CNAME', meaning: 'An alias pointing to another name.' },
        { term: 'Authoritative server', meaning: 'The source of truth for a domain.' },
      ],
    },
    intermediate: {
      explanation: 'DNS is a hierarchical, cached, distributed database. Common records: A/AAAA, CNAME, MX, TXT, NS. It underpins load balancing, failover and service discovery, and it is a frequent hidden cause of outages.',
      howItWorks: [
        'The client checks local caches.',
        'The recursive resolver checks its cache.',
        'On a miss it queries root, TLD and authoritative servers.',
        'The answer returns with a TTL.',
        'Every layer caches until the TTL expires.',
        'The client connects to the IP.',
      ],
      tradeoffs: {
        use: [
          'Use DNS for coarse traffic routing and failover.',
          'Use short TTLs before a planned migration.',
          'Use managed DNS (Route 53, Cloudflare) for reliability.',
        ],
        avoid: [
          'Avoid relying on DNS alone for fast failover, since caches ignore changes until TTL.',
          'Avoid very long TTLs on records you may need to change.',
          'Avoid CNAME at the zone apex.',
        ],
      },
      pitfalls: [
        'Assuming DNS changes are instant everywhere.',
        'Applications caching IPs forever (for example JVM or connection pools).',
        'Forgetting to lower TTL before a cutover.',
        'DNS timeouts missing from health checks.',
        'Dangling CNAMEs enabling subdomain takeover.',
      ],
    },
    expert: {
      internals: [
        'Queries use UDP port 53, falling back to TCP for large responses; EDNS0 raises UDP size; DoH and DoT encrypt queries.',
        'Recursive resolvers do iterative resolution; QNAME minimization improves privacy; negative caching follows the SOA minimum.',
        'In Kubernetes, CoreDNS resolves service names; ndots:5 can multiply lookups for external names.',
        'Anycast routes queries to the nearest DNS server instance.',
      ],
      failureModes: [
        'Resolver or provider outage making a healthy service unreachable.',
        'Cache poisoning (mitigated by DNSSEC and source port randomization).',
        'Thundering herd after TTL expiry.',
        'CoreDNS overload and conntrack limits in clusters.',
      ],
      scalingNotes: [
        'Use multiple providers or secondary DNS for resilience.',
        'Lower ndots or use fully qualified names in clusters.',
        'Use latency or geo routing with health checks for global traffic.',
      ],
      realSystems: [
        'BIND, Unbound, CoreDNS, PowerDNS; Route 53, Cloudflare DNS, Google Cloud DNS.',
        'AWS Route 53 health-checked failover; Consul DNS for service discovery.',
        'dig, drill and kdig for debugging.',
      ],
      numbersToKnow: [
        'A common TTL is 300 seconds for dynamic records and hours for stable ones.',
        'A cached lookup takes microseconds to a millisecond; an uncached recursive lookup may take tens to hundreds of ms.',
        'There are 13 root server identities (A to M), served by many anycast instances.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'bash',
      title: 'Inspect DNS',
      code: [
        'dig shop.example.com A +noall +answer',
        'dig +trace shop.example.com',
        'dig @1.1.1.1 shop.example.com MX +short',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'The answer shows the record and its remaining TTL.' },
        { line: 2, text: '+trace walks root, TLD and authoritative servers like a resolver does.' },
        { line: 3, text: 'Query a specific resolver to compare answers.' },
      ],
    },
    {
      lang: 'python',
      title: 'Resolve with a timeout (dnspython)',
      code: [
        'import dns.resolver',
        'r = dns.resolver.Resolver()',
        'r.lifetime = 2.0',
        'answer = r.resolve("shop.example.com", "A")',
        'print([a.address for a in answer], answer.rrset.ttl)',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Bound the lookup so a DNS problem cannot hang the service.' },
        { line: 5, text: 'The TTL tells you how long this result may be cached.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does DNS do?', answer: 'It translates domain names into IP addresses so computers can connect.', followUps: ['Why is it cached?'] },
    { level: 'beginner', q: 'What is a TTL?', answer: 'Time to live: how long a DNS answer may be cached before asking again.', followUps: ['What happens when you lower it?'] },
    { level: 'intermediate', q: 'Why do DNS changes not take effect instantly?', answer: 'Resolvers and clients cache the old answer until its TTL expires, so lower the TTL ahead of a planned change.', followUps: ['What is "propagation"?'] },
    { level: 'intermediate', q: 'A record vs CNAME?', answer: 'An A record maps a name to an IP. A CNAME maps a name to another name, so the target\'s address is looked up next. A CNAME cannot coexist with other records on the same name or at the apex.', followUps: ['What is an ALIAS record?'] },
    { level: 'expert', q: 'Intermittent slow outbound calls in Kubernetes. Could DNS be involved?', answer: 'Yes: with ndots:5 each external name tries several search domains before the real one, multiplying queries and load on CoreDNS, and conntrack races can drop UDP. Use FQDNs with trailing dots, lower ndots, node-local DNS cache.', followUps: ['How do you measure it?'] },
    { level: 'expert', q: 'How would you design DNS-based failover and what are its limits?', answer: 'Use health-checked records with low TTL and multiple endpoints. Limits: clients and resolvers that ignore or over-extend TTLs, app-level IP caching, and slower reaction than load balancers. Combine with anycast or L4/L7 balancers.', followUps: ['What is geo routing?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'DNS maps...', options: ['Names to IP addresses', 'IPs to colors', 'Files to disks', 'Users to roles'], answerIndex: 0, why: 'It is the internet\'s phone book.' },
    { level: 'beginner', q: 'Answers are cached for the...', options: ['TTL', 'MTU', 'RTT', 'SLA'], answerIndex: 0, why: 'Time to live.' },
    { level: 'intermediate', q: 'Before a migration, you should...', options: ['Lower the TTL', 'Raise the TTL', 'Delete the zone', 'Disable DNS'], answerIndex: 0, why: 'So caches expire quickly.' },
    { level: 'expert', q: 'DNSSEC provides...', options: ['Authenticity of answers', 'Encryption of queries', 'Faster lookups', 'Load balancing'], answerIndex: 0, why: 'Signatures validate records; DoH/DoT encrypt.' },
  ],
});
