import Link from "next/link";
import { Check } from "lucide-react";
import { cardTone, cardWindow, type BoardCard } from "@/lib/board";
import { formatDuration, formatRelative } from "@/lib/format";
import { presenceMeta } from "@/lib/demo-selectors";
import { avatarTone, initials } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DeadlineRing } from "./deadline-ring";

const PRESENCE_DOT: Record<string, string> = {
  ok: "bg-zk-ok-fg",
  warn: "bg-zk-warn-fg",
  bad: "bg-zk-bad-fg",
  muted: "bg-zk-dot",
};

function PresenceAvatar({ card }: { card: BoardCard }) {
  if (!card.agent) return null;
  const meta = presenceMeta(card.agent);

  return (
    <span
      className={cn(
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
        avatarTone(card.agent.id),
        card.agent.paused && "opacity-55",
      )}
      title={`${card.agent.name} · ${meta.label}`}
      aria-hidden="true"
    >
      {initials(card.agent.name)}
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zk-surface",
          PRESENCE_DOT[meta.tone] ?? "bg-zk-dot",
        )}
      />
    </span>
  );
}

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

export function QueueRow({
  card,
  now,
  isNew,
}: {
  card: BoardCard;
  now: number;
  isNew: boolean;
}) {
  const window = cardWindow(card);
  const clock = clockText(card, now);
  const hot = card.issue.priority === "High" || card.issue.priority === "Critical";

  return (
    <li className="border-b border-zk-divider last:border-b-0">
      <Link
        href={card.href}
        className="group -mx-3 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-zk-hover sm:gap-3"
      >
        <PresenceAvatar card={card} />

        <span
          className={cn(
            "w-[46px] shrink-0 text-[12px] font-bold tabular-nums tracking-tight sm:w-[52px]",
            hot ? "text-zk-warn-fg" : "text-zk-muted",
          )}
        >
          #{card.issue.number}
        </span>

        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zk-text">
          {card.tag}
        </span>

        {isNew ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-zk-accent"
            title="Moved since your last visit"
          />
        ) : null}

        <span className="flex shrink-0 items-center gap-2.5">
          {window ? (
            <DeadlineRing
              start={window.start}
              deadline={card.deadline as number}
              now={now}
              size={15}
              tone={cardTone(card, now)}
            />
          ) : card.rail === "shipped" ? (
            <Check className="h-3.5 w-3.5 text-zk-ok-fg" aria-hidden="true" />
          ) : null}

          <span
            className={cn(
              "shrink-0 whitespace-nowrap text-right text-[12px] tabular-nums sm:w-[58px]",
              card.overdue ? "font-semibold text-zk-bad-fg" : "text-zk-muted",
            )}
          >
            {clock}
          </span>

          {card.verb ? (
            <span className="hidden w-[54px] text-right text-[12px] font-semibold text-zk-accent-strong opacity-70 transition-opacity group-hover:opacity-100 sm:block">
              {card.verb}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
