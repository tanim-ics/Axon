/* Level 3 — Prompt Forge. Toggle prompt blocks and watch the agent's reply change live. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.prompt = function (root, api) {
    var cfg = C.PROMPT, on = [];
    var sys = h('div', { class: 'sysprompt', 'aria-label': 'System prompt', role: 'group' });
    var reply = h('div', { class: 'msg from-agent', 'aria-live': 'polite' });
    var cost = UI.meter('🪙 Tokens'), quality = UI.meter('⭐ Reply quality');

    function ordered() {
      return cfg.blocks.filter(function (b) { return on.indexOf(b.id) !== -1; });
    }

    function update() {
      var s = E.scorePrompt(cfg, on), blocks = ordered();
      UI.fill(sys, blocks.length
        ? blocks.map(function (b) { return h('p', { class: 'sys-line pop' + (b.good ? '' : ' junk') }, h('span', { 'aria-hidden': 'true', text: b.icon + ' ' }), b.text); })
        : h('p', { class: 'ghost-text', text: 'Empty prompt. Tap blocks to add them.' }));
      cost.set(s.cost / cfg.budget * 100, s.cost + ' / ' + cfg.budget, s.over ? 'bad' : 'ok');
      quality.set(s.quality, s.quality + '%', s.quality >= cfg.pass ? 'good' : 'warn');
      UI.fill(reply, E.composeReply(cfg, on).map(function (l) {
        return h('p', { class: l.ok ? 'ok' : 'bad' }, (l.ok ? '✓ ' : '⚠ ') + l.t);
      }));
      return s;
    }

    var chips = cfg.blocks.map(function (b) {
      var btn = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: function () {
        var k = on.indexOf(b.id);
        if (k < 0) on.push(b.id); else on.splice(k, 1);
        UI.setPressed(btn, k < 0);
        api.sfx('tap');
        var s = update();
        /* Adding a block says why it helps or hurts; removing one falls back to the overall state. */
        api.say(k < 0 ? (s.over && b.good ? 'Over budget! ' : '') + b.why
          : s.over ? 'Over budget! Context isn\'t free.' : s.pass ? 'Looking sharp. Ship it?' : 'Watch the reply change →',
          s.over || (k < 0 && !b.good) ? 'oops' : s.pass && !s.bad ? 'happy' : 'idle');
      } }, h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: b.icon }), b.name, h('span', { class: 'chip-cost', text: b.cost }));
      return btn;
    });

    var ship = h('button', { class: 'btn primary', type: 'button', onclick: function () {
      var s = E.scorePrompt(cfg, on);
      if (s.pass) { api.done(s.stars); return; }
      UI.shake(ship);
      api.sfx('bad');
      api.say(s.over ? 'Too many tokens. Cut the bloat.' : 'Too weak. Fix the ⚠ lines in the reply.', 'oops');
    } }, '🚀 Ship it');

    update();
    root.appendChild(h('div', { class: 'game split' },
      h('div', { class: 'col' },
        h('h2', { class: 'label', text: 'Blocks' }),
        h('div', { class: 'chips' }, chips),
        h('h2', { class: 'label', text: 'System prompt' }),
        sys, cost.el, quality.el),
      h('div', { class: 'col' },
        h('h2', { class: 'label', text: 'Live test' }),
        h('div', { class: 'chat' },
          h('div', { class: 'msg from-user' }, h('p', { text: '😠 ' + cfg.customer })),
          reply),
        h('div', { class: 'cta-row' }, ship))));
  };
})();
