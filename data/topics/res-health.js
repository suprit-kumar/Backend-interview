/* Resilience: Health Checks. */
Atlas.topics.push({
  id: 'health-checks',
  category: 'resilience',
  title: 'Health Checks',
  source: {
    description: 'Probes tell the platform which instances to trust.',
    steps: ['Probe /health', 'Healthy: keep traffic', 'Unhealthy: remove', 'Restart'],
  },
  estMinutes: 9,
  prereqs: ['load-balancing'],
  related: ['load-balancing', 'kubernetes-basics', 'fault-tolerance', 'monitoring'],
  tags: ['liveness', 'readiness', 'startup probe', '/health', 'kubernetes', 'probe'],
  visual: {
    type: 'sequence',
    config: { actors: [{ id: 'p', label: 'Platform / LB' }, { id: 'app', label: 'App instance' }, { id: 'db', label: 'Dependency' }] },
  },
  steps: [
    {
      label: 'Probe /health',
      caption: {
        beginner: 'The platform regularly asks the app: "are you okay?"',
        intermediate: 'A load balancer or orchestrator calls an endpoint such as /health every few seconds.',
        expert: 'Separate liveness (is the process stuck?), readiness (can it serve now?) and startup (is it still booting?) so each triggers the right action.',
      },
      state: { messages: [{ from: 'p', to: 'app', label: 'GET /ready', tone: 'plain' }] },
      hood: 'Kubernetes has three probes: liveness, readiness, startup.',
    },
    {
      label: 'Healthy: keep traffic',
      caption: {
        beginner: 'The app says "fine", so it keeps getting visitors.',
        intermediate: 'A 200 response keeps the instance in rotation. Readiness may check key dependencies such as the database.',
        expert: 'Keep checks cheap and bounded by a short timeout. A readiness check that depends on a shared dependency can mark every instance unready at once.',
      },
      state: { messages: [{ from: 'p', to: 'app', label: 'GET /ready', tone: 'plain' }, { from: 'app', to: 'db', label: 'SELECT 1', tone: 'ok' }, { from: 'app', to: 'p', label: '200 OK', tone: 'good', back: true }] },
      hood: 'Avoid checks that make all instances fail together when a shared dependency blips.',
    },
    {
      label: 'Unhealthy: remove',
      caption: {
        beginner: 'If the app does not answer properly, visitors are sent elsewhere.',
        intermediate: 'After several failed probes the instance is removed from load balancing so users stop hitting it.',
        expert: 'Use failure and success thresholds to avoid flapping. Readiness failure should only stop traffic, not restart the process.',
      },
      state: { messages: [{ from: 'p', to: 'app', label: 'GET /ready', tone: 'plain' }, { from: 'app', to: 'p', label: '503 (x3)', tone: 'bad', back: true }, { from: 'p', to: 'p', label: 'remove from pool', tone: 'bad' }] },
      hood: 'failureThreshold and successThreshold prevent flapping.',
    },
    {
      label: 'Restart',
      caption: {
        beginner: 'A stuck app is restarted, like turning a device off and on.',
        intermediate: 'If liveness fails, the orchestrator restarts the container. After it passes readiness again it rejoins traffic.',
        expert: 'A liveness probe that is too strict causes restart loops during load. Use a startup probe for slow boots and keep liveness local (no dependency checks).',
      },
      state: { messages: [{ from: 'p', to: 'app', label: 'liveness failed: restart', tone: 'bad' }, { from: 'app', to: 'p', label: 'ready again', tone: 'good', back: true }] },
      hood: 'Liveness = local only; startup probe protects slow-starting apps.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A nurse doing regular check-ups on patients. A quick pulse check each minute shows who is fine. Anyone with no pulse is pulled from the ward and treated, and the rest carry on.',
      explanation: 'Health checks are small test requests that tell the system whether an instance can be trusted with traffic. Healthy ones keep working; unhealthy ones are taken out and restarted.',
      keyTerms: [
        { term: 'Health check', meaning: 'A probe asking an instance if it is OK.' },
        { term: 'Liveness', meaning: 'Is the process alive and not stuck?' },
        { term: 'Readiness', meaning: 'Is it ready to receive traffic now?' },
        { term: 'Threshold', meaning: 'How many failures before acting.' },
      ],
    },
    intermediate: {
      explanation: 'Use distinct endpoints: liveness (cheap, local), readiness (can serve, may check dependencies) and startup (for slow boot). Platforms act differently on each, so mixing them causes needless restarts or traffic to broken instances.',
      howItWorks: [
        'The platform calls the probe endpoint on a schedule.',
        'The app returns 200 when healthy or 5xx when not.',
        'Consecutive failures cross a threshold.',
        'Readiness failure removes the instance from the load balancer.',
        'Liveness failure restarts the container.',
        'Success thresholds bring it back into rotation.',
      ],
      tradeoffs: {
        use: [
          'Use readiness to gate traffic during startup and shutdown.',
          'Use liveness to recover from deadlocks.',
          'Use startup probes for slow-starting apps.',
        ],
        avoid: [
          'Avoid heavy or slow health endpoints.',
          'Avoid dependency checks in liveness.',
          'Avoid exposing sensitive details on public health endpoints.',
        ],
      },
      pitfalls: [
        'Liveness probe checks the database, causing mass restarts during a DB outage.',
        'Timeouts shorter than normal latency under load.',
        'Always returning 200, so the check proves nothing.',
        'No graceful shutdown, so in-flight requests are dropped on removal.',
        'Probe endpoint requiring authentication that the platform lacks.',
      ],
    },
    expert: {
      internals: [
        'Kubelet runs probes per container (HTTP, TCP, exec, gRPC) with initialDelaySeconds, periodSeconds, timeoutSeconds, failureThreshold and successThreshold.',
        'Removal from endpoints is asynchronous; on shutdown handle SIGTERM, fail readiness, wait for propagation, then drain connections.',
        'Deep checks should be cached for a few seconds so probes do not become load on dependencies.',
        'Passive health checking (outlier detection in Envoy) ejects instances based on real traffic errors, catching gray failures probes miss.',
      ],
      failureModes: [
        'Cascade: shared dependency slowdown makes all instances unready, so zero capacity.',
        'Restart loops from aggressive liveness under CPU saturation.',
        'Flapping pods oscillating in and out of rotation.',
        'Dropped requests on deploy due to missing preStop or drain.',
      ],
      scalingNotes: [
        'Keep probe cost tiny; thousands of instances multiply probe traffic.',
        'Combine active probes with passive outlier detection.',
        'Set terminationGracePeriodSeconds above the longest request.',
      ],
      realSystems: [
        'Kubernetes probes; AWS ALB/NLB target health checks; HAProxy and Nginx upstream checks; Consul health checks.',
        'Spring Boot Actuator health groups; Python FastAPI /healthz endpoints.',
        'Envoy outlier detection.',
      ],
      numbersToKnow: [
        'Kubernetes defaults: periodSeconds 10, timeoutSeconds 1, failureThreshold 3. // VERIFY',
        'With period 10s and threshold 3, detection takes roughly 30 seconds.',
        'Typical readiness endpoints respond in a few milliseconds.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Liveness and readiness endpoints (FastAPI)',
      code: [
        '@app.get("/livez")',
        'def livez():',
        '    return {"status": "ok"}',
        '',
        '@app.get("/readyz")',
        'async def readyz(db=Depends(get_db)):',
        '    try:',
        '        await asyncio.wait_for(db.execute(text("SELECT 1")), timeout=0.5)',
        '    except Exception:',
        '        raise HTTPException(503, "db unavailable")',
        '    return {"status": "ready"}',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Liveness is local and trivial: if the process answers, it is alive.' },
        { line: 8, text: 'Readiness checks a critical dependency with a short timeout.' },
        { line: 10, text: '503 tells the load balancer to stop sending traffic without restarting the app.' },
      ],
    },
    {
      lang: 'yaml',
      title: 'Kubernetes probes',
      code: [
        'livenessProbe:',
        '  httpGet: { path: /livez, port: 8000 }',
        '  periodSeconds: 10',
        '  failureThreshold: 3',
        'readinessProbe:',
        '  httpGet: { path: /readyz, port: 8000 }',
        '  periodSeconds: 5',
        'startupProbe:',
        '  httpGet: { path: /livez, port: 8000 }',
        '  failureThreshold: 30',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Probe every 10s; three failures trigger a restart.' },
        { line: 6, text: 'Readiness gates traffic only.' },
        { line: 10, text: 'Startup probe allows up to 30 checks before liveness begins, protecting slow boots.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a health check?', answer: 'A small request the platform sends to see if an instance works, so traffic goes only to healthy ones.', followUps: ['What does it return?'] },
    { level: 'beginner', q: 'Liveness vs readiness?', answer: 'Liveness asks whether the process is alive (restart if not). Readiness asks whether it can serve traffic now (remove from rotation if not).', followUps: ['Which one restarts the container?'] },
    { level: 'intermediate', q: 'Why avoid checking the database in a liveness probe?', answer: 'If the database is down, every instance fails liveness and restarts, making the outage worse. Keep liveness local and put dependency checks in readiness, carefully.', followUps: ['What are the risks of dependency checks in readiness?'] },
    { level: 'intermediate', q: 'What is a startup probe for?', answer: 'It gives slow-starting apps time to boot before liveness checks begin, preventing restart loops.', followUps: ['How is it configured?'] },
    { level: 'expert', q: 'Deploys drop in-flight requests. Why and how to fix?', answer: 'Pods are removed from endpoints while still receiving traffic briefly. Handle SIGTERM by failing readiness, wait for propagation (preStop sleep), finish in-flight requests, then exit within the grace period.', followUps: ['What is terminationGracePeriodSeconds?'] },
    { level: 'expert', q: 'How do you catch gray failures that pass health checks?', answer: 'Use passive outlier detection on real traffic, per-instance error and latency metrics, deeper synthetic checks and SLO-based alerts rather than relying on a shallow 200.', followUps: ['What is outlier ejection?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Readiness failure causes...', options: ['Removal from traffic', 'Data deletion', 'A new database', 'A bigger server'], answerIndex: 0, why: 'The instance stops receiving requests.' },
    { level: 'beginner', q: 'Liveness failure usually causes...', options: ['A restart', 'A new index', 'More logging only', 'DNS change'], answerIndex: 0, why: 'The container is restarted.' },
    { level: 'intermediate', q: 'Best place for a DB check?', options: ['Readiness (carefully)', 'Liveness', 'Both always', 'Neither ever'], answerIndex: 0, why: 'Liveness restarts could amplify a DB outage.' },
    { level: 'expert', q: 'Startup probe prevents...', options: ['Restart loops on slow boot', 'TLS errors', 'Slow queries', 'Cache misses'], answerIndex: 0, why: 'It delays liveness checks.' },
  ],
});
