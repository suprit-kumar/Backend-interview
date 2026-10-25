/* Visual engine core: renderer registry, SVG helpers, rAF tween runner, shared chrome (note, expert meters, legend).
   A renderer is register(type, fn, legend). fn(topic, $body, V) returns { update(stepIndex, level), names?, legend? } and reads
   topic.visual.config and step.state. Level layers: elements with class min-int appear from Intermediate up, min-exp only at Expert
   (CSS keyed on .viz[data-level]). */
(function (A, $) {
  const NS = 'http://www.w3.org/2000/svg';
  const renderers = {};
  const runners = new Set();
  let uid = 0;

  const V = {
    speed: 1,
    ds: {},
    register(type, fn, legend) { renderers[type] = { fn, legend }; },
    hasRenderer(type) { return !!renderers[type]; },
    types() { return Object.keys(renderers); },
    uid(prefix) { uid += 1; return (prefix || 'v') + uid; },

    svg(tag, attrs, $parent) {
      const $el = $(document.createElementNS(NS, tag));
      if (attrs) $el.attr(attrs);
      if ($parent) $parent.append($el);
      return $el;
    },
    root($body, w, h, label) {
      return V.svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'viz-svg', role: 'img', 'aria-label': label || 'Diagram', preserveAspectRatio: 'xMidYMid meet' }, $body);
    },
    // Adds a reusable arrowhead marker and returns its id.
    arrow($svg, cls) {
      const id = V.uid('arw');
      const $m = V.svg('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, V.svg('defs', null, $svg));
      V.svg('path', { d: 'M0 0L10 5L0 10z', class: 'viz-arrowhead ' + (cls || '') }, $m);
      return id;
    },
    text($parent, x, y, str, cls, anchor) {
      return V.svg('text', { x, y, class: cls || '', 'text-anchor': anchor || 'middle' }, $parent).text(str);
    },
    // Multi-line text, breaking on words at max characters per line. Returns the line count.
    lines($parent, x, y, str, max, cls, gap) {
      const rows = [];
      let cur = '';
      String(str).split(' ').forEach(w => {
        if ((cur + ' ' + w).trim().length > max && cur) { rows.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
      });
      if (cur) rows.push(cur);
      rows.forEach((r, i) => V.text($parent, x, y + i * (gap || 15), r, cls));
      return rows.length;
    },
    // Resolves a node reference (id string or numeric index) to an index.
    ref(nodes, r) { return typeof r === 'number' ? r : nodes.findIndex(n => n.id === r); },
    // Point on a rectangle's edge, heading from its centre toward (tx, ty).
    edgePoint(cx, cy, hw, hh, tx, ty, pad) {
      const dx = tx - cx;
      const dy = ty - cy;
      const t = Math.min(hw / (Math.abs(dx) || 1e-6), hh / (Math.abs(dy) || 1e-6)) + (pad || 0) / (Math.hypot(dx, dy) || 1);
      return { x: cx + dx * t, y: cy + dy * t };
    },
    lerp(a, b, t) { return a + (b - a) * t; },
    ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },

    // One runner per animated element group: starting a run cancels the previous one. Reduced motion jumps straight to the end state.
    anim() {
      let id = null;
      const r = {
        stop() { if (id) cancelAnimationFrame(id); id = null; },
        run(ms, fn, done) {
          r.stop();
          if (A.util.reduced() || ms <= 0) { fn(1); if (done) done(); return; }
          const dur = ms / V.speed;
          let t0 = null;
          const frame = now => {
            if (t0 === null) t0 = now;
            const p = Math.min(1, (now - t0) / dur);
            fn(V.ease(p));
            if (p < 1) id = requestAnimationFrame(frame); else { id = null; if (done) done(); }
          };
          id = requestAnimationFrame(frame);
        },
      };
      runners.add(r);
      return r;
    },

    mount(topic, $stage) {
      const cfg = topic.visual.config || {};
      const type = topic.stub || !Object.keys(cfg).length || !renderers[topic.visual.type] ? 'pipeline' : topic.visual.type;
      const def = renderers[type];
      A.lifecycle.add(() => { runners.forEach(r => r.stop()); runners.clear(); });
      $stage.html('<div class="viz" data-level="beginner"><div class="viz-body"></div><p class="viz-note" aria-hidden="true"></p>' +
        '<div class="viz-meters min-exp" aria-hidden="true"></div><ul class="viz-legend" aria-label="Legend"></ul></div>');
      const $viz = $stage.find('.viz');
      const r = def.fn(topic, $viz.find('.viz-body'), V);
      const legend = cfg.legend || r.legend || def.legend || [];
      $viz.find('.viz-legend').html(legend.map(l => '<li><span class="sw sw-' + A.util.esc(l.tone) + '"></span>' + A.util.esc(l.label) + '</li>').join(''))
        .prop('hidden', !legend.length);
      const names = r.names || {};

      function changed(i) {
        const s = topic.steps[i].state || {};
        if (s.changed) return s.changed;
        const p = i > 0 ? topic.steps[i - 1].state || {} : {};
        const nm = a => (a || []).map(x => names[x] || x).join(', ');
        const out = [];
        if (JSON.stringify(s.active) !== JSON.stringify(p.active) && (s.active || []).length) out.push('Now active: ' + nm(s.active));
        if (JSON.stringify(s.failed) !== JSON.stringify(p.failed) && (s.failed || []).length) out.push('Failed: ' + nm(s.failed));
        if (s.messages && s.messages.length) out.push(s.messages.length + ' new message' + (s.messages.length > 1 ? 's' : ''));
        if (s.now !== undefined && s.now !== p.now) out.push('Time moves to ' + s.now);
        return out.join('. ') || 'Detail updated';
      }

      return {
        changed,
        update(i, level) {
          const s = topic.steps[i].state || {};
          $viz.attr('data-level', level || 'beginner');
          $viz.find('.viz-note').text(s.note || '');
          $viz.find('.viz-meters').html((s.meters || []).map(m =>
            '<span class="meter tone-' + A.util.esc(m.tone || 'none') + '"><b>' + A.util.esc(m.value) + '</b> ' + A.util.esc(m.label) + '</span>').join(''));
          r.update(i, level || 'beginner');
        },
      };
    },
  };

  A.visuals = V;
})(window.Atlas, jQuery);
