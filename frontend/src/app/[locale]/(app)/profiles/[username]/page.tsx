import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  ExternalLink,
  Trophy,
  Users,
  Swords,
  ArrowLeft,
  Share2
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api/config";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PublicProfileData = {
  username: string;
  city: string | null;
  state: string | null;
  country: string;
  instagramUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProfilePageProps = {
  params: Promise<{
    locale: string;
    username: string;
  }>;
};

async function fetchPublicProfile(slug: string): Promise<PublicProfileData | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      return null;
    }
    return await res.json() as PublicProfileData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username, locale } = await params;
  const profile = await fetchPublicProfile(username);
  const t = await getTranslations({ locale, namespace: "profiles.public" });

  if (!profile) {
    return {
      title: `${t("notFoundTitle")} | Rallies`,
      description: t("notFoundDescription")
    };
  }

  const title = `@${profile.username} | Rallies Table Tennis`;
  const description =
    profile.description ||
    `${profile.username} - table tennis player from ${[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://rallies.app/${locale}/profiles/${encodeURIComponent(profile.username)}`,
      siteName: "Rallies"
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username, locale } = await params;
  const profile = await fetchPublicProfile(username);
  const t = await getTranslations({ locale, namespace: "profiles.public" });

  if (!profile) {
    return (
      <div className="mx-auto py-12 max-w-2xl text-center">
        <Card className="p-8 sm:p-12">
          <div className="mx-auto flex justify-center items-center bg-muted/20 mb-6 rounded-full w-16 h-16 text-muted-foreground">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="font-bold text-foreground text-2xl tracking-tight">{t("notFoundTitle")}</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{t("notFoundDescription")}</p>
          <div className="mt-8">
            <Link href={`/${locale}/profiles`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("backToDirectory")}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const locationStr = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");
  const memberSinceDate = new Date(profile.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "long"
  });

  return (
    <div className="mx-auto py-8 max-w-4xl">
      {/* Navigation & Action Header */}
      <div className="flex justify-between items-center mb-6">
        <Link href={`/${locale}/profiles`}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            {t("backToDirectory")}
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          {t("shareProfile")}
        </Button>
      </div>

      {/* Main Profile Hero Card */}
      <Card className="p-6 sm:p-10 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="flex items-center gap-5">
            <div className="flex justify-center items-center bg-primary shadow-sm rounded-2xl w-20 h-20 sm:w-24 sm:h-24 font-bold text-primary-foreground text-3xl shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-bold text-foreground text-2xl sm:text-3xl tracking-tight">
                  @{profile.username}
                </h1>
                <Badge variant="success" className="gap-1.5 px-2.5 py-0.5 text-xs">
                  <span className="bg-success rounded-full w-1.5 h-1.5" />
                  {t("active")}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2.5 text-muted-foreground text-xs sm:text-sm">
                {locationStr && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    {locationStr}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  {t("memberSince")} {memberSinceDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Social / External Links */}
        {profile.instagramUrl && (
          <div className="mt-6 pt-5 border-border/60 border-t">
            <a
              href={profile.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-card hover:bg-accent/50 px-3 py-1.5 border border-border/80 rounded-lg font-medium text-foreground hover:text-accent-foreground text-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
              <span>{t("instagram")}</span>
            </a>
          </div>
        )}

        {/* Bio Section */}
        <div className="mt-6 pt-5 border-border/60 border-t">
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            {t("bio")}
          </h2>
          <p className="mt-2 text-foreground/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {profile.description?.trim() || t("noBio")}
          </p>
        </div>
      </Card>

      {/* Ecosystem Tabs / Future Activity Sections (Match History, Clubs, Events) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Match History Placeholder */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 mb-3 font-semibold text-foreground text-sm">
              <Swords className="w-4 h-4 text-primary" />
              <span>{t("matchHistoryTab")}</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("noMatches")}
            </p>
          </div>
        </Card>

        {/* Clubs & Teams Placeholder */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 mb-3 font-semibold text-foreground text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span>{t("clubsTab")}</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("noClubs")}
            </p>
          </div>
        </Card>

        {/* Tournaments Placeholder */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 mb-3 font-semibold text-foreground text-sm">
              <Trophy className="w-4 h-4 text-primary" />
              <span>{t("eventsTab")}</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("noEvents")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
