/* Infrastructure: Linux Fundamentals. */
Atlas.topics.push({
  id: 'linux-fundamentals',
  category: 'infrastructure',
  title: 'Linux Fundamentals',
  source: {
    description: 'Processes, files, permissions and the shell.',
    steps: ['Shell command', 'Process starts', 'Reads files (permissions)', 'Output to terminal'],
  },
  estMinutes: 11,
  prereqs: [],
  related: ['docker', 'git', 'networking-fundamentals', 'cloud-fundamentals'],
  tags: ['shell', 'process', 'permissions', 'chmod', 'pipes', 'signals', 'file descriptors'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'table',
      columns: ['Step', 'Kernel concept', 'Example'],
      rows: [
        ['Shell parses', 'fork + exec', 'grep ERROR app.log'],
        ['Process runs', 'PID, env, fds 0/1/2', 'PID 4211'],
        ['File access', 'mode bits rwxr-xr--', '-rw-r----- app.log'],
        ['Output', 'stdout to tty or pipe', 'matching lines'],
      ],
    },
  },
  steps: [
    {
      label: 'Shell command',
      caption: {
        beginner: 'You type a command such as "grep ERROR app.log".',
        intermediate: 'The shell parses the line, expands variables and wildcards and finds the program in PATH.',
        expert: 'The shell calls fork to clone itself, then exec in the child to replace it with the program. Pipes connect stdout to stdin of the next process.',
      },
      state: { rows: [0], cells: [[0, 1]] },
      hood: 'fork then exec; the shell waits with wait().',
    },
    {
      label: 'Process starts',
      caption: {
        beginner: 'The computer starts a small running program with its own ID.',
        intermediate: 'The kernel creates a process with a PID, environment and three standard file descriptors: stdin, stdout, stderr.',
        expert: 'Each process has its own virtual address space, scheduled by the kernel. Signals (SIGTERM, SIGKILL) are the standard way to ask it to stop.',
      },
      state: { rows: [1], cells: [[1, 1]], dim: [0] },
      hood: 'Everything is a file descriptor: files, pipes, sockets.',
    },
    {
      label: 'Reads files (permissions)',
      caption: {
        beginner: 'The program can only open files it is allowed to see.',
        intermediate: 'Permissions are read, write and execute for owner, group and others (for example rw-r-----). The kernel checks them on open.',
        expert: 'The kernel checks the effective UID/GID against mode bits, then ACLs and capabilities. Mandatory access control (SELinux, AppArmor) adds further limits.',
      },
      state: { rows: [2], cells: [[2, 1]], dim: [0, 1] },
      hood: 'Checks use the effective uid/gid and the file mode.',
    },
    {
      label: 'Output to terminal',
      caption: {
        beginner: 'The result shows up on your screen.',
        intermediate: 'Output goes to stdout, shown on the terminal or redirected into a file or pipe. Errors go to stderr, and exit code 0 means success.',
        expert: 'A pipe is a kernel buffer with backpressure; a writer blocks when full. A SIGPIPE is sent when the reader closes early.',
      },
      state: { rows: [3], cells: [[3, 1]], dim: [0, 1, 2] },
      hood: 'Pipes have a bounded kernel buffer (commonly 64 KiB).',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A well-run office building. Employees (processes) have badges (users), rooms (files) have lock rules for who can read or enter, and the front desk (the kernel) checks every request. The shell is the intercom through which you give instructions.',
      explanation: 'Linux runs almost every server. You control it by typing commands into a shell. Each command starts a process, which can read or change files only if its user has permission.',
      keyTerms: [
        { term: 'Shell', meaning: 'The program that runs your commands.' },
        { term: 'Process', meaning: 'A running program with a PID.' },
        { term: 'Permission', meaning: 'Who may read, write or run a file.' },
        { term: 'Pipe', meaning: 'Sends one command\'s output to another.' },
        { term: 'Root', meaning: 'The superuser with full access.' },
      ],
    },
    intermediate: {
      explanation: 'Know the core tools for finding problems on a server: ps, top, df, du, ls, grep, tail, curl, ss, journalctl, plus file permissions, ownership, environment variables and systemd services.',
      howItWorks: [
        'The shell parses a command and forks a child.',
        'The child executes the program.',
        'The kernel checks permissions on every file access.',
        'Output flows to stdout and errors to stderr.',
        'Exit status tells scripts what happened.',
        'Services are managed by systemd.',
      ],
      tradeoffs: {
        use: [
          'Use pipes and small tools to compose quick diagnostics.',
          'Use least-privilege users for services.',
          'Use systemd units for restart policy and logging.',
        ],
        avoid: [
          'Avoid running apps as root.',
          'Avoid chmod 777 as a fix.',
          'Avoid editing production by hand without recording changes.',
        ],
      },
      pitfalls: [
        'Disk full from logs or deleted-but-open files.',
        'Wrong file ownership after deploy.',
        'Forgetting that env vars and PATH differ under systemd or cron.',
        'Running out of file descriptors.',
        'Using kill -9 first, skipping graceful shutdown.',
      ],
    },
    expert: {
      internals: [
        'The scheduler (CFS/EEVDF) shares CPU; memory uses virtual memory with paging, the page cache and the OOM killer.',
        'Resource limits come from ulimit and cgroups; containers are built on namespaces and cgroups.',
        'Everything-is-a-file: /proc and /sys expose kernel state; strace shows syscalls; perf and eBPF profile in production.',
        'inodes hold metadata; directory entries map names to inodes; hard links share inodes.',
      ],
      failureModes: [
        'OOM killer terminating the largest process.',
        'File descriptor or inode exhaustion.',
        'High load from I/O wait rather than CPU.',
        'Zombie processes from parents that never wait().',
      ],
      scalingNotes: [
        'Tune somaxconn, file limits and TCP settings for busy servers.',
        'Check load average together with CPU, iowait and run queue.',
        'Use the USE method (utilization, saturation, errors) per resource.',
      ],
      realSystems: [
        'Ubuntu, Debian, RHEL, Alpine; systemd; journald.',
        'strace, lsof, perf, bpftrace, iostat, vmstat.',
        'cgroups v2 and namespaces underpin Docker and Kubernetes.',
      ],
      numbersToKnow: [
        'Default open file limit is often 1024 per process (soft). // VERIFY',
        'Permissions as octal: 640 = rw-r-----, 755 = rwxr-xr-x.',
        'Standard file descriptors: 0 stdin, 1 stdout, 2 stderr.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'bash',
      title: 'Diagnose a slow server',
      code: [
        'uptime',
        'df -h && du -sh /var/log/* | sort -h | tail',
        'ps aux --sort=-%mem | head',
        'ss -tlnp',
        'journalctl -u api --since "10 min ago" | grep -i error',
        'chmod 640 app.log && chown app:app app.log',
      ].join('\n'),
      annotations: [
        { line: 1, text: 'Load average gives a quick sense of saturation.' },
        { line: 2, text: 'A full disk is a classic cause of strange failures.' },
        { line: 4, text: 'See which processes listen on which ports.' },
        { line: 6, text: 'Grant only the access the service needs.' },
      ],
    },
    {
      lang: 'python',
      title: 'Run a command safely from Python',
      code: [
        'import subprocess',
        'result = subprocess.run(["grep", "ERROR", "app.log"], capture_output=True, text=True, timeout=10, check=False)',
        'print(result.returncode, result.stdout[:200])',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Pass arguments as a list (no shell) to avoid command injection, and set a timeout.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What does chmod 640 mean?', answer: 'Owner can read and write (6), group can read (4), others have no access (0).', followUps: ['How do you read 755?'] },
    { level: 'beginner', q: 'What is a process?', answer: 'A running instance of a program, with a process ID, memory and open files.', followUps: ['How do you list processes?'] },
    { level: 'intermediate', q: 'What do the pipe and redirect operators do?', answer: 'A pipe sends one command\'s stdout to the next command\'s stdin. > redirects stdout to a file; 2> redirects stderr; >> appends.', followUps: ['What does 2>&1 do?'] },
    { level: 'intermediate', q: 'Disk shows full but du finds little. Why?', answer: 'A deleted file still held open by a process keeps its space; find it with lsof +L1 and restart or truncate. Inode exhaustion is another cause (check df -i).', followUps: ['How do you check inodes?'] },
    { level: 'expert', q: 'Load average is 30 on an 8-core box but CPU is mostly idle. Why?', answer: 'Load includes processes in uninterruptible I/O wait, so a slow disk or network filesystem can drive it. Check iowait, iostat, and D-state processes.', followUps: ['What tools show it?'] },
    { level: 'expert', q: 'What happens when the OOM killer runs?', answer: 'When memory cannot be reclaimed, the kernel selects a process by oom_score (mostly memory use) and kills it. In containers a cgroup OOM kills within the limit. Prevent with limits, monitoring and right-sizing.', followUps: ['How can you protect a critical process?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'rwx stands for...', options: ['Read, write, execute', 'Run, wait, exit', 'Root, web, X', 'Rename, write, extract'], answerIndex: 0, why: 'File permission bits.' },
    { level: 'beginner', q: 'A pipe (|) connects...', options: ['stdout to next stdin', 'Two disks', 'Two users', 'Two files'], answerIndex: 0, why: 'It chains commands.' },
    { level: 'intermediate', q: 'Disk full but files small: check...', options: ['Deleted but open files', 'Fonts', 'DNS', 'Git tags'], answerIndex: 0, why: 'Space is released when the last handle closes.' },
    { level: 'expert', q: 'Process creation in Unix is...', options: ['fork then exec', 'new then free', 'open then read', 'bind then listen'], answerIndex: 0, why: 'The shell forks, the child execs.' },
  ],
});
