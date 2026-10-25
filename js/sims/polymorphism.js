/* Polymorphism: the same call, shape.area(), runs different code depending on the real object behind the reference. */
(function (A) {
  const KINDS = ['Circle', 'Rectangle', 'Triangle'];
  const POS = KINDS.map((_, i) => ({ x: 90 + i * 170, y: 130 }));
  const SAY = {
    intro: {
      beginner: 'Ask any shape "what is your area?" and each shape answers in its own way. The caller does not need to know which shape it is.',
      intermediate: 'The variable is typed as Shape, but the method that runs is chosen from the real object at run time (dynamic dispatch).',
      expert: 'Python looks the method up on the object\'s type via the MRO at call time. Statically typed languages use vtables. The benefit is open extension: adding a class needs no change to the caller. The risk is subclasses that break the base contract (see Liskov).',
    },
    ok: {
      beginner: 'Same call, different answer: the object decided how to compute it.',
      intermediate: 'The call shape.area() was routed to the subclass that overrides it.',
      expert: 'The caller depends only on the Shape interface. Keep overrides behaviourally compatible with the base class contract.',
    },
    bad: {
      beginner: 'This shape forgot to provide its own answer, so the call fell back to the generic Shape, which cannot compute it.',
      intermediate: 'Triangle did not override area(), so Python used Shape.area(), which raises NotImplementedError. An abstract base class (abc) would catch this when the object is created.',
      expert: 'With abc.ABC and @abstractmethod, instantiating Triangle fails immediately instead of at the first call, which moves the failure earlier and closer to the cause.',
    },
  };

  function paint(ctx, on, bad) {
    const s = ctx.s;
    A.simviz.tone(s.base, bad ? 'bad' : '', !!bad);
    s.kids.forEach((g, i) => A.simviz.tone(g, !bad && i === on ? 'ok' : '', !bad && i === on));
  }

  function setup(ctx) {
    const S = A.simviz;
    const $svg = S.stage(ctx.$viz, 520, 190, 'Class hierarchy');
    const base = S.box($svg, 260, 40, 150, 44, 'Shape', 'area() raises', '');
    const kids = KINDS.map((k, i) => { S.link($svg, { x: 260, y: 62 }, { x: POS[i].x, y: 108 }, 'is-live'); return S.box($svg, POS[i].x, POS[i].y, 120, 44, k, 'area()', ''); });
    ctx.s = { base, kids };
  }

  A.sims.register('polymorphism', {
    title: 'Polymorphism: one call, many behaviours',
    note: 'Call shape.area() on different objects. Untick the override to see what happens when a subclass forgets.',
    intro: SAY.intro,
    controls: [
      { id: 'kind', label: 'Object behind `shape`', type: 'select', value: 'Circle', options: KINDS },
      { id: 'size', label: 'Size', type: 'range', min: 1, max: 10, value: 3 },
      { id: 'over', label: 'Triangle overrides area()', type: 'toggle', value: true },
    ],
    actions: [{ id: 'call', label: 'Call shape.area()', icon: 'play-fill', primary: true }],
    metrics: [{ id: 'ran', label: 'Method that ran' }, { id: 'result', label: 'Result' }],
    init: setup,
    step(ctx) {
      const k = ctx.param('kind');
      const r = ctx.param('size');
      const missing = k === 'Triangle' && !ctx.param('over');
      const val = { Circle: (Math.PI * r * r).toFixed(2), Rectangle: (r * (r + 1)).toFixed(2), Triangle: (0.5 * r * r).toFixed(2) }[k];
      paint(ctx, KINDS.indexOf(k), missing);
      ctx.metric('ran', missing ? 'Shape.area' : k + '.area', missing ? 'bad' : 'ok');
      ctx.metric('result', missing ? 'NotImplementedError' : val, missing ? 'bad' : '');
      ctx.log(missing ? 'shape.area() → NotImplementedError (not overridden)' : 'shape.area() on ' + k + ' (size ' + r + ') → ' + val, missing ? 'bad' : 'good');
      ctx.say(missing ? SAY.bad : SAY.ok);
    },
  });
})(window.Atlas);
