import { Be_Vietnam_Pro, Inter_Tight } from "next/font/google";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { HTML_LANG, LOCALES, getDictionary, isLocale } from "@/lib/i18n";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam",
});

const interTight = Inter_Tight({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter-tight",
});

interface LocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

/** Both locales are known at build time, so both trees prerender. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "vi";
  const dictionary = getDictionary(locale);

  return {
    title: {
      default: `Uni-Green — ${dictionary.hero.eyebrow}`,
      template: "%s — Uni-Green",
    },
    description: dictionary.hero.lead,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        LOCALES.map((candidate) => [HTML_LANG[candidate], `/${candidate}`]),
      ),
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${beVietnam.variable} ${interTight.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-brand-green focus:px-4 focus:py-2 focus:text-white"
        >
          {dictionary.nav.skipToContent}
        </a>

        <QueryProvider>
          <SiteHeader
            locale={locale}
            copy={dictionary.nav}
            hotline={dictionary.footer.hotline}
          />

          <main id="main" className="flex-1">
            {children}
          </main>

          <SiteFooter locale={locale} copy={dictionary.footer} nav={dictionary.nav} />
        </QueryProvider>
      </body>
    </html>
  );
}
