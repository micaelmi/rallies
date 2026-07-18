import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type ClubsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ClubsPage({ params }: ClubsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.clubsIndex" });
  const common = await getTranslations({ locale, namespace: "common" });

  return <PlaceholderPage eyebrow="Clubs" title={t("title")} description={t("description")} footer={common("comingSoon")} />;
}
