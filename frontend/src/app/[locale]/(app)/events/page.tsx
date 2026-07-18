import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type EventsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.eventsIndex" });
  const common = await getTranslations({ locale, namespace: "common" });

  return <PlaceholderPage eyebrow="Events" title={t("title")} description={t("description")} footer={common("comingSoon")} />;
}
