/* Worked example runner. Lines are { text, tone }. Reference behaviour: one line every 800 ms, takeaway after the last line.
   Added: pause / resume, single step, speed (0.5x 1x 2x) and a side-by-side mode that runs both scripts in sync. Reduced motion prints everything at once. */
(function (A, $) {
  const TONE = { bad: 't-bad', good: 't-good', dim: 't-dim', plain: '' };
  const LINE_MS = 800;
  const I = A.util.icon;

  A.workedRunner = {
    render($host, w) {
      $host.html(
        '<div class="worked-panel">' +
          '<p><strong>Scenario.</strong> ' + A.util.md(w.problem) + '</p>' +
          '<div class="worked-actions">' +
            '<button type="button" class="btn-atlas btn-bad js-without">' + I('x-octagon') + 'Run without the fix</button>' +
            '<button type="button" class="btn-atlas btn-good js-with">' + I('check2-circle') + 'Run with the fix</button>' +
            '<button type="button" class="btn-ghost js-both">' + I('layout-split') + 'Side by side</button>' +
          '</div>' +
          '<div class="worked-tools">' +
            '<button type="button" class="btn-ghost js-pause" disabled>' + I('pause-fill') + '<span>Pause</span></button>' +
            '<button type="button" class="btn-ghost js-step" disabled>' + I('skip-end-fill') + 'Step</button>' +
            '<label class="ctl-inline">Speed <select class="js-wspeed" aria-label="Worked example speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>' +
          '</div>' +
          '<div class="term-grid js-terms"><div class="term" role="log" aria-live="polite" aria-label="Worked example output"><span class="t-dim">Pick a run to watch it happen line by line.</span></div></div>' +
          '<div class="js-takeaway"></div>' +
        '</div>');

      const $terms = $host.find('.js-terms');
      const $pause = $host.find('.js-pause');
      const $step = $host.find('.js-step');
      let timer = null;
      let runs = [];
      let pos = 0;
      let paused = false;
      const total = () => Math.max.apply(null, runs.map(r => r.lines.length));
      const speed = () => +$host.find('.js-wspeed').val();
      const stop = () => { clearTimeout(timer); timer = null; };

      function line(r, l) {
        $('<div class="term-line"></div>').addClass(TONE[l.tone] || '').text(l.text).appendTo(r.$t);
      }

      function reveal() {
        runs.forEach(r => { if (r.lines[pos]) line(r, r.lines[pos]); });
        pos += 1;
        if (pos >= total()) {
          stop();
          $pause.prop('disabled', true);
          $step.prop('disabled', true);
          $host.find('.js-takeaway').html('<div class="takeaway"><strong>Takeaway:</strong> ' + A.util.md(w.takeaway) + '</div>');
        }
      }

      function schedule() {
        stop();
        if (paused || pos >= total()) return;
        timer = setTimeout(() => { reveal(); schedule(); }, LINE_MS / speed());
      }

      function setPaused(p) {
        paused = p;
        $pause.attr('aria-pressed', p).html(I(p ? 'play-fill' : 'pause-fill') + '<span>' + (p ? 'Resume' : 'Pause') + '</span>');
        if (p) stop(); else schedule();
      }

      function run(defs) {
        stop();
        paused = false;
        pos = 0;
        $host.find('.js-takeaway').empty();
        $terms.toggleClass('is-split', defs.length > 1).empty();
        runs = defs.map(d => {
          const $wrap = $('<div class="term-col"></div>').appendTo($terms);
          if (defs.length > 1) $('<div class="term-title"></div>').text(d.title).appendTo($wrap);
          const $t = $('<div class="term" role="log" aria-live="polite"></div>').attr('aria-label', d.title).appendTo($wrap);
          return { $t, lines: d.lines };
        });
        setPaused(false);
        if (A.util.reduced()) { while (pos < total()) reveal(); return; }
        $pause.prop('disabled', false);
        $step.prop('disabled', false);
        schedule();
      }

      $host.on('click', '.js-without', () => run([{ title: 'Without the fix', lines: w.without }]));
      $host.on('click', '.js-with', () => run([{ title: 'With the fix', lines: w.with }]));
      $host.on('click', '.js-both', () => run([{ title: 'Without the fix', lines: w.without }, { title: 'With the fix', lines: w.with }]));
      $host.on('click', '.js-pause', () => setPaused(!paused));
      $host.on('click', '.js-step', () => { if (pos < total()) { if (!paused) setPaused(true); reveal(); } });
      $host.on('change', '.js-wspeed', () => { if (!paused) schedule(); });
      A.lifecycle.add(stop);
    },
  };
})(window.Atlas, jQuery);
