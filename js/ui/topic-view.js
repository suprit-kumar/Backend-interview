/* Topic view: composes the 13-section template. Topics without full content render a stub using the reference steps. */
(function (A, $) {
  const esc = A.util.esc;
  const S = A.sections;

  function sec(id, icon, title, body, extra) {
    return '<section class="topic-sec" id="sec-' + id + '" aria-labelledby="h-' + id + '"><h2 id="h-' + id + '">' + A.util.icon(icon) + title + '</h2>' + (extra || '') + body + '</section>';
  }

  function header(topic, entry, cat) {
    const time = topic.estMinutes ? '<span class="chip">' + A.util.icon('clock') + topic.estMinutes + ' min</span>' : '';
    const prereq = topic.prereqs && topic.prereqs.length ? '<div class="prereqs">Prerequisites: <span class="chip-row">' + S.chips(topic.prereqs) + '</span></div>' : '';
    return '<header class="topic-head"><div class="chip-row"><a class="chip chip-cat" href="#/category/' + entry.c + '">' + A.util.icon(cat.icon) + esc(cat.name) + '</a>' + time +
      '<span class="chip">' + A.util.icon('diagram-2') + esc(topic.visual.type) + '</span>' + (topic.stub ? '<span class="chip">Lesson coming soon</span>' : '') + '</div>' +
      '<h1 id="topic-title">' + esc(topic.title) + '</h1>' + prereq +
      '<div class="topic-actions"><button type="button" class="btn-ghost js-bookmark" aria-pressed="false">' + A.util.icon('star') + '<span>Bookmark</span></button>' +
      '<button type="button" class="btn-ghost is-done js-complete" aria-pressed="false">' + A.util.icon('check-circle') + '<span>Mark complete</span></button></div></header>';
  }

  function syncButtons($v, id) {
    const star = A.store.has('bookmarks', id);
    const done = A.store.has('done', id);
    $v.find('.js-bookmark').attr('aria-pressed', star).find('span').text(star ? 'Bookmarked' : 'Bookmark');
    $v.find('.js-bookmark .bi').attr('class', 'bi bi-star' + (star ? '-fill' : ''));
    $v.find('.js-complete').attr('aria-pressed', done).find('span').text(done ? 'Completed' : 'Mark complete');
    $v.find('.js-complete .bi').attr('class', 'bi bi-check-circle' + (done ? '-fill' : ''));
  }

  A.topicView = {
    render($view, id) {
      const entry = A.catalog.entry(id);
      const full = A.catalog.data(id);
      const topic = full || A.catalog.stub(entry);
      const cat = A.catalog.cat(entry.c);
      let level = A.store.get('level', 'beginner');
      if (A.meta.levels.indexOf(level) === -1) level = 'beginner';
      let showAll = false;
      A.store.set('last', id, true);
      A.store.pushRecent(id);

      const hasSim = !!(topic.sim || entry.sim);
      let html = '<article class="view-narrow cat-' + entry.c + '" aria-labelledby="topic-title">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/home">Home</a> / <a href="#/category/' + entry.c + '">' + esc(cat.name) + '</a> / ' + esc(topic.title) + '</nav>' +
        header(topic, entry, cat);
      html += '<div class="level-bar" id="level-bar"></div>';
      html += '<div class="tldr"><span class="label">TL;DR</span><p>' + esc(topic.source.description) + '</p></div>';
      if (full) html += sec('concept', 'lightbulb', 'The concept', '<div class="js-concept"></div>');
      else html += '<div class="stub-note">' + A.util.icon('hammer') + ' The full lesson (levels, code, interview questions and quiz) for this topic is still being written. The animated steps below come straight from the reference.</div>';
      html += sec('visual', 'play-circle', 'How it works', '<div class="js-player"></div>');
      if (hasSim) html += sec('sim', 'sliders', 'Try it yourself', '<div class="js-sim"></div>');
      const worked = A.catalog.worked(id);
      if (worked) html += sec('worked', 'pencil-square', 'Without the fix vs with the fix', '<div class="js-worked"></div>');
      if (full) {
        html += sec('code', 'code-slash', 'Code', '<div class="js-code"></div>');
        html += sec('tradeoffs', 'arrow-left-right', 'Trade-offs', S.tradeoffs(full));
        html += sec('mistakes', 'exclamation-diamond', 'Common mistakes and interview traps', '<div class="js-mistakes"></div>');
        html += sec('interview', 'chat-square-text', 'Interview questions', '<div class="js-interview"></div>',
          '<div class="section-tools"><span class="js-iv-note"></span><button type="button" class="btn-ghost js-all-levels" aria-pressed="false">Show all levels</button></div>');
        html += sec('quiz', 'patch-question', 'Check yourself', '<div class="js-quiz"></div>');
      }
      const related = (topic.related || []).length ? topic.related : [];
      if (related.length) html += sec('related', 'link-45deg', 'Related topics', '<div class="grid-3">' + S.relatedCards(related) + '</div>');
      html += S.pager(id) + '</article>';
      $view.html(html);

      const player = A.stepper.create($view.find('.js-player'), topic, level);
      const sim = hasSim ? A.sims.mount(topic.sim || entry.sim, $view.find('.js-sim'), level) : null;
      if (worked) A.workedRunner.render($view.find('.js-worked'), worked);
      syncButtons($view, id);
      $view.on('click', '.js-bookmark', () => { A.store.toggle('bookmarks', id); syncButtons($view, id); });
      $view.on('click', '.js-complete', () => { A.store.toggle('done', id); syncButtons($view, id); });

      let quiz = null;
      let paintLevel = () => {};
      A.levelSwitcher.create($view.find('#level-bar'), level, l => {
        level = l;
        A.store.set('level', l, true);
        paintLevel(true);
        player.setLevel(l);
        if (sim) sim.setLevel(l);
        if (quiz) quiz.setLevel(l);
        A.util.announce(A.util.cap(l) + ' level selected');
      });
      if (!full) return topic.title;

      A.codeTabs.render($view.find('.js-code'), full.code);
      quiz = A.quiz.render($view.find('.js-quiz'), full, level);

      paintLevel = animate => {
        const put = ($el, h) => (animate ? A.util.swap($el, h) : $el.html(h));
        put($view.find('.js-concept'), S.concept(full, level));
        put($view.find('.js-mistakes'), S.mistakes(full, level));
        put($view.find('.js-interview'), S.interview(full, level, showAll) || S.interview(full, level, true));
        $view.find('.js-iv-note').text(showAll ? 'Showing every level.' : 'Showing ' + level + ' questions.');
      };
      $view.on('click', '.js-all-levels', function () {
        showAll = !showAll;
        $(this).attr('aria-pressed', showAll).text(showAll ? 'Show only my level' : 'Show all levels');
        paintLevel(true);
      });
      paintLevel(false);
      return topic.title;
    },
  };
})(window.Atlas, jQuery);
