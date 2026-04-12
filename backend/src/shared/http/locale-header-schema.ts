import { z } from "zod";
import { supportedLocales } from "../i18n/locale-context.js";

export const localeHeaderSchema = z.object({
  "x-locale": z.enum(supportedLocales).optional()
});
