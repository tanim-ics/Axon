# Axon

A gamified, hands-on course that teaches beginners how AI agents work, how to design, build and tune one, and how to wire agentic pipelines. It is organised as **journeys** picked from a hub: the Academy (eight short games), Field missions (seven real-world pipelines and their popular tools), the Addy journey (Addy Osmani's "Agent Engineer" course: all 19 lessons, 68 levels) and the LLM journey (tokens, prompting, RAG, fine-tuning, the harness, evals and shipping: 16 topics, 56 levels, weighted by researched job postings) and the Python + cloud journey (the Python an agent is written in and the cloud it runs on: 8 topics, 30 levels). A spaced-review layer brings every learned idea back so it sticks. Almost no reading.

The app was first called Agentcraft. The `localStorage` key is still `agentcraft.v1` on purpose, so saved progress survives. That key belongs to the first profile (`main`); every other profile saves under `agentcraft.v1.<id>`, and the list of profiles is in `agentcraft.profiles`.

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
| `fonts/` | Bundled IBM Plex Mono (display) and Inter (body) + their licences |
| `js/content.js` | All lesson data (levels, puzzles, copy). No logic |
| `js/engine.js` | All rules: scoring, progress, sanitizing, blueprint export. Pure, no DOM |
| `js/ui.js` | `UI.h()` DOM builder, `UI.fill()`, mascot, sound, confetti. Declares `Games` |
| `js/app.js` | Storage, hash router, HUD, journey hub, journey trail, level frame, review/Arena frame, result dialog, codex |
| `js/games/<id>.js` | One file per academy level: `Games[id] = function (root, api)` |
| `js/games/mission.js` | One data-driven game for every entry in `Content.MISSIONS` (`api.level` is the mission) |
| `js/games/recall.js` | `Games.recall` (questions with "why" feedback: daily review, Arena) and `Games.quiz` (a level made of questions: Master and Mix levels), `Games.case` (boss scenarios) |
| `js/games/learn.js` | Key-lesson cards with a diagram each, then one question per idea |
| `js/games/sort.js`, `js/games/order.js` | Data-driven puzzles: send cards to buckets; tap steps in order |
| `js/games/blitz.js` | Blitz, the timed Arena: clock, score, streak, quick feedback |
| `js/games/fix.js` | "Fix the trace": tap the first wrong step of a broken run, then pick the repair |
| `js/games/sim.js` | The run simulator (labs): choose a design, run the agent, read the trace, fix what broke |
| `js/markdown.js` | Pure Markdown parser for the full-read mode (UMD, tested). Returns data, never HTML |
| `course/addy/` | Bundled course text: `md/NN.md` (downloaded, then cleaned of embedded HTML and scripts), `NN.js` (generated, loaded by the reader), `LICENSE.txt`, `README.md` (source, licence, changes) |
| `tools/playthrough.js` | Paste into the browser console to play every level to its result dialog and report failures and page overflow. Not loaded by the app |
| `tools/build-course.js` | Cleans `md/NN.md` in place (removes embedded HTML and scripts) and writes `NN.js`. Not part of the running app |
| `TASKS.md` | Task list and resume point. Read first |
| `design/landing.html` | A standalone landing-page design mock (remote fonts, inline CSS). Not loaded by the app and exempt from its CSP rules; do not copy its fonts or inline styles into the app |
| `docs/` | Dated audit reports (`audit-YYYY-MM-DD.md`). A record of findings at one commit, with a status section added when they are fixed |
| `README.md` | For people: what it is, how to run it, sources and limits. Update its counts when levels or questions are added |
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
| `#/blitz` | The timed Arena: 60 seconds, best score saved |
| `#/course`, `#/read/<no>` | Course list and the full-read reader for one lesson |
| `#/codex` | Codex |
| `#/profile` | Profiles: switch, add, rename, delete, and reset the active profile's progress |

## Spaced review (the retention layer)

- `Content.CONCEPTS` maps a concept id to `{ level, name }`. `Content.BANK` holds questions built with `Q(id, concept, q, a, x, why)`: one right answer `a`, two or more wrong answers `x`, and a `why` shown after every answer. Tests require two or more questions per concept.
- A concept enters review when its level is finished. `state.review[concept] = { box, due }`.
- Rules live in `engine.js`: right when due waits 1, 3, 7, then 21 days; wrong at any time resets to tomorrow; right before it is due changes nothing (so Arena practice cannot fake mastery).
- `Engine.masteryOf` lists every learned idea with a status (`due`, `new`, `learning`, `strong`); the codex shows it as the Mastery map.
- A finished session goes through `Engine.touchSession`, which counts it as a learning day and returns any new badge. Do not change `state.streak` in the app.
- Daily review asks what is due, weakest first. Arena is a random mix of everything learned. Neither gives stars or XP.
- Blitz (`#/blitz`, `viewBlitz` in `app.js`, `Games.blitz`) is the Arena against a clock. `Engine.BLITZ` holds the round length and the seconds a wrong answer costs; `Engine.recordBlitz` keeps the best score in `state.blitz` (sanitised on load, only ever goes up). Answers are recorded with the same `recordReview` rules as the Arena, the clock pauses while feedback is shown, and the end panel lists each missed question once with its "why". It gives no stars or XP. Keep the untimed Arena: a clock is a barrier for some learners.
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

`lab(n, icon, title, idea, key, sim, shown)` adds a lab (`game: 'sim'`). `n` makes the id (`<prefix>-lab-<n>`) and never changes; `shown` is the number in the tag, used when a newer lab sits earlier in the journey (`p-lab-2` is shown as Lab 1, `p-lab-1` as Lab 2). `sim.slots` are design choices built with `SL(id, icon, label, concept, [[optionId, text], …])`; `sim.steps` are the agent's run built with `P(kind, text)` or `P(kind, text, slot, okId, { optionId: [whatHappens, why] })`. Rules the tests enforce: each slot decides exactly one step, each wrong option has what-happens and why, exactly one design wins, the right option is not always first, the last step shows the result, and each slot's concept is taught earlier in that journey (or is an Academy concept). Rules live in `Engine.simRun`; the game only plays the result.

`fix(n, icon, title, idea, key, cases)` adds a debug level (`game: 'fix'`, id `<prefix>-fix-<n>`). A case is `X(concept, ask, steps, bug, rightFix, [wrongFixes], why)`; steps are `T(kind, text)` and exactly one `B(kind, text)`, the first step that went wrong. The learner taps the bad step, then picks the fix; a wrong tap or a wrong fix is a slip (`Engine.fixStars`), and the fix answer is recorded for the case's concept. Rules the tests enforce: three or more cases, one concept per case and taught earlier in that journey, exactly one bad step and never the first, the bad step not always in the same position, distinct options. Write the bad step as the first decision that is wrong, not the first place the damage shows. Bad input (a malformed model reply, a poisoned page) is never the bad step: the agent's mistake is what it does with it, and the game asks for "the first step where the agent made a mistake".

- Cards and questions are written in this app's own words from the lesson's ideas. The lesson's own text is only shown in the reader, with credit and a link to the original.
- **Full read:** `tools/build-course.js` removes the lessons' embedded HTML widgets and inline scripts and wraps the text as `Course.add("NN", "...")`. The reader adds that one `<script src>` on demand, `Markdown.parse` turns the text into data, and `app.js` builds DOM from it with `UI.h()`. Never render lesson text as HTML, and do not add `connect-src` to the CSP. After changing or re-downloading anything in `course/addy/md/`, run `node tools/build-course.js` before anything else: it also removes the embedded HTML and scripts from the stored file. A test fails if a stored lesson contains HTML or differs from its `NN.js`.
- `Markdown.safeHref` also refuses links with `user@host`, control characters or direction-flipping characters, and every regex in `markdown.js` has bounded quantifiers. Keep both properties when changing the parser; the tests time hostile input.
- Only `https?://` links and links to another lesson (`../NN-slug/` → `#/read/NN`) become links; everything else is shown as text.

## The Python + cloud journey

- `Content.PY`, journey id `py`, level prefix `p` (`p01-learn` … `p08-master`, `p-mix-1`, `p-mix-2`, `p-lab-1`, `p-lab-2`, `p-fix-1`, `p-boss-1`). Built with the same `lesson()` / `mix()` / `boss()` helpers; `TRACK = track('p', 'Topic', false)` is set before its lessons.
- Topics: 01 Python for agents · 02 Environments and secrets · 03 Calling a model API · 04 Tools, async and tests · 05 Cloud building blocks · 06 Containers · 07 Deploying an agent · 08 Pipelines and operations.
- No source text and no research behind it: cards are written from general, established practice at beginner level. It names AWS, Azure and Google Cloud, plus Docker, Kubernetes and pytest, but **no individual cloud products** (their names change and are not verified). Keep it that way unless the names are checked and dated like `TOOLS_REVIEW`.
- Code shown in cards and puzzles is illustrative, not run by the app. Keep snippets to one line and standard-library or generic names.
- The same id rule as the LLM journey applies: add new topics at the end, or saved stars move to the wrong topic.

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
- `UI.h()` drops any `href` that is not `#…` or `http(s)://`, and sets only the attributes on its allow list (`ALLOWED` in `ui.js`, plus `aria-*` and `data-*`). A new attribute must be added there on purpose. Do not work around it.
- After a game re-renders its screen, move focus to the new content (the question heading, the card), so keyboard and screen-reader users are not sent back to the top of the page.
- There are two free-text inputs. The agent name must pass through `Engine.cleanName` and a profile name through `Engine.profileName` before it is stored or displayed. Both keep letters and digits of any script plus space, `_` and `-`.
- The profile list is untrusted too: read it only through `Engine.sanitizeProfiles`, and build a storage key only with `Engine.profileKey` (it returns `null` for any id that is not `main` or `p1`…`p9999`; check for it). New ids come from `profiles.next`, which never goes back, so a deleted profile's id is not reused. Profiles are a convenience for sharing one browser, not security: there is no password, and the page says so.

**Architecture**
- Rules and scoring live in `engine.js` and stay pure. Games only render and call the engine. Add a test for every new rule.
- Lesson text and puzzle data live in `content.js`. The content-integrity tests must prove every puzzle is winnable.
- XP and badges are derived from `state.stars`; never store them. Review sessions give no stars.
- In a game, use `api.later(fn, ms)` instead of `setTimeout` so timers die on navigation. Call `api.done(stars)` once, with 1–3.
- Passing arrays of nodes: use `UI.fill(el, …)`, not `el.replaceChildren(array)`.

**Solution, Start over, Show answer**
- Every level that is not made of questions has a written solution from `Engine.solutionOf(C, L)` (lines of text built from the level's own data). The level frame shows it behind a "Solution" button that asks first. A new game type needs a branch there; a test fails if any level has neither a solution nor questions.
- Seeing the solution caps the level at one star (`Engine.solvedStars`) until the page is reloaded; the list of peeked levels is kept in memory only, on purpose. "Start over" restarts the level and keeps the cap.
- Question screens (`Games.recall`: Learn checks, Master, Mix, bosses, daily review, Arena) have "Show answer", which records a miss for that idea. Blitz has neither button: it is a race.
- A dialog opened with `openOverlay(node, back, focusEl)` and `back = null` closes in place on Escape and returns focus to `overlayReturn`.

**Adding a level**
0. (Course lesson) Add a `lesson(...)` call and its questions; nothing else is needed.
1. (Academy level) Add an entry to `Content.LEVELS` (`id`, `icon`, `title`, `tag`, `idea`, `play`, `key`) and its data.
2. Add scoring to `engine.js` with tests.
3. Create `js/games/<id>.js` and add its `<script defer>` to `index.html` before `app.js`.

**Design and tone**
- Show, don't tell: one idea per level, one line of copy per screen, feedback through the coach bubble (`api.say`).
- The look is flat, dark and technical: one near-black background (`--bg` #0E1117), opaque panels (`--surface`) with hairline borders (`--line`), small radii, no gradients or glows as decoration. The cyan accent (`--blue`, #4FC3F7) marks what can be pressed (primary buttons, focus rings, hover underlines); text on it is dark (`--bg`). Status colours are unchanged: green = good, red = bad, orange = human checkpoint, yellow = stars. Use the tokens at the top of `styles.css`; do not hard-code new colours. The token is still named `--blue` so the old rules keep working.
- Type: headings use **IBM Plex Mono** (`--display`, weights 500 and 600) and body text uses **Inter** (`--font`, variable). Both are bundled in `fonts/` under the SIL OFL with their licence files. No remote fonts: the CSP allows `font-src 'self'` only. Adding or swapping a font file needs the user's OK. Mono headings are wide: keep them short and check 375px.
- The hub (`viewHub`) is left-aligned: hero, level-kind legend, review card, journey rail, Review / Arena / Blitz, trust line, footer. Its copy is `Content.HUB`. The first-visit headline types itself in (one CSS animation, about 600ms, skipped under reduced motion); nothing else animates unprompted. No all-caps labels. `design/landing.html` is the mock it came from.
- Motion uses `--ease` and `--spring`; press states scale down, they do not shift layout. No animation repeats for ever, and a sequence timed in JavaScript checks `UI.reducedMotion()` and shows its end state at once.
- Never move on from an explanation on a timer: show a Next button and let the learner read (`tools.js`, `guard.js`).
- Colour roles: `--line` is the hairline of a panel; `--edge` is the border of anything that can be pressed (3:1 or better); `--muted` is secondary text and must stay at 4.5:1 or better on every surface and tint; `--red-hi` is red text on a red tint. Type sizes are in rem.
- Every control is a real `<button>` or `<a>`, at least 44px tall, with a visible focus ring. State is never shown by color alone. Respect `prefers-reduced-motion`.
- Check at 375px wide: no horizontal page scroll.

## Verify before calling a change done

0. If any `js/` or `css/` file changed, raise the `?v=N` number on every script and style link in `index.html` (all to the same number). Browsers otherwise keep serving old files.

1. `npm test` passes.
2. Play the changed level to the result dialog in a browser; console is clean. After changing a game or a lot of level data, run `tools/playthrough.js` (instructions at the top of the file); a clean run reports 0 failed.
3. Tab through it with the keyboard.
