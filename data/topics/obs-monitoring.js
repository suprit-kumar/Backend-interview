/* Observability: Monitoring. */
Atlas.topics.push({
  id: 'monitoring',
  category: 'observability',
  title: 'Monitoring',
  source: {
    description: 'Watch health and alert when something looks wrong.',
    steps: ['Collect signals', 'Compare to thresholds', 'Alert', 'Respond'],
  },
  estMinutes: 9,
  prereqs: ['logging'],
  related: ['metrics', 'observability', 'health-checks', 'high-availability'],
  tags: ['alerting', 'SLO', 'SLI', 'golden signals', 'on-call', 'Prometheus', 'dashboards'],
  visual: {
    type: 'chart',
    config: {
      kind: 'line', xLabel: 'minutes', yLabel: 'error rate', unit: '%', yMax: 10,
      x: ['0', '1', '2', '3', '4', '5', '6', '7'],
      series: [
        { id: 'err', label: 'Error rate', tone: 'bad', values: [1, 1, 1, 2, 6, 8, 3, 1] },
        { id: 'thr', label: 'Alert threshold', tone: 'warn', values: [5, 5, 5, 5, 5, 5, 5, 5] },
      ],
    },
  },
  steps: [
    {
      label: 'Collect signals',
      caption: {
        beginner: 'Sensors watch the app all the time, like a heart monitor in a hospital.',
        intermediate: 'Collect the golden signals: latency, traffic, errors and saturation, plus host and dependency health.',
        expert: 'Monitor symptoms users feel (SLIs) more than causes. Cause-based alerts like CPU spikes create noise without user impact.',
      },
      state: { series: { err: [1, 1, 1, 2, null, null, null, null], thr: [5, 5, 5, 5, 5, 5, 5, 5] }, mark: 2 },
      hood: 'SLI: the measured ratio of good events to total events.',
    },
    {
      label: 'Compare to thresholds',
      caption: {
        beginner: 'The monitor checks whether the numbers look normal.',
        intermediate: 'Rules compare a signal to a threshold over a window, for example error rate above 5% for 2 minutes.',
        expert: 'A "for" duration filters blips. Burn-rate alerts on an SLO budget catch both fast and slow failures with fewer false alarms.',
      },
      state: { series: { err: [1, 1, 1, 2, 6, 8, null, null], thr: [5, 5, 5, 5, 5, 5, 5, 5] }, mark: 5 },
      hood: 'Multi-window burn rate: fast window for speed, slow for confidence.',
    },
    {
      label: 'Alert',
      caption: {
        beginner: 'An alarm goes off and tells a person that something is wrong.',
        intermediate: 'Alertmanager or PagerDuty routes the alert to the on-call engineer with a link to a dashboard and a runbook.',
        expert: 'Page only for actionable, urgent, user-impacting problems. Everything else becomes a ticket, or it trains people to ignore pages.',
      },
      state: { series: { err: [1, 1, 1, 2, 6, 8, 8, null], thr: [5, 5, 5, 5, 5, 5, 5, 5] }, mark: 6 },
      hood: 'Alert fatigue is a reliability risk.',
    },
    {
      label: 'Respond',
      caption: {
        beginner: 'Someone fixes the problem and the numbers go back to normal.',
        intermediate: 'Mitigate first (roll back, scale, fail over), then find the root cause and write a blameless postmortem.',
        expert: 'Track MTTD and MTTR. Feed lessons back into better alerts, runbooks and automation.',
      },
      state: { series: { err: [1, 1, 1, 2, 6, 8, 3, 1], thr: [5, 5, 5, 5, 5, 5, 5, 5] }, mark: 7 },
      hood: 'Mitigation before diagnosis.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A smoke alarm and a hospital heart monitor. They watch quietly all day and only make noise when a reading crosses a safe limit, so a person can act quickly.',
      explanation: 'Monitoring means continuously measuring how healthy your system is and alerting people when something goes wrong, ideally before users notice.',
      keyTerms: [
        { term: 'Alert', meaning: 'A notification triggered when a rule is broken.' },
        { term: 'Threshold', meaning: 'The limit that triggers an alert.' },
        { term: 'SLI', meaning: 'A measured indicator, such as the share of fast requests.' },
        { term: 'SLO', meaning: 'The target for an SLI, such as 99.9% success.' },
        { term: 'On-call', meaning: 'The engineer responsible for responding right now.' },
      ],
    },
    intermediate: {
      explanation: 'Effective monitoring tracks the four golden signals, alerts on user-visible symptoms, and links each alert to a dashboard and runbook. SLOs define how much unreliability is acceptable.',
      howItWorks: [
        'Instrument services and collect metrics.',
        'Define SLIs and SLOs for key user journeys.',
        'Write alert rules over windows.',
        'Route alerts by severity to pager or ticket.',
        'On-call follows a runbook to mitigate.',
        'A postmortem updates alerts and automation.',
      ],
      tradeoffs: {
        use: [
          'Use SLO-based alerts to page on real user impact.',
          'Use dashboards per service for fast triage.',
          'Use synthetic probes to catch outages with no traffic.',
        ],
        avoid: [
          'Avoid paging on every CPU or memory spike.',
          'Avoid alerts with no owner or runbook.',
          'Avoid averages for latency; they hide tail pain.',
        ],
      },
      pitfalls: [
        'Alert fatigue from noisy, non-actionable pages.',
        'Monitoring the monitor: no alert when the pipeline itself is down.',
        'Using average latency instead of percentiles.',
        'Thresholds set once and never tuned.',
        'Dashboards nobody understands during an incident.',
      ],
    },
    expert: {
      internals: [
        'Prometheus pulls metrics, evaluates alert rules on a schedule, and sends firing alerts to Alertmanager, which groups, dedupes, silences and routes them.',
        'An error budget is 1 minus the SLO; burn rate is how fast the budget is being consumed.',
        'A dead-man\'s-switch alert fires constantly and pages when it stops, proving the alert path works.',
        'Blackbox probes test from outside the network, catching DNS, TLS and edge failures.',
      ],
      failureModes: [
        'Monitoring backend outage hides a real incident.',
        'Alert storms from one root cause paging for every dependent service.',
        'Metric gaps read as zero, hiding an outage.',
        'Cardinality explosions overloading the time series database.',
      ],
      scalingNotes: [
        'Federate or shard Prometheus, or use Thanos, Cortex or Mimir for long-term, multi-cluster storage.',
        'Group and inhibit alerts so one failure pages once.',
        'Keep SLOs few and tied to user journeys.',
      ],
      realSystems: [
        'Prometheus + Alertmanager + Grafana, Datadog, New Relic, CloudWatch alarms, Nagios.',
        'PagerDuty and Opsgenie for on-call; Google SRE multi-window burn-rate alerts.',
        'Blackbox exporter and synthetic monitoring.',
      ],
      numbersToKnow: [
        'A 99.9% SLO allows about 43 minutes of downtime in a 30-day month.',
        'A 99.99% SLO allows about 4.3 minutes per month.',
        'The common burn-rate guidance pages at about 14x over 1 hour and 6x over 6 hours for a 30-day SLO. // VERIFY',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'Prometheus alert rule',
      code: [
        'groups:',
        '- name: api',
        '  rules:',
        '  - alert: HighErrorRate',
        '    expr: sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05',
        '    for: 2m',
        '    labels: { severity: page }',
        '    annotations:',
        '      runbook: https://wiki.example.com/runbooks/high-error-rate',
      ].join('\n'),
      annotations: [
        { line: 5, text: 'Error ratio over 5 minutes above 5%.' },
        { line: 6, text: 'Must hold for 2 minutes, which filters blips.' },
        { line: 7, text: 'Severity routes it to the pager.' },
        { line: 9, text: 'Every page links to a runbook.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is monitoring?', answer: 'Continuously measuring system health and alerting when values cross limits.', followUps: ['Name a signal you would watch.'] },
    { level: 'beginner', q: 'Why alert instead of only having dashboards?', answer: 'Nobody watches dashboards all day, so alerts bring problems to a person at once.', followUps: ['Who receives the alert?'] },
    { level: 'intermediate', q: 'What are the four golden signals?', answer: 'Latency, traffic, errors and saturation.', followUps: ['Which is hardest to measure well?'] },
    { level: 'intermediate', q: 'SLI, SLO and SLA?', answer: 'SLI is the measurement, SLO the internal target, SLA the contractual promise with consequences.', followUps: ['What is an error budget?'] },
    { level: 'expert', q: 'How do you cut alert fatigue?', answer: 'Page only on actionable, user-impacting symptoms using SLO burn rates, group and inhibit related alerts, add runbooks, delete alerts nobody acts on, and review pages in postmortems.', followUps: ['What belongs in a ticket instead?'] },
    { level: 'expert', q: 'How do you know your monitoring is working?', answer: 'Use a dead-man\'s-switch alert, external blackbox probes, alerts on scrape failures and missing data, and test the paging path regularly.', followUps: ['Where should the probe run?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Monitoring alerts when...', options: ['A signal crosses a threshold', 'Code compiles', 'A file is saved', 'A user signs up'], answerIndex: 0, why: 'Rules compare signals to limits.' },
    { level: 'intermediate', q: 'Which is a golden signal?', options: ['Saturation', 'Font size', 'Commit count', 'Team size'], answerIndex: 0, why: 'Latency, traffic, errors, saturation.' },
    { level: 'intermediate', q: 'Why avoid average latency?', options: ['It hides slow tail requests', 'It is too accurate', 'It uses more memory', 'It cannot be graphed'], answerIndex: 0, why: 'Percentiles reveal tail behaviour.' },
    { level: 'expert', q: 'A 99.9% SLO over 30 days allows roughly...', options: ['43 minutes of downtime', '4 hours', '4 seconds', 'No downtime'], answerIndex: 0, why: '0.1% of 43,200 minutes is about 43 minutes.' },
  ],
});
