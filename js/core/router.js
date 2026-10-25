/* Hash router (works on file://): #/home, #/category/<slug>, #/topic/<id>. Also owns per-view cleanup. */
(function (A, $) {
  const cleanups = [];

  A.lifecycle = {
    add(fn) { cleanups.push(fn); },
    flush() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* a failed cleanup must not block navigation */ } } },
  };

  const routes = {};
  let first = true;

  function parse() {
    const parts = (window.location.hash || '').replace(/^#\/?/, '').split('/');
    let arg = '';
    try { arg = decodeURIComponent(parts[1] || ''); } catch (e) { arg = ''; }
    return { name: parts[0] || 'home', arg };
  }

  function canonical(name, arg) { return '#/' + name + (arg ? '/' + encodeURIComponent(arg) : ''); }

  function render() {
    A.lifecycle.flush();
    let r = parse();
    if (r.name === 'topic') {
      const id = A.catalog.resolve(r.arg);
      r = id ? { name: 'topic', arg: id } : { name: 'home', arg: '' };
    } else if (r.name === 'category') {
      if (!A.catalog.cat(r.arg)) r = { name: 'home', arg: '' };
    } else r = { name: 'home', arg: '' };

    const target = canonical(r.name, r.arg);
    if (window.location.hash !== target) window.history.replaceState(null, '', target);

    A.router.current = r;
    const $view = $('#view').empty().removeClass('view-enter');
    const title = routes[r.name]($view, r.arg);
    document.title = (title ? title + ' | ' : '') + 'Backend Interview Atlas';
    if (!A.util.reduced()) $view.addClass('view-enter');
    A.sidebar.close();
    A.sidebar.render();
    window.scrollTo(0, 0);
    if (!first) {
      const $h = $view.find('h1').first();
      $h.attr('tabindex', '-1');
      if ($h.length) $h[0].focus({ preventScroll: true });
      A.util.announce('Showing ' + (title || 'home'));
    }
    first = false;
  }

  A.router = {
    current: { name: 'home', arg: '' },
    register(name, fn) { routes[name] = fn; },
    go(path) { window.location.hash = path; },
    start() {
      $(window).on('hashchange', render);
      render();
    },
  };
})(window.Atlas, jQuery);
