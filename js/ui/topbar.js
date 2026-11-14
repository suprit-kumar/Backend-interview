/* Top bar: brand, search trigger, progress ring, theme toggle, mobile menu button. */
(function (A, $) {
  function ring() {
    const done = A.catalog.doneCount();
    const total = A.catalog.total();
    const pct = Math.round((done / total) * 100);
    return '<svg viewBox="0 0 36 36" role="img" aria-label="' + done + ' of ' + total + ' topics completed">' +
      '<defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="18" cy="18" r="15.9155"/>' +
      '<circle class="ring-fill" cx="18" cy="18" r="15.9155" stroke-dasharray="' + pct + ' 100" transform="rotate(-90 18 18)"/>' +
      '<text class="ring-text" x="18" y="18">' + done + '</text></svg>';
  }

  function themeButton() {
    const dark = A.theme.get() === 'dark';
    return $('<button type="button" class="icon-btn js-theme"></button>')
      .attr('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme')
      .html(A.util.icon(dark ? 'sun-fill' : 'moon-stars-fill'));
  }

  const SITES = [
    { label: 'Web API', url: 'https://suprit-kumar.github.io/webapi/', icon: 'globe2' },
    { label: 'Architecture', url: 'https://suprit-kumar.github.io/architecture/', icon: 'diagram-3' },
    { label: 'Concurrency', url: 'https://suprit-kumar.github.io/concurrency/', icon: 'cpu' },
    { label: 'Performance', url: 'https://suprit-kumar.github.io/performance/', icon: 'speedometer2' },
  ];

  function sitesMenu() {
    const items = SITES.map((s) =>
      '<li><a class="sites-item" role="menuitem" href="' + s.url + '" target="_blank" rel="noopener noreferrer">' +
      A.util.icon(s.icon) + '<span>' + s.label + '</span>' + A.util.icon('box-arrow-up-right') + '</a></li>').join('');
    return '<div class="sites-menu">' +
      '<button type="button" class="sites-toggle js-sites" aria-haspopup="true" aria-expanded="false" aria-controls="sites-list">' +
        A.util.icon('grid-3x3-gap') + '<span class="sites-label">👀 Curious? Click to explore with visualization!</span>' + A.util.icon('chevron-down') + '</button>' +
      '<ul id="sites-list" class="sites-list" role="menu" aria-label="Related sites" hidden>' + items + '</ul></div>';
  }

  function setSites(open) {
    $('#topbar .js-sites').attr('aria-expanded', open);
    $('#sites-list').prop('hidden', !open);
  }

  A.topbar = {
    render() {
      $('#topbar').html(
        '<div class="topbar-inner">' +
          '<button type="button" class="icon-btn only-mobile js-menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">' + A.util.icon('list') + '</button>' +
          '<a class="brand" href="#/home" aria-label="Backend Interview Atlas, home"><span class="brand-mark">' + A.util.icon('compass-fill') + '</span>' +
            '<span class="brand-text">Backend Interview <b>Atlas</b></span></a>' +
          '<button type="button" class="search-trigger js-search" aria-label="Search topics (Control K)">' + A.util.icon('search') +
            '<span class="search-hint">Search topics, tags, ideas</span><kbd>Ctrl</kbd><kbd>K</kbd></button>' +
          '<div class="topbar-actions">' + sitesMenu() + '<a class="progress-ring js-ring" href="#/home" title="Overall progress"></a><span class="js-theme-slot"></span></div>' +
        '</div>');
      A.topbar.refresh();
      $('#topbar').on('click', '.js-menu', () => A.sidebar.open());
      $('#topbar').on('click', '.js-search', () => A.palette.open());
      $('#topbar').on('click', '.js-sites', (e) => { e.stopPropagation(); setSites($('#sites-list').prop('hidden')); });
      $(document).on('click', (e) => { if (!$(e.target).closest('.sites-menu').length) setSites(false); });
      $(document).on('keydown', (e) => { if (e.key === 'Escape' && !$('#sites-list').prop('hidden')) { setSites(false); $('#topbar .js-sites').trigger('focus'); } });
      $('#topbar').on('click', '.js-theme', () => { A.theme.toggle(); A.topbar.refresh(); });
    },
    refresh() {
      $('#topbar .js-ring').html(ring());
      $('#topbar .js-theme-slot').empty().append(themeButton());
    },
  };
})(window.Atlas, jQuery);
