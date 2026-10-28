"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatRelative, pluralize } from "@/lib/format";
import type { Agent, Claim } from "@/lib/types";
import { LEVEL_LABELS } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  AgentAvatar,
  Badge,
  IssueLink,
  PresenceBadge,
  TimeMeter,
} from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

const WORK_META: Record<
  string,
  { label: string; tone: "bad" | "warn" | "info" | "neutral" | "ok" }
> = {
  overdue: { label: "Overdue", tone: "bad" },
  paused: { label: "Paused by question", tone: "warn" },
  awaiting_owner: { label: "Awaiting you", tone: "warn" },
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
};

const KIND_LABELS = {
  question: "question",
  offer: "offer",
  approval: "approval",
  claim: "claim",
};

type AgentEvent = {
  at: number;
  label: string;
  issue: Claim["issue"];
};

export function AgentCard({ agent }: { agent: Agent }) {
  const {
    claims,
    now,
    getAgentClaims,
    getAgentNeeds,
    toggleAgentPause,
  } = useDemo();
  const [expanded, setExpanded] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === `#agent-${agent.id}`) {
      setExpanded(true);
    }
  }, [agent.id]);

  const work = getAgentClaims(agent.id);
  const primaryWork = work[0];
  const pending = getAgentNeeds(agent.id);
  const workMeta = primaryWork ? WORK_META[primaryWork.status] : null;
  const pendingOffer = pending.some((need) => need.kind === "offer");
  const activeClaim = work[0];

  const recentEvents: AgentEvent[] = claims
    .filter((claim) => claim.agentId === agent.id)
    .flatMap((claim) =>
      claim.events.map((event) => ({
        at: event.at,
        label: event.label,
        issue: claim.issue,
      })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  return (
    <article
      id={`agent-${agent.id}`}
      className="zk-card zk-rise scroll-mt-24 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <AgentAvatar agent={agent} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-bold tracking-[-0.01em] text-zk-text">
                  {agent.name}
                </p>
                <Badge tone="accent">{LEVEL_LABELS[agent.level]}</Badge>
                {agent.personal ? (
                  <Badge tone="neutral">Personal</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-zk-muted">
                {agent.model} · owner {agent.owner}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() =>
                agent.paused ? toggleAgentPause(agent.id) : setConfirmPause(true)
              }
              className="zk-btn zk-btn-secondary zk-btn-xs"
            >
              {agent.paused ? (
                <Play className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Pause className="h-3 w-3" aria-hidden="true" />
              )}
              {agent.paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="zk-btn zk-btn-ghost zk-btn-xs border border-zk-border"
              aria-expanded={expanded}
              aria-controls={`agent-details-${agent.id}`}
            >
              View work
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="zk-inset mt-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="zk-label">Presence</p>
            <div className="mt-1.5">
              <PresenceBadge agent={agent} />
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-zk-muted">
              {agent.paused
                ? "Paused by owner"
                : `Heartbeat ${formatRelative(agent.lastHeartbeat, now)}`}
            </p>
          </div>

          <div className="min-w-0 sm:border-l sm:border-zk-divider sm:pl-3">
            <p className="zk-label">Work</p>
            {primaryWork ? (
              <div className="mt-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <IssueLink issue={primaryWork.issue} />
                  {workMeta ? <Badge tone={workMeta.tone}>{workMeta.label}</Badge> : null}
                  {work.length > 1 ? (
                    <span className="text-[10px] text-zk-muted">
                      +{work.length - 1} more
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-zk-text2">
                  {primaryWork.issue.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {primaryWork.deadline ? (
                    <TimeMeter
                      target={primaryWork.deadline}
                      now={now}
                      className="min-h-[1.3rem] px-2 text-[10px]"
                    />
                  ) : null}
                  <span className="text-[10px] text-zk-muted">
                    {primaryWork.nextStep}
                  </span>
                </div>
                {agent.paused ? (
                  <p className="mt-1 text-[10px] text-zk-warn-fg">
                    Pausing does not release this claim.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-1.5">
                <p className="text-[12px] font-semibold text-zk-text2">
                  No active claim
                </p>
                <p className="mt-0.5 text-[10px] text-zk-muted">
                  Last: {agent.lastAction.label} ·{" "}
                  {formatRelative(agent.lastAction.at, now)}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 sm:border-l sm:border-zk-divider sm:pl-3">
            <p className="zk-label">Attention</p>
            {pending.length > 0 ? (
              <div className="mt-1.5 space-y-1.5">
                <Badge tone="warn">{pluralize(pending.length, "request")}</Badge>
                {pending.slice(0, 2).map((need) => (
                  <Link
                    key={need.id}
                    href={`/needs-you#${need.id}`}
                    className="block text-[10px] leading-snug text-zk-accent hover:text-zk-text"
                  >
                    {need.kind === "claim"
                      ? "Claim needs reconciliation"
                      : need.kind === "offer"
                        ? "Offer awaiting decision"
                        : need.kind === "approval"
                          ? "Pipeline approval"
                          : "Question awaiting answer"}{" "}
                    · #{need.issue.number}
                  </Link>
                ))}
                {pending.length > 2 ? (
                  <p className="text-[10px] text-zk-muted">
                    +{pending.length - 2} more
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-1.5">
                <Badge tone="ok">Nothing pending</Badge>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-[10px] text-zk-muted">
          Last action: {agent.lastAction.label} ·{" "}
          {formatRelative(agent.lastAction.at, now)}
        </p>

        {expanded ? (
          <div
            id={`agent-details-${agent.id}`}
            className="mt-4 grid gap-4 border-t border-zk-divider pt-4 sm:grid-cols-2"
          >
            <p className="text-[10px] text-zk-muted sm:col-span-2">
              Last 30 days: {pluralize(agent.stats.acceptedFixes, "accepted fix")}
              {" · "}
              {pluralize(agent.stats.reviews, "review")}
              {" · "}
              {pluralize(agent.stats.releases, "release")}
            </p>

            <div>
              <p className="zk-label">Recent actions</p>
              {recentEvents.length > 0 ? (
                <ul className="mt-2 space-y-2.5">
                  {recentEvents.map((event, index) => (
                    <li key={`${event.at}-${index}`} className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zk-dot"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-snug text-zk-text2">
                          {event.label}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-zk-muted">
                          <IssueLink issue={event.issue} />
                          <span aria-hidden="true">·</span>
                          <span>{formatRelative(event.at, now)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-zk-muted">
                  No recorded actions yet.
                </p>
              )}
            </div>

            <div>
              <p className="zk-label">Waiting on you</p>
              {pending.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {pending.map((need) => (
                    <li key={need.id}>
                      <Link
                        href={`/needs-you#${need.id}`}
                        className="block rounded-xl border border-zk-divider px-3 py-2 transition hover:border-zk-border-strong hover:bg-zk-hover"
                      >
                        <p className="line-clamp-1 text-[11px] font-bold text-zk-text">
                          {need.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zk-muted">
                          {KIND_LABELS[need.kind]} · #{need.issue.number} ·{" "}
                          {formatRelative(need.createdAt, now)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-zk-muted">
                  No requests waiting on you.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-zk-dashed px-3 py-2.5">
                <span className="zk-label">Preferred areas</span>
                {agent.areas.map((area) => (
                  <span key={area} className="zk-chip">
                    {area}
                  </span>
                ))}
                <a
                  href="https://ziki.dev/settings/agents"
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-zk-accent hover:text-zk-text"
                >
                  Keys & model live in Ziki settings
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmPause}
        title={`Pause ${agent.name}?`}
        body={`Pausing stops new offers.${
          activeClaim
            ? ` It does not release claim #${activeClaim.issue.number}, which stays active.`
            : " There is no active claim to release."
        }${
          pendingOffer
            ? " A pending offer is not withdrawn automatically."
            : ""
        }`}
        confirmLabel="Pause agent"
        tone="primary"
        onCancel={() => setConfirmPause(false)}
        onConfirm={() => {
          toggleAgentPause(agent.id);
          setConfirmPause(false);
        }}
      />
    </article>
  );
}
