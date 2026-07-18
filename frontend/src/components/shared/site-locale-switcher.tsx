"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type LocaleSwitcherProps = {
  locale: AppLocale;
};

const localeOptions: AppLocale[] = ["en", "pt-BR"];

export const LocaleSwitcher = ({ locale }: LocaleSwitcherProps) => {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-white/80 p-1 shadow-soft">
      {localeOptions.map((option) => (
        <Link
          key={option}
          href={pathname}
          locale={option}
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
            option === locale ? "bg-brand text-white" : "text-muted hover:text-foreground"
          ].join(" ")}
        >
          {option}
        </Link>
      ))}
    </div>
  );
};
