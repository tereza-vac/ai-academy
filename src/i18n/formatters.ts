import type { FormattersInitializer } from "typesafe-i18n";
import { number } from "typesafe-i18n/formatters";
import type { Locales, Formatters } from "./i18n-types";

const BCP47: Record<Locales, string> = {
  cs: "cs-CZ",
  sk: "sk-SK",
  en: "en-US",
  pl: "pl-PL",
};

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
  const bcp47 = BCP47[locale] ?? "cs-CZ";

  // The codegen widens formatter parameter types to `unknown`, which doesn't
  // match the AI SDK's stricter `(value: number | bigint) => string` signature.
  // The runtime call is always made with a number from a dictionary `{x|num}`
  // placeholder, so a single cast keeps both sides honest without leaking
  // `any` into the surrounding code.
  const formatters: Formatters = {
    num: number(bcp47, { useGrouping: true }) as Formatters["num"],
  };

  return formatters;
};
