/* Axon — tiny DOM toolkit shared by every screen.
   SECURITY: the DOM is only ever built through h(), which writes text via text nodes and sets
   only the attributes on its allow list. No markup is ever parsed from a string. */
var Games = {};

/* Full-read lesson text. Each course/addy/NN.js file calls Course.add(); the reader asks for a
   lesson with Course.load(), which adds that one <script> the first time (same origin, CSP 'self'). */
var Course = (function () {
  'use strict';
  var text = {}, waiting = {};
  function add(no, md) {
    if (typeof no !== 'string' || typeof md !== 'string') return;
    text[no] = md;
    (waiting[no] || []).forEach(function (w) { w.ok(md); });
    delete waiting[no];
  }
  function load(no, ok, fail) {
    if (!/^\d\d$/.test(no)) { fail(); return; }
    if (Object.prototype.hasOwnProperty.call(text, no)) { ok(text[no]); return; }
    if (waiting[no]) { waiting[no].push({ ok: ok, fail: fail }); return; }
    waiting[no] = [{ ok: ok, fail: fail }];
    var tag = document.createElement('script');
    /* Carry the app's ?v= number, so a rebuilt lesson is not served from the browser's cache. */
    var me = document.querySelector('script[src*="js/ui.js"]');
    var ver = me && /\?v=\d+$/.exec(me.getAttribute('src') || '');
    tag.src = 'course/addy/' + no + '.js' + (ver ? ver[0] : '');
    var giveUp = function () {
      (waiting[no] || []).forEach(function (w) { w.fail(); });
      delete waiting[no];
    };
    tag.addEventListener('error', giveUp);
    /* The file ran but never called Course.add (broken or wrong lesson): do not wait for ever. */
    tag.addEventListener('load', function () {
      if (!Object.prototype.hasOwnProperty.call(text, no)) giveUp();
    });
    document.head.appendChild(tag);
  }
  return { add: add, load: load };
})();
var UI = (function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  /* An allow list, not a block list: an attribute this app has no use for can never be set by mistake. */
  var ALLOWED = { 'class': 1, id: 1, type: 1, href: 1, target: 1, rel: 1, role: 1, tabindex: 1, disabled: 1, hidden: 1,
    'for': 1, maxlength: 1, autocomplete: 1, spellcheck: 1, value: 1, scope: 1,
    viewBox: 1, d: 1, preserveAspectRatio: 1, focusable: 1 };
  function allowed(k) {
    return Object.prototype.hasOwnProperty.call(ALLOWED, k) || /^aria-[a-z]{1,24}$/.test(k) || /^data-[a-z-]{1,24}$/.test(k);
  }

  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }

  function setProps(el, props) {
    if (!props) return;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k.slice(0, 2) === 'on') {
        if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        return; /* handlers are functions only — never attribute strings */
      }
      /* Links may only point inside the app or at a plain web address, whatever the caller passes. */
      if (k === 'href' && !/^(#|https?:\/\/)/i.test(String(v))) return;
      if (k === 'text') el.textContent = String(v);
      else if (allowed(k)) el.setAttribute(k, v === true ? '' : String(v));
    });
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    setProps(el, props);
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }

  /* Replace an element's children. Unlike replaceChildren(), accepts nested arrays and nulls. */
  function fill(el) {
    el.replaceChildren();
    for (var i = 1; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }

  function svg(tag, props) {
    var el = document.createElementNS(SVG_NS, tag);
    setProps(el, props);
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }

  /* The mascot. mood: idle | happy | oops */
  function bot(mood, extraClass) {
    var wrap = h('span', { class: 'botwrap' + (extraClass ? ' ' + extraClass : ''), 'data-mood': mood || 'idle' });
    var tpl = document.getElementById('tpl-bot');
    if (tpl && tpl.content) wrap.appendChild(tpl.content.cloneNode(true));
    return wrap;
  }

  function stars(n, animate) {
    var wrap = h('span', { class: 'stars' + (animate ? ' animate' : ''), role: 'img', 'aria-label': n + ' of 3 stars' });
    for (var i = 1; i <= 3; i++) wrap.appendChild(h('span', { class: 'star' + (i <= n ? ' on' : ''), 'aria-hidden': 'true', text: '★' }));
    return wrap;
  }

  function dots(total, current) {
    var wrap = h('div', { class: 'dots', role: 'img', 'aria-label': 'Round ' + (current + 1) + ' of ' + total });
    for (var i = 0; i < total; i++) {
      wrap.appendChild(h('span', { class: 'dot' + (i < current ? ' done' : i === current ? ' on' : '') }));
    }
    return wrap;
  }

  function meter(label) {
    var fill = h('div', { class: 'meter-fill' });
    var value = h('span', { class: 'meter-value' });
    var el = h('div', { class: 'meter' },
      h('div', { class: 'meter-top' }, h('span', { text: label }), value),
      h('div', { class: 'meter-track' }, fill));
    return {
      el: el,
      set: function (pct, text, tone) {
        fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        value.textContent = text;
        el.setAttribute('data-tone', tone || 'ok');
      }
    };
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth; /* restart the animation */
    el.classList.add('shake');
  }

  function setPressed(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('on', !!on);
  }

  /* A small diagram for a key-lesson card, built from data. Every part is real text.
     ['flow', [boxes], loops?] | ['stack', ['Name: detail', ...]] | ['vs', titleA, [..], titleB, [..]] */
  function diagram(v) {
    if (!v) return null;
    if (v[0] === 'flow') {
      var parts = [];
      v[1].forEach(function (label, i) {
        if (i) parts.push(h('span', { class: 'dg-arrow', 'aria-hidden': 'true', text: '→' }));
        parts.push(h('span', { class: 'dg-box', text: label }));
      });
      if (v[2]) parts.push(h('span', { class: 'dg-loop', text: '↻ repeat' }));
      return h('div', { class: 'dg dg-flow' }, parts);
    }
    if (v[0] === 'stack') {
      return h('ol', { class: 'dg dg-stack' }, v[1].map(function (row) {
        var k = row.indexOf(': ');
        return h('li', null, k < 0 ? row : [h('strong', { text: row.slice(0, k) }), row.slice(k + 1)]);
      }));
    }
    if (v[0] === 'vs') {
      var col = function (title, items) {
        return h('div', { class: 'dg-col' }, h('strong', { text: title }),
          h('ul', null, items.map(function (t) { return h('li', { text: t }); })));
      };
      return h('div', { class: 'dg dg-vs' }, col(v[1], v[2]), col(v[3], v[4]));
    }
    return null;
  }

  /* ---------- sound: synthesised, no audio files ---------- */
  var audio = null, soundOn = true;
  var TUNES = {
    tap: [[520, 0, 0.05]],
    good: [[660, 0, 0.08], [880, 0.08, 0.14]],
    bad: [[196, 0, 0.18]],
    win: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]]
  };

  function sfx(name) {
    if (!soundOn || !TUNES[name]) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      if (audio.state === 'suspended') audio.resume();
      var t0 = audio.currentTime;
      TUNES[name].forEach(function (n) {
        var osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = name === 'bad' ? 'sawtooth' : 'triangle';
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.0001, t0 + n[1]);
        gain.gain.linearRampToValueAtTime(0.07, t0 + n[1] + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        osc.connect(gain); gain.connect(audio.destination);
        osc.start(t0 + n[1]); osc.stop(t0 + n[1] + n[2] + 0.02);
      });
    } catch (e) { /* sound is optional */ }
  }

  function setSound(on) { soundOn = !!on; }

  /* ---------- confetti ---------- */
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function confetti() {
    if (reducedMotion()) return;
    var canvas = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    var g = canvas.getContext && canvas.getContext('2d');
    if (!g) return;
    var w = window.innerWidth, ht = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = ht * dpr;
    g.scale(dpr, dpr);
    document.body.appendChild(canvas);
    var colors = ['#0a84ff', '#30d158', '#ffd60a', '#ff375f', '#bf5af2', '#f5f5f7'];
    var parts = [];
    for (var i = 0; i < 110; i++) {
      parts.push({
        x: w / 2 + (Math.random() - 0.5) * 120, y: ht * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 3,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        s: 6 + Math.random() * 6, c: colors[i % colors.length]
      });
    }
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = (now - start) / 1000;
      g.clearRect(0, 0, w, ht);
      g.globalAlpha = Math.max(0, 1 - t / 2.2);
      parts.forEach(function (p) {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        g.restore();
      });
      if (t < 2.2 && canvas.isConnected) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  return {
    h: h, fill: fill, svg: svg, diagram: diagram, bot: bot, stars: stars, dots: dots, meter: meter, shake: shake,
    setPressed: setPressed, sfx: sfx, setSound: setSound, confetti: confetti, reducedMotion: reducedMotion
  };
})();
