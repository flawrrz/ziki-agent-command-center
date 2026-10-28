"use client";

import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { cardTone, cardWindow, type BoardCard } from "@/lib/board";
import { cn } from "@/lib/cn";
import { DeadlineRing } from "./deadline-ring";
import { AgentAvatar } from "./ui";

const TONE_TEXT: Record<ReturnType<typeof cardTone>, string> = {
  bad: "text-zk-bad-fg",
  warn: "text-zk-warn-fg",
  ok: "text-zk-ok-fg",
  muted: "text-zk-muted",
};

export function WorkCard({
  card,
  now,
  agentFilter,
  onAgentSelect,
}: {
  card: BoardCard;
  now: number;
  agentFilter: string | null;
  onAgentSelect: (agentId: string) => void;
}) {
  const tone = cardTone(card, now);
  const clock = cardWindow(card);
  const shipped = card.rail === "shipped";
  const highlight =
    card.agent && agentFilter && card.agent.id === agentFilter
      ? "border-zk-border-strong bg-zk-surface-2"
      : "";

  return (
    <article
      className={cn(
        "zk-card zk-card-interactive zk-rise scroll-mt-24 p-3.5",
        highlight,
      )}
    >
      <div className="flex items-center gap-2">
        <Link
          href={card.href}
          className="text-[11px] font-bold tracking-[0.02em] text-zk-muted transition hover:text-zk-accent"
        >
          #{card.issue.number}
        </Link>
        {card.issue.priority === "High" || card.issue.priority === "Critical" ? (
          <span className="zk-chip zk-chip-bad min-h-0 py-0.5 text-[10px]">
            {card.issue.priority}
          </span>
        ) : null}

        <span className="ml-auto flex items-center gap-1.5">
          {!shipped && clock ? (
            <DeadlineRing
              start={clock.start}
              deadline={clock.end}
              now={now}
              tone={tone}
            />
          ) : null}
          <span className="text-[11px] font-medium text-zk-muted">
            {formatRelative(card.at, now)}
          </span>
        </span>
      </div>

      <h3 className="mt-2 text-[13.5px] font-bold leading-snug tracking-[-0.01em] text-zk-text">
        <Link href={card.href} className="transition hover:text-zk-accent">
          {card.headline}
        </Link>
      </h3>

      {!shipped && card.consequence ? (
        <p className={cn("mt-1.5 text-[11.5px] font-semibold", TONE_TEXT[tone])}>
          {card.consequence}
        </p>
      ) : null}

      {!card.detail || shipped ? null : (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zk-muted">
          {card.detail}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {card.agent ? (
          <button
            type="button"
            onClick={() => onAgentSelect(card.agent?.id ?? "")}
            className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-left transition hover:bg-zk-hover"
            title={`Filter the board by ${card.agent.name}`}
          >
            <AgentAvatar agent={card.agent} size="sm" />
            <span className="truncate text-[12px] font-semibold text-zk-text2">
              {card.agent.name}
            </span>
          </button>
        ) : null}

        <span className="ml-auto flex items-center gap-1.5">
          {card.verb ? (
            <Link href={card.href} className="zk-btn zk-btn-primary zk-btn-xs">
              {card.verb}
            </Link>
          ) : shipped ? (
            <a
              href={card.issue.url}
              target="_blank"
              rel="noreferrer"
              className="zk-btn zk-btn-ghost zk-btn-xs"
            >
              Ziki
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <Link href={card.href} className="zk-btn zk-btn-ghost zk-btn-xs">
              Detail
            </Link>
          )}
          {shipped && card.outcome?.acceptedFix ? (
            <span className="zk-chip zk-chip-ok min-h-0 py-0.5">
              <Check className="h-3 w-3" aria-hidden="true" />
              Accepted
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}
