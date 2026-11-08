/* Security: Secrets Management. */
Atlas.topics.push({
  id: 'secrets-management',
  category: 'security',
  title: 'Secrets Management',
  source: {
    description: 'Keep keys out of code and rotate them.',
    steps: ['Store in vault', 'App fetches at runtime', 'Short-lived access', 'Rotate'],
  },
  estMinutes: 9,
  prereqs: ['security-best-practices'],
  related: ['security-best-practices', 'docker', 'kubernetes-basics', 'ci-cd'],
  tags: ['vault', 'rotation', 'dynamic secrets', 'KMS', 'environment variables', 'least privilege', 'git leaks'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'dev', label: 'Operator' }, { id: 'vault', label: 'Vault' }, { id: 'app', label: 'App' }, { id: 'db', label: 'Database' }] },
  },
  steps: [
    {
      label: 'Store in vault',
      caption: {
        beginner: 'Put the key in a safe instead of leaving it lying in the code.',
        intermediate: 'Store secrets in a managed vault (Vault, AWS Secrets Manager) with encryption at rest, access policies and audit logs. Never commit them to git.',
        expert: 'Vault encrypts with a master key held by seal or KMS. Policies are path-based, and every read is audited.',
      },
      state: { messages: [{ from: 'dev', to: 'vault', label: 'put db/password', tone: 'plain' }, { from: 'vault', to: 'dev', label: 'stored, v1', tone: 'ok', back: true }] },
      hood: 'Secrets versioned and encrypted at rest.',
    },
    {
      label: 'App fetches at runtime',
      caption: {
        beginner: 'The app asks the safe for the key only when it needs it.',
        intermediate: 'The app authenticates to the vault with its workload identity (IAM role, Kubernetes service account) and reads the secret at start or on demand.',
        expert: 'No bootstrap secret should be stored: use platform identity. Cache in memory only, and handle fetch failures with backoff.',
      },
      state: { messages: [{ from: 'app', to: 'vault', label: 'who am I? (IAM role)', tone: 'plain' }, { from: 'vault', to: 'app', label: 'db password', tone: 'ok', back: true }] },
      hood: 'Solving the "secret zero" problem with workload identity.',
    },
    {
      label: 'Short-lived access',
      caption: {
        beginner: 'The key only works for a short time, so a stolen one is useless soon.',
        intermediate: 'Dynamic secrets: the vault creates a temporary database user with a TTL, and revokes it when the lease ends.',
        expert: 'Leases give each consumer a unique credential, so a leak is traceable and revocable without rotating a shared password.',
      },
      state: { messages: [{ from: 'app', to: 'vault', label: 'request DB creds', tone: 'plain' }, { from: 'vault', to: 'db', label: 'CREATE USER ttl=1h', tone: 'plain' }, { from: 'vault', to: 'app', label: 'user + pass, lease 1h', tone: 'good', back: true }, { from: 'app', to: 'db', label: 'connect', tone: 'good' }] },
      hood: 'Lease, renew, revoke.',
    },
    {
      label: 'Rotate',
      caption: {
        beginner: 'Change the key regularly so old copies stop working.',
        intermediate: 'Rotate on a schedule and immediately after suspected exposure. Apps must reload or reconnect without a restart.',
        expert: 'Rotate with overlap (two valid versions) to avoid downtime. Pool connections must pick up new credentials, and rotation should be automated and tested.',
      },
      state: { messages: [{ from: 'vault', to: 'db', label: 'rotate password v2', tone: 'plain' }, { from: 'vault', to: 'app', label: 'new version v2', tone: 'ok', back: true }, { from: 'app', to: 'db', label: 'reconnect with v2', tone: 'good' }] },
      hood: 'Dual-credential rotation avoids a gap.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A hotel key system. Guests do not get the master key. The front desk issues a room card that stops working at checkout, and the hotel changes locks if a card is lost.',
      explanation: 'Secrets are passwords, API keys and tokens. They must not live in your code. A secrets manager stores them safely, hands them out only to approved apps, and helps change them often.',
      keyTerms: [
        { term: 'Secret', meaning: 'A password, key or token that grants access.' },
        { term: 'Vault', meaning: 'A secure store for secrets.' },
        { term: 'Rotation', meaning: 'Replacing a secret with a new one regularly.' },
        { term: 'TTL', meaning: 'How long a credential stays valid.' },
        { term: 'Leak', meaning: 'A secret exposed to people who should not have it.' },
      ],
    },
    intermediate: {
      explanation: 'Keep secrets out of source control and images, inject them at runtime, scope them narrowly, prefer short-lived credentials and rotate automatically. Scan repositories to catch accidental commits.',
      howItWorks: [
        'Store secrets in a vault or cloud secrets manager.',
        'Authenticate the workload with its platform identity.',
        'Fetch secrets at start or on demand.',
        'Prefer dynamic, short-lived credentials.',
        'Rotate on a schedule and on suspicion of exposure.',
        'Audit access and scan code for leaks.',
      ],
      tradeoffs: {
        use: [
          'Use a vault when many services share sensitive credentials.',
          'Use dynamic secrets for databases and cloud APIs.',
          'Use secret scanning in CI and pre-commit hooks.',
        ],
        avoid: [
          'Avoid secrets in code, git history or container images.',
          'Avoid one shared long-lived credential for every service.',
          'Avoid printing secrets in logs or error messages.',
        ],
      },
      pitfalls: [
        'Committing a .env file to git.',
        'Secrets baked into Docker image layers.',
        'Never rotating because it breaks the app.',
        'Environment variables exposed in crash dumps or process listings.',
        'Reusing the same secret across environments.',
      ],
    },
    expert: {
      internals: [
        'HashiCorp Vault seals its data with a master key split by Shamir or auto-unsealed via KMS; secrets engines generate dynamic credentials with leases.',
        'Cloud IAM roles issue temporary STS credentials via the instance or pod identity, removing static keys entirely.',
        'Kubernetes Secrets are base64-encoded, not encrypted by default; enable encryption at rest and use external secrets operators or CSI drivers.',
        'Envelope encryption protects data keys with a KMS key.',
      ],
      failureModes: [
        'Vault outage blocking app startup if there is no cache or fallback.',
        'Leaked secret in git history remaining valid after the file is deleted.',
        'Rotation breaking long-lived connections.',
        'Over-broad vault policies exposing every secret.',
      ],
      scalingNotes: [
        'Run the vault highly available with replication and tested recovery.',
        'Cache secrets with TTL and renew leases in the background.',
        'Automate rotation and test it in staging.',
      ],
      realSystems: [
        'HashiCorp Vault, AWS Secrets Manager and Parameter Store, Azure Key Vault, GCP Secret Manager.',
        'Kubernetes External Secrets, Sealed Secrets, SOPS.',
        'gitleaks, truffleHog and GitHub secret scanning.',
      ],
      numbersToKnow: [
        'Dynamic database credentials commonly use TTLs of minutes to hours.',
        'Kubernetes Secrets are only base64 encoded unless encryption at rest is configured.',
        'A leaked key must be treated as compromised and revoked, because deleting a commit does not remove it from clones.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Read a secret from AWS Secrets Manager',
      code: [
        'import json, boto3',
        'sm = boto3.client("secretsmanager")',
        'def db_password() -> str:',
        '    resp = sm.get_secret_value(SecretId="prod/db")',
        '    return json.loads(resp["SecretString"])["password"]',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Credentials come from the IAM role, with no key in code.' },
        { line: 4, text: 'The secret is fetched at runtime, not stored in the image.' },
      ],
    },
    {
      lang: 'bash',
      title: 'Prevent leaks',
      code: [
        'gitleaks detect --source . --no-banner',
        'echo ".env" >> .gitignore',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Scan history for committed secrets in CI.' },
        { line: 2, text: 'Keep local env files out of git.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why not hard-code a password in the source?', answer: 'Anyone with the code can read it, and it stays in version history. Secrets should be injected at runtime from a secure store.', followUps: ['Where would you keep it instead?'] },
    { level: 'beginner', q: 'What is secret rotation?', answer: 'Replacing a secret with a new value on a schedule so any leaked copy stops working.', followUps: ['How often?'] },
    { level: 'intermediate', q: 'Are environment variables a good place for secrets?', answer: 'They are better than code, but they can leak through logs, crash dumps and child processes. Prefer a secrets manager or mounted files with tight permissions.', followUps: ['What about Docker images?'] },
    { level: 'intermediate', q: 'What are dynamic secrets?', answer: 'Credentials created on demand with a short lifetime and unique to the requester, then revoked automatically, which limits leak impact and improves audit.', followUps: ['What breaks if connections are long-lived?'] },
    { level: 'expert', q: 'You find an API key in git history. What do you do?', answer: 'Revoke and rotate it immediately, check access logs for misuse, remove it from history if needed, but assume it is compromised, add scanning and pre-commit hooks, and find why it was committed.', followUps: ['Why is deleting the commit not enough?'] },
    { level: 'expert', q: 'How do you solve the "secret zero" problem?', answer: 'Use platform identity so no initial secret is stored: IAM roles, Kubernetes service account tokens, or cloud workload identity, which the vault verifies before issuing secrets.', followUps: ['What if running on-premises?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Secrets should be kept...', options: ['Out of source code', 'In README files', 'In public repos', 'In URLs'], answerIndex: 0, why: 'Code is widely shared and versioned.' },
    { level: 'intermediate', q: 'Dynamic secrets are...', options: ['Short-lived and generated on demand', 'Never changed', 'Shared by all', 'Stored in git'], answerIndex: 0, why: 'They expire and are unique.' },
    { level: 'intermediate', q: 'Kubernetes Secrets by default are...', options: ['Base64 encoded, not encrypted', 'Strongly encrypted', 'Deleted hourly', 'Public'], answerIndex: 0, why: 'Enable encryption at rest or use an external manager.' },
    { level: 'expert', q: 'After a key leaks in git you should...', options: ['Revoke and rotate it', 'Delete the commit only', 'Ignore it', 'Rename the repo'], answerIndex: 0, why: 'Copies may exist; treat it as compromised.' },
  ],
});
