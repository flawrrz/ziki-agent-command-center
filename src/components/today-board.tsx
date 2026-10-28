"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { buildBoard, type BoardCard } from "@/lib/board";
import { CHECKPOINTS } from "@/lib/progress";
import { readLastSeen, writeLastSeen } from "@/lib/last-seen";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "./ui";
import { Ledger } from "./ledger";
import { FocusCard } from "./focus-card";
import { QueueRow } from "./queue-row";
import { IssueField } from "./issue-field";

const CAP = { need: 6, running: 10, shipped: 6 };

/* Stated once so the numbered rail cells need no per-row caption. */
const RAIL_LEGEND = CHECKPOINTS.map(
  (checkpoint, index) => `${index + 1} ${checkpoint.label.toLowerCase()}`,
).join(" · ");

function SectionTitle({
  id,
  label,
  count,
  marker,
  note,
}: {
  id: string;
  label: string;
  count: number;
  marker: string;
  note?: string;
}) {
  return (
    <h2
      id={`${id}-heading`}
      className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-zk-divider pb-2"
    >
      <span className={cn("h-2 w-2 shrink-0 self-center", marker)} aria-hidden="true" />
      <span className="zk-label">{label}</span>
      <span className="zk-num text-[13px] font-bold text-zk-text">{count}</span>
      {/* The rail legend is stated once here rather than guessed at on every row. */}
      {note ? (
        <span className="ml-auto hidden text-[10px] text-zk-muted md:inline">{note}</span>
      ) : null}
    </h2>
  );
}

function Rows({
  cards,
  now,
  since,
  limit,
  emptyNote,
}: {
  cards: BoardCard[];
  now: number;
  since: number | null;
  limit: number;
  emptyNote: string;
}) {
  if (cards.length === 0) {
    if (!emptyNote) return null;

    return <p className="py-3 text-[13px] text-zk-muted">{emptyNote}</p>;
  }

  return (
    <ul>
      {cards.slice(0, limit).map((card) => (
        <QueueRow
          key={card.key}
          card={card}
          now={now}
          isNew={since !== null && card.at >= since}
        />
      ))}
    </ul>
  );
}

export function TodayBoard() {
  const { ready, state, now, field } = useDemo();
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const since = useMemo(() => readLastSeen(Date.now()), []);

  useEffect(() => {
    writeLastSeen(Date.now());
  }, []);

  const board = useMemo(
    () => (state ? buildBoard(state, now) : null),
    [state, now],
  );

  if (!ready || !board || !state || !field) return <PageSkeleton rows={5} />;

  const lead = board.waiting[0];
  /* The queue is sorted by urgency, so its last row is the least urgent, not the
     longest wait. The ledger's hint has to measure the wait itself. */
  const oldest = board.waiting.reduce<BoardCard | null>(
    (soonest, card) => (soonest === null || card.at < soonest.at ? card : soonest),
    null,
  );

  const sections: {
    id: string;
    label: string;
    marker: string;
    cards: BoardCard[];
    count: number;
    cap: number;
    empty: string;
    note?: string;
  }[] = [
    {
      id: "need",
      label: "Need you",
      marker: "bg-zk-accent",
      cards: board.waiting.slice(1),
      /* The lead item is on screen too, as the focus card above, so the header
         has to count it or the two NEED YOU numbers disagree. */
      count: board.waiting.length,
      cap: CAP.need,
      /* With a single live need the focus card is the whole section, so the
         list must not claim nothing is waiting. */
      empty: board.waiting.length === 0 ? "Nothing is waiting on a decision." : "",
    },
    {
      id: "running",
      label: "Agent working",
      marker: "bg-zk-info-fg",
      cards: board.running,
      count: board.running.length,
      cap: CAP.running,
      empty: "No agent holds a claim right now.",
      note: RAIL_LEGEND,
    },
    {
      id: "shipped",
      label: "Delivered",
      marker: "bg-zk-ok-fg",
      cards: board.shipped,
      count: board.shipped.length,
      cap: CAP.shipped,
      empty: "Nothing has landed in this workspace yet.",
    },
  ];

  return (
    <div className="mx-auto max-w-[72rem] space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="zk-label text-zk-accent">Zedu issues</h1>
          <p className="zk-num mt-1.5 text-[12px] text-zk-muted">
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            }).format(now)}{" "}
            · {field.total} issues tracked
          </p>
        </div>
      </header>

      <Ledger
        field={field}
        waiting={board.waiting.length}
        oldestWait={
          oldest ? formatDuration(now - oldest.at) : "no wait"
        }
      />

      {lead ? (
        <FocusCard card={lead} />
      ) : (
        <div className="zk-card px-5 py-6">
          <p className="text-[19px] font-bold leading-tight text-zk-text">
            All clear
          </p>
          <p className="mt-1.5 text-[13px] text-zk-muted">
            No agent is blocked on you.
          </p>
        </div>
      )}

      {sections.map((section) => {
        const limit = expanded[section.id] ?? section.cap;
        /* Rows shown outside the list — the focus card — so the expand control
           and the header count the same set. */
        const off = section.count - section.cards.length;
        const shown = Math.min(limit + off, section.count);
        const hidden = section.count - shown;

        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-20"
            aria-labelledby={`${section.id}-heading`}
          >
            <SectionTitle
              id={section.id}
              label={section.label}
              count={section.count}
              marker={section.marker}
              note={section.note}
            />

            <Rows
              cards={section.cards}
              now={now}
              since={since}
              limit={limit}
              emptyNote={section.empty}
            />

            {hidden > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setExpanded((value) => ({
                    ...value,
                    [section.id]: Math.min(
                      section.cards.length,
                      limit + section.cap * 3,
                    ),
                  }))
                }
                className="zk-btn zk-btn-ghost zk-btn-xs mt-2"
              >
                Show {Math.min(hidden, section.cap * 3)} more
                <span className="zk-num opacity-60">
                  {shown}/{section.count}
                </span>
              </button>
            ) : null}
          </section>
        );
      })}

      <section id="field" className="scroll-mt-20">
        <SectionTitle
          id="field"
          label="The field"
          count={field.total}
          marker="bg-zk-dot"
        />
        <div className="pt-3">
          <IssueField field={field} />
        </div>
      </section>
    </div>
  );
}
