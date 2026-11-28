import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, ptBR } from "@clerk/localizations";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppProvider } from "@/providers/app-provider";
import { routing, type AppLocale } from "@/i18n/routing";
import { ClerkAuthTokenProvider } from "@/components/shared/client-auth-token";
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

  const content = (
    <AppProvider locale={locale} messages={messages}>
      <div className="page-shell">
        <SiteHeader locale={locale as AppLocale} />
        {children}
      </div>
    </AppProvider>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  return (
    <ClerkProvider
      localization={locale === "pt-BR" ? ptBR : enUS}
      signInUrl={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      signInFallbackRedirectUrl={`/${locale}/app`}
      signUpFallbackRedirectUrl={`/${locale}/profiles/setup`}
    >
      <ClerkAuthTokenProvider>{content}</ClerkAuthTokenProvider>
    </ClerkProvider>
  );
}
