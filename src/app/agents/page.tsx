"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  CheckCircle2,
  Inbox,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { AGENT_LEVELS, LEVEL_LABELS } from "@/lib/types";
import type { AgentLevel } from "@/lib/types";
import {
  Badge,
  EmptyState,
  PageHeader,
  PageSkeleton,
  StatCard,
} from "@/components/ui";
import { AgentCard } from "@/components/agent-card";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";

const AGENT_LIMIT = 5;

type RoleFilter = "all" | AgentLevel;

export default function AgentsPage() {
  const { ready, agents, getAgentNeeds } = useDemo();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");

  const availableLevels = useMemo(
    () =>
      AGENT_LEVELS.filter((level) =>
        agents.some((agent) => agent.level === level),
      ),
    [agents],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return agents.filter((agent) => {
      if (role !== "all" && agent.level !== role) return false;
      if (!term) return true;

      return [agent.name, agent.model, agent.owner, ...agent.areas]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [agents, query, role]);

  if (!ready) return <PageSkeleton rows={5} />;

  const needCount = agents.reduce(
    (sum, agent) => sum + getAgentNeeds(agent.id).length,
    0,
  );
  const online = agents.filter(
    (agent) => !agent.paused && agent.presence === "online",
  ).length;
  const acceptedFixes = agents.reduce(
    (sum, agent) => sum + agent.stats.acceptedFixes,
    0,
  );
  const coveredRoles = new Set(agents.map((agent) => agent.level)).size;
  const atLimit = agents.length >= AGENT_LIMIT;
  const utilization = Math.min(100, Math.round((agents.length / AGENT_LIMIT) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Zedu · Agent operations"
        title="Agents"
        description="Presence, current work and the decisions waiting on you — side by side. Keys, models and deletion stay in Ziki settings; this page is for operating the team."
        actions={
          <>
            <Link href="/activity" className="zk-btn zk-btn-secondary zk-btn-sm">
              View activity
            </Link>
            <button
              type="button"
              disabled={atLimit}
              className="zk-btn zk-btn-primary zk-btn-sm"
              title={
                atLimit
                  ? `${agents.length} of ${AGENT_LIMIT} agents are active. Remove an agent or raise the workspace limit.`
                  : "Create an agent"
              }
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create agent
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Active agents"
          value={`${agents.length} / ${AGENT_LIMIT}`}
          hint={atLimit ? "Agent limit reached" : "Slots available"}
          icon={Bot}
          tone={atLimit ? "warn" : "info"}
        />
        <StatCard
          label="Online now"
          value={`${online} / ${agents.length}`}
          hint="Heartbeat or API use within 15m"
          icon={Activity}
          tone="ok"
        />
        <StatCard
          label="Needs attention"
          value={needCount}
          hint="Questions, offers and approvals"
          icon={Inbox}
          tone="warn"
        />
        <StatCard
          label="Accepted fixes"
          value={acceptedFixes}
          hint="All agents · last 30 days"
          icon={CheckCircle2}
          tone="info"
        />
      </div>

      <div className="zk-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="zk-label flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Roles covered
            </p>
            <span className="text-[11px] font-semibold text-zk-muted">
              {coveredRoles} of {AGENT_LEVELS.length}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AGENT_LEVELS.map((level) => {
              const covered = agents.some((agent) => agent.level === level);

              return covered ? (
                <Badge key={level} tone="accent">
                  {LEVEL_LABELS[level]}
                </Badge>
              ) : (
                <span
                  key={level}
                  className="zk-chip border-dashed text-zk-muted opacity-60"
                >
                  {LEVEL_LABELS[level]}
                </span>
              );
            })}
          </div>
        </div>

        <div className="lg:w-80 lg:shrink-0 lg:border-l lg:border-zk-divider lg:pl-5">
          <div className="flex items-center justify-between gap-2">
            <p className="zk-label">Agent limit</p>
            <span className="text-[11px] font-bold text-zk-text2">
              {agents.length} / {AGENT_LIMIT}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zk-seg">
            <div
              className="h-full rounded-full bg-electric-blue-strong transition-[width]"
              style={{ width: `${utilization}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-zk-muted">
            {atLimit
              ? "Limit reached. Remove an agent or ask an admin for a higher workspace limit."
              : "New agents can be created from Ziki settings."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">Search agents</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zk-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, model or area"
            className="zk-input pl-9"
          />
        </label>

        <div
          role="tablist"
          aria-label="Filter by role"
          className="inline-flex w-full gap-1 overflow-x-auto rounded-full bg-zk-seg p-1 lg:w-auto"
        >
          {[
            { id: "all" as const, label: "All", count: agents.length },
            ...availableLevels.map((level) => ({
              id: level,
              label: LEVEL_LABELS[level],
              count: agents.filter((agent) => agent.level === level).length,
            })),
          ].map((item) => {
            const active = role === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(item.id)}
                className={cn(
                  "min-h-[34px] shrink-0 rounded-full px-3.5 text-[12px] transition",
                  active
                    ? "bg-zk-surface font-bold text-zk-text shadow-sm"
                    : "font-medium text-zk-text2 hover:text-zk-text",
                )}
              >
                {item.label}
                <span className="ml-1.5 text-[10px] text-zk-muted">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-zk-muted">
          Showing {filtered.length} of {pluralize(agents.length, "agent")}
        </p>
        <p className="hidden text-[11px] text-zk-muted sm:block">
          Presence and work are independent
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No agents match"
          description="Try another name, model or role."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRole("all");
              }}
              className="zk-btn zk-btn-secondary zk-btn-sm"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-zk-muted">
        Need to rotate a key, change a model or remove an agent?{" "}
        <a
          href="https://ziki.dev/settings/agents"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-zk-accent hover:text-white"
        >
          Open Ziki agent settings
        </a>
        .
      </p>
    </div>
  );
}
