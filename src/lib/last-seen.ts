import { formatDuration } from "./format";

export const LAST_SEEN_KEY = "ziki-agent-command-center:seen";

const FALLBACK_WINDOW = 12 * 60 * 60 * 1000;

export function readLastSeen(now: number): { from: number; label: string } {
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    // Private browsing: fall back to a fixed window.
  }

  const stored = raw ? Number(raw) : Number.NaN;

  if (!Number.isFinite(stored) || stored <= 0 || stored > now) {
    return { from: now - FALLBACK_WINDOW, label: "in the last 12 hours" };
  }

  const elapsed = now - stored;

  return {
    from: stored,
    label:
      elapsed < 60_000
        ? "since you loaded this page"
        : `in the last ${formatDuration(elapsed)}`,
  };
}

export function writeLastSeen(now: number) {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, String(now));
  } catch {
    // Private browsing: the brief just stays on the fixed window.
  }
}
