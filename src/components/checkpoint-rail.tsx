import { claimProgress, CHECKPOINTS } from "@/lib/progress";
import { formatDuration } from "@/lib/format";
import type { Claim } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * The rail only ever says how far the agent got. Breaches and pauses live in the
 * row's marker and clock, so one colour per job keeps the column scannable.
 * The current checkpoint is drawn apart from the reached ones so "3 of 4" can be
 * read without counting bars.
 */
function segmentState(claim: Claim, index: number, stage: number) {
  if (claim.status === "completed") return "ok";
  if (index === stage) return "current";
  if (index < stage) return "done";

  return "pending";
}

function ariaLabel(claim: Claim, stage: number): string {
  if (stage < 0) return "No checkpoint reported yet";

  return `Checkpoint ${stage + 1} of ${CHECKPOINTS.length} · ${CHECKPOINTS[stage].label}`;
}

/**
 * Numbered cells, one per checkpoint an agent can actually report. The numbers
 * are the point: a bar says "some amount of progress", a numbered cell says
 * which checkpoint the claim is standing on.
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
  const { stage } = claimProgress(claim, now);

  return (
    <span
      className={cn("zk-rail", className)}
      role="img"
      aria-label={ariaLabel(claim, stage)}
      title={ariaLabel(claim, stage)}
    >
      {CHECKPOINTS.map((checkpoint, index) => (
        <span
          key={checkpoint.id}
          className="zk-rail-seg zk-num"
          data-state={segmentState(claim, index, stage)}
        >
          {index + 1}
        </span>
      ))}
    </span>
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
      <CheckpointRail
        claim={claim}
        now={now}
        className="w-full max-w-[220px]"
      />

      <div className="flex items-baseline justify-between gap-3">
        <span className="zk-label">
          {progress.stage < 0
            ? "no checkpoint yet"
            : `checkpoint ${progress.stage + 1}/${CHECKPOINTS.length} · ${CHECKPOINTS[progress.stage].label}`}
        </span>
        <span className={cn("zk-num text-[11px]", tone)}>
          {readoutWindow(claim, now)}
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

/**
 * The meter's caption. "46% of window" is analyst shorthand — it names a
 * denominator nobody was asked to pick. What a reader actually wants is the
 * date and whether the agent will make it, so the caption says that in time,
 * and the meter keeps the share for anyone who wants it as a shape.
 */
function readoutWindow(claim: Claim, now: number): string {
  if (!claim.deadline) return "no due date";
  /* An offer's clock belongs to the owner, not the agent, so it counts down to
     an answer rather than to a delivery. */
  if (claim.status === "offered" || claim.status === "expired") {
    const diff = claim.deadline - now;

    return diff < 0 ? "offer expired" : `${formatDuration(diff)} left to answer`;
  }
  if (claim.status === "completed") {
    const margin = claim.deadline - claim.updatedAt;

    return margin >= 0
      ? `landed ${formatDuration(margin)} early`
      : `landed ${formatDuration(-margin)} late`;
  }
  if (claim.status === "released") return "released at the due date";

  const diff = claim.deadline - now;

  return diff < 0
    ? `${formatDuration(-diff)} past the due date`
    : `${formatDuration(diff)} left on the due date`;
}
