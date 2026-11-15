/* Level 2 — Tool Belt. Equip exactly the tools each job needs. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.tools = function (root, api) {
    var rounds = C.TOOL_ROUNDS, ids = Object.keys(C.TOOLS);
    var round = 0, mistakes = 0;

    function render() {
      var r = rounds[round], selected = [], busy = false;
      var belt = h('div', { class: 'belt', role: 'img' });
      var runBtn = h('button', { class: 'btn primary', type: 'button', onclick: go }, '▶ Run agent');

      function drawBelt() {
        UI.fill(belt, selected.length
          ? selected.map(function (id) { return h('span', { class: 'belt-item pop', text: C.TOOLS[id].icon }); })
          : h('span', { class: 'ghost-text', text: 'Belt is empty' }));
        belt.setAttribute('aria-label', 'Tool belt: ' + (selected.length
          ? selected.map(function (id) { return C.TOOLS[id].name; }).join(', ') : 'empty'));
      }

      var chips = ids.map(function (id) {
        var t = C.TOOLS[id];
        var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: function () {
          if (busy) return;
          var k = selected.indexOf(id);
          if (k < 0) selected.push(id); else selected.splice(k, 1);
          UI.setPressed(b, k < 0);
          api.sfx('tap');
          drawBelt();
        } }, h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: t.icon }), t.name);
        return b;
      });

      function go() {
        if (busy) return;
        var s = E.scoreTools(C.TOOLS, r, selected);
        if (s.ok) {
          busy = true;
          chips.forEach(function (c) { c.disabled = true; });
          belt.classList.add('won');
          api.sfx('good');
          api.say('✅ ' + r.why, 'happy');
          /* The learner moves on when they have read why, not when a timer says so. */
          var last = round === rounds.length - 1;
          var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
            round++;
            if (last) api.done(E.starsFromMistakes(mistakes)); else render();
          } }, last ? '🏁 Finish' : 'Next job ▶');
          UI.fill(cta, next);
          next.focus();
          return;
        }
        mistakes++;
        UI.shake(belt);
        api.sfx('bad');
        api.say(s.danger ? '💣 Never pack that. No job here needs it.'
          : s.missing.length && s.extra.length ? 'Wrong kit. What does this job actually touch?'
          : s.missing.length ? 'Stuck! Part of this job has no tool. Missing ' + s.missing.length + '.'
          : 'Too heavy. Each extra tool is one more way to go wrong. Drop ' + s.extra.length + '.', 'oops');
      }

      var heading = h('h2', { class: 'label', tabindex: '-1', text: 'Pick tools' });
      var cta = h('div', { class: 'cta-row' }, runBtn);
      drawBelt();
      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(rounds.length, round),
        h('div', { class: 'task' }, h('span', { class: 'task-tag', text: '📋 Job' }), h('p', { text: r.task })),
        h('div', { class: 'belt-row' }, UI.bot('idle', 'mini-bot'), belt),
        heading,
        h('div', { class: 'chips' }, chips),
        cta));
      if (round > 0) { heading.focus(); api.say('Next job. Pack again.', 'idle'); }
    }

    render();
  };
})();
