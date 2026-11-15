/* Level 6 — Shield Up. Match each threat to the guardrail that stops it. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  Games.guard = function (root, api) {
    var round = 0, mistakes = 0;

    function render() {
      var a = C.ATTACKS[round], busy = false;
      var wall = h('span', { class: 'wall', 'aria-hidden': 'true' });
      var guarded = UI.bot('oops', 'mini-bot');
      var scene = h('div', { class: 'scene' },
        h('div', { class: 'threat' }, h('span', { class: 'threat-icon', 'aria-hidden': 'true', text: a.icon }), h('span', { class: 'threat-name', text: a.threat })),
        h('div', { class: 'lane', 'aria-hidden': 'true' }, h('span', { class: 'bolt', text: '⚡' }), wall),
        guarded);

      var buttons = Object.keys(C.SHIELDS).map(function (id) {
        var s = C.SHIELDS[id];
        var b = h('button', { class: 'shield', type: 'button', onclick: function () {
          if (busy) return;
          if (id !== a.fix) {
            mistakes++;
            b.disabled = true;
            buttons.filter(function (x) { return !x.disabled; })[0].focus();
            UI.shake(scene);
            api.sfx('bad');
            api.say(s.name + ' means: ' + s.line.charAt(0).toLowerCase() + s.line.slice(1) + ' That is not this threat.', 'oops');
            return;
          }
          busy = true;
          buttons.forEach(function (x) { x.disabled = true; });
          b.classList.add('on');
          wall.textContent = s.icon;
          scene.classList.add('blocked');
          guarded.setAttribute('data-mood', 'happy');
          api.sfx('good');
          api.say('Blocked! ' + s.line, 'happy');
          api.later(function () {
            round++;
            if (round >= C.ATTACKS.length) api.done(E.starsFromMistakes(mistakes)); else render();
          }, 1600);
        } }, h('span', { class: 'shield-icon', 'aria-hidden': 'true', text: s.icon }), h('span', { class: 'shield-name', text: s.name }));
        return b;
      });

      var heading = h('h2', { class: 'label', tabindex: '-1', text: 'Raise a shield' });
      UI.fill(root, h('div', { class: 'game narrow' },
        UI.dots(C.ATTACKS.length, round),
        scene,
        h('div', { class: 'task alert' }, h('span', { class: 'task-tag', text: '🚨 Incoming' }), h('p', { text: a.scene })),
        heading,
        h('div', { class: 'shields' }, buttons)));
      if (round > 0) { heading.focus(); api.say('New threat: ' + a.threat + '.', 'oops'); }
    }

    render();
  };
})();
