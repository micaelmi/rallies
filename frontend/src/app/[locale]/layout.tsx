import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppProvider } from "@/providers/app-provider";
import { routing, type AppLocale } from "@/i18n/routing";
import { SiteHeader } from "@/components/shared/site-header";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description")
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <AppProvider locale={locale} messages={messages}>
      <div className="page-shell">
        <SiteHeader locale={locale as AppLocale} />
        {children}
      </div>
    </AppProvider>
  );
}
