"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Inbox,
  LayoutDashboard,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/cn";
import { NotificationsButton } from "./notifications";
import { ZikiLogo } from "./ziki-logo";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/needs-you", label: "Needs you", icon: Inbox, needs: true },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/activity", label: "Activity", icon: Activity },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

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

            <span
              className="ml-1 hidden h-[36px] items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-3 text-[12px] font-semibold text-zk-text lg:inline-flex"
              title="Active workspace"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#6ee7a8]"
                aria-hidden="true"
              />
              Zedu
            </span>

            <span className="hidden h-5 w-px bg-zk-border lg:block" aria-hidden="true" />

            <nav
              className="hidden items-center gap-1 lg:flex"
              aria-label="Primary navigation"
            >
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition",
                      active
                        ? "bg-zk-chip text-zk-text"
                        : "text-zk-text2 hover:bg-white/[0.04] hover:text-zk-text",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        active ? "text-[#8fc9ff]" : "text-zk-muted",
                      )}
                      aria-hidden="true"
                    />
                    {item.label}
                    {item.needs && ready && needsCount > 0 ? (
                      <span
                        className={cn(
                          "ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold",
                          active
                            ? "bg-electric-blue-strong text-white"
                            : "bg-zk-seg text-zk-text2",
                        )}
                      >
                        {needsCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span
                className="zk-chip hidden border-dashed border-[#35507a] bg-transparent text-[#a9b8d1] xl:inline-flex"
                title="Illustrative data. Actions stay in this browser."
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Demo data
              </span>
              <NotificationsButton />
              <div
                className="flex items-center gap-2 rounded-full border border-zk-border bg-zk-surface p-1 sm:pr-3"
                title="Fawaz Yusuff · Zedu workspace"
              >
                <span className="zk-avatar h-8 w-8 bg-[#2b4a7d] text-[11px]">
                  FY
                </span>
                <span className="hidden text-[12px] font-semibold text-zk-text sm:block">
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

        <footer className="mx-auto mt-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-8">
          <div className="flex flex-col gap-2 border-t border-zk-border pt-4 text-[11px] leading-relaxed text-zk-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Illustrative workspace data · Actions stay in this browser · No
              Ziki API connection.
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

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zk-border bg-zk-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(2,7,18,0.28)] lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
                  active ? "text-zk-text" : "text-zk-muted hover:text-zk-text2",
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      active ? "text-[#8fc9ff]" : "text-zk-muted",
                    )}
                    aria-hidden="true"
                  />
                  {item.needs && ready && needsCount > 0 ? (
                    <span className="absolute -right-2.5 -top-2 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-electric-blue-strong px-1 text-[9px] font-extrabold text-white">
                      {needsCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
