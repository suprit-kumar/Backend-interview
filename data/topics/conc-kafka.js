/* Concurrency & Messaging: Kafka vs RabbitMQ. Playground: existing kafka-partitions sim. */
Atlas.topics.push({
  id: 'kafka-rabbitmq',
  category: 'concurrency-messaging',
  title: 'Kafka / RabbitMQ',
  source: {
    description: 'Kafka keeps a replayable log; RabbitMQ routes messages to queues.',
    steps: ['Producer', 'Topic partition or exchange', 'Consumer group or queue', 'Offset or ack'],
  },
  estMinutes: 16,
  prereqs: ['message-queues'],
  related: ['message-queues', 'event-driven-architecture', 'distributed-systems-fundamentals', 'database-sharding-partitioning'],
  tags: ['kafka', 'rabbitmq', 'partition', 'consumer group', 'offset', 'exchange', 'ISR'],
  visual: {
    type: 'data-structure',
    config: { kind: 'log' },
  },
  steps: [
    {
      label: 'Producer',
      caption: {
        beginner: 'A sender publishes a message to the messaging system.',
        intermediate: 'Kafka producers append to a topic and pick a partition by key; RabbitMQ producers publish to an exchange with a routing key.',
        expert: 'Kafka producers batch and compress and choose acks (0, 1, all) plus idempotence for safe retries. RabbitMQ uses publisher confirms. The same key always maps to one Kafka partition, which preserves per-key order.',
      },
      state: { kind: 'log', logs: [{ name: 'partition 0', records: ['order-1'], marks: {} }, { name: 'partition 1', records: [], marks: {} }], active: [[0, 0]], changed: 'A record is appended to a partition.' },
      hood: 'Kafka: acks=all + enable.idempotence for safe producing. Key hash picks the partition.',
    },
    {
      label: 'Topic partition or exchange',
      caption: {
        beginner: 'Kafka stores messages in an ordered log. RabbitMQ sorts messages into queues by rules.',
        intermediate: 'Kafka partitions are append-only logs retained for a time or size. RabbitMQ exchanges (direct, topic, fanout, headers) route to bound queues, and messages leave the queue when acked.',
        expert: 'Kafka partitions are replicated; the leader serves reads and writes and followers in the in-sync replica set (ISR) copy it. RabbitMQ quorum queues use Raft for replication; classic mirrored queues are deprecated. // VERIFY version',
      },
      state: { kind: 'log', logs: [{ name: 'partition 0', records: ['order-1', 'order-3', 'order-5'], marks: {} }, { name: 'partition 1', records: ['order-2', 'order-4'], marks: {} }], active: [[0, 2], [1, 1]], changed: 'Records spread across partitions by key.' },
      hood: 'Kafka ISR: a write with acks=all is committed once all in-sync replicas have it.',
    },
    {
      label: 'Consumer group or queue',
      caption: {
        beginner: 'Workers share the job: each partition or queue goes to one worker in the team.',
        intermediate: 'In a Kafka consumer group each partition is read by exactly one consumer in the group, so parallelism is capped by partition count. In RabbitMQ competing consumers share one queue.',
        expert: 'Adding or removing consumers triggers a rebalance that pauses consumption; cooperative rebalancing and static membership reduce the pause. A second consumer group reads the same log independently.',
      },
      state: { kind: 'log', logs: [{ name: 'partition 0', records: ['order-1', 'order-3', 'order-5'], marks: { 'consumer A': 1 } }, { name: 'partition 1', records: ['order-2', 'order-4'], marks: { 'consumer B': 1 } }], active: [[0, 1], [1, 1]], changed: 'Each partition has one consumer.' },
      hood: 'Max useful consumers in a group = partitions. Rebalances pause consumption briefly.',
    },
    {
      label: 'Offset or ack',
      caption: {
        beginner: 'Kafka remembers how far each reader got and keeps the messages. RabbitMQ deletes a message once it is confirmed.',
        intermediate: 'Kafka consumers commit offsets, and can rewind to replay history. RabbitMQ acks remove the message, so replay needs a separate mechanism.',
        expert: 'Committing offsets after processing gives at-least-once; transactions plus idempotent producers enable exactly-once within Kafka. Retention and log compaction decide how long data is replayable.',
      },
      state: { kind: 'log', logs: [{ name: 'partition 0', records: ['order-1', 'order-3', 'order-5'], marks: { committed: 3 } }, { name: 'partition 1', records: ['order-2', 'order-4'], marks: { committed: 2 } }], active: [[0, 2], [1, 1]], changed: 'Offsets are committed; the log still holds the data.' },
      hood: 'Kafka keeps data until retention expires; consumers only move an offset pointer.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'Kafka is like a library of newspapers kept on shelves: anyone can read from any date, and each reader keeps a bookmark. RabbitMQ is like a post office sorting letters into pigeonholes: once a letter is collected, it is gone.',
      explanation: 'Both move messages between services. Kafka stores messages in a long ordered log that many readers can replay. RabbitMQ is a smart router that delivers messages to queues and removes them once handled.',
      keyTerms: [
        { term: 'Topic', meaning: 'A named stream of messages in Kafka.' },
        { term: 'Partition', meaning: 'One ordered slice of a topic that enables parallel reading.' },
        { term: 'Offset', meaning: 'A reader\'s position in a partition.' },
        { term: 'Exchange', meaning: 'RabbitMQ component that routes messages to queues.' },
        { term: 'Consumer group', meaning: 'A team of consumers that split a topic\'s partitions.' },
      ],
    },
    intermediate: {
      explanation: 'Kafka is a distributed commit log optimized for high throughput, retention and replay, with ordering per partition. RabbitMQ is a broker with flexible routing, per-message acks and low-latency delivery to queues. Choose by whether you need replayable event streams or task distribution with rich routing.',
      howItWorks: [
        'Kafka producers append records to a partition chosen by key.',
        'Brokers replicate each partition; consumers poll and commit offsets.',
        'A consumer group splits partitions among its members.',
        'RabbitMQ producers publish to an exchange; bindings route to queues.',
        'Consumers receive from a queue and ack each message.',
        'Unacked or rejected messages are requeued or dead-lettered.',
      ],
      tradeoffs: {
        use: [
          'Use Kafka for event streaming, analytics pipelines, audit logs and replay.',
          'Use RabbitMQ for task queues, request routing and per-message workflows.',
          'Use Kafka when many independent consumers need the same events.',
        ],
        avoid: [
          'Avoid Kafka for small simple job queues where operating it is heavier than the problem.',
          'Avoid RabbitMQ as a long-term event store or for massive replay.',
          'Avoid expecting global ordering; ordering is per partition or per queue.',
        ],
      },
      pitfalls: [
        'Too few partitions limiting consumer parallelism, and adding partitions later changes key-to-partition mapping.',
        'Hot keys overloading one partition.',
        'Committing offsets before processing, losing messages on a crash.',
        'Frequent rebalances from slow consumers exceeding poll timeouts.',
        'Unbounded RabbitMQ queues exhausting memory or disk.',
      ],
    },
    expert: {
      internals: [
        'Kafka writes to segment files sequentially and relies on the OS page cache and zero-copy sendfile for high throughput.',
        'The high watermark marks the last offset replicated to the full ISR; consumers only see data up to it. min.insync.replicas with acks=all controls durability versus availability.',
        'KRaft replaces ZooKeeper for Kafka metadata in current versions. // VERIFY version',
        'Consumer group coordination uses a group coordinator broker and the partition assignor; offsets are stored in an internal topic.',
        'RabbitMQ (Erlang/OTP) routes through exchanges to queues; quorum queues use Raft, streams provide a Kafka-like log, and prefetch controls in-flight messages per consumer.',
      ],
      failureModes: [
        'Unclean leader election trading durability for availability.',
        'Consumer lag growth when processing is slower than production.',
        'Rebalance storms during rolling deploys.',
        'RabbitMQ memory or disk alarms blocking publishers, and network partitions in clustered setups.',
      ],
      scalingNotes: [
        'Kafka scales by partitions and brokers; choose partition count for target throughput and consumer parallelism up front.',
        'Monitor consumer lag, under-replicated partitions and request latency.',
        'RabbitMQ scales by sharding queues and consumers; one queue has limited throughput.',
      ],
      realSystems: [
        'Apache Kafka with Confluent, MSK and Redpanda (Kafka-compatible); Kafka Streams and Flink for processing.',
        'RabbitMQ with quorum queues and streams; Amazon MQ.',
        'Python clients: confluent-kafka, aiokafka, pika, kombu/Celery.',
      ],
      numbersToKnow: [
        'A well-tuned Kafka cluster can reach hundreds of thousands to millions of messages per second. // VERIFY hardware and message size dependent',
        'Default Kafka retention is 7 days. // VERIFY',
        'Replication factor 3 with min.insync.replicas 2 is a common durable setup.',
      ],
    },
  },
  sim: 'kafka-partitions',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'Kafka producer and consumer group (confluent-kafka)',
      code: [
        'from confluent_kafka import Producer, Consumer',
        '',
        'p = Producer({"bootstrap.servers": "kafka:9092", "acks": "all", "enable.idempotence": True})',
        'p.produce("orders", key="customer-7", value=b\'{"id": 1}\')',
        'p.flush()',
        '',
        'c = Consumer({"bootstrap.servers": "kafka:9092", "group.id": "billing",',
        '              "enable.auto.commit": False, "auto.offset.reset": "earliest"})',
        'c.subscribe(["orders"])',
        'msg = c.poll(1.0)',
        'if msg and not msg.error():',
        '    handle(msg.value())',
        '    c.commit(msg)',
      ].join('\n'),
      annotations: [
        { line: 3, text: 'acks=all with idempotence gives durable, duplicate-safe producing.' },
        { line: 4, text: 'The key sends all of one customer\'s events to the same partition, preserving their order.' },
        { line: 8, text: 'Auto commit is off so offsets are committed only after successful handling.' },
        { line: 13, text: 'Commit after processing gives at-least-once delivery.' },
      ],
    },
  ],
  interview: [
    { level: 'beginner', q: 'What is the main difference between Kafka and RabbitMQ?', answer: 'Kafka is a replayable log where consumers track their position; RabbitMQ is a routing broker that deletes messages once they are acknowledged.', followUps: ['Which would you pick for background jobs?'] },
    { level: 'beginner', q: 'What is a partition?', answer: 'An ordered slice of a Kafka topic. Partitions let many consumers read in parallel while keeping order within each slice.', followUps: ['How is a partition chosen?'] },
    { level: 'intermediate', q: 'How does a consumer group work?', answer: 'Consumers sharing a group id divide a topic\'s partitions so each partition is read by one member. More consumers than partitions leaves some idle, and a different group gets its own full copy of the stream.', followUps: ['What triggers a rebalance?'] },
    { level: 'intermediate', q: 'How do you get per-user ordering in Kafka?', answer: 'Use the user id as the message key so all of that user\'s events go to the same partition, which is ordered. Ordering across partitions is not guaranteed.', followUps: ['What is the risk of hot keys?'] },
    { level: 'expert', q: 'Explain Kafka durability settings.', answer: 'With replication factor 3, acks=all and min.insync.replicas=2, a write succeeds only when at least two replicas have it, surviving a broker loss. Disabling unclean leader election avoids promoting a stale replica at the cost of availability.', followUps: ['What happens if ISR shrinks below the minimum?'] },
    { level: 'expert', q: 'Consumer lag keeps growing. What do you check?', answer: 'Per-partition lag to spot hot partitions, handler latency, rebalance frequency and poll timeouts, downstream bottlenecks, and whether partition count caps parallelism. Fix the slow handler first; add partitions or consumers only if they help.', followUps: ['How does adding partitions affect key ordering?'] },
  ],
  quiz: [
    { level: 'beginner', q: 'Which system keeps messages for replay by default?', options: ['Kafka', 'A plain RabbitMQ queue', 'DNS', 'A CDN'], answerIndex: 0, why: 'Kafka retains records for a configured time regardless of consumption.' },
    { level: 'beginner', q: 'What does a Kafka offset represent?', options: ['A reader\'s position in a partition', 'A password', 'A server IP', 'A message price'], answerIndex: 0, why: 'Consumers commit offsets to remember where they stopped.' },
    { level: 'intermediate', q: 'Why can extra consumers sit idle in a Kafka group?', options: ['Each partition goes to only one consumer in the group', 'Kafka forbids more than 2 consumers', 'Offsets expire', 'Brokers throttle them'], answerIndex: 0, why: 'Parallelism is capped by the number of partitions.' },
    { level: 'expert', q: 'Which setting set helps prevent data loss on broker failure?', options: ['acks=all with min.insync.replicas=2 and RF 3', 'acks=0', 'RF 1', 'Disable replication'], answerIndex: 0, why: 'Writes are confirmed by multiple replicas before being acknowledged.' },
  ],
});
