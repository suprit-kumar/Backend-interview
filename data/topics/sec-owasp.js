/* Security: OWASP Top 10. */
Atlas.topics.push({
  id: 'owasp-top-10',
  category: 'security',
  title: 'OWASP Top 10',
  source: {
    description: 'The most common web risks: injection, broken access control and more.',
    steps: ['Review list', 'Map to your app', 'Test (injection, access)', 'Fix and retest'],
  },
  estMinutes: 10,
  prereqs: ['security-best-practices', 'sql'],
  related: ['security-best-practices', 'authentication-authorization', 'api-testing', 'secrets-management'],
  tags: ['injection', 'broken access control', 'XSS', 'SSRF', 'cryptographic failures', 'misconfiguration', 'IDOR'],
  visual: {
    type: 'compare',
    config: { left: { title: 'Vulnerable app' }, right: { title: 'Hardened app' } },
  },
  steps: [
    {
      label: 'Review list',
      caption: {
        beginner: 'Learn the list of the most common ways web apps get broken into.',
        intermediate: 'The list ranks risk categories, not single bugs: broken access control, cryptographic failures, injection, insecure design, misconfiguration, vulnerable components, auth failures and more.',
        expert: 'The list is data-driven and revised every few years. The current edition is 2021 at the time of writing. // VERIFY Use it as a checklist, with ASVS for detailed requirements.',
      },
      state: { without: ['No security checklist', 'Risks unknown'], with: ['Top 10 used as a checklist', 'Risks listed per feature'], diverge: false, verdict: '' },
      hood: 'OWASP ASVS provides testable requirements.',
    },
    {
      label: 'Map to your app',
      caption: {
        beginner: 'Look at your own app and find where each risk could happen.',
        intermediate: 'For each endpoint, ask: who may call it, what input reaches a query, what data is returned, and which libraries are involved.',
        expert: 'Threat model data flows and trust boundaries; map risks to concrete assets, then prioritise by likelihood and impact.',
      },
      state: { without: ['/users/{id} returns any user', 'raw SQL string building'], with: ['/users/{id} checks ownership', 'parameterised queries'], diverge: true, verdict: 'Same feature, different risk' },
      hood: 'IDOR: object ids guessable and unchecked.',
    },
    {
      label: 'Test (injection, access)',
      caption: {
        beginner: 'Try to break your own app on purpose, before someone else does.',
        intermediate: 'Test with payloads such as \' OR 1=1 -- and with another user\'s ids. Use SAST, DAST and dependency scanners in CI.',
        expert: 'Combine automated scanning with manual testing for business logic and authorization flaws that scanners miss.',
      },
      state: { without: ["name=' OR 1=1 -- returns all rows", 'user 5 reads user 9 data'], with: ['payload treated as text, 0 rows', 'user 5 gets 403 for user 9'], diverge: true, verdict: 'Attack succeeds only without the fix' },
      hood: 'Parameterised queries separate code from data.',
    },
    {
      label: 'Fix and retest',
      caption: {
        beginner: 'Repair the weak spots and test again to be sure they are closed.',
        intermediate: 'Fix the root cause (parameterise, enforce ownership, update libraries), add a regression test, then re-scan.',
        expert: 'Fix classes of bugs with secure defaults and shared libraries, and gate CI on security tests so they stay fixed.',
      },
      state: { without: ['Quick patch on one endpoint', 'Same bug elsewhere'], with: ['Shared safe query helper', 'Regression tests in CI'], diverge: true, verdict: 'Fix the class, not the instance' },
      hood: 'Add a failing test first, then fix.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A building inspector\'s checklist. Inspectors know the most common faults: unlocked doors, weak locks, wrong wiring. Walking through the list finds most real problems before anyone is harmed.',
      explanation: 'OWASP is a non-profit that publishes the ten most common and serious web security risks. Developers use it as a checklist to avoid well-known mistakes.',
      keyTerms: [
        { term: 'Injection', meaning: 'Attacker input is run as code, such as SQL.' },
        { term: 'Broken access control', meaning: 'Users can do or see things they should not.' },
        { term: 'XSS', meaning: 'Attacker script runs in another user\'s browser.' },
        { term: 'IDOR', meaning: 'Changing an id in the URL exposes someone else\'s data.' },
        { term: 'Misconfiguration', meaning: 'Unsafe defaults or open settings.' },
      ],
    },
    intermediate: {
      explanation: 'Each category has standard defences: parameterised queries for injection, server-side ownership checks for access control, strong crypto and TLS, secure defaults, dependency scanning, and logging with alerting.',
      howItWorks: [
        'Read the current list and ASVS.',
        'Threat model your endpoints and data.',
        'Add automated SAST, DAST and dependency scans.',
        'Write security tests for injection and access control.',
        'Fix root causes with shared safe helpers.',
        'Retest and monitor.',
      ],
      tradeoffs: {
        use: [
          'Use it as a baseline checklist for reviews.',
          'Use it to prioritise security training.',
          'Use it to frame test cases in CI.',
        ],
        avoid: [
          'Avoid treating it as a complete security programme.',
          'Avoid fixing only the example payload rather than the cause.',
          'Avoid relying on a WAF instead of fixing code.',
        ],
      },
      pitfalls: [
        'String-built SQL with user input.',
        'Checking login but not object ownership.',
        'Default credentials and debug mode in production.',
        'Using libraries with known vulnerabilities.',
        'Missing logging of failed logins and access denials.',
      ],
    },
    expert: {
      internals: [
        'SQL injection works because the parser treats concatenated input as syntax; bound parameters send the query plan and values separately.',
        'XSS is mitigated by context-aware output encoding and Content-Security-Policy; SSRF by allow-listing destinations and blocking metadata IPs.',
        'Access control flaws are logic bugs, so scanners rarely find them; tests need multiple user identities.',
        'Insecure deserialization and SSRF can lead to remote code execution or cloud credential theft.',
      ],
      failureModes: [
        'Blind injection extracting data through timing or boolean responses.',
        'Mass assignment letting clients set fields such as is_admin.',
        'SSRF reaching the cloud metadata service.',
        'Vulnerable transitive dependency exploited before a patch is rolled out.',
      ],
      scalingNotes: [
        'Provide secure-by-default libraries so teams cannot easily write unsafe code.',
        'Automate scans and block merges on high severity findings.',
        'Run a bug bounty or periodic penetration test.',
      ],
      realSystems: [
        'OWASP ZAP, Burp Suite, Semgrep, Bandit for Python, Dependabot, Snyk, Trivy.',
        'SQLAlchemy bound parameters and Django ORM for injection safety.',
        'AWS IMDSv2 to reduce SSRF impact.',
      ],
      numbersToKnow: [
        'Broken access control was ranked first in the OWASP Top 10 2021, and injection moved to third. // VERIFY',
        'The Top 10 is revised roughly every three to four years.',
        'Cloud IMDSv2 requires a session token header that simple SSRF cannot add.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'SQL injection: vulnerable vs safe',
      code: [
        '# VULNERABLE',
        'q = f"SELECT * FROM users WHERE name = \'{name}\'"',
        'rows = db.execute(text(q))',
        '',
        '# SAFE: bound parameter',
        'rows = db.execute(text("SELECT * FROM users WHERE name = :n"), {"n": name})',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Concatenation lets input change the query structure.' },
        { line: 6, text: 'A bound parameter is always treated as data.' },
      ],
    },
    {
      lang: 'python',
      title: 'Ownership check against IDOR',
      code: [
        '@app.get("/orders/{oid}")',
        'def get_order(oid: int, user=Depends(current_user)):',
        '    order = db.get(Order, oid)',
        '    if order is None or order.user_id != user.id:',
        '        raise HTTPException(404)',
        '    return order',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'Ownership is verified, not only authentication.' },
        { line: 5, text: 'Return 404 to avoid revealing that the id exists.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is the OWASP Top 10?', answer: 'A regularly updated list of the most critical web application security risks, used as an awareness checklist.', followUps: ['Name two items.'] },
    { level: 'beginner', q: 'What is SQL injection?', answer: 'Attacker-controlled input is interpreted as part of a SQL query, letting them read or change data.', followUps: ['How do you prevent it?'] },
    { level: 'intermediate', q: 'How do you prevent SQL injection?', answer: 'Use parameterised queries or an ORM with bound parameters, validate input, and run the app with a least-privilege database role.', followUps: ['Why is escaping alone weak?'] },
    { level: 'intermediate', q: 'What is broken access control?', answer: 'Users can access data or actions beyond their permissions, such as IDOR where changing an id reveals another user\'s record. Enforce checks server-side on every request.', followUps: ['How would you test for it?'] },
    { level: 'expert', q: 'Why do scanners miss broken access control?', answer: 'It depends on business rules about who owns what. Tools need to know identities and expected permissions, so tests with multiple users and manual review are needed.', followUps: ['How do you automate it?'] },
    { level: 'expert', q: 'Explain SSRF and a mitigation strategy.', answer: 'The server is tricked into requesting internal URLs, such as cloud metadata. Mitigate with destination allow-lists, blocking private and link-local ranges after DNS resolution, no redirects, and IMDSv2.', followUps: ['Why resolve DNS before checking?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'OWASP publishes...', options: ['Top web security risks', 'A programming language', 'A cloud', 'A database'], answerIndex: 0, why: 'The Top 10 is its best-known list.' },
    { level: 'intermediate', q: 'Best SQL injection defence?', options: ['Parameterised queries', 'Hide the table name', 'Longer passwords', 'Client-side checks'], answerIndex: 0, why: 'Parameters keep data separate from code.' },
    { level: 'intermediate', q: 'IDOR is an example of...', options: ['Broken access control', 'Slow queries', 'Memory leak', 'DNS failure'], answerIndex: 0, why: 'Ownership is not checked.' },
    { level: 'expert', q: 'SSRF is mitigated by...', options: ['Destination allow-lists and metadata protection', 'Larger JSON', 'More logs only', 'Using GET'], answerIndex: 0, why: 'Restrict where the server may call.' },
  ],
});
