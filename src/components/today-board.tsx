"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import {
  buildBoard,
  buildBrief,
  buildOrbs,
  type BoardCard,
} from "@/lib/board";
import { readLastSeen, writeLastSeen } from "@/lib/last-seen";
import { PageSkeleton } from "./ui";
import { TodayBrief } from "./today-brief";
import { AgentStrip } from "./agent-strip";
import { BoardRail } from "./board-rail";

export function TodayBoard() {
  const { ready, state, now } = useDemo();
  const [filter, setFilter] = useState<string | null>(null);
  const sinceRef = useRef<{ from: number; label: string } | null>(null);

  if (!sinceRef.current) sinceRef.current = readLastSeen(Date.now());
  const since = sinceRef.current;

  useEffect(() => {
    writeLastSeen(Date.now());
  }, []);

  const board = useMemo(
    () => (state ? buildBoard(state, now) : null),
    [state, now],
  );

  if (!ready || !board || !state) return <PageSkeleton rows={4} />;

  const lines = buildBrief(board, state, now, since);
  const orbs = buildOrbs(board, state, now);

  const inFilter = (cards: BoardCard[]) =>
    filter ? cards.filter((card) => card.agent?.id === filter) : cards;

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-zk-text sm:text-[26px]">
          Today
        </h1>
        <p className="text-[12px] text-zk-muted">
          {todayLabel} · Zedu workspace
        </p>
      </header>

      <TodayBrief lines={lines} />

      <AgentStrip
        orbs={orbs}
        now={now}
        filter={filter}
        onFilter={(agentId) =>
          setFilter((current) => (current === agentId ? null : agentId))
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <BoardRail
          id="waiting"
          title="Waiting on you"
          meaning="Nothing moves until you decide"
          spine="--zk-warn-bd"
          cards={inFilter(board.waiting)}
          emptyText="No decisions outstanding. Agents put a card here when they need a human."
          now={now}
          agentFilter={filter}
          onAgentSelect={(agentId) =>
            setFilter((current) => (current === agentId ? null : agentId))
          }
        />
        <BoardRail
          id="running"
          title="In progress"
          meaning="Agents are working; no action needed"
          spine="--zk-info-bd"
          cards={inFilter(board.running)}
          emptyText="No claims are running. Accepted offers and released claims land here first."
          now={now}
          agentFilter={filter}
          onAgentSelect={(agentId) =>
            setFilter((current) => (current === agentId ? null : agentId))
          }
        />
        <BoardRail
          id="shipped"
          title="Shipped"
          meaning="Done, merged or delivered"
          spine="--zk-ok-bd"
          cards={inFilter(board.shipped)}
          emptyText="Nothing has landed in this workspace yet."
          now={now}
          agentFilter={filter}
          onAgentSelect={(agentId) =>
            setFilter((current) => (current === agentId ? null : agentId))
          }
        />
      </div>
    </div>
  );
}
