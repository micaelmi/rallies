import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type EventDetailPageProps = {
  params: Promise<{
    locale: string;
    eventId: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { locale, eventId } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.eventDetail" });

  return <PlaceholderPage eyebrow="Events" title={`${t("title")}: ${eventId}`} description={t("description")} />;
}
