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
    className: "border-[#1d5a40] bg-[#0f3326] text-[#d8fbe8]",
    iconClassName: "text-[#6ee7a8]",
  },
  info: {
    icon: Info,
    className: "border-[#294a7f] bg-[#14294f] text-[#dceaff]",
    iconClassName: "text-[#9cc2ff]",
  },
  warn: {
    icon: CircleAlert,
    className: "border-[#6b5216] bg-[#3a2c0c] text-[#fff3d0]",
    iconClassName: "text-[#f6cf6b]",
  },
  error: {
    icon: CircleAlert,
    className: "border-[#6b2a27] bg-[#3a1517] text-[#ffe3e0]",
    iconClassName: "text-[#fca5a0]",
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
              className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-white/10 hover:opacity-100"
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
