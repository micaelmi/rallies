import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

type ProfileMePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type OwnProfile = {
  userId: string;
  username: string;
  city: string | null;
  state: string | null;
  country: string;
  instagramUrl: string | null;
  description: string | null;
  preferredLocale: string;
  status: string;
};

async function AuthenticatedProfileMe({ locale }: { locale: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const t = await getTranslations({ locale, namespace: "placeholders.profileMe" });
    const common = await getTranslations({ locale, namespace: "common" });
    return (
      <PlaceholderPage
        eyebrow="Profiles"
        title={t("title")}
        description={t("description")}
        footer={common("comingSoon")}
      />
    );
  }

  const { getToken } = await auth.protect();
  const token = await getToken();

  if (!token) {
    redirect(`/${locale}/sign-in`);
  }

  const res = await fetch(`${getApiBaseUrl()}/profiles/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-locale": locale
    },
    cache: "no-store"
  }).catch(() => null);

  if (!res || res.status === 404) {
    redirect(`/${locale}/profiles/setup`);
  }

  if (!res.ok) {
    redirect(`/${locale}/app`);
  }

  const profile = (await res.json()) as OwnProfile;
  const t = await getTranslations({ locale, namespace: "profiles.public" });
  const appT = await getTranslations({ locale, namespace: "appHome" });
  const locationStr = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ");

  return (
    <PageFrame className="py-10">
      <Card className="p-6 sm:p-10">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-foreground text-3xl tracking-tight">
                @{profile.username}
              </h1>
              <Badge variant="success">{profile.status}</Badge>
            </div>
            {locationStr && (
              <p className="mt-2 text-muted-foreground text-sm">{locationStr}</p>
            )}
          </div>
          <Link
            href={`/profiles/${encodeURIComponent(profile.username)}`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            {appT("viewPublicProfile")}
          </Link>
        </div>

        <div className="mt-6 pt-5 border-border/60 border-t">
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            {t("bio")}
          </h2>
          <p className="mt-2 text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
            {profile.description?.trim() || t("noBio")}
          </p>
        </div>
      </Card>
    </PageFrame>
  );
}

export default async function ProfileMePage({ params }: ProfileMePageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={null}>
      <AuthenticatedProfileMe locale={locale} />
    </Suspense>
  );
}
