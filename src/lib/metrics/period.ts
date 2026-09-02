import type { ResolvedPeriod } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "mtd", label: "Month to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
  { value: "last_3m", label: "Last 3 months" },
  { value: "last_6m", label: "Last 6 months" },
  { value: "last_12m", label: "Last 12 months" },
  { value: "last_24m", label: "Last 24 months" },
];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addMonths(y: number, m: number, delta: number) {
  const total = y * 12 + (m - 1) + delta;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

export function monthBuckets(startY: number, startM: number, count: number) {
  const out: { key: string; label: string; start: string; end: string }[] = [];
  for (let i = 0; i < count; i++) {
    const { y, m } = addMonths(startY, startM, i);
    out.push({
      key: `${y}-${String(m).padStart(2, "0")}`,
      label: MONTHS[m - 1]!,
      start: iso(y, m, 1),
      end: iso(y, m, daysInMonth(y, m)),
    });
  }
  return out;
}

/** The demo ledger runs to the end of the current month of the seeded data. */
export function resolvePeriod(key: string, today = new Date()): ResolvedPeriod {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;

  let startY = y;
  let startM = m;
  let count = 1;

  switch (key) {
    case "mtd":
      count = 1;
      break;
    case "qtd": {
      const qStart = Math.floor((m - 1) / 3) * 3 + 1;
      startM = qStart;
      count = m - qStart + 1;
      break;
    }
    case "ytd":
      startM = 1;
      count = m;
      break;
    case "last_3m":
    case "last_6m":
    case "last_12m":
    case "last_24m": {
      // Rolling windows end at the last complete month so a part-month never
      // reads as a collapse in a trend chart.
      count = Number(key.replace("last_", "").replace("m", ""));
      const end = addMonths(y, m, -1);
      const s = addMonths(end.y, end.m, -(count - 1));
      startY = s.y;
      startM = s.m;
      break;
    }

    default: {
      count = 6;
      const s = addMonths(y, m, -5);
      startY = s.y;
      startM = s.m;
    }
  }

  const buckets = monthBuckets(startY, startM, count);
  return {
    key,
    start: buckets[0]!.start,
    end: buckets[buckets.length - 1]!.end,
    buckets,
  };
}

/** Same length window, shifted back by `months`. */
export function shiftPeriod(period: ResolvedPeriod, months: number): ResolvedPeriod {
  const first = period.buckets[0]!;
  const [fy, fm] = first.key.split("-").map(Number) as [number, number];
  const s = addMonths(fy, fm, -months);
  const buckets = monthBuckets(s.y, s.m, period.buckets.length);
  return {
    key: `${period.key}__minus_${months}`,
    start: buckets[0]!.start,
    end: buckets[buckets.length - 1]!.end,
    buckets,
  };
}

/** Buckets extended 12 months before the visible window (for lag/comparison maths). */
export function extendedBuckets(period: ResolvedPeriod, lead = 12) {
  const first = period.buckets[0]!;
  const [fy, fm] = first.key.split("-").map(Number) as [number, number];
  const s = addMonths(fy, fm, -lead);
  return monthBuckets(s.y, s.m, period.buckets.length + lead);
}

export function periodLabel(key: string) {
  return PERIOD_OPTIONS.find((p) => p.value === key)?.label ?? key;
}
