import Link from "next/link";
import type { Field } from "@/lib/board";
import { cn } from "@/lib/cn";

type Cell = {
  label: string;
  value: number;
  href: string;
  tone: string;
  hint?: string;
};

/**
 * The strip that answers "how bad is it" before any row is read. Counts cover
 * the whole backlog, not the slice on screen.
 */
export function Ledger({
  field,
  waiting,
  oldestWait,
}: {
  field: Field;
  waiting: number;
  oldestWait: string;
}) {
  const cells: Cell[] = [
    {
      label: "Needs you",
      value: waiting,
      href: "#need",
      tone: "text-zk-accent",
      hint: `oldest ${oldestWait}`,
    },
    { label: "Past due", value: field.counts.late, href: "#running", tone: "text-zk-bad-fg" },
    { label: "Running", value: field.counts.running, href: "#running", tone: "text-zk-info-fg" },
    { label: "Delivered", value: field.counts.delivered, href: "#shipped", tone: "text-zk-ok-fg" },
    /* Released is folded in rather than given its own cell: the live state of a
       returned issue is the same as one nobody ever took. The field keeps the
       split visible — solid square for a claim that came back, outline for one
       that was never made. */
    {
      label: "Unclaimed",
      value: field.counts.idle + field.counts.released,
      href: "#field",
      tone: "text-zk-muted",
    },
  ];

  return (
    <nav className="zk-ledger" aria-label="Workspace ledger">
      {cells.map((cell) => (
        <Link key={cell.label} href={cell.href} className="zk-ledger-cell">
          <span className="zk-label">{cell.label}</span>
          <span className={cn("zk-num text-[22px] font-bold leading-none", cell.tone)}>
            {cell.value}
          </span>
          {cell.hint ? (
            <span className="truncate text-[10px] text-zk-muted">{cell.hint}</span>
          ) : null}
        </Link>
      ))}

      {/* Not a state: the denominator the five cells above add up to. "Backlog"
          would collide with UNCLAIMED and claim delivered work as unfinished. */}
      <div className="zk-ledger-cell justify-between">
        <span className="zk-label">All issues</span>
        <span className="zk-num text-[22px] font-bold leading-none text-zk-text2">
          {field.total}
        </span>
        <span className="text-[10px] text-zk-muted">every state counted</span>
      </div>
    </nav>
  );
}
