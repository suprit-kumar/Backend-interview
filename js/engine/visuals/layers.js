/* layers: stacked layers (TCP/IP, OSI...) with a data unit that gains one header per layer as it goes down (encapsulation) and loses them going up.
   config: { payload, layers: [{id, label, unit, header, detail}] } top to bottom. state: { active: [ref], wrapped: [ref] } (layers whose header is on the packet) */
(function (A, $) {
  const V = A.visuals;
  const W = 640;
  const LH = 52;
  const HDR = 62;

  V.register('layers', (topic, $body) => {
    const cfg = topic.visual.config;
    const layers = cfg.layers;
    const H = 40 + layers.length * LH + 16;
    const $svg = V.root($body, W, H, 'Layered model with ' + layers.length + ' layers');
    const $rows = layers.map((l, i) => {
      const y = 30 + i * LH;
      const $g = V.svg('g', { class: 'sv-node' }, $svg);
      V.svg('rect', { x: 10, y, width: 230, height: LH - 8, rx: 10 }, $g);
      V.text($g, 125, y + 20, l.label, 'sv-label');
      V.text($g, 125, y + 36, l.unit || '', 'sv-sub min-int');
      return $g;
    });
    V.text($svg, 125, 18, 'Layers', 'sv-sub');
    V.text($svg, 440, 18, 'The data unit on the wire', 'sv-sub');
    const $pack = V.svg('g', null, $svg);
    const anim = V.anim();
    let grown = 0;

    function packet(prog, active, wrapped) {
      $pack.empty();
      const order = wrapped.slice().sort((a, b) => b - a);
      const total = HDR * order.length + 100;
      let x = 440 - total / 2 + 60;
      order.forEach((k, j) => {
        const w = j === order.length - 1 && active >= 0 ? HDR * prog : HDR;
        const $g = V.svg('g', { class: 'ly-hdr' + (k === active ? ' is-active' : '') }, $pack);
        V.svg('rect', { x, y: 70, width: Math.max(0, w), height: 46, rx: 6 }, $g);
        if (w > 30) V.text($g, x + w / 2, 97, layers[k].header || layers[k].label, 'sv-sub-strong');
        x += w;
      });
      const $p = V.svg('g', { class: 'ly-payload' }, $pack);
      V.svg('rect', { x, y: 70, width: 100, height: 46, rx: 6 }, $p);
      V.text($p, x + 50, 97, cfg.payload || 'Data', 'sv-sub-strong');
      if (order.length) {
        const left = x - HDR * order.length;
        V.svg('path', { d: 'M' + left + ' 126 H' + (x + 100), class: 'ly-brace' }, $pack);
        V.text($pack, (left + x + 100) / 2, 146, order.length + ' header' + (order.length > 1 ? 's' : '') + ' + data', 'sv-sub min-int');
      }
    }

    function update(i) {
      const st = topic.steps[i].state || {};
      const act = V.ref(layers, (st.active || [])[0] === undefined ? -1 : st.active[0]);
      const wrapped = (st.wrapped || []).map(r => V.ref(layers, r)).filter(k => k >= 0);
      $rows.forEach(($g, k) => $g.toggleClass('is-active', k === act));
      $svg.find('.ly-detail').remove();
      if (act >= 0 && layers[act].detail) {
        const $d = V.svg('g', { class: 'ly-detail min-exp' }, $svg);
        V.lines($d, 440, 190, layers[act].detail, 52, 'sv-sub', 15);
      }
      const grow = wrapped.length > grown;
      grown = wrapped.length;
      anim.run(grow ? 600 : 0, p => packet(p, grow ? act : -1, wrapped));
    }
    return { update, names: layers.reduce((m, l, k) => { m[l.id] = l.label; m[k] = l.label; return m; }, {}), legend: [{ tone: 'active', label: 'Layer working now' }, { tone: 'header', label: 'Header added by a layer' }] };
  });
})(window.Atlas, jQuery);
