"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Inbox,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatCountdown, formatRelative, pluralize } from "@/lib/format";
import type { NeedKind } from "@/lib/types";
import {
  Badge,
  EmptyState,
  IssueLink,
  PageHeader,
  PageSkeleton,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import { NeedCard } from "@/components/need-card";
import { cn } from "@/lib/cn";

type Filter = "all" | NeedKind;

export default function NeedsYouPage() {
  const {
    ready,
    agents,
    now,
    openNeeds,
    expiredNeeds,
    resolvedNeeds,
    needsCount,
  } = useDemo();
  const [filter, setFilter] = useState<Filter>("all");

  if (!ready) return <PageSkeleton rows={5} />;

  const questions = openNeeds.filter((need) => need.kind === "question");
  const offers = openNeeds.filter((need) => need.kind === "offer");
  const approvals = openNeeds.filter((need) => need.kind === "approval");
  const claims = openNeeds.filter((need) => need.kind === "claim");
  const nextOffer = offers
    .map((offer) => offer.expiresAt)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b)[0];

  const visible =
    filter === "all"
      ? openNeeds
      : openNeeds.filter((need) => need.kind === filter);
  const showExpired =
    expiredNeeds.length > 0 && (filter === "all" || filter === "offer");

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "All", count: openNeeds.length },
    { id: "question", label: "Questions", count: questions.length },
    { id: "offer", label: "Offers", count: offers.length },
    { id: "approval", label: "Approvals", count: approvals.length },
    { id: "claim", label: "Claims", count: claims.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Zedu · Human–agent queue"
        title="Needs you"
        description="One canonical queue for every question, offer, approval and stale claim from your agents. Cards are ordered by deadline and each one states what happens if you wait."
        actions={
          <>
            <Link href="/agents" className="zk-btn zk-btn-secondary zk-btn-sm">
              Manage agents
            </Link>
            <Link href="/activity" className="zk-btn zk-btn-primary zk-btn-sm">
              View activity
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-dashed border-[#2a3f61] bg-zk-seg/40 px-4 py-3 text-[11px] leading-relaxed text-zk-muted">
        <span>
          <strong className="text-zk-text2">Offers</strong> expire after 30m
        </span>
        <span>
          <strong className="text-zk-text2">Questions</strong> release a claim
          after 4h unanswered
        </span>
        <span>
          <strong className="text-zk-text2">Heartbeats</strong> are expected
          every 15m
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[#9cc2ff]">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Timers are live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Needs you"
          value={needsCount}
          hint={
            <>
              {claims.length > 0
                ? pluralize(claims.length, "stale claim")
                : "No stale claims"}
              {offers.length > 0 ? ` · ${pluralize(offers.length, "offer")}` : ""}
            </>
          }
          icon={Inbox}
          tone="warn"
        />
        <StatCard
          label="Questions"
          value={questions.length}
          hint="Answers resume paused work"
          icon={HelpCircle}
          tone="info"
        />
        <StatCard
          label="Offers"
          value={offers.length}
          hint={
            nextOffer
              ? `Next expires in ${formatCountdown(nextOffer, now).replace(" left", "")}`
              : "No pending offers"
          }
          icon={Mail}
          tone="info"
        />
        <StatCard
          label="Pipeline approvals"
          value={approvals.length}
          hint="Workspace-owner decisions"
          icon={ShieldCheck}
          tone="info"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter requests by type"
          className="inline-flex w-full gap-1 overflow-x-auto rounded-full bg-zk-seg p-1 sm:w-auto"
        >
          {filters.map((item) => {
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-[34px] shrink-0 rounded-full px-3.5 text-[12px] transition",
                  active
                    ? "bg-zk-surface font-bold text-zk-text shadow-sm"
                    : "font-medium text-zk-text2 hover:text-zk-text",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "ml-1.5 text-[10px]",
                    active ? "text-zk-muted" : "text-zk-muted",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zk-muted">
          Showing {visible.length} of {openNeeds.length} open
        </p>
      </div>

      <section aria-labelledby="open-requests">
        <div id="open-requests">
          <SectionHeader
            title="Open requests"
            description="Overdue claims come first, then the nearest expiring offer or approval. Questions show when their claim would be released."
            count={visible.length}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="Nothing in this filter"
            description="Try another type, or view everything that still needs a decision."
            action={
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="zk-btn zk-btn-secondary zk-btn-sm"
              >
                Clear filter
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((need) => (
              <NeedCard key={need.id} need={need} />
            ))}
          </div>
        )}
      </section>

      {showExpired ? (
        <section>
          <SectionHeader
            title="Expired offers"
            description="These offers never started a claim. Re-offer them or leave the issue open."
            count={expiredNeeds.length}
          />
          <div className="space-y-3">
            {expiredNeeds.map((need) => (
              <NeedCard key={need.id} need={need} />
            ))}
          </div>
        </section>
      ) : null}

      {resolvedNeeds.length > 0 ? (
        <section>
          <SectionHeader
            title="Resolved in this session"
            description="Actions are recorded locally for this demo. Resolutions stay visible instead of disappearing from the queue."
            count={resolvedNeeds.length}
          />
          <div className="zk-card divide-y divide-zk-divider overflow-hidden">
            {resolvedNeeds.map((need) => {
              const agent = agents.find((candidate) => candidate.id === need.agentId);

              return (
                <div
                  key={need.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#6ee7a8]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-snug text-zk-text">
                        {need.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zk-muted">
                        <span>{agent?.name ?? "Agent"}</span>
                        <span aria-hidden="true">·</span>
                        <IssueLink issue={need.issue} />
                        <span aria-hidden="true">·</span>
                        <Badge tone="ok">{need.resolution?.label}</Badge>
                      </div>
                      {need.resolution?.note ? (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zk-text2">
                          “{need.resolution.note}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <time className="shrink-0 text-[11px] text-zk-muted">
                    {formatRelative(need.resolution?.at ?? need.createdAt, now)}
                  </time>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
