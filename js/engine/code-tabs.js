/* Code tabs: highlight.js, line-number gutter with annotated lines marked, and a copy button. */
(function (A, $) {
  const esc = A.util.esc;

  function highlight(block) {
    if (!window.hljs) return esc(block.code);
    try {
      if (window.hljs.getLanguage(block.lang)) return window.hljs.highlight(block.code, { language: block.lang }).value;
    } catch (e) { /* fall back to plain text */ }
    return esc(block.code);
  }

  function pane(block) {
    const lines = block.code.split('\n');
    const noted = {};
    (block.annotations || []).forEach(a => { noted[a.line] = true; });
    const gutter = lines.map((_, i) => '<span' + (noted[i + 1] ? ' class="has-note"' : '') + '>' + (i + 1) + '</span>').join('');
    const notes = (block.annotations || []).map(a =>
      '<li><span class="ln">L' + a.line + '</span><span>' + A.util.md(a.text) + '</span></li>').join('');
    return '<div class="code-view"><div class="code-gutter" aria-hidden="true">' + gutter + '</div>' +
      '<pre tabindex="0"><code class="hljs language-' + esc(block.lang) + '">' + highlight(block) + '</code></pre></div>' +
      (notes ? '<ul class="code-notes" aria-label="Line annotations">' + notes + '</ul>' : '');
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const $t = $('<textarea class="visually-hidden" aria-hidden="true"></textarea>').val(text).appendTo('body');
      $t[0].select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      $t.remove();
    });
  }

  A.codeTabs = {
    render($host, blocks) {
      const tabs = blocks.map((b, i) =>
        '<li class="nav-item" role="presentation"><button type="button" class="nav-link' + (i ? '' : ' active') + '" role="tab" aria-selected="' + (i === 0) +
        '" data-i="' + i + '">' + esc(b.title) + '</button></li>').join('');
      $host.html('<div class="code-card"><div class="code-bar"><ul class="nav nav-tabs" role="tablist" aria-label="Code examples">' + tabs + '</ul>' +
        '<span><span class="code-lang"></span><button type="button" class="btn-ghost js-copy" aria-label="Copy code">' + A.util.icon('clipboard') + '<span>Copy</span></button></span></div>' +
        '<div class="code-body" role="tabpanel"></div></div>');
      let current = 0;

      function select(i) {
        current = i;
        $host.find('.nav-link').each(function (k) { $(this).toggleClass('active', k === i).attr('aria-selected', k === i); });
        $host.find('.code-lang').text(blocks[i].lang);
        $host.find('.code-body').html(pane(blocks[i]));
      }

      $host.on('click', '.nav-link', function () { select(+$(this).data('i')); });
      $host.on('keydown', '.nav-link', function (e) {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        const n = (current + d + blocks.length) % blocks.length;
        select(n);
        $host.find('.nav-link').eq(n).trigger('focus');
        e.preventDefault();
      });
      $host.on('click', '.js-copy', function () {
        const $label = $(this).find('span');
        copy(blocks[current].code).then(() => $label.text('Copied'), () => $label.text('Copy failed'));
        setTimeout(() => $label.text('Copy'), 1600);
      });
      select(0);
    },
  };
})(window.Atlas, jQuery);
