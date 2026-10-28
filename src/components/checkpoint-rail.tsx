import Link from "next/link";
import { claimProgress, CHECKPOINTS } from "@/lib/progress";
import type { Claim } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * The rail only ever says how far the agent got. Breaches and pauses live in the
 * row's marker and clock, so one colour per job keeps the column scannable.
 */
function segmentState(claim: Claim, index: number, stage: number) {
  if (claim.status === "completed") return "ok";
  if (index <= stage) return "done";

  return "pending";
}

/**
 * Five segments, one per checkpoint the agent can actually report. The bar is
 * read left to right as the delivery path, so progress is a shape, not a number.
 */
export function CheckpointRail({
  claim,
  now,
  className,
}: {
  claim: Claim;
  now: number;
  className?: string;
}) {
  const progress = claimProgress(claim, now);

  return (
    <div className={cn("zk-rail", className)} aria-hidden="true">
      {CHECKPOINTS.map((checkpoint, index) => (
        <span
          key={checkpoint.id}
          className="zk-rail-seg"
          data-state={segmentState(claim, index, progress.stage)}
        />
      ))}
    </div>
  );
}

export function CheckpointReadout({
  claim,
  now,
}: {
  claim: Claim;
  now: number;
}) {
  const progress = claimProgress(claim, now);
  const tone =
    claim.status === "completed"
      ? "text-zk-ok-fg"
      : claim.status === "overdue" || progress.stalled
        ? "text-zk-bad-fg"
        : "text-zk-info-fg";

  return (
    <div className="space-y-1.5">
      <div className="zk-rail" role="img" aria-label={ariaLabel(claim, progress.stage)}>
        {CHECKPOINTS.map((checkpoint, index) => (
          <span
            key={checkpoint.id}
            className="zk-rail-seg"
            data-state={segmentState(claim, index, progress.stage)}
          />
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="zk-label">
          {progress.stage < 0
            ? "no checkpoint yet"
            : `checkpoint ${progress.stage + 1}/5 · ${CHECKPOINTS[progress.stage].label}`}
        </span>
        <span className={cn("zk-num text-[11px]", tone)}>
          {progress.consumed === null
            ? claim.deadline
              ? "window closed"
              : "no due date"
            : `${Math.round(progress.consumed * 100)}% of window`}
        </span>
      </div>

      {progress.consumed !== null ? (
        <div className={cn("zk-meter", tone)}>
          <i style={{ width: `${progress.consumed * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function ariaLabel(claim: Claim, stage: number): string {
  if (stage < 0) return "No checkpoint reported yet";

  return `${CHECKPOINTS.slice(0, stage + 1).map((c) => c.label).join(", ")} reached`;
}
