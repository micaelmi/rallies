import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

type PublicProfilePageProps = {
  params: Promise<{
    locale: string;
    username: string;
  }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "placeholders.profilePublic" });

  return (
    <PlaceholderPage
      eyebrow="Profiles"
      title={`${t("title")}: @${username}`}
      description={t("description")}
    />
  );
}
