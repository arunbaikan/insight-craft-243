import { useSyncExternalStore } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "AED" | "AUD" | "CAD" | "SGD" | "JPY";

export const BASE_CURRENCY: CurrencyCode = "USD";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — Pound Sterling", symbol: "£" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "AED " },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "C$" },
  { code: "SGD", label: "SGD — Singapore Dollar", symbol: "S$" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
];

export function currencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? `${code} `;
}

/**
 * Digit grouping differs by currency: INR uses the Indian 2-2-3 lakh/crore
 * grouping (12,34,567) while western currencies use 1,234,567.
 */
const LOCALES: Partial<Record<CurrencyCode, string>> = {
  INR: "en-IN",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
};

export function currencyLocale(code: string) {
  return LOCALES[code as CurrencyCode] ?? "en-US";
}

/** Currencies whose smallest unit is the whole unit — never show decimals. */
export function currencyDecimals(code: string, decimals: number) {
  return code === "JPY" ? 0 : decimals;
}

/** Compact abbreviation buckets: lakh/crore for INR, K/M elsewhere. */
export function compactUnit(code: string, abs: number): { div: number; suffix: string } | null {
  if (code === "INR") {
    if (abs >= 10_000_000) return { div: 10_000_000, suffix: " Cr" };
    if (abs >= 100_000) return { div: 100_000, suffix: " L" };
    if (abs >= 1000) return { div: 1000, suffix: "K" };
    return null;
  }
  if (abs >= 1_000_000_000) return { div: 1_000_000_000, suffix: "B" };
  if (abs >= 1_000_000) return { div: 1_000_000, suffix: "M" };
  if (abs >= 1000) return { div: 1000, suffix: "K" };
  return null;
}

export type CurrencyState = { code: CurrencyCode; rate: number };

/**
 * Presentation-currency state lives in a tiny external store so pure
 * formatting helpers (formatValue) can read it without prop drilling, while
 * components subscribe through useCurrency() and re-render on every change.
 */
let state: CurrencyState = { code: BASE_CURRENCY, rate: 1 };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getCurrency(): CurrencyState {
  return state;
}

export function setCurrencyCode(code: CurrencyCode) {
  // Switching back to base always resets the rate to parity.
  state = { code, rate: code === BASE_CURRENCY ? 1 : state.rate === 1 ? 1 : state.rate };
  emit();
}

export function setCurrencyRate(rate: number) {
  state = { ...state, rate: Number.isFinite(rate) && rate > 0 ? rate : 1 };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCurrency(): CurrencyState {
  return useSyncExternalStore(subscribe, getCurrency, getCurrency);
}

/** Convert a value recorded in the base currency into the presentation currency. */
export function convertFromBase(value: number) {
  const { code, rate } = state;
  if (code === BASE_CURRENCY) return value;
  return value * (Number.isFinite(rate) && rate > 0 ? rate : 1);
}
