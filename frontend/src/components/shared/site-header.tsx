import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AuthControls } from "./auth-controls";
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
    <header className="top-0 z-20 sticky bg-background/80 backdrop-blur-md border-border border-b">
      <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4 mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-content">
        <div className="flex justify-between items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center bg-primary/10 hover:bg-primary/15 px-3.5 py-1.5 border border-primary/20 rounded-lg font-bold text-primary text-sm tracking-wider transition-colors"
          >
            RALLIES
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher locale={locale} />
            <ModeToggle />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap items-center gap-1.5 font-medium text-muted-foreground text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:bg-accent px-3 py-2 rounded-lg transition-colors hover:text-accent-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <AuthControls />
        </div>
      </div>
    </header>
  );
};
