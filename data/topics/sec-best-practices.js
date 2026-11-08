/* Security: Security Best Practices. */
Atlas.topics.push({
  id: 'security-best-practices',
  category: 'security',
  title: 'Security Best Practices',
  source: {
    description: 'Least privilege, validated input, layered defences.',
    steps: ['Validate input', 'Authenticate', 'Authorize least privilege', 'Log and patch'],
  },
  estMinutes: 10,
  prereqs: ['authentication-authorization', 'http-https'],
  related: ['owasp-top-10', 'secrets-management', 'api-gateway', 'jwt-oauth-2-0'],
  tags: ['defence in depth', 'least privilege', 'input validation', 'TLS', 'hashing', 'patching', 'audit'],
  visual: {
    type: 'layers',
    config: {
      payload: 'POST /transfer',
      layers: [
        { id: 'in', label: 'Input validation', unit: 'Schema check', header: 'types, ranges, allow-lists', detail: 'Reject malformed data at the edge; use parameterised queries.' },
        { id: 'authn', label: 'Authentication', unit: 'Who are you', header: 'token / session', detail: 'Verify identity with short-lived tokens, MFA for people, hashed passwords.' },
        { id: 'authz', label: 'Authorization', unit: 'What may you do', header: 'role + ownership', detail: 'Check every request server-side against least privilege.' },
        { id: 'ops', label: 'Log, monitor, patch', unit: 'Detect and fix', header: 'audit trail', detail: 'Audit sensitive actions and keep dependencies patched.' },
      ],
    },
  },
  steps: [
    {
      label: 'Validate input',
      caption: {
        beginner: 'Check everything that comes in, like a guard checking bags at the door.',
        intermediate: 'Validate type, length, range and format with allow-lists; use parameterised queries and output encoding. Never trust the client.',
        expert: 'Validate at trust boundaries, parse into typed models (Pydantic), canonicalise before checking, and enforce size limits to stop resource exhaustion.',
      },
      state: { active: ['in'], wrapped: [] },
      hood: 'Validate then encode for the target context (SQL, HTML, shell).',
    },
    {
      label: 'Authenticate',
      caption: {
        beginner: 'Prove who you are, like showing an ID card.',
        intermediate: 'Use proven libraries and standards: hashed passwords (argon2 or bcrypt), MFA, short-lived tokens, TLS everywhere.',
        expert: 'Rate-limit and lock out guessing, use constant-time comparisons, rotate signing keys, and never roll your own crypto.',
      },
      state: { active: ['authn'], wrapped: ['in'] },
      hood: 'Password hashing must be slow and salted.',
    },
    {
      label: 'Authorize least privilege',
      caption: {
        beginner: 'Having an ID is not enough; you only enter the rooms you are allowed in.',
        intermediate: 'Check permissions on every request on the server, per resource owner. Give users and services only the access they need.',
        expert: 'Deny by default, centralise policy (RBAC, ABAC, OPA), scope service credentials narrowly and prevent IDOR by checking ownership.',
      },
      state: { active: ['authz'], wrapped: ['in', 'authn'] },
      hood: 'Broken access control is the top OWASP category.',
    },
    {
      label: 'Log and patch',
      caption: {
        beginner: 'Keep a record of who did what, and keep fixing known weak spots.',
        intermediate: 'Audit logins and sensitive actions, alert on anomalies, and update dependencies and base images regularly.',
        expert: 'Scan dependencies and images in CI (SBOM, CVE feeds), use immutable deploys, protect log integrity and keep a tested incident response plan.',
      },
      state: { active: ['ops'], wrapped: ['in', 'authn', 'authz'] },
      hood: 'Assume breach: detection and response matter.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A bank building. There is a guard at the door, ID checks at the counter, a vault only some staff can open, and cameras recording everything. If one layer fails, the others still protect the money.',
      explanation: 'Security is built in layers. Check all input, confirm who the user is, allow only what they are permitted to do, and keep records and updates so problems are found and fixed.',
      keyTerms: [
        { term: 'Least privilege', meaning: 'Give only the access that is needed.' },
        { term: 'Defence in depth', meaning: 'Several layers so one failure is not fatal.' },
        { term: 'Input validation', meaning: 'Checking data before using it.' },
        { term: 'Hashing', meaning: 'One-way scrambling of passwords.' },
        { term: 'Patching', meaning: 'Installing fixes for known weaknesses.' },
      ],
    },
    intermediate: {
      explanation: 'Treat all input as hostile, authenticate with standard mechanisms, authorize every request server-side, encrypt in transit, protect secrets, and log and patch. No single control is enough.',
      howItWorks: [
        'Validate and parse input at the boundary.',
        'Use parameterised queries and output encoding.',
        'Authenticate with hashed passwords, MFA and short-lived tokens.',
        'Authorize per request with deny by default.',
        'Encrypt with TLS and protect secrets.',
        'Log, monitor and patch continuously.',
      ],
      tradeoffs: {
        use: [
          'Use defence in depth so one bug is not a breach.',
          'Use least privilege for users, services and database roles.',
          'Use secure defaults and framework protections.',
        ],
        avoid: [
          'Avoid security by obscurity.',
          'Avoid custom cryptography or home-made auth.',
          'Avoid trusting client-side checks.',
        ],
      },
      pitfalls: [
        'Authorization checked only in the UI.',
        'Storing passwords with fast hashes like plain SHA-256.',
        'Verbose errors leaking stack traces.',
        'Outdated dependencies with known CVEs.',
        'Overly broad cloud IAM roles.',
      ],
    },
    expert: {
      internals: [
        'Password storage uses memory-hard KDFs: argon2id, scrypt or bcrypt with per-user salts.',
        'TLS 1.2 or 1.3 gives confidentiality and integrity; HSTS forces HTTPS.',
        'Policy engines (OPA, Cedar) separate authorization decisions from code.',
        'Threat modelling (STRIDE) finds design flaws before code exists.',
      ],
      failureModes: [
        'Confused deputy where a service uses its own privileges for a user request.',
        'Supply-chain compromise through a dependency or build pipeline.',
        'Privilege escalation through over-permissive roles.',
        'Logging sensitive data creating a second breach surface.',
      ],
      scalingNotes: [
        'Automate scanning (SAST, DAST, dependency, container) in CI.',
        'Centralise identity and policy rather than per-service logic.',
        'Run regular access reviews and key rotation.',
      ],
      realSystems: [
        'OWASP ASVS and cheat sheets, NIST guidance, CIS benchmarks.',
        'Argon2, bcrypt, OPA, AWS IAM, HashiCorp Vault, Dependabot, Trivy.',
        'Cloudflare or AWS WAF as an additional layer.',
      ],
      numbersToKnow: [
        'OWASP recommends argon2id with tuned memory and iteration cost, for example about 19 MiB memory as a minimum configuration. // VERIFY',
        'Short-lived access tokens are commonly 5 to 15 minutes.',
        'Many breaches involve known, unpatched vulnerabilities, so patch windows matter.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Validate, hash and authorize (FastAPI)',
      code: [
        'from fastapi import FastAPI, Depends, HTTPException',
        'from pydantic import BaseModel, Field',
        'from argon2 import PasswordHasher',
        '',
        'ph = PasswordHasher()',
        'class Transfer(BaseModel):',
        '    to_account: int = Field(gt=0)',
        '    amount_cents: int = Field(gt=0, le=1_000_000)',
        '',
        '@app.post("/transfer")',
        'def transfer(body: Transfer, user=Depends(current_user)):',
        '    if not owns(user.id, body.to_account) and not user.can("transfer"):',
        '        raise HTTPException(403, "forbidden")',
        '    return do_transfer(user.id, body)',
        '',
        'hash_ = ph.hash("s3cret")',
      ].join('\n'),
      annotations: [
        { line: 7, text: 'Typed, bounded fields validate input at the boundary.' },
        { line: 11, text: 'Authentication happens in a dependency, not scattered code.' },
        { line: 12, text: 'Authorization is checked server-side on every request.' },
        { line: 16, text: 'argon2 for password storage, never a fast hash.' },
      ],
    },
    {
      lang: 'sql',
      title: 'Least-privilege database role',
      code: [
        'CREATE ROLE app_rw LOGIN PASSWORD :pw;',
        'GRANT SELECT, INSERT, UPDATE ON orders TO app_rw;',
        'REVOKE DELETE, TRUNCATE ON orders FROM app_rw;',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Grant only the operations the app needs.' },
        { line: 3, text: 'A SQL injection cannot wipe the table.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is least privilege?', answer: 'Giving users and programs only the minimum access they need to do their job.', followUps: ['Give an example.'] },
    { level: 'beginner', q: 'Why validate input?', answer: 'Attackers send unexpected data. Validation rejects bad input before it can cause harm such as injection.', followUps: ['Where should validation happen?'] },
    { level: 'intermediate', q: 'Authentication vs authorization?', answer: 'Authentication verifies who you are. Authorization decides what you may do.', followUps: ['Which does a 403 represent?'] },
    { level: 'intermediate', q: 'How should passwords be stored?', answer: 'Hashed with a slow, salted algorithm such as argon2id or bcrypt, never encrypted reversibly or hashed with a fast hash.', followUps: ['What is a salt for?'] },
    { level: 'expert', q: 'What is defence in depth, with an example?', answer: 'Independent layers so one failure does not cause a breach: input validation, parameterised queries, a least-privilege DB role, network segmentation and audit alerts all limit SQL injection impact.', followUps: ['Which layer failed first?'] },
    { level: 'expert', q: 'How do you secure the software supply chain?', answer: 'Pin and scan dependencies, generate SBOMs, verify signatures, use minimal base images, protect CI credentials, require reviews and sign build artifacts.', followUps: ['How fast must you patch a critical CVE?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Least privilege means...', options: ['Minimum necessary access', 'Admin for everyone', 'No passwords', 'Public database'], answerIndex: 0, why: 'Limit what a compromise can do.' },
    { level: 'intermediate', q: 'Where must authorization be enforced?', options: ['On the server', 'Only in the UI', 'In CSS', 'In the browser cache'], answerIndex: 0, why: 'Clients can be bypassed.' },
    { level: 'intermediate', q: 'Best password storage?', options: ['argon2id or bcrypt with salt', 'Plain text', 'Base64', 'MD5 only'], answerIndex: 0, why: 'Slow salted hashes resist cracking.' },
    { level: 'expert', q: 'Defence in depth means...', options: ['Multiple independent layers', 'One strong firewall', 'Hiding the code', 'Longer URLs'], answerIndex: 0, why: 'Failure of one control is not fatal.' },
  ],
});
