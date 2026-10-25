/* data-structure: dispatcher. config.kind picks a drawing from V.ds: table | tree | stack-heap | log | ring.
   Each kind is fn(topic, $body, V) returning { update(i), names, legend }. Kinds live in ds-table-tree.js and ds-memory.js. */
(function (A) {
  const V = A.visuals;
  V.register('data-structure', (topic, $body) => {
    const kind = topic.visual.config.kind || 'table';
    return (V.ds[kind] || V.ds.table)(topic, $body, V);
  });
})(window.Atlas);
