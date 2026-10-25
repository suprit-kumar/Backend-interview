# Project: Backend Interview Atlas

An interactive, visual, beginner-to-expert learning site for backend engineering interviews.
Source of truth for topics: `reference/Backend_Interview_Atlas.html` (77 topics, 13 categories,
10 simulations, 14 worked examples). Never drop, rename or merge a topic from it.

## Stack (strict)
- HTML5, CSS3, jQuery 3.7.1, Bootstrap 5.3.x (+ Bootstrap Icons). No React/Vue/Angular, no build step, no npm.
- Load libraries from pinned CDN versions. Add highlight.js for code. Fonts: Inter (UI), JetBrains Mono (code).
- Must work by double-clicking index.html (file://). So: NO ES modules, NO fetch() of local JSON.
  Use classic <script> tags and data files that assign to a global namespace `window.Atlas`.
- Plain JavaScript (ES2020) written in jQuery style. Use requestAnimationFrame for continuous animation.

## Code rules
- One responsibility per file. No file over 400 lines. No inline styles or inline event handlers.
- Namespace everything under `Atlas.*`. No stray globals.
- Every animation must respect `prefers-reduced-motion` (show end state, keep step controls).
- Accessible: semantic HTML, aria-labels, visible focus rings, keyboard control of every player and simulation.
- Light and dark themes via CSS variables, toggle stored in localStorage.
- Content is accurate. If unsure about a technical claim or number, write it conservatively
  or mark it `// VERIFY` instead of inventing precision.
- Python is the primary code-example language (FastAPI / Django / SQLAlchemy style),
  plus SQL, JavaScript, YAML, Bash or Java where they fit the topic.

## Definition of done for any task
State what you changed, run `Atlas.verify()` in the browser console, and report the result.
