/* Play-through script. Not part of the app: nothing loads this file.

   What it does: plays every level of every journey to its result dialog in a real browser,
   picking the right answers from Content, and reports failures and horizontal page overflow.

   How to run it:
   1. Open the app (npm start, then http://127.0.0.1:4173) and, for a phone-width check, narrow
      the window to 375px.
   2. Open the browser console and paste this whole file.
   3. Then run:   await Playthrough.all()
      It first unlocks everything in memory by setting one star per level, and puts your saved
      progress back when it finishes (or call Playthrough.restore() yourself if it is interrupted).

   It takes about a minute and a half. A clean run prints "169 played, 0 failed" (the number
   grows with the content). Rerun it after changing any game or level data. */
var Playthrough = (function () {
  'use strict';
  /* The saved progress of whichever profile is active. */
  var KEY = (function () {
    var P = null;
    try { P = JSON.parse(localStorage.getItem('agentcraft.profiles')); } catch (e) { /* no profiles saved */ }
    return Engine.profileKey(Engine.sanitizeProfiles(P).active);
  })(), SNAP = 'playthrough.snapshot';
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.from(document.querySelectorAll(s)); };
  var btn = function (t) { return $$('#app button:not([disabled])').find(function (b) { return b.textContent.trim().includes(t); }); };
  var modal = function () { return $('.modal'); };
  var first = function (b) { return b.querySelector('.chip-text').firstChild.textContent; };
  async function waitFor(fn, ms) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 8000)) { var v = fn(); if (v) return v; await sleep(50); }
    return null;
  }
  async function recall(lookup) {
    for (var g = 0; g < 40; g++) {
      if (modal()) return;
      var q = $('.question');
      if (!q) { await sleep(80); if (!$('.question')) return; continue; }
      var a = lookup(q.textContent);
      if (!a) throw new Error('no answer known for: ' + q.textContent);
      var b = $$('.answer').find(function (x) { return x.querySelector('.answer-text').textContent === a; });
      if (!b) throw new Error('right answer not offered: ' + a);
      b.click();
      var next = $('.why button');
      if (!next) throw new Error('no Next button after answering');
      next.click();
      await sleep(20);
    }
  }
  var bankA = function (q) { var b = Content.BANK.find(function (x) { return x.q === q; }); return b && b.a; };

  var G = {
    learn: async function (L) { for (var i = 0; i < L.cards.length - 1; i++) btn('Next').click(); btn('Quick check').click(); await recall(bankA); },
    quiz: async function () { await recall(bankA); },
    'case': async function (L) { await recall(function (q) { var s = L.steps.find(function (x) { return x.q === q; }); return s && s.a; }); },
    sort: async function (L) {
      var P = L.puzzle;
      for (var g = 0; g < 80 && !modal(); g++) {
        var w = $('.why.shown button');
        if (w) { w.click(); continue; }
        var it = P.items.find(function (i) { return i.text === $('.sort-text').textContent; });
        $$('.bin')[P.buckets.findIndex(function (b) { return b.id === it.bucket; })].click();
      }
    },
    order: async function (L) {
      L.puzzle.steps.forEach(function (s) { $$('button.ostep').find(function (b) { return b.textContent.includes(s.text); }).click(); });
      btn('Finish').click();
    },
    fix: async function (L) {
      for (var k = 0; k < L.cases.length; k++) {
        var c = L.cases[k];
        var steps = await waitFor(function () { var s = $$('.tstep'); return s.length === c.steps.length && !$('.answer') ? s : null; }, 3000);
        if (!steps) throw new Error('run ' + (k + 1) + ' never showed');
        steps[c.steps.findIndex(function (s) { return s.bad; })].click();
        var a = await waitFor(function () { return $$('.answer').find(function (x) { return x.querySelector('.answer-text').textContent === c.a; }); }, 3000);
        if (!a) throw new Error('the right fix was not offered: ' + c.a);
        a.click();
        var next = await waitFor(function () { return $('.why button'); }, 3000);
        if (!next) throw new Error('no button after the fix');
        next.click();
      }
    },
    sim: async function (L) {
      L.sim.slots.forEach(function (sl) {
        var st = L.sim.steps.find(function (x) { return x.slot === sl.id; });
        var name = sl.options.find(function (o) { return o.id === st.ok[0]; }).name;
        $$('.sim-opt').find(function (b) { return b.textContent === name; }).click();
      });
      btn('Run the agent').click();
      var f = await waitFor(function () { return btn('Finish'); }, 9000);
      if (!f) throw new Error('the run never finished');
      f.click();
    },
    mission: async function (L) {
      L.stages.forEach(function (s) { $$('.palette .chip:not([disabled])').find(function (b) { return first(b) === s.name; }).click(); });
      btn('Check order').click();
      if (!await waitFor(function () { return $('.marrow'); }, 3000)) throw new Error('the tools round never came');
      L.stages.forEach(function (s) { $$('.palette .chip:not([disabled])').find(function (b) { return first(b) === s.tool; }).click(); });
      btn('Check tools').click();
      var pick = await waitFor(function () { return $('.mpick[data-stage="' + L.gate + '"]'); }, 3000);
      if (!pick) throw new Error('the approval round never came');
      pick.click();
      var f = await waitFor(function () { return btn('Finish'); }, 8000);
      if (!f) throw new Error('no Finish button');
      f.click();
    },
    loop: async function () {
      for (var id of ['w_inn', 'w_osl', 'a_inn']) {
        var a = Content.LOOP.actions.find(function (x) { return x.id === id; });
        (await waitFor(function () { return $$('.action:not([disabled])').find(function (x) { return x.textContent.includes(a.label); }); })).click();
        await sleep(1250);
      }
    },
    tools: async function () {
      for (var r of Content.TOOL_ROUNDS) {
        await waitFor(function () { return btn('Run agent'); });
        r.needs.forEach(function (t) { $$('.chip').find(function (b) { return b.textContent.includes(Content.TOOLS[t].name); }).click(); });
        btn('Run agent').click();
        (await waitFor(function () { return btn('Next job') || btn('Finish'); })).click();
        await sleep(60);
      }
    },
    prompt: async function () {
      Content.PROMPT.blocks.filter(function (x) { return x.good; }).forEach(function (b) {
        $$('.chip').find(function (c) { return c.textContent.includes(b.name); }).click();
      });
      btn('Ship it').click();
    },
    memory: async function () {
      var add = function (id) {
        var text = Content.MEMORY.cards.find(function (x) { return x.id === id; }).text;
        $$('.memcard').find(function (b) { return b.textContent.includes(text); }).click();
      };
      add('seat'); add('trip'); add('meal');
      $('[data-slot="0"]').click(); $('[data-slot="1"]').click();
      btn('Squash').click();
      add('id');
      btn('Run agent').click();
      await sleep(1300);
    },
    pipeline: async function () {
      for (var p of Content.PIPES) {
        Engine.pipeSlots(p).forEach(function (sl) {
          $$('.palette .chip:not([disabled])').find(function (b) { return b.textContent.includes(Content.NODES[sl.want].name); }).click();
        });
        btn('Run pipeline').click();
        var nx = await waitFor(function () { return btn('Next pattern') || btn('Finish'); }, 6000);
        if (!nx) throw new Error('pipeline never finished: ' + p.id);
        nx.click();
        await sleep(40);
      }
    },
    guard: async function () {
      for (var a of Content.ATTACKS) {
        (await waitFor(function () { return $$('.shield:not([disabled])').find(function (x) { return x.textContent.includes(Content.SHIELDS[a.fix].name); }); })).click();
        (await waitFor(function () { return btn('Next threat') || btn('Finish'); })).click();
        await sleep(60);
      }
    },
    trace: async function () {
      for (var t of Content.TRACES) {
        await waitFor(function () { return $$('.tstep:not([disabled])').length === t.steps.length; });
        $$('.tstep')[t.steps.findIndex(function (s) { return s.bad; })].click();
        (btn('Next case') || btn('Finish')).click();
        await sleep(40);
      }
    },
    boss: async function () {
      $$('.chip').forEach(function (b) { if (b.getAttribute('aria-pressed') !== 'true' && !b.classList.contains('avatar')) b.click(); });
      btn('Launch trials').click();
      var f = await waitFor(function () { return btn('Finish'); }, 8000);
      if (!f) throw new Error('no Finish button after the trials');
      f.click();
    }
  };

  var wide = function () { return document.documentElement.scrollWidth > document.documentElement.clientWidth; };

  async function level(L, J) {
    var out = { id: L.id };
    try {
      window.location.hash = '#/level/' + L.id;
      await sleep(120);
      var play = await waitFor(function () { return btn('Play'); }, 2000);
      if (!play) throw new Error('no Play button (level locked?)');
      play.click();
      await sleep(30);
      var overflow = wide();
      await G[J.kind === 'mission' ? 'mission' : (L.game || L.id)](L);
      var m = await waitFor(modal, 3000);
      if (!m) throw new Error('no result dialog');
      out.stars = m.querySelectorAll('.star.on').length;
      if (overflow || wide()) out.overflow = true;
    } catch (e) { out.err = String(e && e.message || e).slice(0, 200); }
    return out;
  }

  async function play(ids) {
    var res = [];
    for (var id of ids) {
      var J = Engine.journeyOf(Content, id);
      res.push(await level(J.levels.find(function (l) { return l.id === id; }), J));
    }
    return res;
  }

  function restore() {
    var snap = sessionStorage.getItem(SNAP);
    if (snap === null) return false;
    if (snap) localStorage.setItem(KEY, snap); else localStorage.removeItem(KEY);
    sessionStorage.removeItem(SNAP);
    window.location.hash = '#/map';
    window.location.reload();
    return true;
  }

  /* Unlocking needs a reload so the app reads the new state; the page then loses this script.
     So all() works in two calls: the first prepares and reloads, the second (after pasting
     the file again) plays. */
  async function all() {
    if (sessionStorage.getItem(SNAP) === null) {
      var raw = localStorage.getItem(KEY) || '';
      sessionStorage.setItem(SNAP, raw);
      var st = raw ? JSON.parse(raw) : {};
      st.stars = st.stars || {};
      Engine.allIds(Content).forEach(function (id) { st.stars[id] = st.stars[id] || 1; });
      st.sound = false;
      localStorage.setItem(KEY, JSON.stringify(st));
      window.location.reload();
      return 'Unlocked everything and reloaded. Paste this file again and run: await Playthrough.all()';
    }
    var res = await play(Engine.allIds(Content));
    var failed = res.filter(function (r) { return r.err; }), over = res.filter(function (r) { return r.overflow; });
    console.table(failed.concat(over));
    var summary = res.length + ' played, ' + failed.length + ' failed, ' + over.length + ' with page overflow';
    console.log(summary + '. Restoring your saved progress…');
    restore();
    return summary;
  }

  return { all: all, play: play, restore: restore };
})();
