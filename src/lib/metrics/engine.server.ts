import { getServerSupabase } from "@/lib/supabase-data.server";
import { ENTITY_CONFIG } from "./entities";
import { collectMetricRefs, evaluateFormula, validateFormula } from "./formula";
import { extendedBuckets, resolvePeriod } from "./period";
import type {
  FilterCondition,
  FilterGroup,
  MetricDefinition,
  MetricResult,
  ResolvedPeriod,
} from "./types";

type Row = Record<string, unknown>;
type Bucket = { key: string; label: string; start: string; end: string };

type Runtime = {
  /** Values per extended bucket (12 lead months + visible window). */
  series: number[];
  total: number;
  priorPeriodTotal: number;
  priorYearTotal: number;
  breakdown: { label: string; value: number }[];
};

const LEAD = 12;

function isGroup(node: FilterCondition | FilterGroup): node is FilterGroup {
  return (node as FilterGroup).conditions !== undefined || (node as FilterGroup).op !== undefined
    ? !(node as FilterCondition).field
    : false;
}

function compare(rowValue: unknown, cond: FilterCondition): boolean {
  const { operator, value } = cond;
  if (operator === "is_null") return rowValue === null || rowValue === undefined;
  if (operator === "is_not_null") return rowValue !== null && rowValue !== undefined;
  if (operator === "in") return Array.isArray(value) && value.some((v) => v === rowValue);
  if (operator === "not_in") return Array.isArray(value) && !value.some((v) => v === rowValue);
  if (operator === "contains")
    return String(rowValue ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
  if (operator === "between") {
    const [lo, hi] = Array.isArray(value) ? value : [undefined, undefined];
    return Number(rowValue) >= Number(lo) && Number(rowValue) <= Number(hi);
  }
  const a = rowValue;
  const b = value;
  switch (operator) {
    case "=":
      return a === b || Number(a) === Number(b) || String(a) === String(b);
    case "!=":
      return !(a === b || String(a) === String(b));
    case ">":
      return Number(a) > Number(b);
    case ">=":
      return Number(a) >= Number(b);
    case "<":
      return Number(a) < Number(b);
    case "<=":
      return Number(a) <= Number(b);
  }
  return true;
}

export function matchesFilter(row: Row, group: FilterGroup | null | undefined): boolean {
  if (!group || !group.conditions || group.conditions.length === 0) return true;
  const op = group.op ?? "and";
  const results = group.conditions.map((c) =>
    isGroup(c) ? matchesFilter(row, c) : compare(row[(c as FilterCondition).field], c as FilterCondition),
  );
  return op === "or" ? results.some(Boolean) : results.every(Boolean);
}

function aggregate(rows: Row[], agg: string, field: string): number {
  if (agg === "count") return rows.length;
  if (agg === "count_distinct") return new Set(rows.map((r) => r[field])).size;
  const nums = rows.map((r) => Number(r[field] ?? 0)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  switch (agg) {
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      return nums.reduce((a, b) => a + b, 0);
  }
}

export class MetricEngine {
  private defs = new Map<string, MetricDefinition>();
  private cache = new Map<string, Runtime>();
  private rowCache = new Map<string, Row[]>();
  private resolving = new Set<string>();
  private buckets: Bucket[];
  private visibleFrom: number;

  constructor(
    defs: MetricDefinition[],
    private period: ResolvedPeriod,
    private globalFilters: Record<string, string> = {},
  ) {
    defs.forEach((d) => this.defs.set(d.key, d));
    this.buckets = extendedBuckets(period, LEAD);
    this.visibleFrom = LEAD;
  }

  definition(key: string) {
    return this.defs.get(key);
  }

  private async rows(def: MetricDefinition): Promise<Row[]> {
    const entity = def.source_entity ?? "";
    const cfg = ENTITY_CONFIG[entity];
    if (!cfg) throw new Error(`Unknown source entity "${entity}".`);
    const cacheKey = entity;
    if (!this.rowCache.has(cacheKey)) {
      const supabase = getServerSupabase();
      let q = supabase.from(cfg.table).select(cfg.columns).limit(50000);
      if (cfg.dateField) q = q.lte(cfg.dateField, this.period.end).order(cfg.dateField, { ascending: true });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      this.rowCache.set(cacheKey, (data ?? []) as unknown as Row[]);
    }
    const all = this.rowCache.get(cacheKey)!;
    const globals = Object.entries(this.globalFilters).filter(([, v]) => v && v !== "all");
    return all.filter((r) => {
      if (!matchesFilter(r, def.filters)) return false;
      for (const [field, value] of globals) {
        if (!(field in r)) continue;
        if (String(r[field]) !== String(value)) return false;
      }
      return true;
    });
  }

  private bucketValue(def: MetricDefinition, rows: Row[], cfg: { dateField: string | null; snapshot?: boolean }, b: Bucket) {
    const agg = def.aggregation ?? "sum";
    const field = def.value_field ?? "amount_base";
    if (!cfg.dateField) return aggregate(rows, agg, field);
    if (def.metric_kind === "balance") {
      const upTo = rows.filter((r) => String(r[cfg.dateField!]) <= b.end);
      if (cfg.snapshot) {
        const latest = upTo.reduce<string>((m, r) => {
          const d = String(r[cfg.dateField!]);
          return d > m ? d : m;
        }, "");
        return aggregate(
          upTo.filter((r) => String(r[cfg.dateField!]) === latest),
          agg,
          field,
        );
      }
      return aggregate(upTo, agg, field);
    }
    return aggregate(
      rows.filter((r) => {
        const d = String(r[cfg.dateField!]);
        return d >= b.start && d <= b.end;
      }),
      agg,
      field,
    );
  }

  private windowTotal(def: MetricDefinition, rows: Row[], cfg: { dateField: string | null; snapshot?: boolean }, from: Bucket, to: Bucket) {
    const agg = def.aggregation ?? "sum";
    const field = def.value_field ?? "amount_base";
    if (!cfg.dateField) return aggregate(rows, agg, field);
    if (def.metric_kind === "balance") return this.bucketValue(def, rows, cfg, to);
    const scoped = rows.filter((r) => {
      const d = String(r[cfg.dateField!]);
      return d >= from.start && d <= to.end;
    });
    return aggregate(scoped, agg, field);
  }

  private async resolveBase(def: MetricDefinition): Promise<Runtime> {
    const cfg = ENTITY_CONFIG[def.source_entity ?? ""]!;
    const rows = await this.rows(def);
    const series = this.buckets.map((b) => this.bucketValue(def, rows, cfg, b));

    const visible = this.buckets.slice(this.visibleFrom);
    const priorPeriod = this.buckets.slice(this.visibleFrom - visible.length, this.visibleFrom);
    const priorYear = this.buckets.slice(this.visibleFrom - 12, this.buckets.length - 12);

    const total = this.windowTotal(def, rows, cfg, visible[0]!, visible[visible.length - 1]!);
    const priorPeriodTotal = priorPeriod.length
      ? this.windowTotal(def, rows, cfg, priorPeriod[0]!, priorPeriod[priorPeriod.length - 1]!)
      : 0;
    const priorYearTotal = priorYear.length
      ? this.windowTotal(def, rows, cfg, priorYear[0]!, priorYear[priorYear.length - 1]!)
      : 0;

    let breakdown: { label: string; value: number }[] = [];
    if (def.group_by) {
      const last = visible[visible.length - 1]!;
      const scoped =
        def.metric_kind === "balance" || !cfg.dateField
          ? rows.filter((r) => !cfg.dateField || String(r[cfg.dateField!]) <= last.end)
          : rows.filter((r) => {
              const d = String(r[cfg.dateField!]);
              return d >= visible[0]!.start && d <= last.end;
            });
      const groups = new Map<string, Row[]>();
      for (const r of scoped) {
        const label = String(r[def.group_by] ?? "Unspecified");
        const arr = groups.get(label) ?? [];
        arr.push(r);
        groups.set(label, arr);
      }
      breakdown = [...groups.entries()]
        .map(([label, rs]) => ({ label, value: aggregate(rs, def.aggregation ?? "sum", def.value_field ?? "amount_base") }))
        .sort((a, b) => b.value - a.value);
    }

    return { series, total, priorPeriodTotal, priorYearTotal, breakdown };
  }

  private async resolveFormula(def: MetricDefinition): Promise<Runtime> {
    const knownKeys = new Set(this.defs.keys());
    const issues = validateFormula(def.formula, knownKeys);
    const blocking = issues.filter((i) => !i.message.startsWith("Use safe_divide"));
    if (blocking.length) throw new Error(blocking[0]!.message);

    const refs = [...collectMetricRefs(def.formula)];
    const deps = new Map<string, Runtime>();
    for (const ref of refs) {
      const rt = await this.resolve(ref);
      // Feed formulas the *presented* value of each input: a metric flagged
      // "invert" reads as a positive figure everywhere it is shown, so it must
      // do the same inside an expression (income - expenses, quick ratio, …).
      const rd = this.defs.get(ref);
      const factor = (rd?.sign_convention === "invert" ? -1 : 1) * (rd?.scale ?? 1);
      deps.set(
        ref,
        factor === 1
          ? rt
          : {
              series: rt.series.map((v) => v * factor),
              total: rt.total * factor,
              priorPeriodTotal: rt.priorPeriodTotal * factor,
              priorYearTotal: rt.priorYearTotal * factor,
              breakdown: rt.breakdown.map((b) => ({ ...b, value: b.value * factor })),
            },
      );
    }

    const pick = (scope: "total" | "priorPeriodTotal" | "priorYearTotal") => ({
      months: this.buckets.length,
      get: (k: string) => deps.get(k)?.[scope] ?? 0,
      pctChange: (k: string, lag: number) => {
        const d = deps.get(k);
        if (!d) return 0;
        const base = lag >= 12 ? d.priorYearTotal : d.priorPeriodTotal;
        if (scope !== "total") return 0;
        return base === 0 ? 0 : ((d.total - base) / Math.abs(base)) * 100;
      },
    });

    const series = this.buckets.map((_, i) => {
      const scope = {
        months: 1,
        get: (k: string) => deps.get(k)?.series[i] ?? 0,
        pctChange: (k: string, lag: number) => {
          const s = deps.get(k)?.series;
          if (!s) return 0;
          const prev = s[i - Math.round(lag)];
          const cur = s[i];
          if (prev === undefined || cur === undefined || prev === 0) return 0;
          return ((cur - prev) / Math.abs(prev)) * 100;
        },
      };
      return evaluateFormula(def.formula!, scope);
    });

    return {
      series,
      total: evaluateFormula(def.formula!, pick("total")),
      priorPeriodTotal: evaluateFormula(def.formula!, pick("priorPeriodTotal")),
      priorYearTotal: evaluateFormula(def.formula!, pick("priorYearTotal")),
      breakdown: [],
    };
  }

  async resolve(key: string): Promise<Runtime> {
    const hit = this.cache.get(key);
    if (hit) return hit;
    if (this.resolving.has(key)) throw new Error(`Circular reference detected at "${key}".`);
    const def = this.defs.get(key);
    if (!def) throw new Error(`Metric "${key}" does not exist.`);
    this.resolving.add(key);
    try {
      const rt =
        def.metric_kind === "formula" || def.metric_kind === "ratio"
          ? await this.resolveFormula(def)
          : await this.resolveBase(def);
      this.cache.set(key, rt);
      return rt;
    } finally {
      this.resolving.delete(key);
    }
  }

  /** Resolve an unsaved definition (used by the live preview). */
  async resolveDraft(def: MetricDefinition): Promise<MetricResult> {
    this.defs.set(def.key || "__draft", { ...def, key: def.key || "__draft" });
    this.cache.delete(def.key || "__draft");
    const rt =
      def.metric_kind === "formula" || def.metric_kind === "ratio"
        ? await this.resolveFormula(def)
        : await this.resolveBase(def);
    return this.toResult(def, rt);
  }

  toResult(def: MetricDefinition, rt: Runtime): MetricResult {
    const sign = def.sign_convention === "invert" ? -1 : 1;
    const scale = def.scale ?? 1;
    const visible = rt.series.slice(this.visibleFrom).map((v) => v * sign * scale);
    const previous =
      def.comparison === "prior_year"
        ? rt.priorYearTotal * sign * scale
        : def.comparison === "prior_period"
          ? rt.priorPeriodTotal * sign * scale
          : null;
    const value = rt.total * sign * scale;
    const delta =
      previous === null || previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100;

    return {
      key: def.key,
      name: def.name,
      value,
      previous,
      delta_pct: delta,
      value_type: def.value_type,
      unit: def.unit ?? null,
      decimals: def.decimals ?? 0,
      target_value: def.target_value ?? null,
      thresholds: def.thresholds ?? null,
      comparison: def.comparison,
      series: this.period.buckets.map((b, i) => ({ label: b.label, value: visible[i] ?? 0 })),
      breakdown: rt.breakdown.map((b) => ({ ...b, value: b.value * sign * scale })),
    };
  }

  async result(key: string): Promise<MetricResult> {
    const def = this.defs.get(key);
    if (!def) throw new Error(`Metric "${key}" does not exist.`);
    return this.toResult(def, await this.resolve(key));
  }
}

export async function loadDefinitions(): Promise<MetricDefinition[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("metric_definitions").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MetricDefinition[];
}

export async function createEngine(periodKey: string, globalFilters: Record<string, string> = {}) {
  const defs = await loadDefinitions();
  return new MetricEngine(defs, resolvePeriod(periodKey), globalFilters);
}
