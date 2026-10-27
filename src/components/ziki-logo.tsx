import Link from "next/link";

export function ZikiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 13h16L5 27.5h16"
        stroke="currentColor"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 2.5 21 9h-9Z"
        fill="#38A3FF"
        stroke="#38A3FF"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ZikiLogo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-1 rounded-full"
      aria-label="Ziki agent command center"
    >
      <ZikiMark className="h-7 w-auto text-electric-blue-strong" />
      <span className="pr-1 text-[15px] font-semibold tracking-[-0.02em] text-zk-text">
        ziki
      </span>
    </Link>
  );
}
