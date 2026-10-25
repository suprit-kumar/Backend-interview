/* Beginner / Intermediate / Expert switcher (sticky Bootstrap nav-pills). */
(function (A, $) {
  A.levelSwitcher = {
    create($host, level, onChange) {
      const pills = A.meta.levels.map(l =>
        '<li class="nav-item"><button type="button" class="nav-link" data-level="' + l + '" aria-pressed="false">' + A.util.cap(l) + '</button></li>').join('');
      $host.html('<span class="label" id="level-label">Level</span><ul class="nav nav-pills" role="group" aria-labelledby="level-label">' + pills + '</ul>');

      function set(l) {
        $host.find('.nav-link').each(function () {
          const on = $(this).data('level') === l;
          $(this).toggleClass('active', on).attr('aria-pressed', on ? 'true' : 'false');
        });
      }

      $host.on('click', '.nav-link', function () {
        const l = $(this).data('level');
        set(l);
        onChange(l);
      });
      $host.on('keydown', '.nav-link', function (e) {
        const keys = { ArrowRight: 1, ArrowLeft: -1 };
        if (!keys[e.key]) return;
        const $all = $host.find('.nav-link');
        const next = $all.eq(($all.index(this) + keys[e.key] + $all.length) % $all.length);
        next.trigger('focus');
        e.preventDefault();
      });
      set(level);
      return { set };
    },
  };
})(window.Atlas, jQuery);
