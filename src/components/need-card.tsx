"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  HelpCircle,
  Info,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatDuration, formatRelative } from "@/lib/format";
import type { NeedAction, NeedItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  AgentIdentity,
  Badge,
  IssueLink,
  PresenceBadge,
  TimeMeter,
} from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

const KIND_META = {
  question: {
    label: "Question",
    icon: HelpCircle,
    iconClass: "bg-[#14294f] text-[#9cc2ff]",
    tone: "info" as const,
  },
  offer: {
    label: "Offer",
    icon: Mail,
    iconClass: "bg-[#3a2c0c] text-[#f6cf6b]",
    tone: "warn" as const,
  },
  approval: {
    label: "Pipeline gate",
    icon: ShieldCheck,
    iconClass: "bg-[#14294f] text-[#9cc2ff]",
    tone: "info" as const,
  },
  claim: {
    label: "Stale claim",
    icon: AlertTriangle,
    iconClass: "bg-[#3a1517] text-[#fca5a0]",
    tone: "bad" as const,
  },
};

type PendingAction = {
  action: NeedAction;
  title: string;
  body: string;
  confirmLabel: string;
  tone: "primary" | "danger";
};

const ANSWER_SUGGESTIONS: Record<number, string[]> = {
  1149: [
    "Keep the existing agent-card header",
    "Use the compact lower-fidelity variant",
  ],
  141: [
    "Escalate to a merger",
    "Request a third independent review",
  ],
};

export function NeedCard({ need }: { need: NeedItem }) {
  const { agents, claims, now, performNeedAction } = useDemo();
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);

  const agent = agents.find((candidate) => candidate.id === need.agentId);
  const claim = claims.find(
    (candidate) =>
      candidate.agentId === need.agentId &&
      candidate.issue.number === need.issue.number,
  );
  const meta = KIND_META[need.kind];
  const Icon = meta.icon;
  const expired = need.status === "expired";

  if (!agent) return null;

  const suggestions = ANSWER_SUGGESTIONS[need.issue.number] ?? [];
  const deadline =
    need.kind === "claim"
      ? claim?.deadline
      : (need.expiresAt ?? need.claimReleaseAt);

  const openConfirm = (action: NeedAction) => {
    if (action === "accept") {
      setPending({
        action,
        title: `Accept the offer for #${need.issue.number}?`,
        body: "Accepting starts a delivery window for this agent and ends the offer for everyone else. High and critical issues get at least 60 minutes; other issues get 15.",
        confirmLabel: "Accept offer",
        tone: "primary",
      });
    } else if (action === "pass") {
      setPending({
        action,
        title: `Pass on #${need.issue.number}?`,
        body: "This offer ends and the issue is re-offered to the next eligible person. The agent is notified.",
        confirmLabel: "Pass offer",
        tone: "primary",
      });
    } else if (action === "release") {
      setPending({
        action,
        title: `Release the claim on #${need.issue.number}?`,
        body: "The issue becomes available for a new offer immediately. The agent loses this claim and is notified.",
        confirmLabel: "Release claim",
        tone: "danger",
      });
    } else if (action === "extend") {
      setPending({
        action,
        title: "Extend the deadline by 60 minutes?",
        body: "Only one extension is available for a claim. Heartbeats still do not move deliverBy, so this buys time without proving the agent is online.",
        confirmLabel: "Extend 60m",
        tone: "primary",
      });
    } else if (action === "approve") {
      setPending({
        action,
        title: `Approve the production gate for #${need.issue.number}?`,
        body: "Approval is recorded and may automatically resume the paused merge. The decision is attributed to you as workspace owner.",
        confirmLabel: "Approve gate",
        tone: "primary",
      });
    } else if (action === "decline") {
      setPending({
        action,
        title: `Decline the production gate for #${need.issue.number}?`,
        body: "The merge stays blocked and the agent is notified. You can revisit the decision from the issue history.",
        confirmLabel: "Decline gate",
        tone: "danger",
      });
    } else if (action === "reoffer") {
      setPending({
        action,
        title: `Re-offer #${need.issue.number}?`,
        body: "Dispatch will pick the next eligible person. The expired offer never started a claim, so nothing is released.",
        confirmLabel: "Request re-offer",
        tone: "primary",
      });
    }
  };

  return (
    <article
      id={need.id}
      className={cn(
        "zk-card zk-rise scroll-mt-24 overflow-hidden",
        expired && "border-dashed",
      )}
    >
      <div className="border-b border-zk-divider bg-zk-seg/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              meta.iconClass,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <Badge tone={expired ? "warn" : meta.tone}>{meta.label}</Badge>
          <span className="text-[11px] text-zk-muted">from</span>
          <AgentIdentity agent={agent} compact />
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <PresenceBadge agent={agent} />
            {expired ? (
              <Badge tone="warn">
                Expired {formatRelative(need.expiresAt ?? need.createdAt, now)}
              </Badge>
            ) : deadline ? (
              <TimeMeter
                target={deadline}
                now={now}
                label={need.kind === "question" ? "Claim release" : undefined}
              />
            ) : (
              <span className="text-[11px] text-zk-muted">
                Waiting {formatDuration(now - need.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <IssueLink issue={need.issue} />
          <Badge tone="neutral">{need.issue.project}</Badge>
          <Badge
            tone={
              need.issue.priority === "High" || need.issue.priority === "Critical"
                ? "bad"
                : "neutral"
            }
          >
            {need.issue.priority}
          </Badge>
        </div>

        <h3 className="mt-1.5 text-[17px] font-extrabold leading-snug tracking-[-0.015em] text-zk-text sm:text-lg">
          {need.title}
        </h3>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-zk-text2">
          {need.detail}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {need.context.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-zk-divider bg-zk-seg/50 px-3 py-2 text-[11px] leading-snug text-zk-text2"
            >
              {item}
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-zk-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {need.rule}
        </p>

        {answering ? (
          <form
            className="mt-4 rounded-2xl border border-[#294a7f] bg-[#0a1530] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!answer.trim()) return;
              performNeedAction(need.id, "answer", answer);
              setAnswering(false);
              setAnswer("");
            }}
          >
            <label
              htmlFor={`answer-${need.id}`}
              className="zk-label"
            >
              Your answer to {agent.name}
            </label>
            {suggestions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAnswer(suggestion)}
                    className="zk-chip transition hover:border-[#3d5a8a] hover:text-zk-text"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              id={`answer-${need.id}`}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="zk-textarea mt-2"
              rows={3}
              autoFocus
              placeholder="Answer the agent. This resumes any paused claim and is recorded on the issue."
            />
            <p className="mt-1.5 text-[10px] text-zk-muted">
              The answer is visible to the agent and in the issue history.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={!answer.trim()}
                className="zk-btn zk-btn-primary zk-btn-sm"
              >
                Send answer
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnswering(false);
                  setAnswer("");
                }}
                className="zk-btn zk-btn-ghost zk-btn-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {need.kind === "question" ? (
              <button
                type="button"
                onClick={() => setAnswering(true)}
                className="zk-btn zk-btn-primary zk-btn-sm"
              >
                Answer question
              </button>
            ) : null}

            {need.kind === "offer" && !expired ? (
              <>
                <button
                  type="button"
                  onClick={() => openConfirm("accept")}
                  className="zk-btn zk-btn-primary zk-btn-sm"
                >
                  Accept offer
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm("pass")}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Pass
                </button>
              </>
            ) : null}

            {need.kind === "offer" && expired ? (
              <button
                type="button"
                onClick={() => openConfirm("reoffer")}
                className="zk-btn zk-btn-primary zk-btn-sm"
              >
                Re-offer
              </button>
            ) : null}

            {need.kind === "approval" ? (
              <>
                <button
                  type="button"
                  onClick={() => openConfirm("approve")}
                  className="zk-btn zk-btn-primary zk-btn-sm"
                >
                  Approve gate
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm("decline")}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Decline
                </button>
              </>
            ) : null}

            {need.kind === "claim" ? (
              <>
                <button
                  type="button"
                  onClick={() => openConfirm("release")}
                  className="zk-btn zk-btn-danger zk-btn-sm"
                >
                  Release claim
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm("extend")}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Extend 60m
                </button>
              </>
            ) : null}

            <a
              href={need.issue.url}
              target="_blank"
              rel="noreferrer"
              className="zk-btn zk-btn-ghost zk-btn-sm"
            >
              Open issue
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        body={pending?.body ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        tone={pending?.tone ?? "primary"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          performNeedAction(need.id, pending.action);
          setPending(null);
        }}
      />
    </article>
  );
}
