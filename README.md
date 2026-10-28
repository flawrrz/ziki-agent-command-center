# Ziki Agent Command Center

An interactive, high-fidelity prototype of a clearer human–agent operations surface for Ziki. It was built from a review of the live Dashboard and Settings → Agents pages, with the goal of making two questions answerable at a glance:

- What have my agents done?
- What still needs a human decision?

The prototype keeps Ziki's visual language — dark navy surfaces, electric-blue actions, Inter, pill tabs and cards — while restructuring the information around **presence, current work and attention** instead of mixing them together.

> This is an independent design prototype. It uses illustrative mock data only. It is not connected to Ziki, contains no credentials, and makes no requests to Ziki APIs.

## What was implemented

### P0 — trust and clarity

| Review finding | Prototype response | Where |
| --- | --- | --- |
| Requests were scattered across the dashboard, agents and notifications | One canonical **Needs you** queue for questions, offers, approvals and stale claims, ordered by deadline | `/needs-you` |
| Presence, current work and blocked work were conflated | Each agent now shows **Presence**, **Work** and **Attention** as separate columns, with copy explaining why an offline agent can still hold a claim | `/agents`, dashboard |
| The dashboard was issue-first, not agent-first | Dashboard leads with a **Needs you** summary, overdue-claim banner, an agent operations table and the nearest deadlines | `/` |
| The settings agent list was an admin card, not an operations view | Agents page is a roster with real state: online count, workload, attention, role coverage and a workspace cap | `/agents` |
| Work history duplicated the same claim many times | **Activity** shows one row per claim; repeated heartbeats, reminders and re-offers stay collapsed into that row, with an expandable event chain | `/activity` |
| Request cards did not say what happens if you wait | Every card carries the consequence, the applicable rule and a live timer | `/needs-you`, `/activity` |
| Links to a request or agent were unreliable | Stable anchors (`/needs-you#need-…`, `/agents#agent-…`) and an issue filter (`/activity?issue=721`) that survives reloads | all routes |
| Approvals looked like dead ends | Approval cards expose **Approve gate** / **Decline** and link back to the issue | `/needs-you` |

### P1 — operating the team

- **Capped Create agent** — the workspace shows `5 / 5`, the action is disabled, and the limit is explained instead of failing silently.
- **Visible resolved history** — delivered outcomes appear on the dashboard and in Activity, deduplicated against active claims.
- **Action-first notifications** — grouped by issue, each group links to its canonical request; unread counts and mark-all-read are wired up.
- **Live timers and state transitions** — offers expire after 30 minutes, accepted claims can become overdue while still held, and stale heartbeats reconcile presence.
- **No decorative controls** — buttons that cannot act in this demo are either explained or omitted.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Agent-first dashboard: attention summary, overdue banner, agent roster, nearest deadlines, latest outcomes |
| `/needs-you` | Canonical queue with filters, live timers, action cards and expired offers |
| `/agents` | Operations page: presence, current work, attention, role coverage, pause/resume, 5-agent cap |
| `/activity` | Searchable work history: waiting-on-you strip, one row per claim, event chains, delivered outcomes |

Deep links that are used by the UI and safe to share:

- `/needs-you#need-{id}`
- `/agents#agent-{id}`
- `/activity?issue=721`

## Demo behaviour

State is seeded relative to the moment you first open the app, then persisted in `localStorage` under `ziki-agent-command-center:v1`. A 30-second tick keeps timers and presence honest. **Reset demo** in the footer clears local state and reseeds it.

The simulated rules mirror the live product:

- Offers expire 30 minutes after they are sent.
- Accepted claims carry a 15- or 60-minute delivery deadline.
- Heartbeats within 15 minutes are online; 15–60 minutes idle; over 60 minutes offline.
- Unanswered questions release a claim after 4 hours.
- A workspace may hold at most 5 agents.

All actions (accept, pass, approve, decline, answer, release, extend, re-offer, pause/resume, re-offer expired offers) run client-side and update the same shared state, so counts, cards, tables and notifications stay consistent.

## Theming

Dark is the default; the header toggle switches to light and the choice is remembered in `localStorage` under `ziki-agent-command-center:theme`. An inline script in `src/app/layout.tsx` applies the saved theme before first paint, so there is no flash and the `theme-color` meta stays in sync.

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
  app/                 routes and global styles
    page.tsx           dashboard
    needs-you/         canonical queue
    agents/            operations page
    activity/          work history
  components/          agent, request, activity and shell components
  lib/
    demo-data.ts       seeded workspace and storage key
    demo-actions.ts    state transitions and live reconciliation
    demo-store.tsx     client store, persistence and 30s tick
    demo-selectors.ts  derived queues and feed
    theme.ts           theme read/write and pre-paint init script
    types.ts           domain model
```

## Accessibility and responsiveness

- Skip link, visible focus styles and reduced-motion support.
- Native `<dialog>` for destructive confirmations.
- Accessible tab lists for filters, labelled search and timer text.
- Keyboard-operable actions with screen-reader labels.
- Mobile bottom navigation; layouts checked at 390px, 768px and 1280px with no horizontal overflow.

## Scope and limitations

This repository is a design prototype, not a production integration. Data is local to the browser, there is no authentication, and "Ziki settings" references are informational. External issue links point at `ziki.dev` and require a real Ziki session. The Create agent flow is intentionally capped at 5/5 to demonstrate the guardrail; it is not a full agent-creation wizard.
