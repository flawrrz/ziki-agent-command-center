# Ziki Agent Command Center

An interactive, high-fidelity prototype of a human–agent operations surface for Ziki, built from a review of the live Dashboard and Settings → Agents pages.

Version two was a focus queue: one decision at reading size, ten one-line rows. It worked — until the workspace had a thousand issues. This version is the same surface tested at scale, with a different visual language.

**991 issues are tracked. Six of them need you. The page still answers "what do I do now" in one glance.**

> This is an independent design prototype. It uses illustrative mock data only. It is not connected to Ziki, contains no credentials, and makes no requests to Ziki APIs.

## The scale problem

A list is only a good list while it is short. At 991 issues the honest options are: aggregate, slice, or index. This board does all three, and never renders more than ~30 rows of any one state.

| Device | What it replaces | What it answers |
| --- | --- | --- |
| Ledger strip | a dashboard of cards | how bad is it, before reading a row |
| Bounded queues + "Show N more" | infinite scroll | what do I act on first |
| Checkpoint rails | status prose | how far did the agent actually get |
| Dot matrix ("the field") | a table of 991 rows | where is the backlog, as one shape |
| ⌘K / Ctrl K sheet | filters and facets | find any issue by number, title or agent |

### 1. Ledger

Seven hairline cells across the top — `NEEDS YOU 40 · PAST DUE 11 · RUNNING 98 · DELIVERED 296 · RELEASED 173 · NO AGENT 373 · ALL ISSUES 991` — each a link to the section that holds those rows. Every cell counts **issues**, never requests or claims, so the six state cells always sum to the seventh; `NEEDS YOU` is the number of issues waiting on a human, not the number of asks on them. The last cell is a denominator, not a state, which is why it reads **All issues** rather than *backlog* — "backlog" would collide with `NO AGENT` and claim delivered work as unfinished. The counts cover the whole corpus, not the slice on screen, and they come from the same one-per-issue selector that draws the field, so a number and its cells can never disagree.

### 2. Bounded queues

`Needs you` → `Agent working` → `Delivered`, capped at 6, 10 and 6 rows. "Show 30 more" grows a section by three caps and prints `10/109` so you always know the size of what you have not read. The most urgent need is drawn larger, as the focus card above the lists, and is still counted in `NEEDS YOU` and in its `7/40` — one set, one number. Rows are fixed columns: state marker, issue number, agent, a few words, checkpoint rail, clock, verb. An issue appears once; if it needs a decision it is only under **Needs you**.

### 3. Checkpoint rails

Progress is a shape, not a paragraph. Every claim renders four **numbered** cells — `1 claimed · 2 done · 3 ready · 4 merged` — one artifact each: a claim held, a draft on a branch, a diff under review, a fix landed. Passed cells are tinted and the cell the agent is actually on is solid. Numbering them is what makes them readable: four unlabelled rectangles ask the reader to decode a code, four digits answer on their own. The rail measures the **issue's** trip from claim to merged, so it draws on the shipped rows too: a delivered issue sits at `4 merged`, which says more than the tick it replaced at the same cost. The legend is stated once, in the `AGENT WORKING` header, rather than as a caption on 109 rows; each row adds a three-letter stage code (`CLM`, `DON`, `RDY`, `MRG`) at wide viewports and falls back to `2/4` below `sm`. In the drill-down the rail gains a readout — `CHECKPOINT 2/4 · DONE`, then the due date in plain time: `4h 51m left on the due date`, `36m past the due date`, or `landed 1h early` once the claim is closed. The old caption was `46% of window`: a share of a denominator nobody was asked to choose, so the meter keeps the share as a shape and the words give up the percentage. On a closed claim the meter freezes where the agent stopped rather than measuring from `now` — otherwise every delivered issue would read as a full window, which looks like a breach it did not commit. Screen readers get `Checkpoint 2 of 4 · Done` as the rail's own label.

The rail is derived only from events the agent actually reported (`Draft pushed`, `Review requested`, `Fix linked`), so it can never show progress that did not happen. An unrecognised event leaves the stage where it is. Pauses and breaches do not tint the rail — the deeper blue always means machine work, and the clock column carries the breach in red. The row's few words are generated from the same chain, so a claim at `CLM` cannot describe a patch that has not been written yet.

### 4. The field

One square per issue, banded by state, so ~1000 rows cost about 300px of height instead of 40,000. Bands are capped (60/60/140/140/140/120) and "Show every issue" lifts the caps. Every square is a link; its `title` carries `#1425 agent working · Sira · <issue title>`. History fades to grey; only the states you can act on are drawn at full strength.

### 5. Search

At this size the only usable index is a box. ⌘K on a Mac, Ctrl K elsewhere, or `/` opens a native `<dialog>` over the whole corpus — not the page — filterable by state, paged 40 at a time, arrow keys to move, enter to open. The header chip prints the shortcut the visitor's platform actually uses. The footer reads `18 matches · showing 18`, so the slice is never mistaken for the set.

## Visual language

Ziki's own blue palette — cool paper (`#f5f7fb`) by default, navy (`#070f22`) in dark mode — wearing a dispatch console's structure: hairline rules instead of heavy elevation, square avatars, tabular numerals for anything countable, and one hue per job.

| Colour | Job |
| --- | --- |
| Accent blue `#8fc9ff` dark / `#1f5fd8` light | a human decision is outstanding |
| Electric blue `#4f8dff` dark / azure `#0369a1` light | machine work in flight |
| Red | a clock has run past |
| Green | delivered |
| Slate grey | everything that is only history |

Type does the structuring: 10px uppercase labels at 0.16em tracking for column heads, 22px numerals in the ledger, 15px body. Radius is 6px and avatars are square. **Light is the default**; the header toggle switches to navy, and the choice is remembered under `ziki-agent-command-center:theme` and applied by an inline script before first paint, so there is no flash and the `theme-color` meta stays in sync.

Every colour is declared once in `src/app/globals.css` (`:root` holds dark, `[data-theme="light"]` overrides it) and reaches Tailwind through `@theme inline`, so components only reference tokens and a new theme is a palette change rather than a rewrite.

## Demo data

`src/lib/backlog.ts` mints the long tail with a seeded mulberry32 PRNG, so every machine and every reload sees the same 980 issues (#1300 up), 13 extra agents, 128 running, 296 completed and 172 released claims, plus 34 open needs. Determinism matters here: a design review cannot judge density if the density moves.

Three rules keep the prototype honest:

- **Needs are derived from claims.** A stale-claim, question or gate need always points at a real claim held by the same agent, so the drill-down can never contradict the board. Offers are the exception — an offer means no claim exists yet, so those sit on untouched issues.
- **A breach is built backwards.** For a past-due claim the due date is placed behind `now` and the window opens before it; for a healthy claim the due date is still ahead. Deriving both from `now - window` produced rows that said "past due" while their clock counted up.
- **The long tail never enters `localStorage`.** Issues are read from a module-level pool; only claims, needs, outcomes and the last 40 updates persist (~660KB for 600 claims). The feed caps its update list and indexes read notifications with a `Set`.

State is seeded relative to the moment you first open the app, under `ziki-agent-command-center:v1`. A 30-second tick keeps timers and presence honest; `DEMO_STATE_VERSION` reseeds returning visitors when the model changes. **Reset demo** in the footer clears and reseeds. Last-visit timestamp lives under `:seen`, theme under `:theme`.

Delivery windows are sized so the board ages at a readable rate: 90 minutes to 6 hours on critical issues, 5 hours to 2 days otherwise, and 1–6 hours for the claims already past due. A short window looks more dramatic for a screenshot but reads as noise in a live tab — at 15 minutes the board turns red every minute, so nobody finishes reading it. On a fresh seed about 40 issues need you and the median claim has roughly 9 hours left; leaving the tab open for 90 seconds moves the counts by nothing.

The simulated rules mirror the live product: offers expire after 30 minutes, heartbeats within 15 minutes read online (15–60 idle, over 60 offline), and unanswered questions release a claim after 4 hours. All actions (answer, accept, pass, approve, decline, release, extend, re-offer, pause/resume) run client-side against the same shared state, so the ledger, the queues, the field and the notification tray re-derive together.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: ledger, focus card, three bounded queues, the field |
| `/issue/[number]` | One issue: decision card, claim with checkpoint readout, event chain, neighbours |

The eleven hand-written issues prerender; the generated tail renders on demand. Prev/next links in the drill-down walk the field in the same order the grid draws it, so you can read the backlog without returning to the board.

## Stack

- Next.js 16 (App Router, static prerendering)
- React 19
- TypeScript
- Tailwind CSS 4 with project tokens in `src/app/globals.css`
- `lucide-react` icons
- `@fontsource-variable/inter`; numerals use the system mono stack

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run typecheck   # TypeScript, no emit
npm run build       # production build
npm start           # serve the production build
```

## Deploying to Vercel

The project is ready for Vercel's zero-config Next.js flow. There are no environment variables, databases or external services to configure.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected **Next.js** framework preset, root directory and defaults.
4. Deploy. Vercel runs `npm run build`.

A `.nvmrc` pins Node 22. To deploy from the CLI instead:

```bash
npx vercel
npx vercel --prod
```

No `vercel.json` is required.

## Project structure

```text
src/
  app/
    page.tsx                 the dashboard
    issue/[number]/page.tsx  issue drill-down
    globals.css              palette, tokens and component classes
    layout.tsx               theme pre-paint, shell, providers
  components/
    today-board.tsx          masthead, ledger, bounded sections
    ledger.tsx               seven whole-corpus counts, each a jump link
    focus-card.tsx           the one decision, at reading size, with its verbs
    queue-row.tsx            one line: marker, number, agent, words, rail, clock
    checkpoint-rail.tsx      numbered rail and its drill-down readout
    issue-field.tsx          dot matrix, one cell per issue
    filter-sheet.tsx         ⌘K / "/" search over the whole corpus
    issue-detail.tsx         drill-down view with neighbour navigation
    need-card.tsx            full action card with confirmations
    notifications.tsx        grouped feed tray
    app-shell.tsx            header, search trigger, footer, skip link
    theme-toggle.tsx         light/dark switch
    toaster.tsx              action feedback
    ui.tsx                   shared primitives
  lib/
    backlog.ts               deterministic 980-issue tail, agents and claims
    progress.ts              checkpoint model, window consumption, stall
    board.ts                 rails, row labels, field cells, whole-backlog counts
    need-copy.ts             confirmation copy, shared by card and drill-down
    last-seen.ts             since-last-visit window
    demo-data.ts             hand-written workspace and storage keys
    demo-actions.ts          state transitions and live reconciliation
    demo-store.tsx           client store, persistence and 30s tick
    demo-selectors.ts        derived queues and feed
    format.ts                durations, countdowns, dates
    theme.ts                 theme read/write and pre-paint init script
    types.ts                 domain model
```

## Accessibility and responsiveness

- Skip link, visible focus styles, and `prefers-reduced-motion` support that drops the cell hover scale. There is no ambient animation; the rails and the field are static shapes.
- Native `<dialog>` for search and for destructive confirmations; `aria-label`s carry the cell and rail state as text — a rail announces `Checkpoint 2 of 4 · Done` — so colour is never the only channel.
- Each row is a single link, so the whole line is one tab stop and one tap target; clocks are real text.
- Checked at 390px and 1440px in both themes with no horizontal overflow: the ledger collapses to two columns, the numbered rail swaps to a `2/4` figure below `sm` and drops its stage code below `xl`, the search box becomes an icon button, and the field rewraps to ~13 columns per band.

## Scope and limitations

This repository is a design prototype, not a production integration. Data is local to the browser, there is no authentication, and "Ziki settings" references are informational. External issue links point at `ziki.dev` and require a real Ziki session.
