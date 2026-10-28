# Ziki Agent Command Center

An interactive, high-fidelity prototype of a clearer human–agent operations surface for Ziki, built from a review of the live Dashboard and Settings → Agents pages.

The first version had four routes and a lot of vocabulary. The second had a written brief, agent orbs and three rails. Both were judged **too busy**: too much text, and unclear what to do first.

This version is a **focus queue**. One decision is put in front of you at reading size; every other item is a single line with a clock. There is nothing to filter, expand or interpret.

- **What is mine right now?** The card at the top, with one countdown and one or two verbs.
- **What else is going on?** Ten one-line rows. Issue number, a few words, time left.

Everything else — the consequence sentences, the applicable rule, the event chain, models and exact timestamps — is on the issue page, one click away.

> This is an independent design prototype. It uses illustrative mock data only. It is not connected to Ziki, contains no credentials, and makes no requests to Ziki APIs.

## The design

### 1. One focus card

The most urgent waiting item is the only thing on the page rendered at reading size: the kind of ask, its priority, a full-sentence title, and a **30px+ countdown** with the unit written next to it (`1h 35m past deliverBy`, `12m left before the offer lapses`). Below it sit the verbs that actually resolve it — `Answer`, or `Accept offer` / `Pass`, or `Approve gate` / `Decline`, or `Release claim` / `Extend 60m` — plus a quiet **Open in Ziki**. Destructive verbs confirm first.

The title is the whole promise: the detail sentence, the rule and the event chain are deliberately *not* on the surface.

### 2. One line per remaining item

Everything else is a `QueueRow`: avatar, issue number, a few words, a draining ring, a clock.

| Column | Example |
| --- | --- |
| who | 22px agent avatar with a presence dot |
| where | `#640`, tinted when the priority is High or Critical |
| what | `offer open` · `needs your answer` · `Writing the patch` · `Claim released at deadline` |
| how long | ring + `59m`, `3h 42m`, `17m over`, or `2h ago` once shipped |

The entire row is one link to the issue page, so there are no nested controls to miss. When you have items you have not seen before this visit, the row carries a small accent dot; the last-visit timestamp is stored per browser, so returning shows what arrived since.

### 3. Three groups, no filters

`Need you` → `Running` → `Shipped`, each headed by a coloured dot and a count. An issue appears once: if it needs a decision it is only under **Need you**, even when a claim exists for it. There is no agent filter, no manage panel and no selection state to explain — the agent's own page is one click away.

### 4. Copy budget: title and clock only

Board rows carry a few words. Sentences live on the drill-down. The consequence of waiting is expressed by the countdown's unit rather than a paragraph, and the same short label is reused in the confirmation dialog so the two never drift.

### 5. Drill-down

`/issue/721` carries the decision card in full, the agent's identity, the applicable rule, and the claim's event chain with exact timestamps — the detail a developer wants, kept off the surface everyone else sees.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Today: the focus card and the queue |
| `/issue/[number]` | One issue: full decision card, claim state, event chain, outcomes |

Deep links used by the UI: `/issue/721`, `/issue/1149#need-…`, `/#need`, `/#running`, `/#shipped`.

## Demo behaviour

State is seeded relative to the moment you first open the app, then persisted in `localStorage` under `ziki-agent-command-center:v1`. A 30-second tick keeps timers and presence honest. **Reset demo** in the footer clears local state and reseeds it. The last-visit timestamp lives under `ziki-agent-command-center:seen` and the theme under `ziki-agent-command-center:theme`.

The simulated rules mirror the live product:

- Offers expire 30 minutes after they are sent.
- Accepted claims carry a 15- or 60-minute delivery deadline.
- Heartbeats within 15 minutes are online; 15–60 minutes idle; over 60 minutes offline.
- Unanswered questions release a claim after 4 hours.

All actions (answer, accept, pass, approve, decline, release, extend, re-offer, pause/resume) run client-side and update the same shared state, so the focus card, the queue and the notification tray stay consistent.

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
    today-board.tsx          header, focus card and the three groups
    focus-card.tsx           the one decision, at reading size, with its verbs
    queue-row.tsx            one-line row: avatar, issue, label, ring, clock
    deadline-ring.tsx        draining SVG ring
    issue-detail.tsx         drill-down view
    need-card.tsx            full action card with confirmations
    notifications.tsx        grouped feed tray
    app-shell.tsx            header, footer, skip link
    theme-toggle.tsx         light/dark switch
    toaster.tsx              action feedback
    ui.tsx                   shared primitives
  lib/
    board.ts                 groups, row labels, card tones and windows
    need-copy.ts             confirmation copy, shared by card and drill-down
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

- Skip link, visible focus styles and reduced-motion support. There is no ambient animation by design; the only moving element is the countdown ring, and it is decorative.
- Native `<dialog>` for destructive confirmations.
- Each row is a single link, so the whole line is one tab stop and one tap target; the clock is real text, not colour alone.
- Layouts checked at 390px and 1280px in both themes with no horizontal overflow or wrapped clocks; row verbs drop below the `sm` breakpoint so labels stay readable on phones.

## Scope and limitations

This repository is a design prototype, not a production integration. Data is local to the browser, there is no authentication, and "Ziki settings" references are informational. External issue links point at `ziki.dev` and require a real Ziki session.
