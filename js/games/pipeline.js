/* Level 5 — Pipelines. Fill the empty slots of four classic patterns, then watch the data flow. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.pipeline = function (root, api) {
    var round = 0, mistakes = 0, placed = {}, busy = false, solved = false;

    function nodeBits(id) {
      var n = C.NODES[id];
      return [h('span', { class: 'pnode-icon', 'aria-hidden': 'true', text: n.icon }), h('span', { text: n.name })];
    }

    function render(focusSel) {
      var p = C.PIPES[round];
      var slots = E.pipeSlots(p);
      var open = slots.filter(function (s) { return !placed[s.key]; });
      var nextKey = open.length ? open[0].key : null;
      var used = slots.map(function (s) { return placed[s.key]; });
      var cols = [];

      var board = h('div', { class: 'board' + (solved ? ' won' : '') });
      p.stages.forEach(function (stage, s) {
        if (s) board.appendChild(h('span', { class: 'flow-arrow', 'aria-hidden': 'true', text: '➜' }));
        var col = h('div', { class: 'stage-col' });
        stage.forEach(function (slot, i) {
          var key = E.slotKey(s, i), node;
          if (slot.fixed) node = h('div', { class: 'pnode fixed' }, nodeBits(slot.fixed));
          else if (placed[key]) {
            node = h('button', { class: 'pnode filled', type: 'button', disabled: busy || solved,
              'aria-label': 'Remove ' + C.NODES[placed[key]].name, onclick: function () {
                delete placed[key]; api.sfx('tap'); render('.palette .chip:not([disabled])');
              } }, nodeBits(placed[key]));
          } else {
            node = h('div', { class: 'pnode hole' + (key === nextKey ? ' next' : '') }, h('span', { class: 'sr', text: 'Empty slot' }), h('span', { 'aria-hidden': 'true', text: '?' }));
          }
          col.appendChild(slot.label ? h('div', { class: 'branch' }, h('span', { class: 'branch-label', text: slot.label }), node) : node);
        });
        cols.push(col);
        board.appendChild(col);
      });

      var palette = p.palette.map(function (id) {
        return h('button', { class: 'chip', type: 'button', disabled: busy || solved || !nextKey || used.indexOf(id) !== -1, onclick: function () {
          placed[nextKey] = id; api.sfx('tap'); render('.palette .chip:not([disabled]), .cta-row .btn');
        } }, h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: C.NODES[id].icon }), C.NODES[id].name);
      });

      var last = round === C.PIPES.length - 1;
      var cta = solved
        ? h('button', { class: 'btn primary', type: 'button', onclick: function () {
            if (last) { api.done(E.starsFromMistakes(mistakes)); return; }
            round++; placed = {}; solved = false; busy = false;
            api.say('New pattern. Fill the blanks.', 'idle');
            render('.palette .chip:not([disabled])');
          } }, last ? '🏁 Finish' : 'Next pattern ▶')
        : h('button', { class: 'btn primary', type: 'button', disabled: busy || !!nextKey, onclick: function () { run(p, cols); } }, '▶ Run pipeline');

      UI.fill(root, h('div', { class: 'game' },
        UI.dots(C.PIPES.length, round),
        h('div', { class: 'task' }, h('span', { class: 'task-tag', text: p.icon + ' ' + p.pattern }), h('p', { text: p.task })),
        h('div', { class: 'board-wrap' }, board,
          p.loop ? h('p', { class: 'loop-badge', text: '↺ loops until the tests pass' }) : null),
        h('h2', { class: 'label', text: 'Blocks' }),
        h('div', { class: 'chips palette' }, palette),
        h('div', { class: 'cta-row' }, cta)));

      var target = focusSel && root.querySelector(focusSel);
      if (target) target.focus();
      return board;
    }

    function run(p, cols) {
      if (busy) return;
      var res = E.checkPipeline(p, placed);
      if (!res.ok) {
        mistakes++;
        var first = C.NODES[placed[res.wrong[0]]];
        res.wrong.forEach(function (k) { delete placed[k]; });
        api.sfx('bad');
        api.say(first.no ? first.no + ' It bounced back.'
          : first.name + ' is a real step, but not in that slot. Follow the data from left to right.', 'oops');
        UI.shake(render('.palette .chip:not([disabled])'));
        return;
      }
      busy = true;
      render();
      var board = root.querySelector('.board');
      var liveCols = board.querySelectorAll('.stage-col');
      var order = UI.reducedMotion() ? [] : p.loop ? [0, 1, 0, 1] : p.stages.map(function (_, i) { return i; }); /* reduced motion: no sweep */
      order.forEach(function (ci, j) {
        api.later(function () {
          for (var k = 0; k < liveCols.length; k++) liveCols[k].classList.toggle('lit', k === ci);
          api.sfx('tap');
        }, j * 420);
      });
      api.later(function () {
        solved = true; busy = false;
        api.sfx('good');
        api.say('✅ ' + p.win, 'happy');
        render('.cta-row .btn');
      }, order.length * 420 + 200);
    }

    render();
  };
})();
