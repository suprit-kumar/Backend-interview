/* Testing: API Testing. */
Atlas.topics.push({
  id: 'api-testing',
  category: 'testing',
  title: 'API Testing',
  source: {
    description: 'Verify endpoints, status codes and payloads.',
    steps: ['Send request', 'Check status', 'Check JSON schema', 'Check auth rules'],
  },
  estMinutes: 8,
  prereqs: ['rest-apis', 'testing'],
  related: ['rest-apis', 'integration-testing', 'authentication-authorization', 'owasp-top-10'],
  tags: ['status codes', 'JSON schema', 'TestClient', 'contract', 'OpenAPI', 'auth tests', 'negative tests'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 't', label: 'Test' }, { id: 'api', label: 'API' }, { id: 'db', label: 'DB' }] },
  },
  steps: [
    {
      label: 'Send request',
      caption: {
        beginner: 'The test sends a request to the API, like a customer placing an order.',
        intermediate: 'Build a request with method, path, headers and body, using a test client or HTTP library.',
        expert: 'In-process clients (FastAPI TestClient, Django test client) are fast and skip the network. Use a real server for transport-level behaviour such as TLS, gzip and timeouts.',
      },
      state: { messages: [{ from: 't', to: 'api', label: 'POST /orders {qty: 2}', tone: 'plain' }] },
      hood: 'In-process vs over-the-wire tests.',
    },
    {
      label: 'Check status',
      caption: {
        beginner: 'Check that the reply says "created" and not "error".',
        intermediate: 'Assert the status code: 201 for created, 400 or 422 for invalid input, 404 for missing, 409 for conflict.',
        expert: 'Status codes are the contract clients branch on. Test both success and each documented failure code.',
      },
      state: { messages: [{ from: 't', to: 'api', label: 'POST /orders {qty: 2}', tone: 'plain' }, { from: 'api', to: 'db', label: 'INSERT', tone: 'plain' }, { from: 'api', to: 't', label: '201 Created', tone: 'good', back: true }] },
      hood: '4xx vs 5xx mistakes are common bugs.',
    },
    {
      label: 'Check JSON schema',
      caption: {
        beginner: 'Check that the reply contains the right fields.',
        intermediate: 'Validate the body against a schema: required fields, types and formats, not just a couple of values.',
        expert: 'Validate responses against the OpenAPI document to catch drift between docs and behaviour, and test backward-compatible changes.',
      },
      state: { messages: [{ from: 't', to: 'api', label: 'GET /orders/7', tone: 'plain' }, { from: 'api', to: 't', label: '{id, qty, status}', tone: 'ok', back: true }] },
      hood: 'Schema checks catch silent breaking changes.',
    },
    {
      label: 'Check auth rules',
      caption: {
        beginner: 'Check that people who should not get in are turned away.',
        intermediate: 'Test no token (401), wrong role (403) and another user\'s resource (403 or 404), plus the happy path.',
        expert: 'Use multiple identities per test to find broken access control, and also test expired and tampered tokens.',
      },
      state: { messages: [{ from: 't', to: 'api', label: 'GET /orders/7 (user B)', tone: 'plain' }, { from: 'api', to: 't', label: '404 not yours', tone: 'bad', back: true }] },
      hood: 'Negative tests are as important as positive ones.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A restaurant mystery diner. They order specific dishes, check each arrives correctly, check the bill is right, and also try to walk into the kitchen to see if the staff stop them.',
      explanation: 'API testing sends requests to your endpoints and checks the replies: the status code, the data shape and who is allowed to do what.',
      keyTerms: [
        { term: 'Status code', meaning: 'A number saying whether a request worked.' },
        { term: 'Payload', meaning: 'The data in a request or response.' },
        { term: 'Schema', meaning: 'The expected shape of the data.' },
        { term: 'Negative test', meaning: 'A test that expects a failure.' },
        { term: 'Test client', meaning: 'A tool that calls the API in tests.' },
      ],
    },
    intermediate: {
      explanation: 'API tests cover the contract: correct status codes, response schema, validation errors, authentication and authorization, pagination and idempotency. They run quickly against an in-process app with a test database.',
      howItWorks: [
        'Create a test client for the app.',
        'Seed data with fixtures.',
        'Send requests for success and failure cases.',
        'Assert status, headers and body schema.',
        'Test auth with several identities.',
        'Run in CI and against staging after deploy.',
      ],
      tradeoffs: {
        use: [
          'Use them to guard the public contract clients depend on.',
          'Use them for validation and auth rules.',
          'Use them as smoke tests after deployment.',
        ],
        avoid: [
          'Avoid duplicating every unit test through HTTP.',
          'Avoid asserting on whole bodies including volatile fields.',
          'Avoid tests that depend on other tests\' data.',
        ],
      },
      pitfalls: [
        'Only testing the happy path.',
        'Checking status but not the body.',
        'Ignoring headers such as Content-Type, caching and rate-limit headers.',
        'Hard-coded ids and ordering assumptions.',
        'No tests for malformed or oversized input.',
      ],
    },
    expert: {
      internals: [
        'FastAPI TestClient runs the ASGI app in-process and drives it through the same middleware and dependency stack.',
        'Dependency overrides let tests swap authentication or database dependencies cleanly.',
        'Schemathesis and Dredd generate tests from an OpenAPI spec, including property-based edge cases.',
        'Consumer-driven contracts record what each client actually uses.',
      ],
      failureModes: [
        'Documentation drifting from behaviour.',
        'Auth bypass from missing dependency on one route.',
        'Flaky tests from shared state or time-based tokens.',
        'Backward-incompatible changes such as a removed field passing unnoticed.',
      ],
      scalingNotes: [
        'Generate tests from OpenAPI to cover every route.',
        'Run smoke tests against each environment after deploy.',
        'Version the API and test old versions until retired.',
      ],
      realSystems: [
        'pytest with httpx or FastAPI TestClient, Django test client, requests.',
        'Postman and Newman, REST Assured, Schemathesis, Pact.',
        'Spectral for OpenAPI linting.',
      ],
      numbersToKnow: [
        'In-process API tests typically take milliseconds to tens of milliseconds each. // VERIFY',
        '401 means unauthenticated and 403 means authenticated but forbidden.',
        '422 is used by FastAPI for validation errors.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'FastAPI endpoint tests',
      code: [
        'from fastapi.testclient import TestClient',
        'from app.main import app',
        '',
        'client = TestClient(app)',
        '',
        'def test_create_order_ok(auth_headers):',
        '    r = client.post("/orders", json={"qty": 2}, headers=auth_headers)',
        '    assert r.status_code == 201',
        '    assert set(r.json()) >= {"id", "qty", "status"}',
        '',
        'def test_create_order_invalid():',
        '    r = client.post("/orders", json={"qty": -1}, headers=auth_headers_user())',
        '    assert r.status_code == 422',
        '',
        'def test_requires_auth():',
        '    assert client.get("/orders/7").status_code == 401',
        '',
        'def test_cannot_read_other_users_order(other_user_headers):',
        '    assert client.get("/orders/7", headers=other_user_headers).status_code in (403, 404)',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'The in-process client calls the app without a network.' },
        { line: 8, text: 'Assert the documented status code.' },
        { line: 9, text: 'Assert the response shape, not just one value.' },
        { line: 17, text: 'Missing token must be rejected.' },
        { line: 19, text: 'Ownership check prevents IDOR.' },
      ],
    },
    {
      lang: 'bash',
      title: 'Generate tests from OpenAPI',
      code: [
        'pip install schemathesis',
        'schemathesis run http://localhost:8000/openapi.json --checks all',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Generates edge-case requests for every route and checks responses against the schema.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What do you check in an API test?', answer: 'The status code, the response body and headers, and that access rules are enforced.', followUps: ['What is a negative test?'] },
    { level: 'beginner', q: 'What does a 404 vs 500 mean?', answer: '404 means the resource was not found, a client-side problem. 500 means the server failed unexpectedly.', followUps: ['Should invalid input return 500?'] },
    { level: 'intermediate', q: 'Which cases should you test for one endpoint?', answer: 'Success, validation failures, not found, unauthenticated, unauthorised and conflicts, plus pagination and idempotency where relevant.', followUps: ['How many are enough?'] },
    { level: 'intermediate', q: '401 vs 403?', answer: '401 means the caller is not authenticated. 403 means authenticated but not allowed.', followUps: ['When would you return 404 instead of 403?'] },
    { level: 'expert', q: 'How do you prevent API documentation drifting from behaviour?', answer: 'Generate the OpenAPI spec from code, validate responses against it in tests, use Schemathesis for property-based checks, lint the spec, and run consumer contract tests.', followUps: ['How do you detect a breaking change?'] },
    { level: 'expert', q: 'How do you test authorization at scale?', answer: 'Build a matrix of roles and resources with expected outcomes, drive it with parametrised tests using several real identities, include expired and tampered tokens, and verify ownership checks on every object route.', followUps: ['How do you keep it from going stale?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Creating a resource successfully commonly returns...', options: ['201', '404', '500', '301'], answerIndex: 0, why: '201 Created.' },
    { level: 'intermediate', q: 'A missing token should give...', options: ['401', '201', '204', '302'], answerIndex: 0, why: 'The caller is unauthenticated.' },
    { level: 'intermediate', q: 'A schema check verifies...', options: ['Fields and types of the response', 'CPU usage', 'DNS records', 'Git history'], answerIndex: 0, why: 'It ensures the body has the agreed shape.' },
    { level: 'expert', q: 'Schemathesis generates tests from...', options: ['An OpenAPI spec', 'Server logs only', 'The database file', 'CSS'], answerIndex: 0, why: 'It uses the spec to build edge cases.' },
  ],
});
