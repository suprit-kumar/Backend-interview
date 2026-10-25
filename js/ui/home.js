/* Home view: hero, learning paths, continue card, category grid. */
(function (A, $) {
  const esc = A.util.esc;

  function pathCard(p) {
    const done = p.ids.filter(A.catalog.isDone).length;
    return '<div class="path-card"><span class="path-ico">' + A.util.icon(p.icon) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.blurb) + '</p>' +
      '<div class="card-meta"><span>' + p.ids.length + ' topics</span><span>' + done + ' done</span></div>' +
      '<progress max="' + p.ids.length + '" value="' + done + '" aria-label="' + esc(p.title) + ' progress"></progress>' +
      '<button type="button" class="btn-atlas js-path" data-level="' + p.level + '">Start path ' + A.util.icon('arrow-right') + '</button></div>';
  }

  function catCard(c) {
    const n = A.catalog.total(c.slug);
    const d = A.catalog.doneCount(c.slug);
    return '<a class="cat-card cat-' + c.slug + '" href="#/category/' + c.slug + '"><span class="cat-ico">' + A.util.icon(c.icon) + '</span>' +
      '<h3>' + esc(c.name) + '</h3><p>' + esc(c.blurb) + '</p><div class="card-meta"><span>' + n + ' topics</span><span>' + d + ' / ' + n + ' done</span></div>' +
      '<progress max="' + n + '" value="' + d + '" aria-label="' + esc(c.name) + ' progress"></progress></a>';
  }

  function continueCard() {
    const e = A.catalog.entry(A.store.get('last', ''));
    if (!e) return '';
    const cat = A.catalog.cat(e.c);
    return '<h2 class="section-title">Continue where you left off</h2>' +
      '<a class="card-atlas continue-card cat-' + e.c + '" href="#/topic/' + esc(e.id) + '"><span class="cat-ico">' + A.util.icon(cat.icon) + '</span>' +
      '<div class="grow"><h3>' + esc(e.t) + '</h3><p class="mb-0">' + esc(cat.name) + '</p></div><span class="btn-atlas">Resume ' + A.util.icon('arrow-right') + '</span></a>';
  }

  A.home = {
    render($view) {
      const sims = A.index.filter(e => e.sim).length;
      const worked = A.index.filter(e => e.w).length;
      $view.html(
        '<div class="view-wide">' +
          '<section class="hero" aria-labelledby="home-title"><h1 id="home-title">Learn backend engineering the way interviews test it.</h1>' +
            '<p class="lead">Animated walkthroughs, hands-on simulations and level-aware explanations for ' + A.catalog.total() + ' backend topics, from first principles to production failure modes.</p>' +
            '<div class="hero-actions"><button type="button" class="btn-atlas js-start">' + A.util.icon('rocket-takeoff') + 'Start learning</button>' +
              '<button type="button" class="btn-ghost js-random">' + A.util.icon('shuffle') + 'Random topic</button>' +
              '<button type="button" class="btn-ghost js-open-search">' + A.util.icon('search') + 'Search <kbd>Ctrl</kbd> <kbd>K</kbd></button></div>' +
            '<div class="stats"><span class="stat"><b>' + A.catalog.total() + '</b> topics</span><span class="stat"><b>' + A.catalog.cats.length + '</b> categories</span>' +
              '<span class="stat"><b>' + sims + '</b> simulations</span><span class="stat"><b>' + worked + '</b> worked examples</span></div></section>' +
          continueCard() +
          '<h2 class="section-title">Learning paths</h2><div class="grid-3">' + A.meta.paths.map(pathCard).join('') + '</div>' +
          '<h2 class="section-title">Browse by category</h2><div class="grid-3">' + A.catalog.cats.map(catCard).join('') + '</div>' +
        '</div>');

      $view.on('click', '.js-start', () => { A.store.set('level', 'beginner', true); A.router.go('/topic/' + A.meta.paths[0].ids[0]); });
      $view.on('click', '.js-random', () => A.router.go('/topic/' + A.catalog.random().id));
      $view.on('click', '.js-open-search', () => A.palette.open());
      $view.on('click', '.js-path', function () {
        const p = A.meta.paths.find(x => x.level === $(this).data('level'));
        const next = p.ids.find(id => !A.catalog.isDone(id)) || p.ids[0];
        A.store.set('level', p.level, true);
        A.router.go('/topic/' + next);
      });
      return null;
    },
  };
})(window.Atlas, jQuery);
