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
      label: "Need you",
      value: waiting,
      href: "#need",
      tone: "text-zk-accent",
      hint: `oldest ${oldestWait}`,
    },
    { label: "Past due", value: field.counts.late, href: "#running", tone: "text-zk-bad-fg" },
    { label: "Running", value: field.counts.running, href: "#running", tone: "text-zk-info-fg" },
    { label: "Delivered", value: field.counts.delivered, href: "#shipped", tone: "text-zk-ok-fg" },
    { label: "Released", value: field.counts.released, href: "#shipped", tone: "text-zk-text2" },
    { label: "No agent", value: field.counts.idle, href: "#field", tone: "text-zk-muted" },
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

      <div className="zk-ledger-cell justify-between">
        <span className="zk-label">Backlog</span>
        <span className="zk-num text-[22px] font-bold leading-none text-zk-text2">
          {field.total}
        </span>
        <span className="text-[10px] text-zk-muted">issues tracked</span>
      </div>
    </nav>
  );
}
