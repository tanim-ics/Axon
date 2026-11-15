/* Level 4 — Memory Pack. 3 context slots, 4 facts needed: the player must drop noise and compress. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.memory = function (root, api) {
    var cfg = C.MEMORY;
    var pack = [];      /* each slot: array of card ids (two ids = squashed) */
    var sel = [];       /* indexes of selected slots */
    var mistakes = 0, busy = false, result = null;

    function card(id) { return cfg.cards.filter(function (c) { return c.id === id; })[0]; }
    function packed(id) { return pack.some(function (s) { return s.indexOf(id) !== -1; }); }
    function squashed() { return pack.some(function (s) { return s.length > 1; }); }
    function canSquash() {
      return sel.length === 2 && !squashed() && pack[sel[0]].length === 1 && pack[sel[1]].length === 1;
    }

    function render(focusSel) {
      var slots = [];
      for (var k = 0; k < cfg.slots; k++) slots.push(slotEl(k));
      var loose = cfg.cards.filter(function (c) { return !packed(c.id); }).map(function (c) {
        return h('button', { class: 'memcard', type: 'button', disabled: busy, onclick: function () { addCard(c.id); } },
          h('span', { class: 'mem-icon', 'aria-hidden': 'true', text: c.icon }), c.text);
      });
      var squash = h('button', { class: 'btn small', type: 'button', disabled: busy || !canSquash(), onclick: doSquash },
        '⚡ Squash 2 → 1' + (squashed() ? ' (used)' : ''));
      var go = h('button', { class: 'btn primary', type: 'button', disabled: busy || !pack.length, onclick: run }, '▶ Run agent');

      UI.fill(root, h('div', { class: 'game narrow' },
        h('div', { class: 'chat' }, h('div', { class: 'msg from-user' }, h('p', { text: '🧑 ' + cfg.ask }))),
        h('div', { class: 'row between' },
          h('h2', { class: 'label', text: '🎒 Context window · ' + pack.length + '/' + cfg.slots }), squash),
        h('div', { class: 'pack' }, slots),
        h('h2', { class: 'label', text: 'Memories' }),
        h('div', { class: 'memories' }, loose.length ? loose : h('p', { class: 'ghost-text', text: 'All packed.' })),
        result,
        h('div', { class: 'cta-row' }, go)));

      var target = focusSel && root.querySelector(focusSel);
      if (target) target.focus();
    }

    function slotEl(k) {
      var slot = pack[k];
      if (!slot) return h('div', { class: 'slot empty' }, h('span', { class: 'ghost-text', text: 'empty' }));
      var on = sel.indexOf(k) !== -1;
      var label = slot.map(function (id) { return card(id).text; }).join(' + ');
      return h('div', { class: 'slot filled' + (on ? ' on' : '') + (slot.length > 1 ? ' zipped' : '') },
        h('button', { class: 'slot-main', type: 'button', disabled: busy, 'aria-pressed': on ? 'true' : 'false',
          'aria-label': label + (on ? ', selected' : ', tap to select'), 'data-slot': k, onclick: function () { toggleSel(k); } },
          h('span', { class: 'mem-icon', 'aria-hidden': 'true', text: slot.map(function (id) { return card(id).icon; }).join('') }),
          h('span', { text: label })),
        h('button', { class: 'slot-x', type: 'button', disabled: busy, 'aria-label': 'Remove ' + label, onclick: function () {
          pack.splice(k, 1); sel = []; result = null; api.sfx('tap'); render('.memcard');
        } }, '✕'));
    }

    function addCard(id) {
      if (busy) return;
      if (pack.length >= cfg.slots) {
        api.sfx('bad');
        api.say('Pack is full! Remove something — or squash two into one.', 'oops');
        return;
      }
      pack.push([id]); sel = []; result = null;
      api.sfx('tap');
      api.say(pack.length === cfg.slots ? 'Full. Select two packed memories to squash them.' : 'Packed. What else does the task need?', 'idle');
      render('.memcard');
    }

    function toggleSel(k) {
      var i = sel.indexOf(k);
      if (i < 0) { sel.push(k); if (sel.length > 2) sel.shift(); } else sel.splice(i, 1);
      api.sfx('tap');
      render('[data-slot="' + k + '"]');
    }

    function doSquash() {
      if (!canSquash()) return;
      var a = Math.min(sel[0], sel[1]), b = Math.max(sel[0], sel[1]);
      pack[a] = pack[a].concat(pack[b]);
      pack.splice(b, 1);
      sel = []; result = null;
      api.sfx('good');
      api.say('Summarised! Two facts, one slot.', 'happy');
      render('.memcard');
    }

    function run() {
      if (busy || !pack.length) return;
      var s = E.scoreMemory(cfg, pack);
      result = h('div', { class: 'msg from-agent' }, cfg.needs.map(function (f) {
        var ok = s.have.indexOf(f) !== -1;
        return h('p', { class: ok ? 'ok' : 'bad' }, cfg.labels[f] + (ok ? ' ✓' : ' — ❓ guessed'));
      }));
      if (s.ok) {
        busy = true;
        api.sfx('good');
        api.say('Booked perfectly. Nothing guessed.', 'happy');
        render();
        api.later(function () { api.done(E.starsFromMistakes(mistakes)); }, 1100);
        return;
      }
      mistakes++;
      api.sfx('bad');
      api.say(pack.length < cfg.slots ? 'Room left! Pack more.'
        : !squashed() ? 'Still guessing. Select two packed memories, then ⚡ squash.'
        : 'There\'s noise in the pack. Swap it out.', 'oops');
      render('.cta-row .btn');
    }

    render();
  };
})();
