"use client";

import { useEffect, useMemo } from "react";
import { useDemo } from "@/lib/demo-store";
import { buildBoard, type BoardCard } from "@/lib/board";
import { readLastSeen, writeLastSeen } from "@/lib/last-seen";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "./ui";
import { FocusCard } from "./focus-card";
import { QueueRow } from "./queue-row";

type Group = {
  id: string;
  title: string;
  dot: string;
  empty: string;
  cards: BoardCard[];
};

export function TodayBoard() {
  const { ready, state, now } = useDemo();
  const since = useMemo(() => readLastSeen(Date.now()), []);

  useEffect(() => {
    writeLastSeen(Date.now());
  }, []);

  const board = useMemo(
    () => (state ? buildBoard(state, now) : null),
    [state, now],
  );

  if (!ready || !board || !state) return <PageSkeleton rows={5} />;

  const lead = board.waiting[0];
  const groups: Group[] = [
    {
      id: "need",
      title: "Need you",
      dot: "bg-zk-warn-fg",
      empty: "Nothing is waiting on a decision.",
      cards: board.waiting.slice(1),
    },
    {
      id: "running",
      title: "Running",
      dot: "bg-zk-info-fg",
      empty: "No agent holds a claim right now.",
      cards: board.running,
    },
    {
      id: "shipped",
      title: "Shipped",
      dot: "bg-zk-ok-fg",
      empty: "Nothing has landed in this workspace yet.",
      cards: board.shipped,
    },
  ];

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  return (
    <div className="mx-auto max-w-[56rem] space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[34px] font-bold leading-none tracking-[-0.035em] text-zk-text sm:text-[42px]">
            Today
          </h1>
          <p className="mt-2.5 text-[12px] text-zk-muted">
            {todayLabel} · Zedu
          </p>
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[26px] font-bold leading-none tabular-nums tracking-[-0.03em] text-zk-text">
            {board.waiting.length}
          </span>
          <span className="text-[12px] text-zk-muted">
            need{board.waiting.length === 1 ? "s" : ""} you
          </span>
        </p>
      </header>

      {lead ? (
        <FocusCard card={lead} />
      ) : (
        <div className="zk-card px-5 py-6 sm:px-8">
          <p className="text-[21px] font-bold leading-tight tracking-[-0.02em] text-zk-text">
            All clear
          </p>
          <p className="mt-1.5 text-[13px] text-zk-muted">
            No agent is blocked on you.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.id} id={group.id} className="scroll-mt-24">
          <h2 className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} aria-hidden="true" />
            <span className="zk-label">{group.title}</span>
            <span className="text-[11px] font-semibold tabular-nums text-zk-muted">
              {group.cards.length}
            </span>
          </h2>

          {group.cards.length > 0 ? (
            <ul className="mt-2">
              {group.cards.map((card) => (
                <QueueRow
                  key={card.key}
                  card={card}
                  now={now}
                  isNew={since !== null && card.at >= since}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-zk-muted">{group.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}
