"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { groupFeed } from "@/lib/demo-selectors";
import { avatarTone, formatRelative, initials, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, TimeMeter } from "./ui";

type Filter = "all" | "needs" | "updates";

export function NotificationsButton() {
  const { feed, unreadCount, markRead, markAllRead, now, ready } = useDemo();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const needsCount = feed.filter((item) => item.needsYou).length;
  const updateCount = feed.filter((item) => !item.needsYou).length;
  const filtered =
    filter === "all"
      ? feed
      : feed.filter((item) =>
          filter === "needs" ? item.needsYou : !item.needsYou,
        );
  const groups = groupFeed(filtered);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-zk-border bg-zk-surface text-zk-text2 transition hover:border-zk-border-strong hover:text-zk-text",
          open && "border-electric-blue/50 text-zk-text",
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {ready && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-zk-surface bg-electric-blue-strong px-1 text-[9px] font-extrabold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="zk-popover fixed inset-x-3 top-[68px] z-50 max-h-[min(640px,calc(100vh-90px))] overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[420px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zk-border px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zk-text">
                  Notifications
                </h2>
                {unreadCount > 0 ? (
                  <Badge tone="accent">{unreadCount} unread</Badge>
                ) : (
                  <Badge tone="ok">Caught up</Badge>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-zk-muted">
                Grouped by issue
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="zk-btn zk-btn-ghost zk-btn-xs"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark read
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="zk-btn zk-btn-ghost zk-btn-xs !px-2 sm:hidden"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-zk-border bg-zk-seg/60 px-3 py-2">
            {(
              [
                { id: "all", label: "All", count: feed.length },
                { id: "needs", label: "Needs you", count: needsCount },
                { id: "updates", label: "Updates", count: updateCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={filter === tab.id}
                className={cn(
                  "min-h-[30px] rounded-full px-3 text-[12px] transition",
                  filter === tab.id
                    ? "bg-zk-surface font-bold text-zk-text shadow-sm"
                    : "font-medium text-zk-text2 hover:text-zk-text",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] text-zk-muted">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-[430px] overflow-y-auto overscroll-contain px-2 py-2">
            {!ready ? (
              <div className="space-y-2 p-2">
                <div className="zk-skeleton h-16" />
                <div className="zk-skeleton h-16" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <Inbox className="h-5 w-5 text-zk-muted" aria-hidden="true" />
                <p className="mt-2 text-[13px] font-semibold text-zk-text">
                  {filter === "needs"
                    ? "Nothing needs you right now."
                    : "You're all caught up."}
                </p>
                <p className="mt-1 text-[11px] text-zk-muted">
                  New requests will appear here.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <section
                  key={group.key}
                  className="mb-1.5 rounded-2xl border border-transparent px-1 py-1 last:mb-0"
                  aria-label={`Issue ${group.issue.number}`}
                >
                  <div className="flex items-start justify-between gap-2 px-2.5 py-1.5">
                    <p className="min-w-0 text-[11px] font-semibold leading-snug text-zk-muted">
                      <span className="text-zk-text2">#{group.issue.number}</span>{" "}
                      <span className="line-clamp-1">{group.issue.title}</span>
                    </p>
                    {group.needsCount > 0 ? (
                      <span className="shrink-0 text-[10px] font-bold text-zk-warn-fg">
                        {group.needsCount === 1
                          ? "1 request needs you"
                          : `${group.needsCount} requests need you`}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          markRead([item.id]);
                          setOpen(false);
                        }}
                        className={cn(
                          "block rounded-xl border px-2.5 py-2 transition hover:border-zk-border-strong",
                          item.needsYou
                            ? "border-zk-dashed bg-zk-seg/70"
                            : "border-transparent hover:bg-zk-chip/60",
                          !item.unread && "opacity-70",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "zk-avatar h-7 w-7 text-[9px]",
                              avatarTone(item.actorName),
                            )}
                            aria-hidden="true"
                          >
                            {initials(item.actorName)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="text-[12px] font-bold text-zk-text">
                                {item.actorName}
                              </span>
                              <span className="text-[10px] text-zk-muted">
                                {item.actorRole} · {item.ownerName}
                              </span>
                              {item.needsYou ? (
                                <span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-zk-warn-fg">
                                  Needs you
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-zk-text2">
                              {item.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zk-muted">
                              {item.detail}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-zk-muted">
                                {formatRelative(item.at, now)}
                              </span>
                              {item.expiresAt && item.needsYou ? (
                                <TimeMeter
                                  target={item.expiresAt}
                                  now={now}
                                  className="min-h-[1.3rem] px-2 text-[10px]"
                                />
                              ) : null}
                            </div>
                          </div>
                          {item.unread ? (
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-blue"
                              aria-label="Unread"
                            />
                          ) : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zk-border bg-zk-surface px-4 py-2.5">
            <p className="text-[10px] text-zk-muted">
              {pluralize(feed.length, "notification")}
            </p>
            <Link
              href="/needs-you"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-zk-accent hover:text-zk-text"
            >
              Open Needs you
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
