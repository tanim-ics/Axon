# Axon — task list

**Claude: read this file before doing anything, and update it as you work.**
Rules are in `CLAUDE.md` → "Task list". Tick a box the moment a step is verified, and keep
"Resume here" pointing at the exact next step, so a new session can continue without re-reading the code.

## Resume here

> Rounds 1–25 are complete (Round 14 was dropped by the user). Nothing is in progress and the Backlog is
> empty. Git: Rounds 1–24 are pushed; Round 25 is committed locally only. Ask the user before pushing.
> Ideas for what could come next are under "Ideas" below; none is approved.

## Planned next (approved)

- Nothing further is approved. See the Backlog.


## Ideas (not approved; pick with the user)

- Rewrite the next batch of weak questions (about 100 short "why" lines remain; see Round 25)

- Named cloud products in the Python + cloud journey, once they are checked against official sites

## Backlog (not started, needs the user's OK)


## Done

### Round 25 — the 20 weakest questions rewritten (complete, verified)
- [x] Audit by script of the 290 hand-written bank questions (the 42 mission questions are generated and
      were left alone). No stem used "which of the following". 104 have a "why" under 60 characters, 52 have
      a wrong option under 12 characters, 62 have options that differ in length by more than half
- [x] The 20 that combined one-word options with a one-line "why" were rewritten (2 Academy, 7 Addy,
      11 LLM): a scenario stem, wrong options that are real misconceptions, a "why" that says why the wrong
      options fail, options within 20% of each other in length. Ids, concepts and counts are unchanged
      (332 questions, 166 concepts). Addy rewrites use the lesson's own terms
- [x] 59 tests pass. Right answer longest in 31% and shortest in 33% of the bank (limit 45%). Browser at
      375px (`?v=32`): four rewritten questions answered wrong in their Master levels; the right option was
      marked, the new "why" showed, no page overflow, console clean
- Limits: 270 hand-written questions were not touched; about 100 still have a short "why" and about 50 a
  very short wrong option. The 20-per-cent length rule is applied to the rewritten questions only; the test
  still checks the looser rule. The rewrites have had no second reader. Boss decisions were not audited

### Round 24 — solution button, start over, profiles (complete, verified)
- [x] Engine: `solutionOf` writes the solution of every level that is not made of questions from the
      level's own data (69 levels; the other 100 are question levels); `solvedStars`; the profile functions.
      59 tests pass (4 new)
- [x] Level frame: "Solution" asks first, then lists the solution and caps the level at one star until the
      page is reloaded; "Start over" restarts the level. Question screens (Learn checks, Master, Mix, bosses,
      daily review, Arena) have "Show answer", which counts as a miss. Blitz has neither
- [x] `#/profile`: up to 6 profiles in this browser, each with its own progress; switch, add, rename,
      delete, and reset the active profile (two taps). The header shows the active profile's initial. The
      first profile keeps the key `agentcraft.v1`, so existing progress is untouched. The codex's reset
      button is now a link to this page
- [x] Browser at 375px (`?v=31`), in a throwaway profile: the solution dialog on `loop`, a mission, a lab, a
      debug level, a sort, `pipeline` and `boss` (fits the screen, Escape closes it, focus returns to the
      button); `loop` finished after peeking: 1 star; Start over cleared the steps; Show answer marked the
      right option and changed the review schedule; rename (a name with markup was cleaned), reset, switch
      and delete. `tools/playthrough.js` now reads the active profile and played 8 levels with the new
      buttons present. Console clean, no page overflow
- [x] Fixed on the way: the edit script duplicated 509 lines of `js/app.js` (the app still ran, because a
      later function replaces an earlier one); found, removed and checked that each view is defined once.
      On phones the XP bar is hidden so the header fits its five items
- Limits: the cap is easy to get around (reload, then replay), by design. Solutions are plain text, not an
  animation of the moves. Not tab-walked by keyboard (focus was checked by script). The storage event for
  profiles changed in another tab was not exercised. The other 161 levels were not replayed after this
  round. Profiles are not accounts: nothing stops one person opening another's profile

### Round 23 — the landing design applied to the app (complete, verified)
- [x] Fonts: IBM Plex Mono 500 and 600 and Inter (variable), latin woff2 from Fontsource via jsDelivr
      (79 KB in all), with their OFL licences from the IBM/plex and rsms/inter repositories. Sora and its
      licence removed. The CSP is unchanged
- [x] Theme (`css/styles.css`): palette #0E1117 / #161B25 / #232B3A / #4FC3F7 / #E8EDF4 / #6B7A99, mono
      headings, Inter body, small radii, dark text on the accent. Removed: the aurora background, the
      spectrum gradient (eyebrows, XP and progress bars), glass blur, button and mascot glows
- [x] Hub (`viewHub`, copy in `Content.HUB`): left-aligned hero (typed headline on a first visit, "Next up"
      afterwards), level-kind legend, review card, journey rail with level counts and an honest lock note,
      Review / Arena / Blitz with line icons, trust line, footer with credit and review dates. The HUD
      wordmark is "axon" in mono and stays visible on phones
- [x] 55 tests pass. Browser (`?v=28`): hub at 708px as a first visit and at 375px with everything done;
      Academy trail, a level intro, an Arena question with feedback and the codex at 375px.
      `tools/playthrough.js` played all 169 levels at 375px: 0 with page overflow, console clean (`loop`
      and `tools` errored only because two runs overlapped; replayed alone, both passed)
- Limits: muted text (#6B7A99 on #0E1117) is about 4.4:1, just under the 4.5:1 AA line for small text; the
  colour is the brief's. Not tab-walked by keyboard after the retheme. Reduced motion not exercised in a
  browser. Not viewed wider than 708px in the app (the mock was viewed at 1024px). Most game screens were
  checked for overflow by script, not looked at: some still carry the old glow shadows on state changes.
  The preview pane's screenshots sometimes caught the typed headline before its first frame

### Landing-page design mock (2026-11-15)
- [x] `design/landing.html`: a standalone mock built to the user's design brief (IBM Plex Mono + Inter from
      Google Fonts, inline CSS, cyan accent, left-aligned hero that types in, journey rail, Review / Arena /
      Blitz, trust line, footer). It is NOT the app: `index.html`, its CSP and the bundled Sora font are
      untouched, and the mock's remote fonts and inline styles would break the app's rules if copied in
- [x] Checked at 1024px and 375px: no page overflow, console clean, links at least 44px tall. Critique
      applied: removed the "Open · …" line on unlocked cards; tightened hero and section spacing so the
      journey cards start higher
- Limits: not tab-walked by keyboard; reduced-motion not exercised in a browser; not checked at 1440px.
  Not approved as the app's new look: applying it to the real hub would need the fonts bundled locally
  (font changes need the user's OK) and the styles moved into `css/styles.css`

### README (2026-11-15)
- [x] `README.md` added: what the app is, how to run and test it, the journeys and level kinds, the review
      layer, the layout, sources and limits, licences. Counts were read from `Content` (169 levels, 166
      concepts, 332 questions). It states that the project's own code has no licence file yet

### Round 22 — three more labs for the run simulator (complete, verified)
- [x] Addy `a-lab-3` "plug in the team's tools" after Mix 4: AGENTS.md, a skill loaded on demand, MCP or a
      shared-password script, an audited server with narrow rights
- [x] LLM `l-lab-3` "the prompt change" after topic 16: golden set, a judge with a rubric, five runs with a
      pass rate, a 5% rollout
- [x] Python `p-lab-2` "the first agent script" after the Python mix: a pytest test, hints and a docstring,
      `json.loads`, pinned packages. `lab()` has a `shown` number so it reads as Lab 1 and `p-lab-1` as
      Lab 2; ids are unchanged, so saved stars stay where they were
- [x] Each lab has 4 settings with 3 options (8 distinct failures), each tied to a concept taught earlier.
      55 tests pass. Totals: Addy 68 levels, LLM 56, Python + cloud 30; 169 levels in all
- [x] Browser at 375px (`?v=26`): each new lab run once with one wrong choice (it stopped at the right step
      with its reason, focus went to the "Change" button and then to the setting), then fixed: 2 stars.
      `tools/playthrough.js` then played the three labs, the level after each, and `p-lab-1`: 8 played,
      0 failed, no page overflow, console clean
- Limits: one wrong option per lab was tried in the browser; the other seven are covered by the tests only.
  The runs were driven by script clicks, not by keyboard. The labs have had no second reader. The other
  161 levels were not replayed (no game code changed). Someone already past Mix 4, LLM topic 16 or the
  Python mix must play the new lab before the next locked level opens

### Round 21 — Blitz (timed Arena) and a second reader for the debug runs (complete, verified)
- [x] Engine: `BLITZ` (60 seconds, 3-second penalty), `state.blitz` (best score, sanitised, carried through
      `awardLevel`), `recordBlitz`; 55 tests pass
- [x] `js/games/blitz.js` and `viewBlitz` (`#/blitz`): clock bar, score, streak, quick right/wrong feedback
      with the clock paused, end panel with the score, the record and each missed question once with its why.
      Entry: a Blitz button on the hub review card. The untimed Arena is unchanged
- [x] Second reader over the 12 debug runs: 7 findings, all applied. The prompt now asks for "the first step
      where the agent made a mistake" (bad input is not the agent's error); one trace that contradicted
      itself is fixed; three joke options replaced
- [x] Browser at 375px: two Blitz rounds. Four right answers then wrong ones: score, streak, 3-second
      penalty, paused clock, new record saved (2 → 4), 16 review entries written, misses listed. Second round:
      the clock ran out on its own after the bar turned red; the best stayed 4; "Go again" returned to the
      start panel. No page overflow, console clean
- Limits: Blitz was driven by script clicks, not by keyboard, and there is no keyboard shortcut for the
  answers. The debug-run fixes are text-only and were not replayed in a browser afterwards (tests pass). The
  reader is a model, not a subject expert

### Round 20 — "fix the trace" game (complete, verified)
- [x] New game `js/games/fix.js` (`game: 'fix'`): a broken run is shown as a trace; tap the first wrong step,
      then pick the repair from three options. Slips (wrong taps and wrong fixes) decide the stars
- [x] Engine: `fixPick`, `fixOptions`, `fixStars`, with tests for bad indexes and shuffling
- [x] Three debug levels before the last boss of each course, four runs each: `a-fix-1` (repeating a failed
      step, prompt injection, context rot, unreadable tools), `l-fix-1` (unchecked output, ungrounded answer,
      lost goal, oversized model), `p-fix-1` (retrying a 401, bad JSON, state in a process, unstaged release).
      Each run is tied to a taught concept and its answer is recorded in the spaced review
- [x] 54 tests pass; `tools/playthrough.js` plays the new game
- [x] Browser at 375px: `p-fix-1` played by hand with one wrong tap and one wrong fix (2 stars, the miss and
      the hits were recorded in the review); the play-through ran the three debug levels and the three bosses
      after them: 6 played, 0 failed, 0 with page overflow, console clean
- Limits: `a-fix-1` and `l-fix-1` were played only by the script, which always answers right. Keyboard use
  was not exercised. The twelve runs have had no second reader. Someone who had already passed the last
  boss of a course must play the new debug level before replaying that boss (levels unlock in order)

### Round 19 — the Python + cloud journey hardened (complete, verified)
- [x] Lab `p-lab-1` "launch week" before the capstone: 4 settings (key, retry, state, release), each tied to
      a taught concept, 8 distinct failures. The journey is now 28 levels
- [x] Second reader, two passes by fresh agents: 36 cards, 25 sort items, 26 order steps, all 48 questions,
      8 boss decisions and the lab. No keyed answer was wrong. 20 findings, all applied: three over-claims in
      cards or "why" lines (GPU work needs a VM; `async`/`await` alone runs calls together; a "why" that
      contradicted itself on idle cost), eight disputable keys, orders or options, and joke or give-away
      options in about a dozen questions
- [x] 53 tests pass (labs test and `py` order test extended)
- [x] Browser at 375px: the lab played with one wrong choice (the run stopped at step 4 with its reason) and
      then fixed; after all text fixes `tools/playthrough.js` replayed all 28 levels: 28 played, 0 failed,
      0 with page overflow, console clean
- Limits: the readers are models, not subject experts, and the first pass was given a line range that ended
  13 questions early (the second pass covered them). The lab was played by mouse only. No cloud products
  are named

### Round 18 — Python + cloud journey (complete, verified)
- [x] Fifth journey `py` (`Content.PY`): 8 topics x Learn, Apply, Master, two Mix levels and a capstone boss
      ("Ship the support agent"): 27 levels, 24 concepts, 48 questions, 8 boss decisions
- [x] Topics: Python for agents · Environments and secrets · Calling a model API · Tools, async and tests ·
      Cloud building blocks · Containers · Deploying an agent · Pipelines and operations
- [x] `MARKET.caveat` no longer says Python and cloud are not taught
- [x] Tests: `C.PY` added to the course, length-guess and mission-isolation tests, plus a `py` order test.
      53 tests pass
- [x] Browser at 375px: `tools/playthrough.js` played all 27 new levels to their result dialog: 27 played,
      0 failed, 0 with page overflow, console clean. The hub lists the journey
- [x] Fixed in passing: the hub title no longer adds a full stop after a title ending in "?"
- Limits: the content is written from general practice, not researched or checked by a second reader, and it
  is beginner level. No individual cloud products are named. The play-through takes the right answer every
  time; wrong answers, retries and the keyboard were not exercised on the new levels. The other 135 levels
  were not replayed (only content was added; no game code changed)

### Round 17 — every level played, and a second reader for the questions (complete, verified)
- [x] Play-through: a script played all 135 levels (8 Academy, 7 missions, 66 Addy, 54 LLM) to their result
      dialog in the preview browser at 375px, reading the right answers from `Content`. Result: 135 played,
      0 failed, 0 with page overflow, console clean. The script is kept as `tools/playthrough.js`
- [x] Second reader (background agent): read 284 questions, 42 boss decisions, 170 sort cards and 16 lab
      settings. It flagged 12 disputable items and no plain factual error in a keyed answer. All 12 are fixed:
      reworded questions (`l09-split-2`, `a15-practice-1`, `a12-tiers-1`), a "why" line that contradicted a boss
      (`guard-data-1` and lab 2), the pull-request stage of the code mission (now "Open a pull request for
      review"), four sort cards, one lab option, and two boss decisions
- [x] 52 tests pass after the fixes
- Limits: the play-through takes the right answer every time, so it proves each level can be completed and
  renders without overflow; it does not exercise wrong answers, retries or the keyboard. The 12 fixes were made
  after the play-through and are text-only; the play-through was not repeated. `tools/playthrough.js` was
  rewritten from the script that ran and has only been syntax-checked in that form. The second reader is one
  model's judgement, not a subject expert's

### Round 16 — the run simulator (complete, verified)
- [x] Engine: `simReady`, `simRun`, `simStars` (first run 3 stars, by the third run 2, later 1)
- [x] `js/games/sim.js`: choose a design, press Run, the trace appears step by step; a wrong choice stops the
      run at the step it affects with what happened and why, and a button jumps back to that setting
- [x] Four labs via `lab()`, `SL()` and `P()` in `js/content.js`: Addy "the order desk" (after lesson 05) and
      "the refund attack" (after lesson 10); LLM "build the docs bot" (after topic 07) and "the coding agent's
      harness" (after topic 11). Each has 4 settings with 3 options, so 8 distinct failures per lab
- [x] Each setting is tied to a concept: a failed setting is recorded as a miss in the spaced review, a
      successful run as a hit for all four
- [x] Tests: exactly one winning design per lab; every wrong option fails at its own step with a reason; the
      right option is not always listed first; 52 tests pass
- [x] Browser at 375px: lab 1 of each journey played with one wrong choice and then fixed, the first by mouse
      and the second by keyboard; the page follows the trace; console clean
- Not played by hand: Addy lab 2 and LLM lab 2 (covered by the tests). Addy is now 66 levels, LLM 54

### Round 15 — Field missions feed the spaced review (complete, verified)
- [x] Three ideas per mission (the order, the human check, the tools), two questions each, generated in
      `js/content.js` from the mission's own stages, gate and tools: 21 concepts, 42 questions. Totals are now
      142 concepts and 284 questions
- [x] Test: every mission question is well-formed and its answer is right by construction; Addy and LLM Master
      levels never draw on mission ideas; finishing a mission makes its three ideas due
- [x] 51 tests pass. In the browser at 375px: with a mission marked done, its ideas appeared in the mastery map
      under Field missions and its questions came up in the daily review; console clean

### Round 14 — VoiceOver test (dropped by the user, 2026-11-15)
- Not done and not wanted: the user does not use VoiceOver. No real screen-reader test has been run. The
  accessibility work rests on code review, keyboard runs and the roles and labels in the markup.

### Round 13 — tool names verified against official sites (complete, verified)
- [x] Three agents looked up all 113 product names on 2026-11-15 (117 lookups reported: 31 + 44 + 42, with
      overlaps). Each returned the page it used
- [x] Fixed in `Content.MISSIONS`: Sora removed (OpenAI shut it down in 2026); OpenAI TTS → Amazon Polly
      (end-of-life announced); Udio → Soundraw (downloads disabled); Premiere Pro → Adobe Premiere (renamed);
      Opsgenie → Jira Service Management (end-of-life April 2027, Atlassian's stated migration target);
      "GPT mini" → GPT-6 Luna (no tier by the old name); LlamaIndex → LlamaParse for document parsing;
      the data-crunch stage now says "dataframes and local SQL" because DuckDB is a SQL engine
- [x] `Content.TOOLS_REVIEW`: review date, a note and 111 official pages, shown in the codex under the toolbox.
      Test: every named product has an https source, and no source is left for a product that is no longer named
- [x] 50 tests pass; codex checked at 375px
- Caveats recorded, not fixed:
  - "Popular" was not measured for any product
  - Confirmed through search results only, not a fetched vendor page: Exa, Brave Search, Unstructured, Docling,
    pgvector, Weaviate, LangSmith, Zendesk, Freshdesk, Claude Haiku, Grok. Midjourney's site blocked the check
  - Jira Service Management and GPT-6 Luna were taken from vendor pages about the products they replace, not
    checked as products in their own right; Amazon Polly and Soundraw were checked directly
  - Prometheus is listed under "metrics and logs" but covers metrics only
  - Whisper and Chroma stay because their open-source versions continue; their hosted services are being retired
  - Ownership changed but the name is still sold: Tavily (Nebius), Langfuse (ClickHouse), Intercom (Salesforce),
    Cursor (SpaceX); Promptfoo's sale to OpenAI was announced, closing not confirmed
  - Redo this review every few months; the date in the codex shows how old it is

### Round 12 — the project is under git (complete)
- [x] `git init` on branch `main`, `.gitignore` added, first commit of all 70 files
- [x] Identity set for this project only: name `tanim-ics`, email `tanim-ics@users.noreply.github.com` (the user
      answered the identity question with their GitHub repository, so no real email is recorded)
- [x] Remote `origin` added: `https://github.com/tanim-ics/Axon.git` (private). Pushed on 2026-11-15 after the
      user said "Yes, push"

### Round 11 — a second evals topic in the LLM journey (complete, verified)
- [x] New topic 14 "Evals for agents": rubrics for judges, grading the path, repeat runs and checking the judge;
      5 cards, a sort puzzle ("Answer or path?"), 3 concepts, 6 questions
- [x] Old topics 14 and 15 renumbered to 15 and 16 (level, concept and question ids, boss references). No saved
      LLM progress existed, so nothing was migrated. Anyone with saved stars for the old `l14-*` / `l15-*` ids
      would see them on the wrong topic
- [x] One decision added to the job-ready capstone (now 11). LLM journey: 16 topics, 52 levels
- [x] 49 tests pass, including the answer-length balance. Played topic 14 Learn and Apply at 375px and opened
      its Master level; console clean
- Still true: fine-tuning has three topics against 5 of 23 postings; evals now has two against 20 of 23

### Round 10 — no third-party scripts stored in the project (complete, verified)
- [x] `tools/build-course.js` now writes the cleaned text back to `course/addy/md/NN.md`: the upstream HTML
      widgets and inline scripts are gone from all 19 stored files (717 KB → 450 KB). Running it again changes
      nothing
- [x] The reader's files (`course/addy/NN.js`) are byte-for-byte unchanged (same checksum before and after)
- [x] `course/addy/README.md` states the source, licence, download date and what was changed
- [x] Test: no stored lesson has embedded HTML or inline handlers, and each `NN.js` matches its `md/NN.md`;
      49 tests pass

### Round 9 — answers no longer guessable by length (complete, verified)
- [x] Rewrote the wrong options of 210 option sets (172 of 236 bank questions, 38 of 41 boss decisions): joke options
      replaced by plausible misconceptions, lengths varied on purpose
- [x] Before: the right answer was the longest option in 66% of bank questions. Now: longest 33%, shortest 34%,
      in between 33% (boss decisions: 32% / 34% / 34%)
- [x] Test added: none of the three positions may exceed 45% in the bank or in the boss decisions
- [x] 48 tests pass; an Arena session checked at 375px (no overflow with the longer options); console clean
- Not done: the new wrong options were not reviewed by a second reader for answers that are arguably right too.
  When writing new questions, check with the test and vary which option is longest.

### Round 8 — reviews, mastery map, Academy feedback (complete, verified)
- [x] Security review (agent-skills `security-auditor`): no critical, high or medium findings. Four low ones
      fixed: slow regexes in `js/markdown.js` on hostile text (all quantifiers bounded, lines capped), links
      with `user@host` or control / direction-flipping characters now refused, `Course.load` no longer waits
      for ever on a broken lesson file, `UI.h()` refuses any `href` that is not `#…` or `http(s)://`
- [x] Code review (agent-skills `code-reviewer`): keyboard focus now moves to the new question / card after
      every re-render (recall, sort, learn); the reader announces "Lesson loaded" instead of reading the whole
      lesson; the review's Arena button is a real link; `Engine.touchSession` replaces a state mutation in
      the app and reports a streak badge; `validDay` rejects impossible dates; empty question lists are
      handled; journey lead text moved into `content.js`; six test gaps closed
- [x] Mastery map in the codex (`Engine.masteryOf`): every learned idea, weakest first, grouped by journey
- [x] "Why" feedback in the Academy: tools (why per job), prompt (why per block), pipeline (why a block
      bounced), guard (what the wrong shield is for), trace (how to fix the bug)
- [x] Script and style links carry `?v=N`, because the preview browser kept serving old game files
- [x] 47 tests pass. Verified in the browser: the five changed Academy levels, the mastery map at 375px,
      a keyboard run through a Master level, a sort level and a Learn level, the review's Arena link, the reader
- Not re-walked by keyboard: the order game and boss cases (boss cases use the same question screen as Master)

### Round 7 — job-market research + LLM journey (complete, verified)
- [x] Research (2026-11-15): 23 postings for agent / applied-AI engineer roles read through page summaries,
      plus 3 larger analyses. Stored as `Content.MARKET` with every source URL; shown in the codex as
      "What employers ask for". Top of the tally: Python, RAG and evals (20 of 23 each)
- [x] `lesson()` / `mix()` / `boss()` now push to whichever journey `TRACK` points at
- [x] `Content.LLM`: 15 topics × Learn / Apply / Master, 2 Mix levels, a RAG boss and the job-ready capstone
      (49 levels, 45 concepts, 90 questions). Tool names in topics 05 and 12 follow the research counts
- [x] 42 tests pass. Verified in the browser at 375px: topic 01 Learn and Apply, the RAG boss, the tool
      landscape sort, the capstone, the 49-node trail, the codex market section and its sources; console clean
- Known limits: the sample is small, mostly senior and mostly US, and skewed towards "agentic" titles. Python
  and cloud skills top the tally and are not taught in the app. Fine-tuning has three topics although only 5
  of 23 postings ask for it (the user asked to learn it). Most LLM topics were not played by hand.

### Round 6 — Addy journey parts 2–3, lessons 11–19, bosses, capstone (complete, verified)
- [x] Fixed Academy level 4 (Memory Pack): the request now names all four facts the agent needs (trip, seat,
      meal, flyer account). Before, the flyer ID was a hidden requirement, so a careful player lost a star for
      something they could not have known. Test added. The remove button also got a 44px touch target.
- [x] Lessons 11–19: 27 levels (Learn / Apply / Master), 27 concepts, 54 questions
- [x] Bosses (`boss()` + `Games.case` + `Engine.caseQuestions`): "the refund agent" after lesson 10, "launch
      week" after lesson 14, and the capstone "design review" at the end. Each decision is tied to a concept
      from a different lesson, so boss answers also feed spaced review
- [x] Mix 4 after lesson 17; three more ranks (Agent Engineer, Principal, Grandmaster) for the larger XP total
- [x] 40 tests pass. Verified in the browser at 375px: boss 1 (with a miss), lesson 13 ordering, lesson 17
      cards, lesson 12 sort, the capstone to its result dialog, the 64-node trail; console clean
- Not played by hand: most of lessons 11–19. The content tests prove every one is winnable.

### Round 5 — Addy journey part 1, lessons 01–10 (complete, verified)
- [x] Course text: 19 lesson files + LICENSE downloaded once from `github.com/addyosmani/agent-engineer`
      (Apache 2.0) into `course/addy/md/`; `node tools/build-course.js` strips the embedded HTML/script widgets
      and writes `course/addy/NN.js`
- [x] `js/markdown.js` (pure, tested parser) + reader at `#/read/<no>` and course list at `#/course`; a lesson
      loads through one same-origin `<script>` tag, so the CSP is unchanged
- [x] Engine: `levelQuestions`, `quizStars`, `sortRight`, `orderRight`; 38 tests pass
- [x] Games: `learn.js` (cards with flow / stack / versus diagrams + check), `sort.js`, `order.js`, `Games.quiz`
- [x] Content: 33 levels (10 lessons × Learn / Apply / Master + 3 Mix levels), 30 concepts, 60 questions
- [x] Verified in the browser at 375px: journey trail, a Learn level, a sort, an order, a Master and a Mix level
      (including the failed-quiz retry), the course list, readers for lessons 01, 02 and 09, a bad reader URL;
      keyboard play through a Learn level; console clean
- [x] `CLAUDE.md` updated
- Not played by hand: lessons 02–10 beyond the ones above. The content tests prove every one is winnable.

### Round 4 — foundation: journeys, spaced review, rename (complete, verified)
- [x] `Content.JOURNEYS` (academy, field, addy, llm) + engine journey rules (`journeyOf`, `journeyOpen`,
      `journeyProgress`, `nextInJourney`, `isUnlocked` per journey)
- [x] Concept bank for the 8 academy levels: 16 concepts, 32 questions, each with a "why"
- [x] Spaced review in the engine (`state.review`, 1/3/7/21-day gaps, sanitizer branch); 33 tests pass
- [x] `js/games/recall.js`; hub at `#/map`, trails at `#/journey/<id>`, `#/review`, `#/arena`
- [x] Renamed to Axon (storage key unchanged so progress survives)
- [x] Verified in the browser: hub, both open journeys, daily review to its summary, Arena, Launch Day to the
      result dialog, Escape and Map return to the journey; no overflow at 375px; keyboard order; clean console
- [x] `CLAUDE.md` updated
- Not done in this round: the existing academy games still give feedback only through the coach line; richer
  "why" feedback inside those games and the Mix levels, part bosses and mastery map come with Rounds 5–8.

### Round 3 — bundled display font (complete, verified)
- [x] Sora variable woff2 (33 KB, SIL OFL) downloaded once from Fontsource via jsDelivr into `fonts/`, with licence
- [x] `@font-face` + `--display` in `css/styles.css`; CSP gained `font-src 'self'`; preload in `index.html`
- [x] Verified: font loads with no CSP error, no overflow at 375px, 26 tests pass
- [x] Re-verified after the session was cut off: Launch Day (builder, trials, blueprint tabs, result dialog) has no overflow at 375px; console clean

### Round 2 — real-world missions + Apple-style redesign (complete, verified)
- [x] `Content.MISSIONS` (7 missions) and `Content.TOOLBOX` in `js/content.js`
- [x] Engine: mission ids in state, unlock after `guard`, `checkSequence`, new ranks + badges; 26 tests pass
- [x] `js/games/mission.js`: order → tools → human gate
- [x] Map continues into "Field missions"; codex has Playbooks and Builder's toolbox
- [x] `css/styles.css` rewritten: dark glass, San Francisco display type, pill buttons, new mascot colours
- [x] Verified in the browser: all 7 missions played to the result dialog, clean console, no overflow at 375px
- [x] `CLAUDE.md` updated (task-list rule, missions, design rules)


### Round 1 — the academy (complete, verified)
- [x] Pure engine + content with unit tests (`npm test`)
- [x] App shell: storage, router, HUD, journey map, result dialog, codex
- [x] 8 levels: loop, tools, prompt, memory, pipeline, guard, trace, boss (+ blueprint export)
- [x] Security: strict CSP, no `innerHTML`, sanitized storage and name input
- [x] Independent code + security review; all findings fixed (skip link, cross-tab sync, focus, streak badge)
