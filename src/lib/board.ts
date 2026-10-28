import { formatDuration, pluralize } from "./format";
import { sortOpenNeeds } from "./demo-selectors";
import type {
  Agent,
  Claim,
  DemoState,
  Issue,
  NeedItem,
  Outcome,
} from "./types";

export type Rail = "waiting" | "running" | "shipped";

export type BoardCard = {
  key: string;
  rail: Rail;
  issue: Issue;
  agent?: Agent;
  need?: NeedItem;
  claim?: Claim;
  outcome?: Outcome;
  headline: string;
  detail: string;
  verb?: string;
  consequence: string;
  deadline?: number;
  overdue: boolean;
  at: number;
  href: string;
};

export function issueHref(number: number): string {
  return `/issue/${number}`;
}

export type CardTone = "ok" | "warn" | "bad" | "muted";

export function cardWindow(card: BoardCard): { start: number; end: number } | null {
  if (!card.deadline || card.need?.status === "expired") return null;

  const start = card.need
    ? card.need.createdAt
    : (card.claim?.events[0]?.at ?? card.claim?.updatedAt ?? card.at);

  return start < card.deadline ? { start, end: card.deadline } : null;
}

export function cardTone(card: BoardCard, now: number): CardTone {
  if (card.rail === "shipped") return "ok";
  if (card.deadline && card.deadline < now) return "bad";
  if (card.rail === "waiting") return "warn";
  if (!card.deadline) return "muted";

  return card.deadline - now < 60 * 60_000 ? "warn" : "ok";
}

const VERBS: Record<NeedItem["kind"], string> = {
  question: "Answer",
  offer: "Accept",
  approval: "Approve",
  claim: "Extend",
};

const WORK_STATUSES: Claim["status"][] = [
  "active",
  "overdue",
  "paused",
  "awaiting_owner",
];

function needDeadline(need: NeedItem, claim?: Claim): number | undefined {
  if (need.kind === "claim") return claim?.deadline ?? need.claimReleaseAt;

  return need.expiresAt ?? need.claimReleaseAt;
}

function consequenceFor(need: NeedItem, claim: Claim | undefined, now: number): string {
  const due = needDeadline(need, claim);

  switch (need.kind) {
    case "question":
      return due
        ? `Releases #${need.issue.number} in ${formatDuration(due - now)} if unanswered`
        : "The claim clock is paused until you answer";
    case "approval":
      return due
        ? `Delivery stays blocked · window closes in ${formatDuration(due - now)}`
        : "Delivery stays blocked until you decide";
    case "claim": {
      const past = claim?.deadline ? now - claim.deadline : now - need.createdAt;
      return `Held ${formatDuration(past)} past deliverBy`;
    }
    default:
      return due
        ? `The offer lapses in ${formatDuration(due - now)}`
        : "The offer window is open";
  }
}

function waitingCard(
  need: NeedItem,
  agents: Agent[],
  claims: Claim[],
  now: number,
): BoardCard {
  const agent = agents.find((candidate) => candidate.id === need.agentId);
  const claim = claims.find(
    (candidate) =>
      candidate.agentId === need.agentId &&
      candidate.issue.number === need.issue.number,
  );
  const due = needDeadline(need, claim);
  const expired = need.status === "expired";

  return {
    key: `waiting-${need.id}`,
    rail: "waiting",
    issue: need.issue,
    agent,
    need,
    claim,
    headline: need.title,
    detail: need.detail,
    verb: expired ? "Re-offer" : VERBS[need.kind],
    consequence: expired
      ? "Nothing started · the issue is still open"
      : consequenceFor(need, claim, now),
    deadline: due,
    overdue: Boolean(due && due < now),
    at: need.createdAt,
    href: issueHref(need.issue.number),
  };
}

function runningCard(
  claim: Claim,
  agents: Agent[],
  now: number,
): BoardCard {
  const agent = agents.find((candidate) => candidate.id === claim.agentId);
  const due = claim.deadline;
  const overdue = Boolean(due && due < now);

  return {
    key: `running-${claim.id}`,
    rail: "running",
    issue: claim.issue,
    agent,
    claim,
    headline: claim.latestLabel,
    detail: claim.nextStep,
    consequence: overdue
      ? `DeliverBy passed ${formatDuration(now - (due as number))} ago`
      : due
        ? `Delivers in ${formatDuration(due - now)}`
        : "No delivery window",
    deadline: due,
    overdue,
    at: claim.updatedAt,
    href: issueHref(claim.issue.number),
  };
}

function shippedCard(outcome: Outcome, agents: Agent[]): BoardCard {
  const agent = agents.find((candidate) => candidate.id === outcome.agentId);

  return {
    key: `shipped-${outcome.id}`,
    rail: "shipped",
    issue: outcome.issue,
    agent,
    outcome,
    headline: outcome.label,
    detail: outcome.issue.title,
    consequence: "",
    overdue: false,
    at: outcome.at,
    href: issueHref(outcome.issue.number),
  };
}

export type Board = {
  waiting: BoardCard[];
  running: BoardCard[];
  shipped: BoardCard[];
  waitingIssues: Set<number>;
};

export function buildBoard(state: DemoState, now: number): Board {
  const open = sortOpenNeeds(state.needs);
  const waiting = [
    ...open.map((need) => waitingCard(need, state.agents, state.claims, now)),
    ...state.needs
      .filter((need) => need.status === "expired")
      .map((need) => waitingCard(need, state.agents, state.claims, now)),
  ];

  const waitingIssues = new Set(
    [...open, ...state.needs.filter((need) => need.status === "expired")].map(
      (need) => need.issue.number,
    ),
  );

  const running = state.claims
    .filter(
      (claim) =>
        WORK_STATUSES.includes(claim.status) && !waitingIssues.has(claim.issue.number),
    )
    .sort((a, b) => {
      const dueA = a.deadline ?? Number.POSITIVE_INFINITY;
      const dueB = b.deadline ?? Number.POSITIVE_INFINITY;
      if (dueA !== dueB) return dueA - dueB;
      return b.updatedAt - a.updatedAt;
    })
    .map((claim) => runningCard(claim, state.agents, now));

  const shipped = [...state.outcomes]
    .sort((a, b) => b.at - a.at)
    .map((outcome) => shippedCard(outcome, state.agents));

  return { waiting, running, shipped, waitingIssues };
}

export type OrbState = "waiting" | "running" | "quiet" | "paused";

export type AgentOrb = {
  agent: Agent;
  state: OrbState;
  waitingCount: number;
  runningCount: number;
  deadline?: number;
  deadlineStart?: number;
  overdue: boolean;
};

export function buildOrbs(board: Board, state: DemoState, now: number): AgentOrb[] {
  return state.agents.map((agent) => {
    const waiting = board.waiting.filter((card) => card.agent?.id === agent.id);
    const running = board.running.filter((card) => card.agent?.id === agent.id);
    const soonest = [...waiting, ...running]
      .filter((card) => card.deadline)
      .sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0))[0];
    const clock = soonest ? cardWindow(soonest) : null;

    return {
      agent,
      state: agent.paused
        ? "paused"
        : waiting.length > 0
          ? "waiting"
          : running.length > 0
            ? "running"
            : "quiet",
      waitingCount: waiting.length,
      runningCount: running.length,
      deadline: soonest?.deadline,
      deadlineStart: clock?.start,
      overdue: Boolean(soonest?.deadline && soonest.deadline < now),
    };
  });
}

export type BriefSegment = {
  id: string;
  text: string;
  href?: string;
  tone: "plain" | "strong" | "bad" | "warn" | "ok";
};

export type BriefLine = {
  id: string;
  tone: "bad" | "warn" | "ok" | "plain";
  segments: BriefSegment[];
};

export function buildBrief(
  board: Board,
  state: DemoState,
  now: number,
  since: { from: number; label: string },
): BriefLine[] {
  const lines: BriefLine[] = [];

  const urgent = board.waiting.find((card) => card.overdue || card.need?.kind === "claim");
  const blocked = board.waiting.find((card) => card.need?.kind === "approval");
  const offer = board.waiting.find((card) => card.need?.kind === "offer");
  const question = board.waiting.find((card) => card.need?.kind === "question");
  const lead = urgent ?? blocked ?? offer ?? question;

  if (lead) {
    const who = lead.agent?.name ?? "An agent";
    const count = board.waiting.length;
    lines.push({
      id: "lead",
      tone: lead.need?.kind === "claim" ? "bad" : "warn",
      segments: [
        {
          id: "lead-open",
          text:
            count === 1
              ? "One decision is waiting on you. "
              : `${count} decisions are waiting on you. `,
          tone: "plain",
        },
        {
          id: "lead-who",
          text: `${who} · #${lead.issue.number}`,
          tone: "strong",
          href: lead.href,
        },
        { id: "lead-rest", text: ` — ${lead.consequence}.`, tone: "plain" },
      ],
    });
  } else {
    lines.push({
      id: "lead",
      tone: "ok",
      segments: [
        {
          id: "lead-clear",
          text: "Nothing needs a decision. ",
          tone: "strong",
        },
        {
          id: "lead-clear-rest",
          text:
            board.running.length > 0
              ? "Every agent is either working or finished."
              : "No agent is blocked.",
          tone: "plain",
        },
      ],
    });
  }

  const shippedSince = state.outcomes.filter((outcome) => outcome.at >= since.from);
  const fixes = shippedSince.filter((outcome) => outcome.acceptedFix).length;

  lines.push({
    id: "since",
    tone: "plain",
    segments: [
      {
        id: "since-count",
        text:
          shippedSince.length > 0
            ? `${who(shippedSince[0].agentId, state.agents)} shipped ${pluralize(fixes || shippedSince.length, "accepted fix")} `
            : "Nothing new ",
        tone: "strong",
      },
      {
        id: "since-rest",
        text: shippedSince.length > 0 ? `${since.label}.` : `${since.label}.`,
        tone: "plain",
      },
    ],
  });

  if (board.running.length > 0) {
    lines.push({
      id: "running",
      tone: "plain",
      segments: [
        {
          id: "running-count",
          text: `${pluralize(board.running.length, "claim")} in progress`,
          tone: "strong",
        },
        {
          id: "running-list",
          text: `: ${board.running
            .map((card) => `#${card.issue.number} ${deadlinePhrase(card.claim, now)}`)
            .join(", ")}.`,
          tone: "plain",
        },
      ],
    });
  }

  return lines;
}

function who(agentId: string, agents: Agent[]): string {
  const agent = agents.find((candidate) => candidate.id === agentId);
  return agent ? agent.name : "An agent";
}

function deadlinePhrase(claim: Claim | undefined, now: number): string {
  if (!claim?.deadline) return "has no delivery window";

  const diff = claim.deadline - now;

  return diff < 0
    ? `is ${formatDuration(-diff)} past deliverBy`
    : `delivers in ${formatDuration(diff)}`;
}
