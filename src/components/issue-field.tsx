"use client";

import Link from "next/link";
import { useState } from "react";
import type { CellState, Field, FieldCell } from "@/lib/board";

const BANDS: { state: CellState; label: string; cap: number }[] = [
  { state: "need", label: "Needs you", cap: 60 },
  { state: "late", label: "Past due", cap: 60 },
  { state: "running", label: "Working", cap: 140 },
  { state: "delivered", label: "Delivered", cap: 140 },
  { state: "released", label: "Released", cap: 140 },
  { state: "idle", label: "No agent", cap: 120 },
];

function Band({
  label,
  state,
  cells,
  total,
}: {
  label: string;
  state: CellState;
  cells: FieldCell[];
  total: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="zk-label w-[6.25rem] shrink-0 pt-0.5">
        {label}
        <span className="zk-num ml-2 font-normal text-zk-text2">{total}</span>
      </span>
      <div className="zk-field min-w-0 flex-1" data-band={state}>
        {cells.map((cell) => (
          <Link
            key={cell.href}
            href={cell.href}
            prefetch={false}
            className="zk-cell"
            data-state={cell.state}
            title={cell.label}
            aria-label={cell.label}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One square per issue, so ~1000 rows fit on a screen. Only the states that
 * changed recently are drawn at full strength; history fades to grey.
 */
export function IssueField({ field }: { field: Field }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {BANDS.map((band) => {
        const all = field.cells.filter((cell) => cell.state === band.state);

        return all.length === 0 ? null : (
          <Band
            key={band.state}
            label={band.label}
            state={band.state}
            total={all.length}
            cells={expanded ? all : all.slice(0, band.cap)}
          />
        );
      })}

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="zk-btn zk-btn-ghost zk-btn-xs self-start"
        >
          Show every issue
        </button>
      ) : (
        <p className="text-[11px] text-zk-muted">
          {field.total} issues · {field.counts.need} of them are waiting on you
        </p>
      )}
    </div>
  );
}
