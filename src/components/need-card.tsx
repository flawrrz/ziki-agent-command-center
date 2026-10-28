"use client";

import { useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatDuration, formatRelative } from "@/lib/format";
import type { NeedAction, NeedItem } from "@/lib/types";
import {
  ANSWER_SUGGESTIONS,
  pendingAction,
  type PendingAction,
} from "@/lib/need-copy";
import { cn } from "@/lib/cn";
import { AgentAvatar, Badge, PresenceBadge, TimeMeter } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

const KIND_META = {
  question: { label: "Question", tone: "info" as const },
  offer: { label: "Offer", tone: "warn" as const },
  approval: { label: "Pipeline gate", tone: "info" as const },
  claim: { label: "Stale claim", tone: "bad" as const },
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
  const expired = need.status === "expired";

  if (!agent) return null;

  const suggestions = ANSWER_SUGGESTIONS[need.issue.number] ?? [];
  const deadline =
    need.kind === "claim"
      ? claim?.deadline
      : (need.expiresAt ?? need.claimReleaseAt);

  const openConfirm = (action: Exclude<NeedAction, "answer">) =>
    setPending(pendingAction(need, action));

  return (
    <article
      id={need.id}
      className={cn(
        "zk-card zk-rise scroll-mt-24 overflow-hidden",
        expired && "border-dashed",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zk-divider px-4 py-3 sm:px-5">
        <Badge tone={expired ? "warn" : meta.tone}>{meta.label}</Badge>
        <span className="flex min-w-0 items-center gap-2">
          <AgentAvatar agent={agent} size="sm" />
          <span className="truncate text-sm font-semibold text-zk-text">
            {agent.name}
          </span>
        </span>
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

      <div className="p-4 sm:p-5">
        <h3 className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-zk-text">
          {need.title}
        </h3>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-zk-text2">
          {need.detail}
        </p>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-zk-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {need.rule}
        </p>

        {answering ? (
          <form
            className="mt-4 rounded-2xl border border-zk-info-bd bg-zk-info-bg/40 p-3"
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
                    className="zk-chip transition hover:border-zk-border-strong hover:text-zk-text"
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
              placeholder="Answer the agent to resume the claim."
            />
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
