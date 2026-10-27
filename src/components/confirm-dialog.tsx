"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="zk-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="confirm-title"
          className="text-base font-extrabold tracking-[-0.01em] text-zk-text"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="zk-btn zk-btn-ghost zk-btn-xs !px-2"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p
        id="confirm-body"
        className="mt-2 text-[13px] leading-relaxed text-zk-text2"
      >
        {body}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          autoFocus={tone === "danger"}
          className="zk-btn zk-btn-secondary zk-btn-sm"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          autoFocus={tone !== "danger"}
          className={cn(
            "zk-btn zk-btn-sm",
            tone === "danger" ? "zk-btn-danger" : "zk-btn-primary",
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
