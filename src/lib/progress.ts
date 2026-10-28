import type { Claim, ClaimStatus } from "./types";

/**
 * The five checkpoints every claim can reach, in order. Labels are matched
 * against real event text so the rail never invents progress the agent did not
 * report; an unrecognised event simply leaves the stage where it is.
 */
export const CHECKPOINTS = [
  { id: "awarded", label: "Awarded", match: ["bid awarded"] },
  { id: "accepted", label: "Accepted", match: ["offer accepted", "accepted the offer"] },
  { id: "draft", label: "Draft", match: ["draft pushed", "patch pushed", "branch opened"] },
  { id: "review", label: "Review", match: ["review requested", "review cleared", "reproduction recorded"] },
  { id: "delivered", label: "Delivered", match: ["fix linked", "delivered", "merged"] },
] as const;

export type CheckpointId = (typeof CHECKPOINTS)[number]["id"];

export type Progress = {
  /** Index into CHECKPOINTS, or -1 when nothing has been reported yet. */
  stage: number;
  reached: CheckpointId[];
  /** 0..1 of the delivery window already consumed; null without a window. */
  consumed: number | null;
  stalled: boolean;
  complete: boolean;
};

const STATUS_STAGE: Partial<Record<ClaimStatus, number>> = {
  offered: -1,
  expired: -1,
  completed: 4,
};

function reachedStage(claim: Claim): number {
  let stage = STATUS_STAGE[claim.status] ?? -1;

  for (const event of claim.events) {
    const label = event.label.toLowerCase();

    CHECKPOINTS.forEach((checkpoint, index) => {
      if (checkpoint.match.some((needle) => label.includes(needle))) {
        stage = Math.max(stage, index);
      }
    });
  }

  return Math.min(stage, 4);
}

/**
 * Heartbeats keep a claim alive but never move the due date, so a claim that
 * has not reported a checkpoint inside most of its window is stalled even
 * while the agent still looks online.
 */
function isStalled(claim: Claim, stage: number, consumed: number | null): boolean {
  if (consumed === null || claim.status !== "active") return false;

  return consumed > 0.66 && stage < 4;
}

export function claimProgress(claim: Claim, now: number): Progress {
  const stage = reachedStage(claim);
  const start = claim.events[0]?.at ?? claim.updatedAt;
  const span = claim.deadline === undefined ? 0 : claim.deadline - start;
  const consumed =
    claim.deadline === undefined || span <= 0
      ? null
      : Math.max(0, Math.min(1, (now - start) / span));

  return {
    stage,
    reached: CHECKPOINTS.slice(0, stage + 1).map((checkpoint) => checkpoint.id),
    consumed,
    stalled: isStalled(claim, stage, consumed),
    complete: claim.status === "completed" || stage >= 4,
  };
}
