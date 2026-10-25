/* Step player: play / pause / step / reset, speed (0.5x 1x 2x), clickable scrubber, loop, keyboard (Space, arrows, Home, End),
   level-aware captions, a "what changed" line and an Expert-only "Under the hood" panel. Reduced motion: starts on the last step, no autoplay. */
(function (A, $) {
  const STEP_MS = 2800;
  const END_HOLD_MS = 1600;
  const SPEEDS = [0.5, 1, 2];
  const I = A.util.icon;

  A.stepper = {
    create($host, topic, level) {
      const steps = topic.steps;
      const reduced = A.util.reduced();
      const hasHood = steps.some(s => s.hood);
      let index = reduced ? steps.length - 1 : 0;
      let timer = null;
      let playing = false;
      let speed = SPEEDS.indexOf(A.store.get('speed', 1)) !== -1 ? A.store.get('speed', 1) : 1;
      let loop = A.store.get('loop', true) !== false;
      A.visuals.speed = speed;

      const speedBtns = SPEEDS.map(s => '<button type="button" class="js-speed" data-speed="' + s + '" aria-pressed="' + (s === speed) + '" aria-label="Speed ' + s + ' times">' + s + 'x</button>').join('');
      const dots = steps.map((s, i) => '<li><button type="button" class="js-dot" data-i="' + i + '" aria-label="Go to step ' + (i + 1) + ': ' + A.util.esc(s.label) + '">' + (i + 1) + '</button></li>').join('');
      $host.html(
        '<div class="player" role="group" aria-label="Animated process player" tabindex="0">' +
          '<div class="player-stage"><div class="stage js-stage"></div>' +
            '<aside class="hood js-hood" aria-label="Under the hood" hidden><h3>' + I('cpu') + 'Under the hood</h3><p class="hood-step"></p><p class="hood-text"></p></aside></div>' +
          '<div class="player-caption" aria-live="off"><span class="step-no"></span><p class="cap-text"></p><div class="changed" aria-label="What changed"></div></div>' +
          '<div class="player-foot">' +
            '<button type="button" class="icon-btn js-prev" aria-label="Previous step">' + I('skip-start-fill') + '</button>' +
            '<button type="button" class="btn-atlas js-play" aria-label="Play">' + I('play-fill') + '<span>Play</span></button>' +
            '<button type="button" class="icon-btn js-next" aria-label="Next step">' + I('skip-end-fill') + '</button>' +
            '<button type="button" class="icon-btn js-restart" aria-label="Reset to step 1">' + I('arrow-counterclockwise') + '</button>' +
            '<span class="spacer"></span>' +
            '<div class="seg" role="group" aria-label="Playback speed">' + speedBtns + '</div>' +
            '<button type="button" class="btn-ghost js-loop" aria-pressed="' + loop + '">' + I('repeat') + '<span>Loop</span></button>' +
            '<ol class="scrub" aria-label="Steps">' + dots + '</ol>' +
            '<progress class="js-progress" max="' + steps.length + '" value="1" aria-label="Step progress"></progress>' +
            '<span class="player-hint">Keys: Left and Right arrows step, Home and End jump' + (reduced ? '. Autoplay is off because your system prefers reduced motion.' : ', Space plays or pauses.') + '</span>' +
          '</div>' +
        '</div>');

      const $player = $host.find('.player');
      const visual = A.visuals.mount(topic, $host.find('.js-stage'));
      const $play = $host.find('.js-play');
      const $dots = $host.find('.js-dot');

      function paintHood() {
        const on = hasHood && level === 'expert';
        $player.toggleClass('has-hood', on);
        $host.find('.js-hood').prop('hidden', !on);
        if (on) {
          $host.find('.hood-step').text('Step ' + (index + 1) + ': ' + steps[index].label);
          $host.find('.hood-text').text(steps[index].hood || 'No extra internals recorded for this step.');
        }
      }

      function show() {
        const s = steps[index];
        $host.find('.step-no').text('Step ' + (index + 1) + ' of ' + steps.length + ': ' + s.label);
        $host.find('.cap-text').html(A.util.md(s.caption[level] || s.caption.beginner));
        $host.find('.changed').html(I('lightning-charge-fill') + '<span>What changed: ' + A.util.esc(visual.changed(index)) + '</span>');
        $host.find('.js-progress').attr('value', index + 1);
        $host.find('.js-stage').attr('aria-label', 'Diagram, step ' + (index + 1) + ': ' + s.label);
        $dots.each(function (k) { $(this).toggleClass('is-seen', k < index).attr('aria-current', k === index ? 'step' : null); });
        paintHood();
        visual.update(index, level);
      }

      function stop() {
        clearTimeout(timer);
        timer = null;
        playing = false;
        $play.attr('aria-label', 'Play').html(I('play-fill') + '<span>Play</span>');
        $host.find('.player-caption').attr('aria-live', 'polite');
      }

      function go(i) { index = Math.max(0, Math.min(steps.length - 1, i)); show(); }

      function tick() {
        timer = setTimeout(() => {
          if (index < steps.length - 1) { go(index + 1); tick(); return; }
          if (!loop) { stop(); return; }
          timer = setTimeout(() => { go(0); tick(); }, END_HOLD_MS / speed);
        }, STEP_MS / speed);
      }

      function start() {
        if (reduced) return;
        if (index >= steps.length - 1) go(0);
        playing = true;
        $play.attr('aria-label', 'Pause').html(I('pause-fill') + '<span>Pause</span>');
        $host.find('.player-caption').attr('aria-live', 'off');
        tick();
      }

      const toggle = () => (playing ? stop() : start());
      $host.on('click', '.js-prev', () => { stop(); go(index - 1); });
      $host.on('click', '.js-next', () => { stop(); go(index + 1); });
      $host.on('click', '.js-restart', () => { stop(); go(0); });
      $host.on('click', '.js-play', toggle);
      $host.on('click', '.js-dot', function () { stop(); go(+$(this).data('i')); });
      $host.on('click', '.js-speed', function () {
        speed = +$(this).data('speed');
        A.visuals.speed = speed;
        A.store.set('speed', speed, true);
        $host.find('.js-speed').each(function () { $(this).attr('aria-pressed', +$(this).data('speed') === speed); });
      });
      $host.on('click', '.js-loop', function () {
        loop = !loop;
        A.store.set('loop', loop, true);
        $(this).attr('aria-pressed', loop);
      });
      $player.on('keydown', e => {
        if ($(e.target).is('input, select, textarea')) return;
        const k = e.key;
        if (k === 'ArrowRight') { stop(); go(index + 1); } else if (k === 'ArrowLeft') { stop(); go(index - 1); }
        else if (k === 'Home') { stop(); go(0); } else if (k === 'End') { stop(); go(steps.length - 1); }
        else if (k === ' ' && !$(e.target).is('button')) toggle(); else return;
        e.preventDefault();
      });
      const onHide = () => { if (document.hidden && playing) stop(); };
      document.addEventListener('visibilitychange', onHide);

      A.lifecycle.add(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', onHide); });
      show();
      return { setLevel(l) { level = l; show(); }, goTo: go, isPlaying: () => playing };
    },
  };
})(window.Atlas, jQuery);
