import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageFrame } from "@/components/shared/page-frame";

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
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[36px] border border-border bg-surface px-6 py-8 shadow-soft backdrop-blur sm:px-10 sm:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">{t("eyebrow")}</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{t("description")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              locale={locale}
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-strong)]"
            >
              {t("primaryCta")}
            </Link>
            <Link
              href="/events"
              locale={locale}
              className="rounded-full border border-border bg-white/80 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand"
            >
              {t("secondaryCta")}
            </Link>
          </div>
        </div>

        <aside className="rounded-[36px] border border-brand/15 bg-[linear-gradient(180deg,rgba(255,250,241,0.95),rgba(239,226,203,0.92))] p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">{t("highlightsTitle")}</p>
          <div className="mt-6 grid gap-4">
            {highlights.map((item, index) => (
              <article key={item} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">0{index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{t(`highlights.${item}`)}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </PageFrame>
  );
}
