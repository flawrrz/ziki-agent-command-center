"use client";

import { useState } from "react";
import { Pause, Play, SlidersHorizontal } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatCountdown, formatRelative, pluralize } from "@/lib/format";
import { presenceMeta } from "@/lib/demo-selectors";
import { LEVEL_LABELS } from "@/lib/types";
import type { AgentOrb } from "@/lib/board";
import { cn } from "@/lib/cn";
import { DeadlineRing, type RingTone } from "./deadline-ring";
import { AgentAvatar } from "./ui";

const STATE_TONE: Record<AgentOrb["state"], RingTone> = {
  waiting: "warn",
  running: "ok",
  quiet: "muted",
  paused: "muted",
};

const STATE_TEXT: Record<AgentOrb["state"], string> = {
  waiting: "Waiting on you",
  running: "Working",
  quiet: "Available",
  paused: "Paused",
};

export function AgentStrip({
  orbs,
  now,
  filter,
  onFilter,
}: {
  orbs: AgentOrb[];
  now: number;
  filter: string | null;
  onFilter: (agentId: string) => void;
}) {
  const { toggleAgentPause } = useDemo();
  const [panel, setPanel] = useState<string | null>(null);

  const sorted = [...orbs].sort((a, b) => {
    const rank = (orb: AgentOrb) =>
      orb.overdue ? 0 : orb.state === "waiting" ? 1 : orb.state === "running" ? 2 : orb.state === "paused" ? 4 : 3;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY);
  });

  const open = sorted.find((orb) => orb.agent.id === panel);

  return (
    <section aria-label="Agents" className="zk-card p-3.5 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="zk-label">Agents</h2>
        <span className="text-[11px] text-zk-muted">
          {orbs.filter((orb) => orb.state !== "paused").length} active ·{" "}
          {orbs.filter((orb) => orb.state === "waiting").length} waiting on you
        </span>
        <button
          type="button"
          onClick={() =>
            setPanel(panel ? null : (filter ?? sorted[0]?.agent.id ?? null))
          }
          className="zk-btn zk-btn-ghost zk-btn-xs ml-auto"
          aria-expanded={panel !== null}
        >
          <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
          Manage
        </button>
      </div>

      <ul className="flex items-start gap-1.5 overflow-x-auto pb-1">
        {sorted.map((orb) => {
          const tone: RingTone = orb.overdue ? "bad" : STATE_TONE[orb.state];
          const selected = filter === orb.agent.id;
          const showRing = Boolean(orb.deadline && orb.deadlineStart);

          const inner = (
            <span className="relative">
              {showRing ? (
                <DeadlineRing
                  start={orb.deadlineStart as number}
                  deadline={orb.deadline as number}
                  now={now}
                  size={46}
                  tone={tone}
                >
                  <AgentAvatar agent={orb.agent} size="sm" />
                </DeadlineRing>
              ) : (
                <>
                  <AgentAvatar agent={orb.agent} />
                  {orb.state === "running" ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zk-surface bg-zk-ok-fg"
                      aria-hidden="true"
                    />
                  ) : null}
                  {orb.state === "paused" ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zk-surface bg-zk-dot"
                      aria-hidden="true"
                    />
                  ) : null}
                </>
              )}
              {orb.waitingCount > 0 ? (
                <span
                  className={cn(
                    "absolute -left-1.5 -top-1 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white ring-2 ring-zk-surface",
                    orb.overdue ? "bg-zk-bad-fg" : "bg-electric-blue-strong",
                  )}
                >
                  {orb.waitingCount}
                </span>
              ) : null}
            </span>
          );

          return (
            <li key={orb.agent.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onFilter(orb.agent.id)}
                className={cn(
                  "relative flex w-[96px] flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 transition",
                  selected ? "bg-zk-chip" : "hover:bg-zk-hover",
                )}
                title={`${orb.agent.name} · ${STATE_TEXT[orb.state]}`}
                aria-pressed={selected}
              >
                {inner}
                <span className="w-full truncate text-center text-[11px] font-semibold text-zk-text">
                  {orb.agent.name}
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-[10px]",
                    tone === "bad"
                      ? "text-zk-bad-fg"
                      : tone === "warn"
                        ? "text-zk-warn-fg"
                        : "text-zk-muted",
                  )}
                >
                  {orb.state === "paused"
                    ? "paused"
                    : orb.waitingCount > 0
                      ? "needs you"
                      : orb.runningCount > 0
                        ? "working"
                        : "available"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {filter ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-zk-muted">
          <span>
            Showing work for{" "}
            <span className="font-semibold text-zk-text">
              {orbs.find((orb) => orb.agent.id === filter)?.agent.name}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onFilter(filter ?? "")}
            className="zk-btn zk-btn-ghost zk-btn-xs"
          >
            Clear
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="zk-inset mt-3 rounded-card p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {sorted.map((orb) => (
              <button
                key={`pick-${orb.agent.id}`}
                type="button"
                onClick={() => setPanel(orb.agent.id)}
                className={cn(
                  "zk-btn zk-btn-xs",
                  orb.agent.id === panel
                    ? "zk-btn-secondary"
                    : "zk-btn-ghost text-zk-muted",
                )}
              >
                {orb.agent.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[13px] font-bold text-zk-text">
              {open.agent.name}
            </span>
            <span className="zk-chip">{LEVEL_LABELS[open.agent.level]}</span>
            <span className="zk-chip">{open.agent.model}</span>
            <span className="text-[11px] text-zk-muted">
              {presenceMeta(open.agent).label} ·{" "}
              <span title={presenceMeta(open.agent).description}>
                heartbeat {formatRelative(open.agent.lastHeartbeat, now)}
              </span>
            </span>
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-zk-text2">
            Last action: {open.agent.lastAction.label}
            {open.agent.lastAction.issueNumber &&
            !open.agent.lastAction.label.includes(
              `#${open.agent.lastAction.issueNumber}`,
            )
              ? ` (#${open.agent.lastAction.issueNumber})`
              : ""}{" "}
            · {formatRelative(open.agent.lastAction.at, now)}
            {open.deadline
              ? ` · next deadline ${formatCountdown(open.deadline, now)}`
              : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zk-muted">
            <span className="zk-chip">
              {pluralize(open.agent.stats.acceptedFixes, "accepted fix")}
            </span>
            <span className="zk-chip">{pluralize(open.agent.stats.reviews, "review")}</span>
            <span className="zk-chip">
              {pluralize(open.agent.stats.releases, "release")}
            </span>
            {open.agent.areas.map((area) => (
              <span key={area} className="zk-chip zk-chip-info">
                {area}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAgentPause(open.agent.id)}
              className={cn(
                "zk-btn zk-btn-sm",
                open.agent.paused ? "zk-btn-primary" : "zk-btn-secondary",
              )}
            >
              {open.agent.paused ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {open.agent.paused ? "Resume agent" : "Pause agent"}
            </button>
            <p className="text-[11px] leading-relaxed text-zk-muted">
              {presenceMeta(open.agent).description}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
