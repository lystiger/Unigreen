import { getDictionary, isLocale } from "@/lib/i18n";
import { cataloguePath } from "@/lib/routes";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function InquiryPlaceholder({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale);
  return (
    <section className="shell py-20">
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">
        Sprint 2
      </p>
      <h1 className="mt-3 text-h1 font-semibold">{copy.inquiry.title}</h1>
      <p className="mt-5 max-w-2xl text-lead text-ink-muted">{copy.inquiry.body}</p>
      <Link
        href={cataloguePath(locale)}
        className="mt-8 inline-flex min-h-11 items-center rounded-control bg-brand-green px-5 py-3 font-medium text-white"
      >
        {copy.products.viewAll}
      </Link>
    </section>
  );
}
