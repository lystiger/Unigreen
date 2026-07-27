import type { components } from "@/lib/api/schema";

export function StatusBadge({
  status,
}: {
  readonly status: components["schemas"]["PublicationStatus"];
}) {
  const style =
    status === "published"
      ? "border-status-accepted/40 text-status-accepted"
      : status === "unpublished"
        ? "border-status-rejected/40 text-status-rejected"
        : "border-line-strong text-ink-muted";
  return (
    <span
      className={`rounded-control border px-2 py-1 font-mono text-eyebrow ${style}`}
    >
      {status}
    </span>
  );
}
