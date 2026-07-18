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
    <PageFrame className="py-14 sm:py-20">
      <section className="rounded-[32px] border border-border bg-surface px-6 py-8 shadow-soft backdrop-blur md:px-10 md:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </section>
    </PageFrame>
  );
};
