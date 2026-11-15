# Axon

Learn how AI agents work, and how to design, build and tune one, by playing. Axon is a hands-on course
with almost no reading: 169 short levels across five journeys, and a spaced-review layer that brings
every idea back until it sticks.

It runs entirely in the browser. There is no build step, no dependency, no account and no network call;
progress is saved in the browser's `localStorage`.

## Run it

You need Python 3 (to serve the files) and Node.js 18 or later (only for the tests).

```bash
npm start
```

Then open <http://127.0.0.1:4173>.

```bash
npm test
```

## What is in it

| Journey | Levels | What it teaches |
|---|---|---|
| Academy | 8 | The agent loop, tools, system prompts, memory, pipelines, guardrails, debugging, and designing your own agent |
| Field missions | 7 | Seven real-world pipelines (video, incident response, coding, research, support, data) and popular tools for each stage |
| Addy journey | 68 | All 19 lessons of Addy Osmani's "Agent Engineer" course as key cards, puzzles, labs, bosses and a full-read mode |
| LLM journey | 56 | Tokens, prompting, RAG, fine-tuning, the harness, evals and shipping, weighted by a tally of real job postings |
| Python + cloud journey | 30 | The Python an agent is written in and the cloud it runs on: APIs, tools, containers, deployment, pipelines |

Start with the Academy. Field missions open once the Academy's guardrails level is finished.

### Kinds of level

- **Learn**: three to five key cards with a diagram each, then one question per idea
- **Apply**: a puzzle, either sorting cards into buckets or putting steps in order
- **Master** and **Mix**: questions on the current topic mixed with earlier ones
- **Lab**: choose a design, run the agent, read the trace, fix what broke
- **Debug**: tap the first wrong step of a broken run, then pick the repair
- **Boss**: one scenario that needs several lessons at once

### Review

Every finished level adds its ideas to a bank of 166 concepts and 332 questions, each with a "why" shown
after the answer.

- **Daily review** asks what is due, weakest first. A right answer waits 1, 3, 7, then 21 days; a wrong
  one comes back tomorrow.
- **Arena** is a random, untimed mix of everything learned.
- **Blitz** is the Arena against a 60-second clock, with a best score.
- The **codex** shows a mastery map, saved playbooks, the toolbox, and the job-posting tally with its
  sources.

## How it is built

Plain HTML, CSS and JavaScript, loaded as ordinary script files.

| Path | Role |
|---|---|
| `index.html` | Shell, Content-Security-Policy, script order |
| `css/styles.css` | All styles, with design tokens at the top |
| `js/content.js` | All lesson data: levels, puzzles, questions. No logic |
| `js/engine.js` | All rules: scoring, progress, review schedule, input sanitising. Pure, no DOM |
| `js/ui.js`, `js/app.js` | DOM builder, router, hub, level frame, codex |
| `js/games/` | One file per game type |
| `js/markdown.js` | Markdown parser for the full-read mode; returns data, never HTML |
| `course/addy/` | The bundled course text, its licence and a note on what was changed |
| `tests/engine.test.js` | Engine and content-integrity tests |
| `tools/` | A play-through script for the browser console and the course-text build script |

A few choices worth knowing:

- **Strict security.** The CSP allows only same-origin scripts, styles and fonts. The code never uses
  `innerHTML` or `eval`; all DOM is built through one helper. Everything read from `localStorage` is
  sanitised before use.
- **Content is tested.** The tests prove that every puzzle is winnable, every lab has exactly one
  winning design, every concept has at least two questions, and the right answer cannot be guessed
  from its length.
- **Accessible by design.** Every control is a real button or link at least 44px tall with a visible
  focus ring, state is never shown by colour alone, and reduced-motion settings are respected. It has
  been checked with the keyboard and at 375px wide, but not with a screen reader.

`CLAUDE.md` holds the full rules for changing the code, and `TASKS.md` the history of what was built
and what was left unverified.

## Sources and limits

- **Addy journey.** Based on Addy Osmani's
  [Agent Engineer](https://github.com/addyosmani/agent-engineer) course (Apache 2.0). The cards and
  questions are written in this app's own words; the lesson text appears only in the reader, with
  credit and a link to the original. See `course/addy/README.md` and `course/addy/LICENSE.txt`.
- **Job-posting tally.** 23 postings for agent and applied-AI engineer roles, reviewed on 2026-11-15.
  The sample is small, mostly senior and mostly US.
- **Tool names.** Checked against each product's own site on 2026-11-15. "Popular" was not measured,
  and product names go out of date; the codex shows the review date.
- **LLM and Python + cloud journeys.** Written from general, established practice at beginner level,
  not from a source text. The Python + cloud journey names no individual cloud products.
- **Review of the content.** Questions and labs were checked by tests and, in part, by a second model
  reader. No subject expert has reviewed them.

## Licences

- IBM Plex Mono and Inter are bundled under the SIL Open Font License (`fonts/IBM-PLEX-LICENSE.txt`,
  `fonts/INTER-LICENSE.txt`).
- The course text in `course/addy/` is under Apache 2.0 (`course/addy/LICENSE.txt`).
- The project's own code and content have no licence file yet.
