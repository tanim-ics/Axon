/* Order — tap the steps of a process in the right order. A wrong tap costs a star, not the run. */
(function () {
  'use strict';
  var h = UI.h, E = Engine;

  Games.order = function (root, api) {
    var P = api.level.puzzle, steps = P.steps;
    var pool = E.shuffle(steps, Math.random), placed = 0, mistakes = 0;

    function show(focusFirst) {
      var doneList = h('ol', { class: 'order-done', 'aria-label': 'Steps in order so far' },
        steps.slice(0, placed).map(function (s, i) {
          return h('li', { class: 'ostep placed' },
            h('span', { class: 'ostep-n', 'aria-hidden': 'true', text: String(i + 1) }),
            h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }), s.text);
        }));
      var finished = placed === steps.length;
      var buttons = pool.map(function (s) {
        var b = h('button', { class: 'ostep', type: 'button', onclick: function () { tap(s, b); } },
          h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }), s.text);
        return b;
      });
      var tail;
      if (finished) {
        var fin = h('button', { class: 'btn primary', type: 'button', onclick: function () { api.done(E.starsFromMistakes(mistakes)); } }, 'Finish');
        tail = h('div', { class: 'why shown', role: 'status' },
          h('span', { class: 'eyebrow', text: 'Why this order' }), h('p', { text: P.why }), fin);
        api.say('That is the loop.', 'happy');
      } else {
        tail = h('div', { class: 'order-pool', role: 'group', 'aria-label': 'Which step comes next?' },
          h('p', { class: 'order-ask', text: placed ? 'What comes next?' : 'What comes first?' }), buttons);
      }
      UI.fill(root, h('div', { class: 'game narrow' }, doneList, tail));
      if (finished) fin.focus(); else if (focusFirst && buttons.length) buttons[0].focus();
    }

    function tap(s, btn) {
      if (E.orderRight(steps, placed, s.id)) {
        placed++;
        pool = pool.filter(function (x) { return x !== s; });
        api.sfx('good');
        api.say('Yes.', 'happy');
        show(true);
      } else {
        mistakes++;
        api.sfx('bad');
        api.say('Not yet. What has to happen before that?', 'oops');
        UI.shake(btn);
      }
    }

    show(false);
  };
})();
