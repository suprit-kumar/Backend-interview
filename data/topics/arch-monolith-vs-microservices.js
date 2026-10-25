/* Architecture: monolith-vs-microservices */
Atlas.topics.push({
  id: 'monolith-vs-microservices',
  category: 'architecture',
  title: 'Monolith vs Microservices',
  source: {
    description: 'One deployable is simple; many scale teams but add network cost.',
    steps: ['Start monolith', 'Find hot or team-boundary modules', 'Extract', 'Pay for ops complexity'],
  },
  estMinutes: 12,
  prereqs: [],
  related: ['microservices', 'service-to-service-communication', 'scalability', 'docker'],
  tags: ['monolith', 'modular monolith', 'strangler fig', 'extraction', 'trade-off'],
  visual: { type: 'compare', config: { left: { title: 'Monolith' }, right: { title: 'Microservices' } } },
  steps: [
    {
      label: 'Start monolith',
      caption: {
        beginner: 'Begin with one app. It is simple to build, run and fix.',
        intermediate: 'One codebase and one deploy: in-process calls, one database transaction, simple debugging and local development.',
        expert: 'A well-modularized monolith with enforced module boundaries gives most design benefits at a fraction of the operational cost and keeps extraction options open.',
      },
      state: { without: [{ text: 'One deploy, in-process calls', tone: 'good' }], with: [{ text: 'Not needed yet', tone: 'dim' }], changed: 'Both start from a monolith.' },
      hood: 'Modular monolith: strict module APIs, no cross-module table access.',
    },
    {
      label: 'Find hot or team-boundary modules',
      caption: {
        beginner: 'Later you notice one part needs more power or a separate team.',
        intermediate: 'Extraction candidates are modules with different scaling profiles, high change rates, or clear ownership by a team.',
        expert: 'Use data, not fashion: deploy frequency conflicts, scaling hot spots, and blast-radius needs. Coupling in the database often decides how hard extraction will be.',
      },
      state: { without: [{ text: 'Billing module is the bottleneck', tone: 'bad' }], with: [{ text: 'Billing identified for extraction', tone: 'plain' }], diverge: true, changed: 'A candidate module is found.' },
      hood: 'Look at deploy conflicts, CPU or memory hotspots and team ownership.',
    },
    {
      label: 'Extract',
      caption: {
        beginner: 'That part is moved out into its own app.',
        intermediate: 'Extract gradually (strangler fig): route traffic for one capability to a new service, then retire the old code.',
        expert: 'Split the data first or share carefully with an anti-corruption layer; keep the old path behind a flag for rollback and compare outputs before cutover.',
      },
      state: { without: [{ text: 'Whole app scales together', tone: 'bad' }], with: [{ text: 'Billing runs as its own service', tone: 'good' }], diverge: true, changed: 'Billing is now separate.' },
      hood: 'Strangler fig: incremental routing with a rollback flag.',
    },
    {
      label: 'Pay for ops complexity',
      caption: {
        beginner: 'More apps means more things to run, watch and connect.',
        intermediate: 'You now need service discovery, tracing, CI/CD per service, versioned contracts and handling of partial failure.',
        expert: 'Operational cost is the real price: on-call load, cross-service debugging, data consistency work and platform tooling. Budget for it before splitting.',
      },
      state: { without: [{ text: 'Simple to run', tone: 'good' }], with: [{ text: 'Needs tracing, CI/CD, contracts, on-call', tone: 'bad' }], diverge: true, verdict: { without: 'Simple, but limited team scaling', with: 'Scales teams, costs ops effort' }, changed: 'Trade-off is visible.' },
      hood: 'Count the platform work (observability, deploys, contracts) before extracting.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'One big shop with everything under one roof versus a street of specialist shops. The single shop is easy to manage until it gets crowded; the street lets each shop grow alone but you must walk between them and keep them coordinated.',
      explanation: 'A monolith is one application deployed as a single unit. Microservices are many small ones. Most projects should start simple and split only when growth or team size makes the single unit painful.',
      keyTerms: [
        { term: 'Monolith', meaning: 'One application deployed as one unit.' },
        { term: 'Modular monolith', meaning: 'A monolith with strict internal module boundaries.' },
        { term: 'Extraction', meaning: 'Moving a module out into its own service.' },
        { term: 'Strangler fig', meaning: 'Gradually replacing old code by routing traffic to new code.' },
      ],
    },
    intermediate: {
      explanation: 'The decision is organizational and operational more than technical. Monoliths are cheaper to build and run; microservices help many teams scale independently but add distributed-systems problems.',
      howItWorks: [
        'Begin with a modular monolith with clear module APIs.',
        'Measure scaling hotspots and deployment contention.',
        'Pick one module with a clear boundary and its own data.',
        'Route traffic gradually to the new service.',
        'Add tracing, contracts and automation as the count grows.',
        'Keep merging back an option if a split does not pay off.',
      ],
      tradeoffs: {
        use: [
          'Use a monolith for small teams, new products and unclear domains.',
          'Use microservices for many teams with independent release needs.',
          'Use a modular monolith as the default stepping stone.',
        ],
        avoid: [
          'Avoid microservices to look modern without the operational capability.',
          'Avoid a big-bang rewrite; extract incrementally.',
          'Avoid staying in a tangled monolith where every change risks everything.',
        ],
      },
      pitfalls: [
        'Premature splitting before the domain is understood.',
        'Extracting services that still share one database.',
        'Underestimating operational and debugging cost.',
        'Big-bang rewrites that stall delivery.',
        'Treating the choice as permanent.',
      ],
    },
    expert: {
      internals: [
        'A monolith gets ACID transactions and in-process calls for free; microservices replace them with network calls, sagas and eventual consistency.',
        'Independent scaling is only valuable if load really differs between modules; otherwise horizontal scaling of the monolith is cheaper.',
        'Module boundaries can be enforced with tooling (import linters, architecture tests) in the monolith.',
        'Branch-by-abstraction and change data capture help migrate data with little downtime.',
      ],
      failureModes: [
        'Distributed monolith with tight runtime coupling.',
        'Lost transactionality leading to inconsistent state after extraction.',
        'Latency regression from newly remote calls on hot paths.',
        'Team overload from too many services to own.',
      ],
      scalingNotes: [
        'Many large systems scale a monolith horizontally behind a load balancer for a long time.',
        'Extract for team autonomy first, performance second.',
        'Reassess boundaries as the domain and organization change.',
      ],
      realSystems: [
        'Shopify and Stack Overflow have publicly described scaling large modular monoliths. // VERIFY',
        'Amazon and Netflix moved to many services as organizations grew.',
        'Tools: import-linter, Django apps as modules, Kubernetes, Istio.',
      ],
      numbersToKnow: [
        'A function call is nanoseconds; a network hop adds roughly a millisecond or more.',
        'Each extra service adds pipeline, monitoring and on-call surface area.',
        'Network failure becomes a normal case once calls are remote.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Enforce module boundaries in a monolith (import-linter)',
      code: [
        '# .importlinter',
        '[importlinter]',
        'root_package = shop',
        '',
        '[importlinter:contract:1]',
        'name = billing does not import orders internals',
        'type = forbidden',
        'source_modules = shop.billing',
        'forbidden_modules = shop.orders.models',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'A contract fails CI if a module reaches into another module\'s internals.' },
        { line: 9, text: 'Modules must use the public API, which also makes later extraction easier.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a monolith?', answer: 'A single application deployed as one unit, with all features in one codebase and usually one database.', followUps: ['Is a monolith always bad?'] },
    { level: 'beginner', q: 'Why start with a monolith?', answer: 'It is faster to build, test and run. The domain boundaries are still unclear early, so splitting too soon often picks the wrong ones.', followUps: ['When would you split it?'] },
    { level: 'intermediate', q: 'What is a modular monolith?', answer: 'One deployable with enforced internal module boundaries and well-defined APIs between modules, giving separation without network cost.', followUps: ['How do you enforce the boundaries?'] },
    { level: 'intermediate', q: 'How do you migrate from monolith to microservices safely?', answer: 'Use the strangler fig pattern: extract one capability at a time, route traffic gradually, keep a rollback path, and migrate its data deliberately.', followUps: ['Why not rewrite everything?'] },
    { level: 'expert', q: 'Your team of 8 wants microservices. Do you agree?', answer: 'Probably not yet. With a small team the operational overhead outweighs the autonomy benefit. A modular monolith plus horizontal scaling covers most needs; extract only for a measured scaling or ownership problem.', followUps: ['What data would change your mind?'] },
    { level: 'expert', q: 'What technical risk appears when extracting a module that shares tables?', answer: 'Losing cross-module transactions and joins. You must split the data, introduce APIs or events, handle eventual consistency and often dual-write or CDC during migration.', followUps: ['How would you migrate the data with no downtime?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A good default for a new small product?', options: ['Monolith', '50 microservices', 'No database', 'Serverless only'], answerIndex: 0, why: 'Simplicity beats distribution when boundaries are unknown.' },
    { level: 'beginner', q: 'Which is a cost of splitting into services?', options: ['Network calls and ops complexity', 'Less code', 'No deploys', 'No bugs'], answerIndex: 0, why: 'Distribution adds failure modes and tooling needs.' },
    { level: 'intermediate', q: 'Strangler fig means...', options: ['Gradually routing traffic to new code', 'Deleting the database', 'Big-bang rewrite', 'Adding a cache'], answerIndex: 0, why: 'The old system is replaced piece by piece.' },
    { level: 'expert', q: 'Best reason to extract a service?', options: ['Teams or scaling needs conflict in the monolith', 'It sounds modern', 'More YAML', 'Fewer tests'], answerIndex: 0, why: 'Measured needs justify the cost.' },
  ],
});
