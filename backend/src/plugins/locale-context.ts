import fp from "fastify-plugin";
import { resolveLocale } from "../shared/i18n/locale-context.js";

export const localeContextPlugin = fp(async (app) => {
  app.decorateRequest("locale", "en");

  app.addHook("onRequest", async (request) => {
    const headerLocale =
      typeof request.headers["x-locale"] === "string"
        ? request.headers["x-locale"]
        : typeof request.headers["accept-language"] === "string"
          ? request.headers["accept-language"]
          : undefined;

    request.locale = resolveLocale(headerLocale);
  });
});
