"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { CELL_TEXT, type CellState, type FieldCell } from "@/lib/board";
import { cn } from "@/lib/cn";

const FILTERS: { id: CellState | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "need", label: "Need you" },
  { id: "late", label: "Past due" },
  { id: "running", label: "Running" },
  { id: "delivered", label: "Delivered" },
  { id: "released", label: "Released" },
  { id: "idle", label: "No agent" },
];

const PAGE = 40;

function matches(cell: FieldCell, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();

  return (
    String(cell.issue.number).includes(q) ||
    cell.issue.title.toLowerCase().includes(q) ||
    cell.label.toLowerCase().includes(q)
  );
}

/**
 * At ~1000 issues the only usable index is a search box. This sheet queries the
 * whole corpus, not the page, and results are capped so typing stays instant.
 */
export function FilterSheet() {
  const router = useRouter();
  const { field } = useDemo();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CellState | "all">("all");
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    if (!field) return [];

    return field.cells.filter(
      (cell) => (filter === "all" || cell.state === filter) && matches(cell, query.trim()),
    );
  }, [field, filter, query]);

  const shown = results.slice(0, limit);

  useEffect(() => {
    setLimit(PAGE);
    setActive(0);
  }, [query, filter]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        open();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function open() {
    dialogRef.current?.showModal();
  }

  function go(href: string | undefined) {
    if (!href) return;
    dialogRef.current?.close();
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="hidden h-8 items-center gap-2 rounded border border-zk-border bg-zk-bg px-2.5 text-[12px] text-zk-muted transition hover:border-zk-border-strong hover:text-zk-text md:flex"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Find an issue</span>
        <kbd className="zk-num ml-2 rounded border border-zk-border px-1 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={open}
        className="zk-icon-btn md:hidden"
        aria-label="Search issues"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>

      <dialog ref={dialogRef} className="zk-dialog !w-[min(40rem,calc(100vw-2rem))]">
        <div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((index) =>
                  Math.max(0, Math.min(shown.length - 1, index + step)),
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(shown[active]?.href);
              }
            }}
            className="zk-input !h-10 !text-[15px]"
            placeholder="Search every issue by number, title or agent"
            aria-label="Search issues"
          />

          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by state">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "zk-chip transition",
                  filter === item.id
                    ? "zk-chip-accent"
                    : "hover:border-zk-border-strong hover:text-zk-text",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ul className="mt-3 max-h-[26rem] overflow-y-auto">
            {shown.map((cell, index) => (
              <li key={cell.href}>
                <Link
                  href={cell.href}
                  prefetch={false}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex items-baseline gap-3 rounded px-2 py-2 text-[13px] transition",
                    index === active ? "bg-zk-active" : "hover:bg-zk-hover",
                  )}
                >
                  <span className="zk-num w-[64px] shrink-0 text-[12px] font-bold text-zk-muted">
                    #{cell.issue.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zk-text">
                    {cell.issue.title}
                  </span>
                  <span className="zk-label shrink-0">{CELL_TEXT[cell.state]}</span>
                </Link>
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="px-2 py-6 text-[13px] text-zk-muted">
                {query.trim() ? `No issue matches “${query}”.` : "Nothing in this state."}
              </li>
            ) : null}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-zk-divider pt-3">
            <p className="zk-label">
              {results.length} match{results.length === 1 ? "" : "es"}
              {results.length > shown.length ? ` · showing ${shown.length}` : ""}
            </p>
            {results.length > shown.length ? (
              <button
                type="button"
                onClick={() => setLimit((value) => value + PAGE)}
                className="zk-btn zk-btn-ghost zk-btn-xs"
              >
                More
              </button>
            ) : (
              <p className="text-[10px] text-zk-muted">↑↓ to move · enter to open</p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
