export const LAST_SEEN_KEY = "ziki-agent-command-center:seen";

/** Previous visit timestamp, or null when the demo has not been opened before. */
export function readLastSeen(now: number): number | null {
  try {
    const stored = Number(window.localStorage.getItem(LAST_SEEN_KEY));

    return Number.isFinite(stored) && stored > 0 && stored <= now ? stored : null;
  } catch {
    // Private browsing: nothing is marked as new.
    return null;
  }
}

export function writeLastSeen(now: number) {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, String(now));
  } catch {
    // Private browsing: the board simply never marks rows as new.
  }
}
