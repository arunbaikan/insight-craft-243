import { createServerFn } from "@tanstack/react-start";
import type { MetricDefinition, MetricResult, ValidationIssue } from "@/lib/metrics/types";

export type MetricCatalogue = {
  metrics: MetricDefinition[];
  entities: {
    entity: string;
    label: string;
    description: string | null;
    date_field: string | null;
    default_value_field: string | null;
    supports_time_grain: boolean;
    fields: { name: string; label: string; type: string; measure: boolean; dimension: boolean; values?: string[] }[];
  }[];
};

export const getMetricCatalogue = createServerFn({ method: "GET" }).handler(
  async (): Promise<MetricCatalogue> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const [metrics, entities] = await Promise.all([
      supabase.from("metric_definitions").select("*").order("name"),
      supabase.from("entity_registry").select("*").order("sort_order"),
    ]);
    if (metrics.error) throw new Error(metrics.error.message);
    if (entities.error) throw new Error(entities.error.message);
    return {
      metrics: (metrics.data ?? []) as unknown as MetricDefinition[],
      entities: (entities.data ?? []) as unknown as MetricCatalogue["entities"],
    };
  },
);

export const validateMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { definition: MetricDefinition }) => input)
  .handler(async ({ data }): Promise<{ issues: ValidationIssue[] }> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const { validateFormula, collectMetricRefs } = await import("@/lib/metrics/formula");
    const { ENTITY_CONFIG } = await import("@/lib/metrics/entities");
    const supabase = getServerSupabase();
    const { data: rows } = await supabase.from("metric_definitions").select("key, formula");
    const known = new Set<string>((rows ?? []).map((r) => (r as { key: string }).key));
    const def = data.definition;
    const issues: ValidationIssue[] = [];

    if (!def.key?.trim()) issues.push({ path: "key", message: "A metric key is required." });
    else if (!/^[a-z][a-z0-9_]*$/.test(def.key))
      issues.push({ path: "key", message: "Use lowercase letters, numbers and underscores only." });
    if (!def.name?.trim()) issues.push({ path: "name", message: "Give the metric a display name." });

    if (def.metric_kind === "formula" || def.metric_kind === "ratio") {
      known.add(def.key);
      issues.push(...validateFormula(def.formula, known));
      const refs = collectMetricRefs(def.formula);
      if (refs.has(def.key)) issues.push({ path: "formula", message: "A metric cannot reference itself." });
    } else {
      const cfg = def.source_entity ? ENTITY_CONFIG[def.source_entity] : undefined;
      if (!cfg) issues.push({ path: "source_entity", message: "Choose a data source." });
      if (!def.aggregation) issues.push({ path: "aggregation", message: "Choose an aggregation." });
      if (def.aggregation && def.aggregation !== "count" && !def.value_field)
        issues.push({ path: "value_field", message: "Choose the field to aggregate." });
    }
    return { issues };
  });

export const previewMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { definition: MetricDefinition; period: string }) => input)
  .handler(async ({ data }): Promise<{ result?: MetricResult; error?: string }> => {
    const { createEngine } = await import("@/lib/metrics/engine.server");
    try {
      const engine = await createEngine(data.period || "last_6m");
      const result = await engine.resolveDraft(data.definition);
      return { result };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Preview failed." };
    }
  });

export const saveMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { definition: MetricDefinition }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const d = data.definition;
    const payload = {
      key: d.key,
      name: d.name,
      description: d.description ?? null,
      metric_kind: d.metric_kind,
      source_entity: d.source_entity ?? null,
      aggregation: d.aggregation ?? null,
      value_field: d.value_field ?? null,
      filters: d.filters ?? {},
      group_by: d.group_by ?? null,
      time_grain: d.time_grain ?? "month",
      formula: d.formula ?? null,
      comparison: d.comparison ?? "prior_period",
      sign_convention: d.sign_convention ?? "natural",
      value_type: d.value_type ?? "currency",
      unit: d.unit ?? null,
      decimals: d.decimals ?? 0,
      scale: d.scale ?? 1,
      target_value: d.target_value ?? null,
      thresholds: d.thresholds ?? null,
      is_system: false,
      updated_at: new Date().toISOString(),
    };

    if (d.id) {
      const { data: existing } = await supabase.from("metric_definitions").select("*").eq("id", d.id).single();
      if (existing && (existing as { is_system: boolean }).is_system)
        throw new Error("System metrics are read-only. Clone it to make changes.");
      const version = ((existing as { version?: number } | null)?.version ?? 1) + 1;
      if (existing)
        await supabase.from("metric_definition_versions").insert({
          metric_id: d.id,
          version: (existing as { version: number }).version,
          snapshot: existing as never,
        });
      const { data: updated, error } = await supabase
        .from("metric_definitions")
        .update({ ...payload, is_system: (existing as { is_system: boolean } | null)?.is_system ?? false, version })
        .eq("id", d.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated as unknown as MetricDefinition;
    }

    const { data: inserted, error } = await supabase
      .from("metric_definitions")
      .insert({ ...payload, version: 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted as unknown as MetricDefinition;
  });

export const deleteMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const { error } = await supabase.from("metric_definitions").delete().eq("id", data.id).eq("is_system", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
