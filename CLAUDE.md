# Axon

A gamified, hands-on course that teaches beginners how AI agents work, how to design, build and tune one, and how to wire agentic pipelines. It is organised as **journeys** picked from a hub: the Academy (eight short games), Field missions (seven real-world pipelines and their popular tools), the Addy journey (Addy Osmani's "Agent Engineer" course: all 19 lessons, 66 levels) and the LLM journey (tokens, prompting, RAG, fine-tuning, the harness, evals and shipping: 16 topics, 54 levels, weighted by researched job postings). A spaced-review layer brings every learned idea back so it sticks. Almost no reading.

The app was first called Agentcraft. The `localStorage` key is still `agentcraft.v1` on purpose, so saved progress survives.

## Task list — do this first, every session

`TASKS.md` is the single source of truth for what is done and what is next. Work can stop at any moment (token limit, closed session), so keep it current enough that a fresh session can continue from it alone.

1. **Before any work:** read `TASKS.md`. Start from "Resume here". Do not redo ticked steps.
2. **Before starting new work:** add it to `TASKS.md` as small, verifiable steps.
3. **After each step is verified:** tick its box and rewrite "Resume here" to name the exact next step (file and what to do). Do this immediately, not at the end.
4. **If you stop mid-step:** write what is half-done and what is left under "Resume here".
5. **When a round is finished:** move it under "Done" with one line per outcome.

## Git

The project is a git repository on branch `main`; the remote `origin` is `https://github.com/tanim-ics/Axon.git`. Commit after each verified step, with a message that says what changed and why. Never push without the user's explicit OK, and never commit secrets. `.claude/launch.json` is committed on purpose; `.claude/settings.local.json` is ignored.

## Run and test

```bash
npm start        # serves on http://127.0.0.1:4173 (python3 -m http.server)
npm test         # node --test, engine + content integrity
```

No build step, no dependencies, no network calls. `.claude/launch.json` defines the same server as `agentcraft` for the preview pane.

## Layout

| Path | Role |
|---|---|
| `index.html` | Shell, CSP, mascot SVG `<template>`, script order |
| `css/styles.css` | All styles. Tokens at the top |
| `fonts/` | Bundled Sora display font + its licence |
| `js/content.js` | All lesson data (levels, puzzles, copy). No logic |
| `js/engine.js` | All rules: scoring, progress, sanitizing, blueprint export. Pure, no DOM |
| `js/ui.js` | `UI.h()` DOM builder, `UI.fill()`, mascot, sound, confetti. Declares `Games` |
| `js/app.js` | Storage, hash router, HUD, journey hub, journey trail, level frame, review/Arena frame, result dialog, codex |
| `js/games/<id>.js` | One file per academy level: `Games[id] = function (root, api)` |
| `js/games/mission.js` | One data-driven game for every entry in `Content.MISSIONS` (`api.level` is the mission) |
| `js/games/recall.js` | `Games.recall` (questions with "why" feedback: daily review, Arena) and `Games.quiz` (a level made of questions: Master and Mix levels), `Games.case` (boss scenarios) |
| `js/games/learn.js` | Key-lesson cards with a diagram each, then one question per idea |
| `js/games/sort.js`, `js/games/order.js` | Data-driven puzzles: send cards to buckets; tap steps in order |
| `js/games/sim.js` | The run simulator (labs): choose a design, run the agent, read the trace, fix what broke |
| `js/markdown.js` | Pure Markdown parser for the full-read mode (UMD, tested). Returns data, never HTML |
| `course/addy/` | Bundled course text: `md/NN.md` (downloaded, then cleaned of embedded HTML and scripts), `NN.js` (generated, loaded by the reader), `LICENSE.txt`, `README.md` (source, licence, changes) |
| `tools/build-course.js` | Cleans `md/NN.md` in place (removes embedded HTML and scripts) and writes `NN.js`. Not part of the running app |
| `TASKS.md` | Task list and resume point. Read first |
| `tests/engine.test.js` | Unit tests |

`content.js` and `engine.js` are UMD so the same files run in the browser and in Node tests.

## Journeys and routes

`Content.JOURNEYS` lists the journeys in hub order. Each has `id`, `icon`, `title`, `tag`, `unit` (the word used in "Level 3"), `blurb`, `order` (`linear` or `any`), optional `gate` (a level id that must be finished first), optional `kind: 'mission'`, and `levels`. A journey with no levels shows as "Being built". Every level id is unique across all journeys.

| Route | Screen |
|---|---|
| `#/map` | Hub: hero, daily review card, journey cards |
| `#/journey/<id>` | That journey's trail |
| `#/level/<id>` | A level (back goes to its journey) |
| `#/review`, `#/arena` | Recall sessions from the concept bank |
| `#/course`, `#/read/<no>` | Course list and the full-read reader for one lesson |
| `#/codex` | Codex |

## Spaced review (the retention layer)

- `Content.CONCEPTS` maps a concept id to `{ level, name }`. `Content.BANK` holds questions built with `Q(id, concept, q, a, x, why)`: one right answer `a`, two or more wrong answers `x`, and a `why` shown after every answer. Tests require two or more questions per concept.
- A concept enters review when its level is finished. `state.review[concept] = { box, due }`.
- Rules live in `engine.js`: right when due waits 1, 3, 7, then 21 days; wrong at any time resets to tomorrow; right before it is due changes nothing (so Arena practice cannot fake mastery).
- `Engine.masteryOf` lists every learned idea with a status (`due`, `new`, `learning`, `strong`); the codex shows it as the Mastery map.
- A finished session goes through `Engine.touchSession`, which counts it as a learning day and returns any new badge. Do not change `state.streak` in the app.
- Daily review asks what is due, weakest first. Arena is a random mix of everything learned. Neither gives stars or XP.
- **Every new level must add its concepts and questions to the bank.** Field missions are the exception: their three concepts and six questions each are generated from the mission's stages, gate and tools at the end of `content.js`, so adding a mission needs no questions written by hand.
- Wrong options must be plausible misconceptions, never jokes, and the right answer must not stand out by length. A test fails if the right answer is the longest, the shortest or the middle-length option in more than 45% of questions.

## The Addy journey

Addy Osmani's "Agent Engineer" course (Apache 2.0, `github.com/addyosmani/agent-engineer`). Each lesson is three levels built by `lesson(no, icon, short, {...})` in `content.js`:

| Level | id | `game` | What it is |
|---|---|---|---|
| Learn | `aNN-learn` | `learn` | 3–5 key cards (`K(icon, title, text, visual)`), then one question per concept |
| Apply | `aNN-apply` | `sort` or `order` | A puzzle on the lesson's main idea, with a `why` per item |
| Master | `aNN-master` | `quiz` | The lesson's concepts plus 2 random earlier ones; 60% clears it |

`mix(n, title, size)` adds a Mix level drawing on every course lesson so far. `boss(n, icon, title, brief, key, steps)` adds a boss (`game: 'case'`): one scenario and a run of decisions built with `D(concept, q, a, x, why)`. Tests require a boss to span four or more lessons and to use only concepts taught before it. A level picks its game through `L.game`.

`lab(n, icon, title, idea, key, sim)` adds a lab (`game: 'sim'`). `sim.slots` are design choices built with `SL(id, icon, label, concept, [[optionId, text], …])`; `sim.steps` are the agent's run built with `P(kind, text)` or `P(kind, text, slot, okId, { optionId: [whatHappens, why] })`. Rules the tests enforce: each slot decides exactly one step, each wrong option has what-happens and why, exactly one design wins, the right option is not always first, the last step shows the result, and each slot's concept is taught earlier in that journey (or is an Academy concept). Rules live in `Engine.simRun`; the game only plays the result.

- Cards and questions are written in this app's own words from the lesson's ideas. The lesson's own text is only shown in the reader, with credit and a link to the original.
- **Full read:** `tools/build-course.js` removes the lessons' embedded HTML widgets and inline scripts and wraps the text as `Course.add("NN", "...")`. The reader adds that one `<script src>` on demand, `Markdown.parse` turns the text into data, and `app.js` builds DOM from it with `UI.h()`. Never render lesson text as HTML, and do not add `connect-src` to the CSP. After changing or re-downloading anything in `course/addy/md/`, run `node tools/build-course.js` before anything else: it also removes the embedded HTML and scripts from the stored file. A test fails if a stored lesson contains HTML or differs from its `NN.js`.
- `Markdown.safeHref` also refuses links with `user@host`, control characters or direction-flipping characters, and every regex in `markdown.js` has bounded quantifiers. Keep both properties when changing the parser; the tests time hostile input.
- Only `https?://` links and links to another lesson (`../NN-slug/` → `#/read/NN`) become links; everything else is shown as text.

## The LLM journey and the market tally

- `Content.LLM` is built with the same `lesson()` / `mix()` / `boss()` helpers as the Addy journey. They push to whichever journey `TRACK` points at (`track(prefix, word, read)`); set `TRACK` before a journey's lessons. LLM levels have no `read`, so they show no full-read link.
- The LLM journey has no source text. Its cards are written from general, established practice. Keep claims conservative and widely accepted.
- `Content.MARKET` is the researched tally behind it: `{ reviewed, postings, summary, caveat, skills: [{name, count}], tools: [{kind, names}], sources: [{label, url}] }`, rendered by `market()` in `app.js` under "What employers ask for" in the codex. Tests require a date, sorted counts within the sample size, and one https source per posting.
- When the research is redone, update `reviewed`, every count, the sources, the tool names in topics 05 and 12, and the counts quoted in the job-ready capstone (`l-boss-2`).
- Level, concept and question ids contain the topic number (`l14-learn`, `l14-rubric`). Saved progress is keyed by these ids, so inserting a topic in the middle renumbers the later ones and misplaces any saved stars for them. Add new topics at the end unless no one has progress to lose, or add a migration in `Engine.sanitizeState` with a test. State the sample's limits in `caveat`.

## The course

| # | id | Teaches | Mechanic |
|---|---|---|---|
| 1 | `loop` | Think → Act → Observe | You play the model and pick each action |
| 2 | `tools` | Tool choice, least power | Equip exactly what the job needs |
| 3 | `prompt` | System prompt design | Toggle blocks, watch the reply change live |
| 4 | `memory` | Context window limits | 3 slots, 4 facts: drop noise, compress |
| 5 | `pipeline` | Chain, router, parallel, critic loop | Fill the blanks, watch data flow |
| 6 | `guard` | Guardrails | Match each threat to its shield |
| 7 | `trace` | Debugging | Tap the first wrong step in a trace |
| 8 | `boss` | Designing your own agent | Build it, run 5 trials, export a blueprint |

## Field missions

Unlocked together once `guard` (Shield Up) is done; playable in any order. Each is three rounds: order the stages → give each stage its tool → pick the stage a human must approve. Finishing one saves its playbook (stage → tool · alternatives) to the codex.

| id | Use case |
|---|---|
| `m-video` | Short-video studio: script, voiceover, music, clips, edit, post |
| `m-clips` | Long video → shorts: transcribe, pick moments, cut, caption, cover, post |
| `m-sre` | Systems engineering: on-call incident response |
| `m-code` | Software engineering: ticket → pull request → deploy |
| `m-research` | Research desk (RAG) with citations and evals |
| `m-support` | Customer support refund flow |
| `m-data` | Data analyst: query, crunch, chart, explain |

**Adding a mission** is content only: append to `Content.MISSIONS` using `S(id, icon, name, does, tool, also)`. Rules the tests enforce: id starts with `m-`, 4–6 stages, stage ids and `tool` names unique within the mission, `gate` is a stage id, at least two `also` alternatives. Write stage names so the order is unambiguous. Tool names in the Field missions and the toolbox were checked against each product's own site on the date in `Content.TOOLS_REVIEW` (shown in the codex). When you add, rename or remove a product, check its official page, update `TOOLS_REVIEW.sources` and the date (a test fails if a named product has no source). Keep to widely known products and say "popular", never "best": popularity is not measured. The LLM journey is different: its tools and job requirements come from researched job postings and must carry their sources and a "last reviewed" date in the codex.

## Rules for changing this code

**Security (do not weaken)**
- Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, or inline `style=""`/`on*=""` attributes. Build DOM only with `UI.h()` / `UI.fill()`; set dynamic sizes through `el.style.x = …`.
- Keep the CSP in `index.html` as is (`script-src`, `style-src`, `font-src` are all `'self'`): no inline scripts or styles, no remote origins. Do not add CDNs, fonts, analytics, or any dependency.
- `localStorage` is untrusted. Everything read from it goes through `Engine.sanitizeState`. New persisted fields need a sanitizer branch and a test.
- `UI.h()` drops any `href` that is not `#…` or `http(s)://`, and any `src`. Do not work around it.
- After a game re-renders its screen, move focus to the new content (the question heading, the card), so keyboard and screen-reader users are not sent back to the top of the page.
- The agent name is the only free-text input. It must pass through `Engine.cleanName` before it is stored or displayed.

**Architecture**
- Rules and scoring live in `engine.js` and stay pure. Games only render and call the engine. Add a test for every new rule.
- Lesson text and puzzle data live in `content.js`. The content-integrity tests must prove every puzzle is winnable.
- XP and badges are derived from `state.stars`; never store them. Review sessions give no stars.
- In a game, use `api.later(fn, ms)` instead of `setTimeout` so timers die on navigation. Call `api.done(stars)` once, with 1–3.
- Passing arrays of nodes: use `UI.fill(el, …)`, not `el.replaceChildren(array)`.

**Adding a level**
0. (Course lesson) Add a `lesson(...)` call and its questions; nothing else is needed.
1. (Academy level) Add an entry to `Content.LEVELS` (`id`, `icon`, `title`, `tag`, `idea`, `play`, `key`) and its data.
2. Add scoring to `engine.js` with tests.
3. Create `js/games/<id>.js` and add its `<script defer>` to `index.html` before `app.js`.

**Design and tone**
- Show, don't tell: one idea per level, one line of copy per screen, feedback through the coach bubble (`api.say`).
- The look is Apple-product-page dark glass: true black, translucent blurred surfaces with hairline borders, pill buttons, system colours (blue = action, green = good, red = bad, orange = human checkpoint, yellow = stars). Use the tokens at the top of `styles.css`; do not hard-code new colours.
- Type: headings use **Sora** (`--display`), bundled at `fonts/sora-latin-variable.woff2` (SIL OFL, licence in `fonts/SORA-LICENSE.txt`); body text uses the system stack (`--font`, San Francisco on Apple devices). No remote fonts: the CSP allows `font-src 'self'` only. Adding or swapping a font file needs the user's OK.
- Motion uses `--ease` and `--spring`; press states scale down, they do not shift layout.
- Every control is a real `<button>` or `<a>`, at least 44px tall, with a visible focus ring. State is never shown by color alone. Respect `prefers-reduced-motion`.
- Check at 375px wide: no horizontal page scroll.

## Verify before calling a change done

0. If any `js/` or `css/` file changed, raise the `?v=N` number on every script and style link in `index.html` (all to the same number). Browsers otherwise keep serving old files.

1. `npm test` passes.
2. Play the changed level to the result dialog in a browser; console is clean.
3. Tab through it with the keyboard.
