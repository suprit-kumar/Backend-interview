# Backend Interview Atlas

Interactive, visual, beginner-to-expert learning site for backend interviews.
Plain HTML/CSS + jQuery 3.7.1 + Bootstrap 5.3 (CDN). No build step. Open `index.html` by double-clicking.

Source of truth for topics: `reference/Backend_Interview_Atlas.html` (77 topics, 13 categories, 10 sims, 14 worked examples).
Plan and schema: `docs/PLAN.md`. Project rules: `.github/copilot-instructions.md`.

## Status

| Phase | State |
|---|---|
| 1. Design system + app shell | Done |
| 2. Visual/interaction engine | Done |
| 3. Port 10 sims + 14 worked examples | Done |
| 4. Content authoring | **Done: 77 of 77 topics written** |
| 5. Final verification | `Atlas.verify()` 19/19, written 77; manual QA still open (see below) |

`Atlas.verify()` currently: 19/19 checks pass, `written: 77`.

## Remaining topics

None. All 77 topics are authored. The "how to author" notes below remain as a template for future topics.

(Historical list of the last 13 topics, now complete: Observability 5, Security 3, Testing 5.)

Get each topic's exact `description`, `steps` and visualType from `data/meta.js`:

```
node -e "global.window=global;global.Atlas={};require('./data/meta.js');Atlas.index.filter(e=>/observ|secur|test/.test(e.c)).forEach(e=>console.log(JSON.stringify(e)))"
```

| Category | Topic ids |
|---|---|
| Observability (5) | `logging`, `monitoring`, `metrics`, `distributed-tracing`, `observability` |
| Security (3) | `security-best-practices`, `owasp-top-10`, `secrets-management` |
| Testing (5) | `testing`, `unit-testing`, `integration-testing`, `api-testing`, `load-performance-testing` |

### How to author each one
1. Create one file per topic, `data/topics/<prefix>-<name>.js` (keep under ~200 lines), e.g. `obs-logging.js`, `sec-owasp.js`, `test-unit.js`.
2. Copy `source.description` and `source.steps` verbatim from meta. Follow an existing file such as `data/topics/net-dns.js` as the template.
3. Add a `<script>` tag after `data/topics/net-websockets.js` in `index.html`.
4. Required fields: 3-level step captions + a `state` per step, `levels` (beginner analogy and 4-6 key terms; intermediate 3+ use/avoid/pitfalls; expert internals, failureModes, scalingNotes, realSystems, numbersToKnow), `visual`, `code` (a **string**, use `[...].join('\n')`) with annotations, 2+ interview questions per level, 4 quiz questions, valid `prereqs`/`related` ids.
5. `distributed-tracing` uses the `waterfall` visual: read the header comment of `js/engine/visuals/waterfall.js` first.
6. Topics with a reference worked example (`distributed-tracing`, `owasp-top-10`) must set `worked: null`; `data/worked/worked.js` supplies it.
7. Run `Atlas.verify()` in the browser console: expect 19/19 and `written: 77`. Open each new topic, press ArrowRight a few times, and check for no console errors, no `[style]` attributes and no horizontal scroll.
8. Append "Batch N done" to `docs/PLAN.md` and commit.

## Known gaps / follow-up work

- **Simulation coverage is low in later batches.** Only the 10 ported sims exist, and Resilience, Distributed, Infrastructure and Networking batches are well below the 60% target. Good candidates for new sims (`js/sims/<id>.js`, via `Atlas.sims.register`): DNS TTL/caching, WebSocket reconnect storm, health-check flapping, autoscaling, replication lag, sharding hot keys, CI/CD pipeline failures.
- **`// VERIFY` markers:** technical claims and numbers marked `// VERIFY` have not been reviewed by a human. Search with `grep -rn "VERIFY" data/`.
- **Weakest topics** (thin visuals or no sim): `health-checks`, `scalability`, `error-handling`, `distributed-systems-fundamentals`, `two-phase-commit-2pc`, `consistency-models`, `git`, `linux-fundamentals`, `cloud-fundamentals`, `networking-fundamentals`, `dns`, `websockets`.
- Sims were only click-tested for errors, not validated deeply against the reference behaviour. Do a manual pass of all 10 sims and 14 worked examples.
- **Phase 5 not started:** final `Atlas.verify()` acceptance run, a responsive check at 360/768/1440px, light/dark theme review, keyboard-only walkthrough, `prefers-reduced-motion` check, and a final check that no file exceeds 400 lines.

## Rules to keep
- Never drop, rename or merge a topic. No ES modules, no `fetch()` of local files, everything under `Atlas.*`.
- No inline styles or handlers, no file over 400 lines, respect `prefers-reduced-motion`.
- Do not hand-edit `data/meta.js` (generated).
