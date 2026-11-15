/* Recall — one question game for daily review, the Arena and Mix levels.
   api.questions come from Engine.buildSession; every answer shows why, right or wrong. */
(function () {
  'use strict';
  var h = UI.h;

  Games.recall = function (root, api) {
    var qs = api.questions, i = 0, right = 0;
    if (!qs.length) { /* nothing to ask: say so instead of crashing */
      UI.fill(root, h('div', { class: 'intro' }, h('h2', { text: 'No questions here yet.' })));
      return;
    }

    function show() {
      var q = qs[i], answered = false, last = i === qs.length - 1;
      var why = h('div', { class: 'why', role: 'status' });
      var heading = h('h2', { class: 'question', tabindex: '-1', text: q.q });
      var marks = [];
      var buttons = q.options.map(function (o) {
        var mark = h('span', { class: 'answer-mark' });
        marks.push(mark);
        var b = h('button', { class: 'answer', type: 'button', onclick: function () { pick(o, b); } },
          h('span', { class: 'answer-text', text: o.text }), mark);
        return b;
      });

      function pick(o, chosen) {
        if (answered) return;
        answered = true;
        if (o.correct) right++;
        buttons.forEach(function (b, k) {
          b.disabled = true;
          if (q.options[k].correct) { b.classList.add('right'); marks[k].textContent = '✓ Right answer'; }
          else if (b === chosen) { b.classList.add('wrong'); marks[k].textContent = '✗ Your pick'; }
        });
        api.answer(q, o.correct);
        api.sfx(o.correct ? 'good' : 'bad');
        api.say(o.correct ? 'Yes. That one stuck.' : 'Not quite. Read the why: it comes back tomorrow.', o.correct ? 'happy' : 'oops');
        var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
          i++;
          if (last) api.end(right, qs.length); else show();
        } }, last ? 'Finish' : 'Next');
        UI.fill(why,
          h('span', { class: 'eyebrow', text: 'Why · ' + api.conceptName(q.concept) }),
          h('p', { text: q.why }), next);
        why.classList.add('shown');
        next.focus();
      }

      UI.fill(root, h('div', { class: 'game narrow' },
        api.header ? api.header() : null,
        UI.dots(qs.length, i),
        heading,
        h('div', { class: 'answers' }, buttons),
        why));
      heading.focus(); /* the old question was removed: move keyboard and screen-reader focus to the new one */
    }

    show();
  };

  /* Case — a boss level: one scenario, a run of decisions that each need a different lesson. */
  Games.case = function (root, api) {
    Games.quiz(root, api, Engine.caseQuestions(api.level), function () {
      return h('div', { class: 'card case-brief' },
        h('span', { class: 'eyebrow', text: 'The case' }), h('p', { text: api.level.brief }));
    });
  };

  /* Quiz — a level made of questions: its own ideas plus a mix of earlier ones. */
  Games.quiz = function (root, api, questions, header) {
    Games.recall(root, {
      header: header || null,
      questions: questions || Engine.levelQuestions(Content, api.level),
      say: api.say, sfx: api.sfx, later: api.later, conceptName: api.conceptName, answer: api.answer,
      end: function (right, total) {
        var stars = Engine.quizStars(right, total);
        if (stars) { api.done(stars); return; }
        api.say('Not cleared yet. The whys you just read will help.', 'oops');
        var again = h('button', { class: 'btn primary big', type: 'button', onclick: function () { (api.level.game === 'case' ? Games.case : Games.quiz)(root, api); } }, 'Try again');
        UI.fill(root, h('div', { class: 'intro' },
          h('div', { class: 'intro-icon', 'aria-hidden': 'true', text: '🔁' }),
          h('h2', { text: right + ' / ' + total + ' right' }),
          h('p', { text: 'You need 60% to clear this level. The questions are reshuffled each time.' }),
          again));
        again.focus();
      }
    });
  };
})();
