/**
 * Supported response languages — single source for UI, API validation, and prompts.
 */
export const RESPONSE_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
] as const;

export type ResponseLocaleCode = (typeof RESPONSE_LOCALES)[number]["code"];

/** For z.enum — at least one member required. */
export const RESPONSE_LOCALE_CODES: [
  ResponseLocaleCode,
  ...ResponseLocaleCode[],
] = ["en", "es", "fr", "hi", "ar", "de", "ja"];

const PROMPT_LANGUAGE_NAME: Record<ResponseLocaleCode, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  ar: "Arabic",
  de: "German",
  ja: "Japanese",
};

/** Full language name used in system prompts (English descriptors; models follow reliably). */
export function responseLanguageName(code: string): string {
  if (code in PROMPT_LANGUAGE_NAME) {
    return PROMPT_LANGUAGE_NAME[code as ResponseLocaleCode];
  }
  return PROMPT_LANGUAGE_NAME.en;
}
