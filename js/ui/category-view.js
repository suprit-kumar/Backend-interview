/* Category view: header with accent colour and progress, then a card per topic. */
(function (A, $) {
  const esc = A.util.esc;

  function card(e) {
    const ready = !!A.catalog.data(e.id);
    const done = A.catalog.isDone(e.id);
    return '<a class="topic-card' + (ready ? ' is-ready' : '') + '" href="#/topic/' + esc(e.id) + '">' +
      '<div class="tc-top"><span class="chip">' + esc(e.v) + '</span>' + (ready ? '<span class="chip">' + A.util.icon('stars') + 'Full lesson</span>' : '') +
      (done ? '<span class="b-done" title="Completed">' + A.util.icon('check-circle-fill') + '</span>' : '') + '</div>' +
      '<h3>' + esc(e.t) + '</h3><p>' + esc(e.d) + '</p><div class="card-meta">' +
      '<span>' + (A.catalog.hasSim(e) ? A.util.icon('play-fill', 'b-sim') + ' Simulation ' : '') + (A.catalog.hasWorked(e) ? A.util.icon('pencil-square', 'b-work') + ' Worked example' : '') + '</span>' +
      '<span>' + e.s.length + ' steps</span></div></a>';
  }

  A.categoryView = {
    render($view, slug) {
      const c = A.catalog.cat(slug);
      const items = A.catalog.inCat(slug);
      const d = A.catalog.doneCount(slug);
      $view.html(
        '<div class="view-wide cat-' + slug + '"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/home">Home</a> / ' + esc(c.name) + '</nav>' +
          '<header class="cat-header"><span class="cat-ico">' + A.util.icon(c.icon) + '</span><div class="grow"><h1>' + esc(c.name) + '</h1><p>' + esc(c.blurb) + '</p>' +
            '<div class="card-meta"><span>' + items.length + ' topics</span><span>' + d + ' / ' + items.length + ' completed</span></div>' +
            '<progress max="' + items.length + '" value="' + d + '" aria-label="' + esc(c.name) + ' progress"></progress></div></header>' +
          '<div class="grid-3 mt-4">' + items.map(card).join('') + '</div></div>');
      return c.name;
    },
  };
})(window.Atlas, jQuery);
