# Ziki Agent Command Center

An interactive, high-fidelity prototype of a clearer human–agent operations surface for Ziki, built from a review of the live Dashboard and Settings → Agents pages.

The first version of this prototype had four routes and a lot of vocabulary. The feedback was that it was **too complicated to read**. This version answers two questions on one screen, in the words an owner would use:

- What are my agents doing, and what happens if I do nothing?
- Which single decision is mine right now?

Everything else — issue numbers, models, event chains, exact timestamps — is one click away on the issue page instead of on the surface.

> This is an independent design prototype. It uses illustrative mock data only. It is not connected to Ziki, contains no credentials, and makes no requests to Ziki APIs.

## The design

### 1. A written brief, not four stat cards

The page opens with three generated sentences: how many decisions are waiting and which one is most urgent, what shipped since you last opened the page, and what is running with its own delivery time. Numbers never appear without a verb attached.

> **6 decisions are waiting on you.** Bounty Hunter · #721 — Held 1h 30m past deliverBy.
> Reviewer **shipped 1 accepted fix** in the last 12 hours.
> **2 claims in progress:** #655 delivers in 22m, #662 delivers in 1h 36m.

The "since you last looked" window is real: the last visit is stored per browser, so returning to the app tells you what you missed.

### 2. Agents as orbs, not a table

Each agent is one circle. The ring around it drains as its nearest deadline approaches, the number badge is how many decisions it needs from you, and the word underneath is one of `needs you · working · available · paused`. Clicking an orb filters the whole board to that agent; **Manage** opens a compact panel with level, model, presence rules, lifetime stats, areas and pause/resume.

Presence and work stay separate concepts (an offline agent can still hold a claim), but they are explained in the panel rather than repeated in every row.

### 3. Three rails, one spine colour each

| Rail | Means | Card shows |
| --- | --- | --- |
| **Waiting on you** | Nothing moves until a human decides | the ask, one consequence sentence, one verb button |
| **In progress** | An agent owns it; no action needed | what it is doing now and when it delivers |
| **Shipped** | Done, merged or delivered | the outcome and whether it was accepted as a fix |

An issue appears once: if it needs a decision it lives only in **Waiting on you**, even when a claim exists for it.

### 4. One verb per decision

`question → Answer`, `offer → Accept`, `approval → Approve`, `stale claim → Extend`, `expired offer → Re-offer`. The secondary options (pass, decline, release) live on the issue page, where the rule that applies is quoted next to them. Every card states the consequence of waiting — "Releases #1149 in 3h 48m if unanswered", "Delivery stays blocked · window closes in 1h 5m" — instead of a countdown pill you have to interpret.

### 5. Drill-down, not scroll-past

`/issue/721` carries the full action card, the agent's identity and model, the applicable rule, and the claim's event chain with exact timestamps — the detail a developer wants, kept off the surface everyone else sees.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Today: the brief, the agent strip and the three rails |
| `/issue/[number]` | One issue: decision card, claim state, event chain, outcomes |

Deep links used by the UI: `/issue/721`, `/issue/1149#need-…`, `/#waiting`, `/#running`, `/#shipped`.

## Demo behaviour

State is seeded relative to the moment you first open the app, then persisted in `localStorage` under `ziki-agent-command-center:v1`. A 30-second tick keeps timers and presence honest. **Reset demo** in the footer clears local state and reseeds it. The last-visit timestamp lives under `ziki-agent-command-center:seen` and the theme under `ziki-agent-command-center:theme`.

The simulated rules mirror the live product:

- Offers expire 30 minutes after they are sent.
- Accepted claims carry a 15- or 60-minute delivery deadline.
- Heartbeats within 15 minutes are online; 15–60 minutes idle; over 60 minutes offline.
- Unanswered questions release a claim after 4 hours.

All actions (answer, accept, pass, approve, decline, release, extend, re-offer, pause/resume) run client-side and update the same shared state, so the brief, the orbs, the rails and the notification tray stay consistent.

## Theming

Dark is the default; the header toggle switches to light and the choice is remembered in `localStorage`. An inline script in `src/app/layout.tsx` applies the saved theme before first paint, so there is no flash and the `theme-color` meta stays in sync.

Every colour used by the UI is declared once in `src/app/globals.css` — the raw palette lives in `:root` and `[data-theme="light"]`, and Tailwind sees the same values through `@theme inline`. Components only reference tokens (`bg-zk-surface`, `text-zk-warn-fg`, `border-zk-bad-bd`), so a new theme is a palette change rather than a component rewrite.

## Stack

- Next.js 16 (App Router, static prerendering)
- React 19
- TypeScript
- Tailwind CSS 4 with project tokens in `src/app/globals.css`
- `lucide-react` icons
- `@fontsource-variable/inter`

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Other commands:

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
    page.tsx                 Today
    issue/[number]/page.tsx  issue drill-down (statically generated)
    globals.css              palette, tokens and component classes
    layout.tsx               theme pre-paint, shell, providers
  components/
    today-board.tsx          composes brief + strip + rails, owns the agent filter
    today-brief.tsx          the written summary
    agent-strip.tsx          orbs, filter and manage panel
    board-rail.tsx           one spine-coloured column
    work-card.tsx            one issue-level card
    deadline-ring.tsx        draining SVG ring
    issue-detail.tsx         drill-down view
    need-card.tsx            full action card with confirmations
    notifications.tsx        grouped feed tray
    app-shell.tsx            header, footer, skip link
    ui.tsx                   shared primitives
  lib/
    board.ts                 rails, cards, orbs and the generated brief sentences
    last-seen.ts             since-last-visit window
    demo-data.ts             seeded workspace and storage keys
    demo-actions.ts          state transitions and live reconciliation
    demo-store.tsx           client store, persistence and 30s tick
    demo-selectors.ts        derived queues and feed
    format.ts                durations, countdowns, dates
    theme.ts                 theme read/write and pre-paint init script
    types.ts                 domain model
```

## Accessibility and responsiveness

- Skip link, visible focus styles and reduced-motion support.
- Native `<dialog>` for destructive confirmations.
- Orbs expose `aria-pressed`, the manage panel exposes `aria-expanded`, rings are decorative (`aria-hidden`) because the consequence sentence carries the same information in words.
- Layouts checked at 390px and 1280px in both themes with no horizontal overflow; the agent strip scrolls horizontally on small screens.

## Scope and limitations

This repository is a design prototype, not a production integration. Data is local to the browser, there is no authentication, and "Ziki settings" references are informational. External issue links point at `ziki.dev` and require a real Ziki session.
