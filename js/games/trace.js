/* Level 7 — Trace Detective. Read a run's trace and tap the first step that went wrong. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.trace = function (root, api) {
    var round = 0, mistakes = 0;

    function render() {
      var t = C.TRACES[round], solved = false;
      var verdict = h('div', { class: 'verdict', role: 'status' });
      var last = round === C.TRACES.length - 1;

      var steps = t.steps.map(function (s, i) {
        var kind = C.TRACE_KINDS[s.k];
        var b = h('button', { class: 'tstep k-' + s.k, type: 'button', onclick: function () {
          if (solved) return;
          if (!s.bad) {
            mistakes++;
            b.disabled = true;
            b.classList.add('cleared');
            steps.filter(function (x) { return !x.disabled; })[0].focus();
            UI.shake(b);
            api.sfx('bad');
            api.say('That step is fine. Where did it first go wrong?', 'oops');
            return;
          }
          solved = true;
          steps.forEach(function (x) { if (x !== b) { x.disabled = true; x.classList.add('kept'); } });
          b.classList.add('culprit');
          b.setAttribute('aria-label', 'Bug found: ' + s.t);
          api.sfx('good');
          api.say('Got it! Bug caught.', 'happy');
          var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
            round++;
            if (last) api.done(E.starsFromMistakes(mistakes)); else { api.say('New case. Read the trail.', 'idle'); render(); }
          } }, last ? '🏁 Finish' : 'Next case ▶');
          UI.fill(verdict, 
            h('p', { class: 'verdict-bug', text: '🐛 ' + t.bug }),
            h('p', { text: t.why }),
            h('p', { class: 'verdict-fix', text: '🔧 Fix: ' + t.fix }),
            h('div', { class: 'cta-row' }, next));
          next.focus();
        } },
          h('span', { class: 'tstep-n', 'aria-hidden': 'true', text: i + 1 }),
          h('span', { class: 'tstep-kind' }, h('span', { 'aria-hidden': 'true', text: kind.icon + ' ' }), kind.name),
          h('span', { class: 'tstep-text', text: s.t }));
        return h('li', null, b);
      });
      var buttons = steps.map(function (li) { return li.firstChild; });
      steps = buttons;

      var heading = h('h2', { class: 'label', tabindex: '-1', text: 'Trace — tap the first wrong step' });
      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(C.TRACES.length, round),
        h('div', { class: 'chat' }, h('div', { class: 'msg from-user' }, h('p', { text: '🧑 ' + t.q }))),
        heading,
        h('ol', { class: 'trace' }, buttons.map(function (b) { return b.parentNode; })),
        verdict));
      if (round > 0) heading.focus();
    }

    render();
  };
})();
