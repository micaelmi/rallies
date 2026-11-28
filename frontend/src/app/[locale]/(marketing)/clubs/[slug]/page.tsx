import { notFound } from "next/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import {
  ClubDetailClient,
  type ClubDetailView
} from "@/components/clubs/club-detail-client";
import { getApiBaseUrl } from "@/lib/api/config";

type ClubDetailPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const { locale, slug } = await params;

  const response = await fetch(
    `${getApiBaseUrl()}/clubs/${encodeURIComponent(slug)}`,
    {
      headers: { "x-locale": locale },
      cache: "no-store"
    }
  ).catch(() => null);

  if (!response || response.status === 404 || !response.ok) {
    notFound();
  }

  const club = (await response.json().catch(() => null)) as ClubDetailView | null;
  if (!club) {
    notFound();
  }

  return (
    <PageFrame className="py-10">
      <ClubDetailClient initialClub={club} />
    </PageFrame>
  );
}
