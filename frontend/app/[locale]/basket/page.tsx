import { BasketPage } from "@/components/basket/BasketPage";
import { isLocale } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";

export default async function EnglishBasketPage({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "vi") redirect("/vi/gio-hang");
  return <BasketPage locale={locale} />;
}
