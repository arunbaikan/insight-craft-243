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

/** Dashboards whose widgets bind a given metric key, for the builder's impact panel. */
export const getMetricUsage = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string }) => input)
  .handler(async ({ data }): Promise<{ name: string; slug: string }[]> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const [{ data: widgets }, { data: dashboards }] = await Promise.all([
      supabase.from("widgets").select("dashboard_id, metric_binding"),
      supabase.from("dashboards").select("id, name, slug"),
    ]);
    const byId = new Map((dashboards ?? []).map((d) => [d.id, d]));
    const hits = new Map<string, { name: string; slug: string }>();
    for (const w of widgets ?? []) {
      if (!JSON.stringify(w.metric_binding ?? {}).includes(`"${data.key}"`)) continue;
      const d = byId.get(w.dashboard_id);
      if (d) hits.set(d.slug, { name: d.name, slug: d.slug });
    }
    return [...hits.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

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

export type FormulaRefValue = {
  key: string;
  name: string;
  value: number | null;
  value_type: MetricResult["value_type"];
  decimals: number;
  unit?: string | null | undefined;
  error?: string;
};

export const previewMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { definition: MetricDefinition; period: string }) => input)
  .handler(async ({ data }): Promise<{ result?: MetricResult; error?: string; refs?: FormulaRefValue[] }> => {
    const { createEngine } = await import("@/lib/metrics/engine.server");
    const { collectMetricRefs } = await import("@/lib/metrics/formula");
    try {
      const engine = await createEngine(data.period || "last_6m");

      // Resolve each referenced metric so the editor can show the inputs that
      // feed the expression, not just the final number.
      const refs: FormulaRefValue[] = [];
      for (const key of collectMetricRefs(data.definition.formula)) {
        if (key === data.definition.key) continue;
        try {
          const r = await engine.result(key);
          refs.push({
            key,
            name: r.name,
            value: r.value,
            value_type: r.value_type,
            decimals: r.decimals,
            unit: r.unit ?? null,
          });
        } catch (e) {
          refs.push({
            key,
            name: key,
            value: null,
            value_type: "number",
            decimals: 0,
            error: e instanceof Error ? e.message : "Could not resolve.",
          });
        }
      }

      const result = await engine.resolveDraft(data.definition);
      return { result, refs };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Preview failed." };
    }
  });

const TRACKED_FIELDS = [
  "key",
  "name",
  "description",
  "metric_kind",
  "source_entity",
  "aggregation",
  "value_field",
  "filters",
  "group_by",
  "time_grain",
  "formula",
  "comparison",
  "sign_convention",
  "value_type",
  "unit",
  "decimals",
  "scale",
  "target_value",
  "thresholds",
] as const;

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return TRACKED_FIELDS.filter(
    (f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null),
  );
}

export type MetricVersion = {
  id: string;
  version: number;
  actor: string;
  change_note: string | null;
  changed_fields: string[];
  created_at: string;
  snapshot: MetricDefinition;
};

/** Full changelog for a metric, newest first. */
export const getMetricVersions = createServerFn({ method: "POST" })
  .inputValidator((input: { metricId: string }) => input)
  .handler(async ({ data }): Promise<MetricVersion[]> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const { data: rows, error } = await supabase
      .from("metric_definition_versions")
      .select("id, version, actor, change_note, changed_fields, created_at, snapshot")
      .eq("metric_id", data.metricId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as MetricVersion[];
  });

export const saveMetric = createServerFn({ method: "POST" })
  .inputValidator((input: { definition: MetricDefinition; note?: string }) => input)
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
      const prev = (existing ?? {}) as Record<string, unknown>;
      const version = ((existing as { version?: number } | null)?.version ?? 1) + 1;
      const changed = diffFields(prev, payload as unknown as Record<string, unknown>);
      if (existing)
        // Snapshot the outgoing definition so any earlier version can be restored
        // and dashboards that relied on it keep an auditable history.
        await supabase.from("metric_definition_versions").insert({
          metric_id: d.id,
          version: (existing as { version: number }).version,
          snapshot: existing as never,
          change_note: data.note?.trim() || null,
          changed_fields: changed as never,
        });
      const { data: updated, error } = await supabase
        .from("metric_definitions")
        .update({ ...payload, is_system: (existing as { is_system: boolean } | null)?.is_system ?? false, version })
        .eq("id", d.id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      const oldKey = (prev as { key?: string }).key;
      if (oldKey && oldKey !== d.key) await repointKey(supabase, oldKey, d.key);
      // Stale cached values must not outlive the definition that produced them.
      await supabase.from("metric_cache").delete().eq("metric_key", d.key);
      if (oldKey) await supabase.from("metric_cache").delete().eq("metric_key", oldKey);
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

/**
 * Renaming a metric key would orphan every widget bound to the old key, so the
 * bindings and any formulas referencing it are rewritten in the same save.
 */
async function repointKey(
  supabase: { from: (t: string) => any },
  oldKey: string,
  newKey: string,
): Promise<void> {
  const { data: widgets } = await supabase.from("widgets").select("id, metric_binding");
  for (const w of (widgets ?? []) as { id: string; metric_binding: unknown }[]) {
    const json = JSON.stringify(w.metric_binding ?? {});
    if (!json.includes(`"${oldKey}"`)) continue;
    await supabase
      .from("widgets")
      .update({ metric_binding: JSON.parse(json.split(`"${oldKey}"`).join(`"${newKey}"`)) })
      .eq("id", w.id);
  }
  const { data: metrics } = await supabase.from("metric_definitions").select("id, formula");
  for (const m of (metrics ?? []) as { id: string; formula: unknown }[]) {
    if (!m.formula) continue;
    const json = JSON.stringify(m.formula);
    if (!json.includes(`"${oldKey}"`)) continue;
    await supabase
      .from("metric_definitions")
      .update({ formula: JSON.parse(json.split(`"${oldKey}"`).join(`"${newKey}"`)) })
      .eq("id", m.id);
  }
}

/** Roll a metric back to an earlier snapshot; the rollback itself is a new version. */
export const restoreMetricVersion = createServerFn({ method: "POST" })
  .inputValidator((input: { metricId: string; version: number }) => input)
  .handler(async ({ data }): Promise<MetricDefinition> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("metric_definition_versions")
      .select("snapshot")
      .eq("metric_id", data.metricId)
      .eq("version", data.version)
      .single();
    if (error || !row) throw new Error("That version is no longer available.");
    const snapshot = (row as { snapshot: MetricDefinition }).snapshot;
    const { data: current } = await supabase
      .from("metric_definitions")
      .select("*")
      .eq("id", data.metricId)
      .single();
    if (!current) throw new Error("Metric not found.");
    const cur = current as unknown as Record<string, unknown>;
    const nextVersion = ((cur["version"] as number) ?? 1) + 1;
    const restored = { ...(snapshot as unknown as Record<string, unknown>) };
    delete restored["id"];
    delete restored["created_at"];
    delete restored["version"];
    delete restored["is_system"];

    await supabase.from("metric_definition_versions").insert({
      metric_id: data.metricId,
      version: cur["version"] as number,
      snapshot: current as never,
      change_note: `Restored version ${data.version}`,
      changed_fields: diffFields(cur, restored) as never,
    });

    const { data: updated, error: upErr } = await supabase
      .from("metric_definitions")
      .update({ ...restored, version: nextVersion, updated_at: new Date().toISOString() })
      .eq("id", data.metricId)
      .eq("is_system", false)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);

    const oldKey = cur["key"] as string;
    const newKey = restored["key"] as string;
    if (oldKey && newKey && oldKey !== newKey) await repointKey(supabase, oldKey, newKey);
    await supabase.from("metric_cache").delete().eq("metric_key", newKey);
    await supabase.from("metric_cache").delete().eq("metric_key", oldKey);
    return updated as unknown as MetricDefinition;
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

