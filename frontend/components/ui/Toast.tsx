"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastTone = "info" | "warning";

interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

interface ToastApi {
  readonly show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Non-blocking feedback. Replaces `alert()`, which steals focus and cannot be
 * localized or styled (Sprint 2 section 9).
 *
 * The region is `aria-live="polite"` rather than `role="alert"`: adding to the
 * basket is a confirmation, not an emergency, and an assertive announcement
 * would interrupt whatever the reader is doing mid-sentence.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      5_000,
    );
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className={[
              "pointer-events-auto max-w-md rounded-card px-4 py-3 text-body shadow-lg",
              toast.tone === "warning"
                ? "bg-status-pending text-white"
                : "bg-ink text-paper",
            ].join(" ")}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
