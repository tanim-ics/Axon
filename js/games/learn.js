/* Learn — the first level of every course lesson: key-lesson cards with a diagram each,
   then one question per idea. The full lesson text is one tap away (the reader). */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.learn = function (root, api) {
    var L = api.level, cards = L.cards, i = 0;

    function show(focus) {
      var c = cards[i], last = i === cards.length - 1;
      var title = h('h2', { tabindex: '-1', text: c.title });
      var back = h('button', { class: 'btn', type: 'button', disabled: i === 0, onclick: function () { i--; UI.sfx('tap'); show('title'); } }, 'Back');
      var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
        UI.sfx('tap');
        if (last) check(); else { i++; show('next'); }
      } }, last ? 'Quick check' : 'Next');
      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(cards.length, i),
        h('article', { class: 'card lcard' },
          h('span', { class: 'lcard-icon', 'aria-hidden': 'true', text: c.icon }),
          title,
          h('p', { text: c.text }),
          UI.diagram(c.visual)),
        h('div', { class: 'cta-row' }, back, next),
        L.read ? h('a', { class: 'read-link', href: '#/read/' + L.read }, '📖 Read the full lesson instead') : null));
      api.say(last ? 'Last card. Then three quick questions.' : 'Card ' + (i + 1) + ' of ' + cards.length + '.', 'idle');
      if (focus === 'next') next.focus();
      else if (focus === 'title') title.focus();
    }

    function check() {
      var mistakes = 0;
      api.say('No peeking. One question per idea.', 'idle');
      Games.recall(root, {
        questions: E.buildQuestions(C, L.concepts),
        say: api.say, sfx: api.sfx, later: api.later, conceptName: api.conceptName,
        answer: function (q, ok) { if (!ok) mistakes++; api.answer(q, ok); },
        end: function () { api.done(E.starsFromMistakes(mistakes)); }
      });
    }

    show(null);
  };
})();
