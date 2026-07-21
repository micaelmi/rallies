import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LocaleSwitcher } from "./site-locale-switcher";
import { ModeToggle } from "./mode-toggle";

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
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-bold tracking-wider text-primary transition-colors hover:bg-primary/15"
          >
            RALLIES
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher locale={locale} />
            <ModeToggle />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
