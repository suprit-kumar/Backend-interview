/* Quiz: instant feedback with explanations, score saved per topic. Optional q.level tags which level a question targets. */
(function (A, $) {
  const esc = A.util.esc;

  function html(topic, level, prior) {
    const qs = topic.quiz.map((q, i) => ({ q, i }));
    qs.sort((a, b) => (a.q.level === level ? 0 : 1) - (b.q.level === level ? 0 : 1) || a.i - b.i);
    const cards = qs.map(({ q, i }) => {
      const opts = q.options.map((o, j) =>
        '<label class="quiz-opt"><input type="radio" name="q' + i + '" value="' + j + '"><span>' + A.util.md(o) + '</span></label>').join('');
      const badge = q.level ? '<span class="lvl-badge lvl-' + esc(q.level) + '">' + esc(q.level) + '</span>' : '';
      return '<fieldset class="quiz-q' + (q.level === level ? ' is-for-level' : '') + '" data-i="' + i + '" data-level="' + esc(q.level || '') + '">' +
        '<legend>' + badge + A.util.md(q.q) + '</legend>' + opts + '<div class="quiz-why" hidden role="status"></div></fieldset>';
    }).join('');
    const last = prior ? '<span>Last score: ' + prior.score + ' / ' + prior.total + '</span>' : '<span>Answer each question to see how you did.</span>';
    return cards + '<div class="quiz-score js-score">' + last + '<button type="button" class="btn-ghost js-reset">' + A.util.icon('arrow-counterclockwise') + 'Reset quiz</button></div>';
  }

  A.quiz = {
    render($host, topic, level) {
      let answered = 0;
      let correct = 0;
      const total = topic.quiz.length;
      const paint = () => { answered = 0; correct = 0; $host.html(html(topic, level, A.store.get('quiz', {})[topic.id])); };
      paint();

      $host.on('change', 'input[type=radio]', function () {
        const $q = $(this).closest('.quiz-q');
        if ($q.hasClass('is-locked')) return;
        const q = topic.quiz[+$q.data('i')];
        const pick = +this.value;
        $q.addClass('is-locked').find('input').prop('disabled', true);
        $q.find('.quiz-opt').each(function (j) {
          $(this).toggleClass('is-right', j === q.answerIndex).toggleClass('is-wrong', j === pick && pick !== q.answerIndex);
        });
        $q.find('.quiz-why').prop('hidden', false).html('<strong>' + (pick === q.answerIndex ? 'Correct. ' : 'Not quite. ') + '</strong>' + A.util.md(q.why));
        answered += 1;
        if (pick === q.answerIndex) correct += 1;
        if (answered === total) {
          const scores = A.store.get('quiz', {});
          scores[topic.id] = { score: correct, total, at: Date.now() };
          A.store.set('quiz', scores, true);
          $host.find('.js-score > span').text('Score: ' + correct + ' / ' + total + (correct === total ? '. Perfect.' : '. Review the explanations above.'));
        }
      });
      $host.on('click', '.js-reset', paint);

      return {
        // Re-ranks questions for the new level only while untouched, so answers are never lost.
        setLevel(l) {
          level = l;
          if (answered === 0) paint();
          else $host.find('.quiz-q').each(function () { $(this).toggleClass('is-for-level', $(this).data('level') === l); });
        },
      };
    },
  };
})(window.Atlas, jQuery);
