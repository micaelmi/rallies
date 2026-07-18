"use client";

import type { PropsWithChildren } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

type AppProviderProps = PropsWithChildren<{
  locale: string;
  messages: AbstractIntlMessages;
}>;

export const AppProvider = ({ children, locale, messages }: AppProviderProps) => {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
};
