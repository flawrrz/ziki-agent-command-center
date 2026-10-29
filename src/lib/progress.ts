import type { Claim, ClaimStatus } from "./types";

/**
 * The four checkpoints every claim passes, in order. Labels are matched against
 * real event text so the rail never invents progress the agent did not report;
 * an unrecognised event simply leaves the stage where it is. `code` is the
 * three-letter form the row rail prints when there is room for it. Each cell is
 * a thing that now exists: a holder, a patch, a cleared change, a landed fix.
 */
export const CHECKPOINTS = [
  { id: "claimed", label: "Claimed", code: "CLM", match: ["bid awarded", "accepted"] },
  { id: "done", label: "Done", code: "DON", match: ["draft pushed", "patch pushed", "branch opened", "reproduction recorded", "confirmed the report"] },
  { id: "ready", label: "Ready", code: "RDY", match: ["review requested", "review cleared", "approval requested"] },
  { id: "merged", label: "Merged", code: "MRG", match: ["fix linked", "delivered", "merged"] },
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

const LAST = CHECKPOINTS.length - 1;

const STATUS_STAGE: Partial<Record<ClaimStatus, number>> = {
  offered: -1,
  expired: -1,
  completed: LAST,
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

  return Math.min(stage, LAST);
}

/**
 * Heartbeats keep a claim alive but never move the due date, so a claim that
 * has not reported a checkpoint inside most of its window is stalled even
 * while the agent still looks online.
 */
function isStalled(claim: Claim, stage: number, consumed: number | null): boolean {
  if (consumed === null || claim.status !== "active") return false;

  return consumed > 0.66 && stage < LAST;
}

export function claimProgress(claim: Claim, now: number): Progress {
  const stage = reachedStage(claim);
  const start = claim.events[0]?.at ?? claim.updatedAt;
  const span = claim.deadline === undefined ? 0 : claim.deadline - start;
  /* A closed claim's clock stopped when it closed. Measuring its window against
     `now` pinned every delivered issue at 100% — a breach the agent did not
     commit — and the figure never moved again afterwards. */
  const closed = claim.status === "completed" || claim.status === "released";
  const at = closed ? Math.min(now, claim.updatedAt) : now;
  const consumed =
    claim.deadline === undefined || span <= 0
      ? null
      : Math.max(0, Math.min(1, (at - start) / span));

  return {
    stage,
    reached: CHECKPOINTS.slice(0, stage + 1).map((checkpoint) => checkpoint.id),
    consumed,
    stalled: isStalled(claim, stage, consumed),
    complete: claim.status === "completed" || stage >= LAST,
  };
}
