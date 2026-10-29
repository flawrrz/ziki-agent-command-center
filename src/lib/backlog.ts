import type {
  Agent,
  Claim,
  ClaimEvent,
  Issue,
  IssuePriority,
  NeedItem,
  Outcome,
  WorkspaceUpdate,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Deterministic PRNG so the backlog is identical on every load and every machine. */
function rng(seed: number) {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURFACES = [
  "Agent inbox",
  "Claim clock",
  "Dispatch queue",
  "Activity feed",
  "Presence",
  "Audit log",
  "Pipeline gate",
  "Offer window",
  "Sync",
  "Billing",
  "Search",
  "Notifications",
  "Thread view",
  "Role chips",
  "Offline queue",
  "Credits",
  "Heartbeats",
  "Review lane",
  "Triage rules",
  "Work history",
];

const SYMPTOMS = [
  "stalls on",
  "flickers during",
  "resets after",
  "duplicates",
  "ignores",
  "drops",
  "reorders",
  "freezes on",
  "mislabels",
  "hides",
  "desyncs",
  "times out on",
  "double-counts",
  "renders the stale",
  "keeps the old",
];

const OBJECTS = [
  "the credit balance",
  "the retry loop",
  "a released claim",
  "the empty state",
  "pending offers",
  "the delivery deadline",
  "owner reminders",
  "the heartbeat timer",
  "accepted fixes",
  "the project switch",
  "reviewer assignments",
  "the re-offer cycle",
  "unread counts",
  "the presence dot",
  "gate approvals",
];

const QUALIFIERS = [
  "on cold start",
  "after a project switch",
  "when the tab regains focus",
  "under a 401 retry",
  "with 200+ rows",
  "on the first heartbeat",
  "while offline",
  "on narrow screens",
  "during a re-offer",
  "after release",
  "when paused",
  "on the free tier",
];

const PREFIXES = ["", "", "", "[Bug] ", "Fix: ", "Perf: ", "A11y: ", "Copy: ", "Edge case: "];

const AGENT_NAMES = [
  "Atlas",
  "Meridian",
  "Cobalt",
  "Vesper",
  "Rook",
  "Nomad",
  "Kestrel",
  "Lodestar",
  "Tessera",
  "Quill",
  "Beacon",
  "Sable",
  "Cinder",
];

const MODELS = [
  "Claude Sonnet 4.5",
  "Claude Opus 4.1",
  "GPT-5.2",
  "Gemini 2.5 Pro",
  "DeepSeek V3",
];

const LEVELS: Agent["level"][] = [
  "contributor",
  "contributor",
  "reviewer",
  "triager",
  "merger",
];

/** Numbers above every hand-written issue, so the two sets never collide. */
const FIRST_NUMBER = 1300;

const COUNTS = {
  issues: 980,
  needs: 34,
  running: 128,
  completed: 296,
  released: 172,
} as const;

export const BACKLOG_SIZE = COUNTS.issues;

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)];
}

function titleFor(random: () => number): string {
  const surface = pick(random, SURFACES);
  const symptom = pick(random, SYMPTOMS);
  const object = pick(random, OBJECTS);
  const qualifier = random() < 0.55 ? ` ${pick(random, QUALIFIERS)}` : "";

  return `${pick(random, PREFIXES)}${surface}: ${symptom} ${object}${qualifier}`;
}

function priorityFor(random: () => number): IssuePriority {
  const roll = random();

  if (roll < 0.45) return "Low";
  if (roll < 0.8) return "Medium";
  if (roll < 0.95) return "High";

  return "Critical";
}

function makeIssues(random: () => number): Issue[] {
  const seen = new Set<string>();

  return Array.from({ length: COUNTS.issues }, (_, index) => {
    let title = titleFor(random);
    while (seen.has(title)) title = titleFor(random);
    seen.add(title);

    return {
      number: FIRST_NUMBER + index,
      title,
      priority: priorityFor(random),
      project: "Zedu",
      url: `https://ziki.dev/issues/${FIRST_NUMBER + index}`,
    };
  });
}

function makeAgents(now: number, random: () => number): Agent[] {
  return AGENT_NAMES.map((name, index) => {
    const offline = random() < 0.3;

    return {
      id: `agent-${name.toLowerCase()}`,
      name,
      level: pick(random, LEVELS),
      model: pick(random, MODELS),
      owner: "Fawaz Yusuff",
      paused: index === AGENT_NAMES.length - 1,
      presence: offline ? "offline" : random() < 0.5 ? "online" : "idle",
      lastHeartbeat: offline
        ? now - (2 + Math.floor(random() * 40)) * HOUR
        : now - Math.floor(random() * 14) * MINUTE,
      lastAction: { label: "Idle", at: now - Math.floor(random() * 6) * HOUR },
      stats: {
        acceptedFixes: Math.floor(random() * 40),
        reviews: Math.floor(random() * 120),
        releases: Math.floor(random() * 12),
      },
      areas: [pick(random, SURFACES), pick(random, SURFACES)],
    };
  });
}

/**
 * Event chains are built from the same canonical labels `progress.ts` reads, so
 * a generated claim lands on a real checkpoint instead of a made-up one.
 */
function chainFor(stage: number, start: number, cap: number): ClaimEvent[] {
  const steps: [string, string][] = [
    ["Bid awarded", "Dispatch ranked 4 eligible agents."],
    ["Offer accepted", "Delivery window started."],
    ["Heartbeat sent", "Agent reported progress to the claim clock."],
    ["Draft pushed", "Branch opened with a work-in-progress fix."],
    ["Review requested", "Independent review queued for the diff."],
    ["Fix linked", "A pull request is now linked to the issue."],
  ];

  const span = Math.max(MINUTE, cap - start);

  return steps.slice(0, stage).map(([label, detail], index) => ({
    at: Math.round(start + (span * (index + 1)) / Math.max(1, stage)),
    label,
    detail,
  }));
}

/**
 * Chain length → checkpoint the rail lights up → the work still open at that
 * point: 2–3 is Claimed, 4 (draft pushed) is Done, 5 (review requested) is
 * Ready. Keyed by chain length so a row's words can't name work its rail
 * already shows as done.
 */
const CLAIMED_WORK = [
  "Reading the issue",
  "Reproducing the report",
  "Running the test suite",
];

const WORK_BY_STAGE: Record<number, string[]> = {
  2: CLAIMED_WORK,
  3: CLAIMED_WORK,
  4: ["Writing the patch", "Testing the draft branch"],
  5: ["Awaiting independent review", "Answering review notes"],
};

function buildClaims(
  issues: Issue[],
  agents: Agent[],
  now: number,
  random: () => number,
): Claim[] {
  const claims: Claim[] = [];
  let cursor = 0;
  const take = () => issues[cursor++];

  for (let i = 0; i < COUNTS.running; i += 1) {
    const issue = take();
    if (!issue) break;

    const agent = pick(random, agents);
    const stage = 2 + Math.floor(random() * 4);
    const late = random() < 0.14;
    /* Healthy windows run from an hour and a half to two days. A 15-minute window
       means an untouched tab files a new request every minute and the board turns
       red before anyone has read it. Breaches stay short — nobody holds a two-day
       claim and calls it twenty minutes late. */
    const windowMinutes = late
      ? 60 + Math.floor(random() * 300)
      : issue.priority === "Critical"
        ? 90 + Math.floor(random() * 270)
        : 300 + Math.floor(random() * 2580);
    const window = windowMinutes * MINUTE;
    /* A breach's due date sits behind `now` and its window opens before that
       date; a healthy claim's due date is still ahead. Getting this backwards
       makes the row say "overdue" while its clock counts up. */
    let deadline;
    let acceptedAt;

    if (late) {
      deadline = now - (Math.floor(random() * 5 * HOUR) + 12 * MINUTE);
      acceptedAt = deadline - Math.floor(window * (0.3 + random() * 0.6));
    } else {
      acceptedAt = now - Math.floor(random() * window * 0.9);
      deadline = acceptedAt + window;
    }

    /* The rail reads the event chain, so the words have to agree with it. A label
       picked at random put "Writing the patch" on rows whose chain never reached
       the draft cell. */
    const work = pick(random, WORK_BY_STAGE[stage]);

    claims.push({
      id: `claim-${issue.number}`,
      agentId: agent.id,
      issue,
      status: late ? "overdue" : random() < 0.12 ? "paused" : "active",
      /* The clock column carries the breach, so the label stays the work. */
      latestLabel: work,
      updatedAt: now - Math.floor(random() * 30) * MINUTE,
      deadline,
      lastHeartbeat: now - Math.floor(random() * 50) * MINUTE,
      nextStep: late
        ? "Release the claim or extend by 60 minutes"
        : "Link a fix before the due date",
      nextStepTone: late ? "bad" : "info",
      /* A breach means the agent went quiet, so its evidence stops at the due
         date rather than continuing past it. */
      events: chainFor(stage, acceptedAt, late ? deadline - MINUTE : now - MINUTE),
    });
  }

  for (let i = 0; i < COUNTS.completed; i += 1) {
    const issue = take();
    if (!issue) break;

    const agent = pick(random, agents);
    const at = now - Math.floor(random() * 21 * DAY) - 2 * HOUR;

    claims.push({
      id: `claim-${issue.number}`,
      agentId: agent.id,
      issue,
      status: "completed",
      latestLabel: "Delivered · fix linked",
      updatedAt: at,
      deadline: at + 60 * MINUTE,
      lastHeartbeat: at,
      nextStep: "Nothing further is expected from this claim",
      nextStepTone: "ok",
      events: chainFor(6, at - 70 * MINUTE, at),
    });
  }

  for (let i = 0; i < COUNTS.released; i += 1) {
    const issue = take();
    if (!issue) break;

    const agent = pick(random, agents);
    const at = now - Math.floor(random() * 26 * DAY) - 3 * HOUR;

    claims.push({
      id: `claim-${issue.number}`,
      agentId: agent.id,
      issue,
      status: "released",
      latestLabel: "Claim released at deadline",
      updatedAt: at,
      deadline: at,
      lastHeartbeat: at - 20 * MINUTE,
      nextStep: "The issue is back in the dispatch queue",
      nextStepTone: "neutral",
      releaseReason: "deadline",
      events: chainFor(2 + Math.floor(random() * 3), at - 80 * MINUTE, at),
    });
  }

  return claims;
}

const NEED_RULES: Record<NeedItem["kind"], string> = {
  question:
    "Questions pause the claim clock. Ziki reminds the owner after 30 minutes and releases the claim after 4 hours unanswered.",
  offer:
    "Offers expire after 30 minutes and only one offer can be pending at a time. Person-level limits are 2 active claims.",
  approval:
    "Production gates block the merge until a workspace owner decides. The decision is attributed to you.",
  claim:
    "Heartbeats keep a claim alive but do not move the due date. A claim past its due date with no linked fix is released and re-offered.",
};

/**
 * Needs are derived from claims, never invented on top of an unrelated issue: a
 * need for a running claim must point at that claim and its agent, otherwise the
 * drill-down contradicts the board. Offers are the exception — an offer means no
 * claim exists yet, so those point at issues no agent has taken.
 */
function buildNeeds(
  claims: Claim[],
  unclaimed: Issue[],
  agents: Agent[],
  now: number,
  random: () => number,
): NeedItem[] {
  const kinds: NeedItem["kind"][] = [
    "question",
    "offer",
    "question",
    "approval",
    "offer",
    "claim",
    "question",
    "offer",
  ];

  const breached = claims.filter((claim) => claim.status === "overdue");
  const working = claims.filter(
    (claim) => claim.status === "active" || claim.status === "paused",
  );

  let breachAt = 0;
  let workAt = 0;
  let idleAt = 0;

  return Array.from({ length: COUNTS.needs }, (_, index) => {
    const kind = kinds[index % kinds.length];
    const claim =
      kind === "offer"
        ? null
        : kind === "claim"
          ? breached[breachAt++ % breached.length]
          : working[workAt++ % working.length];
    const issue = claim ? claim.issue : unclaimed[idleAt++];
    const agent =
      agents.find((candidate) => candidate.id === claim?.agentId) ??
      pick(random, agents);
    const age = Math.floor(random() * 5 * HOUR) + 2 * MINUTE;
    const createdAt = now - age;

    const base = {
      id: `need-gen-${issue.number}`,
      kind,
      agentId: agent.id,
      issue,
      status: "open" as const,
      createdAt,
      rule: NEED_RULES[kind],
      context: [
        `${issue.priority} priority`,
        `${agent.name} · ${agent.model}`,
        kind === "offer"
          ? "Lightest workload among eligible agents"
          : claim?.status === "paused"
            ? "Clock is paused"
            : claim?.deadline && claim.deadline < now
              ? "Clock has run past the due date"
              : "Claim clock is running",
      ],
    };

    if (kind === "offer") {
      return {
        ...base,
        title: `Offer waiting: ${agent.name} can take #${issue.number}`,
        detail: `The 30-minute offer window is open. Accepting sets a due date; passing re-offers the issue to the next eligible agent.`,
        expiresAt: createdAt + 30 * MINUTE,
      };
    }

    if (kind === "approval") {
      return {
        ...base,
        title: `Production gate needs approval for #${issue.number}`,
        detail: `The pipeline stopped at the production gate. Delivery stays blocked until a workspace owner decides.`,
        expiresAt: createdAt + 3 * HOUR,
      };
    }

    if (kind === "claim") {
      return {
        ...base,
        title: `Deadline passed, but ${agent.name} still holds #${issue.number}`,
        detail:
          "The due date passed while heartbeats had stopped, yet the claim was never released and the issue cannot be re-offered.",
        claimReleaseAt: createdAt + 4 * HOUR,
      };
    }

    return {
      ...base,
      title: `${agent.name} needs a decision on #${issue.number}`,
      detail: `“Should this take the existing component, or a new variant?” The claim clock is paused until you answer.`,
      claimReleaseAt: random() < 0.4 ? undefined : createdAt + 4 * HOUR,
    };
  });
}

function buildOutcomes(
  claims: Claim[],
  now: number,
  random: () => number,
): Outcome[] {
  return claims
    .filter((claim) => claim.status === "completed")
    .map((claim) => ({
      id: `outcome-${claim.issue.number}`,
      agentId: claim.agentId,
      issue: claim.issue,
      label: pick(random, [
        "Accepted fix delivered",
        "Patch merged after review",
        "Docs updated and shipped",
        "Fix delivered on the first try",
      ]),
      at: claim.updatedAt,
      acceptedFix: true,
    }));
}

function buildUpdates(
  claims: Claim[],
  agents: Agent[],
  now: number,
  random: () => number,
): WorkspaceUpdate[] {
  const recent = [...claims]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 40);

  return recent.map((claim) => {
    const agent = agents.find((candidate) => candidate.id === claim.agentId);

    return {
      id: `upd-${claim.issue.number}`,
      issue: claim.issue,
      actorName: agent?.name ?? "Agent",
      actorRole: agent ? "Contributor" : "Agent",
      ownerName: "Fawaz Yusuff",
      title: claim.latestLabel.split(" · ")[0],
      detail: claim.nextStep,
      at: claim.updatedAt,
    };
  });
}

export type Backlog = {
  agents: Agent[];
  issues: Issue[];
  claims: Claim[];
  needs: NeedItem[];
  outcomes: Outcome[];
  updates: WorkspaceUpdate[];
};

/**
 * The long tail is read from here rather than stored in demo state: it is
 * deterministic, never mutated by owner actions, and keeping it out of
 * localStorage avoids serialising ~1000 issue objects on every tick.
 */
export const BACKLOG_ISSUES: Issue[] = makeIssues(rng(0x5eed1f));

/** Extra agents, issues and history so the surface is tested at real scale. */
export function buildBacklog(now: number): Backlog {
  const random = rng(0x2b11af);
  const issues = BACKLOG_ISSUES;
  const agents = makeAgents(now, random);
  const claims = buildClaims(issues, agents, now, random);
  const claimed = new Set(claims.map((claim) => claim.issue.number));
  const needs = buildNeeds(
    claims,
    issues.filter((issue) => !claimed.has(issue.number)),
    agents,
    now,
    random,
  );
  const outcomes = buildOutcomes(claims, now, random);
  const updates = buildUpdates(claims, agents, now, random);

  return { agents, issues, claims, needs, outcomes, updates };
}
