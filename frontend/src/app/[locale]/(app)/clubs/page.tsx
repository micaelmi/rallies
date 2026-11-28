import { PageFrame } from "@/components/shared/page-frame";
import {
  ClubsDirectoryClient,
  type ClubSummaryView
} from "@/components/clubs/clubs-directory-client";
import { getApiBaseUrl } from "@/lib/api/config";

type ClubsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ClubsPage({ params }: ClubsPageProps) {
  const { locale } = await params;

  let initialClubs: ClubSummaryView[] = [];

  try {
    const response = await fetch(`${getApiBaseUrl()}/clubs`, {
      headers: { "x-locale": locale },
      cache: "no-store"
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as {
        items?: ClubSummaryView[];
      } | null;
      if (data?.items) {
        initialClubs = data.items;
      }
    }
  } catch {
    initialClubs = [];
  }

  return (
    <PageFrame className="py-10">
      <ClubsDirectoryClient initialClubs={initialClubs} />
    </PageFrame>
  );
}
