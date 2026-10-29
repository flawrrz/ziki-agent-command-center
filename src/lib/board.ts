import { liveNeeds } from "./demo-selectors";
import { BACKLOG_ISSUES } from "./backlog";
import { ISSUES } from "./demo-data";
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

function shippedCard(outcome: Outcome, agents: Agent[], claim?: Claim): BoardCard {
  const agent = agents.find((candidate) => candidate.id === outcome.agentId);

  return {
    key: `shipped-${outcome.id}`,
    rail: "shipped",
    issue: outcome.issue,
    agent,
    outcome,
    /* The rail on a shipped row is the claim that produced the outcome, so the
       row can show the whole awarded → merged path rather than a tick. */
    claim,
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

/* The field and the rails must agree, so both read the claim that won an issue. */
function latestClaimByIssue(state: DemoState): Map<number, Claim> {
  const claimByIssue = new Map<number, Claim>();

  for (const claim of state.claims) {
    const existing = claimByIssue.get(claim.issue.number);
    if (!existing || claim.updatedAt > existing.updatedAt) {
      claimByIssue.set(claim.issue.number, claim);
    }
  }

  return claimByIssue;
}

export function buildBoard(state: DemoState, now: number): Board {
  const live = liveNeeds(state);
  const waiting = live.map((need) =>
    waitingCard(need, state.agents, state.claims, now),
  );

  const waitingIssues = new Set(live.map((need) => need.issue.number));

  const latest = latestClaimByIssue(state);

  const running = [...latest.values()]
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

  /* Delivered means the winning claim completed and nothing is waiting: the
     ledger's DELIVERED cell and this rail are then the same set by construction. */
  const shipped = state.outcomes
    .filter(
      (outcome) =>
        latest.get(outcome.issue.number)?.status === "completed" &&
        !waitingIssues.has(outcome.issue.number),
    )
    .sort((a, b) => b.at - a.at)
    .map((outcome) => shippedCard(outcome, state.agents, latest.get(outcome.issue.number)));

  return { waiting, running, shipped, waitingIssues };
}

export type CellState =
  | "need"
  | "late"
  | "running"
  | "delivered"
  | "released"
  | "idle";

export type FieldCell = {
  issue: Issue;
  state: CellState;
  label: string;
  href: string;
};

export type Field = {
  cells: FieldCell[];
  counts: Record<CellState, number>;
  total: number;
};

const CELL_ORDER: CellState[] = [
  "need",
  "late",
  "running",
  "delivered",
  "released",
  "idle",
];

/**
 * The backlog has ~1000 rows and only ~60 of them are live, so the whole set is
 * shown as one cell each instead of a list. Ordering puts the states you can act
 * on first, so a truncated grid never hides a decision behind history.
 */
export function buildField(state: DemoState): Field {
  /* The same one-per-issue pick the queue uses, so a cell never describes a
     different need than the row for that issue. */
  const byIssue = new Map(
    liveNeeds(state).map((need) => [need.issue.number, need]),
  );

  const claimByIssue = latestClaimByIssue(state);

  const counts: Record<CellState, number> = {
    need: 0,
    late: 0,
    running: 0,
    delivered: 0,
    released: 0,
    idle: 0,
  };

  const issues = [...Object.values(ISSUES), ...BACKLOG_ISSUES];
  const agentNames = new Map(state.agents.map((agent) => [agent.id, agent.name]));

  const cells = issues.map((issue) => {
    const need = byIssue.get(issue.number);
    const claim = claimByIssue.get(issue.number);

    let cellState: CellState = "idle";

    if (need) cellState = "need";
    else if (claim?.status === "overdue") cellState = "late";
    else if (claim && WORK_STATUSES.includes(claim.status)) cellState = "running";
    else if (claim?.status === "completed") cellState = "delivered";
    else if (claim?.status === "released" || claim?.status === "expired") {
      cellState = "released";
    }

    counts[cellState] += 1;

    const who = agentNames.get(claim?.agentId ?? need?.agentId ?? "");

    return {
      issue,
      state: cellState,
      href: issueHref(issue.number),
      label: `#${issue.number} ${CELL_TEXT[cellState]}${who ? ` · ${who}` : ""} · ${issue.title}`,
    };
  });

  const rank = (cell: FieldCell) => CELL_ORDER.indexOf(cell.state);

  cells.sort((a, b) => {
    const byState = rank(a) - rank(b);
    if (byState !== 0) return byState;

    return b.issue.number - a.issue.number;
  });

  return { cells, counts, total: cells.length };
}

export const CELL_TEXT: Record<CellState, string> = {
  need: "needs you",
  late: "past due",
  running: "agent working",
  delivered: "delivered",
  released: "claim released",
  idle: "unclaimed",
};

/* The store keeps only issues that a claim, need, outcome or update mentions,
   so ~370 of the field's squares have no record to carry a title. Every square
   is a link, so the corpus has to answer for them: this is the same list
   `buildField` walks, indexed once. */
const CORPUS = new Map<number, Issue>(
  [...Object.values(ISSUES), ...BACKLOG_ISSUES].map((issue) => [
    issue.number,
    issue,
  ]),
);

export function corpusIssue(number: number): Issue | null {
  return CORPUS.get(number) ?? null;
}
