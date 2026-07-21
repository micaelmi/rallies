import type { ReactNode } from "react";
import { PageFrame } from "./page-frame";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
};

export const PlaceholderPage = ({ eyebrow, title, description, footer }: PlaceholderPageProps) => {
  return (
    <PageFrame className="py-10 sm:py-16">
      <section className="bg-card shadow-sm p-8 sm:p-10 border border-border rounded-xl text-card-foreground transition-all">
        <p className="font-semibold text-primary text-xs uppercase tracking-wider">{eyebrow}</p>
        <h1 className="mt-3 max-w-2xl font-bold text-foreground text-3xl sm:text-4xl tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-zinc-50 text-sm sm:text-base leading-relaxed">{description}</p>
        {footer ? <div className="mt-6 pt-4 border-border/60 border-t">{footer}</div> : null}
      </section>
    </PageFrame>
  );
};
