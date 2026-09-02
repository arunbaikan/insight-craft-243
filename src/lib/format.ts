import type { MetricResult, Thresholds, ValueType } from "@/lib/metrics/types";

export function formatValue(
  value: number | null | undefined,
  valueType: ValueType = "number",
  decimals = 0,
  unit?: string | null,
  compact = false,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };

  if (valueType === "currency") {
    if (compact && abs >= 1000) {
      const div = abs >= 1_000_000 ? 1_000_000 : 1000;
      const suffix = abs >= 1_000_000 ? "M" : "K";
      return `$${(value / div).toLocaleString("en-US", { maximumFractionDigits: 1 })}${suffix}`;
    }
    return `$${value.toLocaleString("en-US", opts)}`;
  }
  if (valueType === "percent") return `${value.toLocaleString("en-US", opts)}%`;
  if (valueType === "ratio") return value.toLocaleString("en-US", { minimumFractionDigits: Math.max(decimals, 2), maximumFractionDigits: Math.max(decimals, 2) });
  if (valueType === "months") return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} Months`;
  if (valueType === "days") return `${value.toLocaleString("en-US", opts)} days`;
  const base = compact && abs >= 10_000 ? `${(value / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K` : value.toLocaleString("en-US", opts);
  return unit ? `${base} ${unit}` : base;
}

export function formatMetric(result: MetricResult | null | undefined, compact = false) {
  if (!result) return "—";
  return formatValue(result.value, result.value_type, result.decimals, result.unit, compact);
}

export function formatDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export type ThresholdState = "good" | "warn" | "bad" | "neutral";

export function thresholdState(value: number | null, thresholds?: Thresholds | null): ThresholdState {
  if (value === null || !thresholds || (thresholds.good === undefined && thresholds.warn === undefined))
    return "neutral";
  const higher = (thresholds.direction ?? "higher_is_better") === "higher_is_better";
  const good = thresholds.good;
  const warn = thresholds.warn;
  if (higher) {
    if (good !== undefined && value >= good) return "good";
    if (warn !== undefined && value >= warn) return "warn";
    return "bad";
  }
  if (good !== undefined && value <= good) return "good";
  if (warn !== undefined && value <= warn) return "warn";
  return "bad";
}

export const STATE_TEXT: Record<ThresholdState, string> = {
  good: "text-positive",
  warn: "text-accent-amber",
  bad: "text-negative",
  neutral: "text-foreground",
};

export const CHART_COLORS = [
  "var(--brand)",
  "var(--accent-cyan)",
  "var(--accent-teal)",
  "var(--accent-amber)",
  "var(--negative)",
  "var(--brand-strong)",
];

export function seriesColor(explicit: string | undefined, index: number) {
  return explicit ?? CHART_COLORS[index % CHART_COLORS.length]!;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function keyify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
