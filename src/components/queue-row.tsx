import Link from "next/link";
import { type BoardCard } from "@/lib/board";
import { claimProgress, CHECKPOINTS } from "@/lib/progress";
import { formatDuration, formatRelative, initials } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CheckpointRail } from "./checkpoint-rail";

function clockText(card: BoardCard, now: number): string {
  if (card.rail === "shipped") return formatRelative(card.at, now);
  if (!card.deadline) {
    return card.rail === "waiting" && card.need
      ? formatDuration(now - card.at)
      : "—";
  }

  const diff = card.deadline - now;

  return diff < 0 ? `${formatDuration(-diff)} over` : formatDuration(diff);
}

/**
 * One line per card, aligned to fixed columns so the eye reads clocks and rails
 * as vertical strips rather than sentences.
 */
export function QueueRow({
  card,
  now,
  isNew,
}: {
  card: BoardCard;
  now: number;
  isNew: boolean;
}) {
  const clock = clockText(card, now);
  const claim = card.claim;
  const shipped = card.rail === "shipped";
  const progress = claim ? claimProgress(claim, now) : null;
  const stage = progress?.stage ?? -1;
  const stageCode = progress && stage >= 0 ? CHECKPOINTS[stage].code : "—";
  const late = card.overdue || Boolean(progress?.stalled);

  return (
    <li className="border-b border-zk-divider last:border-b-0">
      <Link
        href={card.href}
        className="group -mx-2 flex items-center gap-2 px-2 py-[7px] transition-colors hover:bg-zk-hover sm:gap-3"
      >
        <span
          className={cn(
            "h-3.5 w-[2px] shrink-0",
            card.rail === "waiting"
              ? "bg-zk-accent"
              : card.rail === "shipped"
                ? "bg-zk-ok-fg"
                : late
                  ? "bg-zk-bad-fg"
                  : "bg-zk-info-fg",
          )}
          aria-hidden="true"
        />

        <span className="zk-num w-[46px] shrink-0 text-[11px] font-bold text-zk-muted group-hover:text-zk-text2 sm:w-[54px]">
          #{card.issue.number}
        </span>

        {card.agent ? (
          <span
            className="zk-avatar h-5 w-5 shrink-0 bg-zk-chip text-[9px] text-zk-text2"
            title={`${card.agent.name}${card.agent.paused ? " · paused" : ""}`}
            aria-hidden="true"
          >
            {initials(card.agent.name)}
          </span>
        ) : null}

        <span className="min-w-0 flex-1 truncate text-[13px] text-zk-text">
          {card.tag}
        </span>

        {isNew ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-zk-accent"
            title="Moved since your last visit"
          />
        ) : null}

        {claim && card.rail !== "waiting" ? (
          <>
            <CheckpointRail
              claim={claim}
              now={now}
              className="hidden w-[64px] shrink-0 sm:flex"
            />
            {/* Where there is room, name the stage instead of leaving it to the
                legend. Below sm the five cells would be unreadable, so the row
                falls back to the count. */}
            <span
              className={cn(
                "hidden w-[26px] shrink-0 text-[10px] font-bold tracking-[0.04em] xl:inline",
                shipped ? "text-zk-ok-fg" : "text-zk-info-fg",
              )}
            >
              {stageCode}
            </span>
            <span
              className={cn(
                "zk-num w-[30px] shrink-0 text-right text-[10px] sm:hidden",
                shipped ? "text-zk-ok-fg" : "text-zk-info-fg",
              )}
            >
              {stage < 0 ? "0/5" : `${stage + 1}/5`}
            </span>
          </>
        ) : null}

        <span
          className={cn(
            "zk-num shrink-0 whitespace-nowrap text-right text-[11px] sm:w-[62px]",
            late ? "font-bold text-zk-bad-fg" : "text-zk-muted",
          )}
        >
          {clock}
        </span>

        {card.verb ? (
          <span className="hidden w-[62px] shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-zk-accent sm:block">
            {card.verb}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
