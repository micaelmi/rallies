"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: AppLocale;
};

const localeOptions: AppLocale[] = ["en", "pt-BR"];

export const LocaleSwitcher = ({ locale }: LocaleSwitcherProps) => {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-1 shadow-sm">
      {localeOptions.map((option) => (
        <Link
          key={option}
          href={pathname}
          locale={option}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors",
            option === locale
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}
        </Link>
      ))}
    </div>
  );
};
