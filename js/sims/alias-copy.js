/* Alias vs copy: two names, one list or two lists. Shows why mutating through one name can change the other. */
(function (A) {
  const NAME = [{ x: 70, y: 50 }, { x: 70, y: 130 }];
  const OBJ = [{ x: 330, y: 50 }, { x: 330, y: 130 }];
  const SAY = {
    intro: {
      beginner: 'A variable is a label stuck on a box, not the box itself. "b = a" puts a second label on the same box.',
      intermediate: 'Assignment binds a name to an object. "b = a" copies the reference, so both names reach the same list. A slice or .copy() makes a new list.',
      expert: 'In CPython every name holds a pointer to a heap object, and "is" compares identities. Copies are shallow: nested lists are still shared, so use copy.deepcopy when the structure is nested.',
    },
    shared: {
      beginner: 'Both labels are on the same box, so adding through b changed what a sees too.',
      intermediate: 'a and b are the same object, so the append is visible through both. This is the classic aliasing surprise (and the cause of the mutable default argument bug).',
      expert: 'Passing a list to a function aliases it too: the callee can mutate your data. Document ownership, or copy at the boundary.',
    },
    own: {
      beginner: 'b got its own box, so changing b left a alone.',
      intermediate: 'b is a separate list, so the append only affects b. The copy is shallow, so any inner lists would still be shared.',
      expert: 'A shallow copy costs O(n) time and memory. For nested data, deep copies cost more and can break on objects holding locks or sockets.',
    },
  };

  function draw(ctx) {
    const s = ctx.s;
    const alias = ctx.param('mode') === 'Alias (b = a)';
    s.b = alias ? s.a : s.own;
    A.simviz.setBox(s.o[0], 'list ' + JSON.stringify(s.a), 'object 1');
    A.simviz.setBox(s.o[1], alias ? '(unused)' : 'list ' + JSON.stringify(s.own), alias ? '' : 'object 2');
    s.o[1].toggleClass('is-dim', alias);
    s.l2.attr({ x2: OBJ[alias ? 0 : 1].x - 70, y2: OBJ[alias ? 0 : 1].y });
    ctx.metric('same', alias ? 'True' : 'False', alias ? 'warn' : 'ok');
    ctx.metric('a', JSON.stringify(s.a));
    ctx.metric('b', JSON.stringify(s.b));
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 190, 'Names pointing at lists');
    S.box($svg, NAME[0].x, NAME[0].y, 70, 40, 'a', '', 'is-active');
    S.box($svg, NAME[1].x, NAME[1].y, 70, 40, 'b', '', 'is-active');
    S.link($svg, { x: 105, y: 50 }, { x: 260, y: 50 }, 'is-live');
    const l2 = S.link($svg, { x: 105, y: 130 }, { x: 260, y: 50 }, 'is-live');
    const o = OBJ.map((p, i) => S.box($svg, p.x, p.y, 140, 48, '', '', i ? 'is-dim' : ''));
    const a = [1, 2];
    ctx.s = { a, own: a.slice(), o, l2 };
    draw(ctx);
  }

  A.sims.register('alias-copy', {
    title: 'Alias vs copy: who sees the change?',
    note: 'a = [1, 2]. Pick how b is made, then run b.append(3) and look at a.',
    intro: SAY.intro,
    controls: [{ id: 'mode', label: 'How b is made', type: 'select', value: 'Alias (b = a)', options: ['Alias (b = a)', 'Copy (b = a[:])'] }],
    actions: [{ id: 'append', label: 'Run b.append(3)', icon: 'plus-lg', primary: true }],
    metrics: [{ id: 'same', label: 'a is b' }, { id: 'a', label: 'a' }, { id: 'b', label: 'b' }],
    init: setup,
    onParam(ctx) { ctx.s.a.splice(0, ctx.s.a.length, 1, 2); ctx.s.own = ctx.s.a.slice(); draw(ctx); },
    step(ctx) {
      const alias = ctx.param('mode') === 'Alias (b = a)';
      draw(ctx);
      ctx.s.b.push(ctx.s.b.length + 1);
      draw(ctx);
      ctx.log('b.append(' + ctx.s.b.length + ') → a = ' + JSON.stringify(ctx.s.a) + ', b = ' + JSON.stringify(ctx.s.b), alias ? 'warn' : 'good');
      ctx.say(alias ? SAY.shared : SAY.own);
    },
  });
})(window.Atlas);
