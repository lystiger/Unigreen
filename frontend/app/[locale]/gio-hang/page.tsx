import { BasketPage } from "@/components/basket/BasketPage";
import { isLocale } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";

export default async function VietnameseBasketPage({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "en") redirect("/en/basket");
  return <BasketPage locale={locale} />;
}
