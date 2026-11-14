export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Normalize source report records for transport, including undefined and NaN. */
export function reportJson(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(reportJson);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reportJson(item)]));
  throw new Error("Unsupported financial report value.");
}