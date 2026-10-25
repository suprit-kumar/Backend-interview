/* Infrastructure: Docker. */
Atlas.topics.push({
  id: 'docker',
  category: 'infrastructure',
  title: 'Docker',
  source: {
    description: 'Package an app with its dependencies into a container.',
    steps: ['Dockerfile', 'Build image', 'Run container', 'Isolated process'],
  },
  estMinutes: 11,
  prereqs: ['linux-fundamentals'],
  related: ['kubernetes-basics', 'ci-cd', 'linux-fundamentals', 'cloud-fundamentals'],
  tags: ['container', 'image', 'Dockerfile', 'namespaces', 'cgroups', 'registry'],
  visual: {
    type: 'layers',
    config: {
      payload: 'app',
      layers: [
        { id: 'app', label: 'Your app code', unit: 'files', header: 'COPY', detail: 'Application code' },
        { id: 'deps', label: 'Dependencies', unit: 'layer', header: 'pip install', detail: 'Libraries' },
        { id: 'base', label: 'Base image', unit: 'layer', header: 'FROM python:3.12-slim', detail: 'OS userland' },
        { id: 'kernel', label: 'Host kernel', unit: 'shared', header: 'namespaces + cgroups', detail: 'Shared by all containers' },
      ],
    },
  },
  steps: [
    {
      label: 'Dockerfile',
      caption: {
        beginner: 'You write a recipe describing what the app needs.',
        intermediate: 'A Dockerfile lists a base image and instructions (COPY, RUN) that build the environment.',
        expert: 'Order instructions from least to most frequently changing so layer caching works. Each instruction creates a layer.',
      },
      state: { active: ['base'], wrapped: [] },
      hood: 'Layers are cached by instruction and content hash.',
    },
    {
      label: 'Build image',
      caption: {
        beginner: 'Docker follows the recipe and produces a sealed package.',
        intermediate: 'docker build produces an immutable image made of stacked read-only layers.',
        expert: 'Images are content-addressed (sha256). BuildKit builds in parallel and supports cache mounts and multi-stage builds to keep images small.',
      },
      state: { active: ['deps', 'app'], wrapped: ['base', 'deps'] },
      hood: 'Image = ordered layers + config, identified by digest.',
    },
    {
      label: 'Run container',
      caption: {
        beginner: 'Starting the package gives you a running copy of the app.',
        intermediate: 'A container is an image plus a thin writable layer and a running process.',
        expert: 'The runtime (containerd and runc) creates namespaces and cgroups, mounts the overlay filesystem and executes the entrypoint.',
      },
      state: { active: ['app'], wrapped: ['base', 'deps', 'app'] },
      hood: 'overlayfs stacks read-only layers under one writable layer.',
    },
    {
      label: 'Isolated process',
      caption: {
        beginner: 'The app runs in its own bubble and cannot see other apps.',
        intermediate: 'Containers are isolated processes sharing the host kernel, much lighter than virtual machines.',
        expert: 'Isolation comes from Linux namespaces (pid, net, mnt, uts, ipc, user) and limits from cgroups. It is weaker than a VM boundary; harden with seccomp, dropped capabilities and non-root users.',
      },
      state: { active: ['kernel'], wrapped: ['base', 'deps', 'app', 'kernel'] },
      hood: 'Namespaces isolate views; cgroups limit resources.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A shipping container. Whatever is inside, the standard box fits any truck, ship or crane. Likewise a Docker container runs the same on a laptop, a test server or the cloud because everything the app needs travels inside the box.',
      explanation: 'Docker bundles an app with the exact libraries and settings it needs. That bundle runs the same way anywhere, which ends "it works on my machine" problems.',
      keyTerms: [
        { term: 'Image', meaning: 'The read-only package built from a recipe.' },
        { term: 'Container', meaning: 'A running instance of an image.' },
        { term: 'Dockerfile', meaning: 'The build recipe.' },
        { term: 'Registry', meaning: 'A store for images, like Docker Hub.' },
        { term: 'Volume', meaning: 'Storage that outlives a container.' },
      ],
    },
    intermediate: {
      explanation: 'Containers give reproducible, fast-starting, isolated environments. Keep images small, run as non-root, one main process per container, and keep state in volumes or external services.',
      howItWorks: [
        'Write a Dockerfile with a pinned base image.',
        'Build an image and tag it.',
        'Push it to a registry.',
        'Pull and run it with ports, env vars and volumes.',
        'Limit CPU and memory.',
        'Orchestrate with Compose or Kubernetes.',
      ],
      tradeoffs: {
        use: [
          'Use for consistent dev, test and production environments.',
          'Use for packaging services to deploy on orchestrators.',
          'Use multi-stage builds for small production images.',
        ],
        avoid: [
          'Avoid storing persistent data in the container filesystem.',
          'Avoid baking secrets into images.',
          'Avoid running as root or using the latest tag in production.',
        ],
      },
      pitfalls: [
        'Copying the whole project before installing dependencies, which breaks caching.',
        'Huge images with build tools left in.',
        'Secrets stored in image layers.',
        'Containers that ignore SIGTERM, so shutdowns are slow.',
        'No resource limits letting one container starve the host.',
      ],
    },
    expert: {
      internals: [
        'Images follow the OCI spec: manifest, config and layer tarballs; containerd pulls and unpacks them, runc sets up namespaces, cgroups and capabilities.',
        'The union filesystem (overlay2) uses copy-on-write: a write copies the file into the top writable layer.',
        'The container PID 1 must reap zombies and forward signals; use an init such as tini.',
        'Rootless containers and user namespaces map container root to an unprivileged host user.',
      ],
      failureModes: [
        'OOM kill when exceeding the memory cgroup limit.',
        'CPU throttling at cgroup quota causing latency spikes.',
        'Disk filled by logs or unused images.',
        'Container escape via kernel vulnerabilities or privileged mode.',
      ],
      scalingNotes: [
        'Scan images and pin digests for supply chain safety.',
        'Use a registry mirror and layer reuse to speed pulls at scale.',
        'Set requests and limits; size JVM and Python workers for cgroup limits.',
      ],
      realSystems: [
        'Docker Engine, containerd, CRI-O, Podman, runc and gVisor/Kata for stronger isolation.',
        'BuildKit, Buildah; registries: Docker Hub, ECR, GHCR.',
        'Trivy and Grype for image scanning.',
      ],
      numbersToKnow: [
        'Containers usually start in well under a second to a few seconds; VMs take longer. // VERIFY',
        'A slim Python base image is on the order of tens of MB; full images hundreds of MB. // VERIFY',
        'Each RUN, COPY and ADD creates a layer.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'yaml',
      title: 'Multi-stage Dockerfile for FastAPI',
      code: [
        'FROM python:3.12-slim AS build',
        'WORKDIR /app',
        'COPY requirements.txt .',
        'RUN pip install --no-cache-dir --prefix=/install -r requirements.txt',
        '',
        'FROM python:3.12-slim',
        'RUN useradd -m app',
        'COPY --from=build /install /usr/local',
        'COPY . /app',
        'WORKDIR /app',
        'USER app',
        'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Copy only requirements first so the dependency layer is cached until they change.' },
        { line: 8, text: 'The final image takes only the installed packages, not build tools.' },
        { line: 11, text: 'Run as a non-root user.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'Image vs container?', answer: 'An image is the read-only template; a container is a running instance created from it.', followUps: ['Can many containers share one image?'] },
    { level: 'beginner', q: 'Why use Docker?', answer: 'It makes the app run the same everywhere by packaging dependencies with it, and makes deployment repeatable.', followUps: ['How is it different from a VM?'] },
    { level: 'intermediate', q: 'Container vs VM?', answer: 'Containers share the host kernel and isolate processes, so they are lighter and faster to start. VMs run a full guest OS on a hypervisor with stronger isolation.', followUps: ['When prefer a VM?'] },
    { level: 'intermediate', q: 'How do you make builds faster and images smaller?', answer: 'Order layers for caching, use multi-stage builds, slim bases, .dockerignore and no-cache pip installs.', followUps: ['What is BuildKit?'] },
    { level: 'expert', q: 'How does container isolation work, and what are its limits?', answer: 'Namespaces isolate views (pid, net, mount, user) and cgroups limit resources. All containers share one kernel, so a kernel bug can break isolation. Add seccomp, AppArmor, no privileged mode or use gVisor/Kata.', followUps: ['What does a rootless container change?'] },
    { level: 'expert', q: 'A container is repeatedly OOM-killed but app heap looks small. Why?', answer: 'The cgroup counts page cache, native memory, threads and the runtime overhead too, not just the heap. Inspect memory usage via cgroup stats, tune runtime memory settings and set limits with headroom.', followUps: ['How do you check it?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'A container is...', options: ['A running instance of an image', 'A database', 'A CSS file', 'A VM disk only'], answerIndex: 0, why: 'Images are templates.' },
    { level: 'beginner', q: 'Dockerfile is a...', options: ['Build recipe', 'Log file', 'Network cable', 'Backup'], answerIndex: 0, why: 'It describes how to build the image.' },
    { level: 'intermediate', q: 'Containers differ from VMs by sharing...', options: ['The host kernel', 'A hypervisor disk', 'A BIOS', 'RAM chips'], answerIndex: 0, why: 'They are isolated processes.' },
    { level: 'expert', q: 'cgroups provide...', options: ['Resource limits', 'DNS', 'TLS', 'Image signing'], answerIndex: 0, why: 'They cap CPU and memory.' },
  ],
});
