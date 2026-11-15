'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/content.js');
const E = require('../js/engine.js');

const ids = C.LEVELS.map((l) => l.id);

/* ---------- content integrity: every puzzle must be winnable ---------- */

test('content: level ids are unique and each has copy', () => {
  assert.equal(new Set(ids).size, ids.length);
  C.LEVELS.forEach((l) => ['icon', 'title', 'tag', 'idea', 'play', 'key'].forEach((k) => assert.ok(l[k], l.id + '.' + k)));
});

test('content: tool rounds and missions only reference real, safe tools', () => {
  [...C.TOOL_ROUNDS, ...C.BOSS.missions].forEach((r) => r.needs.forEach((t) => {
    assert.ok(C.TOOLS[t], t);
    assert.ok(!C.TOOLS[t].danger, 'danger tool must never be required');
  }));
});

test('content: every pipeline puzzle is solvable from its palette', () => {
  C.PIPES.forEach((p) => {
    const placed = {};
    E.pipeSlots(p).forEach((s) => {
      assert.ok(p.palette.includes(s.want), p.id + ' palette lacks ' + s.want);
      placed[s.key] = s.want;
    });
    p.palette.forEach((n) => assert.ok(C.NODES[n], n));
    p.stages.flat().forEach((s) => s.fixed && assert.ok(C.NODES[s.fixed], s.fixed));
    assert.equal(E.checkPipeline(p, placed).ok, true);
  });
});

test('content: each trace has exactly one bad step; each attack has a real shield', () => {
  C.TRACES.forEach((t) => {
    assert.equal(t.steps.filter((s) => s.bad).length, 1);
    t.steps.forEach((s) => assert.ok(C.TRACE_KINDS[s.k]));
  });
  C.ATTACKS.forEach((a) => assert.ok(C.SHIELDS[a.fix]));
});

/* ---------- state ---------- */

test('sanitizeState: hostile or corrupt storage becomes a clean state', () => {
  const evil = JSON.parse('{"__proto__":{"polluted":1},"stars":{"loop":99,"nope":3,"tools":"3","prompt":2},' +
    '"streak":{"count":-4,"last":"<img onerror=x>"},"sound":"yes",' +
    '"agent":{"name":"<script>alert(1)</script>","avatar":"💀","mission":"x","tools":["nuke","nuke","zzz",7],"memory":"true"}}');
  const s = E.sanitizeState(C, evil);
  assert.deepEqual(s.stars, { prompt: 2 });
  assert.deepEqual(s.streak, { count: 0, last: '', best: 0 });
  assert.equal(s.agent.name, 'scriptalert1scri');
  assert.equal(s.agent.avatar, C.BOSS.avatars[0]);
  assert.equal(s.agent.mission, 'research');
  assert.deepEqual(s.agent.tools, ['nuke']);
  assert.equal(s.agent.memory, false);
  assert.equal({}.polluted, undefined);
  [null, 42, 'x', [], undefined].forEach((bad) => assert.deepEqual(E.sanitizeState(C, bad), E.defaultState()));
});

test('cleanName: strips markup, caps length, never empty', () => {
  assert.equal(E.cleanName('  Robo   Cop  '), 'Robo Cop');
  assert.equal(E.cleanName('"><svg/onload=1>'), 'svgonload1');
  assert.equal(E.cleanName('💥💥'), 'Bit');
  assert.equal(E.cleanName(null), 'Bit');
  assert.ok(E.cleanName('a'.repeat(99)).length <= E.NAME_MAX);
});

test('unlocking: levels open one at a time', () => {
  let s = E.defaultState();
  assert.equal(E.isUnlocked(C, s, 'loop'), true);
  assert.equal(E.isUnlocked(C, s, 'tools'), false);
  assert.equal(E.isUnlocked(C, s, 'ghost'), false);
  assert.equal(E.nextLevelId(C, s), 'loop');
  s = E.awardLevel(C, s, 'loop', 1, '2026-01-01').state;
  assert.equal(E.isUnlocked(C, s, 'tools'), true);
  assert.equal(E.nextLevelId(C, s), 'tools');
});

test('awardLevel: xp, no star loss, no farming, input not mutated', () => {
  const s0 = E.defaultState();
  const a = E.awardLevel(C, s0, 'loop', 2, '2026-01-01');
  assert.equal(a.gained, 2 * E.XP_PER_STAR + E.XP_FIRST);
  assert.deepEqual(s0.stars, {});
  assert.deepEqual(a.newBadges, ['first']);
  const b = E.awardLevel(C, a.state, 'loop', 1, '2026-01-01');
  assert.equal(b.gained, 0);
  assert.equal(b.state.stars.loop, 2);
  const c = E.awardLevel(C, b.state, 'loop', 3, '2026-01-01');
  assert.equal(c.gained, E.XP_PER_STAR);
  assert.ok(c.newBadges.includes('sharp'));
  assert.equal(E.awardLevel(C, s0, 'ghost', 3, '2026-01-01').gained, 0);
  assert.equal(E.awardLevel(C, s0, 'loop', 7, '2026-01-01').gained, 0);
});

test('full run: all levels 3★ reaches top rank, graduate and all-star', () => {
  let s = E.defaultState();
  ids.forEach((id) => { s = E.awardLevel(C, s, id, 3, '2026-01-01').state; });
  const xp = E.xpOf(s);
  assert.equal(xp, ids.length * (3 * E.XP_PER_STAR + E.XP_FIRST));
  assert.equal(E.rankOf(xp).name, 'Agent Master');
  assert.equal(E.nextLevelId(C, s), 'm-video');
  assert.ok(!E.badgesOf(C, s).includes('field'));
  const b = E.badgesOf(C, s);
  ['grad', 'allstar', 'half', 'guardian', 'sleuth'].forEach((x) => assert.ok(b.includes(x), x));
  b.forEach((x) => assert.ok(E.BADGES.some((d) => d.id === x)));
});

test('rankOf: thresholds and progress', () => {
  assert.equal(E.rankOf(0).name, 'Rookie');
  assert.equal(E.rankOf(119).name, 'Rookie');
  assert.equal(E.rankOf(120).name, 'Tinkerer');
  assert.equal(E.rankOf(60).progress, 0.5);
});

test('streak: same day, next day, gap, month boundary', () => {
  const s = E.defaultState();
  s.streak = E.touchStreak(s, '2026-01-31');
  assert.deepEqual(s.streak, { count: 1, last: '2026-01-31', best: 1 });
  assert.equal(E.touchStreak(s, '2026-01-31').count, 1);
  s.streak = E.touchStreak(s, '2026-02-01');
  assert.equal(s.streak.count, 2);
  assert.equal(E.touchStreak(s, '2026-02-05').count, 1);
  assert.equal(E.touchStreak(s, 'garbage'), s.streak);
  assert.equal(E.liveStreak(s, '2026-02-01'), 2);
  assert.equal(E.liveStreak(s, '2026-02-02'), 2);
  assert.equal(E.liveStreak(s, '2026-02-03'), 0);
  assert.equal(E.liveStreak(E.defaultState(), '2026-02-03'), 0);
  s.streak = E.touchStreak(s, '2026-02-02');
  assert.ok(E.badgesOf(C, s).includes('streak'));
  s.streak = E.touchStreak(s, '2026-03-01');
  assert.deepEqual(s.streak, { count: 1, last: '2026-03-01', best: 3 });
  assert.ok(E.badgesOf(C, s).includes('streak'), 'earned badge survives a broken streak');
  const round = E.sanitizeState(C, JSON.parse(JSON.stringify(s)));
  assert.deepEqual(round.streak, s.streak);
  assert.equal(E.sanitizeState(C, { streak: { count: 2, last: '2026-03-01', best: 'x' } }).streak.best, 2);
});

/* ---------- field missions ---------- */

test('missions: content is well-formed and every mission is winnable', () => {
  const mids = C.MISSIONS.map((m) => m.id);
  assert.equal(new Set(mids).size, mids.length);
  mids.forEach((id) => assert.ok(id.startsWith('m-') && !ids.includes(id)));
  C.MISSIONS.forEach((m) => {
    ['icon', 'title', 'tag', 'idea', 'play', 'key', 'gateWhy'].forEach((k) => assert.ok(m[k], m.id + '.' + k));
    assert.ok(m.stages.length >= 4 && m.stages.length <= 6, m.id);
    const sids = m.stages.map((s) => s.id), tools = m.stages.map((s) => s.tool);
    assert.equal(new Set(sids).size, sids.length, m.id + ' stage ids');
    assert.equal(new Set(tools).size, tools.length, m.id + ' tools must be unique or the round is ambiguous');
    assert.ok(sids.includes(m.gate), m.id + ' gate');
    m.stages.forEach((s) => { assert.ok(s.icon && s.name && s.does && s.tool); assert.ok(s.also.length >= 2); });
    assert.equal(E.checkSequence(m.stages, sids).ok, true);
  });
  C.TOOLBOX.forEach((t) => assert.ok(t.icon && t.name && t.tools.length));
});

test('missions: checkSequence reports wrong slots, including empty ones', () => {
  const st = C.MISSIONS[0].stages, good = st.map((s) => s.id);
  const swapped = good.slice(); swapped[0] = good[1]; swapped[1] = good[0]; swapped[3] = null;
  assert.deepEqual(E.checkSequence(st, swapped), { ok: false, wrong: [0, 1, 3] });
  assert.equal(E.checkSequence(st, []).wrong.length, st.length);
});

test('missions: locked until guardrails are learned, then all open; stars persist', () => {
  let s = E.defaultState();
  assert.equal(E.isUnlocked(C, s, 'm-video'), false);
  assert.equal(E.awardLevel(C, s, 'm-video', 3, '2026-01-01').state.stars['m-video'], 3);
  ids.slice(0, ids.indexOf('guard') + 1).forEach((id) => { s = E.awardLevel(C, s, id, 1, '2026-01-01').state; });
  C.MISSIONS.forEach((m) => assert.equal(E.isUnlocked(C, s, m.id), true));
  assert.equal(E.nextLevelId(C, s), 'trace');
  const a = E.awardLevel(C, s, 'm-sre', 2, '2026-01-01');
  assert.deepEqual(a.newBadges, ['field']);
  assert.equal(E.sanitizeState(C, JSON.parse(JSON.stringify(a.state))).stars['m-sre'], 2);
  let all = a.state;
  E.allIds(C).forEach((id) => { all = E.awardLevel(C, all, id, 3, '2026-01-01').state; });
  assert.equal(E.nextLevelId(C, all), null);
  assert.ok(E.badgesOf(C, all).includes('operator'));
  assert.equal(E.rankOf(E.xpOf(all)).name, E.RANKS[E.RANKS.length - 1].name, 'everything at 3 stars reaches the top rank');
  assert.equal(E.rankOf(E.xpOf(all)).progress, 1);
});

/* ---------- levels ---------- */

function play(seq) {
  let run = E.loopNew();
  const kinds = seq.map((id) => { const r = E.loopAct(C.LOOP, run, id); run = r.run; return r.kind; });
  return { run, kinds };
}

test('loop: perfect run is 3 steps and 3 stars', () => {
  const { run, kinds } = play(['w_inn', 'w_osl', 'a_inn']);
  assert.deepEqual(kinds, ['obs', 'obs', 'win']);
  assert.equal(run.won, true);
  assert.equal(E.loopStars(C.LOOP, run.steps), 3);
});

test('loop: guessing, wrong answers and repeats cost steps but never win', () => {
  const { run, kinds } = play(['a_inn', 'w_inn', 'w_inn', 'calc', 'w_osl', 'a_osl', 'a_inn', 'a_inn', 'zzz']);
  assert.deepEqual(kinds, ['guess', 'obs', 'repeat', 'obs', 'obs', 'wrong', 'win', 'none', 'none']);
  assert.equal(run.steps, 7);
  assert.equal(E.loopStars(C.LOOP, run.steps), 1);
  assert.equal(E.loopStars(C.LOOP, 5), 2);
});

test('tools: exact set passes; missing, extra and danger are flagged', () => {
  const r = C.TOOL_ROUNDS[1];
  assert.equal(E.scoreTools(C.TOOLS, r, ['email', 'search']).ok, true);
  assert.deepEqual(E.scoreTools(C.TOOLS, r, ['search']).missing, ['email']);
  const x = E.scoreTools(C.TOOLS, r, ['search', 'email', 'nuke']);
  assert.equal(x.ok, false);
  assert.equal(x.danger, true);
  assert.deepEqual(x.extra, ['nuke']);
  C.TOOL_ROUNDS.forEach((t) => assert.equal(E.scoreTools(C.TOOLS, t, t.needs).ok, true));
});

test('prompt: all good blocks fit the budget for 3 stars', () => {
  const good = C.PROMPT.blocks.filter((b) => b.good).map((b) => b.id);
  const r = E.scorePrompt(C.PROMPT, good);
  assert.equal(r.over, false);
  assert.equal(r.quality, 100);
  assert.equal(r.stars, 3);
  assert.ok(E.composeReply(C.PROMPT, good).every((l) => l.ok));
});

test('prompt: empty fails, bloat overflows, junk costs stars', () => {
  assert.equal(E.scorePrompt(C.PROMPT, []).pass, false);
  const all = C.PROMPT.blocks.map((b) => b.id);
  assert.equal(E.scorePrompt(C.PROMPT, all).over, true);
  assert.equal(E.scorePrompt(C.PROMPT, all).stars, 0);
  assert.equal(E.scorePrompt(C.PROMPT, ['role', 'goal', 'rules', 'example']).stars, 2);
  assert.equal(E.scorePrompt(C.PROMPT, ['role', 'goal', 'rules', 'format', 'example', 'hype']).stars, 1);
  assert.equal(E.scorePrompt(C.PROMPT, ['shout']).quality, 0);
  assert.equal(E.composeReply(C.PROMPT, ['shout', 'manual']).length, 7);
});

test('memory: the request names every fact the agent needs', () => {
  const ask = C.MEMORY.ask.toLowerCase();
  assert.deepEqual(C.MEMORY.needs, ['trip', 'seat', 'meal', 'id']);
  ['trip', 'seat', 'meal', 'flyer'].forEach((w) => assert.ok(ask.includes(w), 'the ask must mention "' + w + '"'));
});

test('memory: needs all four facts, which only fit with one compressed slot', () => {
  assert.equal(C.MEMORY.needs.length, C.MEMORY.slots + 1);
  assert.equal(E.scoreMemory(C.MEMORY, [['seat', 'meal'], ['trip'], ['id']]).ok, true);
  const r = E.scoreMemory(C.MEMORY, [['seat'], ['jazz'], ['trip']]);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['meal', 'id']);
  assert.equal(E.scoreMemory(C.MEMORY, []).have.length, 0);
});

test('pipeline: wrong and empty slots are reported by key', () => {
  const p = C.PIPES[0];
  const r = E.checkPipeline(p, { '0-0': 'draft', '1-0': 'draft' });
  assert.deepEqual(r, { ok: false, wrong: ['0-0'], empty: ['2-0'] });
});

test('starsFromMistakes', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(E.starsFromMistakes), [3, 2, 2, 1, 1]);
});

/* ---------- boss ---------- */

function perfectAgent(mission) {
  const m = C.BOSS.missions.find((x) => x.id === mission);
  return { name: 'Nova', avatar: '🦊', mission, tools: m.needs.slice(), prompt: C.BOSS.prompt.slice(),
    shields: C.BOSS.shields.slice(), memory: true, critic: true };
}

test('boss: a well-built agent passes all trials on every mission', () => {
  C.BOSS.missions.forEach((m) => {
    const res = E.runTrials(C, perfectAgent(m.id));
    assert.equal(res.length, C.BOSS.trials.length);
    assert.ok(res.every((r) => r.pass), m.id);
    assert.equal(E.bossStars(res), 3);
  });
});

test('boss: an empty agent fails everything, with a hint per trial', () => {
  const res = E.runTrials(C, E.sanitizeAgent(C, {}));
  assert.ok(res.every((r) => !r.pass && r.hint));
  assert.equal(E.bossStars(res), 0);
});

test('boss: extra power fails the risky trial; each missing piece costs one trial', () => {
  const a = perfectAgent('research');
  a.tools.push('nuke');
  const res = E.runTrials(C, a);
  assert.deepEqual(res.filter((r) => !r.pass).map((r) => r.id), ['power']);
  assert.equal(E.bossStars(res), 2);
  const b = perfectAgent('coder');
  b.memory = false; b.shields = ['human'];
  assert.deepEqual(E.runTrials(C, b).filter((r) => !r.pass).map((r) => r.id), ['inject', 'long']);
});

test('blueprint: reflects the build, tools are valid JSON, name is sanitized', () => {
  const a = perfectAgent('coder');
  a.name = '<b>Zed</b>"; DROP';
  const bp = E.buildBlueprint(C, a);
  assert.ok(!/[<>"]/.test(bp.systemPrompt.split('\n')[0]));
  assert.match(bp.systemPrompt, /data, never as instructions/);
  const tools = JSON.parse(bp.tools);
  assert.deepEqual(tools.map((t) => t.name), ['read_file', 'edit_file', 'run_code']);
  tools.forEach((t) => assert.equal(t.input_schema.required.length, 1));
  assert.match(bp.code, /MAX_STEPS = 12/);
  assert.match(bp.code, /NEEDS_APPROVAL = \["edit_file","run_code"\]/);
  const bare = E.buildBlueprint(C, null);
  assert.equal(bare.tools, '[]');
  assert.match(bare.code, /WARNING/);
  assert.ok(!/ask_human/.test(bare.code));
});

/* ---------- journeys ---------- */

test('journeys: ids are unique, every level belongs to exactly one journey, gates are real levels', () => {
  const jids = C.JOURNEYS.map((j) => j.id);
  assert.equal(new Set(jids).size, jids.length);
  const all = E.allIds(C);
  assert.equal(new Set(all).size, all.length);
  C.JOURNEYS.forEach((j) => {
    ['icon', 'title', 'tag', 'unit', 'blurb'].forEach((k) => assert.ok(j[k], j.id + '.' + k));
    assert.ok(['linear', 'any'].includes(j.order), j.id);
    if (j.gate) assert.ok(all.includes(j.gate), j.id + ' gate');
    j.levels.forEach((l) => assert.equal(E.journeyOf(C, l.id).id, j.id));
  });
  assert.equal(E.journeyOf(C, 'ghost'), null);
});

test('journeys: open, progress and next step follow order and gate', () => {
  let s = E.defaultState();
  assert.equal(E.journeyOpen(C, s, 'academy'), true);
  assert.equal(E.journeyOpen(C, s, 'field'), false);
  assert.equal(E.journeyOpen(C, s, 'ghost'), false);
  assert.equal(E.nextInJourney(C, s, 'academy'), 'loop');
  assert.equal(E.nextInJourney(C, s, 'field'), null);
  s = E.awardLevel(C, s, 'loop', 2, '2026-01-01').state;
  assert.deepEqual(E.journeyProgress(C, s, 'academy'), { done: 1, total: C.LEVELS.length, stars: 2 });
  assert.equal(E.nextInJourney(C, s, 'academy'), 'tools');
  s.stars.guard = 1;
  assert.equal(E.journeyOpen(C, s, 'field'), true);
  assert.equal(E.nextInJourney(C, s, 'field'), C.MISSIONS[0].id);
  C.JOURNEYS.filter((j) => !j.levels.length).forEach((j) => assert.equal(E.journeyOpen(C, s, j.id), false));
});

/* ---------- concept bank + spaced review ---------- */

test('bank: every concept has a real level and at least two answerable questions', () => {
  const all = E.allIds(C);
  const qids = C.BANK.map((q) => q.id);
  assert.equal(new Set(qids).size, qids.length);
  Object.keys(C.CONCEPTS).forEach((id) => {
    assert.ok(all.includes(C.CONCEPTS[id].level), id);
    assert.ok(C.CONCEPTS[id].name, id);
    assert.ok(C.BANK.filter((q) => q.concept === id).length >= 2, id + ' needs 2+ questions');
  });
  C.BANK.forEach((q) => {
    assert.ok(C.CONCEPTS[q.concept], q.id);
    ['q', 'a', 'why'].forEach((k) => assert.ok(q[k], q.id + '.' + k));
    assert.ok(q.x.length >= 2, q.id);
    assert.equal(new Set([q.a, ...q.x]).size, q.x.length + 1, q.id + ' has duplicate options');
  });
});

test('review: a concept is due once its level is finished; right answers space out 1, 3, 7, 21 days', () => {
  let s = E.defaultState();
  assert.deepEqual(E.dueConcepts(C, s, '2026-01-01'), []);
  s = E.awardLevel(C, s, 'loop', 3, '2026-01-01').state;
  assert.deepEqual(E.dueConcepts(C, s, '2026-01-01').sort(), ['loop-cycle', 'loop-ground']);
  let day = '2026-01-01';
  [['2026-01-02', 1], ['2026-01-05', 2], ['2026-01-12', 3], ['2026-02-02', 4], ['2026-02-23', 4]].forEach(([due, box]) => {
    s = E.recordReview(C, s, 'loop-cycle', true, day);
    assert.deepEqual(s.review['loop-cycle'], { box, due });
    assert.ok(!E.dueConcepts(C, s, day).includes('loop-cycle'));
    assert.ok(E.dueConcepts(C, s, due).includes('loop-cycle'));
    day = due;
  });
});

test('review: a miss resets to tomorrow; early right answers change nothing; bad input is ignored', () => {
  let s = E.awardLevel(C, E.defaultState(), 'loop', 3, '2026-01-01').state;
  s = E.recordReview(C, s, 'loop-cycle', true, '2026-01-01');
  s = E.recordReview(C, s, 'loop-cycle', true, '2026-01-02');
  const before = s;
  assert.equal(E.recordReview(C, s, 'loop-cycle', true, '2026-01-03'), before, 'not due yet');
  s = E.recordReview(C, s, 'loop-cycle', false, '2026-01-03');
  assert.deepEqual(s.review['loop-cycle'], { box: 0, due: '2026-01-04' });
  assert.equal(before.review['loop-cycle'].box, 2, 'old state untouched');
  assert.equal(E.recordReview(C, s, 'ghost', true, '2026-01-03'), s);
  assert.equal(E.recordReview(C, s, 'loop-cycle', true, 'soon'), s);
  assert.deepEqual(E.awardLevel(C, s, 'tools', 1, '2026-01-03').state.review, s.review, 'awardLevel keeps review');
});

test('review: due list is weakest first; sessions are sized, shuffled and always contain the right answer', () => {
  let s = E.awardLevel(C, E.defaultState(), 'loop', 3, '2026-01-01').state;
  s = E.recordReview(C, s, 'loop-ground', true, '2026-01-01');
  assert.deepEqual(E.dueConcepts(C, s, '2026-01-02'), ['loop-cycle', 'loop-ground']);
  let n = 0;
  const rng = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  const qs = E.buildSession(C, s, '2026-01-02', 'review', 5, rng);
  assert.deepEqual(qs.map((q) => q.concept), ['loop-cycle', 'loop-ground']);
  qs.forEach((q) => {
    assert.equal(q.options.filter((o) => o.correct).length, 1);
    assert.ok(q.options.length >= 3 && q.why && q.q);
  });
  assert.equal(E.buildSession(C, s, '2026-01-02', 'review', 1, rng).length, 1);
  assert.equal(E.buildSession(C, s, '2026-01-01', 'arena', 5, rng).length, 2, 'arena ignores due dates');
  assert.equal(E.buildSession(C, E.defaultState(), '2026-01-02', 'arena', 5, rng).length, 0);
});

test('sanitizeState: review keeps only real concepts with a valid box and day', () => {
  const s = E.sanitizeState(C, { review: {
    'loop-cycle': { box: 2, due: '2026-03-01' }, 'loop-ground': { box: 9, due: '2026-03-01' },
    'tools-least': { box: 1, due: '<b>' }, 'mem-limit': 'x', ghost: { box: 1, due: '2026-03-01' } } });
  assert.deepEqual(s.review, { 'loop-cycle': { box: 2, due: '2026-03-01' } });
  assert.deepEqual(E.sanitizeState(C, { review: [] }).review, {});
});

/* ---------- Addy journey: puzzles, quizzes, reader ---------- */

const M = require('../js/markdown.js');

test('courses: every Addy and LLM level is well-formed and winnable', () => {
  const lessons = C.COURSE.lessons.map((l) => l.no);
  assert.equal(lessons.length, 19);
  C.ADDY.forEach((L) => { if (L.game === 'learn') assert.ok(lessons.includes(L.read), L.id + ' needs a full read'); });
  C.LLM.forEach((L) => assert.ok(!L.read, L.id + ' has no full read'));
  C.PY.forEach((L) => assert.ok(!L.read, L.id + ' has no full read'));
  [C.ADDY, C.LLM, C.PY].forEach((LIST) => LIST.forEach((L) => {
    ['icon', 'title', 'tag', 'idea', 'play', 'key'].forEach((k) => assert.ok(L[k], L.id + '.' + k));
    assert.ok(['learn', 'sort', 'order', 'quiz', 'case', 'sim', 'fix'].includes(L.game), L.id);
    if (L.game === 'learn') {
      assert.ok(L.cards.length >= 3 && L.cards.length <= 5, L.id + ' cards');
      L.cards.forEach((c) => {
        assert.ok(c.icon && c.title && c.text, L.id);
        if (c.visual) assert.ok(['flow', 'stack', 'vs'].includes(c.visual[0]), L.id);
      });
      assert.ok(L.concepts.length >= 2, L.id);
      L.concepts.forEach((c) => assert.equal(C.CONCEPTS[c].level, L.id));
    }
    if (L.game === 'sort') {
      const P = L.puzzle, bids = P.buckets.map((b) => b.id);
      assert.ok(bids.length >= 2 && P.items.length >= 5, L.id);
      assert.equal(new Set(P.items.map((i) => i.id)).size, P.items.length);
      P.items.forEach((i) => {
        assert.ok(bids.includes(i.bucket) && i.text && i.why, L.id + ' ' + i.id);
        assert.equal(E.sortRight(P, i.id, i.bucket), true);
        bids.filter((b) => b !== i.bucket).forEach((b) => assert.equal(E.sortRight(P, i.id, b), false));
      });
      bids.forEach((b) => assert.ok(P.items.some((i) => i.bucket === b), L.id + ' empty bucket ' + b));
    }
    if (L.game === 'order') {
      const st = L.puzzle.steps;
      assert.ok(st.length >= 4 && L.puzzle.why, L.id);
      assert.equal(new Set(st.map((s) => s.id)).size, st.length);
      st.forEach((s, i) => assert.equal(E.orderRight(st, i, s.id), true));
    }
    if (L.game === 'case') {
      assert.ok(L.brief && L.steps.length >= 6, L.id);
      const before = LIST.slice(0, LIST.indexOf(L)).filter((x) => x.game === 'learn').flatMap((x) => x.concepts);
      L.steps.forEach((st) => {
        assert.ok(before.includes(st.concept), L.id + ' uses ' + st.concept + ' before it is taught');
        assert.ok(st.q && st.a && st.why && st.x.length >= 2 && !st.x.includes(st.a), L.id + ' ' + st.q);
      });
      assert.ok(new Set(L.steps.map((st) => st.concept.slice(0, 3))).size >= 4, L.id + ' must span 4+ lessons');
      const qs = E.caseQuestions(L, () => 0.3);
      assert.equal(qs.length, L.steps.length);
      qs.forEach((q) => assert.equal(q.options.filter((o) => o.correct).length, 1));
    }
    if (L.game === 'quiz') {
      L.concepts.concat(L.pool).forEach((c) => assert.ok(C.CONCEPTS[c], L.id + ' ' + c));
      assert.ok(L.pool.length >= L.mix, L.id);
      const qs = E.levelQuestions(C, L, () => 0.42);
      assert.ok(qs.length >= 4, L.id + ' has ' + qs.length + ' questions');
      assert.equal(qs.length, L.concepts.length + L.mix);
      assert.equal(new Set(qs.map((q) => q.concept)).size, qs.length, 'no concept twice');
    }
  }));
});

test('llm: topics run 01-16 in order, each with Learn, Apply and Master; masters never mix in another course', () => {
  const ids = C.LLM.map((l) => l.id);
  let last = -1;
  for (let n = 1; n <= 16; n++) {
    const no = String(n).padStart(2, '0');
    const at = ['learn', 'apply', 'master'].map((k) => ids.indexOf('l' + no + '-' + k));
    assert.ok(at[0] > last && at[1] === at[0] + 1 && at[2] === at[1] + 1, 'stop ' + no);
    last = at[2];
  }
  C.LLM.filter((l) => l.game === 'quiz').forEach((l) => l.pool.forEach((c) =>
    assert.ok(!C.CONCEPTS[c].level.startsWith('a'), l.id + ' pool has an Addy concept: ' + c)));
});

test('py: topics run 01-08 in order with two mixes and a capstone; masters draw only on this journey and the Academy', () => {
  const ids = C.PY.map((l) => l.id);
  let last = -1;
  for (let n = 1; n <= 8; n++) {
    const at = ['learn', 'apply', 'master'].map((k) => ids.indexOf('p0' + n + '-' + k));
    assert.ok(at[0] > last && at[1] === at[0] + 1 && at[2] === at[1] + 1, 'stop ' + n);
    last = at[2];
  }
  assert.equal(ids.length, 8 * 3 + 6);
  assert.deepEqual(ids.slice(-3), ['p-lab-1', 'p-fix-1', 'p-boss-1']);
  assert.ok(ids.indexOf('p-mix-1') > ids.indexOf('p04-master') && ids.indexOf('p-mix-1') < ids.indexOf('p05-learn'));
  assert.equal(ids[ids.length - 1], 'p-boss-1');
  assert.equal(new Set(ids.concat(C.ADDY.map((l) => l.id), C.LLM.map((l) => l.id), C.LEVELS.map((l) => l.id))).size,
    ids.length + C.ADDY.length + C.LLM.length + C.LEVELS.length, 'level ids are unique across journeys');
  C.PY.filter((l) => l.game === 'quiz').forEach((l) => l.pool.concat(l.concepts).forEach((c) => {
    const home = C.CONCEPTS[c].level;
    assert.ok(home.startsWith('p0') || C.LEVELS.some((x) => x.id === home), l.id + ' draws on another course: ' + c);
  }));
  assert.equal(C.JOURNEYS.filter((j) => j.id === 'py')[0].levels, C.PY);
  let s = E.defaultState();
  assert.equal(E.isUnlocked(C, s, 'p01-learn'), true);
  assert.equal(E.isUnlocked(C, s, 'p01-apply'), false);
  s = E.awardLevel(C, s, 'p01-learn', 3, '2026-01-01').state;
  assert.equal(E.isUnlocked(C, s, 'p01-apply'), true);
  assert.deepEqual(E.dueConcepts(C, s, '2026-01-01').sort(), ['p01-data', 'p01-func', 'p01-json']);
});

test('addy: all 19 lessons have Learn, Apply and Master, in lesson order, plus three bosses', () => {
  const ids = C.ADDY.map((l) => l.id);
  let last = -1;
  C.COURSE.lessons.forEach((l) => {
    const at = ['learn', 'apply', 'master'].map((k) => ids.indexOf('a' + l.no + '-' + k));
    assert.ok(at[0] > last && at[1] === at[0] + 1 && at[2] === at[1] + 1, 'lesson ' + l.no);
    last = at[2];
  });
  assert.deepEqual(C.ADDY.filter((l) => l.game === 'case').map((l) => l.id), ['a-boss-1', 'a-boss-2', 'a-boss-3']);
  assert.equal(ids[ids.length - 1], 'a-boss-3');
});

test('addy: a master level mixes in earlier ideas; lesson 01 draws on the Academy', () => {
  const m1 = C.ADDY.find((l) => l.id === 'a01-master'), m4 = C.ADDY.find((l) => l.id === 'a04-master');
  assert.equal(m1.mix, 2);
  m1.pool.forEach((c) => assert.ok(!C.CONCEPTS[c].level.startsWith('a')));
  assert.equal(m4.mix, 2);
  m4.pool.forEach((c) => assert.ok(!m4.concepts.includes(c)));
  const own = E.levelQuestions(C, m4, () => 0.1).filter((q) => m4.concepts.includes(q.concept));
  assert.equal(own.length, m4.concepts.length);
});

test('quizStars and puzzle rules', () => {
  assert.deepEqual([[5, 5], [4, 5], [3, 5], [2, 5], [0, 5], [0, 0]].map(([r, t]) => E.quizStars(r, t)), [3, 2, 1, 0, 0, 0]);
  assert.deepEqual([[6, 6], [5, 6], [4, 6], [3, 6]].map(([r, t]) => E.quizStars(r, t)), [3, 2, 1, 0]);
  const steps = [{ id: 'a' }, { id: 'b' }];
  assert.equal(E.orderRight(steps, 0, 'b'), false);
  assert.equal(E.orderRight(steps, 1, 'b'), true);
  assert.equal(E.orderRight(steps, 2, 'b'), false);
  assert.equal(E.sortRight({ items: [{ id: 'x', bucket: 'p' }] }, 'ghost', 'p'), false);
});

test('markdown: blocks, inline marks and safe links', () => {
  const b = M.parse('# Title\n\nSome **bold `code`** and *it* text\nsecond line.\n\n- one\n  - two\n1. first\n\n> quote\n\n---\n\n| A | B |\n|---|---|\n| 1 | `2` |\n\n```html\n<script>alert(1)</script>\n```\n');
  assert.deepEqual(b.map((x) => x.t), ['h', 'p', 'ul', 'ol', 'quote', 'hr', 'table', 'code']);
  assert.equal(b[0].n, 1);
  assert.deepEqual(b[1].s.map((x) => x.t), ['text', 'b', 'text', 'i', 'text']);
  assert.equal(b[1].s[1].s[1].t, 'code');
  assert.deepEqual(b[2].items.map((i) => i.d), [0, 1]);
  assert.equal(b[6].rows[0][1][0].v, '2');
  assert.equal(b[7].text, '<script>alert(1)</script>', 'code stays text');
  const links = M.inline('[ok](https://example.com/a) [next](../02-how-agents-think/) [bad](javascript:alert(1)) ![img](https://x.y/z.png) [rel](./local.md)');
  const as = links.filter((x) => x.t === 'a');
  assert.deepEqual(as.map((a) => a.href), ['https://example.com/a', '#/read/02']);
  assert.ok(!JSON.stringify(links).includes('javascript:alert(1)') || links.every((x) => x.t !== 'a' || !/javascript/.test(x.href)));
  assert.equal(M.safeHref('data:text/html,x'), null);
  assert.equal(M.safeHref('https://a.b/"onclick'), null);
});

test('course: every bundled lesson parses and carries no raw HTML outside code', () => {
  const fs = require('node:fs'), path = require('node:path');
  const seen = [];
  global.Course = { add: (no, md) => {
    seen.push(no);
    const blocks = M.parse(md);
    assert.ok(blocks.length > 20 && blocks[0].t === 'h', no);
    blocks.filter((x) => x.t === 'p').forEach((p) => p.s.forEach((s) =>
      assert.ok(!/<(script|div|iframe|style)\b/i.test(s.v || ''), no + ': ' + (s.v || '').slice(0, 60))));
  } };
  C.COURSE.lessons.forEach((l) => {
    const f = path.join(__dirname, '..', 'course', 'addy', l.no + '.js');
    assert.ok(fs.existsSync(f), f);
    require(f);
  });
  delete global.Course;
  assert.equal(seen.length, 19);
});

test('market: the researched tally is dated, sourced, ordered and within its sample', () => {
  const M = C.MARKET;
  assert.match(M.reviewed, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(M.postings >= 20 && M.summary && M.caveat);
  assert.ok(M.skills.length >= 10);
  M.skills.forEach((s, i) => {
    assert.ok(s.name && Number.isInteger(s.count) && s.count >= 1 && s.count <= M.postings, s.name);
    if (i) assert.ok(s.count <= M.skills[i - 1].count, 'skills are sorted high to low');
  });
  M.tools.forEach((t) => assert.ok(t.kind && t.names.length >= 2, t.kind));
  assert.ok(M.sources.length >= M.postings, 'one source per posting read');
  assert.equal(new Set(M.sources.map((s) => s.url)).size, M.sources.length);
  M.sources.forEach((s) => assert.match(s.url, /^https:\/\/[^\s"'<>]+$/, s.label));
  const last = C.LLM[C.LLM.length - 1];
  assert.equal(last.id, 'l-boss-2');
  assert.equal(last.tag, 'Capstone');
});

test('mastery: only learned ideas, weakest first, with a status that follows box and due day', () => {
  let s = E.defaultState();
  assert.deepEqual(E.masteryOf(C, s, '2026-01-01'), []);
  assert.deepEqual(E.masteryOf(C, s, 'soon'), []);
  s = E.awardLevel(C, s, 'loop', 3, '2026-01-01').state;
  s = E.awardLevel(C, s, 'tools', 3, '2026-01-01').state;
  ['2026-01-01', '2026-01-02', '2026-01-05'].forEach((d) => { s = E.recordReview(C, s, 'loop-cycle', true, d); });
  s = E.recordReview(C, s, 'loop-ground', true, '2026-01-05');
  s = E.recordReview(C, s, 'tools-least', false, '2026-01-05');
  const m = E.masteryOf(C, s, '2026-01-06');
  assert.deepEqual(m.map((x) => x.id + ':' + x.status),
    ['tools-least:due', 'loop-ground:due', 'tools-danger:new', 'loop-cycle:strong']);
  assert.equal(E.masteryOf(C, s, '2026-01-05').find((x) => x.id === 'loop-ground').status, 'learning', 'not due until tomorrow');
  assert.deepEqual(m.find((x) => x.id === 'loop-cycle'), { id: 'loop-cycle', name: C.CONCEPTS['loop-cycle'].name,
    level: 'loop', box: 3, due: '2026-01-12', status: 'strong' });
  assert.equal(E.masteryOf(C, s, '2026-01-12').find((x) => x.id === 'loop-cycle').status, 'due');
});

test('academy feedback: every job, prompt block, distractor and trace explains itself', () => {
  C.TOOL_ROUNDS.forEach((r) => assert.ok(r.why, r.task));
  C.PROMPT.blocks.forEach((b) => assert.ok(b.why, b.id));
  C.TRACES.forEach((t) => assert.ok(t.why && t.fix, t.q));
  Object.keys(C.SHIELDS).forEach((id) => assert.ok(C.SHIELDS[id].line, id));
  const wanted = new Set(C.PIPES.flatMap((p) => E.pipeSlots(p).map((sl) => sl.want)));
  const distractors = new Set(C.PIPES.flatMap((p) => p.palette).filter((n) => !wanted.has(n)));
  distractors.forEach((n) => assert.ok(C.NODES[n].no, n + ' needs a "no" line saying why it never fits'));
});

test('markdown: deceptive links are refused and hostile input stays fast', () => {
  ['https://google.com@evil.example/', 'https://user:pw@evil.example/', 'https://a.b/\u202Egnp.exe', 'https://a.b/\u0000x',
    'http://a b', 'javascript:alert(1)', '//evil.example', 'https://' + 'a'.repeat(3000)]
    .forEach((u) => assert.equal(M.safeHref(u), null, JSON.stringify(u.slice(0, 40))));
  assert.deepEqual(M.safeHref('https://example.com/a?b=1#c'), { href: 'https://example.com/a?b=1#c', external: true });
  const t0 = Date.now();
  M.parse('[a]('.repeat(32000));
  M.parse('['.repeat(32000));
  M.parse('| a |\n' + '|'.repeat(80000) + 'x');
  M.parse('# a' + ' '.repeat(80000) + 'x');
  M.parse('**' + 'a*'.repeat(40000));
  assert.ok(Date.now() - t0 < 1500, 'hostile input took ' + (Date.now() - t0) + ' ms');
  assert.deepEqual(M.parse('## Title ##')[0].s, [{ t: 'text', v: 'Title' }]);
  assert.equal(M.parse('| A | B |\n|---|:-:|\n| 1 | 2 |')[0].t, 'table');
});

test('review hardening: real dates only, shuffling really shuffles, edge inputs are safe', () => {
  const s = E.sanitizeState(C, { streak: { count: 2, last: '2026-99-99' }, review: {
    'loop-cycle': { box: 1, due: '9999-99-99' }, 'loop-ground': { box: -1, due: '2026-03-01' },
    'tools-least': { box: 0, due: '2026-02-31' }, 'tools-danger': { box: 0, due: '2026-03-01' } } });
  assert.deepEqual(s.review, { 'tools-danger': { box: 0, due: '2026-03-01' } });
  assert.deepEqual(s.streak, { count: 0, last: '', best: 0 });
  assert.deepEqual(E.dueConcepts(C, s, 'not-a-day'), []);
  assert.equal(E.quizStars(6, 5), 0, 'more right than asked is not a score');

  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    let n = seed;
    const rng = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
    seen.add(E.buildQuestions(C, ['loop-cycle'], rng)[0].options.findIndex((o) => o.correct));
  }
  assert.ok(seen.size >= 3, 'the right answer must turn up in every position, got ' + [...seen]);

  let st = E.awardLevel(C, E.defaultState(), 'loop', 1, '2026-01-01').state;
  const early = E.recordReview(C, st, 'tools-least', true, '2026-01-01');
  assert.ok(early.review['tools-least'] && !E.dueConcepts(C, early, '2026-01-09').includes('tools-least'),
    'an idea from an unfinished level is recorded but never due');
  assert.deepEqual(E.journeyProgress(C, st, 'ghost'), { done: 0, total: 0, stars: 0 });
  C.LEVELS.forEach((l) => { st = E.awardLevel(C, st, l.id, 1, '2026-01-01').state; });
  assert.equal(E.nextInJourney(C, st, 'academy'), null, 'a finished journey has no next level');
});

test('touchSession: a session counts as a learning day and reports a new streak badge, without mutating', () => {
  let s = E.awardLevel(C, E.defaultState(), 'loop', 1, '2026-01-01').state;
  s = E.touchSession(C, s, '2026-01-02').state;
  const before = JSON.stringify(s);
  const r = E.touchSession(C, s, '2026-01-03');
  assert.equal(JSON.stringify(s), before);
  assert.equal(r.state.streak.count, 3);
  assert.deepEqual(r.newBadges, ['streak']);
  assert.deepEqual(E.touchSession(C, r.state, '2026-01-03').newBadges, []);
});

test('questions: the right answer cannot be guessed from its length', () => {
  const steps = C.ADDY.concat(C.LLM, C.PY).flatMap((l) => l.game === 'case' ? l.steps : l.game === 'fix' ? l.cases : []);
  [['bank', C.BANK], ['boss decisions', steps]].forEach(([name, list]) => {
    const longest = list.filter((q) => q.x.every((o) => o.length < q.a.length)).length / list.length;
    const shortest = list.filter((q) => q.x.every((o) => o.length > q.a.length)).length / list.length;
    const middle = 1 - longest - shortest;
    /* With three options, chance is one third. A share near 60% (the pass mark) would be a winning strategy. */
    [['longest', longest], ['shortest', shortest], ['in the middle', middle]].forEach(([where, share]) =>
      assert.ok(share <= 0.45, name + ': the right answer is ' + where + ' in ' + Math.round(share * 100) + '% of questions'));
  });
});

test('course: stored lesson files hold no HTML or script, and match what the reader loads', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.join(__dirname, '..', 'course', 'addy');
  assert.ok(fs.existsSync(path.join(dir, 'LICENSE.txt')) && fs.existsSync(path.join(dir, 'README.md')));
  const loaded = {};
  global.Course = { add: (no, md) => { loaded[no] = md; } };
  C.COURSE.lessons.forEach((l) => {
    const md = fs.readFileSync(path.join(dir, 'md', l.no + '.md'), 'utf8');
    assert.ok(!/<\s*(script|style|iframe|div|svg|object|embed)\b/i.test(md), l.no + '.md still contains embedded HTML');
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(md), l.no + '.md contains an inline event handler');
    const f = path.join(dir, l.no + '.js');
    delete require.cache[require.resolve(f)];
    require(f);
    assert.equal(loaded[l.no], md, l.no + '.js is out of date: run node tools/build-course.js');
  });
  delete global.Course;
});

test('tools review: every product named in a mission or the toolbox has a dated, checked source', () => {
  const R = C.TOOLS_REVIEW;
  assert.match(R.reviewed, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(R.note);
  const byName = new Map(R.sources.map((s) => [s.name, s.url]));
  assert.equal(byName.size, R.sources.length, 'no product listed twice');
  R.sources.forEach((s) => assert.match(s.url, /^https:\/\/[^\s"'<>]+$/, s.name));
  const named = new Set();
  C.MISSIONS.forEach((m) => m.stages.forEach((st) => [st.tool, ...st.also].forEach((n) => named.add(n))));
  C.TOOLBOX.forEach((t) => t.tools.forEach((n) => named.add(n)));
  named.forEach((n) => assert.ok(byName.has(n) || R.generic.includes(n), n + ' has no checked source'));
  byName.forEach((_, n) => assert.ok(named.has(n), n + ' is in the sources but no longer named anywhere'));
});

test('missions in review: three ideas and six well-formed questions per mission, kept out of course Masters', () => {
  C.MISSIONS.forEach((M) => {
    const names = M.stages.map((x) => x.name);
    ['flow', 'gate', 'tools'].forEach((k) => {
      const id = M.id + '-' + k;
      assert.equal(C.CONCEPTS[id].level, M.id);
      const qs = C.BANK.filter((q) => q.concept === id);
      assert.equal(qs.length, 2, id);
      qs.forEach((q) => {
        assert.ok(names.includes(q.a), q.id + ': the answer must be a stage of this mission');
        q.x.forEach((o) => assert.ok(names.includes(o) && o !== q.a, q.id + ': bad option ' + o));
        assert.equal(new Set(q.x).size, 2, q.id);
      });
    });
    const gate = M.stages.find((x) => x.id === M.gate).name;
    C.BANK.filter((q) => q.concept === M.id + '-gate').forEach((q) => assert.equal(q.a, gate));
    const [f1, f2] = C.BANK.filter((q) => q.concept === M.id + '-flow');
    assert.equal(f1.a, names[1]);
    assert.equal(f2.a, names[names.length - 2]);
    C.BANK.filter((q) => q.concept === M.id + '-tools').forEach((q) => {
      const stage = M.stages.find((x) => x.name === q.a);
      assert.ok(q.q.includes(stage.tool), q.id + ' asks about the tool of its own answer');
    });
  });
  C.ADDY.concat(C.LLM, C.PY).filter((l) => l.game === 'quiz').forEach((l) => l.pool.concat(l.concepts).forEach((c) =>
    assert.ok(!c.startsWith('m-'), l.id + ' must not draw on a mission idea: ' + c)));
  let s = E.defaultState();
  s.stars.guard = 1;
  s = E.awardLevel(C, s, 'm-video', 2, '2026-01-01').state;
  assert.deepEqual(E.dueConcepts(C, s, '2026-01-01').filter((c) => c.startsWith('m-')).sort(),
    ['m-video-flow', 'm-video-gate', 'm-video-tools']);
});

test('blitz: the best score only goes up, survives other updates and bad storage is ignored', () => {
  const s0 = E.defaultState();
  assert.equal(s0.blitz, 0);
  assert.ok(E.BLITZ.seconds >= 30 && E.BLITZ.penalty > 0 && E.BLITZ.penalty < E.BLITZ.seconds);
  const a = E.recordBlitz(s0, 7);
  assert.deepEqual([a.best, a.record, a.state.blitz, s0.blitz], [7, true, 7, 0]);
  const b = E.recordBlitz(a.state, 5);
  assert.deepEqual([b.best, b.record], [7, false]);
  assert.equal(b.state, a.state);
  assert.equal(E.recordBlitz(a.state, 7).record, false);
  assert.equal(E.recordBlitz(s0, 0).record, false);
  [-1, 1.5, '9', null, undefined, NaN, 1e9].forEach((bad) => assert.equal(E.recordBlitz(a.state, bad).state, a.state));
  let s = E.awardLevel(C, a.state, 'loop', 3, '2026-01-01').state;
  s = E.recordReview(C, s, Object.keys(C.CONCEPTS)[0], false, '2026-01-01');
  s = E.touchSession(C, s, '2026-01-02').state;
  assert.equal(s.blitz, 7, 'the record survives a level, a review answer and a session');
  assert.equal(E.sanitizeState(C, JSON.parse(JSON.stringify(s))).blitz, 7);
  [-3, 2.5, '12', 100000, {}, null].forEach((bad) => assert.equal(E.sanitizeState(C, { blitz: bad }).blitz, 0));
});

test('fix levels: one bad step per run, never the first, with a taught concept and one right repair', () => {
  const lists = { a: C.ADDY, l: C.LLM, p: C.PY };
  const levels = C.ADDY.concat(C.LLM, C.PY).filter((l) => l.game === 'fix');
  assert.deepEqual(levels.map((l) => l.id), ['a-fix-1', 'l-fix-1', 'p-fix-1']);
  levels.forEach((L) => {
    const LIST = lists[L.id[0]];
    const taught = LIST.slice(0, LIST.indexOf(L)).filter((x) => x.game === 'learn').flatMap((x) => x.concepts);
    assert.ok(L.cases.length >= 3, L.id);
    assert.equal(new Set(L.cases.map((c) => c.concept)).size, L.cases.length, L.id + ': one concept per run');
    const at = L.cases.map((c) => c.steps.findIndex((s) => s.bad));
    assert.ok(new Set(at).size > 1, L.id + ': the bad step must not always sit in the same place');
    L.cases.forEach((c, n) => {
      const tag = L.id + ' run ' + (n + 1);
      assert.ok(taught.includes(c.concept), tag + ': ' + c.concept + ' is not taught before this level');
      ['ask', 'bug', 'a', 'why'].forEach((k) => assert.ok(c[k], tag + '.' + k));
      assert.ok(c.steps.length >= 3, tag);
      c.steps.forEach((s) => assert.ok(s.t && C.TRACE_KINDS[s.k], tag));
      assert.equal(c.steps.filter((s) => s.bad).length, 1, tag + ': exactly one bad step');
      assert.ok(at[n] > 0, tag + ': the first step is never the bad one');
      assert.ok(c.x.length >= 2 && new Set([c.a, ...c.x]).size === c.x.length + 1, tag + ': distinct options');
      c.steps.forEach((s, i) => assert.equal(E.fixPick(c, i), i === at[n]));
      const opts = E.fixOptions(c, () => 0.3);
      assert.equal(opts.length, c.x.length + 1);
      assert.deepEqual(opts.filter((o) => o.correct).map((o) => o.text), [c.a]);
    });
  });
  const c0 = levels[0].cases[0];
  [-1, 99, 1.5, '1', null, undefined].forEach((bad) => assert.equal(E.fixPick(c0, bad), false));
  assert.equal(E.fixPick(null, 0), false);
  assert.deepEqual([0, 1, 2, 3, 8].map(E.fixStars), [3, 2, 2, 1, 1]);
  const orders = new Set();
  for (let k = 0; k < 40; k++) orders.add(E.fixOptions(c0).map((o) => o.text).join('|'));
  assert.ok(orders.size > 1, 'options are shuffled');
});

test('labs: one winning design, and every wrong choice fails at its own step with a reason', () => {
  const labs = C.ADDY.concat(C.LLM, C.PY).filter((l) => l.game === 'sim');
  assert.deepEqual(labs.map((l) => l.id), ['a-lab-1', 'a-lab-2', 'a-lab-3', 'l-lab-1', 'l-lab-2', 'l-lab-3', 'p-lab-2', 'p-lab-1']);
  labs.forEach((L) => {
    const sim = L.sim, LIST = { a: C.ADDY, l: C.LLM, p: C.PY }[L.id[0]];
    const taught = LIST.slice(0, LIST.indexOf(L)).filter((x) => x.game === 'learn').flatMap((x) => x.concepts);
    assert.ok(sim.task && sim.slots.length >= 3 && sim.steps.length >= 6, L.id);
    const win = {};
    sim.slots.forEach((sl) => {
      const ids = sl.options.map((o) => o.id);
      assert.ok(ids.length >= 3 && new Set(ids).size === ids.length && sl.label && sl.icon, L.id + ' ' + sl.id);
      assert.ok(taught.includes(sl.concept) || !/^[alp]\d\d-/.test(sl.concept) && C.CONCEPTS[sl.concept],
        L.id + ': ' + sl.concept + ' is not taught before this lab');
      const steps = sim.steps.filter((st) => st.slot === sl.id);
      assert.equal(steps.length, 1, L.id + ': slot ' + sl.id + ' must decide exactly one step');
      assert.equal(steps[0].ok.length, 1);
      assert.ok(ids.includes(steps[0].ok[0]));
      win[sl.id] = steps[0].ok[0];
      ids.filter((id) => id !== win[sl.id]).forEach((id) => {
        const bad = steps[0].bad[id];
        assert.ok(bad && bad[0] && bad[1], L.id + ': ' + sl.id + '/' + id + ' needs what happens and why');
      });
    });
    sim.steps.forEach((st) => assert.ok(st.t && ['think', 'act', 'obs', 'answer'].includes(st.k), L.id));
    assert.equal(sim.steps[sim.steps.length - 1].slot, undefined, 'the last step shows the result');
    assert.equal(E.simReady(sim, {}), false);
    assert.equal(E.simReady(sim, win), true);
    const good = E.simRun(sim, win);
    assert.equal(good.ok, true);
    assert.equal(good.steps.length, sim.steps.length);
    sim.slots.forEach((sl) => sl.options.filter((o) => o.id !== win[sl.id]).forEach((o) => {
      const r = E.simRun(sim, Object.assign({}, win, { [sl.id]: o.id }));
      const at = sim.steps.findIndex((st) => st.slot === sl.id);
      assert.deepEqual([r.ok, r.failedAt, r.slot], [false, at, sl.id], L.id + ' ' + sl.id + '/' + o.id);
      assert.equal(r.steps.length, at + 1, 'the run stops at the failing step');
      assert.equal(r.steps[at].ok, false);
      assert.equal(r.why, sim.steps[at].bad[o.id][1]);
    }));
    const firstWins = sim.slots.filter((sl) => sl.options[0].id === win[sl.id]).length;
    assert.ok(firstWins <= 1, L.id + ': the right option must not always be listed first');
  });
  assert.deepEqual([1, 2, 3, 4, 9].map(E.simStars), [3, 2, 2, 1, 1]);
  const none = E.simRun(labs[0].sim, {});
  assert.equal(none.ok, false);
  assert.ok(none.why);
});

test('solutions: every level has a written solution, or is made of questions', () => {
  const all = C.JOURNEYS.reduce((a, J) => a.concat(J.levels), []);
  assert.equal(all.length, E.allIds(C).length);
  all.forEach((L) => {
    const J = E.journeyOf(C, L.id), game = J.kind === 'mission' ? 'mission' : (L.game || L.id);
    const sol = E.solutionOf(C, L);
    if (['learn', 'quiz', 'case'].includes(game)) { assert.equal(sol, null, L.id); return; }
    assert.ok(Array.isArray(sol) && sol.length >= 2, L.id + ' needs a solution');
    sol.forEach((line) => assert.ok(typeof line === 'string' && line.length > 3 && !/undefined|\[object/.test(line), L.id + ': ' + line));
  });
  const lab = C.PY.find((l) => l.id === 'p-lab-2');
  assert.ok(E.solutionOf(C, lab).includes('The packages: In a virtual environment, versions pinned in a file'));
  const m = C.MISSIONS[0], ms = E.solutionOf(C, m);
  assert.equal(ms.length, m.stages.length + 2);
  assert.ok(ms[ms.length - 1].includes(m.stages.find((x) => x.id === m.gate).name));
  assert.deepEqual(E.solutionOf(C, C.LEVELS.find((l) => l.id === 'loop')),
    ['Call weather("Innsbruck")', 'Call weather("Oslo")', 'Then answer("Innsbruck")']);
});

test('solutions: a level whose solution was seen gives one star', () => {
  assert.deepEqual([1, 2, 3].map((n) => E.solvedStars(n, true)), [1, 1, 1]);
  assert.deepEqual([1, 2, 3].map((n) => E.solvedStars(n, false)), [1, 2, 3]);
});

test('profiles: bad storage is repaired, names are cleaned, the first profile keeps the old key', () => {
  const d = E.sanitizeProfiles(null);
  assert.deepEqual(d, { active: 'main', list: [{ id: 'main', name: 'Player 1' }] });
  assert.deepEqual(E.sanitizeProfiles('x'), d);
  assert.deepEqual(E.sanitizeProfiles({ active: 'p9', list: 'no' }), d);
  const dirty = E.sanitizeProfiles({ active: 'p2', list: [
    { id: 'p2', name: '<b>Ana</b>' }, { id: 'p2', name: 'twice' }, { id: '../x', name: 'path' },
    { id: 'main', name: '  Tom  ' }, null, { id: 'p0', name: 'zero' }, { id: 7 }
  ] });
  assert.deepEqual(dirty, { active: 'p2', list: [{ id: 'main', name: 'Tom' }, { id: 'p2', name: 'bAnab' }] });
  assert.equal(E.profileKey('main'), 'agentcraft.v1');
  assert.equal(E.profileKey('p3'), 'agentcraft.v1.p3');
  assert.equal(E.profileKey('../evil'), 'agentcraft.v1');
  assert.equal(E.profileName(''), 'Player');
  assert.equal(E.profileName('x'.repeat(40)).length, E.NAME_MAX);
});

test('profiles: add, rename, switch and remove', () => {
  let P = E.addProfile(null, 'Ana');
  assert.deepEqual(P, { active: 'p1', list: [{ id: 'main', name: 'Player 1' }, { id: 'p1', name: 'Ana' }] });
  P = E.addProfile(P, 'Ben');
  assert.equal(P.active, 'p2');
  P = E.removeProfile(P, 'p1');
  assert.deepEqual(P.list.map((p) => p.id), ['main', 'p2']);
  assert.equal(E.addProfile(P, 'Cy').active, 'p3', 'ids are never reused below the highest');
  P = E.renameProfile(P, 'p2', 'Benny!');
  assert.equal(P.list[1].name, 'Benny');
  assert.equal(E.switchProfile(P, 'main').active, 'main');
  assert.equal(E.switchProfile(P, 'p77').active, 'p2', 'an unknown profile is ignored');
  assert.equal(E.removeProfile(P, 'main').list.length, 2, 'the first profile cannot be removed');
  assert.equal(E.removeProfile(P, 'p2').active, 'main');
  let full = null;
  for (let i = 0; i < E.PROFILE_MAX - 1; i++) full = E.addProfile(full, 'P' + i);
  assert.equal(full.list.length, E.PROFILE_MAX);
  assert.equal(E.addProfile(full, 'one too many'), null);
});
