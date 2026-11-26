import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

type AppHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type OwnProfileSummary = {
  username: string;
  country: string;
  city: string | null;
  state: string | null;
};

async function AuthenticatedAppHome({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "appHome" });

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <PlaceholderPage
        eyebrow="Rallies"
        title={t("title", { username: "player" })}
        description={t("description")}
      />
    );
  }

  const { getToken } = await auth.protect();
  const token = await getToken();

  let profile: OwnProfileSummary | null = null;

  if (token) {
    const res = await fetch(`${getApiBaseUrl()}/profiles/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-locale": locale
      },
      cache: "no-store"
    }).catch(() => null);

    if (res && res.status === 404) {
      redirect(`/${locale}/profiles/setup`);
    }

    if (res && res.ok) {
      profile = (await res.json()) as OwnProfileSummary;
    }
  }

  if (!profile) {
    redirect(`/${locale}/profiles/setup`);
  }

  return (
    <PageFrame className="py-10">
      <Card className="p-6 sm:p-10">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.2em]">
          Rallies
        </p>
        <h1 className="mt-3 font-bold text-foreground text-3xl tracking-tight">
          {t("title", { username: profile.username })}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href={`/profiles/${encodeURIComponent(profile.username)}`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            {t("viewPublicProfile")}
          </Link>
          <Link
            href="/profiles/me"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("myProfile")}
          </Link>
          <Link
            href="/clubs"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            {t("browseClubs")}
          </Link>
          <Link
            href="/events"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            {t("browseEvents")}
          </Link>
        </div>
      </Card>
    </PageFrame>
  );
}

export default async function AppHomePage({ params }: AppHomePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={null}>
      <AuthenticatedAppHome locale={locale} />
    </Suspense>
  );
}
