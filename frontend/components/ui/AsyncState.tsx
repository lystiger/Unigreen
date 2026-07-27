"use client";

interface ApiErrorStateProps {
  readonly title: string;
  readonly message: string;
  readonly requestId?: string;
  readonly retryLabel: string;
  readonly onRetry: () => void;
}

export function ApiErrorState({
  title,
  message,
  requestId,
  retryLabel,
  onRetry,
}: ApiErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-card border border-status-rejected/40 bg-paper-raised p-6"
    >
      <h2 className="text-h3 font-medium text-ink">{title}</h2>
      <p className="mt-2 text-body text-ink-muted">{message}</p>
      {requestId ? (
        <p className="mt-2 font-mono text-data text-ink-faint">
          Request ID: {requestId}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 mt-5 rounded-control bg-brand-green px-4 py-2 font-medium text-white"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <div
      aria-label="Loading catalogue"
      aria-busy="true"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-80 animate-pulse rounded-card border border-line bg-paper-sunk"
        />
      ))}
    </div>
  );
}
