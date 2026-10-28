"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatDuration } from "@/lib/format";
import type { NeedAction } from "@/lib/types";
import type { BoardCard } from "@/lib/board";
import { ANSWER_SUGGESTIONS, pendingAction, type PendingAction } from "@/lib/need-copy";
import { cn } from "@/lib/cn";
import { AgentAvatar, Badge } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

const KIND_LABEL: Record<string, string> = {
  question: "Answer needed",
  offer: "Offer open",
  approval: "Approval gate",
  claim: "Claim overdue",
};

function clock(card: BoardCard, now: number) {
  const need = card.need;
  if (!need) return null;

  if (need.status === "expired") {
    const gone = now - (need.expiresAt ?? need.createdAt);

    return { value: formatDuration(gone), unit: "since the offer expired", bad: true };
  }
  if (!card.deadline) {
    return {
      value: formatDuration(now - need.createdAt),
      unit: need.kind === "question" ? "waiting on you" : "no deadline",
      bad: false,
    };
  }

  const diff = card.deadline - now;

  if (diff < 0) {
    return { value: formatDuration(-diff), unit: "past deliverBy", bad: true };
  }

  const unit =
    need.kind === "claim"
      ? "left on the claim"
      : need.kind === "approval"
        ? "until the gate closes"
        : need.kind === "question"
          ? "before the claim releases"
          : "until the offer lapses";

  return { value: formatDuration(diff), unit, bad: diff < 15 * 60_000 };
}

export function FocusCard({ card }: { card: BoardCard }) {
  const { now, performNeedAction } = useDemo();
  const need = card.need;
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);

  if (!need) return null;

  const ask = (action: Exclude<NeedAction, "answer">) => setPending(pendingAction(need, action));
  const time = clock(card, now);
  const expired = need.status === "expired";
  const suggestions = ANSWER_SUGGESTIONS[need.issue.number] ?? [];

  return (
    <article className="zk-card overflow-hidden">
      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="zk-label">{KIND_LABEL[need.kind]}</span>
          {card.issue.priority === "High" || card.issue.priority === "Critical" ? (
            <Badge tone={card.issue.priority === "Critical" ? "bad" : "warn"}>
              {card.issue.priority}
            </Badge>
          ) : null}
        </div>

        <h2 className="mt-3 max-w-3xl text-[21px] font-bold leading-[1.18] tracking-[-0.025em] text-zk-text sm:text-[27px]">
          <Link href={card.href} className="hover:underline decoration-zk-border-strong underline-offset-4">
            {need.title}
          </Link>
        </h2>

        {time ? (
          <p className="mt-5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "text-[30px] font-bold leading-none tabular-nums tracking-[-0.03em] sm:text-[38px]",
                time.bad ? "text-zk-bad-fg" : "text-zk-text",
              )}
            >
              {time.value}
            </span>
            <span className="text-[12px] text-zk-muted">{time.unit}</span>
          </p>
        ) : null}

        {answering ? (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!answer.trim()) return;
              performNeedAction(need.id, "answer", answer);
              setAnswering(false);
              setAnswer("");
            }}
          >
            <label htmlFor="focus-answer" className="zk-label">
              Your answer to {card.agent?.name}
            </label>
            {suggestions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
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
              id="focus-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="zk-textarea mt-3"
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
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {need.kind === "question" ? (
              <button
                type="button"
                onClick={() => setAnswering(true)}
                className="zk-btn zk-btn-primary zk-btn-sm"
              >
                Answer
              </button>
            ) : null}

            {need.kind === "offer" && !expired ? (
              <>
                <button
                  type="button"
                  onClick={() => ask("accept")}
                  className="zk-btn zk-btn-primary zk-btn-sm"
                >
                  Accept offer
                </button>
                <button
                  type="button"
                  onClick={() => ask("pass")}
                  className="zk-btn zk-btn-secondary zk-btn-sm"
                >
                  Pass
                </button>
              </>
            ) : null}

            {need.kind === "offer" && expired ? (
              <button
                type="button"
                onClick={() => ask("reoffer")}
                className="zk-btn zk-btn-primary zk-btn-sm"
              >
                Re-offer
              </button>
            ) : null}

            {need.kind === "approval" ? (
              <>
                <button
                  type="button"
                  onClick={() => ask("approve")}
                  className="zk-btn zk-btn-primary zk-btn-sm"
                >
                  Approve gate
                </button>
                <button
                  type="button"
                  onClick={() => ask("decline")}
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
                  onClick={() => ask("release")}
                  className="zk-btn zk-btn-danger zk-btn-sm"
                >
                  Release claim
                </button>
                <button
                  type="button"
                  onClick={() => ask("extend")}
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
              Open in Ziki
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            {card.agent ? (
              <span className="ml-auto flex items-center gap-2 text-[12px] text-zk-muted">
                <AgentAvatar agent={card.agent} size="sm" />
                {card.agent.name}
              </span>
            ) : null}
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
