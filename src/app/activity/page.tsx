"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  Inbox,
  Mail,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { claimGroup } from "@/lib/demo-selectors";
import { formatDuration, formatRelative, pluralize } from "@/lib/format";
import type { Agent, Claim, NeedItem, Outcome } from "@/lib/types";
import {
  Badge,
  EmptyState,
  IssueLink,
  PageHeader,
  PageSkeleton,
  SectionHeader,
  StatCard,
  TimeMeter,
} from "@/components/ui";
import { ActivityRow } from "@/components/activity-row";
import { cn } from "@/lib/cn";

type StateFilter = "all" | "active" | "offered" | "released";

const ATTENTION_KINDS: NeedItem["kind"][] = ["question", "approval", "claim"];

const ATTENTION_META: Record<
  "question" | "approval" | "claim",
  {
    label: string;
    action: string;
    icon: typeof HelpCircle;
    iconClass: string;
  }
> = {
  question: {
    label: "Question",
    action: "Answer",
    icon: HelpCircle,
    iconClass: "bg-[#3a2c0c] text-[#f6cf6b]",
  },
  approval: {
    label: "Approval",
    action: "Review gate",
    icon: ShieldCheck,
    iconClass: "bg-[#14294f] text-[#9cc2ff]",
  },
  claim: {
    label: "Stale claim",
    action: "Release or extend",
    icon: CircleAlert,
    iconClass: "bg-[#3a1517] text-[#fca5a0]",
  },
};

const FILTERS: Array<{ id: StateFilter; label: string }> = [
  { id: "all", label: "All work" },
  { id: "active", label: "Active" },
  { id: "offered", label: "Offers" },
  { id: "released", label: "Released" },
];

function matches(query: string, ...values: Array<string | number>): boolean {
  if (!query) return true;
  return values.join(" ").toLowerCase().includes(query);
}

function ActivityView() {
  const {
    ready,
    agents,
    now,
    claims,
    outcomes,
    openNeeds,
    expiredNeeds,
    needsCount,
    getAgent,
  } = useDemo();
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StateFilter>("all");
  const [issueFilter, setIssueFilter] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const parsed = Number(issueParam);
    setIssueFilter(
      issueParam && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );
    setVisibleCount(5);
  }, [issueParam]);

  if (!ready) return <PageSkeleton rows={5} />;

  const q = query.trim().toLowerCase();

  const attentionAll = openNeeds.filter((need) =>
    ATTENTION_KINDS.includes(need.kind),
  );
  const attention = attentionAll.filter(
    (need) =>
      (!issueFilter || need.issue.number === issueFilter) &&
      matches(q, need.title, need.detail, need.issue.number, `#${need.issue.number}`, need.issue.title, getAgent(need.agentId)?.name ?? ""),
  );

  const activeClaims = claims.filter((claim) => claimGroup(claim) === "active");
  const offeredClaims = claims.filter((claim) => claimGroup(claim) === "offered");
  const pendingOffers = offeredClaims.filter(
    (claim) => claim.status === "offered",
  );
  const acceptedFixes = outcomes.filter((outcome) => outcome.acceptedFix);
  const pausedClaims = activeClaims.filter((claim) => claim.status === "paused");
  const awaitingClaims = activeClaims.filter(
    (claim) => claim.status === "awaiting_owner",
  );

  const scopedClaims = claims.filter((claim) => {
    if (issueFilter && claim.issue.number !== issueFilter) return false;

    return matches(
      q,
      claim.issue.number,
      `#${claim.issue.number}`,
      claim.issue.title,
      claim.latestLabel,
      claim.nextStep,
      getAgent(claim.agentId)?.name ?? "",
    );
  });

  const filteredClaims = scopedClaims
    .filter((claim) => filter === "all" || claimGroup(claim) === filter)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const shownClaims = filteredClaims.slice(0, visibleCount);
  const remainingClaims = filteredClaims.length - shownClaims.length;

  const claimIssues = new Set(claims.map((claim) => claim.issue.number));
  const filteredOutcomes = outcomes
    .filter((outcome) => {
      if (claimIssues.has(outcome.issue.number)) return false;
      if (issueFilter && outcome.issue.number !== issueFilter) return false;

      return matches(
        q,
        outcome.issue.number,
        `#${outcome.issue.number}`,
        outcome.issue.title,
        outcome.label,
        getAgent(outcome.agentId)?.name ?? "",
      );
    })
    .sort((a, b) => b.at - a.at);

  const requestFor = (issueNumber: number) =>
    openNeeds.find((need) => need.issue.number === issueNumber) ??
    expiredNeeds.find((need) => need.issue.number === issueNumber);

  const filterCount = (id: StateFilter) => {
    if (id === "active") {
      return scopedClaims.filter((claim) => claimGroup(claim) === "active").length;
    }
    if (id === "offered") {
      return scopedClaims.filter((claim) => claimGroup(claim) === "offered").length;
    }
    if (id === "released") {
      return scopedClaims.filter((claim) => claimGroup(claim) === "released").length;
    }
    return scopedClaims.length;
  };

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setVisibleCount(5);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Zedu · Work history"
        title="Activity"
        description="What your agents did, what state each claim is in, and what still blocks them. Every claim is one row — heartbeats, reminders and re-offers update that row instead of creating noise."
        actions={
          <>
            <Link href="/agents" className="zk-btn zk-btn-secondary zk-btn-sm">
              Manage agents
            </Link>
            <Link href="/needs-you" className="zk-btn zk-btn-primary zk-btn-sm">
              Needs you
              {needsCount > 0 ? (
                <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-extrabold">
                  {needsCount}
                </span>
              ) : null}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Needs you"
          value={needsCount}
          hint="Questions, offers and approvals"
          icon={Inbox}
          tone="warn"
        />
        <StatCard
          label="Active claims"
          value={activeClaims.length}
          hint={
            <>
              {pausedClaims.length} paused · {awaitingClaims.length} awaiting you
            </>
          }
          icon={ActivityIcon}
          tone="info"
        />
        <StatCard
          label="Offers"
          value={offeredClaims.length}
          hint={`${pendingOffers.length} pending · ${
            offeredClaims.length - pendingOffers.length
          } expired`}
          icon={Mail}
          tone="info"
        />
        <StatCard
          label="Accepted fixes"
          value={acceptedFixes.length}
          hint="Recorded in the last 30 days"
          icon={CheckCircle2}
          tone="ok"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor="activity-search" className="sr-only">
            Search activity by issue, title or agent
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zk-muted"
            aria-hidden="true"
          />
          <input
            id="activity-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(5);
            }}
            placeholder="Search issue, title or agent"
            className="zk-input !pr-10 pl-10"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setVisibleCount(5);
              }}
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zk-muted transition hover:bg-zk-chip hover:text-zk-text"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {issueFilter ? (
            <span className="zk-chip zk-chip-info">
              Issue #{issueFilter}
              <Link
                href="/activity"
                scroll={false}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Clear issue filter</span>
              </Link>
            </span>
          ) : null}
          <p className="text-[11px] text-zk-muted">
            Search filters every section on this page.
          </p>
        </div>
      </div>

      <section aria-labelledby="waiting-on-you">
        <div id="waiting-on-you">
          <SectionHeader
            title="Waiting on you"
            description="Questions, pipeline gates and stale claims that block agent work. Decisions stay in the canonical Needs you queue."
            count={attention.length}
            action={
              <Link
                href="/needs-you"
                className="zk-btn zk-btn-ghost zk-btn-xs border border-zk-border"
              >
                Open full queue
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          />
        </div>

        {attention.length > 0 ? (
          <div className="zk-card divide-y divide-zk-divider overflow-hidden">
            {attention.map((need) => {
              const meta = ATTENTION_META[need.kind as keyof typeof ATTENTION_META];
              const Icon = meta.icon;
              const agent = getAgent(need.agentId);
              const due = need.expiresAt ?? need.claimReleaseAt;

              return (
                <div
                  key={need.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        meta.iconClass,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            need.kind === "claim"
                              ? "bad"
                              : need.kind === "approval"
                                ? "info"
                                : "warn"
                          }
                        >
                          {meta.label}
                        </Badge>
                        <IssueLink issue={need.issue} />
                        <span className="text-[10px] text-zk-muted">
                          {formatRelative(need.createdAt, now)}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-bold leading-snug text-zk-text">
                        {need.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zk-text2">
                        {need.detail}
                      </p>
                      {agent ? (
                        <p className="mt-1.5 text-[10px] text-zk-muted">
                          {agent.name} · owner {agent.owner}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    {due ? (
                      <TimeMeter
                        target={due}
                        now={now}
                        label={need.kind === "question" ? "Release" : undefined}
                      />
                    ) : need.kind === "claim" ? (
                      <Badge tone="bad">Past deadline</Badge>
                    ) : (
                      <span className="text-[10px] text-zk-muted">
                        Waiting {formatDuration(now - need.createdAt)}
                      </span>
                    )}
                    <Link
                      href={`/needs-you#${need.id}`}
                      className="zk-btn zk-btn-secondary zk-btn-xs"
                    >
                      {meta.action}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : q || issueFilter ? (
          <div className="zk-card flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-relaxed text-zk-muted">
              No requests match this view. The full queue may still have items.
            </p>
            <div className="flex flex-wrap gap-2">
              {q ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="zk-btn zk-btn-secondary zk-btn-xs"
                >
                  Clear search
                </button>
              ) : null}
              <Link
                href="/needs-you"
                className="zk-btn zk-btn-ghost zk-btn-xs border border-zk-border"
              >
                Open full queue
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Nothing waiting on you"
            description="No question, pipeline gate or stale claim is blocking an agent right now. New requests will appear here and in the queue."
            icon={CheckCircle2}
            action={
              <Link
                href="/agents"
                className="zk-btn zk-btn-secondary zk-btn-sm"
              >
                Review agent states
              </Link>
            }
          />
        )}
      </section>

      <section aria-labelledby="work-history">
        <div id="work-history">
          <SectionHeader
            title="Work history"
            description="One row per claim, newest state first. Expand a row for the full event chain with exact times — repeated cycles stay collapsed into the same claim."
            count={filteredClaims.length}
          />
        </div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Filter work history by claim state"
            className="inline-flex w-full gap-1 overflow-x-auto rounded-full bg-zk-seg p-1 sm:w-auto"
          >
            {FILTERS.map((item) => {
              const active = filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(item.id);
                    setVisibleCount(5);
                  }}
                  className={cn(
                    "min-h-[34px] shrink-0 rounded-full px-3.5 text-[12px] transition",
                    active
                      ? "bg-zk-surface font-bold text-zk-text shadow-sm"
                      : "font-medium text-zk-text2 hover:text-zk-text",
                  )}
                >
                  {item.label}
                  <span className="ml-1.5 text-[10px] text-zk-muted">
                    {filterCount(item.id)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zk-muted">
            Showing {shownClaims.length} of {pluralize(filteredClaims.length, "claim")}
          </p>
        </div>

        {filteredClaims.length === 0 ? (
          <EmptyState
            title="No claims match this view"
            description="Adjust the state filter or search to see more work history."
            icon={ActivityIcon}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Clear filters
                </button>
                {issueFilter ? (
                  <Link
                    href="/activity"
                    scroll={false}
                    className="zk-btn zk-btn-ghost zk-btn-sm border border-zk-border"
                  >
                    Clear issue #{issueFilter}
                  </Link>
                ) : null}
              </div>
            }
          />
        ) : (
          <>
            <div className="zk-card divide-y divide-zk-divider overflow-hidden">
              {shownClaims.map((claim: Claim) => (
                <ActivityRow
                  key={claim.id}
                  claim={claim}
                  agent={agents.find((agent: Agent) => agent.id === claim.agentId)}
                  request={requestFor(claim.issue.number)}
                  now={now}
                />
              ))}
            </div>
            {remainingClaims > 0 ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 5)}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Load 5 more
                  <span className="text-zk-muted">
                    · {remainingClaims} remaining
                  </span>
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {filteredOutcomes.length > 0 ? (
        <section>
          <SectionHeader
            title="Delivered outcomes"
            description="Accepted fixes and other completed work that is no longer an active claim."
            count={filteredOutcomes.length}
          />
          <div className="zk-card divide-y divide-zk-divider overflow-hidden">
            {filteredOutcomes.map((outcome: Outcome) => {
              const agent = getAgent(outcome.agentId);

              return (
                <div
                  key={outcome.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        outcome.acceptedFix
                          ? "bg-[#0f3326] text-[#6ee7a8]"
                          : "bg-zk-chip text-zk-text2",
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <IssueLink issue={outcome.issue} />
                        <Badge tone={outcome.acceptedFix ? "ok" : "neutral"}>
                          {outcome.label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-snug text-zk-text">
                        {outcome.issue.title}
                      </p>
                      {agent ? (
                        <p className="mt-1 text-[10px] text-zk-muted">
                          {agent.name} · {agent.model}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <time className="shrink-0 text-[11px] text-zk-muted">
                    {formatRelative(outcome.at, now)}
                  </time>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="zk-card grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
        <div>
          <p className="zk-label">One row per claim</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zk-text2">
            Heartbeats, reminders and re-offers update the same claim. #1149
            stays one chain across its three cycles instead of filling the feed.
          </p>
        </div>
        <div>
          <p className="zk-label">State first</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zk-text2">
            Each row leads with where the work stands, then timing and the next
            step. The event chain is one click away, not the main view.
          </p>
        </div>
        <div>
          <p className="zk-label">One inbox</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zk-text2">
            Requests waiting on you link back to the canonical Needs you queue.
            This page never creates a second place to act.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <ActivityView />
    </Suspense>
  );
}
