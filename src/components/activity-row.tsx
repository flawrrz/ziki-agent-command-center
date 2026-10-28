"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Agent, Claim, NeedItem } from "@/lib/types";
import {
  AgentIdentity,
  Badge,
  IssueLink,
  TimeMeter,
} from "./ui";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  Claim["status"],
  { label: string; tone: "bad" | "warn" | "info" | "neutral" | "ok" }
> = {
  active: { label: "Active", tone: "info" },
  overdue: { label: "Overdue", tone: "bad" },
  paused: { label: "Paused", tone: "warn" },
  offered: { label: "Offered", tone: "warn" },
  expired: { label: "Expired", tone: "neutral" },
  released: { label: "Released", tone: "neutral" },
  awaiting_owner: { label: "Awaiting you", tone: "warn" },
  completed: { label: "Completed", tone: "ok" },
};

const TIMED_STATUSES = ["active", "overdue", "offered", "awaiting_owner"];

function MobileLabel({ children }: { children: React.ReactNode }) {
  return <p className="zk-label mb-1 lg:hidden">{children}</p>;
}

export function ActivityRow({
  claim,
  agent,
  request,
  now,
}: {
  claim: Claim;
  agent?: Agent;
  request?: NeedItem;
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[claim.status];
  const events = [...claim.events].sort((a, b) => b.at - a.at);
  const timed = TIMED_STATUSES.includes(claim.status) && claim.deadline;

  return (
    <div>
      <div className="grid gap-3 p-4 lg:grid-cols-[100px_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_32px] lg:items-start">
        <div>
          <MobileLabel>State</MobileLabel>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        <div className="min-w-0">
          <MobileLabel>Issue</MobileLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            <IssueLink issue={claim.issue} />
            <Badge
              tone={
                claim.issue.priority === "High" ||
                claim.issue.priority === "Critical"
                  ? "bad"
                  : "neutral"
              }
            >
              {claim.issue.priority}
            </Badge>
            {claim.cycles && claim.cycles > 1 ? (
              <span className="text-[10px] text-zk-muted">
                {claim.cycles} cycles
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-zk-text">
            {claim.issue.title}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zk-text2">
            {claim.latestLabel}
          </p>
        </div>

        <div className="min-w-0">
          <MobileLabel>Agent</MobileLabel>
          {agent ? (
            <AgentIdentity agent={agent} compact />
          ) : (
            <span className="text-[11px] text-zk-muted">Unknown agent</span>
          )}
        </div>

        <div className="min-w-0">
          <MobileLabel>Timing</MobileLabel>
          {timed && claim.deadline ? (
            <TimeMeter
              target={claim.deadline}
              now={now}
              className="min-h-[1.35rem] px-2 text-[10px]"
            />
          ) : claim.status === "paused" ? (
            <Badge tone="warn">Clock paused</Badge>
          ) : (
            <span className="text-[11px] text-zk-text2">
              {claim.status === "released" || claim.status === "completed"
                ? `${meta.label} ${formatRelative(claim.updatedAt, now)}`
                : meta.label}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <MobileLabel>Next step</MobileLabel>
          <p
            className={cn(
              "text-[11px] leading-snug",
              claim.nextStepTone === "bad"
                ? "font-semibold text-zk-bad-fg"
                : claim.nextStepTone === "warn"
                  ? "font-semibold text-zk-warn-fg"
                  : claim.nextStepTone === "ok"
                    ? "font-semibold text-zk-ok-fg"
                    : "text-zk-text2",
            )}
          >
            {claim.nextStep}
          </p>
          {request ? (
            <Link
              href={`/needs-you#${request.id}`}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-zk-accent hover:text-zk-text"
            >
              {request.status === "expired" ? "Review offer" : "Open request"}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="zk-btn zk-btn-ghost zk-btn-xs !h-7 !w-7 !px-0"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? `Hide event chain for issue ${claim.issue.number}`
              : `Show event chain for issue ${claim.issue.number}`
          }
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-zk-divider bg-zk-hover px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="zk-label">
              Event chain · {events.length}{" "}
              {events.length === 1 ? "event" : "events"}
            </p>
            <p className="text-[10px] text-zk-muted">Newest first</p>
          </div>

          <ol className="mt-3 space-y-3">
            {events.map((event, index) => (
              <li key={`${event.at}-${index}`} className="flex gap-3">
                <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                  <span
                    className="h-2 w-2 rounded-full bg-zk-dot"
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-[11px] font-semibold text-zk-text2">
                      {event.label}
                    </p>
                    <time
                      dateTime={new Date(event.at).toISOString()}
                      title={formatDateTime(event.at)}
                      className="text-[10px] text-zk-muted"
                    >
                      {formatRelative(event.at, now)}
                    </time>
                  </div>
                  {event.detail ? (
                    <p className="mt-0.5 text-[10px] leading-relaxed text-zk-muted">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={claim.issue.url}
              target="_blank"
              rel="noreferrer"
              className="zk-btn zk-btn-ghost zk-btn-xs"
            >
              Open in Ziki
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
