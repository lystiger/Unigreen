"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { getDictionary } from "@/lib/i18n";
import { cataloguePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { useBasket } from "@/components/basket/BasketProvider";
import { BasketLineRow } from "@/components/basket/BasketLineRow";

export function QuotationRequestForm({ locale }: { readonly locale: Locale }) {
  const copy = getDictionary(locale);
  const { state, submittable, hydrated, dispatch } = useBasket();
  const idempotencyKey = useRef<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const result = await apiRequest<{ reference: string }>(
        "/api/v1/public/inquiries",
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey.current },
          body: JSON.stringify({
            contact_name: String(form.get("contact_name") ?? ""),
            email: String(form.get("email") ?? ""),
            company_name: String(form.get("company_name") ?? "") || null,
            phone: String(form.get("phone") ?? "") || null,
            notes: String(form.get("notes") ?? "") || null,
            locale,
            lines: submittable.map((line) => ({
              product_slug: line.productSlug,
              quantity: line.quantity,
              unit: line.unit,
              pack_option: line.packOption ?? null,
              requirements: line.note,
            })),
          }),
        },
      );
      setSent(result.reference);
      dispatch({ type: "clear" });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : copy.inquiry.error);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <section className="shell py-20" aria-busy="true" />;

  return (
    <section className="shell py-12 lg:py-20">
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">
        INQUIRY BASKET
      </p>
      <h1 className="mt-3 text-h1 font-semibold text-ink">{copy.inquiry.title}</h1>
      <p className="mt-5 max-w-2xl text-lead text-ink-muted">{copy.inquiry.body}</p>
      {sent ? (
        <div className="mt-10 border border-brand-green/30 bg-brand-tint p-8">
          <p className="font-mono text-eyebrow tracking-widest text-brand-green">
            REQUEST SENT
          </p>
          <h2 className="mt-3 text-h2 font-semibold text-ink">
            {copy.inquiry.success.replace("{reference}", sent)}
          </h2>
        </div>
      ) : state.items.length === 0 ? (
        <div className="mt-10 border border-line bg-paper-raised p-8">
          <p className="text-body text-ink-muted">{copy.basket.emptyBody}</p>
          <Link
            href={cataloguePath(locale)}
            className="mt-6 inline-flex min-h-11 items-center rounded-control bg-brand-green px-5 py-3 font-medium text-white"
          >
            {copy.basket.emptyCta}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            {state.items.map((line) => (
              <BasketLineRow
                key={line.productSlug}
                line={line}
                locale={locale}
                copy={copy.basket}
                detailed
              />
            ))}
          </div>
          <div className="h-fit border border-line bg-paper-raised p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-data text-ink-muted">
                {copy.inquiry.contactName}
                <input
                  required
                  name="contact_name"
                  className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-paper px-3 text-body"
                />
              </label>
              <label className="text-data text-ink-muted">
                {copy.inquiry.email}
                <input
                  required
                  type="email"
                  name="email"
                  className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-paper px-3 text-body"
                />
              </label>
              <label className="text-data text-ink-muted">
                {copy.inquiry.company}
                <input
                  name="company_name"
                  className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-paper px-3 text-body"
                />
              </label>
              <label className="text-data text-ink-muted">
                {copy.inquiry.phone}
                <input
                  name="phone"
                  className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-paper px-3 text-body"
                />
              </label>
            </div>
            <label className="mt-4 block text-data text-ink-muted">
              {copy.inquiry.notes}
              <textarea
                name="notes"
                rows={4}
                className="mt-1 w-full rounded-control border border-line-strong bg-paper px-3 py-3 text-body"
              />
            </label>
            {error ? (
              <p role="alert" className="mt-4 text-data text-status-rejected">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || submittable.length === 0}
              className="mt-6 min-h-12 rounded-control bg-brand-green px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {busy ? copy.inquiry.sending : copy.inquiry.cta}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
