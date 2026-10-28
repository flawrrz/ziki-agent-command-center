"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/cn";
import { NotificationsButton } from "./notifications";
import { ThemeToggle } from "./theme-toggle";
import { ZikiLogo } from "./ziki-logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { needsCount, ready, resetDemo } = useDemo();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[80] focus:rounded-full focus:border focus:border-zk-border focus:bg-zk-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        Skip to content
      </a>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-zk-border bg-zk-surface/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
            <ZikiLogo />

            <Link
              href="/"
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold transition",
                pathname === "/"
                  ? "bg-zk-chip text-zk-text"
                  : "text-zk-text2 hover:bg-zk-hover hover:text-zk-text",
              )}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              Today
            </Link>

            {/* The board already leads with this count; only offer the jump elsewhere. */}
            {ready && needsCount > 0 && pathname !== "/" ? (
              <Link
                href="/#need"
                className="zk-chip zk-chip-warn hidden sm:inline-flex"
              >
                {needsCount} {needsCount === 1 ? "needs" : "need"} you
              </Link>
            ) : null}

            <span
              className="hidden h-[36px] items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-3 text-[12px] font-semibold text-zk-text lg:inline-flex"
              title="Active workspace"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-zk-ok-fg"
                aria-hidden="true"
              />
              Zedu
            </span>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <NotificationsButton />
              <div
                className="hidden items-center gap-2 rounded-full border border-zk-border bg-zk-surface p-1 pr-3 sm:flex"
                title="Fawaz Yusuff · Zedu workspace"
              >
                <span className="zk-avatar h-8 w-8 bg-zk-av-1 text-[11px]">
                  FY
                </span>
                <span className="text-[12px] font-semibold text-zk-text">
                  Fawaz
                </span>
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8"
        >
          {children}
        </main>

        <footer className="mx-auto mt-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6">
          <div className="flex flex-col gap-2 border-t border-zk-border pt-4 text-[11px] leading-relaxed text-zk-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Prototype data · stays in this browser · no Ziki API connection.
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="zk-btn zk-btn-ghost zk-btn-xs self-start border border-zk-border sm:self-auto"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset demo
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
