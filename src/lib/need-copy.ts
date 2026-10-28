import type { NeedAction, NeedItem } from "./types";

export type PendingAction = {
  action: NeedAction;
  title: string;
  body: string;
  confirmLabel: string;
  tone: "primary" | "danger";
};

export const ANSWER_SUGGESTIONS: Record<number, string[]> = {
  1149: [
    "Keep the existing agent-card header",
    "Use the compact lower-fidelity variant",
  ],
  141: ["Escalate to a merger", "Request a third independent review"],
};

export function pendingAction(
  need: NeedItem,
  action: Exclude<NeedAction, "answer">,
): PendingAction {
  const number = need.issue.number;

  const copy: Record<Exclude<NeedAction, "answer">, PendingAction> = {
    accept: {
      action,
      title: `Accept the offer for #${number}?`,
      body: "Accepting starts a delivery window for this agent and ends the offer for everyone else. High and critical issues get at least 60 minutes; other issues get 15.",
      confirmLabel: "Accept offer",
      tone: "primary",
    },
    pass: {
      action,
      title: `Pass on #${number}?`,
      body: "This offer ends and the issue is re-offered to the next eligible person. The agent is notified.",
      confirmLabel: "Pass offer",
      tone: "primary",
    },
    reoffer: {
      action,
      title: `Re-offer #${number}?`,
      body: "Dispatch will pick the next eligible person. The expired offer never started a claim, so nothing is released.",
      confirmLabel: "Request re-offer",
      tone: "primary",
    },
    approve: {
      action,
      title: `Approve the production gate for #${number}?`,
      body: "Approval is recorded and may automatically resume the paused merge. The decision is attributed to you as workspace owner.",
      confirmLabel: "Approve gate",
      tone: "primary",
    },
    decline: {
      action,
      title: `Decline the production gate for #${number}?`,
      body: "The merge stays blocked and the agent is notified. You can revisit the decision from the issue history.",
      confirmLabel: "Decline gate",
      tone: "danger",
    },
    release: {
      action,
      title: `Release the claim on #${number}?`,
      body: "The issue becomes available for a new offer immediately. The agent loses this claim and is notified.",
      confirmLabel: "Release claim",
      tone: "danger",
    },
    extend: {
      action,
      title: "Extend the due date by 60 minutes?",
      body: "Only one extension is available for a claim. Heartbeats still do not move the due date, so this buys time without proving the agent is online.",
      confirmLabel: "Extend 60m",
      tone: "primary",
    },
  };

  return copy[action];
}
