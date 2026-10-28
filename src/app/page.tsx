"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Mail,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatRelative, pluralize } from "@/lib/format";
import type { Claim, NeedItem } from "@/lib/types";
import {
  AgentAvatar,
  AgentIdentity,
  Badge,
  IssueLink,
  PageHeader,
  PageSkeleton,
  PresenceBadge,
  SectionHeader,
  StatCard,
  TimeMeter,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const WORK_META: Record<
  string,
  { label: string; tone: "bad" | "warn" | "info" | "neutral" | "ok" }
> = {
  overdue: { label: "Overdue", tone: "bad" },
  paused: { label: "Paused", tone: "warn" },
  awaiting_owner: { label: "Awaiting you", tone: "warn" },
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
};

const NEED_ICONS = {
  question: Inbox,
  offer: Mail,
  approval: ShieldCheck,
  claim: AlertTriangle,
};

function needDeadline(need: NeedItem, claims: Claim[]): number | undefined {
  if (need.kind === "claim") {
    return claims.find(
      (claim) =>
        claim.agentId === need.agentId &&
        claim.issue.number === need.issue.number,
    )?.deadline;
  }

  return need.expiresAt ?? need.claimReleaseAt;
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return <p className="zk-label mb-1 lg:hidden">{children}</p>;
}

export default function DashboardPage() {
  const {
    ready,
    agents,
    claims,
    outcomes,
    openNeeds,
    needsCount,
    getAgentClaims,
    getAgentNeeds,
    now,
  } = useDemo();

  if (!ready) return <PageSkeleton rows={5} />;

  const activeClaims = claims.filter((claim) =>
    ["active", "overdue", "paused", "awaiting_owner"].includes(claim.status),
  );
  const overdueClaims = activeClaims.filter((claim) => claim.status === "overdue");
  const pausedClaims = activeClaims.filter((claim) => claim.status === "paused");
  const onlineAgents = agents.filter(
    (agent) => !agent.paused && agent.presence === "online",
  );
  const acceptedFixes = agents.reduce(
    (sum, agent) => sum + agent.stats.acceptedFixes,
    0,
  );
  const sortedOutcomes = [...outcomes].sort((a, b) => b.at - a.at);
  const topNeeds = openNeeds.slice(0, 3);
  const needMix = [
    { kind: "question" as const, label: "question" },
    { kind: "offer" as const, label: "offer" },
    { kind: "approval" as const, label: "approval" },
    { kind: "claim" as const, label: "claim" },
  ]
    .map(({ kind, label }) => ({
      count: openNeeds.filter((need) => need.kind === kind).length,
      label,
    }))
    .filter((entry) => entry.count > 0)
    .map((entry) => pluralize(entry.count, entry.label))
    .join(" · ");
  const overdueNeed = openNeeds.find((need) => need.kind === "claim");
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Zedu · ${todayLabel}`}
        title="Welcome back, Fawaz"
        description="What your agents did, what is running now, and what still needs a decision from you."
        actions={
          <>
            <Link href="/agents" className="zk-btn zk-btn-secondary zk-btn-sm">
              Manage agents
            </Link>
            <Link href="/needs-you" className="zk-btn zk-btn-primary zk-btn-sm">
              {needsCount > 0
                ? `Review ${needsCount} ${needsCount === 1 ? "request" : "requests"}`
                : "Open queue"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Needs you"
          value={needsCount}
          hint={needsCount > 0 ? needMix : "Your queue is clear"}
          icon={Inbox}
          tone="warn"
        />
        <StatCard
          label="Active claims"
          value={activeClaims.length}
          hint={
            overdueClaims.length > 0
              ? `${overdueClaims.length} overdue · ${pausedClaims.length} paused`
              : `${pausedClaims.length} paused by questions`
          }
          icon={Timer}
          tone={overdueClaims.length > 0 ? "bad" : "info"}
        />
        <StatCard
          label="Agents online"
          value={`${onlineAgents.length} / ${agents.length}`}
          hint={`${agents.filter((agent) => getAgentClaims(agent.id).length > 0).length} have current work`}
          icon={Bot}
          tone="ok"
        />
        <StatCard
          label="Accepted fixes"
          value={acceptedFixes}
          hint="Last 30 days"
          icon={CheckCircle2}
          tone="info"
        />
      </div>

      {overdueClaims.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[20px] border border-zk-bad-bd bg-zk-bad-soft p-4 sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zk-bad-bg text-zk-bad-fg">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-zk-on-bad">
              {pluralize(overdueClaims.length, "claim")} past deliverBy
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zk-bad-fg">
              Heartbeats do not move the deadline.
            </p>
          </div>
          <Link
            href={
              overdueNeed
                ? `/needs-you#${overdueNeed.id}`
                : "/needs-you"
            }
            className="zk-btn zk-btn-secondary zk-btn-sm shrink-0"
          >
            Resolve claim
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <section>
        <SectionHeader
          title="Your agents today"
          description="Presence and work are tracked separately — an offline agent can still hold a claim."
          count={agents.length}
          action={
            <Link href="/agents" className="zk-btn zk-btn-ghost zk-btn-xs">
              Manage agents
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="zk-card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_28px] gap-3 border-b border-zk-border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-zk-muted lg:grid">
            <span>Agent</span>
            <span>Presence</span>
            <span>Current work</span>
            <span>Needs you</span>
            <span className="sr-only">Open</span>
          </div>

          <div className="divide-y divide-zk-divider">
            {agents.map((agent) => {
              const work = getAgentClaims(agent.id);
              const primaryWork = work[0];
              const pendingNeeds = getAgentNeeds(agent.id);
              const workMeta = primaryWork ? WORK_META[primaryWork.status] : null;

              return (
                <div
                  key={agent.id}
                  className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_28px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <AgentIdentity agent={agent} />
                    <Link
                      href={`/agents#agent-${agent.id}`}
                      className="zk-btn zk-btn-ghost zk-btn-xs !px-2 lg:hidden"
                      aria-label={`Open ${agent.name}`}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div>
                    <MobileLabel>Presence</MobileLabel>
                    <PresenceBadge agent={agent} />
                    <p className="mt-1 text-[10px] text-zk-muted">
                      {agent.paused
                        ? "No new offers"
                        : `Heartbeat ${formatRelative(agent.lastHeartbeat, now)}`}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>Current work</MobileLabel>
                    {primaryWork ? (
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <IssueLink issue={primaryWork.issue} />
                          {workMeta ? (
                            <Badge tone={workMeta.tone}>{workMeta.label}</Badge>
                          ) : null}
                          {work.length > 1 ? (
                            <span className="text-[10px] text-zk-muted">
                              +{work.length - 1} more
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-zk-muted">
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
                      </div>
                    ) : (
                      <div>
                        <p className="text-[12px] font-semibold text-zk-text2">
                          No active claim
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-zk-muted">
                          Last: {agent.lastAction.label} ·{" "}
                          {formatRelative(agent.lastAction.at, now)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <MobileLabel>Needs you</MobileLabel>
                    {pendingNeeds.length > 0 ? (
                      <Link
                        href={`/needs-you#${pendingNeeds[0].id}`}
                        className="inline-flex"
                      >
                        <Badge tone="warn">{pendingNeeds.length} pending</Badge>
                      </Link>
                    ) : (
                      <Badge tone="ok">Clear</Badge>
                    )}
                  </div>

                  <Link
                    href={`/agents#agent-${agent.id}`}
                    className="hidden h-7 w-7 items-center justify-center rounded-full text-zk-muted transition hover:bg-zk-chip hover:text-zk-text lg:inline-flex"
                    aria-label={`Open ${agent.name}`}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <section>
          <SectionHeader
            title="Needs you now"
            description="Nearest deadlines first."
            count={openNeeds.length}
            action={
              <Link href="/needs-you" className="zk-btn zk-btn-ghost zk-btn-xs">
                View all
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />

          {topNeeds.length === 0 ? (
            <div className="zk-card flex items-start gap-3 p-4">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-zk-ok-fg"
                aria-hidden="true"
              />
              <div>
                <p className="text-[13px] font-bold text-zk-text">
                  Nothing needs you right now
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zk-muted">
                  Agents will ask here when a decision needs a human.
                </p>
              </div>
            </div>
          ) : (
            <div className="zk-card divide-y divide-zk-divider overflow-hidden">
              {topNeeds.map((need) => {
                const agent = agents.find(
                  (candidate) => candidate.id === need.agentId,
                );
                const Icon = NEED_ICONS[need.kind];
                const deadline = needDeadline(need, claims);

                return (
                  <Link
                    key={need.id}
                    href={`/needs-you#${need.id}`}
                    className="flex items-start gap-3 p-4 transition hover:bg-zk-chip/40"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        need.kind === "claim"
                          ? "bg-zk-bad-bg text-zk-bad-fg"
                          : need.kind === "offer"
                            ? "bg-zk-warn-bg text-zk-warn-fg"
                            : "bg-zk-info-bg text-zk-info-fg",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-bold leading-snug text-zk-text">
                        {need.title}
                      </p>
                      <p className="mt-1 text-[10px] text-zk-muted">
                        {agent?.name ?? "Agent"} · #{need.issue.number} ·{" "}
                        {need.kind === "claim"
                          ? "stale claim"
                          : need.kind === "approval"
                            ? "pipeline gate"
                            : need.kind}
                      </p>
                    </div>
                    <span className="shrink-0">
                      {deadline ? (
                        <TimeMeter
                          target={deadline}
                          now={now}
                          className="min-h-[1.35rem] px-2 text-[10px]"
                        />
                      ) : (
                        <ChevronRight
                          className="h-4 w-4 text-zk-muted"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            title="Latest outcomes"
            description="Recorded work from the last 30 days."
            action={
              <Link href="/activity" className="zk-btn zk-btn-ghost zk-btn-xs">
                Activity
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />

          <div className="zk-card divide-y divide-zk-divider overflow-hidden">
            {sortedOutcomes.slice(0, 4).map((outcome) => {
              const agent = agents.find(
                (candidate) => candidate.id === outcome.agentId,
              );

              if (!agent) return null;

              return (
                <div key={outcome.id} className="flex items-start gap-3 p-3.5">
                  <AgentAvatar agent={agent} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12px] font-bold text-zk-text">
                      {outcome.label}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-zk-muted">
                      <span>{agent.name}</span>
                      <span aria-hidden="true">·</span>
                      <IssueLink issue={outcome.issue} />
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {outcome.acceptedFix ? (
                      <Badge tone="ok">Accepted</Badge>
                    ) : null}
                    <p className="mt-1 text-[9px] text-zk-muted">
                      {formatRelative(outcome.at, now)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

    </div>
  );
}
