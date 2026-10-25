# Backend Interview Atlas: Phase 0 Plan

Source of truth: `reference/Backend_Interview_Atlas.html` (renamed from `Backend Interview Atlas.html` so the path matches the project rules).
Verified by reading the whole file: **77 topics, 13 categories, 10 simulations (`S`), 14 worked examples (`W`)**.

## 0. What the reference file contains

- **CSS**: light/dark variables (`--bg --card --tx --mu --ac --ok --bad --wn --bd --hl`), a 300px sidebar plus main grid, `.flow/.st/.pk` step pipeline with a moving packet, `.cap` caption, `.sim` panel, `.term` worked-example terminal, and a reduced-motion rule for the terminal only.
- **`D`**: one string. A line without `|` is a category. A line with `|` is `title|description|step1>step2>...`. Every topic has 4 steps.
- **`S`** (10 sims), keyed by title: Circuit Breaker Pattern, Rate Limiting, Caching, Load Balancing, Retry Strategies & Exponential Backoff, Database Isolation Levels, Indexing, Saga Pattern, CAP Theorem, Kafka / RabbitMQ.
- **`W`** (14 worked examples), keyed by title, each `{p, b[], g[], k}`. A line prefix gives the style: `!` bad, `+` good, `#` dim.
- **`show()`**: auto-advancing step player (1.6s), Back/Pause/Next, and a packet positioned over the active step.

Things the rebuild fixes (not content changes):
- Stray globals `window.rl` and `window.wq`; inline `style=` attributes; `onclick=` handlers.
- Only the worked-example terminal respects `prefers-reduced-motion`; the pipeline timer and packet do not.
- No keyboard-specific handling, no focus ring, no `aria-*`, and no persisted theme toggle.

## 1. Inventory (77 rows)

Legend: **Sim / Worked** = exists in the reference. In the last column, `sim:<id>` means a new playground file in `js/sims/`; `widget:` means a lightweight control built into the visual (config-driven in `visual-renderers.js`, no sim file); `existing:` means the sim ported from the reference.

| # | id | category | title | Sim | Worked | visualType | proposed new interactive element |
|---|----|----------|-------|-----|--------|------------|----------------------------------|
| 1 | programming-language-fundamentals | Foundations | Programming Language Fundamentals | N | N | data-structure | widget: step through a function call, watching stack frames push/pop and heap objects appear |
| 2 | object-oriented-programming-oop | Foundations | Object-Oriented Programming (OOP) | N | N | data-structure | widget: class tree; pick a subclass and see which method runs (polymorphism) |
| 3 | solid-principles | Foundations | SOLID Principles | N | N | compare | widget: toggle each principle between violating and fixed class diagram |
| 4 | clean-code | Foundations | Clean Code | N | N | compare | widget: refactor toggle (messy function to clean functions) |
| 5 | data-structures-algorithms | Foundations | Data Structures & Algorithms | N | N | chart | sim:big-o (slider for n, pick complexity curves) |
| 6 | design-patterns | Foundations | Design Patterns | N | N | sequence | widget: Observer; subscribe/unsubscribe and watch notifications |
| 7 | rest-apis | API & Web | REST APIs | N | N | sequence | widget: verb picker (GET/POST/PUT/DELETE) shows request, status code, JSON |
| 8 | http-https | API & Web | HTTP / HTTPS | N | N | sequence | widget: HTTP/HTTPS toggle adds or removes the TLS handshake |
| 9 | api-design-versioning | API & Web | API Design & Versioning | N | N | compare | widget: client version selector (v1 vs v2 response, deprecation header) |
| 10 | authentication-authorization | API & Web | Authentication & Authorization | N | N | pipeline | widget: role/permission matrix; try an action and see 401 vs 403 |
| 11 | jwt-oauth-2-0 | API & Web | JWT / OAuth 2.0 | N | N | sequence | sim:jwt-verify (edit payload, see signature check fail) |
| 12 | session-management | API & Web | Session Management | N | N | sequence | widget: server session store vs stateless token; expire the session |
| 13 | sql | Data | SQL | N | N | pipeline | widget: logical order of clauses (FROM, WHERE, GROUP BY, SELECT, ORDER BY) on a small table |
| 14 | database-design-normalization | Data | Database Design & Normalization | N | N | data-structure | widget: step from one wide table to 1NF, 2NF, 3NF and show anomalies disappear |
| 15 | indexing | Data | Indexing | Y | N | data-structure | existing:index-lookup (full scan vs binary search) |
| 16 | transactions-acid | Data | Transactions & ACID | N | Y | state-machine | sim:acid-crash (choose crash point, see rollback or commit) |
| 17 | database-isolation-levels | Data | Database Isolation Levels | Y | N | timeline-swimlane | existing:isolation-levels |
| 18 | database-locking | Data | Database Locking | N | N | timeline-swimlane | sim:lock-deadlock (two transactions, toggle lock order to cause a deadlock) |
| 19 | optimistic-pessimistic-concurrency-control | Data | Optimistic & Pessimistic Concurrency Control | N | Y | timeline-swimlane | widget: switch between lock-first and version-check; show retry on conflict |
| 20 | nosql-databases | Data | NoSQL Databases | N | N | data-structure | widget: pick document, key-value, column or graph and see the same data shaped each way |
| 21 | caching | Performance & Caching | Caching | Y | Y | topology | existing:lru-cache |
| 22 | redis | Performance & Caching | Redis | N | N | data-structure | widget: data type explorer (string, hash, list, set, sorted set) with a TTL countdown |
| 23 | connection-pooling | Performance & Caching | Connection Pooling | N | N | topology | sim:connection-pool (pool size slider vs concurrent requests) |
| 24 | database-query-optimization | Performance & Caching | Database Query Optimization | N | Y | compare | widget: EXPLAIN toggle (seq scan vs index scan) |
| 25 | performance-optimization | Performance & Caching | Performance Optimization | N | N | chart | widget: pick a hotspot to fix and see the total time (Amdahl style) change |
| 26 | multithreading-concurrency | Concurrency & Messaging | Multithreading & Concurrency | N | Y | timeline-swimlane | sim:race-condition (lock on/off, run 2 threads, see lost updates) |
| 27 | asynchronous-programming | Concurrency & Messaging | Asynchronous Programming | N | Y | timeline-swimlane | widget: sequential vs gather toggle on a timeline |
| 28 | message-queues | Concurrency & Messaging | Message Queues | N | Y | topology | widget: producer rate vs consumer rate sliders, queue depth gauge |
| 29 | kafka-rabbitmq | Concurrency & Messaging | Kafka / RabbitMQ | Y | N | data-structure | existing:kafka-partitions |
| 30 | event-driven-architecture | Concurrency & Messaging | Event-Driven Architecture | N | N | topology | widget: add or remove a subscriber service and watch the event fan out |
| 31 | microservices | Architecture | Microservices | N | N | topology | widget: kill a service and see which calls fail |
| 32 | monolith-vs-microservices | Architecture | Monolith vs Microservices | N | N | compare | widget: team-size and complexity sliders suggest which fits |
| 33 | service-to-service-communication | Architecture | Service-to-Service Communication | N | N | sequence | widget: sync (REST/gRPC) vs async (broker) toggle with the callee down |
| 34 | api-gateway | Architecture | API Gateway | N | N | topology | widget: toggle auth and rate-limit plugins, send a request |
| 35 | reverse-proxy | Architecture | Reverse Proxy | N | N | topology | widget: toggle TLS termination and caching on the proxy |
| 36 | load-balancing | Architecture | Load Balancing | Y | N | topology | existing:load-balancer |
| 37 | rate-limiting | Architecture | Rate Limiting | Y | Y | chart | existing:rate-limiter (token bucket) |
| 38 | idempotency | Architecture | Idempotency | N | Y | sequence | widget: retry with and without an Idempotency-Key |
| 39 | pagination | Architecture | Pagination | N | Y | data-structure | widget: offset vs cursor; insert a new row and see duplicates appear or not |
| 40 | retry-strategies-exponential-backoff | Resilience | Retry Strategies & Exponential Backoff | Y | Y | chart | existing:retry-backoff |
| 41 | circuit-breaker-pattern | Resilience | Circuit Breaker Pattern | Y | Y | state-machine | existing:circuit-breaker |
| 42 | error-handling | Resilience | Error Handling | N | N | pipeline | widget: choose an error type; it is classified retryable or not and logged |
| 43 | fault-tolerance | Resilience | Fault Tolerance | N | N | topology | widget: kill a replica and watch failover |
| 44 | health-checks | Resilience | Health Checks | N | N | sequence | widget: make an instance unhealthy, see it leave the pool |
| 45 | scalability | Resilience | Scalability | N | N | chart | widget: scale up vs scale out toggle on a throughput chart |
| 46 | high-availability | Resilience | High Availability | N | N | topology | widget: fail an availability zone |
| 47 | distributed-transactions | Distributed Systems | Distributed Transactions | N | N | sequence | widget: fail one service and see the inconsistent state |
| 48 | saga-pattern | Distributed Systems | Saga Pattern | Y | N | timeline-swimlane | existing:saga |
| 49 | two-phase-commit-2pc | Distributed Systems | Two-Phase Commit (2PC) | N | N | sequence | sim:two-phase-commit (each participant votes yes or no) |
| 50 | cap-theorem | Distributed Systems | CAP Theorem | Y | N | topology | existing:cap |
| 51 | consistency-models | Distributed Systems | Consistency Models | N | N | timeline-swimlane | sim:consistency-reads (strong vs eventual; read right after a write) |
| 52 | database-replication | Distributed Systems | Database Replication | N | N | topology | sim:replication-lag (lag slider, read from replica) |
| 53 | database-sharding-partitioning | Distributed Systems | Database Sharding & Partitioning | N | N | data-structure | sim:shard-router (type a key, see its hash and shard) |
| 54 | distributed-systems-fundamentals | Distributed Systems | Distributed Systems Fundamentals | N | N | timeline-swimlane | widget: drop or delay a message between nodes |
| 55 | docker | Infrastructure | Docker | N | N | layers | widget: Dockerfile line order and layer cache hit or miss |
| 56 | kubernetes-basics | Infrastructure | Kubernetes Basics | N | N | topology | sim:k8s-self-heal (kill a pod, controller recreates it) |
| 57 | ci-cd | Infrastructure | CI/CD | N | N | pipeline | widget: fail a stage and see later stages skipped |
| 58 | git | Infrastructure | Git | N | N | data-structure | widget: run commit/branch/merge buttons and watch the commit graph |
| 59 | linux-fundamentals | Infrastructure | Linux Fundamentals | N | N | data-structure | widget: chmod calculator on a file tree with rwx bits |
| 60 | cloud-fundamentals | Infrastructure | Cloud Fundamentals | N | N | layers | widget: IaaS/PaaS/SaaS selector shows who manages each layer |
| 61 | networking-fundamentals | Networking | Networking Fundamentals | N | N | layers | widget: encapsulation; add headers layer by layer |
| 62 | dns | Networking | DNS | N | N | sequence | sim:dns-resolution (cold vs cached lookup, TTL) |
| 63 | tcp-ip | Networking | TCP/IP | N | N | sequence | sim:tcp-handshake (packet loss toggle shows retransmission) |
| 64 | websockets | Networking | WebSockets | N | N | sequence | widget: polling vs WebSocket message count comparison |
| 65 | logging | Observability | Logging | N | N | pipeline | widget: log level filter and structured vs plain text |
| 66 | monitoring | Observability | Monitoring | N | N | chart | widget: drag the alert threshold and see when it fires |
| 67 | metrics | Observability | Metrics | N | N | chart | sim:percentile-latency (p50 vs p99 on a latency sample) |
| 68 | distributed-tracing | Observability | Distributed Tracing | N | Y | waterfall | widget: click a span to see its parent and duration |
| 69 | observability | Observability | Observability | N | N | pipeline | widget: drill down from a metric alert to a trace to a log line |
| 70 | security-best-practices | Security | Security Best Practices | N | N | layers | widget: disable one defence layer and see what gets through |
| 71 | owasp-top-10 | Security | OWASP Top 10 | N | Y | compare | widget: string-built query vs parameterised query with a payload field |
| 72 | secrets-management | Security | Secrets Management | N | N | sequence | widget: rotate a secret and see old and new tokens expire |
| 73 | testing | Testing | Testing | N | N | layers | widget: test pyramid; adjust the mix and see speed vs confidence |
| 74 | unit-testing | Testing | Unit Testing | N | N | pipeline | widget: toggle a mock for the database dependency |
| 75 | integration-testing | Testing | Integration Testing | N | N | topology | widget: swap a real DB for a fake and see what is covered |
| 76 | api-testing | Testing | API Testing | N | N | sequence | widget: send a request, check status, schema and auth assertions |
| 77 | load-performance-testing | Testing | Load & Performance Testing | N | N | chart | widget: ramp users, see latency knee and the breaking point |

Check totals (confirmed against the reference): 77 rows; Sim=Y is 10 (indexing, isolation levels, caching, kafka/rabbitmq, load balancing, rate limiting, retry, circuit breaker, saga, CAP); Worked=Y is 14 (transactions, optimistic/pessimistic, caching, query optimization, multithreading, async, message queues, idempotency, pagination, rate limiting, retry, circuit breaker, OWASP, tracing).

Categories and counts: Foundations 6, API & Web 6, Data 8, Performance & Caching 5, Concurrency & Messaging 5, Architecture 9, Resilience 7, Distributed Systems 8, Infrastructure 6, Networking 4, Observability 5, Security 3, Testing 5 = 77.

Naming notes: ids are the kebab-case of the full title with punctuation dropped (so `two-phase-commit-2pc`, `jwt-oauth-2-0`). The topic `observability` and `testing` share a name with their category slugs; ids are namespaced from category slugs so this is safe, but the router uses `#/topic/<id>` and `#/category/<slug>`.

Visual type spread is driven by fit, not quotas. Types used: pipeline, sequence, state-machine, topology, timeline-swimlane, data-structure, layers, compare, chart, waterfall.

## 2. Folder structure

```
index.html                     Shell: Bootstrap layout, CDN tags, ordered classic <script> tags, no inline JS or style
css/
  theme.css                    CSS variables for light/dark, fonts, base typography
  layout.css                   App grid, sidebar, topbar, responsive rules
  components.css               Cards, tabs, badges, buttons, quiz, interview accordions, code blocks, focus rings
  visuals.css                  Styles for every visualType (nodes, edges, lifelines, lanes, layers, charts)
  animations.css               Keyframes and transitions, with prefers-reduced-motion overrides
js/
  core/
    app.js                     Bootstraps Atlas, wires modules, renders the shell
    router.js                  Hash routing (#/topic/<id>, #/category/<slug>, #/home) that works on file://
    store.js                   localStorage: theme, level, progress, quiz scores
    verify.js                  Atlas.verify() acceptance checks
    search.js                  Topic search over title, tags and category
  engine/
    stepper.js                 Step player: play/pause/next/back, keyboard, reduced-motion aware
    level-switcher.js          Beginner/Intermediate/Expert selector and content swap
    visual-renderers.js        One renderer per visualType, consuming visual.config and step.state
    sim-registry.js            Atlas.sims registry and mounting of a topic's sim
    worked-runner.js           Without/with worked example runner (ported from W)
    quiz.js                    4-question quiz with explanations and score storage
  sims/
    (one file per simulation, see below)
data/
  meta.js                      Categories (slug, name, order), levels, visualType list, expected counts
  topics/
    <category-slug>.js         One data file per category; each pushes into Atlas.topics
reference/Backend_Interview_Atlas.html   Read-only source of truth
docs/PLAN.md                   This file
```

`js/sims/` files, 10 ported from the reference and 14 new:

- Existing: `circuit-breaker.js`, `rate-limiter.js`, `lru-cache.js`, `load-balancer.js`, `retry-backoff.js`, `isolation-levels.js`, `index-lookup.js`, `saga.js`, `cap.js`, `kafka-partitions.js`.
- New: `big-o.js`, `jwt-verify.js`, `acid-crash.js`, `lock-deadlock.js`, `connection-pool.js`, `race-condition.js`, `two-phase-commit.js`, `consistency-reads.js`, `replication-lag.js`, `shard-router.js`, `k8s-self-heal.js`, `dns-resolution.js`, `tcp-handshake.js`, `percentile-latency.js`.

**Decision (400-line cap).** A fully populated topic (3 levels, steps with 3 captions each, code, 6 interview Q&As, 4 quiz questions) is roughly 120 to 200 lines, so one file per category would break the 400-line rule. Categories are split into `<category-slug>-1.js`, `<category-slug>-2.js`, ... with about 2 topics per file (1 to 2 when a topic is large). Each file still pushes into `Atlas.topics`, and categories that fit in 400 lines keep the plain `<category-slug>.js` name.

## 3. Topic data schema

Each topic is pushed with `Atlas.topics.push({...})`.

```js
{
  id, category, title,
  source: { description, steps: [...] },      // copied VERBATIM from the reference file
  estMinutes, prereqs: [ids], related: [ids], tags: [],
  visual: { type, config: {...} },            // config consumed by visual-renderers.js
  steps: [{                                   // same step count as source.steps or more, never fewer
    label,
    caption: { beginner, intermediate, expert },
    state: {...}                              // what the visual shows at this step (highlighted nodes, values, packets)
  }],
  levels: {
    beginner:     { analogy, explanation, keyTerms: [{term, meaning}] },
    intermediate: { explanation, howItWorks: [], tradeoffs: { use: [], avoid: [] }, pitfalls: [] },
    expert:       { internals: [], failureModes: [], scalingNotes: [], realSystems: [], numbersToKnow: [] }
  },
  sim: "simId" | null,                        // interactive playground
  worked: { problem, without: [], with: [], takeaway } | null,   // port from reference when it exists
  code: [{ lang, title, code, annotations: [{ line, text }] }],
  interview: [{ level, q, answer, followUps: [] }],   // at least 2 beginner, 2 intermediate, 2 expert
  quiz: [{ q, options: [], answerIndex, why }]        // 4 questions
}
```

Schema rules and decisions:
- `category` holds the category **slug** from `data/meta.js` (for example `performance-caching`); `meta.js` maps slug to display name, so the reference names stay intact.
- `source.steps` is copied exactly from the reference `>`-separated list. `steps[i].label` for `i < source.steps.length` equals `source.steps[i]`; extra steps may be appended.
- Worked examples are ported from `W` with the prefixes decoded: `{ problem: p, without: [{text, tone}], with: [...], takeaway: k }`, where `tone` is `bad`, `good`, `dim` or `plain`. This object-per-line shape is a small, decided extension of the `without: []` / `with: []` arrays, so the reference's bad/good/dim styling is kept.
- `sim` ids must exist in `Atlas.sims`; `visual.type` must be one of the 10 visualTypes.
- Numbers in `numbersToKnow` are written conservatively or tagged `// VERIFY`.
- Python-first code samples (FastAPI, Django, SQLAlchemy), plus SQL, JavaScript, YAML, Bash or Java where they fit.

## 4. Acceptance checks for `Atlas.verify()` (Phase 5)

`Atlas.verify()` prints a console table and returns `{ pass, total, failures: [...] }`. A check passes only if every topic passes it, and each prints `n/77`.

| # | Check | Rule |
|---|-------|------|
| 1 | Topic count | `Atlas.topics.length === 77`, ids unique |
| 2 | Category count | 13 categories in `meta.js`; each topic maps to one; per-category counts match section 1 |
| 3 | Source fidelity | Every topic `source.description` and `source.steps` equal the reference (embedded expected checksum or a compact title+steps list in `meta.js`) |
| 4 | Required fields | All schema fields present with correct types |
| 5 | Visual valid | `visual.type` in the allowed list; renderer exists; `config` has the keys the renderer needs |
| 6 | Steps | `steps.length >= source.steps.length`; each has `label`, 3 captions (non-empty), and `state` |
| 7 | Levels | Beginner/intermediate/expert fields non-empty; at least 3 keyTerms; tradeoffs have both lists |
| 8 | Simulations | 10 reference sims present and registered; every `sim` id resolves; every registered sim is referenced |
| 9 | Worked examples | 14 reference examples present with problem, without, with, takeaway; no worked example is dropped |
| 10 | Code | At least 1 code block per topic; Python is present in most; annotation `line` values are in range |
| 11 | Interview | At least 2 beginner, 2 intermediate and 2 expert questions per topic |
| 12 | Quiz | Exactly 4 questions; `answerIndex` in range; `why` present |
| 13 | Links | Every `prereqs` and `related` id exists; no self reference |
| 14 | Router and search | Every topic id resolves through the router; search finds every title |
| 15 | Accessibility | Players and sims have aria-labels and are focusable; no inline `style=` or `on*=` attributes in the rendered DOM |
| 16 | Namespace | No new `window` globals beyond `Atlas` (and library globals: `$`, `jQuery`, `bootstrap`, `hljs`) |
| 17 | Motion and theme | `prefers-reduced-motion` honoured by `stepper.js`; theme toggle persists in localStorage |
| 18 | File size | Reports script files over 400 lines. It cannot read files on `file://`, so this one is checked with a PowerShell line count |

Progress output example:

```
Atlas.verify()
  Topics 77/77 | Source fidelity 77/77 | Steps 41/77 | Levels 41/77 | Quiz 41/77 | Interview 41/77
  Sims 10/10 reg. (+14 new) | Worked 14/14 | Links 77/77
```

Build order after approval, for your review: Phase 1 shell and engine, then Phase 2 visual renderers, then topic data category by category, then new sims, then `verify.js`.

## Phase 1 deviations
- Extra files: css/content.css, css/widgets.css, js/core/util.js, js/core/catalog.js, js/core/theme.js, js/engine/code-tabs.js, js/ui/*.js.
- Schema: optional quiz[].level; worked lines are {text, tone}.
- Topic ids are full kebab-case titles; router resolves unique prefixes (circuit-breaker -> circuit-breaker-pattern).

## Phase 2 notes
- New files: js/engine/visuals/*.js (one renderer per visualType; data-structure split into data-structure, ds-table-tree, ds-memory), css/visuals-svg.css, css/sim.css.
- Schema additions (all optional): steps[].hood (Expert "Under the hood" text), state.meters [{label, value, tone}], state.changed, state.badges (Expert only), quiz[].level.
- Visual levels: elements with class min-int / min-exp are hidden at lower levels via .viz[data-level].
- Renderer config/state conventions are documented in the header of each file in js/engine/visuals/.
- Sim API: Atlas.sims.register(id, { title, note, controls, actions, autoMs, metrics, view, init, step, reset, onParam }).
- Worked runner: pause, step, speed and side-by-side mode on top of the reference 800 ms line timing.
- Atlas.verify() adds "Renderer for every visual type" (16 checks).

## Phase 3 notes (port of existing content)
- All 10 reference sims live in js/sims/ (one file each) with a real SVG visual and an "Explain what you just saw" panel that follows the level switcher.
- Seed toggle: sims with `random: true` (circuit breaker, retry) use a seeded generator, so each Reset replays the same run. The other sims have no randomness.
- Sim API additions: `random`, `intro`, `ctx.say/level/rand/stagger/anim/clearLog`; `mount()` returns `{ setLevel, destroy, ctx }`. Helpers in js/engine/sim-viz.js, styles in css/sim-viz.css.
- All 14 worked examples are in data/worked/worked.js, generated from the reference `W` object so text is verbatim (generator kept outside the repo). `Atlas.catalog.worked(id)` is the single lookup, and it works for topics whose full lesson is not written yet.
- The level bar now shows on every topic, so the sim explain panel can be switched on stub topics too.
- Atlas.verify() adds: all reference sims ported, all worked examples ported, sims mount, run and reproduce with Seed on (19 checks).


## Phase 4 notes (content batches)
- Batch 1 done: Foundations (6 topics) + API & Web (6 topics) = 12 of 77 written, in data/topics/foundations-*.js and api-*.js.
- 8 new sims (alias-copy, big-o, polymorphism, observer, rest-request, jwt-verify, session-vs-token, authn-authz): 8/12 topics (67%) have a sim.
- Inline worked examples: programming-language-fundamentals, api-design-versioning.
- Remaining batches: Data; Performance+Concurrency; Architecture; Resilience+Distributed; Infra/Networking/Observability/Security/Testing.
