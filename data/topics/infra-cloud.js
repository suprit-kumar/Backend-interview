/* Infrastructure: Cloud Fundamentals. */
Atlas.topics.push({
  id: 'cloud-fundamentals',
  category: 'infrastructure',
  title: 'Cloud Fundamentals',
  source: {
    description: 'Rent compute, storage and managed services on demand.',
    steps: ['Pick region', 'Provision compute', 'Attach storage and network', 'Pay per use'],
  },
  estMinutes: 10,
  prereqs: [],
  related: ['docker', 'kubernetes-basics', 'high-availability', 'scalability'],
  tags: ['IaaS', 'PaaS', 'SaaS', 'region', 'availability zone', 'VPC', 'IAM', 'shared responsibility'],
  visual: {
    type: 'layers',
    config: {
      payload: 'request',
      layers: [
        { id: 'region', label: 'Region and zones', unit: 'geography', header: 'eu-west', detail: 'Isolated zones' },
        { id: 'compute', label: 'Compute', unit: 'VM / container / function', header: 'instance', detail: 'Pay per time' },
        { id: 'store', label: 'Storage and network', unit: 'disk / object / VPC', header: 'volume + subnet', detail: 'Pay per GB' },
        { id: 'bill', label: 'Billing and IAM', unit: 'metered', header: 'usage + policy', detail: 'Pay per use' },
      ],
    },
  },
  steps: [
    {
      label: 'Pick region',
      caption: {
        beginner: 'Choose which part of the world your servers live in.',
        intermediate: 'A region is a geographic area made of several availability zones. Choose by latency to users, data law and price.',
        expert: 'Zones are separate failure domains within a region. Region choice affects data residency, service availability and egress costs.',
      },
      state: { active: ['region'], wrapped: [] },
      hood: 'Zones fail independently; regions are fully separate.',
    },
    {
      label: 'Provision compute',
      caption: {
        beginner: 'Rent computers by the hour or the second.',
        intermediate: 'Pick a model: virtual machines (IaaS), containers or platform services (PaaS), or functions (serverless). Higher-level means less to manage.',
        expert: 'Trade control for operations effort. Serverless gives scale-to-zero but adds cold starts and execution limits.',
      },
      state: { active: ['compute'], wrapped: ['region'] },
      hood: 'IaaS, PaaS, serverless: you manage less as you go up.',
    },
    {
      label: 'Attach storage and network',
      caption: {
        beginner: 'Add disks and private connections between your machines.',
        intermediate: 'Attach block disks, object storage and managed databases, inside a private network (VPC) with subnets and security groups.',
        expert: 'Design private subnets, least-privilege IAM roles and encryption by default. Data transfer between zones and out to the internet is billed.',
      },
      state: { active: ['store'], wrapped: ['region', 'compute'] },
      hood: 'Default deny: security groups and IAM policies.',
    },
    {
      label: 'Pay per use',
      caption: {
        beginner: 'You are charged only for what you use.',
        intermediate: 'Billing is metered by time, storage, requests and data transfer. Costs need budgets, tags and alerts.',
        expert: 'Optimize with right-sizing, reserved or savings plans, spot capacity and lifecycle policies. Egress and idle resources are common surprises.',
      },
      state: { active: ['bill'], wrapped: ['region', 'compute', 'store'] },
      hood: 'FinOps: tag, budget, right-size, review.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Renting utilities and workspaces instead of building a power plant. You rent desks, storage rooms and electricity as needed, pay by usage and hand back what you do not need, while the provider maintains the building.',
      explanation: 'Cloud providers rent you computing power, storage and ready-made services over the internet. You can start in minutes, grow or shrink as needed and pay for what you use.',
      keyTerms: [
        { term: 'Region', meaning: 'A geographic area with data centers.' },
        { term: 'Availability zone', meaning: 'An isolated data center within a region.' },
        { term: 'IaaS/PaaS/SaaS', meaning: 'Rent hardware, a platform or finished software.' },
        { term: 'VPC', meaning: 'Your private network in the cloud.' },
        { term: 'IAM', meaning: 'Who may do what.' },
      ],
    },
    intermediate: {
      explanation: 'Use managed services where possible, spread across zones for availability, isolate with VPCs and IAM, and automate with infrastructure as code. Understand the shared responsibility model: the provider secures the cloud; you secure what you put in it.',
      howItWorks: [
        'Choose a region and zones.',
        'Define networks, subnets and security groups.',
        'Provision compute and managed data services.',
        'Grant access with IAM roles.',
        'Deploy with IaC and CI/CD.',
        'Monitor cost and performance.',
      ],
      tradeoffs: {
        use: [
          'Use managed databases and queues to cut operations work.',
          'Use autoscaling for variable load.',
          'Use multiple zones for high availability.',
        ],
        avoid: [
          'Avoid public databases and wide-open security groups.',
          'Avoid deep use of proprietary services without weighing lock-in.',
          'Avoid leaving unused resources running.',
        ],
      },
      pitfalls: [
        'Publicly exposed storage buckets.',
        'Overly broad IAM permissions and long-lived access keys.',
        'Surprise bills from data egress or forgotten resources.',
        'Single-zone deployments.',
        'Manual console changes that drift from IaC.',
      ],
    },
    expert: {
      internals: [
        'Virtualization (KVM, Nitro, Hyper-V) multiplexes hardware; the control plane schedules instances, and tenant isolation depends on hypervisors and network overlays.',
        'Object stores (S3) are distributed, replicated and eventually or strongly consistent depending on service and period. // VERIFY',
        'IAM evaluates identity and resource policies with explicit deny taking precedence.',
        'Serverless platforms (Lambda) run functions in microVMs (Firecracker) with cold starts when new environments are created.',
      ],
      failureModes: [
        'Regional outages and control-plane failures.',
        'Noisy neighbors and throttled burst credits.',
        'Account or quota limits reached during scale events.',
        'Credential leaks leading to cryptomining or data theft.',
      ],
      scalingNotes: [
        'Design multi-AZ by default; multi-region only when the SLO justifies the cost and complexity.',
        'Use tagging and per-team cost allocation.',
        'Request quota increases ahead of launches.',
      ],
      realSystems: [
        'AWS (EC2, S3, RDS, Lambda, VPC, IAM), Azure, Google Cloud.',
        'Terraform, Pulumi, CloudFormation; Cloudflare and Fly.io for edge and PaaS.',
        'Spot or preemptible instances for fault-tolerant batch work.',
      ],
      numbersToKnow: [
        'S3 advertises 11 nines of durability. // VERIFY',
        'Spot instances can be much cheaper (often 60-90% off) but can be reclaimed. // VERIFY',
        'Cross-AZ and internet egress transfer are typically billed per GB.',
      ],
    },
  },
  sim: null,
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Upload to object storage with boto3',
      code: [
        'import boto3',
        '',
        's3 = boto3.client("s3", region_name="eu-west-1")',
        's3.upload_file("report.pdf", "acme-reports", "2025/report.pdf",',
        '               ExtraArgs={"ServerSideEncryption": "aws:kms"})',
        'url = s3.generate_presigned_url("get_object",',
        '    Params={"Bucket": "acme-reports", "Key": "2025/report.pdf"}, ExpiresIn=300)',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'Credentials come from an IAM role, not hard-coded keys.' },
        { line: 5, text: 'Encrypt at rest with a managed key.' },
        { line: 7, text: 'A presigned URL gives time-limited access without making the bucket public.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'IaaS vs PaaS vs SaaS?', answer: 'IaaS rents raw infrastructure like VMs, PaaS rents a platform to run your code, SaaS is finished software you simply use.', followUps: ['Give an example of each.'] },
    { level: 'beginner', q: 'Why use multiple availability zones?', answer: 'A failure in one zone does not take the whole app down because other zones keep serving.', followUps: ['What about a whole region?'] },
    { level: 'intermediate', q: 'What is the shared responsibility model?', answer: 'The provider secures the underlying infrastructure; the customer secures their data, configuration, identities and applications.', followUps: ['Who patches the guest OS on a VM?'] },
    { level: 'intermediate', q: 'How do you reduce cloud costs?', answer: 'Right-size resources, shut down idle ones, use autoscaling, reserved or savings plans, spot capacity for tolerant jobs, storage lifecycle policies, and watch egress. Tag and budget for visibility.', followUps: ['What is FinOps?'] },
    { level: 'expert', q: 'Serverless vs containers: how do you choose?', answer: 'Serverless suits spiky, event-driven or low-traffic workloads with scale to zero, accepting cold starts, time limits and vendor coupling. Containers suit steady, long-running or latency-sensitive services needing control over runtime and cost at scale.', followUps: ['How do you mitigate cold starts?'] },
    { level: 'expert', q: 'How would you design for a region outage?', answer: 'Decide RTO and RPO first. Options: backup and restore, pilot light, warm standby or active-active, with replicated data, infrastructure as code, DNS or global load balancing failover and regular game days. Avoid hidden dependencies on a single region such as control planes.', followUps: ['What does it cost?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Cloud billing is mostly...', options: ['Pay per use', 'One-time purchase', 'Free', 'Per developer'], answerIndex: 0, why: 'Resources are metered.' },
    { level: 'beginner', q: 'An availability zone is...', options: ['An isolated data center area', 'A time zone', 'A database', 'A DNS record'], answerIndex: 0, why: 'A failure domain in a region.' },
    { level: 'intermediate', q: 'Customer is responsible for...', options: ['Their data and IAM config', 'Physical security', 'Hypervisor patching', 'Power grid'], answerIndex: 0, why: 'Shared responsibility.' },
    { level: 'expert', q: 'Serverless drawback includes...', options: ['Cold starts', 'No scaling', 'No billing', 'No code'], answerIndex: 0, why: 'New environments take time to start.' },
  ],
});
