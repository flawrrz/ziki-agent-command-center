import type {
  Agent,
  Claim,
  DemoState,
  Issue,
  NeedItem,
  Outcome,
  WorkspaceUpdate,
} from "./types";

export const DEMO_STATE_VERSION = 3;
export const DEMO_STORAGE_KEY = "ziki-agent-command-center:v1";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const issue = (
  number: number,
  title: string,
  priority: Issue["priority"],
): Issue => ({
  number,
  title,
  priority,
  project: "Zedu",
  url: `https://ziki.dev/issues/${number}`,
});

export const ISSUES = {
  refresh: issue(
    721,
    "[Bug] Desktop: refreshCurrentUser() resets the credit balance, the subscription plan and the AI-credits-purchasable flag",
    "High",
  ),
  areaPreferences: issue(
    640,
    "Settings: preferred areas are ignored after a project switch",
    "Medium",
  ),
  emptyState: issue(
    1149,
    "Agent inbox: empty state still shows the old header",
    "Medium",
  ),
  duplicateActivity: issue(
    787,
    "Agent activity: released claims appear three times in Work History",
    "Medium",
  ),
  auditLog: issue(
    798,
    "Agent audit log is empty while work history shows activity",
    "Low",
  ),
  pipelineGate: issue(
    680,
    "Pipeline: gate production deliveries on workspace-owner approval",
    "High",
  ),
  decisionConflict: issue(
    141,
    "Agent decisions conflict and neither is marked canonical",
    "Medium",
  ),
  dmSearch: issue(612, "Desktop DM search flickers on focus", "Low"),
  roleChips: issue(601, "Settings: role chips overflow on narrow screens", "Low"),
  threadFeed: issue(
    655,
    "Agent feed: collapse repeated claim updates into one thread",
    "Medium",
  ),
  presenceStale: issue(
    662,
    "Presence dot stays online for 20 minutes after the last heartbeat",
    "High",
  ),
};

function seedAgents(now: number): Agent[] {
  return [
    {
      id: "bounty-hunter",
      name: "Bounty Hunter",
      level: "contributor",
      model: "Claude Sonnet 4.5",
      owner: "Fawaz Yusuff",
      paused: false,
      presence: "offline",
      lastHeartbeat: now - 2 * HOUR - 23 * MINUTE,
      lastAction: {
        label: "Due date passed on #721",
        issueNumber: 721,
        at: now - HOUR - 30 * MINUTE,
      },
      stats: { acceptedFixes: 3, reviews: 0, releases: 1 },
      areas: ["Desktop", "Sync", "Billing"],
    },
    {
      id: "fixit",
      name: "Fixit",
      level: "contributor",
      model: "GPT-5.2",
      owner: "Fawaz Yusuff",
      paused: false,
      presence: "online",
      lastHeartbeat: now - 2 * MINUTE,
      lastAction: {
        label: "Asked a question on #1149",
        issueNumber: 1149,
        at: now - 12 * MINUTE,
      },
      stats: { acceptedFixes: 2, reviews: 0, releases: 3 },
      areas: ["Agent inbox", "Design systems"],
    },
    {
      id: "reviewer",
      name: "Reviewer",
      level: "reviewer",
      model: "Claude Opus 4.1",
      owner: "Fawaz Yusuff",
      paused: false,
      presence: "idle",
      lastHeartbeat: now - 41 * MINUTE,
      lastAction: {
        label: "Escalated a conflicting decision on #141",
        issueNumber: 141,
        at: now - 42 * MINUTE,
      },
      stats: { acceptedFixes: 1, reviews: 52, releases: 0 },
      areas: ["Reviews", "Triage"],
    },
    {
      id: "personal-agent",
      name: "Personal agent",
      level: "triager",
      model: "Claude Sonnet 4.5",
      owner: "Fawaz Yusuff",
      personal: true,
      paused: false,
      presence: "online",
      lastHeartbeat: now - 4 * MINUTE,
      lastAction: {
        label: "Offer received for #640",
        issueNumber: 640,
        at: now - 12 * MINUTE,
      },
      stats: { acceptedFixes: 1, reviews: 4, releases: 0 },
      areas: ["Settings", "Agent UX"],
    },
    {
      id: "scout",
      name: "Scout",
      level: "contributor",
      model: "Gemini 2.5 Pro",
      owner: "Fawaz Yusuff",
      paused: true,
      presence: "offline",
      lastHeartbeat: now - 3 * DAY,
      lastAction: {
        label: "Paused by owner",
        at: now - 3 * DAY,
      },
      stats: { acceptedFixes: 0, reviews: 0, releases: 0 },
      areas: ["Web", "Performance"],
    },
  ];
}

function seedClaims(now: number): Claim[] {
  return [
    {
      id: "claim-655",
      agentId: "fixit",
      issue: ISSUES.threadFeed,
      status: "active",
      latestLabel: "Writing the patch · 2 files touched",
      updatedAt: now - 6 * MINUTE,
      deadline: now + 22 * MINUTE,
      lastHeartbeat: now - 2 * MINUTE,
      nextStep: "Delivering unless the window lapses",
      nextStepTone: "info",
      events: [
        {
          at: now - 38 * MINUTE,
          label: "Offer accepted",
          detail: "30-minute delivery window started.",
        },
        {
          at: now - 20 * MINUTE,
          label: "Draft pushed",
          detail: "Branch agent/655-collapse-feed-updates opened.",
        },
        {
          at: now - 6 * MINUTE,
          label: "Heartbeat sent",
          detail: "Clock unchanged; the due date stays fixed.",
        },
      ],
    },
    {
      id: "claim-662",
      agentId: "personal-agent",
      issue: ISSUES.presenceStale,
      status: "active",
      latestLabel: "Reproducing the stale presence window",
      updatedAt: now - 14 * MINUTE,
      deadline: now + 96 * MINUTE,
      lastHeartbeat: now - 4 * MINUTE,
      nextStep: "Next checkpoint when the patch is pushed",
      nextStepTone: "neutral",
      events: [
        {
          at: now - 2 * HOUR,
          label: "Offer accepted",
          detail: "120-minute delivery window started.",
        },
        {
          at: now - 14 * MINUTE,
          label: "Reproduction recorded",
          detail: "Stale window measured at 20 minutes against a 15-minute rule.",
        },
      ],
    },
    {
      id: "claim-721",
      agentId: "bounty-hunter",
      issue: ISSUES.refresh,
      status: "overdue",
      latestLabel: "Due date passed · claim still held",
      updatedAt: now - HOUR - 20 * MINUTE,
      deadline: now - HOUR - 30 * MINUTE,
      lastHeartbeat: now - HOUR - 45 * MINUTE,
      nextStep: "Release the claim or extend by 60 minutes",
      nextStepTone: "bad",
      events: [
        {
          at: now - 2 * HOUR - 45 * MINUTE,
          label: "Offer accepted",
          detail: "60-minute delivery window started.",
        },
        {
          at: now - HOUR - 45 * MINUTE,
          label: "Heartbeat sent",
          detail: "Heartbeats keep the claim alive but do not move the due date.",
        },
        {
          at: now - HOUR - 30 * MINUTE,
          label: "Due date passed",
          detail: "No linked fix.",
        },
        {
          at: now - HOUR - 20 * MINUTE,
          label: "Automatic release not recorded",
          detail: "The claim still occupies a slot and blocks a re-offer.",
        },
      ],
    },
    {
      id: "claim-1149",
      agentId: "fixit",
      issue: ISSUES.emptyState,
      status: "paused",
      latestLabel: "Question paused the delivery clock",
      updatedAt: now - 12 * MINUTE,
      deadline: now + 8 * HOUR,
      lastHeartbeat: now - 2 * MINUTE,
      nextStep: "Answer Fixit's question to resume the claim",
      nextStepTone: "warn",
      cycles: 3,
      events: [
        {
          at: now - 6 * DAY,
          label: "Bid awarded",
          detail: "Cycle 1 of 3.",
        },
        {
          at: now - 5 * DAY - 23 * HOUR,
          label: "Offer accepted",
        },
        {
          at: now - 5 * DAY - 22 * HOUR,
          label: "Released at deadline",
          detail: "Cycle 1 ended without a linked fix.",
        },
        {
          at: now - 4 * DAY,
          label: "Re-offered and accepted",
          detail: "Cycle 2 started.",
        },
        {
          at: now - 3 * DAY - 23 * HOUR,
          label: "Released at deadline",
          detail: "Cycle 2 ended without a linked fix.",
        },
        {
          at: now - 2 * DAY,
          label: "Bid awarded again",
          detail: "Cycle 3 started.",
        },
        {
          at: now - DAY - 23 * HOUR,
          label: "Offer accepted",
        },
        {
          at: now - 2 * MINUTE,
          label: "Heartbeat sent",
        },
        {
          at: now - 12 * MINUTE,
          label: "Question paused the claim clock",
          detail: "Owner reminder due in 18 minutes.",
        },
      ],
    },
    {
      id: "claim-640",
      agentId: "personal-agent",
      issue: ISSUES.areaPreferences,
      status: "offered",
      latestLabel: "Offer waiting for an owner decision",
      updatedAt: now - 12 * MINUTE,
      deadline: now + 18 * MINUTE,
      nextStep: "Accept or pass before the offer expires",
      nextStepTone: "warn",
      events: [
        {
          at: now - 12 * MINUTE,
          label: "Offer sent",
          detail: "Picked by lightest workload; offer expires in 30 minutes.",
        },
      ],
    },
    {
      id: "claim-787",
      agentId: "fixit",
      issue: ISSUES.duplicateActivity,
      status: "released",
      latestLabel: "Released at deadline",
      updatedAt: now - 21 * HOUR,
      deadline: now - 21 * HOUR,
      lastHeartbeat: now - 22 * HOUR,
      releaseReason: "deadline",
      nextStep: "No linked fix; the issue stayed open",
      nextStepTone: "neutral",
      events: [
        {
          at: now - DAY,
          label: "Offer accepted",
        },
        {
          at: now - 22 * HOUR,
          label: "Heartbeat sent",
        },
        {
          at: now - 21 * HOUR,
          label: "Released at deadline",
          detail: "No linked fix.",
        },
      ],
    },
    {
      id: "claim-798",
      agentId: "fixit",
      issue: ISSUES.auditLog,
      status: "expired",
      latestLabel: "Offer expired after 30 minutes",
      updatedAt: now - 12 * MINUTE,
      deadline: now - 12 * MINUTE,
      nextStep: "Re-offer or leave the issue open",
      nextStepTone: "warn",
      events: [
        {
          at: now - 42 * MINUTE,
          label: "Offer sent",
        },
        {
          at: now - 12 * MINUTE,
          label: "Offer expired",
          detail: "No claim was started.",
        },
      ],
    },
    {
      id: "claim-680",
      agentId: "reviewer",
      issue: ISSUES.pipelineGate,
      status: "awaiting_owner",
      latestLabel: "Pipeline gate awaiting owner",
      updatedAt: now - 55 * MINUTE,
      deadline: now + HOUR + 5 * MINUTE,
      nextStep: "Approve or decline in Needs you",
      nextStepTone: "warn",
      events: [
        {
          at: now - 2 * HOUR,
          label: "Review cleared",
          detail: "Pipeline change reviewed by Reviewer.",
        },
        {
          at: now - 55 * MINUTE,
          label: "Approval requested",
          detail: "Production delivery is blocked.",
        },
      ],
    },
    {
      id: "claim-141",
      agentId: "reviewer",
      issue: ISSUES.decisionConflict,
      status: "awaiting_owner",
      latestLabel: "Conflicting decisions escalated",
      updatedAt: now - 42 * MINUTE,
      nextStep: "Provide a tie-break in Needs you",
      nextStepTone: "bad",
      events: [
        {
          at: now - 2 * DAY,
          label: "Derico confirmed the report",
          detail: "Confidence: medium. Decision recorded on behalf of Abuchi Collins.",
        },
        {
          at: now - DAY,
          label: "Bolu Triager marked it not real",
          detail: "Independent triage decision on behalf of Bolu.",
        },
        {
          at: now - 42 * MINUTE,
          label: "Escalated to the workspace owner",
          detail: "No canonical decision is set on the issue.",
        },
      ],
    },
  ];
}

function seedNeeds(now: number): NeedItem[] {
  return [
    {
      id: "need-claim-721",
      kind: "claim",
      agentId: "bounty-hunter",
      issue: ISSUES.refresh,
      title: "Deadline passed, but Bounty Hunter still holds #721",
      detail:
        "The due date passed while heartbeats had stopped, yet the claim is still active and the issue cannot be re-offered.",
      context: [
        "High priority · 60-minute delivery window",
        "Heartbeat stopped before the deadline",
        "A claim slot stays blocked until this is resolved",
      ],
      rule: "Heartbeats keep a claim alive but do not move the due date. A claim past its due date with no linked fix is released and re-offered.",
      status: "open",
      createdAt: now - HOUR - 20 * MINUTE,
    },
    {
      id: "need-offer-640",
      kind: "offer",
      agentId: "personal-agent",
      issue: ISSUES.areaPreferences,
      title: "Offer waiting: Personal agent can take #640",
      detail:
        "The 30-minute offer window is open. Accepting sets a 15-minute due date; passing re-offers the issue to the next eligible person.",
      context: [
        "0 of 2 active claims",
        "Lightest workload among 3 eligible people",
        "Expires 30 minutes after the offer is sent",
      ],
      rule: "Offers expire after 30 minutes and only one offer can be pending at a time. Person-level limits are 2 active claims.",
      status: "open",
      createdAt: now - 12 * MINUTE,
      expiresAt: now + 18 * MINUTE,
    },
    {
      id: "need-question-1149",
      kind: "question",
      agentId: "fixit",
      issue: ISSUES.emptyState,
      title: "Fixit needs a decision on the #1149 empty state",
      detail:
        "“Should the empty state reuse the existing agent-card header, or switch to the compact lower-fidelity variant?”",
      context: [
        "Claim paused while awaiting your answer",
        "First owner reminder is sent after 30 minutes",
        "Unanswered questions release the claim after 4 hours",
      ],
      rule: "Questions pause the claim clock. Ziki reminds the owner after 30 minutes and releases the claim after 4 hours unanswered.",
      status: "open",
      createdAt: now - 12 * MINUTE,
      claimReleaseAt: now + 3 * HOUR + 48 * MINUTE,
    },
    {
      id: "need-approval-680",
      kind: "approval",
      agentId: "reviewer",
      issue: ISSUES.pipelineGate,
      title: "Pipeline approval needed for #680",
      detail:
        "Reviewer cleared the pipeline change. Production delivery stays blocked until a workspace owner approves the gate.",
      context: [
        "Gate: production delivery",
        "Approval may automatically resume the paused merge",
        "Requested by Reviewer after review cleared",
      ],
      rule: "Workspace owners and admins decide pipeline gates. Approval can resume an offer or merge automatically.",
      status: "open",
      createdAt: now - 55 * MINUTE,
      expiresAt: now + HOUR + 5 * MINUTE,
    },
    {
      id: "need-question-141",
      kind: "question",
      agentId: "reviewer",
      issue: ISSUES.decisionConflict,
      title: "Reviewer needs a tie-break on #141",
      detail:
        "“Derico confirmed the report, but Bolu Triager marked it not a real issue. Should I escalate to a merger or request a third independent review?”",
      context: [
        "Two independent decisions conflict",
        "No canonical decision is set on the issue",
        "Merge review is blocked until this is resolved",
      ],
      rule: "Independent reviewers must not share an owner. A tie needs a merger or a third reviewer before the issue can move forward.",
      status: "open",
      createdAt: now - 42 * MINUTE,
    },
    {
      id: "need-offer-798",
      kind: "offer",
      agentId: "fixit",
      issue: ISSUES.auditLog,
      title: "Offer for #798 expired before it was answered",
      detail:
        "The 30-minute window closed with no claim. The issue is still open and can be offered to someone else.",
      context: ["Expired after its 30-minute window", "No claim was started"],
      rule: "Expired offers are released and must be requested again. They never start a claim or a lease.",
      status: "expired",
      createdAt: now - 42 * MINUTE,
      expiresAt: now - 12 * MINUTE,
    },
  ];
}

function seedOutcomes(now: number): Outcome[] {
  return [
    {
      id: "out-141",
      agentId: "reviewer",
      issue: ISSUES.decisionConflict,
      label: "Review recorded — conflicting decision flagged",
      at: now - 2 * HOUR,
      acceptedFix: false,
    },
    {
      id: "out-787",
      agentId: "fixit",
      issue: ISSUES.duplicateActivity,
      label: "Claim released at deadline",
      at: now - 21 * HOUR,
      acceptedFix: false,
    },
    {
      id: "out-612",
      agentId: "personal-agent",
      issue: ISSUES.dmSearch,
      label: "Accepted fix delivered",
      at: now - 3 * DAY,
      acceptedFix: true,
    },
    {
      id: "out-601",
      agentId: "bounty-hunter",
      issue: ISSUES.roleChips,
      label: "Accepted fix delivered",
      at: now - 5 * DAY,
      acceptedFix: true,
    },
  ];
}

function seedUpdates(now: number): WorkspaceUpdate[] {
  return [
    {
      id: "upd-640-offer",
      issue: ISSUES.areaPreferences,
      actorName: "Personal agent",
      actorRole: "Triager",
      ownerName: "Fawaz Yusuff",
      title: "Offer sent",
      detail: "The agent has 30 minutes to accept before the offer expires.",
      at: now - 12 * MINUTE,
    },
    {
      id: "upd-721-heartbeat",
      issue: ISSUES.refresh,
      actorName: "Bounty Hunter",
      actorRole: "Contributor",
      ownerName: "Fawaz Yusuff",
      title: "Heartbeat stopped",
      detail: "No API activity for 1h 45m before the due date.",
      at: now - HOUR - 45 * MINUTE,
    },
    {
      id: "upd-798-expired",
      issue: ISSUES.auditLog,
      actorName: "Fixit",
      actorRole: "Contributor",
      ownerName: "Fawaz Yusuff",
      title: "Offer expired",
      detail: "The 30-minute offer window closed with no claim.",
      at: now - 12 * MINUTE,
    },
    {
      id: "upd-787-released",
      issue: ISSUES.duplicateActivity,
      actorName: "Fixit",
      actorRole: "Contributor",
      ownerName: "Fawaz Yusuff",
      title: "Claim released at deadline",
      detail: "No fix was linked. The issue is open again.",
      at: now - 21 * HOUR,
    },
    {
      id: "upd-680-gate",
      issue: ISSUES.pipelineGate,
      actorName: "Reviewer",
      actorRole: "Reviewer",
      ownerName: "Fawaz Yusuff",
      title: "Approval requested",
      detail: "Production delivery is blocked on a workspace-owner gate.",
      at: now - 55 * MINUTE,
    },
    {
      id: "upd-141-tie",
      issue: ISSUES.decisionConflict,
      actorName: "Reviewer",
      actorRole: "Reviewer",
      ownerName: "Fawaz Yusuff",
      title: "Tie-break requested",
      detail: "Two decisions conflict; the issue has no canonical outcome.",
      at: now - 42 * MINUTE,
    },
  ];
}

export function seedDemoState(now = Date.now()): DemoState {
  return {
    version: DEMO_STATE_VERSION,
    seededAt: now,
    agents: seedAgents(now),
    needs: seedNeeds(now),
    claims: seedClaims(now),
    outcomes: seedOutcomes(now),
    updates: seedUpdates(now),
    readNotificationIds: [],
  };
}
