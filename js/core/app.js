/* Boot: renders the shell, registers routes, starts the router. Loaded last. */
(function (A, $) {
  $(function () {
    A.router.register('home', $v => A.home.render($v));
    A.router.register('category', ($v, slug) => A.categoryView.render($v, slug));
    A.router.register('topic', ($v, id) => A.topicView.render($v, id));

    A.topbar.render();
    A.sidebar.init();
    A.palette.init();
    A.store.onChange(() => { A.topbar.refresh(); A.sidebar.render(); });
    A.router.start();
  });
})(window.Atlas, jQuery);
