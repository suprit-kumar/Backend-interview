/* Theme: stored choice wins, otherwise the OS preference. Applied immediately to avoid a flash. */
(function (A) {
  const root = document.documentElement;

  function preferred() {
    const saved = A.store.get('theme', null);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  A.theme = {
    get() { return root.getAttribute('data-theme') || 'light'; },
    apply(theme) {
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-bs-theme', theme);
    },
    set(theme) {
      A.theme.apply(theme);
      A.store.set('theme', theme);
    },
    toggle() { A.theme.set(A.theme.get() === 'dark' ? 'light' : 'dark'); },
  };

  A.theme.apply(preferred());
})(window.Atlas);
