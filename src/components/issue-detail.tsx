"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatCountdown, formatDateTime, formatRelative } from "@/lib/format";
import type { Issue } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  AgentIdentity,
  Badge,
  EmptyState,
  PageSkeleton,
  PresenceBadge,
} from "./ui";
import { NeedCard } from "./need-card";

type TimelineRow = {
  id: string;
  at: number;
  label: string;
  detail?: string;
  tone: "neutral" | "info" | "warn" | "bad" | "ok";
  actor: string;
};

const TONE_DOT: Record<TimelineRow["tone"], string> = {
  neutral: "bg-zk-dot",
  info: "bg-zk-info-fg",
  warn: "bg-zk-warn-fg",
  bad: "bg-zk-bad-fg",
  ok: "bg-zk-ok-fg",
};

function IssueHeader({
  issue,
  statusLabel,
  statusTone,
}: {
  issue: Issue;
  statusLabel: string;
  statusTone: "ok" | "warn" | "bad" | "info" | "neutral";
}) {
  return (
    <header className="space-y-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zk-muted transition hover:text-zk-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Today
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="zk-label">
          #{issue.number} · {issue.project}
        </span>
        <Badge tone={statusTone}>{statusLabel}</Badge>
        <Badge
          tone={
            issue.priority === "High" || issue.priority === "Critical"
              ? "bad"
              : "neutral"
          }
        >
          {issue.priority}
        </Badge>
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="zk-btn zk-btn-ghost zk-btn-xs ml-auto"
        >
          Open in Ziki
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <h1 className="max-w-3xl text-[22px] font-bold leading-[1.2] tracking-[-0.025em] text-zk-text sm:text-[26px]">
        {issue.title}
      </h1>
    </header>
  );
}

export function IssueDetail({ number }: { number: number }) {
  const { ready, state, now } = useDemo();

  if (!ready || !state) return <PageSkeleton rows={3} />;

  const needs = state.needs.filter(
    (need) =>
      need.issue.number === number &&
      (need.status === "open" || need.status === "expired"),
  );
  const claimAgentId = needs[0]?.agentId;
  const claim = state.claims.find(
    (candidate) =>
      candidate.issue.number === number &&
      (!claimAgentId || candidate.agentId === claimAgentId),
  );
  const outcomes = state.outcomes.filter(
    (outcome) => outcome.issue.number === number,
  );
  const updates = state.updates.filter(
    (update) => update.issue.number === number,
  );

  const issue =
    needs[0]?.issue ?? claim?.issue ?? outcomes[0]?.issue ?? updates[0]?.issue;

  if (!issue) {
    return (
      <div className="space-y-4">
        <IssueHeader
          issue={{
            number,
            title: "This issue has no recorded agent activity",
            priority: "Low",
            project: "Zedu",
            url: "https://ziki.dev/dashboard",
          }}
          statusLabel="Unknown"
          statusTone="neutral"
        />
        <EmptyState
          title="Nothing tracked for this issue"
          description="The prototype only stores issues your agents have claimed, been offered or resolved."
          action={
            <Link href="/" className="zk-btn zk-btn-secondary zk-btn-sm">
              Back to Today
            </Link>
          }
        />
      </div>
    );
  }

  const agentId = needs[0]?.agentId ?? claim?.agentId ?? outcomes[0]?.agentId;
  const agent = state.agents.find((candidate) => candidate.id === agentId);

  const timelineAll: TimelineRow[] = [
    ...(claim
      ? claim.events.map((event, index) => ({
          id: `event-${claim.id}-${index}`,
          at: event.at,
          label: event.label,
          detail: event.detail,
          tone: /deadline passed|not recorded|overdue|released/i.test(event.label)
            ? ("bad" as const)
            : ("neutral" as const),
          actor: agent?.name ?? "Agent",
        }))
      : []),
    ...updates.map((update) => ({
      id: update.id,
      at: update.at,
      label: update.title,
      detail: update.detail,
      tone: update.actorRole.includes("Agent")
        ? ("neutral" as const)
        : ("ok" as const),
      actor: update.actorName,
    })),
    ...outcomes.map((outcome) => ({
      id: `outcome-${outcome.id}`,
      at: outcome.at,
      label: outcome.label,
      detail: undefined,
      tone: "ok" as const,
      actor:
        state.agents.find((candidate) => candidate.id === outcome.agentId)?.name ??
        "Agent",
    })),
  ].sort((a, b) => b.at - a.at);

  const seenEvents = new Set<string>();
  const timeline = timelineAll.filter((row) => {
    const key = `${row.label}|${Math.round(row.at / 60_000)}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });

  const statusLabel = needs.some((need) => need.kind === "claim")
    ? "Claim overdue"
    : needs.length > 0
      ? "Needs you"
      : claim
        ? claim.status === "completed"
          ? "Completed"
          : claim.status === "released"
            ? "Claim released"
            : "Running"
        : outcomes.length > 0
          ? "Shipped"
          : "No active work";

  const statusTone = needs.length > 0 ? "warn" : claim ? "info" : outcomes.length > 0 ? "ok" : "neutral";

  return (
    <div className="mx-auto max-w-[56rem] space-y-6">
      <IssueHeader issue={issue} statusLabel={statusLabel} statusTone={statusTone} />

      {needs.length > 0 ? (
        <section className="space-y-3">
          <p className="zk-label">Needs your decision</p>
          {needs.map((need) => (
            <NeedCard key={need.id} need={need} />
          ))}
        </section>
      ) : (
        <p className="zk-inset rounded-card px-4 py-3 text-[12px] leading-relaxed text-zk-muted">
          Nothing is waiting on you for this issue.
          {claim ? ` ${claim.nextStep}.` : ""}
        </p>
      )}

      {agent && needs.length === 0 ? (
        <section className="zk-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <AgentIdentity agent={agent} />
            <div className="ml-auto flex items-center gap-2">
              <PresenceBadge agent={agent} />
              <span className="zk-chip">{agent.model}</span>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-zk-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {claim
              ? `Claim state: ${claim.latestLabel}. ${claim.nextStep}.`
              : `${agent.name} has no claim on this issue right now.`}
            {claim?.deadline
              ? ` DeliverBy ${formatDateTime(claim.deadline)} (${formatCountdown(claim.deadline, now)}).`
              : ""}
          </p>
        </section>
      ) : null}

      <section>
        <p className="zk-label mb-3">What happened</p>
        {timeline.length === 0 ? (
          <p className="zk-inset rounded-card px-4 py-3 text-[12px] text-zk-muted">
            No recorded events for this issue.
          </p>
        ) : (
          <ol className="space-y-0 border-l-[3px] border-zk-divider pl-4">
            {timeline.map((row) => (
              <li key={row.id} className="relative py-2.5">
                <span
                  className={cn(
                    "absolute -left-[21px] top-[15px] h-2.5 w-2.5 rounded-full ring-2 ring-zk-bg",
                    TONE_DOT[row.tone],
                  )}
                  aria-hidden="true"
                />
                <p className="text-[12.5px] font-semibold leading-snug text-zk-text">
                  {row.label}
                </p>
                {row.detail ? (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-zk-muted">
                    {row.detail}
                  </p>
                ) : null}
                <p className="mt-1 text-[10.5px] text-zk-muted">
                  {formatDateTime(row.at)} · {row.actor} ·{" "}
                  {formatRelative(row.at, now)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="border-t border-zk-border pt-4 text-[12px]">
        <Link href="/" className="font-semibold text-zk-accent">
          Back to the board
        </Link>
      </p>
    </div>
  );
}
