import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { ArrowUpRight, Clock, Inbox } from "lucide-react";
import type { Agent, Issue, IssuePriority } from "@/lib/types";
import { LEVEL_LABELS } from "@/lib/types";
import { avatarTone, initials } from "@/lib/format";
import { presenceMeta } from "@/lib/demo-selectors";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "ok" | "warn" | "bad" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "",
  info: "zk-chip-info",
  ok: "zk-chip-ok",
  warn: "zk-chip-warn",
  bad: "zk-chip-bad",
  accent: "zk-chip-accent",
};

const PRIORITY_TONES: Record<IssuePriority, Tone> = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "bad",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const dotColor =
    tone === "ok"
      ? "bg-zk-ok-fg"
      : tone === "warn"
        ? "bg-zk-warn-fg"
        : tone === "bad"
          ? "bg-zk-bad-fg"
          : tone === "info"
            ? "bg-zk-info-fg"
            : tone === "accent"
              ? "bg-zk-accent"
              : "bg-zk-muted";

  return (
    <span className={cn("zk-chip", TONE_CLASSES[tone], className)}>
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{priority}</Badge>;
}

export function PresenceBadge({ agent }: { agent: Agent }) {
  const meta = presenceMeta(agent);
  const tone: Tone = meta.tone === "ok" ? "ok" : meta.tone === "warn" ? "warn" : "neutral";

  return (
    <Badge tone={tone} dot>
      <span title={meta.description}>{meta.label}</span>
    </Badge>
  );
}

export function AgentAvatar({
  agent,
  size = "md",
}: {
  agent: Agent;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "zk-avatar",
        avatarTone(agent.id),
        size === "sm" ? "h-8 w-8 text-[10px]" : "",
      )}
      aria-hidden="true"
    >
      {initials(agent.name)}
    </span>
  );
}

export function AgentIdentity({
  agent,
  compact = false,
}: {
  agent: Agent;
  compact?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <AgentAvatar agent={agent} size={compact ? "sm" : "md"} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-semibold text-zk-text">
            {agent.name}
          </span>
          {agent.personal ? (
            <span className="text-[11px] font-medium text-zk-muted">personal</span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-zk-muted">
          {LEVEL_LABELS[agent.level]} · owner {agent.owner}
        </span>
      </span>
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="zk-label mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-zk-text sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-zk-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  count,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  count?: number;
  action?: ReactNode;
  icon?: ComponentType<LucideProps>;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {Icon ? (
            <Icon className="h-4 w-4 text-zk-muted" aria-hidden="true" />
          ) : null}
          <h2 className="text-[17px] font-bold tracking-[-0.01em] text-zk-text">
            {title}
          </h2>
          {typeof count === "number" ? (
            <span className="text-[12px] font-semibold text-zk-muted">
              {count}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-zk-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<LucideProps>;
  tone?: Tone;
}) {
  const iconClass =
    tone === "bad"
      ? "text-zk-bad-fg"
      : tone === "warn"
        ? "text-zk-warn-fg"
        : tone === "ok"
          ? "text-zk-ok-fg"
          : tone === "info"
            ? "text-zk-info-fg"
            : "text-zk-muted";

  return (
    <div className="zk-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="zk-label">{label}</p>
        {Icon ? (
          <Icon className={cn("h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-2.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-zk-text">
        {value}
      </p>
      {hint ? (
        <div className="mt-1.5 text-[11px] leading-relaxed text-zk-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<LucideProps>;
}) {
  return (
    <div className="zk-card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zk-chip text-zk-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-zk-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-zk-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TimeMeter({
  label,
  target,
  now,
  className,
}: {
  label?: string;
  target: number;
  now: number;
  className?: string;
}) {
  const diff = target - now;
  const overdue = diff < 0;
  const urgent = diff >= 0 && diff < 60 * 60_000;
  const hours = Math.floor(Math.abs(diff) / 3_600_000);
  const minutes = Math.floor((Math.abs(diff) % 3_600_000) / 60_000);
  const text = overdue
    ? `${hours > 0 ? `${hours}h ` : ""}${minutes}m overdue`
    : `${hours > 0 ? `${hours}h ` : ""}${minutes}m left`;

  return (
    <span
      className={cn(
        "zk-chip",
        overdue ? "zk-chip-bad" : urgent ? "zk-chip-warn" : "",
        className,
      )}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {label ? `${label} ` : ""}
      {text}
    </span>
  );
}

export function IssueLink({ issue }: { issue: Issue }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-zk-accent transition hover:text-zk-text"
    >
      #{issue.number}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading workspace">
      <div className="space-y-2">
        <div className="zk-skeleton h-3 w-24" />
        <div className="zk-skeleton h-8 w-64 max-w-full" />
        <div className="zk-skeleton h-3 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="zk-skeleton h-28 rounded-card" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="zk-skeleton h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
