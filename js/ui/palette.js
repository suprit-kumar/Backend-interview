/* Ctrl+K command palette: fuzzy search over topics with full keyboard control. */
(function (A, $) {
  const esc = A.util.esc;
  let $root;
  let $input;
  let $list;
  let results = [];
  let active = 0;
  let opener = null;

  function highlight(title, hits) {
    const set = {};
    (hits || []).forEach(h => { set[h] = true; });
    return title.split('').map((ch, i) => (set[i] ? '<mark>' + esc(ch) + '</mark>' : esc(ch))).join('');
  }

  function item(r, i) {
    const e = r.entry;
    const cat = A.catalog.cat(e.c);
    return '<li class="palette-item cat-' + e.c + '" role="option" id="pal-' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '">' +
      '<span class="cat-ico">' + A.util.icon(cat.icon) + '</span><div class="meta"><div class="ttl">' + highlight(e.t, r.hits) + '</div>' +
      '<div class="sub">' + esc(cat.name) + ' &middot; ' + esc(e.d) + '</div></div>' +
      (A.catalog.hasSim(e) ? '<span class="b-sim" title="Has a simulation">' + A.util.icon('play-fill') + '</span>' : '') +
      (A.catalog.hasWorked(e) ? '<span class="b-work" title="Has a worked example">' + A.util.icon('pencil-square') + '</span>' : '') + '</li>';
  }

  function paint() {
    const q = $input.val().trim();
    let head = '';
    if (q) {
      results = A.search.query(q, 12);
    } else {
      const recent = A.store.get('recent', []).map(A.catalog.entry).filter(Boolean);
      const base = recent.length ? recent : A.meta.paths[0].ids.slice(0, 6).map(A.catalog.entry);
      head = '<li class="palette-group" role="presentation">' + (recent.length ? 'Recent' : 'Good places to start') + '</li>';
      results = base.map(e => ({ entry: e, hits: [] }));
    }
    active = 0;
    $list.html(results.length ? head + results.map(item).join('') : '<li class="palette-empty" role="presentation">No topics match "' + esc(q) + '".</li>');
    $input.attr('aria-activedescendant', results.length ? 'pal-0' : '');
  }

  function move(d) {
    if (!results.length) return;
    active = (active + d + results.length) % results.length;
    $list.find('.palette-item').each(function (i) { $(this).attr('aria-selected', i === active); });
    $input.attr('aria-activedescendant', 'pal-' + active);
    const el = document.getElementById('pal-' + active);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    A.palette.close(true);
    A.router.go('/topic/' + r.entry.id);
  }

  A.palette = {
    init() {
      $('#palette-root').html(
        '<div class="palette" hidden><div class="palette-backdrop js-close"></div>' +
          '<div class="palette-dialog" role="dialog" aria-modal="true" aria-label="Search topics">' +
            '<div class="palette-input">' + A.util.icon('search') +
              '<input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" aria-label="Search topics" placeholder="Search topics, tags, ideas" autocomplete="off" spellcheck="false">' +
              '<kbd>Esc</kbd></div>' +
            '<ul class="palette-list" id="palette-list" role="listbox" aria-label="Results"></ul>' +
            '<div class="palette-foot"><span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>' +
          '</div></div>');
      $root = $('#palette-root .palette');
      $input = $root.find('input');
      $list = $root.find('.palette-list');

      $input.on('input', paint);
      $root.on('click', '.js-close', () => A.palette.close());
      $list.on('click', '.palette-item', function () { choose(+$(this).data('i')); });
      $list.on('mousemove', '.palette-item', function () {
        const i = +$(this).data('i');
        if (i !== active) { active = i; move(0); }
      });
      $root.on('keydown', e => {
        if (e.key === 'ArrowDown') move(1);
        else if (e.key === 'ArrowUp') move(-1);
        else if (e.key === 'Enter') choose(active);
        else if (e.key === 'Escape') A.palette.close();
        else if (e.key === 'Tab') $input.trigger('focus');
        else return;
        e.preventDefault();
      });
      $(document).on('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); A.palette.isOpen() ? A.palette.close() : A.palette.open(); }
      });
    },
    isOpen() { return !$root.prop('hidden'); },
    open() {
      opener = document.activeElement;
      $root.prop('hidden', false);
      $input.val('');
      paint();
      $input.trigger('focus');
    },
    close(skipFocus) {
      $root.prop('hidden', true);
      if (!skipFocus && opener && opener.focus) opener.focus();
    },
  };
})(window.Atlas, jQuery);
