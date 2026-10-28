"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import type { Toast } from "@/lib/demo-store";
import type { FeedbackTone } from "@/lib/demo-actions";

const TONE_STYLES: Record<
  FeedbackTone,
  { icon: typeof CircleCheck; className: string; iconClassName: string }
> = {
  success: {
    icon: CircleCheck,
    className: "border-zk-ok-bd bg-zk-ok-bg text-zk-on-ok",
    iconClassName: "text-zk-ok-fg",
  },
  info: {
    icon: Info,
    className: "border-zk-info-bd bg-zk-info-bg text-zk-on-info",
    iconClassName: "text-zk-info-fg",
  },
  warn: {
    icon: CircleAlert,
    className: "border-zk-warn-bd bg-zk-warn-bg text-zk-on-warn",
    iconClassName: "text-zk-warn-fg",
  },
  error: {
    icon: CircleAlert,
    className: "border-zk-bad-bd bg-zk-bad-bg text-zk-on-bad",
    iconClassName: "text-zk-bad-fg",
  },
};

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const tone = TONE_STYLES[toast.tone];
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl zk-rise ${tone.className}`}
          >
            <Icon
              className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClassName}`}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-zk-active hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
