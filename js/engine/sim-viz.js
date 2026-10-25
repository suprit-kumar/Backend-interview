/* Small SVG helpers for simulation visuals, built on Atlas.visuals so sims look like the main renderers. */
(function (A, $) {
  const V = A.visuals;

  A.simviz = {
    // Replaces the contents of $viz with an SVG stage and returns the <svg> element.
    stage($viz, w, h, label) {
      const $body = $('<div class="viz-body"></div>');
      $viz.empty().append($body);
      return V.root($body, w, h, label);
    },
    // Node box centred at (x, y). Reuses the .sv-node styling (is-active, tone-ok|bad|warn, is-dim).
    box($svg, x, y, w, h, label, sub, cls) {
      const $g = V.svg('g', { class: 'sv-node ' + (cls || '') }, $svg);
      V.svg('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 12 }, $g);
      V.text($g, x, y + (sub ? -3 : 5), label, 'sv-label');
      if (sub) V.text($g, x, y + 14, sub, 'sv-sub');
      return $g;
    },
    setBox($g, label, sub) {
      $g.find('.sv-label').text(label);
      if (sub !== undefined) $g.find('.sv-sub').text(sub);
    },
    tone($g, tone, active) {
      $g.removeClass('tone-ok tone-bad tone-warn is-active is-dim');
      if (tone) $g.addClass('tone-' + tone);
      if (active) $g.addClass('is-active');
    },
    link($svg, a, b, cls) {
      return V.svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'sx-link ' + (cls || '') }, $svg);
    },
    // Moves a dot from a to b using the given V.anim() runner (one runner per concurrent packet).
    fly(runner, $svg, a, b, tone, ms, done) {
      const $p = V.svg('g', { class: 'sv-packet tone-' + (tone || 'ok') }, $svg);
      const $c = V.svg('circle', { r: 7, cx: a.x, cy: a.y }, $p);
      runner.run(ms, t => $c.attr({ cx: V.lerp(a.x, b.x, t), cy: V.lerp(a.y, b.y, t) }), () => { $p.remove(); if (done) done(); });
      return $p;
    },
  };
})(window.Atlas, jQuery);
