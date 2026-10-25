/* Sidebar: 13 collapsible category groups listing all 77 topics, with status badges. Off-canvas drawer on mobile. */
(function (A, $) {
  const esc = A.util.esc;

  function badges(e, done, starred) {
    const b = [];
    if (A.catalog.hasSim(e)) b.push('<span class="b-sim" title="Has a simulation">' + A.util.icon('play-fill') + '<span class="visually-hidden">Has a simulation</span></span>');
    if (A.catalog.hasWorked(e)) b.push('<span class="b-work" title="Has a worked example">' + A.util.icon('pencil-square') + '<span class="visually-hidden">Has a worked example</span></span>');
    if (done) b.push('<span class="b-done" title="Completed">' + A.util.icon('check-circle-fill') + '<span class="visually-hidden">Completed</span></span>');
    if (starred) b.push('<span class="b-star" title="Bookmarked">' + A.util.icon('star-fill') + '<span class="visually-hidden">Bookmarked</span></span>');
    return b.length ? '<span class="badges">' + b.join('') + '</span>' : '';
  }

  function group(c, ctx) {
    const items = A.catalog.inCat(c.slug);
    const open = ctx.open.indexOf(c.slug) !== -1 || ctx.activeCat === c.slug;
    const links = items.map(e =>
      '<li><a class="side-link" href="#/topic/' + esc(e.id) + '"' + (ctx.activeId === e.id ? ' aria-current="page"' : '') + '><span class="t">' + esc(e.t) + '</span>' +
      badges(e, ctx.done.indexOf(e.id) !== -1, ctx.stars.indexOf(e.id) !== -1) + '</a></li>').join('');
    return '<section class="side-cat cat-' + c.slug + (open ? ' is-open' : '') + '" data-cat="' + c.slug + '">' +
      '<button type="button" class="side-cat-head" aria-expanded="' + open + '" aria-controls="side-' + c.slug + '">' +
        '<span class="cat-ico">' + A.util.icon(c.icon) + '</span><span class="side-cat-name">' + esc(c.name) + '</span>' +
        '<span class="side-cat-count">' + A.catalog.doneCount(c.slug) + '/' + items.length + '</span>' + A.util.icon('chevron-down', 'chev') + '</button>' +
      '<ul class="side-list" id="side-' + c.slug + '"' + (open ? '' : ' hidden') + '>' +
        '<li><a class="side-link side-all" href="#/category/' + c.slug + '"' + (ctx.route === 'category' && ctx.activeCat === c.slug ? ' aria-current="page"' : '') + '>Category overview</a></li>' +
        links + '</ul></section>';
  }

  A.sidebar = {
    render() {
      const cur = A.router.current;
      const entry = cur.name === 'topic' ? A.catalog.entry(cur.arg) : null;
      const ctx = {
        open: A.store.get('open', []), done: A.store.get('done', []), stars: A.store.get('bookmarks', []),
        route: cur.name, activeId: entry ? entry.id : null,
        activeCat: entry ? entry.c : (cur.name === 'category' ? cur.arg : null),
      };
      const scroll = $('#sidebar').scrollTop();
      $('#sidebar').html('<nav aria-label="Topics by category">' + A.catalog.cats.map(c => group(c, ctx)).join('') + '</nav>' +
        '<div class="legend" aria-label="Badge legend"><span>' + A.util.icon('play-fill', 'b-sim') + ' Simulation</span><span>' + A.util.icon('pencil-square', 'b-work') +
        ' Worked example</span><span>' + A.util.icon('check-circle-fill', 'b-done') + ' Completed</span><span>' + A.util.icon('star-fill', 'b-star') + ' Bookmarked</span></div>');
      $('#sidebar').scrollTop(scroll);
      const cur$ = $('#sidebar [aria-current="page"]').get(0);
      if (cur$ && cur$.scrollIntoView && !scroll) cur$.scrollIntoView({ block: 'nearest' });
    },
    open() {
      $('#sidebar').addClass('is-open');
      $('#drawer-backdrop').prop('hidden', false);
      $('.js-menu').attr('aria-expanded', 'true');
      $('#sidebar').find('a, button').first().trigger('focus');
    },
    close() {
      $('#sidebar').removeClass('is-open');
      $('#drawer-backdrop').prop('hidden', true);
      $('.js-menu').attr('aria-expanded', 'false');
    },
    init() {
      $('#sidebar').on('click', '.side-cat-head', function () {
        const $s = $(this).closest('.side-cat');
        const open = !$s.hasClass('is-open');
        $s.toggleClass('is-open', open);
        $(this).attr('aria-expanded', open);
        $s.find('.side-list').prop('hidden', !open);
        const list = A.store.get('open', []).filter(x => x !== $s.data('cat'));
        if (open) list.push($s.data('cat'));
        A.store.set('open', list, true);
      });
      $('#drawer-backdrop').on('click', A.sidebar.close);
      $(document).on('keydown', e => { if (e.key === 'Escape' && $('#sidebar').hasClass('is-open')) { A.sidebar.close(); $('.js-menu').trigger('focus'); } });
    },
  };
})(window.Atlas, jQuery);
