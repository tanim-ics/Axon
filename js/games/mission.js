/* Field missions — one data-driven game for every real-world use case in Content.MISSIONS.
   Round 1: put the stages in order. Round 2: give each stage its popular tool.
   Round 3: choose the stage that must wait for a human. */
(function () {
  'use strict';
  var h = UI.h, E = Engine;
  var ROUNDS = ['Order the pipeline', 'Pick the tool for each step', 'Where must a human approve?'];

  function shuffled(list) {
    var a = list.slice();
    for (var tries = 0; tries < 8; tries++) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = a[i];
        a[i] = a[j]; a[j] = t;
      }
      if (a.some(function (x, k) { return x !== list[k]; })) break; /* never hand out the solved order */
    }
    return a;
  }

  Games.mission = function (root, api) {
    var M = api.level, stages = M.stages, n = stages.length;
    var ids = stages.map(function (s) { return s.id; });
    var round = 0, mistakes = 0, busy = false, solved = false;
    var placed, pool;

    function stage(id) { return stages[ids.indexOf(id)]; }
    function resetRound() {
      placed = ids.map(function () { return null; });
      pool = shuffled(ids);
    }
    function nextEmpty() { return placed.indexOf(null); }

    function slot(i) {
      var id = placed[i];
      if (!id) {
        return h('span', { class: 'mslot hole' + (i === nextEmpty() ? ' next' : '') },
          h('span', { class: 'sr', text: 'Empty' }), h('span', { 'aria-hidden': 'true', text: '?' }));
      }
      var s = stage(id), label = round === 0 ? s.name : s.tool;
      return h('button', { class: 'mslot filled', type: 'button', disabled: busy, 'aria-label': 'Remove ' + label, onclick: function () {
        placed[i] = null; api.sfx('tap'); render('.palette .chip:not([disabled])');
      } }, round === 0 ? h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }) : null, label);
    }

    function row(i) {
      var s = stages[i];
      var num = h('span', { class: 'mrow-n', 'aria-hidden': 'true', text: i + 1 });
      if (round === 0) return h('li', { class: 'mrow' }, num, slot(i));
      if (round === 1) {
        return h('li', { class: 'mrow' }, num,
          h('span', { class: 'mstage' }, h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }), s.name),
          h('span', { class: 'marrow', 'aria-hidden': 'true', text: '→' }), slot(i));
      }
      var isGate = solved && s.id === M.gate;
      var body = [num,
        h('span', { class: 'mstage' }, h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }), s.name),
        h('span', { class: 'mtool' }, s.tool, h('small', { text: 'or ' + s.also.join(', ') })),
        isGate ? h('span', { class: 'mgate', text: '🙋 Human approves' }) : null];
      if (solved) return h('li', { class: 'mrow done' + (isGate ? ' gate' : '') }, body);
      return h('li', { class: 'mrow' }, h('button', { class: 'mpick', type: 'button', 'data-stage': s.id, onclick: function (e) { pickGate(s, e.currentTarget); } }, body));
    }

    function palette() {
      var open = nextEmpty() !== -1;
      return pool.map(function (id) {
        var s = stage(id), used = placed.indexOf(id) !== -1;
        return h('button', { class: 'chip', type: 'button', disabled: busy || used || !open, onclick: function () {
          placed[nextEmpty()] = id; api.sfx('tap');
          render('.palette .chip:not([disabled]), .cta-row .btn');
        } }, round === 0
          ? [h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: s.icon }), h('span', { class: 'chip-text' }, s.name, h('small', { text: s.does }))]
          : h('span', { class: 'chip-text' }, s.tool, h('small', { text: 'popular for…?' })));
      });
    }

    function render(focusSel) {
      var rows = [];
      for (var i = 0; i < n; i++) rows.push(row(i));
      var cta = null;
      if (round < 2) {
        cta = h('button', { class: 'btn primary', type: 'button', disabled: busy || nextEmpty() !== -1, onclick: check },
          round === 0 ? '▶ Check order' : '▶ Check tools');
      } else if (solved) {
        cta = h('button', { class: 'btn primary', type: 'button', disabled: busy, onclick: function () { api.done(E.starsFromMistakes(mistakes)); } }, '🏁 Finish');
      }
      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(ROUNDS.length, round),
        h('div', { class: 'task' }, h('span', { class: 'task-tag', text: M.icon + ' ' + M.idea }), h('p', { tabindex: '-1', text: ROUNDS[round] })),
        h('ol', { class: 'mrows' }, rows),
        round < 2 ? [h('h2', { class: 'label', text: round === 0 ? 'Steps' : 'Tools' }), h('div', { class: 'chips palette' }, palette())] : null,
        solved ? h('p', { class: 'mwhy', text: '🙋 ' + M.gateWhy }) : null,
        cta ? h('div', { class: 'cta-row' }, cta) : null));
      var target = focusSel && root.querySelector(focusSel);
      if (target) target.focus();
    }

    function check() {
      if (busy) return;
      var res = E.checkSequence(stages, placed);
      if (!res.ok) {
        mistakes++;
        res.wrong.forEach(function (i) { placed[i] = null; });
        api.sfx('bad');
        api.say(res.wrong.length + ' bounced back. ' +
          (round === 0 ? 'What has to exist before the next step can start?' : 'Read the step: what job is it?'), 'oops');
        render('.palette .chip:not([disabled])');
        UI.shake(root.querySelector('.mrows'));
        return;
      }
      busy = true;
      api.sfx('good');
      api.say(round === 0 ? '✅ That\'s the pipeline. Now give each step its tool.' : '✅ That\'s a real stack. One last thing…', 'happy');
      render('.task p'); /* the buttons are off for a moment: keep focus in the level */
      api.later(function () {
        round++; busy = false;
        if (round === 1) resetRound();
        api.say(round === 1 ? 'Tap a tool for the glowing step.' : 'Tap the step that must wait for a human.', 'idle');
        render(round === 1 ? '.palette .chip:not([disabled])' : '.mpick');
      }, 1100);
    }

    function pickGate(s, btn) {
      if (busy || solved) return;
      if (s.id !== M.gate) {
        mistakes++;
        btn.disabled = true;
        var others = root.querySelectorAll('.mpick:not([disabled])');
        if (others.length) others[0].focus();
        UI.shake(btn);
        api.sfx('bad');
        api.say('That step is safe to automate. Which one can\'t be undone?', 'oops');
        return;
      }
      solved = true; busy = true;
      api.sfx('good');
      api.say('Exactly. Automate the rest, guard that one.', 'happy');
      render('.task p');
      var lis = UI.reducedMotion() ? [] : root.querySelectorAll('.mrow'); /* reduced motion: no sweep */
      for (var i = 0; i < lis.length; i++) (function (k) {
        api.later(function () {
          for (var j = 0; j < lis.length; j++) lis[j].classList.toggle('lit', j === k);
          api.sfx('tap');
        }, 300 + k * 260);
      })(i);
      api.later(function () { busy = false; render('.cta-row .btn'); }, 300 + lis.length * 260 + 200);
    }

    resetRound();
    render();
  };
})();
