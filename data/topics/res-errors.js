/* Resilience: Error Handling. */
Atlas.topics.push({
  id: 'error-handling',
  category: 'resilience',
  title: 'Error Handling',
  source: {
    description: 'Fail clearly, log context and never swallow errors.',
    steps: ['Catch', 'Classify (retryable or not)', 'Log with context', 'Return clear error'],
  },
  estMinutes: 10,
  prereqs: [],
  related: ['retry-strategies-exponential-backoff', 'logging', 'fault-tolerance', 'api-testing'],
  tags: ['exceptions', 'error codes', 'problem details', 'logging', 'retryable', 'fail fast'],
  visual: {
    type: 'pipeline',
    config: { stages: [{ id: 'catch', label: 'Catch', sub: 'exception' }, { id: 'classify', label: 'Classify', sub: 'retryable?' }, { id: 'log', label: 'Log', sub: 'with context' }, { id: 'respond', label: 'Respond', sub: 'clear error' }] },
  },
  steps: [
    {
      label: 'Catch',
      caption: {
        beginner: 'Something goes wrong and the program notices instead of crashing blindly.',
        intermediate: 'Catch specific exceptions where you can act on them, not a blanket except that hides bugs.',
        expert: 'Handle errors at the layer that has the context to decide; let others propagate. Never use bare except or silently pass.',
      },
      state: { active: ['catch'], payload: { catch: 'TimeoutError' }, changed: 'A specific error is caught.' },
      hood: 'Catch narrow types; re-raise with raise ... from to keep the cause.',
    },
    {
      label: 'Classify (retryable or not)',
      caption: {
        beginner: 'Decide: is this a temporary hiccup or a real mistake?',
        intermediate: 'Distinguish client errors (bad input), transient errors (retry) and server bugs, and map each to the right response.',
        expert: 'A typed error taxonomy (validation, not found, conflict, dependency, internal) drives retry policy, status codes, alerting and user messages.',
      },
      state: { active: ['classify'], payload: { classify: 'transient: retry' }, changed: 'The error is classified as transient.' },
      hood: 'Taxonomy drives HTTP status, retry and alert severity.',
    },
    {
      label: 'Log with context',
      caption: {
        beginner: 'Write down what happened and where, so someone can fix it later.',
        intermediate: 'Log once with request id, user or tenant, inputs and stack trace, without secrets or personal data.',
        expert: 'Log at the boundary, not at every layer, to avoid duplicates. Use structured logs and correlate with trace ids. Redact secrets and PII.',
      },
      state: { active: ['log'], payload: { log: 'req=ab12 user=7' }, changed: 'Context is recorded.' },
      hood: 'Structured JSON logs with trace_id; never log tokens or passwords.',
    },
    {
      label: 'Return clear error',
      caption: {
        beginner: 'Tell the user something helpful without exposing internal details.',
        intermediate: 'Return the right status code and a consistent body (for example RFC 9457 problem details) with a stable error code.',
        expert: 'Do not leak stack traces or internals to clients; give a correlation id support can use. Make errors machine-readable so clients can react.',
      },
      state: { active: ['respond'], payload: { respond: '503 + retry-after' }, changed: 'A clear, safe error is returned.' },
      hood: 'RFC 9457 problem+json: type, title, status, detail, instance.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A pilot handling a warning light. They do not ignore it or panic: they identify it, note it in the log, tell passengers what matters, and follow the right procedure.',
      explanation: 'Errors will happen. Good handling means noticing them, understanding what kind they are, recording enough detail to debug, and telling the caller clearly. Swallowing errors hides problems until they become disasters.',
      keyTerms: [
        { term: 'Exception', meaning: 'An object signaling that something went wrong.' },
        { term: 'Retryable', meaning: 'An error that may succeed if tried again.' },
        { term: 'Status code', meaning: 'A number in an HTTP response describing the outcome.' },
        { term: 'Stack trace', meaning: 'A list of calls that led to the error.' },
      ],
    },
    intermediate: {
      explanation: 'Define an error model, handle errors at the right layer, log once with context, and map internal errors to stable API responses. Fail fast on invalid input and degrade gracefully on dependency failures.',
      howItWorks: [
        'Validate input early and raise specific errors.',
        'Catch exceptions where recovery or translation is possible.',
        'Classify as client, transient or internal.',
        'Log with request id and structured fields.',
        'Translate to an HTTP status and consistent error body.',
        'Alert on unexpected (internal) errors, not expected client errors.',
      ],
      tradeoffs: {
        use: [
          'Use specific exception types and a central handler.',
          'Use fail-fast validation at the boundary.',
          'Use fallbacks for non-critical dependencies.',
        ],
        avoid: [
          'Avoid catching Exception and continuing silently.',
          'Avoid returning 200 with an error in the body.',
          'Avoid leaking stack traces or SQL to clients.',
        ],
      },
      pitfalls: [
        'Swallowed exceptions hiding data corruption.',
        'Logging the same error at every layer.',
        'Logging secrets or personal data.',
        'Inconsistent error formats across endpoints.',
        'Treating every error as 500.',
      ],
    },
    expert: {
      internals: [
        'Exception chaining (raise X from e) preserves the cause; in Python tracebacks include the chain.',
        'A global exception handler (FastAPI exception_handler, Django middleware) maps domain errors to responses in one place.',
        'Error budgets and SLOs depend on classifying which errors count against availability (5xx) and which do not (4xx).',
        'Result types or explicit error returns (Go, Rust) trade brevity for visibility of failure paths.',
      ],
      failureModes: [
        'Retrying permanent errors, or never retrying transient ones.',
        'Error handling code that itself throws, masking the original error.',
        'Partial failure leaving inconsistent state because cleanup was skipped; use transactions and finally.',
        'Log floods during outages exhausting disk or budget.',
      ],
      scalingNotes: [
        'Sample or rate limit repetitive error logs; aggregate with an error tracker.',
        'Group errors by fingerprint (Sentry) to prioritize.',
        'Standardize error codes across services so clients and dashboards stay uniform.',
      ],
      realSystems: [
        'Sentry, Rollbar, OpenTelemetry for error tracking; structlog and loguru in Python.',
        'RFC 9457 problem details; gRPC status codes; Stripe error object with type and code.',
        'FastAPI exception handlers; Django REST framework exception handler.',
      ],
      numbersToKnow: [
        '4xx are client errors; 5xx are server errors and usually count against availability SLOs.',
        '429 and 503 are commonly retryable; 400, 401, 403, 404 are not.',
        'Keep error responses small and consistent; include a correlation id.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Domain errors mapped in one handler (FastAPI)',
      code: [
        'import logging',
        'from fastapi import Request',
        'from fastapi.responses import JSONResponse',
        '',
        'log = logging.getLogger(__name__)',
        '',
        'class AppError(Exception):',
        '    status, code = 500, "internal"',
        '',
        'class NotFound(AppError):',
        '    status, code = 404, "not_found"',
        '',
        '@app.exception_handler(AppError)',
        'async def handle(req: Request, exc: AppError):',
        '    log.error("request failed", extra={"path": req.url.path, "code": exc.code}, exc_info=exc)',
        '    return JSONResponse({"code": exc.code, "detail": str(exc)}, status_code=exc.status)',
      ].join('\n'),
      annotations: [
        { line: 7, text: 'A base class carries the status and a stable machine-readable code.' },
        { line: 14, text: 'One handler gives consistent responses and logs once at the boundary.' },
        { line: 15, text: 'exc_info keeps the stack trace in logs but out of the response.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Why not use an empty except block?', answer: 'It hides errors, so bugs and data problems go unnoticed. Catch specific errors and handle or log them.', followUps: ['When is catching broadly acceptable?'] },
    { level: 'beginner', q: 'What should an error response contain?', answer: 'A correct status code, a stable error code, a short helpful message, and a correlation id, but no internal details.', followUps: ['Why hide stack traces?'] },
    { level: 'intermediate', q: 'Where should you log an error?', answer: 'Once, at the boundary that handles it, with context like request id. Logging at every layer creates duplicates and noise.', followUps: ['What should never be logged?'] },
    { level: 'intermediate', q: 'How do you decide if an error is retryable?', answer: 'Transient infrastructure errors (timeouts, 503, 429) usually are; validation, auth and not-found errors are not. Encode this in an error taxonomy.', followUps: ['What about 500?'] },
    { level: 'expert', q: 'How would you design error handling across 20 services?', answer: 'Agree a shared taxonomy and problem-details format, map to HTTP/gRPC codes, propagate trace ids, centralize handlers in a shared library, and track error rates against SLOs with clear ownership per error class.', followUps: ['How do you evolve error codes safely?'] },
    { level: 'expert', q: 'Cleanup code throws while handling an error. What happens?', answer: 'The new exception can mask the original. Use chaining, keep cleanup minimal and non-throwing, use context managers and log both. Make cleanup idempotent.', followUps: ['How does Python show chained exceptions?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Swallowing an exception means...', options: ['Hiding it without handling', 'Logging it', 'Retrying it', 'Fixing it'], answerIndex: 0, why: 'The problem silently disappears.' },
    { level: 'beginner', q: 'A client sends invalid input. Best status?', options: ['400', '500', '200', '503'], answerIndex: 0, why: 'It is a client error.' },
    { level: 'intermediate', q: 'Where to log an error?', options: ['Once at the handling boundary', 'At every layer', 'Never', 'In the response body'], answerIndex: 0, why: 'Avoids duplicate noise and keeps context.' },
    { level: 'expert', q: 'What should clients get on internal errors?', options: ['A correlation id, no stack trace', 'The full stack trace', 'SQL text', 'Passwords'], answerIndex: 0, why: 'Do not leak internals.' },
  ],
});
