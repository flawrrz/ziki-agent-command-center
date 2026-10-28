import { LEVEL_LABELS } from "./types";
import type {
  Agent,
  Claim,
  DemoState,
  FeedGroup,
  FeedItem,
  NeedItem,
} from "./types";

const WORK_STATUSES = ["active", "overdue", "paused", "awaiting_owner"];

const WORK_PRIORITY: Record<string, number> = {
  overdue: 0,
  awaiting_owner: 1,
  paused: 2,
  active: 3,
};

function needNotificationTitle(need: NeedItem): string {
  switch (need.kind) {
    case "claim":
      return "Claim needs reconciliation";
    case "offer":
      return need.status === "expired" ? "Offer expired" : "Offer waiting for a decision";
    case "approval":
      return "Pipeline approval requested";
    default:
      return "Question awaiting your answer";
  }
}

export function sortOpenNeeds(needs: NeedItem[]): NeedItem[] {
  return [...needs]
    .filter((need) => need.status === "open")
    .sort((a, b) => {
      const dueA =
        a.kind === "claim"
          ? Number.NEGATIVE_INFINITY
          : (a.expiresAt ?? a.claimReleaseAt ?? Number.POSITIVE_INFINITY);
      const dueB =
        b.kind === "claim"
          ? Number.NEGATIVE_INFINITY
          : (b.expiresAt ?? b.claimReleaseAt ?? Number.POSITIVE_INFINITY);

      if (dueA !== dueB) return dueA - dueB;
      return a.createdAt - b.createdAt;
    });
}

export function needsForAgent(needs: NeedItem[], agentId: string): NeedItem[] {
  return sortOpenNeeds(needs).filter((need) => need.agentId === agentId);
}

export function agentClaims(claims: Claim[], agentId: string): Claim[] {
  return claims
    .filter(
      (claim) => claim.agentId === agentId && WORK_STATUSES.includes(claim.status),
    )
    .sort((a, b) => {
      const priority = (WORK_PRIORITY[a.status] ?? 9) - (WORK_PRIORITY[b.status] ?? 9);
      if (priority !== 0) return priority;
      return b.updatedAt - a.updatedAt;
    });
}

export function claimGroup(claim: Claim): "active" | "offered" | "released" {
  if (claim.status === "offered" || claim.status === "expired") return "offered";
  if (claim.status === "released" || claim.status === "completed") return "released";
  return "active";
}

export type PresenceMeta = {
  label: string;
  tone: "ok" | "warn" | "muted";
  description: string;
};

export function presenceMeta(agent: Agent): PresenceMeta {
  if (agent.paused) {
    return {
      label: "Paused",
      tone: "muted",
      description:
        "Paused by the owner. The agent receives no new offers; active claims are unaffected.",
    };
  }

  if (agent.presence === "online") {
    return {
      label: "Online",
      tone: "ok",
      description: "Used the API, claimed work or sent a heartbeat in the last 15 minutes.",
    };
  }

  if (agent.presence === "idle") {
    return {
      label: "Idle",
      tone: "warn",
      description: "No API activity for 15–60 minutes.",
    };
  }

  return {
    label: "Offline",
    tone: "muted",
    description:
      "No API activity for over 60 minutes. An offline agent can still hold an active claim.",
  };
}

export function buildFeed(state: DemoState): FeedItem[] {
  const needItems: FeedItem[] = state.needs
    .filter((need) => need.status !== "resolved")
    .map((need) => {
      const agent = state.agents.find((candidate) => candidate.id === need.agentId);

      return {
        id: `feed-${need.id}`,
        issue: need.issue,
        actorName: agent?.name ?? "Agent",
        actorRole: agent ? LEVEL_LABELS[agent.level] : "Agent",
        ownerName: agent?.owner ?? "Workspace owner",
        title: needNotificationTitle(need),
        detail: need.title,
        at: need.createdAt,
        needsYou: true,
        expiresAt: need.expiresAt,
        href: `/issue/${need.issue.number}#${need.id}`,
        unread: !state.readNotificationIds.includes(`feed-${need.id}`),
      };
    });

  const updateItems: FeedItem[] = state.updates.map((update) => ({
    id: `feed-${update.id}`,
    issue: update.issue,
    actorName: update.actorName,
    actorRole: update.actorRole,
    ownerName: update.ownerName,
    title: update.title,
    detail: update.detail,
    at: update.at,
    needsYou: false,
    href: `/issue/${update.issue.number}`,
    unread: !state.readNotificationIds.includes(`feed-${update.id}`),
  }));

  return [...needItems, ...updateItems].sort((a, b) => b.at - a.at);
}

export function groupFeed(items: FeedItem[]): FeedGroup[] {
  const groups = new Map<number, FeedGroup>();

  for (const item of items) {
    const key = String(item.issue.number);
    const existing = groups.get(item.issue.number);

    if (existing) {
      existing.items.push(item);
      existing.latestAt = Math.max(existing.latestAt, item.at);
      existing.needsCount += item.needsYou ? 1 : 0;
    } else {
      groups.set(item.issue.number, {
        key,
        issue: item.issue,
        items: [item],
        latestAt: item.at,
        needsCount: item.needsYou ? 1 : 0,
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        if (a.needsYou !== b.needsYou) return a.needsYou ? -1 : 1;
        return b.at - a.at;
      }),
    }))
    .sort((a, b) => {
      if (a.needsCount !== b.needsCount) return b.needsCount - a.needsCount;
      return b.latestAt - a.latestAt;
    });
}

export function unresolvedNeeds(state: DemoState): NeedItem[] {
  return sortOpenNeeds(state.needs);
}

export function expiredNeeds(state: DemoState): NeedItem[] {
  return state.needs
    .filter((need) => need.status === "expired")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function resolvedNeeds(state: DemoState): NeedItem[] {
  return state.needs
    .filter((need) => need.status === "resolved" && need.resolution)
    .sort((a, b) => (b.resolution?.at ?? 0) - (a.resolution?.at ?? 0));
}
