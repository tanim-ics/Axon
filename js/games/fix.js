/* Fix — "fix the trace". A broken agent run is shown step by step.
   Round A: tap the first step where the agent made a mistake. Round B: pick what would fix it.
   Every slip (a wrong tap or a wrong fix) costs stars; the fix answer also feeds the spaced review. */
(function () {
  'use strict';
  var h = UI.h, E = Engine, C = Content;

  Games.fix = function (root, api) {
    var cases = api.level.cases, i = 0, slips = 0;

    function show() {
      var c = cases[i], last = i === cases.length - 1, found = false, answered = false;
      var heading = h('h2', { class: 'label', tabindex: '-1', text: 'Tap the first step where the agent made a mistake' });
      var panel = h('div', { class: 'fix-panel' });

      var steps = c.steps.map(function (s, k) {
        var kind = C.TRACE_KINDS[s.k];
        var b = h('button', { class: 'tstep k-' + s.k, type: 'button', onclick: function () { tap(k, b); } },
          h('span', { class: 'tstep-n', 'aria-hidden': 'true', text: k + 1 }),
          h('span', { class: 'tstep-kind' }, h('span', { 'aria-hidden': 'true', text: kind.icon + ' ' }), kind.name),
          h('span', { class: 'tstep-text', text: s.t }));
        return b;
      });

      function tap(k, b) {
        if (found) return;
        if (!E.fixPick(c, k)) {
          slips++;
          b.disabled = true;
          b.classList.add('cleared');
          var open = steps.filter(function (x) { return !x.disabled; });
          if (open.length) open[0].focus();
          UI.shake(b);
          api.sfx('bad');
          api.say('That step is not the agent\'s mistake. Where did it first go wrong?', 'oops');
          return;
        }
        found = true;
        steps.forEach(function (x) { if (x !== b) x.disabled = true; });
        b.classList.add('culprit');
        b.setAttribute('aria-label', 'Bug found: ' + c.steps[k].t);
        api.sfx('good');
        api.say('Found it. Now, what would fix it?', 'happy');
        repair();
      }

      function repair() {
        var options = E.fixOptions(c, Math.random);
        var why = h('div', { class: 'why', role: 'status' });
        var question = h('h2', { class: 'question', tabindex: '-1', text: 'What fixes it?' });
        var marks = [];
        var buttons = options.map(function (o) {
          var mark = h('span', { class: 'answer-mark' });
          marks.push(mark);
          var b = h('button', { class: 'answer', type: 'button', onclick: function () { pick(o, b); } },
            h('span', { class: 'answer-text', text: o.text }), mark);
          return b;
        });

        function pick(o, chosen) {
          if (answered) return;
          answered = true;
          if (!o.correct) slips++;
          buttons.forEach(function (b, k) {
            b.disabled = true;
            if (options[k].correct) { b.classList.add('right'); marks[k].textContent = '✓ The fix'; }
            else if (b === chosen) { b.classList.add('wrong'); marks[k].textContent = '✗ Your pick'; }
          });
          api.answer({ concept: c.concept }, o.correct);
          api.sfx(o.correct ? 'good' : 'bad');
          api.say(o.correct ? 'Fixed. On to the next run.' : 'Not that one. Read the why: it comes back tomorrow.', o.correct ? 'happy' : 'oops');
          var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
            i++;
            if (last) api.done(E.fixStars(slips)); else { api.say('A new run. Read the trail.', 'idle'); show(); }
          } }, last ? '🏁 Finish' : 'Next run');
          UI.fill(why, h('span', { class: 'eyebrow', text: 'Why' }), h('p', { text: c.why }), next);
          why.classList.add('shown');
          next.focus();
        }

        UI.fill(panel,
          h('span', { class: 'eyebrow', text: '🐛 ' + c.bug }),
          question,
          h('div', { class: 'answers' }, buttons),
          why);
        question.focus();
      }

      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(cases.length, i),
        h('div', { class: 'chat' }, h('div', { class: 'msg from-user' }, h('p', { text: '🧑 ' + c.ask }))),
        heading,
        h('ol', { class: 'trace' }, steps.map(function (b) { return h('li', null, b); })),
        panel));
      if (i > 0) heading.focus(); /* the old case was removed: move focus to the new one */
    }

    show();
  };
})();
