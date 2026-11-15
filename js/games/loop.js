/* Level 1 — The Loop. The player IS the model: pick an action, see the observation, repeat. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;
  var PHASES = [['think', '🧠', 'Think'], ['act', '🛠️', 'Act'], ['observe', '👀', 'Observe']];
  var OOPS = {
    guess: '🙈 That\'s a guess! Look before you answer.',
    wrong: '❌ That\'s not what you observed.',
    repeat: '♻️ Same call, same result. Wasted step.'
  };

  Games.loop = function (root, api) {
    var cfg = C.LOOP, run = E.loopNew(), busy = false, phaseEls = {};

    var ring = h('div', { class: 'ring', role: 'img', 'aria-label': 'The agent loop: think, act, observe, repeat' });
    PHASES.forEach(function (p, i) {
      if (i) ring.appendChild(h('span', { class: 'ring-arrow', text: '→' }));
      phaseEls[p[0]] = h('span', { class: 'phase' }, h('span', { class: 'phase-icon', text: p[1] }), p[2]);
      ring.appendChild(phaseEls[p[0]]);
    });
    ring.appendChild(h('span', { class: 'ring-arrow', text: '↺' }));

    var counter = h('span', { class: 'pill' });
    var empty = h('li', { class: 'log-empty', text: 'Your steps will appear here.' });
    var log = h('ol', { class: 'log', 'aria-label': 'Steps so far' }, empty);
    var buttons = cfg.actions.map(function (a) {
      return h('button', { class: 'action' + (a.final ? ' final' : ''), type: 'button', onclick: function (e) { pick(a, e.currentTarget); } },
        h('span', { 'aria-hidden': 'true', text: a.icon }), h('code', { text: a.label }));
    });

    function setPhase(name) {
      Object.keys(phaseEls).forEach(function (k) { phaseEls[k].classList.toggle('on', k === name); });
    }
    function setDisabled(off) { buttons.forEach(function (b) { b.disabled = off; }); }
    function showCount() { counter.textContent = 'Steps ' + run.steps + ' · best ' + cfg.par; }

    function pick(a, btn) {
      if (busy || run.won) return;
      busy = true; setDisabled(true);
      api.sfx('tap');
      var res = E.loopAct(cfg, run, a.id);
      run = res.run;
      var good = res.kind === 'obs' || res.kind === 'win';
      var obs = h('p', { class: 'obs' });
      empty.remove();
      log.appendChild(h('li', { class: 'step' },
        h('p', { class: 'act' }, h('span', { 'aria-hidden': 'true', text: a.icon + ' ' }), h('code', { text: a.label })), obs));
      setPhase('act'); showCount();

      api.later(function () {
        setPhase('observe');
        obs.textContent = res.kind === 'obs' ? '👀 ' + a.obs : res.kind === 'win' ? '🎉 Correct — and you checked first.' : OOPS[res.kind];
        obs.classList.add('show', good ? 'good' : 'bad');
        api.sfx(good ? 'good' : 'bad');
        api.say(res.kind === 'win' ? 'That\'s the whole loop!' : good ? a.obs + ' — what next?' : 'Oops. An agent checks, then answers.', good ? 'happy' : 'oops');
        api.later(function () {
          if (run.won) { api.done(E.loopStars(cfg, run.steps)); return; }
          setPhase('think'); busy = false; setDisabled(false);
          if (document.activeElement === document.body) btn.focus();
        }, 650);
      }, 450);
    }

    setPhase('think'); showCount();
    root.appendChild(h('div', { class: 'game narrow' },
      h('div', { class: 'task' }, h('span', { class: 'task-tag', text: '🎯 Goal' }), h('p', { text: cfg.goal })),
      h('div', { class: 'row between' }, ring, counter),
      log,
      h('h2', { class: 'label', text: 'Your move' }),
      h('div', { class: 'actions' }, buttons)));
  };
})();
