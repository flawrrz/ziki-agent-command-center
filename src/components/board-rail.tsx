"use client";

import type { BoardCard } from "@/lib/board";
import { WorkCard } from "./work-card";

export function BoardRail({
  id,
  title,
  meaning,
  spine,
  cards,
  emptyText,
  now,
  agentFilter,
  onAgentSelect,
}: {
  id: string;
  title: string;
  meaning: string;
  spine: string;
  cards: BoardCard[];
  emptyText: string;
  now: number;
  agentFilter: string | null;
  onAgentSelect: (agentId: string) => void;
}) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24">
      <header className="mb-2.5 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `var(${spine})` }}
          aria-hidden="true"
        />
        <h2 className="text-[12px] font-bold uppercase tracking-[0.07em] text-zk-text">
          {title}
        </h2>
        <span className="text-[12px] font-bold text-zk-muted">{cards.length}</span>
        <span className="ml-auto hidden text-[11px] text-zk-muted xl:block">
          {meaning}
        </span>
      </header>

      <div
        className="space-y-2.5 border-l-[3px] pl-3.5"
        style={{ borderLeftColor: `var(${spine})` }}
      >
        {cards.map((card) => (
          <WorkCard
            key={card.key}
            card={card}
            now={now}
            agentFilter={agentFilter}
            onAgentSelect={onAgentSelect}
          />
        ))}

        {cards.length === 0 ? (
          <p className="zk-inset rounded-card px-3.5 py-4 text-[12px] leading-relaxed text-zk-muted">
            {emptyText}
          </p>
        ) : null}
      </div>
    </section>
  );
}
