import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type ProfilesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ProfilesPage({ params }: ProfilesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.profilesIndex" });
  const common = await getTranslations({ locale, namespace: "common" });

  return <PlaceholderPage eyebrow="Profiles" title={t("title")} description={t("description")} footer={common("comingSoon")} />;
}
