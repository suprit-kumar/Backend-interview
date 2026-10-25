/* Resilience: Scalability. */
Atlas.topics.push({
  id: 'scalability',
  category: 'resilience',
  title: 'Scalability',
  source: {
    description: 'Handle more load by adding capacity.',
    steps: ['Load grows', 'Scale up or out', 'Balance traffic', 'Find the next bottleneck'],
  },
  estMinutes: 12,
  prereqs: ['load-balancing'],
  related: ['load-balancing', 'caching', 'database-sharding-partitioning', 'performance-optimization'],
  tags: ['horizontal', 'vertical', 'stateless', 'autoscaling', 'bottleneck', 'capacity'],
  visual: {
    type: 'chart',
    config: {
      kind: 'line', xLabel: 'Load (requests/s)', yLabel: 'Latency', unit: 'ms',
      x: ['100', '200', '400', '800', '1600'], yMax: 1000,
      series: [
        { id: 'one', label: '1 server', tone: 'bad', values: [20, 25, 60, 400, 900] },
        { id: 'many', label: 'Scaled out', tone: 'good', values: [20, 20, 22, 25, 30] },
      ],
    },
  },
  steps: [
    {
      label: 'Load grows',
      caption: {
        beginner: 'More users arrive and the single server gets slower.',
        intermediate: 'Latency stays flat until utilization nears saturation, then climbs sharply as queues build.',
        expert: 'Queueing theory: waiting time rises non-linearly near full utilization, so scale before saturation (for example at 60-70% utilization). // VERIFY heuristic',
      },
      state: { series: { one: [20, 25, 60, 400, 900] }, hide: ['many'], mark: 3, changed: 'One server saturates around 800 req/s.' }, // VERIFY illustrative
      hood: 'Latency vs utilization is a hockey stick.',
    },
    {
      label: 'Scale up or out',
      caption: {
        beginner: 'Either buy a bigger machine or add more machines.',
        intermediate: 'Vertical scaling (bigger box) is simple but capped and a single point of failure. Horizontal scaling (more boxes) is open-ended but needs stateless design.',
        expert: 'Scale up first when it is cheap and simple, scale out for availability and headroom. Stateful tiers (databases) need replication, partitioning or sharding to scale out.',
      },
      state: { series: { one: [20, 25, 60, 400, 900], many: [20, 20, 22, 25, 30] }, mark: 3, changed: 'Adding servers flattens the curve.' },
      hood: 'Vertical: simple, limited. Horizontal: elastic, needs statelessness.',
    },
    {
      label: 'Balance traffic',
      caption: {
        beginner: 'A traffic director shares users across the machines.',
        intermediate: 'A load balancer spreads requests; sessions and uploads must live outside the instances so any server can serve any request.',
        expert: 'Autoscale on leading signals (queue depth, concurrency, CPU) with cooldowns and warm-up. Beware scaling lag: new capacity takes minutes, not seconds.',
      },
      state: { series: { one: [20, 25, 60, 400, 900], many: [20, 20, 22, 25, 30] }, mark: 4, changed: 'Traffic is spread across instances.' },
      hood: 'Autoscaling lags demand; keep headroom for spikes.',
    },
    {
      label: 'Find the next bottleneck',
      caption: {
        beginner: 'After fixing one limit, another part becomes the slowest, like the database.',
        intermediate: 'Scaling the app tier shifts pressure to the database, cache, network or a third-party API. Measure and repeat.',
        expert: 'Amdahl and the Universal Scalability Law: serial parts and coordination costs (locks, cross-node chatter) cap speedup and can make more nodes slower.',
      },
      state: { series: { one: [20, 25, 60, 400, 900], many: [20, 20, 40, 150, 600] }, mark: 4, changed: 'The database now limits the scaled-out tier.' }, // VERIFY illustrative
      hood: 'USL: throughput is limited by contention and coherency costs.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A busy restaurant. You can make the kitchen bigger (scale up) or open more branches (scale out). More branches serve more people, but then every branch needs the same menu and stock, and the supplier may become the limit.',
      explanation: 'Scalability is a system\'s ability to handle more users by adding resources. You can upgrade one machine or add more machines. Adding machines works best when each one is identical and keeps no private state.',
      keyTerms: [
        { term: 'Vertical scaling', meaning: 'Making one machine bigger.' },
        { term: 'Horizontal scaling', meaning: 'Adding more machines.' },
        { term: 'Stateless', meaning: 'Keeping no per-user data on the server between requests.' },
        { term: 'Bottleneck', meaning: 'The slowest part that limits the system.' },
        { term: 'Autoscaling', meaning: 'Adding or removing machines automatically with load.' },
      ],
    },
    intermediate: {
      explanation: 'Scale the stateless tier horizontally behind a balancer, cache reads, use async queues for slow work and scale the data tier with replicas and partitioning. Always measure to find the real bottleneck before adding capacity.',
      howItWorks: [
        'Make the app stateless; move sessions and files to shared stores.',
        'Put instances behind a load balancer.',
        'Add caches and CDNs to cut repeat work.',
        'Offload slow tasks to queues and workers.',
        'Add read replicas, then partition or shard the database.',
        'Autoscale on metrics and load test regularly.',
      ],
      tradeoffs: {
        use: [
          'Use horizontal scaling for web and API tiers.',
          'Use vertical scaling first for simplicity when a single node is enough.',
          'Use caching and queues to reduce load before adding hardware.',
        ],
        avoid: [
          'Avoid scaling out before fixing obvious inefficiencies.',
          'Avoid sticky local state that blocks adding nodes.',
          'Avoid premature sharding; it is hard to undo.',
        ],
      },
      pitfalls: [
        'Scaling the app tier and overwhelming the database.',
        'Stateful instances that cannot be added or removed freely.',
        'Autoscaling too slowly for sudden spikes.',
        'Not load testing, so limits are discovered in production.',
        'Cost growth without efficiency work.',
      ],
    },
    expert: {
      internals: [
        'Amdahl\'s law bounds speedup by the serial fraction; Gunther\'s Universal Scalability Law adds a coherency penalty so throughput can decline past an optimal node count.',
        'Read scaling uses replicas (with replication lag); write scaling needs partitioning by a shard key, which constrains queries and transactions.',
        'Scale-to-zero and serverless trade cold-start latency for elasticity.',
        'Capacity planning uses measured per-instance throughput at target latency, plus N+1 or N+2 headroom.',
      ],
      failureModes: [
        'Thundering herd of cold caches on new nodes.',
        'Hot partitions where one shard receives most traffic.',
        'Autoscaler oscillation (flapping) from bad cooldowns.',
        'Cross-node coordination making more nodes slower.',
      ],
      scalingNotes: [
        'Scale each tier on its own bottleneck metric.',
        'Pre-scale for known events (sales, launches).',
        'Design shard keys to spread load and avoid cross-shard transactions.',
      ],
      realSystems: [
        'Kubernetes HPA and KEDA; AWS Auto Scaling; Google Cloud Run; Cloudflare Workers.',
        'PostgreSQL read replicas and Citus; Vitess for MySQL; DynamoDB and Cassandra partitioning.',
        'k6 and Locust for load testing.',
      ],
      numbersToKnow: [
        'New VM-based capacity often takes minutes to become ready; containers can take seconds. // VERIFY',
        'If 5% of work is serial, the maximum speedup is 20x (Amdahl).',
        'Aim for peak utilization well below saturation for tail-latency headroom.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'Kubernetes HorizontalPodAutoscaler',
      code: [
        'apiVersion: autoscaling/v2',
        'kind: HorizontalPodAutoscaler',
        'metadata: { name: api }',
        'spec:',
        '  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }',
        '  minReplicas: 3',
        '  maxReplicas: 30',
        '  metrics:',
        '    - type: Resource',
        '      resource: { name: cpu, target: { type: Utilization, averageUtilization: 60 } }',
      ].join('\n'),
      annotations: [
        { line: 6, text: 'Keep a floor of replicas for availability and baseline load.' },
        { line: 7, text: 'A ceiling protects cost and downstream dependencies.' },
        { line: 10, text: 'Target 60% CPU to leave headroom while new pods start.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Vertical vs horizontal scaling?', answer: 'Vertical means a bigger machine; horizontal means more machines. Vertical is simpler but capped; horizontal scales further and adds redundancy but needs stateless design.', followUps: ['Which would you try first?'] },
    { level: 'beginner', q: 'Why must servers be stateless to scale out?', answer: 'If any server can handle any request, a balancer can add or remove servers freely. State stored on one server ties users to it.', followUps: ['Where should state go?'] },
    { level: 'intermediate', q: 'You doubled app servers and latency did not improve. Why?', answer: 'The bottleneck is elsewhere: database, cache, lock, external API or network. Profile and trace to find it, then scale or fix that component.', followUps: ['How do you confirm?'] },
    { level: 'intermediate', q: 'How do you scale a database?', answer: 'Optimize queries and indexes, add caching, use read replicas for reads, then partition or shard for writes, accepting complexity in queries and transactions.', followUps: ['What is replication lag?'] },
    { level: 'expert', q: 'Why can adding nodes reduce throughput?', answer: 'Coordination costs such as lock contention, cache coherence and cross-node communication grow with node count (Universal Scalability Law). Reduce shared state and chatter, and partition work.', followUps: ['Give an example.'] },
    { level: 'expert', q: 'How do you handle a predictable 10x traffic spike?', answer: 'Load test beforehand, pre-scale and warm caches, add queues and load shedding, raise connection limits and quotas, use a CDN, run a game day and keep a rollback plan. Autoscaling alone is too slow.', followUps: ['What breaks first usually?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Horizontal scaling means...', options: ['Adding more machines', 'A bigger CPU', 'More RAM only', 'Fewer users'], answerIndex: 0, why: 'More instances share load.' },
    { level: 'beginner', q: 'Stateless servers...', options: ['Keep no per-user data between requests', 'Never fail', 'Use no CPU', 'Need sticky sessions'], answerIndex: 0, why: 'Any server can serve any request.' },
    { level: 'intermediate', q: 'After scaling the app tier, the next limit is often...', options: ['The database', 'The keyboard', 'HTML', 'CSS'], answerIndex: 0, why: 'Shared state tiers saturate.' },
    { level: 'expert', q: 'Amdahl: 5% serial work caps speedup at...', options: ['20x', '5x', '95x', '100x'], answerIndex: 0, why: '1 / 0.05 = 20.' },
  ],
});
