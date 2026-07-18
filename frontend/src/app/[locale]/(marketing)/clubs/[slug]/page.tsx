import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type ClubDetailPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.clubDetail" });

  return <PlaceholderPage eyebrow="Clubs" title={`${t("title")}: ${slug}`} description={t("description")} />;
}
