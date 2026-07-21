import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type LandingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });

  const highlights = ["profiles", "clubs", "scoreboard"] as const;

  return (
    <PageFrame className="py-10 sm:py-14">
      <section className="gap-6 grid lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-surface shadow-soft backdrop-blur px-6 sm:px-10 py-8 sm:py-12 border border-border rounded-[36px]">
          <p className="font-semibold text-brand text-sm uppercase tracking-[0.18em]">{t("eyebrow")}</p>
          <h1 className="mt-5 max-w-3xl font-semibold text-foreground text-4xl sm:text-5xl lg:text-6xl tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8">{t("description")}</p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/app"
              locale={locale}
              className={cn(buttonVariants({ variant: "default" }), `px-5 py-3 rounded-full font-semibold`)}
            >
              {t("primaryCta")}
            </Link>
            <Link
              href="/events"
              locale={locale}
              className={cn(buttonVariants({ variant: "secondary" }), `px-5 py-3 rounded-full font-semibold`)}
            >
              {t("secondaryCta")}
            </Link>
          </div>
        </div>

        <Card className="shadow-soft p-6 sm:p-8 border border-brand/15 rounded-[36px]">
          <p className="font-semibold text-brand text-sm uppercase tracking-[0.18em]">{t("highlightsTitle")}</p>
          <div className="gap-4 grid mt-6">
            {highlights.map((item, index) => (
              <article key={item} className="bg-primary/20 p-4 border border-white/30 rounded-[24px]">
                <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">0{index + 1}</p>
                <p className="mt-2 text-foreground text-sm leading-6">{t(`highlights.${item}`)}</p>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </PageFrame>
  );
}
