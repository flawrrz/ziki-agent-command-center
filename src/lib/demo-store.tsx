"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster } from "@/components/toaster";
import {
  applyAgentPause,
  applyNeedAction,
  expireTimedNeeds,
  markFeedRead,
  reconcilePresence,
  type FeedbackTone,
} from "./demo-actions";
import {
  DEMO_STATE_VERSION,
  DEMO_STORAGE_KEY,
  seedDemoState,
} from "./demo-data";
import {
  agentClaims,
  buildFeed,
  expiredNeeds,
  needsForAgent,
  resolvedNeeds,
  unresolvedNeeds,
} from "./demo-selectors";
import type {
  Agent,
  Claim,
  DemoState,
  FeedItem,
  NeedAction,
  NeedItem,
  Outcome,
} from "./types";

export type Toast = {
  id: string;
  message: string;
  tone: FeedbackTone;
};

type DemoContextValue = {
  ready: boolean;
  state: DemoState | null;
  now: number;
  agents: Agent[];
  openNeeds: NeedItem[];
  expiredNeeds: NeedItem[];
  resolvedNeeds: NeedItem[];
  claims: Claim[];
  outcomes: Outcome[];
  feed: FeedItem[];
  unreadCount: number;
  needsCount: number;
  getAgent: (id: string) => Agent | undefined;
  getAgentClaims: (id: string) => Claim[];
  getAgentNeeds: (id: string) => NeedItem[];
  performNeedAction: (
    needId: string,
    action: NeedAction,
    note?: string,
  ) => void;
  toggleAgentPause: (agentId: string) => void;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);

    if (!raw) return seedDemoState();

    const parsed = JSON.parse(raw) as DemoState;

    if (
      parsed.version !== DEMO_STATE_VERSION ||
      !Array.isArray(parsed.agents) ||
      !Array.isArray(parsed.needs) ||
      !Array.isArray(parsed.claims) ||
      !Array.isArray(parsed.outcomes) ||
      !Array.isArray(parsed.updates) ||
      !Array.isArray(parsed.readNotificationIds)
    ) {
      return seedDemoState();
    }

    return parsed;
  } catch {
    return seedDemoState();
  }
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const initialized = useRef(false);
  const toastTimers = useRef<number[]>([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setState(loadState());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!state) return;

    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing; the demo still works in memory.
    }
  }, [state]);

  useEffect(() => {
    if (!state) return;

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setState((previous) =>
      previous
        ? reconcilePresence(expireTimedNeeds(previous, now), now)
        : previous,
    );
  }, [now, state]);

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const pushToast = useCallback((message: string, tone: FeedbackTone) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((previous) => [...previous.slice(-2), { id, message, tone }]);

    const timer = window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 6000);
    toastTimers.current.push(timer);
  }, []);

  const performNeedAction = useCallback(
    (needId: string, action: NeedAction, note?: string) => {
      if (!state) return;

      const result = applyNeedAction(state, needId, action, note, Date.now());
      setState(result.state);
      pushToast(result.message, result.tone);
    },
    [pushToast, state],
  );

  const toggleAgentPause = useCallback(
    (agentId: string) => {
      if (!state) return;

      const result = applyAgentPause(state, agentId, Date.now());
      setState(result.state);
      pushToast(result.message, result.tone);
    },
    [pushToast, state],
  );

  const markRead = useCallback((ids: string[]) => {
    setState((previous) =>
      previous ? markFeedRead(previous, ids) : previous,
    );
  }, []);

  const feed = useMemo(() => (state ? buildFeed(state) : []), [state]);
  const agents = state?.agents ?? [];
  const claims = state?.claims ?? [];
  const outcomes = state?.outcomes ?? [];
  const openNeeds = useMemo(
    () => (state ? unresolvedNeeds(state) : []),
    [state],
  );
  const expired = useMemo(
    () => (state ? expiredNeeds(state) : []),
    [state],
  );
  const resolved = useMemo(
    () => (state ? resolvedNeeds(state) : []),
    [state],
  );

  const markAllRead = useCallback(() => {
    if (!state) return;
    const ids = feed.map((item) => item.id);
    setState(markFeedRead(state, ids));
  }, [feed, state]);

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage; resetting in memory is still useful.
    }

    const next = seedDemoState();
    setState(next);
    setNow(Date.now());
    pushToast("Demo reset. Timers and requests are fresh.", "info");
  }, [pushToast]);

  const value = useMemo<DemoContextValue>(
    () => ({
      ready: state !== null,
      state,
      now,
      agents,
      openNeeds,
      expiredNeeds: expired,
      resolvedNeeds: resolved,
      claims,
      outcomes,
      feed,
      unreadCount: feed.filter((item) => item.unread).length,
      needsCount: openNeeds.length,
      getAgent: (id: string) => agents.find((agent) => agent.id === id),
      getAgentClaims: (id: string) => agentClaims(claims, id),
      getAgentNeeds: (id: string) =>
        state ? needsForAgent(state.needs, id) : [],
      performNeedAction,
      toggleAgentPause,
      markRead,
      markAllRead,
      resetDemo,
    }),
    [
      agents,
      claims,
      expired,
      feed,
      markAllRead,
      markRead,
      now,
      openNeeds,
      outcomes,
      performNeedAction,
      resetDemo,
      resolved,
      state,
      toggleAgentPause,
    ],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      <Toaster
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((previous) => previous.filter((toast) => toast.id !== id))
        }
      />
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);

  if (!context) {
    throw new Error("useDemo must be used inside DemoProvider");
  }

  return context;
}

