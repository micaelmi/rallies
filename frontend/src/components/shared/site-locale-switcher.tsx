"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: AppLocale;
};

const localeDetails: Record<AppLocale, { src: string; title: string }> = {
  en: { src: "/english-flag.png", title: "English" },
  "pt-BR": { src: "/brazil-flag.png", title: "Português (Brasil)" }
};

const localeOptions: AppLocale[] = ["en", "pt-BR"];

export const LocaleSwitcher = ({ locale }: LocaleSwitcherProps) => {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center bg-card/60 shadow-sm p-1 border border-border rounded-lg">
      {localeOptions.map((option) => {
        const details = localeDetails[option];
        const isActive = option === locale;

        return (
          <Link
            key={option}
            href={pathname}
            locale={option}
            title={details.title}
            aria-label={details.title}
            className={cn(
              "flex justify-center items-center p-1.5 rounded-md transition-all",
              isActive
                ? "bg-primary/30 text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "text-muted-foreground opacity-60 hover:opacity-100 hover:bg-accent"
            )}
          >
            <Image
              src={details.src}
              alt={details.title}
              width={20}
              height={20}
              className="rounded-full w-5 h-5 object-cover shrink-0"
            />
          </Link>
        );
      })}
    </div>
  );
};
