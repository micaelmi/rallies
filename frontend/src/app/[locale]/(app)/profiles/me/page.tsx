import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type ProfileMePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ProfileMePage({ params }: ProfileMePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.profileMe" });
  const common = await getTranslations({ locale, namespace: "common" });

  return <PlaceholderPage eyebrow="Profiles" title={t("title")} description={t("description")} footer={common("comingSoon")} />;
}
