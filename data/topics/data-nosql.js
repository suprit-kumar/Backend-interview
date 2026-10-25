/* Data: NoSQL Databases. Playground: js/sims/nosql-partition.js. */
Atlas.topics.push({
  id: 'nosql-databases',
  category: 'data',
  title: 'NoSQL Databases',
  source: {
    description: 'Trade rigid schema for flexible models and horizontal scale.',
    steps: ['Pick model (document, key-value, column, graph)', 'Partition by key', 'Write', 'Replicate'],
  },
  estMinutes: 15,
  prereqs: ['sql', 'database-design-normalization'],
  related: ['database-design-normalization', 'transactions-acid', 'indexing', 'sql'],
  tags: ['nosql', 'document', 'key-value', 'column family', 'graph', 'partition', 'sharding', 'replication', 'dynamodb', 'mongodb'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'ring',
      nodes: [
        { id: 'n1', label: 'Node 1', pos: 0 },
        { id: 'n2', label: 'Node 2', pos: 25 },
        { id: 'n3', label: 'Node 3', pos: 50 },
        { id: 'n4', label: 'Node 4', pos: 75 },
      ],
    },
  },
  steps: [
    {
      label: 'Pick model (document, key-value, column, graph)',
      caption: {
        beginner: 'Choose the shape that fits your data: a document like a form, a simple label-and-value pair, a wide table, or a web of connections.',
        intermediate: 'Document (MongoDB), key-value (Redis, DynamoDB), wide-column (Cassandra) and graph (Neo4j) each optimize for different access patterns. You model around your queries.',
        expert: 'NoSQL schemas are query-driven: you design the partition key and access patterns first and denormalize to serve them. Choosing the wrong model forces expensive scans or multi-document workarounds.',
      },
      state: { note: 'Four nodes form the cluster.', changed: 'The data model is chosen before any data is stored.' },
      hood: 'Design from access patterns; joins are limited or absent, so data is duplicated per query shape.',
    },
    {
      label: 'Partition by key',
      caption: {
        beginner: 'The key decides which machine stores your item, like sorting letters into mailboxes by name.',
        intermediate: 'A hash of the partition key maps each item to a node. A key with many different values spreads data and load evenly.',
        expert: 'Consistent hashing with virtual nodes limits data movement when nodes join or leave. A skewed key creates a hot partition that caps throughput regardless of cluster size.',
      },
      state: { keys: [{ label: 'user:42', pos: 35 }], active: ['n3'], changed: 'user:42 maps to Node 3.' },
      hood: 'Consistent hashing with vnodes (Cassandra, DynamoDB style) moves only a fraction of keys when the cluster changes.',
    },
    {
      label: 'Write',
      caption: {
        beginner: 'Your data is saved on the machine that owns that key.',
        intermediate: 'The coordinator routes the write to the owning node. Many stores accept writes without a global transaction, trading some guarantees for speed.',
        expert: 'Cassandra appends to a commit log and a memtable, flushing sorted SSTables later (LSM tree). MongoDB writes to the primary\'s journal and oplog. Single-item operations are usually atomic; multi-item atomicity varies by product.',
      },
      state: { keys: [{ label: 'user:42', pos: 35 }], active: ['n3'], changed: 'Node 3 stores the write.' },
      hood: 'LSM trees turn random writes into sequential appends; reads may check several SSTables.',
    },
    {
      label: 'Replicate',
      caption: {
        beginner: 'Copies go to other machines, so losing one machine does not lose your data.',
        intermediate: 'Each item is copied to N replicas. A quorum rule (for example write to 2 of 3) trades consistency against latency and availability.',
        expert: 'Tunable consistency: with replication factor N, read quorum R and write quorum W, R + W > N gives overlapping quorums but not linearizability by itself. Asynchronous replication risks stale reads and lost writes on failover.',
      },
      state: { keys: [{ label: 'user:42', pos: 35 }], active: ['n3', 'n4', 'n1'], changed: 'Replicas on Node 4 and Node 1 receive the item.' },
      hood: 'R + W > N gives overlapping quorums; it is not the same as linearizability.',
    },
    {
      label: 'Node failure',
      caption: {
        beginner: 'One machine breaks, but copies on the others keep the data available.',
        intermediate: 'Reads and writes continue using the remaining replicas. When the node returns, it catches up through repair mechanisms.',
        expert: 'Hinted handoff, read repair and anti-entropy (Merkle trees) converge replicas after failures. During a partition, AP-leaning stores stay available with possible conflicts resolved by last-write-wins or vector clocks.',
      },
      state: { keys: [{ label: 'user:42', pos: 35 }], failed: ['n3'], active: ['n4', 'n1'], changed: 'Node 3 is down; replicas serve the key.' },
      hood: 'Repair paths: hinted handoff, read repair and anti-entropy with Merkle trees.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A library versus a set of lockers. A relational database is a strict catalogue where every book has the same card layout. NoSQL is more like many lockers: each holds whatever you like, you find yours by its number, and you can add lockers as you grow.',
      explanation: '"NoSQL" covers databases that do not use the traditional table-with-joins model. They store data as documents, key-value pairs, wide columns or graphs, and usually spread data across many machines. They are great when your data shape varies or your traffic outgrows one machine, but they often give fewer built-in guarantees than SQL.',
      keyTerms: [
        { term: 'Document store', meaning: 'Stores flexible JSON-like records, such as MongoDB.' },
        { term: 'Key-value store', meaning: 'Looks up a value by a unique key, such as Redis or DynamoDB.' },
        { term: 'Partition key', meaning: 'The value used to decide which machine holds the item.' },
        { term: 'Replication', meaning: 'Keeping copies of data on several machines.' },
        { term: 'Eventual consistency', meaning: 'Copies may briefly disagree but converge over time.' },
      ],
    },
    intermediate: {
      explanation: 'NoSQL databases trade relational features such as joins and cross-row transactions for flexible schemas, horizontal scaling and high availability. You model data around known queries, choose a partition key that spreads load, and decide how much consistency you need per operation.',
      howItWorks: [
        'Choose a data model that fits the access pattern: document, key-value, wide-column or graph.',
        'A partition key is hashed (or range-mapped) to pick the owning node.',
        'Writes go to the owner and are copied to replicas.',
        'Reads can hit one replica (fast, possibly stale) or a quorum (slower, fresher).',
        'Schemas are flexible, but the application still needs a consistent shape.',
        'Secondary indexes and joins are limited, so data is often duplicated per query.',
      ],
      tradeoffs: {
        use: [
          'Use NoSQL when you need horizontal scale for massive reads or writes on well-known access patterns.',
          'Use it for flexible or evolving record shapes, such as product catalogs or event data.',
          'Use it for low-latency key lookups, caching, sessions or time-series style workloads.',
        ],
        avoid: [
          'Avoid it when you need many ad hoc queries and joins across entities; SQL is stronger.',
          'Avoid it when multi-row ACID transactions are central to correctness.',
          'Avoid choosing it only because it is fashionable; a single PostgreSQL node scales further than most people expect.',
        ],
      },
      pitfalls: [
        'Choosing a low-cardinality or monotonic partition key and creating a hot partition.',
        'Modelling like SQL, then needing joins the store does not offer.',
        'Assuming strong consistency by default when reads are eventually consistent.',
        'Unbounded documents or collections that grow forever.',
        'Skipping a schema discipline, so every record has a different shape.',
      ],
    },
    expert: {
      internals: [
        'Cassandra and many wide-column stores use LSM trees: writes go to a commit log and memtable, flush to immutable SSTables and are merged by compaction, which costs write amplification.',
        'DynamoDB partitions by hashed partition key; items under a key are ordered by sort key, and capacity is allocated per partition.',
        'MongoDB uses a replica set with a primary and an oplog; sharded clusters add a shard key and mongos routers. Multi-document transactions exist but cost more than single-document operations.',
        'Dynamo-style stores use consistent hashing, quorum reads and writes, hinted handoff, read repair and Merkle-tree anti-entropy.',
        'Conflict resolution options include last-write-wins by timestamp (risks silent loss with clock skew), vector clocks, or CRDTs.',
      ],
      failureModes: [
        'Hot partitions throttling a subset of keys while the cluster looks idle.',
        'Stale reads or lost writes during failover with asynchronous replication.',
        'Last-write-wins dropping a concurrent update when clocks skew.',
        'Compaction or tombstone buildup causing latency spikes and slow reads in LSM stores.',
        'Unbounded partitions (very wide rows) becoming too large to scan or repair.',
      ],
      scalingNotes: [
        'Throughput scales roughly linearly with nodes only when keys and access are evenly distributed.',
        'Add capacity by adding nodes; consistent hashing or range splits move a fraction of the data.',
        'Rebalancing and compaction compete with foreground traffic, so throttle them.',
      ],
      realSystems: [
        'DynamoDB, Cassandra and ScyllaDB (Dynamo-style partitioned stores).',
        'MongoDB (document), Redis (in-memory key-value and data structures), Neo4j (graph).',
        'Google Bigtable and HBase (wide-column), the lineage of many column stores.',
      ],
      numbersToKnow: [
        'DynamoDB limits a single item to 400 KB. // VERIFY current limit',
        'Typical replication factor is 3 with quorum of 2 for reads and writes, giving R + W > N.',
        'A single partition in DynamoDB is bounded by per-partition throughput limits, so a hot key throttles even if the table has spare capacity. // VERIFY current limits',
      ],
    },
  },
  sim: 'nosql-partition',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'DynamoDB conditional write (boto3)',
      code: [
        'import boto3',
        '',
        'table = boto3.resource("dynamodb").Table("users")',
        '',
        'def create_user(user_id: str, name: str):',
        '    table.put_item(',
        '        Item={"pk": f"USER#{user_id}", "name": name},',
        '        ConditionExpression="attribute_not_exists(pk)",',
        '    )',
      ].join('\n'),
      annotations: [
        { line: 7, text: 'pk is the partition key; a high-cardinality id spreads items across partitions.' },
        { line: 8, text: 'The condition makes this a safe insert: it fails if the key already exists.' },
      ],
    },
    {
      lang: 'python',
      title: 'MongoDB document with embedded data (pymongo)',
      code: [
        'from pymongo import MongoClient',
        '',
        'orders = MongoClient()["shop"]["orders"]',
        '',
        'orders.insert_one({',
        '    "customer_id": 42,',
        '    "items": [{"sku": "pen", "qty": 2}, {"sku": "book", "qty": 1}],',
        '})',
        'orders.create_index("customer_id")',
      ].join('\n'),
      annotations: [
        { line: 7, text: 'Items are embedded in the order, so one read returns everything without a join.' },
        { line: 9, text: 'An index on customer_id supports the main access pattern: orders by customer.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What are the main types of NoSQL databases?', answer: 'Document stores (MongoDB), key-value stores (Redis, DynamoDB), wide-column stores (Cassandra) and graph databases (Neo4j). Each fits a different data shape and access pattern.', followUps: ['Which would you use for a social graph?'] },
    { level: 'beginner', q: 'Why would a company choose NoSQL over SQL?', answer: 'For flexible data shapes, very high write or read volume across many machines, or low-latency key lookups. It is a trade-off, not an upgrade.', followUps: ['What do you give up?'] },
    { level: 'intermediate', q: 'What makes a good partition key?', answer: 'High cardinality and even access so load spreads across partitions. Avoid monotonic keys like timestamps and low-cardinality keys like country that create hot partitions.', followUps: ['How do you fix a key that is already hot?'] },
    { level: 'intermediate', q: 'Explain eventual consistency.', answer: 'After a write, replicas may briefly return old values, but if no new writes arrive they converge to the same value. It improves availability and latency at the cost of possibly stale reads.', followUps: ['Give an example where that is acceptable and one where it is not.'] },
    { level: 'expert', q: 'How do quorum reads and writes work, and what do they not guarantee?', answer: 'With N replicas, writing to W and reading from R replicas where R + W > N makes read and write sets overlap, so a read sees the latest acknowledged write. It does not by itself give linearizability under concurrent writes, sloppy quorums or clock-based conflict resolution.', followUps: ['What does last-write-wins risk?'] },
    { level: 'expert', q: 'You migrate an orders system from PostgreSQL to a NoSQL store. What can go wrong?', answer: 'Loss of joins and multi-row transactions forces denormalization and application-level consistency, ad hoc reporting becomes hard, a bad partition key creates hot spots, and dual-write migration phases can diverge. Validate access patterns first, migrate incrementally and keep a reconciliation job.', followUps: ['When would you argue not to migrate?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Which NoSQL type looks up a value by a unique key?', options: ['Key-value', 'Graph', 'Relational', 'Spreadsheet'], answerIndex: 0, why: 'Key-value stores map a key directly to its value.' },
    { level: 'beginner', q: 'What is replication for?', options: ['Making queries slower', 'Keeping copies so one failure does not lose data', 'Encrypting keys', 'Deleting old data'], answerIndex: 1, why: 'Replicas provide durability and availability when a node fails.' },
    { level: 'intermediate', q: 'Which partition key is most likely to cause a hot partition?', options: ['A random user id', 'An always-increasing timestamp', 'A UUID', 'A hashed id'], answerIndex: 1, why: 'A monotonic key sends all new writes to the same partition.' },
    { level: 'expert', q: 'With N=3, which setting guarantees overlapping read and write quorums?', options: ['R=1, W=1', 'R=2, W=2', 'R=1, W=2 only if no failures', 'R=0, W=3'], answerIndex: 1, why: 'R + W = 4 > N = 3, so every read set overlaps every write set.' },
  ],
});
