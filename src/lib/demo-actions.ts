import { LEVEL_LABELS } from "./types";
import type {
  Agent,
  Claim,
  DemoState,
  NeedAction,
  NeedItem,
  WorkspaceUpdate,
} from "./types";

export type FeedbackTone = "success" | "info" | "warn" | "error";

export type ActionResult = {
  state: DemoState;
  message: string;
  tone: FeedbackTone;
};

const MINUTE = 60_000;

function touchAgent(
  agents: Agent[],
  agentId: string,
  label: string,
  issueNumber: number,
  at: number,
): Agent[] {
  return agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          lastAction: { label, issueNumber, at },
        }
      : agent,
  );
}

function withUpdate(
  state: DemoState,
  need: NeedItem,
  action: NeedAction,
  title: string,
  detail: string,
  at: number,
): WorkspaceUpdate[] {
  const agent = state.agents.find((candidate) => candidate.id === need.agentId);

  return [
    {
      id: `upd-${need.issue.number}-${action}-${at}`,
      issue: need.issue,
      actorName: agent?.name ?? "Agent",
      actorRole: agent ? LEVEL_LABELS[agent.level] : "Agent",
      ownerName: agent?.owner ?? "Workspace owner",
      title,
      detail,
      at,
    },
    ...state.updates,
  ];
}

function resolveNeed(
  state: DemoState,
  needId: string,
  label: string,
  at: number,
  note?: string,
): NeedItem[] {
  return state.needs.map((need) =>
    need.id === needId
      ? {
          ...need,
          status: "resolved",
          resolution: {
            label,
            note: note?.trim() || undefined,
            at,
          },
        }
      : need,
  );
}

export function applyNeedAction(
  state: DemoState,
  needId: string,
  action: NeedAction,
  note: string | undefined,
  at: number,
): ActionResult {
  const need = state.needs.find((candidate) => candidate.id === needId);

  if (!need) {
    return {
      state,
      message: "That request is no longer in your queue.",
      tone: "warn",
    };
  }

  if (need.status !== "open" && !(need.status === "expired" && action === "reoffer")) {
    return {
      state,
      message: "That request has already been handled.",
      tone: "warn",
    };
  }

  const agent = state.agents.find((candidate) => candidate.id === need.agentId);
  const agentName = agent?.name ?? "the agent";
  const issueNumber = need.issue.number;
  const matchingClaim = state.claims.find(
    (claim) =>
      claim.agentId === need.agentId &&
      claim.issue.number === issueNumber,
  );

  if (action === "answer") {
    const answer = note?.trim();

    if (!answer) {
      return {
        state,
        message: "Add an answer before sending it.",
        tone: "warn",
      };
    }

    let resumed = false;
    const claims = state.claims.map((claim) => {
      if (
        claim.id === matchingClaim?.id &&
        claim.status === "paused"
      ) {
        resumed = true;
        return {
          ...claim,
          status: "active" as const,
          latestLabel: "Resuming after your answer",
          updatedAt: at,
          nextStep: "Waiting on the agent's next heartbeat",
          nextStepTone: "info" as const,
          events: [
            ...claim.events,
            {
              at,
              label: "Owner answered the question",
              detail: "The paused claim clock resumed.",
            },
          ],
        };
      }

      return claim;
    });

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `Received an answer on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, "Answered", at, answer),
      },
      message: resumed
        ? `Answer sent to ${agentName}. Claim #${issueNumber} resumed.`
        : `Answer sent to ${agentName}.`,
      tone: "success",
    };
  }

  if (action === "accept") {
    const windowMinutes =
      need.issue.priority === "High" || need.issue.priority === "Critical"
        ? 60
        : 15;
    const deadline = at + windowMinutes * MINUTE;
    const claims = matchingClaim
      ? state.claims.map((claim) =>
          claim.id === matchingClaim.id
            ? {
                ...claim,
                status: "active" as const,
                latestLabel: "Working the accepted offer",
                updatedAt: at,
                deadline,
                nextStep: "Link a fix before the due date",
                nextStepTone: "info" as const,
                events: [
                  ...claim.events,
                  {
                    at,
                    label: "Offer accepted by owner",
                    detail: `${windowMinutes}-minute delivery window started.`,
                  },
                ],
              }
            : claim,
        )
      : state.claims;

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `Accepted offer on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, "Offer accepted", at),
        updates: withUpdate(
          state,
          need,
          action,
          "Offer accepted",
          `${agentName} has ${windowMinutes} minutes to link a fix.`,
          at,
        ),
      },
      message: `Offer accepted. ${agentName} has ${windowMinutes} minutes to link a fix on #${issueNumber}.`,
      tone: "success",
    };
  }

  if (action === "pass") {
    const claims = state.claims.map((claim) =>
      claim.id === matchingClaim?.id
        ? {
            ...claim,
            status: "released" as const,
            latestLabel: "Offer passed by owner",
            updatedAt: at,
            releaseReason: "offer_passed",
            nextStep: "Re-offered to the next eligible person",
            nextStepTone: "neutral" as const,
            events: [
              ...claim.events,
              {
                at,
                label: "Offer passed by owner",
              },
            ],
          }
        : claim,
    );

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `Offer passed on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, "Offer passed", at),
        updates: withUpdate(
          state,
          need,
          action,
          "Offer passed",
          `#${issueNumber} will be re-offered to the next eligible person.`,
          at,
        ),
      },
      message: `Offer passed. #${issueNumber} will be re-offered to the next eligible person.`,
      tone: "info",
    };
  }

  if (action === "approve" || action === "decline") {
    const approved = action === "approve";
    const claims = state.claims.map((claim) =>
      claim.id === matchingClaim?.id
        ? {
            ...claim,
            status: "completed" as const,
            latestLabel: approved
              ? "Pipeline gate approved by owner"
              : "Pipeline gate declined by owner",
            updatedAt: at,
            nextStep: approved
              ? "Merge can resume automatically"
              : "Merge stays blocked; the agent has been notified",
            nextStepTone: approved ? ("ok" as const) : ("bad" as const),
            events: [
              ...claim.events,
              {
                at,
                label: approved ? "Gate approved by owner" : "Gate declined by owner",
              },
            ],
          }
        : claim,
    );

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `${approved ? "Approved" : "Declined"} pipeline gate on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, approved ? "Gate approved" : "Gate declined", at),
        updates: withUpdate(
          state,
          need,
          action,
          approved ? "Pipeline gate approved" : "Pipeline gate declined",
          approved
            ? "Production delivery can continue."
            : "Production delivery stays blocked.",
          at,
        ),
      },
      message: approved
        ? `Gate approved. #${issueNumber} can continue to production.`
        : `Gate declined. #${issueNumber} stays blocked and ${agentName} has been notified.`,
      tone: approved ? "success" : "warn",
    };
  }

  if (action === "release") {
    const claims = state.claims.map((claim) =>
      claim.id === matchingClaim?.id
        ? {
            ...claim,
            status: "released" as const,
            latestLabel: "Claim released by owner",
            updatedAt: at,
            releaseReason: "released_by_owner",
            nextStep: "Re-offered to the next eligible person",
            nextStepTone: "neutral" as const,
            events: [
              ...claim.events,
              {
                at,
                label: "Claim released by owner",
                detail: "The issue can now be re-offered.",
              },
            ],
          }
        : claim,
    );

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `Claim released on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, "Claim released", at),
        updates: withUpdate(
          state,
          need,
          action,
          "Claim released",
          `#${issueNumber} is available for a new offer.`,
          at,
        ),
      },
      message: `Claim released. #${issueNumber} can be re-offered.`,
      tone: "success",
    };
  }

  if (action === "extend") {
    const claims = state.claims.map((claim) =>
      claim.id === matchingClaim?.id
        ? {
            ...claim,
            status: "active" as const,
            latestLabel: "Deadline extended by owner · 60 minutes",
            updatedAt: at,
            deadline: at + 60 * MINUTE,
            nextStep: "Waiting on the agent's next heartbeat",
            nextStepTone: "info" as const,
            events: [
              ...claim.events,
              {
                at,
                label: "Deadline extended by owner",
                detail: "The single available extension was used.",
              },
            ],
          }
        : claim,
    );

    return {
      state: {
        ...state,
        agents: touchAgent(
          state.agents,
          need.agentId,
          `Deadline extended on #${issueNumber}`,
          issueNumber,
          at,
        ),
        claims,
        needs: resolveNeed(state, needId, "Deadline extended 60m", at),
        updates: withUpdate(
          state,
          need,
          action,
          "Deadline extended",
          `#${issueNumber} now has 60 more minutes. The agent's presence is unchanged.`,
          at,
        ),
      },
      message:
        agent?.presence === "offline"
          ? `Extended #${issueNumber} by 60 minutes. ${agentName} is still offline.`
          : `Extended #${issueNumber} by 60 minutes.`,
      tone: "info",
    };
  }

  if (action === "reoffer") {
    const claims = state.claims.map((claim) =>
      claim.id === matchingClaim?.id
        ? {
            ...claim,
            latestLabel: "Re-offer requested",
            updatedAt: at,
            nextStep: "Waiting for dispatch to pick the next eligible person",
            nextStepTone: "info" as const,
            events: [
              ...claim.events,
              {
                at,
                label: "Re-offer requested by owner",
              },
            ],
          }
        : claim,
    );

    return {
      state: {
        ...state,
        claims,
        needs: resolveNeed(state, needId, "Re-offer requested", at),
        updates: withUpdate(
          state,
          need,
          action,
          "Re-offer requested",
          `Dispatch will pick the next eligible person for #${issueNumber}.`,
          at,
        ),
      },
      message: `Re-offer requested for #${issueNumber}. Dispatch will pick the next eligible person.`,
      tone: "info",
    };
  }

  return {
    state,
    message: "No change was made.",
    tone: "warn",
  };
}

export function applyAgentPause(
  state: DemoState,
  agentId: string,
  at: number,
): ActionResult {
  const agent = state.agents.find((candidate) => candidate.id === agentId);

  if (!agent) {
    return {
      state,
      message: "That agent is no longer in this workspace.",
      tone: "warn",
    };
  }

  const paused = !agent.paused;
  const activeClaim = state.claims.find(
    (claim) =>
      claim.agentId === agentId &&
      ["active", "overdue", "paused", "awaiting_owner"].includes(claim.status),
  );
  const agents = state.agents.map((candidate) =>
    candidate.id === agentId
      ? {
          ...candidate,
          paused,
          lastAction: {
            label: paused ? "Paused by owner" : "Resumed by owner",
            at,
          },
        }
      : candidate,
  );

  return {
    state: { ...state, agents },
    message: paused
      ? activeClaim
        ? `${agent.name} is paused. Claim #${activeClaim.issue.number} was not released.`
        : `${agent.name} is paused and will not receive new offers.`
      : `${agent.name} is resumed. It will appear online after the next heartbeat.`,
    tone: paused ? "warn" : "success",
  };
}

export function markFeedRead(
  state: DemoState,
  ids: string[],
): DemoState {
  const merged = new Set([...state.readNotificationIds, ...ids]);
  return { ...state, readNotificationIds: Array.from(merged) };
}

export function expireTimedNeeds(
  state: DemoState,
  at: number,
): DemoState {
  let changed = false;
  const newlyOverdue = new Set<string>();

  const needs: NeedItem[] = state.needs.map((need) => {
    if (
      need.status === "open" &&
      need.kind === "offer" &&
      need.expiresAt &&
      need.expiresAt <= at
    ) {
      changed = true;
      return { ...need, status: "expired" as const };
    }

    return need;
  });

  const claims = state.claims.map((claim) => {
    if (
      claim.status === "offered" &&
      claim.deadline &&
      claim.deadline <= at
    ) {
      changed = true;
      return {
        ...claim,
        status: "expired" as const,
        latestLabel: "Offer expired after 30 minutes",
        updatedAt: at,
        nextStep: "Re-offer or leave the issue open",
        nextStepTone: "warn" as const,
        events: [
          ...claim.events,
          {
            at,
            label: "Offer expired",
            detail: "No claim was started.",
          },
        ],
      };
    }

    if (claim.status === "active" && claim.deadline && claim.deadline <= at) {
      changed = true;
      newlyOverdue.add(claim.id);
      return {
        ...claim,
        status: "overdue" as const,
        latestLabel: "Due date passed · claim still held",
        updatedAt: at,
        nextStep: "Release the claim or extend by 60 minutes",
        nextStepTone: "bad" as const,
        events: [
          ...claim.events,
          {
            at,
            label: "Due date passed",
            detail: "No linked fix. The claim still occupies a slot.",
          },
        ],
      };
    }

    return claim;
  });

  const openClaimIssues = new Set(
    needs
      .filter((need) => need.status === "open" && need.kind === "claim")
      .map((need) => need.issue.number),
  );
  const autoNeeds: NeedItem[] = claims
    .filter(
      (claim) =>
        newlyOverdue.has(claim.id) && !openClaimIssues.has(claim.issue.number),
    )
    .map((claim) => {
      const agent = state.agents.find(
        (candidate) => candidate.id === claim.agentId,
      );

      return {
        id: `need-claim-${claim.issue.number}-${at}`,
        kind: "claim",
        agentId: claim.agentId,
        issue: claim.issue,
        title: `Deadline passed, but ${agent?.name ?? "an agent"} still holds #${claim.issue.number}`,
        detail:
          "The due date passed while the claim was active. The claim still occupies a slot and the issue cannot be re-offered until you release or extend it.",
        context: [
          `${claim.issue.priority} priority · delivery window elapsed`,
          "No linked fix was recorded",
          "A claim slot stays blocked until this is resolved",
        ],
        rule: "Heartbeats keep a claim alive but do not move the due date. A claim past its due date with no linked fix is released and re-offered.",
        status: "open" as const,
        createdAt: at,
      };
    });

  if (autoNeeds.length > 0) {
    needs.push(...autoNeeds);
  }

  return changed ? { ...state, needs, claims } : state;
}

export function reconcilePresence(state: DemoState, at: number): DemoState {
  let changed = false;

  const agents = state.agents.map((agent) => {
    if (agent.paused) return agent;

    const age = at - agent.lastHeartbeat;
    const presence: Agent["presence"] =
      age <= 15 * MINUTE ? "online" : age <= 60 * MINUTE ? "idle" : "offline";

    if (presence === agent.presence) return agent;
    changed = true;
    return { ...agent, presence };
  });

  return changed ? { ...state, agents } : state;
}

export function claimWorkStatuses(claim: Claim): boolean {
  return ["active", "overdue", "paused", "awaiting_owner"].includes(claim.status);
}
