/* Sim — the run simulator. The learner sets a few design choices, presses Run and watches the
   agent work through its steps. A wrong choice stops the run at the step it affects, with what
   happened and why. Change it, run again. Fewer runs, more stars. */
(function () {
  'use strict';
  var h = UI.h, E = Engine, C = Content;
  var KINDS = { think: ['🧠', 'Think'], act: ['🛠️', 'Act'], obs: ['👀', 'Observe'], answer: ['✅', 'Answer'] };
  var STEP_MS = 520;

  Games.sim = function (root, api) {
    var sim = api.level.sim, choices = {}, runs = 0, busy = false;

    var trace = h('ol', { class: 'sim-trace', 'aria-label': 'The run, step by step', 'aria-live': 'polite' });
    var verdict = h('div', { class: 'why', role: 'status' });
    var counter = h('span', { class: 'pill' });
    var runBtn = h('button', { class: 'btn primary', type: 'button', onclick: run }, '▶ Run the agent');
    var slotEls = {};

    var slots = sim.slots.map(function (sl) {
      var buttons = sl.options.map(function (o) {
        var b = h('button', { class: 'chip sim-opt', type: 'button', 'aria-pressed': 'false', onclick: function () {
          if (busy) return;
          choices[sl.id] = o.id;
          buttons.forEach(function (x, k) { UI.setPressed(x, sl.options[k].id === o.id); });
          api.sfx('tap');
          wrap.classList.remove('flag');
          refresh();
        } }, o.name);
        return b;
      });
      var wrap = h('fieldset', { class: 'sim-slot' },
        h('legend', null, h('span', { 'aria-hidden': 'true', text: sl.icon + ' ' }), sl.label),
        h('div', { class: 'chips' }, buttons));
      slotEls[sl.id] = { wrap: wrap, buttons: buttons };
      return wrap;
    });

    function refresh() {
      runBtn.disabled = busy || !E.simReady(sim, choices);
      Object.keys(slotEls).forEach(function (id) { slotEls[id].buttons.forEach(function (b) { b.disabled = busy; }); });
      counter.textContent = runs ? 'Runs: ' + runs : 'Not run yet';
    }

    function stepNode(st, n) {
      var kind = KINDS[st.k] || KINDS.act;
      return h('li', { class: 'sstep ' + (st.ok ? 'ok' : 'bad') },
        h('span', { class: 'sstep-n', 'aria-hidden': 'true', text: String(n) }),
        h('span', { class: 'sstep-body' },
          h('span', { class: 'sstep-kind' }, h('span', { 'aria-hidden': 'true', text: kind[0] + ' ' }), kind[1],
            h('span', { class: 'sstep-mark', text: st.ok ? '' : ' · ✗ went wrong' })),
          h('span', { class: 'sstep-text', text: st.t })));
    }

    function run() {
      if (busy || !E.simReady(sim, choices)) return;
      busy = true; runs++;
      var res = E.simRun(sim, choices);
      UI.fill(trace);
      UI.fill(verdict); verdict.classList.remove('shown');
      Object.keys(slotEls).forEach(function (id) { slotEls[id].wrap.classList.remove('flag'); });
      refresh();
      api.say('Running…', 'idle');
      var stepMs = UI.reducedMotion() ? 0 : STEP_MS; /* reduced motion: the whole run at once */
      res.steps.forEach(function (st, i) {
        api.later(function () {
          var node = stepNode(st, i + 1);
          trace.appendChild(node);
          node.scrollIntoView({ block: 'nearest' }); /* on a phone the trace starts below the fold: follow it */
          api.sfx(st.ok ? 'tap' : 'bad');
        }, i * stepMs);
      });
      api.later(function () { finish(res); }, res.steps.length * stepMs + 150);
    }

    function finish(res) {
      busy = false;
      sim.slots.forEach(function (sl) {
        if (!sl.concept) return;
        if (res.ok) api.answer({ concept: sl.concept }, true);
        else if (sl.id === res.slot) api.answer({ concept: sl.concept }, false);
      });
      refresh();
      if (res.ok) {
        var stars = E.simStars(runs);
        var done = h('button', { class: 'btn primary', type: 'button', onclick: function () { api.done(stars); } }, '🏁 Finish');
        UI.fill(verdict,
          h('span', { class: 'eyebrow', text: 'The run succeeded' }),
          h('p', { text: runs === 1 ? 'Every choice held up on the first run.' : 'It took ' + runs + ' runs. Each failure showed which choice mattered.' }),
          done);
        verdict.classList.add('shown');
        runBtn.disabled = true;
        api.sfx('good');
        api.say('It works, end to end.', 'happy');
        done.focus();
        return;
      }
      var slot = sim.slots.filter(function (sl) { return sl.id === res.slot; })[0];
      var change = h('button', { class: 'btn', type: 'button', onclick: function () {
        var target = slotEls[res.slot];
        target.wrap.scrollIntoView({ block: 'center' });
        target.buttons[0].focus();
      } }, 'Change "' + slot.label + '"');
      UI.fill(verdict,
        h('span', { class: 'eyebrow', text: 'Why the run stopped at step ' + (res.failedAt + 1) }),
        h('p', { text: res.why }),
        change);
      verdict.classList.add('shown');
      slotEls[res.slot].wrap.classList.add('flag');
      api.say('It broke at step ' + (res.failedAt + 1) + '. One choice caused it.', 'oops');
      change.focus();
    }

    refresh();
    UI.fill(root, h('div', { class: 'game narrow' },
      h('div', { class: 'task' }, h('span', { class: 'task-tag', text: '🎯 The job' }), h('p', { text: sim.task })),
      h('h2', { class: 'label', text: 'Your design' }),
      slots,
      h('div', { class: 'row between' }, runBtn, counter),
      trace,
      verdict));
  };
})();
