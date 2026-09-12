import type { InquiryStatus } from "@/lib/api/types";

export function InquiryStatusBadge({ status }: { readonly status: InquiryStatus }) {
  const style =
    status === "new"
      ? "border-blue-500/40 text-blue-700 bg-blue-50/50"
      : status === "qualified"
        ? "border-purple-500/40 text-purple-700 bg-purple-50/50"
        : status === "quoted"
          ? "border-amber-500/40 text-amber-800 bg-amber-50/50"
          : status === "won"
            ? "border-status-accepted/40 text-status-accepted bg-green-50/50"
            : status === "lost"
              ? "border-status-rejected/40 text-status-rejected bg-red-50/50"
              : "border-line-strong text-ink-muted bg-paper-sunk";

  return (
    <span
      className={`inline-flex items-center rounded-control border px-2.5 py-0.5 font-mono text-eyebrow font-medium tracking-wider ${style}`}
      data-testid={`inquiry-status-badge-${status}`}
    >
      {status}
    </span>
  );
}
