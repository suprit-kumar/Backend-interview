/* Simulation registry with shared chrome.
   Atlas.sims.register(id, { title, note, controls, actions, autoMs, metrics, view, random, intro, init, step, reset, onParam }).
   controls: [{ id, label, type: range|select|toggle, min, max, step, value, unit, options: [value | {value, label}] }]
   actions:  [{ id, label, icon, primary }]  buttons that call step(ctx, actionId); autoMs adds an Auto-run toggle for the first action.
   random:   true adds a "Seed" toggle (on by default): ctx.rand() then returns the same sequence after every Reset. Sims with no randomness need no seed.
   intro:    { beginner, intermediate, expert } text shown in the "Explain what you just saw" panel before anything has happened.
   ctx: { s, $el, $viz, reduced, level(), param(id), params(), rand(), say({beginner, intermediate, expert}), log(msg, tone, append), clearLog(),
          metric(id, value, tone), badge(text, tone), after(ms, fn), every(ms, fn), stagger(items, ms, fn), anim(), clear() }.
   after/every use real time (a hold of 4 s stays 4 s). stagger and anim only decorate: under reduced motion they finish at once. */
(function (A, $) {
  const sims = {};
  const esc = A.util.esc;
  const SEED = 20240607;
  let uid = 0;

  // mulberry32: tiny seeded generator so learners see the same run every time.
  function prng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function controlHtml(c) {
    uid += 1;
    const id = 'sim-' + c.id + '-' + uid;
    if (c.type === 'select') {
      return '<label class="ctl" for="' + id + '"><span>' + esc(c.label) + '</span><select id="' + id + '" class="js-ctl" data-id="' + esc(c.id) + '">' +
        c.options.map(o => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return '<option value="' + esc(v) + '"' + (String(v) === String(c.value) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></label>';
    }
    if (c.type === 'toggle') {
      return '<label class="ctl ctl-toggle" for="' + id + '"><input type="checkbox" id="' + id + '" class="js-ctl" data-id="' + esc(c.id) + '"' + (c.value ? ' checked' : '') + '><span>' + esc(c.label) + '</span></label>';
    }
    return '<label class="ctl" for="' + id + '"><span>' + esc(c.label) + ' <output class="js-out" data-for="' + esc(c.id) + '">' + c.value + '</output>' + esc(c.unit || '') + '</span>' +
      '<input type="range" id="' + id + '" class="form-range js-ctl" data-id="' + esc(c.id) + '" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '" value="' + c.value + '"></label>';
  }

  A.sims = {
    register(id, def) { sims[id] = def; },
    has(id) { return !!sims[id]; },
    ids() { return Object.keys(sims); },
    get(id) { return sims[id]; },

    mount(id, $el, level) {
      const def = sims[id];
      if (!def) { $el.html('<p class="sim-note">This simulation is coming in a later phase.</p>'); return { setLevel() {}, destroy() {}, ctx: null }; }
      const reduced = A.util.reduced();
      let lvl = level || 'beginner';
      let said = def.intro || null;
      const controls = (def.controls || []).concat(def.random ? [{ id: 'seed', label: 'Seed (same result every run)', type: 'toggle', value: true }] : []);
      const acts = def.actions && def.actions.length ? def.actions : [{ id: 'step', label: 'Step', primary: true }];
      $el.html(
        '<div class="sim-panel" role="group" aria-label="' + esc(def.title) + '">' +
          '<div class="sim-head"><h3>' + esc(def.title) + '</h3><span class="sim-badge js-badge" role="status" hidden></span></div>' +
          (def.note ? '<p class="sim-note">' + esc(def.note) + '</p>' : '') +
          '<div class="sim-controls">' + controls.map(controlHtml).join('') + '</div>' +
          '<div class="sim-actions">' + acts.map((a, i) => '<button type="button" class="' + ((a.primary === undefined ? i === 0 : a.primary) ? 'btn-atlas' : 'btn-ghost') + ' js-act" data-act="' + esc(a.id) + '">' +
            (a.icon ? A.util.icon(a.icon) : '') + esc(a.label) + '</button>').join('') +
            (def.autoMs && !reduced ? '<button type="button" class="btn-ghost js-auto" aria-pressed="false">' + A.util.icon('play-circle') + '<span>Auto-run</span></button>' : '') +
            '<button type="button" class="btn-ghost js-reset">' + A.util.icon('arrow-counterclockwise') + 'Reset</button></div>' +
          '<div class="sim-metrics">' + (def.metrics || []).map(m => '<div class="metric"><span class="m-label">' + esc(m.label) + '</span><b class="m-val js-m-' + esc(m.id) + '">-</b></div>').join('') + '</div>' +
          '<div class="sim-viz js-viz">' + (def.view || '') + '</div>' +
          '<section class="sim-explain" aria-label="Explain what you just saw"><h4>' + A.util.icon('mortarboard') + 'Explain what you just saw <span class="lvl-badge js-lvl"></span></h4>' +
            '<p class="js-say" role="status" aria-live="polite"></p></section>' +
          '<div class="sim-log js-log" role="log" aria-live="off" aria-label="Event log"></div>' +
        '</div>');

      const timers = [];
      const anims = [];
      let rnd = Math.random;
      const reseed = () => { rnd = !def.random || ctx.param('seed') ? prng(SEED) : Math.random; };
      const paintSay = () => {
        $el.find('.js-lvl').text(lvl).attr('class', 'lvl-badge js-lvl lvl-' + lvl);
        $el.find('.js-say').html(said ? A.util.md(said[lvl] || said.beginner || '') : A.util.md('Press a button above and this panel explains what happened, at your level.'));
      };
      const ctx = {
        s: {}, $el, $viz: $el.find('.js-viz'), reduced,
        level: () => lvl,
        param(k) { const $c = $el.find('.js-ctl[data-id="' + k + '"]'); return $c.is(':checkbox') ? $c.prop('checked') : ($c.is('select') ? $c.val() : +$c.val()); },
        params() { const o = {}; controls.forEach(c => { o[c.id] = ctx.param(c.id); }); return o; },
        rand: () => rnd(),
        say(obj) { said = obj; paintSay(); },
        log(msg, tone, append) {
          const $l = $('<div></div>').addClass(tone ? 't-' + tone : '').text(msg);
          if (append) $l.appendTo($el.find('.js-log')); else $l.prependTo($el.find('.js-log'));
        },
        clearLog() { $el.find('.js-log').empty(); },
        metric(k, v, tone) { $el.find('.js-m-' + k).text(v).closest('.metric').removeClass('tone-ok tone-bad tone-warn').addClass(tone ? 'tone-' + tone : ''); },
        badge(text, tone) { $el.find('.js-badge').text(text).prop('hidden', !text).removeClass('is-ok is-bad is-warn').addClass(tone ? 'is-' + tone : ''); },
        after(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; },
        every(ms, fn) { const t = setInterval(fn, ms); timers.push(t); return t; },
        stagger(items, ms, fn) {
          if (reduced) { items.forEach(fn); return; }
          items.forEach((it, i) => ctx.after(i * ms, () => fn(it, i)));
        },
        anim() { const r = A.visuals.anim(); anims.push(r); return r; },
        clear() { while (timers.length) { const t = timers.pop(); clearTimeout(t); clearInterval(t); } anims.forEach(r => r.stop()); },
      };
      let auto = null;
      const stopAuto = () => { clearInterval(auto); auto = null; $el.find('.js-auto').attr('aria-pressed', 'false').find('span').text('Auto-run'); };

      $el.on('input change', '.js-ctl', function () {
        const k = $(this).data('id');
        $el.find('.js-out[data-for="' + k + '"]').text(this.value);
        if (k === 'seed') { reseed(); return; }
        if (def.onParam) def.onParam(ctx, k, ctx.param(k));
      });
      $el.on('click', '.js-act', function () { def.step(ctx, $(this).data('act')); });
      $el.on('click', '.js-auto', function () {
        if (auto) { stopAuto(); return; }
        $(this).attr('aria-pressed', 'true').find('span').text('Stop auto-run');
        auto = setInterval(() => def.step(ctx, acts[0].id), def.autoMs);
      });
      $el.on('click', '.js-reset', () => {
        stopAuto();
        ctx.clear();
        ctx.s = {};
        ctx.clearLog();
        $el.find('.m-val').text('-').closest('.metric').removeClass('tone-ok tone-bad tone-warn');
        ctx.badge('');
        said = def.intro || null;
        reseed();
        paintSay();
        if (def.reset) def.reset(ctx); else if (def.init) def.init(ctx);
      });

      reseed();
      paintSay();
      if (def.init) def.init(ctx);
      const destroy = () => { stopAuto(); ctx.clear(); };
      A.lifecycle.add(destroy);
      return { setLevel(l) { lvl = l; paintSay(); }, destroy, ctx };
    },
  };
})(window.Atlas, jQuery);
