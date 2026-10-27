export const AGENT_LEVELS = [
  "observer",
  "contributor",
  "triager",
  "reviewer",
  "dispatcher",
  "merger",
  "admin_merger",
] as const;

export type AgentLevel = (typeof AGENT_LEVELS)[number];

export const LEVEL_LABELS: Record<AgentLevel, string> = {
  observer: "Observer",
  contributor: "Contributor",
  triager: "Triager",
  reviewer: "Reviewer",
  dispatcher: "Dispatcher",
  merger: "Merger",
  admin_merger: "Admin merger",
};

export type Presence = "online" | "idle" | "offline";

export type IssuePriority = "Low" | "Medium" | "High" | "Critical";

export type Issue = {
  number: number;
  title: string;
  priority: IssuePriority;
  project: string;
  url: string;
};

export type Agent = {
  id: string;
  name: string;
  level: AgentLevel;
  model: string;
  owner: string;
  personal?: boolean;
  paused: boolean;
  presence: Presence;
  lastHeartbeat: number;
  lastAction: {
    label: string;
    issueNumber?: number;
    at: number;
  };
  stats: {
    acceptedFixes: number;
    reviews: number;
    releases: number;
  };
  areas: string[];
};

export type NeedKind = "question" | "offer" | "approval" | "claim";

export type NeedStatus = "open" | "resolved" | "expired";

export type NeedItem = {
  id: string;
  kind: NeedKind;
  agentId: string;
  issue: Issue;
  title: string;
  detail: string;
  context: string[];
  rule: string;
  status: NeedStatus;
  createdAt: number;
  expiresAt?: number;
  claimReleaseAt?: number;
  resolution?: {
    label: string;
    note?: string;
    at: number;
  };
};

export type ClaimStatus =
  | "active"
  | "overdue"
  | "paused"
  | "offered"
  | "expired"
  | "released"
  | "awaiting_owner"
  | "completed";

export type ClaimEvent = {
  at: number;
  label: string;
  detail?: string;
};

export type Claim = {
  id: string;
  agentId: string;
  issue: Issue;
  status: ClaimStatus;
  latestLabel: string;
  updatedAt: number;
  deadline?: number;
  lastHeartbeat?: number;
  nextStep: string;
  nextStepTone: "neutral" | "info" | "warn" | "bad" | "ok";
  releaseReason?: string;
  cycles?: number;
  events: ClaimEvent[];
};

export type Outcome = {
  id: string;
  agentId: string;
  issue: Issue;
  label: string;
  at: number;
  acceptedFix: boolean;
};

export type WorkspaceUpdate = {
  id: string;
  issue: Issue;
  actorName: string;
  actorRole: string;
  ownerName: string;
  title: string;
  detail: string;
  at: number;
};

export type DemoState = {
  version: number;
  seededAt: number;
  agents: Agent[];
  needs: NeedItem[];
  claims: Claim[];
  outcomes: Outcome[];
  updates: WorkspaceUpdate[];
  readNotificationIds: string[];
};

export type NeedAction =
  | "answer"
  | "accept"
  | "pass"
  | "approve"
  | "decline"
  | "release"
  | "extend"
  | "reoffer";

export type FeedItem = {
  id: string;
  issue: Issue;
  actorName: string;
  actorRole: string;
  ownerName: string;
  title: string;
  detail: string;
  at: number;
  needsYou: boolean;
  expiresAt?: number;
  href: string;
  unread: boolean;
};

export type FeedGroup = {
  key: string;
  issue: Issue;
  items: FeedItem[];
  latestAt: number;
  needsCount: number;
};
