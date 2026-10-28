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
  tag: string;
  verb?: string;
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

const NEED_TAGS: Record<NeedItem["kind"], string> = {
  question: "needs your answer",
  offer: "offer open",
  approval: "gate approval",
  claim: "claim overdue",
};

/* Board rows carry a few words only; the sentence lives on the drill-down. */
function shortLabel(text: string, max = 40): string {
  const head = text.split(/ · | — |, /)[0].trim();
  if (head.length <= max) return head;

  const cut = head.slice(0, max);
  const space = cut.lastIndexOf(" ");

  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}

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
    tag: expired ? "offer expired" : NEED_TAGS[need.kind],
    verb: expired ? "Re-offer" : VERBS[need.kind],
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
    tag: shortLabel(claim.latestLabel),
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
    tag: shortLabel(outcome.label),
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
