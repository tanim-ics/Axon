/* Level 8 — Launch Day. Design your own agent, run it through 5 trials, take home a blueprint. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;

  /* A group of toggle chips. single=true behaves like radio buttons. */
  function chipGroup(items, isOn, onPick, extraClass) {
    var buttons = items.map(function (it) {
      var b = h('button', { class: 'chip' + (extraClass ? ' ' + extraClass : ''), type: 'button', onclick: function () {
        onPick(it.id);
        UI.sfx('tap');
        refresh();
      } },
        h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: it.icon }),
        it.name ? h('span', { class: 'chip-text' }, it.name, it.sub ? h('small', { text: it.sub }) : null) : h('span', { class: 'sr', text: it.label }));
      return b;
    });
    function refresh() { buttons.forEach(function (b, i) { UI.setPressed(b, isOn(items[i].id)); }); }
    refresh();
    return h('div', { class: 'chips' }, buttons);
  }

  function toggle(list, id) {
    var k = list.indexOf(id);
    if (k < 0) list.push(id); else list.splice(k, 1);
  }
  function inList(list) { return function (id) { return list.indexOf(id) !== -1; }; }

  Games.boss = function (root, api) {
    var B = C.BOSS;
    var agent = E.sanitizeAgent(C, api.getAgent() || {});

    function section(n, title, body) {
      return h('section', { class: 'card build' }, h('h2', null, h('span', { class: 'num', 'aria-hidden': 'true', text: n }), title), body);
    }

    function builder() {
      var name = h('input', { class: 'name-input', type: 'text', id: 'agent-name', maxlength: E.NAME_MAX, value: agent.name,
        autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Agent name (letters and numbers)',
        oninput: function () {
          var kept = name.value.replace(/[^A-Za-z0-9 _-]/g, '');
          if (kept !== name.value) name.value = kept;
        } });
      var face = h('span', { class: 'face', 'aria-hidden': 'true', text: agent.avatar });

      var tools = Object.keys(C.TOOLS).map(function (id) { return { id: id, icon: C.TOOLS[id].icon, name: C.TOOLS[id].name }; });
      var blocks = C.PROMPT.blocks.filter(function (b) { return B.prompt.indexOf(b.id) !== -1; });
      var shields = B.shields.map(function (id) { return { id: id, icon: C.SHIELDS[id].icon, name: C.SHIELDS[id].name }; });
      var powers = [{ id: 'memory', icon: '🎒', name: 'Memory', sub: 'remembers across steps' }, { id: 'critic', icon: '🧐', name: 'Self-check', sub: 'reviews its own work' }];

      UI.fill(root, h('div', { class: 'game narrow' },
        section(1, 'Identity', h('div', { class: 'identity' },
          h('div', { class: 'id-row' }, face, name),
          chipGroup(B.avatars.map(function (a) { return { id: a, icon: a, label: 'Avatar ' + a }; }),
            function (id) { return agent.avatar === id; },
            function (id) { agent.avatar = id; face.textContent = id; }, 'avatar'))),
        section(2, 'Mission', chipGroup(
          B.missions.map(function (m) { return { id: m.id, icon: m.icon, name: m.name, sub: m.job }; }),
          function (id) { return agent.mission === id; },
          function (id) { agent.mission = id; }, 'wide')),
        section(3, 'Tools', chipGroup(tools, inList(agent.tools), function (id) { toggle(agent.tools, id); })),
        section(4, 'Prompt', chipGroup(blocks, inList(agent.prompt), function (id) { toggle(agent.prompt, id); })),
        section(5, 'Powers', chipGroup(powers,
          function (id) { return agent[id] === true; },
          function (id) { agent[id] = !agent[id]; }, 'wide')),
        section(6, 'Shields', chipGroup(shields, inList(agent.shields), function (id) { toggle(agent.shields, id); })),
        h('div', { class: 'cta-row' }, h('button', { class: 'btn primary big', type: 'button', onclick: function () {
          agent.name = name.value;
          agent = E.sanitizeAgent(C, agent);
          api.saveAgent(agent);
          trials();
        } }, '🚀 Launch trials'))));
      api.say('Build it your way. Then launch.', 'idle');
    }

    function trials() {
      var results = E.runTrials(C, agent), stars = E.bossStars(results);
      var passed = results.filter(function (r) { return r.pass; }).length;
      var mission = B.missions.filter(function (m) { return m.id === agent.mission; })[0];
      var summary = h('div', { class: 'trial-summary' });

      var rows = results.map(function (r) {
        return h('li', { class: 'trial' },
          h('span', { class: 'trial-icon', 'aria-hidden': 'true', text: r.icon }),
          h('span', { class: 'trial-name', text: r.name }),
          h('span', { class: 'trial-mark', text: '…' }),
          h('p', { class: 'trial-hint' }));
      });

      UI.fill(root, h('div', { class: 'game narrow' },
        h('div', { class: 'agent-card' },
          h('span', { class: 'face', 'aria-hidden': 'true', text: agent.avatar }),
          h('div', null, h('p', { class: 'agent-name', text: agent.name }), h('p', { class: 'agent-job', text: mission.icon + ' ' + mission.name }))),
        h('ol', { class: 'trials' }, rows),
        summary));
      window.scrollTo(0, 0);
      api.say('Trials running…', 'idle');

      results.forEach(function (r, i) {
        api.later(function () {
          rows[i].classList.add('shown', r.pass ? 'pass' : 'fail');
          rows[i].querySelector('.trial-mark').textContent = r.pass ? '✓ Passed' : '✗ Failed';
          if (!r.pass) rows[i].querySelector('.trial-hint').textContent = '💡 ' + r.hint;
          api.sfx(r.pass ? 'good' : 'bad');
        }, 500 + i * 650);
      });

      api.later(function () {
        var tweak = h('button', { class: 'btn', type: 'button', onclick: builder }, '🔧 Tweak build');
        var finish = stars ? h('button', { class: 'btn primary', type: 'button', onclick: function () { api.done(stars); } }, '🏁 Finish') : null;
        UI.fill(summary, 
          h('p', { class: 'trial-score', role: 'status', text: passed + ' / ' + results.length + ' trials passed' }),
          h('div', { class: 'cta-row' }, tweak, finish),
          stars ? blueprint() : null);
        api.say(stars === 3 ? 'Flawless. That\'s an agent you can trust.' : stars ? 'It flies! Fix the 💡 hints for more stars.' : 'Not ready yet. Follow the 💡 hints and relaunch.', stars ? 'happy' : 'oops');
        (finish || tweak).focus();
      }, 500 + results.length * 650 + 200);
    }

    function blueprint() {
      var bp = E.buildBlueprint(C, agent);
      var tabs = [['systemPrompt', '🧬 Prompt'], ['tools', '🧰 Tools'], ['code', '🔁 Loop']];
      var current = 'systemPrompt';
      var code = h('code');
      var pre = h('pre', { class: 'code', tabindex: '0', 'aria-label': 'Blueprint' }, code);
      var copyBtn = h('button', { class: 'btn small', type: 'button', onclick: copy }, '⧉ Copy');
      var tabBtns = tabs.map(function (t) {
        return h('button', { class: 'chip tab', type: 'button', onclick: function () { current = t[0]; show(); } }, t[1]);
      });

      function show() {
        code.textContent = bp[current];
        tabBtns.forEach(function (b, i) { UI.setPressed(b, tabs[i][0] === current); });
        copyBtn.textContent = '⧉ Copy';
      }
      function selectAll() {
        var range = document.createRange();
        range.selectNodeContents(code);
        var s = window.getSelection();
        s.removeAllRanges(); s.addRange(range);
        copyBtn.textContent = 'Selected — press Ctrl/⌘ + C';
      }
      function copy() {
        if (!navigator.clipboard || !navigator.clipboard.writeText) { selectAll(); return; }
        navigator.clipboard.writeText(bp[current]).then(function () { copyBtn.textContent = '✓ Copied'; }, selectAll);
      }

      show();
      return h('section', { class: 'card blueprint' },
        h('h2', { text: '📜 Your blueprint — it\'s real. Take it.' }),
        h('div', { class: 'row between' }, h('div', { class: 'chips' }, tabBtns), copyBtn),
        pre);
    }

    builder();
  };
})();
