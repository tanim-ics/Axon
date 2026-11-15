/* Axon — app shell: storage, routing, HUD, journey hub, trails, level frame, review, results, codex. */
(function () {
  'use strict';
  var h = UI.h, C = Content, E = Engine;
  var STORE_KEY = 'agentcraft.v1'; /* kept from the app's first name so saved progress survives */
  var NODE_X = [50, 74, 60, 30, 26, 46, 72, 50]; /* % across the trail */
  var NODE_GAP = 164, NODE_TOP = 56; /* room for a two-line title and tag at 375px */
  var REVIEW_SIZE = 10, ARENA_SIZE = 8;

  var app = document.getElementById('app');
  var hud = document.querySelector('.hud');
  var skip = document.querySelector('.skip');
  var state = load();
  var timers = [];
  var epoch = 0;      /* bumps on every navigation; stale timers check it */
  var overlay = null;
  var overlayBack = '#/map';

  /* ---------- storage (untrusted on read) ---------- */
  function load() {
    try { return E.sanitizeState(C, JSON.parse(window.localStorage.getItem(STORE_KEY))); }
    catch (e) { return E.defaultState(); }
  }
  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { /* private mode or full disk: keep playing in memory */ }
  }
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function levelById(id) {
    var J = E.journeyOf(C, id), found = null;
    if (J) J.levels.forEach(function (l) { if (l.id === id) found = l; });
    return found;
  }
  function indexIn(J, L) { return J.levels.indexOf(L); }
  function levelAfter(L) {
    var J = E.journeyOf(C, L.id), next = J.levels[indexIn(J, L) + 1];
    return next && E.isUnlocked(C, state, next.id) ? next : null;
  }
  function kicker(L) {
    var J = E.journeyOf(C, L.id);
    return J.unit + ' ' + (indexIn(J, L) + 1) + ' · ' + L.tag;
  }
  /* The first open, unfinished level across all journeys, in hub order. */
  function nextUp() {
    var id = null;
    C.JOURNEYS.forEach(function (J) { id = id || E.nextInJourney(C, state, J.id); });
    return id ? levelById(id) : null;
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    var xp = E.xpOf(state), rank = E.rankOf(xp), streak = E.liveStreak(state, today());
    document.getElementById('rank').textContent = rank.icon + ' ' + rank.name;
    document.getElementById('xpfill').style.width = Math.round(rank.progress * 100) + '%';
    document.getElementById('xptext').textContent = xp + ' XP';
    document.getElementById('xp').setAttribute('aria-label',
      xp + ' experience points. Rank: ' + rank.name + (rank.next ? '. Next rank at ' + rank.next.xp : ''));
    var s = document.getElementById('streak');
    s.textContent = '🔥 ' + streak;
    s.setAttribute('aria-label', streak + ' day streak');
    s.classList.toggle('hot', streak > 0);
    var btn = document.getElementById('sound');
    btn.setAttribute('aria-pressed', state.sound ? 'true' : 'false');
    document.getElementById('sound-icon').textContent = state.sound ? '🔊' : '🔇';
    UI.setSound(state.sound);
  }

  document.getElementById('sound').addEventListener('click', function () {
    state.sound = !state.sound;
    save(); renderHud();
    UI.sfx('tap');
  });

  /* ---------- navigation ---------- */
  function cleanup() {
    epoch++;
    timers.forEach(clearTimeout);
    timers = [];
    closeOverlay();
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    app.inert = false; hud.inert = false; skip.inert = false;
    document.removeEventListener('keydown', onOverlayKey);
  }

  function route() {
    cleanup();
    var parts = window.location.hash.replace(/^#\/?/, '').split('/');
    var L = parts[0] === 'level' ? levelById(parts[1]) : null;
    var J = parts[0] === 'journey' ? E.journeyById(C, parts[1]) : null;
    if (L && E.isUnlocked(C, state, L.id)) viewLevel(L, false);
    else if (J && E.journeyOpen(C, state, J.id)) viewJourney(J);
    else if (parts[0] === 'review' || parts[0] === 'arena') viewSession(parts[0]);
    else if (parts[0] === 'blitz') viewBlitz();
    else if (parts[0] === 'course') viewCourse();
    else if (parts[0] === 'read' && lessonByNo(parts[1])) viewRead(lessonByNo(parts[1]));
    else if (parts[0] === 'codex') viewCodex();
    else viewHub();
    renderHud();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  /* Shared page header: back button, icon, eyebrow, title. */
  function pageHead(back, backLabel, icon, eyebrow, title) {
    return h('header', { class: 'lvl-head' },
      h('a', { class: 'iconbtn', href: back, 'aria-label': backLabel }, h('span', { 'aria-hidden': 'true', text: '←' })),
      h('span', { class: 'lvl-icon', 'aria-hidden': 'true', text: icon }),
      h('div', { class: 'lvl-names' }, h('span', { class: 'eyebrow', text: eyebrow }), h('h1', { text: title })));
  }

  /* ---------- hub: pick a journey ---------- */
  function journeyCard(J) {
    var open = E.journeyOpen(C, state, J.id), p = E.journeyProgress(C, state, J.id);
    var status;
    if (!J.levels.length) {
      status = h('span', { class: 'journey-note', text: '🚧 Being built' });
    } else if (!open) {
      status = h('span', { class: 'journey-note', text: '🔒 Finish "' + levelById(J.gate).title + '" to unlock' });
    } else {
      var fill = h('span', { class: 'jbar-fill' });
      fill.style.width = Math.round(p.done / p.total * 100) + '%';
      status = h('span', { class: 'journey-progress' },
        h('span', { class: 'jbar', 'aria-hidden': 'true' }, fill),
        h('span', { text: p.done + ' / ' + p.total + ' done · ★ ' + p.stars }));
    }
    var inner = [
      h('span', { class: 'journey-icon', 'aria-hidden': 'true', text: J.icon }),
      h('span', { class: 'eyebrow', text: J.tag }),
      h('h2', { text: J.title }),
      h('p', { text: J.blurb }),
      status
    ];
    return h('li', null, open
      ? h('a', { class: 'journey-card', href: '#/journey/' + J.id }, inner)
      : h('div', { class: 'journey-card locked' }, inner));
  }

  function reviewCard() {
    var learned = E.learnedConcepts(C, state).length, due = E.dueConcepts(C, state, today()).length;
    var title = !learned ? 'Ideas you learn come back here.'
      : due ? due + (due === 1 ? ' idea is' : ' ideas are') + ' due today.' : 'Nothing due today.';
    var sub = !learned ? 'Finish a level and its ideas return after 1, 3, 7 and 21 days, so they stick.'
      : due ? 'A few quick questions. Right answers wait longer before they return.'
      : 'Stay sharp in the Arena: a random mix of everything you know.';
    return h('section', { class: 'card review-card', 'aria-label': 'Daily review' },
      h('span', { class: 'review-icon', 'aria-hidden': 'true', text: '🧠' }),
      h('div', { class: 'review-text' },
        h('span', { class: 'eyebrow', text: 'Daily review' }), h('h2', { text: title }), h('p', { text: sub })),
      learned ? h('div', { class: 'review-actions' },
        due ? h('a', { class: 'btn primary', href: '#/review' }, 'Review now') : null,
        h('a', { class: 'btn', href: '#/arena' }, '⚔️ Arena'),
        h('a', { class: 'btn', href: '#/blitz' }, '⏱️ Blitz')) : null);
  }

  function viewHub() {
    document.title = 'Axon — learn to build and tune AI agents by playing';
    var next = nextUp(), started = E.xpOf(state) > 0;
    var title = !started ? 'Build your first AI agent.' : next ? 'Next up: ' + next.title + (/[.?!]$/.test(next.title) ? '' : '.') : 'You did it. All of it.';
    var sub = !started ? 'Short games, real pipelines. Zero lectures.'
      : next ? next.idea : 'Replay anything for 3 stars, or rebuild your agent.';
    var cta = h('a', { class: 'btn primary big', href: '#/level/' + (next ? next.id : 'boss') },
      !started ? 'Start' : next ? 'Continue' : 'Rebuild my agent');

    UI.fill(app, h('div', { class: 'map' },
      h('section', { class: 'hero' },
        UI.bot(next ? 'idle' : 'happy', 'hero-bot'),
        h('div', { class: 'hero-text' },
          h('span', { class: 'eyebrow', text: started ? 'Your journey' : 'Axon' }),
          h('h1', { text: title }), h('p', { text: sub }), cta)),
      reviewCard(),
      h('h2', { class: 'section-title', text: 'Journeys' }),
      h('ul', { class: 'journeys' }, C.JOURNEYS.map(journeyCard))));
  }

  /* ---------- one journey: its trail of levels ---------- */
  function nodeY(i) { return NODE_TOP + i * NODE_GAP; }

  function viewJourney(J) {
    document.title = J.title + ' — Axon';
    var levels = J.levels, nextId = E.nextInJourney(C, state, J.id);
    var height = nodeY(levels.length - 1) + 104;
    var path = UI.svg('svg', { class: 'trail-path', viewBox: '0 0 100 ' + height, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
    var list = h('ol', { class: 'trail-nodes' });
    var trail = h('nav', { class: 'trail', 'aria-label': J.title }, path, list);
    trail.style.height = height + 'px';

    levels.forEach(function (L, i) {
      var x = NODE_X[i % NODE_X.length], y = nodeY(i);
      var n = E.starsOf(state, L.id), open = E.isUnlocked(C, state, L.id);
      if (i > 0) {
        var px = NODE_X[(i - 1) % NODE_X.length], py = nodeY(i - 1), mid = (y - py) / 2;
        path.appendChild(UI.svg('path', {
          class: 'seg' + (E.starsOf(state, levels[i - 1].id) && open ? ' done' : ''),
          d: 'M' + px + ' ' + py + ' C' + px + ' ' + (py + mid) + ',' + x + ' ' + (y - mid) + ',' + x + ' ' + y
        }));
      }
      var inner = [
        h('span', { class: 'node-disc', 'aria-hidden': 'true' }, open ? L.icon : '🔒'),
        h('span', { class: 'node-title', text: L.title }),
        open ? (n ? UI.stars(n) : h('span', { class: 'node-tag', text: L.tag })) : h('span', { class: 'sr', text: 'Locked' })
      ];
      var cls = 'node' + (n ? ' done' : '') + (L.id === nextId ? ' next' : '') + (open ? '' : ' locked') + (J.kind === 'mission' ? ' mission' : '');
      var node = open
        ? h('a', { class: cls, href: '#/level/' + L.id, 'aria-label': kicker(L) + ': ' + L.title + (n ? ', ' + n + ' of 3 stars' : '') }, inner)
        : h('span', { class: cls }, inner);
      var li = h('li', { class: 'node-wrap' }, node);
      li.style.left = x + '%';
      li.style.top = y + 'px';
      list.appendChild(li);
    });

    UI.fill(app, h('div', { class: 'map' },
      pageHead('#/map', 'Back to all journeys', J.icon, J.tag, J.title),
      J.lead ? h('p', { class: 'journey-lead' }, J.lead + ' ',
        J.course ? h('a', { href: '#/course' }, 'Or read the full course.') : null) : null,
      trail));
  }

  /* ---------- full read: the course text, bundled with the app ---------- */
  function lessonByNo(no) {
    var found = null;
    C.COURSE.lessons.forEach(function (l) { if (l.no === no) found = l; });
    return found;
  }

  function credit() {
    return h('p', { class: 'credit' },
      '"' + C.COURSE.title + '" by ' + C.COURSE.author + ', ' + C.COURSE.license + '. ',
      'The text is his, unchanged apart from interactive demos that are left out. ',
      h('a', { href: C.COURSE.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the original course ↗'));
  }

  function viewCourse() {
    document.title = 'Full course — Axon';
    UI.fill(app, h('div', { class: 'codex' },
      pageHead('#/journey/addy', 'Back to the Addy journey', '📖', 'Read it all', 'The full course'),
      credit(),
      h('ol', { class: 'course-list' }, C.COURSE.lessons.map(function (l) {
        var playable = !!levelById('a' + l.no + '-learn');
        return h('li', null, h('a', { class: 'course-row', href: '#/read/' + l.no },
          h('span', { class: 'course-no', text: l.no }),
          h('span', { class: 'course-title', text: l.title }),
          h('span', { class: 'course-tag', text: playable ? '🎮 has games' : 'read only for now' })));
      }))));
  }

  function inlineNodes(nodes) {
    return nodes.map(function (n) {
      if (n.t === 'b') return h('strong', null, inlineNodes(n.s));
      if (n.t === 'i') return h('em', { text: n.v });
      if (n.t === 'code') return h('code', { text: n.v });
      if (n.t === 'a') {
        return n.external
          ? h('a', { href: n.href, target: '_blank', rel: 'noopener noreferrer' }, n.v + ' ↗')
          : h('a', { href: n.href }, n.v);
      }
      return n.v;
    });
  }

  function blockNode(b) {
    if (b.t === 'h') return h('h' + Math.min(b.n + 1, 5), null, inlineNodes(b.s));
    if (b.t === 'p') return h('p', null, inlineNodes(b.s));
    if (b.t === 'quote') return h('blockquote', null, inlineNodes(b.s));
    if (b.t === 'hr') return h('hr');
    if (b.t === 'code') return h('pre', { class: 'code', tabindex: '0' }, h('code', { text: b.text }));
    if (b.t === 'ul' || b.t === 'ol') {
      return h(b.t, null, b.items.map(function (it) { return h('li', { class: it.d ? 'sub' : null }, inlineNodes(it.s)); }));
    }
    if (b.t === 'table') {
      return h('div', { class: 'table-wrap', tabindex: '0', role: 'group', 'aria-label': 'Table' }, h('table', null,
        h('thead', null, h('tr', null, b.head.map(function (c) { return h('th', { scope: 'col' }, inlineNodes(c)); }))),
        h('tbody', null, b.rows.map(function (r) {
          return h('tr', null, r.map(function (c) { return h('td', null, inlineNodes(c)); }));
        }))));
    }
    return null;
  }

  function viewRead(lesson) {
    document.title = lesson.title + ' — Axon';
    var myEpoch = epoch;
    var body = h('div', { class: 'prose', 'aria-busy': 'true' }, h('p', { text: 'Loading the lesson…' }));
    var status = h('p', { class: 'sr', role: 'status' }); /* announce that it loaded, not the whole lesson */
    var learn = levelById('a' + lesson.no + '-learn');
    var play = learn && E.isUnlocked(C, state, learn.id)
      ? h('a', { class: 'btn primary', href: '#/level/' + learn.id }, '🎮 Play this lesson') : null;
    var idx = C.COURSE.lessons.indexOf(lesson), nextLesson = C.COURSE.lessons[idx + 1];
    UI.fill(app, h('article', { class: 'reader' },
      pageHead('#/course', 'Back to the course list', '📖', 'Lesson ' + lesson.no + ' · full read', lesson.title),
      credit(),
      play ? h('div', { class: 'row' }, play) : null,
      status,
      body,
      h('div', { class: 'cta-row' },
        h('a', { class: 'btn', href: '#/course' }, 'All lessons'),
        nextLesson ? h('a', { class: 'btn', href: '#/read/' + nextLesson.no }, 'Next lesson') : null)));
    Course.load(lesson.no, function (md) {
      if (myEpoch !== epoch) return;
      var blocks = Markdown.parse(md);
      if (blocks.length && blocks[0].t === 'h') blocks.shift(); /* the page already shows the title */
      UI.fill(body, blocks.map(blockNode));
      body.removeAttribute('aria-busy');
      status.textContent = 'Lesson loaded.';
    }, function () {
      if (myEpoch !== epoch) return;
      body.removeAttribute('aria-busy');
      UI.fill(body, h('p', { text: 'This lesson could not be loaded. Use the link above to read it on the original site.' }));
    });
  }

  /* ---------- level frame ---------- */
  function viewLevel(L, skipIntro) {
    document.title = L.title + ' — Axon';
    var J = E.journeyOf(C, L.id), home = '#/journey/' + J.id;
    var myEpoch = epoch, finished = false;
    var stage = h('div', { class: 'stage' });
    var bubble = h('p', { class: 'bubble', role: 'status' });
    var coachBot = UI.bot('idle', 'coach-bot');
    var game = J.kind === 'mission' ? Games.mission : Games[L.game || L.id];

    UI.fill(app, h('section', { class: 'level' },
      pageHead(home, 'Back to ' + J.title, L.icon, kicker(L), L.title),
      stage,
      h('div', { class: 'coach' }, coachBot, bubble)));

    var api = {
      level: L,
      say: function (text, mood) {
        bubble.textContent = text;
        coachBot.setAttribute('data-mood', mood || 'idle');
      },
      later: function (fn, ms) {
        timers.push(setTimeout(function () { if (myEpoch === epoch) fn(); }, ms));
      },
      sfx: UI.sfx,
      conceptName: function (id) { return C.CONCEPTS[id].name; },
      answer: function (q, correct) {
        state = E.recordReview(C, state, q.concept, correct, today());
        save();
      },
      getAgent: function () { return state.agent; },
      saveAgent: function (agent) { state.agent = E.sanitizeAgent(C, agent); save(); },
      done: function (stars) {
        if (finished || myEpoch !== epoch) return;
        finished = true;
        var res = E.awardLevel(C, state, L.id, stars, today());
        state = res.state;
        save(); renderHud();
        showResult(L, stars, res);
      }
    };

    function start() {
      UI.fill(stage);
      api.say(L.play, 'idle');
      game(stage, api);
      /* The Play button is gone now; keep keyboard focus inside the level instead of dropping to the page top. */
      if (!stage.contains(document.activeElement)) app.focus({ preventScroll: true });
    }

    if (skipIntro) { start(); return; }
    api.say('Ready when you are.', 'idle');
    var go = h('button', { class: 'btn primary big', type: 'button', onclick: function () { UI.sfx('tap'); start(); } }, 'Play');
    UI.fill(stage, h('div', { class: 'intro' },
      h('div', { class: 'intro-icon', 'aria-hidden': 'true', text: L.icon }),
      h('h2', { text: L.idea }),
      h('p', { text: L.play }),
      go));
  }

  /* ---------- daily review and Arena: questions from the concept bank ---------- */
  function viewSession(mode) {
    var arena = mode === 'arena', name = arena ? 'Arena' : 'Daily review';
    document.title = name + ' — Axon';
    var myEpoch = epoch;
    var stage = h('div', { class: 'stage' });
    var bubble = h('p', { class: 'bubble', role: 'status' });
    var coachBot = UI.bot('idle', 'coach-bot');
    var questions = E.buildSession(C, state, today(), mode, arena ? ARENA_SIZE : REVIEW_SIZE);

    UI.fill(app, h('section', { class: 'level' },
      pageHead('#/map', 'Back to all journeys', arena ? '⚔️' : '🧠', arena ? 'Everything you know, mixed' : 'Due today', name),
      stage,
      h('div', { class: 'coach' }, coachBot, bubble)));

    function say(text, mood) {
      bubble.textContent = text;
      coachBot.setAttribute('data-mood', mood || 'idle');
    }
    function panel(icon, title, text, actions) {
      UI.fill(stage, h('div', { class: 'intro' },
        h('div', { class: 'intro-icon', 'aria-hidden': 'true', text: icon }),
        h('h2', { text: title }), h('p', { text: text }), h('div', { class: 'cta-row' }, actions)));
    }
    var hub = h('a', { class: 'btn', href: '#/map' }, 'Journeys');

    if (!questions.length) {
      var none = !E.learnedConcepts(C, state).length;
      say(none ? 'Play a level first.' : 'All caught up.', 'happy');
      panel(arena ? '⚔️' : '🧠', none ? 'Nothing to recall yet.' : 'Nothing due today.',
        none ? 'Finish a level and its ideas show up here.' : 'Come back tomorrow, or mix it up in the Arena.',
        [hub, none || arena ? null : h('a', { class: 'btn primary', href: '#/arena' }, '⚔️ Arena')]);
      return;
    }

    say(arena ? 'Mixed questions. No hints.' : 'Pull each idea back from memory.', 'idle');
    Games.recall(stage, {
      questions: questions,
      say: say,
      sfx: UI.sfx,
      later: function (fn, ms) {
        timers.push(setTimeout(function () { if (myEpoch === epoch) fn(); }, ms));
      },
      conceptName: function (id) { return C.CONCEPTS[id].name; },
      answer: function (q, correct) {
        state = E.recordReview(C, state, q.concept, correct, today());
        save();
      },
      end: function (right, total) {
        if (myEpoch !== epoch) return;
        var res = E.touchSession(C, state, today());
        state = res.state;
        save(); renderHud();
        var all = right === total;
        var badge = res.newBadges.length ? E.BADGES.filter(function (b) { return b.id === res.newBadges[0]; })[0] : null;
        say(badge ? 'New badge: ' + badge.icon + ' ' + badge.name + '.' : all ? 'Clean sweep.' : 'Misses come back tomorrow.', all || badge ? 'happy' : 'idle');
        /* From the review the Arena is another page (so reload and Back work); "Go again" restarts in place. */
        var again = arena
          ? h('button', { class: 'btn primary', type: 'button', onclick: function () {
              cleanup(); viewSession('arena'); app.focus({ preventScroll: true });
            } }, 'Go again')
          : h('a', { class: 'btn primary', href: '#/arena' }, '⚔️ Arena');
        panel(all ? '🏅' : '🧠', right + ' / ' + total + ' remembered',
          arena ? 'Anything you missed is queued for tomorrow\'s review.'
            : all ? 'Each idea now waits longer before it returns.' : 'Right answers wait longer. Misses return tomorrow.',
          [hub, again]);
        UI.sfx(all ? 'win' : 'good');
        again.focus();
      }
    });
  }

  /* ---------- Blitz: the timed Arena ---------- */
  function viewBlitz() {
    document.title = 'Blitz — Axon';
    var myEpoch = epoch, B = E.BLITZ;
    var stage = h('div', { class: 'stage' });
    var bubble = h('p', { class: 'bubble', role: 'status' });
    var coachBot = UI.bot('idle', 'coach-bot');
    var learned = E.learnedConcepts(C, state).length;

    UI.fill(app, h('section', { class: 'level' },
      pageHead('#/map', 'Back to all journeys', '⏱️', 'Everything you know, against the clock', 'Blitz'),
      stage,
      h('div', { class: 'coach' }, coachBot, bubble)));

    function say(text, mood) {
      bubble.textContent = text;
      coachBot.setAttribute('data-mood', mood || 'idle');
    }
    function panel(icon, title, text, actions, extra) {
      UI.fill(stage, h('div', { class: 'intro' },
        h('div', { class: 'intro-icon', 'aria-hidden': 'true', text: icon }),
        h('h2', { tabindex: '-1', text: title }), h('p', { text: text }), h('div', { class: 'cta-row' }, actions)), extra);
    }
    function hubLink() { return h('a', { class: 'btn', href: '#/map' }, 'Journeys'); }

    if (!learned) {
      say('Play a level first.', 'happy');
      panel('⏱️', 'Nothing to recall yet.', 'Finish a level and its ideas show up here.', [hubLink()]);
      return;
    }

    function ready() {
      var go = h('button', { class: 'btn primary big', type: 'button', onclick: function () { UI.sfx('tap'); run(); } }, 'Start');
      say('Fast, but not careless.', 'idle');
      panel('⏱️', B.seconds + ' seconds. Go.',
        'A right answer scores a point. A wrong one costs ' + B.penalty + ' seconds.' + (state.blitz ? ' Your best: ' + state.blitz + '.' : ''),
        [hubLink(), h('a', { class: 'btn', href: '#/arena' }, 'No clock: Arena'), go]);
    }

    function run() {
      say('Go!', 'happy');
      Games.blitz(stage, {
        more: function () { return E.buildSession(C, state, today(), 'arena', learned); },
        say: say,
        sfx: UI.sfx,
        later: function (fn, ms) {
          timers.push(setTimeout(function () { if (myEpoch === epoch) fn(); }, ms));
        },
        answer: function (q, correct) {
          state = E.recordReview(C, state, q.concept, correct, today());
          save();
        },
        end: function (right, total, misses) {
          if (myEpoch !== epoch) return;
          var rec = E.recordBlitz(state, right);
          var res = E.touchSession(C, rec.state, today());
          state = res.state;
          save(); renderHud();
          var again = h('button', { class: 'btn primary', type: 'button', onclick: function () {
            cleanup(); viewBlitz(); app.focus({ preventScroll: true });
          } }, 'Go again');
          var list = misses.length ? h('section', { class: 'blitz-misses', 'aria-label': 'What you missed' },
            h('h2', { class: 'label', text: 'Missed. These come back tomorrow.' }),
            h('ul', null, misses.map(function (m) {
              return h('li', { class: 'miss' },
                h('p', { class: 'miss-q', text: m.q }),
                h('p', { class: 'miss-a', text: '✓ ' + m.a }),
                h('p', { class: 'miss-why', text: m.why }));
            }))) : null;
          panel(rec.record ? '🏆' : '⏱️', right + ' right in ' + B.seconds + ' seconds',
            (rec.record ? 'A new record. ' : 'Your best is ' + rec.best + '. ') + total + ' answered, ' + misses.length + ' missed.',
            [hubLink(), again], list);
          say(rec.record ? 'New record!' : misses.length ? 'Read what you missed. Then go again.' : 'Not one miss.', rec.record || !misses.length ? 'happy' : 'idle');
          UI.sfx(rec.record ? 'win' : 'good');
          if (rec.record) UI.confetti();
          again.focus();
        }
      });
    }

    ready();
  }

  /* ---------- result dialog ---------- */
  function onOverlayKey(e) {
    if (!overlay) return;
    if (e.key === 'Escape') { e.preventDefault(); window.location.hash = overlayBack; return; }
    if (e.key !== 'Tab') return;
    var f = overlay.querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function showResult(L, stars, res) {
    var next = levelAfter(L), J = E.journeyOf(C, L.id);
    overlayBack = '#/journey/' + J.id;
    var badges = res.newBadges.map(function (id) {
      var b = E.BADGES.filter(function (x) { return x.id === id; })[0];
      return h('li', { class: 'badge got' }, h('span', { 'aria-hidden': 'true', text: b.icon }), ' ' + b.name);
    });
    var primary = next
      ? h('a', { class: 'btn primary', href: '#/level/' + next.id }, 'Next')
      : h('a', { class: 'btn primary', href: '#/codex' }, 'My codex');
    var replay = h('button', { class: 'btn', type: 'button', onclick: function () {
      cleanup(); viewLevel(L, true); app.focus({ preventScroll: true });
    } }, 'Replay');

    overlay = h('div', { class: 'overlay' },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'res-title' },
        h('div', { class: 'res-icon', 'aria-hidden': 'true', text: L.icon }),
        h('h2', { id: 'res-title', text: stars === 3 ? 'Perfect.' : stars === 2 ? 'Nice work.' : 'Cleared.' }),
        UI.stars(stars, true),
        h('p', { class: 'xp-gain', text: res.gained ? '+' + res.gained + ' XP' : 'Best score kept' }),
        res.rankUp ? h('p', { class: 'rank-up', text: 'New rank: ' + E.rankOf(E.xpOf(state)).name }) : null,
        h('div', { class: 'keycard' },
          h('span', { class: 'eyebrow', text: J.kind === 'mission' ? 'Playbook saved to your codex' : 'Remember' }),
          h('p', { text: L.key })),
        badges.length ? h('ul', { class: 'badges', 'aria-label': 'New badges' }, badges) : null,
        h('div', { class: 'modal-actions' }, replay, h('a', { class: 'btn', href: overlayBack }, 'Map'), primary)));

    document.body.appendChild(overlay);
    app.inert = true; hud.inert = true; skip.inert = true;
    document.addEventListener('keydown', onOverlayKey);
    UI.sfx('win');
    UI.confetti();
    primary.focus();
  }

  /* ---------- codex ---------- */
  function playbook(M, i) {
    var n = E.starsOf(state, M.id);
    if (!n) {
      return h('li', { class: 'codex-card locked' },
        h('span', { class: 'codex-icon', 'aria-hidden': 'true', text: '🔒' }),
        h('h3', { text: 'Mission ' + (i + 1) + ' · ' + M.tag }),
        h('p', { text: 'Finish this mission to unlock its playbook.' }));
    }
    return h('li', { class: 'codex-card playbook' },
      h('span', { class: 'codex-icon', 'aria-hidden': 'true', text: M.icon }),
      h('h3', { text: M.title }),
      h('ol', { class: 'stack' }, M.stages.map(function (s) {
        return h('li', { class: s.id === M.gate ? 'gate' : null },
          h('span', { class: 'stack-step' }, h('span', { 'aria-hidden': 'true', text: s.icon + ' ' }), s.name, s.id === M.gate ? ' 🙋' : ''),
          h('span', { class: 'stack-tool' }, h('strong', { text: s.tool }), h('small', { text: ' · ' + s.also.join(', ') })));
      })),
      UI.stars(n));
  }

  /* When the tool names in the playbooks and toolbox were last checked, and against which pages. */
  function toolsReview() {
    var R = C.TOOLS_REVIEW;
    if (!R) return null;
    return [
      h('p', { class: 'section-sub market-caveat', text: 'Tool names last reviewed ' + R.reviewed + '. ' + R.note }),
      h('details', { class: 'card market-sources' },
        h('summary', { text: 'Official pages checked (' + R.sources.length + ')' }),
        h('ol', null, R.sources.map(function (src) {
          return h('li', null, h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, src.name + ' ↗'));
        })))
    ];
  }

  /* Mastery map: every idea learned so far, weakest first, grouped by journey. */
  var STATUS = { due: ['Due today', '⏰'], 'new': ['Not reviewed yet', '🆕'], learning: ['Learning', '🌱'], strong: ['Strong', '💪'] };

  function mastery() {
    var all = E.masteryOf(C, state, today()), total = Object.keys(C.CONCEPTS).length;
    var title = h('h2', { class: 'section-title', text: 'Mastery map' });
    if (!all.length) {
      return [title, h('p', { class: 'section-sub', text: 'Finish a level and its ideas appear here, with how well you know each one.' })];
    }
    var count = function (st) { return all.filter(function (m) { return m.status === st; }).length; };
    var groups = C.JOURNEYS.map(function (J) {
      var mine = all.filter(function (m) { return E.journeyOf(C, m.level) === J; });
      if (!mine.length) return null;
      return h('section', { class: 'card mastery' },
        h('h3', null, h('span', { 'aria-hidden': 'true', text: J.icon + ' ' }), J.title),
        h('ul', { class: 'mastery-list' }, mine.map(function (m) {
          var dots = [];
          for (var i = 1; i <= E.REVIEW_GAPS.length; i++) dots.push(h('span', { class: 'mdot' + (i <= m.box ? ' on' : '') }));
          return h('li', { class: 'mrow s-' + m.status },
            h('span', { class: 'mrow-name', text: m.name }),
            h('span', { class: 'mdots', role: 'img', 'aria-label': m.box + ' of ' + E.REVIEW_GAPS.length + ' right in a row' }, dots),
            h('span', { class: 'mrow-status' }, h('span', { 'aria-hidden': 'true', text: STATUS[m.status][1] + ' ' }),
              m.status === 'learning' || m.status === 'strong' ? STATUS[m.status][0] + ' · back ' + m.due : STATUS[m.status][0]));
        })));
    });
    return [title,
      h('p', { class: 'section-sub', text: all.length + ' of ' + total + ' ideas learned · ' + (count('due') + count('new')) +
        ' to review · ' + count('strong') + ' strong. Weakest first.' }),
      (count('due') + count('new')) ? h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/review' }, 'Review now')) : null,
      groups];
  }

  /* What employers ask for: the researched tally behind the LLM journey, with its sources and date. */
  function market() {
    var M = C.MARKET;
    if (!M) return null;
    var top = M.skills[0].count;
    return [
      h('h2', { class: 'section-title', text: 'What employers ask for' }),
      h('p', { class: 'section-sub', text: M.summary + ' Last reviewed ' + M.reviewed + '.' }),
      h('ul', { class: 'card market' }, M.skills.map(function (sk) {
        var fill = h('span', { class: 'jbar-fill' });
        fill.style.width = Math.round(sk.count / top * 100) + '%';
        return h('li', { class: 'market-row' },
          h('span', { class: 'market-name', text: sk.name }),
          h('span', { class: 'jbar', 'aria-hidden': 'true' }, fill),
          h('span', { class: 'market-count', text: sk.count + ' of ' + M.postings }));
      })),
      h('ul', { class: 'card toolbox' }, M.tools.map(function (t) {
        return h('li', { class: 'tool-row' },
          h('span', { class: 'tool-kind', text: t.kind }),
          h('span', { class: 'tool-names', text: t.names.join(' · ') }));
      })),
      h('p', { class: 'section-sub market-caveat', text: M.caveat }),
      h('details', { class: 'card market-sources' },
        h('summary', { text: 'Sources (' + M.sources.length + ')' }),
        h('ol', null, M.sources.map(function (src) {
          return h('li', null, h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, src.label + ' ↗'));
        })))
    ];
  }

  function viewCodex() {
    document.title = 'Codex — Axon';
    var cards = C.LEVELS.map(function (L, i) {
      var n = E.starsOf(state, L.id);
      return h('li', { class: 'codex-card' + (n ? '' : ' locked') },
        h('span', { class: 'codex-icon', 'aria-hidden': 'true', text: n ? L.icon : '🔒' }),
        h('h3', { text: n ? L.title : 'Level ' + (i + 1) }),
        h('p', { text: n ? L.key : 'Finish this level to unlock its card.' }),
        n ? UI.stars(n) : null);
    });
    var mine = E.badgesOf(C, state);
    var badges = E.BADGES.map(function (b) {
      var got = mine.indexOf(b.id) !== -1;
      return h('li', { class: 'badge' + (got ? ' got' : '') },
        h('span', { 'aria-hidden': 'true', text: got ? b.icon : '❔' }), ' ' + b.name,
        h('span', { class: 'sr', text: got ? ' (earned)' : ' (not yet earned)' }));
    });
    var toolbox = C.TOOLBOX.map(function (t) {
      return h('li', { class: 'tool-row' },
        h('span', { class: 'tool-kind' }, h('span', { 'aria-hidden': 'true', text: t.icon + ' ' }), t.name),
        h('span', { class: 'tool-names', text: t.tools.join(' · ') }));
    });

    var agentCard = null;
    if (state.agent && E.starsOf(state, 'boss')) {
      var bp = E.buildBlueprint(C, state.agent);
      agentCard = h('section', { class: 'card agent-sheet' },
        h('h2', { text: state.agent.avatar + ' ' + state.agent.name + ' — your agent' }),
        h('pre', { class: 'code', tabindex: '0' }, h('code', { text: bp.systemPrompt })),
        h('a', { class: 'btn', href: '#/level/boss' }, 'Rebuild'));
    }

    var armed = false;
    var reset = h('button', { class: 'btn danger', type: 'button', onclick: function () {
      if (!armed) { armed = true; reset.textContent = 'Tap again to erase everything'; return; }
      state = E.defaultState();
      save();
      window.location.hash = '#/map';
    } }, 'Reset progress');

    UI.fill(app, h('div', { class: 'codex' },
      pageHead('#/map', 'Back to all journeys', '📖', 'Your cheat sheet', 'Codex'),
      h('h2', { class: 'section-title', text: 'Core ideas' }),
      h('ul', { class: 'codex-grid' }, cards),
      h('h2', { class: 'section-title', text: 'Playbooks' }),
      h('p', { class: 'section-sub', text: 'Each real-world pipeline, with the popular tool for every step and common alternatives.' }),
      h('ul', { class: 'codex-grid wide' }, C.MISSIONS.map(playbook)),
      h('h2', { class: 'section-title', text: 'Builder\'s toolbox' }),
      h('p', { class: 'section-sub', text: 'What agents themselves are built with.' }),
      h('ul', { class: 'card toolbox' }, toolbox),
      toolsReview(),
      mastery(),
      market(),
      h('h2', { class: 'section-title', text: 'Badges' }),
      h('ul', { class: 'badges' }, badges),
      agentCard,
      h('div', { class: 'reset-row' }, reset)));
  }

  /* The skip link must move focus without touching the hash (the hash is our router). */
  skip.addEventListener('click', function (e) {
    e.preventDefault();
    app.focus();
  });

  /* Another tab saved progress: adopt it so this tab never overwrites it with stale state. */
  window.addEventListener('storage', function (e) {
    if (e.key !== null && e.key !== STORE_KEY) return;
    state = load();
    renderHud();
  });

  window.addEventListener('hashchange', route);
  route();
})();
