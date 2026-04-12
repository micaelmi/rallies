export const supportedLocales = ["en", "pt-BR"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

const defaultLocale: SupportedLocale = "en";

export const resolveLocale = (input?: string): SupportedLocale => {
  if (!input) {
    return defaultLocale;
  }

  const normalized = input.split(",")[0]?.trim();

  if (!normalized) {
    return defaultLocale;
  }

  const exactMatch = supportedLocales.find((locale) => locale.toLowerCase() === normalized.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  const languageMatch = supportedLocales.find((locale) => locale.split("-")[0]?.toLowerCase() === normalized.toLowerCase());
  return languageMatch ?? defaultLocale;
};
