/* Sort — send each card to the bucket it belongs in. One try per card; a miss shows why and
   the card returns at the end of the deck, so every mistake gets a second, successful recall. */
(function () {
  'use strict';
  var h = UI.h, E = Engine;

  Games.sort = function (root, api) {
    var P = api.level.puzzle;
    var queue = E.shuffle(P.items, Math.random), total = P.items.length;
    var placed = {}, done = 0, mistakes = 0;
    P.buckets.forEach(function (b) { placed[b.id] = 0; });

    function bucketName(id) {
      var name = '';
      P.buckets.forEach(function (b) { if (b.id === id) name = b.name; });
      return name;
    }

    function show() {
      var item = queue[0], answered = false;
      var card = h('div', { class: 'card sort-card' },
        h('span', { class: 'eyebrow', text: 'Card ' + (done + 1) + ' of ' + total }),
        h('p', { class: 'sort-text', tabindex: '-1', text: item.text }));
      var why = h('div', { class: 'why', role: 'status' });
      var marks = [];
      var bins = P.buckets.map(function (b) {
        var mark = h('span', { class: 'answer-mark' });
        marks.push(mark);
        var btn = h('button', { class: 'bin', type: 'button', onclick: function () { pick(b, btn); } },
          h('span', { class: 'bin-icon', 'aria-hidden': 'true', text: b.icon }),
          h('span', { class: 'bin-name', text: b.name }),
          h('span', { class: 'bin-count', text: placed[b.id] + ' placed' }),
          mark);
        return btn;
      });

      function pick(b, chosen) {
        if (answered) return;
        answered = true;
        var ok = E.sortRight(P, item.id, b.id);
        bins.forEach(function (btn, k) {
          btn.disabled = true;
          if (P.buckets[k].id === item.bucket) { btn.classList.add('right'); marks[k].textContent = '✓ Belongs here'; }
          else if (btn === chosen) { btn.classList.add('wrong'); marks[k].textContent = '✗ Your pick'; }
        });
        queue.shift();
        if (ok) { placed[b.id]++; done++; } else { mistakes++; queue.push(item); UI.shake(card); }
        api.sfx(ok ? 'good' : 'bad');
        api.say(ok ? 'Right.' : 'Not there. This card comes back at the end.', ok ? 'happy' : 'oops');
        var last = !queue.length;
        var next = h('button', { class: 'btn primary', type: 'button', onclick: function () {
          if (last) api.done(E.starsFromMistakes(mistakes)); else show();
        } }, last ? 'Finish' : 'Next');
        UI.fill(why,
          h('span', { class: 'eyebrow', text: 'Why · ' + bucketName(item.bucket) }),
          h('p', { text: item.why }), next);
        why.classList.add('shown');
        next.focus();
      }

      UI.fill(root, h('div', { class: 'game narrow' },
        card,
        h('div', { class: 'bins', role: 'group', 'aria-label': 'Where does it go?' }, bins),
        why));
      card.lastChild.focus(); /* the previous card was removed: put focus on the new one */
    }

    show();
  };
})();
