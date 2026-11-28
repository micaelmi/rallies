import { PageFrame } from "@/components/shared/page-frame";
import {
  EventsMarketplaceClient,
  type EventRecordView
} from "@/components/events/events-marketplace-client";
import { getApiBaseUrl } from "@/lib/api/config";

type EventsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params;

  let initialEvents: EventRecordView[] = [];

  try {
    const response = await fetch(`${getApiBaseUrl()}/events`, {
      headers: { "x-locale": locale },
      cache: "no-store"
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as {
        items?: EventRecordView[];
      } | null;
      if (data?.items) {
        initialEvents = data.items;
      }
    }
  } catch {
    initialEvents = [];
  }

  return (
    <PageFrame className="py-10">
      <EventsMarketplaceClient initialEvents={initialEvents} />
    </PageFrame>
  );
}
