/* Blitz — the timed Arena. One question after another until the clock runs out.
   A right answer scores a point. A wrong one costs Engine.BLITZ.penalty seconds and shows the right
   answer for a moment. The clock is paused while that feedback is on screen.
   api: more() -> a fresh batch of questions, answer(q, correct), end(right, total, misses), say, sfx, later. */
(function () {
  'use strict';
  var h = UI.h, E = Engine;
  var TICK_MS = 200, RIGHT_MS = 450, WRONG_MS = 1400;

  Games.blitz = function (root, api) {
    var B = E.BLITZ, full = B.seconds * 1000;
    var left = full, last = null, paused = false, over = false;
    var queue = [], right = 0, total = 0, streak = 0, misses = [];

    var fill = h('div', { class: 'blitz-fill' });
    var bar = h('div', { class: 'blitz-bar', 'aria-hidden': 'true' }, fill);
    var clock = h('span', { class: 'blitz-clock', role: 'timer', 'aria-label': 'Seconds left' });
    var score = h('span', { class: 'pill blitz-score' });
    var combo = h('span', { class: 'blitz-combo', 'aria-hidden': 'true' });
    var slot = h('div', { class: 'blitz-q' });

    function draw() {
      var ms = Math.max(0, left);
      fill.style.width = (ms / full * 100) + '%';
      clock.textContent = Math.ceil(ms / 1000) + 's';
      bar.classList.toggle('low', ms < 10000);
      score.textContent = '✓ ' + right;
      score.setAttribute('aria-label', right + ' right so far');
      combo.textContent = streak >= 2 ? '🔥 ×' + streak : '';
    }

    function tick() {
      if (over) return;
      var now = Date.now();
      if (!paused && last !== null) left -= now - last;
      last = now;
      draw();
      if (left <= 0 && !paused) { finish(); return; }
      api.later(tick, TICK_MS);
    }

    function finish() {
      if (over) return;
      over = true;
      api.end(right, total, misses);
    }

    function next() {
      if (over) return;
      if (!queue.length) queue = api.more();
      if (!queue.length) { finish(); return; }
      var q = queue.shift(), answered = false;
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
        if (answered || over) return;
        answered = true; paused = true; total++;
        buttons.forEach(function (b, k) {
          b.disabled = true;
          if (q.options[k].correct) { b.classList.add('right'); marks[k].textContent = '✓'; }
          else if (b === chosen) { b.classList.add('wrong'); marks[k].textContent = '✗'; }
        });
        api.answer(q, o.correct);
        if (o.correct) {
          right++; streak++;
          api.sfx('good');
          api.say(streak >= 3 ? streak + ' in a row!' : 'Right.', 'happy');
        } else {
          streak = 0;
          left -= B.penalty * 1000;
          var good = q.options.filter(function (x) { return x.correct; })[0];
          misses.push({ q: q.q, a: good.text, why: q.why });
          api.sfx('bad');
          api.say('−' + B.penalty + ' seconds. The green one was right.', 'oops');
        }
        draw();
        api.later(function () {
          paused = false;
          last = Date.now();
          if (left <= 0) finish(); else next();
        }, o.correct ? RIGHT_MS : WRONG_MS);
      }

      UI.fill(slot, heading, h('div', { class: 'answers' }, buttons));
      heading.focus(); /* the old question was removed: move keyboard and screen-reader focus to the new one */
    }

    UI.fill(root, h('div', { class: 'game narrow' },
      h('div', { class: 'blitz-top' }, clock, bar, combo, score),
      slot));
    draw();
    next();
    tick();
  };
})();
