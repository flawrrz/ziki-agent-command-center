"use client";

import Link from "next/link";
import type { BriefLine, BriefSegment } from "@/lib/board";
import { cn } from "@/lib/cn";

const SEGMENT_CLASS: Record<BriefSegment["tone"], string> = {
  plain: "text-zk-text2",
  strong: "font-semibold text-zk-text",
  bad: "font-semibold text-zk-bad-fg",
  warn: "font-semibold text-zk-warn-fg",
  ok: "font-semibold text-zk-ok-fg",
};

const MARKER: Record<BriefLine["tone"], string> = {
  bad: "bg-zk-bad-fg",
  warn: "bg-zk-warn-fg",
  ok: "bg-zk-ok-fg",
  plain: "bg-zk-dot",
};

export function TodayBrief({ lines }: { lines: BriefLine[] }) {
  return (
    <section aria-label="Today brief" className="zk-card p-4 sm:p-5">
      <p className="zk-label mb-3">The brief</p>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-2.5 text-[14px] leading-[1.6]">
            <span
              className={cn("mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full", MARKER[line.tone])}
              aria-hidden="true"
            />
            <span>
              {line.segments.map((segment) =>
                segment.href ? (
                  <Link
                    key={segment.id}
                    href={segment.href}
                    className={cn(
                      SEGMENT_CLASS[segment.tone],
                      "underline decoration-zk-dashed underline-offset-4 transition hover:text-zk-accent hover:decoration-zk-accent",
                    )}
                  >
                    {segment.text}
                  </Link>
                ) : (
                  <span key={segment.id} className={SEGMENT_CLASS[segment.tone]}>
                    {segment.text}
                  </span>
                ),
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
