import { cn } from "@/lib/cn";

export type RingTone = "ok" | "warn" | "bad" | "muted";

const TONE_STROKE: Record<RingTone, string> = {
  ok: "text-zk-ok-fg",
  warn: "text-zk-warn-fg",
  bad: "text-zk-bad-fg",
  muted: "text-zk-dot",
};

export function DeadlineRing({
  start,
  deadline,
  now,
  size = 22,
  tone = "muted",
  className,
  children,
}: {
  start: number;
  deadline: number;
  now: number;
  size?: number;
  tone?: RingTone;
  className?: string;
  children?: React.ReactNode;
}) {
  const total = Math.max(1, deadline - start);
  const remaining = Math.min(1, Math.max(0, (deadline - now) / total));

  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="text-zk-border"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * remaining} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          stroke="currentColor"
          className={cn(TONE_STROKE[tone], "transition-[stroke-dasharray]")}
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center">
          {children}
        </span>
      ) : null}
    </span>
  );
}
