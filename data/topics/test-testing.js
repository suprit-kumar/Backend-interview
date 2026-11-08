/* Testing: Testing (overview). */
Atlas.topics.push({
  id: 'testing',
  category: 'testing',
  title: 'Testing',
  source: {
    description: 'Automated checks give confidence to change code.',
    steps: ['Write tests', 'Run in CI', 'Fail fast', 'Fix'],
  },
  estMinutes: 9,
  prereqs: ['clean-code'],
  related: ['unit-testing', 'integration-testing', 'api-testing', 'ci-cd'],
  tags: ['test pyramid', 'regression', 'TDD', 'coverage', 'flaky tests', 'CI', 'mocks'],
  visual: {
    type: 'layers',
    config: {
      payload: 'code change',
      layers: [
        { id: 'e2e', label: 'End-to-end tests', unit: 'few, slow', header: 'full system, browser/API', detail: 'Cover critical user journeys only; slowest and most brittle.' },
        { id: 'int', label: 'Integration tests', unit: 'some, medium', header: 'real DB / services', detail: 'Check that components work together, including real SQL and queues.' },
        { id: 'unit', label: 'Unit tests', unit: 'many, fast', header: 'one function / class', detail: 'Fast, isolated checks of logic with dependencies mocked.' },
        { id: 'ci', label: 'CI gate', unit: 'on every push', header: 'run + block', detail: 'Run all suites automatically and block bad merges.' },
      ],
    },
  },
  steps: [
    {
      label: 'Write tests',
      caption: {
        beginner: 'Write small checks that describe what the code should do.',
        intermediate: 'Follow the test pyramid: many fast unit tests, fewer integration tests, and very few end-to-end tests.',
        expert: 'Test behaviour not implementation. Over-mocked tests pass while the system is broken, and brittle tests slow refactoring.',
      },
      state: { active: ['unit'], wrapped: [] },
      hood: 'Arrange, act, assert; one reason to fail per test.',
    },
    {
      label: 'Run in CI',
      caption: {
        beginner: 'A robot runs all the checks every time someone changes the code.',
        intermediate: 'CI runs the suites on every push and pull request in a clean, reproducible environment.',
        expert: 'Parallelise and shard suites, cache dependencies, and run the cheap suites first so feedback arrives in minutes.',
      },
      state: { active: ['int', 'unit'], wrapped: [] },
      hood: 'Fast feedback keeps developers running tests.',
    },
    {
      label: 'Fail fast',
      caption: {
        beginner: 'If a check fails, the problem is shown straight away, before it reaches users.',
        intermediate: 'Order tests from fastest to slowest and stop on the first critical failure; block merges on red builds.',
        expert: 'Quarantine flaky tests with a tracked owner instead of retrying silently, because retries hide real races.',
      },
      state: { active: ['ci'], wrapped: ['unit', 'int'] },
      hood: 'A flaky test erodes trust in the whole suite.',
    },
    {
      label: 'Fix',
      caption: {
        beginner: 'Repair the code until all checks pass again.',
        intermediate: 'Reproduce with a failing test, fix the code, and keep the test as a regression guard.',
        expert: 'Use mutation testing and coverage of risky paths, not a raw coverage percentage, to judge test quality.',
      },
      state: { active: ['e2e', 'ci'], wrapped: ['unit', 'int'] },
      hood: 'Coverage measures execution, not correctness.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Quality checks in a car factory. Each part is checked alone, then the assembled engine, then the finished car is test-driven. Catching a fault early on the line is far cheaper than a recall.',
      explanation: 'Automated tests are programs that check your program. They run in seconds and tell you immediately if a change broke something, so you can change code without fear.',
      keyTerms: [
        { term: 'Unit test', meaning: 'Checks one small piece of code.' },
        { term: 'Integration test', meaning: 'Checks that parts work together.' },
        { term: 'Regression', meaning: 'Something that used to work and broke.' },
        { term: 'Mock', meaning: 'A fake stand-in for a real dependency.' },
        { term: 'Coverage', meaning: 'The share of code run by tests.' },
      ],
    },
    intermediate: {
      explanation: 'A healthy suite follows the test pyramid, runs in CI, is deterministic and fast, and tests behaviour at the right level. Test doubles isolate dependencies, and each bug fixed gets a regression test.',
      howItWorks: [
        'Write tests with clear names and one purpose.',
        'Isolate with fixtures and test doubles when needed.',
        'Run fast tests locally and the full suite in CI.',
        'Block merges when tests fail.',
        'Track flaky tests and fix or quarantine them.',
        'Add a regression test for each bug.',
      ],
      tradeoffs: {
        use: [
          'Use many unit tests for logic with branches and edge cases.',
          'Use integration tests where behaviour depends on a real database or broker.',
          'Use end-to-end tests only for critical journeys.',
        ],
        avoid: [
          'Avoid testing private implementation details.',
          'Avoid chasing 100% coverage as a goal.',
          'Avoid tests that depend on order, time or the network.',
        ],
      },
      pitfalls: [
        'Flaky tests from shared state, sleeps or real clocks.',
        'Mocking so much that nothing real is tested.',
        'Slow suites that developers stop running.',
        'Tests that assert on exact log text or internals.',
        'No tests for the error and edge paths.',
      ],
    },
    expert: {
      internals: [
        'pytest discovers tests, builds fixtures with dependency injection and scopes (function, module, session), and rewrites asserts for rich failure output.',
        'Test doubles include stubs, fakes, spies and mocks; fakes with real behaviour are often sturdier than mocks of call sequences.',
        'Property-based testing (Hypothesis) generates inputs; mutation testing (mutmut) measures whether tests detect injected bugs.',
        'Contract tests (Pact) verify consumer and provider agree without a full environment.',
      ],
      failureModes: [
        'Flaky tests from concurrency, time, ordering or shared databases.',
        'Environment drift between CI and production hiding bugs.',
        'False confidence from high coverage with weak assertions.',
        'Test data coupling across suites.',
      ],
      scalingNotes: [
        'Shard and parallelise tests; isolate data per worker.',
        'Use testcontainers for real dependencies in CI.',
        'Run slow end-to-end suites on merge or nightly, not on every push.',
      ],
      realSystems: [
        'pytest, unittest, Hypothesis, coverage.py, mutmut, Pact, Testcontainers.',
        'Jest, JUnit, Playwright, Cypress, k6.',
        'GitHub Actions, GitLab CI, Jenkins running the suites.',
      ],
      numbersToKnow: [
        'A common guideline is unit tests in milliseconds, integration in seconds, end-to-end in tens of seconds each.',
        'Teams often aim for CI feedback within about 10 minutes. // VERIFY',
        'The 70/20/10 unit/integration/end-to-end split is a rough heuristic, not a rule. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'A pytest test with a fixture',
      code: [
        'import pytest',
        'from app.pricing import total',
        '',
        '@pytest.fixture',
        'def cart():',
        '    return [{"price": 1000, "qty": 2}, {"price": 500, "qty": 1}]',
        '',
        'def test_total_sums_lines(cart):',
        '    assert total(cart) == 2500',
        '',
        'def test_empty_cart_is_zero():',
        '    assert total([]) == 0',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'A fixture builds shared, fresh test data.' },
        { line: 9, text: 'One behaviour per test, with a clear assertion.' },
        { line: 12, text: 'Edge cases deserve their own test.' },
      ],
    },
    {
      lang: 'yaml',
      title: 'Run tests in CI',
      code: [
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - run: pip install -r requirements.txt',
        '      - run: pytest -x -q --cov=app',
      ].join('\n'),
      annotations: [
        { line: 7, text: '-x stops at the first failure so the team gets fast feedback.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why write automated tests?', answer: 'They catch bugs early, protect against regressions and let you change code with confidence.', followUps: ['What is a regression?'] },
    { level: 'beginner', q: 'What is the difference between a unit test and an integration test?', answer: 'A unit test checks one piece in isolation. An integration test checks that several pieces, such as code and a database, work together.', followUps: ['Which runs faster?'] },
    { level: 'intermediate', q: 'What is the test pyramid?', answer: 'Many fast unit tests at the base, fewer integration tests in the middle, and a small number of slow end-to-end tests on top, to balance speed, cost and confidence.', followUps: ['What is the "ice cream cone" anti-pattern?'] },
    { level: 'intermediate', q: 'How do you handle a flaky test?', answer: 'Find the cause, usually shared state, timing, ordering or external calls, then fix it. If not immediately fixable, quarantine it with an owner. Do not rely on blind retries.', followUps: ['Why are retries risky?'] },
    { level: 'expert', q: 'Is 100% code coverage a good goal?', answer: 'No. Coverage shows which lines ran, not whether assertions are meaningful. Target risky paths, use mutation testing to measure effectiveness, and avoid tests written only to raise the number.', followUps: ['What would you measure instead?'] },
    { level: 'expert', q: 'How do you test a service with many dependencies without slow end-to-end suites?', answer: 'Use unit tests for logic, integration tests with real databases in containers, and consumer-driven contract tests for service boundaries, keeping a few end-to-end smoke tests for critical flows.', followUps: ['How do contract tests stay current?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Automated tests mainly...', options: ['Catch regressions quickly', 'Replace developers', 'Slow deployment on purpose', 'Encrypt code'], answerIndex: 0, why: 'They give fast feedback on changes.' },
    { level: 'intermediate', q: 'The test pyramid recommends...', options: ['Many unit tests, few end-to-end tests', 'Only end-to-end tests', 'No unit tests', 'Equal numbers of all'], answerIndex: 0, why: 'Fast, cheap tests form the base.' },
    { level: 'intermediate', q: 'A flaky test is one that...', options: ['Passes and fails without code changes', 'Always fails', 'Is too short', 'Has no name'], answerIndex: 0, why: 'It is non-deterministic.' },
    { level: 'expert', q: 'Mutation testing measures...', options: ['Whether tests detect injected bugs', 'Lines executed', 'Build time', 'Memory use'], answerIndex: 0, why: 'It checks the strength of assertions.' },
  ],
});
