import { isLocale } from "@/lib/i18n";
import { QuotationRequestForm } from "@/components/inquiry/QuotationRequestForm";
import { notFound } from "next/navigation";

export default async function InquiryPlaceholder({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <QuotationRequestForm locale={locale} />;
}
