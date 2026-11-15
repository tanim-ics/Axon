/* Axon — a small, safe Markdown parser for the full-read mode. Pure: text in, plain data out.
   It never produces HTML. The app turns the result into DOM with UI.h(), so lesson text can
   never become markup or script. Supports what the bundled lessons use: headings, paragraphs,
   lists, code fences, tables, quotes, rules, and inline code / bold / italic / links. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Markdown = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Only plain web links and links to another lesson survive. Everything else is shown as text. */
  var UNSAFE_CHARS = /[\u0000-\u0020\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069"'<>]/;
  function safeHref(url) {
    var u = String(url).trim();
    if (u.length > 2000 || UNSAFE_CHARS.test(u)) return null; /* no control or direction-flipping characters */
    if (/^https?:\/\//i.test(u)) {
      try {
        var parsed = new URL(u);
        /* user:pass@host makes a link look like one site and go to another */
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password) {
          return { href: u, external: true };
        }
      } catch (e) { /* not a URL */ }
      return null;
    }
    var m = /^\.\.\/(\d\d)-[a-z0-9-]+\/?(?:README\.md)?(?:#.*)?$/i.exec(u);
    if (m) return { href: '#/read/' + m[1], external: false };
    return null;
  }

  /* Every quantifier is bounded so hostile text cannot make matching slow. */
  var INLINE = /(`[^`]{1,400}`)|(\*\*[^*]{1,400}(?:\*[^*]{1,400}){0,4}\*\*)|(\*[^*\s][^*]{0,400}\*)|(!?\[[^\]\[]{0,400}\]\([^)\s]{0,2000}\))/;
  var MAX_LINE = 20000;

  function inline(text) {
    var out = [], rest = String(text);
    function push(v) { if (v) out.push({ t: 'text', v: v }); }
    while (rest) {
      var m = INLINE.exec(rest);
      if (!m) { push(rest); break; }
      push(rest.slice(0, m.index));
      var tok = m[0];
      if (m[1]) out.push({ t: 'code', v: tok.slice(1, -1) });
      else if (m[2]) out.push({ t: 'b', s: inline(tok.slice(2, -2)) });
      else if (m[3]) out.push({ t: 'i', v: tok.slice(1, -1) });
      else {
        var lm = /^(!?)\[([^\]\[]{0,400})\]\(([^)\s]{0,2000})\)$/.exec(tok);
        var link = lm[1] ? null : safeHref(lm[3]);
        if (link) out.push({ t: 'a', v: lm[2], href: link.href, external: link.external });
        else push(lm[2]);
      }
      rest = rest.slice(m.index + tok.length);
    }
    return out;
  }

  function cells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return inline(c.trim()); });
  }

  function parse(md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n').map(function (l) {
      return l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l;
    });
    var blocks = [], i = 0, para = [];
    function flush() {
      if (para.length) blocks.push({ t: 'p', s: inline(para.join(' ')) });
      para = [];
    }
    while (i < lines.length) {
      var line = lines[i], m;
      if ((m = /^\s*```\s*([A-Za-z0-9_-]*)\s*$/.exec(line))) {
        flush();
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
        i++;
        blocks.push({ t: 'code', lang: m[1], text: code.join('\n') });
        continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
        flush();
        var title = m[2].trim();
        while (title.charAt(title.length - 1) === '#') title = title.slice(0, -1); /* closing #s, without a regex scan */
        blocks.push({ t: 'h', n: Math.min(m[1].length, 4), s: inline(title.trim()) });
        i++; continue;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); blocks.push({ t: 'hr' }); i++; continue; }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && lines[i + 1].indexOf('|') !== -1 && /^[\s:|-]+$/.test(lines[i + 1])) {
        flush();
        var table = { t: 'table', head: cells(line), rows: [] };
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) table.rows.push(cells(lines[i++]));
        blocks.push(table);
        continue;
      }
      if (/^\s*>/.test(line)) {
        flush();
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
        blocks.push({ t: 'quote', s: inline(quote.join(' ')) });
        continue;
      }
      if ((m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line))) {
        flush();
        var list = { t: /\d/.test(m[2]) ? 'ol' : 'ul', items: [] };
        while (i < lines.length) {
          var lm = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
          if (lm && lm[1].length < 2 && (/\d/.test(lm[2]) ? 'ol' : 'ul') !== list.t) break;
          if (lm) {
            list.items.push({ d: lm[1].length >= 2 ? 1 : 0, text: lm[3].replace(/^\[[ xX]\]\s+/, '') });
          } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && list.items.length) {
            list.items[list.items.length - 1].text += ' ' + lines[i].trim();
          } else break;
          i++;
        }
        list.items = list.items.map(function (it) { return { d: it.d, s: inline(it.text) }; });
        blocks.push(list);
        continue;
      }
      para.push(line.trim());
      i++;
    }
    flush();
    return blocks;
  }

  return { parse: parse, inline: inline, safeHref: safeHref };
});
