/* Infrastructure: Git. */
Atlas.topics.push({
  id: 'git',
  category: 'infrastructure',
  title: 'Git',
  source: {
    description: 'Distributed history built from commits and branches.',
    steps: ['Edit', 'git add', 'git commit', 'git push and merge'],
  },
  estMinutes: 10,
  prereqs: [],
  related: ['ci-cd', 'clean-code', 'linux-fundamentals', 'testing'],
  tags: ['commit', 'branch', 'merge', 'rebase', 'staging', 'remote', 'DAG'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'table',
      columns: ['Area', 'Contents', 'Command'],
      rows: [
        ['Working tree', 'edited files', 'edit'],
        ['Staging area (index)', 'next snapshot', 'git add'],
        ['Local repository', 'commits (history)', 'git commit'],
        ['Remote repository', 'shared history', 'git push'],
      ],
    },
  },
  steps: [
    {
      label: 'Edit',
      caption: {
        beginner: 'You change files in your project folder.',
        intermediate: 'Changes live in the working tree and are untracked or modified until staged.',
        expert: 'Git tracks content, not diffs: each commit stores a full snapshot tree, with unchanged files shared by hash.',
      },
      state: { rows: [0], cells: [[0, 1]] },
      hood: 'Objects: blob, tree, commit, tag.',
    },
    {
      label: 'git add',
      caption: {
        beginner: 'You choose which changes go into the next save.',
        intermediate: 'git add copies chosen changes into the staging area so you can build a clean, focused commit.',
        expert: 'The index is a binary file mapping paths to blob hashes; add writes blob objects into .git/objects immediately.',
      },
      state: { rows: [1], cells: [[1, 1]], dim: [0] },
      hood: 'git add -p stages hunks selectively.',
    },
    {
      label: 'git commit',
      caption: {
        beginner: 'You save a snapshot with a message explaining why.',
        intermediate: 'A commit records the staged snapshot, author, message and parent commit, forming a history chain.',
        expert: 'A commit id is the SHA of its content including the parent id, so history is a tamper-evident Merkle DAG. Branches are just movable pointers to commits.',
      },
      state: { rows: [2], cells: [[2, 1]], dim: [0, 1] },
      hood: 'Branch = pointer; HEAD = current branch pointer.',
    },
    {
      label: 'git push and merge',
      caption: {
        beginner: 'You share your saved work with the team and combine it with theirs.',
        intermediate: 'Push uploads commits to the remote. A pull request then merges the branch after review.',
        expert: 'Merge creates a commit with two parents; rebase rewrites commits onto a new base. Never rebase shared history; use --force-with-lease if you must update it.',
      },
      state: { rows: [3], cells: [[3, 1]], dim: [0, 1, 2] },
      hood: 'Rebase rewrites history; merge preserves it.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A save-game system with a shared cloud. You can save snapshots (commits) with notes, try risky ideas on a separate save slot (branch) and later merge the good results into the main game, while keeping every earlier save.',
      explanation: 'Git records the history of a project as snapshots. You can go back in time, work on ideas in parallel and combine work from many people.',
      keyTerms: [
        { term: 'Commit', meaning: 'A saved snapshot with a message.' },
        { term: 'Branch', meaning: 'A separate line of work.' },
        { term: 'Merge', meaning: 'Combine branches.' },
        { term: 'Remote', meaning: 'A shared copy, such as on GitHub.' },
        { term: 'Staging', meaning: 'Choosing what goes into the next commit.' },
      ],
    },
    intermediate: {
      explanation: 'Use short-lived branches, small focused commits with clear messages and pull requests with review. Know how to inspect, undo and recover: log, diff, restore, revert, reset and reflog.',
      howItWorks: [
        'Edit files in the working tree.',
        'Stage chosen changes with git add.',
        'Commit to the local repository.',
        'Push to a remote and open a pull request.',
        'Review, then merge or rebase.',
        'Pull others\' changes regularly.',
      ],
      tradeoffs: {
        use: [
          'Use merge to preserve true history on shared branches.',
          'Use rebase to keep a feature branch linear before merging.',
          'Use revert to undo a change already shared.',
        ],
        avoid: [
          'Avoid rewriting history on shared branches.',
          'Avoid committing secrets or large binaries.',
          'Avoid giant commits that mix unrelated changes.',
        ],
      },
      pitfalls: [
        'Committing .env files or keys; deleting them later does not remove them from history.',
        'Force-pushing over teammates\' work.',
        'Long-lived branches with painful merges.',
        'Vague messages like "fix".',
        'Detached HEAD confusion.',
      ],
    },
    expert: {
      internals: [
        'The object store holds blobs, trees, commits and tags addressed by SHA-1 (SHA-256 in newer repos); packfiles delta-compress objects.',
        'Refs (branches, tags) are files containing a commit id; HEAD points to a ref.',
        'The reflog records where refs pointed, enabling recovery of "lost" commits for a limited time.',
        'git bisect binary searches history to find the commit that introduced a bug.',
      ],
      failureModes: [
        'Merge conflicts from overlapping changes.',
        'Lost work after a hard reset without noting the commit id.',
        'Secrets leaked in history, requiring rotation and history rewriting.',
        'Huge repositories slowing clone and status.',
      ],
      scalingNotes: [
        'Use partial clone, shallow clone and sparse checkout for large repos.',
        'Use Git LFS for large binary files.',
        'Branch protection, required reviews and CODEOWNERS enforce quality at scale.',
      ],
      realSystems: [
        'GitHub, GitLab, Bitbucket; Gerrit.',
        'Monorepos at Google (Piper) and Meta (Sapling, Mercurial based).',
        'pre-commit hooks and gitleaks for secret scanning.',
      ],
      numbersToKnow: [
        'A commit id is a 40-hex-character SHA-1 by default.',
        'The reflog keeps unreachable commits for 30 to 90 days by default. // VERIFY',
        'Branches are cheap: a 41-byte file.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'bash',
      title: 'Everyday workflow',
      code: [
        'git switch -c feature/rate-limit',
        'git add -p',
        'git commit -m "Add token bucket rate limiter"',
        'git fetch origin && git rebase origin/main',
        'git push --force-with-lease -u origin feature/rate-limit',
        'git revert <sha>',
        'git reflog',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Stage hunks interactively to craft focused commits.' },
        { line: 4, text: 'Rebase your own branch onto the latest main before review.' },
        { line: 5, text: 'force-with-lease refuses to overwrite commits you have not seen.' },
        { line: 7, text: 'The reflog helps recover commits after a mistaken reset.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is a commit?', answer: 'A snapshot of the project saved with a message, linked to its parent commit to form history.', followUps: ['What is a branch?'] },
    { level: 'beginner', q: 'Why use branches?', answer: 'They let you work on features or fixes in isolation and merge them when ready.', followUps: ['What is a pull request?'] },
    { level: 'intermediate', q: 'Merge vs rebase?', answer: 'Merge joins histories with a merge commit and preserves what happened. Rebase replays your commits on a new base for a linear history, rewriting them, so avoid it on shared branches.', followUps: ['What is a squash merge?'] },
    { level: 'intermediate', q: 'How do you undo a pushed commit?', answer: 'Use git revert, which adds a new commit that reverses it, instead of rewriting shared history.', followUps: ['When is reset acceptable?'] },
    { level: 'expert', q: 'You committed an API key. What do you do?', answer: 'Revoke and rotate the key immediately, since history and clones retain it. Then optionally rewrite history with git filter-repo and force-push, notify collaborators and add secret scanning and pre-commit hooks.', followUps: ['Why is deleting the file not enough?'] },
    { level: 'expert', q: 'How does Git store data internally?', answer: 'As content-addressed objects: blobs for files, trees for directories, commits pointing to a tree and parents. Refs are pointers to commits. Packfiles use delta compression for storage and transfer.', followUps: ['Why are commit ids tamper-evident?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'git add moves changes to...', options: ['The staging area', 'The remote', 'The cache', 'Trash'], answerIndex: 0, why: 'Staging prepares the next commit.' },
    { level: 'beginner', q: 'A branch is...', options: ['A pointer to a commit', 'A copy of the disk', 'A server', 'A password'], answerIndex: 0, why: 'Branches are cheap pointers.' },
    { level: 'intermediate', q: 'Safest way to undo a shared commit...', options: ['git revert', 'git push --force', 'Delete .git', 'git gc'], answerIndex: 0, why: 'It adds a new reversing commit.' },
    { level: 'expert', q: 'A leaked key requires...', options: ['Rotation', 'Only deleting the file', 'Renaming the branch', 'Ignoring it'], answerIndex: 0, why: 'History keeps the secret.' },
  ],
});
