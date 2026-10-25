/* Small shared helpers. */
(function (A) {
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  A.util = {
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ENT[c]); },
    // Escapes, then turns `code` spans into <code>.
    md(s) { return A.util.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); },
    icon(name, cls) { return '<i class="bi bi-' + name + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>'; },
    reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); },
    cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); },
    announce(msg) { $('#live').text(msg); },
    // Swaps content with a short fade (instant under reduced motion).
    swap($el, html) {
      $el.html(html);
      if (A.util.reduced()) return;
      $el.removeClass('is-swapping');
      void $el[0].offsetWidth;
      $el.addClass('is-swapping');
    },
  };
})(window.Atlas);
