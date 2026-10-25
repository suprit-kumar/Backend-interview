/* Infrastructure: CI/CD. */
Atlas.topics.push({
  id: 'ci-cd',
  category: 'infrastructure',
  title: 'CI/CD',
  source: {
    description: 'Automate build, test and deploy on every change.',
    steps: ['Push code', 'Build and test', 'Package', 'Deploy'],
  },
  estMinutes: 10,
  prereqs: ['git'],
  related: ['git', 'docker', 'testing', 'kubernetes-basics'],
  tags: ['pipeline', 'GitHub Actions', 'continuous delivery', 'canary', 'rollback', 'artifact'],
  visual: {
    type: 'pipeline',
    config: {
      stages: [
        { id: 'push', label: 'Push', sub: 'git' },
        { id: 'test', label: 'Build & test', sub: 'CI' },
        { id: 'pack', label: 'Package', sub: 'image' },
        { id: 'dep', label: 'Deploy', sub: 'CD' },
      ],
    },
  },
  steps: [
    {
      label: 'Push code',
      caption: {
        beginner: 'A developer saves a change to the shared project.',
        intermediate: 'A push or pull request triggers the pipeline through a webhook.',
        expert: 'Trunk-based development with small, frequent merges keeps integration cheap and the pipeline fast.',
      },
      state: { active: ['push'], payload: { push: 'commit abc123' } },
      hood: 'Small batches lower risk per deploy.',
    },
    {
      label: 'Build and test',
      caption: {
        beginner: 'Robots build the app and run the checks automatically.',
        intermediate: 'CI compiles, lints and runs unit and integration tests. A failure blocks the merge.',
        expert: 'Cache dependencies, parallelize and shard tests, and quarantine flaky tests. Pipeline time is a feedback-loop budget.',
      },
      state: { active: ['test'], payload: { push: 'commit abc123', test: 'tests: 482 pass' } },
      hood: 'Fast feedback: aim for minutes, not hours.',
    },
    {
      label: 'Package',
      caption: {
        beginner: 'The passing app is wrapped into a ready-to-run package.',
        intermediate: 'The pipeline builds one immutable artifact (a container image) tagged with the commit and stores it in a registry.',
        expert: 'Build once, promote the same artifact through environments. Sign images and generate an SBOM for supply-chain integrity.',
      },
      state: { active: ['pack'], payload: { test: 'tests: 482 pass', pack: 'api:abc123' } },
      hood: 'Same artifact in staging and production.',
    },
    {
      label: 'Deploy',
      caption: {
        beginner: 'The package is released so users get the new version.',
        intermediate: 'CD rolls it out to staging, then production, with health checks and automatic rollback on failure.',
        expert: 'Use progressive delivery: canary or blue-green with automated analysis of error rate and latency, and decouple deploy from release using feature flags.',
      },
      state: { active: ['dep'], payload: { pack: 'api:abc123', dep: 'canary 10%' } },
      hood: 'Deploy is not release: feature flags decouple them.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A factory assembly line with quality inspectors. Every product goes down the same line: it is assembled, checked at each station and only the ones that pass are packed and shipped, with no manual steps to forget.',
      explanation: 'CI/CD automatically checks and ships your code. Continuous integration builds and tests every change. Continuous delivery or deployment releases the tested result to servers.',
      keyTerms: [
        { term: 'CI', meaning: 'Continuous Integration: build and test every change.' },
        { term: 'CD', meaning: 'Continuous Delivery or Deployment: ship automatically.' },
        { term: 'Pipeline', meaning: 'The automated sequence of stages.' },
        { term: 'Artifact', meaning: 'The built output, like an image.' },
        { term: 'Rollback', meaning: 'Returning to the previous version.' },
      ],
    },
    intermediate: {
      explanation: 'A good pipeline is fast, reliable and repeatable: lint, unit tests, build, integration tests, security scan, package, deploy and verify. Deployment strategies limit blast radius.',
      howItWorks: [
        'A push or pull request triggers the pipeline.',
        'Dependencies are restored from cache.',
        'Lint, tests and scans run, often in parallel.',
        'A versioned artifact is built and published.',
        'Staging deploy and smoke tests run.',
        'Production is rolled out with health checks and rollback.',
      ],
      tradeoffs: {
        use: [
          'Use CI on every pull request.',
          'Use canary or blue-green for risky production changes.',
          'Use infrastructure as code so environments are reproducible.',
        ],
        avoid: [
          'Avoid manual deploy steps that are not scripted.',
          'Avoid rebuilding the artifact per environment.',
          'Avoid long-running pipelines that developers bypass.',
        ],
      },
      pitfalls: [
        'Flaky tests that train people to ignore failures.',
        'Secrets printed in logs or stored in the repo.',
        'No rollback path.',
        'Database migrations not compatible with the previous version.',
        'Pipeline config drifting from reality.',
      ],
    },
    expert: {
      internals: [
        'Runners execute jobs in ephemeral containers or VMs; caches and artifacts pass data between jobs.',
        'GitOps (Argo CD, Flux) makes Git the source of truth and a controller reconciles the cluster to it.',
        'Zero-downtime migrations use expand and contract: add compatibly, deploy, migrate data, then remove the old.',
        'DORA metrics: deployment frequency, lead time, change failure rate and time to restore.',
      ],
      failureModes: [
        'Compromised pipeline credentials or third-party actions (supply-chain attacks).',
        'Cache poisoning and non-reproducible builds.',
        'Deploy overlapping with incompatible schema changes.',
        'Rollbacks failing because data has changed.',
      ],
      scalingNotes: [
        'Shard tests, use remote caches (Bazel, Gradle, Nx) and affected-only builds in monorepos.',
        'Pin action versions by commit SHA and use short-lived OIDC credentials.',
        'Add automated canary analysis (Argo Rollouts, Flagger).',
      ],
      realSystems: [
        'GitHub Actions, GitLab CI, Jenkins, CircleCI, Buildkite.',
        'Argo CD, Flux, Spinnaker; Terraform and Pulumi for infrastructure.',
        'Sigstore cosign and SLSA for provenance.',
      ],
      numbersToKnow: [
        'DORA elite teams deploy on demand with lead time under a day. // VERIFY',
        'A common target is a PR pipeline under 10 minutes.',
        'Canary stages often start at 1-10% of traffic.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'GitHub Actions pipeline',
      code: [
        'name: ci',
        'on: [pull_request, push]',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-python@v5',
        '        with: { python-version: "3.12", cache: pip }',
        '      - run: pip install -r requirements.txt',
        '      - run: ruff check . && pytest -q',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Run on every pull request and push.' },
        { line: 9, text: 'Cache pip downloads to keep the pipeline fast.' },
        { line: 11, text: 'Lint and tests gate the merge.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is CI?', answer: 'Continuous Integration: automatically building and testing every change so problems are found early.', followUps: ['What is CD?'] },
    { level: 'beginner', q: 'Why automate deployment?', answer: 'It is faster, repeatable and less error-prone than manual steps, and enables small frequent releases.', followUps: ['What can go wrong with manual deploys?'] },
    { level: 'intermediate', q: 'Blue-green vs canary?', answer: 'Blue-green switches all traffic between two identical environments, enabling instant rollback. Canary sends a small share of traffic to the new version first and expands if metrics stay healthy.', followUps: ['Which is cheaper?'] },
    { level: 'intermediate', q: 'Delivery vs deployment?', answer: 'Continuous delivery keeps every change releasable with a manual approval to release. Continuous deployment releases every passing change automatically.', followUps: ['Which needs stronger tests?'] },
    { level: 'expert', q: 'How do you ship a database schema change with zero downtime?', answer: 'Expand and contract: add new nullable columns or tables compatibly, deploy code that writes both and reads old, backfill, switch reads, then remove old columns in a later release. Never ship a migration incompatible with the running version.', followUps: ['What about rollbacks?'] },
    { level: 'expert', q: 'How do you secure a pipeline?', answer: 'Least-privilege, short-lived OIDC credentials, pinned third-party actions by SHA, secret masking, protected branches and environments with approvals, signed artifacts and dependency scanning.', followUps: ['What is a supply-chain attack?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'CI means...', options: ['Continuous Integration', 'Cloud Index', 'Code Inventory', 'Cache Invalidation'], answerIndex: 0, why: 'Build and test each change.' },
    { level: 'beginner', q: 'A failing test should...', options: ['Block the merge', 'Be ignored', 'Delete the repo', 'Restart DNS'], answerIndex: 0, why: 'That is the purpose of CI.' },
    { level: 'intermediate', q: 'Canary release sends...', options: ['A small share of traffic first', 'All traffic at once', 'No traffic', 'Only logs'], answerIndex: 0, why: 'It limits blast radius.' },
    { level: 'expert', q: 'Build once means...', options: ['Promote the same artifact across environments', 'Compile per server', 'Never rebuild', 'Skip tests'], answerIndex: 0, why: 'It guarantees what you tested is what ships.' },
  ],
});
