import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type AppHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AppHomePage({ params }: AppHomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "appHome" });

  return <PlaceholderPage eyebrow="Rallies" title={t("title")} description={t("description")} />;
}
