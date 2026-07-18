import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LocaleSwitcher } from "./site-locale-switcher";

type SiteHeaderProps = {
  locale: AppLocale;
};

const navItems = [
  { href: "/", key: "home" },
  { href: "/app", key: "app" },
  { href: "/profiles", key: "profiles" },
  { href: "/clubs", key: "clubs" },
  { href: "/events", key: "events" }
] as const;

export const SiteHeader = async ({ locale }: SiteHeaderProps) => {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-[rgba(246,241,232,0.82)] backdrop-blur-md">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-brand/20 bg-white/70 px-4 py-2 text-sm font-semibold tracking-[0.18em] text-brand shadow-soft"
          >
            RALLIES
          </Link>
          <LocaleSwitcher locale={locale} />
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 transition hover:bg-brand-soft hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
