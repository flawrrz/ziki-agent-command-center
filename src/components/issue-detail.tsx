"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { CELL_TEXT } from "@/lib/board";
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
import { CheckpointReadout } from "./checkpoint-rail";
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
        Back to dispatch
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="zk-label zk-num font-normal">
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
  const { ready, state, now, field } = useDemo();

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
          tone: /(deadline|due date) passed|not recorded|overdue|released/i.test(
            event.label,
          )
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

  const index = field?.cells.findIndex((cell) => cell.issue.number === number) ?? -1;
  const previous = index > 0 ? field?.cells[index - 1] : null;
  const next =
    field && index >= 0 && index < field.cells.length - 1
      ? field.cells[index + 1]
      : null;

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

      {claim ? (
        <section className="zk-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {agent ? <AgentIdentity agent={agent} compact /> : null}
            {agent ? (
              <div className="ml-auto flex items-center gap-2">
                <PresenceBadge agent={agent} />
                <span className="zk-chip">{agent.model}</span>
              </div>
            ) : null}
          </div>

          <CheckpointReadout claim={claim} now={now} />

          <p className="zk-num mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zk-muted">
            <span>{claim.latestLabel}</span>
            {claim.deadline ? (
              <span>
                {formatDateTime(claim.deadline)} ·{" "}
                {formatCountdown(claim.deadline, now)}
              </span>
            ) : null}
            {claim.cycles && claim.cycles > 1 ? (
              <span>cycle {claim.cycles}</span>
            ) : null}
          </p>
        </section>
      ) : (
        <p className="zk-inset px-4 py-3 text-[12px] leading-relaxed text-zk-muted">
          {agent
            ? `${agent.name} holds no claim on this issue.`
            : "No agent has claimed this issue."}
        </p>
      )}

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

      <nav
        className="flex items-stretch justify-between gap-3 border-t border-zk-divider pt-3"
        aria-label="Neighbouring issues"
      >
        {previous ? (
          <Link
            href={previous.href}
            prefetch={false}
            className="min-w-0 max-w-[48%] text-[12px] text-zk-muted transition hover:text-zk-text"
          >
            <span className="zk-num block text-[10px] uppercase tracking-[0.14em]">
              ← #{previous.issue.number} · {CELL_TEXT[previous.state]}
            </span>
            <span className="line-clamp-1">{previous.issue.title}</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="text-[12px] font-semibold text-zk-accent hover:underline"
          >
            ← Back to dispatch
          </Link>
        )}

        {next ? (
          <Link
            href={next.href}
            prefetch={false}
            className="min-w-0 max-w-[48%] text-right text-[12px] text-zk-muted transition hover:text-zk-text"
          >
            <span className="zk-num block text-[10px] uppercase tracking-[0.14em]">
              #{next.issue.number} · {CELL_TEXT[next.state]} →
            </span>
            <span className="line-clamp-1">{next.issue.title}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
