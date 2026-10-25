/* Data: Database Design & Normalization. */
Atlas.topics.push({
  id: 'database-design-normalization',
  category: 'data',
  title: 'Database Design & Normalization',
  source: {
    description: 'Store each fact once to avoid update anomalies.',
    steps: ['Find entities', 'Make tables', 'Normalize (1NF to 3NF)', 'Add foreign keys'],
  },
  estMinutes: 15,
  prereqs: ['sql'],
  related: ['indexing', 'nosql-databases', 'transactions-acid', 'database-query-optimization'],
  tags: ['normalization', '1nf', '2nf', '3nf', 'foreign key', 'schema', 'denormalization', 'anomaly'],
  visual: {
    type: 'data-structure',
    config: {
      kind: 'table',
      columns: ['order_id', 'customer', 'customer_email', 'item', 'price'],
      rows: [
        ['1', 'Ana', 'ana@x.com', 'Pen', '2'],
        ['2', 'Ana', 'ana@x.com', 'Book', '9'],
        ['3', 'Raj', 'raj@x.com', 'Pen', '2'],
        ['4', 'Ana', 'ana@old.com', 'Lamp', '20'],
      ],
    },
  },
  steps: [
    {
      label: 'Find entities',
      caption: {
        beginner: 'List the real things your app cares about: customers, orders and items. This one table mixes them all together.',
        intermediate: 'Entities are the nouns with their own identity and attributes. Spotting them tells you which tables you need and which columns belong where.',
        expert: 'Start from the domain and the functional dependencies: which attribute determines which. Customer email depends on the customer, not on the order, and that dependency is what normalization acts on.',
      },
      state: { rows: [0, 1, 2, 3], note: 'One wide table holds customers, orders and items.', changed: 'We see three entities tangled in one table.' },
      hood: 'Functional dependency: customer determines email, item determines price.',
    },
    {
      label: 'Make tables',
      caption: {
        beginner: 'Look at Ana: her name and email repeat on every order. That repetition is the problem.',
        intermediate: 'Repeated customer data across rows shows the table mixes entities. Split customers, orders and items into their own tables.',
        expert: 'Repetition is the symptom of a partial or transitive dependency. Each repeated copy is another place that can drift out of sync under concurrent updates.',
      },
      state: { rows: [0, 1, 3], cells: [[0, 1], [1, 1], [3, 1], [0, 2], [1, 2], [3, 2]], note: 'Ana and her email repeat.', changed: 'Customer data is duplicated across Ana\'s orders.' },
      hood: 'Duplicated facts can disagree: order 4 has a different email for the same customer.',
    },
    {
      label: 'Normalize (1NF to 3NF)',
      caption: {
        beginner: 'Row 4 shows a different email for Ana. Which one is right? Storing each fact once removes the question.',
        intermediate: '1NF: atomic values, no repeating groups. 2NF: no partial dependency on part of a composite key. 3NF: non-key columns depend only on the key, not on each other.',
        expert: 'Normal forms remove update, insert and delete anomalies. 3NF and BCNF are the practical targets; higher forms rarely matter in application schemas. The rule of thumb: every non-key attribute depends on the key, the whole key and nothing but the key.',
      },
      state: { rows: [3], dim: [0, 1, 2], cells: [[3, 2]], note: 'Conflicting email for Ana.', changed: 'The update anomaly is exposed in row 4.' },
      hood: 'Update anomaly: change one copy and the others become stale.',
    },
    {
      label: 'Add foreign keys',
      caption: {
        beginner: 'Orders now point to a customer by id instead of copying their details. The database refuses a link to a customer that does not exist.',
        intermediate: 'A foreign key from orders.customer_id to customers.id enforces referential integrity. Choose ON DELETE behaviour deliberately and index the foreign key column.',
        expert: 'Foreign keys cost a check per write and need an index on the referencing column to avoid scans on parent deletes. Some very large systems drop them for write throughput and enforce integrity in the application, accepting the risk of orphans.',
      },
      state: { rows: [0, 1, 2, 3], dim: [], note: 'orders(customer_id) references customers(id)', changed: 'Each fact now lives in one place, linked by key.' },
      hood: 'Index the FK column. Deleting a parent must check children, which scans without an index.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A school keeps one address book. Each student\'s home address is written once, and class lists just refer to the student by name. If addresses were copied onto every class list, one move would mean fixing many papers and missing some.',
      explanation: 'Normalization means designing tables so every fact is stored in exactly one place. Instead of copying a customer\'s email onto every order, you keep the customer once and let orders point to it. This prevents contradictions and makes changes simple.',
      keyTerms: [
        { term: 'Primary key', meaning: 'A column that uniquely identifies each row.' },
        { term: 'Foreign key', meaning: 'A column that points to a row in another table.' },
        { term: 'Normalization', meaning: 'Splitting tables so each fact is stored once.' },
        { term: 'Anomaly', meaning: 'A bug caused by duplicated data, such as two different emails for one person.' },
        { term: 'Denormalization', meaning: 'Deliberately copying data to make reads faster.' },
      ],
    },
    intermediate: {
      explanation: 'Model entities and relationships, then normalize to 3NF to remove update, insert and delete anomalies. Add keys and constraints (NOT NULL, UNIQUE, CHECK, FOREIGN KEY) so the database enforces correctness. Denormalize later only where measured read performance requires it.',
      howItWorks: [
        'Identify entities, their attributes and the relationships (one-to-many, many-to-many).',
        '1NF: each column holds one atomic value and there are no repeating groups.',
        '2NF: every non-key column depends on the whole composite key.',
        '3NF: non-key columns depend only on the key, not on other non-key columns.',
        'Use junction tables for many-to-many relationships.',
        'Add foreign keys, unique constraints and indexes on join columns.',
      ],
      tradeoffs: {
        use: [
          'Use a normalized schema for transactional systems where correctness and update simplicity matter.',
          'Use constraints so invalid data is rejected at the source instead of being cleaned later.',
          'Use normalization when the same fact would otherwise be edited in several places.',
        ],
        avoid: [
          'Avoid over-normalizing read-heavy reporting tables where joins dominate query time.',
          'Avoid denormalizing without a measured problem; copies need a plan to stay in sync.',
          'Avoid splitting into so many tiny tables that every query needs many joins.',
        ],
      },
      pitfalls: [
        'Storing comma-separated lists in one column, which breaks 1NF and prevents indexing.',
        'Skipping foreign keys and ending up with orphaned rows.',
        'Using natural keys that change (email) as primary keys.',
        'Forgetting an index on foreign key columns.',
        'Copying data for speed with no process to keep copies consistent.',
      ],
    },
    expert: {
      internals: [
        'Normal forms are defined over functional dependencies; BCNF requires every determinant to be a candidate key and is stricter than 3NF.',
        'Surrogate keys (identity columns, UUIDs) keep foreign keys stable; random UUIDv4 primary keys fragment B-tree indexes, while time-ordered ids (UUIDv7, ULID) keep inserts append-friendly.',
        'Constraints are enforced by the engine with index lookups; a foreign key check is a lookup in the parent table\'s key index.',
        'Denormalization options include redundant columns, summary tables and materialized views, each needing a refresh strategy.',
        'Schema migrations on large tables need online techniques (add nullable column, backfill, then constrain) to avoid long locks.',
      ],
      failureModes: [
        'Orphaned or inconsistent rows when constraints are missing or deferred and the application has a bug.',
        'Lock contention from a foreign key check on a hot parent row.',
        'Denormalized copies drifting out of sync after a failed partial update.',
        'A long-running ALTER TABLE blocking writes in production.',
      ],
      scalingNotes: [
        'Normalized OLTP schemas scale reads with replicas and caching; shard by a tenant or entity key when a single node is not enough.',
        'Joins across shards are expensive, so sharded systems often denormalize or colocate related rows by shard key.',
        'Analytics usually move to star schemas in a warehouse, which are deliberately denormalized.',
      ],
      realSystems: [
        'PostgreSQL and MySQL enforce foreign keys; Vitess and Citus shard while colocating related tables.',
        'Online schema change tools such as gh-ost, pt-online-schema-change and pg_repack style approaches.',
        'Warehouses like BigQuery and Snowflake favour wide denormalized tables.',
      ],
      numbersToKnow: [
        'A foreign key check is one index lookup, usually microseconds when cached.',
        'A 4 byte integer key versus a 16 byte UUID changes index size roughly four-fold for the key itself.',
        'Most application schemas stop at 3NF or BCNF.',
      ],
    },
  },
  sim: null,
  worked: {
    problem: 'An email change must reach every order row that copied it.',
    without: [
      { text: 'orders table stores customer_email on every row', tone: 'plain' },
      { text: 'UPDATE orders SET customer_email = "ana@new.com" WHERE order_id = 4', tone: 'plain' },
      { text: 'Rows 1 and 2 still say ana@x.com', tone: 'bad' },
      { text: 'Two emails for one customer: which is right?', tone: 'bad' },
    ],
    with: [
      { text: 'customers(id, name, email) stores the email once', tone: 'plain' },
      { text: 'UPDATE customers SET email = "ana@new.com" WHERE id = 7', tone: 'plain' },
      { text: 'Every order joins to the same customer row', tone: 'good' },
      { text: 'One fact, one place, no contradiction', tone: 'good' },
    ],
    takeaway: 'Store each fact once and link by key; the database then cannot disagree with itself.',
  },
  code: [
    {
      lang: 'python',
      title: 'Normalized models (SQLAlchemy)',
      code: [
        'class Customer(Base):',
        '    __tablename__ = "customers"',
        '    id = mapped_column(primary_key=True)',
        '    email = mapped_column(String, unique=True, nullable=False)',
        '',
        'class Order(Base):',
        '    __tablename__ = "orders"',
        '    id = mapped_column(primary_key=True)',
        '    customer_id = mapped_column(ForeignKey("customers.id"), index=True)',
        '    created_at = mapped_column(DateTime, nullable=False)',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'UNIQUE and NOT NULL make the database reject duplicate or missing emails.' },
        { line: 9, text: 'The foreign key links orders to customers; index=True speeds joins and parent deletes.' },
      ],
    },
    {
      lang: 'sql',
      title: 'Many-to-many with a junction table',
      code: [
        'CREATE TABLE order_items (',
        '  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,',
        '  product_id BIGINT REFERENCES products(id),',
        '  quantity INT NOT NULL CHECK (quantity > 0),',
        '  PRIMARY KEY (order_id, product_id)',
        ');',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'ON DELETE CASCADE removes items when their order is deleted.' },
        { line: 4, text: 'CHECK enforces a rule in the database instead of only in application code.' },
        { line: 5, text: 'The composite primary key stops the same product appearing twice on an order.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is normalization and why do it?', answer: 'Organizing tables so each fact is stored once. It prevents update, insert and delete anomalies and keeps data consistent.', followUps: ['Give an example of an update anomaly.'] },
    { level: 'beginner', q: 'What is the difference between a primary key and a foreign key?', answer: 'A primary key uniquely identifies a row in its own table. A foreign key is a column that references a primary key in another table to link rows.', followUps: ['Can a primary key be null?'] },
    { level: 'intermediate', q: 'Explain 1NF, 2NF and 3NF briefly.', answer: '1NF: atomic values and no repeating groups. 2NF: no non-key column depends on only part of a composite key. 3NF: non-key columns depend only on the key and not on each other.', followUps: ['What does BCNF add?'] },
    { level: 'intermediate', q: 'When is denormalization justified?', answer: 'When a measured read bottleneck is dominated by joins and you can keep the copies consistent, for example with a summary column updated in the same transaction or a materialized view.', followUps: ['How do you keep the copy correct?'] },
    { level: 'expert', q: 'How would you add a NOT NULL column with a foreign key to a 500 million row table without downtime?', answer: 'Add the column as nullable without a default that rewrites the table, backfill in small batches, add the foreign key as NOT VALID then validate it separately (PostgreSQL), and only then set NOT NULL. Each step avoids a long exclusive lock. // VERIFY exact behaviour per engine version', followUps: ['What breaks if the backfill is too aggressive?'] },
    { level: 'expert', q: 'Why might a large system drop foreign keys, and what does it risk?', answer: 'Foreign key checks add write latency and lock interaction, and they complicate sharding because parent and child may be on different shards. Dropping them shifts integrity to the application, so orphans can appear and need periodic reconciliation jobs.', followUps: ['What would you monitor instead?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Why is copying a customer\'s email onto every order risky?', options: ['It uses a little more disk', 'Copies can become inconsistent', 'Emails cannot be stored twice', 'It makes inserts impossible'], answerIndex: 1, why: 'Duplicated facts can disagree after a partial update, which is an update anomaly.' },
    { level: 'beginner', q: 'What does a foreign key enforce?', options: ['Faster queries automatically', 'That a referenced row exists', 'Unique emails', 'Encryption'], answerIndex: 1, why: 'Referential integrity: the child row must point to an existing parent.' },
    { level: 'intermediate', q: 'Which design breaks first normal form?', options: ['A junction table', 'A column storing "a,b,c" as a list', 'A composite primary key', 'An index'], answerIndex: 1, why: '1NF requires atomic values; a comma-separated list packs several values into one column.' },
    { level: 'expert', q: 'What is a good reason to denormalize?', options: ['It is always faster', 'A measured read hotspot dominated by joins, with a plan to keep copies in sync', 'To avoid learning SQL', 'Because 3NF is invalid'], answerIndex: 1, why: 'Denormalize for measured read needs and only with a consistency strategy for the copies.' },
  ],
});
